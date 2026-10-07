import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import * as vault from '../vault.js';
import { publicError } from '../security.js';

export default (dataDir, getConfig) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  router.get('/vault', (req, res) => {
    res.json({ vaultPath: getConfig()?.vaultPath || '' });
  });

  // getConfig relee config.json en cada petición, así que el cambio se aplica al instante
  router.post('/vault', (req, res) => {
    // Sin configurar, esta ruta no exige sesión: no puede crear un config.json sin contraseña
    const cfg = getConfig();
    if (!cfg) return res.status(400).json({ error: 'Not configured' });
    let full;
    try {
      full = vault.checkVaultPath(req.body?.vaultPath, dataDir);
    } catch (err) {
      return res.status(400).json({ error: publicError(err) });
    }
    try {
      if (existsSync(full) && !statSync(full).isDirectory()) {
        return res.status(400).json({ error: 'La ruta existe pero no es una carpeta' });
      }
      mkdirSync(full, { recursive: true });
      writeFileSync(configPath, JSON.stringify({ ...cfg, vaultPath: full }, null, 2), { mode: 0o600 });
      res.json({ vaultPath: full });
    } catch (err) {
      res.status(500).json({ error: publicError(err, 'No se pudo cambiar la ruta') });
    }
  });

  // Ubicación de los adjuntos nuevos, en el mismo formato que Obsidian (attachmentFolderPath)
  router.get('/attachments', (req, res) => {
    const cfg = getConfig();
    if (!cfg) return res.status(400).json({ error: 'Not configured' });
    res.json({ attachmentFolderPath: vault.readAppConfig(cfg.vaultPath).attachmentFolderPath ?? '/' });
  });

  router.post('/attachments', (req, res) => {
    const cfg = getConfig();
    if (!cfg) return res.status(400).json({ error: 'Not configured' });
    const value = String(req.body?.attachmentFolderPath ?? '/').trim().replace(/\\/g, '/');
    if (value.split('/').includes('..')) return res.status(400).json({ error: 'Ruta no válida' });
    try {
      vault.updateAppConfig(cfg.vaultPath, { attachmentFolderPath: value || '/' });
      res.json({ attachmentFolderPath: value || '/' });
    } catch (err) {
      res.status(500).json({ error: publicError(err, 'No se pudo guardar') });
    }
  });

  return router;
};
