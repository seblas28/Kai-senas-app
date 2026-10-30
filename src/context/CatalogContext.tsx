import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { buildCatalog, type ModuleRow, type ExerciseRow } from '../domain/catalog';
import { type ModuleId, type ModuleState } from '../domain/modules';
import { useAuth } from './AuthContext';

interface CatalogValue {
  states: Record<ModuleId, ModuleState>;
  modules: ModuleRow[];
  exercises: ExerciseRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
const CatalogContext = createContext<CatalogValue | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role;
  const [data, setData] = useState({ modules: [] as ModuleRow[], exercises: [] as ExerciseRow[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const [modules, exercises] = await Promise.all([
        supabase.from('modules').select('id,stage,status,visibility,maintenance_reason').order('id'),
        supabase.from('exercises').select('module_id,label,supported,status,visibility,maintenance_reason').order('module_id').order('label'),
      ]);
      if (current !== generation.current) return;
      if (modules.error || exercises.error) throw new Error('catalog');
      setData({ modules: modules.data || [], exercises: exercises.data || [] });
      setError(null);
    } catch {
      if (current === generation.current) setError('No se pudo comprobar la disponibilidad de los cursos. Inténtalo de nuevo.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [role]);
  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = window.setInterval(update, 20000);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  return <CatalogContext.Provider value={{ states: buildCatalog(data.modules, data.exercises), ...data, loading, error, refresh }}>{children}</CatalogContext.Provider>;
}
export function useCatalog() { const value = useContext(CatalogContext); if (!value) throw new Error('CatalogProvider missing'); return value; }
