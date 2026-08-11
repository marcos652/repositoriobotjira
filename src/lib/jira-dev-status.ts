// Helpers para o painel "Desenvolvimento" do Jira (branches, PRs, builds via /rest/dev-status).
// O applicationType conectado (GitHub, Bitbucket, GitLab...) não é fixo — precisa ser descoberto
// pelo /issue/summary antes de chamar o /issue/detail, senão a chamada volta vazia em silêncio.

export interface DevCounts {
  branches: number;
  commits: number;
  pullRequests: number;
  builds: { count: number; state: string | null };
}

export interface PullRequestInfo {
  id: string; title: string; status: string; url: string;
  author: string | null; source: string | null; destination: string | null; reviewers: string[];
  // Só preenchido para PRs abertos, via GitHub direto (o dev-status do Jira não expõe conflito de merge).
  mergeable: boolean | null;
  mergeableState: string | null;
}

export interface BranchInfo {
  name: string; url: string | null; repository: string | null;
  lastCommitDate: string | null; lastCommitMessage: string | null;
}

export interface BuildInfo {
  pipeline: string; buildNumber: number | string | null; url: string | null;
  state: string | null; lastUpdated: string | null;
  testResults: { passed: number; failed: number; skipped: number } | null;
}

export interface DevSummaryResult {
  counts: DevCounts;
  prTypes: string[];
  repoTypes: string[];
  buildTypes: string[];
}

