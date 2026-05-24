import { Response, NextFunction } from 'express';
import Membership from '../models/Membership';
import { AuthRequest } from './auth';

/**
 * Resolves the organization context from the request.
 * Reads orgId from URL params (`:orgId`) or the `x-org-id` header.
 * Verifies the authenticated user is a member of that org.
 * Attaches `req.orgId` and `req.membershipRole` for downstream use.
 *
 * Must be used AFTER authMiddleware.
 */
export const resolveOrg = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.params.orgId || req.headers['x-org-id'] as string;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is required (param :orgId or header x-org-id)' });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify user is a member of the org
    const membership = await Membership.findOne({
      userId: req.userId,
      orgId,
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this organization' });
    }

    req.orgId = orgId;
    req.membershipRole = membership.role;
    next();
  } catch (error) {
    console.error('resolveOrg error:', error);
    res.status(500).json({ message: 'Server error resolving organization' });
  }
};