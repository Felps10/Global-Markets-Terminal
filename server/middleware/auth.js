import { supabase } from '../db.js';

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

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error:   'FORBIDDEN',
      message: 'Admin role required',
    });
  }
  next();
}
