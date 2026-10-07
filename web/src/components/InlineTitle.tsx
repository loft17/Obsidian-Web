import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { filesApi } from '../api';
import { flushPendingSave } from './Editor';

const INVALID_CHARS = /[\\/:*?"<>|]/;

const baseName = (path: string) => (path.split('/').pop() || '').replace(/\.md$/i, '');
const parentFolder = (path: string) => (path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '');

// Título en línea: el nombre del archivo encima de la nota; al editarlo se renombra el archivo
export default function InlineTitle({ filePath, onEnter }: { filePath: string; onEnter?: () => void }) {
  const renameTab = useStore((s) => s.renameTab);
  const setTree = useStore((s) => s.setTree);
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const name = baseName(filePath);

  // contentEditable no es controlado por React: sincronizar el texto a mano al cambiar de nota
  useEffect(() => {
    if (ref.current) ref.current.textContent = name;
    setError('');
  }, [name]);

  const restore = () => {
    if (ref.current) ref.current.textContent = name;
  };

  const commit = async () => {
    const newName = (ref.current?.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (newName === name) return restore();
    if (!newName) {
      setError('El nombre no puede estar vacío');
      return restore();
    }
    if (INVALID_CHARS.test(newName)) {
      setError('El nombre contiene caracteres no válidos: \\ / : * ? " < > |');
      return restore();
    }
    const folder = parentFolder(filePath);
    const ext = /\.md$/i.test(filePath) ? '.md' : '';
    const newPath = `${folder ? folder + '/' : ''}${newName}${ext}`;
    try {
      await flushPendingSave(filePath);
      await filesApi.renameFile(filePath, newPath);
      renameTab(filePath, newPath);
      setError('');
      setTree(await filesApi.getTree());
    } catch (err) {
      setError((err as Error).message);
      restore();
    }
  };

  return (
    <div className="inline-title-wrap">
      <div
        ref={ref}
        className="inline-title"
        contentEditable="plaintext-only"
        spellCheck={false}
        suppressContentEditableWarning
        onBlur={commit}
        onInput={() => error && setError('')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            ref.current?.blur();
            onEnter?.();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            restore();
            ref.current?.blur();
          }
        }}
      />
      {error && <div className="inline-title-error">{error}</div>}
    </div>
  );
}
