import { NextRequest, NextResponse } from 'next/server';

// Aumenta o timeout para 60s no plano Pro da Vercel (padrão Hobby é 10s)
export const maxDuration = 60;
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

  const prompt = `Você é um Analista de Qualidade e Produto (QA/PM) especialista em Jira. Seu objetivo é RECEBER um relato muitas vezes informal ou mal estruturado e REESTRUTURÁ-LO completamente em uma demanda técnica profissional.

Texto Original do Solicitante: "${texto}"
Referência da Origem: ${referencia}
Cliente Fornecido: ${nomeCliente || 'Extrair do texto'}
Lista de clientes disponíveis: ${CLIENTS_MAPPING}

REGRAS DE REESTRUTURAÇÃO DA DESCRIÇÃO (OBRIGATÓRIO):
1. NÃO COPIE E COLE o texto original. Você DEVE analisar a dor relatada e reescrever o texto de forma profissional, técnica e organizada.
2. O campo "description" DEVE obrigatoriamente ser estruturado com os seguintes tópicos (usando formatação Jira Wiki Markup):
   h3. Contexto / Cenário
   h3. Problema Relatado (ou Objetivo se for Story/Task)
   h3. Passos para Reproduzir (se for Bug, liste passo a passo)
   h3. Comportamento Esperado vs Atual (se for Bug)
   h3. Informações Adicionais
3. NÃO INVENTE dados que não foram fornecidos no texto. Se faltar algo para os tópicos acima, coloque "Não informado no relato original".
4. Classifique o issuetype corretamente: "Bug", "Story" ou "Task".

ESTRUTURA JSON EXIGIDA:
Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "description", "client_name", "client_id", "issuetype", "story_type" e "resumo_slack".
O campo "summary" DEVE começar com o nome do cliente entre colchetes (ex: [Nome do Cliente] Título curto e técnico).
O campo "resumo_slack" deve conter de 1 a 2 linhas explicando de forma muito resumida sobre o que se trata a demanda.

IMPORTANTE SOBRE A SINTAXE DA DESCRIÇÃO:
- O campo "description" deve ser OBRIGATORIAMENTE em Jira Wiki Markup (sintaxe do Jira: h3., *negrito*, {panel:title=...}, - bullet points).
- NÃO USE Markdown padrão (como # para títulos ou ** para negrito).
- SE houver marcações de anexos no texto original (ex: [Anexo: imagem.png] ou links de imagens), insira EXATAMENTE a sintaxe !imagem.png! (ou !nome_do_arquivo!) na seção "Informações Adicionais" ou "Passos para Reproduzir" para que a imagem apareça embutida no Jira.`;

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
    return JSON.parse(text);
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
    const { texto, nome_cliente, referencia = 'Painel Externo', urls_imagens = [], arquivos = [] } = body;

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
