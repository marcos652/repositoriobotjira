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
    };
  } catch {
    return null;
  }
}

/** Sugestões do autocompletar nativo do Jira. Devolve só key e resumo. */
async function peloPicker(q: string): Promise<Sugestao[]> {
  try {
    // currentJQL vazio: sem ele o picker não pesquisa, só devolve o histórico. Ver o cabeçalho.
    const res = await fetch(
      `${BASE}/rest/api/3/issue/picker?query=${encodeURIComponent(q)}&currentJQL=`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const j = await res.json();
    const brutas: { key?: string; summaryText?: string; summary?: string }[] =
      (j.sections || []).flatMap((s: { issues?: unknown[] }) => s.issues || []);

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
      });
    }
    return saida;
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

  // Em paralelo: a busca direta não atrasa o picker, e vice-versa.
  const [exata, doPicker] = await Promise.all([
    pareceChave ? porChave(q.toUpperCase()) : Promise.resolve(null),
    peloPicker(q),
  ]);

  // A exata primeiro, e sem repetir caso o picker também a tenha trazido.
  const sugestoes = exata
    ? [exata, ...doPicker.filter((s) => s.key !== exata.key)]
    : doPicker;

  return NextResponse.json({
    success: true,
    termo: q,
    // Diz ao cliente que a chave foi procurada e não existe — é diferente de "não achei nada
    // parecido", e a tela mostra mensagens diferentes para os dois casos.
    chaveInexistente: pareceChave && !exata,
    sugestoes: sugestoes.slice(0, 12),
  });
}
