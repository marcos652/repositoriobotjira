import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory store for verification codes (in production, use Redis or DB)
// This works on serverless because codes are short-lived
const codeStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// Allowed emails (add all authorized users here)
const ALLOWED_EMAILS = [
  'marcos.vinicius@movingpay.com.br',
  // Add more authorized emails as needed
];

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Export for use by verify-code route
export { codeStore, ALLOWED_EMAILS };

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is allowed
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Email não autorizado. Contate o administrador.' },
        { status: 403 }
      );
    }

    // Rate limiting: max 1 code per 60 seconds per email
    const existing = codeStore.get(normalizedEmail);
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Aguarde 60 segundos antes de solicitar outro código.' },
        { status: 429 }
      );
    }

    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store the code
    codeStore.set(normalizedEmail, { code, expiresAt, attempts: 0 });

    // Send email
    await transporter.sendMail({
      from: `"JiraOps Dashboard" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: `🔐 Código de verificação: ${code}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0F172A; border-radius: 16px; overflow: hidden; border: 1px solid #1E293B;">
          <div style="height: 4px; background: linear-gradient(90deg, #3B82F6, #8B5CF6, #A78BFA);"></div>
          <div style="padding: 40px 32px; text-align: center;">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px;">⚡</span>
            </div>
            <h1 style="color: #F8FAFC; font-size: 22px; font-weight: 800; margin: 0 0 8px;">JiraOps Dashboard</h1>
            <p style="color: #94A3B8; font-size: 14px; margin: 0 0 32px;">Seu código de verificação</p>
            <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #60A5FA; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="color: #64748B; font-size: 12px; margin: 0;">Este código expira em <strong style="color: #94A3B8;">5 minutos</strong></p>
            <p style="color: #475569; font-size: 11px; margin: 16px 0 0;">Se você não solicitou este código, ignore este email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Código enviado para seu email!',
    });
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar código. Verifique a configuração do email.', detail: error?.message },
      { status: 500 }
    );
  }
}
