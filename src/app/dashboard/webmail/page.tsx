'use client';

import React from 'react';
import { Mail, ExternalLink, ShieldCheck, Lock, Clock } from 'lucide-react';

export default function WebmailPage() {
  const awsSsoUrl = 'https://mvpay.awsapps.com/auth/?client_id=6b9615ec01be1c8d&redirect_uri=https%3A%2F%2Fwebmail.mail.us-east-1.awsapps.com%2Fworkmail%2F';

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)', position: 'relative' }}>
      
      {/* Fallback Warning just in case AWS blocks iframes */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 16px', background: 'rgba(245,158,11,0.1)', color: '#D97706', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <span>Integração Amazon WorkMail SSO</span>
        <a href={awsSsoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Não carregou? Abrir em nova aba <ExternalLink size={12} />
        </a>
      </div>

      <iframe 
        src={awsSsoUrl}
        style={{ width: '100%', height: '100%', border: 'none', marginTop: '34px' }}
        title="Amazon WorkMail Inbox"
        allow="microphone; camera; display-capture"
      />
    </div>
  );
}
