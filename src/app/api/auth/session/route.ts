import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({
      authenticated: true,
      user: { email: payload.email },
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

    // Renew session: extend by 24h
    const newPayload = {
      ...payload,
      exp: Date.now() + 24 * 60 * 60 * 1000,
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
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }
}

