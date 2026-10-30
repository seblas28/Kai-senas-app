import { emptyProgress, recordAttempt, type ProgressSnapshot, type SignProgress } from './progress';
import { isModuleId } from './modules';

export interface CloudAttempt {
  user_id: string;
  client_attempt_id: string;
  module_id: string;
  label: string;
  score: number;
  completed: boolean;
  duration_seconds: number;
  source: 'live_practice' | 'legacy_import';
}
export interface StoredAttempt extends CloudAttempt { created_at: string }

export function parseOutbox(raw: string | null, userId: string): CloudAttempt[] {
  try {
    const items: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    return items.filter((v): v is CloudAttempt => {
      if (!v || typeof v !== 'object') return false;
      const row = v as CloudAttempt;
      if (row.user_id !== userId || !isModuleId(row.module_id) || typeof row.label !== 'string' || !row.label || row.label.length > 40 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.client_attempt_id) || !Number.isFinite(row.score) || row.score < 0 || row.score > 100 || !Number.isInteger(row.duration_seconds) || row.duration_seconds < 0 || row.duration_seconds > 86400 || typeof row.completed !== 'boolean' || !['live_practice', 'legacy_import'].includes(row.source)) return false;
      if (row.completed && (row.source !== 'live_practice' || row.score < 97)) return false;
      if (seen.has(row.client_attempt_id)) return false;
      seen.add(row.client_attempt_id);
      return true;
    }).map(row => ({ user_id: row.user_id, client_attempt_id: row.client_attempt_id, module_id: row.module_id, label: row.label, score: row.score, completed: row.completed, duration_seconds: row.duration_seconds, source: row.source }));
  } catch { return []; }
}

export function aggregateAttempts(rows: readonly StoredAttempt[], pending: readonly CloudAttempt[] = []): ProgressSnapshot {
  let snapshot = emptyProgress();
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.client_attempt_id)) continue;
    seen.add(row.client_attempt_id);
    snapshot = recordAttempt(snapshot, row.module_id, row.label, Number(row.score), row.duration_seconds, Date.parse(row.created_at), row.completed && row.source === 'live_practice');
  }
  for (const row of pending) {
    if (seen.has(row.client_attempt_id)) continue;
    seen.add(row.client_attempt_id);
    snapshot = recordAttempt(snapshot, row.module_id, row.label, row.score, row.duration_seconds, Date.now(), row.completed && row.source === 'live_practice');
  }
  return snapshot;
}

// Mismo resumen + misma cuenta => mismo UUID en cualquier pestaña o reintento.
export async function legacyImportId(userId: string, category: string, label: string, value: SignProgress): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([userId, category, label, value.bestScore, value.sessions, value.totalTime]))));
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), v => v.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
}
