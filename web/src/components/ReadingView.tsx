import { useMemo, type MouseEvent } from 'react';
import markdownIt from 'markdown-it';
import matter from 'gray-matter';
import { IconTag, IconCalendar, IconText } from './Icons';

const md = markdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

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

function formatValue(value: unknown): string {
  if (value instanceof Date) {
    const d = value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  }
  return String(value);
}

export default function ReadingView({ content, filePath }: Props) {
  const { data: frontmatter, content: markdownContent } = useMemo(() => {
    try {
      return matter(content);
    } catch {
      return { data: {} as Record<string, unknown>, content };
    }
  }, [content]);

  const html = useMemo(() => {
    let text = markdownContent;
    // Process wikilinks: [[note]]
    text = text.replace(/\[\[([^\]]+)\]\]/g, '<a href="#" class="wikilink">$1</a>');
    return md.render(text);
  }, [markdownContent]);

  const entries = Object.entries(frontmatter);
  const fileName = (filePath?.split('/').pop() || 'Untitled').replace(/\.md$/i, '');
  const title = (frontmatter.title as string) || fileName;

  const iconFor = (key: string) => {
    if (key === 'tags') return <IconTag size={16} />;
    if (key === 'date' || key === 'fecha') return <IconCalendar size={16} />;
    return <IconText size={16} />;
  };

  return (
    <div className="reading-view">
      <div className="reading-view-inner">
        <h1 className="reading-view-title">{title}</h1>

        {entries.length > 0 && (
          <div className="properties">
            <div className="properties-heading">Propiedades</div>
            {entries.map(([key, value]) => (
              <div key={key} className="property-row">
                <span className="property-key">
                  {iconFor(key)}
                  {key}
                </span>
                <span className="property-value">
                  {key === 'tags' ? (
                    <span className="tags">
                      {(Array.isArray(value) ? value : [value]).map((tag) => (
                        <span key={String(tag)} className="tag">{String(tag)}</span>
                      ))}
                    </span>
                  ) : Array.isArray(value) ? (
                    value.map(formatValue).join(', ')
                  ) : (
                    formatValue(value)
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          className="reading-view-content"
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
