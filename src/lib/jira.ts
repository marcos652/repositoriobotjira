// ============================================
// Jira API Client (v3 - using /search/jql POST)
// Uses cursor-based pagination with nextPageToken
// ============================================

interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
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
    maxResults = 50,
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

  async searchAllIssues(jql: string, fields: string[] = DEFAULT_FIELDS): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    // Safety limit: max 10 pages (up to 1000 issues)
    for (let page = 0; page < 10; page++) {
      const result = await this.searchIssues(jql, fields, 100, nextPageToken);
      allIssues.push(...result.issues);

      if (result.isLast || !result.nextPageToken) break;
      nextPageToken = result.nextPageToken;
    }

    return allIssues;
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
    const domain = process.env.JIRA_DOMAIN;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      throw new Error('Missing Jira configuration. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.');
    }

    clientInstance = new JiraClient({ domain, email, apiToken });
  }

  return clientInstance;
}

export function isJiraConfigured(): boolean {
  return !!(process.env.JIRA_DOMAIN && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN);
}
