import './env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, chmodSync } from 'fs';
import crypto from 'crypto';
import setupRoutes from './routes/setup.js';
import authRoutes from './routes/auth.js';
import filesRoutes from './routes/files.js';
import searchRoutes from './routes/search.js';
import settingsRoutes from './routes/settings.js';
import syncRoutes from './routes/sync.js';
import { createSyncManager } from './sync.js';
import { createSessionStore, createLoginLimiter } from './sessions.js';
import { securityHeaders, csrfGuard } from './security.js';
import { MAX_NOTE_MB, MAX_UPLOAD_MB } from './limits.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const dataDir = join(__dirname, '..', 'data');

// Generate or load cookie secret
// data/ guarda el hash de la contraseña, el secreto de las cookies y las sesiones:
// solo el usuario que ejecuta la app puede leerla (también corrige instalaciones antiguas)
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
try {
  chmodSync(dataDir, 0o700);
  for (const f of readdirSync(dataDir)) chmodSync(join(dataDir, f), 0o600);
} catch (err) {
  console.warn('[Security] No se pudieron ajustar los permisos de data/:', err.message);
}
const secretPath = join(dataDir, '.secret');
let cookieSecret;
if (existsSync(secretPath)) {
  cookieSecret = readFileSync(secretPath, 'utf8').trim();
} else {
  cookieSecret = crypto.randomBytes(32).toString('hex');
  writeFileSync(secretPath, cookieSecret, { mode: 0o600 });
}

const sessions = createSessionStore(dataDir);
// Sincronización con GitHub / Dropbox / Google Drive (también la periódica)
const syncManager = createSyncManager(dataDir, () => getConfig());
// Compartido por el login y por las acciones que piden la contraseña (cambiar el vault)
const loginLimiter = createLoginLimiter();

// Detrás de un proxy inverso (nginx, Caddy...) define TRUST_PROXY=1 para que req.ip
// sea la IP real del cliente (la usa el límite de intentos de login)
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

const distPath = join(__dirname, '..', 'web', 'dist');

// Middleware
app.disable('x-powered-by');
app.use(securityHeaders(distPath));
app.use('/api', csrfGuard);
// El JSON se lee antes de comprobar la sesión, así que por defecto solo se aceptan cuerpos
// pequeños. Las notas (/api/files) pueden ser grandes: se leen con MAX_NOTE_MB más abajo,
// después de la comprobación de sesión
const apiPath = (req) => req.originalUrl.split('?')[0].toLowerCase();
const isFilesApi = (req) => apiPath(req).startsWith('/api/files/');
const smallJson = express.json({ limit: '100kb' });
app.use((req, res, next) => (isFilesApi(req) ? next() : smallJson(req, res, next)));
app.use(cookieParser(cookieSecret));

// Check if configured
const getConfig = () => {
  const configPath = join(dataDir, 'config.json');
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Error reading config:', e);
      return null;
    }
  }
  return null;
};

// Serve static web files (before auth middleware so they're always accessible)
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Routes
app.use('/api/setup', setupRoutes(dataDir, sessions));
app.use('/api/auth', authRoutes(dataDir, sessions, loginLimiter));

// Protected routes (require login)
// Montado en '/api' (Express no distingue mayúsculas, así que también cubre '/API/...').
// /api/setup y /api/auth ya respondieron arriba; todo lo demás de la API exige sesión.
// Sin configurar tampoco se deja pasar: alguien podría dejar preparada, p. ej., la
// sincronización con su repositorio de GitHub antes de que hagas el setup
app.use('/api', (req, res, next) => {
  if (!getConfig()) return res.status(503).json({ error: 'Not configured' });
  if (!sessions.isValid(req.signedCookies.token)) {
    console.log(`[Auth] Unauthorized access attempt to ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.use('/api/settings', settingsRoutes(dataDir, getConfig, loginLimiter, sessions));
app.use('/api/files', express.json({ limit: MAX_NOTE_MB * 1024 * 1024 }), filesRoutes(dataDir, getConfig));
app.use('/api/search', searchRoutes(dataDir, getConfig));
app.use('/api/sync', syncRoutes(syncManager, getConfig));

// SPA fallback (serve index.html for client-side routing)
if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Errores no controlados (p. ej. JSON malformado): sin trazas ni rutas internas en la respuesta
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[Error]', err);
  if (status === 413) {
    if (!isFilesApi(req)) return res.status(413).json({ error: 'Petición demasiado grande' });
    const max = apiPath(req).startsWith('/api/files/upload') ? MAX_UPLOAD_MB : MAX_NOTE_MB;
    return res.status(413).json({ error: `Demasiado grande (máximo ${max} MB)` });
  }
  res.status(status).json({ error: status >= 500 ? 'Error interno' : 'Petición no válida' });
});

// Solo números de puerto válidos: un texto se interpretaría como un socket de Unix
const validPort = (p) => {
  const n = Number(p);
  return p !== '' && p != null && Number.isInteger(n) && n >= 1 && n <= 65535 ? n : null;
};
const port = validPort(getConfig()?.port) ?? validPort(process.env.PORT) ?? 3000;
// HOST=127.0.0.1 para escuchar solo en local (detrás de un proxy inverso con HTTPS);
// sin definir, escucha en todas las interfaces
const host = process.env.HOST || undefined;
app.listen(port, host, () => {
  const cfg = getConfig();
  console.log(`Obsidita listening on http://${host || 'localhost'}:${port}`);
  if (cfg) {
    console.log(`Vault: ${cfg.vaultPath}`);
  } else {
    console.log('Setup required');
  }
  // Avisos de despliegue inseguro
  if (process.getuid?.() === 0) {
    console.warn('[Security] La app se está ejecutando como root: si alguien consigue entrar, controla todo el servidor. Usa un usuario sin privilegios.');
  }
  if (!host) {
    console.warn('[Security] Escuchando en todas las interfaces por HTTP (sin cifrar). Define HOST=127.0.0.1 y pon delante un proxy con HTTPS (Caddy, nginx).');
  }
});
