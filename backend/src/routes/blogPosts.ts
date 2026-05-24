import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';
import {
  saveBlogPost,
  getBlogPosts,
  getBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '../controllers/blogPostController';

const router = Router();

router.use(authMiddleware);

// Org-scoped blog post routes
router.post('/:orgId/blog-posts', resolveOrg, authorize('project:create'), saveBlogPost);
router.get('/:orgId/blog-posts', resolveOrg, authorize('project:read'), getBlogPosts);
router.get('/:orgId/blog-posts/:id', resolveOrg, authorize('project:read'), getBlogPost);
router.put('/:orgId/blog-posts/:id', resolveOrg, authorize('project:update'), updateBlogPost);
router.delete('/:orgId/blog-posts/:id', resolveOrg, authorize('project:delete'), deleteBlogPost);

export default router;
