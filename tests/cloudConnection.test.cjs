const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/domain', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module','exports','require',code)(module,module.exports,id => load(id.replace('./','')));
  cache.set(name,module.exports); return module.exports;
}
const cloud = load('cloudProgress');
const catalog = load('catalog');
const progress = load('progress');
const modules = load('modules');
const outbox = load('outboxStorage');
const id = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const row = { user_id: 'one', client_attempt_id: id, module_id: 'vocales', label: 'E', score: 99, completed: true, duration_seconds: 2, source: 'live_practice', created_at: '2026-10-30T12:00:00Z' };

test('la cola de una cuenta excluye intentos de otra, datos corruptos y duplicados', () => {
  const parsed = cloud.parseOutbox(JSON.stringify([row, row, { ...row, user_id: 'two', client_attempt_id: id2 }, { ...row, score: 999 }, { ...row, completed: true, source: 'legacy_import' }]), 'one');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].user_id, 'one');
  assert.deepEqual(cloud.parseOutbox('{','one'), []);
  assert.deepEqual(cloud.parseOutbox('null','one'), []);
});
test('el mismo intento remoto y pendiente se cuenta una sola vez', () => {
  const snapshot = cloud.aggregateAttempts([row, row], [row]);
  assert.equal(snapshot.signs['vocales:E'].sessions, 1);
  assert.equal(snapshot.signs['vocales:E'].completed, true);
  assert.equal(snapshot.recentSessions.length, 1);
});
test('los resúmenes importados no completan señas ni se cuentan en el promedio', () => {
  const snapshot = cloud.aggregateAttempts([{ ...row, source: 'legacy_import', completed: false }]);
  assert.equal(snapshot.signs['vocales:E'].completed, false);
  assert.equal(progress.categoryAverage(snapshot, 'vocales', ['E']), 0);
});

test('un resumen de legado no mejora una validación obtenida en la cuenta', () => {
  const snapshot = cloud.aggregateAttempts([row, { ...row, client_attempt_id: id2, source:'legacy_import', score:100, completed:false }]);
  assert.equal(snapshot.signs['vocales:E'].bestScore,99);
  assert.equal(progress.categoryAverage(snapshot,'vocales',['E']),99);
});
test('un fallo posterior no borra la mejor validación remota', () => {
  const snapshot = cloud.aggregateAttempts([row], [{ ...row, client_attempt_id: id2, score: 0, completed: false }]);
  assert.equal(snapshot.signs['vocales:E'].bestScore, 99);
  assert.equal(snapshot.signs['vocales:E'].sessions, 2);
  assert.equal(snapshot.recentSessions[0].completed, false);
});
test('la importación repetida genera el mismo UUID; otra cuenta recibe uno diferente', async () => {
  const value = { bestScore: 99, completed: true, sessions: 1, totalTime: 2 };
  const a = await cloud.legacyImportId('one','vocales','E',value);
  const b = await cloud.legacyImportId('one','vocales','E',value);
  const c = await cloud.legacyImportId('two','vocales','E',value);
  assert.equal(a,b); assert.notEqual(a,c);
  assert.match(a, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('un catálogo vacío no habilita prácticas desde valores locales antiguos', () => {
  const states = catalog.buildCatalog([],[]);
  for (const state of Object.values(states)) {
    assert.equal(state.visibility,'hidden');
    assert.ok(modules.practiceBlock(state));
  }
});
test('catálogo remoto aplica mantenimiento y modelos disponibles por seña', () => {
  const states = catalog.buildCatalog([{ id: 'vocales', stage: 'stable', status: 'active', visibility: 'visible', maintenance_reason: '' }], [
    { module_id: 'vocales', label: 'E', supported: true, status: 'maintenance', visibility: 'visible', maintenance_reason: 'Revisión E' },
    { module_id: 'vocales', label: 'O', supported: true, status: 'active', visibility: 'visible', maintenance_reason: '' },
    { module_id: 'vocales', label: 'A', supported: false, status: 'active', visibility: 'visible', maintenance_reason: '' },
  ]);
  assert.equal(modules.practiceBlock(states.vocales,'E'),'Revisión E');
  assert.equal(modules.practiceBlock(states.vocales,'O'),null);
  assert.ok(modules.practiceBlock(states.vocales,'A'));
  assert.ok(modules.practiceBlock(states.vocales,'U'));
});
test('matemáticas beta sigue excluida aunque el catálogo venga del servidor', () => {
  const states = catalog.buildCatalog([{ id:'matematicas',stage:'beta',status:'active',visibility:'visible',maintenance_reason:'' }],[]);
  assert.equal(modules.countsInAverage('matematicas',states.matematicas),false);
});

test('la cola de otra pestaña sobrevive a escrituras y borrados de una pestaña desactualizada', () => {
  const entries = new Map();
  const storage = { get length() { return entries.size; }, key: i => [...entries.keys()][i] || null, getItem: key => entries.get(key) || null, setItem: (key,value) => entries.set(key,value), removeItem: key => entries.delete(key) };
  const a = { ...row }, b = { ...row, client_attempt_id: id2 };
  outbox.writeOutboxStorage(storage,'one',[],[a]);
  outbox.writeOutboxStorage(storage,'one',[],[b]);
  assert.equal(outbox.readOutboxStorage(storage,'one').length,2);
  outbox.writeOutboxStorage(storage,'one',[a],[]);
  assert.deepEqual(outbox.readOutboxStorage(storage,'one').map(v => v.client_attempt_id),[id2]);
  assert.deepEqual(outbox.readOutboxStorage(storage,'two'),[]);
});

test('la cola descarta columnas no permitidas antes de enviarlas', () => {
  const parsed = cloud.parseOutbox(JSON.stringify([{ ...row, role:'superadmin', created_at:'2020-01-01', id:'server-id' }]),'one');
  assert.equal(parsed[0].role, undefined);
  assert.equal(parsed[0].created_at, undefined);
  assert.equal(parsed[0].id, undefined);
});
