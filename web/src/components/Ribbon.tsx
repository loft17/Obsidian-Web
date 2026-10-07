import { useState } from 'react';
import { useStore } from '../store';
import { authApi, filesApi, settingsApi } from '../api';
import { isImage } from '../attachments';
import { openDailyNote, templateFiles, applyTemplate } from '../templates';
import { insertIntoNote } from './Editor';
import { QuickOpenDialog } from './FileDialogs';
import { IconSidebar, IconFolderOpen, IconSearch, IconTag, IconCalendarDays, IconTemplate, IconTrash, IconSettings, IconLogout } from './Icons';

export const logout = async () => {
  await authApi.logout();
  window.location.reload();
};

const openToday = () =>
  openDailyNote().catch((err) => alert(`No se pudo abrir la nota diaria: ${(err as Error).message}`));

// "Insertar plantilla": elige una nota de la carpeta de plantillas y la inserta en el cursor de la nota abierta
function useTemplatePicker() {
  const [picker, setPicker] = useState<{ folder: string; files: { path: string; name: string }[] } | null>(null);

  const open = async () => {
    const { activeTab, setTree } = useStore.getState();
    if (!activeTab || isImage(activeTab)) return alert('Abre una nota para insertar una plantilla.');
    try {
      const { templates } = await settingsApi.getNotes();
      if (!templates.folder) {
        return alert('Configura la carpeta de plantillas en Preferencias → Archivos.');
      }
      const tree = await filesApi.getTree();
      setTree(tree);
      setPicker({ folder: templates.folder, files: templateFiles(tree, templates.folder) });
    } catch (err) {
      alert(`No se pudieron cargar las plantillas: ${(err as Error).message}`);
    }
  };

  const insert = async (path: string) => {
    const { activeTab } = useStore.getState();
    if (!activeTab) return;
    try {
      const [{ content }, { templates }] = await Promise.all([filesApi.readFile(path), settingsApi.getNotes()]);
      const title = (activeTab.split('/').pop() || activeTab).replace(/\.md$/i, '');
      insertIntoNote(applyTemplate(content, title, templates));
    } catch (err) {
      alert(`No se pudo insertar la plantilla: ${(err as Error).message}`);
    }
  };

  const dialog = picker && (
    <QuickOpenDialog
      files={picker.files}
      title="Insertar plantilla"
      placeholder="Buscar plantilla..."
      emptyText={`No hay plantillas en la carpeta "${picker.folder}"`}
      label={(path) => path.slice(picker.folder.replace(/^\/+|\/+$/g, '').length + 1).replace(/\.md$/i, '')}
      onSelect={insert}
      onClose={() => setPicker(null)}
    />
  );

  return { open, dialog };
}

export default function Ribbon() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const sidebarView = useStore((s) => s.sidebarView);
  const showSidebarView = useStore((s) => s.showSidebarView);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const templates = useTemplatePicker();

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
        <div
          className={`ribbon-item ${sidebarOpen && sidebarView === 'trash' ? 'active' : ''}`}
          title="Papelera"
          onClick={() => showSidebarView('trash')}
        >
          <IconTrash />
        </div>
        <div className="ribbon-item" title="Abrir la nota diaria de hoy" onClick={openToday}>
          <IconCalendarDays />
        </div>
        <div className="ribbon-item" title="Insertar plantilla" onClick={templates.open}>
          <IconTemplate />
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
      {templates.dialog}
    </div>
  );
}

// Con la cinta oculta, sus botones pasan al pie de la barra lateral
export function SidebarFooter() {
  const sidebarView = useStore((s) => s.sidebarView);
  const showSidebarView = useStore((s) => s.showSidebarView);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const templates = useTemplatePicker();

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
      <button
        className={`icon-btn ${sidebarView === 'trash' ? 'active' : ''}`}
        title="Papelera"
        onClick={() => showSidebarView('trash')}
      >
        <IconTrash size={16} />
      </button>
      <button className="icon-btn" title="Abrir la nota diaria de hoy" onClick={openToday}>
        <IconCalendarDays size={16} />
      </button>
      <button className="icon-btn" title="Insertar plantilla" onClick={templates.open}>
        <IconTemplate size={16} />
      </button>
      <span className="sidebar-footer-spacer" />
      <button className="icon-btn" title="Configuración" onClick={() => setSettingsOpen(true)}>
        <IconSettings size={16} />
      </button>
      <button className="icon-btn" title="Salir" onClick={logout}>
        <IconLogout size={16} />
      </button>
      {templates.dialog}
    </div>
  );
}
