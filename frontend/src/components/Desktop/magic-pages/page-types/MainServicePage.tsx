import { useState } from 'react';
import { useMagicPages } from '../context/MagicPagesContext';
import { runMagicPagesAI, MagicPagesOutput } from '../shared/runAI';
import { OutputCard } from '../shared/OutputCard';

const SECTIONS = ['Hero Section', 'Service Overview', 'What Is Included', 'Who This Is For', 'Why Choose Us For This Service', 'Pricing Overview', 'FAQ', 'Closing CTA'];
const TONES = ['Professional', 'Friendly', 'Authoritative', 'Conversational'];
const FAQ_COUNTS = ['4', '6', '8'];

export const MainServicePage = () => {
  const { businessName, website, phone, buildKeywordsContext, buildLinksContext } = useMagicPages();
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [whoIsFor, setWhoIsFor] = useState('');
  const [whatsIncluded, setWhatsIncluded] = useState('');
  const [whatsNotIncluded, setWhatsNotIncluded] = useState('');
  const [pricing, setPricing] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [faqCount, setFaqCount] = useState('6');
  const [tone, setTone] = useState('Friendly');
  const [sections, setSections] = useState<string[]>([...SECTIONS]);
  const [output, setOutput] = useState<MagicPagesOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (s: string) => setSections(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const buildPrompt = () => `Write a complete main service page for ${businessName || 'the landscaping company'}.

Service: ${serviceName}
Service description: ${serviceDescription}
Who it is for: ${whoIsFor}
What is included: ${whatsIncluded}
What is NOT included: ${whatsNotIncluded || 'not specified'}
Pricing: ${pricing || 'not provided — do not fabricate prices'}
Differentiator: ${differentiator || 'none provided'}
Number of FAQs: ${faqCount}
Tone: ${tone}
Sections to include: ${sections.join(', ')}
Website: ${website || 'not provided'}
Phone: ${phone || 'not provided'}

${buildKeywordsContext()}
${buildLinksContext()}

This is a MAIN SERVICE PAGE for a landscaping company with no city targeting. Do not reference any specific city. Focus on landscaping-specific benefits, plant and material quality, maintenance schedules, warranties/guarantees, process clarity, and conversion. Use landscaping industry language naturally.
Use section IDs: hero, service-overview, what-is-included, who-is-for, why-choose-us, pricing-overview, faq, closing-cta
For FAQ section use listItems with format "Q: question\\nA: answer"
Only include sections from: ${sections.join(', ')}`;

  const generate = async () => {
    if (!serviceName.trim()) { setError('Please enter a service name.'); return; }
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

      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4ee', margin: '0 0 4px' }}>Main Service Page</h2>
      <p style={{ fontSize: 13, color: 'rgba(240,244,238,0.4)', margin: '0 0 24px' }}>Service page with no city targeting for core landscaping services. Example: Landscape Design</p>

      <div style={{ background: 'rgba(240,244,238,0.02)', border: '1px solid rgba(240,244,238,0.07)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Service Name</label>
          <input className="mp-fi" type="text" placeholder="e.g. Landscape Design" value={serviceName} onChange={e => setServiceName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Service Description</label>
          <input className="mp-fi" type="text" placeholder="e.g. Custom landscape design that transforms your outdoor space with the right plants, hardscape, and irrigation for your property" value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Who Is It For</label>
          <input className="mp-fi" type="text" placeholder="e.g. Homeowners with new builds, tired yards, or those looking to increase curb appeal before selling" value={whoIsFor} onChange={e => setWhoIsFor(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">What Is Included</label>
          <textarea className="mp-ta" placeholder="e.g. Site assessment, 2D/3D design, plant selection, hardscape plans, irrigation layout, installation, and post-install walkthrough" value={whatsIncluded} onChange={e => setWhatsIncluded(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">What Is NOT Included <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="mp-ta" placeholder="e.g. Ongoing maintenance, tree removal, and retaining wall engineering — these are quoted separately" value={whatsNotIncluded} onChange={e => setWhatsNotIncluded(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="mp-fl">Pricing <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <input className="mp-fi" type="text" placeholder="e.g. Design packages starting at $1,500" value={pricing} onChange={e => setPricing(e.target.value)} />
          </div>
          <div>
            <label className="mp-fl">Differentiator <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <input className="mp-fi" type="text" placeholder="e.g. Certified landscape designer on staff, 10-year plant health guarantee" value={differentiator} onChange={e => setDifferentiator(e.target.value)} />
          </div>
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
        <button className="mp-gen" onClick={generate} disabled={isGenerating}>{isGenerating ? 'Generating...' : 'Generate Main Service Page'}</button>
      </div>

      {isGenerating && !output && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', gap: 14, color: 'rgba(240,244,238,0.4)' }}>
          <span className="mp-spinner" />
          <span style={{ fontSize: 13 }}>Generating main service page...</span>
        </div>
      )}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {output && !output.error && <OutputCard output={output} onRegenerate={generate} isGenerating={isGenerating} pageType="main-service-page" pageTitle={serviceName || 'Service Page'} />}
      {output?.error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13 }}>{output.error}</div>}
    </div>
  );
};
