import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OrgRole } from '../models/Membership';

export interface AuthRequest extends Request {
  userId?: string;
  orgId?: string;
  membershipRole?: OrgRole;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};