import { NextRequest, NextResponse } from 'next/server';

// Aumenta o timeout para 60s no plano Pro da Vercel (padrão Hobby é 10s)
export const maxDuration = 60;
import { generateText } from '@/lib/aiFallback';
import { CLIENTS } from '@/lib/clients';
import { backofficeEndpoints, slcEndpoints, cnabEndpoints } from '@/lib/endpoints';
import { buildDescription } from '@/lib/issuePanels';
import { isSafeExternalUrl } from '@/lib/ssrfGuard';

const ALL_ENDPOINTS = [
  ...backofficeEndpoints,
  ...slcEndpoints,
  ...cnabEndpoints
];
const DOCS_SUMMARY = JSON.stringify(ALL_ENDPOINTS.map(e => ({
  path: e.path,
  title: e.title,
  description: e.description,
  params: e.params
})));

// ─── Environment ───
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C09SDGH8EBT';
const JIRA_ASSIGNEE_ID = process.env.JIRA_ASSIGNEE_ID || '712020:e1b18321-5808-4927-be15-24f3756422ab';
const JIRA_BASE_URL = 'https://movingpay.atlassian.net';
const ROVO_AGENT_ACCOUNT_ID = process.env.ROVO_AGENT_ACCOUNT_ID;

function getJiraAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

function getJiraHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${getJiraAuth()}`,
  };
}

const CLIENTS_MAPPING = CLIENTS.map(c => `${c.name}: ${c.id}`).join(', ') + ', GERAL MOVINGPAY: N/A, HOLDING: N/A';

const REFINAMENTO_TRANSITION_ID = '13';

// ─── Claude ───
async function generateIssueData(texto: string, referencia: string, nomeCliente?: string, urgencia?: string) {
  const urgenciaLabel = urgencia === 'critico'
    ? 'CRÍTICO — sistema/produção parada, tratar como prioridade máxima'
    : urgencia === 'urgente'
      ? 'Urgente'
      : 'Normal';

  const prompt = `Você é um Analista de Qualidade e Produto (QA/PM) especialista em Jira. Seu objetivo é RECEBER um relato muitas vezes informal ou mal estruturado e REESTRUTURÁ-LO completamente em uma demanda técnica profissional, SEGUINDO RIGOROSAMENTE as regras da empresa.

Texto Original do Solicitante: "${texto}"
Referência da Origem: ${referencia}
Cliente Fornecido: ${nomeCliente || 'Extrair do texto'}
Urgência informada pelo solicitante: ${urgenciaLabel}
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
- "evidencias": Onde colocar as marcações de imagens (ex: !imagem.png!) se for Bug e a imagem não fizer parte da descrição principal.
- "observacoes": Qualquer outra informação, notas ou marcações de imagens adicionais.

IMPORTANTE SOBRE IMAGENS E ANEXOS:
MANTENHA AS MARCAÇÕES DE IMAGEM (no formato !nome_do_arquivo.ext!) EXATAMENTE no mesmo contexto/seção em que apareceram no texto original. Por exemplo, se a imagem (!imagem.png!) estava explicando o problema, mantenha-a na seção "descricao_ou_problema" ou "passos_reproduzir". A pessoa precisa que a imagem fique na descrição na ordem que ela escolheu.

REGRAS DE IDENTIFICAÇÃO DE PRODUTO:
Identifique se o problema/demanda ocorre em um dos seguintes painéis/produtos e retorne o ID correspondente na chave "produto_id". Caso não consiga identificar, retorne null.
- Console (ID: "10226")
- Vendedor (ID: "10227")
- Estabelecimento (ID: "10228")
- Regulatório (ID: "10229")
- Gateway (ID: "10225")
- Registradora (ID: "10230")

VALIDAÇÃO COM DOCUMENTAÇÃO OFICIAL E SUGESTÃO (docs.movingpay.dev):
Abaixo está o resumo dos endpoints oficiais da nossa API. Seu papel é atuar como um Engenheiro Sênior de Triagem.
Ao ler a demanda, procure identificar qual contexto de negócio está sendo afetado (ex: transações, usuários, taxas).
Cruze essa informação com os endpoints fornecidos e ADICIONE OBRIGATORIAMENTE na seção "observacoes" um bloco chamado "💡 SUGESTÃO DE INVESTIGAÇÃO PARA O DEV".
Nesse bloco, sugira qual(is) endpoint(s) (rota, método e parâmetros esperados) o desenvolvedor deve investigar primeiro para resolver o problema, dando assim um "rumo" direto ao ponto para a engenharia.
DOCUMENTAÇÃO: ${DOCS_SUMMARY}

