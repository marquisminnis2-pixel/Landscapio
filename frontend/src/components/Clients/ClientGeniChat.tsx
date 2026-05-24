import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '@/lib/api';
import config from '@/config';

interface Client {
  _id: string;
  businessName: string;
  industry: string;
  websiteUrl?: string;
  brandVoice?: string;
  targetAudience?: string;
  notes?: string;
}

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ClientGeniChatProps {
  client: Client;
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, `<h3 style="font-size:15px;font-weight:700;margin:12px 0 4px;color:${config.borderGlow};">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-size:17px;font-weight:700;margin:14px 0 6px;color:${config.borderGlow};">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-size:19px;font-weight:700;margin:16px 0 8px;color:${config.borderGlow};">$1</h1>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;margin:2px 0;">&#8226; $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:12px;margin:2px 0;">$1</div>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
    .replace(/\n/g, '<br>');
  return `<p style="margin:0;">${html}</p>`;
}

const ClientLumaChat = ({ client }: ClientGeniChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const token = localStorage.getItem('token');
  const orgId = localStorage.getItem('orgId');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Load conversation history when client changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessages([]);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/orgs/${orgId}/clients/${client._id}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load conversations');
        const data = await res.json();
        if (!cancelled) {
          setMessages(Array.isArray(data) ? data : data.messages || []);
        }
      } catch {
        if (!cancelled) setError('Failed to load conversation history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [client._id, orgId, token]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      await fetch(`${API_BASE}/api/orgs/${orgId}/clients/${client._id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, content }),
      });
    } catch { /* silent */ }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    setError(null);

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Save user message to DB
    await saveMessage('user', text);

    // Stream AI response
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    let fullText = '';

    try {
      const res = await fetch(`${API_BASE}/api/orgs/${orgId}/clients/${client._id}/geni/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.text) {
              fullText += data.text;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: 'assistant', content: fullText };
                return u;
              });
            }
          } catch { /* partial SSE chunk */ }
        }
      }
      // Save assistant response to DB
      if (fullText) {
        await saveMessage('assistant', fullText);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      // Remove empty assistant message on error
      if (!fullText) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch(`${API_BASE}/api/orgs/${orgId}/clients/${client._id}/conversations`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* silent */ }
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{`
        @keyframes cgc-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .cgc-scrollbar::-webkit-scrollbar { width: 4px; }
        .cgc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .cgc-scrollbar::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.15); border-radius: 4px; }
        .cgc-input:focus {
          border-color: rgba(74,124,47,0.5) !important;
          box-shadow: 0 0 12px rgba(74,124,47,0.08);
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Chat header */}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid rgba(74,124,47,0.08)`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.borderGlow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
              color: config.borderGlow,
              textShadow: `0 0 8px rgba(74,124,47,0.3)`,
            }}>
              LUMA CHAT
            </span>
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.35)',
            }}>
              for {client.businessName}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              style={{
                padding: '5px 10px',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              CLEAR CHAT
            </button>
          )}
        </div>

        {/* Messages area */}
        <div
          className="cgc-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: 0,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                {[0, 150, 300].map(delay => (
                  <div key={delay} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: config.borderGlow,
                    animation: `cgc-bounce 1s ease-in-out infinite`,
                    animationDelay: `${delay}ms`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: `rgba(74,124,47,0.06)`, border: `1px solid rgba(74,124,47,0.15)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={config.borderGlow}>
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Start chatting with {config.botName}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                {config.botName} knows about {client.businessName}'s profile.<br />
                Ask it to write content, plan strategies, or brainstorm ideas.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  ...(msg.role === 'user'
                    ? {
                        background: `linear-gradient(135deg, rgba(139,94,60,0.25), rgba(139,94,60,0.15))`,
                        border: `1px solid rgba(139,94,60,0.25)`,
                        color: 'rgba(255,255,255,0.9)',
                      }
                    : {
                        background: `rgba(74,124,47,0.06)`,
                        border: `1px solid rgba(74,124,47,0.12)`,
                        color: 'rgba(255,255,255,0.85)',
                      }
                  ),
                }}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }} />
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Streaming indicator */}
          {isStreaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                background: `rgba(74,124,47,0.06)`,
                border: `1px solid rgba(74,124,47,0.12)`,
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 150, 300].map(delay => (
                    <div key={delay} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: config.borderGlow,
                      animation: `cgc-bounce 1s ease-in-out infinite`,
                      animationDelay: `${delay}ms`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              fontSize: '12px',
              color: '#f87171',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '8px',
            }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: `1px solid rgba(74,124,47,0.08)`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              className="cgc-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${config.botName} about ${client.businessName}...`}
              disabled={isStreaming}
              rows={2}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                color: '#fff',
                background: `rgba(74,124,47,0.04)`,
                border: `1px solid rgba(74,124,47,0.12)`,
                borderRadius: '10px',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                caretColor: config.borderGlow,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: !input.trim() || isStreaming
                  ? `rgba(74,124,47,0.15)`
                  : `linear-gradient(135deg, ${config.secondaryColor}, ${config.primaryColor})`,
                cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: input.trim() && !isStreaming ? `0 0 15px rgba(74,124,47,0.25)` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={!input.trim() || isStreaming ? 'rgba(74,124,47,0.4)' : '#f0f4ee'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientLumaChat;
