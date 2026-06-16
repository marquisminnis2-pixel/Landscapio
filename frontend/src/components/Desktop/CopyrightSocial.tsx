import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiFetch } from '@/lib/api';
import { getActiveClientId } from '@/lib/activeClient';

interface Message { role: 'user' | 'assistant'; content: string; }
interface ClientInfo {
  businessName: string; city: string; state: string; industry: string;
  brandVoice: string; keywords: string; services: string; promo: string;
  bookingLink: string; phone: string; postsPerWeek: string; visualIndustry: boolean;
}

const STORAGE_KEY = 'landscapio_copyrighters_clients';
const BLANK_CLIENT: ClientInfo = {
  businessName: '', city: '', state: '', industry: 'Roofing',
  brandVoice: 'friendly and professional', keywords: '', services: '', promo: '',
  bookingLink: '', phone: '', postsPerWeek: '3', visualIndustry: true,
};

function getSavedClients(): Record<string, ClientInfo> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function buildClientSummary(info: ClientInfo): string {
  return [
    `**Business Name:** ${info.businessName || '[Not provided]'}`,
    `**Location:** ${info.city || '[City]'}, ${info.state || '[State]'}`,
    `**Industry / Service Type:** ${info.industry || 'Roofing'}`,
    `**Brand Voice:** ${info.brandVoice}`,
    `**Local SEO Keywords:** ${info.keywords || '[Not provided]'}`,
    `**Core Services:** ${info.services || '[Not provided]'}`,
    `**Current Promo / Offer:** ${info.promo || 'None'}`,
    `**Booking Link:** ${info.bookingLink || '[Insert Link]'}`,
    `**Phone Number:** ${info.phone || '[Insert Phone Number]'}`,
    `**Posts Per Week:** ${info.postsPerWeek}`,
    `**Post Type for Transformations:** ${info.visualIndustry ? 'Before & After' : 'Case Study / Results Showcase'}`,
  ].join('\n');
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/^\d+\. (.+)$/gm, "<div class='md-li'>$1</div>")
    .replace(/^- (.+)$/gm, "<div class='md-li'>• $1</div>")
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)/, '<p>$1')
    .replace(/(.+)$/, '$1</p>');
}

const QUICK_PROMPTS = [
  { label: 'Regenerate — Urgent Tone', prompt: 'Regenerate all posts with a more urgent tone focused on storm damage repair' },
  { label: 'Only Testimonial Posts', prompt: 'Give me only the testimonial posts for this week about satisfied roofing customers' },
  { label: 'Promo Post Only', prompt: 'Create a promotional post for this week featuring a free roof inspection offer' },
  { label: 'Shorter & Punchier', prompt: 'Rewrite the last post to be shorter and punchier' },
  { label: 'Add More Keywords', prompt: 'Add more local SEO keywords about roofing services to the last response' },
  { label: 'Generate Hashtags', prompt: 'Generate 15 local SEO hashtags for this roofing client grouped into: location hashtags, service hashtags, and roofing niche hashtags.' },
];

