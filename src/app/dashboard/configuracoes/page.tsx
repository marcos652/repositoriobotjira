'use client';
import React, { useState, useEffect } from 'react';
import {
  Settings, User, Bell, Palette, Shield, Globe, Key, Moon, Sun, Monitor,
  Mail, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, Lock, Users
} from 'lucide-react';

const sections = [
  { id: 'profile', icon: User, title: 'Perfil', desc: 'Nome, email e avatar', color: '#6366F1',
    fields: [{ label: 'Nome', value: 'Marcos Vinicius' }, { label: 'Email', value: 'marcos@jiraops.com' }, { label: 'Cargo', value: 'Admin / PM' }]
  },
  { id: 'notifications', icon: Bell, title: 'Notificações', desc: 'Preferências de alertas', color: '#F43F5E',
    toggles: [{ label: 'Email para SLA crítico', on: true }, { label: 'Push para novas issues', on: true }, { label: 'Digest diário', on: false }]
  },
  { id: 'appearance', icon: Palette, title: 'Aparência', desc: 'Tema e personalização', color: '#8B5CF6',
    theme: ['Dark', 'Light', 'System']
  },
  { id: 'security', icon: Shield, title: 'Segurança', desc: 'Senha e autenticação', color: '#22C55E',
    fields: [{ label: '2FA', value: 'Ativado' }, { label: 'Última troca de senha', value: '15/04/2026' }]
  },
  { id: 'api', icon: Key, title: 'API & Tokens', desc: 'Chaves de acesso', color: '#F59E0B',
    fields: [{ label: 'API Key', value: '••••••••••••dk4f' }, { label: 'Webhook URL', value: 'https://jiraops.com/webhook' }]
  },
];

