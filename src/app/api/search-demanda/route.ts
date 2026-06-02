import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ success: false, error: 'Termo de busca não fornecido' }, { status: 400 });
    }

    const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json({ success: false, error: 'Configuração do Jira incompleta' }, { status: 500 });
    }

    const authBuffer = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    
    // Build JQL to search in text, summary, description, comments
    // Note: 'text' field in JQL automatically searches summary, description, comments, etc.
    const projectFilter = JIRA_PROJECT_KEY ? `project = ${JIRA_PROJECT_KEY} AND ` : '';
    // We replace double quotes in query to avoid JQL injection breaking the string
    const safeQuery = query.replace(/"/g, '\\"');
    const jql = `${projectFilter}text ~ "${safeQuery}" ORDER BY updated DESC`;

    const url = `https://${JIRA_DOMAIN}/rest/api/2/search`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authBuffer}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jql,
        maxResults: 20,
        fields: ['summary', 'status', 'assignee', 'created', 'priority', 'customfield_10014'], // customfield_10014 is usually epic/client
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Jira API error on search:', errText);
      return NextResponse.json({ success: false, error: 'Erro ao buscar no Jira' }, { status: response.status });
    }

    const data = await response.json();
    
    const results = data.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary || '',
      status: issue.fields.status?.name || 'Desconhecido',
      statusCategory: issue.fields.status?.statusCategory?.colorName || 'default',
      assignee: issue.fields.assignee?.displayName || 'Não atribuído',
      assigneeAvatar: issue.fields.assignee?.avatarUrls?.['48x48'] || null,
      priority: issue.fields.priority?.name || 'Média',
      created: issue.fields.created,
    }));

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro no /api/search-demanda:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
