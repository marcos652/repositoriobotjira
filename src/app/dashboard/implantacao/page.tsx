'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Loader2, CheckCircle2, MessageSquare, Edit2, Play, Pause, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface OnboardingClient {
  id: string;
  jiraKey?: string;
  name: string;
  status: 'Pendente' | 'Implantando' | 'Em Pausa' | 'Concluído';
  jiraStatus?: string;
  assignee?: string | null;
  assigneeAvatar?: string | null;
  observations: string;
  startDate: string;
  lastUpdate: string;
}

const STATUS_CONFIG: Record<OnboardingClient['status'], { color: string; icon: React.ElementType }> = {
  'Pendente':    { color: '#F59E0B', icon: Clock },
  'Implantando': { color: '#3B82F6', icon: Play },
  'Em Pausa':    { color: '#EF4444', icon: Pause },
  'Concluído':   { color: '#10B981', icon: CheckCircle2 },
};

const COLUMNS: OnboardingClient['status'][] = ['Pendente', 'Implantando', 'Em Pausa', 'Concluído'];

const RichTextEditor = ({ content, onChange }: { content: string; onChange: (val: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content && !editor.isFocused) editor.commands.setContent(content);
  }, [content, editor]);

  return (
    <div className="im-tiptap-wrapper">
      <div className="im-tiptap-toolbar">
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'active' : ''}><b>B</b></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'active' : ''}><i>I</i></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? 'active' : ''}>• Lista</button>
      </div>
      <EditorContent editor={editor} className="im-tiptap-content" />
    </div>
  );
};

