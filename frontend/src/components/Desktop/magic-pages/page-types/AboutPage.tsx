import { useState } from 'react';
import { useMagicPages } from '../context/MagicPagesContext';
import { runMagicPagesAI, MagicPagesOutput } from '../shared/runAI';
import { OutputCard } from '../shared/OutputCard';

const SECTIONS = ['Hero Section', 'Our Story', 'Our Mission and Values', 'Meet The Team', 'Why We Do What We Do', 'Community and Giving Back', 'Credentials and Trust', 'Closing CTA'];
const TONES = ['Professional', 'Friendly', 'Warm and Personal', 'Community-Focused'];

export const AboutPage = () => {
  const { businessName, primaryService, website, phone, buildKeywordsContext, buildLinksContext } = useMagicPages();
  const [foundingStory, setFoundingStory] = useState('');
  const [missionValues, setMissionValues] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [ownersNames, setOwnersNames] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [citiesServed, setCitiesServed] = useState('');
  const [communityInvolvement, setCommunityInvolvement] = useState('');
  const [credentials, setCredentials] = useState('');
  const [tone, setTone] = useState('Warm and Personal');
  const [sections, setSections] = useState<string[]>([...SECTIONS]);
  const [output, setOutput] = useState<MagicPagesOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (s: string) => setSections(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const buildPrompt = () => `Write a complete about page for ${businessName || 'the landscaping company'}, a ${primaryService || 'landscaping'} company serving ${citiesServed}.

Founding story: ${foundingStory}
Mission and values: ${missionValues}
Team description: ${teamDescription || 'not provided'}
Owners names: ${ownersNames || 'not provided'}
Years in business: ${yearsInBusiness || 'not specified'}
Community involvement: ${communityInvolvement || 'not provided'}
Credentials: ${credentials || 'not provided'}
Tone: ${tone}
Sections to include: ${sections.join(', ')}
Website: ${website || 'not provided'}
Phone: ${phone || 'not provided'}

${buildKeywordsContext()}
${buildLinksContext()}

This is the ABOUT PAGE for a landscaping company. Homeowners are deciding whether to trust this company with their yard and outdoor investment. Make it real, warm, and specific. Use founding story details exactly as provided — do not invent details. Reference landscaping industry experience, certifications, horticultural knowledge, and craftsmanship pride where relevant.
For Credentials section: in listItems list each credential as a separate string for badge display.
Use section IDs: hero, our-story, mission-values, meet-the-team, why-we-do-it, community, credentials, closing-cta
For sections where info was not provided, write warmly and generally without fabricating details.
Only include sections from: ${sections.join(', ')}`;

  const generate = async () => {
    if (!foundingStory.trim()) { setError('Please enter a founding story.'); return; }
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

      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4ee', margin: '0 0 4px' }}>About Page</h2>
      <p style={{ fontSize: 13, color: 'rgba(240,244,238,0.4)', margin: '0 0 24px' }}>About page with business story, team, values, and trust builders for your landscaping company</p>

      <div style={{ background: 'rgba(240,244,238,0.02)', border: '1px solid rgba(240,244,238,0.07)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Founding Story</label>
          <textarea className="mp-ta" style={{ minHeight: 100 }} placeholder="e.g. Mike started GreenScape in 2008 after spending 10 years working for a large commercial landscaping firm. He saw how many homeowners were getting rushed work and decided to build a company that treated every yard like it was his own..." value={foundingStory} onChange={e => setFoundingStory(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Mission and Values</label>
          <input className="mp-fi" type="text" placeholder="e.g. To create beautiful, healthy outdoor spaces with honest work and quality craftsmanship. We value integrity, sustainability, and treating customers like neighbors." value={missionValues} onChange={e => setMissionValues(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="mp-fl">Owner(s) Names <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <input className="mp-fi" type="text" placeholder="e.g. Mike and Sarah Johnson" value={ownersNames} onChange={e => setOwnersNames(e.target.value)} />
          </div>
          <div>
            <label className="mp-fl">Years In Business <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <input className="mp-fi" type="text" placeholder="e.g. Since 2008" value={yearsInBusiness} onChange={e => setYearsInBusiness(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Team Description <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <input className="mp-fi" type="text" placeholder="e.g. A crew of 15 experienced landscapers, all background-checked and horticulturally trained" value={teamDescription} onChange={e => setTeamDescription(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Cities Served</label>
          <input className="mp-fi" type="text" placeholder="e.g. Dallas, Fort Worth, Plano, Frisco, TX" value={citiesServed} onChange={e => setCitiesServed(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Community Involvement <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <input className="mp-fi" type="text" placeholder="e.g. We sponsor local Little League teams and donate landscaping to community garden projects" value={communityInvolvement} onChange={e => setCommunityInvolvement(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Credentials <span style={{ color: 'rgba(240,244,238,0.25)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
          <input className="mp-fi" type="text" placeholder="e.g. Certified Landscape Professional (CLP), ICPI paver certified, BBB A+ rated, licensed and insured, 500+ 5-star reviews" value={credentials} onChange={e => setCredentials(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="mp-fl">Tone</label>
          <select className="mp-fi" value={tone} onChange={e => setTone(e.target.value)} style={{ cursor: 'pointer', maxWidth: 260 }}>
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
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
        <button className="mp-gen" onClick={generate} disabled={isGenerating}>{isGenerating ? 'Generating...' : 'Generate About Page'}</button>
      </div>

      {isGenerating && !output && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', gap: 14, color: 'rgba(240,244,238,0.4)' }}>
          <span className="mp-spinner" />
          <span style={{ fontSize: 13 }}>Generating about page...</span>
        </div>
      )}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {output && !output.error && <OutputCard output={output} onRegenerate={generate} isGenerating={isGenerating} prominentSectionId="our-story" pageType="about-page" pageTitle={`${businessName || 'Business'} About Page`} />}
      {output?.error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13 }}>{output.error}</div>}
    </div>
  );
};
