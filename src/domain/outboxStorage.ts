import { parseOutbox, type CloudAttempt } from './cloudProgress';
export type QueueStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
export function outboxPrefix(userId: string): string { return 'kai:outbox:v2:' + userId + ':'; }
export function readOutboxStorage(storage: QueueStorage, userId: string): CloudAttempt[] {
  const prefix = outboxPrefix(userId);
  const rows: CloudAttempt[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const raw = storage.getItem(key);
    if (raw) rows.push(...parseOutbox('[' + raw + ']', userId));
  }
  return rows;
}
// Cada UUID tiene una clave propia: una pestaña no reemplaza la cola de otra.
export function writeOutboxStorage(storage: QueueStorage, userId: string, previous: readonly CloudAttempt[], next: readonly CloudAttempt[]): CloudAttempt[] {
  const prefix = outboxPrefix(userId);
  const kept = new Set(next.map(row => row.client_attempt_id));
  for (const row of next) storage.setItem(prefix + row.client_attempt_id, JSON.stringify(row));
  for (const row of previous) if (!kept.has(row.client_attempt_id)) storage.removeItem(prefix + row.client_attempt_id);
  return readOutboxStorage(storage, userId);
}
