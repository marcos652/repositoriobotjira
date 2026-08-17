// ============================================
//  Tabela de contadores — o "read model" das estatísticas
// ============================================
//
// Uma linha por métrica: { id, nome, tipo, valor }. A tela lê essa tabela, e não o Jira.
//
// Por que existe: o Overview recalculava tudo do Jira em cada abertura. Medido contra a
// instância real, a consulta do suporte casava 20.733 issues, baixava 2.000 (o limite de
// páginas) em 7,6 MB / 12,8s e computava as métricas sobre essa fatia truncada.
//
// Como cada linha é mantida — duas vias, de propósito:
//
//  1. incrementar(id, +1/-1) — imediato, para o que o PRÓPRIO JiraOps faz (criar uma
//     demanda soma 1). É um HINCRBY, atômico no Redis, então duas instâncias somando ao
//     mesmo tempo não se sobrescrevem.
//
//  2. reconciliar() — reconta de verdade no Jira e sobrescreve os valores. É o que impede
//     a dessincronização: a maior parte das mudanças acontece DENTRO do Jira (alguém move
//     um ticket para Done lá), e o JiraOps nunca fica sabendo. Um contador só de +1/-1
//     erraria em silêncio e para sempre. Recontar é barato porque usa
//     /search/approximate-count, que devolve só o número: medidas 8 contagens em paralelo
//     em 0,73s, sem baixar issue nenhuma.
//
// O snapshot diário é o que alimenta os gráficos: guardar o valor de cada dia transforma
// os contadores numa série temporal, em vez de o gráfico ter que varrer o Jira por período.
//
// NENHUMA JQL aqui filtra status por nome. Nesta instância isso está quebrado: são 113
// status, com nomes repetidos entre workflows, e `status = "Resolvido"` devolve 0 enquanto
// `status = 5` (o mesmo status, por id) devolve 18.872. Sempre statusCategory.

import { getRedisClient } from './redis';
import { getJiraClient, isJiraConfigured } from './jira';

const CHAVE_VALORES = 'jiraops:contadores';
const CHAVE_META = 'jiraops:contadores:meta';
const CHAVE_HISTORICO = 'jiraops:contadores:historico';

/** Quanto tempo os valores servem antes de valer a pena recontar. */
export const RECONCILIACAO_TTL_MS = 5 * 60 * 1000;
/** Dias de snapshot mantidos para os gráficos. */
const HISTORICO_DIAS = 120;

export interface ContadorDef {
  id: string;
  nome: string;
  tipo: 'suporte' | 'desenvolvimento' | 'jiraops';
  /** JQL que define a linha. Sem JQL, a linha só existe por +1/-1 (ex: ações do JiraOps). */
  jql?: string;
}

