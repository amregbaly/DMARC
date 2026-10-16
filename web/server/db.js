import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encrypt, decrypt, maskSecret } from './services/crypto.js';

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

export const DEFAULT_SYSTEM_THEMES = [
  {
    id: 'dark',
    name: 'Cyber Dark',
    desc: 'Sentinel SOC classic midnight & cyan',
    category: 'dark',
    badge: 'Classic SOC',
    is_default: 0,
    colors: {
      bg: '#030712',
      card: '#0f172a',
      cardHover: '#1e293b',
      border: '#1e293b',
      borderSubtle: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      glassBg: 'rgba(15, 23, 42, 0.65)',
      glassBorder: 'rgba(255, 255, 255, 0.07)',
      sidebarBg: '#030712',
      sidebarBorder: '#1e293b',
      sidebarText: '#94a3b8',
      sidebarTextHover: '#f8fafc',
      sidebarActiveText: '#22d3ee',
      sidebarActiveBg: 'rgba(6, 182, 212, 0.15)',
      sidebarHeaderText: '#64748b',
      chartGrid: '#1e293b',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(15, 23, 42, 0.95)',
      chartTooltipBorder: 'rgba(51, 65, 85, 0.8)',
      chartTooltipText: '#f8fafc',
      mapTiles: 'dark'
    }
  },
  {
    id: 'light',
    name: 'Executive Light',
    desc: 'Crisp corporate slate & brilliant white',
    category: 'light',
    badge: 'Executive',
    is_default: 1,
    colors: {
      bg: '#f8fafc',
      card: '#ffffff',
      cardHover: '#f1f5f9',
      border: '#e2e8f0',
      borderSubtle: '#cbd5e1',
      text: '#0f172a',
      textMuted: '#475569',
      textSubtle: '#64748b',
      accent: '#0284c7',
      accentHover: '#0369a1',
      glassBg: 'rgba(255, 255, 255, 0.90)',
      glassBorder: 'rgba(226, 232, 240, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#e2e8f0',
      sidebarText: '#475569',
      sidebarTextHover: '#0f172a',
      sidebarActiveText: '#0284c7',
      sidebarActiveBg: 'rgba(2, 132, 199, 0.12)',
      sidebarHeaderText: '#64748b',
      chartGrid: '#e2e8f0',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(226, 232, 240, 0.9)',
      chartTooltipText: '#0f172a',
      mapTiles: 'light'
    }
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    desc: 'Cool ice-blue with arctic azure accents',
    category: 'light',
    badge: 'Arctic Blue',
    is_default: 1,
    colors: {
      bg: '#f0f4f8',
      card: '#ffffff',
      cardHover: '#e8f0f8',
      border: '#d0e0f0',
      borderSubtle: '#b8d0e8',
      text: '#081830',
      textMuted: '#385878',
      textSubtle: '#507090',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      glassBg: 'rgba(255, 255, 255, 0.92)',
      glassBorder: 'rgba(208, 224, 240, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#d0e0f0',
      sidebarText: '#385878',
      sidebarTextHover: '#081830',
      sidebarActiveText: '#2563eb',
      sidebarActiveBg: 'rgba(37, 99, 235, 0.12)',
      sidebarHeaderText: '#507090',
      chartGrid: '#dbeafe',
      chartAxis: '#64748b',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(191, 219, 254, 0.9)',
      chartTooltipText: '#081830',
      mapTiles: 'light'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Sentinel',
    desc: 'High-trust sage & forest green security',
    category: 'light',
    badge: 'Compliance',
    is_default: 1,
    colors: {
      bg: '#f2f7f4',
      card: '#ffffff',
      cardHover: '#e8f2ec',
      border: '#d4e4da',
      borderSubtle: '#b8d0c2',
      text: '#081c10',
      textMuted: '#3a5c48',
      textSubtle: '#527460',
      accent: '#059669',
      accentHover: '#047857',
      glassBg: 'rgba(255, 255, 255, 0.92)',
      glassBorder: 'rgba(212, 228, 218, 0.85)',
      sidebarBg: '#ffffff',
      sidebarBorder: '#d4e4da',
      sidebarText: '#3a5c48',
      sidebarTextHover: '#081c10',
      sidebarActiveText: '#059669',
      sidebarActiveBg: 'rgba(5, 150, 105, 0.12)',
      sidebarHeaderText: '#527460',
      chartGrid: '#d1fae5',
      chartAxis: '#475569',
      chartTooltipBg: 'rgba(255, 255, 255, 0.98)',
      chartTooltipBorder: 'rgba(167, 243, 208, 0.9)',
      chartTooltipText: '#081c10',
      mapTiles: 'light'
    }
  }
];

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      desc TEXT,
      category TEXT NOT NULL CHECK(category IN ('dark', 'light')),
      badge TEXT,
      colors_json TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_system_themes_is_default ON system_themes(is_default);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'viewer')),
      organization_name TEXT,
      logo_url TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      theme TEXT NOT NULL DEFAULT 'light',
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
      time_of_day TEXT NOT NULL DEFAULT '08:00',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      send_email INTEGER NOT NULL DEFAULT 0,
      email_format TEXT NOT NULL DEFAULT 'inline_pdf',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS smtp_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 587,
      encryption TEXT NOT NULL DEFAULT 'starttls' CHECK(encryption IN ('none', 'starttls', 'ssl')),
      username TEXT,
      password_encrypted TEXT,
      from_name TEXT NOT NULL DEFAULT 'DMARC Sentinel',
      from_address TEXT NOT NULL,
      reply_to TEXT,
      connection_timeout INTEGER NOT NULL DEFAULT 10000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      enabled INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT 'google',
      model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
      api_key_encrypted TEXT,
      base_url TEXT DEFAULT '',
      temperature REAL DEFAULT 0.2,
      max_tokens INTEGER DEFAULT 2048,
      feature_log_rca INTEGER NOT NULL DEFAULT 1,
      feature_executive_summary INTEGER NOT NULL DEFAULT 1,
      feature_copilot INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_provider_keys (
      provider TEXT PRIMARY KEY,
      model TEXT,
      api_key_encrypted TEXT,
      base_url TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_copilot_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      domain_scope TEXT DEFAULT 'all',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_copilot_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON ai_copilot_sessions(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_copilot_messages_session ON ai_copilot_messages(session_id, created_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_queue (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      attachments_json TEXT,
      email_type TEXT NOT NULL DEFAULT 'notification',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'sent', 'failed')),
      priority INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      run_at TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      email_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'failed')),
      error_message TEXT,
      attempts INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domains_json TEXT NOT NULL DEFAULT '["all"]',
      recipients_json TEXT NOT NULL,
      condition_type TEXT NOT NULL CHECK(condition_type IN ('failure_rate', 'new_sender_ip', 'quarantine_reject_volume', 'alignment_failures', 'report_volume_drop', 'volume_spike', 'disallowed_country_asn')),
      threshold_value REAL NOT NULL,
      time_window_minutes INTEGER NOT NULL DEFAULT 60,
      severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),
      cooldown_minutes INTEGER NOT NULL DEFAULT 60,
      digest_mode INTEGER NOT NULL DEFAULT 0,
      notify_recovery INTEGER NOT NULL DEFAULT 1,
      filter_metadata_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      last_state TEXT NOT NULL DEFAULT 'ok' CHECK(last_state IN ('ok', 'triggered')),
      last_value REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT REFERENCES alert_rules(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      current_value REAL,
      threshold_value REAL,
      matched_values_json TEXT,
      is_recovery INTEGER NOT NULL DEFAULT 0,
      email_sent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS alert_digests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id TEXT REFERENCES alert_rules(id) ON DELETE CASCADE,
      alert_history_id TEXT REFERENCES alert_history(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON user_domains(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_domains_domain ON user_domains(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_history_domain ON reports_history(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_history_created_at ON reports_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_email_queue_status_run_at ON email_queue(status, run_at);
    CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
    CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);
    CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON alert_rules(is_active);
    CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON alert_history(rule_id);
    CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at);
    CREATE INDEX IF NOT EXISTS idx_alert_digests_status ON alert_digests(status, user_id);
  `);

  try {
    db.prepare('ALTER TABLE users ADD COLUMN organization_name TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE users ADD COLUMN logo_url TEXT').run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'en'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'").run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE reports_schedules ADD COLUMN last_run_at TEXT').run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE reports_schedules ADD COLUMN time_of_day TEXT NOT NULL DEFAULT '08:00'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE reports_schedules ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'").run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE reports_schedules ADD COLUMN send_email INTEGER NOT NULL DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE reports_schedules ADD COLUMN email_format TEXT NOT NULL DEFAULT 'inline_pdf'").run();
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
      INSERT INTO users (id, username, email, password_hash, role, organization_name, logo_url, language, theme, parent_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DMARC Sentinel Corp', '', 'en', 'light', NULL, 1, ?, ?)
    `).run(adminId, initialUsername, initialEmail, passwordHash, 'admin', now, now);

    console.log(`[BOOTSTRAP] Initial admin created: ${initialEmail} (username: ${initialUsername})`);
    if (!isCustomPassword) {
      console.log(`[BOOTSTRAP] Temporary Generated Admin Password: ${initialPassword}`);
      console.log(`[BOOTSTRAP] ACTION REQUIRED: Change this password immediately upon first login!`);
    }
  }

  // Ensure default system themes exist
  try {
    const themeCount = db.prepare('SELECT COUNT(*) as count FROM system_themes').get().count;
    if (themeCount === 0) {
      const insertTheme = db.prepare(`
        INSERT INTO system_themes (id, name, desc, category, badge, colors_json, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      for (const t of DEFAULT_SYSTEM_THEMES) {
        insertTheme.run(t.id, t.name, t.desc, t.category, t.badge, JSON.stringify(t.colors), t.is_default, now, now);
      }
      console.log(`[BOOTSTRAP] Seeded ${DEFAULT_SYSTEM_THEMES.length} default system themes.`);
    }
  } catch (err) {
    console.error('[BOOTSTRAP] Error seeding system themes:', err);
  }
}

export function isValidTheme(themeId) {
  if (!themeId || typeof themeId !== 'string') return false;
  try {
    const row = db.prepare('SELECT id FROM system_themes WHERE id = ? COLLATE NOCASE').get(themeId.trim().toLowerCase());
    return Boolean(row);
  } catch (err) {
    return ['dark', 'light', 'nordic', 'emerald'].includes(themeId.trim().toLowerCase());
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
      SELECT u.id, u.username, u.email, u.role, u.organization_name, u.logo_url, u.language, u.theme, u.parent_id, u.is_active, u.created_at, u.updated_at,
             p.username as parent_username
      FROM users u
      LEFT JOIN users p ON u.parent_id = p.id
      ORDER BY u.created_at DESC
    `);
  } else if (caller.role === 'manager') {
    stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.organization_name, u.logo_url, u.language, u.theme, u.is_active, u.created_at, u.updated_at
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
    language: u.language || 'en',
    theme: u.theme || 'light',
    is_active: Boolean(u.is_active),
    domains: domainsStmt.all(u.id).map(r => r.domain)
  }));
}

