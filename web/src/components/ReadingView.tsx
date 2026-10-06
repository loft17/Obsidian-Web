import { useMemo } from 'react';
import markdownIt from 'markdown-it';
import matter from 'gray-matter';
import { IconTag, IconCalendar, IconText } from './Icons';

const md = markdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

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

        <div className="reading-view-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
