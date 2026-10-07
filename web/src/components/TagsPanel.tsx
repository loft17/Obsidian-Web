import { useEffect, useMemo, useState } from 'react';
import { useStore, hiddenMatchers, isHiddenPath } from '../store';
import { searchApi, type VaultTag } from '../api';
import { IconChevronDown, IconChevronRight, IconClose, IconSearch, IconSortCount, IconSortName, IconSync } from './Icons';

// Nodo del árbol de etiquetas: proyecto → proyecto/web → proyecto/web/front
interface TagNode {
  name: string; // último segmento
  tag: string; // etiqueta completa
  paths: Set<string>; // notas con esta etiqueta o alguna subetiqueta
  children: Map<string, TagNode>;
}

type TagSort = 'name' | 'count';
const SORT_KEY = 'tagsSort';

function buildTagTree(tags: VaultTag[], visible: (path: string) => boolean) {
  const root: TagNode = { name: '', tag: '', paths: new Set(), children: new Map() };
  for (const { tag, paths } of tags) {
    const shown = paths.filter(visible);
    if (!shown.length) continue;
    let node = root;
    const parts = tag.split('/').filter(Boolean);
    parts.forEach((part, i) => {
      const key = part.toLowerCase();
      let child = node.children.get(key);
      if (!child) {
        child = { name: part, tag: parts.slice(0, i + 1).join('/'), paths: new Set(), children: new Map() };
        node.children.set(key, child);
      }
      shown.forEach((p) => child!.paths.add(p));
      node = child;
    });
  }
  return root;
}

// Con filtro: solo las etiquetas que lo contienen y las que llevan hasta ellas
const matchesFilter = (node: TagNode, filter: string): boolean =>
  node.tag.toLowerCase().includes(filter) || [...node.children.values()].some((c) => matchesFilter(c, filter));

function sortNodes(nodes: Iterable<TagNode>, sort: TagSort) {
  const byName = (a: TagNode, b: TagNode) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  return [...nodes].sort(sort === 'count' ? (a, b) => b.paths.size - a.paths.size || byName(a, b) : byName);
}

interface NodeProps {
  node: TagNode;
  depth: number;
  sort: TagSort;
  filter: string;
  expanded: Set<string>;
  onToggle: (tag: string) => void;
}

function TagTreeNode({ node, depth, sort, filter, expanded, onToggle }: NodeProps) {
  const searchTag = useStore((s) => s.searchTag);
  const children = sortNodes(node.children.values(), sort).filter((c) => !filter || matchesFilter(c, filter));
  const isOpen = !!filter || expanded.has(node.tag.toLowerCase());

  return (
    <>
      <div
        className="tree-item tag-item"
        style={{ paddingLeft: depth * 16 }}
        title={`#${node.tag}`}
        onClick={() => searchTag(node.tag)}
      >
        <span
          className="tree-chevron"
          onClick={(e) => {
            if (!children.length) return;
            e.stopPropagation();
            onToggle(node.tag.toLowerCase());
          }}
        >
          {children.length > 0 && (isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />)}
        </span>
        <span className="tree-label">{node.name}</span>
        <span className="search-result-count">{node.paths.size}</span>
      </div>
      {isOpen &&
        children.map((c) => (
          <TagTreeNode key={c.tag} node={c} depth={depth + 1} sort={sort} filter={filter} expanded={expanded} onToggle={onToggle} />
        ))}
    </>
  );
}

export default function TagsPanel() {
  const hiddenFolders = useStore((s) => s.hiddenFolders);
  const [tags, setTags] = useState<VaultTag[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<TagSort>(() => {
    try {
      return localStorage.getItem(SORT_KEY) === 'count' ? 'count' : 'name';
    } catch {
      return 'name';
    }
  });

  const load = async () => {
    try {
      setTags(await searchApi.tags());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSort = () => {
    const next = sort === 'name' ? 'count' : 'name';
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      // sin almacenamiento: el orden no se recuerda
    }
  };

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const root = useMemo(() => {
    const matchers = hiddenMatchers(hiddenFolders);
    return buildTagTree(tags ?? [], (p) => !matchers.length || !isHiddenPath(p, false, matchers));
  }, [tags, hiddenFolders]);

  const f = filter.trim().replace(/^#/, '').toLowerCase();
  const roots = sortNodes(root.children.values(), sort).filter((n) => !f || matchesFilter(n, f));

  return (
    <>
      <div className="sidebar-toolbar">
        <button
          className="icon-btn"
          title={sort === 'name' ? 'Ordenar por número de notas' : 'Ordenar por nombre'}
          onClick={toggleSort}
        >
          {sort === 'name' ? <IconSortName size={16} /> : <IconSortCount size={16} />}
        </button>
        <button className="icon-btn" title="Actualizar" onClick={load}>
          <IconSync size={16} />
        </button>
      </div>
      <div className="search-input-wrapper">
        <span className="search-input-icon">
          <IconSearch size={14} />
        </span>
        <input
          className="search-input"
          placeholder="Filtrar etiquetas..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setFilter('')}
        />
        {filter && (
          <button className="icon-btn search-clear" title="Limpiar" onClick={() => setFilter('')}>
            <IconClose size={14} />
          </button>
        )}
      </div>
      <div className="file-explorer">
        {error ? (
          <div className="dropdown-empty">{error}</div>
        ) : tags === null ? (
          <div className="dropdown-empty">Cargando...</div>
        ) : roots.length === 0 ? (
          <div className="dropdown-empty">{f ? 'Ninguna etiqueta coincide' : 'No hay etiquetas en el vault'}</div>
        ) : (
          roots.map((n) => (
            <TagTreeNode key={n.tag} node={n} depth={0} sort={sort} filter={f} expanded={expanded} onToggle={toggle} />
          ))
        )}
      </div>
    </>
  );
}
