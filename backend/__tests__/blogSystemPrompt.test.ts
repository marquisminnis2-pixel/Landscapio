// Byte-identity guard for the blog system prompt.
//
// The OutlineRules refactor decomposed a hardcoded prompt into nine overridable
// slots. It is only safe if the no-outlineType path still produces exactly what it
// produced before. The fixtures were captured by running the PRE-refactor function
// and are never regenerated from the refactored code — that is the whole point.
//
// If one of these fails, the decomposition in utils/blogOutlineRules.ts is wrong.
// Fix the decomposition, not the fixture.
import {
  FULL_CLIENT_INPUT,
  MINIMAL_CLIENT_INPUT,
  NO_CLIENT_PROMPT,
  FULL_CLIENT_PROMPT,
  MINIMAL_CLIENT_PROMPT,
} from './fixtures/blogSystemPrompt.pre-refactor';
import { __buildBlogSystemPromptForTest as buildBlogSystemPrompt } from '../src/controllers/aiController';
import {
  DEFAULT_RULES,
  BRAND_DEFAULT_RULES,
  BRAND_ENTITY_CHECK,
  OUTLINE_RULES,
  MID_CTA_EXAMPLE_TOKEN,
  BlogOutlineRules,
  isOutlineType,
  resolveOutlineRules,
  renderStructureBlock,
  renderCta,
} from '../src/utils/blogOutlineRules';

describe('buildBlogSystemPrompt — byte identity with pre-refactor output', () => {
  it('reproduces the no-client (Landscapio brand) prompt exactly', () => {
    expect(buildBlogSystemPrompt(null)).toBe(NO_CLIENT_PROMPT);
  });

  it('reproduces the client-branded prompt exactly (all optional fields set)', () => {
    expect(buildBlogSystemPrompt(FULL_CLIENT_INPUT as any)).toBe(FULL_CLIENT_PROMPT);
  });

  it('reproduces the client-branded prompt exactly (only required fields)', () => {
    expect(buildBlogSystemPrompt(MINIMAL_CLIENT_INPUT as any)).toBe(MINIMAL_CLIENT_PROMPT);
  });
});

describe('buildBlogSystemPrompt — unknown outlineType is inert', () => {
  // Nothing calls the builder with an outlineType yet, but the parameter must be
  // harmless the moment something does, and must stay harmless for any value that
  // is not a template key.
  // Includes the five shapes excluded by the audit (they must stay unknown, not
  // half-work) and a lowercase key (lookup is case-sensitive by design).
  const junk = [
    undefined,
    '',
    'not_a_shape',
    'DEFAULT_RULES',
    '__proto__',
    'toString',
    'COMPARISON_TABLE',
    'HEAD_TO_HEAD',
    'GLOSSARY',
    'INTERVIEW_QA',
    'BUYERS_GUIDE',
    'checklist',
  ];

  it.each(junk)('no-client branch is unchanged for outlineType=%p', (v) => {
    expect(buildBlogSystemPrompt(null, v as any)).toBe(NO_CLIENT_PROMPT);
  });

  it.each(junk)('client branch is unchanged for outlineType=%p', (v) => {
    expect(buildBlogSystemPrompt(FULL_CLIENT_INPUT as any, v as any)).toBe(FULL_CLIENT_PROMPT);
  });
});

describe('blogOutlineRules host structure', () => {
  it('resolves an unknown or absent shape to the fallback, unchanged', () => {
    expect(isOutlineType('not_a_shape')).toBe(false);
    expect(resolveOutlineRules('not_a_shape', DEFAULT_RULES)).toBe(DEFAULT_RULES);
    expect(resolveOutlineRules(undefined, BRAND_DEFAULT_RULES)).toBe(BRAND_DEFAULT_RULES);
  });

  it('does not treat inherited Object properties as templates', () => {
    // Object.hasOwnProperty guard — a bare `in` check would make 'toString' a shape
    // and hand the prompt a function where a rules object belongs.
    expect(isOutlineType('toString')).toBe(false);
    expect(isOutlineType('constructor')).toBe(false);
  });

  it('numbers the structure block 1..3 while faq is empty', () => {
    expect(renderStructureBlock(DEFAULT_RULES)).toBe(
      `1. ${DEFAULT_RULES.hook}\n2. ${DEFAULT_RULES.skeleton}\n3. ${DEFAULT_RULES.closing}`,
    );
  });

  it('inserts an FAQ step before the closing and renumbers when a shape asks for one', () => {
    const withFaq = { ...DEFAULT_RULES, faq: 'FAQ section answering 4 follow-up questions' };
    expect(renderStructureBlock(withFaq)).toBe(
      `1. ${DEFAULT_RULES.hook}\n2. ${DEFAULT_RULES.skeleton}\n3. FAQ section answering 4 follow-up questions\n4. ${DEFAULT_RULES.closing}`,
    );
  });

  it('keeps the two branches distinct only in the entity rule', () => {
    const diffs = (Object.keys(DEFAULT_RULES) as Array<keyof typeof DEFAULT_RULES>)
      .filter((k) => DEFAULT_RULES[k] !== BRAND_DEFAULT_RULES[k]);
    expect(diffs).toEqual(['entityCheck']);
  });
});

