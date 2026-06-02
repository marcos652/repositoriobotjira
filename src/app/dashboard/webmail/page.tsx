'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, Calendar, RefreshCw, AlertTriangle, Inbox, 
  Clock, Paperclip, ChevronRight, CheckCircle2, User, Reply, X, Loader2
} from 'lucide-react';

interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  textSnippet: string;
  html: string;
  hasMeeting: boolean;
  attachments: { filename: string; size: number }[];
}

export default function WebmailPage() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'meetings'>('inbox');
  const [composing, setComposing] = useState(false);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success: boolean; message: string} | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webmail/inbox');
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.emails);
      } else {
        setError(data.error || 'Erro ao carregar e-mails.');
      }
    } catch (err: any) {
      setError('Erro de conexão com o servidor de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox' || activeTab === 'meetings') {
      fetchEmails();
    }
  }, [activeTab]);

  const handleSend = async () => {
    if (!composeTo || !composeSubject) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, text: composeBody, html: composeBody })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ success: true, message: 'E-mail enviado com sucesso!' });
        setTimeout(() => { setComposing(false); setSendResult(null); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }, 2000);
      } else {
        setSendResult({ success: false, message: data.error || 'Erro ao enviar.' });
      }
    } catch (err) {
      setSendResult({ success: false, message: 'Erro de conexão.' });
    } finally {
      setSending(false);
    }
  };

  const meetings = emails.filter(e => e.hasMeeting);
  const displayList = activeTab === 'meetings' ? meetings : emails;

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={24} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Webmail MovingPay</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Amazon WorkMail Integration</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => fetchEmails()} disabled={loading} style={{ padding: '0 16px', height: '40px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button onClick={() => setComposing(true)} style={{ padding: '0 20px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}>
            <Send size={14} /> Novo E-mail
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#FB7185', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <div style={{ fontSize: '13px' }}>
            <strong>Erro:</strong> {error}
            <br/>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Certifique-se de configurar WORKMAIL_EMAIL e WORKMAIL_PASSWORD nas variáveis de ambiente (.env).</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
        {/* Sidebar Menu */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: activeTab === 'inbox' ? 'rgba(99,102,241,0.1)' : 'transparent', color: activeTab === 'inbox' ? '#818CF8' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s' }}>
            <Inbox size={18} /> Caixa de Entrada
          </button>
          <button onClick={() => { setActiveTab('meetings'); setSelectedEmail(null); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: activeTab === 'meetings' ? 'rgba(139,92,246,0.1)' : 'transparent', color: activeTab === 'meetings' ? '#A78BFA' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s' }}>
            <Calendar size={18} /> Reuniões
          </button>
        </div>

        {/* Email List */}
        <div style={{ flex: 1, maxWidth: selectedEmail ? '350px' : '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.3s' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', fontSize: '12px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeTab === 'inbox' ? 'Caixa de Entrada' : 'Reuniões e Convites'}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && !error && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: '#818CF8' }} />
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Sincronizando Amazon WorkMail...</p>
              </div>
            )}
            {!loading && displayList.length === 0 && !error && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#4ADE80' }} />
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Nenhum e-mail por aqui.</p>
              </div>
            )}
            {!loading && displayList.map(email => (
              <div key={email.id} onClick={() => setSelectedEmail(email)} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)', background: selectedEmail?.id === email.id ? 'var(--bg-secondary)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                    {email.from.replace(/<.*>/, '')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(email.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.hasMeeting && <Calendar size={12} style={{ display: 'inline', marginRight: '4px', color: '#A78BFA' }} />}
                  {email.subject}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {email.textSnippet}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Email Reader */}
        {selectedEmail && (
          <div className="animate-fade-in" style={{ flex: 2, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{selectedEmail.subject}</h2>
                <button onClick={() => setSelectedEmail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmail.from}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{new Date(selectedEmail.date).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: selectedEmail.html || selectedEmail.textSnippet.replace(/\n/g, '<br/>') }} />
            
            {selectedEmail.attachments.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '8px' }}>ANEXOS</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedEmail.attachments.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Paperclip size={12} /> {a.filename || 'Anexo'} ({(a.size / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Compose Modal */}
      {composing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-fade-in" style={{ width: '600px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Nova Mensagem</h3>
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sendResult && (
                <div style={{ padding: '12px', borderRadius: '8px', background: sendResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', color: sendResult.success ? '#4ADE80' : '#FB7185', fontSize: '13px', fontWeight: 600 }}>
                  {sendResult.message}
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px' }}>Para:</label>
                <input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="email@exemplo.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px' }}>Assunto:</label>
                <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Título do e-mail" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px' }}>Mensagem:</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Escreva sua mensagem aqui..." style={{ width: '100%', height: '160px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setComposing(false)} style={{ padding: '0 20px', height: '40px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending || !composeTo || !composeSubject} style={{ padding: '0 24px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: (sending || !composeTo) ? 'not-allowed' : 'pointer', opacity: (sending || !composeTo) ? 0.6 : 1 }}>
                {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Enviar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
