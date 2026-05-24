import { Router } from 'express';
import { chat, copyrightChat, blogChat, postsChat, contentChat, pagesGenerate, autoWriteBlogs } from '../controllers/aiController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Geni canvas AI chat
router.post('/chat', authMiddleware, chat);

// Desktop AI apps - streaming SSE
router.post('/copyright/chat', authMiddleware, copyrightChat);
router.post('/blog/chat', authMiddleware, blogChat);
router.post('/posts/chat', authMiddleware, postsChat);
router.post('/content/chat', authMiddleware, contentChat);
router.post('/pages/generate', authMiddleware, pagesGenerate);

// Auto-write all "Not Started" blogs from Airtable tracker
router.post('/auto-write', authMiddleware, autoWriteBlogs);

export default router;
