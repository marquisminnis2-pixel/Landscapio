import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { fetchBlogs, markInProgress, updateBlogRecord } from '../services/blogTrackerService';
import Client, { IClient } from '../models/Client';
import BlogPost from '../models/BlogPost';
import { seoNormalize, buildSeoRewritePrompt, brandSiteUrl } from '../utils/seoChecklist';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Non-streaming Claude helper ─────────────────────────────────────────────
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'claude-sonnet-4-6',
  maxTokens: number = 8192
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY!;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${JSON.stringify(err)}`);
  }
  const data = await response.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? '';
}

export const chat = async (req: AuthRequest, res: Response) => {
  try {
    const { message, html, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'AI service not configured' });
    }

    const systemPrompt = `You are Luma, an AI assistant that edits website HTML directly.

You will receive the full HTML of a website and a user request.

WHEN MAKING CHANGES TO THE WEBSITE:
- Return ONLY the complete modified HTML — no explanation, no markdown, no code fences, no backticks
- The HTML must be complete from <!DOCTYPE> or <html> through </html>
- Do not truncate or summarize — return everything
- Do not change anything the user did not ask to change

WHEN APPLYING COLOR PALETTES — inject a <style id="geni-palette"> block at the END of <head>:
Use ONLY these exact hex values:
- "Natural & Earthy":      body bg #F5F0E8, nav/footer/headings #2D5A27,  buttons #F5C518, body text #6B4423
- "Fresh & Clean":         body bg #FAFFFE, nav/footer/headings #4CAF50,  buttons #4CAF50, body text #555555
- "Bold & Professional":   body bg #1A1A1A, nav/footer/headings #CCFF00,  buttons #CCFF00, body text #FFFFFF
- "Warm & Inviting":       body bg #FAF3E8, nav/footer/headings #6B7C3B,  buttons #C1440E, body text #6B4423
- "Modern Outdoor":        body bg #F0F4F0, nav/footer/headings #1A3D2B,  buttons #DAA520, body text #708090
- "Clean & Trustworthy":   body bg #FFFFFF, nav/footer/headings #4A90D9,  buttons #4A90D9, body text #555555
- "Fresh & Bright":        body bg #FFFFFF, nav/footer/headings #00CED1,  buttons #FFF44F, body text #555555
- "Calm & Professional":   body bg #F8FAFB, nav/footer/headings #6BA3BE,  buttons #6BA3BE, body text #555555
- "Bold & Reliable":       body bg #FFFFFF, nav/footer/headings #4169E1,  buttons #4169E1, body text #000080
- "Soft & Friendly":       body bg #FAFAFF, nav/footer/headings #9B9BC8,  buttons #99E6E6, body text #555555

COLOR PALETTE STYLE BLOCK — always use this exact pattern:
<style id="geni-palette">
  body { background-color: BODY_BG !important; }
  h1, h2, h3, h4, h5, h6 { color: HEADING_COLOR !important; }
  nav, .navbar, .w-nav, .nav-bar, header, [role="banner"] { background-color: NAV_COLOR !important; background-image: none !important; }
  footer, .footer, .w-footer { background-color: FOOTER_COLOR !important; background-image: none !important; }
  section, .section, .hero-section, .hero, .w-section { background-image: none !important; }
  .btn, .button, .w-button, .primary-button, [class*="btn-"], [class*="-button"], [class*="cta"] { background-color: BUTTON_COLOR !important; color: #FFFFFF !important; border-color: BUTTON_COLOR !important; }
  p, li, span.body-text { color: BODY_TEXT !important; }
</style>

If a <style id="geni-palette"> block already exists in the HTML, REPLACE it with the new one.

WHEN EDITING TEXT:
- Find the element in the HTML and change its text content directly
- Do not add or remove other elements

WHEN YOU CANNOT MAKE THE CHANGE OR NEED CLARIFICATION:
- Return a plain conversational text response (NOT HTML)
- Explain what you need from the user

TOKEN LIMIT NOTE: Templates can be large. Always return the complete HTML.
If the change is color-only, you may return just the HTML with the updated <style id="geni-palette"> block.`;

    // Cap history to last 6 messages. Do NOT include html in history (too large).
    const cappedHistory: ChatMessage[] = (conversationHistory as ChatMessage[]).slice(-6);

    const userContent = html
      ? `Current website HTML:\n${html}\n\nUser request: ${message}`
      : message;

    const messages: ChatMessage[] = [
      ...cappedHistory,
      { role: 'user', content: userContent },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ message: 'AI service error', error: errorData });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const assistantMessage = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

    // Store only the plain user message (not the full HTML) in history to keep it manageable
    res.json({
      response: assistantMessage,
      conversationHistory: [
        ...cappedHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage },
      ],
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Server error during AI chat' });
  }
};

// ─── Shared SSE streaming helper ──────────────────────────────────────────────
async function streamClaude(systemPrompt: string, messages: ChatMessage[], res: Response): Promise<void> {
  const apiKey = process.env.CLAUDE_API_KEY!;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 8192, stream: true, system: systemPrompt, messages }),
    });

    if (!response.ok || !response.body) { res.write(`data: ${JSON.stringify({ error: 'Anthropic API error' })}\n\n`); res.end(); return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch { /* partial */ }
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Server error' })}\n\n`);
    res.end();
  }
}

