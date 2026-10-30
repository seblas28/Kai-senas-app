export type ModuleId = 'vocales' | 'abecedario' | 'numeros' | 'matematicas';
export type AppRole = 'user' | 'admin' | 'superadmin';
export interface ModuleState {
  stage: 'alpha' | 'beta' | 'stable';
  status: 'active' | 'maintenance';
  visibility: 'visible' | 'hidden';
  reason?: string;
  supportedLabels?: readonly string[];
  exercises?: Record<string, { status: 'active' | 'maintenance'; visibility: 'visible' | 'hidden'; reason?: string }>;
}
// Catálogo provisional hasta conectar Supabase. No representa permisos de servidor.
export const moduleStates: Record<ModuleId, ModuleState> = {
  vocales: { stage: 'stable', status: 'active', visibility: 'visible' },
  abecedario: { stage: 'beta', status: 'active', visibility: 'visible', supportedLabels: ['B', 'C'] },
  numeros: { stage: 'stable', status: 'active', visibility: 'visible' },
  matematicas: { stage: 'alpha', status: 'active', visibility: 'visible' },
};
export function isModuleId(value: string | undefined): value is ModuleId {
  return !!value && Object.prototype.hasOwnProperty.call(moduleStates, value);
}
export function canManage(role: AppRole | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}
export function canApprove(role: AppRole | undefined): boolean { return role === 'superadmin'; }
export function practiceBlock(state: ModuleState, label?: string): string | null {
  if (state.visibility === 'hidden' || state.status === 'maintenance') return state.reason || 'Esta práctica está en mantenimiento. Vuelve más tarde.';
  const exercise = label ? state.exercises?.[label] : undefined;
  if (exercise && (exercise.status === 'maintenance' || exercise.visibility === 'hidden')) return exercise.reason || 'Esta seña está en mantenimiento. Vuelve más tarde.';
  if (label && state.supportedLabels && !state.supportedLabels.includes(label)) return 'El modelo de esta seña aún no está disponible.';
  return null;
}
export function countsInAverage(id: ModuleId, state: ModuleState): boolean {
  return id !== 'matematicas' || state.stage === 'stable';
}
