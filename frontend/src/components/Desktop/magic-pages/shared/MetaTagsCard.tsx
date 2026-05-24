import { useState } from 'react';
import { copyToClipboard } from './copyToClipboard';

interface MetaTagsCardProps {
  metaTitle: string;
  metaDescription: string;
}

function charColor(len: number, ideal: [number, number], max: number): string {
  if (len === 0) return 'rgba(240,244,238,0.3)';
  if (len <= ideal[1]) return '#6b8f3e';
  if (len <= max) return '#fbbf24';
  return '#f87171';
}

export const MetaTagsCard = ({ metaTitle, metaDescription }: MetaTagsCardProps) => {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);

  const copyTitle = async () => { await copyToClipboard(metaTitle); setCopiedTitle(true); setTimeout(() => setCopiedTitle(false), 1500); };
  const copyDesc = async () => { await copyToClipboard(metaDescription); setCopiedDesc(true); setTimeout(() => setCopiedDesc(false), 1500); };
  const copyBoth = async () => {
    await copyToClipboard(`Meta Title: ${metaTitle}\nMeta Description: ${metaDescription}`);
    setCopiedBoth(true); setTimeout(() => setCopiedBoth(false), 1500);
  };

  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;

  return (
    <div style={{ background: 'rgba(154,184,151,0.05)', border: '1px solid rgba(154,184,151,0.2)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9ab897', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meta Tags</span>
        <button onClick={copyBoth} style={{ background: copiedBoth ? 'rgba(107,143,62,0.15)' : 'rgba(154,184,151,0.1)', border: `1px solid ${copiedBoth ? 'rgba(107,143,62,0.35)' : 'rgba(154,184,151,0.25)'}`, borderRadius: 6, color: copiedBoth ? '#6b8f3e' : '#9ab897', padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {copiedBoth ? 'Copied!' : 'Copy Both'}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(240,244,238,0.4)', fontWeight: 600 }}>Meta Title</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: charColor(titleLen, [50, 60], 65) }}>{titleLen} chars</span>
            <button onClick={copyTitle} style={{ background: copiedTitle ? 'rgba(107,143,62,0.1)' : 'rgba(240,244,238,0.05)', border: `1px solid ${copiedTitle ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.1)'}`, borderRadius: 5, color: copiedTitle ? '#6b8f3e' : 'rgba(240,244,238,0.45)', padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {copiedTitle ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f0f4ee', lineHeight: 1.4 }}>{metaTitle}</p>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(240,244,238,0.08)', marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: charColor(titleLen, [50, 60], 65), width: `${Math.min((titleLen / 65) * 100, 100)}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(240,244,238,0.4)', fontWeight: 600 }}>Meta Description</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: charColor(descLen, [140, 160], 170) }}>{descLen} chars</span>
            <button onClick={copyDesc} style={{ background: copiedDesc ? 'rgba(107,143,62,0.1)' : 'rgba(240,244,238,0.05)', border: `1px solid ${copiedDesc ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.1)'}`, borderRadius: 5, color: copiedDesc ? '#6b8f3e' : 'rgba(240,244,238,0.45)', padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {copiedDesc ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(240,244,238,0.7)', lineHeight: 1.5 }}>{metaDescription}</p>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(240,244,238,0.08)', marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: charColor(descLen, [140, 160], 170), width: `${Math.min((descLen / 170) * 100, 100)}%`, transition: 'width 0.3s' }} />
        </div>
      </div>
    </div>
  );
};
