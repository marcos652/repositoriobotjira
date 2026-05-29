import { NextRequest, NextResponse } from 'next/server';
import { JIRABOT_CONFIG, fetchWithRetry, parseResponse } from '../../_config';

export async function GET(
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

    const res = await fetchWithRetry(
      `${JIRABOT_CONFIG.BASE_URL}/api/issue/${issueKey}`,
      { method: 'GET' }
    );

    const data = await parseResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.detail || data?.message || 'Demanda não encontrada', details: data },
        { status: res.status }
      );
    }

    // Extract fields from Jira response format
    const f = data?.fields || data;

    // Return normalized response
    return NextResponse.json({
      success: true,
      issue_key: data?.key || issueKey,
      summary: f?.summary || data?.summary || null,
      texto: f?.description || data?.texto || null,
      nome_cliente: f?.customfield_10062 || data?.nome_cliente || null,
      referencia: data?.referencia || null,
      urls_imagens: data?.urls_imagens || [],
      status: f?.status?.name || data?.status || null,
      issuetype: f?.issuetype?.name || data?.issuetype || null,
      priority: f?.priority?.name || data?.priority || null,
      assignee: f?.assignee?.displayName || data?.assignee || null,
      reporter: f?.reporter?.displayName || null,
      created: f?.created || data?.created || null,
      updated: f?.updated || data?.updated || null,
      labels: f?.labels || [],
      url: `https://movingpay.atlassian.net/browse/${data?.key || issueKey}`,
      raw: data,
    });
  } catch (error: any) {
    console.error('Erro ao consultar demanda:', error);
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout ao consultar demanda', success: false },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Falha ao consultar demanda', message: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
}
