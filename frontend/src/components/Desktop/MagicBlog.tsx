import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiFetch } from '@/lib/api';
import { getActiveClientId } from '@/lib/activeClient';
import ActiveClientPill from '../Shared/ActiveClientPill';

interface Message { role: 'user' | 'assistant'; content: string; }
interface LinkEntry { id: number; url: string; label: string; }
interface AirtableBlogRecord {
  id: string;
  fields: {
    'Blog Title (Topic)'?: string;
    'Primary Keyword'?: string;
    'Secondary Keyword 1'?: string;
    'Secondary Keyword 2'?: string;
    'Internal Link 1'?: string;
    'Internal Link 2'?: string;
    'External Link 1'?: string;
    'External Link 2'?: string;
    'Scheduled Post Date'?: string;
    'Blog Status'?: string;
    'Blog Outline'?: string;
    'Blog Outline Status'?: string;
  };
}

const TONES = ['Professional', 'Casual & Friendly', 'SEO-Optimised', 'Storytelling', 'Thought Leadership'];
const WORD_COUNTS = ['300', '500', '800', '1200', '2000'];
const BLOG_COUNTS = ['1', '2', '3'];

const QUICK_PROMPTS = [
  { label: 'Add more SEO keywords', prompt: 'Rewrite with more target keywords naturally embedded throughout' },
  { label: 'Make it shorter', prompt: 'Condense this into a shorter version while keeping all key points' },
  { label: 'Add a story hook', prompt: 'Rewrite the introduction as a compelling personal story or anecdote' },
  { label: 'Stronger CTA', prompt: 'Rewrite the conclusion with a stronger, more specific call-to-action for landscaping services' },
  { label: 'Add FAQ section', prompt: 'Add a FAQ section at the end with 5 relevant landscaping questions and answers' },
  { label: 'Generate meta description', prompt: 'Write an SEO meta description (under 155 characters) for this post' },
];

function renderMarkdown(text: string): string {
  // Extract markdown links before escaping, replace with placeholders
  const linkMap: Record<string, string> = {};
  let idx = 0;
  const withPlaceholders = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, linkText, url) => {
    const key = `__LINK_${idx++}__`;
    linkMap[key] = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#9ab897;text-decoration:underline;">${linkText}</a>`;
    return key;
  });

  let html = withPlaceholders
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

  // Restore links
  for (const [key, tag] of Object.entries(linkMap)) {
    html = html.replace(key, tag);
  }
  return html;
}

function parseLinksFromText(text: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdRegex.exec(text)) !== null) links.push({ text: m[1], href: m[2] });
  return links;
}

interface SecondaryKeyword { id: number; keyword: string; }
interface KeywordConflictResult {
  primaryConflict: { title: string; keyword: string } | null;
  secondaryOverlaps: { title: string; keywords: string[] }[];
}

// ─── SEO Checklist v2 helpers ─────────────────────────────────────────────────
// Fixed keyword-count model: PK 1×H1 + 1×body = 2 total; each SK 1×body.
const PK_H1_TARGET = 1;
const PK_BODY_TARGET = 1;
const PK_TOTAL_TARGET = PK_H1_TARGET + PK_BODY_TARGET;
const SK_BODY_TARGET = 1;

// "in" is the only stop word — ignored when matching. "for" is NOT a stop word.
function seoNormalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+\bin\b\s+/g, ' ').replace(/\s+/g, ' ').trim();
}
function seoEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function seoCountKeyword(text: string, kw: string): number {
  const nKw = seoNormalize(kw);
  if (!nKw) return 0;
  const nText = seoNormalize(text);
  return (nText.match(new RegExp(`(?<![a-z])${seoEscape(nKw)}(?![a-z])`, 'g')) || []).length;
}
function seoIsSubstring(inner: string, outer: string): boolean {
  const ni = seoNormalize(inner), no = seoNormalize(outer);
  if (!ni || !no || ni === no) return false;
  return new RegExp(`(?<![a-z])${seoEscape(ni)}(?![a-z])`).test(no);
}
function seoVisibleText(md: string): string {
  return (md || '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, ' ');
}
function seoStripMeta(text: string): string {
  return (text || '').split('\n').filter(l => !/^\s*meta\s*(title|description)\s*[:\-]/i.test(l)).join('\n');
}
function seoExtractAnchors(md: string): { text: string; url: string }[] {
  const out: { text: string; url: string }[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md || '')) !== null) out.push({ text: m[1], url: m[2] });
  return out;
}
interface SeoSections { h1: string; subheadings: string; body: string; }
function seoSplitSections(md: string): SeoSections {
  const h1: string[] = [], subs: string[] = [], body: string[] = [];
  for (const line of (md || '').split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      if (level === 1) h1.push(m[2]);
      else if (level >= 2 && level <= 4) subs.push(m[2]);
      else body.push(m[2]);
    } else { body.push(line); }
  }
  return { h1: h1.join('\n'), subheadings: subs.join('\n'), body: body.join('\n') };
}
interface SeoKwReport {
  pkH1: number; pkBody: number; pkSub: number;
  secondaries: { keyword: string; presence: number; standalone: number; inSub: number; inAnchor: number; coveredBy: string[] }[];
}
function seoAnalyzeKeywords(blogText: string, pk: string, secondaries: string[]): SeoKwReport {
  const sec = (secondaries || []).map(s => s.trim()).filter(Boolean);
  const all = [pk, ...sec].filter(Boolean);
  const S = seoSplitSections(blogText);
  const h1V = seoVisibleText(S.h1);
  const bodyV = seoVisibleText(seoStripMeta(S.body));
  const subV = seoVisibleText(S.subheadings);
  const anchors = seoExtractAnchors(blogText).map(a => seoNormalize(a.text));
  const independent = (text: string, kw: string): number => {
    let c = seoCountKeyword(text, kw);
    for (const other of all) {
      if (other === kw) continue;
      if (seoIsSubstring(kw, other)) c -= seoCountKeyword(text, other);
    }
    return Math.max(0, c);
  };
  const pkH1 = pk ? independent(h1V, pk) : 0;
  const pkBody = pk ? independent(bodyV, pk) : 0;
  const pkSub = pk ? seoCountKeyword(subV, pk) : 0;
  const secondariesOut = sec.map(sk => {
    const standalone = independent(bodyV, sk);
    const coveredBy: string[] = [];
    let credit = 0;
    for (const sup of all) {
      if (sup === sk) continue;
      if (seoIsSubstring(sk, sup)) {
        const sc = seoCountKeyword(bodyV, sup);
        if (sc > 0) { credit += sc; coveredBy.push(sup); }
      }
    }
    const nSk = seoNormalize(sk);
    const inAnchor = anchors.filter(a => new RegExp(`(?<![a-z])${seoEscape(nSk)}(?![a-z])`).test(a)).length;
    return { keyword: sk, presence: standalone + credit, standalone, inSub: seoCountKeyword(subV, sk), inAnchor, coveredBy };
  });
  return { pkH1, pkBody, pkSub, secondaries: secondariesOut };
}
function seoHeadingIssues(blogText: string, pk: string, secondaries: string[]): string[] {
  const issues: string[] = [];
  const all = [pk, ...secondaries].filter(Boolean);
  for (const line of (blogText || '').split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2];
    const plain = text.replace(/\*\*/g, '').trim();
    if (/\*\*/.test(text)) issues.push(`Heading "${plain}" contains bold (**) — strip all ** markers from headings.`);
    const firstAlpha = plain.replace(/^[^A-Za-z]*/, '');
    if (firstAlpha && /^[a-z]/.test(firstAlpha)) issues.push(`Heading "${plain}" must start with a capital letter.`);
    if (level >= 2 && level <= 4) {
      for (const kw of all) {
        if (kw && seoCountKeyword(seoVisibleText(text), kw)) {
          issues.push(`Subheading "${plain}" contains the keyword "${kw}" — replace it with a natural synonym (never another keyword from the list).`);
        }
      }
    }
    if (level === 1 && pk && new RegExp(`^${seoEscape(seoNormalize(pk))}\\b`).test(seoNormalize(seoVisibleText(text)))) {
      issues.push(`H1 leads with the primary keyword "${pk}" verbatim — integrate it naturally with an angle modifier instead of forcing it at the front.`);
    }
  }
  return issues;
}
function seoFormatIssues(blogText: string, pk: string, secondaries: string[]): string[] {
  const issues: string[] = [];
  const all = [pk, ...secondaries].filter(Boolean);
  if (/[^\s—]—|—[^\s—]/.test(blogText)) issues.push('Some em-dashes (—) lack a space — every "—" must have a space on both sides.');
  if (/&nbsp;/i.test(blogText)) issues.push('Remove all non-breaking spaces (&nbsp;), especially around keywords.');
  const lower = (blogText || '').toLowerCase().replace(/\n/g, ' ');
  for (const kw of all) {
    const e = seoEscape(kw.toLowerCase());
    if (new RegExp(`\\*\\*[^*]*${e}[^*]*\\*\\*`).test(lower) || new RegExp(`(?<!\\*)\\*[^*]+${e}[^*]+\\*(?!\\*)`).test(lower)) {
      issues.push(`The keyword "${kw}" is bold or italicized somewhere — keyword occurrences must never be bold or italic.`);
    }
  }
  return issues;
}
function seoLinkIssues(blogText: string, siteUrl: string, keywords: string[]): string[] {
  const issues: string[] = [];
  const links = seoExtractAnchors(blogText);
  const isInternal = (url: string) => url.startsWith('/') || url.includes(siteUrl);
  const internal = links.filter(l => isInternal(l.url));
  const external = links.filter(l => !isInternal(l.url) && /^https?:\/\//i.test(l.url));
  if (internal.length !== 2) {
    issues.push(internal.length < 2
      ? `Only ${internal.length} internal link(s) — there must be exactly 2: IL1 to the assigned service page and IL2 to the homepage (https://${siteUrl}). Add the missing one with a natural, descriptive anchor.`
      : `${internal.length} internal links — prune to exactly 2 (IL1 service page + IL2 homepage). When removing an excess link, keep the surrounding text but unlink it; if the released text is a keyword, swap in a synonym.`);
  }
  const isHome = (url: string): boolean => {
    try { return new URL(url.startsWith('http') ? url : `https://${siteUrl}${url}`).pathname.replace(/\/$/, '') === ''; } catch { return false; }
  };
  const homeLinks = internal.filter(l => isHome(l.url));
  if (internal.length >= 1 && homeLinks.length === 0) issues.push(`Internal Link 2 must point to the homepage (https://${siteUrl}).`);
  // IL1 must be the service page and IL2 the homepage — they cannot both be the homepage.
  if (internal.length === 2 && homeLinks.length === 2) {
    issues.push('Internal Link 1 and Internal Link 2 both point to the homepage — IL1 must link to the relevant service page.');
  }
  if (external.length !== 2) {
    issues.push(external.length < 2
      ? `Only ${external.length} external link(s) — there must be exactly 2 to authoritative, relevant sources (link to specific pages, not site homepages). Add the missing one.`
      : `${external.length} external links — reduce to exactly 2 authoritative sources.`);
  }
  for (const l of external) {
    if (/\s/.test(l.url) || !/^https?:\/\/[^\s]+\.[^\s]/.test(l.url)) {
      issues.push(`External URL "${l.url}" looks broken — replace it with a real, working authoritative URL (do not delete it, or the external-link count drops below 2).`);
    }
  }
  for (const l of links) {
    if (/^\s*(click here|learn more|read more|here|this)\s*$/i.test(l.text)) {
      issues.push(`Anchor "${l.text}" is a generic CTA — rewrite it to describe the destination.`);
    }
    for (const kw of keywords) {
      if (kw && seoCountKeyword(l.text, kw)) {
        issues.push(`Link anchor "${l.text}" uses the keyword "${kw}" — change the visible anchor text to a natural descriptive synonym (keep the URL), and make sure "${kw}" still appears the required number of times in the body prose.`);
        break;
      }
    }
  }
  return issues;
}
function seoMetaIssues(blogText: string, pk: string): string[] {
  const issues: string[] = [];
  const descM = blogText.match(/meta\s*description\s*[:\-]\s*(.+)/i);
  if (descM) {
    const desc = descM[1].replace(/^["'""']+|["'""']+$/g, '').replace(/\s+$/, '').trim();
    if (desc.length < 150 || desc.length > 160) issues.push(`Meta description is ${desc.length} characters — it must be 150–160 (strip trailing whitespace before measuring).`);
    const pkc = pk ? seoCountKeyword(desc, pk) : 0;
    if (pk && pkc !== 1) issues.push(`Meta description must include the primary keyword exactly 1× (currently ${pkc}×).`);
    if (/\?\s*$/.test(desc)) issues.push('Meta description must be declarative — it currently reads as a question.');
  } else {
    issues.push('Add a "Meta Description:" line — 150–160 characters, declarative, primary keyword exactly 1×, unique vs. the parent service page.');
  }
  const titleM = blogText.match(/meta\s*title\s*[:\-]\s*(.+)/i);
  if (titleM) {
    const title = titleM[1].replace(/^["'""']+|["'""']+$/g, '').trim();
    if (title.length >= 60) issues.push(`Meta title is ${title.length} characters — keep it under 60.`);
    if (pk && seoCountKeyword(title, pk) < 1) issues.push('Meta title must include the primary keyword + an angle modifier.');
  } else {
    issues.push('Add a "Meta Title:" line — under 60 characters, primary keyword + an angle modifier, unique vs. the parent service page.');
  }
  return issues;
}

function extractUrl(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/https?:\/\/[^\s)\]]+/);
  if (m) return m[0].replace(/[.,;:)]+$/, '');
  const rel = raw.trim();
  if (rel.startsWith('/')) return rel;
  return '';
}
function extractLabel(raw: string, url: string): string {
  if (!raw || !url) return '';
  const idx = raw.indexOf(url);
  if (idx <= 0) return '';
  return raw.slice(0, idx).replace(/[\s—\-:|]+$/, '').trim();
}

