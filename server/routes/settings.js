import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';

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

  return router;
};
