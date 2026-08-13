'use client';
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, Calendar, RefreshCw, AlertTriangle, Inbox, 
  Paperclip, CheckCircle2, Reply, X, Loader2
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
  isRead?: boolean;
}

export default function WebmailPage() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'meetings'>('inbox');
  const [composing, setComposing] = useState(false);
  const [loadingBody, setLoadingBody] = useState(false);

  // Auth State
  const [creds, setCreds] = useState<{user: string, pass: string} | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  // Load creds on mount
  useEffect(() => {
    const saved = localStorage.getItem('webmail_creds');
    if (saved) {
      setCreds(JSON.parse(saved));
    }
    setAuthChecking(false);
  }, []);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success: boolean; message: string} | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('webmail_creds');
    setCreds(null);
    setEmails([]);
    setSelectedEmail(null);
  };

  const fetchEmails = async (silent = false) => {
    if (!creds) return;
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const res = await fetch('/api/webmail/inbox?mode=list', {
        headers: { 'x-webmail-user': creds.user, 'x-webmail-pass': creds.pass }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.emails);
      } else {
        if (!silent) setError(data.error || 'Erro ao carregar e-mails.');
        if (res.status === 401 || data.error?.includes('Faça login')) handleLogout();
      }
    } catch {
      if (!silent) setError('Erro de conexão com o servidor de e-mail.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!creds) return;
    const interval = setInterval(() => {
      if (activeTab === 'inbox' || activeTab === 'meetings') {
        fetchEmails(true); // silent fetch
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, creds]);

  // Initial fetch when creds are available
  useEffect(() => {
    if (creds) fetchEmails();
  }, [creds]);

  const handleSelectEmail = async (email: EmailData) => {
    if (!creds) return;
    
    // Optimistically mark as read in the UI
    if (!email.isRead) {
      setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
    }

    setSelectedEmail(email);
    setLoadingBody(true);
    try {
      const res = await fetch(`/api/webmail/inbox?mode=body&uid=${email.id}`, {
        headers: { 'x-webmail-user': creds.user, 'x-webmail-pass': creds.pass }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedEmail({ ...email, ...data.email, isRead: true });
      }
    } catch (e) {
      console.error('Failed to fetch body', e);
    } finally {
      setLoadingBody(false);
    }
  };

  const toggleReadStatus = async (e: React.MouseEvent, email: EmailData) => {
    e.stopPropagation(); // prevent opening the email
    if (!creds) return;
    const newStatus = !email.isRead;
    
    // Optimistic UI update
    setEmails(emails.map(em => em.id === email.id ? { ...em, isRead: newStatus } : em));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...selectedEmail, isRead: newStatus });
    }

    try {
      await fetch(`/api/webmail/inbox?mode=${newStatus ? 'markRead' : 'markUnread'}&uid=${email.id}`, {
        headers: { 'x-webmail-user': creds.user, 'x-webmail-pass': creds.pass }
      });
    } catch (err) {
      console.error('Failed to toggle read status', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox' || activeTab === 'meetings') {
      fetchEmails();
    }
  }, [activeTab]);

  const handleSend = async () => {
    if (!creds || !composeTo || !composeSubject) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-webmail-user': creds.user,
          'x-webmail-pass': creds.pass
        },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, text: composeBody, html: composeBody })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ success: true, message: 'E-mail enviado com sucesso!' });
        setTimeout(() => { setComposing(false); setSendResult(null); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }, 2000);
      } else {
        setSendResult({ success: false, message: data.error || 'Erro ao enviar.' });
      }
    } catch {
      setSendResult({ success: false, message: 'Erro de conexão.' });
    } finally {
      setSending(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser || !loginPass) return;
    const c = { user: loginUser, pass: loginPass };
    localStorage.setItem('webmail_creds', JSON.stringify(c));
    setCreds(c);
  };

  const meetings = emails.filter(e => e.hasMeeting);
  const displayList = activeTab === 'meetings' ? meetings : emails;

  if (authChecking) return null;

  if (!creds) {
    return (
      <div className="webmail-login-root animate-fade-in">
        <div className="webmail-login-card">
          <div className="webmail-login-icon">
            <Mail size={30} style={{ color: '#818CF8' }} />
          </div>
          <h1 className="webmail-login-title">Login no Webmail</h1>
          <p className="webmail-login-copy">Conecte sua conta corporativa da Amazon WorkMail para acessar seus e-mails nativamente.</p>
          
          <form className="webmail-login-form" onSubmit={handleLogin}>
            <input type="email" placeholder="Seu e-mail corporativo" value={loginUser} onChange={e => setLoginUser(e.target.value)} required />
            <input type="password" placeholder="Sua senha do WorkMail" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
            <button type="submit">
              Conectar Conta
            </button>
          </form>
          <div className="webmail-login-note">
             <AlertTriangle size={12} /> As credenciais ficam salvas localmente no seu navegador.
          </div>
        </div>
        <style jsx>{`
          .webmail-login-root { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px 0; }
          .webmail-login-card { width: 100%; max-width: 440px; padding: 40px; box-sizing: border-box; text-align: center; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
          .webmail-login-icon { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); background: rgba(99,102,241,0.1); }
          .webmail-login-title { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -.02em; }
          .webmail-login-copy { margin: 10px 0 28px; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
          .webmail-login-form { display: flex; flex-direction: column; gap: 12px; }
          .webmail-login-form input { width: 100%; height: 44px; padding: 0 14px; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-secondary); color: var(--text-primary); outline: none; font: 400 13px var(--font-sans); }
          .webmail-login-form input:focus { border-color: #6366F1; }
          .webmail-login-form button { width: 100%; min-height: 44px; margin-top: 4px; border-radius: 8px; border: 1px solid #3B82F6; background: #3B82F6; color: #fff; font: 700 14px var(--font-sans); cursor: pointer; }
          .webmail-login-note { margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--text-tertiary); font-size: 11px; }
          @media (max-width: 520px) { .webmail-login-card { padding: 28px 20px; } .webmail-login-title { font-size: 28px; line-height: 34px; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="webmail-root animate-fade-in">
      {/* Header */}
      <div className="webmail-header">
        <div>
          <div>
            <h1 className="webmail-title">Webmail MovingPay</h1>
            <p className="webmail-subtitle">Amazon WorkMail Integration</p>
          </div>
        </div>
        <div className="webmail-header-actions">
          <button className="webmail-btn webmail-btn-muted" onClick={handleLogout}>
            Desconectar
          </button>
          <button className="webmail-btn webmail-btn-muted" onClick={() => fetchEmails()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button className="webmail-btn webmail-btn-primary" onClick={() => setComposing(true)}>
            <Send size={14} /> Novo E-mail
          </button>
        </div>
      </div>

      {error && (
        <div className="webmail-error">
          <AlertTriangle size={18} />
          <div style={{ fontSize: '13px' }}>
            <strong>Erro:</strong> {error}
            <br/>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Verifique se o seu E-mail e Senha do WorkMail estão corretos no botão de Configurações.</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="webmail-main">
        
        {/* Email List */}
        <div className="webmail-list" style={{ maxWidth: selectedEmail ? '380px' : '100%' }}>
          <div className="webmail-list-toolbar">
            <div className="webmail-list-tabs">
              <button onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: activeTab === 'inbox' ? 'rgba(99,102,241,0.1)' : 'transparent', color: activeTab === 'inbox' ? '#818CF8' : 'var(--text-secondary)', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}>
                <Inbox size={16} /> Caixa de Entrada
                {emails.filter(e => !e.isRead).length > 0 && (
                  <span style={{ background: '#EF4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: '4px' }}>
                    {emails.filter(e => !e.isRead).length}
                  </span>
                )}
              </button>
              <button onClick={() => { setActiveTab('meetings'); setSelectedEmail(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: activeTab === 'meetings' ? 'rgba(139,92,246,0.1)' : 'transparent', color: activeTab === 'meetings' ? '#A78BFA' : 'var(--text-secondary)', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}>
                <Calendar size={16} /> Reuniões
              </button>
            </div>
            <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.1)', color: '#818CF8', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>{displayList.length} msgs</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && !error && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#818CF8' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Sincronizando sua caixa...</p>
              </div>
            )}
            {!loading && displayList.length === 0 && !error && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={32} style={{ color: '#4ADE80' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Tudo Limpo!</h3>
                <p style={{ fontSize: '13px' }}>Nenhum e-mail novo por aqui.</p>
              </div>
            )}
            {!loading && displayList.map(email => {
              const senderName = email.from.replace(/<.*>/, '').trim() || 'Desconhecido';
              const initial = senderName.charAt(0).toUpperCase();
              const isSelected = selectedEmail?.id === email.id;
              
              return (
                <div key={email.id} onClick={() => handleSelectEmail(email)} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)', background: isSelected ? 'var(--bg-secondary)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s', borderLeft: isSelected ? '3px solid #6366F1' : (!email.isRead ? '3px solid #3B82F6' : '3px solid transparent'), position: 'relative' }}>
                  
                  {/* Unread Indicator Dot */}
                  {!email.isRead && (
                    <div style={{ position: 'absolute', top: '24px', left: '10px', width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                  )}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingLeft: !email.isRead ? '8px' : '0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0, opacity: !email.isRead ? 1 : 0.7 }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: isSelected || !email.isRead ? 800 : 600, color: isSelected || !email.isRead ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
                          {senderName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={(e) => toggleReadStatus(e, email)}
                            title={email.isRead ? "Marcar como Não Lido" : "Marcar como Lido"}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: email.isRead ? 'var(--text-tertiary)' : '#3B82F6', padding: '0', display: 'flex' }}
                          >
                            <Mail size={14} />
                          </button>
                          <span style={{ fontSize: '11px', color: !email.isRead ? '#3B82F6' : 'var(--text-tertiary)', fontWeight: !email.isRead ? 700 : 500 }}>
                            {new Date(email.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '13px', fontWeight: !email.isRead ? 700 : 500, color: !email.isRead ? 'var(--text-primary)' : 'var(--text-secondary)', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.hasMeeting && <Calendar size={12} style={{ display: 'inline', marginRight: '4px', color: '#A78BFA' }} />}
                        {email.subject}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {email.textSnippet}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Reader */}
        {selectedEmail && (
          <div className="webmail-reader animate-fade-in">
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{selectedEmail.subject}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => {
                    const to = selectedEmail.from.match(/<([^>]+)>/)?.[1] || selectedEmail.from;
                    setComposeTo(to);
                    setComposeSubject(`Re: ${selectedEmail.subject}`);
                    
                    const originalDate = new Date(selectedEmail.date).toLocaleString('pt-BR');
                    const quoteHeader = `\n\n\n--- Em ${originalDate}, ${selectedEmail.from} escreveu:\n`;
                    const quoteBody = selectedEmail.textSnippet.split('\n').map(line => `> ${line}`).join('\n');
                    
                    setComposeBody(`${quoteHeader}${quoteBody}`);
                    setComposing(true);
                  }} style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Reply size={16} /> Responder
                  </button>
                  <button onClick={() => setSelectedEmail(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <X size={18}/>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 800 }}>
                  {selectedEmail.from.replace(/<.*>/, '').trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{selectedEmail.from.replace(/<.*>/, '').trim() || 'Desconhecido'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedEmail.from.match(/<([^>]+)>/)?.[1] || ''}</span>
                    <span>•</span>
                    <span>{new Date(selectedEmail.date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {loadingBody ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#818CF8' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Baixando conteúdo seguro da Amazon...</p>
              </div>
            ) : (
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }}>
                {selectedEmail.html ? (
                  <iframe 
                    srcDoc={`
                      <style>
                        body { background-color: transparent !important; color: #e2e8f0 !important; font-family: 'DM Sans', system-ui, sans-serif !important; margin: 0; padding: 0; }
                        a { color: #818CF8 !important; }
                        table, td, div, span, p { background-color: transparent !important; color: inherit !important; }
                      </style>
                      ${selectedEmail.html}
                    `}
                    style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', borderRadius: '8px' }} 
                    sandbox="allow-popups allow-same-origin"
                  />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{selectedEmail.textSnippet}</div>
                )}
                
                {selectedEmail.hasMeeting && (
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A78BFA', fontWeight: 700, marginBottom: '8px' }}>
                      <Calendar size={18} /> Convite de Reunião Encontrado
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Este e-mail contém um arquivo de calendário (.ics). Verifique a aba Reuniões para mais detalhes.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && !loadingBody && (
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
        <div className="webmail-modal-overlay">
          <div className="webmail-modal animate-fade-in">
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
                <input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="email@exemplo.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px' }}>Assunto:</label>
                <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Título do e-mail" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px' }}>Mensagem:</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Escreva sua mensagem aqui..." style={{ width: '100%', height: '160px', padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setComposing(false)} style={{ padding: '0 20px', height: '40px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending || !composeTo || !composeSubject} style={{ padding: '0 24px', height: '40px', borderRadius: '8px', background: '#3B82F6', color: '#fff', border: '1px solid #3B82F6', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: (sending || !composeTo) ? 'not-allowed' : 'pointer', opacity: (sending || !composeTo) ? 0.6 : 1 }}>
                {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .webmail-root { display: flex; flex-direction: column; gap: 24px; min-width: 0; min-height: 0; height: 100%; }
        .webmail-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; flex-shrink: 0; }
        .webmail-title { margin: 0; color: var(--text-primary); font-size: 32px; font-weight: 500; line-height: 36px; letter-spacing: -.02em; }
        .webmail-subtitle { margin: 6px 0 0; color: var(--text-tertiary); font-size: 14px; }
        .webmail-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .webmail-btn { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border-radius: 8px; font: 600 12px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .webmail-btn:disabled { opacity: .55; cursor: not-allowed; }
        .webmail-btn-muted { border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-secondary); }
        .webmail-btn-muted:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
        .webmail-btn-primary { border: 1px solid #3B82F6; background: #3B82F6; color: #fff; font-weight: 700; }
        .webmail-btn-primary:hover { background: #6366F1; border-color: #6366F1; }
        .webmail-error { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 8px; border: 1px solid rgba(244,63,94,0.2); background: rgba(244,63,94,0.1); color: #FB7185; }
        .webmail-main { display: flex; flex: 1; min-height: 0; gap: 24px; overflow: hidden; }
        .webmail-list { flex: 1; min-width: 300px; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); transition: max-width .2s; }
        .webmail-list-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-secondary); background: var(--bg-secondary); }
        .webmail-list-tabs { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .webmail-reader { flex: 2; min-width: 0; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        .webmail-modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(0,0,0,.6); }
        .webmail-modal { width: min(600px, 100%); overflow: hidden; border-radius: 24px; border: 1px solid var(--border-primary); background: var(--bg-card); }
        @media (max-width: 1000px) {
          .webmail-root { height: auto; }
          .webmail-main { flex-direction: column; overflow: visible; }
          .webmail-list { width: 100%; max-width: 100% !important; min-height: 480px; }
          .webmail-reader { width: 100%; min-height: 600px; }
        }
        @media (max-width: 640px) {
          .webmail-title { font-size: 28px; line-height: 34px; }
          .webmail-header-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
          .webmail-btn-primary { grid-column: 1 / -1; }
          .webmail-list-toolbar { align-items: stretch; flex-direction: column; }
          .webmail-list-tabs { display: grid; grid-template-columns: 1fr 1fr; }
          .webmail-list-tabs button { justify-content: center !important; }
          .webmail-modal-overlay { padding: 12px; }
        }
      `}</style>
    </div>
  );
}
