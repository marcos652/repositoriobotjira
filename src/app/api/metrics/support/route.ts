// ============================================
// API Route: /api/metrics/support
// Returns computed support metrics from Jira or Firestore cache
// ============================================

import { NextResponse } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';
import { fetchSupportMetrics } from '@/lib/jira-support-metrics';
import { saveMetricsToFirestore, getMetricsFromFirestore } from '@/lib/firebase';
import { filterSummaryMetrics } from '@/lib/metrics-filter';
import { supportMetrics, liveAttendance, criticalTickets, overdueTickets } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;

  // If Jira is configured, fetch real data
  if (isJiraConfigured()) {
    try {
      const data = await fetchSupportMetrics(range, start, end);
      
      // Save to Firebase Firestore asynchronously to preserve performance
      saveMetricsToFirestore('support', data);

      return NextResponse.json({
        mode: 'live',
        ...data,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to fetch Jira metrics, checking Firestore cache:', error);
      
      const cached = await getMetricsFromFirestore('support');
      if (cached) {
        const filtered = filterSummaryMetrics('support', cached, range, start, end);
        return NextResponse.json({
          mode: 'cached',
          metrics: filtered.metrics,
          liveAttendance: filtered.liveAttendance,
          criticalTickets: filtered.criticalTickets,
          overdueTickets: filtered.overdueTickets,
          lastUpdated: cached.syncedAt || new Date().toISOString(),
        });
      }
      
      // Fall back to demo data on error if cache is empty
      const demoData = { metrics: supportMetrics, liveAttendance, criticalTickets, overdueTickets };
      const filteredDemo = filterSummaryMetrics('support', demoData, range, start, end);
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
    const cached = await getMetricsFromFirestore('support');
    if (cached) {
      const filtered = filterSummaryMetrics('support', cached, range, start, end);
      return NextResponse.json({
        mode: 'cached',
        metrics: filtered.metrics,
        liveAttendance: filtered.liveAttendance,
        criticalTickets: filtered.criticalTickets,
        overdueTickets: filtered.overdueTickets,
        lastUpdated: cached.syncedAt || new Date().toISOString(),
      });
    }
  } catch (dbError) {
    console.error('Failed to read support metrics from Firestore cache:', dbError);
  }

  // Fallback: demo data
  const demoData = { metrics: supportMetrics, liveAttendance, criticalTickets, overdueTickets };
  const filteredDemo = filterSummaryMetrics('support', demoData, range, start, end);
  return NextResponse.json({
    mode: 'demo',
    ...filteredDemo,
    lastUpdated: new Date().toISOString(),
  });
}
