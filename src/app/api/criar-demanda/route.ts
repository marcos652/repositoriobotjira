import { NextRequest, NextResponse } from 'next/server';

// Helper: recursively search for the Jira issue key in the response data
function findIssueKey(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // Direct key fields
  const keyFields = ['key', 'issue_key', 'jira_key', 'issueKey', 'jiraKey', 'ticket', 'ticket_key'];
  for (const field of keyFields) {
    if (typeof obj[field] === 'string' && /^[A-Z]+-\d+$/.test(obj[field])) {
      return obj[field];
    }
  }

  // Check nested objects (e.g. data.key, result.key, issue.key)
  const nestedFields = ['data', 'result', 'issue', 'response', 'jira', 'jira_response', 'created_issue'];
  for (const field of nestedFields) {
    if (obj[field] && typeof obj[field] === 'object') {
      const found = findIssueKey(obj[field]);
      if (found) return found;
    }
  }

  // Search in string values that might contain the key pattern
  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      const match = value.match(/\b([A-Z]{2,10}-\d+)\b/);
      if (match) return match[1];
    }
  }

  // Deep search all nested objects
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const found = findIssueKey(value);
      if (found) return found;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  let lastError: any = null;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body = await request.clone().json();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch('https://apibotjira.vercel.app/api/criar-demanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = res.headers.get('content-type');
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { text };
      }

      if (!res.ok) {
        lastError = data;
        // Retry on server errors (5xx)
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return NextResponse.json(
          { error: data?.error || data?.detail || data?.message || 'Erro retornado pela API', details: data },
          { status: res.status }
        );
      }

      // Extract the issue key from anywhere in the response
      const issueKey = findIssueKey(data);

      // Build a normalized response that ALWAYS includes the key prominently
      const normalized = {
        success: true,
        issue_key: issueKey || null,
        message: issueKey
          ? `Demanda ${issueKey} criada com sucesso!`
          : 'Demanda criada, mas não foi possível identificar o número.',
        raw: data,
      };

      return NextResponse.json(normalized);

    } catch (error: any) {
      lastError = error;
      if (error?.name === 'AbortError') {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return NextResponse.json(
          { error: 'Timeout: a API demorou mais de 30s para responder', success: false },
          { status: 504 }
        );
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  console.error('Erro ao criar demanda após retries:', lastError);
  return NextResponse.json(
    { error: 'Falha ao processar requisição após múltiplas tentativas', message: lastError?.message || String(lastError), success: false },
    { status: 500 }
  );
}
