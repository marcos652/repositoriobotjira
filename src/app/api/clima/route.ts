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

export interface Clima {
  cidade: string;
  temperatura: number;
  sensacao: number | null;
  tipo: TipoTempo;
  descricao: string;
  /** Dia ou noite, para o ícone de céu limpo virar lua em vez de sol. */
  dia: boolean;
  medidoEm: string;
}

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

async function buscar(): Promise<Clima> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day` +
    `&timezone=America%2FSao_Paulo`;

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
  return {
    cidade: CIDADE,
    temperatura: Math.round(atual.temperature_2m),
    sensacao: typeof atual.apparent_temperature === 'number' ? Math.round(atual.apparent_temperature) : null,
    tipo,
    descricao,
    dia: atual.is_day === 1,
    medidoEm: atual.time || new Date().toISOString(),
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
