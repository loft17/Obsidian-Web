import { useEffect, useRef } from 'react';
import { useStore, isUnder } from '../store';
import { filesApi } from '../api';

interface Props {
  filePath: string;
  content: string;
  onContentChange: (content: string) => void;
}

const AUTOSAVE_DELAY = 2000;

// Autoguardados pendientes por ruta, para poder forzarlos o cancelarlos
// antes de renombrar, mover o borrar un archivo (o una carpeta entera)
const pendingSaves = new Map<string, { timer: number; run: () => Promise<void> }>();

const pendingUnder = (path: string) => [...pendingSaves.entries()].filter(([p]) => isUnder(p, path));

export async function flushPendingSave(path: string) {
  await Promise.all(
    pendingUnder(path).map(([, pending]) => {
      clearTimeout(pending.timer);
      return pending.run();
    })
  );
}

export function cancelPendingSave(path: string) {
  for (const [p, pending] of pendingUnder(path)) {
    clearTimeout(pending.timer);
    pendingSaves.delete(p);
  }
}

export default function Editor({ filePath, content, onContentChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const setTabDirty = useStore((s) => s.setTabDirty);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = content;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onContentChange(newContent);
    setTabDirty(filePath, true);

    // Debounced autosave
    cancelPendingSave(filePath);

    const run = async () => {
      pendingSaves.delete(filePath);
      try {
        await filesApi.writeFile(filePath, newContent);
        setTabDirty(filePath, false);
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    };
    pendingSaves.set(filePath, { timer: window.setTimeout(run, AUTOSAVE_DELAY), run });
  };

  return (
    <textarea
      ref={textareaRef}
      style={{
        flex: 1,
        padding: '16px',
        border: 'none',
        background: 'var(--background-primary)',
        color: 'var(--text-normal)',
        fontFamily: "'Monaco', 'Menlo', monospace",
        fontSize: '13px',
        lineHeight: '1.6',
        resize: 'none',
        overflow: 'auto',
      }}
      onChange={handleChange}
      defaultValue={content}
      spellCheck="false"
    />
  );
}
