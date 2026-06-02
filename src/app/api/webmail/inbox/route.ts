import { NextRequest, NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

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

    if (mode === 'markRead' && uid) {
      await connection.addFlags(uid, '\\Seen');
      connection.end();
      return NextResponse.json({ success: true });
    }

    if (mode === 'markUnread' && uid) {
      await connection.delFlags(uid, '\\Seen');
      connection.end();
      return NextResponse.json({ success: true });
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
          const headers = headerPart.body;
          
          let subject = 'Sem Assunto';
          if (headers.subject && headers.subject.length > 0) subject = headers.subject[0];

          let from = 'Remetente Desconhecido';
          if (headers.from && headers.from.length > 0) from = headers.from[0];

          let date = new Date().toISOString();
          if (headers.date && headers.date.length > 0) date = headers.date[0];

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
        } catch (e) {
          console.error('Error extracting email header UID', id, e);
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
