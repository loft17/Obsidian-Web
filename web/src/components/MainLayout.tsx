import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { filesApi } from '../api';
import Ribbon from './Ribbon';
import FileExplorer from './FileExplorer';
import Tabs from './Tabs';
import Editor from './Editor';
import ReadingView from './ReadingView';
import StatusBar from './StatusBar';
import NoteMenu from './NoteMenu';
import { IconBook, IconEdit } from './Icons';

export default function MainLayout() {
  const activeTab = useStore((s) => s.activeTab);
  const editMode = useStore((s) => s.editMode);
  const setEditMode = useStore((s) => s.setEditMode);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTab) return;

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
          <aside className="sidebar-left">
            <FileExplorer />
          </aside>
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
                <button
                  className="icon-btn"
                  title={editMode ? 'Cambiar a vista de lectura' : 'Cambiar a edición'}
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? <IconBook /> : <IconEdit />}
                </button>
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
              editMode ? (
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
          <StatusBar content={fileContent} />
        </div>
      </div>
    </div>
  );
}
