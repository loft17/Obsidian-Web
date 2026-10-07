import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { SESSION_MAX_AGE, createLoginLimiter } from '../sessions.js';

export default (dataDir, sessions) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');
  const limiter = createLoginLimiter();

  router.post('/login', async (req, res) => {
    const ip = req.ip;
    const wait = limiter.retryAfter(ip);
    if (wait) {
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: `Demasiados intentos. Prueba de nuevo en ${Math.ceil(wait / 60)} min` });
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));

      // Verify password
      const scryptAsync = promisify(crypto.scrypt);
      const stored = Buffer.from(config.passwordHash, 'hex');
      const saltBuffer = stored.subarray(0, 16);

      const hash = await scryptAsync(password, saltBuffer, 32);
      const fullHash = Buffer.concat([saltBuffer, hash]);

      if (fullHash.length !== stored.length || !crypto.timingSafeEqual(fullHash, stored)) {
        limiter.fail(ip);
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
      limiter.succeed(ip);

      // Set signed cookie with a fresh, revocable session token
      res.cookie('token', sessions.create(), {
        signed: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: SESSION_MAX_AGE,
      });

      res.json({ success: true });
    } catch (err) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  });

  router.post('/logout', (req, res) => {
    sessions.destroy(req.signedCookies.token);
    res.clearCookie('token');
    res.json({ success: true });
  });

  return router;
};
