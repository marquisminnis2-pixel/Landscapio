import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { fetchBlogs, markInProgress, updateBlogRecord } from '../services/blogTrackerService';

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

// ─── Copyright Chat (streaming SSE) ──────────────────────────────────────────

const COPYRIGHT_SYSTEM_PROMPT = `You are an expert social media copywriter and local SEO specialist for local service businesses. Every post you write must follow the Social Posts Templates master outline below — no exceptions. The goal is to maintain brand consistency, reinforce local SEO by city and state, and keep messaging aligned with each client's mission.

## RECOMMENDED PLATFORMS
Google Business Profile, LinkedIn, Instagram, Facebook, X, TikTok, YouTube, Pinterest, and other relevant social profiles.

## POSTING FREQUENCY
3–7x per week (M/W/F or M/T/W/T/F recommended).

## POST BUCKETS
1. **Service or Product of the Day** — Cleaning of the day, lawn cut of the day, etc. Highlights a recent project, job, or featured product in a specific city. Alternate between photo, video, and carousel posts where applicable.

(Only one bucket is currently defined. Until additional master bucket templates are added, every post must follow the "Service or Product of the Day" template below.)

## CAPTION FORMAT (every post must hit all three)
1. Hook sentence
2. Keyword-rich body (must include: service + city/state)
3. Clear CTA (Book now, Call us, Visit us, etc.)

## 1. SERVICE OR PRODUCT OF THE DAY POST
Use this to highlight a recent project, job, or featured product in a specific city. It builds trust, reinforces service area relevance, and positions the business as the go-to local choice.

**Caption Template — follow exactly:**

Another happy [customer/client] served right here in [City, State].
We're proud to offer [Keyword: service/product in City, State] with the quality and care we're known for.
During this [project/service/product delivery], we delivered:
- Feature #1
- Feature #2
- Feature #3

Let our [City] team at [Business Name] help you with [service]. Book online at [Insert Link] or call us at [Insert Phone Number].

## BOTTOM LINE RULES FOR COPYWRITERS (NEVER BREAK THESE)
- Always insert City + State for local SEO reinforcement.
- Keep messaging short, keyword-rich, and consistent with the client's brand voice.
- Always include a CTA with booking link and/or phone number.
- Rotate between post buckets for variety and engagement (when multiple buckets exist — currently only Service of the Day is defined).
- For non-visual industries, replace "before & after" with "case study/results showcase."

## OUTPUT FORMAT
Label each post with:
- Post number and day (e.g., POST 1 — MONDAY)
- Post type (e.g., Service or Product of the Day)
- Platform suggestion (e.g., Google Business Profile, Instagram, Facebook)

If any field is missing from the client info (city, phone, link, business name, features, keyword, customer descriptor), use clear [PLACEHOLDER] brackets so the user knows exactly what to fill in.

When asked to tweak, shorten, lengthen, or rewrite — do so immediately without asking questions.`;

export const copyrightChat = async (req: AuthRequest, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages array is required' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'AI service not configured' });
  }

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        stream: true,
        system: COPYRIGHT_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok || !response.body) {
      res.write(`data: ${JSON.stringify({ error: 'Anthropic API error' })}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const raw = decoder.decode(value);
      const lines = raw.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch { /* partial chunk */ }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Copyright chat error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Server error' })}\n\n`);
    res.end();
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
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, stream: true, system: systemPrompt, messages }),
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

