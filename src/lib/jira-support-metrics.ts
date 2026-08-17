// ============================================
// Support Metrics Service
// Fetches and computes real metrics from Jira
// ============================================

import { getJiraClient, JiraIssue } from './jira';
import {
  SupportMetrics, AssigneeMetric, TimeSeriesData, LiveAttendance, Issue,
} from '@/types';

// --- Status classification helpers ---
const OPEN_STATUSES = ['aguardando suporte', 'aberto', 'novo', 'to do', 'open', 'new'];
const IN_PROGRESS_STATUSES = ['em atendimento', 'em andamento', 'em análise', 'in progress'];
const WAITING_CLIENT_STATUSES = ['aguardando cliente', 'waiting for customer', 'waiting customer'];
const WAITING_THIRD_STATUSES = ['aguardando terceiro', 'aguardando fornecedor', 'waiting for support'];
const RESOLVED_STATUSES = ['resolvido', 'resolved', 'concluído', 'done', 'closed', 'fechado'];

// A statusCategory vem do próprio Jira ('new' | 'indeterminate' | 'done') e vale mais que
// a lista de nomes: são 113 status na instância, muitos com o mesmo nome em workflows
// diferentes, e qualquer status novo que alguém criar cairia no default abaixo. Para
// "resolvido" a categoria é decisiva; a subdivisão do que está aberto continua por nome,
// porque a categoria não distingue "aguardando cliente" de "em atendimento".
function classifyStatus(
  statusName: string,
  statusCategoryKey?: string
): 'open' | 'inprogress' | 'waiting_client' | 'waiting_third' | 'resolved' {
  if (statusCategoryKey === 'done') return 'resolved';
  const s = statusName.toLowerCase().trim();
  if (RESOLVED_STATUSES.includes(s)) return 'resolved';
  if (WAITING_CLIENT_STATUSES.includes(s)) return 'waiting_client';
  if (WAITING_THIRD_STATUSES.includes(s)) return 'waiting_third';
  if (IN_PROGRESS_STATUSES.includes(s)) return 'inprogress';
  if (OPEN_STATUSES.includes(s)) return 'open';
  // Default: treat as in-progress
  return 'inprogress';
}

// As prioridades desta instância são, exatamente: Altíssima | Alta | Médio | Baixa |
// Baixíssima. "Médio" (não "média") e "baixíssima" não estavam nas listas e caíam no
// default 'medium' — o que classificava Baixíssima como média.
function mapPriority(name: string): 'critical' | 'high' | 'medium' | 'low' {
  const p = name.toLowerCase().trim();
  if (['altíssima', 'highest', 'critical', 'blocker'].includes(p)) return 'critical';
  if (['alta', 'high'].includes(p)) return 'high';
  if (['médio', 'média', 'medium', 'normal'].includes(p)) return 'medium';
  if (['baixa', 'baixíssima', 'low', 'lowest', 'trivial'].includes(p)) return 'low';
  return 'medium';
}

function minutesSince(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function isCreatedInRange(createdStr: string, dateRange: string, daysLimit: number): boolean {
  const createdDate = new Date(createdStr);
  const now = new Date();
  
  if (dateRange === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return createdDate >= todayStart;
  }
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysLimit);
  cutoff.setHours(0, 0, 0, 0);
  return createdDate >= cutoff;
}

