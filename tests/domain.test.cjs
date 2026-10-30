const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/domain', name + '.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}
const progress = load('progress');
const modules = load('modules');
const math = load('math');

test('la misma etiqueta en dos categorías conserva resultados independientes', () => {
  let snapshot = progress.recordAttempt(progress.emptyProgress(), 'vocales', 'A', 97, 8, 100);
  snapshot = progress.recordAttempt(snapshot, 'abecedario', 'A', 82, 4, 101);
  assert.equal(snapshot.signs['vocales:A'].bestScore, 97);
  assert.equal(snapshot.signs['abecedario:A'].bestScore, 82);
  assert.equal(snapshot.recentSessions[0].category, 'abecedario');
  assert.notEqual(progress.storageKey('one'), progress.storageKey('two'));
  assert.notEqual(progress.storageKey('one'), progress.storageKey());
});
test('el promedio incluye señas pendientes y da igual peso a las categorías', () => {
  const snapshot = progress.recordAttempt(progress.emptyProgress(), 'vocales', 'A', 100, 1);
  assert.equal(progress.categoryAverage(snapshot, 'vocales', ['A', 'E', 'I', 'O', 'U']), 20);
  assert.equal(progress.globalAverage([90, 75, 81]), 82);
  assert.equal(progress.globalAverage([]), 0);
});
test('matemáticas no afecta el promedio en alpha ni beta; estable sí participa', () => {
  for (const stage of ['alpha', 'beta']) {
    const state = { ...modules.moduleStates.matematicas, stage };
    const values = [90, 75, 81];
    if (modules.countsInAverage('matematicas', state)) values.push(100);
    assert.equal(progress.globalAverage(values), 82);
  }
  assert.equal(modules.countsInAverage('matematicas', { ...modules.moduleStates.matematicas, stage: 'stable' }), true);
});
test('mantenimiento visible y oculto bloquean acceso; letras sin modelo también', () => {
  for (const visibility of ['visible', 'hidden']) {
    assert.ok(modules.practiceBlock({ stage: 'stable', status: 'maintenance', visibility }));
  }
  assert.ok(modules.practiceBlock({ stage: 'stable', status: 'active', visibility: 'hidden' }));
  assert.equal(modules.practiceBlock(modules.moduleStates.abecedario, 'B'), null);
  assert.ok(modules.practiceBlock(modules.moduleStates.abecedario, 'Z'));
  const withExercise = { ...modules.moduleStates.vocales, exercises: { A: { status: 'maintenance', visibility: 'visible', reason: 'Actualizando A' } } };
  assert.equal(modules.practiceBlock(withExercise, 'A'), 'Actualizando A');
  assert.equal(modules.practiceBlock(withExercise, 'E'), null);
  assert.ok(modules.practiceBlock({ ...withExercise, status: 'maintenance' }, 'E'));
  assert.equal(modules.isModuleId('__proto__'), false);
});
test('admin puede gestionar, solo superadmin puede aprobar; desconocidos no tienen capacidades', () => {
  assert.equal(modules.canManage('admin'), true);
  assert.equal(modules.canManage('superadmin'), true);
  assert.equal(modules.canApprove('admin'), false);
  assert.equal(modules.canApprove('superadmin'), true);
  for (const role of [undefined, 'user', 'root']) {
    assert.equal(modules.canApprove(role), false);
    assert.equal(modules.canManage(role), false);
  }
});
test('datos corruptos o puntuaciones inválidas no rompen la página ni contaminan las marcas', () => {
  for (const value of ['{', 'null', '[]', '{"version":2,"signs":null}']) assert.deepEqual(progress.parseProgress(value), progress.emptyProgress());
  const snapshot = progress.emptyProgress();
  assert.equal(progress.recordAttempt(snapshot, 'vocales', 'A', 101, 1), snapshot);
  assert.equal(progress.recordAttempt(snapshot, 'vocales', 'A', NaN, 1), snapshot);
  assert.equal(progress.recordAttempt(snapshot, 'vocales', 'A', 50, -1), snapshot);
  const corrupt = JSON.stringify({ version: 2, signs: { 'vocales:A': { bestScore: 900, sessions: 1, totalTime: 1 } } });
  assert.deepEqual(progress.parseProgress(corrupt), progress.emptyProgress());
});
test('un resultado menor no reduce el récord y el historial conserva como máximo 20 sesiones', () => {
  let snapshot = progress.recordAttempt(progress.emptyProgress(), 'vocales', 'A', 99, 2);
  for (let i = 0; i < 25; i++) snapshot = progress.recordAttempt(snapshot, 'vocales', 'A', 50, 1);
  assert.equal(snapshot.signs['vocales:A'].bestScore, 99);
  assert.equal(snapshot.signs['vocales:A'].sessions, 26);
  assert.equal(snapshot.recentSessions.length, 20);
});
test('la calculadora admite cadenas de suma/resta y rechaza código o expresiones incompletas', () => {
  assert.equal(math.evaluateEquation(['10', 'Suma', '3', 'Resta', '2', 'Suma', '4']), 15);
  assert.equal(math.evaluateEquation(['1', 'Resta', '10']), -9);
  for (const tokens of [['1', 'Suma'], ['1', '*', '2'], ['alert(1)', 'Suma', '2']]) assert.throws(() => math.evaluateEquation(tokens));
});
