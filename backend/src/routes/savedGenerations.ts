import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';
import {
  saveGeneration,
  getGenerations,
  getGeneration,
  updateGeneration,
  deleteGeneration,
} from '../controllers/savedGenerationController';

const router = Router();

router.use(authMiddleware);

// Org-scoped saved generation routes
router.post('/:orgId/generations', resolveOrg, authorize('project:create'), saveGeneration);
router.get('/:orgId/generations', resolveOrg, authorize('project:read'), getGenerations);
router.get('/:orgId/generations/:id', resolveOrg, authorize('project:read'), getGeneration);
router.put('/:orgId/generations/:id', resolveOrg, authorize('project:update'), updateGeneration);
router.delete('/:orgId/generations/:id', resolveOrg, authorize('project:delete'), deleteGeneration);

export default router;