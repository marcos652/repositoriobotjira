import { NextRequest, NextResponse } from 'next/server';
import { REQUEST_LOG_STORE } from '../_store';
import { isAdmin } from '../_admin';

// Rastreabilidade de chamadas de escrita na API — só admin visualiza (IP, email,
// rota, permitida ou não de cada requisição).
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  const logs = await REQUEST_LOG_STORE.getRecent(200);
  return NextResponse.json({ success: true, logs });
}
