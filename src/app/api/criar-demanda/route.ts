import { NextRequest, NextResponse } from 'next/server';

// Aumenta o timeout para 60s no plano Pro da Vercel (padrão Hobby é 10s)
export const maxDuration = 60;
import { GoogleGenAI } from '@google/genai';
import { CLIENTS } from '@/lib/clients';

// ─── Environment ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C09SDGH8EBT';
const JIRA_ASSIGNEE_ID = process.env.JIRA_ASSIGNEE_ID || '712020:e1b18321-5808-4927-be15-24f3756422ab';
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';

function getJiraAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

const CLIENTS_MAPPING = CLIENTS.map(c => `${c.name}: ${c.id}`).join(', ') + ', GERAL MOVINGPAY: N/A, HOLDING: N/A';

const REFINAMENTO_TRANSITION_ID = '13';

// ─── Gemini ───
async function generateIssueData(texto: string, referencia: string, nomeCliente?: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `Você é um Analista de Qualidade e Produto (QA/PM) especialista em Jira. Seu objetivo é RECEBER um relato muitas vezes informal ou mal estruturado e REESTRUTURÁ-LO completamente em uma demanda técnica profissional, SEGUINDO RIGOROSAMENTE as regras da empresa.

Texto Original do Solicitante: "${texto}"
Referência da Origem: ${referencia}
Cliente Fornecido: ${nomeCliente || 'Extrair do texto'}
Lista de clientes disponíveis: ${CLIENTS_MAPPING}

REGRAS DE CLASSIFICAÇÃO:
Você deve classificar a demanda em um dos 4 tipos abaixo e preencher o JSON com os respectivos 'issuetype' e 'story_type':
1. BUG: Erro, falha ou comportamento incorreto. (issuetype: "Bug", story_type: nulo)
2. FEATURE: Nova funcionalidade ou alteração explícita (ex: mudança de texto, botão, ajuste visual). (issuetype: "Story", story_type: "FEATURE")
3. MELHORIA: O comportamento atual funciona, mas há oportunidade de melhorar usabilidade/experiência. (issuetype: "Story", story_type: "MELHORIA")
4. TASK: Atividade técnica, tarefa operacional ou investigativa sem regra de negócio. (issuetype: "Task", story_type: nulo)

REGRAS DE ESTRUTURAÇÃO:
NÃO COPIE E COLE o texto original. Reescreva de forma profissional e extraia as informações para preencher o objeto "sections" no JSON. Se uma seção não tiver informação, preencha com "Não informado no relato original".
- "contexto": Contexto geral.
- "descricao_ou_problema": A descrição (para Task/Feature), o Comportamento Atual (para Melhoria) ou o Problema (para Bug).
- "comportamento_esperado_ou_aceite": Critérios de Aceite (para Feature) ou Comportamento Esperado (para Melhoria). (Vazio para Task/Bug).
- "passos_reproduzir": Passos passo a passo (apenas para Bug).
- "evidencias": Onde colocar as marcações de imagens (ex: !imagem.png!) se for Bug.
- "observacoes": Qualquer outra informação, notas ou marcações de imagens (ex: !imagem.png!) se não for Bug.

ESTRUTURA JSON EXIGIDA:
Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "client_name", "client_id", "issuetype", "story_type", "resumo_slack" e "sections".
O "sections" deve ser um objeto com as chaves descritas acima.
O campo "summary" DEVE começar com o nome do cliente seguido de um hífen (ex: Nome do Cliente - Título curto e técnico). NÃO use colchetes.
O campo "resumo_slack" deve conter de 1 a 2 linhas explicando resumidamente a demanda.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  let text = response.text?.trim() || '';
  
  // Remove markdown code fences if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    text = jsonMatch[1].trim();
  } else {
    // Remove leading/trailing ``` in case they're not matched
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const data = JSON.parse(text);
    
    // Constrói a descrição Jira Wiki Markup usando {panel} com as cores oficiais do Jira
    let finalDescription = '';
    const addPanel = (title: string, content: string, type: 'info' | 'tip' | 'warning' | 'note' | 'panel' = 'info') => {
      if (content && content.trim() !== '') {
        let colors = '';
        if (type === 'info') colors = '|bgColor=#DEEBFF|titleBGColor=#DEEBFF';
        else if (type === 'tip') colors = '|bgColor=#E3FCEF|titleBGColor=#E3FCEF';
        else if (type === 'warning') colors = '|bgColor=#FFEBE6|titleBGColor=#FFEBE6';
        else if (type === 'note') colors = '|bgColor=#EAE6FF|titleBGColor=#EAE6FF';
        
        finalDescription += `{panel:title=${title}${colors}}\n${content.trim()}\n{panel}\n\n`;
      }
    };

    const s = data.sections || {};
    
    if (data.issuetype === 'Bug') {
      addPanel('Contexto', s.contexto, 'info');
      addPanel('Problema', s.descricao_ou_problema, 'warning');
      addPanel('Como replicar', s.passos_reproduzir, 'info');
      addPanel('Evidências', s.evidencias, 'info');
      addPanel('Observações', s.observacoes, 'note');
    } else if (data.story_type === 'FEATURE') {
      addPanel('Contexto', s.contexto, 'info');
      addPanel('Problema', s.descricao_ou_problema, 'warning');
      addPanel('Critérios de aceite', s.comportamento_esperado_ou_aceite, 'tip');
      addPanel('Observações', s.observacoes, 'note');
    } else if (data.story_type === 'MELHORIA') {
      addPanel('Contexto', s.contexto, 'info');
      addPanel('Problema', s.descricao_ou_problema, 'warning');
      addPanel('Comportamento esperado', s.comportamento_esperado_ou_aceite, 'tip');
      addPanel('Observações', s.observacoes, 'note');
    } else {
      addPanel('Contexto', s.contexto, 'info');
      addPanel('Problema', s.descricao_ou_problema, 'warning');
      addPanel('Observações', s.observacoes, 'note');
    }

    data.description = finalDescription.trim();
    return data;
  } catch (e: any) {
    console.error('[Gemini] Failed to parse JSON. Raw output:', text.slice(0, 500));
    throw new Error(`Gemini retornou JSON inválido: ${e.message}`);
  }
}

