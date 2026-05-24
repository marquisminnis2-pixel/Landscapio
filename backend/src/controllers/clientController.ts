import { Response } from 'express';
import Client from '../models/Client';
import Conversation from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';

// ── Create Client ────────────────────────────────────────────────────────────
export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const {
      businessName,
      industry,
      websiteUrl,
      brandVoice,
      targetAudience,
      notes,
      airtableBaseId,
      airtableBlogTrackerTable,
    } = req.body;
    if (!businessName || !industry) {
      return res.status(400).json({ message: 'Business name and industry are required' });
    }

    const client = await Client.create({
      userId: req.userId,
      orgId: req.orgId,
      businessName,
      industry,
      websiteUrl,
      brandVoice,
      targetAudience,
      notes,
      airtableBaseId,
      airtableBlogTrackerTable,
      app: 'landscapio',
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Get All Clients ──────────────────────────────────────────────────────────
export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await Client.find({ userId: req.userId, orgId: req.orgId, app: 'landscapio' }).sort({ updatedAt: -1 });
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Get Single Client ────────────────────────────────────────────────────────
export const getClient = async (req: AuthRequest, res: Response) => {
  try {
    const client = await Client.findOne({ _id: req.params.clientId, userId: req.userId, orgId: req.orgId });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Update Client ────────────────────────────────────────────────────────────
export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const {
      businessName,
      industry,
      websiteUrl,
      brandVoice,
      targetAudience,
      notes,
      airtableBaseId,
      airtableBlogTrackerTable,
    } = req.body;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.clientId, userId: req.userId, orgId: req.orgId },
      {
        businessName,
        industry,
        websiteUrl,
        brandVoice,
        targetAudience,
        notes,
        airtableBaseId,
        airtableBlogTrackerTable,
      },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Delete Client (soft delete) ──────────────────────────────────────────────
export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.clientId, userId: req.userId, orgId: req.orgId },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Get Conversations for a Client ───────────────────────────────────────────
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    // Verify client belongs to this user
    const client = await Client.findOne({ _id: req.params.clientId, userId: req.userId, orgId: req.orgId });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const conversations = await Conversation.find({ clientId: req.params.clientId, userId: req.userId }).sort({ createdAt: 1 });
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Save a Conversation Message ──────────────────────────────────────────────
export const saveConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { role, content } = req.body;
    if (!role || !content) {
      return res.status(400).json({ message: 'Role and content are required' });
    }

    // Verify client belongs to this user
    const client = await Client.findOne({ _id: req.params.clientId, userId: req.userId, orgId: req.orgId });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const message = await Conversation.create({
      clientId: req.params.clientId,
      userId: req.userId,
      role,
      content,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Save conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Clear Conversations for a Client ─────────────────────────────────────────
export const clearConversations = async (req: AuthRequest, res: Response) => {
  try {
    const client = await Client.findOne({ _id: req.params.clientId, userId: req.userId, orgId: req.orgId });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    await Conversation.deleteMany({ clientId: req.params.clientId, userId: req.userId });
    res.json({ message: 'Conversations cleared' });
  } catch (error) {
    console.error('Clear conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Client-Scoped Geni Chat ─────────────────────────────────────────────────
export const clientGeniChat = async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'messages array is required' });
    }

    // Verify client belongs to this user
    const client = await Client.findOne({ _id: req.params.clientId, userId: req.userId, orgId: req.orgId });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ message: 'AI service not configured' });
    }

    // Build client-specific system prompt
    const systemPrompt = `You are Luma, an AI assistant for Landscapio working on behalf of ${client.businessName}.
Industry: ${client.industry}
Website: ${client.websiteUrl || 'Not provided'}
Brand voice: ${client.brandVoice || 'Not specified'}
Target audience: ${client.targetAudience || 'Not specified'}
Additional notes: ${client.notes || 'None'}

Always keep this client's context in mind. Tailor all output to their brand, audience, and goals.
You are helpful, creative, and concise. When asked to generate content, match the brand voice described above.
When asked about strategy, tailor recommendations to the industry and target audience.`;

    // Stream response using SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
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
      for (const line of raw.split('\n')) {
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
    console.error('Client Geni chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};