import { NextRequest, NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function GET(request: NextRequest) {
  try {
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
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    // Connect to IMAP
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Fetch last 50 emails
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      struct: true,
      markSeen: false,
    };

    // Limit to newest 50 to avoid timeout
    const messages = await connection.search(searchCriteria, fetchOptions);
    const recentMessages = messages.slice(-50).reverse(); // Get latest 50

    const results = [];

    for (const msg of recentMessages) {
      const all = msg.parts.find((part: any) => part.which === '');
      const id = msg.attributes.uid;

      if (all && all.body) {
        try {
          const parsed = await simpleParser(all.body);
          
          // Check for calendar invites (.ics)
          const hasMeeting = parsed.attachments.some(a => a.contentType.includes('text/calendar') || a.filename?.endsWith('.ics'));

          results.push({
            id,
            subject: parsed.subject || 'Sem Assunto',
            from: parsed.from?.text || '',
            date: parsed.date,
            textSnippet: parsed.text ? parsed.text.substring(0, 150) + '...' : '',
            html: parsed.html || '',
            hasMeeting,
            attachments: parsed.attachments.map(a => ({ filename: a.filename, size: a.size }))
          });
        } catch (e) {
          console.error('Error parsing email UID', id, e);
        }
      }
    }

    connection.end();

    return NextResponse.json({ success: true, emails: results });
  } catch (error: any) {
    console.error('IMAP Error:', error);
    return NextResponse.json({ success: false, error: 'Falha ao buscar e-mails: ' + error.message }, { status: 500 });
  }
}
