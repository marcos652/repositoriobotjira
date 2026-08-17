// ============================================
//  O que cada pessoa fez num período (projeto DSMM)
// ============================================
//
// A fonte é o CHANGELOG, não o campo `updated`. Isso não é preciosismo — foi medido:
//
//   dia          filtrando por `updated`   atividade real no changelog   perdidas
//   2026-08-12            7                          20                    13
//   2026-08-11            3                          11                     9
//   2026-08-10            0                           6                     6   (dia inteiro invisível)
//   2026-08-05            1                           9                     8
//
//   10 de 11 dias com dados faltando, 62 ocorrências perdidas.
//
// A causa: `updated` guarda só a ÚLTIMA alteração da issue. Quem mexeu numa issue no dia 12 e
// outra pessoa mexeu no dia 17 desaparece do dia 12. Para responder "o que foi feito no dia X"
// só serve o changelog, que registra cada mudança com data e autor.
//
// Duas consequências boas de usar o changelog:
//
//   1. A atribuição passa a ser por QUEM FEZ, não por quem é o responsável. Uma issue atribuída
//      à Ana mas movida pelo Bruno conta para o Bruno — que é o que "o que o dev fez" significa.
//   2. "Entregou" passa a ser a transição para um status de categoria Done feita pela pessoa
//      dentro da janela, e não "está concluída hoje". Isso contorna o DSMM não preencher a data
//      de conclusão (`resolved IS NOT EMPTY` devolve 0 no projeto).
//
// A categoria do status vem do ID (`item.to`), nunca do nome: são 113 status na instância, com
// nomes repetidos entre workflows.

import { getJiraClient, JiraIssue, type JiraChangelogEntry } from './jira';

export const PROJETO = 'DSMM';

const GLOBAL_STATUS = '__jiraops_status_por_id__';

interface StatusInfo { nome: string; categoria: string }

/** id do status -> categoria. Carregado uma vez por instância do processo. */
async function mapaDeStatus(): Promise<Map<string, StatusInfo>> {
  const g = globalThis as Record<string, unknown>;
  const cache = g[GLOBAL_STATUS] as Map<string, StatusInfo> | undefined;
  if (cache && cache.size > 0) return cache;

  const client = getJiraClient();
  const lista = await client.listarStatus();
  const mapa = new Map<string, StatusInfo>();
  for (const s of lista) {
    mapa.set(String(s.id), { nome: s.name, categoria: s.statusCategory?.key || 'indeterminate' });
  }
  g[GLOBAL_STATUS] = mapa;
  return mapa;
}

export interface AcaoNoItem {
  key: string;
  summary: string;
  /** Status atual da issue (não o do dia). */
  status: string;
  categoria: string;
  tipo: string;
  /** O que a pessoa fez neste item dentro da janela, em linguagem de gente. */
  acoes: string[];
  /** Quando ela mexeu por último dentro da janela. */
  quando: string;
  /** true se ela concluiu o item dentro da janela. */
  concluiu: boolean;
}

export interface MembroPeriodo {
  name: string;
  email: string;
  avatar: string | null;
  accountId: string;
  /** Issues que ela concluiu (transição para Done) dentro da janela. */
  entregou: number;
  /** Issues que passaram para ela dentro da janela (criadas para ela ou repassadas). */
  recebeu: number;
  /** Issues em que ela fez qualquer alteração ou comentário dentro da janela. */
  tocou: number;
  /** Quantidade de alterações que ela fez na janela (uma issue pode ter várias). */
  mudancas: number;
  // ── situação de hoje, independente da janela ──
  fazendo: number;
  emAndamento: number;
  naFila: number;
  itens: AcaoNoItem[];
}

export interface ResultadoPeriodo {
  periodo: { inicio: string; fim: string; jqlBusca: string };
  membros: MembroPeriodo[];
  totais: {
    entregou: number;
    recebeu: number;
    mudancas: number;
    /** Issues com QUALQUER atividade na janela. */
    issuesNoPeriodo: number;
    issuesAbertasAgora: number;
    semResponsavel: number;
  };
  aviso: string;
}

/** Soma dias a AAAA-MM-DD sem passar por fuso. */
function somarDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias) ).toISOString().slice(0, 10);
}

const CAMPOS = ['summary', 'status', 'assignee', 'reporter', 'issuetype', 'priority', 'created', 'updated', 'comment'];

