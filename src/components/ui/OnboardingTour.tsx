'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, ChevronLeft, ChevronRight, Rocket, Search, Sparkles, X } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Rocket,
    title: 'Bem-vindo ao JiraOps',
    description: 'Sua central de gestão de demandas, com Jira, automações e comunicação em um único espaço.',
  },
  {
    icon: Sparkles,
    title: 'Crie demandas com apoio de IA',
    description: 'Em Nova Demanda, você estrutura a solicitação e recebe sugestões para o resumo e a descrição.',
  },
  {
    icon: Search,
    title: 'Encontre qualquer página',
    description: 'Pressione Ctrl+K — ou Cmd+K no macOS — para abrir a navegação rápida de qualquer tela.',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe o trabalho',
    description: 'O Overview reúne os indicadores de suporte e desenvolvimento em painéis atualizados.',
  },
];

const TOUR_KEY = 'jiraops-onboarding-done';

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;
    const timer = window.setTimeout(() => setActive(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    nextButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        localStorage.setItem(TOUR_KEY, 'true');
        setActive(false);
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [active]);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setActive(false);
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep((current) => current + 1);
    else finish();
  };

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];
  const StepIcon = currentStep.icon;

  return (
    <div
      className="animate-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--bg-overlay)',
      }}
    >
      <section
        ref={dialogRef}
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
        aria-modal="true"
        className="animate-modal"
        role="dialog"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 464,
          padding: 32,
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-surface)',
          background: 'var(--bg-card-solid)',
        }}
      >
        <button
          aria-label="Fechar apresentação"
          onClick={finish}
          type="button"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'grid',
            width: 36,
            height: 36,
            placeItems: 'center',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X aria-hidden="true" size={17} />
        </button>

        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            width: 48,
            height: 48,
            marginBottom: 24,
            placeItems: 'center',
            border: '1px solid var(--border-primary)',
            borderRadius: 12,
            background: 'var(--accent-blue-light)',
            color: 'var(--accent-blue)',
          }}
        >
          <StepIcon size={23} />
        </div>

        <p style={{ marginBottom: 6, color: 'var(--text-tertiary)', fontSize: 13, lineHeight: '20px' }}>
          Passo {step + 1} de {TOUR_STEPS.length}
        </p>
        <h2
          id="onboarding-title"
          style={{
            paddingRight: 32,
            color: 'var(--text-primary)',
            fontSize: 24,
            fontWeight: 500,
            lineHeight: '32px',
          }}
        >
          {currentStep.title}
        </h2>
        <p
          id="onboarding-description"
          style={{
            marginTop: 10,
            color: 'var(--text-secondary)',
            fontSize: 15,
            lineHeight: '24px',
          }}
        >
          {currentStep.description}
        </p>

        <div aria-label="Progresso da apresentação" style={{ display: 'flex', gap: 6, marginTop: 24 }}>
          {TOUR_STEPS.map((item, index) => (
            <span
              key={item.title}
              aria-label={`Passo ${index + 1}${index === step ? ', atual' : ''}`}
              style={{
                width: index === step ? 24 : 8,
                height: 6,
                borderRadius: 999,
                background: index === step ? 'var(--accent-blue)' : 'var(--border-primary)',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((current) => current - 1)}
              type="button"
              style={{
                display: 'flex',
                minHeight: 40,
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <ChevronLeft aria-hidden="true" size={16} /> Anterior
            </button>
          )}
          <button
            ref={nextButtonRef}
            onClick={next}
            type="button"
            style={{
              display: 'flex',
              minHeight: 40,
              alignItems: 'center',
              gap: 6,
              marginLeft: 'auto',
              padding: '8px 16px',
              border: 0,
              borderRadius: 'var(--radius-control)',
              background: 'var(--accent-blue)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {step < TOUR_STEPS.length - 1 ? (
              <>Próximo <ChevronRight aria-hidden="true" size={16} /></>
            ) : (
              <>Começar <Rocket aria-hidden="true" size={16} /></>
            )}
          </button>
        </div>

        <button
          onClick={finish}
          type="button"
          style={{
            marginTop: 18,
            padding: 0,
            border: 0,
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
          }}
        >
          Pular apresentação
        </button>
      </section>
    </div>
  );
}
