export const VALIDATION_CONFIDENCE = 0.97;
export const VALIDATION_HOLD_MS = 1500;
export const VALIDATION_MAX_GAP_MS = 250;
export const VALIDATION_MIN_FRAMES = 8;

export interface SignPrediction { sign: string; confidence: number }
export interface SignValidation {
  since: number | null;
  lastTimestamp: number | null;
  lastFrame: number | null;
  frames: number;
  confidenceSum: number;
  progress: number;
  completed: boolean;
  score: number;
}

export function emptyValidation(): SignValidation {
  return { since: null, lastTimestamp: null, lastFrame: null, frames: 0, confidenceSum: 0, progress: 0, completed: false, score: 0 };
}

// Recibir únicamente frames nuevos del video; el tiempo de espera no prueba una seña.
export function validateSign(previous: SignValidation, expected: string | undefined, prediction: SignPrediction | null, timestamp: number, frame: number): SignValidation {
  if (previous.completed) return previous;
  if (!expected || !Number.isFinite(timestamp) || !Number.isFinite(frame) || !prediction || prediction.sign !== expected || !Number.isFinite(prediction.confidence) || prediction.confidence < VALIDATION_CONFIDENCE || prediction.confidence > 1) return emptyValidation();
  if (previous.lastFrame !== null && frame === previous.lastFrame) {
    return previous.lastTimestamp !== null && (timestamp < previous.lastTimestamp || timestamp - previous.lastTimestamp > VALIDATION_MAX_GAP_MS) ? emptyValidation() : previous;
  }
  const interrupted = previous.lastTimestamp === null || timestamp <= previous.lastTimestamp || timestamp - previous.lastTimestamp > VALIDATION_MAX_GAP_MS || (previous.lastFrame !== null && frame < previous.lastFrame);
  const base = interrupted ? emptyValidation() : previous;
  const since = base.since ?? timestamp;
  const frames = base.frames + 1;
  const confidenceSum = base.confidenceSum + prediction.confidence;
  const elapsed = timestamp - since;
  const completed = elapsed >= VALIDATION_HOLD_MS && frames >= VALIDATION_MIN_FRAMES;
  return {
    since, lastTimestamp: timestamp, lastFrame: frame, frames, confidenceSum,
    progress: completed ? 100 : Math.min(99, elapsed / VALIDATION_HOLD_MS * 100),
    completed,
    score: completed ? confidenceSum / frames * 100 : 0,
  };
}
