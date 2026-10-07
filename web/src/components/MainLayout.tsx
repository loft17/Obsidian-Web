import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { filesApi } from '../api';
import Ribbon from './Ribbon';
import FileExplorer from './FileExplorer';
import SearchPanel from './SearchPanel';
import Tabs from './Tabs';
import Editor, { flushPendingSave } from './Editor';
import { QuickOpenDialog } from './FileDialogs';
import ReadingView from './ReadingView';
import ImageViewer from './ImageViewer';
import StatusBar from './StatusBar';
import { isImage } from '../attachments';
import NoteMenu from './NoteMenu';
import { IconBook, IconEdit } from './Icons';

export default function MainLayout() {
  const activeTab = useStore((s) => s.activeTab);
  const editMode = useStore((s) => s.editMode);
  const setEditMode = useStore((s) => s.setEditMode);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const sidebarView = useStore((s) => s.sidebarView);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const tree = useStore((s) => s.tree);
  const openFile = useStore((s) => s.openFile);
  const activeIsImage = !!activeTab && isImage(activeTab);

  // Atajos globales: Ctrl/Cmd+P abrir nota, +S guardar, +E editar/leer, +B barra lateral, +Shift+F buscar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.shiftKey) {
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          useStore.setState({ sidebarOpen: true, sidebarView: 'search' });
        }
        return;
      }
      const { activeTab, editMode, setEditMode, toggleSidebar } = useStore.getState();
      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          setQuickOpen(true);
          break;
        case 's':
          e.preventDefault();
          if (activeTab) flushPendingSave(activeTab);
          break;
        case 'e':
          if (!activeTab || isImage(activeTab)) return;
          e.preventDefault();
          setEditMode(!editMode);
          break;
        case 'b':
          e.preventDefault();
          toggleSidebar();
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    // Las imágenes las carga el visor; leerlas como texto las corrompería al autoguardar
    if (isImage(activeTab)) {
      setFileContent('');
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      try {
        const data = await filesApi.readFile(activeTab);
        setFileContent(data.content);
      } catch (err) {
        console.error('Error loading file:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [activeTab]);

  return (
    <div className="app-container">
      <Ribbon />
      <div className="main-content">
        {sidebarOpen && (
          <aside className="sidebar-left">{sidebarView === 'search' ? <SearchPanel /> : <FileExplorer />}</aside>
        )}

        <div className="editor-container">
          <Tabs />
          {activeTab && (
            <div className="breadcrumb">
              <div className="breadcrumb-path">
                {activeTab.replace(/\.md$/i, '').split('/').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="breadcrumb-sep"> / </span>}
                  </span>
                ))}
              </div>
              <div className="breadcrumb-actions">
                {!activeIsImage && (
                  <button
                    className="icon-btn"
                    title={editMode ? 'Cambiar a vista de lectura' : 'Cambiar a edición'}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? <IconBook /> : <IconEdit />}
                  </button>
                )}
                <NoteMenu />
              </div>
            </div>
          )}
          <div className="editor-wrapper">
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                Cargando...
              </div>
            ) : activeTab ? (
              activeIsImage ? (
                <ImageViewer filePath={activeTab} />
              ) : editMode ? (
                <Editor filePath={activeTab} content={fileContent} onContentChange={setFileContent} />
              ) : (
                <ReadingView content={fileContent} filePath={activeTab} />
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-faint)' }}>
                Selecciona un archivo para comenzar
              </div>
            )}
          </div>
          {!activeIsImage && <StatusBar content={fileContent} />}
        </div>
      </div>
      {quickOpen && (
        <QuickOpenDialog
          files={tree.filter((i) => i.type === 'file' && /\.md$/i.test(i.path))}
          onSelect={openFile}
          onClose={() => setQuickOpen(false)}
        />
      )}
    </div>
  );
}
