import { Router } from 'express';
import { publishSite, getPublishedSite } from '../controllers/publishController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// Publish requires auth + org context + project:publish permission
router.post('/:orgId/publish/:projectId', authMiddleware, resolveOrg, authorize('project:publish'), publishSite);

// Public route — view a published site by subdomain (no auth)
router.get('/:subdomain', getPublishedSite);

export default router;