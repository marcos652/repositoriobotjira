'use client';
import React, { useState, useEffect } from 'react';
import { Rocket, Plus, Loader2, CheckCircle2, AlertTriangle, MessageSquare, Trash2, Edit2, Play, Pause, Clock } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface OnboardingClient {
  id: string;
  name: string;
  status: 'Aguardando' | 'Em Andamento' | 'Testes' | 'Concluído';
  observations: string;
  startDate: string;
  lastUpdate: string;
}

const STATUS_CONFIG = {
  'Aguardando': { color: '#F59E0B', icon: Clock },
  'Em Andamento': { color: '#3B82F6', icon: Play },
  'Testes': { color: '#8B5CF6', icon: Pause },
  'Concluído': { color: '#10B981', icon: CheckCircle2 },
};

const RichTextEditor = ({ content, onChange }: { content: string, onChange: (val: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content && !editor.isFocused) {
      editor.commands.setContent(content);
    }
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

  // Form states
  const [name, setName] = useState('');
  const [status, setStatus] = useState<OnboardingClient['status']>('Aguardando');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  // New UI states
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (client?: OnboardingClient) => {
    if (client) {
      setEditingClient(client);
      setName(client.name);
      setStatus(client.status);
      setObservations(client.observations);
    } else {
      setEditingClient(null);
      setName('');
      setStatus('Aguardando');
      setObservations('');
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingClient(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const method = editingClient ? 'PUT' : 'POST';
      const body = editingClient
        ? { id: editingClient.id, name, status, observations }
        : { name, status, observations };

      const res = await fetch('/api/onboarding', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadClients();
        closeModal();
        showToast(editingClient ? 'Cliente editado com sucesso!' : 'Cliente adicionado com sucesso!');
      } else {
        showToast('Erro ao salvar cliente.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente da implantação?')) return;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
        showToast('Cliente removido!');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao remover cliente.', 'error');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, client: OnboardingClient) => {
    e.dataTransfer.setData('clientId', client.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('im-drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('im-drag-over');
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OnboardingClient['status']) => {
    e.preventDefault();
    e.currentTarget.classList.remove('im-drag-over');
    
    const clientId = e.dataTransfer.getData('clientId');
    if (!clientId) return;

    const client = clients.find(c => c.id === clientId);
    if (!client || client.status === newStatus) return;

    // Optimistic update
    const previousClients = [...clients];
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));

    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, status: newStatus })
      });

      if (res.ok) {
        showToast(`Movido para ${newStatus}`);
      } else {
        setClients(previousClients);
        showToast('Erro ao mover cliente', 'error');
      }
    } catch (err) {
      setClients(previousClients);
      showToast('Erro de conexão', 'error');
    }
  };

  const getElapsedDays = (dateStr: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Organize by columns for Kanban
  const columns: OnboardingClient['status'][] = ['Aguardando', 'Em Andamento', 'Testes', 'Concluído'];

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.observations.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="im-root">
      {/* Header */}
      <div className="im-header">
        <div className="im-header-info">
          <div className="im-icon-wrapper"><Rocket size={20} className="im-icon" /></div>
          <div>
            <h1 className="im-title">Implantação</h1>
            <p className="im-subtitle">Acompanhe novos clientes na esteira de integração</p>
          </div>
          <div className="im-search-box">
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="im-search-input"
            />
          </div>
        </div>
        <button className="im-add-btn" onClick={() => openModal()}>
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      {/* Kanban Board */}
      <div className="im-kanban">
        {loading ? (
          <div className="im-loading">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          columns.map(col => {
            const colClients = filteredClients.filter(c => c.status === col);
            const { color, icon: Icon } = STATUS_CONFIG[col];
            
            return (
              <div 
                key={col} 
                className="im-column"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col)}
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
                    <div 
                      key={client.id} 
                      className="im-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, client)}
                    >
                      <div className="im-card-top">
                        <h3 className="im-card-name">{client.name}</h3>
                        <div className="im-card-actions">
                          <button onClick={() => openModal(client)} className="im-icon-btn edit" title="Editar">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDelete(client.id)} className="im-icon-btn del" title="Remover">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {client.observations && client.observations !== '<p></p>' && (
                        <div className="im-card-obs">
                          <MessageSquare size={10} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div className="im-obs-content" dangerouslySetInnerHTML={{ __html: client.observations }} />
                        </div>
                      )}
                      
                      <div className="im-card-footer">
                        <span title={`Atualizado em: ${new Date(client.lastUpdate).toLocaleDateString('pt-BR')}`}>
                          <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                          {new Date(client.lastUpdate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="im-badge-days" title="Tempo na esteira">{getElapsedDays(client.startDate)}d</span>
                      </div>
                    </div>
                  ))}
                  
                  {colClients.length === 0 && (
                    <div className="im-empty-col">Nenhum cliente</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="im-modal-overlay">
          <div className="im-modal">
            <div className="im-modal-header">
              <h2>{editingClient ? 'Editar Cliente' : 'Novo Cliente em Implantação'}</h2>
              <button onClick={closeModal} className="im-close-btn">&times;</button>
            </div>
            
            <div className="im-modal-body">
              <div className="im-form-group">
                <label>Nome do Cliente</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Empresa S/A"
                  className="im-input"
                />
              </div>
              
              <div className="im-form-group">
                <label>Status Atual</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                  className="im-input"
                >
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="im-form-group">
                <label>Observações / Impedimentos</label>
                <RichTextEditor 
                  content={observations} 
                  onChange={setObservations}
                />
              </div>
            </div>
            
            <div className="im-modal-footer">
              <button onClick={closeModal} className="im-btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} className="im-btn-primary">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`im-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <style jsx>{`
        .im-root { display: flex; flex-direction: column; height: 100%; gap: 20px; }
        
        .im-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-primary); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .im-header-info { display: flex; align-items: center; gap: 16px; }
        .im-icon-wrapper { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #EC4899, #8B5CF6); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 16px rgba(236, 72, 153, 0.25); }
        .im-title { font-size: 18px; font-weight: 800; color: var(--text-primary); }
        .im-subtitle { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
        
        .im-search-box { margin-left: 24px; border-left: 1px solid var(--border-primary); padding-left: 24px; }
        .im-search-input { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); font-size: 13px; width: 220px; outline: none; transition: all 0.2s; }
        .im-search-input:focus { border-color: var(--accent-blue); width: 260px; }
        
        .im-add-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; background: var(--accent-blue); color: white; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .im-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }

        .im-kanban { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; overflow-x: auto; padding-bottom: 10px; }
        .im-loading { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 300px; }
        
        .im-column { display: flex; flex-direction: column; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-primary); overflow: hidden; }
        .im-col-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-secondary); border-bottom: 2px solid; }
        .im-col-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .im-col-count { background: var(--bg-card); padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 800; color: var(--text-secondary); border: 1px solid var(--border-primary); }
        
        .im-col-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
        .im-empty-col { padding: 20px; text-align: center; font-size: 12px; color: var(--text-tertiary); font-weight: 600; border: 2px dashed var(--border-secondary); border-radius: 10px; margin-top: 4px; pointer-events: none; }
        
        .im-drag-over { background: rgba(59, 130, 246, 0.05); border-color: var(--accent-blue); }
        .im-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; transition: all 0.2s; display: flex; flex-direction: column; gap: 10px; cursor: grab; }
        .im-card:active { cursor: grabbing; opacity: 0.9; transform: scale(0.98); }
        .im-card:hover { border-color: var(--border-focus); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .im-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .im-card-name { font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.4; }
        
        .im-card-actions { display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .im-card:hover .im-card-actions { opacity: 1; }
        .im-icon-btn { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: none; background: var(--bg-card); cursor: pointer; color: var(--text-tertiary); transition: all 0.2s; }
        .im-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .im-icon-btn.del:hover { color: var(--accent-rose); background: rgba(244, 63, 94, 0.1); }
        
        .im-card-obs { display: flex; align-items: flex-start; gap: 6px; background: rgba(0,0,0,0.1); padding: 8px 10px; border-radius: 8px; font-size: 11px; color: var(--text-secondary); line-height: 1.5; border: 1px solid rgba(255,255,255,0.02); }
        .im-card-obs svg { flex-shrink: 0; margin-top: 2px; opacity: 0.7; }
        
        .im-card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-tertiary); font-weight: 600; margin-top: 2px; }
        .im-badge-days { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 700; color: var(--text-secondary); border: 1px solid var(--border-primary); }
        
        /* Modal */
        .im-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s; }
        .im-modal { width: 100%; max-width: 500px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-primary); box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .im-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-primary); }
        .im-modal-header h2 { font-size: 16px; font-weight: 800; color: var(--text-primary); }
        .im-close-btn { background: none; border: none; font-size: 24px; color: var(--text-tertiary); cursor: pointer; line-height: 1; transition: color 0.2s; }
        .im-close-btn:hover { color: var(--text-primary); }
        
        .im-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .im-form-group { display: flex; flex-direction: column; gap: 8px; }
        .im-form-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .im-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); font-size: 13px; font-family: var(--font-sans); outline: none; transition: border-color 0.2s; }
        .im-input:focus { border-color: var(--accent-blue); }
        .im-textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); font-size: 13px; font-family: var(--font-sans); outline: none; transition: border-color 0.2s; min-height: 100px; resize: vertical; }
        .im-textarea:focus { border-color: var(--accent-blue); }
        
        .im-tiptap-wrapper { border: 1px solid var(--border-primary); border-radius: 10px; background: var(--bg-secondary); overflow: hidden; transition: border-color 0.2s; }
        .im-tiptap-wrapper:focus-within { border-color: var(--accent-blue); }
        .im-tiptap-toolbar { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border-primary); background: var(--bg-card); }
        .im-tiptap-toolbar button { padding: 4px 8px; border-radius: 6px; border: none; background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 12px; font-weight: 600; transition: all 0.2s; }
        .im-tiptap-toolbar button:hover { background: var(--bg-hover); color: var(--text-primary); }
        .im-tiptap-toolbar button.active { background: var(--accent-blue); color: white; }
        
        .im-obs-content { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; font-size: 11px; word-break: break-word; }
        .im-obs-content :global(p) { margin: 0; }
        .im-obs-content :global(ul) { padding-left: 14px; margin: 0; }
        
        .im-modal-footer { padding: 16px 24px; background: var(--bg-secondary); border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 12px; }
        .im-btn-secondary { padding: 10px 18px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .im-btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
        .im-btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; background: var(--accent-blue); color: white; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
        .im-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3); }
        .im-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        /* Toast animation */
        .im-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; color: white; z-index: 10000; animation: slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .im-toast.success { background: var(--accent-emerald, #10B981); }
        .im-toast.error { background: var(--accent-rose, #F43F5E); }
        @keyframes slideUpToast { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Estilos globais para a div interna do TipTap */
        :global(.im-tiptap-content .ProseMirror) { padding: 12px 14px; min-height: 80px; outline: none; font-size: 13px; color: var(--text-primary); }
        :global(.im-tiptap-content .ProseMirror p) { margin: 0 0 6px 0; }
        :global(.im-tiptap-content .ProseMirror ul) { padding-left: 20px; margin: 0 0 6px 0; }
      `}</style>
    </div>
  );
}