export function createUser({ email, username, password, role, organization_name = '', logo_url = '', language = 'en', theme = 'light', parentId = null, domains = [] }) {
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
  const cleanLang = (language && ['en', 'es'].includes(language.toLowerCase())) ? language.toLowerCase() : 'en';
  const cleanTheme = (theme && isValidTheme(theme.toLowerCase())) ? theme.toLowerCase() : 'light';

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, organization_name, logo_url, language, theme, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertDomain = db.prepare(`
    INSERT INTO user_domains (user_id, domain) VALUES (?, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run(id, cleanUsername, cleanEmail, passwordHash, role, cleanOrg, cleanLogo, cleanLang, cleanTheme, parentId, now, now);
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

export function updateUser(id, { email, username, password, role, organization_name, logo_url, language, theme, isActive, domains }) {
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
    const newLang = language !== undefined && ['en', 'es'].includes(language.toLowerCase()) ? language.toLowerCase() : (existing.language || 'en');
    const newTheme = theme !== undefined && isValidTheme(theme.toLowerCase()) ? theme.toLowerCase() : (existing.theme || 'light');
    const newIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE users
      SET username = ?, email = ?, password_hash = ?, role = ?, organization_name = ?, logo_url = ?, language = ?, theme = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(newUsername, newEmail, passwordHash, newRole, newOrg, newLogo, newLang, newTheme, newIsActive, now, id);

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

export function updateUserProfile(id, { username, organization_name, logo_url, language, theme }) {
  const existing = getUserById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newUsername = username !== undefined && username.trim() ? username.trim() : existing.username;
  const newOrg = organization_name !== undefined ? organization_name.trim() : (existing.organization_name || '');
  const newLogo = logo_url !== undefined ? logo_url.trim() : (existing.logo_url || '');
  const newLang = language !== undefined && ['en', 'es'].includes(language.toLowerCase()) ? language.toLowerCase() : (existing.language || 'en');
  const newTheme = theme !== undefined && isValidTheme(theme.toLowerCase()) ? theme.toLowerCase() : (existing.theme || 'light');

  db.prepare(`
    UPDATE users
    SET username = ?, organization_name = ?, logo_url = ?, language = ?, theme = ?, updated_at = ?
    WHERE id = ?
  `).run(newUsername, newOrg, newLogo, newLang, newTheme, now, id);

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

export function createReportSchedule({
  id,
  userId,
  name,
  domain,
  templateId,
  scheduleType,
  recipients,
  formats,
  timeOfDay = '08:00',
  timezone = 'UTC',
  sendEmail = 1,
  emailFormat = 'inline_pdf'
}) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reports_schedules (
      id, user_id, name, domain, template_id, schedule_type, recipients, formats,
      time_of_day, timezone, send_email, email_format, is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    userId,
    name,
    domain || 'all',
    templateId || 'default',
    scheduleType || 'weekly',
    recipients || '',
    JSON.stringify(formats || ['pdf']),
    timeOfDay || '08:00',
    timezone || 'UTC',
    sendEmail !== undefined && sendEmail !== null ? (sendEmail ? 1 : 0) : 1,
    emailFormat || 'inline_pdf',
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

export function getReportScheduleById(id) {
  const row = db.prepare('SELECT * FROM reports_schedules WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    formats: JSON.parse(row.formats || '[]')
  };
}

export function updateReportScheduleLastRun(id, timestamp = new Date().toISOString()) {
  return db.prepare('UPDATE reports_schedules SET last_run_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, id).changes > 0;
}

export function updateReportSchedule(id, updates = {}) {
  const existing = db.prepare('SELECT * FROM reports_schedules WHERE id = ?').get(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  let query = 'UPDATE reports_schedules SET updated_at = ?';
  const params = [now];

  if (updates.name !== undefined) {
    query += ', name = ?';
    params.push(updates.name.trim());
  }
  if (updates.domain !== undefined) {
    query += ', domain = ?';
    params.push(updates.domain);
  }
  if (updates.templateId !== undefined) {
    query += ', template_id = ?';
    params.push(updates.templateId);
  }
  if (updates.scheduleType !== undefined) {
    query += ', schedule_type = ?';
    params.push(updates.scheduleType);
  }
  if (updates.recipients !== undefined) {
    query += ', recipients = ?';
    params.push(updates.recipients);
  }
  if (updates.formats !== undefined) {
    query += ', formats = ?';
    params.push(JSON.stringify(updates.formats));
  }
  if (updates.isActive !== undefined) {
    query += ', is_active = ?';
    params.push(updates.isActive ? 1 : 0);
  }
  if (updates.sendEmail !== undefined) {
    query += ', send_email = ?';
    params.push(updates.sendEmail ? 1 : 0);
  }
  if (updates.timeOfDay !== undefined) {
    query += ', time_of_day = ?';
    params.push(updates.timeOfDay);
  }
  if (updates.timezone !== undefined) {
    query += ', timezone = ?';
    params.push(updates.timezone);
  }
  if (updates.emailFormat !== undefined) {
    query += ', email_format = ?';
    params.push(updates.emailFormat);
  }

  query += ' WHERE id = ?';
  params.push(id);

  return db.prepare(query).run(...params).changes > 0;
}

export function deleteReportSchedule(id) {
  return db.prepare('DELETE FROM reports_schedules WHERE id = ?').run(id).changes > 0;
}

// ==========================================
// SMTP Settings & Audit Logs
// ==========================================

export function getSmtpSettings({ includeDecrypted = false } = {}) {
  const row = db.prepare('SELECT * FROM smtp_settings WHERE id = ?').get('default');
  if (!row) {
    return {
      id: 'default',
      host: '',
      port: 587,
      encryption: 'starttls',
      username: '',
      password: '',
      has_password: false,
      from_name: 'DMARC Sentinel',
      from_address: '',
      reply_to: '',
      connection_timeout: 10000,
      is_configured: false,
      updated_at: null
    };
  }

  const hasPassword = Boolean(row.password_encrypted);
  let password = '';
  if (includeDecrypted && hasPassword) {
    password = decrypt(row.password_encrypted);
  } else if (hasPassword) {
    password = maskSecret(row.password_encrypted);
  }

  return {
    id: row.id,
    host: row.host || '',
    port: row.port || 587,
    encryption: row.encryption || 'starttls',
    username: row.username || '',
    password,
    has_password: hasPassword,
    from_name: row.from_name || 'DMARC Sentinel',
    from_address: row.from_address || '',
    reply_to: row.reply_to || '',
    connection_timeout: row.connection_timeout || 10000,
    is_configured: Boolean(row.host && row.from_address),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function saveSmtpSettings(settings, actor = {}) {
  const existing = db.prepare('SELECT * FROM smtp_settings WHERE id = ?').get('default');
  const now = new Date().toISOString();

  let passwordEncrypted = existing ? existing.password_encrypted : '';
  if (settings.password && settings.password !== '••••••••' && !settings.password.includes('•••')) {
    passwordEncrypted = encrypt(settings.password);
  }

  const cleanHost = (settings.host || '').trim();
  const cleanPort = parseInt(settings.port, 10) || 587;
  const cleanEncryption = ['none', 'starttls', 'ssl'].includes(settings.encryption) ? settings.encryption : 'starttls';
  const cleanUsername = (settings.username || '').trim();
  const cleanFromName = (settings.from_name || 'DMARC Sentinel').trim();
  const cleanFromAddress = (settings.from_address || '').trim().toLowerCase();
  const cleanReplyTo = (settings.reply_to || '').trim().toLowerCase();
  const cleanTimeout = parseInt(settings.connection_timeout, 10) || 10000;

  if (existing) {
    db.prepare(`
      UPDATE smtp_settings
      SET host = ?, port = ?, encryption = ?, username = ?, password_encrypted = ?,
          from_name = ?, from_address = ?, reply_to = ?, connection_timeout = ?, updated_at = ?
      WHERE id = 'default'
    `).run(
      cleanHost,
      cleanPort,
      cleanEncryption,
      cleanUsername,
      passwordEncrypted,
      cleanFromName,
      cleanFromAddress,
      cleanReplyTo,
      cleanTimeout,
      now
    );
  } else {
    db.prepare(`
      INSERT INTO smtp_settings (
        id, host, port, encryption, username, password_encrypted,
        from_name, from_address, reply_to, connection_timeout, created_at, updated_at
      )
      VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanHost,
      cleanPort,
      cleanEncryption,
      cleanUsername,
      passwordEncrypted,
      cleanFromName,
      cleanFromAddress,
      cleanReplyTo,
      cleanTimeout,
      now,
      now
    );
  }

  // Record audit log without secrets
  addAuditLog({
    userId: actor.id || null,
    username: actor.username || 'system',
    action: 'smtp.settings_update',
    details: {
      host: cleanHost,
      port: cleanPort,
      encryption: cleanEncryption,
      username: cleanUsername,
      from_name: cleanFromName,
      from_address: cleanFromAddress,
      reply_to: cleanReplyTo,
      password_updated: Boolean(settings.password && settings.password !== '••••••••')
    },
    ipAddress: actor.ipAddress || null
  });

  return getSmtpSettings({ includeDecrypted: false });
}

