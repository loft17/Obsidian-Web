import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import {
  IconUndo,
  IconRedo,
  IconEraser,
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconHighlight,
  IconQuote,
  IconCode,
  IconListBullet,
  IconListOrdered,
  IconCheckSquare,
  IconLink,
  IconBrackets,
  IconTable,
  IconChevronDown,
} from './Icons';

// Instantánea del editor sobre la que trabajan las acciones de formato
interface TA {
  view: EditorView;
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function snapshot(view: EditorView): TA {
  const { from, to } = view.state.selection.main;
  return { view, value: view.state.doc.toString(), selectionStart: from, selectionEnd: to };
}

function replaceRange(ta: TA, start: number, end: number, text: string, selStart: number, selEnd: number) {
  ta.view.dispatch({
    changes: { from: start, to: end, insert: text },
    selection: { anchor: selStart, head: selEnd },
    scrollIntoView: true,
    userEvent: 'input',
  });
  ta.view.focus();
}

const runLength = (s: string, ch: string, from: number, step: 1 | -1) => {
  let n = 0;
  for (let i = from; i >= 0 && i < s.length && s[i] === ch; i += step) n++;
  return n;
};

// Añade o quita marcadores alrededor de la selección (**negrita**, *cursiva*, ==resaltado==...)
function toggleInline(ta: TA, marker: string, placeholder: string) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const ch = marker[0];
  const left = runLength(v, ch, s - 1, -1);
  const right = runLength(v, ch, e, 1);
  // Con '*' hay que distinguir cursiva de negrita: ***x*** tiene ambas
  const active = marker.length === 1 ? left % 2 === 1 && right % 2 === 1 : left >= marker.length && right >= marker.length;
  const n = marker.length;
  if (active) {
    replaceRange(ta, s - n, e + n, v.slice(s, e), s - n, e - n);
    return;
  }
  const text = v.slice(s, e) || placeholder;
  replaceRange(ta, s, e, marker + text + marker, s + n, s + n + text.length);
}

function lineBounds(v: string, s: number, e: number) {
  const start = v.lastIndexOf('\n', s - 1) + 1;
  // Si la selección acaba justo al inicio de una línea, esa línea no cuenta
  const last = e > s && v[e - 1] === '\n' ? e - 1 : e;
  const nl = v.indexOf('\n', last);
  return [start, nl < 0 ? v.length : nl] as const;
}

// Aplica una transformación a cada línea tocada por la selección
function transformLines(ta: TA, fn: (lines: string[]) => string[]) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const [start, end] = lineBounds(v, s, e);
  const text = fn(v.slice(start, end).split('\n')).join('\n');
  if (s === e) replaceRange(ta, start, end, text, start + text.length, start + text.length);
  else replaceRange(ta, start, end, text, start, start + text.length);
}

const HEADING = /^#{1,6}\s+/;
const QUOTE = /^>\s?/;
const LIST = /^(\s*)([-*+] \[[ xX]\] |[-*+] |\d+[.)] )/;

function setHeading(ta: TA, level: number) {
  const prefix = '#'.repeat(level) + ' ';
  transformLines(ta, (lines) => {
    const all = lines.every((l) => l.startsWith(prefix));
    return lines.map((l) => (all ? '' : prefix) + l.replace(HEADING, ''));
  });
}

function toggleQuote(ta: TA) {
  transformLines(ta, (lines) => {
    const all = lines.every((l) => QUOTE.test(l));
    return lines.map((l) => (all ? l.replace(QUOTE, '') : '> ' + l));
  });
}

type ListKind = 'bullet' | 'ordered' | 'task';
const LIST_TEST: Record<ListKind, RegExp> = {
  bullet: /^\s*[-*+] (?!\[[ xX]\] )/,
  ordered: /^\s*\d+[.)] /,
  task: /^\s*[-*+] \[[ xX]\] /,
};

function toggleList(ta: TA, kind: ListKind) {
  transformLines(ta, (lines) => {
    const all = lines.every((l) => LIST_TEST[kind].test(l));
    let n = 0;
    return lines.map((l) => {
      const m = l.match(LIST);
      const indent = m ? m[1] : '';
      const rest = m ? l.slice(m[0].length) : l;
      if (all) return indent + rest;
      if (!l.trim()) return l;
      const prefix = kind === 'bullet' ? '- ' : kind === 'task' ? '- [ ] ' : `${++n}. `;
      return indent + prefix + rest;
    });
  });
}

function toggleCode(ta: TA) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const sel = v.slice(s, e);
  if (!sel.includes('\n')) {
    toggleInline(ta, '`', 'código');
    return;
  }
  const before = s > 0 && v[s - 1] !== '\n' ? '\n' : '';
  const text = `${before}\`\`\`\n${sel.replace(/\n$/, '')}\n\`\`\`\n`;
  replaceRange(ta, s, e, text, s + before.length + 3, s + before.length + 3);
}

function insertLink(ta: TA) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const sel = v.slice(s, e);
  if (/^https?:\/\/\S+$/.test(sel)) {
    replaceRange(ta, s, e, `[](${sel})`, s + 1, s + 1);
    return;
  }
  const label = sel || 'texto';
  const at = s + label.length + 3;
  replaceRange(ta, s, e, `[${label}](url)`, at, at + 3);
}

function insertWikilink(ta: TA) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const sel = v.slice(s, e);
  replaceRange(ta, s, e, `[[${sel}]]`, s + 2, s + 2 + sel.length);
}

