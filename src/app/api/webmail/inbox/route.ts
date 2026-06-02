import { NextRequest, NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'list';
    const uid = searchParams.get('uid');

    const user = process.env.WORKMAIL_EMAIL;
    const password = process.env.WORKMAIL_PASSWORD;
    const host = process.env.WORKMAIL_IMAP_HOST || 'imap.mail.us-east-1.awsapps.com';
    const port = parseInt(process.env.WORKMAIL_IMAP_PORT || '993', 10);

    if (!user || !password) {
      return NextResponse.json(
        { success: false, error: 'Credenciais de e-mail não configuradas (WORKMAIL_EMAIL e WORKMAIL_PASSWORD)' },
        { status: 500 }
      );
    }

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

    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    if (mode === 'body' && uid) {
      // FETCH FULL BODY FOR A SPECIFIC EMAIL
      const messages = await connection.search([['UID', uid]], { bodies: [''], markSeen: true });
      if (messages.length === 0) {
        connection.end();
        return NextResponse.json({ success: false, error: 'E-mail não encontrado.' }, { status: 404 });
      }

      const msg = messages[0];
      const all = msg.parts.find((part: any) => part.which === '');
      
      let parsedBody = { html: '', textSnippet: '', hasMeeting: false, attachments: [], meetings: [] };
      if (all && all.body) {
        const parsed = await simpleParser(all.body);
        
        const hasMeeting = parsed.attachments.some(a => a.contentType.includes('text/calendar') || a.filename?.endsWith('.ics'));
        
        // Extract basic calendar details if it's a meeting
        const meetings = [];
        if (hasMeeting) {
           const calAttachments = parsed.attachments.filter(a => a.contentType.includes('text/calendar') || a.filename?.endsWith('.ics'));
           for (const cal of calAttachments) {
             const icsContent = cal.content.toString('utf-8');
             meetings.push({
               filename: cal.filename,
               icsContent // Pass raw ICS to frontend, or we could parse it here
             });
           }
        }

        // Avoid sending huge buffers in attachments list
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

      connection.end();
      return NextResponse.json({ success: true, email: parsedBody });
    }

    // LIST MODE (HEADERS ONLY)
    // Fetch recent emails (last 5 days) HEADERS ONLY to avoid AWS timeout
    const date = new Date();
    date.setDate(date.getDate() - 5);
    
    const searchCriteria = [['SINCE', date]];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: false,
      markSeen: false,
    };

    let messages = await connection.search(searchCriteria, fetchOptions);
    
    // Sort by UID descending (newest first)
    messages.sort((a: any, b: any) => b.attributes.uid - a.attributes.uid);
    const recentMessages = messages.slice(0, 30); // Show max 30

    const results = [];

    for (const msg of recentMessages) {
      const headerPart = msg.parts.find((part: any) => part.which.includes('HEADER'));
      const id = msg.attributes.uid;

      if (headerPart && headerPart.body) {
        try {
          const parsed = await simpleParser(headerPart.body);

          results.push({
            id,
            subject: parsed.subject || 'Sem Assunto',
            from: parsed.from?.text || 'Remetente Desconhecido',
            date: parsed.date || new Date().toISOString(),
            textSnippet: '...', // Placeholder until clicked
            html: '',
            hasMeeting: false,
            attachments: []
          });
        } catch (e) {
          console.error('Error parsing email header UID', id, e);
        }
      }
    }

    connection.end();
    return NextResponse.json({ success: true, emails: results });

  } catch (error: any) {
    console.error('IMAP Error:', error);
    return NextResponse.json({ success: false, error: 'Falha na conexão com o Webmail: ' + error.message }, { status: 500 });
  }
}
