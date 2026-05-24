import { useState, useRef, useEffect } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { API_BASE } from '@/lib/api';
import config from '@/config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Palette {
  name: string;
  colors: [string, string, string];
  labels: [string, string, string];
}

const PALETTES: Palette[] = [
  { name: 'Natural & Earthy',    colors: ['#228B22', '#8B4513', '#FFD700'], labels: ['Forest Green', 'Bark Brown',    'Sunflower Yellow'] },
  { name: 'Fresh & Clean',       colors: ['#7CFC00', '#87CEEB', '#FFFDD0'], labels: ['Grass Green',  'Sky Blue',      'Cream White']       },
  { name: 'Bold & Professional', colors: ['#355E3B', '#36454F', '#32CD32'], labels: ['Hunter Green', 'Charcoal',      'Lime Green']        },
  { name: 'Warm & Inviting',     colors: ['#808000', '#E2725B', '#F5DEB3'], labels: ['Olive Green',  'Terracotta',    'Sandy Beige']       },
  { name: 'Modern Outdoor',      colors: ['#013220', '#708090', '#DAA520'], labels: ['Deep Green',   'Slate Gray',    'Goldenrod']         },
  { name: 'Clean & Trustworthy', colors: ['#87CEEB', '#FFFFFF', '#D3D3D3'], labels: ['Sky Blue',     'Crisp White',   'Soft Gray']         },
  { name: 'Fresh & Bright',      colors: ['#00FFFF', '#FFFFFF', '#FFF44F'], labels: ['Aqua',         'White',         'Lemon Yellow']      },
  { name: 'Calm & Professional', colors: ['#B0E0E6', '#98FF98', '#D3D3D3'], labels: ['Powder Blue',  'Mint Green',    'Light Gray']        },
  { name: 'Bold & Reliable',     colors: ['#4169E1', '#FFFFFF', '#000080'], labels: ['Royal Blue',   'White',         'Navy']              },
  { name: 'Soft & Friendly',     colors: ['#E6E6FA', '#FFFFFF', '#AFEEEE'], labels: ['Lavender',     'White',         'Pale Teal']         },
];

const STORAGE_KEY = 'luma_chat_history';

