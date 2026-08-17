// ============================================
//  API: /api/notifications
// ============================================
//
// Notificações do Jira, com o recorte "isto é para mim". Quatro tipos:
//
//   mention  — alguém escreveu @Você num comentário
//   assigned — uma demanda foi criada, ou passada, com você como responsável
//   comment  — comentário numa issue (sem menção)
//   status   — issue mudou de status
//
// O "para mim" sai do accountId do Jira de quem está logado, resolvido pelo e-mail da
// sessão. Sem esse accountId (e-mail sem conta no Jira) nada é marcado como pessoal —
// melhor não marcar do que marcar para a pessoa errada.
//
// Como as menções são detectadas: o corpo do comentário na API v3 vem em ADF (Atlassian
// Document Format), e uma menção é um nó { type: 'mention', attrs: { id, text } } em
// qualquer profundidade da árvore. Conferido contra o projeto: 27 de 44 comentários dos
// últimos 30 dias têm nó de menção.

import { NextRequest, NextResponse, after } from 'next/server';
import { getSessionEmail } from '../auth/_admin';
import { resolveJiraAccountId } from '@/lib/jira-account';
import { getRedisClient } from '@/lib/redis';
import { chaveDono, lerDispensadas, dispensar, restaurar } from '@/lib/notification-dismiss';

export const dynamic = 'force-dynamic';

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';
const PROJECTS = ['DSMM', 'SUP'];
const JANELA_DIAS = 14;
/** Teto de notificações devolvidas — aplicado só às que NÃO são suas. */
const LIMITE = 200;

// A lista CRUA é a mesma para todo mundo: só o `paraMim` depende de quem pediu. Por isso o
// cache é compartilhado entre usuários e o recorte pessoal é aplicado depois de ler.
// Sem isso, medido no dev: 3,2s / 5,7s / 9,1s em três chamadas seguidas — a tela abriria em
// nove segundos.
// v2: a v1 guardou listas com menções duplicadas (uma por ocorrência, não por pessoa).
// Trocar a chave descarta o que já estava lá em vez de esperar o TTL entregar dado errado.
const CACHE_KEY = 'jiraops:notificacoes:v2';
const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheNotificacoes { lista: Notificacao[]; ts: number }

async function lerCache(): Promise<CacheNotificacoes | undefined> {
  const redis = getRedisClient();
  if (!redis) return undefined;
  try {
    const c = await redis.get<CacheNotificacoes>(CACHE_KEY);
    return Array.isArray(c?.lista) && c?.ts ? c : undefined;
  } catch (e) {
    console.error('[Notificações] Falha ao ler cache:', e instanceof Error ? e.message : e);
    return undefined;
  }
}

async function gravarCache(lista: Notificacao[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(CACHE_KEY, { lista, ts: Date.now() } satisfies CacheNotificacoes, {
      ex: Math.round((CACHE_TTL_MS * 10) / 1000),
    });
  } catch (e) {
    console.error('[Notificações] Falha ao gravar cache:', e instanceof Error ? e.message : e);
  }
}

function headers() {
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN}`
  ).toString('base64');
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${auth}` };
}

export type TipoNotificacao = 'mention' | 'assigned' | 'comment' | 'status';

export interface Notificacao {
  id: string;
  type: TipoNotificacao;
  issueKey: string;
  summary: string;
  /** Quem causou (comentou, criou, moveu). */
  author: string;
  authorAvatar: string | null;
  date: string;
  message: string;
  /** Para quem a notificação é dirigida, quando aplicável (menção/atribuição). */
  destinatario?: string;
  destinatarioId?: string;
  /**
   * true quando o destinatário é quem está logado. NÃO faz parte da lista guardada em
   * cache — é calculado por requisição, já que depende de quem pediu.
   */
  paraMim?: boolean;
  /** Trecho do comentário, para dar contexto sem abrir o Jira. */
  trecho?: string;
}

// ── ADF ─────────────────────────────────────────────────────────────────────

interface NoADF {
  type?: string;
  text?: string;
  attrs?: { id?: string; text?: string };
  content?: NoADF[];
}

