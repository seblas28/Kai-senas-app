const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/domain', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}
const v = load('signValidation');
const p = load('progress');
const E = { sign: 'E', confidence: 0.99 };
const O = { sign: 'O', confidence: 0.9999 };
function hold(state, start, end, step = 100, prediction = E) {
  for (let t = start; t <= end; t += step) state = v.validateSign(state, 'E', prediction, t, t / 1000);
  return state;
}

test('O no completa E aunque la confianza sea alta y se mantenga durante segundos', () => {
  const state = hold(v.emptyValidation(), 0, 4000, 100, O);
  assert.equal(state.completed, false);
  assert.equal(state.progress, 0);
  assert.equal(state.score, 0);
});
test('un frame de E no completa ni puntúa el ejercicio', () => {
  const state = v.validateSign(v.emptyValidation(), 'E', E, 0, 1);
  assert.equal(state.completed, false);
  assert.equal(state.score, 0);
  assert.equal(state.progress, 0);
});
test('E sostenida 1,5 segundos valida y la puntuación usa las predicciones sostenidas', () => {
  const before = hold(v.emptyValidation(), 0, 1400);
  assert.equal(before.completed, false);
  const completed = v.validateSign(before, 'E', E, 1500, 1.5);
  assert.equal(completed.completed, true);
  assert.equal(completed.progress, 100);
  assert.ok(Math.abs(completed.score - 99) < 0.0001);
  assert.equal(v.validateSign(completed, 'E', O, 1600, 1.6), completed);
});
test('O, Nulo, baja confianza, falta de mano o predicción inválida reinician la racha', () => {
  for (const prediction of [O, { sign: 'Nulo', confidence: 1 }, { sign: 'E', confidence: 0.96 }, null, { sign: 'E', confidence: NaN }, { sign: 'E', confidence: 1.01 }]) {
    const partial = hold(v.emptyValidation(), 0, 1000);
    const reset = v.validateSign(partial, 'E', prediction, 1100, 1.1);
    assert.equal(reset.progress, 0);
    const short = hold(reset, 1200, 2000);
    assert.equal(short.completed, false);
  }
});
test('un frame congelado no suma tiempo ni muestras; una pausa larga pierde la racha', () => {
  const first = v.validateSign(v.emptyValidation(), 'E', E, 0, 1);
  const duplicate = v.validateSign(first, 'E', E, 100, 1);
  assert.equal(duplicate.frames, 1);
  assert.equal(duplicate.progress, 0);
  assert.equal(v.validateSign(first, 'E', E, 1600, 1).progress, 0);
  const paused = v.validateSign(hold(v.emptyValidation(), 0, 500), 'E', E, 2500, 2.5);
  assert.equal(paused.frames, 1);
  assert.equal(paused.progress, 0);
});
test('la detección intermitente no acumula segmentos correctos de diferentes rachas', () => {
  let state = v.emptyValidation();
  for (let t = 0; t <= 5000; t += 100) state = v.validateSign(state, 'E', t % 1000 === 900 ? O : E, t, t / 1000);
  assert.equal(state.completed, false);
});
test('detener antes de validar conserva la sesión como incompleta y no marca la tarjeta', () => {
  const snapshot = p.recordAttempt(p.emptyProgress(), 'vocales', 'E', 0, 2, 100, false);
  assert.equal(snapshot.signs['vocales:E'].completed, false);
  assert.equal(p.categoryAverage(snapshot, 'vocales', ['E']), 0);
  assert.equal(snapshot.recentSessions[0].completed, false);
});
test('un pico antiguo de confianza no se considera validado ni contamina la primera validación', () => {
  const legacy = p.parseProgress(JSON.stringify({ version: 2, signs: { 'vocales:E': { bestScore: 100, sessions: 1, totalTime: 2 } }, recentSessions: [] }));
  assert.equal(legacy.signs['vocales:E'].completed, false);
  assert.equal(p.categoryAverage(legacy, 'vocales', ['E']), 0);
  const validated = p.recordAttempt(legacy, 'vocales', 'E', 98, 2, 101, true);
  assert.equal(validated.signs['vocales:E'].bestScore, 98);
  assert.equal(validated.signs['vocales:E'].completed, true);
});
test('un intento fallido posterior no borra una validación anterior', () => {
  const validated = p.recordAttempt(p.emptyProgress(), 'vocales', 'E', 99, 2, 1, true);
  const stopped = p.recordAttempt(validated, 'vocales', 'E', 0, 1, 2, false);
  assert.equal(stopped.signs['vocales:E'].completed, true);
  assert.equal(stopped.signs['vocales:E'].bestScore, 99);
  assert.equal(stopped.recentSessions[0].completed, false);
});
