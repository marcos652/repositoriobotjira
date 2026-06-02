import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface OnboardingClient {
  id: string;
  name: string;
  status: 'Aguardando' | 'Em Andamento' | 'Testes' | 'Concluído';
  observations: string;
  startDate: string;
  lastUpdate: string;
}

const PROJECT_DATA_PATH = () => path.join(process.cwd(), 'data', 'onboarding.json');
const TMP_DATA_PATH = '/tmp/jiraops-onboarding.json';

function getWritableDataPath(): string {
  try {
    const projectPath = PROJECT_DATA_PATH();
    const dataDir = path.dirname(projectPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    return projectPath;
  } catch {
    return TMP_DATA_PATH;
  }
}

function loadClients(): OnboardingClient[] {
  let committed: OnboardingClient[] = [];
  let tmp: OnboardingClient[] = [];

  try {
    const projectPath = PROJECT_DATA_PATH();
    if (fs.existsSync(projectPath)) {
      committed = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    }
  } catch {}

  try {
    if (fs.existsSync(TMP_DATA_PATH)) {
      tmp = JSON.parse(fs.readFileSync(TMP_DATA_PATH, 'utf-8'));
    }
  } catch {}

  // Merge (tmp overrides committed if there is newer data based on lastUpdate or just merge by ID)
  const mergedMap = new Map<string, OnboardingClient>();
  for (const c of committed) mergedMap.set(c.id, c);
  for (const c of tmp) {
    const existing = mergedMap.get(c.id);
    if (!existing || new Date(c.lastUpdate).getTime() > new Date(existing.lastUpdate).getTime()) {
      mergedMap.set(c.id, c);
    }
  }

  // Also check if any from TMP were explicitly deleted? For this simple implementation we'll trust TMP if it exists and has data.
  // Actually, a simpler way is to just use TMP if it exists, otherwise project path.
  // Wait, if vercel restarts, TMP is cleared. So if TMP is cleared, we use project path.
  // But wait, if we delete an item in TMP, the merge will bring it back from committed!
  // To solve this, let's just use the TMP file exclusively if it exists and was modified recently, OR use a single source of truth approach.
  // We'll use the same approach as emails: if TMP exists, it usually contains the full array.
  
  // So let's just read from Writable path primarily, but if it's empty, fallback to the other.
  try {
    const wp = getWritableDataPath();
    if (fs.existsSync(wp)) {
      return JSON.parse(fs.readFileSync(wp, 'utf-8'));
    } else if (wp === TMP_DATA_PATH && fs.existsSync(PROJECT_DATA_PATH())) {
      // If we are on Vercel and TMP is empty, read from committed data
      return JSON.parse(fs.readFileSync(PROJECT_DATA_PATH(), 'utf-8'));
    }
  } catch (e) {
    console.error('[Onboarding] Error loading clients:', e);
  }

  return [];
}

function saveClients(clients: OnboardingClient[]) {
  try {
    const wp = getWritableDataPath();
    const dataDir = path.dirname(wp);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(wp, JSON.stringify(clients, null, 2), 'utf-8');
    
    // Also backup to tmp if wp is project path
    if (wp !== TMP_DATA_PATH) {
      try { fs.writeFileSync(TMP_DATA_PATH, JSON.stringify(clients, null, 2), 'utf-8'); } catch {}
    }
  } catch (e) {
    console.error('[Onboarding] Error saving clients:', e);
  }
}

export async function GET() {
  const clients = loadClients();
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, status, observations } = body;

    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const newClient: OnboardingClient = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      status: status || 'Aguardando',
      observations: observations || '',
      startDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    const clients = loadClients();
    clients.push(newClient);
    saveClients(clients);

    return NextResponse.json({ success: true, client: newClient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, status, observations } = body;

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const clients = loadClients();
    const index = clients.findIndex(c => c.id === id);

    if (index === -1) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    clients[index] = {
      ...clients[index],
      name: name ?? clients[index].name,
      status: status ?? clients[index].status,
      observations: observations ?? clients[index].observations,
      lastUpdate: new Date().toISOString(),
    };

    saveClients(clients);

    return NextResponse.json({ success: true, client: clients[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    let clients = loadClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
