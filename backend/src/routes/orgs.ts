import { Router } from 'express';
import { getMyOrgs, getOrg, createOrg, updateOrg, deleteOrg } from '../controllers/orgController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// All org routes require authentication
router.use(authMiddleware);

// Get all orgs the current user belongs to
router.get('/', getMyOrgs);

// Create a new org
router.post('/', createOrg);

// Routes that require org context
router.get('/:orgId', resolveOrg, getOrg);
router.put('/:orgId', resolveOrg, authorize('org:settings'), updateOrg);
router.delete('/:orgId', resolveOrg, authorize('org:delete'), deleteOrg);

export default router;