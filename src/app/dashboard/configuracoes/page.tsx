'use client';
import React from 'react';
import { Settings, User, Bell, Palette, Shield, Globe, Key, Moon, Sun, Monitor } from 'lucide-react';

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

export default function ConfiguracoesPage() {
  return (
    <div className="cf-root">
      <div className="cf-hero"><div className="cf-hero-grid"/><div className="cf-hero-orb cf-hero-orb-1"/><div className="cf-hero-orb cf-hero-orb-2"/>
        <div className="cf-hero-content"><div className="cf-hero-left"><div className="cf-hero-icon"><Settings size={24} color="#fff"/></div><div><h1 className="cf-hero-title">Configurações</h1><p className="cf-hero-sub">Preferências e personalização</p></div></div></div>
      </div>
      <div className="cf-body"><div className="cf-main">
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
        );})}
      </div>
      <div className="cf-sidebar"><div className="cf-sb-section"><h3 className="cf-sb-title">Navegação</h3>
        <div className="cf-nav">{sections.map(s=><a key={s.id} className="cf-nav-item" href={`#${s.id}`}>{s.title}</a>)}</div>
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
        .cf-info{display:flex;flex-direction:column;gap:6px}.cf-info p{font-size:11px;color:var(--text-tertiary)}.cf-info strong{color:var(--text-primary)}
      `}</style>
    </div>
  );
}
