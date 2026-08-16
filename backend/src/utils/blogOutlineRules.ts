// ─── Blog outlineType host structure ──────────────────────────────────────────
// outlineType controls the STRUCTURAL SHAPE of a generated post — checklist,
// comparison table, step-by-step, etc. — independently of its topic.
//
// This file is the host structure ONLY. No named templates are authored yet:
// OUTLINE_RULES is intentionally empty, so every caller resolves to DEFAULT_RULES
// and the generated prompt is byte-identical to the pre-refactor hardcoded one.
// __tests__/blogSystemPrompt.test.ts pins that identity against a fixture captured
// from the pre-refactor function.
//
// Consumed by: controllers/aiController.ts (buildBlogSystemPrompt).

/**
 * The nine prompt slots a structural template may override. Each maps to exactly
 * one insertion point in buildBlogSystemPrompt, so a template can restate any one
 * of them without disturbing the rest of the prompt.
 *
 * Everything NOT listed here is constant across shapes on purpose — brand context,
 * keyword counts, reading level, search-intent guidance, tone and word count do not
 * vary by structure.
 */
export interface BlogOutlineRules {
  /** STRUCTURE step 1 — how the post opens. */
  hook: string;
  /** STRUCTURE step 2 — the body shape. The slot a named template mainly overrides. */
  skeleton: string;
  /** STRUCTURE final step — how the post closes. */
  closing: string;
  /**
   * Optional STRUCTURE step inserted between body and closing for shapes that
   * mandate an FAQ section. Empty for the default shape: Landscapio's prompt has
   * never required an FAQ, and an empty value must leave the numbering untouched.
   */
  faq: string;
  /**
   * ENHANCEMENT CHECKLIST call-to-action bullets. May contain the literal token
   * {{MID_CTA_EXAMPLE}}, replaced at assembly with the branch's own CTA example
   * (the two prompt branches phrase that example differently).
   */
  cta: string;
  /** Self-check: keywords are banned from H1/H2. */
  headingCheck: string;
  /** Self-check: only PK/SKs may repeat; every other entity appears at most once. */
  entityCheck: string;
  /** Self-check: prose-first, bullets only for genuine lists. */
  proseCheck: string;
  /** Self-check: no meta lines in the body output. */
  outputCheck: string;
}

/** Token in `cta` replaced with the branch's mid-article CTA example. */
export const MID_CTA_EXAMPLE_TOKEN = '{{MID_CTA_EXAMPLE}}';

// ── DEFAULT_RULES ─────────────────────────────────────────────────────────────
// A literal decomposition of the prompt as it stood before this refactor — every
// string below is lifted verbatim from the old hardcoded template, not rewritten.
// Reassembled by buildBlogSystemPrompt these reproduce the previous output
// character for character, which is what the byte-identity test proves.
export const DEFAULT_RULES: BlogOutlineRules = {
  hook: "Opening paragraph — hook with the reader's problem, mention the primary keyword in the first 100 words",
  skeleton: 'H2 sections (follow the outline in the brief exactly if provided)',
  closing: 'Closing H2 section (not "Conclusion") with keyword restatement + CTA',
  faq: '',
  cta: `- Include a mid-article CTA (e.g. ${MID_CTA_EXAMPLE_TOKEN}) placed naturally after the 2nd or 3rd H2 section
- Include an end-article CTA in the closing section`,
  headingCheck:
    '- NEVER place the primary keyword or any secondary keyword inside an H1 or H2 heading. Keywords belong in paragraph body text only — placing them in headings causes keyword cannibalization and destabilizes rankings.',
  entityCheck:
    '- The primary keyword and the listed secondary keywords are the ONLY phrases allowed to repeat. Every other named entity may appear at most once across the entire article. Do not introduce any new repeated phrases of your own.',
  proseCheck: '- Write in full paragraphs — bullets only for genuine lists (3+ items)',
  outputCheck: 'Do not include meta descriptions unless asked.',
};

/**
 * The Landscapio-brand branch (no resolved client) states the entity rule slightly
 * differently — it scopes "every other named entity" to the topic block it prints
 * above, and bolds "at most once". Preserved exactly rather than unified, because
 * unifying the wording would change that prompt's output.
 */
export const BRAND_ENTITY_CHECK =
  '- The primary keyword and the listed secondary keywords are the ONLY phrases allowed to repeat. Every other named entity from the topic block above may appear **at most once** across the entire article. Do not introduce any new repeated phrases of your own.';

export const BRAND_DEFAULT_RULES: BlogOutlineRules = {
  ...DEFAULT_RULES,
  entityCheck: BRAND_ENTITY_CHECK,
};

// ── Named templates ───────────────────────────────────────────────────────────
// Deliberately empty in this pass. Templates are authored next; until then every
// outlineType value falls through to DEFAULT_RULES, which is why this refactor is
// inert in production.
export const OUTLINE_RULES: Record<string, BlogOutlineRules> = {};

export function isOutlineType(v?: string): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(OUTLINE_RULES, v);
}

/** Resolves a shape name to its rules, falling back to `base` for unknown/absent values. */
export function resolveOutlineRules(outlineType: string | undefined, base: BlogOutlineRules): BlogOutlineRules {
  return isOutlineType(outlineType) ? OUTLINE_RULES[outlineType] : base;
}

/**
 * Renders the "STRUCTURE EVERY ARTICLE LIKE THIS" block. The FAQ step is inserted
 * between body and closing only when a shape asks for one, so the default shape
 * keeps its original three-step numbering exactly.
 */
export function renderStructureBlock(rules: BlogOutlineRules): string {
  const steps = [rules.hook, rules.skeleton, ...(rules.faq ? [rules.faq] : []), rules.closing];
  return steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

/** Resolves the CTA slot's example token against a branch-supplied example. */
export function renderCta(rules: BlogOutlineRules, midCtaExample: string): string {
  return rules.cta.split(MID_CTA_EXAMPLE_TOKEN).join(midCtaExample);
}
