import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { supabase } from '../lib/supabase';
import { readProgress, recordAttempt, storageKey, clearProgress, type ProgressSnapshot } from '../domain/progress';
import { parseOutbox, aggregateAttempts, legacyImportId, type CloudAttempt, type StoredAttempt } from '../domain/cloudProgress';
import { isModuleId, practiceBlock } from '../domain/modules';
import { readOutboxStorage, writeOutboxStorage, outboxPrefix } from '../domain/outboxStorage';

interface AttemptInput { category: string; label: string; score: number; seconds: number; completed: boolean }
interface ProgressValue {
  snapshot: ProgressSnapshot;
  loading: boolean;
  error: string | null;
  pendingCount: number;
  refresh: () => Promise<void>;
  save: (attempt: AttemptInput) => Promise<void>;
  retry: () => Promise<void>;
  importGuest: () => Promise<number>;
  resetGuest: () => void;
}
const ProgressContext = createContext<ProgressValue | null>(null);
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { states } = useCatalog();
  const userId = user?.id;
  const queueKey = 'kai:outbox:v1:' + userId;
  const [snapshot, setSnapshot] = useState(() => readProgress(userId));
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const queue = useRef<CloudAttempt[]>([]);
  const remote = useRef<StoredAttempt[]>([]);
  const hasRemote = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const flushPromise = useRef<Promise<void> | null>(null);
  const storeQueue = useCallback((next: CloudAttempt[]) => {
    if (!userId) return;
    queue.current = writeOutboxStorage(localStorage, userId, queue.current, next);
    if (mounted.current) setPendingCount(queue.current.length);
  }, [userId]);
  const publishSnapshot = useCallback((next: ProgressSnapshot) => {
    try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* La nube sigue siendo la fuente principal para cuentas. */ }
    if (mounted.current) setSnapshot(next);
  }, [userId]);
  const refresh = useCallback(async () => {
    if (!userId) { setSnapshot(readProgress()); return; }
    const current = ++generation.current;
    try {
      const rows: StoredAttempt[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('practice_attempts')
          .select('user_id,client_attempt_id,module_id,label,score,completed,duration_seconds,source,created_at')
          .eq('user_id', userId).order('created_at').order('id').range(offset, offset + 499);
        if (error) throw error;
        if (!mounted.current || current !== generation.current) return;
        rows.push(...(data || []).map(row => ({ ...row, source: row.source === 'legacy_import' ? 'legacy_import' as const : 'live_practice' as const })));
        if (!data || data.length < 500) break;
      }
      remote.current = rows;
      hasRemote.current = true;
      const stored = new Set(rows.map(row => row.client_attempt_id));
      if (queue.current.some(row => stored.has(row.client_attempt_id))) storeQueue(queue.current.filter(row => !stored.has(row.client_attempt_id)));
      publishSnapshot(aggregateAttempts(rows, queue.current));
      setError(queue.current.length ? 'Hay sesiones pendientes de sincronización.' : null);
    } catch {
      if (mounted.current && current === generation.current) setError('No se pudo cargar el progreso de tu cuenta. Se muestra la copia de este navegador.');
    } finally { if (mounted.current && current === generation.current) setLoading(false); }
  }, [userId, publishSnapshot, storeQueue]);
  const retry = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    if (flushPromise.current) return flushPromise.current;
    const operation = (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || data.session?.user.id !== userId) throw new Error('La sesión cambió. Vuelve a iniciar sesión para sincronizar.');
      // Una cola por cuenta y UUID por intento evitan envíos cruzados y duplicados.
      const tried = new Set<string>();
      let failed = false;
      while (mounted.current) {
        const attempt = queue.current.find(row => !tried.has(row.client_attempt_id));
        if (!attempt) break;
        tried.add(attempt.client_attempt_id);
        const { error } = await supabase.from('practice_attempts').upsert(attempt, { onConflict: 'user_id,client_attempt_id', ignoreDuplicates: true });
        if (error) { failed = true; continue; }
        remote.current.push({ ...attempt, created_at: new Date().toISOString() });
        storeQueue(queue.current.filter(row => row.client_attempt_id !== attempt.client_attempt_id));
      }
      await refresh();
      if (failed && queue.current.length) throw new Error('Hay sesiones sin sincronizar. Comprueba la conexión, los permisos y el estado de las prácticas.');
    })();
    flushPromise.current = operation;
    void operation.catch(e => { if (mounted.current) setError(e instanceof Error ? e.message : 'No se pudo sincronizar.'); }).finally(() => { flushPromise.current = null; });
    return operation;
  }, [userId, refresh, storeQueue]);
  useEffect(() => {
    mounted.current = true;
    if (userId) {
      try {
        const legacy = parseOutbox(localStorage.getItem(queueKey), userId);
        queue.current = readOutboxStorage(localStorage, userId);
        if (legacy.length) { storeQueue([...queue.current, ...legacy]); localStorage.removeItem(queueKey); }
        setPendingCount(queue.current.length);
      }
      catch { setError('No se pudo abrir la cola local de sesiones.'); }
    }
    void refresh();
    const synchronize = () => { if (!document.hidden) void retry().catch(() => {}); };
    window.addEventListener('online', synchronize);
    window.addEventListener('focus', synchronize);
    const changed = (event: StorageEvent) => {
      if (userId && event.key?.startsWith(outboxPrefix(userId))) {
        queue.current = readOutboxStorage(localStorage, userId);
        setPendingCount(queue.current.length);
        synchronize();
      }
    };
    window.addEventListener('storage', changed);
    if (queue.current.length) void retry().catch(() => {});
    return () => { mounted.current = false; generation.current++; window.removeEventListener('online', synchronize); window.removeEventListener('focus', synchronize); window.removeEventListener('storage', changed); };
  }, [userId, queueKey, refresh, retry, storeQueue]);
  const save = async (input: AttemptInput) => {
    if (!userId) {
      const next = recordAttempt(readProgress(), input.category, input.label, input.score, input.seconds, Date.now(), input.completed);
      localStorage.setItem(storageKey(), JSON.stringify(next));
      setSnapshot(next);
      return;
    }
    const row: CloudAttempt = { user_id: userId, client_attempt_id: crypto.randomUUID(), module_id: input.category, label: input.label, score: input.score, completed: input.completed, duration_seconds: Math.max(0, Math.min(86400, Math.round(input.seconds))), source: 'live_practice' };
    storeQueue([...queue.current, row]);
    // Preservar el historial ya cargado más todas las sesiones pendientes.
    if (hasRemote.current) publishSnapshot(aggregateAttempts(remote.current, queue.current));
    else publishSnapshot(recordAttempt(readProgress(userId), input.category, input.label, input.score, input.seconds, Date.now(), input.completed));
    await retry();
  };
  const importGuest = async () => {
    if (!userId) throw new Error('Inicia sesión para importar.');
    const items: CloudAttempt[] = [];
    for (const [key, value] of Object.entries(readProgress().signs)) {
      const separator = key.indexOf(':');
      const category = key.slice(0, separator), label = key.slice(separator + 1);
      if (!isModuleId(category) || practiceBlock(states[category], label)) continue;
      items.push({ user_id: userId, client_attempt_id: await legacyImportId(userId, category, label, value), module_id: category, label, score: value.bestScore, completed: false, duration_seconds: Math.min(86400, Math.round(value.totalTime)), source: 'legacy_import' });
    }
    if (!mounted.current) throw new Error('La cuenta cambió. Repite la importación.');
    const existing = new Set([...queue.current, ...remote.current].map(row => row.client_attempt_id));
    const fresh = items.filter(row => !existing.has(row.client_attempt_id));
    storeQueue([...queue.current, ...fresh]);
    await retry();
    return fresh.length;
  };
  const resetGuest = () => { if (userId) return; clearProgress(); setSnapshot(readProgress()); };
  return <ProgressContext.Provider value={{ snapshot, loading, error, pendingCount, refresh, save, retry, importGuest, resetGuest }}>{children}</ProgressContext.Provider>;
}
export function useProgress() { const value = useContext(ProgressContext); if (!value) throw new Error('ProgressProvider missing'); return value; }
