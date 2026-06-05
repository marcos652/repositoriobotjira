import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

function getJiraAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueKey, rankBeforeIssue, rankAfterIssue } = body;

    if (!issueKey) {
      return NextResponse.json({ error: 'issueKey é obrigatório' }, { status: 400 });
    }
    if (!rankBeforeIssue && !rankAfterIssue) {
      return NextResponse.json({ error: 'rankBeforeIssue ou rankAfterIssue é obrigatório' }, { status: 400 });
    }

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Jira não configuradas' }, { status: 500 });
    }

    const payload: any = { issues: [issueKey] };
    if (rankBeforeIssue) payload.rankBeforeIssue = rankBeforeIssue;
    else if (rankAfterIssue) payload.rankAfterIssue = rankAfterIssue;

    const res = await fetch(`${JIRA_BASE_URL}/rest/agile/1.0/issue/rank`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${getJiraAuth()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return NextResponse.json({ error: `Erro no Jira: ${res.status}`, details: err, success: false }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: 'Rank atualizado com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na operação', message: error?.message, success: false }, { status: 500 });
  }
}
