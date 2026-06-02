'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Shield, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle,
  Pencil, X, Save, Search, Filter, RefreshCw, ShieldCheck, ShieldOff,
  Monitor, Clock, User, Hash
} from 'lucide-react';

interface IPEntry {
  ip: string;
  email: string;
  firstSeen: string;
  lastSeen: string;
  blocked: boolean;
  loginCount: number;
}

type MessageType = { type: 'success' | 'error'; text: string } | null;

export default function IPManagementPage() {
  const [ips, setIps] = useState<IPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<MessageType>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  const [toggling, setToggling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addIP, setAddIP] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit form
  const [editing, setEditing] = useState<string | null>(null);
  const [editIP, setEditIP] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadIPs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/ips');
      if (res.ok) {
        const data = await res.json();
        setIps(data.ips || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIPs(); }, [loadIPs]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getKey = (entry: IPEntry) => `${entry.email}:${entry.ip}`;

  // ── Actions ──
  const handleToggleBlock = async (entry: IPEntry) => {
    const key = getKey(entry);
    setToggling(key);
    try {
      const res = await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: entry.ip, email: entry.email, action: entry.blocked ? 'unblock' : 'block' }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      await loadIPs();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setToggling(null); }
  };

  const handleRemove = async (entry: IPEntry) => {
    const key = getKey(entry);
    setRemoving(key);
    try {
      const res = await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: entry.ip, email: entry.email, action: 'remove' }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      await loadIPs();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setRemoving(null); }
  };

  const handleAdd = async () => {
    if (!addEmail.includes('@') || !addIP.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: addIP.trim(), email: addEmail.trim(), action: 'add' }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      if (res.ok) { setAddEmail(''); setAddIP(''); setShowAdd(false); }
      await loadIPs();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setAdding(false); }
  };

  const startEdit = (entry: IPEntry) => {
    setEditing(getKey(entry));
    setEditIP(entry.ip);
    setEditEmail(entry.email);
  };

  const handleSaveEdit = async (entry: IPEntry) => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          oldEmail: entry.email,
          oldIP: entry.ip,
          newEmail: editEmail.trim(),
          newIP: editIP.trim(),
        }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      if (res.ok) setEditing(null);
      await loadIPs();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setSaving(false); }
  };

  // ── Filter ──
  const filtered = ips.filter(entry => {
    const matchSearch = !search || entry.ip.includes(search) || entry.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' && !entry.blocked) || (filterStatus === 'blocked' && entry.blocked);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: ips.length,
    active: ips.filter(e => !e.blocked).length,
    blocked: ips.filter(e => e.blocked).length,
    uniqueIPs: new Set(ips.map(e => e.ip)).size,
  };

  return (
    <div className="ip-root">
      {/* ── Hero ── */}
      <div className="ip-hero">
        <div className="ip-hero-grid" />
        <div className="ip-hero-orb ip-hero-orb-1" />
        <div className="ip-hero-orb ip-hero-orb-2" />
        <div className="ip-hero-orb ip-hero-orb-3" />
        <div className="ip-hero-content">
          <div className="ip-hero-left">
            <div className="ip-hero-icon">
              <Globe size={24} color="#fff" />
            </div>
            <div>
              <h1 className="ip-hero-title">Gerenciar IPs</h1>
              <p className="ip-hero-sub">Controle de acesso por endereço IP</p>
            </div>
          </div>
          <div className="ip-hero-actions">
            <button className="ip-btn-refresh" onClick={loadIPs} title="Atualizar">
              <RefreshCw size={15} className={loading ? 'ip-spin' : ''} />
            </button>
            <button className="ip-btn-add" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? <X size={15} /> : <Plus size={15} />}
              {showAdd ? 'Cancelar' : 'Adicionar IP'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="ip-stats">
        {[
          { label: 'Total', value: stats.total, icon: Hash, color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Ativos', value: stats.active, icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Bloqueados', value: stats.blocked, icon: ShieldOff, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'IPs Únicos', value: stats.uniqueIPs, icon: Monitor, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
        ].map(s => (
          <div key={s.label} className="ip-stat-card">
            <div className="ip-stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="ip-stat-value">{s.value}</p>
              <p className="ip-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`ip-msg ip-msg-${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {message.text}
        </div>
      )}

      {/* ── Add Form ── */}
      {showAdd && (
        <div className="ip-add-card">
          <div className="ip-add-header">
            <Shield size={16} style={{ color: '#6366F1' }} />
            <span>Adicionar novo IP</span>
          </div>
          <div className="ip-add-body">
            <div className="ip-add-field">
              <label><User size={12} /> Email do usuário</label>
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="ip-input"
              />
            </div>
            <div className="ip-add-field">
              <label><Monitor size={12} /> Endereço IP</label>
              <input
                type="text"
                value={addIP}
                onChange={e => setAddIP(e.target.value)}
                placeholder="192.168.1.100"
                className="ip-input"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              className="ip-btn-save"
              onClick={handleAdd}
              disabled={adding || !addEmail.includes('@') || !addIP.trim()}
            >
              {adding ? <Loader2 size={14} className="ip-spin" /> : <Plus size={14} />}
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="ip-filters">
        <div className="ip-search-wrapper">
          <Search size={14} className="ip-search-icon" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por IP ou email..."
            className="ip-search"
          />
        </div>
        <div className="ip-filter-btns">
          <Filter size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
          {(['all', 'active', 'blocked'] as const).map(f => (
            <button
              key={f}
              className={`ip-filter-btn ${filterStatus === f ? 'ip-filter-active' : ''}`}
              onClick={() => setFilterStatus(f)}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="ip-table-container">
        {loading ? (
          <div className="ip-loading">
            <Loader2 size={20} className="ip-spin" />
            <span>Carregando registros...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ip-empty">
            <Globe size={32} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '8px' }} />
            <p>{ips.length === 0 ? 'Nenhum IP registrado ainda' : 'Nenhum resultado encontrado'}</p>
          </div>
        ) : (
          <div className="ip-list">
            {filtered.map((entry) => {
              const key = getKey(entry);
              const isEditing = editing === key;

              return (
                <div key={key} className={`ip-card ${entry.blocked ? 'ip-card-blocked' : ''}`}>
                  <div className="ip-card-left">
                    <div className="ip-card-icon" style={{ background: entry.blocked ? 'linear-gradient(135deg, var(--accent-rose), #be123c)' : 'linear-gradient(135deg, var(--accent-emerald), #047857)' }}>
                      <Globe size={18} />
                    </div>
                    
                    <div className="ip-card-info">
                      <div className="ip-card-header">
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              className="ip-edit-input"
                              value={editIP}
                              onChange={e => setEditIP(e.target.value)}
                              placeholder="Endereço IP"
                            />
                            <input
                              className="ip-edit-input"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              placeholder="Email do usuário"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="ip-card-ip">{entry.ip}</span>
                            <span className="ip-card-email">— {entry.email}</span>
                          </>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <div className="ip-card-meta">
                          {entry.blocked ? (
                            <span className="ip-badge ip-badge-blocked">Bloqueado</span>
                          ) : (
                            <span className="ip-badge ip-badge-active">Autorizado</span>
                          )}
                          <span className="ip-meta-item"><Hash size={12} /> {entry.loginCount} logins</span>
                          <span className="ip-meta-item"><Clock size={12} /> Último: {new Date(entry.lastSeen).toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ip-card-actions">
                    {isEditing ? (
                      <>
                        <button
                          className="ip-action-btn ip-action-save"
                          onClick={() => handleSaveEdit(entry)}
                          disabled={saving}
                          title="Salvar"
                        >
                          {saving ? <Loader2 size={14} className="ip-spin" /> : <Save size={14} />}
                        </button>
                        <button
                          className="ip-action-btn ip-action-cancel"
                          onClick={() => setEditing(null)}
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="ip-btn-toggle"
                          onClick={() => handleToggleBlock(entry)}
                          disabled={toggling === key}
                          style={{
                            background: entry.blocked ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                            color: entry.blocked ? '#fff' : 'var(--text-secondary)',
                            boxShadow: entry.blocked ? 'var(--shadow-glow-blue)' : 'none',
                            border: entry.blocked ? 'none' : '1px solid var(--border-primary)'
                          }}
                        >
                          {toggling === key ? <Loader2 size={14} className="ip-spin" /> : entry.blocked ? 'Liberar IP' : 'Bloquear'}
                        </button>
                        <button
                          className="ip-action-btn ip-action-edit"
                          onClick={() => startEdit(entry)}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="ip-action-btn ip-action-delete"
                          onClick={() => handleRemove(entry)}
                          disabled={removing === key}
                          title="Remover"
                        >
                          {removing === key ? <Loader2 size={14} className="ip-spin" /> : <Trash2 size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .ip-root { display: flex; flex-direction: column; height: 100%; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-primary); background: var(--bg-card); }

        /* ── Hero ── */
        .ip-hero { position: relative; flex-shrink: 0; overflow: hidden; background: linear-gradient(140deg, #0C0518, #13082B 40%, #1A0A38); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 28px 32px; }
        .ip-hero-grid { position: absolute; inset: 0; opacity: 0.03; background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px; }
        .ip-hero-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .ip-hero-orb-1 { width: 280px; height: 280px; background: rgba(99,102,241,0.15); top: -100px; right: 10%; animation: ipOrb 8s ease-in-out infinite; }
        .ip-hero-orb-2 { width: 200px; height: 200px; background: rgba(139,92,246,0.1); bottom: -80px; left: 20%; animation: ipOrb 11s ease-in-out infinite reverse; }
        .ip-hero-orb-3 { width: 150px; height: 150px; background: rgba(244,63,94,0.08); top: 20%; right: 35%; animation: ipOrb 9s ease-in-out infinite 2s; }
        @keyframes ipOrb { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.08); } }
        .ip-hero-content { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; }
        .ip-hero-left { display: flex; align-items: center; gap: 16px; }
        .ip-hero-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366F1, #8B5CF6); box-shadow: 0 8px 28px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
        .ip-hero-title { font-size: 20px; font-weight: 800; color: #F1F5F9; }
        .ip-hero-sub { font-size: 13px; color: rgba(148,163,184,0.65); margin-top: 2px; }
        .ip-hero-actions { display: flex; gap: 10px; }
        .ip-btn-refresh { width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .ip-btn-refresh:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .ip-btn-add { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; font-family: var(--font-sans); border: none; cursor: pointer; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.3); transition: all 0.2s; }
        .ip-btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.4); }

        /* ── Stats ── */
        .ip-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 24px 0; }
        .ip-stat-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 14px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); transition: all 0.2s; }
        .ip-stat-card:hover { border-color: rgba(255,255,255,0.08); transform: translateY(-1px); }
        .ip-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ip-stat-value { font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .ip-stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 600; }

        /* ── Message ── */
        .ip-msg { display: flex; align-items: center; gap: 10px; margin: 0 24px; padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; animation: ipSlideIn 0.3s ease; }
        .ip-msg-success { background: rgba(16,185,129,0.08); color: #10B981; border: 1px solid rgba(16,185,129,0.15); }
        .ip-msg-error { background: rgba(244,63,94,0.08); color: #F43F5E; border: 1px solid rgba(244,63,94,0.15); }
        @keyframes ipSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Add Card ── */
        .ip-add-card { margin: 0 24px; border-radius: 14px; background: var(--bg-secondary); border: 1px solid rgba(99,102,241,0.2); overflow: hidden; animation: ipSlideIn 0.3s ease; }
        .ip-add-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; font-size: 13px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-secondary); }
        .ip-add-body { padding: 18px; display: flex; gap: 12px; align-items: flex-end; }
        .ip-add-field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .ip-add-field label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
        .ip-input { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 12px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-primary); outline: none; font-family: var(--font-sans); transition: border-color 0.2s; }
        .ip-input:focus { border-color: #6366F1; }
        .ip-input::placeholder { color: var(--text-tertiary); }
        .ip-btn-save { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; font-family: var(--font-sans); border: none; cursor: pointer; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #fff; transition: all 0.2s; flex-shrink: 0; }
        .ip-btn-save:hover:not(:disabled) { transform: translateY(-1px); }
        .ip-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Filters ── */
        .ip-filters { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
        .ip-search-wrapper { flex: 1; position: relative; }
        .ip-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
        .ip-search { width: 100%; padding: 10px 14px 10px 36px; border-radius: 10px; font-size: 12px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); color: var(--text-primary); outline: none; font-family: var(--font-sans); transition: border-color 0.2s; }
        .ip-search:focus { border-color: #6366F1; }
        .ip-search::placeholder { color: var(--text-tertiary); }
        .ip-filter-btns { display: flex; align-items: center; gap: 6px; }
        .ip-filter-btn { padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: var(--font-sans); border: 1px solid var(--border-secondary); background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; }
        .ip-filter-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-secondary); }
        .ip-filter-active { background: rgba(99,102,241,0.1) !important; color: #818CF8 !important; border-color: rgba(99,102,241,0.25) !important; }

        /* ── Cards List ── */
        .ip-table-container { flex: 1; margin: 16px 24px 24px; overflow: hidden; display: flex; flex-direction: column; border-radius: 14px; }
        .ip-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; }
        .ip-loading, .ip-empty { padding: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-tertiary); font-size: 13px; background: var(--bg-secondary); border-radius: 14px; border: 1px solid var(--border-secondary); }
        
        .ip-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-radius: 14px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); transition: all 0.2s; }
        .ip-card:hover { border-color: rgba(255,255,255,0.08); background: var(--bg-card-hover); }
        .ip-card-blocked { opacity: 0.8; }
        
        .ip-card-left { display: flex; align-items: center; gap: 16px; flex: 1; }
        .ip-card-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        
        .ip-card-info { display: flex; flex-direction: column; gap: 6px; }
        .ip-card-header { display: flex; align-items: baseline; gap: 8px; }
        .ip-card-ip { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-weight: 700; color: #F8FAFC; font-size: 14px; letter-spacing: 0.02em; }
        
        .ip-card-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ip-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .ip-badge-active { background: rgba(34,197,94,0.12); color: #22C55E; border: 1px solid rgba(34,197,94,0.2); }
        .ip-badge-blocked { background: rgba(244,63,94,0.12); color: #F43F5E; border: 1px solid rgba(244,63,94,0.2); }
        
        .ip-meta-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
        
        /* Edit input */
        .ip-edit-input { padding: 6px 10px; border-radius: 8px; font-size: 12px; background: var(--bg-card); border: 1px solid #6366F1; color: var(--text-primary); outline: none; font-family: var(--font-sans); min-width: 160px; }

        /* Actions */
        .ip-card-actions { display: flex; align-items: center; gap: 8px; }
        .ip-btn-toggle { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 700; font-family: var(--font-sans); cursor: pointer; transition: all 0.2s; min-width: 100px; justify-content: center; }
        .ip-btn-toggle:hover:not(:disabled) { transform: translateY(-1px); }
        .ip-btn-toggle:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Actions */
        .ip-actions { display: flex; gap: 4px; }
        .ip-action-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-secondary); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; color: var(--text-tertiary); }
        .ip-action-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .ip-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ip-action-block:hover { background: rgba(239,68,68,0.1); color: #EF4444; border-color: rgba(239,68,68,0.25); }
        .ip-action-unblock:hover { background: rgba(34,197,94,0.1); color: #22C55E; border-color: rgba(34,197,94,0.25); }
        .ip-action-edit:hover { background: rgba(99,102,241,0.1); color: #818CF8; border-color: rgba(99,102,241,0.25); }
        .ip-action-delete:hover { background: rgba(244,63,94,0.1); color: #F43F5E; border-color: rgba(244,63,94,0.25); }
        .ip-action-save { background: rgba(34,197,94,0.1); color: #22C55E; border-color: rgba(34,197,94,0.2); }
        .ip-action-save:hover { background: rgba(34,197,94,0.2); }
        .ip-action-cancel { background: rgba(239,68,68,0.1); color: #EF4444; border-color: rgba(239,68,68,0.2); }
        .ip-action-cancel:hover { background: rgba(239,68,68,0.2); }

        /* Utilities */
        .ip-spin { animation: ipSpin 1s linear infinite; }
        @keyframes ipSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .ip-stats { grid-template-columns: repeat(2, 1fr); }
          .ip-filters { flex-direction: column; align-items: stretch; }
          .ip-add-body { flex-direction: column; }
          .ip-hero-actions { flex-direction: column; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