// ─── Jira ───
async function createJiraIssue(issueData: any) {
  const jiraAuth = getJiraAuth();
  const jiraHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${jiraAuth}`,
  };

  const now = new Date();
  const fields: any = {
    project: { key: 'DSMM' },
    summary: issueData.summary,
    description: issueData.description,
    issuetype: { name: issueData.issuetype || 'Task' },
    assignee: { id: JIRA_ASSIGNEE_ID },
    customfield_10015: now.toISOString().split('T')[0], // Start Date
    customfield_10004: { id: '10001' }, // Impacto
    customfield_10333: { id: '10119' }, // Saude
  };

  if (issueData.client_id && issueData.client_id !== 'N/A' && !isNaN(Number(issueData.client_id))) {
    fields.customfield_10469 = [{ id: String(issueData.client_id) }];
  }
  if (issueData.issuetype === 'Story' && issueData.story_type) {
    fields.customfield_10402 = { id: issueData.story_type?.toUpperCase() === 'FEATURE' ? '10189' : '10190' };
  }

  // 1. Create issue using v2 API to support Wiki Markup directly
  const createRes = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue`, {
    method: 'POST',
    headers: jiraHeaders,
    body: JSON.stringify({ fields }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    throw new Error(`Jira create failed (${createRes.status}): ${errText}`);
  }

  const createData = await createRes.json();
  const issueKey = createData.key;
  const issueUrl = `${JIRA_BASE_URL}/browse/${issueKey}`;

  // O Jira cria a demanda de forma síncrona, não precisamos esperar.

  return { issueKey, issueUrl };
}

// ─── Slack ───
async function notifySlack(issueKey: string, issueUrl: string, clientName: string, resumo: string) {
  if (!SLACK_TOKEN) return;
  const now = new Date();
  const nowStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
  const msg = `<${issueUrl}|${issueKey}> CRIADO REFERENTE AO CLIENTE ${clientName.toUpperCase()} ${nowStr}\n_${resumo}_`;

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: msg }),
  }).catch(() => {}); // non-critical
}

