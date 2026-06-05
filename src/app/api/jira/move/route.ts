import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

function getJiraAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueKey, targetStatusCategory } = body;

    if (!issueKey || !targetStatusCategory) {
      return NextResponse.json({ error: 'issueKey e targetStatusCategory são obrigatórios' }, { status: 400 });
    }

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Jira não configuradas' }, { status: 500 });
    }

    const authHeader = `Basic ${getJiraAuth()}`;
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': authHeader };

    // 1. Obter transições disponíveis para a issue
    const getRes = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`, { headers });
    if (!getRes.ok) {
      const err = await getRes.text().catch(() => '');
      return NextResponse.json({ error: `Erro ao buscar transições no Jira: ${getRes.status}`, details: err, success: false }, { status: getRes.status });
    }

    const data = await getRes.json();
    const transitions = data.transitions || [];

    // 2. Procurar a transição que leve a um status cujo nome da categoria do status corresponda ou o nome do status corresponda
    // Como a configuração do Kanban usa "targetStatusCategory" (ex: "Backlog", "To Do", "In Progress", etc),
    // vamos tentar mapear a transição que leva ao status final correto.
    
    // Mapping simples baseado nos nomes usados na tela de Kanban
    const matchMap: Record<string, string[]> = {
      'Backlog': ['Backlog', 'Open'],
      'To Do': ['Para Fazer', 'To Do', 'A Fazer', 'Selected for Development'],
      'In Progress': ['Em Andamento', 'In Progress', 'Em andamento'],
      'Refinamento': ['Refinamento', 'Refinement'],
      'Code Review': ['Code Review', 'Revisão', 'Review'],
      'QA': ['QA', 'Teste', 'Testing'],
      'Done': ['Concluído', 'Done', 'Closed', 'Resolved', 'Concluido'],
    };

    const acceptedStatuses = matchMap[targetStatusCategory] || [targetStatusCategory];

    // Find first transition where the target status matches one of our accepted statuses (case-insensitive)
    const targetTransition = transitions.find((t: any) => {
      const toName = t.to.name.toLowerCase();
      return acceptedStatuses.some(statusName => toName === statusName.toLowerCase());
    });

    if (!targetTransition) {
      return NextResponse.json({ 
        error: `Nenhuma transição disponível para a coluna '${targetStatusCategory}'`, 
        available: transitions.map((t: any) => t.to.name),
        success: false 
      }, { status: 400 });
    }

    // 3. Executar a transição
    const transitionRes = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transition: { id: targetTransition.id } })
    });

    if (!transitionRes.ok) {
      const err = await transitionRes.text().catch(() => '');
      return NextResponse.json({ error: `Erro ao transicionar: ${transitionRes.status}`, details: err, success: false }, { status: transitionRes.status });
    }

    return NextResponse.json({ success: true, message: `Issue movida para ${targetTransition.to.name} com sucesso` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na operação', message: error?.message, success: false }, { status: 500 });
  }
}
