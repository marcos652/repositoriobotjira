// ============================================
//  ADF (Atlassian Document Format) -> texto
// ============================================
//
// `description` e o corpo dos comentários chegam do Jira como um documento em árvore
// (`{ type, version, content }`), nunca como string. Jogar esse objeto direto num JSX quebra
// com "Objects are not valid as a React child", e `JSON.stringify` mostra o rascunho cru para
// o usuário — por isso a conversão vive aqui, num lugar só, usada pela API e pela tela.

interface NoADF {
  type?: string;
  text?: string;
  attrs?: { text?: string; state?: string };
  content?: unknown[];
}

/** Achata um documento ADF (ou uma string já pronta) em texto legível. */
export function adfToText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);

  const n = node as NoADF;
  if (n.type === 'text') return n.text || '';
  if (n.type === 'hardBreak') return '\n';
  if (n.type === 'mention') return n.attrs?.text || '@user';

  let text = '';
  if (Array.isArray(n.content)) {
    text = n.content.map((child) => adfToText(child)).join('');
  }
  // Todo nó de bloco fecha com quebra de linha. `taskList`/`taskItem` (os checklists do Jira)
  // faltavam nesta lista, e sem elas um checklist de 24 itens saía como um parágrafo único.
  const BLOCOS = [
    'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'rule',
    'taskList', 'taskItem', 'codeBlock', 'panel', 'tableRow', 'decisionList', 'decisionItem',
  ];
  if (BLOCOS.includes(n.type || '')) text += '\n';
  if (n.type === 'listItem' || n.type === 'decisionItem') text = '• ' + text;
  // Checklist marcado/desmarcado, para o texto refletir o estado do item.
  if (n.type === 'taskItem') text = (n.attrs?.state === 'DONE' ? '[x] ' : '[ ] ') + text;
  // Célula de tabela separada da vizinha, senão os valores colam.
  if (n.type === 'tableCell' || n.type === 'tableHeader') text += '\t';
  return text;
}