const LumaPanel = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPalettes, setShowPalettes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { pages, currentPageId, templateBasePath, setTemplatePageHtml } = useBuilderStore();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentHtml = async (): Promise<string | null> => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (currentPage?.rawHtml) return currentPage.rawHtml;
    if (templateBasePath && currentPage?.templateFile) {
      try {
        const res = await fetch(`${templateBasePath}${currentPage.templateFile}`);
        if (res.ok) return await res.text();
      } catch {}
    }
    return null;
  };

  const sendMessage = async (userMessage: string) => {
    if (isLoading) return;
    setError(null);
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const html = await getCurrentHtml();
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          message: userMessage,
          html: html || undefined,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const reply: string = data.response || '';
        const trimmed = reply.trim();
        const isHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.includes('<body');
        if (isHtml && currentPageId) {
          setTemplatePageHtml(currentPageId, reply);
          setMessages([...newMessages, { role: 'assistant', content: 'Done! The page has been updated.' }]);
        } else {
          setMessages([...newMessages, { role: 'assistant', content: reply || 'Sorry, I could not generate a response.' }]);
        }
      } else {
        setError(data.message || 'Failed to get response');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    const userMessage = message.trim();
    setMessage('');
    await sendMessage(userMessage);
  };

  const handlePaletteSelect = (palette: Palette) => {
    setShowPalettes(false);
    sendMessage(`Apply the "${palette.name}" color palette to this entire website.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      <style>{`
        @keyframes luma-letter-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(1deg); }
          50% { transform: translateY(-2px) rotate(-0.5deg); }
          75% { transform: translateY(-4px) rotate(0.5deg); }
        }
        @keyframes luma-pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes luma-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .luma-letter {
          animation: luma-letter-float ease-in-out infinite;
          display: inline-block;
        }
        .luma-title-text {
          background: linear-gradient(135deg, ${config.secondaryColor} 0%, ${config.borderGlow} 30%, ${config.primaryColor} 60%, ${config.borderGlow} 80%, ${config.secondaryColor} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: luma-shimmer 4s linear infinite;
        }
        .palette-card:hover {
          border-color: rgba(74,124,47,0.4) !important;
          background: rgba(45,80,22,0.15) !important;
        }
        .palette-swatch {
          transition: transform 0.15s;
        }
        .palette-card:hover .palette-swatch {
          transform: scale(1.1);
        }
      `}</style>

      <div className="flex flex-col h-full relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${config.backgroundColor} 0%, ${config.surfaceColor} 40%, ${config.backgroundColor} 100%)` }}>

        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full blur-[60px]" style={{ background: `radial-gradient(circle, rgba(45,80,22,0.25) 0%, transparent 70%)`, top: '-20px', left: '50%', transform: 'translateX(-50%)', animation: 'luma-pulse-glow 4s ease-in-out infinite' }} />
          <div className="absolute w-32 h-32 rounded-full blur-[40px]" style={{ background: `radial-gradient(circle, rgba(107,143,62,0.15) 0%, transparent 70%)`, bottom: '80px', right: '-10px', animation: 'luma-pulse-glow 5s ease-in-out infinite 1s' }} />
          <div className="absolute w-24 h-24 rounded-full blur-[30px]" style={{ background: `radial-gradient(circle, rgba(74,124,47,0.1) 0%, transparent 70%)`, bottom: '200px', left: '-5px', animation: 'luma-pulse-glow 6s ease-in-out infinite 2s' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(74,124,47,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(74,124,47,0.5) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
        </div>

        {/* Header */}
        <div className="relative z-10 flex-shrink-0 px-4 pt-5 pb-3" style={{ borderBottom: `1px solid rgba(74,124,47,0.2)` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${config.secondaryColor}, ${config.primaryColor})`, boxShadow: `0 0 12px rgba(45,80,22,0.4)` }}>
                {/* Leaf icon */}
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', 'Urbanist', -apple-system, sans-serif", letterSpacing: '-0.04em', fontWeight: 900 }}>
                <span className="luma-title-text">
                  {config.botName.split('').map((letter: string, i: number) => (
                    <span key={i} className="luma-letter" style={{ animationDelay: `${i * 0.12}s`, animationDuration: `${3 + i * 0.4}s` }}>
                      {letter}
                    </span>
                  ))}
                </span>
              </h2>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border" style={{ color: config.secondaryColor, borderColor: `rgba(107,143,62,0.3)`, background: `rgba(45,80,22,0.1)` }}>
                beta
              </span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: config.secondaryColor }} />
            </div>
            {hasMessages && (
              <button onClick={clearChat} className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-white/70" style={{ background: 'rgba(255,255,255,0.05)' }} title="Clear chat">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {!hasMessages && (
            <p className="text-xs mb-2" style={{ color: `rgba(107,143,62,0.6)` }}>
              Your AI-powered builder assistant
            </p>
          )}

          {/* Palette toggle button */}
          <button
            onClick={() => setShowPalettes(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: showPalettes ? `rgba(45,80,22,0.15)` : `rgba(45,80,22,0.07)`,
              border: `1px solid ${showPalettes ? 'rgba(107,143,62,0.4)' : 'rgba(107,143,62,0.15)'}`,
              color: showPalettes ? config.secondaryColor : `rgba(107,143,62,0.7)`,
            }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Color Palettes
            </span>
            <svg
              className="w-3 h-3 transition-transform"
              style={{ transform: showPalettes ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Palette selector panel */}
        {showPalettes && (
          <div className="relative z-10 flex-shrink-0 overflow-y-auto accent-scrollbar" style={{ maxHeight: '320px', borderBottom: `1px solid rgba(74,124,47,0.15)`, background: 'rgba(0,0,0,0.2)' }}>
            <div className="p-3">
              <p className="text-[10px] mb-2.5" style={{ color: `rgba(107,143,62,0.5)` }}>
                Click a palette to apply it site-wide
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    onClick={() => handlePaletteSelect(palette)}
                    disabled={isLoading}
                    className="palette-card text-left p-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: `rgba(45,80,22,0.05)`, border: `1px solid rgba(107,143,62,0.12)` }}
                  >
                    {/* Color swatches */}
                    <div className="flex items-center gap-1 mb-2">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="palette-swatch rounded-full flex-shrink-0"
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: color,
                            border: color === '#FFFFFF' || color === '#FFFDD0' || color === '#FFF44F' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                            boxShadow: `0 0 6px ${color}40`,
                          }}
                          title={`${palette.labels[i]}: ${color}`}
                        />
                      ))}
                    </div>
                    {/* Palette name */}
                    <p className="text-[10px] font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {palette.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-3 accent-scrollbar">
          {!hasMessages ? (
            <div className="text-center mt-4 px-2">
              <div className="space-y-2 mt-2">
                {[
                  { icon: '\u26A1', text: 'Add elements \u2014 buttons, text, images, sections' },
                  { icon: '\uD83C\uDFA8', text: 'Apply color palettes \u2014 click "Color Palettes" above' },
                  { icon: '\u270F\uFE0F', text: 'Edit content and page structure' },
                  { icon: '\uD83D\uDCAC', text: 'Answer design questions' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg text-left" style={{ background: `rgba(45,80,22,0.06)`, border: `1px solid rgba(107,143,62,0.1)` }}>
                    <span className="text-xs flex-shrink-0 mt-0.5">{item.icon}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-4 italic" style={{ color: `rgba(107,143,62,0.4)` }}>
                Try: "Apply Bold & Professional" or type a request
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[90%] px-3 py-2 rounded-xl text-xs"
                  style={msg.role === 'user'
                    ? { background: `linear-gradient(135deg, ${config.secondaryColor}, ${config.primaryColor})`, color: 'white' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: `1px solid rgba(107,143,62,0.1)` }
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(107,143,62,0.1)` }}>
                <div className="flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: config.secondaryColor, animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="relative z-10 p-3 flex-shrink-0" style={{ borderTop: `1px solid rgba(74,124,47,0.15)` }}>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what to build..."
              className="flex-1 px-3 py-2 rounded-lg text-xs resize-none focus:outline-none"
              style={{
                background: `rgba(45,80,22,0.06)`,
                border: `1px solid rgba(107,143,62,0.2)`,
                color: 'rgba(255,255,255,0.85)',
                caretColor: config.secondaryColor,
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(107,143,62,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(107,143,62,0.2)'}
              rows={2}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="p-2 rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${config.secondaryColor}, ${config.primaryColor})`, boxShadow: `0 0 10px rgba(45,80,22,0.3)` }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[9px] text-center mt-1.5" style={{ color: `rgba(107,143,62,0.3)` }}>Powered by Claude AI</p>
        </form>
      </div>
    </>
  );
};

export default LumaPanel;
