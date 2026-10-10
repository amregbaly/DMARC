import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'sentinel.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'viewer')),
      organization_name TEXT,
      logo_url TEXT,
      parent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_domains (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain TEXT NOT NULL COLLATE NOCASE,
      PRIMARY KEY (user_id, domain)
    );

    CREATE TABLE IF NOT EXISTS reports_history (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      username TEXT,
      domain TEXT NOT NULL,
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      formats TEXT NOT NULL,
      status TEXT NOT NULL,
      files TEXT NOT NULL,
      summary_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      template_id TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      recipients TEXT NOT NULL,
      formats TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON user_domains(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_domains_domain ON user_domains(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_history_domain ON reports_history(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_history_created_at ON reports_history(created_at);
  `);

  // Run schema migrations for existing database files
  try {
    db.prepare('ALTER TABLE users ADD COLUMN organization_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE users ADD COLUMN logo_url TEXT').run();
  } catch (e) {}

  // Ensure initial admin exists if user table is brand new
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const adminId = crypto.randomUUID();
    const now = new Date().toISOString();
    const isCustomPassword = Boolean(process.env.INITIAL_ADMIN_PASSWORD);
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(initialPassword, salt);
    const initialEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@dmarcsentinel.local').trim().toLowerCase();
    const initialUsername = (process.env.INITIAL_ADMIN_USERNAME || 'admin').trim();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, organization_name, logo_url, parent_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DMARC Sentinel Corp', '', NULL, 1, ?, ?)
    `).run(adminId, initialUsername, initialEmail, passwordHash, 'admin', now, now);

    console.log(`[BOOTSTRAP] Initial admin created: ${initialEmail} (username: ${initialUsername})`);
    if (!isCustomPassword) {
      console.log(`[BOOTSTRAP] Temporary Generated Admin Password: ${initialPassword}`);
      console.log(`[BOOTSTRAP] ACTION REQUIRED: Change this password immediately upon first login!`);
    }
  }
}

export function getUserByUsername(username) {
  if (!username) return null;
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!user) return null;
  user.domains = getUserDomains(user.id);
  return user;
}

export function getUserByEmail(email) {
  if (!email) return null;
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
  if (!user) return null;
  user.domains = getUserDomains(user.id);
  return user;
}

export function getUserByEmailOrUsername(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE').get(clean, clean);
  if (!user) return null;
  user.domains = getUserDomains(user.id);
  return user;
}

export function getUserById(id) {
  if (!id) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return null;
  user.domains = getUserDomains(user.id);
  return user;
}

export function getUserDomains(userId) {
  const rows = db.prepare('SELECT domain FROM user_domains WHERE user_id = ? ORDER BY domain ASC').all(userId);
  return rows.map(r => r.domain);
}

export function getAllUsers(caller) {
  let stmt;
  if (caller.role === 'admin') {
    stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.organization_name, u.logo_url, u.parent_id, u.is_active, u.created_at, u.updated_at,
             p.username as parent_username
      FROM users u
      LEFT JOIN users p ON u.parent_id = p.id
      ORDER BY u.created_at DESC
    `);
  } else if (caller.role === 'manager') {
    stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.organization_name, u.logo_url, u.is_active, u.created_at, u.updated_at
      FROM users u
      WHERE u.parent_id = ?
      ORDER BY u.created_at DESC
    `);
  } else {
    return [];
  }

  const users = caller.role === 'admin' ? stmt.all() : stmt.all(caller.id);
  
  // Attach domains to each user
  const domainsStmt = db.prepare('SELECT domain FROM user_domains WHERE user_id = ? ORDER BY domain ASC');
  return users.map(u => ({
    ...u,
    organization_name: u.organization_name || '',
    logo_url: u.logo_url || '',
    is_active: Boolean(u.is_active),
    domains: domainsStmt.all(u.id).map(r => r.domain)
  }));
}