// ─── Blog system-prompt helpers ──────────────────────────────────────────────

interface BlogBrandContext {
  brandName: string;
  siteUrl: string;
  domainSentence: string;
  advisorRole: string;
  topicHeader: string;
  topicLines: string[];
  brandMentionExample: string;
  midCtaExample: string;
  caseStudyExample: string;
}

const LANDSCAPIO_CONTEXT: BlogBrandContext = {
  brandName: 'Landscapio',
  siteUrl: 'landscapio.co',
  domainSentence: 'an AI-powered platform connecting homeowners with professional landscaping and lawn care services',
  advisorRole: 'landscaping and outdoor services advisor',
  topicHeader: 'LANDSCAPING & OUTDOOR SERVICES TOPICS TO COVER WELL',
  topicLines: [
    'Lawn care fundamentals (mowing, fertilization, aeration, overseeding)',
    'Seasonal yard maintenance (spring cleanup, fall cleanup, winterization)',
    'Landscape design, planning, and curb appeal improvements',
    'Hardscaping (pavers, retaining walls, patios, walkways, outdoor kitchens)',
    'Irrigation systems and sprinkler installation or maintenance',
    'Mulching, weed control, and soil health',
    'Tree and shrub pruning, planting, and removal',
    'Sod installation vs seeding tradeoffs',
    'Drought-tolerant and native plant landscaping',
    'Commercial vs residential landscaping needs',
    'Finding and hiring the right local landscaping company',
    'The cost of professional lawn care vs DIY',
  ],
  brandMentionExample: '"At Landscapio, we..." or "Landscapio connects homeowners with..."',
  midCtaExample: '"Need a trusted landscaping pro? Find your match on Landscapio today."',
  caseStudyExample: '"A homeowner in Austin transformed their bare backyard into..." or "After hiring through Landscapio, one Texas family saw their curb appeal..."',
};