// A tabela. Para acrescentar uma estatística, acrescente uma linha aqui — nada mais.
//
// Toda JQL daqui foi conferida contra a instância real antes de entrar (as 14 contagens
// rodam em 0,77s em paralelo). Três armadilhas encontradas assim, que valem para quem for
// acrescentar linhas:
//   • prioridade tem nome em PORTUGUÊS aqui (Altíssima | Alta | Médio | Baixa | Baixíssima).
//     `priority in (Highest, High)` não dá erro — devolve 0, calado.
//   • o projeto DSMM não preenche o campo `resolved` (resolved IS NOT EMPTY -> 0), então
//     qualquer recorte por `resolved` lá fica zerado para sempre.
//   • status por NOME não funciona nesta instância (ver o cabeçalho do arquivo).
export const CONTADORES: ContadorDef[] = [
  // ── Suporte (SUP) ──
  // Não existe linha "em andamento" para o SUP: statusCategory = "In Progress" casa os
  // mesmos 36 de statusCategory != Done (a categoria "To Do" está com 0), então seria uma
  // linha duplicada. Separar Pendente/Direcionado/Aguardando exigiria filtrar por id de
  // status, já que o nome não resolve.
  { id: 'sup:abertos',         nome: 'Tickets abertos',       tipo: 'suporte', jql: 'project = SUP AND statusCategory != Done' },
  { id: 'sup:resolvidos',      nome: 'Resolvidos (total)',    tipo: 'suporte', jql: 'project = SUP AND statusCategory = Done' },
  { id: 'sup:resolvidos_30d',  nome: 'Resolvidos em 30 dias', tipo: 'suporte', jql: 'project = SUP AND resolved >= "-30d"' },
  { id: 'sup:resolvidos_hoje', nome: 'Resolvidos hoje',       tipo: 'suporte', jql: 'project = SUP AND resolved >= startOfDay()' },
  { id: 'sup:criados_hoje',    nome: 'Criados hoje',          tipo: 'suporte', jql: 'project = SUP AND created >= startOfDay()' },
  { id: 'sup:criticos',        nome: 'Críticos abertos',      tipo: 'suporte', jql: 'project = SUP AND statusCategory != Done AND priority in ("Altíssima", "Alta")' },
  { id: 'sup:atrasados',       nome: 'Atrasados (venceu)',    tipo: 'suporte', jql: 'project = SUP AND statusCategory != Done AND duedate < now()' },
  { id: 'sup:sem_responsavel', nome: 'Sem responsável',       tipo: 'suporte', jql: 'project = SUP AND statusCategory != Done AND assignee IS EMPTY' },

  // ── Desenvolvimento (DSMM) ──
  { id: 'dev:abertos',      nome: 'Demandas abertas',    tipo: 'desenvolvimento', jql: 'project = DSMM AND statusCategory != Done' },
  { id: 'dev:em_andamento', nome: 'Em desenvolvimento',  tipo: 'desenvolvimento', jql: 'project = DSMM AND statusCategory = "In Progress"' },
  { id: 'dev:concluidos',   nome: 'Concluídas (total)',  tipo: 'desenvolvimento', jql: 'project = DSMM AND statusCategory = Done' },
  // "mexidas nos últimos 30 dias E concluídas", não "concluídas nos últimos 30 dias": sem o
  // campo resolved no DSMM, updated é a única data disponível. O nome da linha diz isso para
  // ninguém ler o número como data de conclusão.
  { id: 'dev:concluidos_30d', nome: 'Concluídas, atualizadas em 30d', tipo: 'desenvolvimento', jql: 'project = DSMM AND statusCategory = Done AND updated >= -30d' },
  { id: 'dev:criados_hoje', nome: 'Criadas hoje',        tipo: 'desenvolvimento', jql: 'project = DSMM AND created >= startOfDay()' },

  // ── Ações do próprio JiraOps: só +1/-1, não existem como JQL ──
  { id: 'jiraops:demandas_criadas', nome: 'Demandas criadas pelo JiraOps', tipo: 'jiraops' },
];

const POR_ID = new Map(CONTADORES.map(c => [c.id, c]));

export interface LinhaContador extends ContadorDef {
  valor: number;
  /** true quando o valor ainda não existe na tabela (nunca reconciliado). */
  vazio: boolean;
}

export interface TabelaContadores {
  linhas: LinhaContador[];
  atualizadoEm: string | null;
  /** Idade dos valores em ms; null quando nunca foram reconciliados. */
  idadeMs: number | null;
  origem: 'redis' | 'indisponivel';
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export async function lerTabela(): Promise<TabelaContadores> {
  const redis = getRedisClient();
  if (!redis) {
    return {
      linhas: CONTADORES.map(c => ({ ...c, valor: 0, vazio: true })),
      atualizadoEm: null,
      idadeMs: null,
      origem: 'indisponivel',
    };
  }

  let valores: Record<string, unknown> = {};
  let atualizadoEm: string | null = null;
  try {
    const [v, meta] = await Promise.all([
      redis.hgetall<Record<string, unknown>>(CHAVE_VALORES),
      redis.get<{ atualizadoEm: string }>(CHAVE_META),
    ]);
    valores = v || {};
    atualizadoEm = meta?.atualizadoEm ?? null;
  } catch (e) {
    console.error('[Contadores] Falha ao ler:', e instanceof Error ? e.message : e);
  }

  return {
    linhas: CONTADORES.map(c => {
      const bruto = valores[c.id];
      // O Upstash pode devolver number ou string dependendo de como o campo foi escrito
      // (HINCRBY grava número, HSET via JSON grava string).
      const n = typeof bruto === 'number' ? bruto : Number(bruto);
      const existe = bruto !== undefined && bruto !== null && Number.isFinite(n);
      return { ...c, valor: existe ? n : 0, vazio: !existe };
    }),
    atualizadoEm,
    idadeMs: atualizadoEm ? Date.now() - new Date(atualizadoEm).getTime() : null,
    origem: 'redis',
  };
}

// ── +1 / -1 ──────────────────────────────────────────────────────────────────

/**
 * Soma `delta` a uma linha (use -1 para desagregar). HINCRBY é atômico, então não há
 * corrida entre instâncias. Não falha a operação de quem chamou: um contador errado é
 * menos grave que uma demanda não criada, e a reconciliação conserta o valor depois.
 */
export async function incrementar(id: string, delta = 1): Promise<void> {
  if (!POR_ID.has(id)) {
    console.warn(`[Contadores] id desconhecido: ${id} — ignorado`);
    return;
  }
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.hincrby(CHAVE_VALORES, id, delta);
  } catch (e) {
    console.error(`[Contadores] Falha ao somar ${delta} em ${id}:`, e instanceof Error ? e.message : e);
  }
}

