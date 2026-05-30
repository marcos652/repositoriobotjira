// Shared API configuration for the JiraBot backend
export const JIRABOT_CONFIG = {
  BASE_URL: 'https://apibotjira.vercel.app',
  AUTH_TOKEN: `Bearer ${process.env.API_SECRET_KEY || 'jiraops-api-key-2024-secure'}`,
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 2,
};

// Helper: recursively search for the Jira issue key in the response data
export function findIssueKey(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  const keyFields = ['key', 'issue_key', 'jira_key', 'issueKey', 'jiraKey', 'ticket', 'ticket_key'];
  for (const field of keyFields) {
    if (typeof obj[field] === 'string' && /^[A-Z]+-\d+$/.test(obj[field])) {
      return obj[field];
    }
  }

  const nestedFields = ['data', 'result', 'issue', 'response', 'jira', 'jira_response', 'created_issue'];
  for (const field of nestedFields) {
    if (obj[field] && typeof obj[field] === 'object') {
      const found = findIssueKey(obj[field]);
      if (found) return found;
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      const match = value.match(/\b([A-Z]{2,10}-\d+)\b/);
      if (match) return match[1];
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const found = findIssueKey(value);
      if (found) return found;
    }
  }

  return null;
}

// Helper: fetch with timeout and retries
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = JIRABOT_CONFIG.MAX_RETRIES,
  timeoutMs = JIRABOT_CONFIG.TIMEOUT_MS
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': JIRABOT_CONFIG.AUTH_TOKEN,
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (res.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      return res;
    } catch (error: any) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError;
}

// Helper: parse response body
export async function parseResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return { text: await res.text() };
}
