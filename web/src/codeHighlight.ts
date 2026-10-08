// Resaltado de sintaxis de los bloques de código de la vista de lectura.
// highlight.js se descarga solo la primera vez que una nota tiene un bloque
// con lenguaje; las notas sin código no pagan nada.

type Hljs = typeof import('highlight.js').default;

let hljsPromise: Promise<Hljs> | null = null;

function loadHljs() {
  // "common" trae ~35 lenguajes habituales (js, ts, python, bash, json, css, sql…)
  hljsPromise ??= import('highlight.js/lib/common').then((m) => m.default);
  return hljsPromise;
}

const PENDING = 'pre > code[class*="language-"]:not(.hljs)';

export function highlightCodeBlocks(root: HTMLElement) {
  const blocks = root.querySelectorAll<HTMLElement>(PENDING);
  if (!blocks.length) return;
  loadHljs()
    .then((hljs) => {
      for (const code of blocks) {
        // El nodo puede haberse sustituido si la nota cambió mientras se cargaba
        if (!code.isConnected || code.classList.contains('hljs')) continue;
        const lang = /language-(\S+)/.exec(code.className)?.[1];
        if (!lang || !hljs.getLanguage(lang)) continue;
        hljs.highlightElement(code);
      }
    })
    .catch(() => {
      // Sin resaltado si falla la descarga; el bloque sigue legible
      hljsPromise = null;
    });
}
