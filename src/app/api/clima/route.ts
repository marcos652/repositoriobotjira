// ============================================
//  API: /api/clima — tempo agora em Marília/SP
// ============================================
//
// Fonte: Open-Meteo (api.open-meteo.com). Escolhida por não exigir chave de API — nada de
// segredo novo para gerenciar em produção. Medido: ~840ms por chamada.
//
// Coordenada FIXA, e não busca por nome: existem outras duas "Marília" (uma na Bahia e uma
// em Serra Leoa), e uma busca textual poderia silenciosamente passar a mostrar o tempo da
// cidade errada. Conferido no geocoding da própria Open-Meteo:
//   Marília, São Paulo, Brasil — lat -22.21389, lon -49.94583, 240.590 hab.

import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const LAT = -22.21389;
const LON = -49.94583;
const CIDADE = 'Marília';

// 15 min: é o intervalo em que a própria Open-Meteo atualiza o "current" (o campo `interval`
// da resposta vem como 900s). Pedir mais que isso não traz dado novo, só gasta a cota.
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_KEY = 'jiraops:clima:marilia';

export type TipoTempo = 'sol' | 'nuvem' | 'chuva' | 'tempestade' | 'neve' | 'nevoeiro';

export interface HoraPrevista {
  /** "HH:MM" em hora de Marília. */
  hora: string;
  temperatura: number;
  /** Probabilidade de chuva, 0..100. */
  chuva: number;
}
// Sem `tipo` aqui de propósito: o is_day da Open-Meteo vale só para o "agora", então a
// condição por hora sairia como "sol" às 22h. Guardar dado errado é pior que não guardar; a
// probabilidade de chuva já responde o que a dica precisa dizer.

export interface Clima {
  cidade: string;
  temperatura: number;
  sensacao: number | null;
  tipo: TipoTempo;
  descricao: string;
  /** Dia ou noite, para o ícone de céu limpo virar lua em vez de sol. */
  dia: boolean;
  medidoEm: string;
  vento: number | null;
  umidade: number | null;
  minima: number | null;
  maxima: number | null;
  /** Próximas horas, para avisar antes de a chuva chegar. */
  horas: HoraPrevista[];
  /** Primeira hora à frente com chance relevante de chuva; null quando não há. */
  alertaChuva: { hora: string; probabilidade: number } | null;
}

/** A partir de quantos % a chuva deixa de ser curiosidade e passa a mudar uma decisão. */
const LIMIAR_CHUVA = 50;
/** Quantas horas à frente olhar. */
const HORAS_A_FRENTE = 6;

/**
 * Código WMO -> tipo + descrição. A tabela é a do padrão WMO usada pela Open-Meteo; os
 * intervalos cobrem TODOS os códigos possíveis, e o default cai em 'nuvem' para um código
 * novo nunca aparecer como buraco na tela.
 */
function traduzir(codigo: number): { tipo: TipoTempo; descricao: string } {
  if (codigo === 0) return { tipo: 'sol', descricao: 'Céu limpo' };
  if (codigo === 1) return { tipo: 'sol', descricao: 'Predominantemente limpo' };
  if (codigo === 2) return { tipo: 'nuvem', descricao: 'Parcialmente nublado' };
  if (codigo === 3) return { tipo: 'nuvem', descricao: 'Nublado' };
  if (codigo === 45 || codigo === 48) return { tipo: 'nevoeiro', descricao: 'Nevoeiro' };
  if (codigo >= 51 && codigo <= 57) return { tipo: 'chuva', descricao: 'Garoa' };
  if (codigo >= 61 && codigo <= 65) return { tipo: 'chuva', descricao: 'Chuva' };
  if (codigo === 66 || codigo === 67) return { tipo: 'chuva', descricao: 'Chuva congelante' };
  if (codigo >= 71 && codigo <= 77) return { tipo: 'neve', descricao: 'Neve' };
  if (codigo >= 80 && codigo <= 82) return { tipo: 'chuva', descricao: 'Pancadas de chuva' };
  if (codigo === 85 || codigo === 86) return { tipo: 'neve', descricao: 'Pancadas de neve' };
  if (codigo === 95) return { tipo: 'tempestade', descricao: 'Tempestade' };
  if (codigo === 96 || codigo === 99) return { tipo: 'tempestade', descricao: 'Tempestade com granizo' };
  return { tipo: 'nuvem', descricao: 'Tempo instável' };
}

interface CacheClima { clima: Clima; ts: number }

