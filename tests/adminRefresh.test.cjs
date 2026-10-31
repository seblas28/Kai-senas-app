const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const domain = load('domain/modules.ts');
let auth;
let catalog;
const dependencies = {
  '../../context/AuthContext': { useAuth: () => auth },
  '../../context/CatalogContext': { useCatalog: () => catalog },
  '../../domain/modules': domain,
  '../../data/signData': { getSignsByCategory: () => [{ label: 'A' }] },
  'react-router-dom': { useParams: () => ({ category: 'vocales' }), useLocation: () => ({ pathname: '/administracion/captura/vocales' }), useSearchParams: () => [new URLSearchParams(), () => {}], Link: ({ children, to }) => React.createElement('a', { href: to }, children) },
};
const Gate = load('components/ModuleGate/ModuleGate.tsx', dependencies).default;
const Administration = load('pages/MaintenancePage/MaintenancePage.tsx', {
  ...dependencies,
  '../../lib/supabase': {},
  './ModelsPanel': { default: () => null },
  './MaintenancePage.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
}).default;
function reset(role, loading) {
  auth = { user: role ? { id: 'same-admin', role } : null, roleLoading: loading };
  catalog = { states: domain.moduleStates, modules: [], exercises: [], loading: false, error: null, refresh: async () => {} };
}
function capture() { return renderToStaticMarkup(React.createElement(Gate, { training: true }, React.createElement('video', { 'data-testid': 'capture-camera' }))); }
test('la cámara sigue en el árbol durante una comprobación del mismo administrador', () => {
  for (const role of ['admin', 'superadmin']) {
    reset(role, false);
    const before = capture();
    auth = { ...auth, roleLoading: true };
    assert.equal(capture(), before);
    assert.match(before, /capture-camera/);
  }
});
test('los permisos todavía no conocidos muestran espera y no montan la cámara', () => {
  reset('user', true);
  assert.match(capture(), /Comprobando disponibilidad/);
  assert.doesNotMatch(capture(), /capture-camera/);
});
test('revocar el rol o cerrar sesión bloquea de nuevo el laboratorio', () => {
  for (const role of ['user', null]) {
    reset(role, false);
    assert.match(capture(), /Acceso administrativo/);
    assert.doesNotMatch(capture(), /capture-camera/);
  }
});
test('un fallo de catálogo sigue bloqueando acceso aunque el rol anterior sea admin', () => {
  reset('admin', true);
  catalog.error = 'Catálogo no disponible';
  assert.match(capture(), /Catálogo no disponible/);
  assert.doesNotMatch(capture(), /capture-camera/);
});
test('Administración no sustituye los formularios por el aviso al refrescar permisos', () => {
  reset('admin', true);
  const page = renderToStaticMarkup(React.createElement(Administration));
  assert.match(page, /Mantenimiento|DISPONIBILIDAD/);
  assert.doesNotMatch(page, /Comprobando permisos/);
});
