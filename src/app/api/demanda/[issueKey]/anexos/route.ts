import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> }
) {
  try {
    const { issueKey } = await params;

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Jira não configuradas' }, { status: 500 });
    }

    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    
    // O Jira requer que enviemos como multipart/form-data com o nome "file"
    const newFormData = new FormData();
    for (const file of files) {
      if (file instanceof Blob) {
        newFormData.append('file', file, (file as File).name || 'anexo');
      }
    }

    const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'X-Atlassian-Token': 'no-check',
      },
      body: newFormData as any
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Erro Jira: ${res.status} ${text}` }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({ success: true, attachments: data });
  } catch (error: any) {
    console.error('Erro ao enviar anexo:', error);
    return NextResponse.json({ error: error.message || 'Falha ao enviar anexo' }, { status: 500 });
  }
}