// Used for agency/generic clients — writes blogs for their actual landscaping business,
// not for the Landscapio platform itself.
function buildGenericClientSystemPrompt(client: IClient | null): string {
  const businessName = client?.businessName || 'the business';
  const industry = (client?.industry || 'landscaping').toLowerCase();
  const rawUrl = client?.websiteUrl || '';
  const siteUrl = rawUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const brandVoiceNote = client?.brandVoice ? `\n- Brand voice: ${client.brandVoice}` : '';
  const audience = client?.targetAudience || `homeowners and property managers looking for ${industry} services`;

  return `You are an expert SEO content writer for ${businessName}${siteUrl ? ` (${siteUrl})` : ''}, a ${industry} company. Your job is to write blog articles that rank on Google and convert readers into customers.

BEFORE writing, you will receive a content brief. Follow it precisely.

WRITING RULES (validated against 93% Semrush score):
- Address the reader directly using "you" and "your" throughout
- Write in a confident, helpful tone — like an expert ${industry} advisor giving real advice${brandVoiceNote}
- Target audience: ${audience}
- Use H2 headings that describe real customer needs, not clever titles
- Use H3 subheadings under each H2 to break up longer sections
- Write in full paragraphs — bullets only for genuine lists (3+ items)
- End every article with a closing H2 section that restates the primary keyword naturally and includes a clear CTA. Never use "Conclusion" as the heading — vary it each time (e.g. "Final Thoughts", "The Bottom Line", "Where to Go From Here", "Ready to Get Started?")

STRUCTURE EVERY ARTICLE LIKE THIS:
1. Opening paragraph — hook with the reader's problem, mention the primary keyword in the first 100 words
2. H2 sections (follow the outline in the brief exactly if provided)
3. Closing H2 section (not "Conclusion") with keyword restatement + CTA

SEO RULES:
- Use the primary keyword and each secondary keyword the number of times specified in the brief's KEYWORDS TO USE section. Stay within the stated range. Place the primary keyword once in the opening paragraph (first 100 words of body text) and spread the rest evenly through the body.
- The primary keyword must appear more times than any single secondary keyword.
- Natural placement only — never force keywords into sentences.
- Do not cluster repeated keywords in the same paragraph — distribute them across the post.
- NEVER place the primary keyword or any secondary keyword inside an H1 or H2 heading. Keywords belong in paragraph body text only — placing them in headings causes keyword cannibalization and destabilizes rankings.
- The primary keyword and the listed secondary keywords are the ONLY phrases allowed to repeat. Every other named entity may appear at most once across the entire article. Do not introduce any new repeated phrases of your own.
- Write at a 7th–8th grade reading level. Use short sentences (15 words max on average). Avoid jargon. Talk directly to the reader using "you" and "your". No corporate or academic phrasing.
- Target word count is in the brief — hit within 10%

SEARCH INTENT GUIDE — adjust tone based on intent:
- Informational ("how to", "what is", "tips for"): Teach. No hard sell. Soft CTA.
- Commercial ("best", "vs", "top", "review"): Compare. Build trust. Strong CTA.
- Transactional ("hire", "near me", "cost", "quote"): Convert. Lead with value + urgency.

ENHANCEMENT CHECKLIST (every article MUST pass all of these):
- Include at least 1 ${businessName} brand mention (e.g. "At ${businessName}, we..." or "${businessName} specializes in...")
- Include at least 1 real-world scenario or case study relevant to the ${industry} industry
- Include at least 1 tactical opinion or hot take — share a strong, specific point of view that sets the article apart from generic content
- Include a mid-article CTA (e.g. "Ready to work with ${businessName}? Contact us today for a free estimate.") placed naturally after the 2nd or 3rd H2 section
- Include an end-article CTA in the closing section

OUTPUT FORMAT:
Return clean markdown with # for H1, ## for H2, ### for H3.
Do not include meta descriptions unless asked.
Do NOT wrap keywords in markdown bold (\`**\`) or italic (\`*\`). Keywords must appear as plain prose — never visually emphasized. The brief uses \`**\` for its own headings, but that styling must not appear in your article body around the keyword phrases.
Use markdown bold (\`**word**\`) only sparingly for genuine emphasis on important non-keyword phrases.
Always format links as proper markdown: \`[anchor text](url)\` — never as bare URLs.

When the user wants to tweak, regenerate, or adjust — do so immediately without asking unnecessary questions.`;
}