export function getAiSettings({ includeDecrypted = false } = {}) {
  const row = db.prepare('SELECT * FROM ai_settings WHERE id = ?').get('default');

  // Load per-provider saved keys
  let providerRows = [];
  try {
    providerRows = db.prepare('SELECT * FROM ai_provider_keys').all();
  } catch (e) {
    providerRows = [];
  }

  const providers = {};
  for (const pr of providerRows) {
    let keyVal = '';
    if (pr.api_key_encrypted) {
      if (includeDecrypted) {
        try {
          keyVal = decrypt(pr.api_key_encrypted);
        } catch (e) {
          keyVal = '';
        }
      } else {
        keyVal = maskSecret(pr.api_key_encrypted);
      }
    }
    providers[pr.provider] = {
      hasKey: Boolean(pr.api_key_encrypted),
      apiKey: keyVal,
      model: pr.model,
      baseUrl: pr.base_url || '',
      updatedAt: pr.updated_at
    };
  }

  if (!row) {
    return {
      enabled: false,
      provider: 'google',
      model: 'gemini-1.5-flash',
      apiKey: '',
      hasApiKey: false,
      baseUrl: '',
      temperature: 0.2,
      maxTokens: 2048,
      featureLogRca: true,
      featureExecutiveSummary: true,
      featureCopilot: true,
      is_configured: false,
      providers,
      updated_at: null
    };
  }

  const currentProvider = row.provider || 'google';
  let activeEncryptedKey = row.api_key_encrypted;

  // Fallback / sync with ai_provider_keys
  if (!activeEncryptedKey && providers[currentProvider]?.hasKey) {
    const pRow = providerRows.find(x => x.provider === currentProvider);
    if (pRow?.api_key_encrypted) {
      activeEncryptedKey = pRow.api_key_encrypted;
    }
  }

  const hasApiKey = Boolean(activeEncryptedKey);
  let apiKey = '';
  if (hasApiKey) {
    if (includeDecrypted) {
      try {
        apiKey = decrypt(activeEncryptedKey);
      } catch (e) {
        apiKey = '';
      }
    } else {
      apiKey = maskSecret(activeEncryptedKey);
    }
  }

  return {
    enabled: Boolean(row.enabled),
    provider: currentProvider,
    model: row.model || 'gemini-1.5-flash',
    apiKey,
    hasApiKey,
    baseUrl: row.base_url || '',
    temperature: typeof row.temperature === 'number' ? row.temperature : 0.2,
    maxTokens: row.max_tokens || 2048,
    featureLogRca: Boolean(row.feature_log_rca !== 0),
    featureExecutiveSummary: Boolean(row.feature_executive_summary !== 0),
    featureCopilot: Boolean(row.feature_copilot !== 0),
    is_configured: Boolean(hasApiKey),
    providers,
    updated_at: row.updated_at
  };
}

