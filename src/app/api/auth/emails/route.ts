import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from '../_store';
import { isAdmin, getSessionEmail } from '../_admin';

// GET — List all allowed emails
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  await ALLOWED_EMAILS.syncWithFirestore();

  return NextResponse.json({
    success: true,
    emails: ALLOWED_EMAILS.list(),
    count: ALLOWED_EMAILS.size(),
  });
}

// POST — Add a new email
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  try {
    const { email, password, role } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email e Senha são obrigatórios' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!normalized.includes('@') || !normalized.includes('.')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Email já está autorizado' }, { status: 409 });
    }

    // Create user in Firebase Auth via REST API
    const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.FIREBASE_API_KEY || 'AIzaSyAGFdbWod_EJgh4OC056IvcqT621L9FWUo'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, password, returnSecureToken: false })
    });
    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      const msg = fbData.error?.message || 'Erro no Firebase Auth';
      if (msg === 'EMAIL_EXISTS') {
        // Se o usuário já existe no Firebase, nós o ignoramos e apenas autorizamos ele no nosso banco local.
        console.log(`[Auth] Usuário ${normalized} já existia no Firebase. Autorizando localmente.`);
      } else {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    const adminEmail = await getSessionEmail(request);
    const validRole = role === 'admin' ? 'admin' : 'user';
    
    await ALLOWED_EMAILS.syncWithFirestore(); // Ensure we have latest before adding
    
    const added = ALLOWED_EMAILS.add(normalized, adminEmail || 'admin', validRole);

    if (added) {
      import('@/lib/firebase').then(m => m.saveAuthStoreToFirestore(ALLOWED_EMAILS.getRawData()));
    }

    return NextResponse.json({ 
      success: added,
      message: added ? 'Usuário adicionado com sucesso' : 'Email já existe na base local'
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

    await ALLOWED_EMAILS.syncWithFirestore();

    const removed = ALLOWED_EMAILS.remove(normalized);
    if (!removed) {
      return NextResponse.json({ error: 'Não foi possível remover (usuário não encontrado ou é padrão)' }, { status: 400 });
    }

    import('@/lib/firebase').then(m => m.saveAuthStoreToFirestore(ALLOWED_EMAILS.getRawData()));

    return NextResponse.json({
      success: true,
      message: `Email ${normalized} removido da lista local. (Exclua no Firebase Console para remover a conta Auth)`,
      total: ALLOWED_EMAILS.size(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

// PUT — Update an email's role
export async function PUT(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  try {
    const { email, role } = await request.json();
    const validRole = role === 'admin' ? 'admin' : 'user';

    if (!email || !role || typeof email !== 'string' || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Email e Função (admin/user) são obrigatórios' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Email não está na lista' }, { status: 404 });
    }

    await ALLOWED_EMAILS.syncWithFirestore();
    
    const updated = ALLOWED_EMAILS.updateRole(normalized, validRole);
    if (!updated) {
      return NextResponse.json({ error: 'Não foi possível atualizar (usuário não encontrado ou é default)' }, { status: 400 });
    }

    import('@/lib/firebase').then(m => m.saveAuthStoreToFirestore(ALLOWED_EMAILS.getRawData()));

    return NextResponse.json({ success: true, message: 'Função atualizada com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
