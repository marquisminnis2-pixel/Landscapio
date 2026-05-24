import { useState } from 'react';
import { useMagicPages } from '../context/MagicPagesContext';
import { runMagicPagesAI, MagicPagesOutput } from '../shared/runAI';
import { OutputCard } from '../shared/OutputCard';

const SECTIONS = ['Hero Section', 'Introduction', 'Why Choose Us', 'How It Works', 'Landscaping Services In This City', 'Neighborhoods We Serve', 'FAQ', 'Closing CTA'];
const TONES = ['Professional', 'Friendly', 'Authoritative', 'Conversational'];
const FAQ_COUNTS = ['4', '6', '8'];

export const LocationLandingPage = () => {
  const { businessName, primaryService, website, phone, buildKeywordsContext, buildLinksContext } = useMagicPages();
  const [service, setService] = useState(primaryService || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [neighborhoods, setNeighborhoods] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [faqCount, setFaqCount] = useState('6');
  const [tone, setTone] = useState('Friendly');
  const [sections, setSections] = useState<string[]>([...SECTIONS]);
  const [output, setOutput] = useState<MagicPagesOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (s: string) => setSections(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const buildPrompt = () => `Write a complete location landing page for ${businessName || 'the landscaping company'}, providing ${service} in ${city}, ${state}.

Business website: ${website || 'not provided'}
Business phone: ${phone || 'not provided'}
Differentiator: ${differentiator || 'none provided'}
Neighborhoods served: ${neighborhoods || 'general city area'}
Number of FAQs: ${faqCount}
Tone: ${tone}
Sections to include: ${sections.join(', ')}

${buildKeywordsContext()}

${buildLinksContext()}

This is a LOCATION LANDING PAGE for a landscaping company. It must:
- Mention ${city}, ${state} naturally throughout
- Be written specifically for a homeowner searching for ${service} in ${city}
- Include local trust signals, neighborhood references, and landscaping-specific language
- Reference plant materials, hardscape, irrigation, seasonal schedules, and local climate/soil considerations where relevant
- Drive visitors to call or book via ${phone || '[phone number]'}

Use the section IDs: hero, introduction, why-choose-us, how-it-works, services-in-city, neighborhoods, faq, closing-cta
For the FAQ section use listItems array with format "Q: question\\nA: answer" for each FAQ item.
Only include sections from this list: ${sections.join(', ')}`;

  const generate = async () => {
    if (!service.trim() || !city.trim()) { setError('Please enter a service and city.'); return; }
    setIsGenerating(true); setError(null); setOutput(null);
    try {
      const result = await runMagicPagesAI(buildPrompt());
      setOutput(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setIsGenerating(false); }
  };

  return (
    <div>
      <style>{`
        .mp-fi{width:100%;background:rgba(240,244,238,0.06);border:1px solid rgba(240,244,238,0.12);border-radius:6px;color:#f0f4ee;padding:8px 11px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color 0.15s}
        .mp-fi:focus{border-color:rgba(74,124,47,0.5)}
        .mp-fl{display:block;font-size:11px;font-weight:600;color:rgba(240,244,238,0.45);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em}
        .mp-seg{background:rgba(240,244,238,0.04);border:1px solid rgba(240,244,238,0.08);border-radius:7px;color:rgba(240,244,238,0.5);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s}
        .mp-seg.active{background:rgba(154,184,151,0.12);border-color:rgba(154,184,151,0.35);color:#9ab897}
        .mp-gen{background:linear-gradient(135deg,#6b8f3e,#9ab897);border:none;border-radius:8px;color:#fff;padding:11px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.15s}
        .mp-gen:disabled{opacity:0.5;cursor:not-allowed}
        .mp-spinner{display:inline-block;width:20px;height:20px;border:2px solid rgba(154,184,151,0.3);border-top-color:#9ab897;border-radius:50%;animation:mp-spin 0.7s linear infinite}
        @keyframes mp-spin{to{transform:rotate(360deg)}}
        .mp-cb{display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0;font-size:13px;color:rgba(240,244,238,0.65)}
        .mp-cb input{accent-color:#6b8f3e;width:14px;height:14px;cursor:pointer}
        .mp-ta{width:100%;background:rgba(240,244,238,0.06);border:1px solid rgba(240,244,238,0.12);border-radius:6px;color:#f0f4ee;padding:8px 11px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color 0.15s;resize:vertical;min-height:70px;line-height:1.5}
        .mp-ta:focus{border-color:rgba(74,124,47,0.5)}
        select.mp-fi option{background:#0d1a0d;color:#f0f4ee}
      `}</style>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4ee', margin: '0 0 4px' }}>Location Landing Page</h2>
      <p style={{ fontSize: 13, color: 'rgba(240,244,238,0.4)', margin: '0 0 24px' }}>Full landing page copy for a landscaping service in a specific city. Example: Lawn Care in Dallas, TX</p>

      <div style={{ background: 'rgba(240,244,238,0.02)', border: '1px solid rgba(240,244,238,0.07)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1' }}>
            <label className="mp-fl">Service</label>
            <input className="mp-fi" type="text" placeholder="e.g. Lawn Care" value={service} onChange={e => setService(e.target.value)} />
          </div>
          <div>
            <label className="mp-fl">City</label>
            <input className="mp-fi" type="text" placeholder="e.g. Dallas" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div>
            <label className="mp-fl">State</label>
            <input className="mp-fi" type="text" placeholder="e.g. TX" value={state} onChange={e => setState(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Neighborhoods Served <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <input className="mp-fi" type="text" placeholder="e.g. Highland Park, Oak Lawn, Uptown, Preston Hollow" value={neighborhoods} onChange={e => setNeighborhoods(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Differentiator <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <input className="mp-fi" type="text" placeholder="e.g. Family-owned, licensed and insured, certified landscape professionals" value={differentiator} onChange={e => setDifferentiator(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="mp-fl">Tone</label>
            <select className="mp-fi" value={tone} onChange={e => setTone(e.target.value)} style={{ cursor: 'pointer' }}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mp-fl">Number of FAQs</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FAQ_COUNTS.map(n => <button key={n} className={`mp-seg${faqCount === n ? ' active' : ''}`} onClick={() => setFaqCount(n)}>{n}</button>)}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="mp-fl" style={{ marginBottom: 8 }}>Page Sections</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {SECTIONS.map(s => (
              <label key={s} className="mp-cb">
                <input type="checkbox" checked={sections.includes(s)} onChange={() => toggleSection(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <button className="mp-gen" onClick={generate} disabled={isGenerating}>{isGenerating ? 'Generating...' : 'Generate Location Landing Page'}</button>
      </div>

      {isGenerating && !output && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', gap: 14, color: 'rgba(240,244,238,0.4)' }}>
          <span className="mp-spinner" />
          <span style={{ fontSize: 13 }}>Generating location landing page...</span>
        </div>
      )}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {output && !output.error && <OutputCard output={output} onRegenerate={generate} isGenerating={isGenerating} pageType="location-landing-page" pageTitle={`${service} in ${city}, ${state}`} />}
      {output?.error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13 }}>{output.error}</div>}
    </div>
  );
};
