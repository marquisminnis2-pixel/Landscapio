import { Response, NextFunction } from 'express';
import { Permission, hasPermission } from '../config/permissions';
import { AuthRequest } from './auth';

/**
 * Authorization middleware factory.
 * Checks if the user's org role has the required permission.
 *
 * Must be used AFTER authMiddleware and resolveOrg.
 *
 * Usage:
 *   router.get('/projects', auth, resolveOrg, authorize('project:read'), handler);
 */
export const authorize = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.membershipRole) {
      return res.status(403).json({ message: 'No organization role found. Ensure resolveOrg middleware runs first.' });
    }

    if (!hasPermission(req.membershipRole, permission)) {
      return res.status(403).json({
        message: `Insufficient permissions. Required: ${permission}`,
      });
    }

    next();
  };
};