export function saveAiSettings(settings, actor = {}) {
  const existing = db.prepare('SELECT * FROM ai_settings WHERE id = ?').get('default');
  const now = new Date().toISOString();

  const cleanProvider = (settings.provider || 'google').trim().toLowerCase();
  const cleanModel = (settings.model || '').trim();
  const cleanBaseUrl = (settings.baseUrl || '').trim();

  // Check if existing provider row in ai_provider_keys
  let existingProviderKey = null;
  try {
    existingProviderKey = db.prepare('SELECT * FROM ai_provider_keys WHERE provider = ?').get(cleanProvider);
  } catch (e) {}

  let apiKeyEncrypted = '';
  if (settings.apiKey && settings.apiKey !== '••••••••' && !settings.apiKey.includes('•••')) {
    apiKeyEncrypted = encrypt(settings.apiKey.trim());
  } else if (existingProviderKey?.api_key_encrypted) {
    apiKeyEncrypted = existingProviderKey.api_key_encrypted;
  } else if (existing && existing.provider === cleanProvider) {
    apiKeyEncrypted = existing.api_key_encrypted;
  }

  // Upsert into ai_provider_keys
  try {
    db.prepare(`
      INSERT INTO ai_provider_keys (provider, model, api_key_encrypted, base_url, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        model = excluded.model,
        api_key_encrypted = CASE WHEN excluded.api_key_encrypted != '' THEN excluded.api_key_encrypted ELSE ai_provider_keys.api_key_encrypted END,
        base_url = excluded.base_url,
        updated_at = excluded.updated_at
    `).run(cleanProvider, cleanModel, apiKeyEncrypted, cleanBaseUrl, now);
  } catch (e) {
    console.error('Failed to update ai_provider_keys:', e.message);
  }

  const cleanEnabled = settings.enabled ? 1 : 0;
  const cleanTemp = typeof settings.temperature === 'number' ? Math.max(0, Math.min(2, settings.temperature)) : 0.2;
  const cleanMaxTokens = parseInt(settings.maxTokens, 10) || 2048;
  const cleanFeatureRca = settings.featureLogRca !== false ? 1 : 0;
  const cleanFeatureSummary = settings.featureExecutiveSummary !== false ? 1 : 0;
  const cleanFeatureCopilot = settings.featureCopilot !== false ? 1 : 0;

  if (existing) {
    db.prepare(`
      UPDATE ai_settings
      SET enabled = ?, provider = ?, model = ?, api_key_encrypted = ?,
          base_url = ?, temperature = ?, max_tokens = ?,
          feature_log_rca = ?, feature_executive_summary = ?, feature_copilot = ?,
          updated_at = ?
      WHERE id = 'default'
    `).run(
      cleanEnabled,
      cleanProvider,
      cleanModel,
      apiKeyEncrypted,
      cleanBaseUrl,
      cleanTemp,
      cleanMaxTokens,
      cleanFeatureRca,
      cleanFeatureSummary,
      cleanFeatureCopilot,
      now
    );
  } else {
    db.prepare(`
      INSERT INTO ai_settings (
        id, enabled, provider, model, api_key_encrypted,
        base_url, temperature, max_tokens,
        feature_log_rca, feature_executive_summary, feature_copilot,
        created_at, updated_at
      )
      VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanEnabled,
      cleanProvider,
      cleanModel,
      apiKeyEncrypted,
      cleanBaseUrl,
      cleanTemp,
      cleanMaxTokens,
      cleanFeatureRca,
      cleanFeatureSummary,
      cleanFeatureCopilot,
      now,
      now
    );
  }

  addAuditLog({
    userId: actor.id || null,
    username: actor.username || 'system',
    action: 'ai.settings_update',
    details: {
      enabled: Boolean(cleanEnabled),
      provider: cleanProvider,
      model: cleanModel,
      base_url: cleanBaseUrl,
      api_key_updated: Boolean(settings.apiKey && settings.apiKey !== '••••••••')
    },
    ipAddress: actor.ipAddress || null
  });

  return getAiSettings({ includeDecrypted: false });
}

export function addAuditLog({ userId, username, action, details = {}, ipAddress = null }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, username, action, details_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId || null,
    username || 'system',
    action,
    JSON.stringify(details || {}),
    ipAddress || null,
    now
  );
  return { id, action, created_at: now };
}

export function getAuditLogs({ limit = 50, offset = 0, action = null } = {}) {
  let query = 'SELECT * FROM audit_logs';
  const params = [];
  if (action) {
    query += ' WHERE action = ?';
    params.push(action);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    details: JSON.parse(r.details_json || '{}')
  }));
}

// ==========================================
// Email Queue & Email Logs
// ==========================================

export function enqueueEmail({
  recipient,
  subject,
  bodyHtml,
  bodyText,
  attachments = [],
  emailType = 'notification',
  priority = 0,
  runAt = null
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const scheduleTime = runAt || now;

  db.prepare(`
    INSERT INTO email_queue (
      id, recipient, subject, body_html, body_text, attachments_json,
      email_type, status, priority, attempts, max_attempts, run_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, 3, ?, ?)
  `).run(
    id,
    recipient.trim().toLowerCase(),
    subject.trim(),
    bodyHtml,
    bodyText || '',
    JSON.stringify(attachments || []),
    emailType,
    priority,
    scheduleTime,
    now
  );

  return id;
}

export function claimQueueJobs(limit = 10) {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    const jobs = db.prepare(`
      SELECT * FROM email_queue
      WHERE status = 'pending' AND run_at <= ? AND attempts < max_attempts
      ORDER BY priority DESC, run_at ASC, created_at ASC
      LIMIT ?
    `).all(now, limit);

    if (jobs.length === 0) return [];

    const jobIds = jobs.map(j => j.id);
    const placeholders = jobIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE email_queue
      SET status = 'processing', attempts = attempts + 1
      WHERE id IN (${placeholders})
    `).run(...jobIds);

    return jobs.map(j => ({
      ...j,
      attachments: JSON.parse(j.attachments_json || '[]')
    }));
  });

  return tx();
}

