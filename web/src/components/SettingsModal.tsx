import { useEffect, useState, type CSSProperties } from 'react';
import { useStore, type EditorMode, type Theme, DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE } from '../store';
import { settingsApi } from '../api';
import { IconClose, IconEdit, IconEye, IconFolderNew, IconList, IconReset, IconSearch, IconUserCircle } from './Icons';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  { id: 'about', label: 'Acerca de', Icon: IconUserCircle },
  { id: 'appearance', label: 'Apariencia', Icon: IconEye },
  { id: 'editor', label: 'Editor', Icon: IconEdit },
  { id: 'files', label: 'Archivos', Icon: IconFolderNew },
  { id: 'shortcuts', label: 'Atajos', Icon: IconList },
];

// Los cambios se guardan automáticamente (el store los persiste en localStorage)
function AppearanceSection() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const fontSize = useStore((s) => s.fontSize);
  const setFontSize = useStore((s) => s.setFontSize);
  const showTabHeader = useStore((s) => s.showTabHeader);
  const setShowTabHeader = useStore((s) => s.setShowTabHeader);
  const showRibbon = useStore((s) => s.showRibbon);
  const setShowRibbon = useStore((s) => s.setShowRibbon);
  const quickFontSize = useStore((s) => s.quickFontSize);
  const setQuickFontSize = useStore((s) => s.setQuickFontSize);
  const fontPercent = ((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100;
  return (
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Tema</div>
          <div className="setting-desc">Esquema de colores de la aplicación</div>
        </div>
        <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="dark">Oscuro</option>
          <option value="light">Claro</option>
          <option value="system">Según el sistema</option>
        </select>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Tamaño de fuente</div>
          <div className="setting-desc">Tamaño de fuente en píxeles que afecta al editor y la vista previa.</div>
        </div>
        <div className="setting-slider">
          <button
            className="icon-btn"
            title="Restablecer valor predeterminado"
            disabled={fontSize === DEFAULT_FONT_SIZE}
            onClick={() => setFontSize(DEFAULT_FONT_SIZE)}
          >
            <IconReset size={16} />
          </button>
          <span className="setting-slider-value">{fontSize}</span>
          <input
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            step={1}
            value={fontSize}
            style={{ '--slider-fill': `${fontPercent}%` } as CSSProperties}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ajuste rápido del tamaño de fuente</div>
          <div className="setting-desc">
            Ajuste el tamaño de la fuente usando Ctrl + Rueda del ratón, o usando el gesto de pellizcar y acercar del
            trackpad.
          </div>
        </div>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={quickFontSize}
            onChange={(e) => setQuickFontSize(e.target.checked)}
          />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Mostrar la barra de título de pestaña</div>
          <div className="setting-desc">Mostrar el encabezado en la parte superior de todas las pestañas.</div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showTabHeader} onChange={(e) => setShowTabHeader(e.target.checked)} />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Mostrar menú de cinta</div>
          <div className="setting-desc">
            Muestra una barra de herramientas vertical en el costado de la ventana. Si se oculta, sus botones
            pasan al pie de la barra lateral.
          </div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showRibbon} onChange={(e) => setShowRibbon(e.target.checked)} />
          <span />
        </label>
      </div>
    </div>
  );
}

function EditorSection() {
  const defaultEditMode = useStore((s) => s.defaultEditMode);
  const setDefaultEditMode = useStore((s) => s.setDefaultEditMode);
  const editorMode = useStore((s) => s.editorMode);
  const setEditorMode = useStore((s) => s.setEditorMode);
  const showInlineTitle = useStore((s) => s.showInlineTitle);
  const setShowInlineTitle = useStore((s) => s.setShowInlineTitle);
  const showLineNumbers = useStore((s) => s.showLineNumbers);
  const setShowLineNumbers = useStore((s) => s.setShowLineNumbers);
  const readableLineLength = useStore((s) => s.readableLineLength);
  const setReadableLineLength = useStore((s) => s.setReadableLineLength);
  return (
    <>
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Modo por defecto de las notas</div>
          <div className="setting-desc">Cómo se abren las notas al seleccionarlas</div>
        </div>
        <select
          value={defaultEditMode ? 'edit' : 'view'}
          onChange={(e) => setDefaultEditMode(e.target.value === 'edit')}
        >
          <option value="view">Modo visor</option>
          <option value="edit">Modo edición</option>
        </select>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Modo de edición predeterminado</div>
          <div className="setting-desc">
            Vista previa: oculta la sintaxis de markdown salvo en la línea que editas. Fuente: muestra el markdown tal
            cual.
          </div>
        </div>
        <select value={editorMode} onChange={(e) => setEditorMode(e.target.value as EditorMode)}>
          <option value="preview">Modo vista previa</option>
          <option value="source">Modo fuente</option>
        </select>
      </div>
    </div>
    <h3 className="settings-heading">Pantalla</h3>
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Título en línea</div>
          <div className="setting-desc">
            Mostrar el nombre de archivo como un título editable en línea con el contenido del archivo.
          </div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showInlineTitle} onChange={(e) => setShowInlineTitle(e.target.checked)} />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Longitud de línea legible</div>
          <div className="setting-desc">
            Limita la longitud de línea máxima. Muestra menos contenido en pantalla, pero los párrafos largos son más
            legibles.
          </div>
        </div>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={readableLineLength}
            onChange={(e) => setReadableLineLength(e.target.checked)}
          />
          <span />
        </label>
      </div>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Números de línea</div>
          <div className="setting-desc">Muestra los números de línea.</div>
        </div>
        <label className="setting-toggle">
          <input type="checkbox" checked={showLineNumbers} onChange={(e) => setShowLineNumbers(e.target.checked)} />
          <span />
        </label>
      </div>
    </div>
    </>
  );
}

