'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Smartphone, Key, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Step = 'email' | 'totp-setup' | 'totp-verify';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  /* eslint-disable react-hooks/set-state-in-effect -- OAuth callback parameters are an external input mirrored into the form state. */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  // Login via Google já concluiu o 1º fator (proxy.ts redireciona pra cá com
  // ?mfa=pending) — descobre o email da sessão Auth.js e pede o 2º fator.
  // Depende do VALOR (string), não do objeto searchParams inteiro — esse
  // objeto pode trocar de referência entre renders sem o valor mudar, o que
  // disparava esse efeito (e a chamada a /api/auth/totp) mais de uma vez.
  const mfaPending = searchParams.get('mfa') === 'pending';
  const mfaEffectRanRef = useRef(false);
  useEffect(() => {
    if (!mfaPending || mfaEffectRanRef.current) return;
    mfaEffectRanRef.current = true;
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
    // startTotpChallenge fica fora das deps de propósito: ela é recriada a cada
    // render, e incluí-la reintroduziria exatamente o disparo repetido que o
    // mfaEffectRanRef acima existe pra impedir. O ref garante execução única,
    // então a identidade da função é irrelevante aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaPending]);

  // Consulta /api/auth/totp: já tem Authenticator configurado (pede código) ou
  // não (mostra QR code pra configurar). Vale tanto pro login por senha quanto Google.
  async function startTotpChallenge(targetEmail: string, idToken: string | null) {
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

      // Dispositivo já verificado nas últimas 5h: a rota já devolveu a sessão
      // pronta, então não há 2º passo a exibir.
      if (data.trusted) {
        setSuccess('Login realizado!');
        setTimeout(() => router.push('/dashboard'), 500);
        return;
      }

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
  }

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
      } catch (authError: unknown) {
        console.error('Firebase auth error:', authError);
        // Antes TODO erro do Firebase virava "Email ou senha inválidos.", o que
        // mente quando a causa é outra — bloqueio temporário por tentativas,
        // conta desativada ou rede caída mandavam o usuário conferir uma senha
        // que estava certa. Só invalid-credential/wrong-password/user-not-found
        // são de fato credencial errada, e o Firebase agrupa os três em
        // invalid-credential de propósito (proteção de enumeração de email),
        // pra não revelar se aquele email existe ou não.
        const code = (authError as { code?: string })?.code || '';
        const firebaseErrors: Record<string, string> = {
          'auth/too-many-requests':
            'Muitas tentativas. O Firebase bloqueou este acesso temporariamente — aguarde alguns minutos.',
          'auth/user-disabled': 'Esta conta está desativada no Firebase. Contate o administrador.',
          'auth/network-request-failed': 'Falha de conexão com o Firebase. Verifique sua rede.',
          'auth/operation-not-allowed': 'Login por senha está desabilitado no projeto Firebase.',
          'auth/invalid-email': 'Email em formato inválido.',
        };
        setError(firebaseErrors[code] || 'Email ou senha inválidos.');
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

  // Paleta do login: neutros levemente azulados + acento #AFC6F5, ambos
  // derivados do azul-marinho #001147 usado no painel visual.
  const fieldShell =
    'flex h-12 items-center gap-2 rounded-[10px] border border-[#222A3A] bg-[#0F131C] px-3.5 transition-colors focus-within:border-[#AFC6F5] focus-within:ring-[3px] focus-within:ring-[rgba(175,198,245,0.14)]';
  const fieldInput =
    'h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[#EEF1F8] outline-none placeholder:text-[#4C5468]';
  const fieldLabel = 'mb-2 block text-[13px] font-medium text-[#AFB7C8]';
  const primaryButton =
    'flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#AFC6F5] px-4 text-sm font-semibold text-[#061029] transition-colors enabled:hover:bg-[#C6D8FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFC6F5] disabled:cursor-not-allowed disabled:bg-[#181E2B] disabled:text-[#575F71]';
  const ghostButton =
    'mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-medium text-[#6A7285] transition-colors hover:bg-[#0F131C] hover:text-[#C0C8D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFC6F5]';

  return (
    <div className="min-h-screen bg-[#080A10] p-3 text-[#EEF1F8] sm:p-4">
      <div className="grid min-h-[calc(100dvh_-_1.5rem)] w-full grid-cols-1 sm:min-h-[calc(100dvh_-_2rem)] lg:grid-cols-2">
        {/* ── Painel visual: composição em CSS na família do azul-marinho #001147
             (névoa clara no topo, massas em diagonal, brilho azul ao pé) ── */}
        <aside
          className="relative hidden overflow-hidden rounded-[26px] bg-[#000A24] lg:block"
          aria-label="Sobre o JiraOps Dashboard"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: [
                'radial-gradient(120% 80% at 78% 112%, rgba(52,104,214,0.38) 0%, rgba(16,42,116,0.18) 38%, transparent 70%)',
                'linear-gradient(196deg, transparent 0 30%, rgba(0,8,32,0.5) 40%, rgba(0,6,24,0.88) 64%, rgba(0,4,18,0.97) 100%)',
                'linear-gradient(158deg, rgba(213,223,244,0.85) 0%, rgba(139,157,199,0.5) 16%, rgba(38,57,113,0.35) 34%, transparent 52%)',
                'linear-gradient(180deg, #C9D4EC 0%, #8291BA 14%, #37477E 32%, #001147 58%, #000818 100%)',
              ].join(','),
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg,transparent 38%,rgba(0,5,20,0.45) 72%,rgba(0,3,14,0.88) 100%)' }}
          />

          <div className="relative flex h-full flex-col p-10 xl:p-14">
            {/* Co-branding: JiraOps (o produto) | Movingpay (a empresa). O divisor
                separa os dois lockups pra não parecerem um nome só.
                justify-center alinha o par ao eixo do texto de destaque abaixo,
                que também é centralizado. */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#001147]">
                  <Zap size={17} className="text-[#C6D8FA]" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-[-0.01em] text-[#0E1D3F]">
                  JiraOps
                </span>
              </div>

              <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[#0E1D3F]/20" />

              <div className="flex items-center gap-3">
                {/* aria-hidden: o "M" é decorativo — quem usa leitor de tela ouviria
                    "M Movingpay" se ele fosse anunciado junto do nome ao lado. */}
                <div
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#001147]"
                >
                  {/* Degradê verde -> azul recortado no próprio glifo. Vai por
                      style inline (como os outros gradientes deste arquivo) em vez
                      de utilitário do Tailwind porque o v4 renomeou bg-gradient-*
                      para bg-linear-*, e o inline não depende dessa versão.
                      Os dois extremos foram escolhidos claros o suficiente para
                      manter contraste sobre o navy #001147 do badge: 8:1 no verde,
                      5,8:1 no azul. */}
                  <span
                    className="text-[18px] font-bold leading-none tracking-[-0.04em]"
                    style={{
                      backgroundImage: 'linear-gradient(135deg,#34D399 0%,#22C55E 28%,#4C93F5 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                    }}
                  >
                    M
                  </span>
                </div>
                <span className="text-sm font-semibold tracking-[-0.01em] text-[#0E1D3F]">
                  Movingpay
                </span>
              </div>
            </div>

            {/* Posição vertical por razão de flex-grow entre este bloco e o espaçador
                abaixo (não por padding percentual, que em CSS resolve pela LARGURA
                e não pela altura). A razão 1 : 0,35 foi calibrada pra primeira linha
                cair na mesma altura do "Entrar no Dashboard" da coluna do form.
                É proporcional, não travado: as duas colunas são centralizadas de
                forma independente, e a do form muda de altura entre a etapa 1 e a 2,
                então o alinhamento é aproximado por construção. */}
            <div className="flex grow flex-col justify-center text-center">
              <p className="mx-auto max-w-[26ch] text-[34px] font-medium leading-[1.18] tracking-[-0.028em] text-[#F4F7FD] xl:text-[46px]">
                Decisões mais claras, do Jira à operação.
              </p>
              <p className="mx-auto mt-3 max-w-[26ch] text-[34px] font-medium leading-[1.18] tracking-[-0.028em] text-[#F4F7FD] xl:text-[46px]">
                Métricas em tempo real para quem decide.
              </p>
              <p className="mt-8 text-[15px] leading-6 text-[#A9B8D8] xl:text-[16px]">
                JiraOps — sua central de operação, do backlog ao SLA.
              </p>
            </div>
            <div aria-hidden="true" className="grow-[0.35]" />
          </div>
        </aside>

        {/* ── Coluna do formulário ── */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-14">
          <section className="w-full max-w-[420px]" aria-labelledby="login-title">
            <div className="mb-9 flex items-center gap-4">
              <div className="flex items-center gap-2.5 lg:hidden">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#131828]">
                  <Zap size={17} className="text-[#AFC6F5]" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-[-0.01em] text-[#EEF1F8]">
                  JiraOps
                </span>
              </div>
              <span className="ml-auto text-xs font-medium text-[#5C6478]">
                {step === 'email' ? 'Etapa 1 de 2' : 'Etapa 2 de 2'}
              </span>
            </div>

            <header>
              <h1
                id="login-title"
                className="text-[26px] font-medium leading-[1.2] tracking-[-0.025em] text-[#EEF1F8] sm:text-[28px]"
              >
                {step === 'email' ? 'Entrar no Dashboard' : 'Verificação em duas etapas'}
              </h1>
              <p className="mt-3 text-[13.5px] leading-6 text-[#858DA0]">
                {step === 'email' &&
                  'Use seu email corporativo para continuar. Em seguida confirmamos sua identidade no Google Authenticator.'}
                {step === 'totp-setup' && 'Conecte o Google Authenticator à sua conta para concluir o acesso.'}
                {step === 'totp-verify' && 'Digite o código gerado para ' + totpEmail + '.'}
              </p>
            </header>

            {error && (
              <div
                role="alert"
                className="mt-7 flex items-start gap-3 rounded-[10px] border border-[rgba(229,120,130,0.16)] bg-[rgba(229,120,130,0.07)] px-4 py-3"
              >
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#E7A9AE]" aria-hidden="true" />
                <span className="text-[13px] font-medium leading-5 text-[#E7A9AE]">{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                aria-live="polite"
                className="mt-7 flex items-start gap-3 rounded-[10px] border border-[rgba(140,205,160,0.18)] bg-[rgba(140,205,160,0.07)] px-4 py-3"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#A9D3B2]" aria-hidden="true" />
                <span className="text-[13px] font-medium leading-5 text-[#A9D3B2]">{success}</span>
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleSendCode} className="mt-8">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className={fieldLabel}>
                      Email corporativo <span className="text-[#D98A9C]">*</span>
                    </label>
                    <div className={fieldShell}>
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="ex. nome@movingpay.com.br"
                        required
                        autoFocus
                        autoComplete="email"
                        aria-invalid={Boolean(error)}
                        className={fieldInput}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className={fieldLabel}>
                      Senha <span className="text-[#D98A9C]">*</span>
                    </label>
                    <div className={fieldShell}>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoComplete="current-password"
                        aria-invalid={Boolean(error)}
                        aria-describedby="login-password-help"
                        className={fieldInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={showPassword}
                        className="shrink-0 rounded-md p-1 text-[#596173] transition-colors hover:text-[#AFB7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFC6F5]"
                      >
                        {showPassword ? (
                          <EyeOff size={17} aria-hidden="true" />
                        ) : (
                          <Eye size={17} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p id="login-password-help" className="mt-3 text-xs leading-5 text-[#5C6478]">
                  Acesso restrito a emails corporativos autorizados. Sem senha definida? Peça a um administrador.
                </p>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password}
                  className={primaryButton + ' mt-7'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      <span>Validando acesso...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>

                <div className="my-5 flex items-center gap-4" aria-hidden="true">
                  <div className="h-px flex-1 bg-[#1A2030]" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#4C5468]">ou</span>
                  <div className="h-px flex-1 bg-[#1A2030]" />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setGoogleLoading(true);
                    const csrfRes = await fetch('/api/auth/csrf');
                    const { csrfToken } = await csrfRes.json();
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
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#222A3A] px-4 text-sm font-medium text-[#DBE1EE] transition-colors enabled:hover:border-[#2E3849] enabled:hover:bg-[#101520] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFC6F5] disabled:cursor-wait disabled:text-[#5C6478]"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>Entrar com Google</span>
                    </>
                  )}
                </button>

                <p className="mt-7 text-center text-[13px] text-[#6A7285]">
                  Ainda não tem acesso?{' '}
                  <span className="font-semibold text-[#C6D8FA]">Fale com um administrador</span>
                </p>
              </form>
            )}

            {step === 'totp-setup' && (
              <form onSubmit={handleConfirmSetup} className="mt-8">
                <div className="mb-5 rounded-[14px] border border-[#222A3A] bg-[#0E121B] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#AFC6F5] text-xs font-semibold text-[#061029]">
                      1
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#E2E7F2]">Escaneie o QR code</p>
                      <p id="totp-setup-help" className="mt-1 text-xs leading-5 text-[#747C8E]">
                        Abra o Google Authenticator e adicione uma nova conta.
                      </p>
                    </div>
                  </div>

                  {qrCode && (
                    <div className="mx-auto my-5 w-fit rounded-[10px] bg-[#F4F7FD] p-3">
                      <Image
                        src={qrCode}
                        alt="QR code para configurar o Google Authenticator"
                        width={184}
                        height={184}
                        unoptimized
                        priority
                      />
                    </div>
                  )}

                  {manualSecret && (
                    <div className="border-t border-[#1A2030] pt-4 text-center">
                      <p className="text-xs text-[#6A7285]">Ou insira esta chave manualmente</p>
                      <code
                        aria-label={'Chave manual: ' + manualSecret}
                        className="mt-2 inline-block max-w-full break-all rounded-lg border border-[#222A3A] bg-[#0F131C] px-3 py-2 font-mono text-xs tracking-[0.08em] text-[#9EA6B8]"
                      >
                        {manualSecret}
                      </code>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="totp-setup-code" className={fieldLabel}>
                    Código do Authenticator <span className="text-[#D98A9C]">*</span>
                  </label>
                  <div className={fieldShell}>
                    <Smartphone size={17} className="shrink-0 text-[#596173]" aria-hidden="true" />
                    <input
                      id="totp-setup-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      aria-describedby="totp-setup-help"
                      aria-invalid={Boolean(error)}
                      className={fieldInput + ' text-center text-base font-semibold tracking-[0.35em]'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpCode.trim().length !== 6}
                  className={primaryButton + ' mt-7'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <span>Confirmar e entrar</span>
                  )}
                </button>

                <button type="button" onClick={handleBackToEmail} className={ghostButton}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Voltar</span>
                </button>
              </form>
            )}

            {step === 'totp-verify' && (
              <form onSubmit={handleVerifyCode} className="mt-8">
                <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-[#222A3A] bg-[#0E121B] p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#131828] text-[#AFC6F5]">
                    <Key size={17} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#E2E7F2]">Confirme sua identidade</p>
                    <p id="totp-verify-help" className="mt-1 break-words text-xs leading-5 text-[#747C8E]">
                      Consulte o código de seis dígitos no Google Authenticator.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="totp-verify-code" className={fieldLabel}>
                    Código do Authenticator <span className="text-[#D98A9C]">*</span>
                  </label>
                  <div className={fieldShell}>
                    <Key size={17} className="shrink-0 text-[#596173]" aria-hidden="true" />
                    <input
                      id="totp-verify-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      aria-describedby="totp-verify-help"
                      aria-invalid={Boolean(error)}
                      className={fieldInput + ' text-center text-base font-semibold tracking-[0.35em]'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpCode.trim().length !== 6}
                  className={primaryButton + ' mt-7'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-[#5C6478]">
                  Perdeu acesso ao Authenticator? Contate um administrador.
                </p>

                <button type="button" onClick={handleBackToEmail} className={ghostButton}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Voltar</span>
                </button>
              </form>
            )}

            <p className="mt-9 text-center text-[11px] leading-4 text-[#3D4456]">
              JiraOps Dashboard © {new Date().getFullYear()} — Acesso restrito a usuários autorizados
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Carregando tela de login"
          className="flex min-h-screen items-center justify-center bg-[#080A10] text-[#AFC6F5]"
        >
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
