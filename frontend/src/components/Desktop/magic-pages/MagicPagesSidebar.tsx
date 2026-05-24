import { useState } from 'react';
import { useMagicPages, LinkEntry } from './context/MagicPagesContext';

interface Props { open: boolean; onClose: () => void; }

export const MagicPagesSidebar = ({ open, onClose }: Props) => {
  const { businessName, setBusinessName, primaryService, setPrimaryService, website, setWebsite, phone, setPhone, primaryKeyword, setPrimaryKeyword, secondaryKeywords, setSecondaryKeywords, internalLinks, setInternalLinks } = useMagicPages();
  const [pkInput, setPkInput] = useState('');
  const [skInput, setSkInput] = useState('');

  const addPrimary = () => { const t = pkInput.trim(); if (!t || primaryKeyword) return; setPrimaryKeyword(t); setPkInput(''); };
  const addSecondary = () => {
    const t = skInput.trim();
    if (!t || secondaryKeywords.includes(t) || secondaryKeywords.length >= 15) return;
    setSecondaryKeywords([...secondaryKeywords, t]);
    setSkInput('');
  };
  const removeSecondary = (kw: string) => setSecondaryKeywords(secondaryKeywords.filter(k => k !== kw));
  const clearAll = () => { if (window.confirm('Clear all keywords? This cannot be undone.')) { setPrimaryKeyword(''); setPkInput(''); setSecondaryKeywords([]); setSkInput(''); } };

  const addLink = () => { if (internalLinks.length >= 6) return; setInternalLinks([...internalLinks, { id: Date.now(), url: '', label: '' }]); };
  const removeLink = (id: number) => { if (internalLinks.length === 1) return; setInternalLinks(internalLinks.filter(l => l.id !== id)); };
  const updateLink = (id: number, field: keyof LinkEntry, value: string) => setInternalLinks(internalLinks.map(l => l.id === id ? { ...l, [field]: value } : l));

  const total = (primaryKeyword ? 1 : 0) + secondaryKeywords.length;
  const totalColor = total === 0 ? 'rgba(240,244,238,0.35)' : total <= 8 ? 'rgba(240,244,238,0.85)' : '#6b8f3e';

  return (
    <aside style={{ width: open ? 280 : 0, minWidth: open ? 280 : 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.25s, min-width 0.25s', flexShrink: 0, padding: open ? 10 : 0, background: '#111f11' }}>
      <style>{`
        .mps-scroll::-webkit-scrollbar { width: 4px; }
        .mps-scroll::-webkit-scrollbar-track { background: transparent; }
        .mps-scroll::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.2); border-radius: 2px; }
        .mps-fi { width: 100%; background: rgba(240,244,238,0.06); border: 1px solid rgba(240,244,238,0.1); border-radius: 8px; color: #f0f4ee; padding: 9px 14px; font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; }
        .mps-fi:focus { border-color: rgba(74,124,47,0.5); box-shadow: 0 0 0 3px rgba(74,124,47,0.1); }
        .mps-fl { display: block; font-size: 11px; font-weight: 600; color: rgba(240,244,238,0.45); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .mps-sl { font-size: 10px; font-weight: 700; color: rgba(240,244,238,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px; }
        .mps-ki { flex: 1; background: rgba(240,244,238,0.06); border: 1px solid rgba(240,244,238,0.1); border-radius: 8px; color: #f0f4ee; padding: 6px 12px; font-size: 12px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; min-width: 0; }
        .mps-ki:focus { border-color: rgba(74,124,47,0.5); }
        .mps-ki:disabled { opacity: 0.4; cursor: not-allowed; }
        .mps-ab { background: rgba(154,184,151,0.15); border: 1px solid rgba(154,184,151,0.3); border-radius: 6px; color: #9ab897; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
        .mps-ab:hover:not(:disabled) { background: rgba(154,184,151,0.25); }
        .mps-ab:disabled { opacity: 0.35; cursor: not-allowed; }
        .mps-chip-p { display: inline-flex; align-items: center; gap: 5px; background: rgba(154,184,151,0.2); border: 1px solid rgba(154,184,151,0.4); border-radius: 999px; padding: 4px 12px; font-size: 12px; color: #9ab897; cursor: default; margin: 2px; }
        .mps-chip-s { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 1px solid rgba(154,184,151,0.3); border-radius: 999px; padding: 3px 10px; font-size: 11px; color: rgba(154,184,151,0.75); margin: 3px; cursor: default; }
        .mps-cx { background: none; border: none; color: inherit; cursor: pointer; font-size: 13px; padding: 0; line-height: 1; opacity: 0.6; transition: opacity 0.15s; }
        .mps-cx:hover { opacity: 1; }
        .mps-pb { height: 4px; border-radius: 2px; background: rgba(240,244,238,0.08); overflow: hidden; margin-top: 4px; }
        .mps-pf { height: 100%; border-radius: 2px; transition: width 0.3s; background: linear-gradient(90deg, rgba(107,143,62,0.7), rgba(154,184,151,0.9)); }
        .mps-ca { width: 100%; background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.2); border-radius: 7px; color: rgba(248,113,113,0.7); padding: 7px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .mps-ca:hover:not(:disabled) { background: rgba(248,113,113,0.13); color: #fca5a5; }
        .mps-ca:disabled { opacity: 0.3; cursor: not-allowed; }
        .mps-link-in { background: rgba(240,244,238,0.06); border: 1px solid rgba(240,244,238,0.1); border-radius: 5px; color: #f0f4ee; padding: 6px 8px; font-size: 11px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; min-width: 0; }
        .mps-link-in:focus { border-color: rgba(74,124,47,0.45); }
        .mps-link-add { width: 100%; background: rgba(74,124,47,0.07); border: 1px dashed rgba(74,124,47,0.25); border-radius: 6px; color: rgba(154,184,151,0.8); padding: 6px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .mps-link-add:hover:not(:disabled) { background: rgba(74,124,47,0.14); border-color: rgba(74,124,47,0.45); }
        .mps-link-add:disabled { opacity: 0.35; cursor: not-allowed; }
        .mps-link-rm { background: none; border: none; color: rgba(240,244,238,0.25); cursor: pointer; font-size: 14px; padding: 0 3px; line-height: 1; flex-shrink: 0; transition: color 0.15s; }
        .mps-link-rm:hover { color: #f87171; }
      `}</style>

      <div className="mps-scroll" style={{ flex: 1, overflowY: 'auto', padding: open ? '0 0 24px' : 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid rgba(240,244,238,0.07)', position: 'sticky', top: 0, background: '#111f11', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ab897" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#f0f4ee' }}>SEO & Links</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(240,244,238,0.4)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>›</button>
        </div>

        <div style={{ padding: '16px 14px 0' }}>
          {/* Business Info */}
          <p className="mps-sl">Business Info</p>
          <div style={{ marginBottom: 9 }}>
            <label className="mps-fl">Business Name</label>
            <input className="mps-fi" type="text" placeholder="e.g. GreenScape Landscaping" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 9 }}>
            <label className="mps-fl">Primary Service</label>
            <input className="mps-fi" type="text" placeholder="e.g. Lawn Care & Landscaping" value={primaryService} onChange={e => setPrimaryService(e.target.value)} />
          </div>
          <div style={{ marginBottom: 9 }}>
            <label className="mps-fl">Website URL</label>
            <input className="mps-fi" type="text" placeholder="e.g. https://greenscape.com" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="mps-fl">Phone Number</label>
            <input className="mps-fi" type="text" placeholder="e.g. (214) 555-0199" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div style={{ borderTop: '1px solid rgba(240,244,238,0.07)', margin: '0 0 16px' }} />

          {/* Primary Keyword */}
          <p className="mps-sl">Primary Keyword</p>
          <p style={{ fontSize: 11, color: 'rgba(240,244,238,0.3)', margin: '0 0 8px', lineHeight: 1.4 }}>The main keyword this page targets</p>
          {primaryKeyword ? (
            <div style={{ marginBottom: 12 }}>
              <span className="mps-chip-p">{primaryKeyword}<button className="mps-cx" onClick={() => setPrimaryKeyword('')}>×</button></span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input className="mps-ki" type="text" placeholder="e.g. lawn care Dallas TX" value={pkInput} onChange={e => setPkInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPrimary(); } }} />
              <button className="mps-ab" onClick={addPrimary} disabled={!pkInput.trim()}>Set</button>
            </div>
          )}
          <p style={{ fontSize: 10, color: 'rgba(240,244,238,0.25)', margin: '0 0 16px', fontStyle: 'italic' }}>Use a long-tail or location-based keyword</p>

          <div style={{ borderTop: '1px solid rgba(240,244,238,0.07)', margin: '0 0 16px' }} />

          {/* Secondary Keywords */}
          <p className="mps-sl">Secondary Keywords</p>
          <p style={{ fontSize: 11, color: 'rgba(240,244,238,0.3)', margin: '0 0 8px', lineHeight: 1.4 }}>Supporting keywords to weave in naturally</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input className="mps-ki" type="text" placeholder="e.g. licensed landscaper" value={skInput} disabled={secondaryKeywords.length >= 15} onChange={e => setSkInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSecondary(); } }} />
            <button className="mps-ab" onClick={addSecondary} disabled={secondaryKeywords.length >= 15 || !skInput.trim()}>Add</button>
          </div>
          {secondaryKeywords.length >= 15 && <p style={{ fontSize: 10, color: 'rgba(253,224,71,0.7)', margin: '0 0 6px', fontStyle: 'italic' }}>Maximum 15 secondary keywords reached</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-3px', marginBottom: 14 }}>
            {secondaryKeywords.map(kw => (
              <span key={kw} className="mps-chip-s">{kw}<button className="mps-cx" onClick={() => removeSecondary(kw)}>×</button></span>
            ))}
          </div>

          {/* Keyword Summary */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: 'rgba(240,244,238,0.45)' }}>Primary</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(154,184,151,0.9)' }}>{primaryKeyword ? 1 : 0} / 1</span>
            </div>
            <div className="mps-pb"><div className="mps-pf" style={{ width: primaryKeyword ? '100%' : '0%' }} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: 'rgba(240,244,238,0.45)' }}>Secondary</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(154,184,151,0.7)' }}>{secondaryKeywords.length} / 15</span>
            </div>
            <div className="mps-pb"><div className="mps-pf" style={{ width: `${(secondaryKeywords.length / 15) * 100}%` }} /></div>
          </div>
          <div style={{ background: 'rgba(240,244,238,0.04)', border: '1px solid rgba(240,244,238,0.08)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(240,244,238,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Keywords</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalColor, lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 10, color: 'rgba(240,244,238,0.2)', marginTop: 2 }}>/ 16</div>
          </div>
          <button className="mps-ca" onClick={clearAll} disabled={total === 0} style={{ marginBottom: 20 }}>Clear All Keywords</button>

          <div style={{ borderTop: '1px solid rgba(240,244,238,0.07)', margin: '0 0 16px' }} />

          {/* Internal Links */}
          <p className="mps-sl">Internal Links</p>
          <p style={{ fontSize: 11, color: 'rgba(240,244,238,0.3)', margin: '0 0 10px', lineHeight: 1.4 }}>Links to weave into the page copy naturally</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {internalLinks.map(link => (
              <div key={link.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px', background: 'rgba(240,244,238,0.03)', borderRadius: 6, border: '1px solid rgba(240,244,238,0.07)' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input className="mps-link-in" style={{ flex: 1 }} type="text" placeholder="URL" value={link.url} onChange={e => updateLink(link.id, 'url', e.target.value)} />
                  <button className="mps-link-rm" onClick={() => removeLink(link.id)} disabled={internalLinks.length === 1}>×</button>
                </div>
                <input className="mps-link-in" style={{ width: '100%' }} type="text" placeholder="Page label (optional)" value={link.label} onChange={e => updateLink(link.id, 'label', e.target.value)} />
              </div>
            ))}
          </div>
          <button className="mps-link-add" onClick={addLink} disabled={internalLinks.length >= 6}>+ Add Internal Link</button>
          <p style={{ fontSize: 10, color: 'rgba(240,244,238,0.2)', margin: '8px 0 0', fontStyle: 'italic' }}>The AI will use varied anchor text for each link</p>
        </div>
      </div>
    </aside>
  );
};
