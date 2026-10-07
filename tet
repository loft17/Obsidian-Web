Este es una propuesta para reorganizar y embellecer el README de Obsidian Web.
He mejorado la jerarquía visual, añadido bloques de consejos/advertencias
(utilizando la sintaxis de GitHub), organizado las características por
categorías y optimizado las tablas para que sean más legibles.

💎 Obsidian Web

Visor y editor web ultraligero para tu vault de Obsidian. Accede y edita tus
notas Markdown desde cualquier navegador con una interfaz fiel a la experiencia
original.

Node.js Version TypeScript License: MIT GitHub stars

Características • Instalación • Despliegue • Seguridad • Atajos

✨ Características

📝 Edición y Visualización

  - Live Preview: Editor CodeMirror 6 con vista previa en vivo (tablas, listas,
    etc.) o modo fuente.
  - Wikilinks: Soporte completo para [[nota]], [[nota|alias]] y
    [[nota#encabezado]].
  - Propiedades: Editor de frontmatter YAML integrado para tags, aliases y más.
  - Media: Visor de imágenes integrado. Soporte para arrastrar/pegar imágenes
    directamente.

📂 Gestión de Archivos

  - Explorador: Carpetas colapsables, menús contextuales y creación rápida.
  - Pestañas: Sistema multitarea (Clic central o Ctrl+Clic para abrir en segundo
    plano).
  - Seguridad de datos: Borrado seguro hacia la papelera .trash/ del vault.
  - Búsqueda Global: Motor de búsqueda rápida por contenido, nombre o etiquetas
    (tag:proyecto).

⚙️ Avanzado

  - Sincronización: Integración nativa con GitHub (automática o manual).
  - Personalización: Temas (Claro/Oscuro), tamaño de fuente y comportamiento del
    editor.
  - Exportación: Función nativa para exportar notas a PDF perfectamente
    formateadas.

📋 Requisitos

| Componente    | Requisito mínimo                                     |
| :------------ | :--------------------------------------------------- |
| **Node.js**   | v20.0.0 o superior (Recomendado 20.6+)               |
| **Memoria**   | \~100MB RAM (Muy ligero)                             |
| **Navegador** | Chrome, Firefox, Safari o Edge (Versiones recientes) |
| **Vault**     | Carpeta local accesible por el sistema de archivos   |

🚀 Instalación Rápida

1. Clonar y preparar

git clone https://github.com/loft17/Obsidian-Web.git
cd Obsidian-Web
npm install      # Instala dependencias y compila el frontend
npm start        # Inicia el servidor en http://localhost:3000

[!CAUTION] No uses --production: El proceso requiere las dependencias de
desarrollo para compilar la interfaz de usuario con Vite.

2. Configuración inicial

Al arrancar por primera vez, verás un mensaje en la consola:

==================================================
  Token de configuración inicial: 3f9a1c0e7b2d4a6f8e1c9b0d
==================================================

1.  Entra en la URL del servidor.
2.  Pega el token.
3.  Configura la ruta de tu vault y tu contraseña (mín. 12 caracteres).

⚙️ Variables de Entorno

Puedes configurar el comportamiento mediante un archivo .env o variables del
sistema:

| Variable        | Valor por defecto | Descripción                                        |
| :-------------- | :---------------- | :------------------------------------------------- |
| `PORT`          | `3000`            | Puerto (solo si no está en `config.json`).         |
| `HOST`          | `0.0.0.0`         | Interfaz de escucha. Usa `127.0.0.1` con proxy.    |
| `TRUST_PROXY`   | `false`           | **Obligatorio** (set a `1`) tras Nginx/Caddy.      |
| `VAULTS_ROOT`   | `null`            | Limita la selección de vaults a esta carpeta raíz. |
| `REMOTE_IMAGES` | `0`               | Permite cargar imágenes `https://` externas.       |

🌐 Despliegue en Producción

Arquitectura Recomendada

Usuario ➔ HTTPS (443) ➔ Proxy (Caddy/Nginx) ➔ Obsidian Web (127.0.0.1:3000)

1. Usuario del Sistema

Evita ejecutar como root por seguridad:

sudo useradd --system --create-home obsidian
sudo chown -R obsidian:obsidian /opt/obsidian-web

2. Servicio Systemd

Crea /etc/systemd/system/obsidian-web.service:

[Service]
ExecStart=/usr/bin/node server/index.js
Environment=HOST=127.0.0.1
Environment=TRUST_PROXY=1
Environment=VAULTS_ROOT=/srv/vaults
User=obsidian
Restart=on-failure

3. Proxy Inverso (Caddy)

La opción más sencilla para HTTPS automático:

notas.tudominio.com {
    reverse_proxy 127.0.0.1:3000
}

🛡️ Seguridad y Aislamiento

Obsidian Web está diseñado pensando en la privacidad de tus notas:

  - Autenticación: Hasheo scrypt de alto coste.
  - Sesiones: Tokens revocables con expiración (30 días total, 7 inactividad).
  - Antifuerza Bruta: Bloqueo progresivo de IPs tras fallos repetidos.
  - CSP Estricta: Bloqueo de scripts externos y protección contra XSS y CSRF.
  - Sandbox de Archivos: No se siguen enlaces simbólicos fuera del vault y se
    bloquea el acceso a carpetas sensibles como .git o .obsidian.

[!WARNING] Imágenes externas: Por defecto están bloqueadas para evitar píxeles
de rastreo. Activa REMOTE_IMAGES=1 si confías plenamente en el contenido de tus
notas.

⌨️ Atajos de Teclado

| Atajo                                             | Acción                        |
| :------------------------------------------------ | :---------------------------- |
| <kbd>Ctrl</kbd> + <kbd>P</kbd>                    | Buscador rápido de archivos   |
| <kbd>Ctrl</kbd> + <kbd>S</kbd>                    | Forzar guardado de nota       |
| <kbd>Ctrl</kbd> + <kbd>E</kbd>                    | Alternar Edición / Lectura    |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Búsqueda global de contenido  |
| <kbd>Ctrl</kbd> + <kbd>B</kbd>                    | Mostrar/Ocultar barra lateral |

🔄 Sincronización con GitHub

Configura la sincronización en Preferencias > Sincronización:

1.  Genera un Personal Access Token (fine-grained) en GitHub con permisos de
    lectura/escritura en el repositorio.
2.  Define el intervalo (desde manual hasta cada 5 min).
3.  El servidor gestionará commits, pulls (rebase) y pushes automáticamente.

[!TIP] Si ocurre un conflicto de edición, el servidor prioriza la versión local
para evitar pérdida de datos, deteniendo el push para revisión manual si es
necesario.

🛠️ Solución de Problemas Comunes

  - Error 403 "Origen no permitido": Asegúrate de tener TRUST_PROXY=1 si usas un
    proxy inverso.
  - Error 413 "Payload Too Large": Aumenta el límite en tu proxy (ej.
    client_max_body_size 50m; en Nginx).
  - Pantalla en blanco: Verifica que la carpeta web/dist existe. Si no, ejecuta
    npm run web:build.
  - Olvido de contraseña: Borra data/config.json y reinicia el servicio para
    generar un nuevo token de setup.

💻 Desarrollo

Si quieres contribuir o modificar el proyecto:

npm run dev

  - Frontend: Vite en el puerto 5173 (con Hot Reload).
  - Backend: Express en el puerto 3000 (con monitoreo de cambios).

Hecho con ❤️ para la comunidad de Obsidian. Reportar un error • Sugerir
característica
