// Single source of truth for how an AI-generated issue's "sections" map to
// Jira wiki-markup panels (server) and to the editable preview UI (client).
// Keeping this in one place avoids the description shown in the preview
// drifting from the description actually sent to Jira.

export type IssueSections = Record<string, string | undefined>;

export interface IssueLike {
  issuetype?: string;
  story_type?: string;
  sections?: IssueSections;
}

/**
 * Todas as chaves de seção que podem aparecer, somando os tipos de issue tratados
 * em sectionDefs(). Fonte única para o schema que restringe a saída da IA — se uma
 * seção nova entrar em sectionDefs e não aqui, a IA não terá como preenchê-la.
 */
export const ALL_SECTION_KEYS = [
  'contexto',
  'descricao_ou_problema',
  'comportamento_esperado_ou_aceite',
  'passos_reproduzir',
  'evidencias',
  'observacoes',
] as const;

export type PanelType = 'info' | 'tip' | 'warning' | 'note';

const PANEL_COLORS: Record<PanelType, string> = {
  info: '#DEEBFF',
  tip: '#E3FCEF',
  warning: '#FFEBE6',
  note: '#EAE6FF',
};

interface SectionDef {
  key: string;
  title: string;
  panelType: PanelType;
  uiColor: string;
}

function sectionDefs(data: IssueLike): SectionDef[] {
  if (data.issuetype === 'Bug') {
    return [
      { key: 'contexto', title: 'Contexto', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'descricao_ou_problema', title: 'Problema', panelType: 'warning', uiColor: '#EF4444' },
      { key: 'passos_reproduzir', title: 'Como replicar', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'evidencias', title: 'Evidências', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'observacoes', title: 'Observações', panelType: 'note', uiColor: '#8B5CF6' },
    ];
  }
  if (data.story_type === 'FEATURE') {
    return [
      { key: 'contexto', title: 'Contexto', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'descricao_ou_problema', title: 'Descrição', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'comportamento_esperado_ou_aceite', title: 'Critérios de aceite', panelType: 'tip', uiColor: '#22C55E' },
      { key: 'observacoes', title: 'Observações', panelType: 'note', uiColor: '#8B5CF6' },
    ];
  }
  if (data.story_type === 'MELHORIA') {
    return [
      { key: 'contexto', title: 'Contexto', panelType: 'info', uiColor: '#3B82F6' },
      { key: 'descricao_ou_problema', title: 'Comportamento atual', panelType: 'warning', uiColor: '#EF4444' },
      { key: 'comportamento_esperado_ou_aceite', title: 'Comportamento esperado', panelType: 'tip', uiColor: '#22C55E' },
      { key: 'observacoes', title: 'Observações', panelType: 'note', uiColor: '#8B5CF6' },
    ];
  }
  return [
    { key: 'contexto', title: 'Contexto', panelType: 'info', uiColor: '#3B82F6' },
    { key: 'descricao_ou_problema', title: 'Descrição', panelType: 'info', uiColor: '#3B82F6' },
    { key: 'observacoes', title: 'Observações', panelType: 'note', uiColor: '#8B5CF6' },
  ];
}

/**
 * Section list for the editable AI-preview UI, labels/colors, non-empty only.
 * `panelType` volta junto para a UI escolher o ícone da seção — este módulo é
 * importado também pelo servidor, então não referencia componentes React.
 */
export function getSectionConfig(
  data: IssueLike,
): { key: string; label: string; color: string; panelType: PanelType }[] {
  const s = data.sections || {};
  return sectionDefs(data)
    .filter(sec => s[sec.key] && String(s[sec.key]).trim())
    .map(sec => ({ key: sec.key, label: sec.title, color: sec.uiColor, panelType: sec.panelType }));
}

/** Jira wiki-markup description ({panel} blocks) built from the same section config. */
export function buildDescription(data: IssueLike): string {
  const s = data.sections || {};
  let desc = '';
  for (const sec of sectionDefs(data)) {
    const raw = s[sec.key];
    const contentStr = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : '';
    if (contentStr && contentStr.trim() !== '' && contentStr !== '{}' && contentStr !== '[]') {
      const color = PANEL_COLORS[sec.panelType];
      desc += `{panel:title=${sec.title}|bgColor=${color}|titleBGColor=${color}}\n${contentStr.trim()}\n{panel}\n\n`;
    }
  }
  return desc.trim();
}
