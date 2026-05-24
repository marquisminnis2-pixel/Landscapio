import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// All project routes require auth + org context
router.use(authMiddleware);

// Org-scoped project routes — orgId comes from URL param
router.get('/:orgId/projects', resolveOrg, authorize('project:read'), getProjects);
router.get('/:orgId/projects/:id', resolveOrg, authorize('project:read'), getProject);
router.post('/:orgId/projects', resolveOrg, authorize('project:create'), createProject);
router.put('/:orgId/projects/:id', resolveOrg, authorize('project:update'), updateProject);
router.delete('/:orgId/projects/:id', resolveOrg, authorize('project:delete'), deleteProject);

export default router;