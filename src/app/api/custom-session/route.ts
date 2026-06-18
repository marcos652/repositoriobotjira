import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from '../auth/_store';

export async function GET(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());

    if (Date.now() > payload.exp) {
      const response = NextResponse.json({ authenticated: false, error: 'Sessão expirada' }, { status: 401 });
      response.cookies.delete('session');
      return response;
    }

    const dynamicRole = ALLOWED_EMAILS.getRole(payload.email);

    return NextResponse.json({
      authenticated: true,
      user: { email: payload.email, role: dynamicRole },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logout realizado' });
  response.cookies.delete('session');
  return response;
}

// Session refresh — renew if expiring within 2 hours
export async function PUT(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  if (!session) {
    return NextResponse.json({ error: 'Sem sessão ativa' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());

    if (Date.now() > payload.exp) {
      const response = NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
      response.cookies.delete('session');
      return response;
    }

    // Renew session: extend by 30 days
    const newPayload = {
      ...payload,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      renewedAt: new Date().toISOString(),
    };

    const newSession = Buffer.from(JSON.stringify(newPayload)).toString('base64');
    const response = NextResponse.json({
      success: true,
      message: 'Sessão renovada',
      expiresAt: new Date(newPayload.exp).toISOString(),
    });
    response.cookies.set('session', newSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }
}

// Create Session from Firebase ID Token
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY || 'AIzaSyAGFdbWod_EJgh4OC056IvcqT621L9FWUo'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
    }

    const email = verifyData.users[0].email?.toLowerCase();
    if (!email) return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 });

    const role = ALLOWED_EMAILS.getRole(email);
    const sessionPayload = {
      email,
      role,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado',
      user: { email, role },
    });

    response.cookies.set('session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

