// ─── SEO Checklist v2 — shared audit + rewrite-prompt module ──────────────────
// Ported verbatim (logic-wise) from frontend/src/components/Desktop/MagicBlog.tsx
// so auto-written blogs go through the same 3-pass self-correction as interactive
// ones. These are pure functions — no React/DOM dependencies.
//
// IMPORTANT: `brandSiteUrl` below is duplicated in MagicBlog.tsx (frontend and
// backend are separate packages with no shared module path). If you change the
// brand site here, change it there too — the two copies MUST stay in sync.
export const brandSiteUrl = 'landscapio.co';

// Fixed keyword-count model: PK 1×H1 + 1×body = 2 total; each SK 1×body.
export const PK_H1_TARGET = 1;
export const PK_BODY_TARGET = 1;
export const PK_TOTAL_TARGET = PK_H1_TARGET + PK_BODY_TARGET;
export const SK_BODY_TARGET = 1;

// "in" is the only stop word — ignored when matching. "for" is NOT a stop word.
export function seoNormalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+\bin\b\s+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function seoEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function seoCountKeyword(text: string, kw: string): number {
  const nKw = seoNormalize(kw);
  if (!nKw) return 0;
  const nText = seoNormalize(text);
  return (nText.match(new RegExp(`(?<![a-z])${seoEscape(nKw)}(?![a-z])`, 'g')) || []).length;
}
export function seoIsSubstring(inner: string, outer: string): boolean {
  const ni = seoNormalize(inner), no = seoNormalize(outer);
  if (!ni || !no || ni === no) return false;
  return new RegExp(`(?<![a-z])${seoEscape(ni)}(?![a-z])`).test(no);
}
export function seoVisibleText(md: string): string {
  return (md || '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, ' ');
}
export function seoStripMeta(text: string): string {
  return (text || '').split('\n').filter(l => !/^\s*meta\s*(title|description)\s*[:\-]/i.test(l)).join('\n');
}
export function seoExtractAnchors(md: string): { text: string; url: string }[] {
  const out: { text: string; url: string }[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md || '')) !== null) out.push({ text: m[1], url: m[2] });
  return out;
}
export interface SeoSections { h1: string; subheadings: string; body: string; }
export function seoSplitSections(md: string): SeoSections {
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
export interface SeoKwReport {
  pkH1: number; pkBody: number; pkSub: number;
  secondaries: { keyword: string; presence: number; standalone: number; inSub: number; inAnchor: number; coveredBy: string[] }[];
}
export function seoAnalyzeKeywords(blogText: string, pk: string, secondaries: string[]): SeoKwReport {
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
export function seoHeadingIssues(blogText: string, pk: string, secondaries: string[]): string[] {
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
export function seoFormatIssues(blogText: string, pk: string, secondaries: string[]): string[] {
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
export function seoLinkIssues(blogText: string, siteUrl: string, keywords: string[]): string[] {
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
export function seoMetaIssues(blogText: string, pk: string): string[] {
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

// ─── 3-pass rewrite prompt — keywords, headings, links, meta, formatting ──────
// Returns null when the draft passes every check, otherwise a structured "fix
// this" prompt. Ported from MagicBlog.tsx's buildRewritePrompt (LinkEntry params
// dropped — they were unused there too; siteUrl is now an explicit parameter).
export function buildSeoRewritePrompt(
  blogText: string,
  primaryKw: string,
  secondaryKws: string[],
  siteUrl: string = brandSiteUrl,
  fixedH1?: string // when set (tracker flow), the H1 is locked and must not be rewritten
): string | null {
  const secStrings = secondaryKws.map(k => k.trim()).filter(Boolean);
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
  // When the H1 is locked, drop the "integrate the PK into the H1" heading note —
  // it would otherwise tell Claude to rewrite the title.
  if (fixedH1) headingFixes = headingFixes.filter(h => !/^H1 leads with the primary keyword/.test(h));
  const linkFixes = seoLinkIssues(blogText, siteUrl, [primaryKw, ...secStrings].filter(Boolean));
  const metaFixes = seoMetaIssues(blogText, primaryKw);
  const formatFixes = seoFormatIssues(blogText, primaryKw, secStrings);

  const ATTRIBUTION_RE = /\b(according to|in a study by|as (?:noted|reported|stated|mentioned|observed|shown|found) by|per (?:a|an|the)\b|research (?:by|from)|a (?:study|report|survey) (?:by|from)|cited by|sources? (?:say|report))\b/i;
  const externalStyleFixes: string[] = [];
  for (const l of seoExtractAnchors(blogText)) {
    const isInternal = l.url.startsWith('/') || l.url.includes(siteUrl);
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
}
