// Wiring guard for outlineType.
//
// blogSystemPrompt.test.ts proves the twelve shapes are correctly authored and that
// the no-outline path is byte-identical. It cannot prove anything reaches them:
// until this pass the parameter was inert, and a suite that only tests the builder
// would keep passing if the controller silently dropped the field again.
//
// These tests exercise the actual request handlers, so they fail if outlineType
// stops being read off the body, stops reaching buildBlogSystemPrompt, or stops
// being written to Airtable alongside the copy.
import express from 'express';
import request from 'supertest';

import { blogChat, listOutlineTypes, __buildBlogSystemPromptForTest as buildBlogSystemPrompt } from '../src/controllers/aiController';
import { OUTLINE_RULES, OUTLINE_TYPES } from '../src/utils/blogOutlineRules';

// The tracker route's Airtable calls are the assertion target, not a dependency.
jest.mock('../src/services/blogTrackerService', () => ({
  fetchBlogs: jest.fn(),
  markInProgress: jest.fn(),
  updateBlogRecord: jest.fn().mockResolvedValue({ id: 'rec_test' }),
}));
jest.mock('../src/services/airtableService', () => ({
  logBlogToAirtable: jest.fn().mockResolvedValue({ id: 'rec_new' }),
}));
jest.mock('../src/services/socialPostsTrackerService', () => ({
  fetchSocialPosts: jest.fn(),
  updateSocialPostRecord: jest.fn(),
  logSocialPostToAirtable: jest.fn(),
}));

import airtableRouter from '../src/routes/airtable';
import { updateBlogRecord } from '../src/services/blogTrackerService';
import { logBlogToAirtable } from '../src/services/airtableService';

// ── blogChat: outlineType reaches the system prompt ───────────────────────────

/**
 * Runs blogChat against a stubbed Anthropic endpoint and returns the `system` string
 * it would have sent. The stub answers "not ok" so streamClaude bails immediately —
 * the request body has already been built by then, which is all this needs.
 */
async function systemPromptSentBy(body: Record<string, unknown>): Promise<string> {
  let captured = '';
  const fetchMock = jest.fn(async (_url: any, init: any) => {
    captured = JSON.parse(init.body).system;
    return { ok: false, body: null } as any;
  });
  (global as any).fetch = fetchMock;

  const res = {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  await blogChat({ body, orgId: undefined } as any, res as any);
  expect(fetchMock).toHaveBeenCalled();
  return captured;
}

describe('blogChat — outlineType is read off the request body', () => {
  const messages = [{ role: 'user', content: 'Write the article.' }];
  const realFetch = (global as any).fetch;

  beforeAll(() => { process.env.CLAUDE_API_KEY = 'test-key'; });
  afterAll(() => { (global as any).fetch = realFetch; });

  it('sends the unchanged default prompt when no outlineType is supplied', async () => {
    // No clientId → the Landscapio brand branch, which is what the UI actually hits.
    expect(await systemPromptSentBy({ messages })).toBe(buildBlogSystemPrompt(null));
  });

  it('sends the unchanged default prompt for a value that names no template', async () => {
    const sent = await systemPromptSentBy({ messages, outlineType: 'NOT_A_SHAPE' });
    expect(sent).toBe(buildBlogSystemPrompt(null));
  });

  it('sends a different prompt when a named outlineType is supplied', async () => {
    const base = buildBlogSystemPrompt(null);
    const sent = await systemPromptSentBy({ messages, outlineType: 'COST_BREAKDOWN' });
    expect(sent).not.toBe(base);
    // Not just "different" — different in the way COST_BREAKDOWN specifies.
    expect(sent).toContain(OUTLINE_RULES.COST_BREAKDOWN.skeleton);
    expect(sent).toContain(OUTLINE_RULES.COST_BREAKDOWN.hook);
    expect(sent).not.toContain('H2 sections (follow the outline in the brief exactly if provided)');
  });

  it('reaches every one of the twelve shapes, each producing a distinct prompt', async () => {
    const base = buildBlogSystemPrompt(null);
    const seen = new Set<string>();
    for (const shape of OUTLINE_TYPES) {
      const sent = await systemPromptSentBy({ messages, outlineType: shape });
      expect(sent).not.toBe(base);
      expect(sent).toContain(OUTLINE_RULES[shape].skeleton);
      seen.add(sent);
    }
    expect(seen.size).toBe(OUTLINE_TYPES.length);
  });
});

// ── The shape list the picker reads ───────────────────────────────────────────

describe('listOutlineTypes', () => {
  it('serves exactly the authored template keys, so the picker cannot drift', async () => {
    const res = { json: jest.fn() };
    await listOutlineTypes({} as any, res as any);
    expect(res.json).toHaveBeenCalledWith({ success: true, outlineTypes: Object.keys(OUTLINE_RULES) });
    expect(res.json.mock.calls[0][0].outlineTypes).toHaveLength(12);
  });
});

// ── Airtable write paths carry the shape alongside the copy ───────────────────

describe('Airtable write paths record the outline type', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/airtable', airtableRouter);

  beforeEach(() => jest.clearAllMocks());

  it('writes "Blog Outline Type" beside "Blog Copy" on the tracker path', async () => {
    await request(app).post('/api/airtable/update-blog').send({
      clientId: 'c1', recordId: 'rec1', status: 'Created',
      blogContent: '# A title\n\nBody copy.', outlineType: 'COST_BREAKDOWN',
    }).expect(200);
    const fields = (updateBlogRecord as jest.Mock).mock.calls[0][2];
    expect(fields['Blog Outline Type']).toBe('COST_BREAKDOWN');
    expect(fields['Blog Copy']).toBeDefined();
  });

  it('omits the column entirely when nothing was picked', async () => {
    await request(app).post('/api/airtable/update-blog').send({
      clientId: 'c1', recordId: 'rec1', status: 'Created', blogContent: '# A title\n\nBody copy.',
    }).expect(200);
    expect((updateBlogRecord as jest.Mock).mock.calls[0][2]).not.toHaveProperty('Blog Outline Type');
  });

  it('refuses to stamp a value that names no template', async () => {
    // The prompt fell through to DEFAULT_RULES, so the row must not claim otherwise.
    await request(app).post('/api/airtable/update-blog').send({
      clientId: 'c1', recordId: 'rec1', status: 'Created',
      blogContent: '# A title\n\nBody copy.', outlineType: 'COMPARISON_TABLE',
    }).expect(200);
    expect((updateBlogRecord as jest.Mock).mock.calls[0][2]).not.toHaveProperty('Blog Outline Type');
  });

  it('passes the shape through the manual /log-blog path', async () => {
    await request(app).post('/api/airtable/log-blog').send({
      clientId: 'c1', blogTitle: 'A title', blogContent: '# A title\n\nBody copy.',
      blogOutlineType: 'STORY_LED',
    }).expect(200);
    expect((logBlogToAirtable as jest.Mock).mock.calls[0][0].blogOutlineType).toBe('STORY_LED');
  });
});
