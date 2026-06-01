import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

const CLIENTS_MAPPING = `[001] EUROPAG: 10231, [006] CLOUDWALK: 10232, [007] PAYGO: 10233, [008] HYPERLOCAL: 10234, [011] YUPI: 10235, [013] PAGOLIVRE: 10236, [022] CDX: 10237, [027] AKIREDE: 10238, [030] TRADEUP: 10239, [031] FACILPAY: 10240, [040] IFOOD: 10241, [044] VILEVEPAY: 10242, [056] PLUS DELIVERY: 10243, [063] KEYPAY: 10244, [066] ORUSPAY: 10245, [067] PARCELECART: 10246, [076] CODEPAY: 10247, [077] EAGLE: 10248, [082] VALOREM: 10249, [086] PERFECTPAY: 10250, [101] PRONTOPAGUEI: 10251, [103] ALLBANKINVEST: 10252, [108] SIMPAY: 10253, [113] MP: 10254, [127] MUITOBANK: 10255, [128] MAISTODOS: 10256, [135] CEOPAG: 10257, [136] PAYPRIME: 10258, [138] PARCELENAHORA: 10259, [143] KIRVANO: 10260, [147] GREGPAY: 10261, [149] DELTAPAG: 10262, [152] PARCELAMOS: 10263, [154] SKYBANK: 10264, [156] COMPROPAY: 10265, [158] OCTUSPAY: 10266, [160] NEXTIONPAY: 10267, [162] ARKAMAY: 10268, [165] DOK: 10269, [168] ATLANTICPAY: 10270, [170] 2M: 10271, [172] INGRESSE: 10272, [174] TICKETANDGO: 10273, [176] ASSINY: 10274, [178] PAYUP: 10275, [180] RP3BANK: 10276, [182] MACREBANK: 10277, [184] TICTO: 10278, [186] BLOKKO: 10279, [187] CAKTOPAY: 10280, [189] AMERICAPAY: 10281, [191] FUNDOPAY: 10282, [193] ABEXPAY: 10283, [195] CARTOS: 10284, [196] HOLYCASH: 10285, [200] AMI: 10286, [203] CASADOCREDITO: 10287, [205] CREDITT: 10288, [207] TBKBANKS: 10289, [209] FASTPAY: 10290, [211] MUTUALBANK: 10291, [213] 4ONBRASIL: 10292, [217] AQUISIPAY: 10293, [221] CRONOS: 10294, [223] PIXPAY: 10295, [225] MAUPI: 10296, [227] HYPERCASHPAY: 10297, [229] SOLPAG: 10298, [231] LASTLINK: 10299, [233] BARATAO: 10300, [235] LERA: 10301, [237] EQUIS: 10302, [239] 8B: 10303, [241] MUSE: 10304, [243] MAGAZORD: 10305, GERAL MOVINGPAY: N/A, HOLDING: N/A`;

const REFINAMENTO_TRANSITION_ID = '13';

// ─── Gemini ───
async function generateIssueData(texto: string, referencia: string, nomeCliente?: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `Você é um assistente técnico especialista em Jira.
Conteúdo da Demanda: "${texto}"
Referência: ${referencia}
Cliente Fornecido: ${nomeCliente || 'Extrair do texto'}
Lista de clientes: ${CLIENTS_MAPPING}

Regras:
- NÃO INVENTE INFORMAÇÕES. Seja DIRETO e OBJETIVO.
- Classifique: "Bug", "Story" ou "Task".

ESTRUTURA JSON EXIGIDA PARA CADA SEÇÃO DO ADF v1 (USE PAINÉIS):
{ "type": "panel", "attrs": { "panelType": "info" }, "content": [ { "type": "heading", "attrs": { "level": 3 }, "content": [ { "type": "text", "text": "Título da Seção" } ] }, { "type": "paragraph", "content": [ { "type": "text", "text": "Conteúdo..." } ] } ] }

Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "description" (ADF), "client_name", "client_id", "issuetype", "story_type" e "resumo_slack".
O campo "summary" DEVE começar com o nome do cliente entre colchetes (ex: [Nome do Cliente] Título).
O campo "resumo_slack" deve conter de 1 a 2 linhas explicando de forma muito resumida sobre o que se trata a demanda.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  let text = response.text?.trim() || '';
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);

  return JSON.parse(text.trim());
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
    issuetype: { name: issueData.issuetype || 'Task' },
    assignee: { id: JIRA_ASSIGNEE_ID },
    customfield_10015: now.toISOString().split('T')[0], // Start Date
    customfield_10004: { id: '10001' }, // Impacto
    customfield_10333: { id: '10119' }, // Saude
  };

  if (issueData.client_id) {
    fields.customfield_10469 = [{ id: String(issueData.client_id) }];
  }
  if (issueData.issuetype === 'Story' && issueData.story_type) {
    fields.customfield_10402 = { id: issueData.story_type?.toUpperCase() === 'FEATURE' ? '10189' : '10190' };
  }

  // 1. Create issue
  const createRes = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
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

  // 2. Wait 4s then PUT description (same pattern as API Bot)
  await new Promise(r => setTimeout(r, 4000));

  await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: jiraHeaders,
    body: JSON.stringify({ fields: { description: issueData.description } }),
  });

  // 3. Transition to Refinamento
  await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    headers: jiraHeaders,
    body: JSON.stringify({ transition: { id: REFINAMENTO_TRANSITION_ID } }),
  }).catch(() => {}); // non-critical

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

// ─── Route ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, nome_cliente, referencia = 'Painel Externo', urls_imagens = [] } = body;

    if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
      return NextResponse.json({ error: 'Texto da demanda é obrigatório', success: false }, { status: 400 });
    }

    if (!GEMINI_API_KEY || !JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Servidor mal configurado — variáveis de ambiente faltando', success: false }, { status: 500 });
    }

    // Step 1: Gemini generates issue data
    const issueData = await generateIssueData(texto.trim(), referencia, nome_cliente);
    if (!issueData || !issueData.summary) {
      return NextResponse.json({ error: 'Falha na geração dos dados via Gemini', success: false }, { status: 500 });
    }

    // Step 2: Create Jira issue
    const { issueKey, issueUrl } = await createJiraIssue(issueData);

    // Step 3: Notify Slack (fire and forget)
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
