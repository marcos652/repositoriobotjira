import { NextRequest, NextResponse, after } from 'next/server';
import { fetchDevSummary, fetchDevDetail, enrichWithConflictStatus } from '@/lib/jira-dev-status';
import { getRedisClient } from '@/lib/redis';

// Escanear PR por issue é lento (uma chamada de summary por issue) — em contas Hobby da
// Vercel o timeout padrão é 10s, então isso precisa do plano Pro pra rodar até o fim.
export const maxDuration = 60;

const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';
const JIRA_BASE_URL = `https://${JIRA_DOMAIN}`;
const PROJECT_KEY = 'DSMM';

// 8 deixava o tempo dominado por espera de rede: são dezenas de GETs independentes e curtos
// no dev-status, não trabalho de CPU. 16 corta o tempo da fase de detalhe pela metade sem
// chegar perto do rate limit de leitura do Jira Cloud.
const SCAN_CONCURRENCY = 16;

const CACHE_TTL_MS = 5 * 60 * 1000;
// Além do TTL o dado ainda serve para responder na hora enquanto atualiza atrás (stale-while-
// revalidate). Passado esse teto, é velho demais para mostrar sem avisar.
const STALE_MAX_MS = 60 * 60 * 1000;
const GLOBAL_CACHE_KEY = '__jiraops_releases_cache__';
const REDIS_CACHE_KEY = 'jiraops:releases-cache';

interface ReleasesData { releases: unknown[]; scanned: number; matched: number }
interface ReleasesCache { data: ReleasesData; ts: number }

function getMemCache(): ReleasesCache | undefined {
  return (globalThis as Record<string, unknown>)[GLOBAL_CACHE_KEY] as ReleasesCache | undefined;
}

function setMemCache(data: ReleasesData, ts = Date.now()): void {
  (globalThis as Record<string, unknown>)[GLOBAL_CACHE_KEY] = { data, ts };
}

// Memória primeiro (mesma instância, custo zero); Redis depois. O cache só em memória
// morria a cada cold start e não era compartilhado entre instâncias da Vercel — na prática
// cada usuário pagava os ~10s de varredura por conta própria. No Redis, o primeiro
// carregamento paga e todos os outros aproveitam.
async function readCache(): Promise<ReleasesCache | undefined> {
  const mem = getMemCache();
  if (mem) return mem;

  const redis = getRedisClient();
  if (!redis) return undefined;
  try {
    const remoto = await redis.get<ReleasesCache>(REDIS_CACHE_KEY);
    if (remoto?.data && remoto.ts) {
      setMemCache(remoto.data, remoto.ts);
      return remoto;
    }
  } catch (e) {
    console.error('[Releases] Falha ao ler cache do Redis:', e instanceof Error ? e.message : e);
  }
  return undefined;
}

async function writeCache(data: ReleasesData): Promise<void> {
  const ts = Date.now();
  setMemCache(data, ts);

  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(REDIS_CACHE_KEY, { data, ts }, { ex: Math.floor(STALE_MAX_MS / 1000) });
  } catch (e) {
    console.error('[Releases] Falha ao gravar cache no Redis:', e instanceof Error ? e.message : e);
  }
}