function buildBlogSystemPrompt(client: IClient | null): string {
  // Known client → write for their specific landscaping business
  if (client) return buildGenericClientSystemPrompt(client);

  // No client → write for Landscapio brand itself (publisher = 'landscapio')
  const ctx = LANDSCAPIO_CONTEXT;
  const topicBlock = ctx.topicLines.map(l => `- ${l}`).join('\n');
  return `You are an expert SEO content writer for ${ctx.brandName} (${ctx.siteUrl}), ${ctx.domainSentence}. Your job is to write blog articles that rank on Google and convert readers into customers.

BEFORE writing, you will receive a content brief. Follow it precisely.

WRITING RULES (validated against 93% Semrush score):
- Address the reader directly using "you" and "your" throughout
- Write in a confident, helpful tone — like an expert ${ctx.advisorRole} giving real advice
- Use H2 headings that describe real homeowner needs, not clever titles
- Use H3 subheadings under each H2 to break up longer sections
- Write in full paragraphs — bullets only for genuine lists (3+ items)
- End every article with a closing H2 section that restates the primary keyword naturally and includes a clear CTA. Never use "Conclusion" as the heading — vary it each time (e.g. "Final Thoughts", "What This Means for Your Yard", "The Bottom Line", "Where to Go From Here")

${ctx.topicHeader}:
${topicBlock}

STRUCTURE EVERY ARTICLE LIKE THIS:
1. Opening paragraph — hook with the reader's problem, mention the primary keyword in the first 100 words
2. H2 sections (follow the outline in the brief exactly if provided)
3. Closing H2 section (not "Conclusion") with keyword restatement + CTA

SEO RULES:
- Use the primary keyword and each secondary keyword the number of times specified in the brief's KEYWORDS TO USE section. Stay within the stated range. Place the primary keyword once in the opening paragraph (first 100 words of body text) and spread the rest evenly through the body.
- The primary keyword must appear more times than any single secondary keyword.
- Natural placement only — never force keywords into sentences.
- Do not cluster repeated keywords in the same paragraph — distribute them across the post.
- NEVER place the primary keyword or any secondary keyword inside an H1 or H2 heading. Keywords belong in paragraph body text only — placing them in headings causes keyword cannibalization and destabilizes rankings.
- The primary keyword and the listed secondary keywords are the ONLY phrases allowed to repeat. Every other named entity from the topic block above may appear **at most once** across the entire article. Do not introduce any new repeated phrases of your own.
- Write at a **7th–8th grade reading level**. Use **short sentences** (15 words max on average). Avoid jargon. Talk directly to the reader using "you" and "your". No corporate or academic phrasing.
- Target word count is in the brief — hit within 10%

SEARCH INTENT GUIDE — adjust tone based on intent:
- Informational ("how to", "what is", "tips for"): Teach. No hard sell. Soft CTA.
- Commercial ("best", "vs", "top", "review"): Compare. Build trust. Strong CTA.
- Transactional ("hire", "near me", "cost", "quote"): Convert. Lead with value + urgency.

ENHANCEMENT CHECKLIST (every article MUST pass all of these):
- Include at least 1 ${ctx.brandName} brand mention (e.g. ${ctx.brandMentionExample})
- Include at least 1 real-world scenario or case study (e.g. ${ctx.caseStudyExample})
- Include at least 1 tactical opinion or hot take — share a strong, specific point of view that sets the article apart from generic content
- Include a mid-article CTA (e.g. ${ctx.midCtaExample}) placed naturally after the 2nd or 3rd H2 section
- Include an end-article CTA in the closing section

OUTPUT FORMAT:
Return clean markdown with # for H1, ## for H2, ### for H3.
Do not include meta descriptions unless asked.
Do NOT wrap keywords in markdown bold (\`**\`) or italic (\`*\`). Keywords must appear as plain prose — never visually emphasized. The brief uses \`**\` for its own headings, but that styling must not appear in your article body around the keyword phrases.
Use markdown bold (\`**word**\`) only sparingly for genuine emphasis on important non-keyword phrases.
Always format links as proper markdown: \`[anchor text](url)\` — never as bare URLs.

When the user wants to tweak, regenerate, or adjust — do so immediately without asking unnecessary questions.`;
}

async function resolveBlogClient(clientId?: string, orgId?: string): Promise<IClient | null> {
  if (!clientId || !orgId) return null;
  try {
    return await Client.findOne({ _id: clientId, orgId });
  } catch {
    return null;
  }
}

// ─── Magic Blog Chat (Landscaping SEO Blog Writing) ─────────────────────────
export const blogChat = async (req: AuthRequest, res: Response) => {
  const { messages, clientId, orgId: bodyOrgId } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: 'messages array is required' });
  if (!process.env.CLAUDE_API_KEY) return res.status(500).json({ message: 'AI service not configured' });
  const client = await resolveBlogClient(clientId, req.orgId || bodyOrgId);
  await streamClaude(buildBlogSystemPrompt(client), messages, res);
};

// ─── Magic Posts Chat ─────────────────────────────────────────────────────────
const POSTS_SYSTEM_PROMPT = `You are a social media content writer for local service businesses. Your job is to write short, warm, benefit-focused posts that sound like a trusted local neighbor — never a marketer.

## WRITING RULES — follow every single one, no exceptions

TONE:
- Warm and approachable — never corporate, never stiff
- Benefit-focused — lead with what the customer gains, not what the business does
- No exaggeration, no hype — confident and straightforward
- Reads like a trusted local neighbor wrote it, not a marketing agency

STRUCTURE:
- Weave the service name and city naturally into the post 2–3 times for rhythm
- Simple, flowing sentences only — no bullet points, no lists, no emojis, no hashtags in the body
- Always end with a direct call to action: "Book today" or "Call today" style close

LENGTH:
- Every post must be exactly 100–150 words. No shorter. No longer. Count carefully.

EXAMPLE of a perfect post — study this and match it exactly:
"A clean home should always be simple. Our friendly standard cleaning in Peoria includes dusting, vacuuming, and surface cleaning to keep your space fresh. We focus on professional cleaning that makes sense for your home, ensuring every room is neat and organized. A well-cleaned home helps create a relaxing space, and we take care of the details so you can enjoy your time at home. Our team arrives on time and works quickly to provide reliable results. Book today for professional standard cleaning that keeps your home fresh and simple without any extra work on your part."

When generating multiple posts, label each one clearly (Post 1, Post 2, etc.) and vary the angle slightly for each — different opening sentence, different benefit emphasis — but keep the same structure and rules.

When asked to tweak, shorten, lengthen, or rewrite — do so immediately without asking questions.`;

