'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Shield, BarChart3, Users, AlertTriangle } from 'lucide-react';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-focus first code input when step changes to 'code'
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Código enviado no Slack! Verifique o canal.');
        setStep('code');
        setCountdown(60);
        setCode(['', '', '', '', '', '']);
      } else {
        setError(data.error || 'Erro ao enviar código');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: fullCode }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Login realizado! Redirecionando...');
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setError(data.error || 'Código inválido');
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        setTimeout(() => handleVerifyCode(), 200);
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
      setTimeout(() => {
        const res = fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), code: pasted }),
        });
      }, 300);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Novo código enviado!');
        setCountdown(60);
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
      } else {
        setError(data.error || 'Erro ao reenviar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#050810' }}>
      {/* Left Panel — Mesh Gradient Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0A0E1A 0%, #111827 50%, #0A0E1A 100%)',
        }}>
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] rounded-full -top-32 -left-32"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
              animation: 'float 8s ease-in-out infinite',
            }} />
          <div className="absolute w-[400px] h-[400px] rounded-full bottom-0 right-0"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
              animation: 'float 10s ease-in-out infinite 1s',
            }} />
          <div className="absolute w-[300px] h-[300px] rounded-full top-1/3 right-1/4"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
              animation: 'float 12s ease-in-out infinite 2s',
            }} />
          <div className="absolute inset-0" style={{
            opacity: 0.03,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative z-10 text-center px-16 max-w-xl">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #A78BFA 100%)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
            <Zap size={36} color="#fff" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-black mb-4" style={{
            background: 'linear-gradient(135deg, #F8FAFC 0%, #CBD5E1 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}>JiraOps Dashboard</h1>
          <p className="text-base leading-relaxed mb-12" style={{ color: '#64748B' }}>
            Gestão operacional inteligente com métricas em tempo real, integrado com Jira e IA.
          </p>

          <div className="flex flex-col gap-4 items-start text-left mx-auto" style={{ maxWidth: '280px' }}>
            {[
              { icon: <BarChart3 size={16} />, text: 'Métricas em tempo real' },
              { icon: <Shield size={16} />, text: 'Acesso seguro com verificação' },
              { icon: <Users size={16} />, text: 'Gestão de equipe integrada' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3" style={{ color: '#64748B' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
              }}>
              <Zap size={28} color="#fff" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            {step === 'code' && (
              <button onClick={() => { setStep('email'); setError(null); setSuccess(null); }}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
              {step === 'email' ? 'Entrar no Dashboard' : 'Verificação'}
            </h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              {step === 'email'
                ? 'Digite seu email corporativo para receber o código no Slack.'
                : <>Código enviado no Slack para <strong style={{ color: '#94A3B8' }}>{email}</strong></>
              }
            </p>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="animate-fade-in flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)' }}>
              <AlertTriangle size={16} style={{ color: '#FB7185', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: '#FB7185' }}>{error}</span>
            </div>
          )}
          {success && (
            <div className="animate-fade-in flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <CheckCircle2 size={16} style={{ color: '#4ADE80', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>{success}</span>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="animate-fade-in">
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: '#475569' }}>Email corporativo</label>
                <div className="flex items-center gap-3 px-4 rounded-xl h-13"
                  style={{
                    background: '#0F172A', border: '1px solid #1E293B',
                    transition: 'border-color 0.2s',
                  }}>
                  <Mail size={16} style={{ color: '#475569', flexShrink: 0 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nome@movingpay.com.br"
                    required
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-4"
                    style={{ color: '#F8FAFC' }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Enviar código <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* Step 2: Code verification */}
          {step === 'code' && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#475569' }}>Código de 6 dígitos</label>
                <div className="flex gap-3 justify-between" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeInput(i, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                      style={{
                        background: '#0F172A',
                        border: digit ? '2px solid #6366F1' : '1px solid #1E293B',
                        color: '#F8FAFC',
                        boxShadow: digit ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isLoading || code.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all mb-4"
                style={{
                  background: isLoading ? 'rgba(99,102,241,0.3)' : code.join('').length === 6 ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(99,102,241,0.15)',
                  color: '#fff', border: 'none',
                  cursor: isLoading || code.join('').length !== 6 ? 'default' : 'pointer',
                  boxShadow: code.join('').length === 6 ? '0 4px 24px rgba(34,197,94,0.3)' : 'none',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Verificar <CheckCircle2 size={16} /></>}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="text-xs font-semibold transition-colors"
                  style={{
                    color: countdown > 0 ? '#334155' : '#60A5FA',
                    background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer',
                  }}>
                  {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-10 text-center text-[10px]" style={{ color: '#334155' }}>
            JiraOps Dashboard © {new Date().getFullYear()} — Acesso restrito
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
