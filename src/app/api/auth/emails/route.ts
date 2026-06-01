import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from '../_store';
import { isAdmin } from '../_admin';

// GET — List all allowed emails
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    emails: ALLOWED_EMAILS.list(),
    count: ALLOWED_EMAILS.size(),
  });
}

// POST — Add a new email
export async function POST(request: NextRequest) {
  console.log('[Emails API] POST received');
  if (!(await isAdmin(request))) {
    console.log('[Emails API] ❌ Not admin');
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    console.log(`[Emails API] Adding email: ${email}`);

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!normalized.includes('@') || !normalized.includes('.')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (ALLOWED_EMAILS.includes(normalized)) {
      console.log(`[Emails API] Email already exists: ${normalized}`);
      return NextResponse.json({ error: 'Email já está autorizado' }, { status: 409 });
    }

    const added = ALLOWED_EMAILS.add(normalized);
    console.log(`[Emails API] add() returned: ${added}`);

    if (!added) {
      return NextResponse.json({ error: 'Falha ao adicionar email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Email ${normalized} autorizado com sucesso`,
      email: normalized,
      total: ALLOWED_EMAILS.size(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

// DELETE — Remove an email
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Email não está na lista' }, { status: 404 });
    }

    const removed = ALLOWED_EMAILS.remove(normalized);

    if (!removed) {
      return NextResponse.json({ 
        error: 'Não é possível remover o administrador principal ou o último email' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: `Email ${normalized} removido`,
      total: ALLOWED_EMAILS.size(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
