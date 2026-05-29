import { NextRequest, NextResponse } from 'next/server';
import { JIRABOT_CONFIG, fetchWithRetry, parseResponse } from '../../_config';

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

    const body = await request.json();

    const res = await fetchWithRetry(
      `${JIRABOT_CONFIG.BASE_URL}/api/atualizar-demanda/${issueKey}`,
      { method: 'PUT', body: JSON.stringify(body) }
    );

    const data = await parseResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.detail || data?.message || 'Erro ao atualizar demanda', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      issue_key: issueKey,
      message: `Demanda ${issueKey} atualizada com sucesso!`,
      url: `https://movingpay.atlassian.net/browse/${issueKey}`,
      raw: data,
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