export function updateQueueJob(id, { status, errorMessage = null, nextRunAt = null, sentAt = null }) {
  let query = 'UPDATE email_queue SET status = ?';
  const params = [status];

  if (errorMessage !== undefined) {
    query += ', error_message = ?';
    params.push(errorMessage);
  }
  if (nextRunAt !== undefined) {
    query += ', run_at = ?';
    params.push(nextRunAt);
  }
  if (sentAt !== undefined) {
    query += ', sent_at = ?';
    params.push(sentAt);
  }

  query += ' WHERE id = ?';
  params.push(id);

}

export function getQueueJobs({ limit = 50, offset = 0, status = null } = {}) {
  let query = 'SELECT * FROM email_queue WHERE 1=1';
  const params = [];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const totalCount = db.prepare(`
    SELECT COUNT(*) as count FROM email_queue WHERE 1=1
    ${status ? ' AND status = ?' : ''}
  `).get(...(status ? [status] : [])).count;

  const rows = db.prepare(query).all(...params);
  return {
    total: totalCount,
    jobs: rows.map(r => ({
      ...r,
      attachments: JSON.parse(r.attachments_json || '[]')
    }))
  };
}

export function retryQueueJob(id) {
  const now = new Date().toISOString();
  return db.prepare(`
    UPDATE email_queue
    SET status = 'pending', run_at = ?, attempts = 0, error_message = NULL
    WHERE id = ?
  `).run(now, id).changes > 0;
}

