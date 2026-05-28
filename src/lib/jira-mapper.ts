// ============================================
// Jira Data Mapper
// Maps Jira API responses to internal models
// ============================================

import { Issue, Priority, StatusCategory, Module } from '@/types';
import { JiraIssue } from './jira';

// Default status mapping - configurable via settings
const STATUS_CATEGORY_MAP: Record<string, StatusCategory> = {
  'new': 'todo',
  'to do': 'todo',
  'backlog': 'todo',
  'open': 'todo',
  'in progress': 'inprogress',
  'in development': 'inprogress',
  'em andamento': 'inprogress',
  'em atendimento': 'inprogress',
  'em análise': 'inprogress',
  'code review': 'inprogress',
  'review': 'inprogress',
  'qa': 'inprogress',
  'testing': 'inprogress',
  'aguardando cliente': 'inprogress',
  'aguardando terceiro': 'inprogress',
  'blocked': 'inprogress',
  'done': 'done',
  'closed': 'done',
  'resolved': 'done',
  'concluído': 'done',
  'finalizado': 'done',
};

const PRIORITY_MAP: Record<string, Priority> = {
  'highest': 'critical',
  'critical': 'critical',
  'blocker': 'critical',
  'high': 'high',
  'alta': 'high',
  'medium': 'medium',
  'média': 'medium',
  'normal': 'medium',
  'low': 'low',
  'baixa': 'low',
  'lowest': 'low',
  'trivial': 'low',
};

const BLOCKED_STATUSES = ['blocked', 'bloqueado', 'impedido'];
const WAITING_CLIENT = ['aguardando cliente', 'waiting for customer'];
const WAITING_THIRD = ['aguardando terceiro', 'waiting for support', 'aguardando fornecedor'];

export function mapJiraIssue(
  jiraIssue: JiraIssue,
  module: Module = 'support'
): Issue {
  const fields = jiraIssue.fields;
  const statusName = fields.status.name.toLowerCase();
  const priorityName = (fields.priority?.name || 'medium').toLowerCase();

  const now = new Date();
  const created = new Date(fields.created);
  const dueDate = fields.duedate ? new Date(fields.duedate) : undefined;
  const resolved = fields.resolutiondate ? new Date(fields.resolutiondate) : undefined;

  const isOverdue = dueDate ? now > dueDate && !resolved : false;
  const isBlocked = BLOCKED_STATUSES.includes(statusName);

  // Calculate time metrics
  const leadTime = resolved
    ? Math.round((resolved.getTime() - created.getTime()) / 60000)
    : undefined;

  // Category from labels or issue type
  const category = fields.labels?.[0] || fields.issuetype?.name || 'Sem categoria';

  return {
    id: jiraIssue.id,
    jiraKey: jiraIssue.key,
    projectKey: fields.project.key,
    module,
    summary: fields.summary,
    description: typeof fields.description === 'string' ? fields.description : '',
    status: fields.status.name,
    statusCategory: STATUS_CATEGORY_MAP[statusName] || mapJiraStatusCategory(fields.status.statusCategory.key),
    priority: PRIORITY_MAP[priorityName] || 'medium',
    category,
    assignee: fields.assignee?.displayName || 'Não atribuído',
    assigneeEmail: fields.assignee?.emailAddress || '',
    assigneeAvatar: fields.assignee?.avatarUrls?.['48x48'] || '',
    reporter: fields.reporter?.displayName || 'Desconhecido',
    client: '', // Would come from custom field
    sprint: '', // Would come from sprint field
    labels: fields.labels || [],
    created: fields.created,
    updated: fields.updated,
    resolved: fields.resolutiondate || undefined,
    dueDate: fields.duedate || undefined,
    leadTime,
    isBlocked,
    isOverdue,
    isSLAViolated: false, // Calculated separately based on SLA rules
  };
}

function mapJiraStatusCategory(key: string): StatusCategory {
  switch (key) {
    case 'new': return 'todo';
    case 'indeterminate': return 'inprogress';
    case 'done': return 'done';
    default: return 'todo';
  }
}

export function mapPriorityToColor(priority: Priority): string {
  const map: Record<Priority, string> = {
    critical: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#6B7280',
  };
  return map[priority];
}
