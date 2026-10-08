// Diagramas Mermaid de la vista de lectura (bloques ```mermaid).
// Mermaid pesa bastante, así que se descarga solo la primera vez que una nota
// tiene un diagrama. Los SVG generados se guardan en caché para no volver a
// dibujarlos (ni parpadear) cada vez que la vista se repinta.

type Mermaid = typeof import('mermaid').default;

let mermaidPromise: Promise<Mermaid> | null = null;

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

export type DiagramTheme = 'dark' | 'light';

// Tema resuelto (applyTheme en store.ts lo deja en <html data-theme>)
export const currentDiagramTheme = (): DiagramTheme =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const MAX_CACHE = 100;
const svgCache = new Map<string, string>();
const cacheKey = (source: string, theme: DiagramTheme) => `${theme}\n${source}`;

export const cachedDiagram = (source: string, theme: DiagramTheme) => svgCache.get(cacheKey(source, theme));

function remember(key: string, svg: string) {
  svgCache.delete(key);
  svgCache.set(key, svg);
  if (svgCache.size > MAX_CACHE) svgCache.delete(svgCache.keys().next().value!);
}

let initializedTheme: DiagramTheme | null = null;
let nextId = 0;

const PENDING = '.mermaid-diagram:not(.is-rendered):not(.is-error)';

export function renderMermaidDiagrams(root: HTMLElement, errorLabel: string) {
  const blocks = root.querySelectorAll<HTMLElement>(PENDING);
  if (!blocks.length) return;
  loadMermaid()
    .then(async (mermaid) => {
      const theme = currentDiagramTheme();
      if (initializedTheme !== theme) {
        mermaid.initialize({
          startOnLoad: false,
          // 'strict' sanea las etiquetas y desactiva los clics que ejecutan JavaScript
          securityLevel: 'strict',
          theme: theme === 'light' ? 'default' : 'dark',
          // Mermaid mide el texto con esta fuente: tiene que ser la real, no 'inherit'
          fontFamily: getComputedStyle(document.body).fontFamily,
        });
        initializedTheme = theme;
      }
      for (const block of blocks) {
        // El nodo puede haberse sustituido si la nota cambió mientras se cargaba
        if (!block.isConnected || block.classList.contains('is-rendered')) continue;
        const source = block.dataset.source ?? '';
        const key = cacheKey(source, theme);
        try {
          let svg = svgCache.get(key);
          if (!svg) {
            // parse lanza con un mensaje legible y no deja restos en el DOM si falla
            await mermaid.parse(source);
            ({ svg } = await mermaid.render(`mermaid-${++nextId}`, source));
            remember(key, svg);
          }
          if (!block.isConnected) continue;
          block.innerHTML = svg;
          block.classList.add('is-rendered');
        } catch (err) {
          if (!block.isConnected) continue;
          const message = document.createElement('div');
          message.className = 'mermaid-error-message';
          message.textContent = `${errorLabel}: ${err instanceof Error ? err.message : String(err)}`;
          block.prepend(message);
          block.classList.add('is-error');
        }
      }
    })
    .catch(() => {
      // Si falla la descarga, se queda el código fuente del diagrama
      mermaidPromise = null;
    });
}