// ── Authored shapes ───────────────────────────────────────────────────────────
// Every shape must satisfy the four hard constraints from the divergent-intent
// audit. These are enforced structurally: a template builds each check from the
// DEFAULT_RULES sentence, so the tests below assert that sentence survives intact
// in all four checks of all twelve shapes. A template can add to a rule; it can
// never soften one.
describe('OUTLINE_RULES — authored shapes', () => {
  const EXPECTED_SHAPES = [
    'CHECKLIST',
    'FAQ_DRIVEN',
    'STEP_BY_STEP',
    'PROS_CONS',
    'BEFORE_AFTER',
    'MYTH_BUSTING',
    'COST_BREAKDOWN',
    'WARNING_SIGNS',
    'TIMELINE_SEASONAL',
    'PROBLEM_AGITATE_SOLVE',
    'QUICK_ANSWER_DEEP_DIVE',
    'STORY_LED',
  ];

  // Ruled out by the audit: each requires restating the same named entity across
  // many sections or rows, which constraint 2 forbids. They must resolve to the
  // fallback rather than exist in a half-working form.
  const EXCLUDED_SHAPES = ['COMPARISON_TABLE', 'HEAD_TO_HEAD', 'GLOSSARY', 'INTERVIEW_QA', 'BUYERS_GUIDE'];

  const SLOTS: Array<keyof BlogOutlineRules> = [
    'hook',
    'skeleton',
    'closing',
    'faq',
    'cta',
    'headingCheck',
    'entityCheck',
    'proseCheck',
    'outputCheck',
  ];

  it('ships exactly the twelve audited shapes', () => {
    expect(Object.keys(OUTLINE_RULES).sort()).toEqual([...EXPECTED_SHAPES].sort());
  });

  it.each(EXCLUDED_SHAPES)('leaves %s unregistered so it falls back to the default shape', (name) => {
    expect(isOutlineType(name)).toBe(false);
    expect(resolveOutlineRules(name, DEFAULT_RULES)).toBe(DEFAULT_RULES);
  });

  describe.each(EXPECTED_SHAPES)('%s', (name) => {
    const rules = OUTLINE_RULES[name];
    // The four structure slots, which together render the numbered STRUCTURE block.
    const structureText = renderStructureBlock(rules);

    it('resolves to its own rules from either branch base', () => {
      expect(isOutlineType(name)).toBe(true);
      expect(resolveOutlineRules(name, DEFAULT_RULES)).toBe(rules);
      expect(resolveOutlineRules(name, BRAND_DEFAULT_RULES)).toBe(rules);
    });

    it('defines all nine slots, with faq the only one allowed to be empty', () => {
      for (const slot of SLOTS) {
        expect(typeof rules[slot]).toBe('string');
        if (slot !== 'faq') expect(rules[slot].trim().length).toBeGreaterThan(0);
      }
    });

    it('constraint 1 — restates the heading ban verbatim', () => {
      expect(rules.headingCheck).toContain(DEFAULT_RULES.headingCheck);
    });

    it('constraint 1 — no structure step puts a keyword anywhere but body text', () => {
      // Any structure step that mentions a keyword must scope that mention to the
      // opening paragraph or to body text — never to a heading.
      for (const slot of ['hook', 'skeleton', 'closing', 'faq'] as const) {
        if (!/keyword/i.test(rules[slot])) continue;
        expect(rules[slot]).toMatch(/first 100 words|body text/);
      }
      // Belt and braces: no phrasing that would place a keyword in a heading.
      expect(structureText).not.toMatch(/keyword[^.]{0,40}\bin (?:the |an? )?(?:H1|H2|H3|heading)/i);
      expect(structureText).not.toMatch(/(?:H1|H2|H3|heading)[^.]{0,40}(?:contain|includ|with)[^.]{0,20}keyword/i);
    });

    it('constraint 2 — restates the entity rule verbatim, unscoped so it holds in both branches', () => {
      expect(rules.entityCheck).toContain(DEFAULT_RULES.entityCheck);
      // The brand branch's narrower wording must not be baked into a shape — it
      // scopes the rule to the topic block, which the client branch never prints.
      expect(rules.entityCheck).not.toContain(BRAND_ENTITY_CHECK);
    });

    it('constraint 3 — restates the prose-first rule verbatim', () => {
      expect(rules.proseCheck).toContain(DEFAULT_RULES.proseCheck);
    });

    it('constraint 4 — bans meta preamble on top of the default line', () => {
      expect(rules.outputCheck).toContain(DEFAULT_RULES.outputCheck);
      expect(rules.outputCheck).toContain('Meta Title:');
      expect(rules.outputCheck).toContain('Meta Description:');
    });

    it('keeps both CTAs and substitutes the branch example', () => {
      expect(rules.cta).toContain(MID_CTA_EXAMPLE_TOKEN);
      expect(rules.cta).toContain('end-article CTA');
      const rendered = renderCta(rules, '"Call us for a free quote."');
      expect(rendered).toContain('"Call us for a free quote."');
      expect(rendered).not.toContain(MID_CTA_EXAMPLE_TOKEN);
    });

    it('numbers the structure block by whether the shape asks for an FAQ', () => {
      const lines = structureText.split('\n');
      expect(lines).toHaveLength(rules.faq ? 4 : 3);
      lines.forEach((line, i) => expect(line.startsWith(`${i + 1}. `)).toBe(true));
    });
  });
});
