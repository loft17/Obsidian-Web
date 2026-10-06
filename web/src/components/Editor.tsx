import { useEffect, useMemo, useRef } from 'react';
import { useStore, isUnder } from '../store';
import { filesApi } from '../api';
import { parseNote, composeNote, type FrontmatterData } from '../frontmatter';
import Properties from './Properties';

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
  const note = useMemo(() => parseNote(content), [content]);
  // Con un frontmatter inválido se edita el texto completo, sin panel de propiedades
  const body = note.valid ? note.body : content;

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== body) {
      textareaRef.current.value = body;
    }
  }, [body]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    if (!note.valid) commit(newBody);
    else commit(note.head !== null ? note.head + newBody : composeNote(note.data, newBody));
  };

  const handlePropertiesChange = (data: FrontmatterData) => commit(composeNote(data, body));

  const commit = (newContent: string) => {
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
    <div className="editor-scroll">
      {note.valid && (
        <div className="editor-properties">
          <Properties data={note.data} editable onChange={handlePropertiesChange} />
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        onChange={handleBodyChange}
        defaultValue={body}
        spellCheck="false"
      />
    </div>
  );
}
