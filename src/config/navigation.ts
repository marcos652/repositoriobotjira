import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Code2,
  FileBarChart,
  GitBranch,
  Globe,
  Headphones,
  Kanban,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Rocket,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  keywords?: string[];
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, description: 'Visão geral de todos os times', keywords: ['home', 'início'] },
      { label: 'Nova Demanda', href: '/dashboard/nova-demanda', icon: Sparkles, description: 'Crie demandas com apoio de IA', keywords: ['criar', 'novo', 'jira'] },
      { label: 'Consultar Demanda', href: '/dashboard/consultar-demanda', icon: Search, description: 'Busque e edite demandas', keywords: ['buscar', 'editar', 'jira'] },
      { label: 'Suporte', href: '/dashboard/suporte', icon: Headphones, description: 'Operação de atendimento' },
      { label: 'Desenvolvimento', href: '/dashboard/dev', icon: Code2, description: 'Engenharia e sprint' },
      { label: 'Slack', href: '/dashboard/slack', icon: MessageSquare, description: 'Mensagens e canais' },
      { label: 'Webmail', href: '/dashboard/webmail', icon: Mail, description: 'E-mail corporativo' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Backlog', href: '/dashboard/backlog', icon: ClipboardList, description: 'Itens a priorizar' },
      { label: 'Kanban', href: '/dashboard/kanban', icon: Kanban, description: 'Fluxo visual das tarefas' },
      { label: 'Calendário', href: '/dashboard/calendario', icon: CalendarDays, description: 'Sprints e prazos' },
      { label: 'Implantação', href: '/dashboard/implantacao', icon: Rocket, description: 'Onboarding de clientes' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { label: 'Métricas', href: '/dashboard/metricas', icon: BarChart3, description: 'Indicadores de performance' },
      { label: 'Relatórios', href: '/dashboard/relatorios', icon: FileBarChart, description: 'Relatórios e exportações' },
      { label: 'SLA / Contratos', href: '/dashboard/sla', icon: Shield, description: 'Níveis de serviço' },
      { label: 'Equipe', href: '/dashboard/equipe', icon: Users, description: 'Gestão e performance do time' },
      { label: 'Releases', href: '/dashboard/releases', icon: GitBranch, description: 'Versões e deploys' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Clientes', href: '/dashboard/clientes', icon: Building2, description: 'Contas e clientes' },
      { label: 'Base de Conhecimento', href: '/dashboard/knowledge', icon: BookOpen, description: 'Documentação interna' },
      { label: 'Automações', href: '/dashboard/automacoes', icon: Bot, description: 'Regras e workflows' },
      { label: 'Integrações', href: '/dashboard/integracoes', icon: Zap, description: 'Conexões externas' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Logs / Auditoria', href: '/dashboard/logs', icon: ScrollText, description: 'Eventos e histórico' },
      { label: 'Notificações', href: '/dashboard/notificacoes', icon: Bell, description: 'Alertas recentes' },
      { label: 'Usuários', href: '/dashboard/usuarios', icon: Users, description: 'Acesso dos usuários' },
      { label: 'Gerenciar IPs', href: '/dashboard/ips', icon: Globe, description: 'Controle de endereços IP' },
    ],
  },
];

export const settingsNavigationItem: NavigationItem = {
  label: 'Configurações',
  href: '/dashboard/configuracoes',
  icon: Settings,
  description: 'Preferências gerais do sistema',
};

export const allNavigationItems = [
  ...navigationSections.flatMap((section) => section.items),
  settingsNavigationItem,
];

export function getNavigationItem(pathname: string): NavigationItem | undefined {
  return [...allNavigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href));
}
