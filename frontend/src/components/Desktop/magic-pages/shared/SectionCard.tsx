import { useState } from 'react';
import { copyToClipboard } from './copyToClipboard';
import { PageSection } from './runAI';

interface SectionCardProps {
  section: PageSection;
  prominent?: boolean;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const SectionCard = ({ section, prominent }: SectionCardProps) => {
  const [copied, setCopied] = useState(false);

  const sectionText = [
    section.heading,
    section.subheading ?? '',
    section.body,
    section.listItems ? section.listItems.join('\n') : '',
  ].filter(Boolean).join('\n\n');

  const wordCount = countWords(section.body + ' ' + (section.listItems?.join(' ') ?? ''));

  const handleCopy = async () => {
    await copyToClipboard(sectionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ background: 'rgba(240,244,238,0.03)', border: '1px solid rgba(240,244,238,0.08)', borderRadius: 12, padding: prominent ? '22px 24px' : '16px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(154,184,151,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{section.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(240,244,238,0.25)' }}>{wordCount} words</span>
          <button onClick={handleCopy} style={{ background: copied ? 'rgba(107,143,62,0.1)' : 'rgba(240,244,238,0.05)', border: `1px solid ${copied ? 'rgba(107,143,62,0.35)' : 'rgba(240,244,238,0.1)'}`, borderRadius: 6, color: copied ? '#6b8f3e' : 'rgba(240,244,238,0.45)', padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {copied ? 'Copied!' : 'Copy Section'}
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: prominent ? 20 : 17, fontWeight: 700, color: '#f0f4ee', margin: '0 0 6px', lineHeight: 1.3 }}>{section.heading}</h2>
      {section.subheading && <p style={{ fontSize: 14, color: 'rgba(240,244,238,0.55)', margin: '0 0 12px', fontStyle: 'italic' }}>{section.subheading}</p>}

      {section.body.split('\n\n').map((para, i) => (
        <p key={i} style={{ fontSize: 14, color: 'rgba(240,244,238,0.72)', lineHeight: 1.75, margin: '0 0 10px' }}>{para}</p>
      ))}

      {section.listItems && section.listItems.length > 0 && (
        <ul style={{ margin: '10px 0 0', padding: '0 0 0 0', listStyle: 'none' }}>
          {section.listItems.map((item, i) => {
            if (item.startsWith('Q:')) {
              const parts = item.split('\nA:');
              return (
                <li key={i} style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(240,244,238,0.03)', borderRadius: 8, border: '1px solid rgba(240,244,238,0.06)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#f0f4ee' }}>{parts[0].replace('Q:', '').trim()}</p>
                  {parts[1] && <p style={{ margin: 0, fontSize: 13, color: 'rgba(240,244,238,0.6)', lineHeight: 1.6 }}>{parts[1].trim()}</p>}
                </li>
              );
            }
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 14, color: 'rgba(240,244,238,0.7)', lineHeight: 1.6 }}>
                <span style={{ color: '#9ab897', marginTop: 3, flexShrink: 0 }}>•</span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
