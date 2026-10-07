# Obsidian Web

---

Visor y editor web para un vault de Obsidian local. Con él puedes leer y editar tus notas Markdown desde el navegador (por ejemplo, alojado en un VPS), con una interfaz inspirada en el tema oscuro de Obsidian.

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

Arranca a la vez:

- **Vite** con hot-reload en `http://localhost:5173` (frontend)
- **Express** con `--watch` en `http://localhost:3000` (API)

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