type AttachmentMode = 'root' | 'same' | 'sub' | 'folder';

// Traduce `attachmentFolderPath` de Obsidian a la opción del desplegable y su carpeta
const parseAttachmentSetting = (value: string): { mode: AttachmentMode; folder: string } => {
  if (value === '' || value === '/') return { mode: 'root', folder: '' };
  if (value === '.' || value === './') return { mode: 'same', folder: '' };
  if (value.startsWith('./')) return { mode: 'sub', folder: value.slice(2) };
  return { mode: 'folder', folder: value };
};

const buildAttachmentSetting = (mode: AttachmentMode, folder: string) => {
  const name = folder.trim().replace(/^\/+|\/+$/g, '') || 'attachments';
  if (mode === 'root') return '/';
  if (mode === 'same') return './';
  return mode === 'sub' ? `./${name}` : name;
};

// Se guarda en .obsidian/app.json del vault, compartido con Obsidian de escritorio
function AttachmentsSetting() {
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<AttachmentMode>('root');
  const [folder, setFolder] = useState('');
  const [savedFolder, setSavedFolder] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    settingsApi
      .getAttachments()
      .then((r) => {
        const parsed = parseAttachmentSetting(r.attachmentFolderPath);
        setMode(parsed.mode);
        setFolder(parsed.folder);
        setSavedFolder(parsed.folder);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, []);

  const save = async (newMode: AttachmentMode, newFolder: string) => {
    setError('');
    try {
      const r = await settingsApi.setAttachments(buildAttachmentSetting(newMode, newFolder));
      const parsed = parseAttachmentSetting(r.attachmentFolderPath);
      setMode(parsed.mode);
      setFolder(parsed.folder);
      setSavedFolder(parsed.folder);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveFolder = () => folder.trim() !== savedFolder && save(mode, folder);

  return (
    <>
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ubicación predeterminada para los archivos adjuntos nuevos</div>
          <div className="setting-desc">Dónde se ubican los archivos adjuntos recién agregados.</div>
          {error && <div className="setting-desc" style={{ color: 'var(--text-error, #e5484d)' }}>{error}</div>}
        </div>
        <select
          value={mode}
          disabled={!loaded}
          onChange={(e) => save(e.target.value as AttachmentMode, folder)}
        >
          <option value="root">Carpeta de la bóveda</option>
          <option value="same">Misma carpeta donde está el archivo</option>
          <option value="sub">En la subcarpeta de la carpeta actual</option>
          <option value="folder">En la carpeta especificada abajo</option>
        </select>
      </div>
      {(mode === 'sub' || mode === 'folder') && (
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-name">
              {mode === 'sub' ? 'Nombre de la subcarpeta' : 'Ruta de la carpeta de archivos adjuntos'}
            </div>
            <div className="setting-desc">
              {mode === 'sub'
                ? `Si su archivo está en "bóveda/carpeta", y su nombre de la subcarpeta establecida en "${folder || 'adjuntos'}", los archivos adjuntos se guardarán en "bóveda/carpeta/${folder || 'adjuntos'}".`
                : 'Ruta relativa a la raíz de la bóveda donde se guardarán todos los adjuntos.'}
            </div>
          </div>
          <input
            className="setting-input"
            type="text"
            placeholder="attachments"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            onBlur={saveFolder}
            onKeyDown={(e) => e.key === 'Enter' && saveFolder()}
          />
        </div>
      )}
    </>
  );
}

function FilesSection() {
  const hiddenFolders = useStore((s) => s.hiddenFolders);
  const setHiddenFolders = useStore((s) => s.setHiddenFolders);
  const [vaultPath, setVaultPath] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .getVault()
      .then((r) => {
        setVaultPath(r.vaultPath);
        setSavedPath(r.vaultPath);
      })
      .catch((err) => setVaultError(err.message));
  }, []);

  const saveVault = async () => {
    setVaultError('');
    setSaving(true);
    try {
      await settingsApi.setVault(vaultPath.trim());
      // Recargar para descartar pestañas y árbol de la bóveda anterior
      window.location.reload();
    } catch (err) {
      setVaultError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ruta de la bóveda</div>
          <div className="setting-desc">
            Ruta absoluta en el servidor. Se creará si no existe. Al cambiarla se recargará la aplicación.
          </div>
          {vaultError && <div className="setting-desc" style={{ color: 'var(--text-error, #e5484d)' }}>{vaultError}</div>}
        </div>
      </div>
      <div className="setting-item">
        <input
          className="setting-input"
          type="text"
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
          disabled={saving}
        />
        <button onClick={saveVault} disabled={saving || !vaultPath.trim() || vaultPath.trim() === savedPath}>
          Guardar
        </button>
      </div>
      <AttachmentsSetting />
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Ocultar carpetas</div>
          <div className="setting-desc">
            Un patrón por línea, p. ej. <code>_recursos</code> o <code>_*</code>. Usa * como comodín.
            Las carpetas que coincidan (y su contenido) no se mostrarán en el árbol.
          </div>
        </div>
      </div>
      <textarea
        className="setting-textarea"
        rows={6}
        placeholder={'_recursos\n_*'}
        value={hiddenFolders}
        onChange={(e) => setHiddenFolders(e.target.value)}
      />
    </div>
  );
}

const SHORTCUT_GROUPS = [
  {
    title: 'Generales',
    items: [
      { keys: ['Ctrl', 'P'], desc: 'Abrir nota (buscador rápido)' },
      { keys: ['Ctrl', 'S'], desc: 'Guardar la nota ahora' },
      { keys: ['Ctrl', 'E'], desc: 'Alternar entre edición y lectura' },
      { keys: ['Ctrl', 'B'], desc: 'Mostrar u ocultar la barra lateral' },
      { keys: ['Esc'], desc: 'Cerrar menús, diálogos y la búsqueda' },
    ],
  },
  {
    title: 'Buscar en la nota',
    items: [
      { keys: ['Ctrl', 'F'], desc: 'Abrir la búsqueda en la nota' },
      { keys: ['Enter'], desc: 'Siguiente resultado (Mayús para el anterior)' },
      { keys: ['F3'], desc: 'Siguiente resultado' },
      { keys: ['Mayús', 'F3'], desc: 'Resultado anterior' },
    ],
  },
  {
    title: 'Abrir nota',
    items: [
      { keys: ['↑', '↓'], desc: 'Moverse por los resultados' },
      { keys: ['Enter'], desc: 'Abrir la nota seleccionada' },
    ],
  },
  {
    title: 'Propiedades',
    items: [
      { keys: ['Enter'], desc: 'Añadir el valor o la propiedad' },
      { keys: [','], desc: 'Añadir el valor en listas y etiquetas' },
      { keys: ['Retroceso'], desc: 'Con el campo vacío, borrar el último valor' },
      { keys: ['Esc'], desc: 'Cancelar una propiedad nueva' },
    ],
  },
];

function ShortcutsSection() {
  return (
    <>
      <div className="setting-desc" style={{ marginBottom: 12 }}>
        En Mac, usa Cmd en lugar de Ctrl.
      </div>
      {SHORTCUT_GROUPS.map((group) => (
        <div className="settings-group" key={group.title}>
          <div className="settings-nav-title">{group.title}</div>
          {group.items.map((item) => (
            <div className="setting-item" key={item.desc}>
              <div className="setting-info">
                <div className="setting-name">{item.desc}</div>
              </div>
              <div className="shortcut-keys">
                {item.keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function AboutSection() {
  return (
    <div className="settings-group">
      <div className="setting-item">
        <div className="setting-info">
          <div className="setting-name">Versión {__APP_VERSION__}</div>
          <div className="setting-desc">Obsidian Web</div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose }: Props) {
  const [section, setSection] = useState('about');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = SECTIONS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="settings-titlebar">
          <span>Preferencias</span>
          <button className="icon-btn" title="Cerrar" onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>
        <div className="settings-body">
          <nav className="settings-sidebar">
            <div className="settings-search">
              <IconSearch size={14} />
              <input
                placeholder="Buscar ajustes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="settings-nav-title">Opciones</div>
            {sections.map(({ id, label, Icon }) => (
              <div
                key={id}
                className={`settings-nav-item ${section === id ? 'active' : ''}`}
                onClick={() => setSection(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <div className="settings-content">
            {section === 'about' && <AboutSection />}
            {section === 'appearance' && <AppearanceSection />}
            {section === 'editor' && <EditorSection />}
            {section === 'files' && <FilesSection />}
            {section === 'shortcuts' && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
