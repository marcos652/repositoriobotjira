// ============================================
// Metrics Dynamic Filtering Utility
// Slices time series and scales counts to simulate
// date range filters for demo/cached data
// ============================================

export function filterSummaryMetrics(type: 'support' | 'dev', data: any, range: string, start?: string, end?: string) {
  if (!data) return data;
  
  // Deep clone to avoid mutating local caches
  const cloned = JSON.parse(JSON.stringify(data));
  const metrics = cloned.metrics;
  if (!metrics) return cloned;

  let days = 30;
  if (range === 'today') days = 1;
  else if (range === '7d') days = 7;
  else if (range === '90d') days = 90;
  else if (range === 'custom' && start && end) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    days = Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1);
  }

  // Calculate scaling factor based on days (default reference is 30 days)
  const ratio = days / 30;
  
  const factors: Record<string, number> = {
    today: 0.3,
    '7d': 0.7,
    '30d': 1.0,
    '90d': 1.5,
  };
  let factor = factors[range] || 1.0;
  if (range === 'custom') {
    factor = days / 30;
  }

  if (type === 'support') {
    metrics.openCount = Math.max(1, Math.round((metrics.openCount || 47) * Math.min(1.2, factor)));
    metrics.inProgressCount = Math.max(1, Math.round((metrics.inProgressCount || 23) * Math.min(1.2, factor)));
    metrics.resolvedCount = Math.round((metrics.resolvedCount || 156) * ratio);
    metrics.criticalCount = Math.max(0, Math.round((metrics.criticalCount || 5) * factor));
    metrics.waitingClientCount = Math.max(0, Math.round((metrics.waitingClientCount || 12) * factor));
    metrics.waitingThirdPartyCount = Math.max(0, Math.round((metrics.waitingThirdPartyCount || 8) * factor));
    metrics.overdueCount = Math.max(0, Math.round((metrics.overdueCount || 7) * factor));

    // Dynamic SLA & Response Times
    if (range === 'today') {
      metrics.slaMetPercentage = 92.5;
      metrics.avgResolutionTime = 120;
      metrics.avgResponseTime = 10;
    } else if (range === '7d') {
      metrics.slaMetPercentage = 89.1;
      metrics.avgResolutionTime = 210;
      metrics.avgResponseTime = 14;
    } else if (range === '30d') {
      metrics.slaMetPercentage = 87.5;
      metrics.avgResolutionTime = 285;
      metrics.avgResponseTime = 18;
    } else if (range === '90d') {
      metrics.slaMetPercentage = 84.8;
      metrics.avgResolutionTime = 340;
      metrics.avgResponseTime = 22;
    } else {
      // custom
      metrics.slaMetPercentage = Math.max(70, Math.min(98, Math.round((87.5 - (factor - 1) * 3) * 10) / 10));
      metrics.avgResolutionTime = Math.max(60, Math.round(285 * factor));
      metrics.avgResponseTime = Math.max(5, Math.round(18 * factor));
    }
    
    // Ensure SLA count matches percentage
    const totalSla = metrics.resolvedCount || 1;
    metrics.slaMetCount = Math.round(totalSla * (metrics.slaMetPercentage / 100));
    metrics.slaViolatedCount = Math.max(0, totalSla - metrics.slaMetCount);

    if (metrics.volumeByDate) metrics.volumeByDate = metrics.volumeByDate.slice(-days);
    if (metrics.resolutionByDate) metrics.resolutionByDate = metrics.resolutionByDate.slice(-days);
    if (metrics.dailyMetrics) metrics.dailyMetrics = metrics.dailyMetrics.slice(-Math.min(days, 7));

    if (range === 'custom' && start && end) {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      
      if (metrics.volumeByDate) {
        metrics.volumeByDate = metrics.volumeByDate.filter((d: any) => {
          const t = new Date(d.date).getTime();
          return t >= startTime && t <= endTime;
        });
      }
      if (metrics.resolutionByDate) {
        metrics.resolutionByDate = metrics.resolutionByDate.filter((d: any) => {
          const t = new Date(d.date).getTime();
          return t >= startTime && t <= endTime;
        });
      }
      metrics.resolvedCount = metrics.resolutionByDate.reduce((sum: number, d: any) => sum + d.value, 0);
    }
  } else {
    metrics.todoCount = Math.max(1, Math.round((metrics.todoCount || 8) * Math.min(1.2, factor)));
    metrics.inProgressCount = Math.max(1, Math.round((metrics.inProgressCount || 12) * Math.min(1.2, factor)));
    metrics.codeReviewCount = Math.max(0, Math.round((metrics.codeReviewCount || 5) * Math.min(1.2, factor)));
    metrics.qaCount = Math.max(0, Math.round((metrics.qaCount || 4) * Math.min(1.2, factor)));
    metrics.doneCount = Math.round((metrics.doneCount || 34) * ratio);
    metrics.bugCount = Math.max(0, Math.round((metrics.bugCount || 11) * factor));
    metrics.blockedCount = Math.max(0, Math.round((metrics.blockedCount || 3) * factor));
    metrics.overdueCount = Math.max(0, Math.round((metrics.overdueCount || 4) * factor));
    metrics.throughput = Math.round((metrics.throughput || 18) * (days / 7));

    // Lead times and velocities
    if (range === 'today') {
      metrics.avgLeadTime = 1440; // 1 day
      metrics.avgCycleTime = 720; // 0.5 days
      metrics.squadVelocity = 5;
    } else if (range === '7d') {
      metrics.avgLeadTime = 2880; // 2 days
      metrics.avgCycleTime = 1440; // 1 day
      metrics.squadVelocity = 15;
    } else if (range === '30d') {
      metrics.avgLeadTime = 4320; // 3 days
      metrics.avgCycleTime = 2160; // 1.5 days
      metrics.squadVelocity = 52;
    } else if (range === '90d') {
      metrics.avgLeadTime = 5760; // 4 days
      metrics.avgCycleTime = 2880; // 2 days
      metrics.squadVelocity = 145;
    } else {
      // custom
      metrics.avgLeadTime = Math.max(720, Math.round(4320 * factor));
      metrics.avgCycleTime = Math.max(360, Math.round(2160 * factor));
      metrics.squadVelocity = Math.max(1, Math.round(52 * factor));
    }

    if (metrics.burndownData) metrics.burndownData = metrics.burndownData.slice(-Math.min(days, 9));
    if (metrics.bugsByDate) metrics.bugsByDate = metrics.bugsByDate.slice(-days);
    if (metrics.throughputData) metrics.throughputData = metrics.throughputData.slice(-Math.min(days, 12));
    if (metrics.tasksByWeek) metrics.tasksByWeek = metrics.tasksByWeek.slice(-Math.min(days, 8));

    if (range === 'custom' && start && end) {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      
      if (metrics.bugsByDate) {
        metrics.bugsByDate = metrics.bugsByDate.filter((d: any) => {
          const t = new Date(d.date).getTime();
          return t >= startTime && t <= endTime;
        });
      }
    }
  }

  return cloned;
}
