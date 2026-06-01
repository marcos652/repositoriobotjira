import { NextResponse } from 'next/server';

const SLACK_TOKEN = process.env.SLACK_TOKEN;

export const dynamic = 'force-dynamic';

// GET /api/slack/channels — List ALL channels + DMs the bot can access
export async function GET() {
  if (!SLACK_TOKEN) {
    return NextResponse.json({ error: 'Slack token not configured' }, { status: 500 });
  }

  try {
    // Fetch each type separately to handle missing scopes gracefully
    const types = ['public_channel', 'private_channel', 'im', 'mpim'];
    const allChannels: any[] = [];

    for (const type of types) {
      try {
        const res = await fetch(`https://slack.com/api/conversations.list?types=${type}&exclude_archived=true&limit=200`, {
          headers: { 'Authorization': `Bearer ${SLACK_TOKEN}` },
        });
        const data = await res.json();
        if (data.ok && data.channels) {
          allChannels.push(...data.channels);
        }
      } catch {
        // Skip this type if scope is missing
      }
    }

    if (allChannels.length === 0) {
      return NextResponse.json({ error: 'Nenhum canal encontrado. Verifique os scopes do bot.', channels: [] }, { status: 400 });
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    const deduped = allChannels.filter(ch => {
      if (seen.has(ch.id)) return false;
      seen.add(ch.id);
      return true;
    });

    const channels = deduped.map((ch: any) => ({
      id: ch.id,
      name: ch.name || ch.user || ch.id,
      is_channel: ch.is_channel || false,
      is_group: ch.is_group || false,
      is_im: ch.is_im || false,
      is_mpim: ch.is_mpim || false,
      is_member: ch.is_member || false,
      topic: ch.topic?.value || '',
      purpose: ch.purpose?.value || '',
      num_members: ch.num_members || 0,
      user: ch.user || null,
    }));

    // For DMs, resolve user names
    const dmUserIds = channels.filter(c => c.is_im && c.user).map(c => c.user);
    const userMap: Record<string, { name: string; avatar: string }> = {};

    // Batch fetch user info (parallel, max 30)
    await Promise.all(dmUserIds.slice(0, 30).map(async (userId: string) => {
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

    // Enrich DMs with user names
    const enriched = channels.map((ch: any) => {
      if (ch.is_im && ch.user && userMap[ch.user]) {
        return { ...ch, name: userMap[ch.user].name, avatar: userMap[ch.user].avatar };
      }
      return ch;
    });

    // Sort: member channels first, then other channels, then DMs
    enriched.sort((a: any, b: any) => {
      // Members first
      if (a.is_member && !b.is_member) return -1;
      if (!a.is_member && b.is_member) return 1;
      // Channels before DMs
      if ((a.is_channel || a.is_group) && a.is_im) return -1;
      if (a.is_im && (b.is_channel || b.is_group)) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    return NextResponse.json({ success: true, channels: enriched });
  } catch (error: any) {
    console.error('Slack channels error:', error);
    return NextResponse.json({ error: error?.message || 'Erro' }, { status: 500 });
  }
}
