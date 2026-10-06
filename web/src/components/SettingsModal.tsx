import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { IconClose, IconEye, IconSearch, IconUserCircle } from './Icons';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  { id: 'about', label: 'Acerca de', Icon: IconUserCircle },
  { id: 'appearance', label: 'Apariencia', Icon: IconEye },
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
          </div>
        </div>
      </div>
    </div>
  );
}
