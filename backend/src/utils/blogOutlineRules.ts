// ─── Blog outlineType host structure ──────────────────────────────────────────
// outlineType controls the STRUCTURAL SHAPE of a generated post — checklist,
// comparison table, step-by-step, etc. — independently of its topic.
//
// Twelve named shapes are authored below. Nothing calls the builder with an
// outlineType yet, so this is still inert in production: an absent or unknown value
// resolves to DEFAULT_RULES and the generated prompt stays byte-identical to the
// pre-refactor hardcoded one. __tests__/blogSystemPrompt.test.ts pins that identity
// against a fixture captured from the pre-refactor function.
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

// ── Shared constraint text ────────────────────────────────────────────────────
// Four constraints bind EVERY shape (divergent-intent audit):
//   1. No primary/secondary keyword inside an H1 or H2, ever.
//   2. Named entities other than the keywords may not repeat.
//   3. Prose-first — bullets only for genuine lists of 3+ items.
//   4. No "Meta Title:"/"Meta Description:" or other meta preamble in the body.
//
// The helpers below build each check from the DEFAULT_RULES wording rather than
// re-typing it, so a template can only ever ADD a shape-specific reminder — it
// cannot soften the underlying rule. Tests assert the base sentence survives in
// all four checks of all twelve shapes.

const HEADING_BAN = DEFAULT_RULES.headingCheck;
const ENTITY_BAN = DEFAULT_RULES.entityCheck;
const PROSE_BAN = DEFAULT_RULES.proseCheck;

/**
 * Note on the entity rule: templates carry the unscoped DEFAULT wording, not
 * BRAND_ENTITY_CHECK. The brand branch's variant narrows the rule to "entities from
 * the topic block above"; the unscoped sentence is the stricter of the two and is
 * correct in either branch, so a shape needs only one version.
 */
const headingCheckFor = (note: string): string => `${HEADING_BAN}\n- ${note}`;
const entityCheckFor = (note: string): string => `${ENTITY_BAN}\n- ${note}`;
const proseCheckFor = (note: string): string => `${PROSE_BAN}\n- ${note}`;

// Constraint 4. Stronger than the default line on purpose: commit 10ae3d8 had to
// strip this exact preamble out of Blog Copy on every write path downstream.
const OUTPUT_CHECK = `${DEFAULT_RULES.outputCheck}
Never open with a "Meta Title:" or "Meta Description:" line, and never place one anywhere in the body. The first line of your output is the H1 and nothing else.`;

const ctaPlaced = (placement: string): string =>
  `- Include a mid-article CTA (e.g. ${MID_CTA_EXAMPLE_TOKEN}) ${placement}
- Include an end-article CTA in the closing section`;

/** Byte-identical to DEFAULT_RULES.cta — most shapes have no reason to move the CTA. */
const DEFAULT_SHAPE_CTA = ctaPlaced('placed naturally after the 2nd or 3rd H2 section');

// Reminders that recur across shapes. Named once so the wording stays consistent.
const ENTITY_NOTE_GENERIC =
  'Name a tool, product, brand or plant once. After that, refer to it in plain words (e.g. "the spreader", "the seed") so no name repeats.';
const CLOSING_STANDARD =
  'Closing H2 section (not "Conclusion") that restates the primary keyword in body text and ends with a clear CTA';