export function addEmailLog({
  recipient,
  subject,
  emailType,
  status,
  errorMessage = null,
  attempts = 1,
  metadata = {}
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO email_logs (
      id, recipient, subject, email_type, status, error_message, attempts, metadata_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    recipient.trim().toLowerCase(),
    subject.trim(),
    emailType,
    status,
    errorMessage || null,
    attempts,
    JSON.stringify(metadata || {}),
    now
  );
  return id;
}

export function getEmailLogs({ limit = 50, offset = 0, status = null, emailType = null, search = null } = {}) {
  let query = 'SELECT * FROM email_logs WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (emailType) {
    query += ' AND email_type = ?';
    params.push(emailType);
  }
  if (search) {
    query += ' AND (recipient LIKE ? OR subject LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const totalCount = db.prepare(`
    SELECT COUNT(*) as count FROM email_logs WHERE 1=1
    ${status ? ' AND status = ?' : ''}
    ${emailType ? ' AND email_type = ?' : ''}
    ${search ? ' AND (recipient LIKE ? OR subject LIKE ?)' : ''}
  `).get(...params.slice(0, params.length - 2)).count;

  const rows = db.prepare(query).all(...params);
  return {
    total: totalCount,
    logs: rows.map(r => ({
      ...r,
      metadata: JSON.parse(r.metadata_json || '{}')
    }))
  };
}

// ==========================================
// Alert Rules & Alert History
// ==========================================

export function createAlertRule({
  userId,
  name,
  domains = ['all'],
  recipients = [],
  conditionType,
  thresholdValue,
  timeWindowMinutes = 60,
  severity = 'warning',
  cooldownMinutes = 60,
  digestMode = 0,
  notifyRecovery = 1,
  filterMetadata = {}
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO alert_rules (
      id, user_id, name, domains_json, recipients_json, condition_type,
      threshold_value, time_window_minutes, severity, cooldown_minutes,
      digest_mode, notify_recovery, filter_metadata_json, is_active,
      last_state, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ok', ?, ?)
  `).run(
    id,
    userId,
    name.trim(),
    JSON.stringify(Array.isArray(domains) ? domains : ['all']),
    JSON.stringify(Array.isArray(recipients) ? recipients : []),
    conditionType,
    parseFloat(thresholdValue) || 0,
    parseInt(timeWindowMinutes, 10) || 60,
    ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
    parseInt(cooldownMinutes, 10) || 60,
    digestMode ? 1 : 0,
    notifyRecovery ? 1 : 0,
    JSON.stringify(filterMetadata || {}),
    now,
    now
  );

  return getAlertRuleById(id);
}