// NOTE: duplicated in backend/src/utils/seoChecklist.ts (frontend and backend are
// separate packages with no shared module path). Keep the two copies in sync.
const brandSiteUrl = 'landscapio.co';

function buildBlogKeywordsContext(primaryKeyword: string, secondaryKeywords: SecondaryKeyword[], _pkTarget: number, _skTarget: number): string {
  const pk = (primaryKeyword || '').trim();
  const sks = secondaryKeywords.map(k => k.keyword.trim()).filter(Boolean);
  if (!pk && sks.length === 0) return '';
  const sk1 = sks[0] || '';
  const sk2 = sks[1] || '';

  const overlapNotes: string[] = [];
  for (const sk of sks) {
    if (pk && seoIsSubstring(pk, sk)) overlapNotes.push(`• "${pk}" (PK) is INSIDE "${sk}" — an occurrence of "${sk}" does NOT satisfy the PK. Place a separate standalone "${pk}" in the body (Rule A).`);
    if (pk && seoIsSubstring(sk, pk)) overlapNotes.push(`• "${sk}" is INSIDE "${pk}" (PK) — the PK body mention already covers "${sk}". Do NOT add a separate "${sk}" (Rule B).`);
  }
  if (sk1 && sk2 && seoIsSubstring(sk1, sk2)) overlapNotes.push(`• "${sk1}" (SK1) is INSIDE "${sk2}" (SK2) — one "${sk2}" covers "${sk1}". Do NOT add a separate "${sk1}" (Rule C).`);
  if (sk1 && sk2 && seoIsSubstring(sk2, sk1)) overlapNotes.push(`• "${sk2}" (SK2) is INSIDE "${sk1}" (SK1) — one "${sk1}" covers "${sk2}". Do NOT add a separate "${sk2}" (Rule C).`);

  return `KEYWORDS — EXACT PLACEMENT (SEO Checklist v2, fixed counts — NOT density-based):

PRIMARY KEYWORD (PK): "${pk || 'None provided'}"
  • Exactly 1× in the H1 — integrated naturally with an angle modifier. Never jam the exact phrase at the front like a label; rearrange the words if it reads better.
  • Exactly 1× in the body — a standalone phrase inside a paragraph. Never in a subheading.

SECONDARY KEYWORDS (each exactly 1× in the BODY only, never in a subheading):
${sks.length ? sks.map((k, i) => `  SK${i + 1}. "${k}"`).join('\n') : '  None provided.'}

TOTAL keyword mentions across the whole blog must equal exactly ${2 + sks.length}${sks.length === 2 ? ' (PK×2 + SK1×1 + SK2×1 = 4)' : ''}.

STOP-WORD RULE: "in" is ignored when matching keywords ("Landscaping Services in Dallas" = "Landscaping Services Dallas"). "for" is NOT a stop word.
${overlapNotes.length ? `\nSUBSTRING / OVERLAP RULES that apply here:\n${overlapNotes.join('\n')}\n` : ''}
HARD KEYWORD RULES:
- No keyword (PK/SK1/SK2) in ANY subheading (H2/H3/H4) — use a descriptive synonym, and never reuse another keyword from the list as the synonym.
- No keyword in image alt text. Never bold or italicize any keyword occurrence.
- Never use a keyword as link anchor text — use natural, descriptive anchors instead.

META (output these two labelled lines at the very top, before the H1):
- Meta Title: under 60 characters, includes the primary keyword + an angle modifier, unique vs. the parent service page.
- Meta Description: exactly 150–160 characters, declarative (not a question, not a keyword list), includes the primary keyword exactly 1×, unique vs. the parent service page.

HEADINGS, FORMATTING & LENGTH:
- H1 holds the PK once (natural + angle modifier). Capitalize the first word of every heading. No bold (**) inside any heading.
- Em-dashes (—) get a space on both sides. No non-breaking spaces (&nbsp;). Put a blank line between every paragraph and every bullet/list item.
- Do not exceed the parent service page's word count — keep the blog concise and focused.`.trim();
}

function buildLinksContext(internalLinks: LinkEntry[], externalLinks: LinkEntry[], siteUrl: string): string {
  const validInternal = internalLinks
    .map((l) => extractUrl(l.url))
    .filter((u) => u !== '');
  const validExternal = externalLinks
    .map((l) => ({ url: extractUrl(l.url), label: extractLabel(l.url, extractUrl(l.url)) || l.label || '' }))
    .filter((l) => l.url !== '');

  const homepage = `https://${siteUrl}`;
  const il1 = validInternal.find((u) => {
    try { return new URL(u.startsWith('http') ? u : `https://${siteUrl}${u.startsWith('/') ? u : '/' + u}`).pathname.replace(/\/$/, '') !== ''; }
    catch { return true; }
  }) || validInternal[0] || '';
  const il1Full = il1 ? (il1.startsWith('http') ? il1 : `https://${siteUrl}${il1.startsWith('/') ? il1 : '/' + il1}`) : '';

  const externalList = validExternal.length
    ? validExternal.slice(0, 2).map((l, i) => `  EL${i + 1}. ${l.url}${l.label ? ` (${l.label})` : ''}`).join('\n')
    : '  None provided — add 2 authoritative, relevant sources (industry publications, government sites, recognized tools, research studies). Link to specific pages, never to Google.com or a Wikipedia homepage.';

  return `LINKS — EXACTLY 2 INTERNAL + EXACTLY 2 EXTERNAL (no more, no fewer):

INTERNAL LINK 1 (IL1) → assigned service page: ${il1Full || '(not provided)'}
INTERNAL LINK 2 (IL2) → homepage: ${homepage}

EXTERNAL LINKS (exactly 2, authoritative & relevant):
${externalList}

EXTERNAL LINK STYLE — INVISIBLE CITATIONS:
- Weave every external link into existing sentence text naturally. The reader must not be able to tell a citation is happening — the link should feel like part of the writing, not a reference.
- NEVER introduce a link with "According to [source]", "In a study by [source]", "As noted by [source]", or any similar source-attribution phrasing.
- The anchor text must be words already natural to the sentence — never the name of the publication or organization.
  Bad: "According to Lawn & Landscape Magazine, professional lawn care improves property values."
  Good: "Investing in professional lawn care has become one of the [most reliable ways](url) for homeowners to boost curb appeal." (anchor = "most reliable ways")

LINK ANCHOR RULES:
- Anchor text must be natural and descriptive — describe what the reader will find or learn.
- NEVER use a keyword (PK/SK1/SK2) as anchor text, and never use generic CTAs like "Click here" or "Learn more".
- Format every link as markdown [descriptive anchor](url) and keep each URL exactly as given.
- Do not add any internal or external links beyond these 4.`;
}