// ─── Magic Blog Chat (Landscaping SEO Blog Writing) ─────────────────────────
const BLOG_SYSTEM_PROMPT = `You are an expert SEO content writer for landscaping companies. Your job is to write blog articles that rank on Google and convert readers into landscaping customers.

BEFORE writing, you will receive a content brief. Follow it precisely.

WRITING RULES (validated against 93% Semrush score):
- Address the reader directly using "you" and "your" throughout
- Write in a confident, helpful tone — like an expert landscaper giving real advice
- Use H2 headings that describe real homeowner needs, not clever titles
- Use H3 subheadings under each H2 to break up longer sections
- Write in full paragraphs — bullets only for genuine lists (3+ items)
- Place [IMAGE: description] placeholders after every 2–3 H2 sections
- End every article with a closing H2 section that restates the primary keyword naturally and includes a clear CTA. Never use "Conclusion" as the heading — vary it each time (e.g. "Final Thoughts", "What This Means for Your Yard", "The Bottom Line", "Where to Go From Here")

LANDSCAPING-SPECIFIC TOPICS TO COVER WELL:
- Lawn care fundamentals (mowing, fertilization, aeration, overseeding)
- Seasonal yard maintenance (spring cleanup, fall cleanup, winterization)
- Landscape design and planning
- Hardscaping (pavers, retaining walls, patios, walkways)
- Irrigation systems and sprinkler maintenance
- Mulching, weed control, and soil health
- Tree and shrub pruning, planting, and removal
- Sod installation vs seeding
- Drought-tolerant and native plant landscaping
- Snow removal and winter yard services
- Commercial vs residential landscaping

STRUCTURE EVERY ARTICLE LIKE THIS:
1. Opening paragraph — hook with the reader's problem, mention the primary keyword in the first 100 words
2. H2 sections (follow the outline in the brief exactly if provided)
3. [IMAGE] placeholders at natural visual breaks
4. Closing H2 section (not "Conclusion") with keyword restatement + CTA

SEO RULES:
- Use the primary keyword **exactly 3 times**: once in the opening (title or first 100 words) and twice in the body. No more, no less.
- Use each secondary keyword **exactly 2 times**. No more, no less. Spread them across different sections.
- Natural placement only — never force keywords into sentences.
- Do not cluster repeated keywords in the same paragraph — distribute them across the post.
- Write at a **7th–8th grade reading level**. Use **short sentences** (15 words max on average). Avoid jargon. Talk directly to the reader using "you" and "your". No corporate or academic phrasing.
- Target word count is in the brief — hit within 10%

SEARCH INTENT GUIDE — adjust tone based on intent:
- Informational ("how to", "what is", "tips for"): Teach. No hard sell. Soft CTA.
- Commercial ("best", "vs", "top", "review"): Compare. Build trust. Strong CTA.
- Transactional ("hire", "near me", "cost", "quote"): Convert. Lead with value + urgency.

ENHANCEMENT CHECKLIST (every article MUST pass all of these):
- Include at least 1 Landscapio brand mention (e.g. "At Landscapio, we..." or "Landscapio recommends...")
- Include at least 1 real-world scenario or case study (e.g. "A homeowner in Dallas transformed..." or "After last season's drought, one of our clients...")
- Include at least 1 tactical opinion or hot take — share a strong, specific point of view that sets the article apart from generic content
- Include a mid-article CTA (e.g. "Need help with this? Call Landscapio today for a free yard assessment.") placed naturally after the 2nd or 3rd H2 section
- Include an end-article CTA in the closing section

OUTPUT FORMAT:
Return clean markdown with # for H1, ## for H2, ### for H3.
Include [IMAGE: realistic description for stock photo] placeholders.
Do not include meta descriptions unless asked.

When the user wants to tweak, regenerate, or adjust — do so immediately without asking unnecessary questions.`;

export const blogChat = async (req: AuthRequest, res: Response) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: 'messages array is required' });
  if (!process.env.CLAUDE_API_KEY) return res.status(500).json({ message: 'AI service not configured' });
  await streamClaude(BLOG_SYSTEM_PROMPT, messages, res);
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
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages array is required' });
  }
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'AI service not configured' });
  return streamClaude(CONTENT_SYSTEM_PROMPT, messages, res);
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
  const { userPrompt } = req.body;
  if (!userPrompt) return res.status(400).json({ message: 'userPrompt is required' });
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'AI service not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: MAGIC_PAGES_SYSTEM_PROMPT,
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
- Use the primary keyword exactly 3 times (once in opening, twice in body)
- Use each secondary keyword exactly 2 times, spread across different sections
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

    console.log(`🤖 Auto-write started: ${blogs.length} blogs to process`);

    for (const blog of blogs) {
      const fields = blog.fields;
      const title = fields['Blog Title (Topic)'] || 'Untitled';
      try {
        console.log(`📝 Writing: "${title}"`);

        await markInProgress(clientId, blog.id);

        const blogContent = await callClaude(BLOG_SYSTEM_PROMPT, buildAutoPrompt(fields));

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