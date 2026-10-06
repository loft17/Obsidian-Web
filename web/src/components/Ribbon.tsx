import { useStore } from '../store';
import { authApi } from '../api';
import { IconSidebar, IconFolderOpen, IconSearch, IconBookmark, IconSettings, IconLogout } from './Icons';

export default function Ribbon() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

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
        <div className={`ribbon-item ${sidebarOpen ? 'active' : ''}`} title="Archivos" onClick={toggleSidebar}>
          <IconFolderOpen />
        </div>
        <div className="ribbon-item" title="Búsqueda" onClick={() => console.log('TODO: search')}>
          <IconSearch />
        </div>
        <div className="ribbon-item" title="Marcadores">
          <IconBookmark />
        </div>
      </div>

      <div className="ribbon-group bottom">
        <div className="ribbon-item" title="Configuración" onClick={() => console.log('TODO: settings')}>
          <IconSettings />
        </div>
        <div className="ribbon-item" title="Salir" onClick={handleLogout}>
          <IconLogout />
        </div>
      </div>
    </div>
  );
}
