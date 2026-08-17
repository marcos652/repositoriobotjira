// ============================================
//  API: /api/jira/team-periodo
// ============================================
//
// "O que cada dev fez em X e o que está fazendo agora."
//
// Rota separada de /api/jira/team de propósito: a antiga continua servindo a aba de Logs, e
// esta faz busca PAGINADA (a outra trunca em 100 issues numa JQL que casa 173, o que fazia a
// tela de Equipe mostrar 32 abertas onde existem 99).
//
// Parâmetros: ?range=today|7d|30d|90d|custom&start=AAAA-MM-DD&end=AAAA-MM-DD
//
// Cache por período no Redis: a mesma janela pedida por duas pessoas é a mesma resposta, e
// paginar o projeto inteiro custa tempo.

import { NextRequest, NextResponse, after } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';
import { getRedisClient } from '@/lib/redis';
import { produzirRelatorio, type Periodo, type ResultadoPeriodo } from '@/lib/team-period';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 3 * 60 * 1000;
const RANGES: Periodo[] = ['today', '7d', '30d', '90d', 'custom'];

const chave = (range: string, inicio: string, fim: string) =>
  `jiraops:team-periodo:${range}:${inicio}:${fim}`;

interface Cache { dados: ResultadoPeriodo; ts: number }

/** AAAA-MM-DD, e nada mais: a data entra numa JQL. */
const dataValida = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(request: NextRequest) {
  if (!isJiraConfigured()) {
    return NextResponse.json({ success: false, error: 'Jira não configurado' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const bruto = searchParams.get('range') || '30d';
  const range: Periodo = RANGES.includes(bruto as Periodo) ? (bruto as Periodo) : '30d';
  const inicio = searchParams.get('start');
  const fim = searchParams.get('end');

  if (range === 'custom') {
    if (!dataValida(inicio)) {
      return NextResponse.json(
        { success: false, error: 'Período personalizado exige start no formato AAAA-MM-DD' },
        { status: 400 }
      );
    }
    if (fim && !dataValida(fim)) {
      return NextResponse.json(
        { success: false, error: 'end precisa estar no formato AAAA-MM-DD' },
        { status: 400 }
      );
    }
    if (fim && fim < inicio) {
      return NextResponse.json(
        { success: false, error: 'O fim do período é anterior ao início' },
        { status: 400 }
      );
    }
  }

  const k = chave(range, inicio || '', fim || '');
  const redis = getRedisClient();

  const gravar = async (dados: ResultadoPeriodo) => {
    if (!redis) return;
    try {
      await redis.set(k, { dados, ts: Date.now() } satisfies Cache, { ex: (CACHE_TTL_MS * 6) / 1000 });
    } catch { /* cache é conveniência */ }
  };

  try {
    if (redis) {
      const c = await redis.get<Cache>(k).catch(() => null);
      if (c?.dados && c?.ts) {
        // Velho: responde já e recarrega depois. A tela nunca espera pela paginação.
        if (Date.now() - c.ts > CACHE_TTL_MS) {
          after(async () => {
            try { await gravar(await produzirRelatorio(range, inicio || undefined, fim || undefined)); }
            catch (e) { console.error('[TeamPeriodo] Revalidação falhou:', e instanceof Error ? e.message : e); }
          });
        }
        return NextResponse.json({ success: true, ...c.dados, doCache: true });
      }
    }

    const dados = await produzirRelatorio(range, inicio || undefined, fim || undefined);
    await gravar(dados);
    return NextResponse.json({ success: true, ...dados, doCache: false });
  } catch (e) {
    console.error('[TeamPeriodo] Falha:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao consultar o Jira' },
      { status: 500 }
    );
  }
}
