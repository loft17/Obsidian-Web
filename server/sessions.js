import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 días como máximo
export const SESSION_IDLE = 7 * 24 * 60 * 60 * 1000; // caduca tras 7 días sin usarse
const TOUCH_EVERY = 60 * 60 * 1000; // la última actividad se guarda en disco como mucho cada hora

// Opciones de la cookie de sesión. `secure` cuando la petición llega por HTTPS
// (detrás de un proxy, requiere TRUST_PROXY)
export const sessionCookie = (req) => ({
  signed: true,
  httpOnly: true,
  sameSite: 'strict',
  secure: req.secure,
  maxAge: SESSION_MAX_AGE,
});

// Sesiones revocables: la cookie lleva un token aleatorio y aquí solo se guarda su hash
// (data/sessions.json), así que cerrar sesión invalida la cookie aunque alguien la haya copiado.
// Caducan a los 30 días o tras SESSION_IDLE sin actividad, lo que ocurra antes
export const createSessionStore = (dataDir) => {
  const path = join(dataDir, 'sessions.json');
  const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

  let sessions = {};
  if (existsSync(path)) {
    try {
      sessions = JSON.parse(readFileSync(path, 'utf8'));
      // Sesiones de versiones anteriores, sin registro de actividad: cuentan desde ahora
      for (const s of Object.values(sessions)) s.lastSeen ??= Date.now();
    } catch {
      sessions = {};
    }
  }

  const save = () => {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify(sessions), { mode: 0o600 });
  };

  const alive = (s, now) => s.expires > now && now - s.lastSeen < SESSION_IDLE;

  const prune = () => {
    const now = Date.now();
    for (const [key, s] of Object.entries(sessions)) {
      if (!alive(s, now)) delete sessions[key];
    }
  };

  return {
    create() {
      prune();
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      sessions[hash(token)] = { expires: now + SESSION_MAX_AGE, lastSeen: now };
      save();
      return token;
    },
    // Comprueba la sesión y registra la actividad (para la caducidad por inactividad)
    isValid(token) {
      if (typeof token !== 'string' || !token) return false;
      const key = hash(token);
      const s = sessions[key];
      const now = Date.now();
      if (!s) return false;
      if (!alive(s, now)) {
        delete sessions[key];
        save();
        return false;
      }
      if (now - s.lastSeen > TOUCH_EVERY) {
        s.lastSeen = now;
        save();
      }
      return true;
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
// la IP queda bloqueada durante LOCK (que se duplica con cada bloqueo seguido, hasta MAX_LOCK).
// Además hay un límite global (GLOBAL_MAX_FAILS fallos en WINDOW, sumando todas las IPs)
// para frenar ataques repartidos entre muchas direcciones
const MAX_FAILS = 5;
const WINDOW = 15 * 60 * 1000;
const LOCK = 60 * 1000;
const MAX_LOCK = 60 * 60 * 1000;
const GLOBAL_MAX_FAILS = 50;
const GLOBAL_LOCK = 5 * 60 * 1000;

// Las IPv6 se agrupan por su prefijo /64: un atacante suele disponer de todo el bloque
const ipKey = (ip) => {
  const addr = String(ip ?? '').replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');
  if (!addr.includes(':')) return addr;
  const [head, tail = ''] = addr.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = addr.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
};

export const createLoginLimiter = () => {
  const attempts = new Map(); // ip → { fails, first, lockedUntil, locks }
  const global = { fails: 0, first: 0, lockedUntil: 0 };

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
      const now = Date.now();
      const until = Math.max(attempts.get(ipKey(ip))?.lockedUntil ?? 0, global.lockedUntil);
      return until > now ? Math.ceil((until - now) / 1000) : 0;
    },
    fail(ip) {
      ip = ipKey(ip);
      const now = Date.now();
      if (now - global.first > WINDOW) {
        global.fails = 0;
        global.first = now;
      }
      if (++global.fails >= GLOBAL_MAX_FAILS) {
        global.lockedUntil = now + GLOBAL_LOCK;
        global.fails = 0;
        global.first = now;
        console.warn('[Auth] Demasiados intentos fallidos en total: login bloqueado temporalmente para todos');
      }
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
      attempts.delete(ipKey(ip));
    },
  };
};