ESTRUTURA JSON EXIGIDA:
Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "client_name", "client_id", "issuetype", "story_type", "produto_id", "resumo_slack" e "sections".
O "sections" deve ser um objeto com as chaves descritas acima.
O campo "summary" DEVE começar com o nome do cliente seguido de um hífen (ex: Nome do Cliente - Título curto e técnico). NÃO use colchetes.
O campo "resumo_slack" deve conter de 1 a 2 linhas explicando resumidamente a demanda.`;

  // Gemini primeiro (grátis até a cota diária), Claude como fallback se ele falhar.
  const { text: generated, provider } = await generateText(prompt, { maxTokens: 4096, jsonMode: true });
  console.log(`[IA] Demanda gerada via ${provider}`);
  let text = generated;

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

    // Rede de segurança: o modelo às vezes "esquece" de manter a marcação !arquivo.ext! quando
    // o relato é muito curto/vago (ex: só a imagem, sem texto explicando o que ela mostra).
    // Sem isso a imagem vira só um anexo solto no Jira, sem aparecer na descrição.
    const markers = Array.from(new Set(texto.match(/!([\w-]+\.[a-zA-Z0-9]{2,5})!/g) || []));
    if (markers.length > 0) {
      data.sections = data.sections || {};
      const currentText = Object.values(data.sections).filter((v: any) => typeof v === 'string').join(' ');
      const missing = markers.filter(m => !currentText.includes(m));
      if (missing.length > 0) {
        const fallbackKey = data.issuetype === 'Bug' ? 'evidencias' : 'observacoes';
        data.sections[fallbackKey] = [data.sections[fallbackKey], ...missing].filter(Boolean).join('\n');
      }
    }

    // Descrição Jira Wiki Markup construída pela mesma config de seções usada no preview do cliente.
    data.description = buildDescription(data);
    return data;
  } catch (e: any) {
    console.error(`[IA/${provider}] Failed to parse JSON. Raw output:`, text.slice(0, 500));
    throw new Error(`IA (${provider}) retornou JSON inválido: ${e.message}`);
  }
}

// ─── Jira ───
// Valores padrão de Impacto/Saúde quando o solicitante não indica nada mais específico.
const DEFAULT_IMPACTO_ID = '10001'; // Significant / Large
const DEFAULT_SAUDE_ID = '10119'; // 🟢

// Nomes exatos do esquema de prioridade configurado no projeto DSMM — um valor
// fora dessa lista (ex: cache antigo do navegador, ou outro chamador da API)
// faz o Jira rejeitar a criação inteira da issue, não só o campo.
const VALID_PRIORITIES = new Set(['Altíssima', 'Alta', 'Médio', 'Baixa', 'Baixíssima']);

async function createJiraIssue(issueData: any, meta: { prioridade?: string; urgencia?: string } = {}) {
  const jiraHeaders = getJiraHeaders();

  const now = new Date();
  const fields: any = {
    project: { key: 'DSMM' },
    summary: issueData.summary,
    description: issueData.description,
    issuetype: { name: issueData.issuetype || 'Task' },
    assignee: { id: JIRA_ASSIGNEE_ID },
    customfield_10015: now.toISOString().split('T')[0], // Start Date
    customfield_10004: { id: DEFAULT_IMPACTO_ID }, // Impacto
    customfield_10333: { id: DEFAULT_SAUDE_ID }, // Saude
  };

  if (meta.prioridade && VALID_PRIORITIES.has(meta.prioridade)) {
    fields.priority = { name: meta.prioridade };
  } else if (meta.prioridade) {
    console.warn(`Prioridade ignorada (fora do esquema do Jira): ${meta.prioridade}`);
  }

  const labels: string[] = [];
  if (meta.urgencia === 'urgente') labels.push('urgente');
  if (meta.urgencia === 'critico') labels.push('critico-producao-parada');
  if (labels.length) fields.labels = labels;

  if (issueData.client_id && issueData.client_id !== 'N/A' && !isNaN(Number(issueData.client_id))) {
    fields.customfield_10469 = [{ id: String(issueData.client_id) }];
  }
  if (issueData.issuetype === 'Story' && issueData.story_type) {
    fields.customfield_10402 = { id: issueData.story_type?.toUpperCase() === 'FEATURE' ? '10189' : '10190' };
  }
  if (issueData.produto_id) {
    fields.customfield_10436 = [{ id: String(issueData.produto_id) }];
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

// ─── Agente Rovo ───
async function callRovoAgent(issueKey: string) {
  if (!ROVO_AGENT_ACCOUNT_ID) return;
  const jiraAuth = getJiraAuth();
  
  const commentBody = {
    body: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                id: ROVO_AGENT_ACCOUNT_ID
              }
            },
            {
              type: "text",
              text: " Por favor, faça a análise inicial desta demanda de acordo com as suas instruções."
            }
          ]
        }
      ]
    }
  };

  await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${jiraAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commentBody)
  }).catch(err => console.error('Erro ao chamar o agente Rovo:', err));
}

// ─── Attachments ───
async function uploadAttachments(issueKey: string, arquivos: {url: string, filename?: string}[]) {
  if (!arquivos || arquivos.length === 0) return 0;
  const jiraAuth = getJiraAuth();
  let uploaded = 0;

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
          const blob = new Blob([buffer], { type: mimeType });
          
          const formData = new FormData();
          formData.append('file', blob, filename);

          const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'X-Atlassian-Token': 'no-check'
            },
            body: formData as any
          });
          
          if (res.ok) {
            uploaded++;
          } else {
            const errText = await res.text().catch(() => 'unknown error');
            console.error(`Falha ao enviar anexo ${filename} para o Jira: HTTP ${res.status} - ${errText}`);
          }
        }
      } else if (dataUrl.startsWith('http')) {
        // Trata URL normal de imagem (digitada manualmente) — só busca se o host
        // resolver pra um IP público (evita SSRF contra rede interna/metadata).
        if (!(await isSafeExternalUrl(dataUrl))) {
          console.error(`Anexo bloqueado (URL não permitida): ${dataUrl}`);
          continue;
        }
        const resUrl = await fetch(dataUrl, { redirect: 'error' });
        if (resUrl.ok) {
          const blob = await resUrl.blob();
          const filename = originalFilename || new URL(dataUrl).pathname.split('/').pop() || `anexo_${index + 1}`;
          
          const formData = new FormData();
          formData.append('file', blob, filename);

          const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'X-Atlassian-Token': 'no-check'
            },
            body: formData as any
          });
          
          if (res.ok) {
            uploaded++;
          } else {
            const errText = await res.text().catch(() => 'unknown error');
            console.error(`Falha ao enviar anexo ${filename} para o Jira: HTTP ${res.status} - ${errText}`);
          }
        }
      }
    } catch (err) {
      console.error('Falha ao enviar anexo para o Jira:', err);
    }
  }

  return uploaded;
}

// O Jira só resolve os marcadores "!arquivo.ext!" da wiki markup para embeds de imagem
// no momento em que a description é convertida para ADF — e isso já aconteceu na criação
// da issue, antes dos anexos existirem. Reenviar a mesma description agora que os anexos
// já estão na issue faz o Jira reconverter e resolver os marcadores corretamente.
async function refreshDescriptionForAttachments(issueKey: string, description: string) {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, {
    method: 'PUT',
    headers: getJiraHeaders(),
    body: JSON.stringify({ fields: { description } }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error');
    console.error(`Falha ao reprocessar description com anexos: HTTP ${res.status} - ${errText}`);
  }
}

// ─── Route ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, nome_cliente, referencia = 'CONSOLE', urls_imagens = [], arquivos = [], previewOnly, issueDataPreGerado, prioridade, urgencia } = body;

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Servidor mal configurado — variáveis de ambiente faltando', success: false }, { status: 500 });
    }

    let issueData = issueDataPreGerado;

    // Step 1: Claude gera os dados da issue, se ainda não vierem prontos
    if (!issueData) {
      if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
        return NextResponse.json({ error: 'Texto da demanda é obrigatório', success: false }, { status: 400 });
      }
      issueData = await generateIssueData(texto.trim(), referencia, nome_cliente, urgencia);
      if (!issueData || !issueData.summary) {
        return NextResponse.json({ error: 'Falha na geração dos dados via IA', success: false }, { status: 500 });
      }
    }

    // Se for apenas preview, retorna os dados gerados pela IA sem criar no Jira
    if (previewOnly) {
      return NextResponse.json({ success: true, issueData });
    }

    // Step 2: Create Jira issue
    const { issueKey, issueUrl } = await createJiraIssue(issueData, { prioridade, urgencia });

    // Step 3: Upload Attachments (se houver)
    // Se "arquivos" estiver presente (novo formato), use-os. Senão, mapeie as urls_imagens (legacy)
    const arquivosParaEnviar = arquivos.length > 0 
      ? arquivos 
      : (urls_imagens && urls_imagens.length > 0 ? urls_imagens.map((u: string) => ({ url: u })) : []);

    if (arquivosParaEnviar.length > 0) {
      const uploaded = await uploadAttachments(issueKey, arquivosParaEnviar);
      if (uploaded > 0) {
        await refreshDescriptionForAttachments(issueKey, issueData.description);
      }
    }

    // Step 4: Notify Slack and Call Rovo Agent concurrently before returning response
    // Na Vercel, não podemos usar "fire and forget" sem await, pois a função serverless congela imediatamente após o return
    const clientFinal = nome_cliente || issueData.client_name || 'NÃO IDENTIFICADO';
    
    await Promise.allSettled([
      notifySlack(issueKey, issueUrl, clientFinal, issueData.resumo_slack || ''),
      callRovoAgent(issueKey)
    ]);

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
