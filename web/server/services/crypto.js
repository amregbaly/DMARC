import crypto from 'node:crypto';

// Derive 32-byte key from environment secret
function getEncryptionKey() {
  const secret = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dmarc-sentinel-fallback-aes256-key-32bytes';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM with authentication tag.
 * @param {string} text 
 * @returns {string} iv:authTag:ciphertext (hex encoded)
 */
export function encrypt(text) {
  if (!text || typeof text !== 'string') return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * @param {string} encryptedString format: iv:authTag:ciphertext
 * @returns {string} decrypted plaintext
 */
export function decrypt(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    // If not in expected format, treat as corrupt or unencrypted
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto Decrypt Error]: Failed to decrypt secret:', err.message);
    throw err;
  }
}

/**
 * Mask secret string for safe API responses.
 */
export function maskSecret(secret) {
  if (!secret) return '';
  return '••••••••';
}

export default {
  encrypt,
  decrypt,
  maskSecret
};
