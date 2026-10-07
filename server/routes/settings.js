import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';
import * as vault from '../vault.js';

export default (dataDir, getConfig) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  router.get('/vault', (req, res) => {
    res.json({ vaultPath: getConfig()?.vaultPath || '' });
  });

  // getConfig relee config.json en cada petición, así que el cambio se aplica al instante
  router.post('/vault', (req, res) => {
    const vaultPath = String(req.body?.vaultPath ?? '').trim();
    if (!vaultPath || !isAbsolute(vaultPath)) {
      return res.status(400).json({ error: 'La ruta debe ser absoluta' });
    }
    try {
      const full = resolve(vaultPath);
      if (existsSync(full) && !statSync(full).isDirectory()) {
        return res.status(400).json({ error: 'La ruta existe pero no es una carpeta' });
      }
      mkdirSync(full, { recursive: true });
      writeFileSync(configPath, JSON.stringify({ ...getConfig(), vaultPath: full }, null, 2));
      res.json({ vaultPath: full });
    } catch (err) {
      res.status(500).json({ error: err.message || 'No se pudo cambiar la ruta' });
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
      res.status(500).json({ error: err.message || 'No se pudo guardar' });
    }
  });

  return router;
};
