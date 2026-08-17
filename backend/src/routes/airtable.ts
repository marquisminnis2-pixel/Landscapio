import { Router, Request, Response } from 'express';
import { logBlogToAirtable } from '../services/airtableService';
import { fetchBlogs, markInProgress, updateBlogRecord } from '../services/blogTrackerService';
import { extractMetaPreamble } from '../utils/seoChecklist';
import { isOutlineType } from '../utils/blogOutlineRules';
import {
  fetchSocialPosts,
  updateSocialPostRecord,
  logSocialPostToAirtable,
} from '../services/socialPostsTrackerService';

const router = Router();

// Existing: log a new blog row
router.post('/log-blog', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }
    const result = await logBlogToAirtable(req.body);
    if (!result) {
      return res.json({ success: false, error: 'Airtable not configured for this client' });
    }
    res.json({ success: true, id: (result as any).id });
  } catch (error: any) {
    console.error('Airtable log error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blog Tracker: fetch blogs, optionally filtered by status
router.get('/fetch-blogs', async (req: Request, res: Response) => {
  try {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const records = await fetchBlogs(clientId, status);
    res.json({ success: true, records });
  } catch (error: any) {
    console.error('Airtable fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blog Tracker: mark a row as "In Progress"
router.post('/mark-progress', async (req: Request, res: Response) => {
  const { clientId, recordId } = req.body;
  try {
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    if (!recordId) return res.status(400).json({ success: false, error: 'recordId is required' });
    await markInProgress(clientId, recordId);
    res.json({ success: true });
  } catch (error: any) {
    const notConfigured = /not configured/i.test(error?.message || '');
    console.error(`Airtable mark-progress error [client=${clientId} record=${recordId}]:`, error?.message, '\n', error?.stack);
    // Config problems are caller data, not a transient upstream failure → 400; real Airtable errors → 502.
    res.status(notConfigured ? 400 : 502).json({ success: false, error: error?.message || 'Unknown error' });
  }
});

// Blog Tracker: update a row with blog content, meta, and status
router.post('/update-blog', async (req: Request, res: Response) => {
  const { clientId, recordId, blogContent, status, metaTitle, metaDescription, outlineType } = req.body;
  try {
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    if (!recordId || !status) {
      return res.status(400).json({ success: false, error: 'recordId and status are required' });
    }
    const fields: Record<string, string> = { 'Blog Status': status };
    // The draft carries "Meta Title:" / "Meta Description:" lines above the H1
    // because the generation prompt asks for them. They belong in the dedicated
    // columns below, not in the body, so strip them before the copy is stored.
    const meta = extractMetaPreamble(blogContent || '');
    if (blogContent) fields['Blog Copy'] = meta.content;
    // generateMeta (frontend) normally supplies these. When it failed or was never
    // run, the values recovered from the preamble are better than writing nothing.
    const finalMetaTitle = metaTitle || meta.metaTitle;
    const finalMetaDescription = metaDescription || meta.metaDescription;
    if (!metaTitle && meta.metaTitle) {
      console.warn(`[airtable:update-blog] metaTitle missing for record ${recordId} — recovered from draft preamble`);
    }
    if (!metaDescription && meta.metaDescription) {
      console.warn(`[airtable:update-blog] metaDescription missing for record ${recordId} — recovered from draft preamble`);
    }
    if (finalMetaTitle) fields['Meta Title'] = finalMetaTitle;
    if (finalMetaDescription) fields['Meta Description'] = finalMetaDescription;
    // Structural shape the copy was generated to, alongside the copy itself. Only a
    // real template name is stored — anything else fell through to the default shape.
    if (isOutlineType(outlineType)) fields['Blog Outline Type'] = outlineType;
    const result = await updateBlogRecord(clientId, recordId, fields);
    res.json({ success: true, result });
  } catch (error: any) {
    const notConfigured = /not configured/i.test(error?.message || '');
    console.error(
      `Airtable update-blog error [client=${clientId} record=${recordId} status=${status} fields=${[blogContent && 'Blog Copy', metaTitle && 'Meta Title', metaDescription && 'Meta Description'].filter(Boolean).join(',')}]:`,
      error?.message, '\n', error?.stack,
    );
    res.status(notConfigured ? 400 : 502).json({ success: false, error: error?.message || 'Unknown error' });
  }
});

// Social Posts Tracker: fetch rows, optionally filtered by Copy Status
router.get('/fetch-social-posts', async (req: Request, res: Response) => {
  try {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const records = await fetchSocialPosts(clientId, status);
    res.json({ success: true, records });
  } catch (error: any) {
    console.error('Airtable fetch social posts error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Social Posts Tracker: update a row with caption, status, etc.
router.post('/update-social-post', async (req: Request, res: Response) => {
  try {
    const { clientId, recordId, postCaption, copyStatus, notes } = req.body;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    if (!recordId) return res.status(400).json({ success: false, error: 'recordId is required' });
    const fields: Record<string, string> = {};
    if (postCaption !== undefined) fields['Post Caption'] = postCaption;
    if (copyStatus) fields['Copy Status'] = copyStatus;
    if (notes !== undefined) fields['Notes'] = notes;
    const result = await updateSocialPostRecord(clientId, recordId, fields);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Airtable update social post error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Social Posts Tracker: append a new row
router.post('/log-social-post', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }
    const result = await logSocialPostToAirtable(req.body);
    if (!result) {
      return res.json({ success: false, error: 'Airtable not configured for this client' });
    }
    res.json({ success: true, id: (result as any).id });
  } catch (error: any) {
    console.error('Airtable log social post error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
