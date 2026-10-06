import { Router } from 'express';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import * as vault from '../vault.js';

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const PRINT_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #222; max-width: 900px; margin: 0 auto; padding: 32px; }
  h1 { font-size: 28px; margin: 0 0 0.6em; }
  h2 { font-size: 22px; margin: 1em 0 0.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
  h3 { font-size: 18px; margin: 0.8em 0 0.4em; }
  code { background: #f3f3f3; padding: 2px 5px; border-radius: 3px; font-family: Consolas, 'Courier New', monospace; font-size: 0.9em; }
  pre { background: #f3f3f3; padding: 12px; border-radius: 5px; white-space: pre-wrap; word-break: break-word; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 14px; color: #555; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f3f3f3; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
  @media print { body { padding: 0; } }
`;

const escapeHtml = (s) => md.utils.escapeHtml(s);

export default (dataDir, getConfig) => {
  const router = Router();

  // Ejecuta una operación sobre la bóveda configurada y responde JSON
  const withVault = (handler) => (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      handler(cfg, req, res);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };

  router.get('/tree', withVault((cfg, req, res) => res.json(vault.listTree(cfg.vaultPath))));

  router.get('/read/:filePath', withVault((cfg, req, res) => {
    res.json({ content: vault.readFile(cfg.vaultPath, req.params.filePath) });
  }));

  router.get('/export-pdf/:filePath', withVault((cfg, req, res) => {
    const raw = vault.readFile(cfg.vaultPath, req.params.filePath);
    let body = raw;
    try {
      body = matter(raw).content;
    } catch {
      // frontmatter inválido: se exporta el texto completo
    }
    const title = escapeHtml(req.params.filePath.split('/').pop().replace(/\.md$/i, ''));
    res.type('html').send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<h1>${title}</h1>
${md.render(body)}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body>
</html>`);
  }));

  router.post('/write/:filePath', withVault((cfg, req, res) => {
    vault.writeFile(cfg.vaultPath, req.params.filePath, req.body.content);
    res.json({ success: true });
  }));

  router.delete('/:filePath', withVault((cfg, req, res) => {
    vault.deleteFile(cfg.vaultPath, req.params.filePath);
    res.json({ success: true });
  }));

  router.post('/rename', withVault((cfg, req, res) => {
    vault.renameFile(cfg.vaultPath, req.body.oldPath, req.body.newPath);
    res.json({ success: true });
  }));

  router.post('/copy', withVault((cfg, req, res) => {
    res.json({ success: true, path: vault.copyFile(cfg.vaultPath, req.body.path) });
  }));

  router.post('/create-note', withVault((cfg, req, res) => {
    vault.createNote(cfg.vaultPath, req.body.path);
    res.json({ success: true });
  }));

  router.post('/create-folder', withVault((cfg, req, res) => {
    vault.createFolder(cfg.vaultPath, req.body.path);
    res.json({ success: true });
  }));

  return router;
};
