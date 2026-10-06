import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { filesApi } from '../api';
import { flushPendingSave, cancelPendingSave } from './Editor';
import { IconMenu } from './Icons';
import { RenameDialog, MoveDialog, ConfirmDialog } from './FileDialogs';

const fileName = (path: string) => path.split('/').pop() || path;
const parentFolder = (path: string) => (path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '');

export default function NoteMenu() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialog, setDialog] = useState<'rename' | 'move' | 'delete' | null>(null);

  const activeTab = useStore((s) => s.activeTab);
  const tree = useStore((s) => s.tree);
  const setTree = useStore((s) => s.setTree);
  const renameTab = useStore((s) => s.renameTab);
  const removeTab = useStore((s) => s.removeTab);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // La búsqueda y los diálogos pertenecen al documento mostrado
  useEffect(() => {
    setSearchOpen(false);
    setDialog(null);
  }, [activeTab]);

  if (!activeTab) return null;

  const openDialog = (kind: NonNullable<typeof dialog>) => {
    setOpen(false);
    setDialog(kind);
  };

  const changePath = async (newPath: string) => {
    await flushPendingSave(activeTab);
    await filesApi.renameFile(activeTab, newPath);
    renameTab(activeTab, newPath);
    setTree(await filesApi.getTree());
    setDialog(null);
  };

  const handleRename = (newName: string) => {
    const ext = /\.md$/i.test(activeTab) && !/\.md$/i.test(newName) ? '.md' : '';
    const folder = parentFolder(activeTab);
    return changePath(`${folder ? folder + '/' : ''}${newName}${ext}`);
  };

  const handleMove = (folder: string) => changePath(`${folder ? folder + '/' : ''}${fileName(activeTab)}`);

  const handleDelete = async () => {
    cancelPendingSave(activeTab);
    await filesApi.deleteFile(activeTab);
    removeTab(activeTab);
    setTree(await filesApi.getTree());
    setDialog(null);
  };

  const handleExportPDF = async () => {
    setOpen(false);
    // Abrir antes del await: tras él ya no cuenta como gesto del usuario y se bloquea el popup
    const win = window.open('', '_blank');
    await flushPendingSave(activeTab);
    const url = `/api/files/export-pdf/${encodeURIComponent(activeTab)}`;
    if (win) win.location.href = url;
    else alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para exportar a PDF.');
  };

  const folders = tree
    .filter((i) => i.type === 'folder')
    .map((i) => i.path)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn" title="Más opciones" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IconMenu />
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={() => openDialog('rename')}>
            Renombrar
          </div>
          <div className="dropdown-item" onClick={() => openDialog('move')}>
            Mover archivo a...
          </div>
          <div className="dropdown-item" onClick={handleExportPDF}>
            Exportar a PDF
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              setOpen(false);
              setSearchOpen(true);
            }}
          >
            Buscar
          </div>
          <hr className="dropdown-divider" />
          <div className="dropdown-item danger" onClick={() => openDialog('delete')}>
            Eliminar archivo
          </div>
        </div>
      )}
      {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      {dialog === 'rename' && (
        <RenameDialog
          initialName={fileName(activeTab).replace(/\.md$/i, '')}
          onSubmit={handleRename}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'move' && (
        <MoveDialog
          folders={folders}
          currentFolder={parentFolder(activeTab)}
          onSubmit={handleMove}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Eliminar archivo"
          message={
            <>
              ¿Seguro que quieres eliminar <strong>{fileName(activeTab)}</strong>? Se moverá a la papelera de la bóveda
              (.trash).
            </>
          }
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// Resaltado nativo (CSS Custom Highlight API) para la vista de lectura
const HL_ALL = 'note-search';
const HL_CURRENT = 'note-search-current';

function clearHighlights() {
  const hl = (CSS as any).highlights;
  hl?.delete(HL_ALL);
  hl?.delete(HL_CURRENT);
}

function findRanges(root: HTMLElement, query: string): Range[] {
  const ranges: Range[] = [];
  const needle = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue ?? '').toLowerCase();
    for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + needle.length);
      ranges.push(range);
    }
  }
  return ranges;
}

function SearchBar({ onClose }: { onClose: () => void }) {
  const editMode = useStore((s) => s.editMode);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rangesRef = useRef<Range[]>([]);

  const getTextarea = () => document.querySelector<HTMLTextAreaElement>('.editor-textarea');
  const getReading = () => document.querySelector<HTMLElement>('.reading-view-inner');

  const textareaMatches = (ta: HTMLTextAreaElement) => {
    const hay = ta.value.toLowerCase();
    const needle = query.toLowerCase();
    const found: number[] = [];
    for (let i = hay.indexOf(needle); needle && i >= 0; i = hay.indexOf(needle, i + needle.length)) found.push(i);
    return found;
  };

  // Mostrar el resultado `i`: seleccionar en el editor o resaltar en la lectura
  const show = (i: number, focusEditor: boolean) => {
    if (editMode) {
      const ta = getTextarea();
      if (!ta) return;
      const found = textareaMatches(ta);
      setTotal(found.length);
      if (found.length === 0) return;
      const n = (i + found.length) % found.length;
      setIndex(n);
      const start = found[n];
      ta.setSelectionRange(start, start + query.length);
      // Desplazar la línea del resultado al centro del área visible
      const before = ta.value.substring(0, start);
      const line = before.split('\n').length - 1;
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 2);
      if (focusEditor) ta.focus({ preventScroll: true });
    } else {
      const ranges = rangesRef.current;
      if (ranges.length === 0) return;
      const n = (i + ranges.length) % ranges.length;
      setIndex(n);
      const hl = (CSS as any).highlights;
      const HighlightCtor = (window as any).Highlight;
      if (hl && HighlightCtor) hl.set(HL_CURRENT, new HighlightCtor(ranges[n]));
      ranges[n].startContainer.parentElement?.scrollIntoView({ block: 'center' });
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    return clearHighlights;
  }, []);

  // Recalcular resultados al cambiar el texto buscado o el modo
  useEffect(() => {
    clearHighlights();
    rangesRef.current = [];
    setIndex(0);
    if (!query) return setTotal(0);
    if (editMode) {
      const ta = getTextarea();
      setTotal(ta ? textareaMatches(ta).length : 0);
      return;
    }
    const root = getReading();
    if (!root) return setTotal(0);
    const ranges = findRanges(root, query);
    rangesRef.current = ranges;
    setTotal(ranges.length);
    const hl = (CSS as any).highlights;
    const HighlightCtor = (window as any).Highlight;
    if (hl && HighlightCtor && ranges.length) {
      hl.set(HL_ALL, new HighlightCtor(...ranges));
      show(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, editMode]);

  // F3 / Shift+F3 siguen buscando aunque el foco esté en el editor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'F3') {
        e.preventDefault();
        show(index + (e.shiftKey ? -1 : 1), true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const step = (delta: number) => show(index + delta, editMode);

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar en el documento..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // En edición la primera pulsación va al primer resultado; las siguientes avanzan
            step(e.shiftKey ? -1 : editMode && getTextarea()?.selectionStart === getTextarea()?.selectionEnd ? 0 : 1);
          }
        }}
      />
      <span className="search-count">{query ? `${total ? index + 1 : 0}/${total}` : ''}</span>
      <button type="button" title="Anterior (Mayús+F3)" onMouseDown={(e) => e.preventDefault()} onClick={() => step(-1)}>
        ↑
      </button>
      <button type="button" title="Siguiente (F3)" onMouseDown={(e) => e.preventDefault()} onClick={() => step(1)}>
        ↓
      </button>
      <button type="button" title="Cerrar" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
