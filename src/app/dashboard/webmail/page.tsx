'use client';

import React from 'react';
import { Mail, ExternalLink, ShieldCheck, Lock, Clock } from 'lucide-react';

export default function WebmailPage() {
  const awsSsoUrl = 'https://mvpay.awsapps.com/auth/?client_id=6b9615ec01be1c8d&redirect_uri=https%3A%2F%2Fwebmail.mail.us-east-1.awsapps.com%2Fworkmail%2F';

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.05)' }}>
        
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Mail size={40} style={{ color: '#818CF8' }} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
          Webmail MovingPay
        </h1>
        
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 32px' }}>
          Sua conta de e-mail utiliza o sistema <strong>SSO (Single Sign-On)</strong> corporativo da Amazon para garantir a segurança máxima dos seus dados e reuniões.
        </p>

        <a 
          href={awsSsoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', fontSize: '15px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(59,130,246,0.25)', transition: 'transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          Acessar Amazon WorkMail <ExternalLink size={18} />
        </a>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '32px', borderTop: '1px solid var(--border-secondary)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 600 }}>
            <ShieldCheck size={14} style={{ color: '#4ADE80' }} /> Acesso Seguro
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 600 }}>
            <Lock size={14} style={{ color: '#FBBF24' }} /> SSO Integrado
          </div>
        </div>

      </div>

    </div>
  );
}
