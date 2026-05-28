'use client';
import React from 'react';
import { BookOpen, Search, FileText, Clock, Tag } from 'lucide-react';

const articles = [
  { title: 'Como configurar webhooks no Jira', category: 'Integração', date: '25/05', views: 142, color: '#6366F1' },
  { title: 'Guia de priorização de backlog', category: 'Processo', date: '22/05', views: 98, color: '#22C55E' },
  { title: 'Troubleshooting: erros de API REST', category: 'Debug', date: '20/05', views: 234, color: '#F43F5E' },
  { title: 'Workflow de code review', category: 'Engenharia', date: '18/05', views: 76, color: '#3B82F6' },
  { title: 'SLA: como definir métricas', category: 'Suporte', date: '15/05', views: 189, color: '#F59E0B' },
  { title: 'Deploy contínuo com GitHub Actions', category: 'DevOps', date: '12/05', views: 312, color: '#8B5CF6' },
];

export default function KnowledgePage() {
  return (
    <div className="kb-root">
      <div className="kb-hero"><div className="kb-hero-grid"/><div className="kb-hero-orb kb-hero-orb-1"/><div className="kb-hero-orb kb-hero-orb-2"/>
        <div className="kb-hero-content"><div className="kb-hero-left"><div className="kb-hero-icon"><BookOpen size={24} color="#fff"/></div><div><h1 className="kb-hero-title">Base de Conhecimento</h1><p className="kb-hero-sub">Documentação e artigos internos</p></div></div>
          <div className="kb-pill">{articles.length} artigos</div></div>
      </div>
      <div className="kb-body"><div className="kb-main"><div className="kb-list">
        {articles.map(a=>(
          <div key={a.title} className="kb-card">
            <div className="kb-card-icon" style={{background:`${a.color}12`,color:a.color}}><FileText size={16}/></div>
            <div className="kb-card-info"><p className="kb-card-title">{a.title}</p>
              <div className="kb-card-meta"><span className="kb-tag" style={{background:`${a.color}12`,color:a.color}}>{a.category}</span><span><Clock size={10}/> {a.date}</span><span>👁 {a.views}</span></div>
            </div>
          </div>
        ))}
      </div></div>
      <div className="kb-sidebar"><div className="kb-sb-section"><h3 className="kb-sb-title">Categorias</h3>
        <div className="kb-cats">{['Integração','Processo','Debug','Engenharia','Suporte','DevOps'].map(c=><div key={c} className="kb-cat">{c}</div>)}</div>
      </div><div className="kb-sb-divider"/><div className="kb-sb-section"><h3 className="kb-sb-title">Mais Lidos</h3>
        {articles.sort((a,b)=>b.views-a.views).slice(0,3).map((a,i)=><div key={i} className="kb-popular"><span className="kb-pop-rank">#{i+1}</span><span className="kb-pop-title">{a.title.slice(0,35)}...</span><span className="kb-pop-views">{a.views}</span></div>)}
      </div></div></div>
      <style jsx>{`
        .kb-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .kb-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#1A1630 40%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .kb-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .kb-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .kb-hero-orb-1{width:250px;height:250px;background:rgba(236,72,153,.16);top:-80px;right:15%;animation:kbO 8s ease-in-out infinite}
        .kb-hero-orb-2{width:180px;height:180px;background:rgba(139,92,246,.14);bottom:-60px;left:25%;animation:kbO 11s ease-in-out infinite reverse}
        @keyframes kbO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .kb-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}
        .kb-hero-left{display:flex;align-items:center;gap:16px}
        .kb-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#EC4899,#8B5CF6);box-shadow:0 8px 28px rgba(236,72,153,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .kb-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.kb-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .kb-pill{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(148,163,184,.6);font-size:11px;font-weight:600}
        .kb-body{flex:1;display:flex;overflow:hidden}.kb-main{flex:1;overflow-y:auto;padding:24px 28px}
        .kb-list{display:flex;flex-direction:column;gap:10px}
        .kb-card{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s;cursor:pointer}
        .kb-card:hover{border-color:var(--border-primary);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .kb-card-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kb-card-info{flex:1}.kb-card-title{font-size:14px;font-weight:700;color:var(--text-primary)}
        .kb-card-meta{display:flex;align-items:center;gap:10px;margin-top:4px;font-size:10px;color:var(--text-tertiary)}
        .kb-card-meta span{display:flex;align-items:center;gap:3px}
        .kb-tag{font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px}
        .kb-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .kb-sb-section{padding:20px}.kb-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
        .kb-sb-divider{height:1px;margin:0 20px;background:var(--border-secondary)}
        .kb-cats{display:flex;flex-wrap:wrap;gap:6px}
        .kb-cat{padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-secondary);cursor:pointer;transition:all .15s}
        .kb-cat:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
        .kb-popular{display:flex;align-items:center;gap:8px;padding:6px 0}
        .kb-pop-rank{font-size:10px;font-weight:800;color:var(--text-tertiary);width:20px}
        .kb-pop-title{flex:1;font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kb-pop-views{font-size:10px;font-weight:700;color:var(--text-tertiary)}
      `}</style>
    </div>
  );
}
