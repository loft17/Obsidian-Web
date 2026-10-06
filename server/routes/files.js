import { Router } from 'express';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as vault from '../vault.js';

export default (dataDir, getConfig) => {
  const router = Router();

  router.get('/tree', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) {
        console.log('[Files] No config found when requesting tree');
        return res.status(400).json({ error: 'Not configured' });
      }
      console.log(`[Files] Getting tree for vault: ${cfg.vaultPath}`);
      const tree = vault.listTree(cfg.vaultPath);
      res.json(tree);
    } catch (err) {
      console.error('[Files] Error getting tree:', err);
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/read/:filePath', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      const content = vault.readFile(cfg.vaultPath, req.params.filePath);
      res.json({ content });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/write/:filePath', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      vault.writeFile(cfg.vaultPath, req.params.filePath, req.body.content);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:filePath', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      vault.deleteFile(cfg.vaultPath, req.params.filePath);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/rename', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      vault.renameFile(cfg.vaultPath, req.body.oldPath, req.body.newPath);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/copy', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      const newPath = vault.copyFile(cfg.vaultPath, req.body.path);
      res.json({ success: true, path: newPath });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/create-note', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      vault.createNote(cfg.vaultPath, req.body.path);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/create-folder', (req, res) => {
    try {
      const cfg = getConfig();
      if (!cfg) return res.status(400).json({ error: 'Not configured' });
      vault.createFolder(cfg.vaultPath, req.body.path);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
