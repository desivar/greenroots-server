import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: UserRole;
    country: string;
    gender: string;
    zoneId?: string;
    districtId?: string;
  };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: UserRole };
    const user    = await User.findById(decoded.id).select('_id role country gender zone district isActive isApproved');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }
    if (!user.isApproved) {
      res.status(403).json({ success: false, message: 'Account pending approval' });
      return;
    }
    req.user = {
      _id:     (user._id as { toString(): string }).toString(),
      role:    user.role,
      country: user.country,
      gender:  user.gender,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied — insufficient permissions' });
      return;
    }
    next();
  };

// Named guards used across all routes
export const ceoOnly         = authorize('ceo');
export const adminPanel      = authorize('ceo', 'assistant');
export const secretaryOrAbove = authorize(
  'ceo', 'assistant',
  'secretary_finances', 'secretary_immigration',
  'secretary_materials', 'secretary_technology'
);
export const leaderOrAbove   = authorize(
  'ceo', 'assistant', 'zone_leader', 'district_leader',
  'secretary_finances', 'secretary_immigration',
  'secretary_materials', 'secretary_technology'
);
export const isFinances      = authorize('ceo', 'assistant', 'secretary_finances');
export const isImmigration   = authorize('ceo', 'assistant', 'secretary_immigration');
export const isMaterials     = authorize('ceo', 'assistant', 'secretary_materials');
export const isTech          = authorize('ceo', 'assistant', 'secretary_technology');
