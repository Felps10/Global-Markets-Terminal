import { supabase } from '../db.js';
import { hasRole } from '../lib/roles.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error:   'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      error:   'TOKEN_INVALID',
      message: 'Token is invalid or expired',
    });
  }

  req.user = {
    id:    user.id,
    email: user.email,
    name:  user.user_metadata?.name || '',
    role:  user.user_metadata?.role || 'user',
  };

  next();
}

export function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error:   'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    if (!hasRole(req.user.role, minRole)) {
      return res.status(403).json({
        error:    'FORBIDDEN',
        message:  `Requires role: ${minRole}`,
        yourRole: req.user.role,
      });
    }
    next();
  };
}

// Backwards-compatible alias — do not remove
export const requireAdmin = requireRole('admin');
