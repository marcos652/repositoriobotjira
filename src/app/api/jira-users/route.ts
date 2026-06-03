import { NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

export async function GET() {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return NextResponse.json({ error: 'Credenciais Jira não configuradas' }, { status: 500 });
  }

  try {
    const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

    const res = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/user/assignable/search?project=DSMM&maxResults=150`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${jiraAuth}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Erro Jira: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const users = data
      .filter((u: any) => u.accountType === 'atlassian' && u.active)
      .map((u: any) => ({
        accountId: u.accountId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrls?.['24x24'] || null,
      }))
      .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
