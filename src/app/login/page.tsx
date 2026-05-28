'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login delay for demo
    await new Promise(resolve => setTimeout(resolve, 1200));
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'var(--gradient-primary)' }}>
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full bg-white/5 -top-20 -left-20 animate-float" />
          <div className="absolute w-64 h-64 rounded-full bg-white/5 bottom-20 right-10" style={{ animationDelay: '1s', animation: 'float 4s ease-in-out infinite 1s' }} />
          <div className="absolute w-48 h-48 rounded-full bg-white/10 top-1/3 right-1/4" style={{ animation: 'float 5s ease-in-out infinite 0.5s' }} />
        </div>

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center bg-white/10 backdrop-blur-lg border border-white/20">
            <Zap size={40} color="#fff" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            JiraOps
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Gestão operacional inteligente com métricas em tempo real para times de suporte e desenvolvimento.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Projetos', value: '12+' },
              { label: 'Métricas', value: '50+' },
              { label: 'Real-time', value: '24/7' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}>
              <Zap size={24} color="#fff" />
            </div>
            <span className="text-2xl font-bold">
              Jira<span className="text-gradient">Ops</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Entre com suas credenciais para acessar o dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-tertiary)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-tertiary)' }}>
                Senha
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 rounded-xl text-sm border transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Lembrar-me</span>
              </label>
              <button type="button" className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2
                transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          </div>

          {/* Google login */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl text-sm font-medium border flex items-center justify-center gap-3
              transition-all duration-200 hover:shadow-md"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z"/>
            </svg>
            Entrar com Google
          </button>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
            Não tem conta?{' '}
            <button className="font-medium" style={{ color: 'var(--accent-blue)' }}>
              Solicitar acesso
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
