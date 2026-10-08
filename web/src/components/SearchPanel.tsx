import { useState, useEffect } from 'react';
import { useStore, hiddenMatchers, isHiddenPath } from '../store';
import { searchApi, SearchResult, SearchMatch } from '../api';
import { useT } from '../i18n';
import { IconChevronRight, IconChevronDown, IconClose, IconSearch } from './Icons';

function Highlighted({ text, start, length }: Pick<SearchMatch, 'text' | 'start' | 'length'>) {
  return (
    <>
      {text.slice(0, start)}
      <mark className="search-highlight">{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </>
  );
}

// Resalta la primera aparición de `query` dentro del nombre
function HighlightedName({ name, query }: { name: string; query: string }) {
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{name}</>;
  return <Highlighted text={name} start={idx} length={query.length} />;
}

export default function SearchPanel() {
  const hiddenFolders = useStore((s) => s.hiddenFolders);
  const activeTab = useStore((s) => s.activeTab);
  const openFile = useStore((s) => s.openFile);
  const query = useStore((s) => s.searchQuery);
  const setQuery = useStore((s) => s.setSearchQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const t = useT();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    // Espera a que se deje de escribir antes de consultar al servidor
    const timer = setTimeout(async () => {
      try {
        setResults(await searchApi.search(q, ctrl.signal));
        setError('');
        setCollapsed(new Set());
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        setResults([]);
      }
      setLoading(false);
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const matchers = hiddenMatchers(hiddenFolders);
  const visible = matchers.length ? results.filter((r) => !isHiddenPath(r.path, false, matchers)) : results;
  const totalMatches = visible.reduce((n, r) => n + r.total, 0);
  const q = query.trim();

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <>
      <div className="search-input-wrapper">
        <span className="search-input-icon">
          <IconSearch size={14} />
        </span>
        <input
          autoFocus
          className="search-input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
        />
        {query && (
          <button className="icon-btn search-clear" title={t('common.clear')} onClick={() => setQuery('')}>
            <IconClose size={14} />
          </button>
        )}
      </div>
      {q && (
        <div className="search-summary">
          {loading
            ? t('search.searching')
            : error
            ? error
            : `${t(visible.length === 1 ? 'search.file' : 'search.files', { n: visible.length })} · ${t(
                totalMatches === 1 ? 'search.match' : 'search.matches',
                { n: totalMatches }
              )}`}
        </div>
      )}
      <div className="file-explorer search-results">
        {!loading && q && !error && visible.length === 0 && <div className="dropdown-empty">{t('search.noResults')}</div>}
        {visible.map((r) => {
          const isOpen = !collapsed.has(r.path);
          const hasMatches = r.matches.length > 0;
          return (
            <div key={r.path} className="search-result">
              <div
                className={`tree-item file ${activeTab === r.path ? 'active' : ''}`}
                style={{ paddingLeft: hasMatches ? '0' : '16px' }}
                title={r.path}
                onClick={() => openFile(r.path, r.name)}
              >
                {hasMatches && (
                  <span
                    className="tree-chevron"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(r.path);
                    }}
                  >
                    {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </span>
                )}
                <span className="tree-label">
                  <HighlightedName name={r.name.replace(/\.md$/i, '')} query={q} />
                  {r.path.includes('/') && (
                    <span className="search-result-folder">{r.path.substring(0, r.path.lastIndexOf('/'))}</span>
                  )}
                </span>
                {r.total > 0 && <span className="search-result-count">{r.total}</span>}
              </div>
              {hasMatches && isOpen && (
                <div className="search-matches">
                  {r.matches.map((m, i) => (
                    <div
                      key={i}
                      className="search-match"
                      title={t('search.line', { n: m.line })}
                      onClick={() => openFile(r.path, r.name)}
                    >
                      <Highlighted text={m.text} start={m.start} length={m.length} />
                    </div>
                  ))}
                  {r.total > r.matches.length && (
                    <div className="search-match-more">{t('search.more', { n: r.total - r.matches.length })}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
