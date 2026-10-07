import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 días

// Sesiones revocables: la cookie lleva un token aleatorio y aquí solo se guarda su hash
// (data/sessions.json), así que cerrar sesión invalida la cookie aunque alguien la haya copiado
export const createSessionStore = (dataDir) => {
  const path = join(dataDir, 'sessions.json');
  const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

  let sessions = {};
  if (existsSync(path)) {
    try {
      sessions = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      sessions = {};
    }
  }

  const save = () => {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify(sessions), { mode: 0o600 });
  };

  const prune = () => {
    const now = Date.now();
    for (const [key, s] of Object.entries(sessions)) {
      if (s.expires <= now) delete sessions[key];
    }
  };

  return {
    create() {
      prune();
      const token = crypto.randomBytes(32).toString('hex');
      sessions[hash(token)] = { expires: Date.now() + SESSION_MAX_AGE };
      save();
      return token;
    },
    isValid(token) {
      if (typeof token !== 'string' || !token) return false;
      const s = sessions[hash(token)];
      return !!s && s.expires > Date.now();
    },
    destroy(token) {
      if (typeof token !== 'string' || !token) return;
      if (delete sessions[hash(token)]) save();
    },
    destroyAll() {
      sessions = {};
      save();
    },
  };
};

// Límite de intentos de login fallidos por IP: tras MAX_FAILS fallos en WINDOW,
// la IP queda bloqueada durante LOCK (que se duplica con cada bloqueo seguido, hasta MAX_LOCK)
const MAX_FAILS = 5;
const WINDOW = 15 * 60 * 1000;
const LOCK = 60 * 1000;
const MAX_LOCK = 60 * 60 * 1000;

export const createLoginLimiter = () => {
  const attempts = new Map(); // ip → { fails, first, lockedUntil, locks }

  // Limpieza periódica para que el mapa no crezca sin límite
  setInterval(() => {
    const now = Date.now();
    for (const [ip, a] of attempts) {
      if (a.lockedUntil < now && now - a.first > WINDOW) attempts.delete(ip);
    }
  }, WINDOW).unref();

  return {
    // Segundos que faltan para poder reintentar (0 si no está bloqueada)
    retryAfter(ip) {
      const a = attempts.get(ip);
      if (!a || a.lockedUntil <= Date.now()) return 0;
      return Math.ceil((a.lockedUntil - Date.now()) / 1000);
    },
    fail(ip) {
      const now = Date.now();
      let a = attempts.get(ip);
      if (!a || now - a.first > WINDOW) {
        a = { fails: 0, first: now, lockedUntil: 0, locks: a?.locks ?? 0 };
        attempts.set(ip, a);
      }
      a.fails++;
      if (a.fails >= MAX_FAILS) {
        a.lockedUntil = now + Math.min(LOCK * 2 ** a.locks, MAX_LOCK);
        a.locks++;
        a.fails = 0;
        a.first = now;
      }
    },
    succeed(ip) {
      attempts.delete(ip);
    },
  };
};