export const postsChat = async (req: AuthRequest, res: Response) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: 'messages array is required' });
  if (!process.env.CLAUDE_API_KEY) return res.status(500).json({ message: 'AI service not configured' });
  await streamClaude(POSTS_SYSTEM_PROMPT, messages, res);
};

// ─── Magic Content & Writing Chat ────────────────────────────────────────────
const CONTENT_SYSTEM_PROMPT = `You are an expert content writer and digital marketing specialist for local service businesses. You create high-quality, professional content including email sequences, ad copy, bios, review responses, service page copy, meta tags, GBP content, city landing pages, press releases, testimonials, newsletters, and case studies.

Follow all formatting and content requirements provided in each request exactly. Write in a professional yet approachable tone. Always tailor content to the specific business, location, and industry provided.

For all outputs, use clear markdown formatting with headers (##, ###), bullet points (- item), and bold (**text**) to make content well-structured and easy to read. Separate major sections with --- dividers. Use numbered lists for sequences.`;

export const contentChat = async (req: AuthRequest, res: Response) => {
  const { messages, clientId, orgId: bodyOrgId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages array is required' });
  }
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'AI service not configured' });
  const client = await resolveBlogClient(clientId, req.orgId || bodyOrgId);
  const brandNote = client
    ? `\n\nYou are writing on behalf of ${client.businessName}${client.websiteUrl ? ` (${client.websiteUrl})` : ''}, a ${client.industry} business.${client.brandVoice ? ` Brand voice: ${client.brandVoice}.` : ''}`
    : '';
  return streamClaude(CONTENT_SYSTEM_PROMPT + brandNote, messages, res);
};

// ─── Magic Pages Generate (non-streaming JSON) ────────────────────────────────
const MAGIC_PAGES_SYSTEM_PROMPT = `You are an expert SEO content writer specializing in local service business websites. You write high-converting, keyword-optimized page copy that ranks in local search and converts visitors into customers.

CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no preamble. Raw JSON only.

Return this exact JSON structure:
{
  "metaTitle": "SEO title (50-60 chars ideal, 65 max)",
  "metaDescription": "Meta description (140-160 chars ideal)",
  "wordCount": <integer total word count across all section body text>,
  "sections": [
    {
      "id": "section-id",
      "name": "Section Display Name",
      "heading": "H1 or H2 heading",
      "subheading": "optional subheading or tagline, or null",
      "body": "Full body text. Multiple paragraphs separated by \\n\\n.",
      "listItems": ["item 1", "item 2"] // for list-based content, otherwise null
    }
  ]
}

Rules:
- Only include sections that were explicitly requested
- Never fabricate business details not provided in the prompt
- Use keywords naturally — never keyword-stuff or force placement
- Write for humans first, search engines second
- All copy should guide visitors toward calling or booking
- Each section heading should be a real SEO-optimized H1 or H2
- Body text should be substantial — at minimum 2-3 paragraphs per section
- FAQ sections: each item in listItems should be formatted as "Q: question\\nA: answer"`;

