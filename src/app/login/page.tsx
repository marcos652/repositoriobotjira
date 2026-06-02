'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Shield, BarChart3, Users, AlertTriangle, Smartphone, Key, Lock } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Step = 'email' | 'code' | 'totp-setup' | 'totp-verify';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [totpQR, setTotpQR] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpSetupToken, setTotpSetupToken] = useState('');
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', '']);
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for OAuth errors from callback
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'EmailNotAllowed') {
      setError('Email não autorizado. Peça acesso ao administrador.');
    } else if (err) {
      setError('Erro na autenticação. Tente novamente.');
    }
  }, [searchParams]);

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

  // ── Handle login submit: check Firebase Auth first, then TOTP ──
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Firebase Authentication
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

      setAuthToken(idToken); // Temporarily store idToken for verify step

      // 2. Proceed to TOTP check
      const totpRes = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: 'setup', idToken }),
      });
      const totpData = await totpRes.json();

      if (totpRes.ok) {
        if (totpData.configured) {
          // User has TOTP — go to verify step
          setStep('totp-verify');
          setIsLoading(false);
          setTimeout(() => totpRefs.current[0]?.focus(), 100);
          return;
        } else {
          // New user — show QR code to setup
          setTotpQR(totpData.qrCode);
          setTotpSecret(totpData.secret);
          setTotpSetupToken(totpData.setupToken);
          setStep('totp-setup');
          setIsLoading(false);
          return;
        }
      }
      
      // If TOTP API fails for some reason (which shouldn't block an authenticated user but we respect it for now)
      setError(totpData.error || 'Erro ao processar TOTP');
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify TOTP code (existing users) ──
  const handleVerifyTOTP = async () => {
    const codeStr = totpCode.join('');
    if (codeStr.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: 'verify', code: codeStr, idToken: authToken }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Login realizado!');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        setError(data.error || 'Código incorreto');
        setTotpCode(['', '', '', '', '', '']);
        totpRefs.current[0]?.focus();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Confirm TOTP setup (new users) ──
  const handleConfirmSetup = async () => {
    const codeStr = totpCode.join('');
    if (codeStr.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          action: 'confirm-setup',
          code: codeStr,
          setupToken: totpSetupToken,
          idToken: authToken
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Authenticator configurado! Entrando...');
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        setError(data.error || 'Código incorreto');
        setTotpCode(['', '', '', '', '', '']);
        totpRefs.current[0]?.focus();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // ── TOTP code input handlers ──
  const handleTotpInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...totpCode];
    newCode[index] = value;
    setTotpCode(newCode);
    if (value && index < 5) totpRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.join('').length === 6) {
      if (step === 'totp-verify') setTimeout(() => handleVerifyTOTP(), 200);
      else if (step === 'totp-setup') setTimeout(() => handleConfirmSetup(), 200);
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      totpRefs.current[index - 1]?.focus();
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
        body: JSON.stringify({ email: email.trim(), code: fullCode, token: authToken }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAuthToken(''); // Invalida o token imediatamente
        setCode(['', '', '', '', '', '']);
        setSuccess('Login realizado! Redirecionando...');
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setAuthToken(''); // Token usado = expirado
        setError(data.error || 'Código inválido. Solicite um novo.');
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
      setTimeout(() => handleVerifyCode(), 300);
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
      if (res.ok && data.success) {
        setAuthToken(data.token);
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
            {step !== 'email' && (
              <button onClick={() => { setStep('email'); setError(null); setSuccess(null); setTotpCode(['','','','','','']); }}
                className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
                style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
              {step === 'email' ? 'Entrar no Dashboard' : step === 'totp-setup' ? 'Configurar Authenticator' : step === 'totp-verify' ? 'Verificação 2FA' : 'Verificação'}
            </h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              {step === 'email'
                ? 'Digite seu email corporativo.'
                : step === 'totp-setup'
                ? 'Escaneie o QR code com o Google Authenticator.'
                : step === 'totp-verify'
                ? <>Abra o <strong style={{ color: '#94A3B8' }}>Google Authenticator</strong> e digite o código.</>
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

          {/* Step: TOTP Setup (QR Code) */}
          {step === 'totp-setup' && (
            <div className="animate-fade-in">
              <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-2xl mb-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                  {totpQR && <img src={totpQR} alt="QR Code" width={240} height={240} style={{ borderRadius: '12px' }} />}
                </div>
                <p className="text-[10px] text-center" style={{ color: '#475569' }}>
                  Ou insira manualmente: <code className="px-2 py-1 rounded text-[10px] font-mono" style={{ background: '#1E293B', color: '#94A3B8' }}>{totpSecret}</code>
                </p>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>
                <Smartphone size={12} style={{ display: 'inline', marginRight: '6px' }} />
                Digite o código do Authenticator
              </label>
              <div className="flex gap-3 justify-between mb-6">
                {totpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { totpRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleTotpInput(i, e.target.value)}
                    onKeyDown={e => handleTotpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                    style={{
                      background: '#0F172A',
                      border: digit ? '2px solid #22C55E' : '1px solid #1E293B',
                      color: '#F8FAFC',
                      boxShadow: digit ? '0 0 12px rgba(34,197,94,0.15)' : 'none',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleConfirmSetup}
                disabled={isLoading || totpCode.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: totpCode.join('').length === 6 ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(99,102,241,0.15)',
                  color: '#fff', border: 'none',
                  cursor: totpCode.join('').length !== 6 ? 'default' : 'pointer',
                  boxShadow: totpCode.join('').length === 6 ? '0 4px 24px rgba(34,197,94,0.3)' : 'none',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Confirmar e Entrar <CheckCircle2 size={16} /></>}
              </button>
            </div>
          )}

          {/* Step: TOTP Verify (returning users) */}
          {step === 'totp-verify' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <Key size={16} style={{ color: '#818CF8', flexShrink: 0 }} />
                <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                  Abra o Google Authenticator no celular
                </span>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>Código de 6 dígitos</label>
              <div className="flex gap-3 justify-between mb-6">
                {totpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { totpRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleTotpInput(i, e.target.value)}
                    onKeyDown={e => handleTotpKeyDown(i, e)}
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

              <button
                onClick={handleVerifyTOTP}
                disabled={isLoading || totpCode.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: totpCode.join('').length === 6 ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(99,102,241,0.15)',
                  color: '#fff', border: 'none',
                  cursor: totpCode.join('').length !== 6 ? 'default' : 'pointer',
                  boxShadow: totpCode.join('').length === 6 ? '0 4px 24px rgba(34,197,94,0.3)' : 'none',
                }}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Verificar <CheckCircle2 size={16} /></>}
              </button>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#050810', minHeight: '100vh' }} />}>
      <LoginContent />
    </Suspense>
  );
}