interface Ator {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

// O histórico vem tipado do cliente do Jira — não redeclarar evita os dois desandarem.
type Historico = JiraChangelogEntry;

interface IssueComHistorico extends JiraIssue {
  changelog?: { total?: number; histories?: Historico[] };
}

/** Descreve uma alteração em português, para a tela poder mostrar o que a pessoa fez. */
function descrever(
  item: NonNullable<Historico['items']>[number],
  status: Map<string, StatusInfo>
): string | null {
  const campo = (item.field || '').toLowerCase();
  if (campo === 'status') {
    const destino = item.to ? status.get(String(item.to))?.nome || item.toString : item.toString;
    return `moveu para ${destino}`;
  }
  if (campo === 'assignee') return item.toString ? `atribuiu para ${item.toString}` : 'removeu o responsável';
  if (campo === 'resolution') return item.toString ? `resolveu como ${item.toString}` : 'limpou a resolução';
  if (campo === 'priority') return `mudou a prioridade para ${item.toString}`;
  if (campo === 'description') return 'editou a descrição';
  if (campo === 'summary') return 'mudou o título';
  if (campo === 'attachment') return item.toString ? 'anexou arquivo' : 'removeu anexo';
  if (campo === 'labels' || campo === 'categorias') return 'mexeu nas categorias';
  if (campo === 'sprint') return 'mudou a sprint';
  if (campo === 'timeestimate' || campo === 'timespent') return 'apontou tempo';
  // Campos internos que não dizem nada para quem lê a tela.
  if (campo === 'rank' || campo === 'workflow' || campo === '') return null;
  return `alterou ${item.field}`;
}

export async function produzirRelatorio(inicio: string, fim: string): Promise<ResultadoPeriodo> {
  const client = getJiraClient();
  const status = await mapaDeStatus();

  // Limites como texto local: o Jira devolve as datas com offset ("2026-08-17T15:06:45-0300"),
  // então comparar os 10 primeiros caracteres compara o DIA no fuso da instância. Sem Date, sem
  // chance de o fuso do servidor entrar no meio.
  const dentro = (iso: string) => {
    const dia = iso.slice(0, 10);
    return dia >= inicio && dia <= fim;
  };

  // `updated >= inicio` SEM limite superior é de propósito: `updated` é sempre >= a data de
  // qualquer entrada do changelog, então isto é um superconjunto garantido do que aconteceu na
  // janela. O corte fino é feito no changelog, logo abaixo. Limitar por cima aqui era justamente
  // o bug que escondia dias inteiros.
  const jqlBusca = `project = ${PROJETO} AND updated >= "${inicio}" ORDER BY updated DESC`;

  const [candidatas, abertasAgora] = await Promise.all([
    client.searchAllIssues(jqlBusca, CAMPOS, 'changelog') as Promise<IssueComHistorico[]>,
    client.searchAllIssues(`project = ${PROJETO} AND statusCategory != Done ORDER BY updated DESC`, ['status', 'assignee']),
  ]);

  // Changelog truncado pela busca: pede o completo daquela issue. Sem isto, uma issue com
  // histórico muito longo perderia as entradas mais antigas — em silêncio.
  const truncadas = candidatas.filter(
    (i) => typeof i.changelog?.total === 'number' && (i.changelog.histories?.length || 0) < i.changelog.total
  );
  if (truncadas.length > 0) {
    console.log(`[TeamPeriodo] ${truncadas.length} issue(s) com changelog truncado na busca; buscando completo`);
    await Promise.all(
      truncadas.map(async (i) => {
        try {
          i.changelog = { histories: await client.changelogCompleto(i.key) };
        } catch (e) {
          console.error(`[TeamPeriodo] Falha no changelog de ${i.key}:`, e instanceof Error ? e.message : e);
        }
      })
    );
  }

  interface Acumulado {
    info: Ator;
    tocou: Map<string, AcaoNoItem>;
    entregou: Set<string>;
    recebeu: Set<string>;
    mudancas: number;
  }
  const porPessoa = new Map<string, Acumulado>();

  const pessoa = (a: Ator): Acumulado | null => {
    const id = a.accountId || a.emailAddress || a.displayName;
    if (!id) return null;
    let p = porPessoa.get(id);
    if (!p) {
      p = { info: a, tocou: new Map(), entregou: new Set(), recebeu: new Set(), mudancas: 0 };
      porPessoa.set(id, p);
    }
    return p;
  };

  const registrar = (p: Acumulado, issue: IssueComHistorico, quando: string, acao: string | null) => {
    let item = p.tocou.get(issue.key);
    if (!item) {
      item = {
        key: issue.key,
        summary: issue.fields.summary || issue.key,
        status: issue.fields.status?.name || '—',
        categoria: issue.fields.status?.statusCategory?.key || 'indeterminate',
        tipo: issue.fields.issuetype?.name || '—',
        acoes: [],
        quando,
        concluiu: false,
      };
      p.tocou.set(issue.key, item);
    }
    if (quando > item.quando) item.quando = quando;
    if (acao && !item.acoes.includes(acao)) item.acoes.push(acao);
  };

  const issuesComAtividade = new Set<string>();

  for (const issue of candidatas) {
    // ── criação dentro da janela ──
    const criado = issue.fields.created;
    if (criado && dentro(criado)) {
      issuesComAtividade.add(issue.key);
      const autor = issue.fields.reporter as Ator | undefined;
      if (autor) {
        const p = pessoa(autor);
        if (p) { registrar(p, issue, criado, 'criou'); p.mudancas++; }
      }
      const destino = issue.fields.assignee as Ator | undefined;
      if (destino) {
        const p = pessoa(destino);
        if (p) p.recebeu.add(issue.key);
      }
    }

    // ── alterações ──
    for (const h of issue.changelog?.histories || []) {
      if (!h.created || !dentro(h.created)) continue;
      const p = h.author ? pessoa(h.author) : null;
      if (!p) continue;
      issuesComAtividade.add(issue.key);
      p.mudancas++;

      for (const item of h.items || []) {
        registrar(p, issue, h.created, descrever(item, status));

        // Entregou = ELE moveu para um status de categoria Done, dentro da janela.
        if ((item.field || '').toLowerCase() === 'status' && item.to) {
          if (status.get(String(item.to))?.categoria === 'done') {
            p.entregou.add(issue.key);
            const reg = p.tocou.get(issue.key);
            if (reg) reg.concluiu = true;
          }
        }

        // Recebeu = a issue passou para alguém dentro da janela.
        if ((item.field || '').toLowerCase() === 'assignee' && item.to) {
          const alvo = porPessoa.get(item.to);
          if (alvo) alvo.recebeu.add(issue.key);
          else {
            // Quem recebeu pode não ter feito nada na janela; cria a entrada com o nome do
            // changelog para a linha não sumir.
            const novo = pessoa({ accountId: item.to, displayName: item.toString || 'Sem nome' });
            if (novo) novo.recebeu.add(issue.key);
          }
        }
      }
    }

    // ── comentários ── (não aparecem no changelog)
    for (const c of (issue.fields as { comment?: { comments?: { created: string; author?: Ator }[] } }).comment?.comments || []) {
      if (!c.created || !dentro(c.created)) continue;
      issuesComAtividade.add(issue.key);
      const p = c.author ? pessoa(c.author) : null;
      if (!p) continue;
      p.mudancas++;
      registrar(p, issue, c.created, 'comentou');
    }
  }

  // ── situação de hoje ──
  const agora = new Map<string, { fazendo: number; emAndamento: number; naFila: number }>();
  let semResponsavel = 0;
  for (const issue of abertasAgora) {
    const a = issue.fields.assignee as Ator | undefined;
    if (!a?.accountId) { semResponsavel++; continue; }
    const atual = agora.get(a.accountId) || { fazendo: 0, emAndamento: 0, naFila: 0 };
    atual.fazendo++;
    if (issue.fields.status?.statusCategory?.key === 'indeterminate') atual.emAndamento++;
    else atual.naFila++;
    agora.set(a.accountId, atual);
    // Garante a linha de quem tem trabalho aberto mesmo sem atividade na janela.
    pessoa(a);
  }

  const membros: MembroPeriodo[] = [...porPessoa.entries()].map(([id, p]) => {
    const hoje = agora.get(id) || { fazendo: 0, emAndamento: 0, naFila: 0 };
    return {
      name: p.info.displayName || p.info.emailAddress || 'Sem nome',
      email: p.info.emailAddress || '',
      avatar: p.info.avatarUrls?.['48x48'] || p.info.avatarUrls?.['24x24'] || null,
      accountId: p.info.accountId || '',
      entregou: p.entregou.size,
      recebeu: p.recebeu.size,
      tocou: p.tocou.size,
      mudancas: p.mudancas,
      fazendo: hoje.fazendo,
      emAndamento: hoje.emAndamento,
      naFila: hoje.naFila,
      itens: [...p.tocou.values()].sort((a, b) => (a.quando < b.quando ? 1 : -1)),
    };
  }).sort((a, b) => b.entregou - a.entregou || b.mudancas - a.mudancas || a.name.localeCompare(b.name));

  return {
    periodo: { inicio, fim, jqlBusca },
    membros,
    totais: {
      entregou: membros.reduce((s, m) => s + m.entregou, 0),
      recebeu: membros.reduce((s, m) => s + m.recebeu, 0),
      mudancas: membros.reduce((s, m) => s + m.mudancas, 0),
      issuesNoPeriodo: issuesComAtividade.size,
      issuesAbertasAgora: abertasAgora.length,
      semResponsavel,
    },
    aviso:
      'Os números vêm do histórico de alterações do Jira, então mostram quem FEZ cada mudança ' +
      '— não quem é o responsável pela issue. "Entregou" é a transição para um status concluído ' +
      'feita pela pessoa dentro do período.',
  };
}

export { somarDias };
