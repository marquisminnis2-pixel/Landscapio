import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from './auth';

/**
 * Superadmin middleware — checks the user's globalRole.
 * Used for platform-level operations (template imports, etc).
 * Must be used AFTER authMiddleware.
 */
export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await User.findById(req.userId).select('globalRole');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.globalRole !== 'superadmin') return res.status(403).json({ message: 'Superadmin role required' });
    next();
  } catch (err) {
    console.error('adminMiddleware error', err);
    res.status(500).json({ message: 'Server error' });
  }
};