// Inserta una tabla de 2 columnas en líneas propias, separada por líneas en blanco
function insertTable(ta: TA) {
  const { selectionEnd: e, value: v } = ta;
  const at = v.indexOf('\n', e) < 0 ? v.length : v.indexOf('\n', e);
  const before = at === 0 ? '' : v[at - 1] === '\n' ? '\n' : '\n\n';
  const table = '| Columna 1 | Columna 2 |\n| --------- | --------- |\n|           |           |';
  const text = before + table + '\n\n';
  replaceRange(ta, at, at, text, at + text.length, at + text.length);
}

// Quita marcadores de formato en línea y prefijos de bloque de las líneas seleccionadas
function clearFormat(ta: TA) {
  transformLines(ta, (lines) =>
    lines.map((l) => {
      const m = l.match(LIST);
      const indent = m ? m[1] : '';
      return (
        indent +
        (m ? l.slice(m[0].length) : l)
          .replace(HEADING, '')
          .replace(QUOTE, '')
          .replace(/<\/?u>/g, '')
          .replace(/(\*\*|~~|==|\*|`)/g, '')
      );
    })
  );
}

function historyCommand(ta: TA, cmd: typeof undo) {
  cmd(ta.view);
  ta.view.focus();
}

// Evita que los botones roben el foco (y la selección) al editor
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

function ToolButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="toolbar-btn" title={title} aria-label={title} onMouseDown={keepFocus} onClick={onClick}>
      {children}
    </button>
  );
}

interface MenuItem {
  label: ReactNode;
  title: string;
  run: () => void;
}

function ToolMenu({ title, icon, items }: { title: string; icon: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="toolbar-menu" ref={ref}>
      <button
        type="button"
        className={'toolbar-btn' + (open ? ' active' : '')}
        title={title}
        aria-label={title}
        aria-expanded={open}
        onMouseDown={keepFocus}
        onClick={() => setOpen(!open)}
      >
        {icon}
        <IconChevronDown size={10} className="toolbar-caret" />
      </button>
      {open && (
        <div className="toolbar-dropdown">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              className="toolbar-dropdown-item"
              onMouseDown={keepFocus}
              onClick={() => {
                setOpen(false);
                item.run();
              }}
            >
              {item.label}
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditorToolbar({ viewRef }: { viewRef: RefObject<EditorView | null> }) {
  const act = (fn: (ta: TA) => void) => () => {
    if (viewRef.current) fn(snapshot(viewRef.current));
  };
  const heading = (level: number) => <span className="toolbar-heading">H{level}</span>;

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formato">
      <ToolButton title="Deshacer" onClick={act((ta) => historyCommand(ta, undo))}>
        <IconUndo />
      </ToolButton>
      <ToolButton title="Rehacer" onClick={act((ta) => historyCommand(ta, redo))}>
        <IconRedo />
      </ToolButton>
      <ToolButton title="Limpiar formato" onClick={act(clearFormat)}>
        <IconEraser />
      </ToolButton>
      <span className="toolbar-sep" />
      {[1, 2, 3].map((level) => (
        <ToolButton key={level} title={`Encabezado ${level}`} onClick={act((ta) => setHeading(ta, level))}>
          {heading(level)}
        </ToolButton>
      ))}
      <ToolMenu
        title="Más encabezados"
        icon={<span className="toolbar-heading">Hn</span>}
        items={[4, 5, 6].map((level) => ({
          label: heading(level),
          title: `Encabezado ${level}`,
          run: act((ta) => setHeading(ta, level)),
        }))}
      />
      <span className="toolbar-sep" />
      <ToolButton title="Negrita" onClick={act((ta) => toggleInline(ta, '**', 'negrita'))}>
        <IconBold />
      </ToolButton>
      <ToolButton title="Cursiva" onClick={act((ta) => toggleInline(ta, '*', 'cursiva'))}>
        <IconItalic />
      </ToolButton>
      <ToolButton title="Tachado" onClick={act((ta) => toggleInline(ta, '~~', 'tachado'))}>
        <IconStrikethrough />
      </ToolButton>
      <ToolButton title="Resaltado" onClick={act((ta) => toggleInline(ta, '==', 'resaltado'))}>
        <IconHighlight />
      </ToolButton>
      <ToolButton title="Código" onClick={act(toggleCode)}>
        <IconCode />
      </ToolButton>
      <span className="toolbar-sep" />
      <ToolButton title="Cita" onClick={act(toggleQuote)}>
        <IconQuote />
      </ToolButton>
      <ToolMenu
        title="Listas"
        icon={<IconListBullet />}
        items={[
          { label: <IconListBullet size={16} />, title: 'Lista con viñetas', run: act((ta) => toggleList(ta, 'bullet')) },
          { label: <IconListOrdered size={16} />, title: 'Lista numerada', run: act((ta) => toggleList(ta, 'ordered')) },
          { label: <IconCheckSquare size={16} />, title: 'Lista de tareas', run: act((ta) => toggleList(ta, 'task')) },
        ]}
      />
      <span className="toolbar-sep" />
      <ToolButton title="Enlace" onClick={act(insertLink)}>
        <IconLink />
      </ToolButton>
      <ToolButton title="Enlace interno [[ ]]" onClick={act(insertWikilink)}>
        <IconBrackets />
      </ToolButton>
      <ToolButton title="Insertar tabla" onClick={act(insertTable)}>
        <IconTable />
      </ToolButton>
    </div>
  );
}