function getAuth() { return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64'); }
const headers = () => ({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${getAuth()}` });

export const dynamic = 'force-dynamic';

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface JiraIssueLite {
  id: string; key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: any;
}

// Não tem Fix Version nem Version cadastrada no Jira do projeto — então "release" aqui é
// literalmente "toda tarefa do DSMM que já tem PR vinculado", igual ao painel Desenvolvimento
// do Jira (é exatamente o que foi pedido).
//
// O filtro `development[pullrequests].all > 0` faz o JIRA responder só as issues que têm PR.
// Antes isso era descoberto no cliente: paginava o projeto inteiro e chamava /summary uma vez
// por issue só pra perguntar "essa tem PR?". Medido neste projeto: 146+ issues em várias
// páginas contra 63 numa página só, em ~500ms — ou seja, ~83 requisições HTTP a menos por
// carregamento, e nenhuma paginação sequencial.
async function fetchIssuesWithPullRequests(): Promise<JiraIssueLite[]> {
  const issues: JiraIssueLite[] = [];
  let nextPageToken: string | undefined;

  // Ainda pagina: hoje o resultado cabe numa página, mas o projeto cresce.
  for (let page = 0; page < 20; page++) {
    const body: Record<string, unknown> = {
      jql: `project = ${PROJECT_KEY} AND development[pullrequests].all > 0 ORDER BY updated DESC`,
      fields: ['summary', 'status', 'issuetype', 'assignee', 'updated'],
      maxResults: 100,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/search/jql`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Search API: ${res.status}`);
    const data = await res.json();
    issues.push(...(data.issues || []));

    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return issues;
}

async function computeReleases(): Promise<ReleasesData> {
  const allIssues = await fetchIssuesWithPullRequests();

  // O /summary continua necessário: é ele que informa QUAIS applicationTypes consultar no
  // /detail (prTypes, repoTypes, buildTypes). O que mudou é o tamanho da lista — só as
  // issues que o JQL já confirmou ter PR, em vez do projeto inteiro.
  const summaries = await mapWithConcurrency(allIssues, SCAN_CONCURRENCY, async (issue) => ({
    issue,
    summary: await fetchDevSummary(JIRA_BASE_URL, headers(), issue.id),
  }));

  // Rede de segurança: o índice de development do Jira pode estar momentaneamente
  // desatualizado em relação ao dev-status, então ainda confirmamos pelo summary.
  const withPr = summaries.filter(s => s.summary.counts.pullRequests > 0);

  const releases = await mapWithConcurrency(withPr, SCAN_CONCURRENCY, async ({ issue, summary }) => {
    const detail = await fetchDevDetail(JIRA_BASE_URL, headers(), issue.id, summary.prTypes, summary.repoTypes, summary.buildTypes);
    const pullRequests = await enrichWithConflictStatus(detail.pullRequests);
    return {
      key: issue.key,
      summary: issue.fields?.summary || '',
      status: issue.fields?.status?.name || '',
      statusCategory: issue.fields?.status?.statusCategory?.key || 'new',
      issuetype: issue.fields?.issuetype?.name || '',
      assignee: issue.fields?.assignee?.displayName || null,
      updated: issue.fields?.updated || null,
      devSummary: summary.counts,
      pullRequests,
      branches: detail.branches,
      builds: detail.builds,
    };
  });

  releases.sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime());

  return { releases, scanned: allIssues.length, matched: releases.length };
}

// GET /api/jira/releases — todas as tarefas do DSMM que têm PR vinculado, com o mesmo
// detalhamento (branches, PRs, builds) do painel "Desenvolvimento" do Jira.
export async function GET(request: NextRequest) {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
  const cached = forceRefresh ? undefined : await readCache();
  const idade = cached ? Date.now() - cached.ts : Infinity;

  if (cached && idade < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, ...cached.data, cached: true, cachedAt: cached.ts });
  }

  // Cache vencido mas ainda utilizável: responde na hora com o que tem e recalcula em
  // segundo plano (via after(), que roda depois da resposta). Assim a espera de ~segundos
  // cai sobre ninguém — quem abre a página vê dados de poucos minutos atrás e a próxima
  // visita já pega o novo.
  if (cached && idade < STALE_MAX_MS) {
    after(async () => {
      try {
        await writeCache(await computeReleases());
      } catch (e) {
        console.error('[Releases] Revalidação em segundo plano falhou:', e instanceof Error ? e.message : e);
      }
    });
    return NextResponse.json({ success: true, ...cached.data, cached: true, stale: true, cachedAt: cached.ts });
  }

  try {
    const data = await computeReleases();
    await writeCache(data);
    return NextResponse.json({ success: true, ...data, cached: false, cachedAt: Date.now() });
  } catch (error: unknown) {
    console.error('Releases API error:', error);
    const message = error instanceof Error ? error.message : 'Erro';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
