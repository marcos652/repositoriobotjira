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
