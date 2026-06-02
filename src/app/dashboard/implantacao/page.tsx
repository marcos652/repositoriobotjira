'use client';
import React, { useState, useEffect } from 'react';
import { Rocket, Plus, Loader2, CheckCircle2, AlertTriangle, MessageSquare, Trash2, Edit2, Play, Pause, Clock } from 'lucide-react';

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
      }
    } catch (e) {
      console.error(e);
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Organize by columns for Kanban
  const columns: OnboardingClient['status'][] = ['Aguardando', 'Em Andamento', 'Testes', 'Concluído'];

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
            const colClients = clients.filter(c => c.status === col);
            const { color, icon: Icon } = STATUS_CONFIG[col];
            
            return (
              <div key={col} className="im-column">
                <div className="im-col-header" style={{ borderBottomColor: color }}>
                  <div className="im-col-title">
                    <Icon size={14} style={{ color }} />
                    <span style={{ color }}>{col}</span>
                  </div>
                  <span className="im-col-count">{colClients.length}</span>
                </div>
                
                <div className="im-col-body">
                  {colClients.map(client => (
                    <div key={client.id} className="im-card">
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
                      
                      {client.observations && (
                        <div className="im-card-obs">
                          <MessageSquare size={10} />
                          <p>{client.observations}</p>
                        </div>
                      )}
                      
                      <div className="im-card-footer">
                        <span>Atualizado em {new Date(client.lastUpdate).toLocaleDateString('pt-BR')}</span>
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
                <textarea 
                  value={observations} 
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Detalhes sobre a integração, tokens, pendências..."
                  className="im-textarea"
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

      <style jsx>{`
        .im-root { display: flex; flex-direction: column; height: 100%; gap: 20px; }
        
        .im-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-primary); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .im-header-info { display: flex; align-items: center; gap: 16px; }
        .im-icon-wrapper { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #EC4899, #8B5CF6); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 16px rgba(236, 72, 153, 0.25); }
        .im-title { font-size: 18px; font-weight: 800; color: var(--text-primary); }
        .im-subtitle { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
        
        .im-add-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; background: var(--accent-blue); color: white; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .im-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }

        .im-kanban { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; overflow-x: auto; padding-bottom: 10px; }
        .im-loading { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 300px; }
        
        .im-column { display: flex; flex-direction: column; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-primary); overflow: hidden; }
        .im-col-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-secondary); border-bottom: 2px solid; }
        .im-col-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .im-col-count { background: var(--bg-card); padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 800; color: var(--text-secondary); border: 1px solid var(--border-primary); }
        
        .im-col-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
        .im-empty-col { padding: 20px; text-align: center; font-size: 12px; color: var(--text-tertiary); font-weight: 600; border: 2px dashed var(--border-secondary); border-radius: 10px; margin-top: 4px; }
        
        .im-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; transition: all 0.2s; display: flex; flex-direction: column; gap: 10px; }
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
        
        .im-card-footer { font-size: 10px; color: var(--text-tertiary); font-weight: 600; }
        
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
        
        .im-modal-footer { padding: 16px 24px; background: var(--bg-secondary); border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 12px; }
        .im-btn-secondary { padding: 10px 18px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .im-btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
        .im-btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; background: var(--accent-blue); color: white; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
        .im-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3); }
        .im-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
