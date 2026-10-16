#!/usr/bin/env node
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'sentinel.db');

const db = new Database(dbPath);

const identifier = process.argv[2];
const newPassword = process.argv[3];

if (!identifier || !newPassword) {
  console.log('\n🔐 DMARC Sentinel Password Reset Utility');
  console.log('--------------------------------------------------');
  console.log('Usage: node reset-admin-password.js <username_or_email> <new_password>');
  console.log('Or reset all admins: node reset-admin-password.js --all <new_password>\n');
  console.log('Current registered users:');
  console.table(db.prepare('SELECT id, username, email, role, is_active FROM users').all());
  process.exit(0);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(newPassword, salt);

if (identifier === '--all') {
  const result = db.prepare("UPDATE users SET password_hash = ? WHERE role = 'admin'").run(hash);
  console.log(`\n✅ Successfully updated password for ${result.changes} admin account(s).`);
} else {
  const result = db.prepare('UPDATE users SET password_hash = ? WHERE username = ? OR email = ?').run(hash, identifier, identifier);
  if (result.changes > 0) {
    console.log(`\n✅ Successfully updated password for "${identifier}".`);
  } else {
    console.error(`\n❌ User "${identifier}" was not found.`);
    console.log('Registered users:');
    console.table(db.prepare('SELECT id, username, email, role FROM users').all());
    process.exit(1);
  }
}
