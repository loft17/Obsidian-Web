import { useMemo, type MouseEvent } from 'react';
import markdownIt from 'markdown-it';
import { parseNote } from '../frontmatter';
import Properties from './Properties';
import { useStore } from '../store';
import { attachmentUrl, isImage, parseSize } from '../attachments';

const md = markdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

// Resaltado al estilo Obsidian: ==texto== → <mark>
md.inline.ruler.before('emphasis', 'mark', (state, silent) => {
  const start = state.pos;
  if (state.src.slice(start, start + 2) !== '==') return false;
  const end = state.src.indexOf('==', start + 2);
  if (end < 0 || end === start + 2 || end + 2 > state.posMax) return false;
  if (!silent) {
    state.push('mark_open', 'mark', 1);
    const max = state.posMax;
    state.pos = start + 2;
    state.posMax = end;
    state.md.inline.tokenize(state);
    state.posMax = max;
    state.push('mark_close', 'mark', -1);
  }
  state.pos = end + 2;
  return true;
});

// Etiquetas en línea al estilo Obsidian: #etiqueta (no solo números; admite anidadas con /)
const INLINE_TAG = /^#([\p{L}\p{N}_\-/]*[\p{L}_\-/][\p{L}\p{N}_\-/]*)/u;

md.inline.ruler.before('emphasis', 'tag', (state, silent) => {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x23 /* # */) return false;
  if (start > 0 && !/\s/.test(state.src[start - 1])) return false;
  const m = INLINE_TAG.exec(state.src.slice(start, state.posMax));
  if (!m) return false;
  if (!silent) {
    const open = state.push('tag_open', 'a', 1);
    open.attrSet('href', '#');
    open.attrSet('class', 'tag');
    open.attrSet('data-tag', m[1]);
    state.push('text', '', 0).content = m[0];
    state.push('tag_close', 'a', -1);
  }
  state.pos = start + m[0].length;
  return true;
});

// Incrustaciones al estilo Obsidian: ![[imagen.png]] o ![[imagen.png|300]]
md.inline.ruler.before('image', 'embed', (state, silent) => {
  const start = state.pos;
  if (state.src.slice(start, start + 3) !== '![[') return false;
  const end = state.src.indexOf(']]', start + 3);
  if (end < 0 || end + 2 > state.posMax) return false;
  const inner = state.src.slice(start + 3, end);
  if (!inner || inner.includes('\n')) return false;
  if (!silent) {
    const [target] = inner.split('|');
    if (isImage(target.split('#')[0].trim())) {
      const token = state.push('image', 'img', 0);
      token.attrs = [['src', target.trim()]];
      token.content = inner.includes('|') ? inner : target.trim().split('/').pop()!;
      token.children = [];
    } else {
      // Notas incrustadas: de momento, un enlace interno
      const open = state.push('wikilink_open', 'a', 1);
      open.attrSet('href', '#');
      open.attrSet('class', 'wikilink');
      state.push('text', '', 0).content = inner;
      state.push('wikilink_close', 'a', -1);
    }
  }
  state.pos = end + 2;
  return true;
});

// Imágenes: rutas del vault resueltas desde la nota y tamaño "alt|300"
md.renderer.rules.image = (tokens, idx, _options, env: { notePath?: string }) => {
  const token = tokens[idx];
  const { text, width, height } = parseSize(token.content);
  const src = attachmentUrl(token.attrGet('src') ?? '', env.notePath ?? '');
  const title = token.attrGet('title');
  return (
    `<img src="${md.utils.escapeHtml(src)}" alt="${md.utils.escapeHtml(text)}"` +
    (title ? ` title="${md.utils.escapeHtml(title)}"` : '') +
    (width ? ` width="${width}"` : '') +
    (height ? ` height="${height}"` : '') +
    ' loading="lazy">'
  );
};

