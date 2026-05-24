import { createContext, useContext, useState, ReactNode } from 'react';

export interface LinkEntry { id: number; url: string; label: string; }

export interface MagicPagesContextValue {
  businessName: string; setBusinessName: (v: string) => void;
  primaryService: string; setPrimaryService: (v: string) => void;
  website: string; setWebsite: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  primaryKeyword: string; setPrimaryKeyword: (v: string) => void;
  secondaryKeywords: string[]; setSecondaryKeywords: (v: string[]) => void;
  internalLinks: LinkEntry[]; setInternalLinks: (v: LinkEntry[]) => void;
  buildKeywordsContext: () => string;
  buildLinksContext: () => string;
}

const MagicPagesContext = createContext<MagicPagesContextValue | null>(null);

export const MagicPagesProvider = ({ children }: { children: ReactNode }) => {
  const [businessName, setBusinessName] = useState('');
  const [primaryService, setPrimaryService] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [internalLinks, setInternalLinks] = useState<LinkEntry[]>([{ id: 1, url: '', label: '' }]);

  const buildKeywordsContext = () => {
    return `PRIMARY KEYWORD (use naturally 2-3 times — in H1, intro, and one subheading):
  ${primaryKeyword || 'None — use service + city combination as primary keyword'}
SECONDARY KEYWORDS (weave naturally throughout — never force or stuff):
${secondaryKeywords.length > 0 ? secondaryKeywords.map(k => `  - ${k}`).join('\n') : '  None provided'}
KEYWORD RULES:
- Primary keyword maximum 3 times in entire page
- Secondary keywords 1-2 times each maximum
- All keyword usage must read naturally to a human
- Never cluster keywords — distribute throughout the page`;
  };

  const buildLinksContext = () => {
    const valid = internalLinks.filter(l => l.url.trim() !== '');
    if (valid.length === 0) return '';
    return `INTERNAL LINKS TO INCLUDE (use all, varied anchor text — never repeat same anchor text twice):
${valid.map((l, i) => `  ${i + 1}. URL: ${l.url}${l.label ? ` | Page: ${l.label}` : ''}`).join('\n')}`;
  };

  return (
    <MagicPagesContext.Provider value={{ businessName, setBusinessName, primaryService, setPrimaryService, website, setWebsite, phone, setPhone, primaryKeyword, setPrimaryKeyword, secondaryKeywords, setSecondaryKeywords, internalLinks, setInternalLinks, buildKeywordsContext, buildLinksContext }}>
      {children}
    </MagicPagesContext.Provider>
  );
};

export const useMagicPages = () => {
  const ctx = useContext(MagicPagesContext);
  if (!ctx) throw new Error('useMagicPages must be used within MagicPagesProvider');
  return ctx;
};
