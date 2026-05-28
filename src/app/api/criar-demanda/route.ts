import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Proxy the request to the external API
    const res = await fetch('https://apibotjira.vercel.app/api/criar-demanda', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { text: await res.text() };
    }

    if (!res.ok) {
      return NextResponse.json(
        data || { error: 'Erro retornado pela API externa' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao redirecionar para a API externa:', error);
    return NextResponse.json(
      { error: 'Falha ao processar requisição', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
