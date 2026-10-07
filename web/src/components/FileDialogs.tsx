import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { flushPendingSave } from './Editor';
import { noteImageUsage } from '../attachments';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function DialogShell({
  title,
  error,
  onClose,
  children,
}: {
  title: string;
  error?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  // Portal: un ancestro con `transform` rompería el `position: fixed` del overlay
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal file-dialog">
        <div className="file-dialog-title">{title}</div>
        {children}
        {error && <div className="error">{error}</div>}
      </div>
    </div>,
    document.body
  );
}

function DialogButtons({
  confirmLabel,
  danger,
  disabled,
  onCancel,
}: {
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="file-dialog-buttons">
      <button type="button" className="btn-secondary" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className={danger ? 'btn-danger' : ''} disabled={disabled}>
        {confirmLabel}
      </button>
    </div>
  );
}

export function RenameDialog({
  title = 'Renombrar',
  confirmLabel = 'Renombrar',
  placeholder,
  initialName,
  onSubmit,
  onClose,
}: {
  title?: string;
  confirmLabel?: string;
  placeholder?: string;
  initialName: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('El nombre no puede estar vacío');
    if (/[\\/:*?"<>|]/.test(trimmed)) return setError('El nombre contiene caracteres no válidos: \\ / : * ? " < > |');
    if (trimmed === initialName) return onClose();
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <DialogShell title={title} error={error} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="file-dialog-input"
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <DialogButtons confirmLabel={confirmLabel} disabled={busy} onCancel={onClose} />
      </form>
    </DialogShell>
  );
}

export function MoveDialog({
  title = 'Mover archivo a...',
  folders,
  currentFolder,
  onSubmit,
  onClose,
}: {
  title?: string;
  folders: string[];
  currentFolder: string;
  onSubmit: (folder: string) => Promise<void>;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // '' representa la raíz de la bóveda
  const options = ['', ...folders]
    .filter((f) => f !== currentFolder)
    .filter((f) => (f || '/').toLowerCase().includes(filter.toLowerCase()));

  const choose = async (folder: string) => {
    setBusy(true);
    try {
      await onSubmit(folder);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <DialogShell title={title} error={error} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (options.length > 0 && !busy) choose(options[0]);
        }}
      >
        <input
          autoFocus
          className="file-dialog-input"
          placeholder="Buscar carpeta..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </form>
      <div className="file-dialog-list">
        {options.length === 0 && <div className="dropdown-empty">No hay carpetas que coincidan</div>}
        {options.map((folder) => (
          <div
            key={folder || '/'}
            className={`dropdown-item ${busy ? 'disabled' : ''}`}
            onClick={() => !busy && choose(folder)}
          >
            {folder || '/ (raíz de la bóveda)'}
          </div>
        ))}
      </div>
    </DialogShell>
  );
}

export function QuickOpenDialog({
  files,
  onSelect,
  onClose,
}: {
  files: { path: string; name: string }[];
  onSelect: (path: string, name: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(0);

  const needle = filter.toLowerCase();
  const options = files.filter((f) => f.path.toLowerCase().includes(needle)).slice(0, 50);
  const current = Math.min(selected, Math.max(options.length - 1, 0));

  const choose = (i: number) => {
    const file = options[i];
    if (!file) return;
    onSelect(file.path, file.name);
    onClose();
  };

  return (
    <DialogShell title="Abrir nota" onClose={onClose}>
      <input
        autoFocus
        className="file-dialog-input"
        placeholder="Buscar nota..."
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setSelected(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            choose(current);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected(Math.min(current + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected(Math.max(current - 1, 0));
          }
        }}
      />
      <div className="file-dialog-list">
        {options.length === 0 && <div className="dropdown-empty">No hay notas que coincidan</div>}
        {options.map((f, i) => (
          <div
            key={f.path}
            ref={(el) => i === current && el?.scrollIntoView({ block: 'nearest' })}
            className="dropdown-item"
            style={i === current ? { background: 'var(--interactive-hover)' } : undefined}
            onClick={() => choose(i)}
          >
            {f.path.replace(/\.md$/i, '')}
          </div>
        ))}
      </div>
    </DialogShell>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <DialogShell title={title} error={error} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="file-dialog-message">{message}</p>
        {children}
        <DialogButtons confirmLabel={confirmLabel} danger disabled={busy || disabled} onCancel={onClose} />
      </form>
    </DialogShell>
  );
}

// Confirmación de borrado; si es una nota, ofrece borrar también sus imágenes (marcado por defecto).
// Las imágenes que otras notas también usan nunca se borran.
export function DeleteFileDialog({
  path,
  isFolder,
  title,
  confirmLabel,
  onDelete,
  onClose,
}: {
  path: string;
  isFolder?: boolean;
  title: string;
  confirmLabel: string;
  onDelete: (images: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const isNote = !isFolder && /\.md$/i.test(path);
  const [usage, setUsage] = useState<{ own: string[]; shared: string[] } | null>(null);
  const [loading, setLoading] = useState(isNote);
  const [deleteImages, setDeleteImages] = useState(true);

  useEffect(() => {
    if (!isNote) return;
    let cancelled = false;
    (async () => {
      try {
        await flushPendingSave(path);
        const result = await noteImageUsage(path);
        if (!cancelled) setUsage(result);
      } catch {
        // Si falla la detección se borra solo la nota
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, isNote]);

  const own = usage?.own ?? [];
  const shared = usage?.shared ?? [];
  const name = path.split('/').pop() || path;

  return (
    <ConfirmDialog
      title={title}
      message={
        <>
          ¿Seguro que quieres borrar <strong>{name}</strong>
          {isFolder && ' y todo su contenido'}? Se moverá a la papelera de la bóveda (.trash).
        </>
      }
      confirmLabel={confirmLabel}
      disabled={loading}
      onConfirm={() => onDelete(deleteImages ? own : [])}
      onClose={onClose}
    >
      {loading && <p className="file-dialog-message">Buscando imágenes de la nota…</p>}
      {own.length > 0 && (
        <div className="delete-images">
          <label className="delete-images-toggle">
            <input type="checkbox" checked={deleteImages} onChange={(e) => setDeleteImages(e.target.checked)} />
            Borrar también {own.length === 1 ? 'su imagen' : `sus ${own.length} imágenes`}
          </label>
          <ul className="delete-images-list">
            {own.map((p) => (
              <li key={p} title={p}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {shared.length > 0 && (
        <p className="file-dialog-message">
          Se conservan {shared.length === 1 ? '1 imagen usada' : `${shared.length} imágenes usadas`} también en otras
          notas.
        </p>
      )}
    </ConfirmDialog>
  );
}

// La nota ha cambiado en otro sitio mientras se editaba aquí: hay que elegir qué versión
// conservar. No se puede cerrar sin elegir, para no seguir escribiendo sobre una versión vieja
export function ConflictDialog({
  path,
  mine,
  theirs,
  onKeepMine,
  onKeepTheirs,
}: {
  path: string;
  mine: string;
  theirs: string;
  onKeepMine: () => Promise<void>;
  onKeepTheirs: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const name = (path.split('/').pop() || path).replace(/\.md$/i, '');

  const keepMine = async () => {
    setBusy(true);
    try {
      await onKeepMine();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell title="La nota ha cambiado en otro sitio" onClose={() => {}}>
      <p className="file-dialog-message">
        <strong>{name}</strong> se ha modificado fuera de esta pestaña (otro dispositivo, la sincronización…) mientras
        la editabas. Elige qué versión conservar; la otra se descartará.
      </p>
      <div className="conflict-versions">
        <div>
          <div className="conflict-label">Tu versión</div>
          <pre className="conflict-text">{mine}</pre>
        </div>
        <div>
          <div className="conflict-label">Versión del servidor</div>
          <pre className="conflict-text">{theirs}</pre>
        </div>
      </div>
      <div className="file-dialog-buttons">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onKeepTheirs}>
          Usar la del servidor
        </button>
        <button type="button" disabled={busy} onClick={keepMine}>
          Conservar la mía
        </button>
      </div>
    </DialogShell>
  );
}
