import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carga el .env de la carpeta de la app, si existe (se importa antes que nada en index.js,
// para que limits.js ya vea las variables). Las ya definidas en el entorno tienen prioridad
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  } else {
    console.warn('[Config] Esta versión de Node no carga .env por sí sola (hace falta 20.12+): define las variables en el entorno');
  }
}
