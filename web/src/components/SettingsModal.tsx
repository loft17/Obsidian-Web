import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { settingsApi } from '../api';
import { IconClose, IconEye, IconFolderNew, IconList, IconSearch, IconUserCircle } from './Icons';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  { id: 'about', label: 'Acerca de', Icon: IconUserCircle },
  { id: 'appearance', label: 'Apariencia', Icon: IconEye },
  { id: 'files', label: 'Archivos', Icon: IconFolderNew },
  { id: 'shortcuts', label: 'Atajos', Icon: IconList },
];

// Los cambios se guardan automáticamente (el store los persiste en localStorage)
function AppearanceSection() {
  const defaultEditMode = useStore((s) => s.defaultEditMode);
  const setDefaultEditMode = useStore((s) => s.setDefaultEditMode);
  return (
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
    </div>
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
            {section === 'files' && <FilesSection />}
            {section === 'shortcuts' && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
