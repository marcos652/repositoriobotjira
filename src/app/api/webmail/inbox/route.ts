import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Global cache for IMAP connections to eliminate connection latency
const connectionCache = new Map<string, { client: ImapFlow, lastUsed: number }>();

function formatAddress(addr?: { name?: string; address?: string }): string {
  if (!addr) return '(Desconhecido)';
  if (addr.name) return `${addr.name} <${addr.address || ''}>`;
  return addr.address || '(Desconhecido)';
}

async function createClient(user: string, password: string, host: string, port: number): Promise<ImapFlow> {
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass: password },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    logger: false,
  });
  await client.connect();
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'list';
    const uid = searchParams.get('uid');

    // Read credentials from Headers (Multi-user support)
    const user = request.headers.get('x-webmail-user');
    const password = request.headers.get('x-webmail-pass');

    // Fallback constants
    const host = process.env.WORKMAIL_IMAP_HOST || 'imap.mail.us-east-1.awsapps.com';
    const port = parseInt(process.env.WORKMAIL_IMAP_PORT || '993', 10);

    if (!user || !password) {
      return NextResponse.json(
        { success: false, error: 'Faça login no Webmail para acessar sua caixa de entrada.' },
        { status: 401 }
      );
    }

    const cacheKey = `${user}:${password}`;
    let client = connectionCache.get(cacheKey)?.client;

    if (!client || !client.usable) {
      client = await createClient(user, password, host, port);
      connectionCache.set(cacheKey, { client, lastUsed: Date.now() });
    } else {
      connectionCache.get(cacheKey)!.lastUsed = Date.now();
    }

    try {
      if (mode === 'body' && uid) {
        // FETCH FULL BODY FOR A SPECIFIC EMAIL
        const lock = await client.getMailboxLock('INBOX');
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg) {
            return NextResponse.json({ success: false, error: 'E-mail não encontrado.' }, { status: 404 });
          }

          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });

          let parsedBody: any = { html: '', textSnippet: '', hasMeeting: false, attachments: [], meetings: [] };
          if (msg.source) {
            const parsed = await simpleParser(msg.source);

            const hasMeeting = parsed.attachments.some(a => a.contentType.includes('text/calendar') || a.filename?.endsWith('.ics'));

            const meetings = [];
            if (hasMeeting) {
              const calAttachments = parsed.attachments.filter(a => a.contentType.includes('text/calendar') || a.filename?.endsWith('.ics'));
              for (const cal of calAttachments) {
                const icsContent = cal.content.toString('utf-8');
                meetings.push({
                  filename: cal.filename,
                  icsContent
                });
              }
            }

            const cleanAttachments = parsed.attachments.map(a => ({
              filename: a.filename || 'anexo',
              size: a.size,
              contentType: a.contentType
            }));

            parsedBody = {
              html: parsed.html || parsed.textAsHtml || '',
              textSnippet: parsed.text ? parsed.text.substring(0, 200) + '...' : '',
              hasMeeting,
              attachments: cleanAttachments,
              meetings
            };
          }

          return NextResponse.json({ success: true, email: parsedBody });
        } finally {
          lock.release();
        }
      }

      if (mode === 'markRead' && uid) {
        const lock = await client.getMailboxLock('INBOX');
        try {
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
          return NextResponse.json({ success: true });
        } finally {
          lock.release();
        }
      }

      if (mode === 'markUnread' && uid) {
        const lock = await client.getMailboxLock('INBOX');
        try {
          await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
          return NextResponse.json({ success: true });
        } finally {
          lock.release();
        }
      }

      // LIST MODE (HEADERS ONLY)
      const date = new Date();
      date.setDate(date.getDate() - 5);

      const results: any[] = [];
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch({ since: date }, { uid: true, envelope: true, flags: true })) {
          const from = msg.envelope?.from?.[0];
          const msgDate = msg.envelope?.date ? new Date(msg.envelope.date) : new Date();

          results.push({
            id: String(msg.uid),
            subject: msg.envelope?.subject || '(Sem Assunto)',
            from: formatAddress(from),
            date: isNaN(msgDate.getTime()) ? new Date().toISOString() : msgDate.toISOString(),
            textSnippet: '...', // Placeholder until clicked
            html: '',
            hasMeeting: false,
            attachments: [],
            isRead: msg.flags ? msg.flags.has('\\Seen') : false
          });
        }
      } finally {
        lock.release();
      }

      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Do NOT log out so the connection stays cached for the next request
      return NextResponse.json({ success: true, emails: results });

    } catch (innerError) {
      connectionCache.delete(cacheKey); // Invalidate cache on error
      throw innerError;
    }
  } catch (error: any) {
    console.error('IMAP Error:', error);
    return NextResponse.json({ success: false, error: 'Falha na conexão com o Webmail: ' + error.message }, { status: 500 });
  }
}
