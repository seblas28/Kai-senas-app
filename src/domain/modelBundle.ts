/** Small, declarative network: no executable code, URLs or custom Keras layers. */
export interface ModelBundle {
  schemaVersion: 1;
  inputFeatures: 126;
  labels: string[];
  network: { units: number; activation: 'relu' | 'softmax'; dropout: number }[];
  weightData: string;
}
export const MAX_MODEL_BYTES = 2 * 1024 * 1024;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Formato de modelo inválido.');
  return value as Record<string, unknown>;
};
export function decodeWeights(encoded: string): ArrayBuffer {
  if (!encoded || encoded.length > MAX_MODEL_BYTES || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('Pesos inválidos o demasiado grandes.');
  const text = atob(encoded);
  return Uint8Array.from(text, char => char.charCodeAt(0)).buffer;
}
export function validateBundle(value: unknown, allowedLabels: readonly string[]): ModelBundle {
  const bundle = record(value);
  if (JSON.stringify(value).length > MAX_MODEL_BYTES || bundle.schemaVersion !== 1 || bundle.inputFeatures !== 126) throw new Error('El modelo debe usar el formato Kai v1 y 126 coordenadas.');
  if (!Array.isArray(bundle.labels) || bundle.labels.length < 2 || bundle.labels.length > 50 || !bundle.labels.every(label => typeof label === 'string' && (label === 'Nulo' || allowedLabels.includes(label))) || !bundle.labels.includes('Nulo') || new Set(bundle.labels).size !== bundle.labels.length) throw new Error('Las etiquetas deben pertenecer al módulo, ser únicas e incluir Nulo.');
  if (!Array.isArray(bundle.network) || bundle.network.length < 1 || bundle.network.length > 6) throw new Error('La red debe tener entre 1 y 6 capas densas.');
  let previous = 126, floats = 0;
  bundle.network.forEach((item, index, list) => {
    const layer = record(item), last = index === list.length - 1;
    if (!Number.isInteger(layer.units) || Number(layer.units) < 1 || Number(layer.units) > 256 || layer.activation !== (last ? 'softmax' : 'relu') || typeof layer.dropout !== 'number' || !Number.isFinite(layer.dropout) || layer.dropout < 0 || layer.dropout > .8 || (last && (layer.dropout !== 0 || layer.units !== (bundle.labels as string[]).length))) throw new Error('Arquitectura no compatible: capas Dense/ReLU, Dropout y salida Softmax.');
    floats += (previous + 1) * Number(layer.units); previous = Number(layer.units);
  });
  if (typeof bundle.weightData !== 'string') throw new Error('Faltan los pesos.');
  const bytes = decodeWeights(bundle.weightData);
  if (bytes.byteLength !== floats * 4) throw new Error('El tamaño de los pesos no coincide con las capas.');
  const view = new DataView(bytes);
  for (let offset = 0; offset < bytes.byteLength; offset += 4) if (!Number.isFinite(view.getFloat32(offset, true))) throw new Error('Los pesos contienen valores no finitos.');
  return bundle as unknown as ModelBundle;
}

/** Converts the existing TFJS export, keeping only the supported declarative data. */
export function packTfjs(modelValue: unknown, labelsValue: unknown, shards: ReadonlyMap<string, ArrayBuffer>, allowedLabels: readonly string[]): ModelBundle {
  const model = record(modelValue), topology = record(model.modelTopology);
  const config = record(topology.model_config || topology);
  if (config.class_name !== 'Sequential') throw new Error('Solo se admiten modelos Sequential.');
  const layers = record(config.config).layers;
  if (!Array.isArray(layers)) throw new Error('No se encontraron las capas.');
  const network: ModelBundle['network'] = [];
  const expected: { name: string; shape: number[] }[] = [];
  let previous = 126, inputFound = false;
  for (const item of layers) {
    const layer = record(item), settings = record(layer.config);
    const input = settings.batch_input_shape || settings.batch_shape || settings.input_shape;
    if (input) {
      if (!Array.isArray(input) || input[input.length - 1] !== 126 || input.length > 2) throw new Error('La entrada debe tener 126 coordenadas.');
      inputFound = true;
    }
    if (layer.class_name === 'InputLayer' && network.length === 0) continue;
    if (layer.class_name === 'Dropout' && network.length && network[network.length - 1].dropout === 0) { network[network.length - 1].dropout = Number(settings.rate); continue; }
    if (layer.class_name !== 'Dense' || settings.use_bias !== true || typeof settings.name !== 'string') throw new Error('Solo se admiten InputLayer, Dense con sesgo y Dropout.');
    const units = Number(settings.units);
    expected.push({ name: `${settings.name}/kernel`, shape: [previous, units] }, { name: `${settings.name}/bias`, shape: [units] });
    network.push({ units, activation: settings.activation as 'relu' | 'softmax', dropout: 0 }); previous = units;
  }
  if (!inputFound) throw new Error('No se encontró la forma de entrada.');
  if (!Array.isArray(model.weightsManifest)) throw new Error('Falta el manifiesto de pesos.');
  const weights: unknown[] = [], buffers: ArrayBuffer[] = [];
  for (const item of model.weightsManifest) {
    const group = record(item);
    if (!Array.isArray(group.paths) || !Array.isArray(group.weights)) throw new Error('Manifiesto inválido.');
    weights.push(...group.weights);
    for (const file of group.paths) {
      if (typeof file !== 'string' || !/^[A-Za-z0-9_.-]+\.bin$/.test(file) || !shards.has(file)) throw new Error(`Falta el archivo de pesos: ${String(file)}`);
      buffers.push(shards.get(file)!);
    }
  }
  if (weights.length !== expected.length || weights.some((value, index) => { const weight = record(value); return weight.dtype !== 'float32' || weight.quantization != null || weight.name !== expected[index].name || JSON.stringify(weight.shape) !== JSON.stringify(expected[index].shape); })) throw new Error('Los pesos no coinciden con la arquitectura o están cuantizados.');
  const total = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  if (total > MAX_MODEL_BYTES) throw new Error('El modelo supera el límite de tamaño.');
  const joined = new Uint8Array(total); let offset = 0;
  for (const buffer of buffers) { joined.set(new Uint8Array(buffer), offset); offset += buffer.byteLength; }
  let binary = ''; for (let index = 0; index < joined.length; index += 8192) binary += String.fromCharCode(...joined.subarray(index, index + 8192));
  return validateBundle({ schemaVersion: 1, inputFeatures: 126, labels: labelsValue, network, weightData: btoa(binary) }, allowedLabels);
}
