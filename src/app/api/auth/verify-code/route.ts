import { NextRequest, NextResponse } from 'next/server';
import { codeStore, ALLOWED_EMAILS } from '../_store';

// Simple JWT-like token generation (for session)
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
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email e código são obrigatórios' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is allowed
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Email não autorizado' }, { status: 403 });
    }

    const stored = codeStore.get(normalizedEmail);
    console.log(`[AUTH] Verify attempt for ${normalizedEmail}: stored=${!!stored}, store size=${codeStore.size}`);

    if (!stored) {
      return NextResponse.json(
        { error: 'Nenhum código encontrado. Solicite um novo.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      codeStore.delete(normalizedEmail);
      return NextResponse.json(
        { error: 'Código expirado. Solicite um novo.' },
        { status: 400 }
      );
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      codeStore.delete(normalizedEmail);
      return NextResponse.json(
        { error: 'Muitas tentativas. Solicite um novo código.' },
        { status: 429 }
      );
    }

    // Verify code
    if (stored.code !== code.trim()) {
      stored.attempts += 1;
      return NextResponse.json(
        { error: `Código incorreto. ${5 - stored.attempts} tentativa(s) restante(s).` },
        { status: 401 }
      );
    }

    // Code is valid — clean up and create session
    codeStore.delete(normalizedEmail);

    const token = generateSessionToken(normalizedEmail);

    // Set HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: { email: normalizedEmail },
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
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