const CopyrightSocial = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [client, setClient] = useState<ClientInfo>({ ...BLANK_CLIENT });
  const [savedClients, setSavedClients] = useState<Record<string, ClientInfo>>(getSavedClients());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [saveBtnLabel, setSaveBtnLabel] = useState('+ Save Client');
  const [platform, setPlatform] = useState('Instagram');
  const [airtableStatus, setAirtableStatus] = useState<'idle' | 'logging' | 'logged' | 'failed'>('idle');
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Message[]>([]);

  useEffect(() => { historyRef.current = messages; }, [messages]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const setField = (key: keyof ClientInfo, val: string | boolean) => setClient((c) => ({ ...c, [key]: val }));

  const streamResponse = useCallback(async (history: Message[]) => {
    setIsStreaming(true);
    let fullText = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/ai/posts/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history }),
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
            if (data.text) { fullText += data.text; setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u; }); }
          } catch { /* partial */ }
        }
      }
    } catch (err: unknown) {
      fullText = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u; });
    } finally {
      setIsStreaming(false);
      historyRef.current = [...history, { role: 'assistant', content: fullText }];
      setMessages(historyRef.current);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newHistory = [...historyRef.current, userMsg];
    setMessages(newHistory);
    await streamResponse(newHistory);
  }, [isStreaming, streamResponse]);

  const generatePosts = async () => {
    if (!client.businessName || !client.city) { alert('Please fill in at least Business Name and City.'); return; }
    const prompt = `Here is my roofing client's information:\n\n${buildClientSummary(client)}\n\nPlatform: ${platform}\n\nPlease generate ${client.postsPerWeek} social media posts for ${platform}, optimized for that platform's format, tone, and best practices. Make them copy-paste ready for a roofing company.`;
    await sendMessage(prompt);
  };

  const saveClient = () => {
    if (!client.businessName) { alert('Please enter a Business Name before saving.'); return; }
    const updated = { ...getSavedClients(), [client.businessName]: client };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedClients(updated);
    setSaveBtnLabel('Saved!');
    setTimeout(() => setSaveBtnLabel('+ Save Client'), 1800);
  };

  const loadSavedClient = (name: string) => {
    const clients = getSavedClients();
    if (clients[name]) setClient(clients[name]);
  };

  const deleteSavedClient = (name: string) => {
    const updated = { ...getSavedClients() };
    delete updated[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedClients(updated);
  };

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.length > 50);

  const logToAirtable = async () => {
    if (!lastAssistantMsg) return;
    const clientId = getActiveClientId();
    if (!clientId) {
      setAirtableStatus('failed');
      setTimeout(() => setAirtableStatus('idle'), 4000);
      return;
    }
    setAirtableStatus('logging');
    try {
      const res = await apiFetch(`${API_BASE}/api/airtable/log-social-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          postCaption: lastAssistantMsg.content,
          primaryKeyword: client.keywords?.split(',')[0]?.trim() || undefined,
          notes: `Platform: ${platform} • Business: ${client.businessName || 'Unknown'}`,
          copyStatus: 'Created',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAirtableStatus('logged');
      } else {
        setAirtableStatus('failed');
      }
    } catch (err) {
      console.error('Failed to log to Airtable:', err);
      setAirtableStatus('failed');
    } finally {
      setTimeout(() => setAirtableStatus('idle'), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1a0d', color: '#f0f4ee' }}>
      <style>{`
        .sidebar-scrollable::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollable::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollable::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.3); border-radius: 2px; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .form-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid #2d5016; border-radius: 6px; color: #f0f4ee; padding: 7px 10px; font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; }
        .form-input:focus { border-color: rgba(74,124,47,0.5); }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: #4a7c2f; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .section-label { font-size: 10px; font-weight: 700; color: #4a7c2f; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px; }
        .quick-btn { width: 100%; text-align: left; background: rgba(255,255,255,0.03); border: 1px solid #2d5016; border-radius: 7px; color: #9ab897; padding: 7px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .quick-btn:hover { background: rgba(74,124,47,0.12); border-color: rgba(74,124,47,0.3); color: #f0f4ee; }
        .msg-content h1,.msg-content h2,.msg-content h3 { color: #f0f4ee; margin: 12px 0 6px; }
        .msg-content p { margin: 6px 0; line-height: 1.7; color: #f0f4ee; }
        .msg-content strong { color: #9ab897; }
        .msg-content hr { border: none; border-top: 1px solid #2d5016; margin: 12px 0; }
        .msg-content .md-li { padding: 2px 0 2px 8px; line-height: 1.6; color: #f0f4ee; }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: rgba(74,124,47,0.5); animation: typingBounce 1.2s ease-in-out infinite; }
        @keyframes typingBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        select.form-input option { background: #111f11; color: #f0f4ee; }
        .saved-client { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid #2d5016; border-radius: 7px; padding: 6px 10px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .saved-client:hover { background: rgba(74,124,47,0.1); border-color: rgba(74,124,47,0.3); }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 320 : 0, minWidth: sidebarOpen ? 320 : 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.25s, min-width 0.25s', flexShrink: 0, padding: sidebarOpen ? 10 : 0, background: '#0d1a0d' }}>
        <div className="sidebar-scrollable" style={{ flex: 1, overflowY: 'auto', background: '#0d1a0d', border: '8px solid #111f11', borderRadius: 30, padding: sidebarOpen ? '0 0 24px' : 0, boxShadow: '0 0 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #2d5016', position: 'sticky', top: 0, background: '#0d1a0d', zIndex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f0f4ee' }}>Copyright Social</span>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#4a7c2f', cursor: 'pointer', fontSize: 18 }}>&#8249;</button>
          </div>

          <div style={{ padding: '16px 14px 0' }}>
            {/* Saved Clients */}
            {Object.keys(savedClients).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="section-label">Saved Clients</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.keys(savedClients).map((name) => (
                    <div key={name} className="saved-client">
                      <span onClick={() => loadSavedClient(name)} style={{ color: '#9ab897', flex: 1 }}>{name}</span>
                      <button onClick={() => deleteSavedClient(name)} style={{ background: 'none', border: 'none', color: '#4a7c2f', cursor: 'pointer', fontSize: 14 }}>x</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <p className="section-label">Platform</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)'].map((p) => (
                  <button key={p} onClick={() => setPlatform(p)} style={{ padding: '6px 12px', background: platform === p ? 'rgba(74,124,47,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${platform === p ? 'rgba(74,124,47,0.4)' : '#2d5016'}`, borderRadius: 7, color: platform === p ? '#9ab897' : '#4a7c2f', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <p className="section-label">Client Info</p>

            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Business Name</label>
              <input className="form-input" placeholder="e.g. Summit Roofing" value={client.businessName} onChange={(e) => setField('businessName', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><label className="form-label">City</label><input className="form-input" placeholder="e.g. Dallas" value={client.city} onChange={(e) => setField('city', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label className="form-label">State</label><input className="form-input" placeholder="e.g. Texas" value={client.state} onChange={(e) => setField('state', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Brand Voice</label>
              <input className="form-input" placeholder="e.g. friendly and professional" value={client.brandVoice} onChange={(e) => setField('brandVoice', e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Local SEO Keywords</label>
              <input className="form-input" placeholder="e.g. roof repair Dallas, storm damage roofer" value={client.keywords} onChange={(e) => setField('keywords', e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Core Services</label>
              <input className="form-input" placeholder="e.g. Roof replacement, gutter install, leak repair" value={client.services} onChange={(e) => setField('services', e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Current Promo</label>
              <input className="form-input" placeholder="e.g. Free roof inspection this month" value={client.promo} onChange={(e) => setField('promo', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><label className="form-label">Booking Link</label><input className="form-input" placeholder="URL" value={client.bookingLink} onChange={(e) => setField('bookingLink', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label className="form-label">Phone</label><input className="form-input" placeholder="(555) 123-4567" value={client.phone} onChange={(e) => setField('phone', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Posts Per Week</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['3', '5'].map((n) => (
                  <button key={n} onClick={() => setField('postsPerWeek', n)} style={{ flex: 1, padding: '7px 0', background: client.postsPerWeek === n ? 'rgba(74,124,47,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${client.postsPerWeek === n ? 'rgba(74,124,47,0.4)' : '#2d5016'}`, borderRadius: 7, color: client.postsPerWeek === n ? '#9ab897' : '#4a7c2f', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {n}/week
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={generatePosts} disabled={isStreaming} style={{ flex: 1, background: 'linear-gradient(135deg, #9ab897, #6b8f3e)', border: 'none', borderRadius: 8, color: '#0d1a0d', padding: '10px', fontSize: 13, fontWeight: 700, cursor: isStreaming ? 'not-allowed' : 'pointer', opacity: isStreaming ? 0.6 : 1, fontFamily: 'inherit' }}>
                Generate Posts
              </button>
              <button onClick={saveClient} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2d5016', borderRadius: 8, color: '#9ab897', padding: '10px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {saveBtnLabel}
              </button>
            </div>

            <div style={{ borderTop: '1px solid #2d5016', paddingTop: 12 }}>
              <p className="section-label">Quick Prompts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QUICK_PROMPTS.map((qp) => <button key={qp.label} className="quick-btn" onClick={() => sendMessage(qp.prompt)}>{qp.label}</button>)}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1a0d', minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: '1px solid #2d5016', background: '#0d1a0d', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#4a7c2f', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>&#9776;</button>}
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#4a7c2f', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>&larr; Dashboard</button>
            <span style={{ color: '#2d5016' }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#f0f4ee' }}>Copyright Social — Roofing Content Calendar</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {lastAssistantMsg && (
              <button
                onClick={logToAirtable}
                disabled={airtableStatus === 'logging'}
                style={{
                  background: airtableStatus === 'logged' ? 'rgba(107,143,62,0.15)' : airtableStatus === 'failed' ? 'rgba(248,113,113,0.15)' : 'rgba(74,124,47,0.12)',
                  border: `1px solid ${airtableStatus === 'logged' ? 'rgba(107,143,62,0.4)' : airtableStatus === 'failed' ? 'rgba(248,113,113,0.4)' : 'rgba(74,124,47,0.3)'}`,
                  borderRadius: 7,
                  color: airtableStatus === 'logged' ? '#6b8f3e' : airtableStatus === 'failed' ? '#f87171' : '#9ab897',
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: airtableStatus === 'logging' ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: airtableStatus === 'logging' ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {airtableStatus === 'logging' ? 'Logging...' : airtableStatus === 'logged' ? 'Logged ✓' : airtableStatus === 'failed' ? 'Failed' : 'Log to Airtable'}
              </button>
            )}
            <button onClick={() => { setMessages([]); historyRef.current = []; setInput(''); setAirtableStatus('idle'); }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2d5016', borderRadius: 7, color: '#9ab897', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>New Chat</button>
          </div>
        </header>

        <div ref={chatRef} className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 24px' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f4ee', margin: '0 0 10px' }}>Copyright Social</h1>
              <p style={{ fontSize: 14, color: '#4a7c2f', maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
                Weekly social media content calendars for roofing clients. Fill in client info and click <strong style={{ color: '#9ab897' }}>Generate Posts</strong>.
              </p>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.role === 'user' ? 'rgba(45,80,22,0.3)' : 'rgba(74,124,47,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {msg.role === 'user' ? 'U' : 'R'}
                  </div>
                  <div style={{ maxWidth: '85%', background: msg.role === 'user' ? 'rgba(45,80,22,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${msg.role === 'user' ? 'rgba(45,80,22,0.25)' : '#2d5016'}`, borderRadius: 12, padding: '12px 16px' }}>
                    {msg.role === 'user' ? (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#f0f4ee', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    ) : msg.content === '' ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                        {[0, 0.2, 0.4].map((d, j) => <span key={j} className="typing-dot" style={{ animationDelay: `${d}s` }} />)}
                      </div>
                    ) : (
                      <div className="msg-content" style={{ fontSize: 13, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #2d5016', background: '#0d1a0d', flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder="Ask for post variations, tone changes, hashtags..." rows={1} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #2d5016', borderRadius: 10, color: '#f0f4ee', padding: '10px 14px', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 140, fontFamily: 'inherit' }} />
            <button onClick={() => sendMessage(input)} disabled={isStreaming || !input.trim()} style={{ width: 40, height: 40, background: isStreaming || !input.trim() ? 'rgba(74,124,47,0.2)' : 'rgba(74,124,47,0.8)', border: 'none', borderRadius: 10, cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} width={16} height={16}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#4a7c2f', marginTop: 8, marginBottom: 0 }}>Powered by Claude Opus — roofing social media calendars</p>
        </div>
      </main>
    </div>
  );
};

export default CopyrightSocial;
