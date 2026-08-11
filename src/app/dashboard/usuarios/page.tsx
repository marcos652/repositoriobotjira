'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, ShieldOff, Hash, Search, Filter,
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, Globe, Clock, Lock, Unlock, ChevronDown, ChevronUp,
} from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  isDefault: boolean;
  addedAt: string;
  lastIp: string | null;
  lastLogin: string | null;
  ipBlocked: boolean;
}

interface IpRow {
  ip: string;
  email: string;
  firstSeen: string;
  lastSeen: string;
  blocked: boolean;
  loginCount: number;
}

type MessageType = { type: 'success' | 'error'; text: string } | null;

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

function formatDateTime(d: string | null): string {
  if (!d) return 'Nunca';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [allIps, setAllIps] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<MessageType>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [togglingIp, setTogglingIp] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, ipsRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch('/api/auth/ips'),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      } else {
        const data = await usersRes.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Falha ao carregar usuários' });
      }
      if (ipsRes.ok) {
        const data = await ipsRes.json();
        setAllIps(data.ips || []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleToggleStatus = async (user: UserRow) => {
    setTogglingStatus(user.email);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleStatus', email: user.email }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      if (res.ok) await loadUsers();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setTogglingStatus(null); }
  };

  const handleBanLastIp = async (user: UserRow) => {
    setTogglingIp(user.email);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'banLastIp', email: user.email }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      if (res.ok) await loadUsers();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setTogglingIp(null); }
  };

  const handleToggleSpecificIp = async (email: string, ip: string, currentlyBlocked: boolean) => {
    const key = `${email}:${ip}`;
    setTogglingIp(key);
    try {
      const res = await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentlyBlocked ? 'unblock' : 'block', ip, email }),
      });
      const data = await res.json();
      setMessage({ type: res.ok && data.success ? 'success' : 'error', text: data.message || data.error || 'Falha ao atualizar IP' });
      if (res.ok) await loadUsers();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setTogglingIp(null); }
  };

  const ipsByEmail = (email: string): IpRow[] => {
    return allIps
      .filter(ip => ip.email === email.trim().toLowerCase())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  };

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.lastIp || '').includes(q);
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    ipsBlocked: users.filter(u => u.ipBlocked).length,
  };

  return (
    <div className="us-root">
      {/* ── Hero ── */}
      <div className="us-hero">
        <div className="us-hero-grid" />
        <div className="us-hero-orb us-hero-orb-1" />
        <div className="us-hero-orb us-hero-orb-2" />
        <div className="us-hero-content">
          <div className="us-hero-left">
            <div className="us-hero-icon">
              <Users size={24} color="#fff" />
            </div>
            <div>
              <h1 className="us-hero-title">Gestão de Usuários</h1>
              <p className="us-hero-sub">Acesso, bloqueio de contas e banimento de IP</p>
            </div>
          </div>
          <button className="us-btn-refresh" onClick={loadUsers} title="Atualizar">
            <RefreshCw size={15} className={loading ? 'us-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="us-stats">
        {[
          { label: 'Total', value: stats.total, icon: Hash, color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Ativos', value: stats.active, icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Bloqueados', value: stats.blocked, icon: ShieldOff, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'IPs Banidos', value: stats.ipsBlocked, icon: Globe, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
        ].map(s => (
          <div key={s.label} className="us-stat-card">
            <div className="us-stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="us-stat-value">{s.value}</p>
              <p className="us-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`us-msg us-msg-${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {message.text}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="us-filters">
        <div className="us-search-wrapper">
          <Search size={14} className="us-search-icon" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou IP..."
            className="us-search"
          />
        </div>
        <div className="us-filter-btns">
          <Filter size={13} style={{ color: 'var(--text-tertiary)' }} />
          {(['all', 'active', 'blocked'] as const).map(f => (
            <button
              key={f}
              className={`us-filter-btn ${filterStatus === f ? 'us-filter-active' : ''}`}
              onClick={() => setFilterStatus(f)}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="us-table-container">
        {loading ? (
          <div className="us-loading">
            <Loader2 size={20} className="us-spin" />
            <span>Carregando usuários...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="us-empty">
            <Users size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4, marginBottom: '8px' }} />
            <p>{users.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum resultado encontrado'}</p>
          </div>
        ) : (
          <div className="us-list">
            {/* Column headers — reads as a table, styled as the app's card-list */}
            <div className="us-row us-row-head">
              <span className="us-col-id">ID</span>
              <span className="us-col-user">Usuário</span>
              <span className="us-col-ip">Último IP</span>
              <span className="us-col-status">Status</span>
              <span className="us-col-login">Último login</span>
              <span className="us-col-actions">Ações</span>
            </div>

            {filtered.map(user => {
              const userIps = ipsByEmail(user.email);
              const isExpanded = expandedUser === user.email;
              return (
              <React.Fragment key={user.id}>
              <div className={`us-row ${user.status === 'blocked' ? 'us-row-blocked' : ''}`}>
                <span className="us-col-id us-mono">{user.id}</span>

                <span className="us-col-user">
                  <div className="us-avatar" style={{ background: user.status === 'blocked' ? 'linear-gradient(135deg, #EF4444, #be123c)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    {getInitials(user.name)}
                  </div>
                  <div className="us-user-info">
                    <span className="us-user-name">
                      {user.name}
                      {user.role === 'admin' && <span className="us-badge us-badge-admin">Admin</span>}
                    </span>
                    <span className="us-user-email">{user.email}</span>
                  </div>
                </span>

                <span className="us-col-ip">
                  {user.lastIp ? (
                    <>
                      <span className="us-mono">{user.lastIp}</span>
                      {user.ipBlocked && <span className="us-badge us-badge-blocked">Banido</span>}
                    </>
                  ) : (
                    <span className="us-muted">—</span>
                  )}
                  {userIps.length > 0 && (
                    <button
                      className="us-ip-expand-btn"
                      onClick={() => setExpandedUser(isExpanded ? null : user.email)}
                      title="Ver todos os IPs deste usuário"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {userIps.length > 1 ? `+${userIps.length - 1}` : ''}
                    </button>
                  )}
                </span>

                <span className="us-col-status">
                  {user.status === 'blocked' ? (
                    <span className="us-badge us-badge-blocked">Bloqueado</span>
                  ) : (
                    <span className="us-badge us-badge-active">Ativo</span>
                  )}
                </span>

                <span className="us-col-login">
                  <Clock size={12} style={{ opacity: 0.5 }} /> {formatDateTime(user.lastLogin)}
                </span>

                <span className="us-col-actions">
                  <button
                    className="us-btn-toggle"
                    onClick={() => handleToggleStatus(user)}
                    disabled={togglingStatus === user.email || user.isDefault}
                    title={user.isDefault ? 'Administrador padrão não pode ser bloqueado' : undefined}
                    style={{
                      background: user.status === 'blocked' ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                      color: user.status === 'blocked' ? '#fff' : 'var(--text-secondary)',
                      border: user.status === 'blocked' ? 'none' : '1px solid var(--border-primary)',
                    }}
                  >
                    {togglingStatus === user.email ? <Loader2 size={13} className="us-spin" /> : user.status === 'blocked' ? <Unlock size={13} /> : <Lock size={13} />}
                    {user.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                  </button>
                  <button
                    className="us-action-btn"
                    onClick={() => handleBanLastIp(user)}
                    disabled={togglingIp === user.email || !user.lastIp}
                    title={user.lastIp ? (user.ipBlocked ? 'Liberar este IP' : 'Banir este IP') : 'Nenhum IP registrado ainda'}
                  >
                    {togglingIp === user.email ? <Loader2 size={13} className="us-spin" /> : <Globe size={13} />}
                    {user.ipBlocked ? 'Liberar IP' : 'Banir IP'}
                  </button>
                </span>
              </div>

              {isExpanded && (
                <div className="us-ip-panel">
                  <p className="us-ip-panel-title">Todos os IPs de {user.name} ({userIps.length})</p>
                  {userIps.map(ipEntry => {
                    const key = `${user.email}:${ipEntry.ip}`;
                    return (
                      <div key={key} className="us-ip-row">
                        <span className="us-mono">{ipEntry.ip}</span>
                        <span className="us-ip-meta">{ipEntry.loginCount} login(s) • último em {formatDateTime(ipEntry.lastSeen)}</span>
                        {ipEntry.blocked && <span className="us-badge us-badge-blocked">Banido</span>}
                        <button
                          className="us-action-btn us-ip-row-btn"
                          onClick={() => handleToggleSpecificIp(user.email, ipEntry.ip, ipEntry.blocked)}
                          disabled={togglingIp === key}
                        >
                          {togglingIp === key ? <Loader2 size={12} className="us-spin" /> : <Globe size={12} />}
                          {ipEntry.blocked ? 'Liberar' : 'Banir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .us-root { display: flex; flex-direction: column; height: 100%; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-primary); background: var(--bg-card); }

        /* ── Hero ── */
        .us-hero { position: relative; flex-shrink: 0; overflow: hidden; background: linear-gradient(140deg, #0C0518, #13082B 40%, #1A0A38); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 28px 32px; }
        .us-hero-grid { position: absolute; inset: 0; opacity: 0.03; background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px; }
        .us-hero-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .us-hero-orb-1 { width: 280px; height: 280px; background: rgba(99,102,241,0.15); top: -100px; right: 10%; animation: usOrb 8s ease-in-out infinite; }
        .us-hero-orb-2 { width: 200px; height: 200px; background: rgba(139,92,246,0.1); bottom: -80px; left: 20%; animation: usOrb 11s ease-in-out infinite reverse; }
        @keyframes usOrb { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.08); } }
        .us-hero-content { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; }
        .us-hero-left { display: flex; align-items: center; gap: 16px; }
        .us-hero-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366F1, #8B5CF6); box-shadow: 0 8px 28px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
        .us-hero-title { font-size: 20px; font-weight: 800; color: #F1F5F9; }
        .us-hero-sub { font-size: 13px; color: rgba(148,163,184,0.65); margin-top: 2px; }
        .us-btn-refresh { width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .us-btn-refresh:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* ── Stats ── */
        .us-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 24px 0; }
        .us-stat-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 14px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); transition: all 0.2s; }
        .us-stat-card:hover { border-color: rgba(255,255,255,0.08); transform: translateY(-1px); }
        .us-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .us-stat-value { font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .us-stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 600; }

        /* ── Message ── */
        .us-msg { display: flex; align-items: center; gap: 10px; margin: 16px 24px 0; padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; animation: usSlideIn 0.3s ease; }
        .us-msg-success { background: var(--accent-emerald-light); color: var(--accent-emerald); border: 1px solid var(--accent-emerald-light); }
        .us-msg-error { background: var(--accent-rose-light); color: var(--accent-rose); border: 1px solid var(--accent-rose-light); }
        @keyframes usSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Filters ── */
        .us-filters { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
        .us-search-wrapper { flex: 1; position: relative; }
        .us-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
        .us-search { width: 100%; padding: 10px 14px 10px 36px; border-radius: 10px; font-size: 12px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); color: var(--text-primary); outline: none; font-family: var(--font-sans); transition: border-color 0.2s; box-sizing: border-box; }
        .us-search:focus { border-color: #6366F1; }
        .us-search::placeholder { color: var(--text-tertiary); }
        .us-filter-btns { display: flex; align-items: center; gap: 6px; }
        .us-filter-btn { padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: var(--font-sans); border: 1px solid var(--border-secondary); background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; }
        .us-filter-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-secondary); }
        .us-filter-active { background: rgba(99,102,241,0.1) !important; color: #818CF8 !important; border-color: rgba(99,102,241,0.25) !important; }

        /* ── Table ── */
        .us-table-container { flex: 1; margin: 16px 24px 24px; overflow: hidden; display: flex; flex-direction: column; border-radius: 14px; }
        .us-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; }
        .us-loading, .us-empty { padding: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-tertiary); font-size: 13px; background: var(--bg-secondary); border-radius: 14px; border: 1px solid var(--border-secondary); }

        .us-row { display: grid; grid-template-columns: 64px 2fr 1.3fr 100px 150px auto; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 14px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); transition: all 0.2s; }
        .us-row:hover { border-color: rgba(255,255,255,0.08); background: var(--bg-card-hover); }
        .us-row-blocked { opacity: 0.8; }
        .us-row-head { background: transparent; border: none; padding: 0 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); }

        .us-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        .us-muted { color: var(--text-tertiary); }

        .us-col-user { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .us-avatar { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .us-user-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .us-user-name { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .us-user-email { font-size: 11px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .us-col-ip { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; }
        .us-col-login { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-tertiary); }

        .us-ip-expand-btn { display: flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; font-family: var(--font-sans); border: 1px solid var(--border-secondary); background: transparent; color: var(--text-tertiary); cursor: pointer; }
        .us-ip-expand-btn:hover { background: rgba(99,102,241,0.1); color: #818CF8; border-color: rgba(99,102,241,0.25); }

        .us-ip-panel { display: flex; flex-direction: column; gap: 6px; padding: 12px 20px 14px 84px; margin-top: -4px; border-radius: 0 0 14px 14px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); border-top: none; }
        .us-ip-panel-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin: 0 0 4px; }
        .us-ip-row { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-secondary); padding: 6px 0; }
        .us-ip-meta { font-size: 11px; color: var(--text-tertiary); }
        .us-ip-row-btn { margin-left: auto; padding: 5px 10px; }

        .us-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .us-badge-active { background: var(--accent-emerald-light); color: var(--accent-emerald); border: 1px solid var(--accent-emerald-light); }
        .us-badge-blocked { background: var(--accent-rose-light); color: var(--accent-rose); border: 1px solid var(--accent-rose-light); }
        .us-badge-admin { background: var(--accent-blue-light); color: var(--accent-blue); border: 1px solid var(--accent-blue-light); }

        .us-col-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .us-btn-toggle { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; font-family: var(--font-sans); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .us-btn-toggle:hover:not(:disabled) { transform: translateY(-1px); }
        .us-btn-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
        .us-action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; font-family: var(--font-sans); border: 1px solid var(--border-secondary); background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .us-action-btn:hover:not(:disabled) { background: rgba(245,158,11,0.1); color: #F59E0B; border-color: rgba(245,158,11,0.25); }
        .us-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .us-spin { animation: usSpin 1s linear infinite; }
        @keyframes usSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .us-row { grid-template-columns: 1fr; gap: 8px; }
          .us-row-head { display: none; }
          .us-col-actions { justify-content: flex-start; }
          .us-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