/** Percorre a árvore juntando todo nó de menção, inclusive repetidos. */
function coletarMencoes(no: NoADF | NoADF[] | undefined, achados: { id: string; text: string }[] = []) {
  if (!no || typeof no !== 'object') return achados;
  if (Array.isArray(no)) {
    for (const n of no) coletarMencoes(n, achados);
    return achados;
  }
  if (no.type === 'mention' && no.attrs?.id) {
    achados.push({ id: no.attrs.id, text: no.attrs.text || '@alguém' });
  }
  if (no.content) coletarMencoes(no.content, achados);
  return achados;
}

/**
 * As PESSOAS mencionadas num comentário — uma vez cada, mesmo que o texto marque a mesma
 * pessoa várias vezes.
 *
 * Isso acontece de verdade: o comentário 99059 de DSMM-219 tem 5 nós de menção para 3
 * pessoas (duas delas marcadas duas vezes). Sem deduplicar, a mesma notificação saía
 * repetida na lista e o React reclamava de chave duplicada — as duas cópias tinham o mesmo
 * id, que é justamente `mention:<issue>:<comentario>:<accountId>`.
 *
 * Ser mencionado duas vezes no mesmo comentário é UM aviso, não dois.
 */
function extrairMencoes(no: NoADF | NoADF[] | undefined): { id: string; text: string }[] {
  const porPessoa = new Map<string, { id: string; text: string }>();
  for (const m of coletarMencoes(no)) {
    if (!porPessoa.has(m.id)) porPessoa.set(m.id, m);
  }
  return [...porPessoa.values()];
}

/** Texto plano do ADF, para mostrar um trecho do comentário na lista. */
function textoDoADF(no: NoADF | NoADF[] | undefined, partes: string[] = []): string {
  if (!no || typeof no !== 'object') return partes.join('');
  if (Array.isArray(no)) {
    for (const n of no) textoDoADF(n, partes);
    return partes.join('');
  }
  if (no.type === 'text' && no.text) partes.push(no.text);
  if (no.type === 'mention') partes.push(no.attrs?.text || '@alguém');
  if (no.type === 'hardBreak' || no.type === 'paragraph') partes.push(' ');
  if (no.content) textoDoADF(no.content, partes);
  return partes.join('');
}

function recorte(texto: string, max = 160): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
}

// ── Jira ────────────────────────────────────────────────────────────────────

interface IssueJira {
  key: string;
  fields: {
    summary?: string;
    created?: string;
    assignee?: { accountId?: string; displayName?: string; avatarUrls?: Record<string, string> } | null;
    reporter?: { displayName?: string; avatarUrls?: Record<string, string> } | null;
    comment?: { comments?: ComentarioJira[] };
  };
  changelog?: { histories?: HistoricoJira[] };
}
interface ComentarioJira {
  id?: string;
  created: string;
  author?: { displayName?: string; avatarUrls?: Record<string, string> };
  body?: NoADF;
}
interface HistoricoJira {
  id?: string;
  created: string;
  author?: { displayName?: string; avatarUrls?: Record<string, string> };
  items?: { field?: string; to?: string; toString?: string; fromString?: string }[];
}

/**
 * `expand` vai como STRING separada por vírgula, nunca como array: /search/jql responde
 * 400 "Invalid request payload" com `expand: ['changelog']` e 200 com `expand: 'changelog'`.
 * Foi exatamente isso que deixou a tela de notificações vazia — a rota antiga mandava array
 * e engolia o 400 num `if (res.ok)`.
 */
async function buscar(jql: string, fields: string[], expand?: string): Promise<IssueJira[]> {
  const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ jql, fields, maxResults: 100, ...(expand ? { expand } : {}) }),
  });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.issues || [];
}

