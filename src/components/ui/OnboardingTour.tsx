'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  emoji: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    emoji: '🚀',
    title: 'Bem-vindo ao JiraOps!',
    description: 'Sua central de gestão de demandas integrada com Jira, IA e Slack.',
  },
  {
    emoji: '✨',
    title: 'Criar Demandas com IA',
    description: 'Use "Nova Demanda" para criar issues automaticamente. O Gemini gera o resumo e descrição para você.',
  },
  {
    emoji: '🔍',
    title: 'Busca Rápida',
    description: 'Pressione Ctrl+K (ou Cmd+K) para abrir a busca global e navegar rapidamente.',
  },
  {
    emoji: '📊',
    title: 'Métricas em Tempo Real',
    description: 'O Overview mostra KPIs de suporte e desenvolvimento atualizados automaticamente.',
  },
  {
    emoji: '⌨️',
    title: 'Atalhos de Teclado',
    description: 'N = Nova Demanda, S = Buscar Demanda, H = Home. Produtividade máxima!',
  },
];

const TOUR_KEY = 'jiraops-onboarding-done';

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      setTimeout(() => setActive(true), 1500);
    }
  }, []);

  const finish = () => {
    setActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];

  return (
    <div className="animate-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="animate-modal" style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: 32,
        textAlign: 'center',
      }}>
        {/* Close */}
        <button onClick={finish} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', padding: 4,
        }}>
          <X size={18} />
        </button>

        {/* Emoji */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{currentStep.emoji}</div>

        {/* Title */}
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
          marginBottom: 8,
        }}>
          {currentStep.title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 14, color: 'var(--text-secondary)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {currentStep.description}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i === step ? 'var(--accent-blue)' : 'var(--border-primary)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {step > 0 && (
            <button onClick={prev} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '10px 18px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              <ChevronLeft size={14} /> Anterior
            </button>
          )}
          <button onClick={next} className="ripple-container" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 24px', borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-primary)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            boxShadow: 'var(--shadow-glow-blue)',
          }}>
            {step < TOUR_STEPS.length - 1 ? (
              <>Próximo <ChevronRight size={14} /></>
            ) : (
              <>Começar <Rocket size={14} /></>
            )}
          </button>
        </div>

        {/* Skip */}
        <button onClick={finish} style={{
          marginTop: 16, background: 'none', border: 'none',
          color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}>
          Pular tour
        </button>
      </div>
    </div>
  );
}
