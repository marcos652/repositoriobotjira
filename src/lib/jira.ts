// ============================================
// Jira API Client (v3 - using /search/jql POST)
// Uses cursor-based pagination with nextPageToken
// ============================================

interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
}

/** Uma entrada do histórico de alterações: quem mudou o quê, e quando. */
export interface JiraChangelogEntry {
  id?: string;
  created: string;
  author?: {
    accountId?: string;
    displayName?: string;
    emailAddress?: string;
    avatarUrls?: Record<string, string>;
  };
  items?: {
    field?: string;
    fieldId?: string;
    from?: string;
    to?: string;
    fromString?: string;
    toString?: string;
  }[];
}

export interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: { key: string; name: string };
    };
    priority: { name: string; id: string };
    assignee?: { displayName: string; emailAddress: string; avatarUrls: Record<string, string> };
    reporter?: { displayName: string; emailAddress: string };
    created: string;
    updated: string;
    resolutiondate?: string;
    duedate?: string;
    labels: string[];
    issuetype: { name: string };
    project: { key: string; name: string };
    [key: string]: unknown;
  };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  goal?: string;
}

interface JiraSearchResult {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

const DEFAULT_FIELDS = [
  'summary', 'status', 'priority', 'assignee', 'reporter',
  'created', 'updated', 'resolutiondate', 'duedate', 'labels',
  'issuetype', 'project',
];

export class JiraClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: JiraConfig) {
    this.baseUrl = `https://${config.domain}`;
    this.headers = {
      'Authorization': `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  // --- Search using POST /search/jql (cursor-based pagination) ---

  async searchIssues(
    jql: string,
    fields: string[] = DEFAULT_FIELDS,
    maxResults = 100,
    nextPageToken?: string
  ): Promise<JiraSearchResult> {
    const body: Record<string, unknown> = {
      jql,
      fields,
      maxResults,
    };
    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }

    const res = await fetch(`${this.baseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Jira API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    return res.json();
  }

  /**
   * Quantas issues a JQL casa, sem baixar nenhuma. Medido nesta instância: ~600ms por
   * contagem, contra 12,8s para paginar 2.000 issues só para contá-las. Use isto sempre
   * que a tela precisar só do número.
   */
  async approximateCount(jql: string): Promise<number> {
    const res = await fetch(`${this.baseUrl}/rest/api/3/search/approximate-count`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ jql }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Jira approximate-count error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    if (typeof data?.count !== 'number') {
      throw new Error(`Jira approximate-count sem count: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return data.count;
  }

  /**
   * `expand` vai como STRING separada por vírgula, nunca array: /search/jql responde 400
   * "Invalid request payload" com `expand: ['changelog']`.
   */
  async searchAllIssues(jql: string, fields: string[] = DEFAULT_FIELDS, expand?: string): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    // Safety limit: max 20 pages (up to 2000 issues)
    for (let page = 0; page < 20; page++) {
      const body: Record<string, unknown> = { jql, fields, maxResults: 100 };
      if (expand) body.expand = expand;
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res = await fetch(`${this.baseUrl}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Jira API error: ${res.status} ${res.statusText} - ${await res.text()}`);
      }
      const result: JiraSearchResult = await res.json();
      allIssues.push(...(result.issues || []));

      if (result.isLast || !result.nextPageToken) break;
      nextPageToken = result.nextPageToken;
    }

    return allIssues;
  }

  /** Todos os status da instância, com a categoria de cada um. */
  async listarStatus(): Promise<{ id: string; name: string; statusCategory?: { key: string } }[]> {
    const res = await fetch(`${this.baseUrl}/rest/api/3/status`, { headers: this.headers });
    if (!res.ok) throw new Error(`Jira status error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  /**
   * Changelog completo de uma issue, paginado. A busca com expand=changelog pode truncar o
   * histórico das issues muito movimentadas, e um histórico truncado esconde atividade sem
   * avisar.
   */
  async changelogCompleto(issueKey: string): Promise<JiraChangelogEntry[]> {
    const todas: JiraChangelogEntry[] = [];
    let startAt = 0;
    for (let p = 0; p < 20; p++) {
      const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/changelog?startAt=${startAt}&maxResults=100`, {
        headers: this.headers,
      });
      if (!res.ok) throw new Error(`Jira changelog error: ${res.status} ${res.statusText}`);
      const j = await res.json();
      todas.push(...(j.values || []));
      if (j.isLast || todas.length >= (j.total ?? todas.length)) break;
      startAt += (j.values || []).length || 100;
    }
    return todas;
  }

  async getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue> {
    const params = expand ? `?expand=${expand.join(',')}` : '';
    const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}${params}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // --- Agile API (Boards & Sprints) ---

  async getBoards(): Promise<{ id: number; name: string; type: string }[]> {
    const res = await fetch(`${this.baseUrl}/rest/agile/1.0/board`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Jira Agile API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.values || [];
  }

  async getBoardSprints(boardId: number, state?: string): Promise<JiraSprint[]> {
    const params = state ? `?state=${state}` : '';
    const res = await fetch(`${this.baseUrl}/rest/agile/1.0/board/${boardId}/sprint${params}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Jira Agile API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.values || [];
  }

  async getSprintIssues(sprintId: number, fields: string[] = []): Promise<JiraIssue[]> {
    const params = fields.length > 0 ? `?fields=${fields.join(',')}` : '';
    const res = await fetch(`${this.baseUrl}/rest/agile/1.0/sprint/${sprintId}/issue${params}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Jira Agile API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.issues || [];
  }

  // --- Users ---

  async getProjectUsers(projectKey: string): Promise<{ displayName: string; emailAddress: string; avatarUrls: Record<string, string> }[]> {
    const res = await fetch(`${this.baseUrl}/rest/api/3/user/assignable/search?project=${projectKey}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// Singleton factory
let clientInstance: JiraClient | null = null;

export function getJiraClient(): JiraClient {
  if (!clientInstance) {
    const domain = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN;

    if (!domain || !email || !apiToken) {
      throw new Error('Missing Jira configuration. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.');
    }

    clientInstance = new JiraClient({ domain, email, apiToken });
  }

  return clientInstance;
}

export function isJiraConfigured(): boolean {
  return !!(process.env.JIRA_EMAIL && (process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN));
}
