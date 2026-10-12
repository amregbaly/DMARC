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

export function getCookie(req, name) {
  if (!req.headers || !req.headers.cookie) return null;
  const match = req.headers.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Middleware: Verify JWT and attach active user to req.user
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // 1. Check query parameter (e.g. for browser file downloads like PDF/XLSX/CSV/NDJSON)
  if (!token && req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  // 2. Check Cookie (auth_token)
  if (!token) {
    const cookieToken = getCookie(req, 'auth_token');
    if (cookieToken && typeof cookieToken === 'string' && cookieToken.trim()) {
      token = cookieToken.trim();
    }
  }

  if (!token) {
    // If request is from an interactive browser navigating directly to a downloadable file, serve an auto-auth helper that checks localStorage
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (acceptsHtml && req.method === 'GET' && req.originalUrl && req.originalUrl.includes('/api/reports/download/')) {
      return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Downloading Report...</title>
  <style>
    body { background: #0b1120; color: #94a3b8; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; max-width: 440px; padding: 2.5rem 2rem; background: #1e293b; border-radius: 1.25rem; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(56,189,248,0.15); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.25rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #38bdf8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="box" id="msg">
    <div class="spinner"></div>
    <div style="font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 0.5rem;">Authorizing Report Download...</div>
    <div style="font-size: 13px; color: #94a3b8;">Verifying active session and preparing your file.</div>
  </div>
  <script>
    (function() {
      try {
        const token = localStorage.getItem('sentinel_auth_token');
        if (token) {
          document.cookie = "auth_token=" + encodeURIComponent(token) + "; path=/; max-age=604800; SameSite=Lax";
          const url = new URL(window.location.href);
          url.searchParams.set('token', token);
          window.location.replace(url.toString());
        } else {
          document.getElementById('msg').innerHTML = '<h3 style="color:#f87171;margin-top:0;">Authentication Required</h3><p style="font-size:13px;line-height:1.5;">You must be logged into DMARC Sentinel to access this report asset.</p><p style="margin-top:1.5rem;"><a href="/">&larr; Return to Sign In</a></p>';
        }
      } catch (e) {
        document.getElementById('msg').innerHTML = '<h3 style="color:#f87171;margin-top:0;">Authentication Error</h3><p style="font-size:13px;">Please return to the dashboard and try again.</p><p><a href="/">&larr; Return to Sign In</a></p>';
      }
    })();
  </script>
</body>
</html>`);
    }

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
    organization_name: user.organization_name || '',
    logo_url: user.logo_url || '',
    language: user.language || 'en',
    theme: user.theme || 'dark',
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
