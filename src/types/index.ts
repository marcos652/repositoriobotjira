// ============================================
// JiraOps Dashboard - Type Definitions
// ============================================

// --- Jira Core Types ---

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type StatusCategory = 'todo' | 'inprogress' | 'done';
export type Module = 'support' | 'dev';
export type UserRole = 'admin' | 'manager' | 'viewer';

export interface Issue {
  id: string;
  jiraKey: string;
  projectKey: string;
  module: Module;
  summary: string;
  description?: string;
  status: string;
  statusCategory: StatusCategory;
  priority: Priority;
  category: string;
  assignee: string;
  assigneeEmail: string;
  assigneeAvatar?: string;
  reporter: string;
  client?: string;
  sprint?: string;
  labels: string[];
  created: string;
  updated: string;
  resolved?: string;
  dueDate?: string;
  leadTime?: number; // minutes
  cycleTime?: number; // minutes
  timeInStatus?: number; // minutes
  isBlocked: boolean;
  isOverdue: boolean;
  isSLAViolated: boolean;
  storyPoints?: number;
  blockedReason?: string;
}

export interface StatusTransition {
  id: string;
  issueId: string;
  jiraKey: string;
  fromStatus: string;
  toStatus: string;
  userId: string;
  transitionedAt: string;
}

export interface Sprint {
  id: string;
  jiraSprintId: number;
  boardId: string;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  goal?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  projects: string[];
  createdAt: string;
  lastLogin: string;
}

// --- Metric Types ---

export interface SupportMetrics {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  criticalCount: number;
  avgResolutionTime: number; // minutes
  avgResponseTime: number; // minutes
  slaMetPercentage: number;
  slaMetCount: number;
  slaViolatedCount: number;
  waitingClientCount: number;
  waitingThirdPartyCount: number;
  overdueCount: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byClient: Record<string, number>;
  byAssignee: AssigneeMetric[];
  volumeByDate: TimeSeriesData[];
  resolutionByDate: TimeSeriesData[];
  dailyMetrics: DailyMetric[];
}

export interface DevMetrics {
  todoCount: number;
  inProgressCount: number;
  codeReviewCount: number;
  qaCount: number;
  doneCount: number;
  avgLeadTime: number; // minutes
  avgCycleTime: number; // minutes
  avgTimePerTask: number; // minutes
  squadVelocity: number; // story points
  throughput: number; // tasks per week
  blockedCount: number;
  overdueCount: number;
  bugCount: number;
  sprintProgress: number; // percentage
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byAssignee: AssigneeMetric[];
  burndownData: BurndownPoint[];
  velocityData: VelocityPoint[];
  throughputData: TimeSeriesData[];
  bugsByDate: TimeSeriesData[];
  tasksByWeek: TimeSeriesData[];
}

export interface AssigneeMetric {
  name: string;
  email: string;
  avatar?: string;
  completedCount: number;
  inProgressCount: number;
  avgResolutionTime?: number;
  currentTask?: {
    jiraKey: string;
    summary: string;
    status: string;
    timeInStatus: number;
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface DailyMetric {
  date: string;
  opened: number;
  resolved: number;
  inProgress: number;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface VelocityPoint {
  sprint: string;
  committed: number;
  completed: number;
}

// --- Filter Types ---

export type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface Filters {
  dateRange: DateRange;
  customStartDate?: string;
  customEndDate?: string;
  projects: string[];
  squads: string[];
  users: string[];
  statuses: string[];
  categories: string[];
  priorities: Priority[];
}

// --- Live Attendance ---

export interface LiveAttendance {
  assignee: string;
  assigneeAvatar?: string;
  issueKey: string;
  issueSummary: string;
  status: string;
  priority: Priority;
  timeInStatus: number; // minutes
  client?: string;
}

// --- Deploy/Release ---

export interface DeployRecord {
  id: string;
  version: string;
  date: string;
  environment: string;
  status: 'success' | 'failed' | 'rollback';
  author: string;
  description: string;
  issuesCount: number;
}

// --- Settings ---

export interface AppSettings {
  slaRules: Record<Priority, number>; // minutes
  supportProjects: string[];
  devProjects: string[];
  statusMapping: {
    todo: string[];
    inProgress: string[];
    codeReview: string[];
    qa: string[];
    done: string[];
    waitingClient: string[];
    waitingThirdParty: string[];
    blocked: string[];
  };
  syncIntervalSeconds: number;
  jiraDomain: string;
}