export default function ImplantacaoPage() {
  const [clients, setClients] = useState<OnboardingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OnboardingClient | null>(null);
  const [name, setName] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [renderTimestamp] = useState(() => Date.now());

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding');
      if (res.ok) setClients((await res.json()).clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadClients());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const openModal = (client?: OnboardingClient) => {
    setEditingClient(client ?? null);
    setName(client?.name ?? '');
    setObservations(client?.observations ?? '');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingClient(null); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let res;
      if (editingClient) {
        res = await fetch('/api/onboarding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingClient.id, observations }),
        });
      } else {
        res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, observations }),
        });
      }
      if (res.ok) { await loadClients(); closeModal(); showToast(editingClient ? 'Observação salva!' : 'Cliente criado no Jira!'); }
      else showToast('Erro ao salvar.', 'error');
    } catch { showToast('Falha na comunicação.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OnboardingClient['status']) => {
    e.preventDefault();
    e.currentTarget.classList.remove('im-drag-over');
    const clientId = e.dataTransfer.getData('clientId');
    const client = clients.find(c => c.id === clientId);
    if (!client || client.status === newStatus) return;

    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));

    const res = await fetch('/api/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, status: newStatus }),
    });

    if (res.ok) showToast(`Movido para ${newStatus}`);
    else { await loadClients(); showToast('Erro ao mover', 'error'); }
  };

  const getElapsedDays = (dateStr: string) => {
    if (!dateStr) return 0;
    return Math.floor((renderTimestamp - new Date(dateStr).getTime()) / 86400000);
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.observations || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="im-root">
      {/* Header */}
      <div className="im-header">
        <div className="im-header-info">
          <div>
            <h1 className="im-title">Implantação</h1>
            <p className="im-subtitle">{clients.length} clientes • Board DSMM #607</p>
          </div>
          <div className="im-search-box">
            <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="im-search-input" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="im-refresh-btn" onClick={loadClients} disabled={loading} title="Atualizar">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="im-add-btn" onClick={() => openModal()}>
            <Plus size={14} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="im-kanban">
        {loading ? (
          <div className="im-loading"><Loader2 size={32} className="animate-spin" style={{ color: '#3B82F6' }} /></div>
        ) : (
          COLUMNS.map(col => {
            const colClients = filtered.filter(c => c.status === col);
            const { color, icon: Icon } = STATUS_CONFIG[col];
            return (
              <div key={col} className="im-column"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('im-drag-over'); }}
                onDragLeave={e => e.currentTarget.classList.remove('im-drag-over')}
                onDrop={e => handleDrop(e, col)}
              >
                <div className="im-col-header" style={{ borderBottomColor: color }}>
                  <div className="im-col-title">
                    <Icon size={14} style={{ color }} />
                    <span style={{ color }}>{col}</span>
                  </div>
                  <span className="im-col-count">{colClients.length}</span>
                </div>

                <div className="im-col-body">
                  {colClients.map(client => (
                    <div key={client.id} className="im-card" draggable
                      onDragStart={e => e.dataTransfer.setData('clientId', client.id)}
                      onClick={() => { if (client.jiraKey) window.open(`/dashboard/consultar-demanda?key=${client.jiraKey}`, '_blank'); }}
                      style={{ cursor: 'pointer' }}>
                      <div className="im-card-top">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                          {client.jiraKey && (
                            <a
                              href={`https://movingpay.atlassian.net/browse/${client.jiraKey}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: '10px', fontWeight: 800, color: '#818CF8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}
                            >
                              {client.jiraKey} <ExternalLink size={9} />
                            </a>
                          )}
                          <h3 className="im-card-name">{client.name}</h3>
                        </div>
                        <div className="im-card-actions">
                          <button onClick={e => { e.stopPropagation(); openModal(client); }} className="im-icon-btn edit" title="Editar observação">
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>

                      {client.jiraStatus && (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(99,102,241,0.08)', color: '#818CF8', display: 'inline-block', width: 'fit-content' }}>
                          {client.jiraStatus}
                        </span>
                      )}

                      {client.observations && client.observations !== '<p></p>' && (
                        <div className="im-card-obs">
                          <MessageSquare size={10} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div className="im-obs-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(client.observations) }} />
                        </div>
                      )}

                      <div className="im-card-footer">
                        {client.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {client.assigneeAvatar
                              ? <img src={client.assigneeAvatar} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                              : <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#fff' }}>
                                  {client.assignee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                            }
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.assignee.split(' ')[0]}</span>
                          </div>
                        ) : <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Sem responsável</span>}
                        <span className="im-badge-days">{getElapsedDays(client.startDate)}d</span>
                      </div>
                    </div>
                  ))}

                  {colClients.length === 0 && (
                    <div className="im-empty-col">Arraste para cá</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal — só edita observação (nome vem do Jira) */}
      {modalOpen && (
        <div className="im-modal-overlay">
          <div className="im-modal">
            <div className="im-modal-header">
              <h2>{editingClient ? `Observações — ${editingClient.name}` : 'Novo Cliente no Board'}</h2>
              <button onClick={closeModal} className="im-close-btn">&times;</button>
            </div>
            <div className="im-modal-body">
              {!editingClient && (
                <div className="im-form-group">
                  <label>Nome do Cliente</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Empresa S/A" className="im-input" />
                </div>
              )}
              <div className="im-form-group">
                <label>Observações / Impedimentos</label>
                <RichTextEditor content={observations} onChange={setObservations} />
              </div>
            </div>
            <div className="im-modal-footer">
              <button onClick={closeModal} className="im-btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || (!editingClient && !name.trim())} className="im-btn-primary">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {editingClient ? 'Salvar Observação' : 'Criar no Jira'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`im-toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .im-root { display: flex; flex-direction: column; min-width:0; gap: 24px; }

        .im-header { display: flex; align-items: flex-end; justify-content: space-between; gap:16px;flex-wrap:wrap; }
        .im-header-info { display: flex; align-items: flex-end; gap: 24px;flex-wrap:wrap; }
        .im-title { font-size: 32px;line-height:36px; font-weight: 500;letter-spacing:-.02em; color: var(--text-primary); }
        .im-subtitle { font-size: 14px; color: var(--text-tertiary); margin-top: 6px; }

        .im-search-box { margin-left:0; }
        .im-search-input { height:40px;padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); font-size: 13px; width: 240px; outline: none; transition: border-color 0.15s; }
        .im-search-input:focus { border-color: var(--accent-blue); }

        .im-refresh-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-secondary); cursor: pointer; transition: background .15s,color .15s; }
        .im-refresh-btn:hover { color: var(--text-primary); background: var(--bg-card-hover); }
        .im-add-btn { display: flex; align-items: center; gap: 8px; min-height:40px;padding: 0 18px; border-radius: 8px; background: var(--accent-blue); color: white; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: opacity .15s; }
        .im-add-btn:hover { opacity:.9; }

        .im-kanban { display: grid; grid-template-columns: repeat(4,minmax(260px,1fr)); gap: 16px; overflow-x: auto; padding-bottom: 8px; }
        .im-loading { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 300px; }

        .im-column { display: flex; flex-direction: column; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-primary); overflow: hidden; transition: border-color 0.15s; }
        .im-drag-over { border-color: var(--accent-blue) !important; background: rgba(59,130,246,0.03); }
        .im-col-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; background: var(--bg-card); border-bottom: 2px solid; }
        .im-col-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; }
        .im-col-count { background: var(--bg-secondary); padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--text-secondary); border: 1px solid var(--border-primary); }

        .im-col-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: calc(100vh - 260px); }
        .im-empty-col { padding: 20px; text-align: center; font-size: 12px; color: var(--text-tertiary); font-weight: 600; border: 2px dashed var(--border-secondary); border-radius: 10px; pointer-events: none; }

        .im-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 14px; transition: border-color .15s; display: flex; flex-direction: column; gap: 8px; cursor: grab; }
        .im-card:active { cursor: grabbing; opacity: 0.9; }
        .im-card:hover { border-color: var(--border-focus); }

        .im-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .im-card-name { font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .im-card-actions { display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
        .im-card:hover .im-card-actions { opacity: 1; }
        .im-icon-btn { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: none; background: var(--bg-card); cursor: pointer; color: var(--text-tertiary); transition: all 0.2s; }
        .im-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

        .im-card-obs { display: flex; align-items: flex-start; gap: 6px; background: var(--bg-card); padding: 8px 10px; border-radius: 8px; font-size: 11px; color: var(--text-secondary); line-height: 1.5; border: 1px solid var(--border-secondary); }
        .im-obs-content { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-size: 11px; word-break: break-word; }
        .im-obs-content :global(p) { margin: 0; }
        .im-obs-content :global(ul) { padding-left: 14px; margin: 0; }

        .im-card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-tertiary); font-weight: 600; }
        .im-badge-days { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 700; color: var(--text-secondary); border: 1px solid var(--border-primary); }

        /* Modal */
        .im-modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); padding:20px;display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .im-modal { width: 100%; max-width: 500px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-primary); overflow: hidden; }
        .im-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-primary); }
        .im-modal-header h2 { font-size: 16px; font-weight: 800; color: var(--text-primary); }
        .im-close-btn { background: none; border: none; font-size: 24px; color: var(--text-tertiary); cursor: pointer; line-height: 1; }
        .im-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .im-form-group { display: flex; flex-direction: column; gap: 8px; }
        .im-form-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .im-input { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .im-input:focus { border-color: var(--accent-blue); }
        .im-modal-footer { padding: 16px 24px; background: var(--bg-secondary); border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 12px; }
        .im-btn-secondary { padding: 10px 18px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; }
        .im-btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; background: var(--accent-blue); color: white; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
        .im-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .im-tiptap-wrapper { border: 1px solid var(--border-primary); border-radius: 8px; background: var(--bg-secondary); overflow: hidden; }
        .im-tiptap-wrapper:focus-within { border-color: var(--accent-blue); }
        .im-tiptap-toolbar { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border-primary); background: var(--bg-card); }
        .im-tiptap-toolbar button { padding: 4px 8px; border-radius: 6px; border: none; background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 12px; font-weight: 600; }
        .im-tiptap-toolbar button.active { background: var(--accent-blue); color: white; }

        .im-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; z-index: 10000; }
        .im-toast.success { background: #10B981; }
        .im-toast.error { background: #F43F5E; }

        :global(.im-tiptap-content .ProseMirror) { padding: 12px 14px; min-height: 80px; outline: none; font-size: 13px; color: var(--text-primary); }
        :global(.im-tiptap-content .ProseMirror p) { margin: 0 0 6px 0; }
        :global(.im-tiptap-content .ProseMirror ul) { padding-left: 20px; margin: 0 0 6px 0; }
        @media (max-width:780px){.im-header,.im-header-info{align-items:flex-start;flex-direction:column}.im-search-box,.im-search-input{width:100%}.im-header>div:last-child{width:100%}.im-add-btn{flex:1;justify-content:center}.im-title{font-size:28px;line-height:34px}.im-modal-header,.im-modal-body,.im-modal-footer{padding-left:18px;padding-right:18px}}
      `}</style>
    </div>
  );
}
