'use client';
import React, { useEffect, useState } from 'react';
import { Building2, Loader2, WifiOff, RefreshCw, TrendingUp, Bug, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Client { name: string; total: number; open: number; resolved: number; bugs: number; lastActivity: string; }

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/jira/clients');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClients(data.clients || []);
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const totalIssues = clients.reduce((s, c) => s + c.total, 0);
  const totalBugs = clients.reduce((s, c) => s + c.bugs, 0);

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#3B82F6' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando clientes do Jira...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro</p><button onClick={() => fetchData()} style={{ padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Tentar novamente</button></div></div>;

  return (
    <div className="cl-root">
      <div className="cl-hero">
        <div className="cl-hero-grid" /><div className="cl-hero-orb cl-hero-orb-1" /><div className="cl-hero-orb cl-hero-orb-2" />
        <div className="cl-hero-content">
          <div className="cl-hero-left">
            <div className="cl-hero-icon"><Building2 size={24} color="#fff" /></div>
            <div><h1 className="cl-hero-title">Clientes</h1><p className="cl-hero-sub">{clients.length} clientes • {totalIssues} demandas no Jira</p></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.6)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar</button>
          </div>
        </div>
      </div>

      <div className="cl-body">
        <div className="cl-main">
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', height: '40px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', marginBottom: '16px' }}>
            <Building2 size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }} />
          </div>

          <div className="cl-grid">
            {filtered.map((c, i) => {
              const maxTotal = Math.max(...clients.map(x => x.total), 1);
              const pct = (c.total / maxTotal) * 100;
              return (
                <div key={c.name} className="cl-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: `hsl(${(i * 37) % 360}, 60%, 50%)`, flexShrink: 0 }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{c.total} demandas</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-card)' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-blue)' }}>{c.open}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>Aberto</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-card)' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-emerald)' }}>{c.resolved}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>Resolvido</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-card)' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-rose)' }}>{c.bugs}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>Bugs</p>
                    </div>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'var(--border-secondary)', marginTop: 14, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: `hsl(${(i * 37) % 360}, 60%, 50%)`, transition: 'width 0.6s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cl-sidebar">
          <div className="cl-sb-section">
            <h3 className="cl-sb-title">📊 Resumo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total clientes', value: clients.length, color: 'var(--accent-blue)' },
                { label: 'Total demandas', value: totalIssues, color: 'var(--accent-violet)' },
                { label: 'Total bugs', value: totalBugs, color: 'var(--accent-rose)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, margin: '0 20px', background: 'var(--border-secondary)' }} />
          <div className="cl-sb-section">
            <h3 className="cl-sb-title">🔝 Mais Ativo</h3>
            {clients.slice(0, 5).map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', width: 20 }}>#{i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-blue)' }}>{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .cl-root{display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card)}
        .cl-hero{position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18,#0F1629 30%,#0D2140 60%,#0D0B22);border-bottom:1px solid rgba(255,255,255,.05);padding:28px 32px}
        .cl-hero-grid{position:absolute;inset:0;opacity:.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px}
        .cl-hero-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
        .cl-hero-orb-1{width:250px;height:250px;background:rgba(59,130,246,.18);top:-80px;right:15%;animation:clO 8s ease-in-out infinite}
        .cl-hero-orb-2{width:180px;height:180px;background:rgba(99,102,241,.14);bottom:-60px;left:25%;animation:clO 11s ease-in-out infinite reverse}
        @keyframes clO{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-15px) scale(1.08)}}
        .cl-hero-content{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .cl-hero-left{display:flex;align-items:center;gap:16px}
        .cl-hero-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3B82F6,#6366F1);box-shadow:0 8px 28px rgba(59,130,246,.35),inset 0 1px 0 rgba(255,255,255,.2)}
        .cl-hero-title{font-size:20px;font-weight:800;color:#F1F5F9}.cl-hero-sub{font-size:13px;color:rgba(148,163,184,.65);margin-top:2px}
        .cl-body{flex:1;display:flex;overflow:hidden}.cl-main{flex:1;overflow-y:auto;padding:24px 28px}
        .cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .cl-card{padding:20px;border-radius:14px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all .2s}
        .cl-card:hover{border-color:var(--border-primary);box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-2px)}
        .cl-sidebar{width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto}
        .cl-sb-section{padding:20px}.cl-sb-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:14px}
      `}</style>
    </div>
  );
}
