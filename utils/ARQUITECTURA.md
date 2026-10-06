# Arquitectura de Obisidan Web

## Estructura del Proyecto

```
ObiWEB/
├── server/                  # Backend Node.js + Express
│   ├── index.js            # Punto de entrada, middleware, estáticos
│   ├── vault.js            # Operaciones de filesystem (guardias anti path-traversal)
│   └── routes/
│       ├── setup.js        # POST /api/setup/init, GET /api/setup/status
│       ├── auth.js         # POST /api/auth/login, POST /api/auth/logout
│       ├── files.js        # GET /api/files/tree, read, write, delete, rename
│       └── search.js       # GET /api/search?q=
├── web/                     # Frontend React 18 + Vite
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx        # Entry point React
│       ├── App.tsx         # Router de estados (setup/login/main)
│       ├── store.ts        # Zustand store (árbol, tabs, editor mode)
│       ├── api.ts          # Cliente HTTP (setup, auth, files, search)
│       ├── components/
│       │   ├── Setup.tsx   # Asistente de primera configuración
│       │   ├── Login.tsx   # Pantalla de login
│       │   ├── MainLayout.tsx
│       │   ├── Ribbon.tsx
│       │   ├── FileExplorer.tsx
│       │   ├── Tabs.tsx
│       │   ├── Editor.tsx
│       │   ├── ReadingView.tsx
│       │   ├── StatusBar.tsx
│       │   └── RightSidebar.tsx
│       └── styles/
│           └── obsidian.css
├── data/                    # Config y secretos (gitignored)
│   ├── config.json         # Ruta del vault, hash de contraseña, puerto
│   └── .secret             # Cookie signing secret
├── package.json            # Root config (monorepo setup)
├── .gitignore
├── README.md
└── ARQUITECTURA.md
```

## Flujo de Datos

### Inicialización
1. Frontend carga `App.tsx` → verifica estado con `setupApi.checkStatus()`
2. Si no configurado → muestra `Setup.tsx` → POST `/api/setup/init`
3. Backend crea `data/config.json` con contraseña hasheada (scrypt)
4. Frontend llama `filesApi.getTree()` y carga el árbol de archivos
5. Usuario ve `MainLayout.tsx`

### Edición de Archivo
1. Click en archivo en `FileExplorer.tsx` → `addTab()` + `setActiveTab()` en zustand
2. `MainLayout.tsx` detecta cambio en `activeTab` → `filesApi.readFile()`
3. Contenido se renderiza en `Editor.tsx` (textarea simple)
4. Usuario escribe → `onContentChange()` → debounce 2s → `filesApi.writeFile()`
5. Si toggle a vista de lectura → `ReadingView.tsx` renderiza con markdown-it

### Autenticación
- La contraseña se hash en setup con scrypt (16384 iteraciones)
- Login POST `/api/auth/login` retorna cookie firmada `token`
- Middleware en server protege `/api/` si hay config
- Logout borra la cookie

## Guardias de Seguridad

### Path Traversal
`vault.js:guardPath()` previene `../../etc/passwd`:
- Resuelve ruta con `join(vaultPath, userPath)`
- Verifica que la ruta resuelta comience con `vaultPath`
- Lanza error si intenta salir

### Autenticación
Todas las rutas API exceptuando `/api/setup` y `/api/auth/login` requieren cookie `token` firmada.

## Variables de Estado (Zustand)

```typescript
{
  tree: TreeItem[],               // Árbol de archivos (listado plano con tipos)
  tabs: Tab[],                    // [{ path, name, isDirty }, ...]
  activeTab: string | null,       // Path de la pestaña activa
  editMode: boolean,              // true = editor, false = lectura
  expandedFolders: Set<string>,   // Carpetas abiertas en el árbol
}
```

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/setup/status` | ¿Está configurado? |
| POST | `/api/setup/init` | Crear config inicial |
| POST | `/api/auth/login` | Login con contraseña |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/files/tree` | Listar árbol |
| GET | `/api/files/read/:path` | Leer archivo |
| POST | `/api/files/write/:path` | Guardar archivo |
| DELETE | `/api/files/:path` | Mover a .trash |
| POST | `/api/files/rename` | Renombrar |
| GET | `/api/search?q=` | Búsqueda full-text simple |

## Próximas Fases

### Fase 2: Editor Mejorado
- Reemplazar textarea con CodeMirror 6
- Sintaxis highlighting para Markdown
- Wikilinks funcionales `[[note]]`
- Embeds de imágenes

### Fase 3: Sincronización
- Nueva ruta: `POST /api/sync/configure`
- Módulo `server/sync.js` con estrategia (GitHub git / Dropbox)
- Panel en Settings para tokens

### Fase 4: Búsqueda Avanzada
- Índice con `minisearch`
- Queries: `tag:inbox`, `path:projects`
- Quick Switcher (Ctrl+O)

### Fase 5: Graph View
- Extraer wikilinks con regex
- D3-force para layout
- Pixi.js para rendering (opcional, canvas o SVG)

## Notas de Desarrollo

- **Sin TypeScript en servidor**: usa ESM (import/export) para evitar build step
- **Textarea simple**: más ligero que CodeMirror para MVP, se reemplaza en fase 2
- **Autosave debounced**: 2s sin cambios → POST a `/api/files/write`
- **Árbol plano**: se renderiza como jerarquía en componente (agrupa por parent)
- **CSS variables**: fácil para temas (Obsidian por defecto, Light en fase X)
