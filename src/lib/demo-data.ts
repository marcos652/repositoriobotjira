// ============================================
// Demo Data for JiraOps Dashboard
// Realistic mock data for preview/development
// ============================================

import {
  Issue, Sprint, SupportMetrics, DevMetrics, AssigneeMetric,
  TimeSeriesData, BurndownPoint, VelocityPoint, LiveAttendance,
  DeployRecord, DailyMetric
} from '@/types';

// --- Helpers ---
const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// --- Team Members ---
export const supportTeam = [
  { name: 'Ana Silva', email: 'ana@company.com', avatar: '' },
  { name: 'Bruno Costa', email: 'bruno@company.com', avatar: '' },
  { name: 'Carla Mendes', email: 'carla@company.com', avatar: '' },
  { name: 'Diego Alves', email: 'diego@company.com', avatar: '' },
  { name: 'Elena Rocha', email: 'elena@company.com', avatar: '' },
];

export const devTeam = [
  { name: 'Felipe Santos', email: 'felipe@company.com', avatar: '' },
  { name: 'Gabriela Lima', email: 'gabriela@company.com', avatar: '' },
  { name: 'Henrique Martins', email: 'henrique@company.com', avatar: '' },
  { name: 'Isabela Ferreira', email: 'isabela@company.com', avatar: '' },
  { name: 'João Oliveira', email: 'joao@company.com', avatar: '' },
  { name: 'Karina Souza', email: 'karina@company.com', avatar: '' },
];

// --- Support Metrics ---
export const supportMetrics: SupportMetrics = {
  openCount: 47,
  inProgressCount: 23,
  resolvedCount: 156,
  criticalCount: 5,
  avgResolutionTime: 285, // ~4.75 hours
  avgResponseTime: 18, // ~18 minutes
  slaMetPercentage: 87.5,
  slaMetCount: 137,
  slaViolatedCount: 19,
  waitingClientCount: 12,
  waitingThirdPartyCount: 8,
  overdueCount: 7,
  byCategory: {
    'Bug': 42,
    'Acesso': 28,
    'Dúvida': 35,
    'Configuração': 22,
    'Infraestrutura': 18,
    'Performance': 15,
    'Integração': 12,
    'Outro': 8,
  },
  byPriority: {
    'critical': 5,
    'high': 18,
    'medium': 32,
    'low': 15,
  },
  byClient: {
    'Empresa Alpha': 24,
    'Beta Corp': 18,
    'Gamma Ltda': 15,
    'Delta S.A.': 12,
    'Epsilon Tech': 9,
    'Zeta Group': 7,
  },
  byAssignee: supportTeam.map((member, i) => ({
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    completedCount: [38, 34, 31, 28, 25][i],
    inProgressCount: [5, 4, 6, 4, 4][i],
    avgResolutionTime: [240, 260, 300, 310, 280][i],
    currentTask: i < 3 ? {
      jiraKey: `SUP-${200 + i}`,
      summary: ['Erro de login no portal', 'Relatório não carrega', 'Integração com SAP parada'][i],
      status: ['Em Atendimento', 'Aguardando Info', 'Em Análise'][i],
      timeInStatus: [45, 120, 30][i],
    } : undefined,
  })),
  volumeByDate: Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    value: randomBetween(4, 16),
  })),
  resolutionByDate: Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    value: randomBetween(3, 14),
  })),
  dailyMetrics: Array.from({ length: 7 }, (_, i) => ({
    date: daysAgo(6 - i),
    opened: randomBetween(5, 15),
    resolved: randomBetween(4, 13),
    inProgress: randomBetween(8, 20),
  })),
};

// --- Dev Metrics ---
export const currentSprint: Sprint = {
  id: 'sprint-42',
  jiraSprintId: 42,
  boardId: 'board-1',
  name: 'Sprint 42 - Feature Release',
  state: 'active',
  startDate: daysAgo(8),
  endDate: new Date(today.getTime() + 6 * 86400000).toISOString(),
  committedPoints: 55,
  completedPoints: 34,
  goal: 'Entregar módulo de relatórios e corrigir bugs críticos',
};

