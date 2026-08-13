'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Hash, Lock, MessageSquare, Send, Loader2, WifiOff, RefreshCw, User, Search, Users } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface Channel { id: string; name: string; is_channel: boolean; is_group: boolean; is_im: boolean; is_mpim: boolean; is_member: boolean; topic: string; purpose: string; num_members: number; avatar?: string; user?: string; }
interface Message { ts: string; text: string; user: string; userName: string; userAvatar: string; subtype: string | null; thread_ts: string | null; reply_count: number; reactions: { name: string; count: number }[]; files: { name: string; url: string }[]; edited: boolean; bot_id: string | null; botName: string | null; }

function formatSlackText(text: string): string {
  // Convert Slack mentions like <@U123> to @name (simplified)
  let formatted = text.replace(/<@(\w+)>/g, '@user');
  // Convert links
  formatted = formatted.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2');
  formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, '$1');
  // Bold, italic, code
  formatted = formatted.replace(/\*([^*]+)\*/g, '<b>$1</b>');
  formatted = formatted.replace(/_([^_]+)_/g, '<i>$1</i>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  return formatted;
}

function timeFormat(ts: string) {
  const date = new Date(parseFloat(ts) * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `Ontem ${time}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

export default function SlackPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [searchCh, setSearchCh] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef = useRef<Record<string, string>>({});
  const notifPermRef = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        notifPermRef.current = true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => { notifPermRef.current = p === 'granted'; });
      }
    }
  }, []);

  // Show desktop notification
  const showNotification = (channelName: string, sender: string, text: string, channelId: string) => {
    if (!notifPermRef.current) return;
    try {
      const n = new Notification(`#${channelName}`, {
        body: `${sender}: ${text.slice(0, 100)}`,
        icon: '/favicon.ico',
        tag: `slack-${channelId}`,
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        const ch = channels.find(c => c.id === channelId);
        if (ch) setActiveChannel(ch);
        n.close();
      };
      setTimeout(() => n.close(), 8000);
    } catch { /* notification not supported */ }
  };

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/slack/channels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const chs = data.channels || [];
      setChannels(chs);
      if (chs.length > 0 && !activeChannel) {
        // Pick default channel
        const defaultCh = chs.find((c: Channel) => c.id === 'C09SDGH8EBT') || chs[0];
        setActiveChannel(defaultCh);
      }
      setError(null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [activeChannel]);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async (channelId: string, silent = false) => {
    try {
      setLoadingMsgs(true);
      const res = await fetch(`/api/slack/messages?channel=${channelId}&limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) { if (!silent) setError(String(e)); }
    finally { setLoadingMsgs(false); }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChannel || sending) return;
    try {
      setSending(true);
      const res = await fetch('/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: activeChannel.id, text: newMsg.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao enviar');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro');
      setNewMsg('');
      // Refresh messages
      await fetchMessages(activeChannel.id, true);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { alert(String(e)); }
    finally { setSending(false); }
  };

  useEffect(() => {
    // This effect synchronizes the channel list with Slack on mount/account changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchChannels();
  }, [fetchChannels]);

  // Load messages when channel changes + poll active channel
  useEffect(() => {
    if (!activeChannel) return;
    // This effect synchronizes the selected channel with its remote message stream.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessages(activeChannel.id);
    // Mark current latest as seen
    if (messages.length > 0) {
      lastSeenRef.current[activeChannel.id] = messages[messages.length - 1].ts;
    }
    // Poll active channel every 10 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(activeChannel.id, true), 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChannel, fetchMessages]);

  // Background poll ALL channels for notifications (every 20s)
  useEffect(() => {
    if (channels.length === 0) return;
    // Initialize lastSeen for all channels
    const initCheck = async () => {
      const memberChannels = channels.filter(c => c.is_member || c.is_im);
      for (const ch of memberChannels.slice(0, 10)) {
        if (!lastSeenRef.current[ch.id]) {
          try {
            const res = await fetch(`/api/slack/messages?channel=${ch.id}&limit=1`);
            if (res.ok) {
              const data = await res.json();
              const msgs = data.messages || [];
              if (msgs.length > 0) lastSeenRef.current[ch.id] = msgs[msgs.length - 1].ts;
            }
          } catch { /* skip */ }
        }
      }
    };
    initCheck();

    bgPollRef.current = setInterval(async () => {
      const memberChannels = channels.filter(c => c.is_member || c.is_im);
      for (const ch of memberChannels.slice(0, 10)) {
        try {
          const res = await fetch(`/api/slack/messages?channel=${ch.id}&limit=3`);
          if (!res.ok) continue;
          const data = await res.json();
          const msgs: Message[] = data.messages || [];
          if (msgs.length === 0) continue;
          const latest = msgs[msgs.length - 1];
          const lastSeen = lastSeenRef.current[ch.id];
          if (lastSeen && parseFloat(latest.ts) > parseFloat(lastSeen)) {
            // New message! Show notification
            const newMsgs = msgs.filter(m => parseFloat(m.ts) > parseFloat(lastSeen) && !m.bot_id);
            for (const nm of newMsgs) {
              showNotification(ch.name, nm.userName || 'Alguém', nm.text, ch.id);
            }
          }
          lastSeenRef.current[ch.id] = latest.ts;
        } catch { /* skip */ }
      }
    }, 20000);

    return () => { if (bgPollRef.current) clearInterval(bgPollRef.current); };
  }, [channels]);

  // Auto-scroll + update lastSeen for active channel
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (activeChannel && messages.length > 0) {
      lastSeenRef.current[activeChannel.id] = messages[messages.length - 1].ts;
    }
  }, [messages]);

  const filteredChannels = channels.filter(c => !searchCh || c.name.toLowerCase().includes(searchCh.toLowerCase()));
  const channelGroups = {
    channels: filteredChannels.filter(c => c.is_channel || c.is_group),
    dms: filteredChannels.filter(c => c.is_im || c.is_mpim),
  };



  if (loading && channels.length === 0) return <div className="flex h-[60vh] flex-col items-center justify-center gap-4 rounded-[24px] border" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}><Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-rose)' }} /><p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Conectando ao Slack...</p></div>;

  if (error && channels.length === 0) return <div className="flex items-center justify-center h-[60vh]"><div className="w-full max-w-md space-y-5 rounded-[24px] border p-8 text-center" style={{ background: 'var(--bg-card-solid)', borderColor: 'var(--border-primary)' }}><WifiOff size={28} style={{ color: 'var(--accent-rose-soft)', margin: '0 auto' }} /><p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Erro ao conectar</p><p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{error}</p><button onClick={() => fetchChannels()} style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent-rose)', color: 'var(--text-inverse)', border: '1px solid var(--accent-rose)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Tentar novamente</button></div></div>;

  return (
    <div className="slack-page">
      <header className="slack-page-header">
        <div>
          <h1>Slack</h1>
          <p>Acompanhe canais e converse com o time sem sair do painel.</p>
        </div>
        <span className="slack-connection"><span /> Conectado</span>
      </header>

      <div className="slack-shell">
      {/* Sidebar - Channels */}
      <aside className="slack-channels" style={{ background: 'var(--bg-secondary)' }}>
        {/* Slack Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-rose-light)', border: '1px solid var(--border-primary)' }}>
              <MessageSquare size={16} style={{ color: 'var(--accent-rose)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Slack</p>
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>{channels.length} canais</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', height: '32px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}>
            <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" value={searchCh} onChange={e => setSearchCh(e.target.value)} aria-label="Buscar canal" placeholder="Buscar canal..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '11px' }} />
          </div>
        </div>

        {/* Channel list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {channelGroups.channels.length > 0 && (
            <>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', padding: '8px 8px 4px', margin: 0 }}>Canais</p>
              {channelGroups.channels.map(ch => (
                <button key={ch.id} onClick={() => setActiveChannel(ch)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeChannel?.id === ch.id ? 'var(--accent-rose-light)' : 'transparent', color: activeChannel?.id === ch.id ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                  {ch.is_group ? <Lock size={13} /> : <Hash size={13} />}
                  <span style={{ fontSize: 12, fontWeight: activeChannel?.id === ch.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                </button>
              ))}
            </>
          )}
          {channelGroups.dms.length > 0 && (
            <>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', padding: '12px 8px 4px', margin: 0 }}>Mensagens Diretas</p>
              {channelGroups.dms.map(ch => (
                <button key={ch.id} onClick={() => setActiveChannel(ch)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeChannel?.id === ch.id ? 'var(--accent-rose-light)' : 'transparent', color: activeChannel?.id === ch.id ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                  {ch.avatar ? <img src={ch.avatar} alt="" style={{ width: 18, height: 18, borderRadius: 5 }} /> : <User size={13} />}
                  <span style={{ fontSize: 12, fontWeight: activeChannel?.id === ch.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Main - Messages */}
      <main className="slack-conversation">
        {/* Channel header */}
        {activeChannel && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeChannel.is_im ? <User size={16} style={{ color: 'var(--text-tertiary)' }} /> : activeChannel.is_group ? <Lock size={16} style={{ color: 'var(--text-tertiary)' }} /> : <Hash size={16} style={{ color: 'var(--text-tertiary)' }} />}
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{activeChannel.name}</p>
                {activeChannel.topic && <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '1px 0 0', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChannel.topic}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeChannel.num_members > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {activeChannel.num_members}</span>}
              <button onClick={() => fetchMessages(activeChannel.id)} aria-label={`Atualizar mensagens de ${activeChannel.name}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', position: 'relative' }}>
          {/* Subtle loading bar */}
          {loadingMsgs && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', zIndex: 10, overflow: 'hidden', borderRadius: '1px', background: 'var(--accent-rose)', animation: 'slackLoad 1s ease-in-out infinite' }}>
              <style>{`@keyframes slackLoad { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }`}</style>
            </div>
          )}
          {messages.length === 0 && !loadingMsgs ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
              <MessageSquare size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>Nenhuma mensagem</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {messages.map((msg, i) => {
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const sameUser = prevMsg && prevMsg.user === msg.user;
                const timeDiff = prevMsg ? (parseFloat(msg.ts) - parseFloat(prevMsg.ts)) * 1000 : Infinity;
                const showHeader = !sameUser || timeDiff > 5 * 60 * 1000; // 5 min gap

                if (msg.subtype === 'channel_join' || msg.subtype === 'channel_leave') {
                  return <div key={msg.ts} style={{ textAlign: 'center', padding: '4px 0', fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{msg.text}</div>;
                }

                return (
                  <div key={msg.ts} style={{ padding: showHeader ? '10px 12px 4px' : '2px 12px 2px 52px', borderRadius: '8px', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {showHeader && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {msg.userAvatar ? <img src={msg.userAvatar} alt="" style={{ width: 32, height: 32, borderRadius: 8 }} /> : (
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-inverse)', flexShrink: 0 }}>
                            {(msg.userName || msg.botName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.bot_id ? (msg.botName || 'Bot') : msg.userName}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{timeFormat(msg.ts)}</span>
                          {msg.edited && <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>(editado)</span>}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatSlackText(msg.text)) }} />
                    {msg.reactions.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {msg.reactions.map((r, j) => (
                          <span key={j} style={{ fontSize: 11, padding: '2px 6px', borderRadius: '99px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', color: 'var(--text-tertiary)' }}>:{r.name}: {r.count}</span>
                        ))}
                      </div>
                    )}
                    {msg.reply_count > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '4px', cursor: 'pointer' }}>{msg.reply_count} {msg.reply_count === 1 ? 'resposta' : 'respostas'}</div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        {activeChannel && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-secondary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', height: '44px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  aria-label={`Mensagem para ${activeChannel.name}`}
                  placeholder={`Mensagem para #${activeChannel.name}...`}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              <button onClick={sendMessage} disabled={sending || !newMsg.trim()} aria-label="Enviar mensagem" style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: newMsg.trim() ? 'var(--accent-rose)' : 'var(--bg-secondary)', border: '1px solid ' + (newMsg.trim() ? 'var(--accent-rose)' : 'var(--border-primary)'), color: newMsg.trim() ? 'var(--text-inverse)' : 'var(--text-tertiary)', cursor: newMsg.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: '6px', paddingLeft: '4px' }}>
              Enter para enviar • Mensagens enviadas como bot • Auto-refresh a cada 15s
            </p>
          </div>
        )}
      </main>
      </div>

      <style jsx>{`
        .slack-page {
          display: flex;
          min-height: 0;
          flex-direction: column;
          gap: 24px;
        }

        .slack-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
        }

        .slack-page-header h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.02em;
        }

        .slack-page-header p {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 24px;
        }

        .slack-connection {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card-solid);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
        }

        .slack-connection span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-emerald);
        }

        .slack-shell {
          display: flex;
          height: calc(100vh - 220px);
          min-height: 560px;
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card-solid);
        }

        .slack-channels {
          display: flex;
          width: 280px;
          flex-shrink: 0;
          flex-direction: column;
          border-right: 1px solid var(--border-primary);
        }

        .slack-conversation {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        @media (max-width: 900px) {
          .slack-shell {
            height: auto;
            min-height: 760px;
            flex-direction: column;
          }

          .slack-channels {
            width: 100%;
            max-height: 280px;
            border-right: 0;
            border-bottom: 1px solid var(--border-primary);
          }

          .slack-conversation {
            min-height: 480px;
          }
        }

        @media (max-width: 640px) {
          .slack-page-header {
            flex-direction: column;
            gap: 12px;
          }

          .slack-shell {
            min-height: 680px;
            border-radius: 20px;
          }
        }
      `}</style>
    </div>
  );
}
