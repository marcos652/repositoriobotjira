'use client';
import React, { useState, useEffect } from 'react';
import {
  User, Bell, Palette, Shield, Key, Moon, Sun, Monitor,
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
  const [emails, setEmails] = useState<Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean; role: 'admin' | 'user' }>>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadEmails());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes('@') || !newPassword) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || `${newEmail} autorizado!` });
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');
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
        setMessage({ type: 'success', text: data.message || `${email} removido` });
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

  const handleRoleChange = async (email: string, newRole: string) => {
    try {
      const res = await fetch('/api/auth/emails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || `Função atualizada` });
        loadEmails();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar função' });
        // Refresh to revert the select visually if it failed
        loadEmails();
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  return (
    <div className="em-root">
      <div className="em-info" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
        <div className="em-info-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
          <Shield size={14} />
        </div>
        <p className="em-info-text">
          O gerenciamento de usuários agora sincroniza com o <strong>Firebase Authentication</strong>. 
          Ao adicionar um usuário aqui, ele será criado no Firebase com a senha inicial que você definir.
        </p>
      </div>

      <div className="em-add-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div className="em-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
          <Mail size={14} className="em-input-icon" />
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="novo.usuario@empresa.com"
            className="em-input"
          />
        </div>
        <div className="em-input-wrapper" style={{ flex: 1, minWidth: '150px' }}>
          <Lock size={14} className="em-input-icon" />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Senha inicial"
            className="em-input"
          />
        </div>
        <div className="em-input-wrapper" style={{ flex: 0.5, minWidth: '110px' }}>
          <Shield size={14} className="em-input-icon" />
          <select 
            value={newRole} 
            onChange={e => setNewRole(e.target.value as 'admin' | 'user')}
            className="em-input"
            style={{ appearance: 'none', paddingRight: '24px' }}
          >
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newEmail.includes('@') || !newPassword}
          className="em-add-btn"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Adicionar
        </button>
      </div>

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
            <span>Carregando usuários...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="em-empty">Nenhum usuário autorizado</div>
        ) : (
          emails.map((entry) => (
            <div key={entry.email} className="em-item">
              <div className="em-item-avatar">
                {entry.email[0].toUpperCase()}
              </div>
              <div className="em-item-info">
                <p className="em-item-email">{entry.email}</p>
                <p className="em-item-meta">
                  {entry.isDefault ? (
                    <span className="em-badge">Admin</span>
                  ) : (
                    <select
                      value={entry.role}
                      onChange={(e) => handleRoleChange(entry.email, e.target.value)}
                      className={`em-role-select ${entry.role === 'admin' ? 'admin' : 'user'}`}
                      disabled={removing === entry.email}
                    >
                      <option value="admin">ADMIN</option>
                      <option value="user">USUÁRIO</option>
                    </select>
                  )}
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
        .em-info { display: flex; align-items: flex-start; gap: 10px; padding: 14px; border-radius: 8px; }
        .em-info-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .em-info-text { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
        .em-info-text strong { color: var(--text-primary); }

        .em-input-wrapper { position: relative; display: flex; align-items: center; }
        .em-input-icon { position: absolute; left: 12px; color: var(--text-tertiary); pointer-events: none; }
        .em-input { width: 100%; min-height: 40px; padding: 10px 12px 10px 34px; border-radius: 8px; font-size: 12px; background: var(--bg-secondary); border: 1px solid var(--border-primary); color: var(--text-primary); outline: none; font-family: inherit; transition: border-color 0.15s; }
        .em-input:focus { border-color: var(--accent-blue); }
        .em-input::placeholder { color: var(--text-tertiary); }

        .em-add-btn { display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 600; font-family: inherit; border: none; cursor: pointer; background: var(--accent-blue); color: #fff; transition: opacity 0.15s; flex-shrink: 0; }
        .em-add-btn:hover:not(:disabled) { opacity: 0.9; }
        .em-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .em-msg { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; }
        .em-msg-success { background: rgba(16, 185, 129, 0.08); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.15); }
        .em-msg-error { background: rgba(244, 63, 94, 0.08); color: var(--accent-rose); border: 1px solid rgba(244, 63, 94, 0.15); }

        .em-list { display: flex; flex-direction: column; border:1px solid var(--border-secondary);border-radius:8px;overflow:hidden; }
        .em-loading, .em-empty { padding: 24px; text-align: center; font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; gap: 8px; }

        .em-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom:1px solid var(--border-secondary); transition: background 0.15s; }
        .em-item:last-child { border-bottom:0; }
        .em-item:hover { background: var(--bg-card-hover); }

        .em-item-avatar { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: var(--accent-blue-light); color: var(--accent-blue); border:1px solid var(--border-primary); flex-shrink: 0; }

        .em-item-info { flex: 1; min-width: 0; }
        .em-item-email { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .em-item-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-tertiary); margin-top: 2px; flex-wrap: wrap; }

        .em-badge { display: inline-flex; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .em-role-select { appearance: none; border: none; padding: 1px 18px 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; outline: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%228%22%20height%3D%225%22%20viewBox%3D%220%200%208%205%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%205L8%200H0L4%205Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 4px center; background-size: 6px; transition: opacity 0.2s; }
        .em-role-select:hover { opacity: 0.8; }
        .em-role-select.admin { background-color: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); }
        .em-role-select.user { background-color: rgba(59, 130, 246, 0.12); color: var(--accent-blue); }

        .em-remove-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-primary); background: transparent; color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .em-remove-btn:hover:not(:disabled) { background: rgba(244, 63, 94, 0.1); color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3); }
        .em-remove-btn:disabled { opacity: 0.5; }

        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}



export default function ConfiguracoesPage() {
  return (
    <div className="cf-root">
      <div className="cf-page-header">
        <div className="cf-header-content"><div className="cf-header-left"><div><h1 className="cf-title">Configurações</h1><p className="cf-subtitle">Preferências e personalização</p></div></div></div>
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
        .cf-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .cf-page-header{flex-shrink:0}
        .cf-header-content{display:flex;align-items:flex-end;justify-content:space-between}
        .cf-header-left{display:flex;align-items:center}
        .cf-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.cf-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .cf-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.cf-main{min-width:0;display:flex;flex-direction:column;gap:24px}
        .cf-section{border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);overflow:hidden}
        .cf-section-header{display:flex;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid var(--border-secondary)}
        .cf-section-icon{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .cf-section-title{font-size:15px;font-weight:600;color:var(--text-primary)}.cf-section-desc{font-size:12px;color:var(--text-tertiary);margin-top:2px}
        .cf-section-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px}
        .cf-field{display:flex;align-items:center;gap:12px}
        .cf-field label{font-size:12px;font-weight:600;color:var(--text-secondary);width:140px;flex-shrink:0}
        .cf-field input{flex:1;min-height:40px;padding:8px 12px;border-radius:8px;font-size:12px;background:var(--bg-secondary);border:1px solid var(--border-primary);color:var(--text-primary);outline:none}
        .cf-toggle{display:flex;align-items:center;justify-content:space-between}
        .cf-toggle span{font-size:12px;color:var(--text-secondary)}
        .cf-switch{width:40px;height:22px;border-radius:11px;background:var(--border-secondary);position:relative;cursor:pointer;transition:background .2s}
        .cf-switch.on{background:var(--accent-emerald)}.cf-knob{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s}
        .cf-switch.on .cf-knob{transform:translateX(18px)}
        .cf-themes{display:flex;gap:8px}
        .cf-theme-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border-primary);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .cf-theme-btn:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
        .cf-theme-btn.active{background:var(--accent-blue);color:#fff;border-color:var(--accent-blue)}
        .cf-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden;position:sticky;top:0}
        .cf-sb-section{padding:24px}.cf-sb-title{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        .cf-sb-divider{height:1px;margin:0 24px;background:var(--border-secondary)}
        .cf-nav{display:flex;flex-direction:column;gap:4px}
        .cf-nav-item{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;color:var(--text-secondary);text-decoration:none;transition:all .15s}
        .cf-nav-item:hover{background:var(--bg-secondary);color:var(--text-primary)}
        .cf-nav-active{background:var(--accent-blue-light);color:var(--accent-blue) !important}
        .cf-info{display:flex;flex-direction:column;gap:6px}.cf-info p{font-size:11px;color:var(--text-tertiary)}.cf-info strong{color:var(--text-primary)}
        @media (max-width:1000px){.cf-body{grid-template-columns:1fr}.cf-sidebar{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cf-sb-divider{display:none}.cf-sb-section+.cf-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.cf-sidebar{display:block}.cf-sb-section+.cf-sb-section{border-left:0}.cf-sb-divider{display:block}.cf-field{align-items:stretch;flex-direction:column;gap:6px}.cf-field label{width:auto}.cf-themes{flex-wrap:wrap}.cf-section-header,.cf-section-body{padding-left:18px;padding-right:18px}.cf-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