export function getAlertRules(userId = null) {
  let query = `
    SELECT ar.*, u.username as owner_username, u.email as owner_email
    FROM alert_rules ar
    JOIN users u ON ar.user_id = u.id
  `;
  const params = [];
  if (userId) {
    query += ' WHERE ar.user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY ar.created_at DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(formatAlertRuleRow);
}

export function getAlertRuleById(id) {
  const row = db.prepare(`
    SELECT ar.*, u.username as owner_username, u.email as owner_email
    FROM alert_rules ar
    JOIN users u ON ar.user_id = u.id
    WHERE ar.id = ?
  `).get(id);

  if (!row) return null;
  return formatAlertRuleRow(row);
}

function formatAlertRuleRow(row) {
  return {
    ...row,
    domains: JSON.parse(row.domains_json || '["all"]'),
    recipients: JSON.parse(row.recipients_json || '[]'),
    filter_metadata: JSON.parse(row.filter_metadata_json || '{}'),
    is_active: Boolean(row.is_active),
    digest_mode: Boolean(row.digest_mode),
    notify_recovery: Boolean(row.notify_recovery)
  };
}

export function updateAlertRule(id, updates) {
  const existing = getAlertRuleById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = updates.name !== undefined ? updates.name.trim() : existing.name;
  const domains = updates.domains !== undefined ? JSON.stringify(updates.domains) : existing.domains_json;
  const recipients = updates.recipients !== undefined ? JSON.stringify(updates.recipients) : existing.recipients_json;
  const conditionType = updates.conditionType !== undefined ? updates.conditionType : existing.condition_type;
  const thresholdValue = updates.thresholdValue !== undefined ? parseFloat(updates.thresholdValue) : existing.threshold_value;
  const timeWindowMinutes = updates.timeWindowMinutes !== undefined ? parseInt(updates.timeWindowMinutes, 10) : existing.time_window_minutes;
  const severity = updates.severity !== undefined ? updates.severity : existing.severity;
  const cooldownMinutes = updates.cooldownMinutes !== undefined ? parseInt(updates.cooldownMinutes, 10) : existing.cooldown_minutes;
  const digestMode = updates.digestMode !== undefined ? (updates.digestMode ? 1 : 0) : existing.digest_mode ? 1 : 0;
  const notifyRecovery = updates.notifyRecovery !== undefined ? (updates.notifyRecovery ? 1 : 0) : existing.notify_recovery ? 1 : 0;
  const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active ? 1 : 0;
  const filterMetadata = updates.filterMetadata !== undefined ? JSON.stringify(updates.filterMetadata) : existing.filter_metadata_json;

  db.prepare(`
    UPDATE alert_rules
    SET name = ?, domains_json = ?, recipients_json = ?, condition_type = ?,
        threshold_value = ?, time_window_minutes = ?, severity = ?, cooldown_minutes = ?,
        digest_mode = ?, notify_recovery = ?, filter_metadata_json = ?, is_active = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    name, domains, recipients, conditionType,
    thresholdValue, timeWindowMinutes, severity, cooldownMinutes,
    digestMode, notifyRecovery, filterMetadata, isActive,
    now, id
  );

  return getAlertRuleById(id);
}

export function updateAlertRuleState(id, { lastState, lastTriggeredAt = null, lastValue = null }) {
  const now = new Date().toISOString();
  let query = 'UPDATE alert_rules SET last_state = ?, updated_at = ?';
  const params = [lastState, now];

  if (lastTriggeredAt !== null) {
    query += ', last_triggered_at = ?';
    params.push(lastTriggeredAt);
  }
  if (lastValue !== null) {
    query += ', last_value = ?';
    params.push(lastValue);
  }

  query += ' WHERE id = ?';
  params.push(id);

  return db.prepare(query).run(...params).changes > 0;
}

export function deleteAlertRule(id) {
  return db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id).changes > 0;
}

export function addAlertHistory({
  ruleId,
  userId,
  ruleName,
  conditionType,
  severity,
  currentValue,
  thresholdValue,
  matchedValues = {},
  isRecovery = 0,
  emailSent = 0
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO alert_history (
      id, rule_id, user_id, rule_name, condition_type, severity,
      triggered_at, current_value, threshold_value, matched_values_json,
      is_recovery, email_sent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    ruleId,
    userId,
    ruleName,
    conditionType,
    severity,
    now,
    currentValue !== undefined ? currentValue : null,
    thresholdValue !== undefined ? thresholdValue : null,
    JSON.stringify(matchedValues || {}),
    isRecovery ? 1 : 0,
    emailSent ? 1 : 0
  );

  return id;
}

export function getAlertHistory({ userId = null, limit = 50, offset = 0, ruleId = null, severity = null } = {}) {
  let query = 'SELECT * FROM alert_history WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  if (ruleId) {
    query += ' AND rule_id = ?';
    params.push(ruleId);
  }
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY triggered_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    matched_values: JSON.parse(r.matched_values_json || '{}'),
    is_recovery: Boolean(r.is_recovery),
    email_sent: Boolean(r.email_sent)
  }));
}

export function addAlertDigestItem({ userId, ruleId, alertHistoryId }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO alert_digests (id, user_id, rule_id, alert_history_id, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(id, userId, ruleId, alertHistoryId, now);
  return id;
}

export function getPendingAlertDigests(userId = null) {
  let query = `
    SELECT ad.*, ah.rule_name, ah.condition_type, ah.severity, ah.triggered_at,
           ah.current_value, ah.threshold_value, ah.matched_values_json,
           u.email as user_email, u.username as username
    FROM alert_digests ad
    JOIN alert_history ah ON ad.alert_history_id = ah.id
    JOIN users u ON ad.user_id = u.id
    WHERE ad.status = 'pending'
  `;
  const params = [];
  if (userId) {
    query += ' AND ad.user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY ad.created_at ASC';

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    matched_values: JSON.parse(r.matched_values_json || '{}')
  }));
}

export function markAlertDigestsSent(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`UPDATE alert_digests SET status = 'sent' WHERE id IN (${placeholders})`).run(...ids).changes;
}

// ==========================================
// THEME MANAGEMENT FUNCTIONS
// ==========================================

export function getAllThemes() {
  const rows = db.prepare('SELECT * FROM system_themes ORDER BY is_default DESC, name ASC').all();
  return rows.map(r => {
    let colors = {};
    try {
      colors = JSON.parse(r.colors_json);
    } catch (e) {
      colors = {};
    }
    const isDark = r.category === 'dark';
    const fallbackSidebar = {
      sidebarBg: colors.sidebarBg || (isDark ? '#030712' : '#ffffff'),
      sidebarBorder: colors.sidebarBorder || (isDark ? '#1e293b' : '#e2e8f0'),
      sidebarText: colors.sidebarText || (isDark ? '#94a3b8' : '#475569'),
      sidebarTextHover: colors.sidebarTextHover || (isDark ? '#f8fafc' : '#0f172a'),
      sidebarActiveText: colors.sidebarActiveText || colors.accent || (isDark ? '#22d3ee' : '#0284c7'),
      sidebarActiveBg: colors.sidebarActiveBg || (isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)'),
      sidebarHeaderText: colors.sidebarHeaderText || '#64748b'
    };
    colors = { ...fallbackSidebar, ...colors };
    return {
      id: r.id,
      name: r.name,
      desc: r.desc || '',
      category: r.category,
      badge: r.badge || '',
      isDefault: Boolean(r.is_default),
      colors,
      preview: {
        bg: colors.bg || (r.category === 'dark' ? '#030712' : '#ffffff'),
        card: colors.card || (r.category === 'dark' ? '#0f172a' : '#f8fafc'),
        border: colors.border || (r.category === 'dark' ? '#1e293b' : '#e2e8f0'),
        accent: colors.accent || '#06b6d4',
        text: colors.text || (r.category === 'dark' ? '#f8fafc' : '#0f172a')
      },
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });
}

export function getThemeById(id) {
  if (!id) return null;
  const r = db.prepare('SELECT * FROM system_themes WHERE id = ? COLLATE NOCASE').get(id.trim().toLowerCase());
  if (!r) return null;
  let colors = {};
  try {
    colors = JSON.parse(r.colors_json);
  } catch (e) {
    colors = {};
  }
  const isDark = r.category === 'dark';
  const fallbackSidebar = {
    sidebarBg: colors.sidebarBg || (isDark ? '#030712' : '#ffffff'),
    sidebarBorder: colors.sidebarBorder || (isDark ? '#1e293b' : '#e2e8f0'),
    sidebarText: colors.sidebarText || (isDark ? '#94a3b8' : '#475569'),
    sidebarTextHover: colors.sidebarTextHover || (isDark ? '#f8fafc' : '#0f172a'),
    sidebarActiveText: colors.sidebarActiveText || colors.accent || (isDark ? '#22d3ee' : '#0284c7'),
    sidebarActiveBg: colors.sidebarActiveBg || (isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)'),
    sidebarHeaderText: colors.sidebarHeaderText || '#64748b'
  };
  colors = { ...fallbackSidebar, ...colors };
  return {
    id: r.id,
    name: r.name,
    desc: r.desc || '',
    category: r.category,
    badge: r.badge || '',
    isDefault: Boolean(r.is_default),
    colors,
    preview: {
      bg: colors.bg || (r.category === 'dark' ? '#030712' : '#ffffff'),
      card: colors.card || (r.category === 'dark' ? '#0f172a' : '#f8fafc'),
      border: colors.border || (r.category === 'dark' ? '#1e293b' : '#e2e8f0'),
      accent: colors.accent || '#06b6d4',
      text: colors.text || (r.category === 'dark' ? '#f8fafc' : '#0f172a')
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export function createTheme({ id, name, desc = '', category = 'dark', badge = '', colors = {} }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Theme name is required');
  }
  const cleanCategory = (category && category.toLowerCase() === 'light') ? 'light' : 'dark';
  let cleanId = (id || name).trim().toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleanId || cleanId.length < 2) {
    cleanId = `theme-${Date.now().toString(36)}`;
  }

  const existing = getThemeById(cleanId);
  if (existing) {
    throw new Error(`A theme with ID "${cleanId}" already exists`);
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_themes (id, name, desc, category, badge, colors_json, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    cleanId,
    name.trim(),
    desc ? desc.trim() : '',
    cleanCategory,
    badge ? badge.trim() : '',
    JSON.stringify(colors || {}),
    now,
    now
  );

  return getThemeById(cleanId);
}

export function updateTheme(id, { name, desc, category, badge, colors }) {
  const existing = getThemeById(id);
  if (!existing) {
    throw new Error(`Theme "${id}" not found`);
  }

  const newName = (name !== undefined && name.trim()) ? name.trim() : existing.name;
  const newDesc = desc !== undefined ? desc.trim() : existing.desc;
  const newCategory = (category !== undefined && ['dark', 'light'].includes(category.toLowerCase()))
    ? category.toLowerCase()
    : existing.category;
  const newBadge = badge !== undefined ? badge.trim() : existing.badge;
  const newColors = colors !== undefined ? { ...existing.colors, ...colors } : existing.colors;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE system_themes
    SET name = ?, desc = ?, category = ?, badge = ?, colors_json = ?, updated_at = ?
    WHERE id = ? COLLATE NOCASE
  `).run(
    newName,
    newDesc,
    newCategory,
    newBadge,
    JSON.stringify(newColors),
    now,
    existing.id
  );

  return getThemeById(existing.id);
}

export function deleteTheme(id) {
  const existing = getThemeById(id);
  if (!existing) {
    throw new Error(`Theme "${id}" not found`);
  }
  if (existing.isDefault) {
    throw new Error('Default system themes cannot be deleted');
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET theme = 'light' WHERE theme = ? COLLATE NOCASE").run(existing.id);
    db.prepare("DELETE FROM system_themes WHERE id = ? COLLATE NOCASE").run(existing.id);
  });

  tx();
  return { deleted: true, id: existing.id };
}

