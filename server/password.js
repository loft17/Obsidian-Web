import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

export { MIN_PASSWORD_LENGTH } from './limits.js';

// Hash con scrypt: sal (16 bytes) + hash (32 bytes), en hexadecimal
export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt, 32);
  return Buffer.concat([salt, hash]).toString('hex');
};

// Compara en tiempo constante con el hash guardado en config.json
export const verifyPassword = async (password, passwordHash) => {
  if (typeof password !== 'string' || !password || typeof passwordHash !== 'string') return false;
  const stored = Buffer.from(passwordHash, 'hex');
  const salt = stored.subarray(0, 16);
  const hash = await scryptAsync(password, salt, 32);
  const full = Buffer.concat([salt, hash]);
  return full.length === stored.length && crypto.timingSafeEqual(full, stored);
};
