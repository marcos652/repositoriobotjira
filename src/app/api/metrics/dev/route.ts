// ============================================
// API Route: /api/metrics/dev
// Returns computed development metrics from Jira or Firestore cache
// ============================================

import { NextResponse, after } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';
import { fetchDevMetrics } from '@/lib/jira-dev-metrics';
import { getRedisClient } from '@/lib/redis';
import { saveMetricsToFirestore, getMetricsFromFirestore } from '@/lib/firebase';
import { filterSummaryMetrics } from '@/lib/metrics-filter';
import { devMetrics, currentSprint, blockedTasks, deployHistory, bottleneckData } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

// O custo aqui NÃO é o intervalo de datas. Medido contra o Jira do projeto:
// `resolved >= "-30d"` retorna 0 issues, então 30d e 3d trazem exatamente as mesmas 110
// issues (todas vindas de `statusCategory != Done`, que não tem filtro de data) e o endpoint
// leva o mesmo tempo. O custo é recalcular tudo em CADA carregamento da página.
// Cache no Redis (compartilhado entre instâncias, sobrevive a cold start) + resposta imediata
// com revalidação em segundo plano.
const CACHE_TTL_MS = 3 * 60 * 1000;
const STALE_MAX_MS = 30 * 60 * 1000;

interface MetricsCache { data: unknown; ts: number }

// A chave inclui o range: cachear tudo junto entregaria número de outro período.
const cacheKey = (range: string, start?: string, end?: string) =>
  `jiraops:metrics-dev:${range}:${start || ''}:${end || ''}`;

async function readCache(key: string): Promise<MetricsCache | undefined> {
  const redis = getRedisClient();
  if (!redis) return undefined;
  try {
    const c = await redis.get<MetricsCache>(key);
    return c?.data && c.ts ? c : undefined;
  } catch (e) {
    console.error('[MetricsDev] Falha ao ler cache:', e instanceof Error ? e.message : e);
    return undefined;
  }
}

async function writeCache(key: string, data: unknown): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, { data, ts: Date.now() }, { ex: Math.floor(STALE_MAX_MS / 1000) });
  } catch (e) {
    console.error('[MetricsDev] Falha ao gravar cache:', e instanceof Error ? e.message : e);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;

  if (isJiraConfigured()) {
    const key = cacheKey(range, start, end);
    const cached = searchParams.get('refresh') === '1' ? undefined : await readCache(key);
    const idade = cached ? Date.now() - cached.ts : Infinity;

    if (cached && idade < CACHE_TTL_MS) {
      return NextResponse.json({ mode: 'live', ...(cached.data as object), cached: true, lastUpdated: new Date(cached.ts).toISOString() });
    }

    // Vencido mas utilizável: responde na hora e recalcula atrás, então a espera não cai
    // sobre quem abriu a página.
    if (cached && idade < STALE_MAX_MS) {
      after(async () => {
        try {
          const fresco = await fetchDevMetrics(range, start, end);
          await writeCache(key, fresco);
          saveMetricsToFirestore('dev', fresco);
        } catch (e) {
          console.error('[MetricsDev] Revalidação em segundo plano falhou:', e instanceof Error ? e.message : e);
        }
      });
      return NextResponse.json({ mode: 'live', ...(cached.data as object), cached: true, stale: true, lastUpdated: new Date(cached.ts).toISOString() });
    }

    try {
      const data = await fetchDevMetrics(range, start, end);
      await writeCache(key, data);

      // Save to Firebase Firestore asynchronously to preserve performance
      saveMetricsToFirestore('dev', data);

      return NextResponse.json({
        mode: 'live',
        ...data,
        cached: false,
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