// Callouts al estilo Obsidian: > [!tipo] Título
const svg = (body: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const CALLOUT_ICONS: Record<string, string> = {
  note: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  abstract: svg('<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
  todo: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  tip: svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  success: svg('<polyline points="20 6 9 17 4 12"/>'),
  question: svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
  warning: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  failure: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  danger: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  bug: svg('<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>'),
  example: svg('<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>'),
  quote: svg('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>'),
};

const CALLOUT_ALIASES: Record<string, string> = {
  summary: 'abstract', tldr: 'abstract',
  hint: 'tip', important: 'tip',
  check: 'success', done: 'success',
  help: 'question', faq: 'question',
  caution: 'warning', attention: 'warning',
  fail: 'failure', missing: 'failure',
  error: 'danger',
  cite: 'quote',
};

md.core.ruler.before('inline', 'callout', (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'blockquote_open') continue;
    const inline = tokens[i + 2];
    if (tokens[i + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
    const m = /^\[!([\w-]+)\]([+-]?)[ \t]*(.*)/.exec(inline.content);
    if (!m) continue;

    const raw = m[1].toLowerCase();
    const type = CALLOUT_ALIASES[raw] ?? raw;
    const title = m[3].trim() || raw.charAt(0).toUpperCase() + raw.slice(1);
    tokens[i].meta = { callout: { type, title } };

    // Cierre correspondiente (respetando blockquotes anidados)
    let depth = 0;
    for (let j = i; j < tokens.length; j++) {
      if (tokens[j].type === 'blockquote_open') depth++;
      else if (tokens[j].type === 'blockquote_close' && --depth === 0) {
        tokens[j].meta = { callout: true };
        break;
      }
    }

    // Quitar la línea del título del primer párrafo
    const nl = inline.content.indexOf('\n');
    if (nl < 0) tokens.splice(i + 1, 3);
    else inline.content = inline.content.slice(nl + 1);
  }
});

md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
  const callout = tokens[idx].meta?.callout;
  if (!callout) return self.renderToken(tokens, idx, options);
  const icon = CALLOUT_ICONS[callout.type] ?? CALLOUT_ICONS.note;
  return (
    `<div class="callout" data-callout="${md.utils.escapeHtml(callout.type)}">` +
    `<div class="callout-title"><span class="callout-icon">${icon}</span>` +
    `<span class="callout-title-inner">${md.renderInline(callout.title, env)}</span></div>` +
    '<div class="callout-content">'
  );
};

md.renderer.rules.blockquote_close = (tokens, idx, options, _env, self) =>
  tokens[idx].meta?.callout ? '</div></div>\n' : self.renderToken(tokens, idx, options);

const COPY_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// Code blocks: language label + copy button
const defaultFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const lang = tokens[idx].info.trim().split(/\s+/)[0];
  const label = lang ? `<span class="code-block-lang">${md.utils.escapeHtml(lang)}</span>` : '<span></span>';
  return (
    '<div class="code-block">' +
    `<div class="code-block-header">${label}` +
    `<button type="button" class="code-block-copy" title="Copiar" aria-label="Copiar">${COPY_ICON}</button>` +
    '</div>' +
    defaultFence(tokens, idx, options, env, self) +
    '</div>'
  );
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts (http)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function handleContentClick(e: MouseEvent<HTMLDivElement>) {
  const tag = (e.target as HTMLElement).closest<HTMLElement>('a.tag');
  if (tag) {
    e.preventDefault();
    useStore.getState().searchTag(tag.dataset.tag ?? '');
    return;
  }
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.code-block-copy');
  if (!btn) return;
  const code = btn.closest('.code-block')?.querySelector('pre code');
  if (!code) return;
  copyText(code.textContent ?? '').then(() => {
    btn.innerHTML = CHECK_ICON;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = COPY_ICON;
      btn.classList.remove('copied');
    }, 1500);
  });
}

interface Props {
  content: string;
  filePath?: string;
}

export default function ReadingView({ content, filePath }: Props) {
  const { data: frontmatter, body: markdownContent } = useMemo(() => parseNote(content), [content]);
  const searchTag = useStore((s) => s.searchTag);
  // Las rutas de las imágenes se resuelven contra el árbol del vault
  const tree = useStore((s) => s.tree);

  const html = useMemo(() => {
    let text = markdownContent;
    // Process wikilinks: [[note]]
    // (las incrustaciones ![[...]] las procesa la regla "embed")
    text = text.replace(/(?<!!)\[\[([^\]]+)\]\]/g, '<a href="#" class="wikilink">$1</a>');
    return md.render(text, { notePath: filePath ?? '' });
  }, [markdownContent, filePath, tree]);

  const fileName = (filePath?.split('/').pop() || 'Untitled').replace(/\.md$/i, '');
  const title = (frontmatter.title as string) || fileName;

  return (
    <div className="reading-view">
      <div className="reading-view-inner">
        <h1 className="reading-view-title">{title}</h1>

        <Properties data={frontmatter} onTagClick={searchTag} />

        <div
          className="reading-view-content"
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