export function createUser({ email, username, password, role, organization_name = '', logo_url = '', parentId = null, domains = [] }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync(password, salt);

  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanUsername = username && typeof username === 'string' && username.trim()
    ? username.trim()
    : (cleanEmail ? cleanEmail.split('@')[0] : 'user');
  const cleanOrg = (organization_name || '').trim();
  const cleanLogo = (logo_url || '').trim();

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, organization_name, logo_url, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertDomain = db.prepare(`
    INSERT INTO user_domains (user_id, domain) VALUES (?, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run(id, cleanUsername, cleanEmail, passwordHash, role, cleanOrg, cleanLogo, parentId, now, now);
    if (Array.isArray(domains)) {
      for (const d of domains) {
        if (d && typeof d === 'string' && d.trim()) {
          insertDomain.run(id, d.trim().toLowerCase());
        }
      }
    }
  });

  tx();
  return getUserById(id);
}

export function updateUser(id, { email, username, password, role, organization_name, logo_url, isActive, domains }) {
  const existing = getUserById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    let passwordHash = existing.password_hash;
    if (password && password.trim().length > 0) {
      const salt = bcrypt.genSaltSync(12);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    const newRole = role !== undefined ? role : existing.role;
    const newEmail = email !== undefined ? (email ? email.trim() : null) : existing.email;
    const newUsername = username !== undefined ? (username ? username.trim() : existing.username) : existing.username;
    const newOrg = organization_name !== undefined ? (organization_name ? organization_name.trim() : '') : existing.organization_name;
    const newLogo = logo_url !== undefined ? (logo_url ? logo_url.trim() : '') : existing.logo_url;
    const newIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE users
      SET username = ?, email = ?, password_hash = ?, role = ?, organization_name = ?, logo_url = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(newUsername, newEmail, passwordHash, newRole, newOrg, newLogo, newIsActive, now, id);

    if (Array.isArray(domains)) {
      db.prepare('DELETE FROM user_domains WHERE user_id = ?').run(id);
      const insertDomain = db.prepare('INSERT INTO user_domains (user_id, domain) VALUES (?, ?)');
      for (const d of domains) {
        if (d && typeof d === 'string' && d.trim()) {
          insertDomain.run(id, d.trim().toLowerCase());
        }
      }
    }
  });

  tx();
  return getUserById(id);
}

export function updateUserProfile(id, { username, organization_name, logo_url }) {
  const existing = getUserById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newUsername = username !== undefined && username.trim() ? username.trim() : existing.username;
  const newOrg = organization_name !== undefined ? organization_name.trim() : (existing.organization_name || '');
  const newLogo = logo_url !== undefined ? logo_url.trim() : (existing.logo_url || '');

  db.prepare(`
    UPDATE users
    SET username = ?, organization_name = ?, logo_url = ?, updated_at = ?
    WHERE id = ?
  `).run(newUsername, newOrg, newLogo, now, id);

  return getUserById(id);
}

export function deleteUser(id) {
  const existing = getUserById(id);
  if (!existing) return false;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return true;
}

export function changePassword(id, newPassword) {
  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync(newPassword.trim(), salt);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, id);
  return true;
}

export function addReportHistory({ id, userId, username, domain, templateId, templateName, formats, status, files, summaryJson }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reports_history (id, user_id, username, domain, template_id, template_name, formats, status, files, summary_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId || null,
    username || 'System',
    domain || 'all',
    templateId || 'default',
    templateName || 'Sentinel Enterprise',
    JSON.stringify(formats || []),
    status || 'completed',
    JSON.stringify(files || {}),
    JSON.stringify(summaryJson || {}),
    now
  );
  return getReportHistoryItem(id);
}

export function getReportHistoryItem(id) {
  const row = db.prepare('SELECT * FROM reports_history WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    formats: JSON.parse(row.formats || '[]'),
    files: JSON.parse(row.files || '{}'),
    summary: JSON.parse(row.summary_json || '{}')
  };
}

export function getReportHistory(userDomains = null, limit = 50) {
  let query = 'SELECT * FROM reports_history';
  const params = [];
  if (Array.isArray(userDomains) && userDomains.length > 0) {
    const placeholders = userDomains.map(() => '?').join(',');
    query += ` WHERE domain IN (${placeholders}) OR domain = 'all'`;
    params.push(...userDomains);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    formats: JSON.parse(r.formats || '[]'),
    files: JSON.parse(r.files || '{}'),
    summary: JSON.parse(r.summary_json || '{}')
  }));
}

export function createReportSchedule({ id, userId, name, domain, templateId, scheduleType, recipients, formats }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reports_schedules (id, user_id, name, domain, template_id, schedule_type, recipients, formats, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    userId,
    name,
    domain || 'all',
    templateId || 'default',
    scheduleType || 'weekly',
    recipients || '',
    JSON.stringify(formats || ['pdf']),
    now,
    now
  );
  return db.prepare('SELECT * FROM reports_schedules WHERE id = ?').get(id);
}

export function getReportSchedules(userId = null) {
  let query = 'SELECT * FROM reports_schedules';
  const params = [];
  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    formats: JSON.parse(r.formats || '[]')
  }));
}

export function deleteReportSchedule(id) {
  return db.prepare('DELETE FROM reports_schedules WHERE id = ?').run(id).changes > 0;
}

export default {
  initDb,
  getUserByUsername,
  getUserByEmail,
  getUserByEmailOrUsername,
  getUserById,
  getUserDomains,
  getAllUsers,
  createUser,
  updateUser,
  updateUserProfile,
  deleteUser,
  changePassword,
  addReportHistory,
  getReportHistoryItem,
  getReportHistory,
  createReportSchedule,
  getReportSchedules,
  deleteReportSchedule
};
