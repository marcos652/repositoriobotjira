import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, decrypt } from '../_store';

// Simple session token
function generateSessionToken(email: string): string {
  const payload = {
    email,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const { email, code, token } = await request.json();

    if (!email || !code || !token) {
      return NextResponse.json({ error: 'Email, código e token são obrigatórios' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Email não autorizado' }, { status: 403 });
    }

    // Decrypt the token received from the frontend
    const stored = decrypt<{ email: string; code: string; exp: number }>(token);

    if (!stored) {
      return NextResponse.json(
        { error: 'Token inválido ou adulterado. Solicite um novo código.' },
        { status: 400 }
      );
    }

    // Check email matches
    if (stored.email !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Email não corresponde. Solicite um novo código.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (Date.now() > stored.exp) {
      const response = NextResponse.json(
        { error: 'Código expirado. Solicite um novo.' },
        { status: 400 }
      );
      response.cookies.delete('pending_code');
      return response;
    }

    // Verify code
    if (stored.code !== code.trim()) {
      return NextResponse.json(
        { error: 'Código incorreto. Tente novamente.' },
        { status: 401 }
      );
    }

    // Code is valid — create session
    const sessionToken = generateSessionToken(normalizedEmail);

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: { email: normalizedEmail },
    });

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Clear pending code cookie
    response.cookies.delete('pending_code');

    return response;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: 'Falha ao verificar código', detail: error?.message },
      { status: 500 }
    );
  }
}
