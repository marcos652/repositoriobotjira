import { NextRequest, NextResponse } from 'next/server';
import { fetchDevSummary, fetchDevDetail, enrichWithConflictStatus, type DevCounts } from '@/lib/jira-dev-status';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

function getJiraAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'mention') return node.attrs?.text || '@user';
  let text = '';
  if (Array.isArray(node.content)) {
    text = node.content.map((child: any) => adfToText(child)).join('');
  }
  if (['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'rule'].includes(node.type)) text += '\n';
  if (node.type === 'listItem') text = '• ' + text;
  return text;
}

// ─── GET: Consultar demanda com tudo ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> }
) {
  try {
    const { issueKey } = await params;
    if (!issueKey || !/^[A-Z]+-\d+$/.test(issueKey)) {
      return NextResponse.json({ error: 'Issue key inválida. Formato esperado: DSMM-123' }, { status: 400 });
    }
    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Jira não configuradas' }, { status: 500 });
    }

    const jiraAuth = getJiraAuth();
    const headers = { 'Accept': 'application/json', 'Authorization': `Basic ${jiraAuth}` };

    // 1) Fetch issue (all useful fields)
    const issueRes = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}?fields=summary,description,status,issuetype,priority,assignee,reporter,created,updated,labels,comment,subtasks,issuelinks,attachment,customfield_10062,customfield_10015,customfield_10016,customfield_10020,customfield_10436,customfield_10333,customfield_10004,timetracking&expand=renderedFields,changelog`,
      { headers, signal: AbortSignal.timeout(15000) }
    );

    if (!issueRes.ok) {
      if (issueRes.status === 404) return NextResponse.json({ error: `Demanda ${issueKey} não encontrada`, success: false }, { status: 404 });
      return NextResponse.json({ error: `Erro Jira: ${issueRes.status}`, success: false }, { status: issueRes.status });
    }

    const data = await issueRes.json();
    const f = data.fields || {};

    // 2) Fetch transitions + dev info (branches, PRs, builds — mesmo painel "Desenvolvimento" do Jira).
    // O summary é buscado antes do detail porque ele diz qual applicationType está de fato
    // conectado (GitHub, Bitbucket, GitLab...) — chumbar "GitHub" faz a chamada voltar vazia
    // em silêncio quando o Jira usa outra ferramenta.
    const [transRes, devSummaryResult] = await Promise.all([
      fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`, { headers, signal: AbortSignal.timeout(8000) }).catch(() => null),
      data.id ? fetchDevSummary(JIRA_BASE_URL, headers, data.id) : null,
    ]);

    const { pullRequests: prsWithoutConflict, branches, builds } = devSummaryResult
      ? await fetchDevDetail(JIRA_BASE_URL, headers, data.id, devSummaryResult.prTypes, devSummaryResult.repoTypes, devSummaryResult.buildTypes)
      : { pullRequests: [], branches: [], builds: [] };
    const pullRequests = await enrichWithConflictStatus(prsWithoutConflict);
    const prInstanceTypes = devSummaryResult?.prTypes || [];
    const repoInstanceTypes = devSummaryResult?.repoTypes || [];
    const buildInstanceTypes = devSummaryResult?.buildTypes || [];
    const devSummary: DevCounts = devSummaryResult?.counts || { branches: 0, commits: 0, pullRequests: 0, builds: { count: 0, state: null } };

    // Parse description
    let descriptionText: string | null = null;
    if (f.description) {
      descriptionText = typeof f.description === 'string' ? f.description : adfToText(f.description).trim();
    }

    // Parse comments
    const renderedComments = data.renderedFields?.comment?.comments || [];
    const comments = (f.comment?.comments || []).map((c: any) => ({
      id: c.id,
      author: c.author?.displayName || 'Desconhecido',
      authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
      body: typeof c.body === 'string' ? c.body : adfToText(c.body).trim(),
      // HTML já renderizado pelo Jira (com imagens embutidas) — igual ao que o Jira mostra.
      bodyHtml: renderedComments.find((rc: any) => rc.id === c.id)?.body || null,
      created: c.created,
      updated: c.updated,
    }));

    // Parse subtasks
    const subtasks = (f.subtasks || []).map((s: any) => ({
      key: s.key,
      summary: s.fields?.summary || '',
      status: s.fields?.status?.name || '',
      issuetype: s.fields?.issuetype?.name || '',
    }));

    // Parse linked issues
    const linkedIssues = (f.issuelinks || []).map((link: any) => {
      const inward = link.inwardIssue;
      const outward = link.outwardIssue;
      const issue = inward || outward;
      return issue ? {
        key: issue.key,
        summary: issue.fields?.summary || '',
        status: issue.fields?.status?.name || '',
        type: inward ? link.type?.inward : link.type?.outward,
        direction: inward ? 'inward' : 'outward',
      } : null;
    }).filter(Boolean);

    // Parse attachments
    const attachments = (f.attachment || []).map((a: any) => ({
      id: a.id,
      filename: a.filename,
      size: a.size,
      mimeType: a.mimeType,
      url: a.content,
      thumbnail: a.thumbnail || null,
      author: a.author?.displayName || '',
      created: a.created,
    }));

    // Parse transitions
    let transitions: any[] = [];
    if (transRes && transRes.ok) {
      try {
        const tData = await transRes.json();
        transitions = (tData.transitions || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          to: t.to?.name || '',
        }));
      } catch {}
    }

    // Parse sprint
    let sprint: any = null;
    const sprintField = f.customfield_10020;
    if (Array.isArray(sprintField) && sprintField.length > 0) {
      const s = sprintField[sprintField.length - 1];
      sprint = { id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate };
    }

    // Parse changelog (activity)
    const changelog = (data.changelog?.histories || []).slice(-20).reverse().map((h: any) => ({
      author: h.author?.displayName || 'Sistema',
      authorAvatar: h.author?.avatarUrls?.['24x24'] || null,
      created: h.created,
      items: (h.items || []).map((item: any) => ({
        field: item.field,
        from: item.fromString || '',
        to: item.toString || '',
      })),
    }));

    // Time tracking
    const timeTracking = f.timetracking ? {
      originalEstimate: f.timetracking.originalEstimate || null,
      remainingEstimate: f.timetracking.remainingEstimate || null,
      timeSpent: f.timetracking.timeSpent || null,
    } : null;

    // Get rendered HTML from Jira
    const rendered = data.renderedFields || {};

    return NextResponse.json({
      success: true,
      issue_key: data.key || issueKey,
      summary: f.summary || null,
      texto: descriptionText || null,
      textoHtml: rendered.description || null,
      nome_cliente: f.customfield_10062 ? (typeof f.customfield_10062 === 'string' ? f.customfield_10062 : adfToText(f.customfield_10062).trim()) : null,
      status: f.status?.name || null,
      statusCategory: f.status?.statusCategory?.key || null,
      issuetype: f.issuetype?.name || null,
      priority: f.priority?.name || null,
      assignee: f.assignee?.displayName || null,
      assigneeId: f.assignee?.accountId || null,
      reporter: f.reporter?.displayName || null,
      created: f.created || null,
      updated: f.updated || null,
      labels: f.labels || [],
      produto: f.customfield_10436 ? f.customfield_10436.map((p: any) => ({ id: p.id, value: p.value })) : [],
      saude: f.customfield_10333 ? { id: f.customfield_10333.id, value: f.customfield_10333.value } : null,
      impacto: f.customfield_10004 ? { id: f.customfield_10004.id, value: f.customfield_10004.value } : null,
      dataInicio: f.customfield_10015 || null,
      comments,
      subtasks,
      linkedIssues,
      attachments,
      transitions,
      sprint,
      pullRequests,
      branches,
      builds,
      devSummary,
      // Quais applicationType o Jira reportou como conectados (debug — ajuda a diagnosticar
      // se um PR existir no Jira mas não aparecer aqui: se vier vazio, o próprio Jira não
      // está retornando nada no /summary para essa issue).
      devInstanceTypes: { pr: prInstanceTypes, repo: repoInstanceTypes, build: buildInstanceTypes },
      changelog,
      timeTracking,
      url: `${JIRA_BASE_URL}/browse/${data.key || issueKey}`,
    });
  } catch (error: any) {
    console.error('Erro ao consultar demanda:', error);
    return NextResponse.json({ error: 'Falha ao consultar demanda', message: error?.message, success: false }, { status: 500 });
  }
}

