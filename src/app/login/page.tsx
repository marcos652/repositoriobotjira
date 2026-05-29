'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, BarChart3, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    router.push('/dashboard');
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
          {/* Grid overlay */}
          <div className="absolute inset-0" style={{
            opacity: 0.03,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative z-10 text-center px-16 max-w-xl">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #A78BFA 100%)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
            <Zap size={36} color="#fff" strokeWidth={2} />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: '#F1F5F9' }}>
            Jira<span style={{ color: '#A78BFA' }}>Ops</span>
          </h1>
          <p className="text-base leading-relaxed mb-12" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Gestão operacional inteligente com métricas em tempo real para times de suporte e desenvolvimento.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <BarChart3 size={20} />, label: 'Métricas', desc: 'Tempo real' },
              { icon: <Shield size={20} />, label: 'SLA', desc: 'Monitoramento' },
              { icon: <Users size={20} />, label: 'Equipe', desc: 'Performance' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl text-center"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(8px)',
                }}>
                <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>
                  {item.icon}
                </div>
                <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ background: '#0A0E1A' }}>
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}>
              <Zap size={24} color="#fff" />
            </div>
            <span className="text-2xl font-extrabold" style={{ color: '#F1F5F9' }}>
              Jira<span style={{ color: '#A78BFA' }}>Ops</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: '#F1F5F9' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Entre com suas credenciais para acessar o dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
                style={{ color: '#64748B' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148,163,184,0.08)',
                    color: '#F1F5F9',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(148,163,184,0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
                style={{ color: '#64748B' }}>
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148,163,184,0.08)',
                    color: '#F1F5F9',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(148,163,184,0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                  style={{ color: '#475569' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded"
                  style={{ accentColor: '#3B82F6' }} />
                <span className="text-sm" style={{ color: '#94A3B8' }}>Lembrar-me</span>
              </label>
              <button type="button" className="text-sm font-medium cursor-pointer" style={{ color: '#3B82F6' }}>
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2
                transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              }}
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
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.08)' }} />
            <span className="text-xs font-medium" style={{ color: '#475569' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.08)' }} />
          </div>

          {/* Google login */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-3
              transition-all duration-200 hover:border-blue-500/20 cursor-pointer"
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(148,163,184,0.08)',
              color: '#E2E8F0',
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

          <p className="text-center text-xs mt-7" style={{ color: '#475569' }}>
            Não tem conta?{' '}
            <button className="font-semibold cursor-pointer" style={{ color: '#3B82F6' }}>
              Solicitar acesso
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
