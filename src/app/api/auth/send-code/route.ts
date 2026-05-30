import { NextRequest, NextResponse } from 'next/server';
import { codeStore, ALLOWED_EMAILS } from '../_store';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  // 2. Send DM directly to the user (using user ID as channel)
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
    console.log(`[AUTH] Code stored for ${normalizedEmail}: ${code} (store size: ${codeStore.size})`);

    // Send code via Slack DM
    await sendSlackCode(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: 'Código enviado no Slack! Verifique suas mensagens diretas.',
    });
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar código.', detail: error?.message },
      { status: 500 }
    );
  }
}
