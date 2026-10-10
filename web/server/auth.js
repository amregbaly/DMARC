import 'dotenv/config';
import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET environment variable must be configured with at least 32 characters.');
}
const TOKEN_EXPIRY = '7d';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware: Verify JWT and attach active user to req.user
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Also support token passed in query parameter (e.g. for browser file downloads like PDF/XLSX/CSV/NDJSON)
  if (!token && req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  const user = db.getUserById(decoded.id);
  if (!user || !user.is_active) {
    return res.status(403).json({ error: 'User account is inactive or no longer exists.' });
  }

  // Attach fresh user info with current domains to request (do not leak parent_id)
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    domains: user.domains || []
  };

  next();
}

// Middleware: Restrict route to specific roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
}

// Middleware: Enforce domain-scoped access for data endpoints
export function enforceDomainAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Super Admin has unrestricted access to all domains
  if (req.user.role === 'admin') {
    req.allowedDomains = null; // null indicates unrestricted
    return next();
  }

  const userDomains = req.user.domains || [];

  // If user has zero assigned domains, block access gracefully
  if (userDomains.length === 0) {
    return res.status(403).json({
      error: 'No domains have been assigned to your account. Please contact your administrator.'
    });
  }

  const requestedDomain = req.query.domain ? req.query.domain.trim().toLowerCase() : null;

  if (requestedDomain && requestedDomain !== 'all') {
    if (!userDomains.includes(requestedDomain)) {
      return res.status(403).json({
        error: `Access denied: You do not have permission to view data for "${requestedDomain}".`
      });
    }
    // Specific domain allowed
    req.allowedDomains = [requestedDomain];
  } else {
    // "all" or omitted domain -> scope query to all of this user's assigned domains
    req.allowedDomains = userDomains;
  }

  next();
}

export default {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole,
  enforceDomainAccess
};