// ── Reconciliação (a verdade) ────────────────────────────────────────────────

/**
 * Reconta no Jira as linhas que têm JQL e sobrescreve os valores. Linhas sem JQL (as do
 * JiraOps) são preservadas — elas só existem por +1/-1.
 */
export async function reconciliar(): Promise<{ atualizadas: number; falhas: string[] }> {
  const redis = getRedisClient();
  if (!redis || !isJiraConfigured()) return { atualizadas: 0, falhas: ['redis ou jira nao configurado'] };

  const client = getJiraClient();
  const comJql = CONTADORES.filter(c => c.jql);

  // Em paralelo de propósito: são contagens independentes e o custo é a latência do Jira,
  // não CPU. Sequencial seriam ~9 × 600ms; em paralelo, o tempo de uma.
  const resultados = await Promise.all(
    comJql.map(async (c) => {
      try {
        return { id: c.id, valor: await client.approximateCount(c.jql!) };
      } catch (e) {
        console.error(`[Contadores] Falha ao contar ${c.id}:`, e instanceof Error ? e.message : e);
        return { id: c.id, valor: null as number | null };
      }
    })
  );

  const novos: Record<string, number> = {};
  const falhas: string[] = [];
  for (const r of resultados) {
    if (r.valor === null) falhas.push(r.id);
    else novos[r.id] = r.valor;
  }

  if (Object.keys(novos).length === 0) return { atualizadas: 0, falhas };

  try {
    const dia = hojeISO();
    // O snapshot do dia é sobrescrito a cada reconciliação: fica valendo o último valor
    // conhecido do dia, que é o que um gráfico diário precisa.
    const historico: Record<string, number> = {};
    for (const [id, valor] of Object.entries(novos)) historico[`${id}|${dia}`] = valor;

    await Promise.all([
      redis.hset(CHAVE_VALORES, novos),
      redis.hset(CHAVE_HISTORICO, historico),
      redis.set(CHAVE_META, { atualizadoEm: new Date().toISOString() }),
    ]);
  } catch (e) {
    console.error('[Contadores] Falha ao gravar:', e instanceof Error ? e.message : e);
    return { atualizadas: 0, falhas: [...falhas, 'gravacao'] };
  }

  return { atualizadas: Object.keys(novos).length, falhas };
}

// ── Série temporal para os gráficos ──────────────────────────────────────────

export interface PontoSerie { dia: string; valor: number }

/**
 * Série diária de um contador, do mais antigo para o mais novo. Dias sem snapshot são
 * omitidos (e não zerados): zero e "não medimos naquele dia" são coisas diferentes, e
 * plotar zero desenharia uma queda que nunca aconteceu.
 */
export async function lerSerie(id: string, dias = 30): Promise<PontoSerie[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const limite = Math.min(dias, HISTORICO_DIAS);
  const chaves: string[] = [];
  const diasISO: string[] = [];
  for (let i = limite - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dia = d.toISOString().slice(0, 10);
    diasISO.push(dia);
    chaves.push(`${id}|${dia}`);
  }

  try {
    const valores = await redis.hmget<Record<string, unknown>>(CHAVE_HISTORICO, ...chaves);
    if (!valores) return [];
    const serie: PontoSerie[] = [];
    for (let i = 0; i < chaves.length; i++) {
      const bruto = valores[chaves[i]];
      const n = typeof bruto === 'number' ? bruto : Number(bruto);
      if (bruto !== undefined && bruto !== null && Number.isFinite(n)) {
        serie.push({ dia: diasISO[i], valor: n });
      }
    }
    return serie;
  } catch (e) {
    console.error(`[Contadores] Falha ao ler série de ${id}:`, e instanceof Error ? e.message : e);
    return [];
  }
}