// ── Named templates ───────────────────────────────────────────────────────────
// Twelve shapes, each authored against all four constraints above. Five shapes from
// the reference set are deliberately absent — COMPARISON_TABLE, HEAD_TO_HEAD,
// GLOSSARY, INTERVIEW_QA and BUYERS_GUIDE all require restating the same named
// entity across many sections or rows, which constraint 2 forbids by design. An
// outlineType naming one of those falls through to DEFAULT_RULES like any other
// unknown value, which is the intended behaviour, not a gap.
export const OUTLINE_RULES: Record<string, BlogOutlineRules> = {
  // Verification shape: things to confirm, in prose, recapped once as a list.
  CHECKLIST: {
    hook: 'Opening paragraph — name the job the reader is about to do, and say what it costs them when it is skipped. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 3 to 5 H2 sections in prose. Each H2 covers one part of the job in 2 short paragraphs: what to check, and how the reader knows it passed',
    closing: CLOSING_STANDARD,
    faq: '',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor(
      'Name each H2 for the part of the yard or the task being checked, never for the keyword phrase.',
    ),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor(
      'Close the body with one short recap list of every item checked, in order. That recap is the only list this shape allows — every section above it stays in prose.',
    ),
    outputCheck: OUTPUT_CHECK,
  },

  // The body IS the question set, so `faq` stays empty — a second FAQ would repeat it.
  FAQ_DRIVEN: {
    hook: 'Opening paragraph — state the one question most readers are really asking, then promise a straight answer. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 5 to 7 H2 sections. Each H2 is one real customer question in everyday words. Answer it in 2 short paragraphs, most useful sentence first',
    closing:
      'Closing H2 section (not "Conclusion") that answers the last question in plain terms, restates the primary keyword in body text, and ends with a CTA',
    faq: '',
    cta: ctaPlaced('placed after the 2nd or 3rd question, once the reader trusts the answers'),
    headingCheck: headingCheckFor(
      'Question headings are where keywords leak in most. Write each question the way a customer would say it out loud and keep the keyword phrase out of the heading — place the keyword in the paragraph below instead.',
    ),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor('Answer every question in full sentences. Never turn an answer into a bulleted list.'),
    outputCheck: OUTPUT_CHECK,
  },

  STEP_BY_STEP: {
    hook: 'Opening paragraph — say what the reader will be able to do by the end, and roughly how long it takes. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 7 H2 sections, one per step, in the order the work actually happens. Each step gets 2 short paragraphs: what to do, then what it looks like when it is done right',
    closing: CLOSING_STANDARD,
    faq: '',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor(
      'Label the step in each H2 (e.g. "Step 3: clear the low spots"). Keep the keyword phrase out of that label.',
    ),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor(
      'Steps are H2 sections written in paragraphs, not a numbered list of one-line instructions.',
    ),
    outputCheck: OUTPUT_CHECK,
  },

  PROS_CONS: {
    hook: 'Opening paragraph — name the choice the reader is weighing and admit it has real trade-offs. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 2 to 3 H2 sections on what works well, then 2 to 3 on what does not. Give the drawbacks the same honest detail as the upsides',
    closing:
      'Closing H2 section (not "Conclusion") that gives a clear recommendation for who should choose this, restates the primary keyword in body text, and ends with a CTA',
    faq: 'FAQ section — three H3 questions a buyer still asks after weighing both sides, each answered in 2 short sentences',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor('Name the upside or the drawback in each H2, never the keyword phrase.'),
    entityCheck: entityCheckFor(
      'Name a material, brand or service once, then describe it in plain words for the rest of the article.',
    ),
    proseCheck: proseCheckFor(
      'Weigh each point in paragraphs. A two-column list of pros against cons is not allowed as the body.',
    ),
    outputCheck: OUTPUT_CHECK,
  },

  BEFORE_AFTER: {
    hook: 'Opening paragraph — describe the yard at its worst in one vivid sentence, then say what changed. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 2 H2 sections on the starting condition and how it got that bad, then 3 to 4 on the work that fixed it and the result it produced',
    closing:
      'Closing H2 section (not "Conclusion") that shows the reader the same result is possible in their own yard, restates the primary keyword in body text, and ends with a CTA',
    faq: '',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor('Headings describe the condition or the fix, never the keyword phrase.'),
    entityCheck: entityCheckFor(
      'Name the property, town or homeowner once each. After that write "the yard" or "the homeowner" so no name repeats.',
    ),
    proseCheck: proseCheckFor(
      'Describe the change in paragraphs. Do not reduce it to a before-list beside an after-list.',
    ),
    outputCheck: OUTPUT_CHECK,
  },

  MYTH_BUSTING: {
    hook: 'Opening paragraph — name the bad advice that keeps costing homeowners money. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections, one myth each. State the myth in the first sentence, say plainly why it is wrong, then give the practice that works instead',
    closing: CLOSING_STANDARD,
    faq: '',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor('Write each H2 as the myth in plain words, never as the keyword phrase.'),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor('Correct each myth in sentences, not in a myth-versus-fact list.'),
    outputCheck: OUTPUT_CHECK,
  },

  COST_BREAKDOWN: {
    hook: 'Opening paragraph — give the honest price range up front, before any explanation. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections, one per thing that moves the price, such as yard size, current condition, access or season. Explain in prose what raises or lowers the number and by roughly how much. Use only figures supplied in the brief — never invent a price',
    closing:
      'Closing H2 section (not "Conclusion") that repeats the realistic range, restates the primary keyword in body text, and ends with a CTA to get a quote',
    faq: 'FAQ section — three H3 questions about payment, timing or what is included, each answered in 2 short sentences',
    cta: ctaPlaced('placed right after the section on the biggest price factor, where the reader wants a real number'),
    headingCheck: headingCheckFor('Name the cost factor in each H2, never the keyword phrase.'),
    entityCheck: entityCheckFor('Name each service once, then refer to the work itself in plain words.'),
    proseCheck: proseCheckFor(
      'Explain pricing in paragraphs. One short list of ranges is allowed if it runs to 3 or more lines; a price table is not.',
    ),
    outputCheck: OUTPUT_CHECK,
  },

  WARNING_SIGNS: {
    hook: 'Opening paragraph — tell the reader which small problem turns into an expensive one. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections, one warning sign each. Describe what the reader would see, smell or feel underfoot, what causes it, and how fast it needs attention',
    closing:
      'Closing H2 section (not "Conclusion") that tells the reader what to do if two or more signs match their yard, restates the primary keyword in body text, and ends with a CTA',
    faq: '',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor('Describe the sign itself in each H2, never the keyword phrase.'),
    entityCheck: entityCheckFor(
      'Name a pest, disease or product once, then describe it in plain words for the rest of the article.',
    ),
    proseCheck: proseCheckFor('Describe each sign in sentences. A symptom list is not a substitute for the section.'),
    outputCheck: OUTPUT_CHECK,
  },

  TIMELINE_SEASONAL: {
    hook: 'Opening paragraph — say what the calendar controls here and what happens when the timing is missed. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections in calendar order, one per season or month range. Each covers the jobs due in that window and why the timing matters, in 2 short paragraphs',
    closing:
      'Closing H2 section (not "Conclusion") that points the reader to the window coming up next, restates the primary keyword in body text, and ends with a CTA',
    faq: 'FAQ section — three H3 questions about a warmer climate, a colder one, or a window already missed, each answered in 2 short sentences',
    cta: DEFAULT_SHAPE_CTA,
    headingCheck: headingCheckFor('Name the season or month range in each H2, never the keyword phrase.'),
    entityCheck: entityCheckFor(
      'Name a grass type, region or product once, then refer to it in plain words for the rest of the article.',
    ),
    proseCheck: proseCheckFor('Cover each window in paragraphs, not as a month-by-month list.'),
    outputCheck: OUTPUT_CHECK,
  },

  PROBLEM_AGITATE_SOLVE: {
    hook: 'Opening paragraph — describe the problem exactly as the reader would say it out loud. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 1 to 2 H2 sections showing what the problem really costs in time, money and curb appeal, then 3 to 4 laying out the fix in the order it happens',
    closing: CLOSING_STANDARD,
    faq: '',
    cta: ctaPlaced('placed at the turn from what the problem costs to how it gets fixed'),
    headingCheck: headingCheckFor('Headings name the cost or the fix, never the keyword phrase.'),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor('Build the pressure and the fix in paragraphs. Bullets flatten this shape.'),
    outputCheck: OUTPUT_CHECK,
  },

  QUICK_ANSWER_DEEP_DIVE: {
    hook: 'Opening paragraph — answer the question completely in 2 to 3 sentences, so a reader who stops there still has what they came for. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections that go deeper in order of what matters most: why the short answer holds, when it stops holding, and what to do about it',
    closing: CLOSING_STANDARD,
    faq: 'FAQ section — three H3 questions the short answer raises, each answered in 2 short sentences',
    cta: ctaPlaced('placed after the first deep-dive section, before a skimming reader leaves'),
    headingCheck: headingCheckFor('Each H2 names the angle it covers, never the keyword phrase.'),
    entityCheck: entityCheckFor(ENTITY_NOTE_GENERIC),
    proseCheck: proseCheckFor('The short answer at the top is prose — not a summary box, not a bullet list.'),
    outputCheck: OUTPUT_CHECK,
  },

  STORY_LED: {
    hook: 'Opening paragraph — open on one homeowner at the moment the problem got real. Mention the primary keyword in the first 100 words',
    skeleton:
      'Body — 4 to 6 H2 sections following the story in order: what went wrong, what they tried, what finally worked, what it cost. Pull one lesson the reader can use out of each part',
    closing:
      'Closing H2 section (not "Conclusion") that turns the story into advice the reader can act on this week, restates the primary keyword in body text, and ends with a CTA',
    faq: '',
    cta: ctaPlaced('placed at the point in the story where the fix starts working'),
    headingCheck: headingCheckFor('Headings mark the turn in the story, never the keyword phrase.'),
    entityCheck: entityCheckFor(
      'Name the homeowner and the town once each. After that write "the homeowner" and "the neighborhood" — a story that repeats a name breaks this rule fastest.',
    ),
    proseCheck: proseCheckFor('Tell the story in paragraphs. Bullets break a narrative.'),
    outputCheck: OUTPUT_CHECK,
  },
};

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
