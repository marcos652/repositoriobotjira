'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const events: Record<string, { label: string; color: string }[]> = {
  '3': [{ label: 'Sprint 12 início', color: '#3B82F6' }],
  '7': [{ label: 'Review', color: '#8B5CF6' }],
  '12': [{ label: 'Deploy v2.3', color: '#22C55E' }],
  '15': [{ label: 'Sprint 12 fim', color: '#F43F5E' }],
  '16': [{ label: 'Sprint 13 início', color: '#3B82F6' }],
  '20': [{ label: 'Retrospectiva', color: '#F59E0B' }],
  '25': [{ label: 'Release v2.4', color: '#22C55E' }],
  '28': [{ label: 'Sprint 13 fim', color: '#F43F5E' }],
};

export default function CalendarioPage() {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prev = () => setDate(new Date(year, month - 1, 1));
  const next = () => setDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`e-${i}`} className="cal-cell cal-empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dayEvents = events[String(d)] || [];
    cells.push(
      <div key={d} className={`cal-cell ${isToday ? 'today' : ''}`}>
        <span className={`cal-day ${isToday ? 'today' : ''}`}>{d}</span>
        {dayEvents.map((ev, i) => (
          <div key={i} className="cal-event" style={{ background: `${ev.color}15`, color: ev.color }}>{ev.label}</div>
        ))}
      </div>
    );
  }

  const upcomingEvents = Object.entries(events)
    .map(([day, evs]) => evs.map(e => ({ ...e, day: parseInt(day) })))
    .flat()
    .filter(e => e.day >= today.getDate())
    .sort((a, b) => a.day - b.day)
    .slice(0, 5);

  return (
    <div className="cal-root">
      {/* Hero */}
      <div className="cal-hero">
        <div className="cal-hero-grid" />
        <div className="cal-hero-orb cal-hero-orb-1" />
        <div className="cal-hero-orb cal-hero-orb-2" />
        <div className="cal-hero-content">
          <div className="cal-hero-left">
            <div className="cal-hero-icon"><CalendarDays size={24} color="#fff" /></div>
            <div>
              <h1 className="cal-hero-title">Calendário</h1>
              <p className="cal-hero-sub">Sprints, deadlines e marcos do projeto</p>
            </div>
          </div>
          <div className="cal-nav">
            <button onClick={prev} className="cal-nav-btn"><ChevronLeft size={16} /></button>
            <span className="cal-nav-label">{monthNames[month]} {year}</span>
            <button onClick={next} className="cal-nav-btn"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="cal-body">
        <div className="cal-main">
          {/* Day headers */}
          <div className="cal-header-row">
            {dayNames.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
          </div>
          {/* Calendar grid */}
          <div className="cal-grid">{cells}</div>
        </div>

        {/* Sidebar */}
        <div className="cal-sidebar">
          <div className="cal-sb-section">
            <h3 className="cal-sb-title">Próximos Eventos</h3>
            {upcomingEvents.length === 0 ? (
              <p className="cal-sb-empty">Sem eventos próximos</p>
            ) : (
              <div className="cal-upcoming">
                {upcomingEvents.map((ev, i) => (
                  <div key={i} className="cal-upcoming-item">
                    <div className="cal-upcoming-dot" style={{ background: ev.color }} />
                    <div className="cal-upcoming-info">
                      <p className="cal-upcoming-label">{ev.label}</p>
                      <p className="cal-upcoming-date">Dia {ev.day}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cal-sb-divider" />
          <div className="cal-sb-section">
            <h3 className="cal-sb-title">Legenda</h3>
            <div className="cal-legend">
              {[
                { color: '#3B82F6', label: 'Sprint' },
                { color: '#8B5CF6', label: 'Review' },
                { color: '#22C55E', label: 'Deploy/Release' },
                { color: '#F43F5E', label: 'Deadline' },
                { color: '#F59E0B', label: 'Retrospectiva' },
              ].map((l) => (
                <div key={l.label} className="cal-legend-item">
                  <div className="cal-legend-dot" style={{ background: l.color }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cal-root { display:flex;flex-direction:column;height:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border-primary);background:var(--bg-card); }
        .cal-hero { position:relative;flex-shrink:0;overflow:hidden;background:linear-gradient(140deg,#080C18 0%,#0F1629 30%,#0D2137 60%,#0D0B22 100%);border-bottom:1px solid rgba(255,255,255,0.05);padding:28px 32px; }
        .cal-hero-grid { position:absolute;inset:0;opacity:0.03;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:40px 40px; }
        .cal-hero-orb { position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none; }
        .cal-hero-orb-1 { width:250px;height:250px;background:rgba(6,182,212,0.18);top:-80px;right:15%;animation:calOrb 8s ease-in-out infinite; }
        .cal-hero-orb-2 { width:180px;height:180px;background:rgba(59,130,246,0.14);bottom:-60px;left:25%;animation:calOrb 11s ease-in-out infinite reverse; }
        @keyframes calOrb { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-15px) scale(1.08);} }
        .cal-hero-content { position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between; }
        .cal-hero-left { display:flex;align-items:center;gap:16px; }
        .cal-hero-icon { width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#06B6D4,#3B82F6);box-shadow:0 8px 28px rgba(6,182,212,0.35),inset 0 1px 0 rgba(255,255,255,0.2); }
        .cal-hero-title { font-size:20px;font-weight:800;color:#F1F5F9;letter-spacing:-0.02em; }
        .cal-hero-sub { font-size:13px;color:rgba(148,163,184,0.65);margin-top:2px; }
        .cal-nav { display:flex;align-items:center;gap:8px; }
        .cal-nav-btn { width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);cursor:pointer;transition:all 0.15s; }
        .cal-nav-btn:hover { background:rgba(255,255,255,0.1);color:#fff; }
        .cal-nav-label { font-size:14px;font-weight:700;color:#E2E8F0;min-width:140px;text-align:center; }

        .cal-body { flex:1;display:flex;overflow:hidden; }
        .cal-main { flex:1;overflow-y:auto;padding:20px 24px; }
        .cal-header-row { display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px; }
        .cal-header-cell { text-align:center;padding:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-tertiary); }
        .cal-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:4px; }
        .cal-cell { min-height:90px;border-radius:10px;padding:8px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:all 0.15s; }
        .cal-cell:hover { border-color:var(--border-primary);box-shadow:0 2px 8px rgba(0,0,0,0.04); }
        .cal-cell.today { background:var(--accent-blue-light);border-color:var(--accent-blue); }
        .cal-cell.cal-empty { opacity:0.3;pointer-events:none; }
        .cal-day { font-size:11px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:4px; }
        .cal-day.today { color:var(--accent-blue);font-weight:800; }
        .cal-event { font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

        .cal-sidebar { width:260px;flex-shrink:0;border-left:1px solid var(--border-primary);background:var(--bg-card);overflow-y:auto; }
        .cal-sb-section { padding:20px; }
        .cal-sb-title { font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-tertiary);margin-bottom:14px; }
        .cal-sb-divider { height:1px;margin:0 20px;background:var(--border-secondary); }
        .cal-sb-empty { font-size:11px;color:var(--text-tertiary);font-style:italic; }
        .cal-upcoming { display:flex;flex-direction:column;gap:10px; }
        .cal-upcoming-item { display:flex;align-items:center;gap:10px; }
        .cal-upcoming-dot { width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .cal-upcoming-label { font-size:12px;font-weight:600;color:var(--text-primary); }
        .cal-upcoming-date { font-size:10px;color:var(--text-tertiary); }
        .cal-legend { display:flex;flex-direction:column;gap:8px; }
        .cal-legend-item { display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-secondary); }
        .cal-legend-dot { width:8px;height:8px;border-radius:3px;flex-shrink:0; }
      `}</style>
    </div>
  );
}
