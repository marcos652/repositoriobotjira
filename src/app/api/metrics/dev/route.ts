// ============================================
// API Route: /api/metrics/dev
// Returns computed development metrics from Jira or Firestore cache
// ============================================

import { NextResponse } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';
import { fetchDevMetrics } from '@/lib/jira-dev-metrics';
import { saveMetricsToFirestore, getMetricsFromFirestore } from '@/lib/firebase';
import { filterSummaryMetrics } from '@/lib/metrics-filter';
import { devMetrics, currentSprint, blockedTasks, deployHistory, bottleneckData } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;

  if (isJiraConfigured()) {
    try {
      const data = await fetchDevMetrics(range, start, end);
      
      // Save to Firebase Firestore asynchronously to preserve performance
      saveMetricsToFirestore('dev', data);

      return NextResponse.json({
        mode: 'live',
        ...data,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to fetch Dev Jira metrics, checking Firestore cache:', error);
      
      const cached = await getMetricsFromFirestore('dev');
      if (cached) {
        const filtered = filterSummaryMetrics('dev', cached, range, start, end);
        return NextResponse.json({
          mode: 'cached',
          metrics: filtered.metrics,
          currentSprint: filtered.currentSprint,
          blockedTasks: filtered.blockedTasks,
          deployHistory: filtered.deployHistory,
          bottleneckData: filtered.bottleneckData,
          lastUpdated: cached.syncedAt || new Date().toISOString(),
        });
      }

      const demoData = { metrics: devMetrics, currentSprint, blockedTasks, deployHistory, bottleneckData };
      const filteredDemo = filterSummaryMetrics('dev', demoData, range, start, end);
      return NextResponse.json({
        mode: 'demo',
        error: String(error),
        ...filteredDemo,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  // Try to load cached metrics from Firestore first
  try {
    const cached = await getMetricsFromFirestore('dev');
    if (cached) {
      const filtered = filterSummaryMetrics('dev', cached, range, start, end);
      return NextResponse.json({
        mode: 'cached',
        metrics: filtered.metrics,
        currentSprint: filtered.currentSprint,
        blockedTasks: filtered.blockedTasks,
        deployHistory: filtered.deployHistory,
        bottleneckData: filtered.bottleneckData,
        lastUpdated: cached.syncedAt || new Date().toISOString(),
      });
    }
  } catch (dbError) {
    console.error('Failed to read dev metrics from Firestore cache:', dbError);
  }

  const demoData = { metrics: devMetrics, currentSprint, blockedTasks, deployHistory, bottleneckData };
  const filteredDemo = filterSummaryMetrics('dev', demoData, range, start, end);
  return NextResponse.json({
    mode: 'demo',
    ...filteredDemo,
    lastUpdated: new Date().toISOString(),
  });
}
