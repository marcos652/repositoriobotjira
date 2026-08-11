import { NextRequest, NextResponse } from 'next/server';
import { fetchDevSummary, fetchDevDetail, enrichWithConflictStatus } from '@/lib/jira-dev-status';

// Escanear PR por issue é lento (uma chamada de summary por issue) — em contas Hobby da
// Vercel o timeout padrão é 10s, então isso precisa do plano Pro pra rodar até o fim.
export const maxDuration = 60;

const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';
const JIRA_BASE_URL = `https://${JIRA_DOMAIN}`;
const PROJECT_KEY = 'DSMM';
const SCAN_CONCURRENCY = 8;

// Escanear todo o projeto demora ~10s (medido: ~7s de summary + ~3s de detail pra 146 issues).
// Cache em memória evita repetir isso em toda troca de aba/refresh — só recalcula depois do TTL
// ou quando o usuário pede refresh explícito. Reseta em cold start (característica do serverless,
// não um bug: a Vercel pode "desligar" a função entre requests pouco frequentes).
const CACHE_TTL_MS = 5 * 60 * 1000;
const GLOBAL_CACHE_KEY = '__jiraops_releases_cache__';

interface ReleasesCache {
  data: { releases: unknown[]; scanned: number; matched: number };
  ts: number;
}

function getCache(): ReleasesCache | undefined {
  return (globalThis as Record<string, unknown>)[GLOBAL_CACHE_KEY] as ReleasesCache | undefined;
}

function setCache(data: ReleasesCache['data']): void {
  (globalThis as Record<string, unknown>)[GLOBAL_CACHE_KEY] = { data, ts: Date.now() };
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
async function fetchAllProjectIssues(): Promise<JiraIssueLite[]> {
  const issues: JiraIssueLite[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < 20; page++) {
    const body: Record<string, unknown> = {
      jql: `project = ${PROJECT_KEY} ORDER BY updated DESC`,
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

// GET /api/jira/releases — todas as tarefas do DSMM que têm PR vinculado, com o mesmo
// detalhamento (branches, PRs, builds) do painel "Desenvolvimento" do Jira.
export async function GET(request: NextRequest) {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
  const cached = getCache();
  if (!forceRefresh && cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, ...cached.data, cached: true, cachedAt: cached.ts });
  }

  try {
    const allIssues = await fetchAllProjectIssues();

    // 1) Passada rápida (só /summary) pra descobrir quais issues têm PR vinculado
    const summaries = await mapWithConcurrency(allIssues, SCAN_CONCURRENCY, async (issue) => ({
      issue,
      summary: await fetchDevSummary(JIRA_BASE_URL, headers(), issue.id),
    }));

    const withPr = summaries.filter(s => s.summary.counts.pullRequests > 0);

    // 2) Passada detalhada (branches/PRs/builds) só pras issues que realmente têm PR
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

    const data = { releases, scanned: allIssues.length, matched: releases.length };
    setCache(data);

    return NextResponse.json({ success: true, ...data, cached: false, cachedAt: Date.now() });
  } catch (error: unknown) {
    console.error('Releases API error:', error);
    const message = error instanceof Error ? error.message : 'Erro';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
