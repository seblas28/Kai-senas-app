export interface SignProgress { bestScore: number; completed?: boolean; sessions: number; totalTime: number }
export interface PracticeSession { category: string; label: string; score: number; completed?: boolean; timestamp: number }
export interface ProgressSnapshot { version: 2; signs: Record<string, SignProgress>; recentSessions: PracticeSession[] }
export function progressKey(category: string, label: string): string { return category + ':' + label; }
export function storageKey(userId?: string): string { return 'kai:progress:v2:' + (userId || 'guest'); }
export function emptyProgress(): ProgressSnapshot { return { version: 2, signs: {}, recentSessions: [] }; }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const score = (n: unknown): n is number => finite(n) && n >= 0 && n <= 100;
export function parseProgress(raw: string | null): ProgressSnapshot {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 2 || !data.signs || typeof data.signs !== 'object' || Array.isArray(data.signs)) return emptyProgress();
    const signs: Record<string, SignProgress> = {};
    for (const [key, value] of Object.entries(data.signs)) {
      const v = value as SignProgress | null;
      if (!v || !key.includes(':') || !score(v.bestScore) || !Number.isInteger(v.sessions) || v.sessions < 1 || !finite(v.totalTime) || v.totalTime < 0) continue;
      signs[key] = { bestScore: v.bestScore, completed: v.completed === true, sessions: v.sessions, totalTime: v.totalTime };
    }
    const recentSessions = Array.isArray(data.recentSessions) ? data.recentSessions.filter((v: PracticeSession) =>
      v && typeof v.category === 'string' && typeof v.label === 'string' && score(v.score) && finite(v.timestamp)
    ).slice(0, 20) : [];
    return { version: 2, signs, recentSessions };
  } catch { return emptyProgress(); }
}
export function recordAttempt(snapshot: ProgressSnapshot, category: string, label: string, value: number, seconds: number, timestamp = Date.now(), completed = false): ProgressSnapshot {
  if (!score(value) || !finite(seconds) || seconds < 0 || !category || !label) return snapshot;
  const key = progressKey(category, label);
  const previous = snapshot.signs[key] || { bestScore: 0, sessions: 0, totalTime: 0 };
  return { version: 2, signs: { ...snapshot.signs, [key]: {
    bestScore: completed && !previous.completed ? value : Math.max(previous.bestScore, value), completed: previous.completed === true || completed, sessions: previous.sessions + 1, totalTime: previous.totalTime + Math.round(seconds)
  } }, recentSessions: [{ category, label, score: value, completed, timestamp }, ...snapshot.recentSessions].slice(0, 20) };
}
export function categoryAverage(snapshot: ProgressSnapshot, category: string, labels: readonly string[]): number {
  if (!labels.length) return 0;
  return labels.reduce((sum, label) => sum + (snapshot.signs[progressKey(category, label)]?.completed ? snapshot.signs[progressKey(category, label)].bestScore : 0), 0) / labels.length;
}
// Promedio personal de práctica; nunca una marca competitiva validada.
export function globalAverage(values: readonly number[]): number {
  return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0;
}
export function readProgress(userId?: string): ProgressSnapshot {
  try { return parseProgress(localStorage.getItem(storageKey(userId))); } catch { return emptyProgress(); }
}
export function saveAttempt(category: string, label: string, value: number, seconds: number, userId?: string, completed = false): boolean {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(recordAttempt(readProgress(userId), category, label, value, seconds, Date.now(), completed))); return true; }
  catch { return false; }
}
export function clearProgress(userId?: string): void { localStorage.removeItem(storageKey(userId)); }
