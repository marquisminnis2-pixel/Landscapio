import { Router, Request, Response } from 'express';
import { logBlogToAirtable } from '../services/airtableService';
import { fetchBlogs, markInProgress, updateBlogRecord } from '../services/blogTrackerService';
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
  try {
    const { clientId, recordId } = req.body;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    if (!recordId) return res.status(400).json({ success: false, error: 'recordId is required' });
    await markInProgress(clientId, recordId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Airtable mark-progress error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blog Tracker: update a row with blog content, meta, and status
router.post('/update-blog', async (req: Request, res: Response) => {
  try {
    const { clientId, recordId, blogContent, status, metaTitle, metaDescription } = req.body;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    if (!recordId || !status) {
      return res.status(400).json({ success: false, error: 'recordId and status are required' });
    }
    const fields: Record<string, string> = { 'Blog Status': status };
    if (blogContent) fields['Blog Copy'] = blogContent;
    if (metaTitle) fields['Meta Title'] = metaTitle;
    if (metaDescription) fields['Meta Description'] = metaDescription;
    const result = await updateBlogRecord(clientId, recordId, fields);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Airtable update-blog error:', error.message);
    res.status(500).json({ success: false, error: error.message });
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
