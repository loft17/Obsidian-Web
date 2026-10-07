import { Router } from 'express';
import { publicError } from '../security.js';

export default (syncManager) => {
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

  return router;
};
