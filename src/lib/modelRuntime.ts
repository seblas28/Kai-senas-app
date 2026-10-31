import * as tf from '@tensorflow/tfjs';
import { decodeWeights, validateBundle, type ModelBundle } from '../domain/modelBundle';
import { supabase } from './supabase';
import { getSignsByCategory } from '../data/signData';

export function allowedModelLabels(moduleId: string) {
  const signs = moduleId === 'matematicas' ? [...getSignsByCategory(moduleId), ...getSignsByCategory('numeros')] : getSignsByCategory(moduleId);
  return signs.map(sign => sign.label);
}
export async function instantiateBundle(bundle: ModelBundle): Promise<tf.LayersModel> {
  const model = tf.sequential();
  const tensors: tf.Tensor[] = [];
  try {
    let previous = 126, offset = 0;
    const bytes = decodeWeights(bundle.weightData), view = new DataView(bytes);
    bundle.network.forEach((layer, index) => {
      model.add(tf.layers.dense({ units: layer.units, activation: layer.activation, useBias: true, ...(index === 0 ? { inputShape: [126] } : {}) }));
      if (layer.dropout) model.add(tf.layers.dropout({ rate: layer.dropout }));
      for (const shape of [[previous, layer.units], [layer.units]]) {
        const length = shape.reduce((a, b) => a * b, 1), values = new Float32Array(length);
        for (let index = 0; index < length; index++, offset += 4) values[index] = view.getFloat32(offset, true);
        tensors.push(tf.tensor(values, shape));
      }
      previous = layer.units;
    });
    model.setWeights(tensors);
    const smoke = tf.tidy(() => { const result = model.predict(tf.zeros([1, 126])) as tf.Tensor; return Array.from(result.dataSync()); });
    if (smoke.length !== bundle.labels.length || smoke.some(value => !Number.isFinite(value))) throw new Error('El modelo no superó la prueba de ejecución.');
    return model;
  } catch (error) { model.dispose(); throw error; }
  finally { tensors.forEach(tensor => tensor.dispose()); }
}
export async function verifyBundle(bundle: ModelBundle) { const model = await instantiateBundle(bundle); model.dispose(); }
export async function loadPracticeModel(moduleId: string): Promise<{ model: tf.LayersModel; labels: string[] }> {
  const { data, error } = await supabase.rpc('get_active_model', { p_module: moduleId });
  if (error) throw new Error('No se pudo comprobar la versión publicada.');
  if (data) {
    const bundle = validateBundle(data, allowedModelLabels(moduleId));
    return { model: await instantiateBundle(bundle), labels: bundle.labels };
  }
  // Only the explicit absence of a published version selects the bundled baseline.
  const labelsResponse = await fetch(`/labels_${moduleId}.json`);
  if (!labelsResponse.ok) throw new Error('No se encontraron las etiquetas.');
  const labels: unknown = await labelsResponse.json();
  const model = await tf.loadLayersModel(`/tfjs_${moduleId}/model.json`);
  if (!Array.isArray(labels) || !labels.every(label => typeof label === 'string') || labels.length !== model.outputs[0].shape[1]) { model.dispose(); throw new Error('Modelo y etiquetas incompatibles.'); }
  return { model, labels };
}
