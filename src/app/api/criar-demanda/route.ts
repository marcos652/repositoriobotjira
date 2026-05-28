import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const botUrl = process.env.BOT_API_URL || 'http://localhost:8000';
    const botPath = process.env.BOT_API_URL ? '/api/criar-demanda' : '/criar-demanda';

    const res = await fetch(`${botUrl}${botPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Erro ao criar demanda', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Falha na comunicação com o bot', message: error?.message || String(error) },
      { status: 502 }
    );
  }
}
