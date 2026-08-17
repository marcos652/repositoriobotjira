// ============================================
//  Produção por pessoa num período (projeto DSMM)
// ============================================
//
// Responde "o que cada dev fez no período e o que está fazendo agora".
//
// DUAS ARMADILHAS DESTE PROJETO, medidas contra a API antes de escrever isto:
//
// 1. O DSMM NÃO preenche o campo `resolved` — `project = DSMM AND resolved IS NOT EMPTY`
//    devolve 0. Então não existe "concluídas no período" por data de conclusão. O que existe é
//    `updated`: uma issue concluída que teve movimento no período. Os rótulos da tela dizem
//    isso, para o número não ser lido como data de entrega.
//
// 2. A rota antiga pedia maxResults 100 numa JQL que casa 173 issues, e somava as estatísticas
//    sobre essa fatia. A tela mostrava 32 abertas onde existem 99, e 33 concluídas onde existem
//    74. Aqui a busca é PAGINADA até o fim.

import { getJiraClient, JiraIssue } from './jira';

export const PROJETO = 'DSMM';

export type Periodo = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface ItemPeriodo {
  key: string;
  summary: string;
  status: string;
  /** 'new' | 'indeterminate' | 'done' — categoria do Jira, não o nome do status. */
  categoria: string;
  tipo: string;
  prioridade: string | null;
  criadoEm: string;
  atualizadoEm: string;
  /** true quando a issue foi criada dentro do período pedido. */
  novaNoPeriodo: boolean;
}

export interface MembroPeriodo {
  name: string;
  email: string;
  avatar: string | null;
  accountId: string;
  // ── no período ──
  /** Concluídas com movimento no período. */
  entregou: number;
  /** Criadas no período e atribuídas a ela. */
  recebeu: number;
  /** Issues que ela tocou no período, independente da situação. */
  tocou: number;
  // ── agora, independente do período ──
  /** Tudo que está em aberto hoje com ela. */
  fazendo: number;
  /** Em aberto e já iniciado (categoria In Progress). */
  emAndamento: number;
  /** Em aberto e não iniciado (categoria To Do). */
  naFila: number;
  /** O que ela tocou no período, para a tela poder listar. */
  itens: ItemPeriodo[];
}

export interface ResultadoPeriodo {
  periodo: { range: Periodo; jqlPeriodo: string; inicio: string | null; fim: string | null };
  membros: MembroPeriodo[];
  totais: {
    entregou: number;
    recebeu: number;
    fazendo: number;
    emAndamento: number;
    issuesNoPeriodo: number;
    issuesAbertasAgora: number;
    semResponsavel: number;
  };
  /**
   * Deixa explícito que "entregou" usa `updated`, e por quê. A tela mostra isso para ninguém
   * ler o número como data de conclusão.
   */
  aviso: string;
}

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso. */
function somarDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d) + dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Cláusula de data do período.
 *
 * Para os presets usa a forma relativa do Jira (`-7d`), que resolve no fuso da instância e
 * evita a conta de fuso do nosso lado. Para o período personalizado, o fim é exclusivo no dia
 * seguinte: `updated <= "2026-08-17"` no Jira significa até 00:00 daquele dia, o que
 * silenciosamente perderia tudo que aconteceu ao longo do dia 17.
 */
export function clausulaPeriodo(range: Periodo, inicio?: string, fim?: string): string {
  if (range === 'custom' && inicio) {
    const partes = [`updated >= "${inicio}"`];
    if (fim) partes.push(`updated < "${somarDias(fim, 1)}"`);
    return partes.join(' AND ');
  }
  if (range === 'today') return 'updated >= startOfDay()';
  if (range === '7d') return 'updated >= -7d';
  if (range === '90d') return 'updated >= -90d';
  return 'updated >= -30d';
}

const CAMPOS = ['summary', 'status', 'assignee', 'issuetype', 'priority', 'created', 'updated'];

function item(issue: JiraIssue, dentroDoPeriodo: (iso: string) => boolean): ItemPeriodo {
  const f = issue.fields;
  return {
    key: issue.key,
    summary: f.summary || issue.key,
    status: f.status?.name || '—',
    categoria: f.status?.statusCategory?.key || 'indeterminate',
    tipo: f.issuetype?.name || '—',
    prioridade: f.priority?.name || null,
    criadoEm: f.created,
    atualizadoEm: f.updated,
    novaNoPeriodo: dentroDoPeriodo(f.created),
  };
}

