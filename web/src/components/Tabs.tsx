import { useStore } from '../store';
import { IconClose, IconPlus } from './Icons';

export default function Tabs() {
  const tabs = useStore((s) => s.tabs);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const removeTab = useStore((s) => s.removeTab);

  return (
    <div className="tabs">
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
