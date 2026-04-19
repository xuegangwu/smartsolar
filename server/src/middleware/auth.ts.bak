import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smartsolar_secret_key_change_in_production';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator' | 'technician' | 'manager';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Verify JWT token
export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 无效' });
  }
}

// Role-based access control
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
}

// Permission matrix
export const PERMISSIONS = {
  // Work Orders
  'work-orders:create': ['admin', 'operator', 'manager'],
  'work-orders:update': ['admin', 'operator', 'manager'],
  'work-orders:delete': ['admin', 'manager'],
  'work-orders:assign': ['admin', 'operator', 'manager'],
  
  // Equipment
  'equipment:create': ['admin', 'manager'],
  'equipment:update': ['admin', 'operator', 'manager'],
  'equipment:delete': ['admin', 'manager'],
  
  // Stations
  'stations:create': ['admin', 'manager'],
  'stations:update': ['admin', 'operator', 'manager'],
  'stations:delete': ['admin', 'manager'],
  
  // Spare Parts
  'spare-parts:create': ['admin', 'manager'],
  'spare-parts:update': ['admin', 'operator', 'manager'],
  'spare-parts:delete': ['admin', 'manager'],
  
  // Inspection
  'inspection:create': ['admin', 'operator', 'manager'],
  'inspection:delete': ['admin', 'manager'],
  
  // Personnel
  'personnel:create': ['admin', 'manager'],
  'personnel:update': ['admin', 'operator', 'manager'],
  'personnel:delete': ['admin', 'manager'],
  
  // Reports - all roles can view
  'reports:view': ['admin', 'operator', 'technician', 'manager'],
  
  // KPI - operators and above
  'kpi:view': ['admin', 'operator', 'manager'],
  
  // Admin panel
  'admin:access': ['admin', 'manager'],
};

// Check specific permission
export function hasPermission(role: string, permission: string): boolean {
  const allowed = PERMISSIONS[permission as keyof typeof PERMISSIONS];
  if (!allowed) return false;
  return allowed.includes(role);
}
