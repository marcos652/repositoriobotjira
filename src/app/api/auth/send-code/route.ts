import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, encrypt } from '../_store';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Encrypt code data for the cookie (AES-256-GCM)
function encodeCodeCookie(email: string, code: string): string {
  return encrypt({ email, code, exp: Date.now() + 5 * 60 * 1000 });
}

// Send verification code via Slack DM (private to the user)
async function sendSlackCode(email: string, code: string): Promise<void> {
  const slackToken = process.env.SLACK_TOKEN;

  if (!slackToken) {
    throw new Error('Slack não configurado');
  }

  // 1. Find Slack user ID by email
  const lookupRes = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${slackToken}` },
  });
  const lookupData = await lookupRes.json();

  if (!lookupData.ok) {
    throw new Error(`Usuário não encontrado no Slack: ${lookupData.error}`);
  }

  const userId = lookupData.user.id;

  // 2. Send DM directly to the user
  const message = `🔐 *Código de Verificação - JiraOps Dashboard*\n\n` +
    `🔑 Seu código: \`${code}\`\n` +
    `⏱️ Expira em: *5 minutos*\n\n` +
    `_Se você não solicitou este código, ignore esta mensagem._`;

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: userId,
      text: message,
      unfurl_links: false,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack DM error: ${data.error}`);
  }
}

// ── Rate limiting: max 5 attempts per email in 15 minutes ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Email não autorizado. Contate o administrador.' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 15 minutos.' },
        { status: 429 }
      );
    }

    const code = generateCode();

    // Send code via Slack DM
    await sendSlackCode(normalizedEmail, code);

    // Encrypt the code into a token (returned to frontend, sent back on verify)
    const token = encodeCodeCookie(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: 'Código enviado no Slack! Verifique suas mensagens diretas.',
      token, // AES-256-GCM encrypted — unreadable without server key
    });
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar código.', detail: error?.message },
      { status: 500 }
    );
  }
}
