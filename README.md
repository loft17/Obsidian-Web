<div align="center">

# 💎 Obsidian Web

**Visor y editor web ultraligero para tu vault de Obsidian local.**  
Accede y edita tus notas Markdown desde cualquier navegador (ideal para tu VPS), con una interfaz fiel al tema oscuro de Obsidian.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ✨ Características

- 📂 **Explorador de archivos** con carpetas colapsables e intuitivas.
- 🗂️ **Sistema de pestañas**: clic para abrir en la pestaña activa, o clic derecho / botón central para *"Abrir en pestaña nueva"*.
- 👁️ **Modos duales**: edición fluida y modo lectura con renderizado completo de Markdown.
- 🔗 **Wikilinks avanzados**: soporte para `[[nota]]`, `[[nota|alias]]` y `[[nota#encabezado]]`. Si la nota no existe, se muestra atenuada y se crea automáticamente en la raíz al pulsarla.
- 🖼️ **Gestión multimedia**: arrastra y suelta o pega imágenes desde el portapapeles. La ruta de destino se sincroniza con `.obsidian/app.json`.
- ⚡ **Autoguardado inteligente** con *debounce* mientras escribes.
- 🛠️ **Menú contextual completo**: duplica, mueve, renombra o borra notas (enviándolas de forma segura a `.trash`).
- 📊 **Esquema de encabezados** en la barra lateral derecha y contador en tiempo real de palabras, caracteres y líneas.
- 🔒 **Seguridad robusta**: acceso protegido mediante hash con `scrypt` y cookies firmadas.

---

## 📋 Requisitos

- **Node.js**: Versión **20 o superior**.
- **Vault**: Una bóveda de Obsidian accesible desde el sistema de archivos del servidor.

---

## 🚀 Instalación y Puesta en Marcha

Clona el repositorio e instala las dependencias (el script `postinstall` compilará automáticamente el frontend):

```bash
git clone <repo-url>
cd ObiWEB
npm install
npm start
```

La aplicación estará disponible en **`http://localhost:3000`**.

### 🛠️ Primer inicio

1. Abre `http://localhost:3000` en tu navegador.
2. Introduce la **ruta absoluta** de tu vault (ej. `/home/usuario/mi-vault`).
3. Define una contraseña de acceso (mínimo 6 caracteres).
4. Haz clic en **Configurar** ¡y listo para editar!

> 💡 **Nota:** La configuración se almacena en `data/config.json` y el secreto de las cookies en `data/.secret` (ambos excluidos de Git). Para reiniciar la configuración desde cero, simplemente borra `data/config.json`.

---

## ⚙️ Configuración Avanzada

Puedes cambiar el puerto por defecto mediante la variable de entorno `PORT`:

```bash
PORT=8080 npm start
```

> **Notas importantes:**
> - Si `data/config.json` define un puerto explícito, este tendrá prioridad sobre la variable `PORT`.
> - El servidor no carga archivos `.env` automáticamente; define tus variables directamente en el entorno de tu shell, systemd o PM2.

---

## 🛡️ Consideraciones sobre Enlaces Simbólicos (Symlinks)

Por motivos de seguridad, la aplicación **no sigue enlaces simbólicos** ubicados dentro de la bóveda para evitar exposiciones accidentales de archivos del sistema (como `/etc` o archivos de configuración).

- Los symlinks **no aparecerán** en el explorador ni en las búsquedas.
- Cualquier intento de acceder a ellos será rechazado del mismo modo que una ruta con `../`.

> 📌 **Alternativa:** Si necesitas estructurar carpetas externas dentro de tu bóveda, **cópialas o muévelas físicamente**. *(Nota: la ruta raíz de la bóveda sí puede ser un symlink, por ejemplo `/root/vault → /mnt/disco/vault`, y funcionará sin problemas).*

---

## 💻 Desarrollo

Si deseas contribuir o modificar la aplicación, arranca el entorno de desarrollo:

```bash
npm run dev
```

Esto levantará simultáneamente:
1. **Vite** (`http://localhost:5173`): Frontend con *hot-reload* instantáneo.
2. **Express** con `--watch` (`http://localhost:3000`): API backend con autoreinicio ante cambios en `server/`.

> ⚠️ **Durante el desarrollo, abre siempre `http://localhost:5173`** (no el puerto 3000). Vite redirige las peticiones a `/api` automáticamente mediante proxy, evitando problemas de CORS y cookies.

### 📜 Scripts disponibles

| Script | Descripción |
| :--- | :--- |
| `npm start` | Arranca el servidor en modo producción |
| `npm run web:build` | Compila el frontend estático en `web/dist` |
| `npm run web:dev` | Ejecuta únicamente el entorno frontend (Vite) |
| `npm run server:dev` | Ejecuta únicamente la API con recarga automática |

---

## 🗂️ Estructura del Proyecto

```text
ObiWEB/
├── server/          # Backend Node.js + Express (API y archivos estáticos)
│   ├── index.js     # Punto de entrada y middleware de autenticación
│   ├── vault.js     # Lógica de acceso al sistema de archivos
│   └── routes/      # Rutas de configuración, autenticación, archivos y búsqueda
├── web/             # Frontend React + Vite + TypeScript
│   └── src/         # Componentes, store (Zustand) y cliente de API
├── data/            # Configuración y secretos (autogenerado, en .gitignore)
└── 00_INFO-APP/     # Documentación técnica y scripts de diagnóstico
```

Para profundizar en el flujo de datos, consulta [ARQUITECTURA.md](00_INFO-APP/ARQUITECTURA.md).

---

## 🧰 Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** React 18, Vite, TypeScript
- **Estado Global:** Zustand
- **Estilos:** CSS personalizado inspirado en la estética de Obsidian
- **Editor:** CodeMirror 6 (con vista en vivo y barra de herramientas)

---

## 🛠️ Solución de Problemas

Si experimentas incidencias, revisa la guía en [TROUBLESHOOTING.md](utils/TROUBLESHOOTING.md) o ejecuta el script de diagnóstico rápido en tu servidor:

```bash
chmod +x 00_INFO-APP/diagnose.sh
./utils/diagnose.sh
```

---

## 🗺️ Hoja de Ruta (Roadmap)

- [ ] Sincronización en la nube (Dropbox / GitHub)

---

## 📄 Licencia

Distribuido bajo la licencia [MIT](https://opensource.org/licenses/MIT).