export const devMetrics: DevMetrics = {
  todoCount: 8,
  inProgressCount: 12,
  codeReviewCount: 5,
  qaCount: 4,
  doneCount: 34,
  avgLeadTime: 4320, // 3 days in minutes
  avgCycleTime: 2160, // 1.5 days in minutes
  avgTimePerTask: 480, // 8 hours
  squadVelocity: 52,
  throughput: 18,
  blockedCount: 3,
  overdueCount: 4,
  bugCount: 11,
  sprintProgress: 62,
  byCategory: {
    'Feature': 22,
    'Bug Fix': 11,
    'Tech Debt': 8,
    'Improvement': 7,
    'Hotfix': 5,
    'Documentation': 3,
  },
  byPriority: {
    'critical': 3,
    'high': 12,
    'medium': 28,
    'low': 15,
  },
  byAssignee: devTeam.map((member, i) => ({
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    completedCount: [8, 7, 6, 5, 5, 3][i],
    inProgressCount: [2, 2, 3, 2, 1, 2][i],
    avgResolutionTime: [420, 480, 390, 540, 510, 600][i],
    currentTask: {
      jiraKey: `DEV-${300 + i}`,
      summary: [
        'Implementar dashboard de métricas',
        'Refatorar módulo de autenticação',
        'Corrigir bug no cálculo de SLA',
        'Criar endpoint de exportação',
        'Otimizar queries do Firestore',
        'Documentar API de integração',
      ][i],
      status: ['In Progress', 'Code Review', 'In Progress', 'QA', 'In Progress', 'Code Review'][i],
      timeInStatus: [120, 45, 280, 90, 60, 30][i],
    },
  })),
  burndownData: (() => {
    const totalPoints = 55;
    const sprintDays = 14;
    const idealPerDay = totalPoints / sprintDays;
    return Array.from({ length: 9 }, (_, i) => ({
      date: daysAgo(8 - i),
      ideal: Math.max(0, Math.round((totalPoints - idealPerDay * i) * 10) / 10),
      actual: Math.max(0, totalPoints - [0, 3, 7, 10, 14, 17, 19, 20, 21][i]),
    }));
  })(),
  velocityData: [
    { sprint: 'Sprint 37', committed: 45, completed: 42 },
    { sprint: 'Sprint 38', committed: 50, completed: 46 },
    { sprint: 'Sprint 39', committed: 48, completed: 48 },
    { sprint: 'Sprint 40', committed: 52, completed: 50 },
    { sprint: 'Sprint 41', committed: 55, completed: 52 },
    { sprint: 'Sprint 42', committed: 55, completed: 34 },
  ],
  throughputData: Array.from({ length: 12 }, (_, i) => ({
    date: `Sem ${i + 1}`,
    value: randomBetween(12, 24),
  })),
  bugsByDate: Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    value: randomBetween(0, 4),
  })),
  tasksByWeek: Array.from({ length: 8 }, (_, i) => ({
    date: `Sem ${i + 1}`,
    value: randomBetween(14, 22),
  })),
};

// --- Live Attendance (Support) ---
export const liveAttendance: LiveAttendance[] = [
  {
    assignee: 'Ana Silva',
    assigneeAvatar: '',
    issueKey: 'SUP-201',
    issueSummary: 'Erro crítico no módulo de pagamentos',
    status: 'Em Atendimento',
    priority: 'critical',
    timeInStatus: 45,
    client: 'Empresa Alpha',
  },
  {
    assignee: 'Bruno Costa',
    assigneeAvatar: '',
    issueKey: 'SUP-198',
    issueSummary: 'Relatório financeiro não carrega dados',
    status: 'Aguardando Info',
    priority: 'high',
    timeInStatus: 120,
    client: 'Beta Corp',
  },
  {
    assignee: 'Carla Mendes',
    assigneeAvatar: '',
    issueKey: 'SUP-205',
    issueSummary: 'Integração com SAP retornando timeout',
    status: 'Em Análise',
    priority: 'high',
    timeInStatus: 30,
    client: 'Gamma Ltda',
  },
  {
    assignee: 'Diego Alves',
    assigneeAvatar: '',
    issueKey: 'SUP-210',
    issueSummary: 'Usuário não consegue alterar senha',
    status: 'Em Atendimento',
    priority: 'medium',
    timeInStatus: 15,
    client: 'Delta S.A.',
  },
  {
    assignee: 'Elena Rocha',
    assigneeAvatar: '',
    issueKey: 'SUP-212',
    issueSummary: 'Dashboard de vendas com dados incorretos',
    status: 'Em Análise',
    priority: 'medium',
    timeInStatus: 55,
    client: 'Epsilon Tech',
  },
];

// --- Critical & Overdue Tickets ---
export const criticalTickets: Issue[] = [
  {
    id: '1', jiraKey: 'SUP-201', projectKey: 'SUP', module: 'support',
    summary: 'Erro crítico no módulo de pagamentos', status: 'Em Atendimento',
    statusCategory: 'inprogress', priority: 'critical', category: 'Bug',
    assignee: 'Ana Silva', assigneeEmail: 'ana@company.com', reporter: 'Cliente',
    client: 'Empresa Alpha', labels: ['pagamentos', 'produção'],
    created: daysAgo(0), updated: daysAgo(0), isBlocked: false, isOverdue: false,
    isSLAViolated: false, timeInStatus: 45,
  },
  {
    id: '2', jiraKey: 'SUP-199', projectKey: 'SUP', module: 'support',
    summary: 'Sistema fora do ar para múltiplos clientes', status: 'Escalado',
    statusCategory: 'inprogress', priority: 'critical', category: 'Infraestrutura',
    assignee: 'Bruno Costa', assigneeEmail: 'bruno@company.com', reporter: 'Monitoring',
    client: 'Múltiplos', labels: ['infraestrutura', 'urgente'],
    created: daysAgo(1), updated: daysAgo(0), isBlocked: false, isOverdue: true,
    isSLAViolated: true, timeInStatus: 180,
  },
];

