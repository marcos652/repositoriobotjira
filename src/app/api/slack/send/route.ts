import { NextRequest, NextResponse } from 'next/server';

const SLACK_TOKEN = process.env.SLACK_TOKEN;

export const dynamic = 'force-dynamic';

// POST /api/slack/send — Send a message to a channel
export async function POST(request: NextRequest) {
  if (!SLACK_TOKEN) {
    return NextResponse.json({ error: 'Slack token not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { channel, text, thread_ts } = body;

    if (!channel || !text) {
      return NextResponse.json({ error: 'channel and text are required' }, { status: 400 });
    }

    const payload: any = { channel, text };
    if (thread_ts) payload.thread_ts = thread_ts;

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.error || 'Failed to send message' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      ts: data.ts,
      channel: data.channel,
      message: data.message,
    });
  } catch (error: any) {
    console.error('Slack send error:', error);
    return NextResponse.json({ error: error?.message || 'Erro' }, { status: 500 });
  }
}
