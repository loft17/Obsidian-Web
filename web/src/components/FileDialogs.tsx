import { useState, useEffect, useRef } from 'react';

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
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal file-dialog">
        <div className="file-dialog-title">{title}</div>
        {children}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
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
        <DialogButtons confirmLabel={confirmLabel} danger disabled={busy} onCancel={onClose} />
      </form>
    </DialogShell>
  );
}
