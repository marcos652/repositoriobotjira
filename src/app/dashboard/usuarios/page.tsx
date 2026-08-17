'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, ShieldOff, Hash, Search, Filter,
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, Globe, Clock, Lock, Unlock, ChevronDown, ChevronUp, X,
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
  // Opcional de propósito: isso vem de um fetch JSON, não de um contrato garantido.
  // Um dado antigo em cache (ou o Fast Refresh preservando estado de antes do campo
  // existir) chega sem ele, e "ausente" não é o mesmo que "não tem 2FA".
  hasTotp?: boolean;
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
  const [resetandoTotp, setResetandoTotp] = useState<string | null>(null);
  // Usuário aguardando confirmação do reset de 2FA. Guarda a linha inteira (e não só
  // o e-mail) porque o modal mostra nome e situação do cadastro.
  const [confirmarReset, setConfirmarReset] = useState<UserRow | null>(null);
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

  // Escape fecha a confirmação. Sem isso o único jeito de sair de um modal de ação
  // destrutiva seria mirar no Cancelar.
  useEffect(() => {
    if (!confirmarReset) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmarReset(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmarReset]);

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

  // Apaga o segredo do Authenticator da pessoa. No próximo login ela cai na tela de QR
  // code de novo, como se fosse o primeiro acesso.
  //
  // Confirmação obrigatória porque é irreversível e derruba o acesso dela até reescanear:
  // não existe "desfazer" — o segredo é apagado, não desativado.
  // O window.confirm nativo mostrava "localhost:3000 diz" e não dá para formatar nada;
  // a confirmação virou um modal do próprio painel.
  const handleResetTotp = async (user: UserRow) => {
    setConfirmarReset(null);
    setResetandoTotp(user.email);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      // A rota responde 200 com success:false quando não havia cadastro (nada a
      // apagar), então res.ok sozinho pintaria "Nenhum TOTP encontrado" de verde.
      setMessage({
        type: res.ok && data.success ? 'success' : 'error',
        text: data.message || data.error || 'Não foi possível resetar',
      });
      if (res.ok) await loadUsers();
    } catch { setMessage({ type: 'error', text: 'Erro de conexão' }); }
    finally { setResetandoTotp(null); }
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
      <div className="us-header">
        <div>
          <h1 className="us-title">Gestão de Usuários</h1>
          <p className="us-subtitle">Acesso, bloqueio de contas e banimento de IP</p>
        </div>
        <button className="us-btn-refresh" onClick={loadUsers} title="Atualizar">
          <RefreshCw size={14} className={loading ? 'us-spin' : ''} />
          Atualizar
        </button>
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
                  <div className="us-avatar" style={{ background: user.status === 'blocked' ? '#EF4444' : '#6366F1' }}>
                    {getInitials(user.name)}
                  </div>
                  <div className="us-user-info">
                    <span className="us-user-name">
                      {user.name}
                      {user.role === 'admin' && <span className="us-badge us-badge-admin">Admin</span>}
                      {/* "sem 2FA" só aparece quando falta — quem já configurou é o caso
                          normal e não precisa de selo. Isso também sinaliza quem foi
                          autorizado mas nunca concluiu o primeiro acesso. */}
                      {user.hasTotp === false && (
                        <span className="us-badge us-badge-no2fa" title="Ainda não configurou o Google Authenticator">
                          sem 2FA
                        </span>
                      )}
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
                      background: user.status === 'blocked' ? '#6366F1' : 'var(--bg-card)',
                      color: user.status === 'blocked' ? '#fff' : 'var(--text-secondary)',
                      border: user.status === 'blocked' ? '1px solid #6366F1' : '1px solid var(--border-primary)',
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
                  {/* hasTotp NÃO desabilita o botão: já foi visto reportar "tem 2FA" para
                      quem não tinha, e um botão morto por dado errado deixaria o admin
                      sem nenhuma forma de resetar. Ele só informa — o modal avisa quando
                      parece não haver cadastro, e a rota é idempotente (responde
                      "Nenhum TOTP encontrado" sem quebrar nada). */}
                  <button
                    className="us-action-btn"
                    onClick={() => setConfirmarReset(user)}
                    disabled={resetandoTotp === user.email}
                    title={user.hasTotp === false
                      ? 'Este usuário parece não ter Authenticator configurado'
                      : 'Apagar o Authenticator: no próximo login ele escaneia um novo QR code'}
                  >
                    {resetandoTotp === user.email ? <Loader2 size={13} className="us-spin" /> : <ShieldOff size={13} />}
                    Resetar 2FA
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

      {confirmarReset && (
        // Clicar fora fecha, como nos outros modais do painel. O onClick fica no
        // overlay e o conteúdo interrompe a propagação, senão clicar no texto
        // fecharia a janela.
        <div className="us-modal-overlay" onClick={() => setConfirmarReset(null)}>
          <div
            className="us-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="us-reset-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="us-modal-header">
              <div className="us-modal-icon"><ShieldOff size={18} /></div>
              <h2 id="us-reset-titulo">Resetar o Authenticator</h2>
              <button className="us-modal-close" onClick={() => setConfirmarReset(null)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="us-modal-body">
              <p className="us-modal-lead">
                <strong>{confirmarReset.name}</strong> vai precisar escanear um novo QR code
                no próximo login.
              </p>
              <p className="us-modal-email">{confirmarReset.email}</p>

              {/* O passo mais esquecido: o app antigo continua gerando códigos de 6
                  dígitos que parecem válidos, e a pessoa erra sem entender o motivo. */}
              <div className="us-modal-warn">
                <AlertTriangle size={15} />
                <span>
                  Peça para apagar antes a entrada <strong>&quot;JiraOps Dashboard&quot;</strong> no
                  app do celular. Se ela ficar lá, o código antigo será lido por engano e o
                  login vai falhar.
                </span>
              </div>

              {confirmarReset.hasTotp === false && (
                <p className="us-modal-nota">
                  Este usuário aparentemente ainda não concluiu o cadastro — não deve haver
                  nada para apagar.
                </p>
              )}

              <p className="us-modal-nota">Esta ação não pode ser desfeita.</p>
            </div>

            <div className="us-modal-footer">
              <button className="us-modal-btn" onClick={() => setConfirmarReset(null)}>
                Cancelar
              </button>
              <button
                className="us-modal-btn us-modal-btn-danger"
                onClick={() => handleResetTotp(confirmarReset)}
              >
                <ShieldOff size={14} />
                Resetar 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .us-root { display: flex; flex-direction: column; gap: 24px; min-width: 0; min-height: 0; height: 100%; }
        .us-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; flex-shrink: 0; }
        .us-title { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -0.02em; }
        .us-subtitle { margin: 6px 0 0; color: var(--text-tertiary); font-size: 14px; }
        .us-btn-refresh { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); font: 600 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s; }
        .us-btn-refresh:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
        .us-btn-refresh:disabled { opacity: .55; cursor: not-allowed; }

        .us-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .us-stat-card { display: flex; align-items: center; gap: 14px; min-width: 0; padding: 20px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-primary); }
        .us-stat-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .us-stat-value { margin: 0; color: var(--text-primary); font-size: 24px; font-weight: 500; line-height: 28px; font-variant-numeric: tabular-nums; }
        .us-stat-label { margin: 3px 0 0; color: var(--text-tertiary); font-size: 11px; font-weight: 600; }

        .us-msg { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .us-msg-success { background: var(--accent-emerald-light); color: var(--accent-emerald); border: 1px solid var(--accent-emerald-light); }
        .us-msg-error { background: var(--accent-rose-light); color: var(--accent-rose); border: 1px solid var(--accent-rose-light); }

        .us-filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .us-search-wrapper { flex: 1 1 280px; position: relative; }
        .us-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
        .us-search { width: 100%; height: 40px; padding: 0 14px 0 36px; border-radius: 8px; box-sizing: border-box; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); outline: none; font: 400 13px var(--font-sans); transition: border-color .15s; }
        .us-search:focus { border-color: #6366F1; }
        .us-search::placeholder { color: var(--text-tertiary); }
        .us-filter-btns { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .us-filter-btn { min-height: 40px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-tertiary); font: 600 11px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .us-filter-btn:hover { background: var(--bg-secondary); color: var(--text-secondary); }
        .us-filter-active { background: rgba(99,102,241,0.1) !important; color: #818CF8 !important; border-color: rgba(99,102,241,0.25) !important; }

        .us-table-container { flex: 1; min-height: 260px; overflow: auto; display: flex; flex-direction: column; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .us-list { display: flex; flex-direction: column; min-width: 980px; }
        .us-loading, .us-empty { flex: 1; min-height: 260px; padding: 48px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-tertiary); font-size: 13px; }
        .us-row { display: grid; grid-template-columns: 64px minmax(190px, 2fr) minmax(140px, 1.3fr) 100px 140px auto; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-secondary); background: transparent; transition: background .15s; }
        .us-row:not(.us-row-head):hover { background: var(--bg-secondary); }
        .us-row-blocked { opacity: .78; }
        .us-row-head { position: sticky; top: 0; z-index: 1; padding-top: 13px; padding-bottom: 13px; background: var(--bg-card); color: var(--text-tertiary); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .us-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        .us-muted { color: var(--text-tertiary); }
        .us-col-user { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .us-avatar { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        .us-user-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .us-user-name { display: flex; align-items: center; gap: 6px; color: var(--text-primary); font-size: 13px; font-weight: 600; }
        .us-user-email { color: var(--text-tertiary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .us-col-ip { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 12px; flex-wrap: wrap; }
        .us-col-login { display: flex; align-items: center; gap: 5px; color: var(--text-tertiary); font-size: 11px; }
        .us-ip-expand-btn { display: inline-flex; align-items: center; gap: 2px; padding: 3px 7px; border-radius: 8px; border: 1px solid var(--border-secondary); background: var(--bg-card); color: var(--text-tertiary); font: 700 10px var(--font-sans); cursor: pointer; }
        .us-ip-expand-btn:hover { background: rgba(99,102,241,0.1); color: #818CF8; border-color: rgba(99,102,241,0.25); }
        .us-ip-panel { display: flex; flex-direction: column; gap: 6px; padding: 14px 20px 16px 96px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-secondary); }
        .us-ip-panel-title { margin: 0 0 4px; color: var(--text-tertiary); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .us-ip-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; color: var(--text-secondary); font-size: 12px; }
        .us-ip-meta { color: var(--text-tertiary); font-size: 11px; }
        .us-ip-row-btn { margin-left: auto; padding: 5px 10px; }
        .us-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .us-badge-active { background: var(--accent-emerald-light); color: var(--accent-emerald); border: 1px solid var(--accent-emerald-light); }
        .us-badge-blocked { background: var(--accent-rose-light); color: var(--accent-rose); border: 1px solid var(--accent-rose-light); }
        .us-badge-admin { background: var(--accent-blue-light); color: var(--accent-blue); border: 1px solid var(--accent-blue-light); }
        .us-badge-no2fa { background: rgba(245,158,11,0.12); color: #F59E0B; border: 1px solid rgba(245,158,11,0.25); }

        /* Mesmo desenho dos modais das outras abas (im-modal / nd-modal). */
        .us-modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); padding: 20px; display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .us-modal { width: 100%; max-width: 480px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-primary); overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.28); }
        .us-modal-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px; border-bottom: 1px solid var(--border-primary); }
        .us-modal-header h2 { margin: 0; flex: 1; font-size: 16px; font-weight: 800; color: var(--text-primary); }
        .us-modal-icon { width: 34px; height: 34px; flex-shrink: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(245,158,11,0.12); color: #F59E0B; }
        .us-modal-close { width: 30px; height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-primary); border-radius: 8px; background: var(--bg-card); color: var(--text-tertiary); cursor: pointer; transition: background .15s, color .15s; }
        .us-modal-close:hover { background: var(--bg-secondary); color: var(--text-primary); }
        .us-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
        .us-modal-lead { margin: 0; font-size: 14px; line-height: 20px; color: var(--text-secondary); }
        .us-modal-lead strong { color: var(--text-primary); }
        .us-modal-email { margin: 0; font: 600 12px var(--font-mono, monospace); color: var(--text-tertiary); word-break: break-all; }
        /* Texto em --text-secondary, não em âmbar: âmbar sobre o fundo âmbar claro
           fica ilegível no tema escuro. A cor fica só no ícone e na borda. */
        .us-modal-warn { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); color: var(--text-secondary); font-size: 12px; line-height: 18px; }
        .us-modal-warn strong { color: var(--text-primary); }
        .us-modal-warn svg { flex-shrink: 0; margin-top: 1px; color: #F59E0B; }
        .us-modal-nota { margin: 0; font-size: 12px; color: var(--text-tertiary); }
        .us-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-primary); background: var(--bg-secondary); }
        .us-modal-btn { min-height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); font: 700 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .us-modal-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }
        .us-modal-btn-danger { background: #DC2626; border-color: #DC2626; color: #fff; }
        .us-modal-btn-danger:hover { background: #B91C1C; border-color: #B91C1C; color: #fff; }
        .us-col-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
        .us-btn-toggle, .us-action-btn { min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 12px; border-radius: 8px; font: 700 11px var(--font-sans); cursor: pointer; white-space: nowrap; transition: background .15s, color .15s, border-color .15s; }
        .us-btn-toggle:disabled, .us-action-btn:disabled { opacity: .45; cursor: not-allowed; }
        .us-action-btn { border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-tertiary); }
        .us-action-btn:hover:not(:disabled) { background: rgba(245,158,11,0.1); color: #F59E0B; border-color: rgba(245,158,11,0.25); }
        .us-spin { animation: usSpin 1s linear infinite; }
        @keyframes usSpin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) { .us-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) {
          .us-root { height: auto; }
          .us-title { font-size: 28px; line-height: 34px; }
          .us-btn-refresh { width: 100%; }
          .us-stats { grid-template-columns: 1fr; gap: 12px; }
          .us-filters { align-items: stretch; }
          .us-filter-btns { width: 100%; }
          .us-filter-btn { flex: 1; }
          .us-table-container { min-height: 420px; }
        }
      `}</style>
    </div>
  );
}
