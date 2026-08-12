import fs from 'fs';
import path from 'path';
import { getRedisClient } from '@/lib/redis';

// Limite diário GLOBAL de demandas criadas — soma jiraops (painel) + bot, não é
// por usuário nem por IP: é um único contador compartilhado por todo o sistema.
//
// Fonte de verdade: Upstash Redis (via integração da Vercel), com INCR/DECR
// atômicos — garante o teto de 6/dia certinho mesmo com várias instâncias
// serverless simultâneas. Se UPSTASH_REDIS_REST_URL/TOKEN não estiverem
// configuradas (ex: dev local sem essa integração), cai automaticamente pro
// mesmo esquema de arquivo + fallback /tmp usado no resto do projeto — nesse
// modo o teto pode passar um pouco de 6 sob concorrência entre instâncias,
// mesma limitação já documentada em rateLimit.ts e _store.ts.
const MAX_PER_DAY = 6;

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function redisKey(): string {
  return `jiraops:demanda-limit:${todayKey()}`;
}

// ── Fallback em arquivo (usado só quando o Redis não está configurado) ──

interface CounterData {
  date: string; // YYYY-MM-DD no fuso de São Paulo
  count: number;
}

const PROJECT_PATH = () => path.join(process.cwd(), 'data', 'demanda-limit.json');
const TMP_PATH = '/tmp/jiraops-demanda-limit.json';

function getWritablePath(): string {
  try {
    const projectPath = PROJECT_PATH();
    const dataDir = path.dirname(projectPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    return projectPath;
  } catch {
    return TMP_PATH;
  }
}

function readCounter(): CounterData {
  try {
    const filePath = getWritablePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data && data.date === todayKey() && typeof data.count === 'number') {
        return data;
      }
    }
  } catch {}
  return { date: todayKey(), count: 0 };
}

function writeCounter(data: CounterData): void {
  try {
    fs.writeFileSync(getWritablePath(), JSON.stringify(data), 'utf-8');
  } catch {}
}

function reserveViaFile(): { allowed: boolean; count: number; max: number } {
  const counter = readCounter();
  if (counter.count >= MAX_PER_DAY) {
    return { allowed: false, count: counter.count, max: MAX_PER_DAY };
  }
  counter.count += 1;
  writeCounter(counter);
  return { allowed: true, count: counter.count, max: MAX_PER_DAY };
}

function releaseViaFile(): void {
  const counter = readCounter();
  counter.count = Math.max(0, counter.count - 1);
  writeCounter(counter);
}

// ── API pública ──

// Reserva atomicamente uma vaga da cota diária ANTES de tentar criar a demanda
// no Jira. Se retornar allowed=false, não crie nada. Se retornar allowed=true
// mas a criação falhar depois, chame releaseDemandaSlot() para devolver a vaga
// (assim só demandas de fato criadas consomem a cota).
export async function reserveDemandaSlot(): Promise<{ allowed: boolean; count: number; max: number }> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = redisKey();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 60 * 60 * 30); // 30h — cobre fuso/clock skew sem acumular chaves velhas
      }
      if (count > MAX_PER_DAY) {
        await redis.decr(key);
        return { allowed: false, count: MAX_PER_DAY, max: MAX_PER_DAY };
      }
      return { allowed: true, count, max: MAX_PER_DAY };
    } catch (e: any) {
      console.error('[DemandaLimit] Redis indisponível, usando fallback em arquivo:', e?.message || e);
    }
  }
  return reserveViaFile();
}

export async function releaseDemandaSlot(): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.decr(redisKey());
      return;
    } catch (e: any) {
      console.error('[DemandaLimit] Redis indisponível ao liberar vaga:', e?.message || e);
    }
  }
  releaseViaFile();
}

export async function getDailyDemandaStatus(): Promise<{ count: number; max: number; remaining: number }> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<number>(redisKey());
      const count = Number(raw) || 0;
      return { count, max: MAX_PER_DAY, remaining: Math.max(0, MAX_PER_DAY - count) };
    } catch (e: any) {
      console.error('[DemandaLimit] Redis indisponível ao ler status:', e?.message || e);
    }
  }
  const counter = readCounter();
  return { count: counter.count, max: MAX_PER_DAY, remaining: Math.max(0, MAX_PER_DAY - counter.count) };
}
