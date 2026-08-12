import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, IP_TRACKER, getUsersOverview } from '../_store';
import { isAdmin, getSessionEmail } from '../_admin';

// GET — Merged view of ALLOWED_EMAILS + IP_TRACKER, one row per user
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  await Promise.all([ALLOWED_EMAILS.sync(), IP_TRACKER.sync()]);

  const users = getUsersOverview();
  return NextResponse.json({
    success: true,
    users,
    stats: {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      blocked: users.filter(u => u.status === 'blocked').length,
    },
  });
}

// POST — Bloquear/Desbloquear usuário, ou Banir/Liberar o último IP conhecido dele
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }

  try {
    const { action, email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // ── Bloquear/Desbloquear o usuário (impede login mesmo com credenciais corretas) ──
    if (action === 'toggleStatus') {
      const current = ALLOWED_EMAILS.getStatus(normalized);
      const next = current === 'blocked' ? 'active' : 'blocked';
      const adminEmail = await getSessionEmail(request);

      if (next === 'blocked' && normalized === adminEmail) {
        return NextResponse.json({ error: 'Você não pode bloquear sua própria conta' }, { status: 400 });
      }

      const updated = await ALLOWED_EMAILS.setStatus(normalized, next);
      if (!updated) {
        return NextResponse.json({ error: 'Não foi possível atualizar (usuário padrão/administrador não pode ser bloqueado)' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        status: next,
        message: next === 'blocked' ? `${normalized} bloqueado` : `${normalized} desbloqueado`,
      });
    }

    // ── Banir/Liberar o último IP conhecido do usuário ──
    if (action === 'banLastIp') {
      await IP_TRACKER.sync();
      const lastIp = IP_TRACKER.getLastForEmail(normalized);
      if (!lastIp) {
        return NextResponse.json({ error: 'Nenhum IP registrado para este usuário ainda' }, { status: 400 });
      }

      const willBlock = !lastIp.blocked;
      const success = willBlock
        ? await IP_TRACKER.block(lastIp.ip, normalized)
        : await IP_TRACKER.unblock(lastIp.ip, normalized);

      return NextResponse.json({
        success,
        ip: lastIp.ip,
        blocked: willBlock,
        message: success
          ? `IP ${lastIp.ip} ${willBlock ? 'banido' : 'liberado'} para ${normalized}`
          : 'Não foi possível atualizar o IP',
      });
    }

    return NextResponse.json({ error: 'Ação inválida (toggleStatus/banLastIp)' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