// ─── Attachments ───
async function uploadAttachments(issueKey: string, arquivos: {url: string, filename?: string}[]) {
  if (!arquivos || arquivos.length === 0) return;
  const jiraAuth = getJiraAuth();

  for (const [index, arq] of arquivos.entries()) {
    try {
      const dataUrl = arq.url;
      const originalFilename = arq.filename;
      
      if (dataUrl.startsWith('data:')) {
        // Trata data URL (base64) gerado pelo /api/upload-image
        const matches = dataUrl.match(/^data:([a-zA-Z0-9/+-.]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          let ext = mimeType.split('/')[1] || 'bin';
          if (ext.includes('document')) ext = 'docx';
          if (ext.includes('sheet')) ext = 'xlsx';
          
          const filename = originalFilename || `anexo_${index + 1}.${ext.replace('+', '').replace('-', '')}`;
          const fileObj = new File([buffer], filename, { type: mimeType });
          
          const formData = new FormData();
          formData.append('file', fileObj);

          await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'X-Atlassian-Token': 'no-check'
            },
            body: formData as any
          });
        }
      } else if (dataUrl.startsWith('http')) {
        // Trata URL normal de imagem (digitada manualmente)
        const res = await fetch(dataUrl);
        if (res.ok) {
          const blob = await res.blob();
          const filename = originalFilename || new URL(dataUrl).pathname.split('/').pop() || `anexo_${index + 1}`;
          const fileObj = new File([blob], filename, { type: blob.type });
          
          const formData = new FormData();
          formData.append('file', fileObj);

          await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'X-Atlassian-Token': 'no-check'
            },
            body: formData as any
          });
        }
      }
    } catch (err) {
      console.error('Falha ao enviar anexo para o Jira:', err);
    }
  }
}

// ─── Route ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, nome_cliente, referencia = 'CONSOLE', urls_imagens = [], arquivos = [], previewOnly, issueDataPreGerado } = body;

    if (!GEMINI_API_KEY || !JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Servidor mal configurado — variáveis de ambiente faltando', success: false }, { status: 500 });
    }

    let issueData = issueDataPreGerado;

    // Step 1: Gemini generates issue data if not provided
    if (!issueData) {
      if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
        return NextResponse.json({ error: 'Texto da demanda é obrigatório', success: false }, { status: 400 });
      }
      issueData = await generateIssueData(texto.trim(), referencia, nome_cliente);
      if (!issueData || !issueData.summary) {
        return NextResponse.json({ error: 'Falha na geração dos dados via Gemini', success: false }, { status: 500 });
      }
    }

    // Se for apenas preview, retorna os dados gerados pela IA sem criar no Jira
    if (previewOnly) {
      return NextResponse.json({ success: true, issueData });
    }

    // Step 2: Create Jira issue
    const { issueKey, issueUrl } = await createJiraIssue(issueData);

    // Step 3: Upload Attachments (se houver)
    // Se "arquivos" estiver presente (novo formato), use-os. Senão, mapeie as urls_imagens (legacy)
    const arquivosParaEnviar = arquivos.length > 0 
      ? arquivos 
      : (urls_imagens && urls_imagens.length > 0 ? urls_imagens.map((u: string) => ({ url: u })) : []);

    if (arquivosParaEnviar.length > 0) {
      await uploadAttachments(issueKey, arquivosParaEnviar);
    }

    // Step 4: Notify Slack (fire and forget)
    const clientFinal = nome_cliente || issueData.client_name || 'NÃO IDENTIFICADO';
    notifySlack(issueKey, issueUrl, clientFinal, issueData.resumo_slack || '');

    return NextResponse.json({
      success: true,
      issue_key: issueKey,
      url: issueUrl,
      summary: issueData.summary,
      issuetype: issueData.issuetype || 'Task',
      client_name: issueData.client_name,
      message: `Demanda ${issueKey} criada com sucesso!`,
    });
  } catch (error: any) {
    console.error('Erro ao criar demanda:', error);
    return NextResponse.json(
      { error: 'Falha ao criar demanda', message: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
}
