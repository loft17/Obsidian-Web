import { useStore } from '../store';
import { IconClose, IconPlus, IconSidebar } from './Icons';

export default function Tabs() {
  const tabs = useStore((s) => s.tabs);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const removeTab = useStore((s) => s.removeTab);
  const showRibbon = useStore((s) => s.showRibbon);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  return (
    <div className="tabs">
      {/* Sin la cinta, este es el único botón para volver a abrir la barra lateral */}
      {!showRibbon && (
        <button className="icon-btn tabs-sidebar-toggle" title="Mostrar/ocultar barra lateral (Ctrl+B)" onClick={toggleSidebar}>
          <IconSidebar size={16} />
        </button>
      )}
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`tab ${activeTab === tab.path ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.path)}
        >
          <span className="tab-title">{tab.name.replace(/\.md$/i, '')}</span>
          {tab.isDirty && <span className="tab-dirty">●</span>}
          <div
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.path);
            }}
            title="Cerrar"
          >
            <IconClose size={14} />
          </div>
        </div>
      ))}
      <div className="tab-new" title="Nueva pestaña">
        <IconPlus size={16} />
      </div>
    </div>
  );
}
