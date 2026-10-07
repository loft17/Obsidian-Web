import { Router } from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { checkVaultPath } from '../vault.js';
import { publicError } from '../security.js';

export default (dataDir, sessions) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  // Token de un solo uso para la configuración inicial: sin él, cualquiera que llegue
  // antes que tú a la web podría configurarla (elegir vault y contraseña). Se muestra
  // en la consola del servidor al arrancar sin configurar, o en cuanto falte config.json
  // (si se borra data/ con el servidor en marcha)
  let setupToken = null;
  const ensureSetupToken = () => {
    if (existsSync(configPath)) {
      setupToken = null;
      return;
    }
    if (setupToken) return;
    setupToken = crypto.randomBytes(12).toString('hex');
    console.log('');
    console.log('==================================================');
    console.log(`  Token de configuración inicial: ${setupToken}`);
    console.log('==================================================');
    console.log('');
  };
  ensureSetupToken();

  const validSetupToken = (value) => {
    ensureSetupToken();
    if (!setupToken || typeof value !== 'string') return false;
    const a = Buffer.from(value.trim());
    const b = Buffer.from(setupToken);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  router.get('/status', (req, res) => {
    ensureSetupToken();
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

    if (!validSetupToken(req.body?.setupToken)) {
      return res.status(403).json({ error: 'Token de configuración incorrecto (míralo en la consola del servidor)' });
    }

    const { password, port } = req.body;
    if (!req.body.vaultPath || !password) {
      return res.status(400).json({ error: 'Missing fields: vaultPath and password required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    let vaultPath;
    try {
      vaultPath = checkVaultPath(req.body.vaultPath, dataDir);
    } catch (err) {
      return res.status(400).json({ error: publicError(err) });
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
      mkdirSync(dataDir, { recursive: true, mode: 0o700 });

      const config = {
        vaultPath,
        passwordHash,
        port: port || 3000,
        createdAt: new Date().toISOString(),
      };

      console.log(`[Setup] Writing config to: ${configPath}`);
      writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      setupToken = null;
      // Las sesiones de una configuración anterior no valen para la nueva
      sessions.destroyAll();
      console.log(`[Setup] Configuration saved successfully`);

      res.json({ success: true });
    } catch (err) {
      console.error(`[Setup] Error:`, err);
      res.status(500).json({ error: publicError(err, 'Error al configurar') });
    }
  });

  return router;
};
