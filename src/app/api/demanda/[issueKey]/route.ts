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
      `${JIRABOT_CONFIG.BASE_URL}/api/demanda/${issueKey}`,
      { method: 'GET' }
    );

    const data = await parseResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.detail || data?.message || 'Demanda não encontrada', details: data },
        { status: res.status }
      );
    }

    // Return normalized response
    return NextResponse.json({
      success: true,
      issue_key: issueKey,
      summary: data?.summary || null,
      texto: data?.texto || null,
      nome_cliente: data?.nome_cliente || null,
      referencia: data?.referencia || null,
      urls_imagens: data?.urls_imagens || [],
      status: data?.status || null,
      issuetype: data?.issuetype || data?.issue_type || null,
      priority: data?.priority || null,
      assignee: data?.assignee || null,
      created: data?.created || null,
      updated: data?.updated || null,
      url: `https://movingpay.atlassian.net/browse/${issueKey}`,
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
