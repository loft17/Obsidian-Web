import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

export default (dataDir) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));

      // Verify password
      const scryptAsync = promisify(crypto.scrypt);
      const storedHash = config.passwordHash;
      const saltBuffer = Buffer.from(storedHash.slice(0, 32), 'hex'); // 16 bytes = 32 hex chars

      const hash = await scryptAsync(password, saltBuffer, 32);
      const fullHash = Buffer.concat([saltBuffer, hash]).toString('hex');

      if (fullHash !== storedHash) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Set signed cookie
      res.cookie('token', 'authenticated', {
        signed: true,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  return router;
};
