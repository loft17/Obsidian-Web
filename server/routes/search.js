import { Router } from 'express';
import * as vault from '../vault.js';

const MAX_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 5;
const SNIPPET_RADIUS = 60;

// Fragmento de la línea centrado en la coincidencia
const snippet = (line, idx, len) => {
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(line.length, idx + len + SNIPPET_RADIUS);
  return {
    text: (start > 0 ? '…' : '') + line.slice(start, end) + (end < line.length ? '…' : ''),
    start: idx - start + (start > 0 ? 1 : 0),
    length: len,
  };
};

export default (dataDir, getConfig) => {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });

      const q = String(req.query.q || '').trim();
      if (!q) return res.json([]);
      const needle = q.toLowerCase();

      const files = vault.listTree(cfg.vaultPath).filter((f) => f.type !== 'folder');
      const results = [];

      for (const file of files) {
        const nameMatch = file.name.toLowerCase().includes(needle);
        const matches = [];
        let total = 0;

        // Solo se busca dentro de las notas markdown
        if (file.type === 'file') {
          try {
            const lines = vault.readFile(cfg.vaultPath, file.path).split(/\r?\n/);
            lines.forEach((line, i) => {
              const lower = line.toLowerCase();
              let idx = lower.indexOf(needle);
              while (idx >= 0) {
                total++;
                if (matches.length < MAX_MATCHES_PER_FILE) {
                  matches.push({ line: i + 1, ...snippet(line, idx, needle.length) });
                }
                idx = lower.indexOf(needle, idx + needle.length);
              }
            });
          } catch (e) {
            // Skip unreadable files
          }
        }

        if (nameMatch || total > 0) {
          results.push({ path: file.path, name: file.name, nameMatch, total, matches });
        }
      }

      // Primero las coincidencias por nombre, luego por número de apariciones
      results.sort((a, b) => Number(b.nameMatch) - Number(a.nameMatch) || b.total - a.total || a.path.localeCompare(b.path));
      res.json(results.slice(0, MAX_RESULTS));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