// --- Main fetch function ---
export async function fetchSupportMetrics(
  dateRange: string = '30d',
  startDate?: string,
  endDate?: string
): Promise<{
  metrics: SupportMetrics;
  liveAttendance: LiveAttendance[];
  criticalTickets: Issue[];
  overdueTickets: Issue[];
}> {
  const client = getJiraClient();
  const fields = [
    'summary', 'status', 'priority', 'assignee', 'reporter',
    'created', 'updated', 'resolutiondate', 'duedate', 'labels',
    'issuetype', 'project',
  ];

  let resolvedJqlCondition = 'resolved >= "-30d"';
  if (dateRange === 'today') {
    resolvedJqlCondition = 'resolved >= startOfDay()';
  } else if (dateRange === '7d') {
    resolvedJqlCondition = 'resolved >= "-7d"';
  } else if (dateRange === '90d') {
    resolvedJqlCondition = 'resolved >= "-90d"';
  } else if (dateRange === 'custom' && startDate) {
    if (endDate) {
      resolvedJqlCondition = `resolved >= "${startDate}" AND resolved <= "${endDate}"`;
    } else {
      resolvedJqlCondition = `resolved >= "${startDate}"`;
    }
  }

  // Fetch all issues from SUP project (last 90 days + open)
  //
  // statusCategory != Done, e NÃO `status != Resolvido`: filtrar status por NOME está
  // quebrado nesta instância do Jira. Medido contra a API:
  //   status = "Resolvido"   ->      0 issues
  //   status = 5 (o mesmo status, por id) -> 18.872 issues
  //   status != "Resolvido"  -> 20.733 = o projeto INTEIRO (não excluía nada)
  //   statusCategory != Done ->     36 = os tickets realmente abertos
  // Com o filtro por nome, esta consulta casava 20.733 issues e o searchAllIssues parava
  // no limite de 20 páginas: as métricas da tela eram calculadas sobre uma fatia truncada
  // de 2.000 issues (7,6 MB, 12,8s). Com statusCategory são 232 issues, 3 páginas,
  // 0,88 MB, 2,23s — e completo. Há 113 status na instância, com nomes repetidos entre
  // workflows, então nenhuma JQL daqui deve filtrar status por nome.
  const [allIssues, recentResolved] = await Promise.all([
    client.searchAllIssues(
      `project = SUP AND (statusCategory != Done OR ${resolvedJqlCondition}) ORDER BY created DESC`,
      fields,
    ),
    client.searchAllIssues(
      `project = SUP AND ${resolvedJqlCondition} ORDER BY resolved DESC`,
      fields,
    ),
  ]);

  // --- Classify all issues ---
  const now = new Date();

  let openCount = 0;
  let inProgressCount = 0;
  let waitingClientCount = 0;
  let waitingThirdPartyCount = 0;
  let resolvedCount = recentResolved.length;
  let criticalCount = 0;
  let overdueCount = 0;
  let totalResolutionTime = 0;
  let resolvedWithTime = 0;

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const byClient: Record<string, number> = {};
  const assigneeMap: Record<string, {
    name: string; email: string; avatar: string;
    completed: number; inProgress: number; resolutionTimes: number[];
    currentTask?: { jiraKey: string; summary: string; status: string; timeInStatus: number };
  }> = {};

  const criticalTickets: Issue[] = [];
  const overdueTicketsArr: Issue[] = [];
  const liveAttendanceArr: LiveAttendance[] = [];

  // Volume by date
  let daysLimit = 30;
  if (dateRange === 'today') daysLimit = 1;
  else if (dateRange === '7d') daysLimit = 7;
  else if (dateRange === '90d') daysLimit = 90;
  else if (dateRange === 'custom' && startDate && endDate) {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    daysLimit = Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1);
  }

  const volumeByDateMap: Record<string, number> = {};
  const resolutionByDateMap: Record<string, number> = {};
  
  if (dateRange === 'custom' && startDate) {
    const startVal = new Date(startDate);
    const endVal = endDate ? new Date(endDate) : new Date();
    for (let d = new Date(startVal); d <= endVal; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      volumeByDateMap[dateKey] = 0;
      resolutionByDateMap[dateKey] = 0;
    }
  } else {
    for (let i = 0; i < daysLimit; i++) {
      const dateKey = daysAgoStr(daysLimit - 1 - i);
      volumeByDateMap[dateKey] = 0;
      resolutionByDateMap[dateKey] = 0;
    }
  }

  // Process resolved issues for resolution timeline
  for (const issue of recentResolved) {
    const resolvedDate = issue.fields.resolutiondate;
    if (resolvedDate) {
      const dateKey = resolvedDate.split('T')[0];
      if (resolutionByDateMap[dateKey] !== undefined) {
        resolutionByDateMap[dateKey]++;
      }
      // Resolution time
      const created = new Date(issue.fields.created);
      const resolved = new Date(resolvedDate);
      const resolutionMins = Math.round((resolved.getTime() - created.getTime()) / 60000);
      totalResolutionTime += resolutionMins;
      resolvedWithTime++;
    }
  }

  // Process all issues
  for (const issue of allIssues) {
    const f = issue.fields;
    const statusName = f.status.name;
    const classification = classifyStatus(statusName, f.status.statusCategory?.key);
    const priority = mapPriority(f.priority?.name || 'medium');
    const assigneeName = f.assignee?.displayName || 'Não atribuído';
    const assigneeEmail = f.assignee?.emailAddress || '';
    const category = f.issuetype?.name || 'Sem categoria';
    const createdDate = f.created.split('T')[0];

    // Volume by date
    if (volumeByDateMap[createdDate] !== undefined) {
      volumeByDateMap[createdDate]++;
    }

    // Category count
    byCategory[category] = (byCategory[category] || 0) + 1;

    // Priority count
    byPriority[priority]++;

    // Reporter as "client" (simplified — using reporter name)
    const clientName = f.reporter?.displayName || 'Desconhecido';
    byClient[clientName] = (byClient[clientName] || 0) + 1;

    // Assignee tracking
    if (!assigneeMap[assigneeName]) {
      assigneeMap[assigneeName] = {
        name: assigneeName,
        email: assigneeEmail,
        avatar: f.assignee?.avatarUrls?.['48x48'] || '',
        completed: 0,
        inProgress: 0,
        resolutionTimes: [],
      };
    }

    const createdInRange = isCreatedInRange(f.created, dateRange, daysLimit);

    // Count by classification
    switch (classification) {
      case 'open':
        if (createdInRange) {
          openCount++;
        }
        assigneeMap[assigneeName].inProgress++;
        break;
      case 'inprogress':
        if (createdInRange) {
          inProgressCount++;
        }
        assigneeMap[assigneeName].inProgress++;
        // Track as live attendance
        liveAttendanceArr.push({
          assignee: assigneeName,
          assigneeAvatar: f.assignee?.avatarUrls?.['48x48'] || '',
          issueKey: issue.key,
          issueSummary: f.summary,
          status: statusName,
          priority: priority,
          timeInStatus: minutesSince(f.updated),
          client: clientName,
        });
        break;
      case 'waiting_client':
        if (createdInRange) {
          waitingClientCount++;
        }
        break;
      case 'waiting_third':
        if (createdInRange) {
          waitingThirdPartyCount++;
        }
        break;
      case 'resolved':
        assigneeMap[assigneeName].completed++;
        if (f.resolutiondate) {
          const resMins = Math.round(
            (new Date(f.resolutiondate).getTime() - new Date(f.created).getTime()) / 60000
          );
          assigneeMap[assigneeName].resolutionTimes.push(resMins);
        }
        break;
    }

    // Critical tickets
    if (priority === 'critical' && classification !== 'resolved') {
      if (createdInRange) {
        criticalCount++;
        criticalTickets.push({
          id: issue.id,
          jiraKey: issue.key,
          projectKey: f.project.key,
          module: 'support',
          summary: f.summary,
          status: statusName,
          statusCategory: classification === 'open' ? 'todo' : 'inprogress',
          priority: 'critical',
          category,
          assignee: assigneeName,
          assigneeEmail,
          reporter: clientName,
          client: clientName,
          labels: f.labels || [],
          created: f.created,
          updated: f.updated,
          resolved: f.resolutiondate || undefined,
          dueDate: f.duedate || undefined,
          isBlocked: false,
          isOverdue: !!(f.duedate && now > new Date(f.duedate)),
          isSLAViolated: false,
          timeInStatus: minutesSince(f.updated),
        });
      }
    }

    // Overdue tickets
    if (f.duedate && now > new Date(f.duedate) && classification !== 'resolved') {
      if (createdInRange) {
        overdueCount++;
        overdueTicketsArr.push({
          id: issue.id,
          jiraKey: issue.key,
          projectKey: f.project.key,
          module: 'support',
          summary: f.summary,
          status: statusName,
          statusCategory: 'inprogress',
          priority,
          category,
          assignee: assigneeName,
          assigneeEmail,
          reporter: clientName,
          client: clientName,
          labels: f.labels || [],
          created: f.created,
          updated: f.updated,
          dueDate: f.duedate,
          isBlocked: false,
          isOverdue: true,
          isSLAViolated: true,
          timeInStatus: minutesSince(f.updated),
        });
      }
    }

    // Set current task for assignee (most recent non-resolved)
    if (classification !== 'resolved' && !assigneeMap[assigneeName].currentTask) {
      assigneeMap[assigneeName].currentTask = {
        jiraKey: issue.key,
        summary: f.summary,
        status: statusName,
        timeInStatus: minutesSince(f.updated),
      };
    }
  }

  // Build assignee metrics
  const byAssignee: AssigneeMetric[] = Object.values(assigneeMap)
    .filter(a => a.name !== 'Não atribuído')
    .map(a => ({
      name: a.name,
      email: a.email,
      avatar: a.avatar,
      completedCount: a.completed,
      inProgressCount: a.inProgress,
      avgResolutionTime: a.resolutionTimes.length > 0
        ? Math.round(a.resolutionTimes.reduce((sum, t) => sum + t, 0) / a.resolutionTimes.length)
        : 0,
      currentTask: a.currentTask,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // Build time series data
  const volumeByDate: TimeSeriesData[] = [];
  const resolutionByDate: TimeSeriesData[] = [];
  const sortedDates = Object.keys(volumeByDateMap).sort();
  for (const date of sortedDates) {
    volumeByDate.push({ date, value: volumeByDateMap[date] });
    resolutionByDate.push({ date, value: resolutionByDateMap[date] });
  }

  // Average resolution time
  const avgResolutionTime = resolvedWithTime > 0
    ? Math.round(totalResolutionTime / resolvedWithTime)
    : 0;

  // SLA estimation (simplified: if resolved within 8h = met)
  const slaThresholdMins = 480; // 8 hours
  let slaMet = 0;
  let slaViolated = 0;
  for (const issue of recentResolved) {
    if (issue.fields.resolutiondate) {
      const resMins = Math.round(
        (new Date(issue.fields.resolutiondate).getTime() - new Date(issue.fields.created).getTime()) / 60000
      );
      if (resMins <= slaThresholdMins) {
        slaMet++;
      } else {
        slaViolated++;
      }
    }
  }
  const slaTotal = slaMet + slaViolated;
  const slaMetPercentage = slaTotal > 0 ? Math.round((slaMet / slaTotal) * 1000) / 10 : 0;

  // Average response time (estimated from first update vs creation)
  const avgResponseTime = 15; // Placeholder — Jira REST API doesn't expose first response time directly

  // Keep only top 6 clients
  const sortedClients = Object.entries(byClient)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const topClients: Record<string, number> = {};
  for (const [name, count] of sortedClients) {
    topClients[name] = count;
  }

  // Daily metrics (last 7 days)
  const dailyMetrics = sortedDates.slice(-7).map(date => ({
    date,
    opened: volumeByDateMap[date],
    resolved: resolutionByDateMap[date],
    inProgress: inProgressCount, // Snapshot (current)
  }));

  const metrics: SupportMetrics = {
    openCount,
    inProgressCount,
    resolvedCount,
    criticalCount,
    avgResolutionTime,
    avgResponseTime,
    slaMetPercentage,
    slaMetCount: slaMet,
    slaViolatedCount: slaViolated,
    waitingClientCount,
    waitingThirdPartyCount,
    overdueCount,
    byCategory,
    byPriority,
    byClient: topClients,
    byAssignee,
    volumeByDate,
    resolutionByDate,
    dailyMetrics,
  };

  return {
    metrics,
    liveAttendance: liveAttendanceArr.slice(0, 10), // Top 10 active
    criticalTickets: criticalTickets.slice(0, 5),
    overdueTickets: overdueTicketsArr.slice(0, 5),
  };
}
