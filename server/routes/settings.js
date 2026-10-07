import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import * as vault from '../vault.js';
import { publicError } from '../security.js';
import { verifyPassword, hashPassword, MIN_PASSWORD_LENGTH } from '../password.js';
import { sessionCookie } from '../sessions.js';
import * as limits from '../limits.js';

export default (dataDir, getConfig, limiter, sessions) => {
  const router = Router();
  const configPath = join(dataDir, 'config.json');

  router.get('/vault', (req, res) => {
    res.json({ vaultPath: getConfig()?.vaultPath || '' });
  });

  // Límites del servidor (variables de entorno): solo lectura, se muestran en Preferencias
  router.get('/limits', (req, res) => {
    const MB = 1024 * 1024;
    const DAY = 24 * 60 * 60 * 1000;
    res.json({
      maxNoteMB: limits.MAX_NOTE_MB,
      maxUploadMB: limits.MAX_UPLOAD_MB,
      minPasswordLength: limits.MIN_PASSWORD_LENGTH,
      searchMaxQueryLength: limits.SEARCH_MAX_QUERY_LENGTH,
      searchMaxFileMB: limits.SEARCH_MAX_FILE_BYTES / MB,
      searchMaxScannedMB: limits.SEARCH_MAX_SCANNED_BYTES / MB,
      searchRateMax: limits.SEARCH_RATE_MAX,
      searchMaxResults: limits.SEARCH_MAX_RESULTS,
      searchMaxMatchesPerFile: limits.SEARCH_MAX_MATCHES_PER_FILE,
      sessionMaxDays: limits.SESSION_MAX_AGE / DAY,
      sessionIdleDays: limits.SESSION_IDLE / DAY,
    });
  });

  // getConfig relee config.json en cada petición, así que el cambio se aplica al instante.
  // Cambiar el vault da acceso a otra carpeta del servidor, así que además de la sesión
  // exige la contraseña actual (con el mismo límite de intentos que el login)
  router.post('/vault', async (req, res) => {
    // Sin configurar, esta ruta no exige sesión: no puede crear un config.json sin contraseña
    const cfg = getConfig();
    if (!cfg) return res.status(400).json({ error: 'Not configured' });
    const wait = limiter.retryAfter(req.ip);
    if (wait) {
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: `Demasiados intentos. Prueba de nuevo en ${Math.ceil(wait / 60)} min` });
    }
    try {
      if (!(await verifyPassword(req.body?.password, cfg.passwordHash))) {
        limiter.fail(req.ip);
        return res.status(403).json({ error: 'Contraseña incorrecta' });
      }
    } catch (err) {
      return res.status(500).json({ error: publicError(err, 'No se pudo cambiar la ruta') });
    }
    limiter.succeed(req.ip);
    let full;
    try {
      full = vault.checkVaultPath(req.body?.vaultPath, dataDir);
    } catch (err) {
      return res.status(400).json({ error: publicError(err) });
    }
    try {
      if (existsSync(full) && !statSync(full).isDirectory()) {
        return res.status(400).json({ error: 'La ruta existe pero no es una carpeta' });
      }
      mkdirSync(full, { recursive: true });
      writeFileSync(configPath, JSON.stringify({ ...cfg, vaultPath: full }, null, 2), { mode: 0o600 });
      res.json({ vaultPath: full });
    } catch (err) {
      res.status(500).json({ error: publicError(err, 'No se pudo cambiar la ruta') });
    }
  });

  // Cambiar la contraseña exige la actual (con el límite de intentos del login) y cierra
  // todas las sesiones salvo la de quien la cambia, que recibe una cookie nueva
  router.post('/password', async (req, res) => {
    const cfg = getConfig();
    if (!cfg) return res.status(400).json({ error: 'Not configured' });
    const wait = limiter.retryAfter(req.ip);
    if (wait) {
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: `Demasiados intentos. Prueba de nuevo en ${Math.ceil(wait / 60)} min` });
    }
    const { currentPassword, newPassword } = req.body ?? {};
    try {
      if (!(await verifyPassword(currentPassword, cfg.passwordHash))) {
        limiter.fail(req.ip);
        return res.status(403).json({ error: 'Contraseña incorrecta' });
      }
      limiter.succeed(req.ip);
      if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
      }
      const passwordHash = await hashPassword(newPassword);
      writeFileSync(configPath, JSON.stringify({ ...getConfig(), passwordHash }, null, 2), { mode: 0o600 });
      sessions.destroyAll();
      res.cookie('token', sessions.create(), sessionCookie(req));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: publicError(err, 'No se pudo cambiar la contraseña') });
    }
  });

  // Cierra todas las sesiones abiertas, también la actual
  router.post('/sessions/revoke', (req, res) => {
    sessions.destroyAll();
    res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: req.secure });
    res.json({ success: true });
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
    const parts = value.split('/');
    if (parts.includes('..') || parts.some((p) => ['.obsidian', '.git'].includes(p.toLowerCase()))) {
      return res.status(400).json({ error: 'Ruta no válida' });
    }
    try {
      vault.updateAppConfig(cfg.vaultPath, { attachmentFolderPath: value || '/' });
      res.json({ attachmentFolderPath: value || '/' });
    } catch (err) {
      res.status(500).json({ error: publicError(err, 'No se pudo guardar') });
    }
  });

  return router;
};