export async function GET(request: NextRequest) {
  if (!process.env.JIRA_EMAIL || !(process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN)) {
    return NextResponse.json({ error: 'Jira não configurado' }, { status: 500 });
  }

  const email = await getSessionEmail(request);
  // Não bloqueia sem e-mail: a tela ainda é útil mostrando a atividade do time. Só não dá
  // para marcar nada como pessoal.
  const meuAccountId = email ? await resolveJiraAccountId(email) : null;

  try {
    const cache = await lerCache();
    let lista: Notificacao[];

    if (cache) {
      lista = cache.lista;
      // Velho: responde já com o que tem e recarrega depois. A tela nunca espera pelo Jira.
      if (Date.now() - cache.ts > CACHE_TTL_MS) {
        after(async () => {
          try { await gravarCache(await montarLista()); }
          catch (e) { console.error('[Notificações] Revalidação falhou:', e instanceof Error ? e.message : e); }
        });
      }
    } else {
      lista = await montarLista();
      await gravarCache(lista);
    }

    // O recorte pessoal é aplicado AQUI, sobre a lista compartilhada.
    const comMarca: Notificacao[] = lista.map(n => ({
      ...n,
      paraMim: !!meuAccountId && !!n.destinatarioId && n.destinatarioId === meuAccountId,
    }));

    // As dispensadas saem da lista. É por pessoa: a lista crua no cache é compartilhada, o
    // "já resolvi isto" não.
    const dono = chaveDono(meuAccountId, email);
    const dispensadas = await lerDispensadas(dono);
    const visiveis = comMarca.filter(n => !dispensadas.has(n.id));

    return montarResposta(visiveis, email, meuAccountId, dispensadas.size);
  } catch (error) {
    console.error('[Notificações] Falha:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro', success: false },
      { status: 500 }
    );
  }
}

/**
 * Monta a lista crua de notificações do Jira. NÃO conhece o usuário: o campo `paraMim` é
 * aplicado depois, o que permite guardar esta lista num cache compartilhado por todos.
 */
async function montarLista(): Promise<Notificacao[]> {
  const projetos = PROJECTS.join(', ');
  const corte = Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000;

  // Duas consultas em paralelo, e não uma: as issues COMENTADAS e as issues CRIADAS são
  // conjuntos diferentes (uma demanda criada hoje para alguém pode não ter comentário
  // nenhum, e ficaria de fora se dependesse da primeira).
  const [comentadas, criadas] = await Promise.all([
    buscar(
      `project in (${projetos}) AND updated >= -${JANELA_DIAS}d ORDER BY updated DESC`,
      ['summary', 'comment', 'assignee'],
      'changelog'
    ),
    buscar(
      `project in (${projetos}) AND created >= -${JANELA_DIAS}d AND assignee IS NOT EMPTY ORDER BY created DESC`,
      ['summary', 'assignee', 'reporter', 'created']
    ),
  ]);

  const notificacoes: Notificacao[] = [];

  for (const issue of comentadas) {
    const summary = issue.fields.summary || issue.key;

    for (const c of issue.fields.comment?.comments || []) {
      if (new Date(c.created).getTime() < corte) continue;

      const autor = c.author?.displayName || 'Alguém';
      const avatar = c.author?.avatarUrls?.['24x24'] || null;
      const mencoes = extrairMencoes(c.body);
      const trecho = recorte(textoDoADF(c.body));

      if (mencoes.length > 0) {
        // Uma notificação POR PESSOA mencionada: o mesmo comentário pode marcar três
        // pessoas, e cada uma precisa ver a sua.
        for (const m of mencoes) {
          notificacoes.push({
            id: `mention:${issue.key}:${c.id || c.created}:${m.id}`,
            type: 'mention',
            issueKey: issue.key,
            summary,
            author: autor,
            authorAvatar: avatar,
            date: c.created,
            message: `${autor} mencionou ${m.text} em ${issue.key}`,
            destinatario: m.text.replace(/^@/, ''),
            destinatarioId: m.id,
            trecho,
          });
        }
      } else {
        notificacoes.push({
          id: `comment:${issue.key}:${c.id || c.created}`,
          type: 'comment',
          issueKey: issue.key,
          summary,
          author: autor,
          authorAvatar: avatar,
          date: c.created,
          message: `${autor} comentou em ${issue.key}`,
          trecho,
        });
      }
    }

    for (const h of issue.changelog?.histories || []) {
      if (new Date(h.created).getTime() < corte) continue;
      const autor = h.author?.displayName || 'Sistema';
      const avatar = h.author?.avatarUrls?.['24x24'] || null;

      for (const item of h.items || []) {
        if (item.field === 'status') {
          notificacoes.push({
            id: `status:${issue.key}:${h.id || h.created}`,
            type: 'status',
            issueKey: issue.key,
            summary,
            author: autor,
            authorAvatar: avatar,
            date: h.created,
            message: `${autor} moveu ${issue.key} para "${item.toString}"`,
          });
        } else if (item.field === 'assignee' && item.to) {
          // Troca de responsável DEPOIS da criação. Medido no projeto: hoje isso é raro
          // (zero em 30 dias), mas é o único jeito de pegar uma demanda repassada.
          notificacoes.push({
            id: `assigned:${issue.key}:${h.id || h.created}`,
            type: 'assigned',
            issueKey: issue.key,
            summary,
            author: autor,
            authorAvatar: avatar,
            date: h.created,
            message: `${autor} passou ${issue.key} para ${item.toString || 'alguém'}`,
            destinatario: item.toString || undefined,
            destinatarioId: item.to,
          });
        }
      }
    }
  }

  // Demandas criadas já com responsável. Atribuir na criação NÃO gera entrada no
  // changelog, então esse caso só existe por aqui — é justamente o "criei uma demanda
  // para a Fabiana".
  for (const issue of criadas) {
    const criado = issue.fields.created;
    const destino = issue.fields.assignee;
    if (!criado || !destino?.accountId || new Date(criado).getTime() < corte) continue;

    const quemCriou = issue.fields.reporter?.displayName || 'Alguém';
    notificacoes.push({
      id: `assigned:${issue.key}:criacao`,
      type: 'assigned',
      issueKey: issue.key,
      summary: issue.fields.summary || issue.key,
      author: quemCriou,
      authorAvatar: issue.fields.reporter?.avatarUrls?.['24x24'] || null,
      date: criado,
      message: `${quemCriou} criou ${issue.key} para ${destino.displayName || 'alguém'}`,
      destinatario: destino.displayName || undefined,
      destinatarioId: destino.accountId,
    });
  }

  notificacoes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return notificacoes;
}

