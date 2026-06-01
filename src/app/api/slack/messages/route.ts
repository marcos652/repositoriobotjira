import { NextRequest, NextResponse } from 'next/server';

const SLACK_TOKEN = process.env.SLACK_TOKEN;

export const dynamic = 'force-dynamic';

// GET /api/slack/messages?channel=C09SDGH8EBT&limit=50
export async function GET(request: NextRequest) {
  if (!SLACK_TOKEN) {
    return NextResponse.json({ error: 'Slack token not configured' }, { status: 500 });
  }

  const channel = request.nextUrl.searchParams.get('channel');
  const limit = request.nextUrl.searchParams.get('limit') || '50';
  const cursor = request.nextUrl.searchParams.get('cursor') || '';

  if (!channel) {
    return NextResponse.json({ error: 'channel parameter required' }, { status: 400 });
  }

  try {
    // Fetch messages
    let url = `https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${SLACK_TOKEN}` },
    });
    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.error || 'Slack API error' }, { status: 400 });
    }

    const messages = data.messages || [];

    // Collect unique user IDs to resolve names
    const userIds = new Set<string>();
    for (const msg of messages) {
      if (msg.user) userIds.add(msg.user);
      // Also check replies
      if (msg.reply_users) {
        for (const u of msg.reply_users) userIds.add(u);
      }
    }

    // Batch fetch user profiles
    const userMap: Record<string, { name: string; avatar: string }> = {};
    const userIdArr = [...userIds].slice(0, 30);
    
    await Promise.all(userIdArr.map(async (userId) => {
      try {
        const userRes = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
          headers: { 'Authorization': `Bearer ${SLACK_TOKEN}` },
        });
        const userData = await userRes.json();
        if (userData.ok && userData.user) {
          userMap[userId] = {
            name: userData.user.real_name || userData.user.profile?.display_name || userData.user.name || userId,
            avatar: userData.user.profile?.image_48 || '',
          };
        }
      } catch { /* skip */ }
    }));

    // Enrich messages
    const enriched = messages.map((msg: any) => ({
      ts: msg.ts,
      text: msg.text || '',
      user: msg.user || '',
      userName: userMap[msg.user]?.name || msg.user || 'Bot',
      userAvatar: userMap[msg.user]?.avatar || '',
      type: msg.type || 'message',
      subtype: msg.subtype || null,
      thread_ts: msg.thread_ts || null,
      reply_count: msg.reply_count || 0,
      reply_users_count: msg.reply_users_count || 0,
      reactions: (msg.reactions || []).map((r: any) => ({ name: r.name, count: r.count })),
      files: (msg.files || []).map((f: any) => ({ name: f.name, url: f.url_private, mimetype: f.mimetype, size: f.size })),
      edited: msg.edited ? true : false,
      bot_id: msg.bot_id || null,
      botName: msg.username || null,
    }));

    // Reverse so oldest first (Slack returns newest first)
    enriched.reverse();

    return NextResponse.json({
      success: true,
      messages: enriched,
      has_more: data.has_more || false,
      next_cursor: data.response_metadata?.next_cursor || '',
    });
  } catch (error: any) {
    console.error('Slack messages error:', error);
    return NextResponse.json({ error: error?.message || 'Erro' }, { status: 500 });
  }
}
