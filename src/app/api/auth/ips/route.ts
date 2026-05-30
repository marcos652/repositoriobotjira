import { NextRequest, NextResponse } from 'next/server';
import { IP_TRACKER } from '../_store';

// GET: List all IP records
export async function GET(request: NextRequest) {
  // Check admin session
  const session = request.cookies.get('session')?.value;
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());
    if (payload.email !== 'marcos.vinicius@movingpay.com.br') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 });
  }

  return NextResponse.json({ ips: IP_TRACKER.list() });
}

// POST: Block/Unblock IP
export async function POST(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());
    if (payload.email !== 'marcos.vinicius@movingpay.com.br') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 403 });
  }

  const { ip, action } = await request.json();

  if (!ip || !action) {
    return NextResponse.json({ error: 'IP e ação são obrigatórios' }, { status: 400 });
  }

  if (action === 'block') {
    const success = IP_TRACKER.block(ip);
    return NextResponse.json({ success, message: success ? `IP ${ip} bloqueado` : 'IP não encontrado' });
  }

  if (action === 'unblock') {
    const success = IP_TRACKER.unblock(ip);
    return NextResponse.json({ success, message: success ? `IP ${ip} desbloqueado` : 'IP não encontrado' });
  }

  return NextResponse.json({ error: 'Ação inválida (block/unblock)' }, { status: 400 });
}
