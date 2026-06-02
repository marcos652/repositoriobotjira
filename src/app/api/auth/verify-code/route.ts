import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, decrypt, IP_TRACKER } from '../_store';

function generateSessionToken(email: string): string {
  const payload = {
    email,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const code = body.code;
    const encryptedPayload = body.token;

    if (!email || !code || !encryptedPayload) {
      return NextResponse.json({ error: 'Email, código e token são obrigatórios' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Email não autorizado' }, { status: 403 });
    }

    const stored = decrypt<{ email: string; code: string; exp: number }>(encryptedPayload);

    if (!stored) {
      return NextResponse.json(
        { error: 'Token inválido ou adulterado. Solicite um novo código.' },
        { status: 400 }
      );
    }

    if (stored.email !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Email não corresponde. Solicite um novo código.' },
        { status: 400 }
      );
    }

    if (Date.now() > stored.exp) {
      return NextResponse.json(
        { error: 'Código expirado. Solicite um novo.' },
        { status: 400 }
      );
    }

    if (stored.code !== code.trim()) {
      return NextResponse.json(
        { error: 'Código incorreto. Tente novamente.' },
        { status: 401 }
      );
    }

    // Success — record IP and create session
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';
    IP_TRACKER.record(normalizedEmail, clientIP);

    const role = ALLOWED_EMAILS.getRole(normalizedEmail);
    const sessionPayload = {
      email: normalizedEmail,
      role,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: { email: normalizedEmail },
    });

    response.cookies.set('session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: 'Falha ao verificar código', detail: error?.message },
      { status: 500 }
    );
  }
}
