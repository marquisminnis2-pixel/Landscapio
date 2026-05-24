import { Router } from 'express';
import {
  listMembers,
  inviteMember,
  changeRole,
  removeMember,
  leaveOrg,
} from '../controllers/membershipController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// All member routes require auth + org context
router.use(authMiddleware);

// Routes scoped to an org (orgId comes from URL param)
router.get('/:orgId/members', resolveOrg, authorize('member:list'), listMembers);
router.post('/:orgId/members', resolveOrg, authorize('member:invite'), inviteMember);
router.put('/:orgId/members/:memberId/role', resolveOrg, authorize('member:role'), changeRole);
router.delete('/:orgId/members/:memberId', resolveOrg, authorize('member:remove'), removeMember);
router.post('/:orgId/leave', resolveOrg, leaveOrg);

export default router;