import { isModuleId, moduleStates, type ModuleId, type ModuleState } from './modules';
export interface ModuleRow { id: string; stage: string; status: string; visibility: string; maintenance_reason: string }
export interface ExerciseRow { module_id: string; label: string; supported: boolean; status: string; visibility: string; maintenance_reason: string }

export function buildCatalog(modules: readonly ModuleRow[], exercises: readonly ExerciseRow[]): Record<ModuleId, ModuleState> {
  const result: Record<ModuleId, ModuleState> = { ...moduleStates };
  for (const id of Object.keys(moduleStates)) {
    if (isModuleId(id)) result[id] = { ...moduleStates[id], visibility: 'hidden', status: 'maintenance', reason: 'Curso no disponible.', supportedLabels: [], exercises: {} };
  }
  for (const row of modules) {
    if (!isModuleId(row.id) || !['alpha','beta','stable'].includes(row.stage) || !['active','maintenance'].includes(row.status) || !['visible','hidden'].includes(row.visibility)) continue;
    const details = exercises.filter(e => e.module_id === row.id);
    result[row.id] = {
      stage: row.stage as ModuleState['stage'], status: row.status as ModuleState['status'], visibility: row.visibility as ModuleState['visibility'], reason: row.maintenance_reason,
      supportedLabels: details.filter(e => e.supported).map(e => e.label),
      exercises: Object.fromEntries(details.map(e => [e.label, {
        status: e.supported && e.status === 'active' ? 'active' : 'maintenance',
        visibility: e.visibility === 'visible' ? 'visible' : 'hidden',
        reason: e.maintenance_reason || (!e.supported ? 'El modelo de esta seña aún no está disponible.' : ''),
      }])),
    };
  }
  return result;
}
