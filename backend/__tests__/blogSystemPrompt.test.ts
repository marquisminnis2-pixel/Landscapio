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
  OUTLINE_RULES,
  isOutlineType,
  resolveOutlineRules,
  renderStructureBlock,
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
  const junk = [undefined, '', 'CHECKLIST', 'not_a_shape', 'DEFAULT_RULES', '__proto__', 'toString'];

  it.each(junk)('no-client branch is unchanged for outlineType=%p', (v) => {
    expect(buildBlogSystemPrompt(null, v as any)).toBe(NO_CLIENT_PROMPT);
  });

  it.each(junk)('client branch is unchanged for outlineType=%p', (v) => {
    expect(buildBlogSystemPrompt(FULL_CLIENT_INPUT as any, v as any)).toBe(FULL_CLIENT_PROMPT);
  });
});

describe('blogOutlineRules host structure', () => {
  it('ships no templates yet — every shape resolves to the fallback', () => {
    expect(Object.keys(OUTLINE_RULES)).toHaveLength(0);
    expect(isOutlineType('CHECKLIST')).toBe(false);
    expect(resolveOutlineRules('CHECKLIST', DEFAULT_RULES)).toBe(DEFAULT_RULES);
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
