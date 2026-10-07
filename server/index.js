import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import setupRoutes from './routes/setup.js';
import authRoutes from './routes/auth.js';
import filesRoutes from './routes/files.js';
import searchRoutes from './routes/search.js';
import settingsRoutes from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const dataDir = join(__dirname, '..', 'data');

// Generate or load cookie secret
mkdirSync(dataDir, { recursive: true });
const secretPath = join(dataDir, '.secret');
let cookieSecret;
if (existsSync(secretPath)) {
  cookieSecret = readFileSync(secretPath, 'utf8').trim();
} else {
  cookieSecret = crypto.randomBytes(32).toString('hex');
  writeFileSync(secretPath, cookieSecret);
}

// Middleware
app.use(express.json());
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
const distPath = join(__dirname, '..', 'web', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Routes
app.use('/api/setup', setupRoutes(dataDir));
app.use('/api/auth', authRoutes(dataDir));

// Protected routes (require login if configured)
app.use((req, res, next) => {
  const cfg = getConfig();

  // Rutas públicas que no necesitan autenticación
  const publicRoutes = ['/api/setup', '/api/auth/login', '/api/auth/logout'];
  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));

  // Excluir archivos estáticos del middleware de autenticación (nunca la API:
  // /api/files/raw/imagen.png sirve archivos del vault)
  const isStaticFile = !req.path.startsWith('/api/') &&
    /\.(js|css|svg|png|jpg|jpeg|gif|ico|json|woff|woff2|ttf|eot)$/i.test(req.path);

  if (cfg && !isPublicRoute && !isStaticFile && req.path !== '/') {
    const token = req.signedCookies.token;
    if (!token) {
      console.log(`[Auth] Unauthorized access attempt to ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`[Auth] Authorized access to ${req.method} ${req.path}`);
  }
  next();
});

app.use('/api/settings', settingsRoutes(dataDir, getConfig));
app.use('/api/files', filesRoutes(dataDir, getConfig));
app.use('/api/search', searchRoutes(dataDir, getConfig));

// SPA fallback (serve index.html for client-side routing)
if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

const port = (getConfig()?.port) || process.env.PORT || 3000;
app.listen(port, () => {
  const cfg = getConfig();
  console.log(`Obisidan Web listening on http://localhost:${port}`);
  if (cfg) {
    console.log(`Vault: ${cfg.vaultPath}`);
  } else {
    console.log('Setup required');
  }
});
