'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Shield, BarChart3, Users, AlertTriangle, Smartphone, Key, Lock } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Step = 'email' | 'totp-setup' | 'totp-verify';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Estado do 2º fator (Google Authenticator) ──
  const [totpEmail, setTotpEmail] = useState('');
  const [totpIdToken, setTotpIdToken] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Check for OAuth errors from callback
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'EmailNotAllowed') {
      setError('Email não autorizado. Peça acesso ao administrador.');
    } else if (err === 'AccountBlocked') {
      setError('Sua conta foi bloqueada. Contate o administrador.');
    } else if (err) {
      setError('Erro na autenticação. Tente novamente.');
    }
  }, [searchParams]);

  // Login via Google já concluiu o 1º fator (proxy.ts redireciona pra cá com
  // ?mfa=pending) — descobre o email da sessão Auth.js e pede o 2º fator.
  useEffect(() => {
    if (searchParams.get('mfa') !== 'pending') return;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        const ssoEmail = data?.user?.email;
        if (ssoEmail) {
          await startTotpChallenge(ssoEmail, null);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Consulta /api/auth/totp: já tem Authenticator configurado (pede código) ou
  // não (mostra QR code pra configurar). Vale tanto pro login por senha quanto Google.
  const startTotpChallenge = async (targetEmail: string, idToken: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar verificação em duas etapas.');
        return;
      }

      setTotpEmail(targetEmail);
      setTotpIdToken(idToken);

      if (data.configured) {
        setStep('totp-verify');
      } else {
        setQrCode(data.qrCode);
        setManualSecret(data.secret);
        setSetupToken(data.setupToken);
        setStep('totp-setup');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle login submit: Firebase Auth, depois exige o Google Authenticator ──
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      let idToken = '';
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        idToken = await userCredential.user.getIdToken();
      } catch (authError: any) {
        console.error('Firebase auth error:', authError);
        setError('Email ou senha inválidos.');
        setIsLoading(false);
        return;
      }

      await startTotpChallenge(email.trim().toLowerCase(), idToken);
    } catch {
      setError('Erro de conexão');
      setIsLoading(false);
    }
  };

  // ── Confirma o primeiro código depois de escanear o QR (configuração inicial) ──
  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: totpEmail,
          idToken: totpIdToken,
          action: 'confirm-setup',
          code: totpCode.trim(),
          setupToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Login realizado!');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        setError(data.error || 'Código incorreto');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verifica o código do Authenticator já configurado ──
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: totpEmail,
          idToken: totpIdToken,
          action: 'verify',
          code: totpCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Login realizado!');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        setError(data.error || 'Código incorreto');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setError(null);
    setTotpCode('');
    router.replace('/login');
  };

  // Não há reset autoatendido de TOTP: apagar o próprio 2º fator só com prova do
  // 1º (senha/Google) permitiria a quem só roubou a senha rearmar o TOTP pro
  // próprio aparelho. Quem perder o acesso precisa de um admin (DELETE /api/auth/totp).



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
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
              {step === 'email' ? 'Entrar no Dashboard' : 'Verificação em duas etapas'}
            </h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              {step === 'email' && 'Digite seu email corporativo.'}
              {step === 'totp-setup' && 'Escaneie o QR code com o Google Authenticator.'}
              {step === 'totp-verify' && `Digite o código gerado pelo Google Authenticator para ${totpEmail}.`}
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
                <div className="flex items-center gap-3 px-4 rounded-xl h-13 mb-4"
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

                <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: '#475569' }}>Senha</label>
                <div className="flex items-center gap-3 px-4 rounded-xl h-13"
                  style={{
                    background: '#0F172A', border: '1px solid #1E293B',
                    transition: 'border-color 0.2s',
                  }}>
                  <Lock size={16} style={{ color: '#475569', flexShrink: 0 }} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-4"
                    style={{ color: '#F8FAFC' }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Entrar <ArrowRight size={16} /></>}
              </button>

              {/* Separator */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px" style={{ background: '#1E293B' }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#334155' }}>ou</span>
                <div className="flex-1 h-px" style={{ background: '#1E293B' }} />
              </div>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={async () => {
                  setGoogleLoading(true);
                  const csrfRes = await fetch('/api/auth/csrf');
                  const { csrfToken } = await csrfRes.json();
                  // Redirect to Google OAuth
                  const form = document.createElement('form');
                  form.method = 'POST';
                  form.action = '/api/auth/signin/google';
                  const csrfInput = document.createElement('input');
                  csrfInput.name = 'csrfToken';
                  csrfInput.value = csrfToken;
                  csrfInput.type = 'hidden';
                  form.appendChild(csrfInput);
                  const callbackInput = document.createElement('input');
                  callbackInput.name = 'callbackUrl';
                  callbackInput.value = '/dashboard';
                  callbackInput.type = 'hidden';
                  form.appendChild(callbackInput);
                  document.body.appendChild(form);
                  form.submit();
                }}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: '#0F172A',
                  border: '1px solid #1E293B',
                  color: '#E2E8F0',
                  cursor: googleLoading ? 'wait' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3B82F6';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E293B';
                  (e.currentTarget as HTMLButtonElement).style.background = '#0F172A';
                }}
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Entrar com Google
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2a: Configurar Google Authenticator (primeiro acesso) */}
          {step === 'totp-setup' && (
            <form onSubmit={handleConfirmSetup} className="animate-fade-in">
              <div className="flex flex-col items-center mb-6">
                {qrCode && (
                  <img src={qrCode} alt="QR code do Google Authenticator" width={200} height={200}
                    className="rounded-xl mb-4" style={{ border: '1px solid #1E293B' }} />
                )}
                {manualSecret && (
                  <div className="w-full text-center mb-4">
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                      Ou digite manualmente no app
                    </p>
                    <code className="text-xs font-mono px-3 py-1.5 rounded-lg inline-block"
                      style={{ background: '#0F172A', color: '#94A3B8', border: '1px solid #1E293B', letterSpacing: '0.05em' }}>
                      {manualSecret}
                    </code>
                  </div>
                )}
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#475569' }}>Código do Authenticator</label>
              <div className="flex items-center gap-3 px-4 rounded-xl h-13 mb-6"
                style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                <Smartphone size={16} style={{ color: '#475569', flexShrink: 0 }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-4 tracking-widest"
                  style={{ color: '#F8FAFC' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.trim().length !== 6}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Confirmar e entrar <ArrowRight size={16} /></>}
              </button>

              <button type="button" onClick={handleBackToEmail}
                className="w-full flex items-center justify-center gap-2 h-10 mt-3 rounded-xl text-xs font-semibold"
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            </form>
          )}

          {/* Step 2b: Digitar código do Authenticator já configurado */}
          {step === 'totp-verify' && (
            <form onSubmit={handleVerifyCode} className="animate-fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#475569' }}>Código do Authenticator</label>
              <div className="flex items-center gap-3 px-4 rounded-xl h-13 mb-6"
                style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                <Key size={16} style={{ color: '#475569', flexShrink: 0 }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-4 tracking-widest"
                  style={{ color: '#F8FAFC' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.trim().length !== 6}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff', border: 'none', cursor: isLoading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Entrar <ArrowRight size={16} /></>}
              </button>

              <p className="w-full text-center mt-4 text-xs" style={{ color: '#475569' }}>
                Perdeu acesso ao Authenticator? Contate um administrador.
              </p>

              <button type="button" onClick={handleBackToEmail}
                className="w-full flex items-center justify-center gap-2 h-10 mt-3 rounded-xl text-xs font-semibold"
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            </form>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#050810', minHeight: '100vh' }} />}>
      <LoginContent />
    </Suspense>
  );
}
