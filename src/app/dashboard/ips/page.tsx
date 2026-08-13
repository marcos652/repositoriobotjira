'use client';
/* eslint-disable react-hooks/set-state-in-effect */
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
      <div className="ip-header">
        <div>
          <h1 className="ip-title">Gerenciar IPs</h1>
          <p className="ip-subtitle">Controle de acesso por endereço IP</p>
        </div>
        <div className="ip-header-actions">
          <button className="ip-btn-refresh" onClick={loadIPs} title="Atualizar">
            <RefreshCw size={14} className={loading ? 'ip-spin' : ''} />
            Atualizar
          </button>
          <button className="ip-btn-add" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? <X size={15} /> : <Plus size={15} />}
            {showAdd ? 'Cancelar' : 'Adicionar IP'}
          </button>
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
                    <div className="ip-card-icon" style={{ background: entry.blocked ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
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
                            background: entry.blocked ? '#6366F1' : 'var(--bg-card)',
                            color: entry.blocked ? '#fff' : 'var(--text-secondary)',
                            border: entry.blocked ? '1px solid #6366F1' : '1px solid var(--border-primary)'
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
        .ip-root { display: flex; flex-direction: column; gap: 24px; min-width: 0; min-height: 0; height: 100%; }
        .ip-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; flex-shrink: 0; }
        .ip-title { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -.02em; }
        .ip-subtitle { margin: 6px 0 0; color: var(--text-tertiary); font-size: 14px; }
        .ip-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ip-btn-refresh, .ip-btn-add { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border-radius: 8px; font: 600 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .ip-btn-refresh { border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); }
        .ip-btn-refresh:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
        .ip-btn-refresh:disabled { opacity: .55; cursor: not-allowed; }
        .ip-btn-add { border: 1px solid #6366F1; background: #6366F1; color: #fff; }
        .ip-btn-add:hover { background: #8B5CF6; border-color: #8B5CF6; }

        .ip-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .ip-stat-card { display: flex; align-items: center; gap: 14px; min-width: 0; padding: 20px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-primary); }
        .ip-stat-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ip-stat-value { margin: 0; color: var(--text-primary); font-size: 24px; font-weight: 500; line-height: 28px; font-variant-numeric: tabular-nums; }
        .ip-stat-label { margin: 3px 0 0; color: var(--text-tertiary); font-size: 11px; font-weight: 600; }

        .ip-msg { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .ip-msg-success { background: rgba(16,185,129,0.08); color: #10B981; border: 1px solid rgba(16,185,129,0.15); }
        .ip-msg-error { background: rgba(244,63,94,0.08); color: #F43F5E; border: 1px solid rgba(244,63,94,0.15); }

        .ip-add-card { border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-primary); overflow: hidden; }
        .ip-add-header { display: flex; align-items: center; gap: 10px; padding: 18px 20px; color: var(--text-primary); border-bottom: 1px solid var(--border-secondary); font-size: 13px; font-weight: 600; }
        .ip-add-body { display: flex; align-items: flex-end; gap: 12px; padding: 20px; }
        .ip-add-field { flex: 1 1 220px; display: flex; flex-direction: column; gap: 6px; }
        .ip-add-field label { display: flex; align-items: center; gap: 6px; color: var(--text-tertiary); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .ip-input { width: 100%; height: 40px; padding: 0 12px; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); outline: none; font: 400 12px var(--font-sans); transition: border-color .15s; }
        .ip-input:focus { border-color: #6366F1; }
        .ip-input::placeholder { color: var(--text-tertiary); }
        .ip-btn-save { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 18px; border-radius: 8px; border: 1px solid #6366F1; background: #6366F1; color: #fff; font: 700 12px var(--font-sans); cursor: pointer; flex-shrink: 0; }
        .ip-btn-save:hover:not(:disabled) { background: #8B5CF6; border-color: #8B5CF6; }
        .ip-btn-save:disabled { opacity: .5; cursor: not-allowed; }

        .ip-filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ip-search-wrapper { flex: 1 1 280px; position: relative; }
        .ip-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
        .ip-search { width: 100%; height: 40px; padding: 0 14px 0 36px; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); outline: none; font: 400 13px var(--font-sans); transition: border-color .15s; }
        .ip-search:focus { border-color: #6366F1; }
        .ip-search::placeholder { color: var(--text-tertiary); }
        .ip-filter-btns { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .ip-filter-btn { min-height: 40px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-tertiary); font: 600 11px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .ip-filter-btn:hover { background: var(--bg-secondary); color: var(--text-secondary); }
        .ip-filter-active { background: rgba(99,102,241,0.1) !important; color: #818CF8 !important; border-color: rgba(99,102,241,0.25) !important; }

        .ip-table-container { flex: 1; min-height: 260px; overflow: auto; display: flex; flex-direction: column; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .ip-list { display: flex; flex-direction: column; }
        .ip-loading, .ip-empty { flex: 1; min-height: 260px; padding: 48px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-tertiary); font-size: 13px; }
        .ip-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 20px; border-bottom: 1px solid var(--border-secondary); background: transparent; transition: background .15s; }
        .ip-card:last-child { border-bottom: 0; }
        .ip-card:hover { background: var(--bg-secondary); }
        .ip-card-blocked { opacity: .78; }
        .ip-card-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
        .ip-card-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
        .ip-card-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .ip-card-header { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
        .ip-card-ip { color: var(--text-primary); font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 14px; font-weight: 700; letter-spacing: .02em; }
        .ip-card-email { color: var(--text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ip-card-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ip-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .ip-badge-active { background: rgba(34,197,94,0.12); color: #22C55E; border: 1px solid rgba(34,197,94,0.2); }
        .ip-badge-blocked { background: rgba(244,63,94,0.12); color: #F43F5E; border: 1px solid rgba(244,63,94,0.2); }
        .ip-meta-item { display: flex; align-items: center; gap: 4px; color: var(--text-tertiary); font-size: 11px; font-weight: 500; }
        .ip-edit-input { min-width: 160px; height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid #6366F1; background: var(--bg-secondary); color: var(--text-primary); outline: none; font: 400 12px var(--font-sans); }
        .ip-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .ip-btn-toggle { min-width: 100px; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px; border-radius: 8px; font: 700 11px var(--font-sans); cursor: pointer; }
        .ip-btn-toggle:disabled { opacity: .55; cursor: not-allowed; }
        .ip-action-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s, border-color .15s; }
        .ip-action-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ip-action-edit:hover { background: rgba(99,102,241,0.1); color: #818CF8; border-color: rgba(99,102,241,0.25); }
        .ip-action-delete:hover { background: rgba(244,63,94,0.1); color: #F43F5E; border-color: rgba(244,63,94,0.25); }
        .ip-action-save { background: rgba(34,197,94,0.1); color: #22C55E; border-color: rgba(34,197,94,0.2); }
        .ip-action-save:hover { background: rgba(34,197,94,0.2); }
        .ip-action-cancel { background: rgba(239,68,68,0.1); color: #EF4444; border-color: rgba(239,68,68,0.2); }
        .ip-action-cancel:hover { background: rgba(239,68,68,0.2); }
        .ip-spin { animation: ipSpin 1s linear infinite; }
        @keyframes ipSpin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .ip-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ip-add-body { align-items: stretch; flex-wrap: wrap; }
          .ip-btn-save { width: 100%; }
          .ip-card { align-items: flex-start; flex-direction: column; }
          .ip-card-actions { align-self: stretch; }
        }
        @media (max-width: 640px) {
          .ip-root { height: auto; }
          .ip-title { font-size: 28px; line-height: 34px; }
          .ip-header-actions { width: 100%; }
          .ip-btn-refresh, .ip-btn-add { flex: 1; }
          .ip-stats { grid-template-columns: 1fr; gap: 12px; }
          .ip-filter-btns { width: 100%; }
          .ip-filter-btn { flex: 1; }
          .ip-card-left { align-items: flex-start; }
          .ip-card-header, .ip-card-header > div { width: 100%; flex-direction: column; align-items: stretch; }
          .ip-edit-input { min-width: 0; width: 100%; }
          .ip-card-actions { flex-wrap: wrap; }
          .ip-btn-toggle { flex: 1; }
        }
      `}</style>
    </div>
  );
}