const MagicBlog = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [wordCount, setWordCount] = useState('800');
  const [blogCount, setBlogCount] = useState('1');
  const [keywords, setKeywords] = useState('');
  const [audience, setAudience] = useState('');
  const [searchIntent, setSearchIntent] = useState('Informational');
  const [h2Outline, setH2Outline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [airtableStatus, setAirtableStatus] = useState<'idle' | 'logging' | 'logged' | 'failed'>('idle');
  const [linkManagerOpen, setLinkManagerOpen] = useState(true);

  // ── Link state ──────────────────────────────────────────────────────────────
  const [internalLinks, setInternalLinks] = useState<LinkEntry[]>([{ id: 1, url: '', label: '' }]);
  const [externalLinks, setExternalLinks] = useState<LinkEntry[]>([{ id: 1, url: '', label: '' }]);

  const addInternalLink = () => {
    if (internalLinks.length >= 8) return;
    setInternalLinks((p) => [...p, { id: Date.now(), url: '', label: '' }]);
  };
  const removeInternalLink = (id: number) => {
    if (internalLinks.length === 1) return;
    setInternalLinks((p) => p.filter((l) => l.id !== id));
  };
  const updateInternalLink = (id: number, field: 'url' | 'label', value: string) => {
    setInternalLinks((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const addExternalLink = () => {
    if (externalLinks.length >= 4) return;
    setExternalLinks((p) => [...p, { id: Date.now(), url: '', label: '' }]);
  };
  const removeExternalLink = (id: number) => {
    if (externalLinks.length === 1) return;
    setExternalLinks((p) => p.filter((l) => l.id !== id));
  };
  const updateExternalLink = (id: number, field: 'url' | 'label', value: string) => {
    setExternalLinks((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  // ── Keyword state ────────────────────────────────────────────────────────────
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [primaryKeywordInput, setPrimaryKeywordInput] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState<SecondaryKeyword[]>([]);
  const [secondaryKeywordInput, setSecondaryKeywordInput] = useState('');
  const [kwSidebarOpen, setKwSidebarOpen] = useState(true);

  // ── Cross-blog keyword cannibalization guard ─────────────────────────────────
  const [conflictModal, setConflictModal] = useState<KeywordConflictResult | null>(null);
  const [pendingGenerateFn, setPendingGenerateFn] = useState<(() => Promise<void>) | null>(null);

  const checkKeywordConflicts = async (
    primaryKw: string,
    secondaryKws: string[],
    excludeRecordId?: string,
  ): Promise<KeywordConflictResult | null> => {
    const clientId = getActiveClientId();
    if (!clientId) return null;
    try {
      const res = await apiFetch(`${API_BASE}/api/ai/blog/check-keyword-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          clientId,
          orgId: localStorage.getItem('orgId'),
          primaryKeyword: primaryKw,
          secondaryKeywords: secondaryKws.filter(Boolean),
          excludeRecordId,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as KeywordConflictResult;
    } catch {
      return null; // dedup is best-effort — never block generation on a check failure
    }
  };

  // Hard cap: 1 primary + 2 secondary = 3 keywords max per blog (anti-cannibalization).
  const totalKeywordCount = (primaryKeyword ? 1 : 0) + secondaryKeywords.length;
  const totalKwColor = totalKeywordCount === 0 ? 'rgba(255,255,255,0.35)' : totalKeywordCount === 3 ? '#6b8f3e' : 'rgba(255,255,255,0.85)';

  const addPrimaryKeyword = () => {
    const t = primaryKeywordInput.trim();
    if (!t || primaryKeyword) return;
    setPrimaryKeyword(t);
    setPrimaryKeywordInput('');
  };
  const removePrimaryKeyword = () => setPrimaryKeyword('');
  const addSecondaryKeyword = () => {
    const t = secondaryKeywordInput.trim();
    if (!t || secondaryKeywords.length >= 2) return;
    setSecondaryKeywords((p) => [...p, { id: Date.now(), keyword: t }]);
    setSecondaryKeywordInput('');
  };
  const removeSecondaryKeyword = (id: number) => setSecondaryKeywords((p) => p.filter((k) => k.id !== id));
  const clearAllKeywords = () => {
    if (window.confirm('Clear all keywords? This cannot be undone.')) {
      setPrimaryKeyword(''); setPrimaryKeywordInput(''); setSecondaryKeywords([]); setSecondaryKeywordInput('');
    }
  };

  // ── Blog Tracker (Airtable) state ────────────────────────────────────────────
  const [trackerBlogs, setTrackerBlogs] = useState<AirtableBlogRecord[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerError, setTrackerError] = useState('');
  const [selectedTracker, setSelectedTracker] = useState<AirtableBlogRecord | null>(null);
  const [trackerUpdateStatus, setTrackerUpdateStatus] = useState<'idle' | 'picking' | 'updating' | 'done' | 'failed'>('idle');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>('Not Started');
  const [outlineStatusFilter, setOutlineStatusFilter] = useState<string>('All');

  const fetchTrackerBlogs = async () => {
    const clientId = getActiveClientId();
    if (!clientId) {
      setTrackerError('No active client selected. Pick a client from /clients to use the tracker.');
      setTrackerLoading(false);
      setTrackerBlogs([]);
      return;
    }
    setTrackerLoading(true);
    setTrackerError('');
    try {
      const params = new URLSearchParams({ clientId });
      if (trackerStatusFilter && trackerStatusFilter !== 'All') {
        params.set('status', trackerStatusFilter);
      }
      const res = await apiFetch(`${API_BASE}/api/airtable/fetch-blogs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        let records = data.records || [];
        // Client-side filter for Blog Outline Status
        if (outlineStatusFilter !== 'All') {
          records = records.filter((r: AirtableBlogRecord) => (r.fields['Blog Outline Status'] || '') === outlineStatusFilter);
        }
        setTrackerBlogs(records);
      }
      else setTrackerError(data.error || 'Failed to fetch');
    } catch { setTrackerError('Network error fetching blogs'); }
    finally { setTrackerLoading(false); }
  };

  useEffect(() => { fetchTrackerBlogs(); }, [trackerStatusFilter, outlineStatusFilter]);

  const selectTrackerBlog = async (record: AirtableBlogRecord) => {
    setSelectedTracker(record);
    // Only mark as In Progress if currently "Not Started"
    const status = record.fields['Blog Status'];
    if (!status || status === 'Not Started') {
      const clientId = getActiveClientId();
      if (!clientId) return;
      try {
        await apiFetch(`${API_BASE}/api/airtable/mark-progress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, recordId: record.id }),
        });
      } catch { /* best effort */ }
    }
  };

  const writeSelectedBlog = async () => {
    if (!selectedTracker) return;
    const f = selectedTracker.fields;
    const blogTitle = f['Blog Title (Topic)'] || '';
    const pk = f['Primary Keyword'] || '';
    const sk1 = f['Secondary Keyword 1'] || '';
    const sk2 = f['Secondary Keyword 2'] || '';
    const il1 = f['Internal Link 1'] || '';
    const il2 = f['Internal Link 2'] || '';
    const el1 = f['External Link 1'] || '';
    const el2 = f['External Link 2'] || '';
    const blogOutline = f['Blog Outline'] || '';

    // Pre-fill sidebar fields
    setTopic(blogTitle);
    if (pk) { setPrimaryKeyword(pk); setPrimaryKeywordInput(''); }
    const newSecondary: SecondaryKeyword[] = [];
    if (sk1) newSecondary.push({ id: Date.now(), keyword: sk1 });
    if (sk2) newSecondary.push({ id: Date.now() + 1, keyword: sk2 });
    if (newSecondary.length > 0) setSecondaryKeywords(newSecondary);

    const newInternalLinks: LinkEntry[] = [];
    if (il1) newInternalLinks.push({ id: Date.now() + 10, url: il1, label: '' });
    if (il2) newInternalLinks.push({ id: Date.now() + 11, url: il2, label: '' });
    if (newInternalLinks.length > 0) setInternalLinks(newInternalLinks);
    else setInternalLinks([{ id: 1, url: '', label: '' }]);

    const newExternalLinks: LinkEntry[] = [];
    if (el1) newExternalLinks.push({ id: Date.now() + 20, url: el1, label: '' });
    if (el2) newExternalLinks.push({ id: Date.now() + 21, url: el2, label: '' });
    if (newExternalLinks.length > 0) setExternalLinks(newExternalLinks);
    else setExternalLinks([{ id: 1, url: '', label: '' }]);

    // Build content brief using SEO Checklist v2 helpers
    const kwContext = pk ? buildBlogKeywordsContext(pk, newSecondary, PK_TOTAL_TARGET, SK_BODY_TARGET) : '';
    const linksContext = buildLinksContext(newInternalLinks, newExternalLinks, brandSiteUrl);
    const hasLinks = newInternalLinks.some(l => l.url.trim()) || newExternalLinks.some(l => l.url.trim());

    const promptParts = [
      `CONTENT BRIEF`,
      ``,
      `**Blog Title (use this EXACTLY as the H1 — do not rewrite or paraphrase it):** ${blogTitle}`,
      `\nIMPORTANT: The H1 must be exactly: "${blogTitle}" — do not change, rephrase, or rewrite it under any circumstances.\n`,
      pk ? `**Primary keyword:** ${pk}` : null,
      newSecondary.length ? `**Secondary keywords:** ${newSecondary.map(k => k.keyword).join(', ')}` : null,
      blogOutline.trim() ? `\n**REQUIRED H2 OUTLINE:**\n${blogOutline}` : null,
      kwContext ? `\n${kwContext}` : null,
      hasLinks ? `\n${linksContext}` : null,
      hasLinks ? `\nLINKING INSTRUCTIONS:\n- Use ALL internal links provided. Spread them across the blog — do not cluster them together.\n- Use varied anchor text for every internal link. Never repeat the same anchor text twice.\n- Use ALL external links provided. Reference them naturally when citing facts, tips, or statistics.\n- Format all links as proper markdown links: [anchor text](url)` : null,
      `\nWrite the full article now following the system prompt rules.`,
    ].filter(Boolean).join('\n');

    const proceedWithGeneration = async () => {
      // Lock the H1 to the Airtable blog title so the SEO rewrite loop won't rewrite it.
      fixedH1Ref.current = blogTitle;
      // Clear chat and start generation
      setMessages([]);
      historyRef.current = [];
      setAuditOpen(true);
      await sendMessage(promptParts);
    };

    // Anti-cannibalization: check the new keywords against already-written blogs
    // for this client before generating. Exclude this tracker row when rewriting.
    const conflicts = await checkKeywordConflicts(pk, newSecondary.map(k => k.keyword), selectedTracker.id);
    if (conflicts?.primaryConflict) {
      setConflictModal(conflicts);
      setPendingGenerateFn(() => proceedWithGeneration); // blocking modal — wait for user
      return;
    }
    if (conflicts?.secondaryOverlaps?.length) {
      setConflictModal(conflicts); // non-blocking banner — generation still proceeds
    }
    await proceedWithGeneration();
  };

  const addToAirtableTracker = async (status: 'Created' | 'Posted') => {
    if (!selectedTracker || !lastAssistantMsg) return;
    setTrackerUpdateStatus('updating');
    try {
      const clientId = getActiveClientId();
      if (!clientId) {
        setTrackerUpdateStatus('failed');
        setTimeout(() => setTrackerUpdateStatus('idle'), 4000);
        return;
      }
      const res = await apiFetch(`${API_BASE}/api/airtable/update-blog`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recordId: selectedTracker.id,
          blogContent: lastAssistantMsg.content,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTrackerUpdateStatus('done');
        setTimeout(() => { setTrackerUpdateStatus('idle'); setSelectedTracker(null); fetchTrackerBlogs(); }, 4000);
      } else {
        setTrackerUpdateStatus('failed');
        setTimeout(() => setTrackerUpdateStatus('idle'), 4000);
      }
    } catch {
      setTrackerUpdateStatus('failed');
      setTimeout(() => setTrackerUpdateStatus('idle'), 4000);
    }
  };

  // ── Meta state ──────────────────────────────────────────────────────────────
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);

  // ── Keyword + link refs (for access inside callbacks) ──────────────────────
  const primaryKeywordRef = useRef(primaryKeyword);
  const secondaryKeywordsRef = useRef(secondaryKeywords);
  const internalLinksRef = useRef(internalLinks);
  const externalLinksRef = useRef(externalLinks);
  // Locked H1 for the tracker flow (writeSelectedBlog) — undefined in the manual flow.
  const fixedH1Ref = useRef<string | undefined>(undefined);
  useEffect(() => { primaryKeywordRef.current = primaryKeyword; }, [primaryKeyword]);
  useEffect(() => { secondaryKeywordsRef.current = secondaryKeywords; }, [secondaryKeywords]);
  useEffect(() => { internalLinksRef.current = internalLinks; }, [internalLinks]);
  useEffect(() => { externalLinksRef.current = externalLinks; }, [externalLinks]);

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [auditOpen, setAuditOpen] = useState(true);
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

  // ── Helper: stream a single Claude response, return the full text ───────────
  const streamOnce = useCallback(async (history: Message[], showInChat: boolean): Promise<string> => {
    let fullText = '';
    if (showInChat) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/ai/blog/chat`, {
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
          if (data.text) {
            fullText += data.text;
            if (showInChat) {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u; });
            }
          }
        } catch { /* partial */ }
      }
    }
    return fullText;
  }, []);

  // ── Auto-generate meta title & description ──────────────────────────────────
  const generateMeta = useCallback(async (_blogContent: string, history: Message[]) => {
    setIsGeneratingMeta(true);
    setMetaTitle('');
    setMetaDescription('');
    try {
      const pk = primaryKeywordRef.current;
      const metaPrompt = `Based on the blog post you just wrote, generate:

1. A Meta Title — must be:
   - Under 60 characters
   - Include the primary keyword "${pk}" naturally
   - Compelling and click-worthy
   - No quotes around it

2. A Meta Description — must be:
   - Under 160 characters
   - Include the primary keyword "${pk}" naturally
   - Summarize the blog value clearly
   - End with a call to action (e.g. "Learn more.", "Get started today.", "Find out how.")
   - No quotes around it

Respond in this exact format and nothing else:
META_TITLE: [title here]
META_DESCRIPTION: [description here]`;

      const metaHistory: Message[] = [...history, { role: 'user', content: metaPrompt }];
      const metaResponse = await streamOnce(metaHistory, false);

      // Parse response
      const titleMatch = metaResponse.match(/META_TITLE:\s*(.+)/i);
      const descMatch = metaResponse.match(/META_DESCRIPTION:\s*(.+)/i);
      if (titleMatch) setMetaTitle(titleMatch[1].trim());
      if (descMatch) setMetaDescription(descMatch[1].trim());
    } catch (err) {
      console.error('Meta generation failed:', err);
    } finally {
      setIsGeneratingMeta(false);
    }
  }, [streamOnce]);

  // ── SEO Checklist v2 — keyword validation (stop-word-aware, Rules A/B/C) ────
  const findOffTargetKeywords = (text: string, primaryKw: string, secondaryKws: SecondaryKeyword[]): { keyword: string; count: number; target: number; direction: string }[] => {
    const out: { keyword: string; count: number; target: number; direction: string }[] = [];
    const report = seoAnalyzeKeywords(text, primaryKw, secondaryKws.map(k => k.keyword));
    if (primaryKw) {
      const pkTotal = report.pkH1 + report.pkBody;
      if (report.pkH1 !== PK_H1_TARGET || report.pkBody !== PK_BODY_TARGET || report.pkSub > 0) {
        out.push({ keyword: primaryKw, count: pkTotal, target: PK_TOTAL_TARGET, direction: pkTotal < PK_TOTAL_TARGET ? 'too_few' : 'too_many' });
      }
    }
    for (const r of report.secondaries) {
      if (r.presence !== SK_BODY_TARGET || r.inSub > 0) {
        out.push({ keyword: r.keyword, count: r.presence, target: SK_BODY_TARGET, direction: r.presence < SK_BODY_TARGET ? 'too_few' : 'too_many' });
      }
    }
    return out;
  };

  // ── 3-pass rewrite prompt — covers keywords, headings, links, meta, formatting ──
  const buildRewritePrompt = (blogText: string, primaryKw: string, secondaryKws: SecondaryKeyword[], _internals: LinkEntry[], _externals: LinkEntry[], fixedH1?: string): string | null => {
    const secStrings = secondaryKws.map(k => k.keyword.trim()).filter(Boolean);
    const report = seoAnalyzeKeywords(blogText, primaryKw, secStrings);

    const kwFixes: string[] = [];
    if (primaryKw) {
      if (fixedH1) {
        // H1 is fixed (the Airtable blog title) — never touch it; keep the primary
        // keyword in the body instead of forcing it into the H1.
        if (report.pkBody < 1) kwFixes.push(`The H1 must remain exactly: "${fixedH1}" — do not change it. Instead, ensure the primary keyword "${primaryKw}" appears naturally in the body.`);
        else if (report.pkBody > 2) kwFixes.push(`The body mentions "${primaryKw}" ${report.pkBody}× — reduce to 1–2 (do NOT change the H1, which must stay "${fixedH1}").`);
      } else {
        if (report.pkH1 < PK_H1_TARGET) kwFixes.push(`Add the primary keyword "${primaryKw}" to the H1 exactly once, integrated naturally with an angle modifier (do not jam it at the front).`);
        else if (report.pkH1 > PK_H1_TARGET) kwFixes.push(`The H1 mentions "${primaryKw}" ${report.pkH1}× — keep it exactly once.`);
        if (report.pkBody < PK_BODY_TARGET) kwFixes.push(`Add exactly one standalone body mention of "${primaryKw}" inside a paragraph — it must stand on its own, not embedded inside a longer phrase (Rule A).`);
        else if (report.pkBody > PK_BODY_TARGET) kwFixes.push(`The body mentions "${primaryKw}" ${report.pkBody}× — reduce to exactly 1 (replace extras with pronouns or natural synonyms, never another keyword from the list).`);
      }
      if (report.pkSub > 0) kwFixes.push(`"${primaryKw}" appears in a subheading — remove it there and use a descriptive synonym.`);
    }
    for (const r of report.secondaries) {
      if (r.inSub > 0) kwFixes.push(`The keyword "${r.keyword}" appears in a subheading — replace it there with a natural synonym (never another keyword).`);
      if (r.presence < SK_BODY_TARGET) {
        kwFixes.push(`Add the secondary keyword "${r.keyword}" exactly once in the body, verbatim, in a natural sentence.`);
      } else if (r.presence > SK_BODY_TARGET) {
        if (r.coveredBy.length > 0) kwFixes.push(`"${r.keyword}" is already covered by "${r.coveredBy[0]}" and also appears on its own — remove the standalone occurrence(s) so it appears only once in total (replace with a synonym).`);
        else if (r.inAnchor >= 2) kwFixes.push(`"${r.keyword}" is used as anchor text in two links — change ONE anchor's visible text to a natural synonym (keep its URL) so the keyword is used only once.`);
        else kwFixes.push(`"${r.keyword}" appears ${r.presence}× — reduce to exactly 1 (replace extras with synonyms, never another keyword).`);
      }
    }

    let headingFixes = seoHeadingIssues(blogText, primaryKw, secStrings);
    // When the H1 is locked, drop the "integrate the PK into the H1" heading note.
    if (fixedH1) headingFixes = headingFixes.filter(h => !/^H1 leads with the primary keyword/.test(h));
    const linkFixes = seoLinkIssues(blogText, brandSiteUrl, [primaryKw, ...secStrings].filter(Boolean));
    const metaFixes = seoMetaIssues(blogText, primaryKw);
    const formatFixes = seoFormatIssues(blogText, primaryKw, secStrings);

    const ATTRIBUTION_RE = /\b(according to|in a study by|as (?:noted|reported|stated|mentioned|observed|shown|found) by|per (?:a|an|the)\b|research (?:by|from)|a (?:study|report|survey) (?:by|from)|cited by|sources? (?:say|report))\b/i;
    const externalStyleFixes: string[] = [];
    for (const l of seoExtractAnchors(blogText)) {
      const isInternal = l.url.startsWith('/') || l.url.includes(brandSiteUrl);
      if (isInternal || !/^https?:\/\//i.test(l.url)) continue;
      const at = blogText.indexOf(`[${l.text}](${l.url})`);
      const before = at >= 0 ? blogText.slice(Math.max(0, at - 80), at) : '';
      if (ATTRIBUTION_RE.test(before)) {
        externalStyleFixes.push(`The external link "${l.text}" is introduced with source-attribution phrasing — rewrite the sentence so the citation is invisible: drop the lead-in and make the anchor words that already belong to the sentence (not the publication or organization name).`);
      }
    }
    if (externalStyleFixes.length === 0 && ATTRIBUTION_RE.test(blogText)) {
      externalStyleFixes.push('Remove every source-attribution lead-in ("According to [source]", "In a study by [source]", "As noted by [source]", and similar) — external links must read as part of the sentence, not as references.');
    }

    const sections: string[] = [];
    if (kwFixes.length) sections.push(`KEYWORD PLACEMENT:\n${kwFixes.map(s => `- ${s}`).join('\n')}`);
    if (headingFixes.length) sections.push(`HEADINGS:\n${headingFixes.map(s => `- ${s}`).join('\n')}`);
    if (linkFixes.length) sections.push(`LINKS:\n${linkFixes.map(s => `- ${s}`).join('\n')}`);
    if (externalStyleFixes.length) sections.push(`EXTERNAL LINK STYLE:\n${externalStyleFixes.map(s => `- ${s}`).join('\n')}`);
    if (metaFixes.length) sections.push(`META:\n${metaFixes.map(s => `- ${s}`).join('\n')}`);
    if (formatFixes.length) sections.push(`FORMATTING:\n${formatFixes.map(s => `- ${s}`).join('\n')}`);

    if (sections.length === 0) return null;

    const kwRule = fixedH1
      ? `Keep the H1 exactly as "${fixedH1}" — never rewrite it; the primary keyword belongs in the body (not forced into the H1), and each secondary keyword 1× in the body only.`
      : `keep total keyword mentions at exactly ${2 + secStrings.length} (PK 1× in H1 + 1× in body; each secondary 1× in body only).`;
    return `The draft violates the SEO Checklist v2. Fix every item below, then output the COMPLETE rewritten blog in Markdown.\n\n${sections.join('\n\n')}\n\nConstraints while fixing: ${kwRule} Never place a keyword in a subheading or as link anchor text. Weave external links invisibly into the prose — no source-attribution phrasing ("According to…", "In a study by…", "As noted by…"), and the anchor text must be words already natural to the sentence, never a publication or organization name. Use natural synonyms for any replacement — never reuse another keyword from the list. Keep em-dashes spaced ( — ), separate every paragraph and bullet with a blank line, and do not exceed the parent service page's word count.`;
  };

  // ── Main stream + enforce keyword density ──────────────────────────────────
  const streamResponse = useCallback(async (history: Message[]) => {
    setIsStreaming(true);
    setIsOptimizing(false);
    let fullText = '';
    try {
      fullText = await streamOnce(history, true);
    } catch (err: unknown) {
      fullText = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u; });
      setIsStreaming(false);
      historyRef.current = [...history, { role: 'assistant', content: fullText }];
      setMessages(historyRef.current);
      return;
    }

    // 3-pass SEO validation loop — buildRewritePrompt covers keywords, headings,
    // links (exactly 2 internal + 2 external), invisible citations, meta, formatting.
    let currentHistory: Message[] = [...history, { role: 'assistant' as const, content: fullText }];
    const MAX_REWRITE_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_REWRITE_ATTEMPTS; attempt++) {
      console.log(`[rewrite-loop] attempt ${attempt}/${MAX_REWRITE_ATTEMPTS}`, {
        offTarget: findOffTargetKeywords(fullText, primaryKeywordRef.current, secondaryKeywordsRef.current),
      });
      const rewritePrompt = buildRewritePrompt(
        fullText,
        primaryKeywordRef.current,
        secondaryKeywordsRef.current,
        internalLinksRef.current,
        externalLinksRef.current,
        fixedH1Ref.current
      );
      if (!rewritePrompt) break;

      setIsOptimizing(true);
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: 'assistant', content: `_Fixing SEO issues... (attempt ${attempt})_` };
        return u;
      });

      const fixHistory: Message[] = [...currentHistory, { role: 'user', content: rewritePrompt }];
      try {
        fullText = await streamOnce(fixHistory, true);
        currentHistory = [...fixHistory, { role: 'assistant' as const, content: fullText }];
      } catch { break; }
    }

    setIsOptimizing(false);
    setIsStreaming(false);
    historyRef.current = currentHistory;
    setMessages(currentHistory);

    // Auto-generate meta title & description after blog is finalized
    if (fullText && !fullText.startsWith('Error:')) {
      generateMeta(fullText, currentHistory);
    }
  }, [streamOnce, generateMeta]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newHistory = [...historyRef.current, userMsg];
    setMessages(newHistory);
    await streamResponse(newHistory);
  }, [isStreaming, streamResponse]);

  const generatePost = async () => {
    if (!topic.trim()) { alert('Please enter a blog topic.'); return; }
    const linksContext = buildLinksContext(internalLinks, externalLinks, brandSiteUrl);
    const hasLinks = internalLinks.some((l) => l.url.trim()) || externalLinks.some((l) => l.url.trim());
    const kwContext = buildBlogKeywordsContext(primaryKeyword, secondaryKeywords, PK_TOTAL_TARGET, SK_BODY_TARGET);

    const h2Lines = h2Outline.trim()
      ? h2Outline.split('\n').filter(l => l.trim()).map((l, i) => `${i + 1}. ${l.trim().replace(/^\d+[\.\)]\s*/, '')}`).join('\n')
      : '';

    const prompt = [
      `CONTENT BRIEF`,
      ``,
      `**Topic:** ${topic}`,
      primaryKeyword ? `**Primary keyword:** ${primaryKeyword}` : null,
      secondaryKeywords.some(k => k.keyword.trim()) ? `**Secondary keywords:** ${secondaryKeywords.map(k => k.keyword).filter(Boolean).join(', ')}` : null,
      keywords ? `**Additional keywords:** ${keywords}` : null,
      `**Search intent:** ${searchIntent}`,
      `**Tone:** ${tone}`,
      `**Target word count:** ${wordCount} per blog`,
      parseInt(blogCount) > 1 ? `**Number of blog posts to write:** ${blogCount} (write ${blogCount} separate, complete blog posts on this topic — each with a unique angle, unique title, and unique H2 structure. Separate each blog with a horizontal rule ---)` : null,
      audience ? `**Target audience:** ${audience}` : null,
      h2Lines ? `\n**REQUIRED H2 OUTLINE:**\n${h2Lines}` : null,
      kwContext ? `\n${kwContext}` : null,
      hasLinks ? `\n${linksContext}` : null,
      hasLinks ? `\nLINKING INSTRUCTIONS:\n- Use ALL internal links provided. Spread them across the blog — do not cluster them together.\n- Use varied anchor text for every internal link. Never repeat the same anchor text twice.\n- Use ALL external links provided. Reference them naturally when citing facts, tips, or statistics.\n- Format all links as proper markdown links: [anchor text](url)` : null,
      `\nWrite the full article now following the system prompt rules.`,
    ].filter(Boolean).join('\n');

    const proceedWithGeneration = async () => {
      // Manual flow — no locked H1 (Claude composes its own title).
      fixedH1Ref.current = undefined;
      setAuditOpen(true);
      await sendMessage(prompt);
    };

    // Anti-cannibalization: check keywords against already-written blogs first.
    const conflicts = await checkKeywordConflicts(primaryKeyword, secondaryKeywords.map(k => k.keyword));
    if (conflicts?.primaryConflict) {
      setConflictModal(conflicts);
      setPendingGenerateFn(() => proceedWithGeneration);
      return;
    }
    if (conflicts?.secondaryOverlaps?.length) {
      setConflictModal(conflicts);
    }
    await proceedWithGeneration();
  };

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.length > 50);

  const logToAirtable = async (blogContent: string, topicKeyword: string) => {
    const clientId = getActiveClientId();
    if (!clientId) {
      setAirtableStatus('failed');
      setTimeout(() => setAirtableStatus('idle'), 4000);
      return false;
    }
    const titleMatch = blogContent.match(/^#\s+(.+)$/m) || blogContent.match(/^##\s+(.+)$/m);
    const blogTitle = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : topic || 'Untitled Post';

    setAirtableStatus('logging');
    try {
      const res = await apiFetch(`${API_BASE}/api/airtable/log-blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          blogTitle,
          blogContent,
          primaryKeyword: topicKeyword || primaryKeyword || '',
          secondaryKeyword1: secondaryKeywords[0]?.keyword,
          secondaryKeyword2: secondaryKeywords[1]?.keyword,
          internalLink1: internalLinks[0]?.url,
          internalLink2: internalLinks[1]?.url,
          externalLink1: externalLinks[0]?.url,
          externalLink2: externalLinks[1]?.url,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          status: 'Created',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAirtableStatus('logged');
        setTimeout(() => setAirtableStatus('idle'), 4000);
        return true;
      } else {
        setAirtableStatus('failed');
        setTimeout(() => setAirtableStatus('idle'), 4000);
        return false;
      }
    } catch (err) {
      console.error('Failed to log to Airtable:', err);
      setAirtableStatus('failed');
      setTimeout(() => setAirtableStatus('idle'), 4000);
      return false;
    }
  };

  const saveBlog = async () => {
    if (!lastAssistantMsg) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const blogContent = lastAssistantMsg.content;
      const titleMatch = blogContent.match(/^#\s+(.+)$/m) || blogContent.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : topic || 'Untitled Blog Post';

      const allKeywords = [primaryKeyword, ...secondaryKeywords.map(k => k.keyword)].filter(Boolean);
      const wc = blogContent.split(/\s+/).length;

      const clientId = getActiveClientId();
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');
      if (!orgId) throw new Error('No active organization');
      // Org-scoped route: POST /api/orgs/:orgId/blog-posts (auth + resolveOrg).
      const res = await fetch(`${API_BASE}/api/orgs/${orgId}/blog-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content: blogContent,
          topic,
          tone,
          wordCount: wc,
          keywords: allKeywords,
          clientId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Save blog error:', res.status, errData);
        throw new Error(errData.message || `Failed to save (${res.status})`);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      // Auto-log to Airtable after successful save
      logToAirtable(blogContent, primaryKeyword || topic);
    } catch (err) {
      console.error('Save blog failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Link audit ───────────────────────────────────────────────────────────────
  const auditLinks = lastAssistantMsg ? parseLinksFromText(lastAssistantMsg.content) : [];
  const validInternalUrls = internalLinks.filter((l) => l.url.trim()).map((l) => l.url.trim());
  const validExternalUrls = externalLinks.filter((l) => l.url.trim()).map((l) => l.url.trim());
  const internalFound = auditLinks.filter((l) => validInternalUrls.some((u) => l.href.includes(new URL(u.startsWith('http') ? u : 'https://' + u).hostname)));
  const externalFound = auditLinks.filter((l) => validExternalUrls.some((u) => l.href.includes(new URL(u.startsWith('http') ? u : 'https://' + u).hostname)));
  const showAudit = !isStreaming && lastAssistantMsg && (validInternalUrls.length > 0 || validExternalUrls.length > 0);

  // ── Keyword audit ─────────────────────────────────────────────────────────
  const showKwAudit = !isStreaming && lastAssistantMsg && (primaryKeyword || secondaryKeywords.length > 0);
  const uniqueSecondaryKws = [...new Set(secondaryKeywords.map(k => k.keyword).filter(Boolean))];
  const kwReport = lastAssistantMsg ? seoAnalyzeKeywords(lastAssistantMsg.content, primaryKeyword, uniqueSecondaryKws) : null;
  const primaryKwCount = kwReport ? kwReport.pkH1 + kwReport.pkBody : 0;
  const secondaryKwAudit = uniqueSecondaryKws.map((kw) => ({
    kw,
    count: kwReport?.secondaries.find(s => s.keyword === kw)?.presence ?? 0,
  }));

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Space Grotesk', sans-serif", background: '#0d1a0d', color: '#f0f4ee' }}>
      <style>{`
        .sidebar-scrollable::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollable::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollable::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.3); border-radius: 2px; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .form-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #f0f4ee; padding: 7px 10px; font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; }
        .form-input:focus { border-color: rgba(74,124,47,0.5); }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.45); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .section-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px; }
        .quick-btn { width: 100%; text-align: left; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; color: rgba(255,255,255,0.6); padding: 7px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .quick-btn:hover { background: rgba(74,124,47,0.12); border-color: rgba(74,124,47,0.3); color: #fff; }
        .msg-content h1,.msg-content h2,.msg-content h3 { color: #fff; margin: 12px 0 6px; }
        .msg-content h1 { font-size: 18px; } .msg-content h2 { font-size: 15px; } .msg-content h3 { font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-top: 16px; }
        .msg-content p { margin: 6px 0; line-height: 1.7; }
        .msg-content strong { color: #9ab897; }
        .msg-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0; }
        .msg-content .md-li { padding: 2px 0 2px 8px; line-height: 1.6; }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: typingBounce 1.2s ease-in-out infinite; }
        @keyframes typingBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tone-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; color: rgba(255,255,255,0.55); padding: 7px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; width: 100%; text-align: left; margin-bottom: 5px; }
        .tone-btn.active { background: rgba(74,124,47,0.12); border-color: rgba(74,124,47,0.35); color: #9ab897; }
        .wc-btn { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: rgba(255,255,255,0.5); padding: 5px 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .wc-btn.active { background: rgba(74,124,47,0.12); border-color: rgba(74,124,47,0.35); color: #9ab897; }
        .link-row-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; color: #f0f4ee; padding: 6px 8px; font-size: 12px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; min-width: 0; }
        .link-row-input:focus { border-color: rgba(74,124,47,0.45); }
        .link-add-btn { width: 100%; background: rgba(74,124,47,0.07); border: 1px dashed rgba(74,124,47,0.25); border-radius: 6px; color: rgba(74,124,47,0.8); padding: 6px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .link-add-btn:hover:not(:disabled) { background: rgba(74,124,47,0.14); border-color: rgba(74,124,47,0.45); color: #9ab897; }
        .link-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .link-remove-btn { background: none; border: none; color: rgba(255,255,255,0.25); cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1; flex-shrink: 0; transition: color 0.15s; }
        .link-remove-btn:hover { color: #f87171; }
        .audit-link-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .audit-link-row:last-child { border-bottom: none; }
        .kw-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .kw-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .kw-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.2); border-radius: 2px; }
        .kw-input-blog { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f0f4ee; padding: 6px 9px; font-size: 12px; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.15s; min-width: 0; }
        .kw-input-blog:focus { border-color: rgba(74,124,47,0.5); }
        .kw-input-blog:disabled { opacity: 0.4; cursor: not-allowed; }
        .kw-add-blog { background: rgba(74,124,47,0.15); border: 1px solid rgba(74,124,47,0.3); border-radius: 6px; color: #9ab897; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
        .kw-add-blog:hover:not(:disabled) { background: rgba(74,124,47,0.25); }
        .kw-add-blog:disabled { opacity: 0.35; cursor: not-allowed; }
        .kw-chip-primary { display: inline-flex; align-items: center; gap: 5px; background: rgba(74,124,47,0.25); border: 1px solid rgba(74,124,47,0.45); border-radius: 999px; padding: 4px 14px; font-size: 12px; color: #9ab897; cursor: default; }
        .kw-chip-sec-blog { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 1px solid rgba(74,124,47,0.35); border-radius: 999px; padding: 3px 10px; font-size: 11px; color: rgba(74,124,47,0.8); margin: 3px; cursor: default; }
        .kw-chip-x { background: none; border: none; color: inherit; cursor: pointer; font-size: 13px; padding: 0; line-height: 1; opacity: 0.6; transition: opacity 0.15s; }
        .kw-chip-x:hover { opacity: 1; }
        .kw-progress-blog { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 4px; }
        .kw-progress-fill-blog { height: 100%; border-radius: 2px; transition: width 0.3s; background: linear-gradient(90deg, rgba(74,124,47,0.7), rgba(74,124,47,0.9)); }
        .clear-all-blog { width: 100%; background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.2); border-radius: 7px; color: rgba(248,113,113,0.7); padding: 7px 10px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .clear-all-blog:hover:not(:disabled) { background: rgba(248,113,113,0.13); color: #9ab897; }
        .clear-all-blog:disabled { opacity: 0.3; cursor: not-allowed; }
        select.form-input option { background: #0d1a0d; color: #f0f4ee; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ width: sidebarOpen ? 300 : 0, minWidth: sidebarOpen ? 300 : 0, background: '#0d1a0d', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.25s, min-width 0.25s', flexShrink: 0 }}>
        <div className="sidebar-scrollable" style={{ flex: 1, overflowY: 'auto', padding: sidebarOpen ? '0 0 24px' : 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: '#0d1a0d', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>&#9997;&#65039;</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Magic Blog</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>&lsaquo;</button>
          </div>

          <div style={{ padding: '16px 14px 0' }}>
            {/* ── Post Setup ── */}
            <p className="section-label">Post Setup</p>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Blog Topic / Title</label>
              <input className="form-input" type="text" placeholder="e.g. How to Prep Your Lawn for Spring" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Tone</label>
              {TONES.map((t) => (
                <button key={t} className={`tone-btn${tone === t ? ' active' : ''}`} onClick={() => setTone(t)}>{t}</button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Target Word Count</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {WORD_COUNTS.map((wc) => (
                  <button key={wc} className={`wc-btn${wordCount === wc ? ' active' : ''}`} onClick={() => setWordCount(wc)}>
                    {parseInt(wc) >= 1000 ? `${parseInt(wc) / 1000}k` : wc}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Number of Blogs</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {BLOG_COUNTS.map((bc) => (
                  <button key={bc} className={`wc-btn${blogCount === bc ? ' active' : ''}`} onClick={() => setBlogCount(bc)}>
                    {bc}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Target Keywords <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" type="text" placeholder="e.g. lawn care tips, landscape design" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Target Audience <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" type="text" placeholder="e.g. homeowners planning seasonal yard care or a landscape refresh" value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Search Intent</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Informational', 'Commercial', 'Transactional'].map((si) => (
                  <button key={si} className={`tone-btn${searchIntent === si ? ' active' : ''}`} onClick={() => setSearchIntent(si)}>{si}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">H2 Outline <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional — one per line)</span></label>
              <textarea
                className="form-input"
                rows={4}
                placeholder={"Spring Lawn Care Essentials\nWhy Professional Landscaping Adds Home Value\nChoosing the Right Landscaper\nWhat to Expect During a Landscape Consultation"}
                value={h2Outline}
                onChange={(e) => setH2Outline(e.target.value)}
                style={{ resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            {/* ── Link Manager ── */}
            <div style={{ background: 'rgba(74,124,47,0.05)', border: '1px solid rgba(74,124,47,0.18)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
              {/* Link Manager header */}
              <button
                onClick={() => setLinkManagerOpen((v) => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(74,124,47,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Link Manager</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{linkManagerOpen ? '\u25B2' : '\u25BC'}</span>
              </button>

              {linkManagerOpen && (
                <div style={{ padding: '0 12px 14px' }}>

                  {/* Internal Links */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Internal Links</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, margin: '0 0 8px' }}>
                      Add links back to your city landing pages. The AI will weave these into the blog naturally with varied anchor text.
                    </p>

                    {internalLinks.map((link) => (
                      <div key={link.id} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3 }}>
                          <input
                            className="link-row-input"
                            style={{ flex: 1 }}
                            type="text"
                            placeholder="https://yoursite.com/landscape-design"
                            value={link.url}
                            onChange={(e) => updateInternalLink(link.id, 'url', e.target.value)}
                          />
                          <button className="link-remove-btn" onClick={() => removeInternalLink(link.id)} title="Remove">&times;</button>
                        </div>
                        <input
                          className="link-row-input"
                          style={{ width: '100%' }}
                          type="text"
                          placeholder="Landscape Design Services Page"
                          value={link.label}
                          onChange={(e) => updateInternalLink(link.id, 'label', e.target.value)}
                        />
                      </div>
                    ))}

                    <button className="link-add-btn" onClick={addInternalLink} disabled={internalLinks.length >= 8} style={{ marginTop: 4 }}>
                      + Add Internal Link {internalLinks.length >= 8 ? '(max 8)' : `(${internalLinks.length}/8)`}
                    </button>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '5px 0 0', fontStyle: 'italic' }}>
                      Only the first service-page link and the homepage link will be used (2 total).
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }} />

                  {/* External Links */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>External Links</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, margin: '0 0 8px' }}>
                      Add authoritative external sources. The AI will reference these naturally within the blog content.
                    </p>

                    {externalLinks.map((link) => (
                      <div key={link.id} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3 }}>
                          <input
                            className="link-row-input"
                            style={{ flex: 1 }}
                            type="text"
                            placeholder="https://www.landscapingnetwork.com/"
                            value={link.url}
                            onChange={(e) => updateExternalLink(link.id, 'url', e.target.value)}
                          />
                          <button className="link-remove-btn" onClick={() => removeExternalLink(link.id)} title="Remove">&times;</button>
                        </div>
                        <input
                          className="link-row-input"
                          style={{ width: '100%' }}
                          type="text"
                          placeholder="Landscaping Network Resource"
                          value={link.label}
                          onChange={(e) => updateExternalLink(link.id, 'label', e.target.value)}
                        />
                      </div>
                    ))}

                    <button className="link-add-btn" onClick={addExternalLink} disabled={externalLinks.length >= 4} style={{ marginTop: 4 }}>
                      + Add External Link {externalLinks.length >= 4 ? '(max 4)' : `(${externalLinks.length}/4)`}
                    </button>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '5px 0 0', fontStyle: 'italic' }}>
                      Add 1-2 external links to authoritative sources (government sites, industry associations, studies)
                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* Generate button */}
            <button onClick={generatePost} disabled={isStreaming} style={{ width: '100%', background: 'linear-gradient(135deg, #6b8f3e, #9ab897)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px', fontSize: 13, fontWeight: 700, cursor: isStreaming ? 'not-allowed' : 'pointer', marginBottom: 16, fontFamily: 'inherit', opacity: isStreaming ? 0.6 : 1 }}>
              Generate Blog Post
            </button>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }} />
            <p className="section-label">Quick Prompts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_PROMPTS.map((qp) => (
                <button key={qp.label} className="quick-btn" onClick={() => sendMessage(qp.prompt)}>{qp.label}</button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main chat ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1a0d', minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0d1a0d', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>&#9776;</button>}
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>&larr; Dashboard</button>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Magic Blog</span>
            <ActiveClientPill />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setKwSidebarOpen((v) => !v)} style={{ background: 'rgba(74,124,47,0.08)', border: '1px solid rgba(74,124,47,0.2)', borderRadius: 7, color: 'rgba(74,124,47,0.8)', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Keywords {totalKeywordCount > 0 ? `(${totalKeywordCount})` : ''}
            </button>
            {lastAssistantMsg && (
              <>
                <button onClick={saveBlog} disabled={isSaving} style={{ background: saveStatus === 'saved' ? 'rgba(107,143,62,0.15)' : saveStatus === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,124,47,0.12)', border: `1px solid ${saveStatus === 'saved' ? 'rgba(107,143,62,0.35)' : saveStatus === 'error' ? 'rgba(248,113,113,0.35)' : 'rgba(74,124,47,0.25)'}`, borderRadius: 7, color: saveStatus === 'saved' ? '#6b8f3e' : saveStatus === 'error' ? '#f87171' : 'rgba(74,124,47,0.9)', padding: '5px 12px', fontSize: 12, cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isSaving ? 0.6 : 1, transition: 'all 0.2s' }}>
                  {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Failed' : 'Save Blog'}
                </button>
                <button onClick={() => lastAssistantMsg && logToAirtable(lastAssistantMsg.content, primaryKeyword || topic)} disabled={airtableStatus === 'logging'} style={{ background: airtableStatus === 'logged' ? 'rgba(107,143,62,0.15)' : airtableStatus === 'failed' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${airtableStatus === 'logged' ? 'rgba(107,143,62,0.35)' : airtableStatus === 'failed' ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, color: airtableStatus === 'logged' ? '#6b8f3e' : airtableStatus === 'failed' ? '#f87171' : 'rgba(255,255,255,0.7)', padding: '5px 12px', fontSize: 12, cursor: airtableStatus === 'logging' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: airtableStatus === 'logging' ? 0.6 : 1, transition: 'all 0.2s' }}>
                  {airtableStatus === 'logging' ? 'Logging...' : airtableStatus === 'logged' ? 'Logged!' : airtableStatus === 'failed' ? 'Failed' : 'Log to Airtable'}
                </button>
              </>
            )}
            {/* Add to Airtable Tracker button */}
            {selectedTracker && lastAssistantMsg && trackerUpdateStatus !== 'done' && (
              trackerUpdateStatus === 'picking' ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => addToAirtableTracker('Created')} style={{ background: 'rgba(74,124,47,0.12)', border: '1px solid rgba(74,124,47,0.25)', borderRadius: 7, color: '#9ab897', padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Mark as Created</button>
                  <button onClick={() => addToAirtableTracker('Posted')} style={{ background: 'rgba(107,143,62,0.12)', border: '1px solid rgba(107,143,62,0.25)', borderRadius: 7, color: '#6b8f3e', padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Mark as Posted</button>
                  <button onClick={() => setTrackerUpdateStatus('idle')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>&#10005;</button>
                </div>
              ) : trackerUpdateStatus === 'updating' ? (
                <span style={{ fontSize: 12, color: 'rgba(74,124,47,0.7)', padding: '5px 12px' }}>Updating...</span>
              ) : trackerUpdateStatus === 'failed' ? (
                <span style={{ fontSize: 12, color: '#f87171', padding: '5px 12px' }}>Failed</span>
              ) : (
                <button onClick={() => setTrackerUpdateStatus('picking')} style={{ background: 'rgba(74,124,47,0.1)', border: '1px solid rgba(74,124,47,0.25)', borderRadius: 7, color: '#9ab897', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add to Airtable
                </button>
              )
            )}
            {trackerUpdateStatus === 'done' && (
              <span style={{ fontSize: 12, color: '#6b8f3e', padding: '5px 12px' }}>Blog, meta title &amp; description logged to Airtable &#10003;</span>
            )}
            <button onClick={() => navigate('/desktop/saved-blogs')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.7)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              Saved Blogs
            </button>
            <button onClick={() => { setMessages([]); historyRef.current = []; setInput(''); setSaveStatus('idle'); setAirtableStatus('idle'); setMetaTitle(''); setMetaDescription(''); setTrackerUpdateStatus('idle'); fixedH1Ref.current = undefined; }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.7)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>New Chat</button>
          </div>
        </header>

        {airtableStatus === 'logged' && (
          <div style={{ padding: '6px 20px', fontSize: 12, color: '#6b8f3e', background: 'rgba(107,143,62,0.06)', borderBottom: '1px solid rgba(107,143,62,0.15)', transition: 'all 0.3s' }}>
            Logged to Airtable &#10003;
          </div>
        )}
        {airtableStatus === 'failed' && (
          <div style={{ padding: '6px 20px', fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.06)', borderBottom: '1px solid rgba(248,113,113,0.15)', transition: 'all 0.3s' }}>
            Airtable log failed — check console
          </div>
        )}

        {/* ── Secondary keyword overlap notice (non-blocking) ── */}
        {conflictModal && !conflictModal.primaryConflict && conflictModal.secondaryOverlaps.length > 0 && (
          <div style={{ padding: '10px 20px', fontSize: 12.5, color: '#e8c97a', background: 'rgba(232,201,122,0.08)', borderBottom: '1px solid rgba(232,201,122,0.22)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{'⚠️'}</span>
            <div style={{ flex: 1, lineHeight: 1.5 }}>
              {conflictModal.secondaryOverlaps.map((o, i) => (
                <div key={i}>These secondary keywords overlap with "<strong>{o.title}</strong>": {o.keywords.join(', ')}. Consider differentiating to avoid cannibalization.</div>
              ))}
            </div>
            <button onClick={() => setConflictModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0 }}>&times;</button>
          </div>
        )}

        <div ref={chatRef} className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', height: '100%', textAlign: 'center', padding: '24px 24px 0', overflowY: 'auto' }}>

              {/* ── Blog Tracker Selector ── */}
              <div style={{ width: '100%', maxWidth: 580, marginBottom: 32, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ab897" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#9ab897', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Blog Tracker</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>from Airtable</span>
                  </div>
                  <button onClick={fetchTrackerBlogs} disabled={trackerLoading} style={{ background: 'rgba(74,124,47,0.08)', border: '1px solid rgba(74,124,47,0.2)', borderRadius: 6, color: '#9ab897', padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: trackerLoading ? 0.5 : 1 }}>
                    {trackerLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {/* ── Filter Tabs ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2, minWidth: 90 }}>Blog Status</span>
                  {['All', 'Not Started', 'In Progress', 'Created', 'Posted'].map((tab) => (
                    <button key={tab} onClick={() => setTrackerStatusFilter(tab)}
                      style={{
                        background: trackerStatusFilter === tab ? 'rgba(74,124,47,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${trackerStatusFilter === tab ? 'rgba(74,124,47,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12, padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        color: trackerStatusFilter === tab ? '#9ab897' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
                      }}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2, minWidth: 90 }}>Outline Status</span>
                  {['All', 'Completed', 'In Progress', 'Not Started'].map((tab) => (
                    <button key={tab} onClick={() => setOutlineStatusFilter(tab)}
                      style={{
                        background: outlineStatusFilter === tab ? 'rgba(74,124,47,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${outlineStatusFilter === tab ? 'rgba(74,124,47,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12, padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        color: outlineStatusFilter === tab ? '#9ab897' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
                      }}>
                      {tab}
                    </button>
                  ))}
                </div>

                {trackerError && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 8px' }}>{trackerError}</p>}

                {trackerLoading ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading blogs from Airtable...</div>
                ) : trackerBlogs.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' }}>No blogs found</div>
                ) : (
                  <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {trackerBlogs.map((record) => {
                      const f = record.fields;
                      const isSelected = selectedTracker?.id === record.id;
                      return (
                        <div key={record.id} onClick={() => selectTrackerBlog(record)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', borderLeft: isSelected ? '3px solid #9ab897' : '3px solid transparent', background: isSelected ? 'rgba(74,124,47,0.06)' : 'transparent', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#9ab897' : 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {f['Blog Title (Topic)'] || 'Untitled'}
                              </span>
                              {f['Blog Outline']?.trim() ? (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#6b8f3e', background: 'rgba(107,143,62,0.1)', border: '1px solid rgba(107,143,62,0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>Outline &#10003;</span>
                              ) : (
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>No outline</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                              {f['Primary Keyword'] || 'No keyword'}
                            </div>
                          </div>
                          {f['Scheduled Post Date'] && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 12 }}>{f['Scheduled Post Date']}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedTracker && (
                  <button onClick={writeSelectedBlog} disabled={isStreaming} style={{ marginTop: 12, width: '100%', background: 'linear-gradient(135deg, #6b8f3e, #9ab897)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px', fontSize: 13, fontWeight: 700, cursor: isStreaming ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isStreaming ? 0.6 : 1 }}>
                    {['Created', 'Posted'].includes(selectedTracker.fields['Blog Status'] || '') ? 'Rewrite Blog' : 'Write This Blog'}
                  </button>
                )}
              </div>

              {/* ── Original empty state ── */}
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>Magic Blog</h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 420, lineHeight: 1.7, margin: '0 0 28px' }}>
                Select a blog from the tracker above, or fill in your topic in the sidebar and click <strong style={{ color: '#9ab897' }}>Generate Blog Post</strong> — or chat directly below.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
                {[
                  { icon: '\uD83C\uDFAF', text: 'SEO-optimised structure and headings' },
                  { icon: '\uD83D\uDD17', text: 'Internal & external links woven in naturally' },
                  { icon: '\uD83D\uDD04', text: 'Iterate and refine with follow-up prompts' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isOptimizing && (
                <div style={{ background: 'rgba(74,124,47,0.08)', border: '1px solid rgba(74,124,47,0.25)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9ab897' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(154,184,151,0.25)', borderTopColor: '#9ab897', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <span>Fixing keywords/links to hit exact counts...</span>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.role === 'user' ? 'rgba(45,80,22,0.3)' : 'rgba(74,124,47,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {msg.role === 'user' ? '\uD83D\uDC64' : '\uD83D\uDCDD'}
                  </div>
                  <div style={{ maxWidth: '85%', background: msg.role === 'user' ? 'rgba(45,80,22,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${msg.role === 'user' ? 'rgba(45,80,22,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 16px' }}>
                    {msg.role === 'user' ? (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
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

              {/* ── SEO Meta Section ── */}
              {!isStreaming && lastAssistantMsg && (
                <div style={{ background: 'rgba(74,124,47,0.05)', border: '1px solid rgba(74,124,47,0.18)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(74,124,47,0.9)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SEO Meta</span>
                    {isGeneratingMeta && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Generating...</span>}
                  </div>

                  {/* Meta Title */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Meta Title</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: metaTitle.length > 60 ? '#f87171' : metaTitle.length > 0 ? '#6b8f3e' : 'rgba(255,255,255,0.3)' }}>
                          {metaTitle.length}/60
                        </span>
                        <button onClick={() => { navigator.clipboard.writeText(metaTitle); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.45)', padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Copy
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder={isGeneratingMeta ? 'Generating meta title...' : 'Meta title will appear here'}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${metaTitle.length > 60 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, color: '#f0f4ee', padding: '8px 10px', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: metaTitle.length > 60 ? '#f87171' : '#6b8f3e', width: `${Math.min((metaTitle.length / 60) * 100, 100)}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Meta Description</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: metaDescription.length > 160 ? '#f87171' : metaDescription.length > 0 ? '#6b8f3e' : 'rgba(255,255,255,0.3)' }}>
                          {metaDescription.length}/160
                        </span>
                        <button onClick={() => { navigator.clipboard.writeText(metaDescription); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.45)', padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Copy
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder={isGeneratingMeta ? 'Generating meta description...' : 'Meta description will appear here'}
                      rows={2}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${metaDescription.length > 160 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, color: '#f0f4ee', padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: metaDescription.length > 160 ? '#f87171' : '#6b8f3e', width: `${Math.min((metaDescription.length / 160) * 100, 100)}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Link Audit Panel ── */}
              {showAudit && (
                <div style={{ background: 'rgba(74,124,47,0.06)', border: '1px solid rgba(74,124,47,0.2)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setAuditOpen((v) => !v)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(74,124,47,0.9)' }}>Link Audit</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{auditLinks.length} link{auditLinks.length !== 1 ? 's' : ''} found</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{auditOpen ? '\u25B2' : '\u25BC'}</span>
                  </button>

                  {auditOpen && (
                    <div style={{ padding: '0 16px 14px' }}>

                      {/* Internal links found */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 13 }}>{internalFound.length > 0 ? '\u2705' : '\u26A0\uFE0F'}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: internalFound.length > 0 ? 'rgba(107,143,62,0.9)' : 'rgba(107,143,62,0.9)' }}>
                            Internal Links — {internalFound.length} of {validInternalUrls.length} placed
                          </span>
                          {internalFound.length < 2 && validInternalUrls.length > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(107,143,62,0.12)', border: '1px solid rgba(107,143,62,0.3)', borderRadius: 4, padding: '1px 6px', color: 'rgba(107,143,62,0.8)' }}>
                              aim for 2
                            </span>
                          )}
                        </div>
                        {internalFound.length > 0 ? (
                          internalFound.map((l, i) => (
                            <div key={i} className="audit-link-row">
                              <span style={{ fontSize: 11, color: 'rgba(107,143,62,0.7)', flexShrink: 0 }}>&darr;</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 1 }}>"{l.text}"</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', wordBreak: 'break-all' }}>{l.href}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 0 20px', fontStyle: 'italic' }}>No internal links detected — try regenerating or ask the AI to add them.</p>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }} />

                      {/* External links found */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 13 }}>{externalFound.length > 0 ? '\u2705' : '\u26A0\uFE0F'}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: externalFound.length > 0 ? 'rgba(107,143,62,0.9)' : 'rgba(107,143,62,0.9)' }}>
                            External Links — {externalFound.length} of {validExternalUrls.length} placed
                          </span>
                          {externalFound.length === 0 && validExternalUrls.length > 0 && (
                            <span style={{ fontSize: 10, background: 'rgba(107,143,62,0.12)', border: '1px solid rgba(107,143,62,0.3)', borderRadius: 4, padding: '1px 6px', color: 'rgba(107,143,62,0.8)' }}>
                              none found
                            </span>
                          )}
                        </div>
                        {externalFound.length > 0 ? (
                          externalFound.map((l, i) => (
                            <div key={i} className="audit-link-row">
                              <span style={{ fontSize: 11, color: 'rgba(107,143,62,0.7)', flexShrink: 0 }}>&darr;</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 1 }}>"{l.text}"</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', wordBreak: 'break-all' }}>{l.href}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 0 20px', fontStyle: 'italic' }}>No external links detected — try regenerating or ask the AI to cite sources.</p>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* ── Keyword Audit Panel ── */}
              {showKwAudit && (
                <div style={{ background: 'rgba(74,124,47,0.05)', border: '1px solid rgba(74,124,47,0.18)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(74,124,47,0.9)' }}>Keyword Audit</span>
                  </div>

                  {primaryKeyword && (
                    <div className="audit-link-row">
                      <span style={{ fontSize: 13 }}>{primaryKwCount >= 1 && primaryKwCount <= 2 ? '\u2705' : primaryKwCount === 0 ? '\u26A0\uFE0F' : '\uD83D\uDD34'}</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: primaryKwCount >= 1 && primaryKwCount <= 2 ? 'rgba(107,143,62,0.9)' : primaryKwCount === 0 ? 'rgba(107,143,62,0.9)' : '#f87171', fontWeight: 600 }}>Primary: </span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>"{primaryKeyword}"</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>found {primaryKwCount}&times;</span>
                        {primaryKwCount === 0 && <span style={{ fontSize: 10, color: 'rgba(107,143,62,0.7)', marginLeft: 6 }}>unused</span>}
                        {primaryKwCount > 2 && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 6 }}>over-used</span>}
                      </div>
                    </div>
                  )}
                  {primaryKwCount > 2 && (
                    <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0 22px', fontWeight: 600 }}>Primary keyword over limit — consider revising</p>
                  )}

                  {secondaryKwAudit.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {secondaryKwAudit.map(({ kw, count }) => (
                        <div key={kw}>
                          <div className="audit-link-row">
                            <span style={{ fontSize: 13 }}>{count >= 1 && count <= 2 ? '\u2705' : count === 0 ? '\u26A0\uFE0F' : '\uD83D\uDD34'}</span>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: 11, color: count >= 1 && count <= 2 ? 'rgba(107,143,62,0.8)' : count === 0 ? 'rgba(107,143,62,0.8)' : '#f87171' }}>"{kw}"</span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{count}&times;</span>
                              {count === 0 && <span style={{ fontSize: 10, color: 'rgba(107,143,62,0.7)', marginLeft: 6 }}>unused</span>}
                              {count > 2 && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 6 }}>over-used</span>}
                            </div>
                          </div>
                          {count > 2 && (
                            <p style={{ fontSize: 11, color: '#f87171', margin: '2px 0 4px 22px', fontWeight: 600 }}>Secondary keyword "{kw}" over limit — consider revising</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '8px 0 0', fontStyle: 'italic' }}>
                    Target: PK exactly 2&times; (1&times; H1 + 1&times; body) &middot; each secondary keyword exactly 1&times; in body
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0d1a0d', flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder="Ask me to write a landscaping blog, adjust tone, add keywords..." rows={1} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f0f4ee', padding: '10px 14px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 140, overflowY: 'auto' }} />
            <button onClick={() => sendMessage(input)} disabled={isStreaming || !input.trim()} style={{ width: 40, height: 40, background: isStreaming || !input.trim() ? 'rgba(74,124,47,0.2)' : 'rgba(74,124,47,0.8)', border: 'none', borderRadius: 10, cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} width={16} height={16}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8, marginBottom: 0 }}>Powered by Claude — full landscaping blog posts, ready to publish</p>
        </div>
      </main>

      {/* ── Right Sidebar: Keywords Manager ── */}
      <aside className="kw-sidebar-scroll" style={{ width: kwSidebarOpen ? 252 : 0, minWidth: kwSidebarOpen ? 252 : 0, background: '#111f11', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.25s, min-width 0.25s', flexShrink: 0, overflowY: kwSidebarOpen ? 'auto' : 'hidden' }}>
        <div style={{ padding: '14px 14px 24px', minWidth: 252 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Keywords</span>
            </div>
            <button onClick={() => setKwSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>&rsaquo;</button>
          </div>

          {/* ── Section 1: Primary Keyword ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(74,124,47,0.9)" stroke="none">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="white"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Primary Keyword</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, margin: '0 0 8px' }}>The main keyword this blog post targets</p>

            {primaryKeyword ? (
              <div style={{ marginBottom: 6 }}>
                <span className="kw-chip-primary">
                  {primaryKeyword}
                  <button className="kw-chip-x" onClick={removePrimaryKeyword}>&times;</button>
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  className="kw-input-blog"
                  type="text"
                  placeholder="e.g. landscape design services near me"
                  value={primaryKeywordInput}
                  onChange={(e) => setPrimaryKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPrimaryKeyword(); } }}
                />
                <button className="kw-add-blog" onClick={addPrimaryKeyword} disabled={!primaryKeywordInput.trim()}>Add</button>
              </div>
            )}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', fontStyle: 'italic' }}>
              Use a long-tail or question-based keyword, not a single generic word
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }} />

          {/* ── Section 2: Secondary Keywords ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Secondary Keywords</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, margin: '0 0 8px' }}>Supporting keywords to weave naturally into the blog — add a keyword multiple times to use it more often</p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                className="kw-input-blog"
                type="text"
                placeholder="e.g. landscaping company near me"
                value={secondaryKeywordInput}
                disabled={secondaryKeywords.length >= 2}
                onChange={(e) => setSecondaryKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSecondaryKeyword(); } }}
              />
              <button className="kw-add-blog" onClick={addSecondaryKeyword} disabled={secondaryKeywords.length >= 2 || !secondaryKeywordInput.trim()}>Add</button>
            </div>

            {secondaryKeywords.length >= 2 && (
              <p style={{ fontSize: 10, color: 'rgba(107,143,62,0.7)', margin: '0 0 6px', fontStyle: 'italic' }}>Maximum 2 secondary keywords reached</p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-3px' }}>
              {secondaryKeywords.map(({ id, keyword }) => (
                <span key={id} className="kw-chip-sec-blog">
                  {keyword}
                  <button className="kw-chip-x" onClick={() => removeSecondaryKeyword(id)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }} />

          {/* ── Section 3: Keyword Summary ── */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Keyword Summary</p>

            {/* Primary indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryKeyword ? 'rgba(74,124,47,0.9)' : 'transparent', border: `1.5px solid ${primaryKeyword ? 'rgba(74,124,47,0.9)' : 'rgba(255,255,255,0.2)'}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Primary Keyword</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: primaryKeyword ? 'rgba(74,124,47,0.9)' : 'rgba(255,255,255,0.3)' }}>{primaryKeyword ? '1' : '0'} / 1</span>
            </div>

            {/* Secondary progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Secondary Keywords</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(74,124,47,0.7)' }}>{secondaryKeywords.length} / 2</span>
              </div>
              <div className="kw-progress-blog">
                <div className="kw-progress-fill-blog" style={{ width: `${(secondaryKeywords.length / 2) * 100}%` }} />
              </div>
            </div>

            {/* Total */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Keywords</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: totalKwColor, lineHeight: 1 }}>{totalKeywordCount}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>/ 3</div>
            </div>

            <button className="clear-all-blog" onClick={clearAllKeywords} disabled={totalKeywordCount === 0}>
              Clear All Keywords
            </button>
          </div>

        </div>
      </aside>

      {/* ── Primary keyword conflict modal (blocking) ── */}
      {conflictModal?.primaryConflict && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: 460, background: '#111f11', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '22px 22px 18px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{'⚠️'}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Possible keyword cannibalization</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 18px' }}>
              You already have a blog targeting "<strong style={{ color: '#9ab897' }}>{conflictModal.primaryConflict.keyword}</strong>" (<em>{conflictModal.primaryConflict.title}</em>). Consider updating that post instead, or choose a different primary keyword.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConflictModal(null); setPendingGenerateFn(null); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.75)', padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Choose a different keyword
              </button>
              <button
                onClick={async () => { const fn = pendingGenerateFn; setConflictModal(null); setPendingGenerateFn(null); if (fn) await fn(); }}
                style={{ background: 'linear-gradient(135deg, #6b8f3e, #9ab897)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicBlog;
