<div align="center">

# 💎 Obsidian Web

**Visor y editor web ultraligero para tu vault de Obsidian.**
Accede y edita tus notas Markdown desde cualquier navegador (ideal para un VPS), con una interfaz fiel a la de Obsidian.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 📑 Índice

1. [Características](#-características)
2. [Requisitos](#-requisitos)
3. [Instalación rápida (local)](#-instalación-rápida-local)
4. [Primer inicio: configuración inicial](#️-primer-inicio-configuración-inicial)
5. [Variables de entorno](#️-variables-de-entorno)
6. [`TRUST_PROXY` en detalle](#-trust_proxy-en-detalle)
7. [Despliegue en producción (VPS)](#-despliegue-en-producción-vps)
   - [Usuario dedicado](#1-usuario-dedicado)
   - [Instalación](#2-instalación)
   - [Servicio systemd](#3-servicio-systemd)
   - [Proxy inverso con HTTPS: Caddy](#4a-proxy-inverso-con-caddy-recomendado)
   - [Proxy inverso con HTTPS: nginx](#4b-proxy-inverso-con-nginx)
   - [Alternativa: PM2](#alternativa-pm2)
   - [Checklist final](#-checklist-de-despliegue)
8. [Archivos de datos (`data/`)](#️-archivos-de-datos-data)
9. [Seguridad](#️-seguridad)
10. [Límites](#-límites)
11. [Uso](#-uso)
12. [Atajos de teclado](#️-atajos-de-teclado)
13. [Preferencias](#️-preferencias)
14. [Actualizar, copias de seguridad y recuperación](#-actualizar-copias-de-seguridad-y-recuperación)
15. [Desarrollo](#-desarrollo)
16. [Estructura del proyecto](#️-estructura-del-proyecto)
17. [API](#-api)
18. [Solución de problemas](#️-solución-de-problemas)
19. [Licencia](#-licencia)

---

## ✨ Características

- 📂 **Explorador de archivos** con carpetas colapsables, menú contextual y creación de notas y carpetas.
- 🗂️ **Pestañas**: clic para abrir en la pestaña activa; `Ctrl`/`Cmd` + clic, botón central o clic derecho → *"Abrir en pestaña nueva"*.
- 👁️ **Edición y lectura**: editor CodeMirror 6 con *vista previa en vivo* (estilo Obsidian, incluidas tablas) o *modo fuente*, y modo lectura con Markdown renderizado.
- 🔗 **Wikilinks**: `[[nota]]`, `[[nota|alias]]` y `[[nota#encabezado]]`. Si la nota no existe se muestra atenuada y se crea al pulsarla.
- 🏷️ **Propiedades (frontmatter YAML)** editables, con soporte para `tags` y `aliases` como listas.
- 🔍 **Búsqueda global** en nombres y contenido, con fragmentos de contexto, y búsqueda por etiqueta con `tag:proyecto`. También búsqueda dentro de la nota (`Ctrl+F`).
- 🖼️ **Adjuntos**: arrastra o pega imágenes; se guardan en la carpeta de adjuntos configurada en `.obsidian/app.json` (la misma que usa Obsidian de escritorio). Visor de imágenes integrado.
- ⚡ **Autoguardado** con *debounce* mientras escribes (y `Ctrl+S` para forzarlo).
- 🛠️ **Gestión de archivos**: duplicar, mover, renombrar y borrar (a la papelera `.trash` del vault, nunca de forma definitiva).
- 🖨️ **Exportación a PDF** mediante la impresión del navegador.
- 📊 **Panel derecho** con el esquema de encabezados y contador de palabras, caracteres y líneas.
- 🎨 **Tema oscuro, claro o según el sistema**, tamaño de fuente ajustable y otras preferencias.
- 🔒 **Seguridad**: contraseña con `scrypt`, sesiones revocables, límite de intentos, protección CSRF, CSP estricta y aislamiento del vault (ver [Seguridad](#️-seguridad)).

---

## 📋 Requisitos

| Requisito | Detalle |
| :--- | :--- |
| **Node.js** | **20 o superior** (20.6+ si quieres usar `--env-file`). |
| **npm** | El que viene con Node. |
| **Vault** | Una carpeta accesible desde el sistema de archivos del servidor (puede ser un vault existente o una carpeta vacía; si no existe, se crea). |
| **Producción** | Un dominio y un proxy inverso con HTTPS (Caddy o nginx) — muy recomendado. |

---

## 🚀 Instalación rápida (local)

```bash
git clone <repo-url> Obsidian-Web
cd Obsidian-Web
npm install      # instala dependencias y compila el frontend (script postinstall)
npm start
```

La aplicación queda disponible en **`http://localhost:3000`**.

> ⚠️ **No uses `npm install --omit=dev` / `--production`.** El `postinstall` compila el frontend con Vite, que es una dependencia de desarrollo. Sin ella no se genera `web/dist` y el servidor no tendrá interfaz que servir.

---

## 🛠️ Primer inicio: configuración inicial

Al arrancar sin configurar, el servidor imprime en la consola un **token de configuración de un solo uso**:

```text
==================================================
  Token de configuración inicial: 3f9a1c0e7b2d4a6f8e1c9b0d
==================================================
```

Este token impide que cualquiera que llegue antes que tú a la web pueda configurarla (elegir vault y contraseña). Con `systemd` lo verás con `journalctl -u obsidian-web`; con PM2, con `pm2 logs`.

1. Abre la web en el navegador.
2. Introduce el **token de configuración** que aparece en la consola.
3. Introduce la **ruta absoluta** de tu vault (p. ej. `/srv/vaults/mi-vault`). Si no existe, se crea.
4. Define una **contraseña** (mínimo **12 caracteres**).
5. Opcionalmente, el **puerto** (por defecto `3000`). Ver la nota sobre el puerto más abajo.
6. Pulsa **Configurar** e inicia sesión.

**Rutas de vault no permitidas** (por seguridad):

- Rutas relativas o la raíz `/`.
- Carpetas del sistema y su contenido: `/bin`, `/boot`, `/dev`, `/etc`, `/lib*`, `/proc`, `/run`, `/sbin`, `/snap`, `/sys`, `/usr`, `/var`.
- Carpetas personales completas: `/root`, `/home`, `/home/<usuario>` (sí se permiten subcarpetas, como `/home/ana/Notas`).
- Cualquier ruta con un componente oculto (`~/.ssh`, `~/.config`, `/srv/.vaults/...`).
- La carpeta de la propia app, su carpeta `data/` o cualquier carpeta que las contenga.
- Fuera de `VAULTS_ROOT`, si está definida.

> 💡 **Puerto:** la configuración inicial siempre guarda un puerto en `data/config.json` (por defecto `3000`), y ese valor **tiene prioridad sobre la variable `PORT`**. Para cambiar el puerto después, edita `"port"` en `data/config.json` y reinicia. Orden de prioridad: `config.json` → `PORT` → `3000`. Un valor no válido se ignora.

---

## ⚙️ Variables de entorno

El servidor **no carga archivos `.env` automáticamente**. Defínelas en tu shell, en la unidad de systemd, en PM2 o usa la opción nativa de Node 20.6+:

```bash
cp .env.example .env
nano .env
node --env-file=.env server/index.js
```

| Variable | Por defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto de escucha. **Solo se usa si `data/config.json` no define un puerto** (y la configuración inicial siempre lo define). Útil sobre todo antes del primer setup. |
| `HOST` | *(todas las interfaces)* | Interfaz de escucha. En producción usa **`127.0.0.1`** para que solo el proxy inverso pueda conectar. Sin definir, el servidor avisa al arrancar. |
| `TRUST_PROXY` | *(desactivado)* | **Obligatorio detrás de un proxy inverso.** Indica a Express en qué proxies confiar para leer la IP, el esquema y el dominio reales. Ver [`TRUST_PROXY` en detalle](#-trust_proxy-en-detalle). |
| `VAULTS_ROOT` | *(sin límite)* | Si se define, el vault solo puede estar dentro de esta carpeta, tanto en la configuración inicial como al cambiarlo desde *Preferencias*. Ej.: `/srv/vaults`. |
| `REMOTE_IMAGES` | *(desactivado)* | Con `REMOTE_IMAGES=1` se permiten imágenes `https:` externas en las notas. Por defecto se bloquean (ver [Seguridad](#️-seguridad)). |

> ℹ️ `.env.example` incluye también `COOKIE_SECRET` y `NODE_ENV`, pero **el servidor no los usa**: el secreto de las cookies se genera automáticamente en `data/.secret`.

---

## 🔁 `TRUST_PROXY` en detalle

### Qué hace

Cuando la app está detrás de un proxy inverso (Caddy, nginx, Traefik, Cloudflare Tunnel…), **todas** las peticiones le llegan desde el proxy (normalmente `127.0.0.1`) y por HTTP plano. Los datos reales del cliente viajan en cabeceras que añade el proxy:

| Cabecera | Contiene | La app la usa para… |
| :--- | :--- | :--- |
| `X-Forwarded-For` | IP real del cliente | Límite de intentos de login y de búsquedas por IP |
| `X-Forwarded-Proto` | `https` | Marcar la cookie como `Secure`, enviar HSTS y validar el origen (CSRF) |
| `X-Forwarded-Host` / `Host` | Dominio público | Validar el origen (CSRF) |

Esas cabeceras las puede falsificar cualquiera, así que Express **las ignora salvo que `TRUST_PROXY` le diga en qué proxies confiar**.

### Qué pasa si falta detrás de un proxy

| Síntoma | Causa |
| :--- | :--- |
| ❌ **Todo lo que guarda o modifica algo devuelve `403 "Origen no permitido"`** (guardar notas, login, crear, renombrar, subir…) | El navegador envía `Origin: https://notas.ejemplo.com`, pero la app cree que la petición llegó por `http://` (y, en nginx, a `127.0.0.1:3000`). Al no coincidir esquema/dominio/puerto, la protección CSRF la rechaza. |
| 🔓 La cookie de sesión **no** se marca `Secure` y **no** se envía HSTS | La app no sabe que el cliente usa HTTPS. |
| 🚫 Un atacante puede **bloquear el login a todo el mundo** | Todos los clientes parecen la misma IP (`127.0.0.1`), así que 5 fallos de una persona bloquean a todos. Lo mismo con el límite de búsquedas (60/min compartidas). |

### Qué pasa si se activa SIN proxy

**No lo actives si la app está expuesta directamente a Internet.** Cualquiera podría enviar un `X-Forwarded-For` falso en cada intento y saltarse el límite de intentos de login por IP (solo quedaría el límite global).

### Valores admitidos

Se pasa tal cual a la opción [`trust proxy` de Express](https://expressjs.com/en/guide/behind-proxies.html):

| Valor | Significado | Cuándo usarlo |
| :--- | :--- | :--- |
| `1` | Confía en **un** salto (el proxy inmediato) | ✅ **Lo habitual**: Caddy o nginx en el mismo servidor. |
| `2`, `3`… | Confía en N saltos | Hay varios proxies encadenados (p. ej. Cloudflare → nginx → app). |
| `loopback` | Confía solo en proxies en `127.0.0.1`/`::1` | Alternativa más estricta cuando el proxy está en la misma máquina. |
| `10.0.0.5` o `10.0.0.0/8, 127.0.0.1` | Confía en esas IPs/subredes | El proxy está en otra máquina o contenedor (Docker). |

### Cabeceras que debe enviar el proxy

- **Caddy**: envía `X-Forwarded-For`, `X-Forwarded-Proto` y `X-Forwarded-Host`, y conserva `Host`. **No hay que configurar nada.**
- **nginx**: por defecto **no** las envía y además reescribe `Host`. Es imprescindible añadir:

  ```nginx
  proxy_set_header Host              $host;
  proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```

### Cómo comprobarlo

```bash
# Debe aparecer "Strict-Transport-Security" (solo se envía si la app detecta HTTPS)
curl -sI https://notas.ejemplo.com | grep -i strict-transport
```

Y en el navegador (DevTools → Application → Cookies), la cookie `token` debe tener marcadas **Secure**, **HttpOnly** y **SameSite=Strict**.

---

## 🌐 Despliegue en producción (VPS)

Arquitectura recomendada:

```text
Navegador ──HTTPS──▶ Caddy/nginx (443) ──HTTP──▶ Obsidian Web (127.0.0.1:3000) ──▶ /srv/vaults/mi-vault
```

### 1. Usuario dedicado

**No ejecutes la app como root** (el servidor avisa al arrancar si lo haces). Crea un usuario sin privilegios con acceso solo a la app y al vault:

```bash
sudo useradd --system --create-home --home-dir /opt/obsidian-web --shell /usr/sbin/nologin obsidian
sudo mkdir -p /srv/vaults/mi-vault
sudo chown -R obsidian:obsidian /srv/vaults
```

> Si sincronizas el vault con otra herramienta (Syncthing, git, rclone…), asegúrate de que el usuario `obsidian` tenga permisos de lectura y escritura sobre los archivos que esta crea (p. ej. con un grupo común).

### 2. Instalación

```bash
sudo -u obsidian -s /bin/bash
cd /opt/obsidian-web
git clone <repo-url> app
cd app
npm install
exit
```

### 3. Servicio systemd

`/etc/systemd/system/obsidian-web.service`:

```ini
[Unit]
Description=Obsidian Web
After=network.target

[Service]
Type=simple
User=obsidian
Group=obsidian
WorkingDirectory=/opt/obsidian-web/app
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=5

Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=TRUST_PROXY=1
Environment=VAULTS_ROOT=/srv/vaults
# Environment=REMOTE_IMAGES=1

# Endurecimiento opcional
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/obsidian-web/app/data /srv/vaults

[Install]
WantedBy=multi-user.target
```

> Si tu vault está en `/home/...`, quita `ProtectHome=true` o cámbialo por `ProtectHome=read-only` y añade la ruta a `ReadWritePaths`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now obsidian-web
sudo journalctl -u obsidian-web -f     # aquí verás el token de configuración inicial
```

### 4a. Proxy inverso con Caddy (recomendado)

Caddy obtiene y renueva el certificado TLS automáticamente y envía las cabeceras necesarias sin configuración extra.

`/etc/caddy/Caddyfile`:

```caddyfile
notas.ejemplo.com {
	reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

### 4b. Proxy inverso con nginx

`/etc/nginx/sites-available/obsidian-web`:

```nginx
server {
    listen 80;
    server_name notas.ejemplo.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name notas.ejemplo.com;

    ssl_certificate     /etc/letsencrypt/live/notas.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notas.ejemplo.com/privkey.pem;

    # Los adjuntos pueden ocupar hasta 50 MB (el valor por defecto de nginx, 1 MB, da error 413)
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;

        # Imprescindibles junto con TRUST_PROXY=1
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/obsidian-web /etc/nginx/sites-enabled/
sudo certbot --nginx -d notas.ejemplo.com   # si aún no tienes certificado
sudo nginx -t && sudo systemctl reload nginx
```

### Alternativa: PM2

```bash
HOST=127.0.0.1 TRUST_PROXY=1 VAULTS_ROOT=/srv/vaults pm2 start server/index.js --name obsidian-web
pm2 save
pm2 startup     # arranque automático con el sistema
pm2 logs obsidian-web
```

### ✅ Checklist de despliegue

- [ ] La app se ejecuta con un usuario sin privilegios (no root).
- [ ] `HOST=127.0.0.1` (el puerto 3000 no es accesible desde fuera; ciérralo en el firewall de todos modos).
- [ ] Proxy inverso con HTTPS delante.
- [ ] `TRUST_PROXY=1` (o el valor adecuado) definido.
- [ ] En nginx: cabeceras `Host` y `X-Forwarded-Proto` y `client_max_body_size 50m`.
- [ ] `VAULTS_ROOT` definido.
- [ ] Contraseña larga y única.
- [ ] La cookie `token` aparece como `Secure` y la respuesta incluye `Strict-Transport-Security`.
- [ ] Copias de seguridad del vault (ver más abajo).

---

## 🗄️ Archivos de datos (`data/`)

La carpeta `data/` se crea automáticamente, está en `.gitignore` y el servidor fuerza sus permisos al arrancar (`700` la carpeta, `600` los archivos).

| Archivo | Contenido |
| :--- | :--- |
| `config.json` | `vaultPath`, `passwordHash` (scrypt), `port` y `createdAt`. Se relee en cada petición: los cambios de vault se aplican al instante. |
| `.secret` | Secreto aleatorio para firmar las cookies. Si se borra, se genera otro y todas las sesiones dejan de valer. |
| `sessions.json` | Hashes SHA-256 de los tokens de sesión activos, con su caducidad y última actividad (nunca los tokens en claro). |

Dentro del vault, la app solo usa:

| Ruta | Uso |
| :--- | :--- |
| `.trash/` | Papelera. Lo borrado se mueve aquí como `nombre.ext.<timestamp>.deleted`. |
| `.obsidian/app.json` | Solo se lee/escribe la clave `attachmentFolderPath` (carpeta de adjuntos). |

---

## 🛡️ Seguridad

- **Autenticación**: contraseña única (mín. 12 caracteres) guardada con `scrypt` y sal aleatoria; comparación en tiempo constante.
- **Configuración inicial protegida** por un token de un solo uso que solo aparece en la consola del servidor.
- **Sesiones revocables**: la cookie (firmada, `HttpOnly`, `SameSite=Strict`, `Secure` sobre HTTPS) lleva un token aleatorio; en el servidor solo se guarda su hash. Caducan a los **30 días** o tras **7 días sin uso**. Desde *Preferencias → Seguridad* puedes cambiar la contraseña (cierra las demás sesiones) o cerrar todas las sesiones.
- **Límite de intentos** (login, cambio de vault y cambio de contraseña): 5 fallos en 15 min bloquean la IP 1 min, duplicándose con cada bloqueo seguido hasta 1 h. Las IPv6 se agrupan por su prefijo /64. Además, 50 fallos en total en 15 min bloquean el login para todos durante 5 min.
- **Cambiar el vault exige la contraseña** actual, además de la sesión.
- **Protección CSRF**: las peticiones que modifican algo se rechazan si vienen de otro sitio (`Sec-Fetch-Site: cross-site`) o si su `Origin` no coincide exactamente (esquema, dominio y puerto) con el de la web. Por eso [`TRUST_PROXY`](#-trust_proxy-en-detalle) es obligatorio detrás de un proxy.
- **Cabeceras de seguridad**: CSP estricta (sin scripts externos ni `eval`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy` y HSTS cuando llega por HTTPS.
- **Imágenes externas bloqueadas**: una imagen de otra web en una nota revela tu IP a ese servidor al abrirla (píxeles de rastreo). Por defecto solo se cargan imágenes del vault; las externas aparecen como imagen rota, sin aviso. Arranca con `REMOTE_IMAGES=1` para permitirlas.
- **Aislamiento del vault**: no se admiten rutas con `../` ni que salgan del vault.
- **Enlaces simbólicos**: la app **no sigue symlinks dentro del vault** (para evitar exponer `/etc` u otros archivos del sistema). No aparecen en el explorador ni en la búsqueda, y acceder a ellos se rechaza como un `../`. Si necesitas carpetas externas, cópialas o muévelas al vault. *La raíz del vault sí puede ser un symlink* (p. ej. `/srv/vaults/notas → /mnt/disco/notas`).
- **`.obsidian/` protegida**: no se puede leer ni modificar desde la web (plugins, sus datos y ajustes de escritorio). Así nadie puede colar un plugin que se ejecute en tu ordenador al sincronizar.
- **SVG seguros**: los archivos del vault se sirven con una CSP *sandbox*, así que un SVG no puede ejecutar scripts.
- **Errores sin filtraciones**: las respuestas de error no incluyen rutas del servidor ni trazas.
- **Avisos al arrancar** si se ejecuta como root o escucha en todas las interfaces por HTTP.

> 🔐 **Sin HTTPS, la contraseña y la cookie viajan sin cifrar.** Úsalo siempre fuera de `localhost`.

---

## 📏 Límites

| Límite | Valor |
| :--- | :--- |
| Tamaño de una petición JSON (guardar nota, etc.) | 20 MB |
| Tamaño de un adjunto subido | 50 MB |
| Longitud mínima de la contraseña | 12 caracteres |
| Búsquedas | 60 por minuto y por IP (después, `429`) |
| Longitud de una búsqueda | 200 caracteres |
| Notas leídas por la búsqueda | Se omiten las de más de 2 MB; máximo 200 MB leídos por búsqueda |
| Resultados de búsqueda | 200 archivos, 5 coincidencias por archivo |
| Sesiones | 30 días máximo, 7 días de inactividad |

---

## 📝 Uso

### Explorador y pestañas

- **Clic** en una nota: la abre en la pestaña activa.
- **`Ctrl`/`Cmd` + clic**, **botón central** o **clic derecho → Abrir en pestaña nueva**: la abre en otra pestaña.
- **Clic derecho** sobre archivos y carpetas: nueva nota, nueva carpeta, duplicar, mover, renombrar, borrar.
- Borrar mueve a `.trash/` dentro del vault; para recuperar algo, renómbralo desde el servidor quitando el sufijo `.<timestamp>.deleted`.

### Wikilinks

| Sintaxis | Resultado |
| :--- | :--- |
| `[[Nota]]` | Enlace a `Nota.md` |
| `[[Nota\|Texto]]` | Enlace con texto alternativo |
| `[[Nota#Encabezado]]` | Enlace a una sección |

Un enlace a una nota inexistente se muestra atenuado; al pulsarlo se crea la nota. En el editor, `Ctrl`/`Cmd` + clic o botón central lo abre en otra pestaña.

### Búsqueda

- **Texto libre**: busca (sin distinguir mayúsculas) en nombres de archivo y contenido de las notas. Primero aparecen las coincidencias por nombre, luego por número de apariciones.
- **`tag:proyecto`** o **`tag:#proyecto`**: notas con esa etiqueta, en el frontmatter (`tags:`) o en línea (`#proyecto`).

### Adjuntos

Arrastra o pega una imagen en el editor. Se guarda en la carpeta configurada en *Preferencias → Archivos* (que se guarda en `.obsidian/app.json` como `attachmentFolderPath`, compatible con Obsidian de escritorio) y se inserta el enlace en la nota.

### Exportar a PDF

Desde el menú de la nota: abre una versión limpia de la nota (sin frontmatter) y lanza el diálogo de impresión del navegador → *Guardar como PDF*.

---

## ⌨️ Atajos de teclado

En Mac, usa `Cmd` en lugar de `Ctrl`.

| Atajo | Acción |
| :--- | :--- |
| `Ctrl+P` | Abrir nota (buscador rápido) |
| `Ctrl+S` | Guardar la nota ahora |
| `Ctrl+E` | Alternar edición / lectura |
| `Ctrl+B` | Mostrar u ocultar la barra lateral |
| `Ctrl+Shift+F` | Búsqueda global |
| `Ctrl+F` | Buscar en la nota (`Enter`/`F3` siguiente, `Shift+Enter`/`Shift+F3` anterior) |
| `Ctrl` + rueda / pellizcar | Cambiar el tamaño de fuente (si está activado en *Apariencia*) |
| `Esc` | Cerrar menús, diálogos y búsqueda |
| `↑` `↓` `Enter` | Navegar y abrir en el buscador rápido |
| `Enter` / `,` / `Retroceso` | Añadir valor / añadir a lista / borrar último valor en *Propiedades* |

---

## 🎛️ Preferencias

Se abren desde el icono de engranaje. **Las preferencias de interfaz se guardan en el navegador** (`localStorage`), así que son por dispositivo; las de *Archivos* y *Seguridad* se guardan en el servidor.

| Sección | Opciones | Dónde se guarda |
| :--- | :--- | :--- |
| **Apariencia** | Tema (oscuro / claro / sistema), tamaño de fuente, ajuste rápido con `Ctrl`+rueda, barra de título de pestaña, cinta lateral | Navegador |
| **Editor** | Modo por defecto (visor / edición), modo de edición (vista previa / fuente), título en línea, longitud de línea legible, números de línea | Navegador |
| **Archivos** | Carpeta de adjuntos (servidor), ruta del vault (servidor, exige contraseña), carpetas a ocultar en el explorador — un patrón por línea, `*` como comodín (navegador) | Servidor / navegador |
| **Seguridad** | Cambiar contraseña, cerrar todas las sesiones | Servidor |
| **Atajos** | Lista de atajos | — |

---

## 🔄 Actualizar, copias de seguridad y recuperación

### Actualizar

```bash
cd /opt/obsidian-web/app
sudo -u obsidian git pull
sudo -u obsidian npm install      # recompila el frontend
sudo systemctl restart obsidian-web
```

Tras actualizar, recarga la web con `Ctrl+F5`.

### Copias de seguridad

- **El vault** es lo importante: son archivos Markdown normales; cópialos con tu herramienta habitual (rsync, restic, git, Syncthing…).
- `data/` solo contiene la configuración y las sesiones; si se pierde, basta con repetir la configuración inicial.

### He olvidado la contraseña

```bash
sudo systemctl stop obsidian-web
sudo -u obsidian rm /opt/obsidian-web/app/data/config.json
sudo systemctl start obsidian-web
sudo journalctl -u obsidian-web -n 20   # copia el nuevo token de configuración
```

Vuelve a hacer la configuración inicial apuntando al mismo vault: tus notas no se tocan y todas las sesiones anteriores se invalidan.

### Cerrar todas las sesiones sin entrar en la web

Borra `data/sessions.json` (o `data/.secret`) y reinicia el servicio.

---

## 💻 Desarrollo

```bash
npm install
npm run dev
```

Esto levanta a la vez:

1. **Vite** en `http://localhost:5173`: frontend con *hot-reload*.
2. **Express** con `--watch` en `http://localhost:3000`: la API, que se reinicia al cambiar `server/`.

> ⚠️ **En desarrollo abre siempre `http://localhost:5173`**, no el 3000. Vite redirige `/api` al backend, evitando problemas de CORS y cookies.

### Scripts

| Script | Descripción |
| :--- | :--- |
| `npm start` | Arranca el servidor (sirve la API y `web/dist`) |
| `npm run dev` | Frontend (Vite) + backend con recarga |
| `npm run web:build` | Compila el frontend en `web/dist` (se ejecuta solo en `npm install`) |
| `npm run web:dev` | Solo el frontend (Vite) |
| `npm run server:dev` | Solo la API, con recarga automática |

### Tech stack

- **Backend:** Node.js (ESM), Express 4, `cookie-parser`, `markdown-it` (exportación a PDF), `crypto.scrypt`.
- **Frontend:** React 18, Vite 6, TypeScript, Zustand.
- **Editor:** CodeMirror 6 + Lezer Markdown, con extensiones propias de vista previa en vivo, tablas y wikilinks.
- **Estilos:** CSS propio inspirado en Obsidian (`web/src/styles/obsidian.css`).

---

## 🗂️ Estructura del proyecto

```text
Obsidian-Web/
├── server/                  # Backend Node.js + Express
│   ├── index.js             # Punto de entrada: middleware, autenticación, arranque
│   ├── security.js          # Cabeceras de seguridad (CSP, HSTS), protección CSRF, errores públicos
│   ├── sessions.js          # Sesiones revocables y límite de intentos de login
│   ├── password.js          # Hash y verificación de contraseñas (scrypt)
│   ├── vault.js             # Acceso al sistema de archivos y validación de rutas
│   └── routes/
│       ├── setup.js         # Configuración inicial
│       ├── auth.js          # Login / logout
│       ├── files.js         # Árbol, lectura, escritura, subida, PDF…
│       ├── search.js        # Búsqueda de texto y etiquetas
│       └── settings.js      # Vault, contraseña, sesiones, adjuntos
├── web/                     # Frontend React + Vite + TypeScript
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── components/      # Editor, explorador, pestañas, preferencias…
│       ├── store.ts         # Estado global (Zustand)
│       ├── api.ts           # Cliente de la API
│       ├── livePreview.ts   # Vista previa en vivo (CodeMirror)
│       ├── liveTables.ts    # Tablas en vivo
│       ├── wikilinks.ts     # Resolución de wikilinks
│       └── styles/obsidian.css
├── utils/                   # Documentación técnica y diagnóstico
│   ├── ARQUITECTURA.md
│   ├── TROUBLESHOOTING.md
│   └── diagnose.sh
├── data/                    # Configuración y secretos (autogenerado, en .gitignore)
└── .env.example             # Plantilla de variables de entorno
```

Para el flujo de datos en profundidad, consulta [ARQUITECTURA.md](utils/ARQUITECTURA.md).

---

## 🔌 API

Todas las rutas cuelgan de `/api`. Salvo `setup` y `auth`, exigen una sesión válida (`401` si no). Las peticiones que no son `GET` pasan la [protección CSRF](#️-seguridad). `:filePath` es la ruta relativa al vault, codificada como un solo segmento de URL.

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/setup/status` | `{ configured }` |
| `POST` | `/api/setup/init` | Configuración inicial (`setupToken`, `vaultPath`, `password`, `port`) |
| `POST` | `/api/auth/login` | Inicia sesión (`password`) |
| `POST` | `/api/auth/logout` | Cierra la sesión actual |
| `GET` | `/api/files/tree` | Árbol del vault |
| `GET` | `/api/files/read/:filePath` | Contenido de una nota |
| `GET` | `/api/files/raw/:filePath` | Archivo binario (imágenes) |
| `GET` | `/api/files/export-pdf/:filePath` | Versión imprimible de la nota |
| `POST` | `/api/files/write/:filePath` | Guarda una nota (`content`) |
| `POST` | `/api/files/upload?note=…&name=…` | Sube un adjunto (cuerpo binario) |
| `DELETE` | `/api/files/:filePath` | Mueve a `.trash/` |
| `POST` | `/api/files/rename` | Renombra o mueve (`oldPath`, `newPath`) |
| `POST` | `/api/files/copy` | Duplica (`path`) |
| `POST` | `/api/files/create-note` | Crea una nota (`path`) |
| `POST` | `/api/files/create-folder` | Crea una carpeta (`path`) |
| `GET` | `/api/search?q=…` | Búsqueda de texto o `tag:` |
| `GET` / `POST` | `/api/settings/vault` | Lee / cambia la ruta del vault (`vaultPath`, `password`) |
| `POST` | `/api/settings/password` | Cambia la contraseña (`currentPassword`, `newPassword`) |
| `POST` | `/api/settings/sessions/revoke` | Cierra todas las sesiones |
| `GET` / `POST` | `/api/settings/attachments` | Lee / cambia `attachmentFolderPath` |

---

## 🛠️ Solución de problemas

| Problema | Causa probable y solución |
| :--- | :--- |
| **`403 "Origen no permitido"`** al guardar, iniciar sesión, etc. | Estás detrás de un proxy sin `TRUST_PROXY=1`, o nginx no envía `Host`/`X-Forwarded-Proto`. Ver [`TRUST_PROXY`](#-trust_proxy-en-detalle). También ocurre si accedes por un dominio/puerto distinto del que reenvía el proxy. |
| **`403` en la configuración inicial** | Token incorrecto. Cópialo de la consola del servidor (`journalctl -u obsidian-web`). |
| **No encuentro el token de configuración** | Solo se muestra si no existe `data/config.json`. Reinicia el servicio y mira los primeros mensajes del log. |
| **`429 Demasiados intentos`** | Límite de intentos de login. Espera el tiempo indicado. Si te ocurre sin haber fallado, puede que estés detrás de un proxy sin `TRUST_PROXY` y otra IP esté fallando. |
| **`413` al subir una imagen** | nginx limita el cuerpo a 1 MB por defecto: añade `client_max_body_size 50m;`. |
| **Las imágenes externas salen rotas** | Bloqueadas a propósito. Arranca con `REMOTE_IMAGES=1`. |
| **El puerto no cambia con `PORT`** | `data/config.json` define `"port"` y tiene prioridad. Edítalo y reinicia. |
| **"Esa carpeta no se puede usar como vault"** | Ruta del sistema, carpeta personal completa, carpeta oculta o carpeta de la app. Usa una subcarpeta normal (p. ej. `/srv/vaults/notas`). |
| **"El vault debe estar dentro de …"** | `VAULTS_ROOT` está definido y la ruta queda fuera. |
| **Una carpeta del vault no aparece** | Es un enlace simbólico (no se siguen), su nombre empieza por `.` (nunca se muestran: `.obsidian/`, `.trash/`, `.git/`…) o coincide con un patrón de *Preferencias → Archivos → carpetas ocultas*. |
| **`Permiso denegado`** | El usuario que ejecuta la app no puede leer/escribir el vault. Revisa propietario y permisos (`chown`/`chmod`). |
| **Pantalla en blanco o "Cannot GET /"** | No existe `web/dist`. Ejecuta `npm run web:build` (y no instales con `--omit=dev`). |
| **La sesión se cierra sola** | Caducidad de 7 días sin uso o 30 días en total, o se cambió la contraseña / se cerraron todas las sesiones. |
| **Las preferencias no se mantienen entre dispositivos** | Son por navegador (`localStorage`). |

Para más casos consulta [TROUBLESHOOTING.md](utils/TROUBLESHOOTING.md) o ejecuta el script de diagnóstico desde la raíz del proyecto:

```bash
chmod +x utils/diagnose.sh
./utils/diagnose.sh
```

---

## 🗺️ Hoja de ruta

- [ ] Sincronización en la nube (Dropbox / GitHub)

---

## 📄 Licencia

Distribuido bajo la licencia [MIT](https://opensource.org/licenses/MIT).
