// ============================================
//  API: /api/jira/buscar-issue?q=SUP-211
// ============================================
//
// Autocompletar de issue para vincular numa demanda nova. Aceita chave inteira
// ("SUP-21193"), chave parcial ("SUP-211") ou texto livre ("cnae").
//
// O parâmetro `currentJQL=` VAZIO é obrigatório no picker. Sem ele o Jira devolve apenas a
// seção de histórico, e a busca de verdade não acontece — medido:
//
//   picker "SUP-211"   sem currentJQL ->  0 resultados | com currentJQL= -> 17
//   picker "cnae"      sem currentJQL ->  1            | com currentJQL= ->  6
//   picker "SUP-21193" sem currentJQL ->  0            | com currentJQL= ->  1
//
// DUAS FONTES, e não só o picker: quando a busca parece uma chave completa, a issue também é
// buscada direto pelo endpoint de issue. Isso garante três coisas que o picker não dá:
// o resultado exato em PRIMEIRO lugar, o status e o tipo da issue (o picker devolve só chave e
// resumo), e a diferença entre "essa chave não existe" (404) e "não achei nada parecido".

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';
const BASE = `https://${JIRA_DOMAIN}`;

// ── Modo "candidato a pai" ──
//
// No DSMM a única hierarquia que existe é Subtarefa (nível -1) sob um item de nível 0. Medido:
// o projeto tem 35 filhas, TODAS subtarefas, e nenhum tipo Épico (nível 1) disponível.
//
// Logo o pai tem de ser um item de nível 0 do próprio DSMM, e uma subtarefa NÃO pode ser pai —
// é o último nível. Por isso o filtro exclui o tipo 10010.
const PROJETO_PAI = 'DSMM';
const TIPO_SUBTAREFA = '10010';
// A validação é feita por JQL sobre as chaves candidatas — ver apenasCandidatosAPai.

/** Chave completa de issue: letras, hífen, número. */
const CHAVE_COMPLETA = /^[A-Za-z][A-Za-z0-9]*-\d+$/;

function headers() {
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN}`
  ).toString('base64');
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${auth}` };
}

export interface Sugestao {
  key: string;
  summary: string;
  status: string | null;
  categoria: string | null;
  tipo: string | null;
  projeto: string | null;
  /** true quando veio da busca direta pela chave — casa exato. */
  exata: boolean;
  /** Subtarefa não pode ser pai: é o último nível da hierarquia. */
  subtarefa: boolean;
}

/** A issue daquela chave, ou null se não existir / sem permissão. Nunca lança. */
async function porChave(chave: string): Promise<Sugestao | null> {
  try {
    const res = await fetch(
      `${BASE}/rest/api/3/issue/${encodeURIComponent(chave)}?fields=summary,status,issuetype,project`,
      { headers: headers() }
    );
    if (!res.ok) return null; // 404 = não existe; 403 = sem acesso. Nos dois casos, não sugerir.
    const i = await res.json();
    return {
      key: i.key,
      summary: i.fields?.summary || '',
      status: i.fields?.status?.name || null,
      categoria: i.fields?.status?.statusCategory?.key || null,
      tipo: i.fields?.issuetype?.name || null,
      projeto: i.fields?.project?.key || null,
      exata: true,
      subtarefa: !!i.fields?.issuetype?.subtask,
    };
  } catch {
    return null;
  }
}

