// BACKUP — Rota antiga que passa pela API Bot
// Para reverter, copie este conteúdo para src/app/api/criar-demanda/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { JIRABOT_CONFIG, findIssueKey, fetchWithRetry, parseResponse } from '../_config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetchWithRetry(
      `${JIRABOT_CONFIG.BASE_URL}/api/criar-demanda`,
      { method: 'POST', body: JSON.stringify(body) }
    );

    const data = await parseResponse(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.detail || data?.message || 'Erro retornado pela API', details: data },
        { status: res.status }
      );
    }

    const issueKey = findIssueKey(data);

    const normalized = {
      success: true,
      issue_key: issueKey || null,
      summary: data?.summary || data?.raw?.summary || data?.result?.summary || null,
      issuetype: data?.issuetype || data?.issue_type || data?.raw?.issuetype || null,
      url: data?.url || (issueKey ? `https://movingpay.atlassian.net/browse/${issueKey}` : null),
      message: issueKey
        ? `Demanda ${issueKey} criada com sucesso!`
        : 'Demanda criada, mas não foi possível identificar o número.',
      raw: data,
    };

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error('Erro ao criar demanda:', error);
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout: a API demorou mais de 30s para responder', success: false },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Falha ao processar requisição', message: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
}
