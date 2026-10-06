import { useState } from 'react';
import { useStore } from '../store';
import SettingsModal from './SettingsModal';
import { authApi } from '../api';
import { IconSidebar, IconFolderOpen, IconSearch, IconBookmark, IconSettings, IconLogout } from './Icons';

export default function Ribbon() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const sidebarView = useStore((s) => s.sidebarView);
  const showSidebarView = useStore((s) => s.showSidebarView);

  const handleLogout = async () => {
    await authApi.logout();
    window.location.reload();
  };

  return (
    <div className="ribbon">
      <div className="ribbon-group">
        <div className="ribbon-item" title="Mostrar/ocultar barra lateral" onClick={toggleSidebar}>
          <IconSidebar />
        </div>
        <div
          className={`ribbon-item ${sidebarOpen && sidebarView === 'files' ? 'active' : ''}`}
          title="Archivos"
          onClick={() => showSidebarView('files')}
        >
          <IconFolderOpen />
        </div>
        <div
          className={`ribbon-item ${sidebarOpen && sidebarView === 'search' ? 'active' : ''}`}
          title="Búsqueda (Ctrl+Shift+F)"
          onClick={() => showSidebarView('search')}
        >
          <IconSearch />
        </div>
        <div className="ribbon-item" title="Marcadores">
          <IconBookmark />
        </div>
      </div>

      <div className="ribbon-group bottom">
        <div className="ribbon-item" title="Configuración" onClick={() => setSettingsOpen(true)}>
          <IconSettings />
        </div>
        <div className="ribbon-item" title="Salir" onClick={handleLogout}>
          <IconLogout />
        </div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
