# Obsidian Web


Visor y editor web para un vault de Obsidian local. Con él puedes leer y editar tus notas Markdown desde el navegador (por ejemplo, alojado en un VPS), con una interfaz inspirada en el tema oscuro de Obsidian.

---
333

## Características

- **Explorador de archivos** con carpetas colapsables
- **Pestañas**: clic abre la nota en la pestaña activa; clic derecho → "Abrir en pestaña nueva"
- **Modos de edición y lectura**: el modo lectura renderiza el Markdown
- **Wikilinks navegables**: `[[nota]]`, `[[nota|alias]]` y `[[nota#encabezado]]`. Clic para abrir (Ctrl/Cmd+clic o botón central → pestaña nueva); si la nota no existe se muestra atenuada y se crea en la raíz del vault al pulsarla
- **Imágenes**: arrastra y suelta o pega desde el portapapeles para subirlas a la nota. La carpeta destino se elige en *Preferencias → Archivos* y se guarda en `.obsidian/app.json`, compartida con Obsidian de escritorio
- **Autoguardado** con debounce mientras escribes
- **Gestión de notas** desde el menú contextual: duplicar, mover a otra carpeta, renombrar y borrar (se mueven a `.trash`)
- **Esquema** de encabezados en la barra lateral derecha
- **Contador** de palabras, caracteres y líneas
- **Acceso protegido por contraseña** (hash con scrypt y cookie firmada)

## Requisitos

- Node.js **20 o superior**
- Un vault de Obsidian accesible en el sistema de archivos del servidor

## Instalación

```bash
git clone <repo-url>
cd ObiWEB
npm install   # instala dependencias y compila el frontend (postinstall)
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

### Primer inicio

1. Abre `http://localhost:3000` en el navegador.
2. Indica la ruta absoluta del vault (p. ej. `/home/usuario/mi-vault`).
3. Define una contraseña (mínimo 6 caracteres).
4. Pulsa **Configurar** y empieza a editar.

La configuración se guarda en `data/config.json` y el secreto de las cookies en `data/.secret`. Ambos se generan automáticamente y están excluidos de git. Para volver a configurar desde cero, borra `data/config.json`.

## Configuración

El puerto se puede cambiar con la variable de entorno `PORT` (por defecto `3000`):

```bash
PORT=8080 npm start
```

> Si `data/config.json` define un `port`, este tiene prioridad sobre `PORT`.
>
> El servidor no carga `.env` automáticamente: `.env.example` sirve solo como referencia, así que define las variables en el entorno (shell, systemd, pm2…).

## Desarrollo

```bash
npm run dev
```

Arranca a la vez dos procesos:

- **Vite** en `http://localhost:5173`: sirve el frontend directamente desde `web/src` con hot-reload (los cambios se ven al instante, sin compilar).
- **Express** con `--watch` en `http://localhost:3000`: la API, que se reinicia sola al cambiar archivos de `server/`.

**Durante el desarrollo abre `http://localhost:5173`**, no el 3000. Vite reenvía todas las peticiones a `/api` hacia Express (ver `server.proxy` en [web/vite.config.ts](web/vite.config.ts)), así que no hay problemas de CORS ni de cookies.

> Esto solo aplica en desarrollo. En producción (`npm start`) no existe el puerto 5173: Express sirve el frontend ya compilado desde `web/dist` en su propio puerto.

Ten en cuenta que:

- **El proxy apunta siempre al puerto 3000.** Si cambias el puerto de la API (con `PORT` o con `port` en `data/config.json`), actualiza también la URL del proxy en `web/vite.config.ts`, o las llamadas a `/api` fallarán en desarrollo.
- **Vite solo escucha en `localhost`.** Si el proyecto corre en un servidor remoto y quieres abrirlo desde otro equipo, arranca Vite con `npm run web:dev -- --host` (o añade `host: true` en `server` dentro de `web/vite.config.ts`). Otra opción es un túnel SSH: `ssh -L 5173:localhost:5173 usuario@servidor`.

Otros scripts útiles:

| Script              | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `npm start`         | Arranca el servidor en modo producción    |
| `npm run web:build` | Compila el frontend en `web/dist`         |
| `npm run web:dev`   | Solo el frontend (Vite)                   |
| `npm run server:dev`| Solo la API, con recarga automática       |

## Estructura del proyecto

```
ObiWEB/
├── server/          # Backend Node.js + Express (API y estáticos)
│   ├── index.js     # Punto de entrada y middleware de autenticación
│   ├── vault.js     # Acceso al sistema de archivos del vault
│   └── routes/      # setup, auth, files, search
├── web/             # Frontend React + Vite + TypeScript
│   └── src/         # Componentes, store (Zustand) y cliente de la API
├── data/            # Configuración y secretos (generado, en .gitignore)
└── 00_INFO-APP/     # Documentación técnica y diagnóstico
```

Más detalle sobre el flujo de datos y la API en [ARQUITECTURA.md](00_INFO-APP/ARQUITECTURA.md).

## Tecnología

- **Backend:** Node.js + Express
- **Frontend:** React 18 + Vite + TypeScript
- **Estado:** Zustand
- **Estilos:** CSS propio inspirado en Obsidian
- **Editor:** CodeMirror 6 con vista previa en vivo y barra de formato

## Solución de problemas

Consulta [TROUBLESHOOTING.md](utils/TROUBLESHOOTING.md). Para un diagnóstico rápido en el servidor:

```bash
chmod +x 00_INFO-APP/diagnose.sh
./utils/diagnose.sh
```

## Hoja de ruta
- sincronización con Dropbox / GitHub

## Licencia
MIT
