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
        authTimeout: 5000,
        connTimeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    // Connect to IMAP
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

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
    const recentMessages = messages.slice(0, 20); // Show max 20

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
            textSnippet: 'Clique para abrir o e-mail no painel da Amazon (conteúdo protegido).',
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
    return NextResponse.json({ success: false, error: 'Falha ao buscar e-mails: ' + error.message }, { status: 500 });
  }
}
