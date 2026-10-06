import { useMemo } from 'react';

interface Props {
  content: string;
}

export default function RightSidebar({ content }: Props) {
  const headings = useMemo(() => {
    const lines = content.split('\n');
    return lines
      .map((line, i) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          return { level: match[1].length, text: match[2], id: `heading-${i}` };
        }
        return null;
      })
      .filter(Boolean);
  }, [content]);

  return (
    <aside className="sidebar-right">
      <div className="sidebar-right-section">
        <div className="sidebar-right-header">Esquema</div>
        <div className="sidebar-right-content">
          {headings.length > 0 ? (
            headings.map((h: any) => (
              <div key={h.id} className={`outline-item level-${h.level}`}>
                {h.text}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-faint)', fontSize: '11px', padding: '8px' }}>
              Sin encabezados
            </div>
          )}
        </div>
      </div>
      <div className="sidebar-right-section">
        <div className="sidebar-right-header">Enlaces</div>
        <div className="sidebar-right-content">
          <div style={{ color: 'var(--text-faint)', fontSize: '11px', padding: '8px' }}>
            Próximamente
          </div>
        </div>
      </div>
    </aside>
  );
}
