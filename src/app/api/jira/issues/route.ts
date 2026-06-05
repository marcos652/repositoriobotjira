// ============================================
// API Route: /api/jira/issues
// Fetch issues from Jira with JQL filtering
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const project = searchParams.get('project') || 'SUP';
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assignee = searchParams.get('assignee');
  const dateFrom = searchParams.get('dateFrom');

  // Build JQL
  const jqlParts: string[] = [`project = ${project}`];
  if (status) jqlParts.push(`status = "${status}"`);
  if (priority) jqlParts.push(`priority = ${priority}`);
  if (assignee) jqlParts.push(`assignee = "${assignee}"`);
  if (dateFrom) jqlParts.push(`created >= "${dateFrom}"`);

  const jql = jqlParts.join(' AND ');

  // Check if Jira is configured
  if (!isJiraConfigured()) {
    return NextResponse.json({
      mode: 'demo',
      message: 'Jira not configured. Showing demo data.',
      jql,
      issues: [],
      total: 0,
    });
  }

  try {
    const { getJiraClient } = await import('@/lib/jira');
    const client = getJiraClient();

    const allIssues = await client.searchAllIssues(jql);

    return NextResponse.json({
      mode: 'live',
      jql,
      issues: allIssues,
      total: allIssues.length,
    });
  } catch (error) {
    console.error('Jira API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues from Jira', details: String(error) },
      { status: 500 }
    );
  }
}
