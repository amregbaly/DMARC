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

    CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON user_domains(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_domains_domain ON user_domains(domain);
  `);

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
      INSERT INTO users (id, username, email, password_hash, role, parent_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?)
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
      SELECT u.id, u.username, u.email, u.role, u.parent_id, u.is_active, u.created_at, u.updated_at,
             p.username as parent_username
      FROM users u
      LEFT JOIN users p ON u.parent_id = p.id
      ORDER BY u.created_at DESC
    `);
  } else if (caller.role === 'manager') {
    stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.updated_at
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
    is_active: Boolean(u.is_active),
    domains: domainsStmt.all(u.id).map(r => r.domain)
  }));
}

export function createUser({ email, username, password, role, parentId = null, domains = [] }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync(password, salt);

  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanUsername = username && typeof username === 'string' && username.trim()
    ? username.trim()
    : (cleanEmail ? cleanEmail.split('@')[0] : 'user');

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertDomain = db.prepare(`
    INSERT INTO user_domains (user_id, domain) VALUES (?, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run(id, cleanUsername, cleanEmail, passwordHash, role, parentId, now, now);
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

export function updateUser(id, { email, password, role, isActive, domains }) {
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
    const newIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE users
      SET email = ?, password_hash = ?, role = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(newEmail, passwordHash, newRole, newIsActive, now, id);

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
  deleteUser,
  changePassword
};
