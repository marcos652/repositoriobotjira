// ============================================
//  E-mail do JiraOps -> accountId do Jira
// ============================================
//
// Extraído de /api/criar-demanda (onde servia para definir o relator) porque as
// notificações precisam do mesmo mapa: só sabendo o accountId de quem está logado é
// possível dizer se uma @menção ou uma atribuição é PARA ELE.

const JIRA_BASE_URL = `https://${process.env.JIRA_DOMAIN || 'movingpay.atlassian.net'}`;
const CACHE_KEY = '__jiraops_jira_account_cache__';

function getAccountCache(): Map<string, string | null> {
  const g = globalThis as Record<string, unknown>;
  if (!g[CACHE_KEY]) g[CACHE_KEY] = new Map<string, string | null>();
  return g[CACHE_KEY] as Map<string, string | null>;
}

function headers() {
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN}`
  ).toString('base64');
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${auth}` };
}

/**
 * Descobre o accountId do Jira a partir de um e-mail.
 *
 * Devolve null quando o e-mail não tem conta no Jira, está inativo, ou a busca falha.
 * Nunca lança — quem chama deve seguir sem o accountId.
 *
 * O match é por e-mail EXATO. A busca do Jira é textual e casa por nome também: sem essa
 * checagem, "ana@..." poderia trazer outra Ana, e aí as notificações de uma pessoa
 * apareceriam para outra — pior do que não ter notificação.
 */
export async function resolveJiraAccountId(email: string): Promise<string | null> {
  const chave = email.trim().toLowerCase();
  const cache = getAccountCache();
  if (cache.has(chave)) return cache.get(chave) ?? null;

  try {
    const res = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/user/search?query=${encodeURIComponent(chave)}&maxResults=5`,
      { headers: headers() }
    );
    if (!res.ok) {
      console.warn(`[JiraAccount] Busca falhou (HTTP ${res.status}) para ${chave}`);
      return null; // não cacheia falha de rede: pode ser transitória
    }
    const usuarios: { accountId?: string; emailAddress?: string; active?: boolean }[] = await res.json();
    const exato = usuarios.find(
      (u) => (u.emailAddress || '').trim().toLowerCase() === chave && u.active !== false
    );
    const accountId = exato?.accountId || null;
    if (!accountId) console.warn(`[JiraAccount] Sem conta ativa no Jira para ${chave}`);
    cache.set(chave, accountId);
    return accountId;
  } catch (e) {
    console.warn('[JiraAccount] Erro ao buscar usuário:', e instanceof Error ? e.message : e);
    return null;
  }
}