async function lerCache(): Promise<CacheClima | undefined> {
  const redis = getRedisClient();
  if (!redis) return undefined;
  try {
    const c = await redis.get<CacheClima>(CACHE_KEY);
    return c?.clima && c?.ts ? c : undefined;
  } catch {
    return undefined; // cache é conveniência: falhar aqui só significa buscar de novo
  }
}

interface HourlyOpenMeteo {
  time?: unknown[];
  temperature_2m?: unknown[];
  precipitation_probability?: unknown[];
}

/**
 * As próximas HORAS_A_FRENTE horas a partir de `agora`.
 *
 * O corte usa a hora que a PRÓPRIA API devolve em current.time, nunca new Date(): os horários
 * vêm em hora de São Paulo e SEM fuso ("2026-08-17T17:00"), e na Vercel, que roda em UTC,
 * comparar com new Date() erraria 3 horas — a lista mostraria horas já passadas. Como as duas
 * pontas são strings ISO no mesmo formato e fuso, comparar texto já ordena corretamente, e
 * ainda atravessa a meia-noite sem caso especial.
 */
function proximasHoras(agora: unknown, hourly: HourlyOpenMeteo | undefined): HoraPrevista[] {
  const corte = typeof agora === 'string' ? agora : '';
  const t = hourly?.time;
  if (!corte || !Array.isArray(t)) return [];

  const saida: HoraPrevista[] = [];
  for (let i = 0; i < t.length && saida.length < HORAS_A_FRENTE; i++) {
    const quando = String(t[i]);
    if (quando <= corte) continue;
    const temp = hourly?.temperature_2m?.[i];
    if (typeof temp !== 'number') continue;
    const prob = hourly?.precipitation_probability?.[i];
    saida.push({
      hora: quando.slice(11, 16),
      temperatura: Math.round(temp),
      chuva: typeof prob === 'number' ? prob : 0,
    });
  }
  return saida;
}

async function buscar(): Promise<Clima> {
  // forecast_days=2 e não 1: às 22h as "próximas 6 horas" atravessam a meia-noite, e com um
  // dia só a lista terminaria vazia justamente à noite.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=temperature_2m_min,temperature_2m_max` +
    `&forecast_days=2&timezone=America%2FSao_Paulo`;

  // Timeout curto: isto enfeita o cabeçalho do dashboard. Se a Open-Meteo estiver lenta, é
  // melhor a tela ficar sem o clima do que a requisição pendurar.
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

  const dados = await res.json();
  const atual = dados?.current;
  if (!atual || typeof atual.temperature_2m !== 'number' || typeof atual.weather_code !== 'number') {
    throw new Error('Resposta da Open-Meteo sem os campos esperados');
  }

  const { tipo, descricao } = traduzir(atual.weather_code);

  const horas = proximasHoras(atual.time, dados?.hourly);
  const comChuva = horas.find((x) => x.chuva >= LIMIAR_CHUVA);
  const diario = dados?.daily;
  const num = (v: unknown) => (typeof v === 'number' ? Math.round(v) : null);

  return {
    cidade: CIDADE,
    temperatura: Math.round(atual.temperature_2m),
    sensacao: num(atual.apparent_temperature),
    tipo,
    descricao,
    dia: atual.is_day === 1,
    medidoEm: typeof atual.time === 'string' ? atual.time : new Date().toISOString(),
    vento: num(atual.wind_speed_10m),
    umidade: num(atual.relative_humidity_2m),
    minima: num(diario?.temperature_2m_min?.[0]),
    maxima: num(diario?.temperature_2m_max?.[0]),
    horas,
    alertaChuva: comChuva ? { hora: comChuva.hora, probabilidade: comChuva.chuva } : null,
  };
}

export async function GET() {
  const cache = await lerCache();
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, ...cache.clima, doCache: true });
  }

  try {
    const clima = await buscar();

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(CACHE_KEY, { clima, ts: Date.now() } satisfies CacheClima, {
          ex: Math.round((CACHE_TTL_MS * 4) / 1000),
        });
      } catch { /* cache é conveniência */ }
    }

    return NextResponse.json({ success: true, ...clima, doCache: false });
  } catch (e) {
    // Entrega o cache VELHO em vez de erro: uma temperatura de meia hora atrás continua
    // sendo informação útil, e o cabeçalho não deve piscar erro por causa de um enfeite.
    if (cache) {
      return NextResponse.json({ success: true, ...cache.clima, doCache: true, velho: true });
    }
    console.error('[Clima] Falha:', e instanceof Error ? e.message : e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao consultar o tempo' },
      { status: 502 }
    );
  }
}
