const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const tf = require('@tensorflow/tfjs');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const bundles = load('domain/modelBundle');
const labels = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/labels_vocales.json')));
const original = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/tfjs_vocales/model.json')));
const shards = new Map(original.weightsManifest.flatMap(group => group.paths).map(name => {
  const bytes = fs.readFileSync(path.join(__dirname, '../public/tfjs_vocales', name));
  return [name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)];
}));
const packed = bundles.packTfjs(original, labels, shards, labels);
const copy = () => JSON.parse(JSON.stringify(packed));
test('convierte la exportación real sin cargar código, rutas ni configuración Keras', () => {
  assert.equal(packed.inputFeatures, 126);
  assert.deepEqual(packed.network.map(layer => layer.units), [128, 64, 6]);
  assert.equal(packed.modelTopology, undefined);
  assert.deepEqual(packed.labels, labels);
});
test('acepta las exportaciones completas y exige Nulo al abecedario antiguo', () => {
  for (const category of ['vocales', 'abecedario', 'numeros', 'matematicas']) {
    const root = path.join(__dirname, '../public');
    const model = JSON.parse(fs.readFileSync(path.join(root, `tfjs_${category}/model.json`)));
    const labels = JSON.parse(fs.readFileSync(path.join(root, `labels_${category}.json`)));
    const shards = new Map(model.weightsManifest.flatMap(group => group.paths).map(name => {
      const bytes = fs.readFileSync(path.join(root, `tfjs_${category}`, name));
      return [name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)];
    }));
    if (category === 'abecedario') assert.throws(() => bundles.packTfjs(model, labels, shards, labels), /Nulo/);
    else assert.deepEqual(bundles.packTfjs(model, labels, shards, labels).labels, labels);
  }
});
test('rechaza etiquetas duplicadas, ajenas y ausencia de Nulo', () => {
  for (const bad of [[...labels.slice(0, -1), labels[0]], [...labels.slice(0, -1), 'WRONG'], labels.slice(0, -1)]) {
    const bundle = copy(); bundle.labels = bad; assert.throws(() => bundles.validateBundle(bundle, labels));
  }
});
test('rechaza pesos incompletos, NaN e Infinity', () => {
  const bundle = copy(); bundle.weightData = 'AAAA'; assert.throws(() => bundles.validateBundle(bundle, labels));
  for (const value of [NaN, Infinity, -Infinity]) {
    const bundle = copy(), bytes = Buffer.from(bundle.weightData, 'base64'); bytes.writeFloatLE(value, 0); bundle.weightData = bytes.toString('base64'); assert.throws(() => bundles.validateBundle(bundle, labels));
  }
});
test('rechaza redes grandes, capas arbitrarias y entradas incompatibles', () => {
  const bundle = copy(); bundle.network[0].units = 999; assert.throws(() => bundles.validateBundle(bundle, labels));
  const model = structuredClone(original); model.modelTopology.model_config.config.layers[1].class_name = 'Lambda'; assert.throws(() => bundles.packTfjs(model, labels, shards, labels));
  const wrongInput = copy(); wrongInput.inputFeatures = 63; assert.throws(() => bundles.validateBundle(wrongInput, labels));
});
test('rechaza manifiestos con URLs, shards faltantes y pesos cuantizados', () => {
  for (const file of ['https://example.com/weights.bin', '../weights.bin', 'missing.bin']) {
    const model = structuredClone(original); model.weightsManifest[0].paths[0] = file; assert.throws(() => bundles.packTfjs(model, labels, shards, labels));
  }
  const model = structuredClone(original); model.weightsManifest[0].weights[0].quantization = { dtype: 'uint8' }; assert.throws(() => bundles.packTfjs(model, labels, shards, labels));
});
const rpc = { data: null, error: null };
const runtime = load('lib/modelRuntime', { '../domain/modelBundle': bundles, './supabase': { supabase: { rpc: async () => rpc } }, '../data/signData': { getSignsByCategory: () => labels.map(label => ({ label })) } });
test('el paquete conserva las predicciones del modelo original y libera tensores', async () => {
  const initial = tf.memory().numTensors;
  const joined = Buffer.concat([...shards.values()].map(bytes => Buffer.from(bytes)));
  const expected = await tf.loadLayersModel(tf.io.fromMemory({ modelTopology: original.modelTopology, weightSpecs: original.weightsManifest.flatMap(group => group.weights), weightData: joined.buffer.slice(joined.byteOffset, joined.byteOffset + joined.byteLength) }));
  const actual = await runtime.instantiateBundle(packed);
  const input = tf.tensor2d(Array.from({ length: 126 }, (_, index) => index / 126), [1, 126]);
  const a = expected.predict(input), b = actual.predict(input);
  const left = Array.from(await a.data()), right = Array.from(await b.data());
  left.forEach((value, index) => assert.ok(Math.abs(value - right[index]) < 1e-6));
  a.dispose(); b.dispose(); input.dispose(); expected.dispose(); actual.dispose();
  assert.equal(tf.memory().numTensors, initial);
});
test('una versión remota inválida o una caída no usa silenciosamente el modelo base', async () => {
  rpc.error = new Error('offline'); await assert.rejects(() => runtime.loadPracticeModel('vocales'));
  rpc.error = null; rpc.data = { bad: true }; await assert.rejects(() => runtime.loadPracticeModel('vocales'));
  rpc.data = packed; const loaded = await runtime.loadPracticeModel('vocales'); assert.deepEqual(loaded.labels, labels); loaded.model.dispose();
});
