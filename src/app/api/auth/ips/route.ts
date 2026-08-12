import { NextRequest, NextResponse } from 'next/server';
import { IP_TRACKER } from '../_store';
import { isAdmin } from '../_admin';

// GET: List all IP records
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  await IP_TRACKER.sync();
  return NextResponse.json({ ips: IP_TRACKER.list() });
}

// POST: Block/Unblock/Add/Update/Remove IP
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (!action) {
    return NextResponse.json({ error: 'Ação é obrigatória' }, { status: 400 });
  }

  await IP_TRACKER.sync();

  // ── Block IP ──
  if (action === 'block') {
    const { ip, email } = body;
    if (!ip) return NextResponse.json({ error: 'IP é obrigatório' }, { status: 400 });
    const success = await IP_TRACKER.block(ip, email);
    return NextResponse.json({ success, message: success ? `IP ${ip} bloqueado${email ? ` para ${email}` : ''}` : 'IP não encontrado' });
  }

  // ── Unblock IP ──
  if (action === 'unblock') {
    const { ip, email } = body;
    if (!ip) return NextResponse.json({ error: 'IP é obrigatório' }, { status: 400 });
    const success = await IP_TRACKER.unblock(ip, email);
    return NextResponse.json({ success, message: success ? `IP ${ip} desbloqueado${email ? ` para ${email}` : ''}` : 'IP não encontrado' });
  }

  // ── Add IP manually ──
  if (action === 'add') {
    const { ip, email } = body;
    if (!ip || !email) return NextResponse.json({ error: 'IP e email são obrigatórios' }, { status: 400 });
    const success = await IP_TRACKER.add(email, ip);
    return NextResponse.json({ success, message: success ? `IP ${ip} adicionado para ${email}` : 'Entrada já existe' });
  }

  // ── Update IP entry ──
  if (action === 'update') {
    const { oldEmail, oldIP, newEmail, newIP } = body;
    if (!oldEmail || !oldIP) return NextResponse.json({ error: 'Email e IP originais são obrigatórios' }, { status: 400 });
    const success = await IP_TRACKER.update(oldEmail, oldIP, newEmail, newIP);
    return NextResponse.json({ success, message: success ? 'Registro atualizado' : 'Registro não encontrado' });
  }

  // ── Remove IP entry ──
  if (action === 'remove') {
    const { ip, email } = body;
    if (!ip || !email) return NextResponse.json({ error: 'IP e email são obrigatórios' }, { status: 400 });
    const success = await IP_TRACKER.remove(email, ip);
    return NextResponse.json({ success, message: success ? `Registro ${email}:${ip} removido` : 'Registro não encontrado' });
  }

  return NextResponse.json({ error: 'Ação inválida (block/unblock/add/update/remove)' }, { status: 400 });
}