/** Sugestões do autocompletar nativo do Jira. Devolve só key e resumo. */
async function peloPicker(q: string): Promise<Sugestao[]> {
  try {
    // currentJQL vazio: sem ele o picker não pesquisa, só devolve o histórico. Ver o cabeçalho.
    //
    // Sem FILTRO aqui, mesmo no modo pai. Tentei filtrar por currentJQL e a busca por prefixo de
    // chave parava de funcionar: "DSMM-2" devolvia só a seção de histórico, que ignora o filtro.
    // Filtrar cedo custava o caso mais comum. A validação virou uma etapa própria, por JQL.
    const res = await fetch(
      `${BASE}/rest/api/3/issue/picker?query=${encodeURIComponent(q)}&currentJQL=`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const j = await res.json();
    const brutas: { key?: string; summaryText?: string; summary?: string }[] =
      (j.sections || []).flatMap((sec: { issues?: unknown[] }) => sec.issues || []);

    const vistas = new Set<string>();
    const saida: Sugestao[] = [];
    for (const i of brutas) {
      if (!i.key || vistas.has(i.key)) continue;
      vistas.add(i.key);
      saida.push({
        key: i.key,
        // O picker devolve o resumo com <b> em volta do trecho que casou — vira ruído no
        // <input>, então as marcas saem aqui.
        summary: String(i.summaryText || i.summary || '').replace(/<\/?b>/g, ''),
        status: null,
        categoria: null,
        tipo: null,
        projeto: i.key.split('-')[0],
        exata: false,
        // O picker não devolve o tipo. No modo pai isso não é problema: o filtro do currentJQL
        // já excluiu as subtarefas antes de chegar aqui.
        subtarefa: false,
      });
    }
    return saida;
  } catch {
    return [];
  }
}

/**
 * Dos candidatos, só os que PODEM ser pai — numa única JQL, em vez de uma chamada por issue.
 *
 * O tipo de cada um é conferido no Jira, e não deduzido: o autocompletar devolve apenas chave e
 * resumo, então assumir "veio da busca, logo é válido" deixaria subtarefa entrar como pai e a
 * criação falharia no fim, depois de a pessoa já ter escrito a demanda toda.
 */
async function apenasCandidatosAPai(chaves: string[]): Promise<Sugestao[]> {
  const doProjeto = chaves.filter((k) => k.startsWith(`${PROJETO_PAI}-`));
  if (doProjeto.length === 0) return [];

  try {
    const res = await fetch(`${BASE}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        jql: `key in (${doProjeto.join(', ')}) AND issuetype != ${TIPO_SUBTAREFA}`,
        fields: ['summary', 'status', 'issuetype', 'project'],
        maxResults: 50,
      }),
    });
    if (!res.ok) return [];
    const j = await res.json();

    // A ordem que o autocompletar deu é a mais relevante; a JQL devolve em outra ordem.
    const porChave = new Map<string, Sugestao>();
    for (const i of j.issues || []) {
      porChave.set(i.key, {
        key: i.key,
        summary: i.fields?.summary || '',
        status: i.fields?.status?.name || null,
        categoria: i.fields?.status?.statusCategory?.key || null,
        tipo: i.fields?.issuetype?.name || null,
        projeto: i.fields?.project?.key || null,
        exata: false,
        subtarefa: false,
      });
    }
    return doProjeto.map((k) => porChave.get(k)).filter((x): x is Sugestao => !!x);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  if (!process.env.JIRA_EMAIL || !(process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN)) {
    return NextResponse.json({ success: false, error: 'Jira não configurado' }, { status: 500 });
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  // 2 caracteres: abaixo disso a busca traria qualquer coisa e só gastaria chamada.
  if (q.length < 2) {
    return NextResponse.json({ success: true, sugestoes: [], termo: q });
  }

  const pareceChave = CHAVE_COMPLETA.test(q);
  // alvo=pai restringe às issues que PODEM ser pai. Sem isso a tela sugeriria subtarefas e
  // issues de outros projetos, e a criação falharia só no fim.
  const modoPai = new URL(request.url).searchParams.get('alvo') === 'pai';

  // Em paralelo: a busca direta não atrasa o picker, e vice-versa.
  const [exata, brutasDoPicker] = await Promise.all([
    pareceChave ? porChave(q.toUpperCase()) : Promise.resolve(null),
    peloPicker(q),
  ]);

  // No modo pai os candidatos passam pelo crivo do Jira antes de virarem sugestão.
  const doPicker = modoPai
    ? await apenasCandidatosAPai(brutasDoPicker.map((x) => x.key))
    : brutasDoPicker;

  // No modo pai a exata também passa pelo crivo: uma chave digitada à mão pode ser de outro
  // projeto ou de uma subtarefa, e o motivo da recusa precisa chegar à tela.
  let motivoRecusa: string | null = null;
  let exataValida = exata;
  if (exata && modoPai) {
    if (exata.projeto !== PROJETO_PAI) {
      motivoRecusa = `${exata.key} é do projeto ${exata.projeto}. O pai precisa ser uma demanda do ${PROJETO_PAI}.`;
      exataValida = null;
    } else if (exata.subtarefa) {
      motivoRecusa = `${exata.key} é uma subtarefa e não pode ser pai de outra.`;
      exataValida = null;
    }
  }

  // A exata primeiro, e sem repetir caso o picker também a tenha trazido.
  const sugestoes = exataValida
    ? [exataValida, ...doPicker.filter((s) => s.key !== exataValida.key)]
    : doPicker;

  return NextResponse.json({
    success: true,
    termo: q,
    // Diz ao cliente que a chave foi procurada e não existe — é diferente de "não achei nada
    // parecido", e a tela mostra mensagens diferentes para os dois casos.
    chaveInexistente: pareceChave && !exata,
    motivoRecusa,
    sugestoes: sugestoes.slice(0, 12),
  });
}