export const overdueTickets: Issue[] = [
  {
    id: '3', jiraKey: 'SUP-185', projectKey: 'SUP', module: 'support',
    summary: 'Migração de dados do cliente não finalizada', status: 'Em Análise',
    statusCategory: 'inprogress', priority: 'high', category: 'Configuração',
    assignee: 'Diego Alves', assigneeEmail: 'diego@company.com', reporter: 'PM',
    client: 'Beta Corp', labels: ['migração'], dueDate: daysAgo(2),
    created: daysAgo(5), updated: daysAgo(1), isBlocked: false, isOverdue: true,
    isSLAViolated: true, timeInStatus: 480,
  },
  {
    id: '4', jiraKey: 'SUP-178', projectKey: 'SUP', module: 'support',
    summary: 'Configuração de SSO pendente há 5 dias', status: 'Aguardando Terceiro',
    statusCategory: 'inprogress', priority: 'medium', category: 'Acesso',
    assignee: 'Elena Rocha', assigneeEmail: 'elena@company.com', reporter: 'Cliente',
    client: 'Gamma Ltda', labels: ['sso', 'acesso'], dueDate: daysAgo(3),
    created: daysAgo(7), updated: daysAgo(2), isBlocked: true, isOverdue: true,
    isSLAViolated: true, timeInStatus: 2880, blockedReason: 'Aguardando provedor de identidade',
  },
];

// --- Blocked Tasks (Dev) ---
export const blockedTasks: Issue[] = [
  {
    id: '10', jiraKey: 'DEV-289', projectKey: 'DEV', module: 'dev',
    summary: 'API de integração com parceiro bloqueada', status: 'Blocked',
    statusCategory: 'inprogress', priority: 'high', category: 'Feature',
    assignee: 'Henrique Martins', assigneeEmail: 'henrique@company.com', reporter: 'Tech Lead',
    labels: ['integração', 'bloqueado'], sprint: 'Sprint 42',
    created: daysAgo(3), updated: daysAgo(0), isBlocked: true, isOverdue: false,
    isSLAViolated: false, timeInStatus: 960,
    blockedReason: 'Dependência de API externa sem documentação',
  },
  {
    id: '11', jiraKey: 'DEV-295', projectKey: 'DEV', module: 'dev',
    summary: 'Deploy em staging falhando por conflito de dependências', status: 'Blocked',
    statusCategory: 'inprogress', priority: 'critical', category: 'Bug Fix',
    assignee: 'Felipe Santos', assigneeEmail: 'felipe@company.com', reporter: 'DevOps',
    labels: ['deploy', 'ci-cd'], sprint: 'Sprint 42',
    created: daysAgo(1), updated: daysAgo(0), isBlocked: true, isOverdue: false,
    isSLAViolated: false, timeInStatus: 300,
    blockedReason: 'Conflito de versão do Node.js no pipeline',
  },
  {
    id: '12', jiraKey: 'DEV-301', projectKey: 'DEV', module: 'dev',
    summary: 'Migração de banco de dados aguardando aprovação do DBA', status: 'Blocked',
    statusCategory: 'inprogress', priority: 'medium', category: 'Tech Debt',
    assignee: 'Gabriela Lima', assigneeEmail: 'gabriela@company.com', reporter: 'Tech Lead',
    labels: ['database', 'migration'], sprint: 'Sprint 42',
    created: daysAgo(2), updated: daysAgo(0), isBlocked: true, isOverdue: false,
    isSLAViolated: false, timeInStatus: 1440,
    blockedReason: 'Aguardando janela de manutenção',
  },
];

// --- Deploy History ---
export const deployHistory: DeployRecord[] = [
  { id: '1', version: 'v2.14.0', date: daysAgo(0), environment: 'Production', status: 'success', author: 'Felipe Santos', description: 'Módulo de relatórios + correções de bugs', issuesCount: 8 },
  { id: '2', version: 'v2.13.2', date: daysAgo(3), environment: 'Production', status: 'success', author: 'Henrique Martins', description: 'Hotfix: correção de cálculo de SLA', issuesCount: 2 },
  { id: '3', version: 'v2.13.1', date: daysAgo(5), environment: 'Production', status: 'rollback', author: 'João Oliveira', description: 'Revertido: problema de performance em produção', issuesCount: 5 },
  { id: '4', version: 'v2.13.0', date: daysAgo(7), environment: 'Production', status: 'success', author: 'Gabriela Lima', description: 'Nova integração com gateway de pagamento', issuesCount: 12 },
  { id: '5', version: 'v2.12.0', date: daysAgo(14), environment: 'Production', status: 'success', author: 'Isabela Ferreira', description: 'Refatoração do módulo de autenticação', issuesCount: 6 },
];

// --- Bottleneck Analysis ---
export const bottleneckData = [
  { status: 'Code Review', count: 5, avgTime: 480 },
  { status: 'QA', count: 4, avgTime: 360 },
  { status: 'Blocked', count: 3, avgTime: 960 },
  { status: 'In Progress', count: 12, avgTime: 240 },
  { status: 'To Do', count: 8, avgTime: 120 },
];
