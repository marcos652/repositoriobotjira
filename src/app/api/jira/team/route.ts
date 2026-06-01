import { NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'movingpay.atlassian.net';

function getAuth() { return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64'); }
const headers = () => ({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${getAuth()}` });

export const dynamic = 'force-dynamic';

// GET /api/jira/team — Team members + stats + recent activity
export async function GET() {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 500 });
  }

  try {
    // 1. Get assignable users for DSMM project
    const usersRes = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/user/assignable/search?project=DSMM&maxResults=50`, { headers: headers() });
    if (!usersRes.ok) throw new Error(`Users API: ${usersRes.status}`);
    const users = await usersRes.json();

    // 2. Search recent issues for stats per user (last 90 days)
    const issuesRes = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        jql: 'project = DSMM AND updated >= -90d ORDER BY updated DESC',
        fields: ['assignee', 'status', 'issuetype', 'priority', 'summary', 'updated', 'created', 'resolutiondate'],
        maxResults: 100,
      }),
    });

    let issues: any[] = [];
    if (issuesRes.ok) {
      const data = await issuesRes.json();
      issues = data.issues || [];
    }

    // 3. Get recent changelog for activity/logs
    const recentRes = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        jql: 'project = DSMM AND updated >= -30d ORDER BY updated DESC',
        fields: ['summary', 'status', 'assignee', 'updated', 'comment', 'issuetype', 'priority'],
        maxResults: 50,
        expand: ['changelog'],
      }),
    });

    let recentIssues: any[] = [];
    if (recentRes.ok) {
      const data = await recentRes.json();
      recentIssues = data.issues || [];
    }

    // Build team stats
    const teamMap = new Map<string, { name: string; email: string; avatar: string | null; open: number; resolved: number; inProgress: number; }>();

    for (const u of users) {
      if (u.accountType !== 'atlassian') continue;
      teamMap.set(u.accountId, { name: u.displayName, email: u.emailAddress || '', avatar: u.avatarUrls?.['48x48'] || null, open: 0, resolved: 0, inProgress: 0 });
    }

    for (const issue of issues) {
      const assigneeId = issue.fields?.assignee?.accountId;
      if (!assigneeId || !teamMap.has(assigneeId)) continue;
      const member = teamMap.get(assigneeId)!;
      const cat = issue.fields?.status?.statusCategory?.key;
      if (cat === 'done') member.resolved++;
      else if (cat === 'indeterminate') member.inProgress++;
      else member.open++;
    }

    const team = [...teamMap.values()].sort((a, b) => b.resolved - a.resolved);

    // Build changelog/activity log
    const activityLog: any[] = [];
    const notifications: any[] = [];

    for (const issue of recentIssues) {
      // Changelog entries
      const histories = issue.changelog?.histories || [];
      for (const h of histories) {
        for (const item of (h.items || [])) {
          activityLog.push({
            issueKey: issue.key,
            summary: issue.fields?.summary,
            author: h.author?.displayName || 'Sistema',
            authorAvatar: h.author?.avatarUrls?.['24x24'] || null,
            date: h.created,
            field: item.field,
            from: item.fromString || '',
            to: item.toString || '',
          });
        }
      }

      // Comments as notifications
      const comments = issue.fields?.comment?.comments || [];
      for (const c of comments) {
        const created = new Date(c.created).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (created > sevenDaysAgo) {
          notifications.push({
            type: 'comment',
            issueKey: issue.key,
            summary: issue.fields?.summary,
            author: c.author?.displayName || 'Alguém',
            authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
            date: c.created,
            message: `Comentou em ${issue.key}`,
          });
        }
      }

      // Status changes as notifications
      for (const h of histories) {
        const created = new Date(h.created).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (created > sevenDaysAgo) {
          for (const item of (h.items || [])) {
            if (item.field === 'status') {
              notifications.push({
                type: 'status',
                issueKey: issue.key,
                summary: issue.fields?.summary,
                author: h.author?.displayName || 'Sistema',
                authorAvatar: h.author?.avatarUrls?.['24x24'] || null,
                date: h.created,
                message: `Moveu ${issue.key} para "${item.toString}"`,
              });
            }
          }
        }
      }
    }

    // Sort by date desc
    activityLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      team,
      activityLog: activityLog.slice(0, 100),
      notifications: notifications.slice(0, 50),
      totalIssues: issues.length,
    });
  } catch (error: any) {
    console.error('Team API error:', error);
    return NextResponse.json({ error: error?.message || 'Erro', success: false }, { status: 500 });
  }
}
