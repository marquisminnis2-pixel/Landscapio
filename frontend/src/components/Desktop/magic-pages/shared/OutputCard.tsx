import { useState } from 'react';
import { copyToClipboard } from './copyToClipboard';
import { MagicPagesOutput, PageSection } from './runAI';
import { MetaTagsCard } from './MetaTagsCard';
import { SectionCard } from './SectionCard';
import { API_BASE } from '@/lib/api';

interface OutputCardProps {
  output: MagicPagesOutput;
  onRegenerate: () => void;
  isGenerating: boolean;
  prominentSectionId?: string;
  pageType?: string;
  pageTitle?: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sectionsToPlainText(sections: PageSection[]): string {
  return sections.map(s => {
    const parts = [s.heading];
    if (s.subheading) parts.push(s.subheading);
    parts.push(s.body);
    if (s.listItems) parts.push(s.listItems.join('\n'));
    return parts.filter(Boolean).join('\n\n');
  }).join('\n\n---\n\n');
}

function sectionsToHTML(sections: PageSection[]): string {
  return sections.map(s => {
    const parts = [`<h2>${s.heading}</h2>`];
    if (s.subheading) parts.push(`<h3>${s.subheading}</h3>`);
    s.body.split('\n\n').forEach(p => parts.push(`<p>${p}</p>`));
    if (s.listItems) {
      parts.push('<ul>');
      s.listItems.forEach(item => parts.push(`<li>${item}</li>`));
      parts.push('</ul>');
    }
    return `<section>\n${parts.join('\n')}\n</section>`;
  }).join('\n\n');
}

export const OutputCard = ({ output, onRegenerate, isGenerating, prominentSectionId, pageType, pageTitle }: OutputCardProps) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const totalWords = output.wordCount || output.sections.reduce((sum, s) => sum + countWords(s.body + ' ' + (s.listItems?.join(' ') ?? '')), 0);

  const savePage = async () => {
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    if (!token || !orgId) { alert('Please log in again.'); return; }
    setSaveStatus('saving');
    try {
      const content = sectionsToPlainText(output.sections);
      const title = pageTitle || output.metaTitle || output.sections[0]?.heading || 'Untitled Page';
      const res = await fetch(`${API_BASE}/api/orgs/${orgId}/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          toolType: 'magic-pages',
          subType: pageType || 'unknown',
          metadata: { wordCount: totalWords, metaTitle: output.metaTitle, metaDescription: output.metaDescription },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };
  const wColor = totalWords < 500 ? '#f87171' : totalWords < 800 ? '#fbbf24' : '#6b8f3e';
  const wRgb = wColor === '#6b8f3e' ? '107,143,62' : wColor === '#fbbf24' ? '251,191,36' : '248,113,113';

  const copyFull = async () => { await copyToClipboard(sectionsToPlainText(output.sections)); setCopiedFull(true); setTimeout(() => setCopiedFull(false), 1500); };
  const copyHTML = async () => { await copyToClipboard(sectionsToHTML(output.sections)); setCopiedHTML(true); setTimeout(() => setCopiedHTML(false), 1500); };
  const copyMeta = async () => { await copyToClipboard(`Meta Title: ${output.metaTitle}\nMeta Description: ${output.metaDescription}`); setCopiedMeta(true); setTimeout(() => setCopiedMeta(false), 1500); };

  return (
    <div>
      {/* Sticky action bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0d1a0d', borderBottom: '1px solid rgba(240,244,238,0.08)', padding: '10px 0 10px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `rgba(${wRgb},0.12)`, border: `1px solid ${wColor}44`, borderRadius: 20, padding: '4px 12px', marginRight: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: wColor }}>{totalWords}</span>
          <span style={{ fontSize: 11, color: 'rgba(240,244,238,0.4)' }}>words</span>
        </div>
        <button onClick={copyFull} style={{ background: copiedFull ? 'rgba(107,143,62,0.12)' : 'rgba(240,244,238,0.06)', border: `1px solid ${copiedFull ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.12)'}`, borderRadius: 7, color: copiedFull ? '#6b8f3e' : 'rgba(240,244,238,0.65)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {copiedFull ? 'Copied!' : 'Copy Full Page'}
        </button>
        <button onClick={copyHTML} style={{ background: copiedHTML ? 'rgba(107,143,62,0.12)' : 'rgba(240,244,238,0.06)', border: `1px solid ${copiedHTML ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.12)'}`, borderRadius: 7, color: copiedHTML ? '#6b8f3e' : 'rgba(240,244,238,0.65)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {copiedHTML ? 'Copied!' : 'Copy as HTML'}
        </button>
        <button onClick={copyMeta} style={{ background: copiedMeta ? 'rgba(107,143,62,0.12)' : 'rgba(240,244,238,0.06)', border: `1px solid ${copiedMeta ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.12)'}`, borderRadius: 7, color: copiedMeta ? '#6b8f3e' : 'rgba(240,244,238,0.65)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {copiedMeta ? 'Copied!' : 'Copy Meta Tags'}
        </button>
        <button onClick={savePage} disabled={saveStatus === 'saving'} style={{ background: saveStatus === 'saved' ? 'rgba(107,143,62,0.15)' : saveStatus === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(154,184,151,0.1)', border: `1px solid ${saveStatus === 'saved' ? 'rgba(107,143,62,0.35)' : saveStatus === 'error' ? 'rgba(248,113,113,0.35)' : 'rgba(154,184,151,0.25)'}`, borderRadius: 7, color: saveStatus === 'saved' ? '#6b8f3e' : saveStatus === 'error' ? '#f87171' : '#9ab897', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Failed' : 'Save Page'}
        </button>
        <button onClick={onRegenerate} disabled={isGenerating} style={{ background: 'rgba(154,184,151,0.1)', border: '1px solid rgba(154,184,151,0.25)', borderRadius: 7, color: '#9ab897', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isGenerating ? 0.5 : 1, transition: 'all 0.15s', marginLeft: 'auto' }}>
          {isGenerating ? 'Regenerating...' : '↺ Regenerate'}
        </button>
      </div>

      {/* Word count summary */}
      <div style={{ background: `rgba(${wRgb},0.06)`, border: `1px solid ${wColor}33`, borderRadius: 10, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: wColor, lineHeight: 1 }}>{totalWords}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,244,238,0.65)' }}>Total Words</div>
          <div style={{ fontSize: 11, color: 'rgba(240,244,238,0.35)' }}>Recommended minimum for SEO: 800 words per page</div>
        </div>
      </div>

      {/* Meta tags */}
      <MetaTagsCard metaTitle={output.metaTitle} metaDescription={output.metaDescription} />

      {/* Sections */}
      {output.sections.map(section => (
        <SectionCard key={section.id} section={section} prominent={section.id === prominentSectionId} />
      ))}
    </div>
  );
};
