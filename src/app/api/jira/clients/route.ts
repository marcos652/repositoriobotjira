import { NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';

function getAuth() { return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64'); }

export const dynamic = 'force-dynamic';

// GET /api/jira/clients — Clients from Jira custom field
export async function GET() {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
  }

  try {
    // Fetch issues with the client custom field
    const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${getAuth()}` },
      body: JSON.stringify({
        jql: 'project = DSMM AND "Cliente" IS NOT EMPTY ORDER BY created DESC',
        fields: ['customfield_10469', 'status', 'issuetype', 'priority', 'created'],
        maxResults: 100,
      }),
    });

    if (!res.ok) {
      // Fallback: try without the client filter
      const res2 = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${getAuth()}` },
        body: JSON.stringify({
          jql: 'project = DSMM ORDER BY created DESC',
          fields: ['customfield_10469', 'status', 'issuetype', 'priority', 'created'],
          maxResults: 100,
        }),
      });
      if (!res2.ok) throw new Error(`Jira: ${res2.status}`);
      const data2 = await res2.json();
      return processIssues(data2.issues || []);
    }

    const data = await res.json();
    return processIssues(data.issues || []);
  } catch (error: any) {
    console.error('Clients API error:', error);
    return NextResponse.json({ error: error?.message || 'Erro', success: false }, { status: 500 });
  }
}

function processIssues(issues: any[]) {
  const clientMap = new Map<string, { name: string; total: number; open: number; resolved: number; bugs: number; lastActivity: string; }>();

  for (const issue of issues) {
    const clientField = issue.fields?.customfield_10469;
    let clientName = 'Sem cliente';
    if (Array.isArray(clientField) && clientField.length > 0) {
      clientName = clientField[0]?.value || clientField[0]?.name || 'Sem cliente';
    } else if (typeof clientField === 'string') {
      clientName = clientField;
    }

    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, { name: clientName, total: 0, open: 0, resolved: 0, bugs: 0, lastActivity: '' });
    }

    const client = clientMap.get(clientName)!;
    client.total++;

    const cat = issue.fields?.status?.statusCategory?.key;
    if (cat === 'done') client.resolved++;
    else client.open++;

    if (issue.fields?.issuetype?.name === 'Bug') client.bugs++;

    const created = issue.fields?.created || '';
    if (!client.lastActivity || created > client.lastActivity) client.lastActivity = created;
  }

  const clients = [...clientMap.values()].sort((a, b) => b.total - a.total);

  return NextResponse.json({ success: true, clients, totalIssues: issues.length });
}