function montarResposta(
  notificacoes: Notificacao[],
  email: string | null,
  meuAccountId: string | null,
  totalDispensadas = 0
) {
  // As pessoais NUNCA são cortadas pelo limite. Um simples slice(200) por data podia
  // descartar uma menção sua de 10 dias atrás porque 200 comentários de outras pessoas
  // vieram depois — justo o oposto do que a tela existe para fazer. Então mandamos todas as
  // suas, e o teto se aplica só ao resto.
  const minhas = notificacoes.filter(n => n.paraMim);
  const demais = notificacoes.filter(n => !n.paraMim);
  const enviadas = [...minhas, ...demais.slice(0, Math.max(0, LIMITE - minhas.length))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    success: true,
    // Quando o e-mail da sessão não tem conta no Jira, a tela precisa poder dizer isso —
    // senão a aba "Para mim" fica vazia sem explicação e parece defeito.
    identidade: { email: email || null, accountId: meuAccountId, reconhecido: !!meuAccountId },
    // Os totais contam a JANELA INTEIRA, não o que foi devolvido: é o número honesto de
    // "quantas coisas aconteceram em 14 dias".
    totais: {
      todas: notificacoes.length,
      paraMim: minhas.length,
      mencoes: notificacoes.filter(n => n.type === 'mention').length,
      atribuicoes: notificacoes.filter(n => n.type === 'assigned').length,
    },
    notifications: enviadas,
    dispensadas: totalDispensadas,
    janelaDias: JANELA_DIAS,
  });
}

// ── POST: comentar e tirar da lista ──────────────────────────────────────────
//
// Uma ação só, porque é assim que a tela usa: você responde a menção e ela sai da caixa.
// A dispensa é gravada mesmo que o comentário seja o único efeito visível no Jira.

/** Limite defensivo: o campo é um textarea livre e vai para uma API externa. */
const COMENTARIO_MAX = 5000;