export async function produzirRelatorio(
  range: Periodo,
  inicio?: string,
  fim?: string
): Promise<ResultadoPeriodo> {
  const client = getJiraClient();
  const clausula = clausulaPeriodo(range, inicio, fim);

  // Duas buscas, porque respondem perguntas diferentes:
  //   "fez no período"  -> movimento dentro da janela
  //   "está fazendo"    -> situação de HOJE, que não depende de janela nenhuma
  // Ambas paginadas até o fim: era o teto de 100 que truncava os números da tela.
  const [noPeriodo, abertasAgora] = await Promise.all([
    client.searchAllIssues(`project = ${PROJETO} AND ${clausula} ORDER BY updated DESC`, CAMPOS),
    client.searchAllIssues(`project = ${PROJETO} AND statusCategory != Done ORDER BY updated DESC`, CAMPOS),
  ]);

  // Limites do período em texto, só para marcar `novaNoPeriodo`. Nos presets a referência é a
  // issue mais antiga que a própria JQL trouxe — assim o corte vem do Jira, e não de uma conta
  // de data feita aqui, que poderia divergir do fuso da instância.
  const inicioEfetivo = range === 'custom' && inicio
    ? inicio
    : (noPeriodo.length > 0
        ? noPeriodo.reduce((min, i) => (i.fields.updated < min ? i.fields.updated : min), noPeriodo[0].fields.updated).slice(0, 10)
        : null);
  const fimEfetivo = range === 'custom' && fim ? fim : null;
  const dentro = (iso: string) => {
    if (!iso) return false;
    const dia = iso.slice(0, 10);
    if (inicioEfetivo && dia < inicioEfetivo) return false;
    if (fimEfetivo && dia > fimEfetivo) return false;
    return true;
  };

  const porPessoa = new Map<string, MembroPeriodo>();
  const garantir = (a: NonNullable<JiraIssue['fields']['assignee']> & { accountId?: string }): MembroPeriodo => {
    const id = a.accountId || a.emailAddress || a.displayName;
    let m = porPessoa.get(id);
    if (!m) {
      m = {
        name: a.displayName || a.emailAddress || 'Sem nome',
        email: a.emailAddress || '',
        avatar: a.avatarUrls?.['48x48'] || null,
        accountId: a.accountId || '',
        entregou: 0, recebeu: 0, tocou: 0,
        fazendo: 0, emAndamento: 0, naFila: 0,
        itens: [],
      };
      porPessoa.set(id, m);
    }
    return m;
  };

  let semResponsavel = 0;

  for (const issue of noPeriodo) {
    const a = issue.fields.assignee;
    if (!a) { semResponsavel++; continue; }
    const m = garantir(a as never);
    m.tocou++;
    const it = item(issue, dentro);
    if (it.categoria === 'done') m.entregou++;
    if (it.novaNoPeriodo) m.recebeu++;
    m.itens.push(it);
  }

  for (const issue of abertasAgora) {
    const a = issue.fields.assignee;
    if (!a) continue;
    const m = garantir(a as never);
    m.fazendo++;
    const cat = issue.fields.status?.statusCategory?.key;
    if (cat === 'indeterminate') m.emAndamento++;
    else m.naFila++;
  }

  const membros = [...porPessoa.values()].sort(
    (x, y) => y.entregou - x.entregou || y.tocou - x.tocou || x.name.localeCompare(y.name)
  );
  for (const m of membros) {
    m.itens.sort((x, y) => (x.atualizadoEm < y.atualizadoEm ? 1 : -1));
  }

  return {
    periodo: { range, jqlPeriodo: clausula, inicio: inicioEfetivo, fim: fimEfetivo },
    membros,
    totais: {
      entregou: membros.reduce((s, m) => s + m.entregou, 0),
      recebeu: membros.reduce((s, m) => s + m.recebeu, 0),
      fazendo: membros.reduce((s, m) => s + m.fazendo, 0),
      emAndamento: membros.reduce((s, m) => s + m.emAndamento, 0),
      issuesNoPeriodo: noPeriodo.length,
      issuesAbertasAgora: abertasAgora.length,
      semResponsavel,
    },
    aviso:
      'O projeto DSMM não preenche a data de conclusão no Jira, então "entregou" conta as ' +
      'issues concluídas que tiveram movimento no período — não a data em que foram fechadas.',
  };
}
