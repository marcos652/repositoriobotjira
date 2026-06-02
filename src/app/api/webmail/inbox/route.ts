import { NextRequest, NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

// Global cache for IMAP connections to eliminate connection latency
const connectionCache = new Map<string, { conn: any, lastUsed: number }>();

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
    let connection = connectionCache.get(cacheKey)?.conn;
    let isNewConnection = false;

    if (!connection) {
      const config = {
        imap: {
          user,
          password,
          host,
          port,
          tls: true,
          authTimeout: 5000,
          connTimeout: 5000,
          tlsOptions: { rejectUnauthorized: false }
        }
      };
      connection = await imaps.connect(config);
      isNewConnection = true;
      connectionCache.set(cacheKey, { conn: connection, lastUsed: Date.now() });
    } else {
      connectionCache.get(cacheKey)!.lastUsed = Date.now();
    }

    try {
      if (isNewConnection) {
        await connection.openBox('INBOX');
      } else {
        // Just verify it's still open, otherwise reconnect
        try {
          await connection.openBox('INBOX');
        } catch (e) {
          const config = { imap: { user, password, host, port, tls: true, authTimeout: 5000, connTimeout: 5000, tlsOptions: { rejectUnauthorized: false } } };
          connection = await imaps.connect(config);
          await connection.openBox('INBOX');
          connectionCache.set(cacheKey, { conn: connection, lastUsed: Date.now() });
        }
      }

      if (mode === 'body' && uid) {
        // FETCH FULL BODY FOR A SPECIFIC EMAIL
        const messages = await connection.search([['UID', uid]], { bodies: [''], markSeen: true });
        if (messages.length === 0) {
          return NextResponse.json({ success: false, error: 'E-mail não encontrado.' }, { status: 404 });
        }

        const msg = messages[0];
        const all = msg.parts.find((part: any) => part.which === '');
        
        let parsedBody = { html: '', textSnippet: '', hasMeeting: false, attachments: [], meetings: [] };
        if (all && all.body) {
          const parsed = await simpleParser(all.body);
          
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
      }

      if (mode === 'markRead' && uid) {
        await connection.addFlags(uid, '\\Seen');
        return NextResponse.json({ success: true });
      }

      if (mode === 'markUnread' && uid) {
        await connection.delFlags(uid, '\\Seen');
        return NextResponse.json({ success: true });
      }

      // LIST MODE (HEADERS ONLY)
      const date = new Date();
      date.setDate(date.getDate() - 5);
      
      const searchCriteria = [['SINCE', date]];
      const fetchOptions = {
        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
        struct: false,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      
      const results = [];

      for (const msg of messages) {
        try {
          const headerPart = msg.parts.find((part: any) => part.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE)');
          if (headerPart && headerPart.body) {
            const parsed = await simpleParser(headerPart.body);
            
            const id = msg.attributes.uid.toString();
            const subject = parsed.subject || '(Sem Assunto)';
            const from = parsed.from?.text || '(Desconhecido)';
            
            let date = new Date().toISOString();
            if (parsed.date) date = parsed.date.toISOString();

            const isRead = msg.attributes.flags.includes('\\Seen');

            results.push({
              id,
              subject,
              from,
              date,
              textSnippet: '...', // Placeholder until clicked
              html: '',
              hasMeeting: false,
              attachments: [],
              isRead
            });
          }
        } catch (e) {
          console.error('Error extracting email header', e);
        }
      }

      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Do NOT call connection.end() so it stays cached for the next request
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
