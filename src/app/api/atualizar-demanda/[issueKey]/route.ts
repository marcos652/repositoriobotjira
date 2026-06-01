import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> }
) {
  try {
    const { issueKey } = await params;

    if (!issueKey || !/^[A-Z]+-\d+$/.test(issueKey)) {
      return NextResponse.json(
        { error: 'Issue key inválida. Formato esperado: DSMM-123' },
        { status: 400 }
      );
    }

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json(
        { error: 'Credenciais Jira não configuradas no servidor' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Build Jira update payload
    const jiraPayload: any = { fields: {} };

    if (body.summary) jiraPayload.fields.summary = body.summary;
    if (body.description) {
      // If plain text, convert to ADF
      if (typeof body.description === 'string') {
        jiraPayload.fields.description = {
          type: 'doc',
          version: 1,
          content: body.description.split('\n').filter(Boolean).map((line: string) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: line }],
          })),
        };
      } else {
        jiraPayload.fields.description = body.description;
      }
    }
    if (body.priority) jiraPayload.fields.priority = { name: body.priority };
    if (body.assignee) jiraPayload.fields.assignee = { accountId: body.assignee };
    if (body.labels) jiraPayload.fields.labels = body.labels;
    if (body.cliente !== undefined) jiraPayload.fields.customfield_10062 = body.cliente || null;

    // Fetch directly from Jira REST API
    const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${jiraAuth}`,
        },
        body: JSON.stringify(jiraPayload),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      if (res.status === 404) {
        return NextResponse.json({ error: `Demanda ${issueKey} não encontrada no Jira`, success: false }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Erro Jira: ${res.status}`, details: errorText, success: false },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      issue_key: issueKey,
      message: `Demanda ${issueKey} atualizada com sucesso!`,
      url: `${JIRA_BASE_URL}/browse/${issueKey}`,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar demanda:', error);
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout ao atualizar demanda', success: false },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Falha ao atualizar demanda', message: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
}
