import { Router } from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

export default (dataDir) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  router.get('/status', (req, res) => {
    if (existsSync(configPath)) {
      res.json({ configured: true });
    } else {
      res.json({ configured: false });
    }
  });

  router.post('/init', async (req, res) => {
    if (existsSync(configPath)) {
      return res.status(400).json({ error: 'Already configured' });
    }

    const { vaultPath, password, port } = req.body;
    if (!vaultPath || !password) {
      return res.status(400).json({ error: 'Missing fields: vaultPath and password required' });
    }

    try {
      console.log(`[Setup] Creating vault directory: ${vaultPath}`);
      // Create vault dir if it doesn't exist
      mkdirSync(vaultPath, { recursive: true });
      console.log(`[Setup] Vault directory created successfully`);

      // Hash password with scrypt
      console.log(`[Setup] Hashing password...`);
      const scryptAsync = promisify(crypto.scrypt);
      const salt = crypto.randomBytes(16);
      const hash = await scryptAsync(password, salt, 32);
      const passwordHash = Buffer.concat([salt, hash]).toString('hex');
      console.log(`[Setup] Password hashed successfully`);

      // Create config
      console.log(`[Setup] Creating data directory: ${dataDir}`);
      mkdirSync(dataDir, { recursive: true });

      const config = {
        vaultPath,
        passwordHash,
        port: port || 3000,
        createdAt: new Date().toISOString(),
      };

      console.log(`[Setup] Writing config to: ${configPath}`);
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`[Setup] Configuration saved successfully`);

      res.json({ success: true });
    } catch (err) {
      console.error(`[Setup] Error:`, err);
      res.status(500).json({ error: err.message || 'Setup failed' });
    }
  });

  return router;
};
