import { Router } from 'express';
import { relative, resolve, sep } from 'path';
import { publicError } from '../security.js';
import { resolveFile } from '../vault.js';
import { MAX_NOTE_MB } from '../limits.js';

export default (syncManager, getConfig) => {
  const router = Router();

  // Configuración y estado (sin tokens: solo hasToken)
  router.get('/', (req, res) => res.json(syncManager.publicConfig()));

  router.post('/config', (req, res) => {
    try {
      res.json(syncManager.configure(req.body));
    } catch (err) {
      res.status(400).json({ error: publicError(err, 'No se pudo guardar') });
    }
  });

  // Espera a que termine; el resultado (o el error) va en status
  router.post('/run', async (req, res) => {
    res.json(await syncManager.syncNow());
  });

  // Ruta de la nota relativa al vault (validada igual que en /api/files), tal como la ve git
  const notePath = (value) => {
    const cfg = getConfig();
    if (!cfg) throw new Error('Not configured');
    return relative(resolve(cfg.vaultPath), resolveFile(cfg.vaultPath, String(value ?? ''))).split(sep).join('/');
  };

  // Historial de versiones de una nota (commits de git)
  router.get('/history', async (req, res) => {
    try {
      res.json(await syncManager.history(notePath(req.query.path)));
    } catch (err) {
      res.status(400).json({ error: publicError(err, 'No se pudo leer el historial') });
    }
  });

  // Contenido de la nota en un commit y los cambios de ese commit
  router.get('/history/version', async (req, res) => {
    try {
      res.json(await syncManager.versionAt(notePath(req.query.path), req.query.commit, MAX_NOTE_MB * 1024 * 1024));
    } catch (err) {
      res.status(400).json({ error: publicError(err, 'No se pudo leer la versión') });
    }
  });

  return router;
};
