import { useStore } from '../store';
import { authApi } from '../api';
import { IconSidebar, IconFolderOpen, IconSearch, IconTag, IconBookmark, IconSettings, IconLogout } from './Icons';

export const logout = async () => {
  await authApi.logout();
  window.location.reload();
};

export default function Ribbon() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const sidebarView = useStore((s) => s.sidebarView);
  const showSidebarView = useStore((s) => s.showSidebarView);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

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
        <div
          className={`ribbon-item ${sidebarOpen && sidebarView === 'tags' ? 'active' : ''}`}
          title="Etiquetas"
          onClick={() => showSidebarView('tags')}
        >
          <IconTag />
        </div>
        <div className="ribbon-item" title="Marcadores">
          <IconBookmark />
        </div>
      </div>

      <div className="ribbon-group bottom">
        <div className="ribbon-item" title="Configuración" onClick={() => setSettingsOpen(true)}>
          <IconSettings />
        </div>
        <div className="ribbon-item" title="Salir" onClick={logout}>
          <IconLogout />
        </div>
      </div>
    </div>
  );
}

// Con la cinta oculta, sus botones pasan al pie de la barra lateral
export function SidebarFooter() {
  const sidebarView = useStore((s) => s.sidebarView);
  const showSidebarView = useStore((s) => s.showSidebarView);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  return (
    <div className="sidebar-footer">
      <button
        className={`icon-btn ${sidebarView === 'files' ? 'active' : ''}`}
        title="Archivos"
        onClick={() => showSidebarView('files')}
      >
        <IconFolderOpen size={16} />
      </button>
      <button
        className={`icon-btn ${sidebarView === 'search' ? 'active' : ''}`}
        title="Búsqueda (Ctrl+Shift+F)"
        onClick={() => showSidebarView('search')}
      >
        <IconSearch size={16} />
      </button>
      <button
        className={`icon-btn ${sidebarView === 'tags' ? 'active' : ''}`}
        title="Etiquetas"
        onClick={() => showSidebarView('tags')}
      >
        <IconTag size={16} />
      </button>
      <span className="sidebar-footer-spacer" />
      <button className="icon-btn" title="Configuración" onClick={() => setSettingsOpen(true)}>
        <IconSettings size={16} />
      </button>
      <button className="icon-btn" title="Salir" onClick={logout}>
        <IconLogout size={16} />
      </button>
    </div>
  );
}