export async function POST(request: NextRequest) {
  const email = await getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Sessão necessária para comentar' }, { status: 401 });
  }

  let corpo: {
    id?: string;
    issueKey?: string;
    comentario?: string;
    apenasDispensar?: boolean;
    restaurar?: boolean;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { id, issueKey, comentario, apenasDispensar, restaurar: pedeRestaurar } = corpo;
  if (!id) return NextResponse.json({ error: 'id da notificação é obrigatório' }, { status: 400 });

  const meuAccountId = await resolveJiraAccountId(email);
  const dono = chaveDono(meuAccountId, email);
  if (!dono) {
    return NextResponse.json({ error: 'Não foi possível identificar você para guardar a ação' }, { status: 400 });
  }

  // Desfazer: traz de volta um item dispensado. Existe porque dispensar é um clique só e
  // sem volta seria uma armadilha — some da lista e não há como reencontrar.
  if (pedeRestaurar) {
    const ok = await restaurar(dono, id);
    return ok
      ? NextResponse.json({ success: true, restaurada: true, id })
      : NextResponse.json({ error: 'Falha ao restaurar (Redis indisponível?)' }, { status: 500 });
  }

  // Dispensar sem comentar ("já vi isto") usa o mesmo caminho.
  if (apenasDispensar) {
    const ok = await dispensar(dono, id);
    return ok
      ? NextResponse.json({ success: true, dispensada: true, id })
      : NextResponse.json({ error: 'Falha ao guardar a ação (Redis indisponível?)' }, { status: 500 });
  }

  const texto = (comentario || '').trim();
  if (!texto) return NextResponse.json({ error: 'Escreva um comentário' }, { status: 400 });
  if (texto.length > COMENTARIO_MAX) {
    return NextResponse.json({ error: `Comentário acima de ${COMENTARIO_MAX} caracteres` }, { status: 400 });
  }
  if (!issueKey || !/^[A-Z][A-Z0-9]*-\d+$/.test(issueKey)) {
    return NextResponse.json({ error: 'issueKey inválida' }, { status: 400 });
  }

  // Prefixo de autoria porque o Jira Cloud NÃO permite comentar como outra pessoa via API
  // token (impersonação existe só para apps Connect). Sem isso, um comentário da Fabiana
  // apareceria no Jira assinado pela conta de serviço, atribuindo a fala à pessoa errada.
  const marcado = `${email} (via JiraOps):\n${texto}`;

  try {
    // API v2 com string simples, o mesmo esquema já usado em /api/demanda/[issueKey].
    const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue/${issueKey}/comment`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ body: marcado }),
    });

    if (!res.ok) {
      const detalhe = (await res.text().catch(() => '')).slice(0, 300);
      console.error(`[Notificações] Comentário em ${issueKey} falhou (HTTP ${res.status}):`, detalhe);
      return NextResponse.json(
        { error: `Jira recusou o comentário (HTTP ${res.status})`, detalhe, success: false },
        { status: 502 }
      );
    }

    // Dispensa só DEPOIS de o Jira aceitar: tirar da lista sem o comentário ter sido postado
    // esconderia uma cobrança que ninguém respondeu.
    const guardou = await dispensar(dono, id);

    // O comentário novo muda a lista crua, então o cache compartilhado ficou velho.
    after(async () => {
      try { await gravarCache(await montarLista()); }
      catch (e) { console.error('[Notificações] Revalidação pós-comentário falhou:', e instanceof Error ? e.message : e); }
    });

    return NextResponse.json({
      success: true,
      id,
      issueKey,
      dispensada: guardou,
      // Quando o Redis está fora, o comentário foi postado mas o item volta no próximo
      // refresh. A tela precisa poder dizer isso em vez de deixar a pessoa achar que sumiu.
      aviso: guardou ? undefined : 'Comentário publicado, mas não foi possível guardar a dispensa — o item pode reaparecer.',
      message: `Comentário publicado em ${issueKey}`,
    });
  } catch (error) {
    console.error('[Notificações] Erro ao comentar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao comentar', success: false },
      { status: 500 }
    );
  }
}
