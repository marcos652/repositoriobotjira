// Rate limiter simples em memória (janela fixa). Não sobrevive a cold start /
// não é compartilhado entre instâncias da Vercel — é uma limitação conhecida
// (não há Redis/Firestore funcional disponível neste projeto), mas ainda
// reduz bastante o abuso: cada instância impõe seu próprio limite.
const buckets = new Map<string, { count: number; resetAt: number }>();

let lastPrune = 0;

function pruneExpired(now: number) {
  // Evita crescimento ilimitado do Map sem gastar CPU em toda chamada.
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;

  const allowed = bucket.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - bucket.count),
    retryAfterMs: bucket.resetAt - now,
  };
}
