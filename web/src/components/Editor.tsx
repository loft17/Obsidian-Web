import { useEffect, useMemo, useRef } from 'react';
import { useStore, isUnder, type EditorMode } from '../store';
import { filesApi } from '../api';
import { parseNote, composeNote, type FrontmatterData } from '../frontmatter';
import Properties from './Properties';
import EditorToolbar from './EditorToolbar';
import InlineTitle from './InlineTitle';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown';
import { livePreview, sourceMode, HighlightSyntax, notePath } from '../livePreview';
import { imageUpload } from '../imageUpload';

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

// Permite cambiar entre vista previa en vivo y modo fuente sin recrear el editor
const modeCompartment = new Compartment();
const modeExtension = (mode: EditorMode) => (mode === 'source' ? sourceMode : livePreview);

const lineNumbersCompartment = new Compartment();
const lineNumbersExtension = (show: boolean) => (show ? [lineNumbers(), highlightActiveLineGutter()] : []);

function createState(doc: string, onChange: (doc: string) => void, getPath: () => string) {
  return EditorState.create({
    doc,
    extensions: [
      notePath.of(getPath),
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, extensions: [HighlightSyntax] }),
      modeCompartment.of(modeExtension(useStore.getState().editorMode)),
      lineNumbersCompartment.of(lineNumbersExtension(useStore.getState().showLineNumbers)),
      imageUpload(getPath),
      keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChange(u.state.doc.toString());
      }),
    ],
  });
}

export default function Editor({ filePath, content, onContentChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const setTabDirty = useStore((s) => s.setTabDirty);
  const editorMode = useStore((s) => s.editorMode);
  const showLineNumbers = useStore((s) => s.showLineNumbers);
  const showInlineTitle = useStore((s) => s.showInlineTitle);
  const note = useMemo(() => parseNote(content), [content]);
  // Con un frontmatter inválido se edita el texto completo, sin panel de propiedades
  const body = note.valid ? note.body : content;

  // El listener de CodeMirror se crea una vez: siempre llama al manejador del último render
  const onBodyChangeRef = useRef<(newBody: string) => void>(() => {});
  onBodyChangeRef.current = (newBody) => handleBodyChange(newBody);
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const getPath = () => filePathRef.current;

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: createState(body, (doc) => onBodyChangeRef.current(doc), getPath),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: modeCompartment.reconfigure(modeExtension(editorMode)) });
  }, [editorMode]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: lineNumbersCompartment.reconfigure(lineNumbersExtension(showLineNumbers)) });
  }, [showLineNumbers]);

  // Contenido cambiado desde fuera (otra nota, propiedades...): estado nuevo, historial limpio
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== body) {
      view.setState(createState(body, (doc) => onBodyChangeRef.current(doc), getPath));
    }
  }, [body]);

  const handleBodyChange = (newBody: string) => {
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
    <>
      <EditorToolbar viewRef={viewRef} />
      <div className="editor-scroll">
        {showInlineTitle && <InlineTitle filePath={filePath} onEnter={() => viewRef.current?.focus()} />}
        {note.valid && (
          <div className="editor-properties">
            <Properties data={note.data} editable onChange={handlePropertiesChange} />
          </div>
        )}
        <div ref={hostRef} className="editor-cm" />
      </div>
    </>
  );
}
