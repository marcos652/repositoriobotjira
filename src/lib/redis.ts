import { Redis } from '@upstash/redis';

// Cliente Redis compartilhado (Upstash, via integração de Storage da Vercel).
// A integração expõe KV_REST_API_URL/KV_REST_API_TOKEN (nome legado "Vercel
// KV"); um marketplace listing direto do Upstash usaria UPSTASH_REDIS_REST_*
// — aceita os dois pra não depender de qual caminho foi usado pra provisionar.
// Retorna null quando não configurado (ex: dev local sem essas env vars) —
// quem usa deve cair num fallback (arquivo) nesse caso.
let client: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