export async function fetchDevSummary(baseUrl: string, headers: HeadersInit, issueId: string): Promise<DevSummaryResult> {
  const res = await fetch(`${baseUrl}/rest/dev-status/latest/issue/summary?issueId=${issueId}`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any = {};
  if (res && res.ok) {
    try { raw = (await res.json())?.summary || {}; } catch {}
  }

  const prTypes = Object.keys(raw.pullrequest?.byInstanceType || {});
  const repoTypes = Object.keys(raw.branch?.byInstanceType || raw.repository?.byInstanceType || {});
  let buildTypes = Object.keys(raw.build?.byInstanceType || {});

  // Fallback: se o summary indicar contagem > 0 mas não trouxe byInstanceType (formato varia),
  // tenta "GitHub" como última alternativa antes de desistir.
  const finalPrTypes = prTypes.length === 0 && (raw.pullrequest?.overall?.count || 0) > 0 ? ['GitHub'] : prTypes;
  const finalRepoTypes = repoTypes.length === 0 && (raw.branch?.overall?.count || raw.repository?.overall?.count || 0) > 0 ? ['GitHub'] : repoTypes;
  if (buildTypes.length === 0 && (raw.build?.overall?.count || 0) > 0) {
    buildTypes = finalRepoTypes.length > 0 ? finalRepoTypes : ['GitHub'];
  }

  return {
    counts: {
      branches: raw.branch?.overall?.count ?? raw.repository?.overall?.count ?? 0,
      commits: raw.repository?.overall?.commitCount ?? 0,
      pullRequests: raw.pullrequest?.overall?.count ?? 0,
      builds: {
        count: raw.build?.overall?.count ?? 0,
        state: raw.build?.overall?.state || raw.build?.overall?.lastUpdated || null,
      },
    },
    prTypes: finalPrTypes,
    repoTypes: finalRepoTypes,
    buildTypes,
  };
}

export async function fetchDevDetail(
  baseUrl: string,
  headers: HeadersInit,
  issueId: string,
  prTypes: string[],
  repoTypes: string[],
  buildTypes: string[]
): Promise<{ pullRequests: PullRequestInfo[]; branches: BranchInfo[]; builds: BuildInfo[] }> {
  const [prResponses, repoResponses, buildResponses] = await Promise.all([
    Promise.all(prTypes.map(t =>
      fetch(`${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=${encodeURIComponent(t)}&dataType=pullrequest`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null)
    )),
    Promise.all(repoTypes.map(t =>
      // "repository" dataType existe mas vem sempre vazio pra branches conectadas via GitHub —
      // o Jira reporta o mesmo dado (com branches de fato) só em dataType=branch. Confirmado
      // testando direto na API real: repository.overall.count fica 0 mesmo com branch.overall.count > 0.
      fetch(`${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=${encodeURIComponent(t)}&dataType=branch`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null)
    )),
    Promise.all(buildTypes.map(t =>
      fetch(`${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=${encodeURIComponent(t)}&dataType=build`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null)
    )),
  ]);

  const pullRequests: PullRequestInfo[] = [];
  for (const r of prResponses) {
    if (!r || !r.ok) continue;
    try {
      const d = await r.json();
      for (const repo of (d?.detail || [])) {
        for (const pr of (repo.pullRequests || [])) {
          pullRequests.push({
            id: pr.id, title: pr.name || pr.title, status: pr.status, url: pr.url,
            author: pr.author?.name || null, source: pr.source?.branch || null,
            destination: pr.destination?.branch || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reviewers: (pr.reviewers || []).map((rv: any) => rv.name || rv.login),
            mergeable: null, mergeableState: null,
          });
        }
      }
    } catch {}
  }

  const branches: BranchInfo[] = [];
  for (const r of repoResponses) {
    if (!r || !r.ok) continue;
    try {
      const d = await r.json();
      for (const repo of (d?.detail || [])) {
        for (const b of (repo.branches || [])) {
          // O nome do repositório vem dentro de cada branch (b.repository.name), não no
          // wrapper de topo — confirmado testando contra a API real.
          branches.push({
            name: b.name, url: b.url || null, repository: b.repository?.name || null,
            lastCommitDate: b.lastCommit?.authorTimestamp || null, lastCommitMessage: b.lastCommit?.message || null,
          });
        }
      }
    } catch {}
  }

  const builds: BuildInfo[] = [];
  for (const r of buildResponses) {
    if (!r || !r.ok) continue;
    try {
      const d = await r.json();
      // As builds vêm num nível extra de aninhamento (detail[].jswddBuildsData[].builds[]),
      // não direto em detail[].builds — confirmado testando contra a API real.
      for (const provider of (d?.detail || [])) {
        for (const group of (provider.jswddBuildsData || [])) {
          for (const b of (group.builds || [])) {
            builds.push({
              pipeline: b.displayName || b.pipelineName || b.pipelineDisplayName || 'CI',
              buildNumber: b.buildNumber ?? b.key ?? null,
              url: b.url || null,
              state: b.state || null,
              lastUpdated: b.lastUpdated || null,
              testResults: b.testResults ? {
                passed: b.testResults.successfulTestCount ?? b.testResults.passed ?? 0,
                failed: b.testResults.failedTestCount ?? b.testResults.failed ?? 0,
                skipped: b.testResults.skippedTestCount ?? b.testResults.skipped ?? 0,
              } : null,
            });
          }
        }
        // Fallback pra outros providers de build que não usem o formato jswddBuildsData.
        for (const b of (provider.builds || [])) {
          builds.push({
            pipeline: b.pipelineName || b.pipelineDisplayName || b.displayName || 'CI',
            buildNumber: b.buildNumber ?? b.key ?? null,
            url: b.url || null,
            state: b.state || null,
            lastUpdated: b.lastUpdated || null,
            testResults: b.testResults ? {
              passed: b.testResults.successfulTestCount ?? b.testResults.passed ?? 0,
              failed: b.testResults.failedTestCount ?? b.testResults.failed ?? 0,
              skipped: b.testResults.skippedTestCount ?? b.testResults.skipped ?? 0,
            } : null,
          });
        }
      }
    } catch {}
  }

  return { pullRequests, branches, builds };
}

/** Roda `fn` sobre `items` com no máximo `limit` chamadas em paralelo. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

const PR_URL_RE = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

// O dev-status do Jira não expõe conflito de merge — só a API do GitHub tem isso
// (mergeable_state: "dirty" = tem conflito). Só vale a pena checar PRs ainda abertos:
// PRs já merged/declined não têm mais um estado de conflito atual.
export async function enrichWithConflictStatus(pullRequests: PullRequestInfo[]): Promise<PullRequestInfo[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return pullRequests;

  const openPrs = pullRequests.filter(pr => pr.status !== 'MERGED' && pr.status !== 'DECLINED' && PR_URL_RE.test(pr.url || ''));
  if (openPrs.length === 0) return pullRequests;

  const results = await mapWithConcurrency(openPrs, 8, async (pr) => {
    const match = pr.url.match(PR_URL_RE);
    if (!match) return null;
    const [, owner, repo, number] = match;
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
        headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { prId: pr.id, mergeable: (data as any).mergeable ?? null, mergeableState: (data as any).mergeable_state || null };
    } catch {
      return null;
    }
  });

  const byId = new Map(results.filter((r): r is NonNullable<typeof r> => r !== null).map(r => [r.prId, r]));
  return pullRequests.map(pr => {
    const found = byId.get(pr.id);
    return found ? { ...pr, mergeable: found.mergeable, mergeableState: found.mergeableState } : pr;
  });
}
