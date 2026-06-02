import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const user = process.env.WORKMAIL_EMAIL;
    const password = process.env.WORKMAIL_PASSWORD;
    const host = process.env.WORKMAIL_SMTP_HOST || 'smtp.mail.us-east-1.awsapps.com';
    const port = parseInt(process.env.WORKMAIL_SMTP_PORT || '465', 10);

    if (!user || !password) {
      return NextResponse.json(
        { success: false, error: 'Credenciais de e-mail não configuradas (WORKMAIL_EMAIL e WORKMAIL_PASSWORD)' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject) {
      return NextResponse.json({ success: false, error: 'Destinatário e Assunto são obrigatórios' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass: password,
      },
    });

    const info = await transporter.sendMail({
      from: `"MovingPay" <${user}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text: text || '', // plain text body
      html: html || '', // html body
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('SMTP Error:', error);
    return NextResponse.json({ success: false, error: 'Falha ao enviar e-mail: ' + error.message }, { status: 500 });
  }
}