export const pagesGenerate = async (req: AuthRequest, res: Response) => {
  const { userPrompt, clientId, orgId: bodyOrgId } = req.body;
  if (!userPrompt) return res.status(400).json({ message: 'userPrompt is required' });
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'AI service not configured' });

  const client = await resolveBlogClient(clientId, req.orgId || bodyOrgId);
  const brandNote = client
    ? `\n\nYou are writing on behalf of ${client.businessName}${client.websiteUrl ? ` (${client.websiteUrl})` : ''}, a ${client.industry} business.${client.brandVoice ? ` Brand voice: ${client.brandVoice}.` : ''}`
    : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: MAGIC_PAGES_SYSTEM_PROMPT + brandNote,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      console.error('Magic Pages AI error:', err);
      return res.status(response.status).json({ message: 'AI error', error: err });
    }
    const data = await response.json() as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? '';
    res.json({ text });
  } catch (error) {
    console.error('Magic Pages generate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Cross-Blog Keyword Deduplication Guard (anti-cannibalization) ───────────

interface ExistingBlogKw {
  title: string;
  primaryRaw: string;
  primaryNorm: string;
  keywordSetNorm: Set<string>; // normalized primary + secondaries
}

export const checkKeywordConflicts = async (req: AuthRequest, res: Response) => {
  const { clientId, primaryKeyword, secondaryKeywords, excludeRecordId, orgId: bodyOrgId } = req.body as {
    clientId?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    excludeRecordId?: string;
    orgId?: string;
  };
  if (!clientId) return res.status(400).json({ message: 'clientId is required' });

  const orgId = req.orgId || bodyOrgId;
  const newPkNorm = seoNormalize(primaryKeyword || '');
  // Map each normalized new secondary back to its raw form for friendly output.
  const newSecondaries = (secondaryKeywords || [])
    .map(s => ({ raw: (s || '').trim(), norm: seoNormalize(s || '') }))
    .filter(s => s.norm.length > 0);

  const existing: ExistingBlogKw[] = [];

  // Source 1: Airtable Blog Tracker — already-written blogs for this client.
  try {
    const records = await fetchBlogs(clientId);
    for (const rec of records) {
      if (excludeRecordId && rec.id === excludeRecordId) continue;
      const f = rec.fields || {};
      const status = f['Blog Status'];
      if (status !== 'Created' && status !== 'Posted') continue; // skip placeholders
      const primaryRaw = (f['Primary Keyword'] || '').trim();
      const secs = [f['Secondary Keyword 1'], f['Secondary Keyword 2']]
        .map((s: string | undefined) => (s || '').trim())
        .filter(Boolean);
      const keywordSetNorm = new Set<string>(
        [primaryRaw, ...secs].map(k => seoNormalize(k)).filter(Boolean)
      );
      existing.push({ title: f['Blog Title (Topic)'] || 'Untitled', primaryRaw, primaryNorm: seoNormalize(primaryRaw), keywordSetNorm });
    }
  } catch (err: any) {
    console.error('Keyword conflict check — Airtable source failed:', err.message);
  }

  // Source 2: app DB BlogPost rows (org-scoped; keywords[0] = primary, rest = secondary).
  if (orgId) {
    try {
      const posts = await BlogPost.find({ orgId });
      for (const post of posts) {
        const kws = Array.isArray(post.keywords) ? post.keywords.filter(Boolean) : [];
        if (kws.length === 0) continue;
        const primaryRaw = (kws[0] || '').trim();
        const keywordSetNorm = new Set<string>(kws.map(k => seoNormalize(k)).filter(Boolean));
        existing.push({ title: post.title || 'Untitled', primaryRaw, primaryNorm: seoNormalize(primaryRaw), keywordSetNorm });
      }
    } catch (err: any) {
      console.error('Keyword conflict check — BlogPost source failed:', err.message);
    }
  }

  // Primary keyword exact match → blocking conflict.
  let primaryConflict: { title: string; keyword: string } | null = null;
  if (newPkNorm) {
    const hit = existing.find(b => b.primaryNorm && b.primaryNorm === newPkNorm);
    if (hit) primaryConflict = { title: hit.title, keyword: hit.primaryRaw };
  }

  // Secondary overlap → non-blocking notice when 2+ of the new secondaries
  // already live in a single existing blog's keyword set.
  const secondaryOverlaps: { title: string; keywords: string[] }[] = [];
  for (const b of existing) {
    const overlapping = newSecondaries.filter(s => b.keywordSetNorm.has(s.norm)).map(s => s.raw);
    if (overlapping.length >= 2) {
      secondaryOverlaps.push({ title: b.title, keywords: overlapping });
    }
  }

  res.json({ primaryConflict, secondaryOverlaps });
};

// ─── Auto-Write Bot (writes all "Not Started" blogs automatically) ───────────

function buildAutoPrompt(fields: Record<string, string | undefined>): string {
  return `You are writing a blog post for Landscapio, a landscaping SEO company.

Blog Title: ${fields['Blog Title (Topic)'] || ''}
Primary Keyword: ${fields['Primary Keyword'] || ''}
Secondary Keyword 1: ${fields['Secondary Keyword 1'] || ''}
Secondary Keyword 2: ${fields['Secondary Keyword 2'] || ''}
Internal Link 1: ${fields['Internal Link 1'] || ''}
Internal Link 2: ${fields['Internal Link 2'] || ''}
External Link 1: ${fields['External Link 1'] || ''}
External Link 2: ${fields['External Link 2'] || ''}

Blog Outline (follow this structure exactly):
${fields['Blog Outline'] || 'No outline provided. Create a logical structure based on the title and keywords.'}

Instructions:
- Follow the Blog Outline exactly as the structure for the post
- Use the primary keyword exactly once in the H1/title and exactly once more in the body (total 2).
- Use each secondary keyword exactly once in the body.
- Include the internal links naturally within the content where relevant
- Include the external links as authoritative references
- Use proper H1, H2, H3 heading structure
- Write at a 7th–8th grade reading level with short sentences. Avoid jargon. Talk directly to the reader.
- Write for landscaping companies and their potential customers
- Aim for 1200-1800 words
- Make it authoritative, informative, and conversion focused
- Format all links as proper markdown links: [anchor text](url)

Write the full article now.`;
}

let isAutoWriteRunning = false;

export const autoWriteBlogs = async (req: AuthRequest, res: Response) => {
  const clientId = req.body?.clientId;
  // /api/ai routes don't run resolveOrg, so req.orgId is usually unset — accept
  // an optional orgId from the body as a fallback (mirrors blogChat).
  const orgId = req.orgId || req.body?.orgId;
  if (!clientId) {
    return res.status(400).json({ success: false, message: 'clientId is required' });
  }
  if (isAutoWriteRunning) {
    return res.status(409).json({ success: false, message: 'Auto-write is already running' });
  }
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ success: false, message: 'AI service not configured' });
  }

  isAutoWriteRunning = true;
  const results: Array<{ recordId: string; title: string; status: 'success' | 'failed'; error?: string }> = [];

  try {
    const blogs = await fetchBlogs(clientId, 'Not Started');
    if (blogs.length === 0) {
      isAutoWriteRunning = false;
      return res.json({ success: true, message: 'No blogs to write', results: [] });
    }

    // Resolve the client once and use the unified blog system prompt (same one
    // blogChat uses). Falls back to the Landscapio brand prompt when unresolved.
    const client = await resolveBlogClient(clientId, orgId);
    const systemPrompt = buildBlogSystemPrompt(client);

    console.log(`🤖 Auto-write started: ${blogs.length} blogs to process`);

    for (const blog of blogs) {
      const fields = blog.fields;
      const title = fields['Blog Title (Topic)'] || 'Untitled';
      try {
        console.log(`📝 Writing: "${title}"`);

        await markInProgress(clientId, blog.id);

        let blogContent = await callClaude(systemPrompt, buildAutoPrompt(fields));

        // Same 3-pass SEO self-correction the interactive editor runs. callClaude
        // is stateless (single user turn), so fold the prior draft + the fix
        // instructions into one prompt rather than a multi-turn conversation.
        const MAX_REWRITE_ATTEMPTS = 3;
        const pk = fields['Primary Keyword'] || '';
        const secondaries = [fields['Secondary Keyword 1'], fields['Secondary Keyword 2']]
          .filter((s): s is string => !!s && s.trim().length > 0);

        for (let attempt = 1; attempt <= MAX_REWRITE_ATTEMPTS; attempt++) {
          const rewritePrompt = buildSeoRewritePrompt(blogContent, pk, secondaries, brandSiteUrl, fields['Blog Title (Topic)'] || undefined);
          if (!rewritePrompt) break;
          blogContent = await callClaude(
            systemPrompt,
            `${buildAutoPrompt(fields)}\n\n---\n\nDRAFT TO FIX:\n${blogContent}\n\n---\n\n${rewritePrompt}`
          );
        }

        await updateBlogRecord(clientId, blog.id, {
          'Blog Copy': blogContent,
          'Blog Status': 'Created',
        });

        console.log(`✅ Done: "${title}"`);
        results.push({ recordId: blog.id, title, status: 'success' });
      } catch (err: any) {
        console.error(`❌ Failed: "${title}":`, err.message);
        results.push({ recordId: blog.id, title, status: 'failed', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} blogs`,
      summary: {
        total: results.length,
        succeeded: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
      },
      results,
    });
  } catch (err: any) {
    console.error('Auto-write batch error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    isAutoWriteRunning = false;
  }
};