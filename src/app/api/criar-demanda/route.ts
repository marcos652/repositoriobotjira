import { NextRequest, NextResponse } from 'next/server';

// Aumenta o timeout para 60s no plano Pro da Vercel (padrão Hobby é 10s)
export const maxDuration = 60;
import { generateText, parseAiJson, type AiProvider } from '@/lib/aiFallback';
import { CLIENTS } from '@/lib/clients';
import { backofficeEndpoints, slcEndpoints, cnabEndpoints } from '@/lib/endpoints';
import { buildDescription, ALL_SECTION_KEYS, type IssueLike } from '@/lib/issuePanels';
import { getSessionEmail } from '@/app/api/auth/_admin';

// Restringe a saída da IA à forma da demanda. Sem isso o modelo pode devolver
// JSON perfeitamente válido mas de OUTRA COISA — e devolveu: veio um payload
// paginado de API ({total, page, perPage, lastPage, recuperado, em_atraso...}),
// provavelmente ecoando um trecho colado no próprio relato em vez de estruturá-lo.
// O parse acertava, a demanda saía sem summary, e o erro não dizia por quê.
// Como cada seção é declarada STRING, o schema também impede o caso de a IA
// mandar uma seção como array (visto em "passos_reproduzir").
const DEMANDA_SCHEMA_GEMINI = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    client_name: { type: 'STRING' },
    client_id: { type: 'STRING', nullable: true },
    issuetype: { type: 'STRING', enum: ['Bug', 'Story', 'Task'] },
    story_type: { type: 'STRING', nullable: true },
    produto_id: { type: 'STRING', nullable: true },
    resumo_slack: { type: 'STRING' },
    sections: {
      type: 'OBJECT',
      properties: Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, { type: 'STRING' }])),
      required: ['contexto', 'descricao_ou_problema', 'observacoes'],
    },
  },
  required: ['summary', 'client_name', 'issuetype', 'resumo_slack', 'sections'],
};

// Forma do objeto que a IA devolve. Estende IssueLike (o que buildDescription
// consome) com os campos que só existem no fluxo de criação da demanda.
interface DemandaGerada extends IssueLike {
  summary?: string;
  client_name?: string;
  client_id?: string;
  produto_id?: string;
  resumo_slack?: string;
  description?: string;
}
import { isSafeExternalUrl } from '@/lib/ssrfGuard';
import { reserveDemandaSlot, releaseDemandaSlot } from '@/lib/demandaLimit';
import { incrementar } from '@/lib/metric-counters';

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

// Mesma leitura do proxy.ts: atrás da Vercel o IP real está no x-forwarded-for, e o
// primeiro item da lista é o cliente (os demais são proxies no caminho).
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

function getJiraHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${getJiraAuth()}`,
  };
}

const CLIENTS_MAPPING = CLIENTS.map(c => `${c.name}: ${c.id}`).join(', ') + ', GERAL MOVINGPAY: N/A, HOLDING: N/A';

// e-mail -> accountId do Jira. São poucos usuários e o accountId não muda, então cachear
// evita uma ida à API do Jira em cada demanda criada. Vive em globalThis: some no cold
// start, o que só custa uma busca a mais.
const JIRA_ACCOUNT_CACHE_KEY = '__jiraops_jira_account_ids__';

function getAccountCache(): Map<string, string | null> {
  const g = globalThis as Record<string, unknown>;
  if (!g[JIRA_ACCOUNT_CACHE_KEY]) g[JIRA_ACCOUNT_CACHE_KEY] = new Map<string, string | null>();
  return g[JIRA_ACCOUNT_CACHE_KEY] as Map<string, string | null>;
}

/**
 * Descobre o accountId do Jira a partir do e-mail de quem está criando a demanda, para
 * entrar como RELATOR da issue.
 *
 * Devolve null (e a demanda é criada sem relator explícito, caindo na conta de serviço)
 * quando o e-mail não tem conta no Jira, está inativo, ou a busca falha. Nunca lança:
 * perder o relator é chato, perder a demanda inteira é bem pior.
 *
 * O match é por e-mail EXATO. A busca do Jira é textual e casa por nome também — sem essa
 * checagem, "ana@..." poderia trazer outra Ana e a issue sairia com o relator errado, o que
 * é pior que não ter relator.
 */
async function resolveJiraAccountId(email: string): Promise<string | null> {
  const chave = email.trim().toLowerCase();
  const cache = getAccountCache();
  if (cache.has(chave)) return cache.get(chave) ?? null;

  try {
    const res = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/user/search?query=${encodeURIComponent(chave)}&maxResults=5`,
      { headers: getJiraHeaders() }
    );
    if (!res.ok) {
      console.warn(`[Relator] Busca de usuário no Jira falhou (HTTP ${res.status}) para ${chave}`);
      return null; // não cacheia falha de rede: pode ser transitória
    }
    const usuarios: { accountId?: string; emailAddress?: string; active?: boolean }[] = await res.json();
    const exato = usuarios.find(
      (u) => (u.emailAddress || '').trim().toLowerCase() === chave && u.active !== false
    );
    const accountId = exato?.accountId || null;
    if (!accountId) console.warn(`[Relator] Sem conta ativa no Jira para ${chave} — issue sairá sem relator explícito`);
    cache.set(chave, accountId);
    return accountId;
  } catch (e) {
    console.warn('[Relator] Erro ao buscar usuário no Jira:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── Hierarquia: a demanda criada como FILHA de outra ───
//
// No DSMM a única hierarquia que existe é Subtarefa (nível -1) sob um item de nível 0. Medido
// contra o projeto: 35 filhas, TODAS subtarefas, e nenhum tipo Épico (nível 1) disponível na
// tela de criação. Então, para a demanda nascer com pai, ela precisa ser Subtarefa — o tipo que
// a IA escolheu (Bug, Tarefa, História) é sobrescrito. É uma troca real e a tela avisa.
// Por ID, não por nome: nesta instância a resolução de nomes já falhou duas vezes (status
// "Resolvido" e issuetype "Subtarefa" em JQL devolvem zero). O id 10010 saiu do createmeta do
// DSMM. O nome fica só para a tela mostrar.
const TIPO_SUBTAREFA_ID = '10010';
const TIPO_SUBTAREFA_NOME = 'Subtarefa';

// ─── Vínculo com outra issue (ex: a demanda nasceu de um ticket do suporte) ───
//
// Os ids saem de /rest/api/3/issueLinkType da instância. Só estes três são aceitos: uma lista
// fechada impede que um id inválido chegue ao Jira e derrube a criação por causa de um vínculo.
const TIPOS_DE_VINCULO: Record<string, { id: string; rotulo: string }> = {
  relates:   { id: '10003', rotulo: 'relaciona-se com' },
  causedBy:  { id: '10006', rotulo: 'é causada por' },
  escalation:{ id: '10043', rotulo: 'é escalação de' },
};
const VINCULO_PADRAO = 'relates';

const CHAVE_ISSUE = /^[A-Z][A-Z0-9]*-\d+$/;

interface VinculoPedido { key?: string; tipo?: string }

/**
 * Cria os vínculos DEPOIS de a issue existir, um por um.
 *
 * Por que depois e não no create: um vínculo com chave errada faria o Jira recusar a criação
 * inteira, e perder a demanda por causa de um vínculo é troca ruim. Aqui cada vínculo falha
 * sozinho, a demanda sobrevive, e a resposta diz quais não entraram.
 */
async function criarVinculos(
  issueKey: string,
  pedidos: VinculoPedido[]
): Promise<{ criados: string[]; falhas: { key: string; motivo: string }[] }> {
  const criados: string[] = [];
  const falhas: { key: string; motivo: string }[] = [];

  // Sem duplicar: pedir o mesmo vínculo duas vezes criaria duas linhas iguais no Jira.
  const vistos = new Set<string>();

  for (const pedido of pedidos) {
    const alvo = String(pedido?.key || '').trim().toUpperCase();
    if (!alvo) continue;
    if (!CHAVE_ISSUE.test(alvo)) { falhas.push({ key: alvo, motivo: 'chave inválida' }); continue; }
    if (alvo === issueKey) { falhas.push({ key: alvo, motivo: 'não faz sentido vincular a issue a ela mesma' }); continue; }
    if (vistos.has(alvo)) continue;
    vistos.add(alvo);

    const tipo = TIPOS_DE_VINCULO[pedido?.tipo || VINCULO_PADRAO] || TIPOS_DE_VINCULO[VINCULO_PADRAO];

    try {
      const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issueLink`, {
        method: 'POST',
        headers: getJiraHeaders(),
        body: JSON.stringify({
          type: { id: tipo.id },
          // inward = a issue nova; outward = o ticket de origem. Com "é causada por", a leitura
          // no Jira fica "DSMM-x é causada por SUP-y", que é o sentido real.
          inwardIssue: { key: issueKey },
          outwardIssue: { key: alvo },
        }),
      });
      if (res.ok) {
        criados.push(alvo);
        console.log(`[Vinculo] ${issueKey} ${tipo.rotulo} ${alvo}`);
      } else {
        const detalhe = (await res.text().catch(() => '')).slice(0, 160);
        falhas.push({ key: alvo, motivo: `Jira recusou (HTTP ${res.status})` });
        console.error(`[Vinculo] Falha ${issueKey} -> ${alvo}: ${res.status} ${detalhe}`);
      }
    } catch (e) {
      falhas.push({ key: alvo, motivo: e instanceof Error ? e.message : 'erro de rede' });
    }
  }

  return { criados, falhas };
}

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
Cada marcação deve ficar SOZINHA EM UMA LINHA, logo depois do trecho de texto que ela ilustra — nunca no meio de uma frase e nunca agrupada com as outras no fim da seção. Se o relato alterna texto e imagem (escreve, imagem, escreve, imagem), reproduza essa mesma alternância na seção correspondente.

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

  // O fallback do generateText só cobria FALHA DE API. Saída que não parseia, ou
  // que parseia mas não é uma demanda, é igualmente fatal — e é variação do
  // modelo, não erro de prompt. Vale uma segunda tentativa antes de errar.
  const erroMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const gerarEValidar = async (forceProvider?: AiProvider) => {
    const { text, provider } = await generateText(prompt, {
      maxTokens: 4096,
      jsonMode: true,
      geminiResponseSchema: DEMANDA_SCHEMA_GEMINI,
      forceProvider,
    });
    try {
      const parsed = parseAiJson<DemandaGerada>(text);
      // O schema garante a forma no Gemini, mas o Claude ainda não é restringido
      // por schema — então a checagem fica no código, valendo para os dois.
      if (!parsed || typeof parsed !== 'object' || typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        const campos = parsed && typeof parsed === 'object' ? Object.keys(parsed).join(', ') : typeof parsed;
        throw new Error(`resposta sem o campo "summary" (recebido: ${campos})`);
      }
      return { data: parsed, provider };
    } catch (e) {
      console.error(`[IA/${provider}] Saída inaproveitável. Cru:`, text.slice(0, 500));
      throw e;
    }
  };

  // Gemini primeiro (grátis até a cota diária), Claude como fallback.
  let result: { data: DemandaGerada; provider: AiProvider };
  try {
    result = await gerarEValidar();
  } catch (e) {
    console.warn(`[IA] 1ª tentativa inválida (${erroMsg(e)}) — refazendo no Claude`);
    try {
      result = await gerarEValidar('claude');
    } catch (e2) {
      throw new Error(`IA não devolveu uma demanda válida: ${erroMsg(e2)}`);
    }
  }
  const data = result.data;
  console.log(`[IA] Demanda gerada via ${result.provider}`);

  // A IA às vezes devolve uma seção como ARRAY em vez de string — visto em
  // "passos_reproduzir", que ela lista como um passo por item. Sem normalizar,
  // o painel do Jira recebe o JSON cru (buildDescription faz JSON.stringify do
  // que não é string) e o preview do cliente mostra os passos separados por
  // vírgula. Converter aqui, na fonte, resolve para os dois consumidores — e
  // faz a rede de segurança de marcações abaixo enxergar o conteúdo também.
  const sections = data.sections as Record<string, unknown> | undefined;
  if (sections) {
    for (const [chave, valor] of Object.entries(sections)) {
      if (Array.isArray(valor)) {
        sections[chave] = valor.filter(Boolean).map(String).join('\n');
      }
    }
  }

  // Rede de segurança: o modelo às vezes "esquece" de manter a marcação !arquivo.ext! quando
  // o relato é muito curto/vago (ex: só a imagem, sem texto explicando o que ela mostra).
  // Sem isso a imagem vira só um anexo solto no Jira, sem aparecer na descrição.
  const markers = Array.from(new Set(texto.match(/!([\w-]+\.[a-zA-Z0-9]{2,5})!/g) || []));
  if (markers.length > 0) {
    data.sections = data.sections || {};
    const currentText = Object.values(data.sections).filter((v) => typeof v === 'string').join(' ');
    const missing = markers.filter(m => !currentText.includes(m));
    if (missing.length > 0) {
      const fallbackKey = data.issuetype === 'Bug' ? 'evidencias' : 'observacoes';
      data.sections[fallbackKey] = [data.sections[fallbackKey], ...missing].filter(Boolean).join('\n');
    }
  }

  // Descrição Jira Wiki Markup construída pela mesma config de seções usada no preview do cliente.
  data.description = buildDescription(data);
  return data;
}

// ─── Jira ───
// Valores padrão de Impacto/Saúde quando o solicitante não indica nada mais específico.
const DEFAULT_IMPACTO_ID = '10001'; // Significant / Large
const DEFAULT_SAUDE_ID = '10119'; // 🟢

// Nomes exatos do esquema de prioridade configurado no projeto DSMM — um valor
// fora dessa lista (ex: cache antigo do navegador, ou outro chamador da API)
// faz o Jira rejeitar a criação inteira da issue, não só o campo.
const VALID_PRIORITIES = new Set(['Altíssima', 'Alta', 'Médio', 'Baixa', 'Baixíssima']);

async function createJiraIssue(
  issueData: any,
  meta: { prioridade?: string; urgencia?: string; reporterAccountId?: string | null; paiKey?: string | null } = {}
) {
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

  // Com pai, o tipo VIRA Subtarefa: no DSMM só esse nível aceita um item comum como pai.
  // Sobrescrever o que a IA decidiu é deliberado — sem isso o Jira recusaria a criação inteira,
  // e uma demanda recusada é pior que uma demanda com o tipo trocado.
  if (meta.paiKey) {
    fields.parent = { key: meta.paiKey };
    fields.issuetype = { id: TIPO_SUBTAREFA_ID };
  }

  // Relator = quem criou a demanda no JiraOps, e não a conta de serviço. O campo não
  // aparece no createmeta do projeto (está fora da tela de criação), mas a API aceita
  // porque a conta tem MODIFY_REPORTER — verificado contra o Jira: com accountId inválido o
  // erro é "especifique algum valor válido para reporter", ou seja validação de VALOR, e não
  // "field cannot be set".
  if (meta.reporterAccountId) {
    fields.reporter = { id: meta.reporterAccountId };
  }

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
  const criar = (corpo: Record<string, unknown>) => fetch(`${JIRA_BASE_URL}/rest/api/2/issue`, {
    method: 'POST',
    headers: jiraHeaders,
    body: JSON.stringify({ fields: corpo }),
  });

  let createRes = await criar(fields);

  // Se o Jira recusar por causa do relator (permissão revogada, conta desativada, mudança
  // na configuração de tela), tenta de novo SEM ele. Relator é enfeite comparado a perder a
  // demanda que a pessoa acabou de escrever — e ela já gastou uma vaga da cota diária.
  if (!createRes.ok && fields.reporter) {
    const erro = await createRes.clone().text().catch(() => '');
    if (/reporter/i.test(erro)) {
      console.warn(`[Relator] Jira recusou o relator (${createRes.status}); recriando sem ele. Resposta: ${erro.slice(0, 200)}`);
      const { reporter, ...semRelator } = fields;
      void reporter;
      createRes = await criar(semRelator);
    }
  }

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
  let demandaSlotReserved = false;
  try {
    const body = await request.json();
    const { texto, nome_cliente, referencia = 'CONSOLE', urls_imagens = [], arquivos = [], previewOnly, issueDataPreGerado, prioridade, urgencia, vinculos = [], paiKey } = body;

    if (!JIRA_EMAIL || !JIRA_TOKEN) {
      return NextResponse.json({ error: 'Servidor mal configurado — variáveis de ambiente faltando', success: false }, { status: 500 });
    }

    // O pai é conferido AQUI, antes da reserva de vaga, antes da IA e antes do retorno do
    // preview. Já estava mais abaixo e não valia para o preview: o erro só aparecia depois de a
    // pessoa escrever a demanda inteira e confirmar — exatamente o que essa checagem evita.
    let paiValidado: string | null = null;
    if (paiKey) {
      const chave = String(paiKey).trim().toUpperCase();
      if (!CHAVE_ISSUE.test(chave)) {
        return NextResponse.json({ error: `Chave de pai inválida: ${paiKey}`, success: false }, { status: 400 });
      }
      const resPai = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${chave}?fields=issuetype,project`, {
        headers: getJiraHeaders(),
      });
      if (!resPai.ok) {
        return NextResponse.json({ error: `A demanda pai ${chave} não foi encontrada no Jira.`, success: false }, { status: 400 });
      }
      const pai = await resPai.json();
      if (pai?.fields?.project?.key !== 'DSMM') {
        return NextResponse.json({ error: `${chave} é do projeto ${pai?.fields?.project?.key}. O pai precisa ser uma demanda do DSMM.`, success: false }, { status: 400 });
      }
      if (pai?.fields?.issuetype?.subtask) {
        return NextResponse.json({ error: `${chave} é uma subtarefa e não pode ser pai de outra.`, success: false }, { status: 400 });
      }
      paiValidado = chave;
    }


    // Limite diário GLOBAL de criação (painel + bot somados, não por usuário) —
    // reserva a vaga atomicamente antes de gastar IA gerando a demanda; preview
    // nunca reserva. Se algo falhar depois (IA ou Jira), o catch abaixo devolve
    // a vaga — só demanda de fato criada consome a cota.
    if (!previewOnly) {
      const slot = await reserveDemandaSlot();
      if (!slot.allowed) {
        return NextResponse.json(
          { error: 'Limite diário de 6 demandas atingido (contagem única, somando painel e bot). Tente novamente depois da meia-noite.', success: false },
          { status: 429 }
        );
      }
      demandaSlotReserved = true;
    }

    let issueData = issueDataPreGerado;

    // Step 1: Claude gera os dados da issue, se ainda não vierem prontos
    if (!issueData) {
      if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
        if (demandaSlotReserved) await releaseDemandaSlot();
        return NextResponse.json({ error: 'Texto da demanda é obrigatório', success: false }, { status: 400 });
      }
      issueData = await generateIssueData(texto.trim(), referencia, nome_cliente, urgencia);
      if (!issueData || !issueData.summary) {
        if (demandaSlotReserved) await releaseDemandaSlot();
        // "Falha na geração dos dados via IA" não dizia nada: o parse pode ter
        // funcionado e só o summary estar faltando. Reportar o que chegou torna
        // a próxima ocorrência diagnosticável em vez de um mistério.
        const recebido = issueData ? Object.keys(issueData).join(', ') || '(objeto vazio)' : `${typeof issueData}`;
        console.error('[IA] Resposta sem "summary". Campos recebidos:', recebido);
        return NextResponse.json(
          {
            error: 'A IA respondeu, mas sem o campo obrigatório "summary".',
            details: `Campos recebidos: ${recebido}`,
            success: false,
          },
          { status: 500 }
        );
      }
    }

    // Se for apenas preview, retorna os dados gerados pela IA sem criar no Jira
    if (previewOnly) {
      return NextResponse.json({ success: true, issueData });
    }

    // Step 2: Create Jira issue
    // Quem está criando: vem do cookie de sessão assinado, não do corpo da requisição —
    // aceitar um e-mail enviado pelo cliente deixaria qualquer um abrir demanda no nome de
    // outra pessoa. Chamadas do jirabot (token de serviço) não têm sessão: ficam sem relator
    // explícito, o que é o comportamento correto (não há pessoa por trás).
    const criadorEmail = await getSessionEmail(request);
    const reporterAccountId = criadorEmail ? await resolveJiraAccountId(criadorEmail) : null;
    if (reporterAccountId) console.log(`[Relator] ${criadorEmail} -> ${reporterAccountId}`);

    const { issueKey, issueUrl } = await createJiraIssue(issueData, { prioridade, urgencia, reporterAccountId, paiKey: paiValidado });

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
      callRovoAgent(issueKey),
      // +1 nas linhas da tabela de contadores. É o caminho rápido: a tela mostra o número
      // novo na hora, sem esperar a próxima recontagem no Jira. Dentro do allSettled porque
      // um contador que não somou não pode derrubar uma demanda que já foi criada — a
      // reconciliação periódica conserta o valor.
      incrementar('jiraops:demandas_criadas', 1),
      incrementar('dev:criados_hoje', 1),
      incrementar('dev:abertos', 1),
    ]);

    // Fora do allSettled acima porque o resultado vai na resposta: a tela precisa dizer se
    // algum vínculo não entrou.
    const vinculoResultado = Array.isArray(vinculos) && vinculos.length > 0
      ? await criarVinculos(issueKey, vinculos)
      : { criados: [], falhas: [] };

    return NextResponse.json({
      success: true,
      issue_key: issueKey,
      url: issueUrl,
      summary: issueData.summary,
      issuetype: issueData.issuetype || 'Task',
      client_name: issueData.client_name,
      message: `Demanda ${issueKey} criada com sucesso!`,
      // Autoria, para o histórico da tela. Vem do servidor porque nenhuma das duas o
      // cliente consegue saber com confiança: o e-mail sai do cookie de sessão assinado
      // (aceitar do corpo permitiria falsificar), e o IP só existe no cabeçalho da
      // requisição — o navegador não conhece o próprio IP público.
      criado_por: criadorEmail || 'jirabot (token de serviço)',
      ip: getClientIP(request),
      vinculos_criados: vinculoResultado.criados,
      vinculos_falhos: vinculoResultado.falhas,
      pai: paiValidado,
      // A tela precisa poder explicar por que o tipo saiu diferente do que a IA sugeriu.
      tipo_forcado: paiValidado ? TIPO_SUBTAREFA_NOME : null,
    });
  } catch (error: any) {
    console.error('Erro ao criar demanda:', error);
    // Falhou depois de reservar a vaga (IA ou Jira) — devolve pra cota diária,
    // já que nenhuma demanda foi de fato criada.
    if (demandaSlotReserved) {
      await releaseDemandaSlot();
    }
    return NextResponse.json(
      { error: 'Falha ao criar demanda', message: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
}