export function resetDefaultTheme(id) {
  const target = DEFAULT_SYSTEM_THEMES.find(t => t.id === (id || '').toLowerCase());
  if (!target) {
    throw new Error(`Factory preset for theme "${id}" not found`);
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_themes (id, name, desc, category, badge, colors_json, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      desc = excluded.desc,
      category = excluded.category,
      badge = excluded.badge,
      colors_json = excluded.colors_json,
      updated_at = excluded.updated_at
  `).run(
    target.id,
    target.name,
    target.desc,
    target.category,
    target.badge,
    JSON.stringify(target.colors),
    now,
    now
  );

  return getThemeById(target.id);
}

// ==========================================
// AI Telemetry Copilot Sessions & Messages
// ==========================================

export function listCopilotSessions(userId) {
  return db.prepare(`
    SELECT * FROM ai_copilot_sessions
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(userId).map(s => ({
    id: s.id,
    userId: s.user_id,
    title: s.title,
    domainScope: s.domain_scope,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  }));
}

export function createCopilotSession({ id, userId, title, domainScope = 'all' }) {
  const sessionId = id || crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO ai_copilot_sessions (id, user_id, title, domain_scope, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, title || 'New Investigation', domainScope, now, now);

  return {
    id: sessionId,
    userId,
    title: title || 'New Investigation',
    domainScope,
    domain_scope: domainScope,
    createdAt: now,
    updatedAt: now
  };
}

export function getCopilotMessages(sessionId, userId) {
  if (userId) {
    const session = db.prepare('SELECT * FROM ai_copilot_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
    if (!session) return null;
  }

  const rows = db.prepare(`
    SELECT * FROM ai_copilot_messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(sessionId);

  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role,
    content: r.content,
    meta: r.meta_json ? JSON.parse(r.meta_json) : null,
    createdAt: r.created_at
  }));
}

export function addCopilotMessage({ id, sessionId, role, content, meta = null }) {
  const messageId = id || crypto.randomUUID();
  const now = new Date().toISOString();
  const metaJson = meta ? JSON.stringify(meta) : null;

  db.prepare(`
    INSERT INTO ai_copilot_messages (id, session_id, role, content, meta_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(messageId, sessionId, role, content, metaJson, now);

  db.prepare('UPDATE ai_copilot_sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

  return {
    id: messageId,
    sessionId,
    role,
    content,
    meta,
    createdAt: now
  };
}

export function updateCopilotSessionTitle(sessionId, userId, title) {
  db.prepare('UPDATE ai_copilot_sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(title, new Date().toISOString(), sessionId, userId);
}

export function deleteCopilotSession(sessionId, userId) {
  db.prepare('DELETE FROM ai_copilot_messages WHERE session_id = ?').run(sessionId);
  db.prepare('DELETE FROM ai_copilot_sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);
  return { success: true };
}

export default {
  initDb,
  isValidTheme,
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  deleteTheme,
  resetDefaultTheme,
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
  getReportScheduleById,
  updateReportScheduleLastRun,
  updateReportSchedule,
  deleteReportSchedule,
  getSmtpSettings,
  saveSmtpSettings,
  getAiSettings,
  saveAiSettings,
  addAuditLog,
  getAuditLogs,
  enqueueEmail,
  claimQueueJobs,
  updateQueueJob,
  getQueueJobs,
  retryQueueJob,
  addEmailLog,
  getEmailLogs,
  createAlertRule,
  getAlertRules,
  getAlertRuleById,
  updateAlertRule,
  updateAlertRuleState,
  deleteAlertRule,
  addAlertHistory,
  getAlertHistory,
  addAlertDigestItem,
  getPendingAlertDigests,
  markAlertDigestsSent,
  listCopilotSessions,
  createCopilotSession,
  getCopilotMessages,
  addCopilotMessage,
  updateCopilotSessionTitle,
  deleteCopilotSession
};

