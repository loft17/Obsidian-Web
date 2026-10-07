import express, { Router } from 'express';
import MarkdownIt from 'markdown-it';
import * as vault from '../vault.js';
import { publicError, scriptHash } from '../security.js';
import { MAX_UPLOAD_MB } from '../limits.js';

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

// Frontmatter YAML al inicio de la nota (se omite en la exportación)
const FRONTMATTER = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;

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

const PRINT_SCRIPT = "window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });";
// La página de exportación solo puede ejecutar su script de impresión
const PRINT_CSP = `default-src 'none'; script-src ${scriptHash(PRINT_SCRIPT)}; style-src 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'`;

export default (dataDir, getConfig) => {
  const router = Router();

  // Ejecuta una operación sobre la bóveda configurada y responde JSON
  const withVault = (handler) => (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      handler(cfg, req, res);
    } catch (err) {
      res.status(400).json({ error: publicError(err) });
    }
  };

  router.get('/tree', withVault((cfg, req, res) => res.json(vault.listTree(cfg.vaultPath))));

  router.get('/read/:filePath', withVault((cfg, req, res) => {
    res.json({ content: vault.readFile(cfg.vaultPath, req.params.filePath) });
  }));

  // Archivos binarios del vault (imágenes adjuntas a las notas)
  router.get('/raw/:filePath', withVault((cfg, req, res) => {
    const fullPath = vault.resolveFile(cfg.vaultPath, req.params.filePath);
    // Un SVG abierto directamente no debe poder ejecutar scripts
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    });
    res.sendFile(fullPath, { dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) res.status(err.statusCode || 404).json({ error: 'Not found' });
    });
  }));

  router.get('/export-pdf/:filePath',withVault((cfg, req, res) => {
    const raw = vault.readFile(cfg.vaultPath, req.params.filePath);
    const body = raw.replace(FRONTMATTER, '');
    const title = escapeHtml(req.params.filePath.split('/').pop().replace(/\.md$/i, ''));
    res.set('Content-Security-Policy', PRINT_CSP);
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
<script>${PRINT_SCRIPT}</script>
</body>
</html>`);
  }));

  router.post('/write/:filePath', withVault((cfg, req, res) => {
    vault.writeFile(cfg.vaultPath, req.params.filePath, req.body.content);
    res.json({ success: true });
  }));

  // Sube un adjunto de la nota `note` (cuerpo binario); la carpeta destino sale de los ajustes
  router.post(
    '/upload',
    express.raw({ type: () => true, limit: MAX_UPLOAD_MB * 1024 * 1024 }),
    withVault((cfg, req, res) => {
      const note = String(req.query.note || '');
      const name = String(req.query.name || '');
      if (!name || !Buffer.isBuffer(req.body) || !req.body.length) throw new Error('Archivo vacío');
      const folder = vault.attachmentFolder(cfg.vaultPath, note);
      res.json({ path: vault.saveAttachment(cfg.vaultPath, folder, name, req.body) });
    })
  );

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
