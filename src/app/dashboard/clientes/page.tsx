'use client';
import React, { useEffect, useState } from 'react';
import { Building2, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { Chart2, Ranking } from 'iconsax-react';

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void fetchData());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const totalIssues = clients.reduce((s, c) => s + c.total, 0);
  const totalBugs = clients.reduce((s, c) => s + c.bugs, 0);

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 size={36} className="animate-spin" style={{ color: '#3B82F6' }} /><p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Carregando clientes do Jira...</p></div>;
  if (error) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-5"><WifiOff size={28} style={{ color: '#FB7185' }} /><p style={{ color: 'var(--text-primary)' }}>Erro</p><button onClick={() => fetchData()} style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Tentar novamente</button></div></div>;

  return (
    <div className="cl-root">
      <div className="cl-page-header">
        <div className="cl-header-content">
          <div className="cl-header-left">
            <div><h1 className="cl-title">Clientes</h1><p className="cl-subtitle">{clients.length} clientes • {totalIssues} demandas no Jira</p></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="cl-refresh" onClick={() => fetchData(true)} disabled={refreshing}><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar</button>
          </div>
        </div>
      </div>

      <div className="cl-body">
        <div className="cl-main">
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', height: '40px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', marginBottom: '24px' }}>
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
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-secondary)' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-blue)' }}>{c.open}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>Aberto</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-secondary)' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-emerald)' }}>{c.resolved}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>Resolvido</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--bg-secondary)' }}>
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
            <h3 className="cl-sb-title"><Chart2 size={16} variant="Bold" color="#60A5FA" aria-hidden="true" /> Resumo</h3>
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
            <h3 className="cl-sb-title"><Ranking size={16} variant="Bold" color="#A78BFA" aria-hidden="true" /> Mais Ativo</h3>
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
        .cl-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .cl-page-header{flex-shrink:0}
        .cl-header-content{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .cl-header-left{display:flex;align-items:center}
        .cl-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.cl-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .cl-refresh{min-height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s,color .15s}
        .cl-refresh:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}.cl-refresh:disabled{opacity:.55;cursor:not-allowed}
        .cl-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.cl-main{min-width:0}
        .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
        .cl-card{padding:20px;border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);transition:border-color .15s}
        .cl-card:hover{border-color:var(--border-focus)}
        .cl-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden}
        .cl-sb-section{padding:24px}.cl-sb-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        @media (max-width:1100px){.cl-body{grid-template-columns:1fr}.cl-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cl-sb-section+.cl-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.cl-sidebar{display:block}.cl-sb-section+.cl-sb-section{border-left:0}.cl-grid{grid-template-columns:1fr}.cl-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
