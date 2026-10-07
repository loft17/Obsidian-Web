import { Router } from 'express';
import * as vault from '../vault.js';
import { publicError } from '../security.js';

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

const FRONTMATTER = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;
const INLINE_TAG = /(^|\s)#([\p{L}\p{N}_\-/]*[\p{L}_\-/][\p{L}\p{N}_\-/]*)/gu;

const cleanTag = (s) => s.replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '').replace(/^#/, '');

// Apariciones de etiquetas en una nota: { line, idx, text } por cada una, tanto en
// la propiedad `tags` del frontmatter como en `#etiquetas` del cuerpo (fuera de bloques de código)
function findTags(lines) {
  const found = [];
  let start = 0;
  const fm = FRONTMATTER.exec(lines.join('\n'));
  if (fm) {
    const fmLines = fm[1] === undefined ? [] : fm[1].split('\n');
    start = fmLines.length + 2;
    for (let i = 0; i < fmLines.length; i++) {
      const m = /^(tags?)[ \t]*:[ \t]*(.*)$/i.exec(fmLines[i]);
      if (!m) continue;
      const rest = m[2].trim();
      const lineNo = i + 1;
      const push = (ln, raw) => {
        const text = cleanTag(raw);
        if (text) found.push({ line: ln, idx: lines[ln].indexOf(text), text });
      };
      if (rest === '') {
        for (let j = i + 1; j < fmLines.length && /^\s*-(\s|$)/.test(fmLines[j]); j++) {
          push(j + 1, fmLines[j].replace(/^\s*-\s?/, ''));
        }
      } else {
        rest.replace(/^\[|\]$/g, '').split(/[,\s]+/).forEach((t) => push(lineNo, t));
      }
    }
  }
  let inCode = false;
  for (let i = start; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inCode = !inCode;
    if (inCode) continue;
    for (const m of lines[i].matchAll(INLINE_TAG)) {
      found.push({ line: i, idx: m.index + m[1].length, text: '#' + m[2] });
    }
  }
  return found;
}

function searchTag(cfg, tag) {
  const needle = tag.toLowerCase();
  const results = [];
  for (const file of vault.listTree(cfg.vaultPath)) {
    if (file.type !== 'file') continue;
    let lines;
    try {
      lines = vault.readFile(cfg.vaultPath, file.path).split(/\r?\n/);
    } catch (e) {
      continue;
    }
    // Coincide la etiqueta exacta y sus subetiquetas (proyecto → proyecto/web)
    const hits = findTags(lines).filter(({ text }) => {
      const t = text.replace(/^#/, '').toLowerCase();
      return t === needle || t.startsWith(needle + '/');
    });
    if (hits.length === 0) continue;
    const matches = hits
      .slice(0, MAX_MATCHES_PER_FILE)
      .map((h) => ({ line: h.line + 1, ...snippet(lines[h.line], Math.max(h.idx, 0), h.text.length) }));
    results.push({ path: file.path, name: file.name, nameMatch: false, total: hits.length, matches });
  }
  results.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));
  return results.slice(0, MAX_RESULTS);
}

export default (dataDir, getConfig) => {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });

      const q = String(req.query.q || '').trim();
      if (!q) return res.json([]);

      // Operador de etiqueta, como en Obsidian: tag:proyecto o tag:#proyecto
      const tagQuery = /^tag:\s*#?(\S+)$/i.exec(q);
      if (tagQuery) return res.json(searchTag(cfg, tagQuery[1]));

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
      res.status(400).json({ error: publicError(err, 'Error en la búsqueda') });
    }
  });

  return router;
};