// ─── POST: Adicionar comentário ───
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> }
) {
  try {
    const { issueKey } = await params;
    const body = await request.json();
    const { action, comment, images, transitionId } = body;

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
    }

    const jiraAuth = getJiraAuth();
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${jiraAuth}` };

    // Add comment
    if (action === 'comment' && (comment || (images && images.length > 0))) {
      // API v2 aceita wiki markup em uma string simples (mesmo esquema já usado na description
      // da issue) — isso permite referenciar imagens já anexadas via "!nome_do_arquivo.ext!".
      // As imagens precisam já existir como anexo na issue ANTES deste POST (o Jira só resolve
      // o marcador para um anexo que já existe no momento em que converte o texto para ADF).
      let commentBody = comment ? String(comment) : '';
      if (images && Array.isArray(images) && images.length > 0) {
        const markers = images.filter(Boolean).map((filename: string) => `!${filename}!`).join('\n');
        commentBody = commentBody ? `${commentBody}\n${markers}` : markers;
      }

      const res = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment`, {
        method: 'POST', headers,
        body: JSON.stringify({ body: commentBody }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        return NextResponse.json({ error: `Erro ao comentar: ${res.status}`, details: err, success: false }, { status: res.status });
      }

      return NextResponse.json({ success: true, message: 'Comentário adicionado!' });
    }

    // Transition (change status)
    if (action === 'transition' && transitionId) {
      const payload: any = { transition: { id: transitionId } };

      // Muitos fluxos de trabalho do Jira exigem uma "Resolução" ao fechar a demanda.
      // Se for uma transição comum de fechamento (ex: 2 = Closed), tentamos enviar.
      // IDs comuns de "Concluído" no Jira: 2, 31, 41
      if (['2', '31', '41'].includes(String(transitionId))) {
        payload.fields = {
          resolution: { name: 'Concluído' } // Nome comum em PT-BR para resolução
        };
      }

      const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST', headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errStr = `Erro ao mudar status: ${res.status}`;
        try {
          const errObj = await res.json();
          if (errObj.errorMessages && errObj.errorMessages.length > 0) {
            errStr = errObj.errorMessages.join(', ');
          } else if (errObj.errors) {
            errStr = Object.values(errObj.errors).join(', ');
          }
        } catch {
          const text = await res.text().catch(() => '');
          if (text) errStr += ` - ${text}`;
        }
        
        // Se a transição falhar porque o nome da resolução está errado, tentamos sem resolução ou com 'Done'
        if (errStr.includes("Resolução") || errStr.includes("Resolution")) {
           return NextResponse.json({ error: "O Jira exige um campo de Resolução válido. Verifique as configurações do Workflow.", success: false }, { status: res.status });
        }

        return NextResponse.json({ error: errStr, success: false }, { status: res.status });
      }

      return NextResponse.json({ success: true, message: 'Status atualizado!' });
    }

    return NextResponse.json({ error: 'Ação inválida', success: false }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na operação', message: error?.message, success: false }, { status: 500 });
  }
}

// ─── DELETE: Excluir demanda ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> }
) {
  try {
    const { issueKey } = await params;
    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
    }

    const jiraAuth = getJiraAuth();
    const headers = { 'Authorization': `Basic ${jiraAuth}` };

    const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      let errStr = `Erro ao excluir: ${res.status}`;
      try {
        const errObj = await res.json();
        if (errObj.errorMessages && errObj.errorMessages.length > 0) {
          errStr = errObj.errorMessages.join(', ');
        }
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errStr += ` - ${text}`;
      }
      return NextResponse.json({ error: errStr, success: false }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: 'Demanda excluída com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na exclusão', message: error?.message, success: false }, { status: 500 });
  }
}
