import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ─── Local notes (observations) — keyed by Jira issue key ───
const NOTES_PATH = () => path.join(process.cwd(), 'data', 'onboarding-notes.json');
const NOTES_TMP  = '/tmp/jiraops-onboarding-notes.json';

function getWritablePath(): string {
  try {
    const p = NOTES_PATH();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return p;
  } catch { return NOTES_TMP; }
}

function loadNotes(): Record<string, string> {
  try {
    const p = getWritablePath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    const fallback = NOTES_PATH();
    if (fs.existsSync(fallback)) return JSON.parse(fs.readFileSync(fallback, 'utf-8'));
  } catch {}
  return {};
}

function saveNotes(notes: Record<string, string>) {
  try {
    fs.writeFileSync(getWritablePath(), JSON.stringify(notes, null, 2), 'utf-8');
  } catch (e) { console.error('[Onboarding] saveNotes error:', e); }
}

// ─── Jira ───
const JIRA_BASE  = 'https://movingpay.atlassian.net';
const BOARD_ID   = 607;

function jiraHeaders() {
  const email = process.env.JIRA_EMAIL!;
  const token = process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN!;
  return {
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

// Jira status name → dashboard column
function mapStatus(jiraStatus: string): string {
  const s = jiraStatus.toLowerCase().trim();
  if (['in progress'].includes(s)) return 'Implantando';
  if (['paused'].includes(s)) return 'Em Pausa';
  if (['done', 'closed', 'concluído'].includes(s)) return 'Concluído';
  return 'Pendente'; // "Tarefas pendentes", "Backlog", "To Do"
}

// Dashboard column → Jira transition ID
const COLUMN_TRANSITION: Record<string, string> = {
  'Implantando': '4', // "Iniciar Implantação"
  'Concluído':   '2', // "Closed"
};

// ─── GET — fetch from board 607 ───
export async function GET() {
  try {
    const res = await fetch(
      `${JIRA_BASE}/rest/agile/1.0/board/${BOARD_ID}/issue?maxResults=100&fields=summary,status,assignee,priority,issuetype,created,updated`,
      { headers: jiraHeaders() }
    );

    if (!res.ok) throw new Error(`Jira board ${res.status}`);
    const data = await res.json();
    const notes = loadNotes();

    const clients = (data.issues as any[]).map((issue: any) => ({
      id: issue.key,
      jiraKey: issue.key,
      name: issue.fields.summary,
      status: mapStatus(issue.fields.status.name),
      jiraStatus: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName ?? null,
      assigneeAvatar: issue.fields.assignee?.avatarUrls?.['48x48'] ?? null,
      observations: notes[issue.key] ?? '',
      startDate: issue.fields.created,
      lastUpdate: issue.fields.updated,
    }));

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[Onboarding] GET error:', error);
    return NextResponse.json({ error: error.message, clients: [] }, { status: 500 });
  }
}

// ─── PUT — transition in Jira + save local notes ───
export async function PUT(request: NextRequest) {
  try {
    const { id, status, observations } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    if (observations !== undefined) {
      const notes = loadNotes();
      notes[id] = observations;
      saveNotes(notes);
    }

    if (status) {
      const transitionId = COLUMN_TRANSITION[status];
      if (transitionId) {
        const res = await fetch(`${JIRA_BASE}/rest/api/3/issue/${id}/transitions`, {
          method: 'POST',
          headers: jiraHeaders(),
          body: JSON.stringify({ transition: { id: transitionId } }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          console.error(`[Onboarding] transition failed for ${id}:`, err);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST — create issue in DSMM project ───
export async function POST(request: NextRequest) {
  try {
    const { name, observations } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const res = await fetch(`${JIRA_BASE}/rest/api/2/issue`, {
      method: 'POST',
      headers: jiraHeaders(),
      body: JSON.stringify({
        fields: {
          project: { key: 'DSMM' },
          summary: name,
          issuetype: { name: 'Task' },
        },
      }),
    });

    if (!res.ok) throw new Error(`Jira create: ${await res.text().catch(() => '')}`);
    const created = await res.json();
    const issueKey = created.key;

    if (observations) {
      const notes = loadNotes();
      notes[issueKey] = observations;
      saveNotes(notes);
    }

    return NextResponse.json({ success: true, id: issueKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE — transition to Closed in Jira ───
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    await fetch(`${JIRA_BASE}/rest/api/3/issue/${id}/transitions`, {
      method: 'POST',
      headers: jiraHeaders(),
      body: JSON.stringify({ transition: { id: '2' } }), // Closed
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
