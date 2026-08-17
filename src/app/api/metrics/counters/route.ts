// ============================================
//  API: /api/metrics/counters — a tabela de contadores
// ============================================
//
// GET  -> devolve a tabela inteira (uma linha por métrica). Lê só do Redis, então responde
//         em milissegundos, sem tocar no Jira. Se os valores estiverem velhos, reconcilia
//         DEPOIS de responder (after()), para ninguém esperar pela recontagem.
//         ?serie=<id>&dias=30  -> devolve também a série diária daquele contador (gráficos).
//         ?forcar=1            -> reconcilia ANTES de responder (útil para conferir).
//
// POST -> { id, delta } soma na linha (delta -1 desagrega). É o "+1 / -1".
//
// Por que não recalcular na hora: o Overview fazia isso e custava 20 requisições
// sequenciais ao Jira, 7,6 MB e 12,8s por abertura de página.

import { NextRequest, NextResponse, after } from 'next/server';
import { isAdmin } from '../../auth/_admin';
import {
  lerTabela, reconciliar, incrementar, lerSerie,
  CONTADORES, RECONCILIACAO_TTL_MS,
} from '@/lib/metric-counters';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idSerie = searchParams.get('serie');
  const dias = Math.min(Math.max(Number(searchParams.get('dias')) || 30, 1), 120);
  const forcar = searchParams.get('forcar') === '1';

  if (forcar) {
    const r = await reconciliar();
    const tabela = await lerTabela();
    return NextResponse.json({ ...tabela, reconciliacao: r });
  }

  let tabela = await lerTabela();

  // Primeira chamada de todas: não há valor nenhum guardado, e devolver a tabela zerada
  // mostraria "0 tickets abertos", que é pior do que esperar 0,8s. Depois disso nunca mais
  // bloqueia — cai no after() abaixo.
  const nuncaReconciliada = tabela.atualizadoEm === null && tabela.origem === 'redis';
  if (nuncaReconciliada) {
    await reconciliar();
    tabela = await lerTabela();
  } else if (tabela.idadeMs !== null && tabela.idadeMs > RECONCILIACAO_TTL_MS) {
    // Responde com o valor atual e reconta em segundo plano.
    after(async () => { await reconciliar(); });
  }

  const serie = idSerie ? await lerSerie(idSerie, dias) : undefined;

  return NextResponse.json({
    ...tabela,
    ...(serie ? { serie: { id: idSerie, dias, pontos: serie } } : {}),
  });
}

export async function POST(request: NextRequest) {
  // Só admin: um contador é dado compartilhado, e qualquer um podendo somar/subtrair
  // tornaria o número inauditável. As somas automáticas (criar demanda) chamam
  // incrementar() direto no servidor, sem passar por aqui.
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  let corpo: { id?: string; delta?: number };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { id, delta } = corpo;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  if (!CONTADORES.some(c => c.id === id)) {
    return NextResponse.json(
      { error: `id desconhecido: ${id}`, disponiveis: CONTADORES.map(c => c.id) },
      { status: 400 }
    );
  }
  const passo = delta === undefined ? 1 : Number(delta);
  if (!Number.isFinite(passo) || !Number.isInteger(passo)) {
    return NextResponse.json({ error: 'delta precisa ser um inteiro' }, { status: 400 });
  }

  await incrementar(id, passo);
  const tabela = await lerTabela();
  return NextResponse.json({
    success: true,
    linha: tabela.linhas.find(l => l.id === id),
  });
}
