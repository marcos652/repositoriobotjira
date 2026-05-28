import { NextRequest, NextResponse } from 'next/server';

// ============================================
// API Route: /api/criar-demanda
// Bot integrado — Gemini AI + Jira + Slack
// Convertido de Python FastAPI para Next.js
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN || process.env.JIRA_API_TOKEN;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C09SDGH8EBT';
const JIRA_ASSIGNEE_ID = process.env.JIRA_ASSIGNEE_ID || '712020:e1b18321-5808-4927-be15-24f3756422ab';

const JIRA_BASE = 'https://movingpay.atlassian.net';
const REFINAMENTO_TRANSITION_ID = '13';

function getJiraAuth(): string {
  if (!JIRA_EMAIL || !JIRA_TOKEN) return '';
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

const jiraHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Basic ${getJiraAuth()}`,
};

// --- Processar imagens (base64 ou URL) ---
interface DownloadedFile {
  name: string;
  content: Buffer;
  mimetype: string;
}

async function processImages(urls: string[]): Promise<DownloadedFile[]> {
  const downloaded: DownloadedFile[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const url = urls[i];
      if (url.startsWith('data:')) {
        const [header, base64Data] = url.split(',', 2);
        const mimetype = header.split(':')[1]?.split(';')[0] || 'image/png';
        const content = Buffer.from(base64Data, 'base64');
        const ext = mimetype.split('/')[1] || 'png';
        downloaded.push({ name: `imagem_${Date.now()}_${i}.${ext}`, content, mimetype });
      } else if (url.startsWith('http')) {
        const res = await fetch(url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          let nome = url.split('/').pop() || `imagem_${Date.now()}_${i}.png`;
          if (nome.length > 100 || !nome.includes('.')) nome = `imagem_${Date.now()}_${i}.png`;
          downloaded.push({ name: nome, content: buffer, mimetype: res.headers.get('content-type') || 'image/png' });
        }
      }
    } catch (e) {
      console.error('Erro ao processar imagem:', e);
    }
  }
  return downloaded;
}

// --- Gerar dados da issue via Gemini ---
const CLIENTS_MAPPING = `[001] EUROPAG: 10231, [006] CLOUDWALK: 10232, [007] PAYGO: 10233, [008] HYPERLOCAL: 10234, [011] YUPI: 10235, [013] PAGOLIVRE: 10236, [022] CDX: 10237, [027] AKIREDE: 10238, [030] TRADEUP: 10239, [031] FACILPAY: 10240, [040] IFOOD: 10241, [044] VILEVEPAY: 10242, [056] PLUS DELIVERY: 10243, [063] KEYPAY: 10244, [066] ORUSPAY: 10245, [067] PARCELECART: 10246, [076] CODEPAY: 10247, [077] EAGLE: 10248, [082] VALOREM: 10249, [086] PERFECTPAY: 10250, [101] PRONTOPAGUEI: 10251, [103] ALLBANKINVEST: 10252, [108] SIMPAY: 10253, [113] MP: 10254, [127] MUITOBANK: 10255, [128] MAISTODOS: 10256, [135] CEOPAG: 10257, [136] PAYPRIME: 10258, [138] PARCELENAHORA: 10259, [143] KIRVANO: 10260, [147] GREGPAY: 10261, [149] DELTAPAG: 10262, [152] PARCELAMOS: 10263, [154] SKYBANK: 10264, [156] COMPROPAY: 10265, [158] OCTUSPAY: 10266, [160] NEXTIONPAY: 10267, [162] ARKAMAY: 10268, [165] DOK: 10269, [168] ATLANTICPAY: 10270, [170] 2M: 10271, [172] INGRESSE: 10272, [174] TICKETANDGO: 10273, [176] ASSINY: 10274, [178] PAYUP: 10275, [180] RP3BANK: 10276, [182] MACREBANK: 10277, [184] TICTO: 10278, [186] BLOKKO: 10279, [187] CAKTOPAY: 10280, [189] AMERICAPAY: 10281, [191] FUNDOPAY: 10282, [193] ABEXPAY: 10283, [195] CARTOS: 10284, [196] HOLYCASH: 10285, [200] AMI: 10286, [203] CASADOCREDITO: 10287, [205] CREDITT: 10288, [207] TBKBANKS: 10289, [209] FASTPAY: 10290, [211] MUTUALBANK: 10291, [213] 4ONBRASIL: 10292, [217] AQUISIPAY: 10293, [221] CRONOS: 10294, [223] PIXPAY: 10295, [225] MAUPI: 10296, [227] HYPERCASHPAY: 10297, [229] SOLPAG: 10298, [231] LASTLINK: 10299, [233] BARATAO: 10300, [235] LERA: 10301, [237] EQUIS: 10302, [239] 8B: 10303, [241] MUSE: 10304, [243] MAGAZORD: 10305, GERAL MOVINGPAY: N/A, HOLDING: N/A`;

async function generateIssueData(text: string, ref: string, files: DownloadedFile[], clientName?: string) {
  const fileNamesStr = files.length > 0 ? files.map(f => f.name).join(', ') : 'NENHUM ARQUIVO';

  const prompt = `Você é um assistente técnico especialista em Jira.
Conteúdo da Demanda: "${text}"
Referência: ${ref}
Cliente Fornecido: ${clientName || 'Extrair do texto'}
Arquivos: [${fileNamesStr}]
Lista de clientes: ${CLIENTS_MAPPING}

Regras:
- NÃO INVENTE INFORMAÇÕES. Seja DIRETO e OBJETIVO.
- Classifique: "Bug", "Story" ou "Task".

ESTRUTURA JSON EXIGIDA PARA CADA SEÇÃO DO ADF v1 (USE PAINÉIS):
{ "type": "panel", "attrs": { "panelType": "info" }, "content": [ { "type": "heading", "attrs": { "level": 3 }, "content": [ { "type": "text", "text": "Título da Seção" } ] }, { "type": "paragraph", "content": [ { "type": "text", "text": "Conteúdo..." } ] } ] }

Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "description" (ADF), "client_name", "client_id", "issuetype", "story_type" e "resumo_slack".
O campo "summary" DEVE começar com o nome do cliente entre colchetes (ex: [Nome do Cliente] Título).
O campo "resumo_slack" deve conter de 1 a 2 linhas explicando de forma muito resumida sobre o que se trata a demanda.`;

  // Build parts for Gemini API
  const parts: any[] = [{ text: prompt }];
  for (const f of files) {
    if (f.mimetype.startsWith('image/')) {
      parts.push({ inline_data: { mime_type: f.mimetype, data: f.content.toString('base64') } });
    }
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    );

    const geminiData = await geminiRes.json();
    let responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Clean markdown code fences
    if (responseText.startsWith('```json')) responseText = responseText.slice(7);
    else if (responseText.startsWith('```')) responseText = responseText.slice(3);
    if (responseText.endsWith('```')) responseText = responseText.slice(0, -3);

    return JSON.parse(responseText.trim());
  } catch (e) {
    console.error('Erro Gemini:', e);
    return null;
  }
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY || !JIRA_TOKEN) {
    return NextResponse.json(
      { error: 'Servidor mal configurado. Variáveis de ambiente faltando.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { texto, urls_imagens = [], nome_cliente, referencia = 'Painel Externo' } = body;

    // 1. Processar imagens
    console.log(`Processando ${urls_imagens.length} imagens...`);
    const downloadedFiles = await processImages(urls_imagens);

    // 2. Gerar dados via Gemini
    const issueData = await generateIssueData(texto, referencia, downloadedFiles, nome_cliente);
    if (!issueData) {
      return NextResponse.json({ error: 'Falha na geração dos dados via Gemini.' }, { status: 500 });
    }

    const summary = issueData.summary;
    const issueTypeName = issueData.issuetype || 'Task';
    const storyType = issueData.story_type;
    const clientId = issueData.client_id;

    // 3. Montar fields do Jira
    const fields: any = {
      project: { key: 'DSMM' },
      summary,
      issuetype: { name: issueTypeName },
      assignee: { id: JIRA_ASSIGNEE_ID },
      customfield_10015: new Date().toISOString().split('T')[0], // Start Date
      customfield_10004: { id: '10001' }, // Impacto
      customfield_10333: { id: '10119' }, // Saude
    };
    if (clientId) fields.customfield_10469 = [{ id: String(clientId) }];
    if (issueTypeName === 'Story' && storyType) {
      fields.customfield_10402 = { id: storyType.toUpperCase() === 'FEATURE' ? '10189' : '10190' };
    }

    // 4. Criar issue no Jira
    const createRes = await fetch(`${JIRA_BASE}/rest/api/3/issue`, {
      method: 'POST',
      headers: jiraHeaders,
      body: JSON.stringify({ fields }),
    });

    if (createRes.status !== 201) {
      const errText = await createRes.text();
      return NextResponse.json({ error: 'Erro ao criar issue no Jira', details: errText }, { status: createRes.status });
    }

    const createData = await createRes.json();
    const issueKey = createData.key;
    const issueUrl = `${JIRA_BASE}/browse/${issueKey}`;

    // 5. Upload de anexos
    if (downloadedFiles.length > 0) {
      for (const f of downloadedFiles) {
        const formData = new FormData();
        formData.append('file', new Blob([f.content], { type: f.mimetype }), f.name);

        await fetch(`${JIRA_BASE}/rest/api/3/issue/${issueKey}/attachments`, {
          method: 'POST',
          headers: {
            'X-Atlassian-Token': 'no-check',
            'Authorization': `Basic ${getJiraAuth()}`,
          },
          body: formData,
        });
      }
    }

    // 6. Aguardar 4 segundos
    await new Promise(resolve => setTimeout(resolve, 4000));

    // 7. PUT descrição
    await fetch(`${JIRA_BASE}/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: jiraHeaders,
      body: JSON.stringify({ fields: { description: issueData.description } }),
    });

    // 8. Mover status (transição para refinamento)
    await fetch(`${JIRA_BASE}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: jiraHeaders,
      body: JSON.stringify({ transition: { id: REFINAMENTO_TRANSITION_ID } }),
    });

    // 9. Notificar Slack
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const clientFinal = (nome_cliente || issueData.client_name || 'NÃO IDENTIFICADO').toUpperCase();
    const resumoTxt = issueData.resumo_slack || '';
    const slackMsg = `<${issueUrl}|${issueKey}> CRIADO REFERENTE AO CLIENTE ${clientFinal} ${now}\n_${resumoTxt}_`;

    if (SLACK_TOKEN) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: SLACK_CHANNEL, text: slackMsg }),
      });
    }

    return NextResponse.json({
      status: 'success',
      issue_key: issueKey,
      url: issueUrl,
      summary,
      issuetype: issueTypeName,
      client_id_mapped: clientId,
    });

  } catch (error: any) {
    console.error('Erro criar-demanda:', error);
    return NextResponse.json(
      { error: 'Falha ao processar demanda', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
