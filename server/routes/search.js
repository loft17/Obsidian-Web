import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as vault from '../vault.js';

export default (dataDir, getConfig) => {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });

      const q = req.query.q || '';
      if (!q) return res.json([]);

      const tree = vault.listTree(cfg.vaultPath);
      const mdFiles = tree.filter(f => f.type === 'file');
      const results = [];

      for (const file of mdFiles) {
        try {
          const content = vault.readFile(cfg.vaultPath, file.path);
          if (content.toLowerCase().includes(q.toLowerCase())) {
            results.push({ path: file.path, name: file.name });
          }
        } catch (e) {
          // Skip unreadable files
        }
      }

      res.json(results);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
