'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
      <div className="cal-page-header">
        <div>
          <h1 className="cal-title">Calendário</h1>
          <p className="cal-subtitle">Sprints, deadlines e marcos do projeto</p>
        </div>
        <div className="cal-nav">
          <button onClick={prev} className="cal-nav-btn"><ChevronLeft size={16} /></button>
          <span className="cal-nav-label">{monthNames[month]} {year}</span>
          <button onClick={next} className="cal-nav-btn"><ChevronRight size={16} /></button>
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
        .cal-root { display:flex;flex-direction:column;gap:24px;min-width:0; }
        .cal-page-header { display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap; }
        .cal-title { font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-0.02em; }
        .cal-subtitle { margin-top:6px;font-size:14px;color:var(--text-tertiary); }
        .cal-nav { display:flex;align-items:center;gap:4px;padding:4px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:8px; }
        .cal-nav-btn { width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;color:var(--text-secondary);cursor:pointer;transition:background .15s,color .15s; }
        .cal-nav-btn:hover { background:var(--bg-secondary);color:var(--text-primary); }
        .cal-nav-label { font-size:14px;font-weight:600;color:var(--text-primary);min-width:144px;text-align:center; }

        .cal-body { display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start; }
        .cal-main { min-width:0;overflow-x:auto;padding:24px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:24px; }
        .cal-header-row,.cal-grid { min-width:680px; }
        .cal-header-row { display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px; }
        .cal-header-cell { text-align:center;padding:8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary); }
        .cal-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:8px; }
        .cal-cell { min-height:96px;border-radius:8px;padding:10px;background:var(--bg-secondary);border:1px solid var(--border-secondary);transition:border-color .15s; }
        .cal-cell:hover { border-color:var(--border-primary); }
        .cal-cell.today { background:var(--accent-blue-light);border-color:var(--accent-blue); }
        .cal-cell.cal-empty { opacity:0.3;pointer-events:none; }
        .cal-day { font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px; }
        .cal-day.today { color:var(--accent-blue);font-weight:700; }
        .cal-event { font-size:10px;font-weight:600;padding:3px 6px;border-radius:6px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

        .cal-sidebar { width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden; }
        .cal-sb-section { padding:24px; }
        .cal-sb-title { font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px; }
        .cal-sb-divider { height:1px;margin:0 24px;background:var(--border-secondary); }
        .cal-sb-empty { font-size:12px;color:var(--text-tertiary); }
        .cal-upcoming { display:flex;flex-direction:column;gap:14px; }
        .cal-upcoming-item { display:flex;align-items:center;gap:10px; }
        .cal-upcoming-dot { width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .cal-upcoming-label { font-size:13px;font-weight:500;color:var(--text-primary); }
        .cal-upcoming-date { font-size:11px;color:var(--text-tertiary); }
        .cal-legend { display:flex;flex-direction:column;gap:10px; }
        .cal-legend-item { display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary); }
        .cal-legend-dot { width:8px;height:8px;border-radius:3px;flex-shrink:0; }
        @media (max-width:1100px){.cal-body{grid-template-columns:1fr}.cal-sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cal-sb-divider{display:none}.cal-sb-section+.cal-sb-section{border-left:1px solid var(--border-secondary)}}
        @media (max-width:640px){.cal-main{padding:16px}.cal-sidebar{display:block}.cal-sb-section+.cal-sb-section{border-left:0}.cal-sb-divider{display:block}.cal-nav{width:100%;justify-content:space-between}.cal-nav-label{flex:1}.cal-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