// ── Email Management Component ──
function EmailManagement() {
  const [emails, setEmails] = useState<Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmails(); }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${newEmail} autorizado! O bot enviará o código via Slack DM.` });
        setNewEmail('');
        loadEmails();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao adicionar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    setRemoving(email);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${email} removido` });
        loadEmails();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao remover' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setRemoving(null);
    }
  };

  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (user.length <= 3) return `${user[0]}***@${domain}`;
    return `${user.slice(0, 3)}${'•'.repeat(user.length - 3)}@${domain}`;
  };

  return (
    <div className="em-root">
      {/* Header */}
      <div className="em-info">
        <div className="em-info-icon">
          <Lock size={14} />
        </div>
        <p className="em-info-text">
          Emails são armazenados com <strong>criptografia AES-256-GCM</strong> + hash SHA-256. 
          Mesmo com acesso ao banco, invasores veem apenas dados criptografados.
        </p>
      </div>

      {/* Add new email */}
      <div className="em-add-row">
        <div className="em-input-wrapper">
          <Mail size={14} className="em-input-icon" />
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="novo.usuario@empresa.com"
            className="em-input"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newEmail.includes('@')}
          className="em-add-btn"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Autorizar
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`em-msg em-msg-${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      {/* Email list */}
      <div className="em-list">
        {loading ? (
          <div className="em-loading">
            <Loader2 size={16} className="animate-spin" />
            <span>Carregando emails...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="em-empty">Nenhum email autorizado</div>
        ) : (
          emails.map((entry) => (
            <div key={entry.email} className="em-item">
              <div className="em-item-avatar">
                {entry.email[0].toUpperCase()}
              </div>
              <div className="em-item-info">
                <p className="em-item-email">{entry.email}</p>
                <p className="em-item-meta">
                  {entry.isDefault && <span className="em-badge">Admin</span>}
                  <span>Adicionado {entry.addedBy === 'system' ? 'automaticamente' : `por ${entry.addedBy || 'admin'}`}</span>
                  <span>•</span>
                  <span>{new Date(entry.addedAt).toLocaleDateString('pt-BR')}</span>
                </p>
              </div>
              {!entry.isDefault && (
                <button
                  onClick={() => handleRemove(entry.email)}
                  disabled={removing === entry.email}
                  className="em-remove-btn"
                  title="Remover acesso"
                >
                  {removing === entry.email
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .em-root { display: flex; flex-direction: column; gap: 14px; }
        .em-info { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.12); }
        .em-info-icon { width: 28px; height: 28px; border-radius: 8px; background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .em-info-text { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
        .em-info-text strong { color: var(--accent-blue); }

        .em-add-row { display: flex; gap: 8px; }
        .em-input-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
        .em-input-icon { position: absolute; left: 12px; color: var(--text-tertiary); pointer-events: none; }
        .em-input { width: 100%; padding: 10px 12px 10px 34px; border-radius: 10px; font-size: 12px; background: var(--bg-card); border: 1px solid var(--border-primary); color: var(--text-primary); outline: none; font-family: var(--font-sans); transition: border-color 0.2s; }
        .em-input:focus { border-color: var(--accent-blue); }
        .em-input::placeholder { color: var(--text-tertiary); }

        .em-add-btn { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; font-family: var(--font-sans); border: none; cursor: pointer; background: var(--gradient-primary); color: #fff; box-shadow: var(--shadow-glow-blue); transition: all 0.2s; flex-shrink: 0; }
        .em-add-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .em-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .em-msg { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 500; }
        .em-msg-success { background: rgba(16, 185, 129, 0.08); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.15); }
        .em-msg-error { background: rgba(244, 63, 94, 0.08); color: var(--accent-rose); border: 1px solid rgba(244, 63, 94, 0.15); }

        .em-list { display: flex; flex-direction: column; gap: 2px; }
        .em-loading, .em-empty { padding: 24px; text-align: center; font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; gap: 8px; }

        .em-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; transition: background 0.15s; }
        .em-item:hover { background: var(--bg-card-hover); }

        .em-item-avatar { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet)); color: #fff; flex-shrink: 0; }

        .em-item-info { flex: 1; min-width: 0; }
        .em-item-email { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .em-item-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-tertiary); margin-top: 2px; flex-wrap: wrap; }

        .em-badge { display: inline-flex; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }

        .em-remove-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-primary); background: transparent; color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .em-remove-btn:hover:not(:disabled) { background: rgba(244, 63, 94, 0.1); color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3); }
        .em-remove-btn:disabled { opacity: 0.5; }

        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ── IP Management Component ──
function IPManagement() {
  const [ips, setIps] = useState<Array<{ ip: string; email: string; firstSeen: string; lastSeen: string; blocked: boolean; loginCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadIPs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/ips');
      if (res.ok) {
        const data = await res.json();
        setIps(data.ips || []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadIPs(); }, []);

  const handleToggleBlock = async (ip: string, email: string, currentlyBlocked: boolean) => {
    setToggling(`${email}:${ip}`);
    try {
      await fetch('/api/auth/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, email, action: currentlyBlocked ? 'unblock' : 'block' }),
      });
      await loadIPs();
    } catch {} finally { setToggling(null); }
  };

  return (
    <div className="em-root">
      {loading ? (
        <div className="em-loading"><Loader2 size={16} className="animate-spin" /><span>Carregando IPs...</span></div>
      ) : ips.length === 0 ? (
        <div className="em-empty">Nenhum login registrado ainda</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IP</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuário</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primeiro Acesso</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Último Acesso</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logins</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((entry) => (
                <tr key={`${entry.email}:${entry.ip}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: '#F8FAFC', fontFamily: 'monospace', fontWeight: 600 }}>{entry.ip}</td>
                  <td style={{ padding: '10px 12px', color: '#94A3B8' }}>{entry.email}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '11px' }}>{new Date(entry.firstSeen).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '11px' }}>{new Date(entry.lastSeen).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>{entry.loginCount}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleBlock(entry.ip, entry.email, entry.blocked)}
                      disabled={toggling === `${entry.email}:${entry.ip}`}
                      style={{
                        padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '10px', fontWeight: 700,
                        cursor: toggling === `${entry.email}:${entry.ip}` ? 'wait' : 'pointer',
                        background: entry.blocked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: entry.blocked ? '#EF4444' : '#22C55E',
                        transition: 'all 0.2s',
                      }}
                    >
                      {toggling === `${entry.email}:${entry.ip}` ? '...' : entry.blocked ? '🚫 Bloqueado' : '✅ Ativo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="cf-root">
      <div className="cf-hero"><div className="cf-hero-grid"/><div className="cf-hero-orb cf-hero-orb-1"/><div className="cf-hero-orb cf-hero-orb-2"/>
        <div className="cf-hero-content"><div className="cf-hero-left"><div className="cf-hero-icon"><Settings size={24} color="#fff"/></div><div><h1 className="cf-hero-title">Configurações</h1><p className="cf-hero-sub">Preferências e personalização</p></div></div></div>
      </div>
      <div className="cf-body"><div className="cf-main">
        {/* ── Email Management Section ── */}
        <div className="cf-section">
          <div className="cf-section-header">
            <div className="cf-section-icon" style={{background:'rgba(59,130,246,0.12)',color:'#3B82F6'}}><Users size={18}/></div>
            <div><p className="cf-section-title">Usuários Autorizados</p><p className="cf-section-desc">Gerencie quem pode acessar o dashboard. O bot envia o código via Slack DM.</p></div>
          </div>
          <div className="cf-section-body">
            <EmailManagement />
          </div>
        </div>

        {/* ── IP Management Section ── */}
        <div className="cf-section">
          <div className="cf-section-header">
            <div className="cf-section-icon" style={{background:'rgba(239,68,68,0.12)',color:'#EF4444'}}><Globe size={18}/></div>
            <div><p className="cf-section-title">IPs de Acesso</p><p className="cf-section-desc">Monitore e bloqueie IPs que acessam o dashboard.</p></div>
          </div>
          <div className="cf-section-body">
            <IPManagement />
          </div>
        </div>
        {sections.map(s=>{const Icon=s.icon;return(
          <div key={s.id} className="cf-section">
            <div className="cf-section-header">
              <div className="cf-section-icon" style={{background:`${s.color}12`,color:s.color}}><Icon size={18}/></div>
              <div><p className="cf-section-title">{s.title}</p><p className="cf-section-desc">{s.desc}</p></div>
            </div>
            <div className="cf-section-body">
              {s.fields && s.fields.map(f=>(
                <div key={f.label} className="cf-field"><label>{f.label}</label><input defaultValue={f.value} readOnly/></div>
              ))}
              {s.toggles && s.toggles.map(t=>(
                <div key={t.label} className="cf-toggle"><span>{t.label}</span><div className={`cf-switch ${t.on?'on':''}`}><div className="cf-knob"/></div></div>
              ))}
              {s.theme && (
                <div className="cf-themes">{s.theme.map(t=>(
                  <button key={t} className={`cf-theme-btn ${t==='Dark'?'active':''}`}>
                    {t==='Dark'?<Moon size={14}/>:t==='Light'?<Sun size={14}/>:<Monitor size={14}/>} {t}
                  </button>
                ))}</div>
              )}
            </div>
          </div>
        );})
      }</div>
      <div className="cf-sidebar"><div className="cf-sb-section"><h3 className="cf-sb-title">Navegação</h3>
        <div className="cf-nav">
          <a className="cf-nav-item cf-nav-active" href="#users">Usuários</a>
          {sections.map(s=><a key={s.id} className="cf-nav-item" href={`#${s.id}`}>{s.title}</a>)}
        </div>
      </div><div className="cf-sb-divider"/><div className="cf-sb-section"><h3 className="cf-sb-title">Info</h3>
        <div className="cf-info"><p>Versão: <strong>2.4.1</strong></p><p>Ambiente: <strong>Produção</strong></p><p>Última atualização: <strong>28/05/2026</strong></p></div>
      </div></div></div>
      <style jsx>{`
        .cf-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .cf-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0F1629 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .cf-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .cf-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .cf-hero-orb-1{width:250px;height:250px;background:rgba(100,116,139,.18);top:-80px;right:15%;animation:cfO 8s ease-in-out infinite}
        .cf-hero-orb-2{width:180px;height:180px;background:rgba(148,163,184,.12);bottom:-60px;left:25%;animation:cfO 11s ease-in-out infinite reverse}
        @keyframes cfO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .cf-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .cf-hero-left{display:flex;align-items:center;gap:16px}
        .cf-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#64748B,#94A3B8);box-shadow:0 8px 28px rgba(100,116,139,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .cf-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.cf-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .cf-body{flex:1;display:flex;overflow:hidden}.cf-main{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:16px}
        .cf-section{border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);overflow:hidden}
        .cf-section-header{display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--border-secondary)}
        .cf-section-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .cf-section-title{font-size:14px;font-weight:700;color:var(--text-primary)}.cf-section-desc{font-size:11px;color:var(--text-tertiary);margin-top:1px}
        .cf-section-body{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
        .cf-field{display:flex;align-items:center;gap:12px}
        .cf-field label{font-size:11px;font-weight:700;color:var(--text-tertiary);width:140px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em}
        .cf-field input{flex:1;padding:8px 12px;border-radius:8px;font-size:12px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-primary);outline:none}
        .cf-toggle{display:flex;align-items:center;justify-content:space-between}
        .cf-toggle span{font-size:12px;color:var(--text-secondary)}
        .cf-switch{width:40px;height:22px;border-radius:11px;background:var(--border-secondary);position:relative;cursor:pointer;transition:background .2s}
        .cf-switch.on{background:var(--accent-emerald)}.cf-knob{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s}
        .cf-switch.on .cf-knob{transform:translateX(18px)}
        .cf-themes{display:flex;gap:8px}
        .cf-theme-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border-secondary);background:var(--bg-card);color:var(--text-secondary);cursor:pointer;transition:all .15s}
        .cf-theme-btn:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
        .cf-theme-btn.active{background:var(--accent-blue);color:#fff;border-color:var(--accent-blue)}
        .cf-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .cf-sb-section{padding:20px}.cf-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .cf-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .cf-nav{display:flex;flex-direction:column;gap:4px}
        .cf-nav-item{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;color:var(--text-secondary);text-decoration:none;transition:all .15s}
        .cf-nav-item:hover{background:var(--bg-secondary);color:var(--text-primary)}
        .cf-nav-active{background:var(--accent-blue-light);color:var(--accent-blue) !important}
        .cf-info{display:flex;flex-direction:column;gap:6px}.cf-info p{font-size:11px;color:var(--text-tertiary)}.cf-info strong{color:var(--text-primary)}
      `}</style>
    </div>
  );
}
