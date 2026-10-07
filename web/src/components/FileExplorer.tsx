import { useState, useEffect, useRef } from 'react';
import { useStore, isUnder, hiddenMatchers, isHiddenPath } from '../store';
import { filesApi } from '../api';
import { flushPendingSave, cancelPendingSave } from './Editor';
import { RenameDialog, MoveDialog, DeleteFileDialog } from './FileDialogs';
import { IconChevronRight, IconChevronDown, IconCollapseAll, IconFileNew, IconFolderNew } from './Icons';

interface TreeItem {
  type: 'folder' | 'file' | 'other';
  path: string;
  name: string;
}

type Grouped = Map<string, TreeItem[]>;

const displayName = (item: TreeItem) =>
  item.type === 'file' ? item.name.replace(/\.md$/i, '') : item.name;

function buildTree(items: TreeItem[]) {
  const grouped: Grouped = new Map();
  const roots: TreeItem[] = [];

  for (const item of items) {
    const idx = item.path.lastIndexOf('/');
    const parentPath = idx >= 0 ? item.path.substring(0, idx) : '';
    if (!parentPath) {
      roots.push(item);
    } else {
      if (!grouped.has(parentPath)) grouped.set(parentPath, []);
      grouped.get(parentPath)!.push(item);
    }
  }

  const sort = (list: TreeItem[]) =>
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  sort(roots);
  grouped.forEach((list) => sort(list));

  return { roots, grouped };
}

function FileTreeNode({
  item,
  grouped,
  expandedFolders,
  onToggle,
  onSelect,
  onContextMenu,
  depth,
}: {
  item: TreeItem;
  grouped: Grouped;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  depth: number;
}) {
  const activeTab = useStore((s) => s.activeTab);
  const isFolder = item.type === 'folder';
  const isExpanded = expandedFolders.has(item.path);
  const children = grouped.get(item.path) ?? [];

  return (
    <div className="tree-node">
      <div
        className={`tree-item ${isFolder ? 'folder' : 'file'} ${activeTab === item.path ? 'active' : ''}`}
        style={{ paddingLeft: '8px' }}
        onClick={() => (isFolder ? onToggle(item.path) : onSelect(item.path))}
        onContextMenu={(e) => onContextMenu(e, item.path, isFolder)}
      >
        {isFolder && (
          <span className="tree-chevron">
            {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </span>
        )}
        <span className="tree-label">{displayName(item)}</span>
      </div>

      {isFolder && isExpanded && children.length > 0 && (
        <div className="tree-children" style={{ marginLeft: '14px' }}>
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              item={child}
              grouped={grouped}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer() {
  const tree = useStore((s) => s.tree);
  const hiddenFolders = useStore((s) => s.hiddenFolders);
  const toggleFolder = useStore((s) => s.toggleFolder);
  const collapseAll = useStore((s) => s.collapseAll);
  const expandedFolders = useStore((s) => s.expandedFolders);
  const setTree = useStore((s) => s.setTree);
  const addTab = useStore((s) => s.addTab);
  const openFile = useStore((s) => s.openFile);
  const renameTab = useStore((s) => s.renameTab);
  const removeTab = useStore((s) => s.removeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const [menu, setMenu] = useState<{ x: number; y: number; path: string; isFolder: boolean } | null>(null);
  const [dialog, setDialog] = useState<{
    kind: 'rename' | 'move' | 'delete' | 'new-note' | 'new-folder';
    path: string;
    isFolder?: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fileName = (path: string) => path.split('/').pop() || path;
  const parentFolder = (path: string) => (path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '');

  const refreshTree = async () => setTree(await filesApi.getTree());

  const handleSelect = (path: string) => openFile(path, fileName(path));

  const handleOpenInNewTab = (path: string) => {
    addTab(path, fileName(path));
    setActiveTab(path);
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isFolder: boolean) => {
    e.preventDefault();
    // Mantener el menú dentro de la ventana
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 240);
    setMenu({ x, y, path, isFolder });
  };

  const runMenuAction = (action: (path: string) => void) => {
    if (!menu) return;
    const path = menu.path;
    setMenu(null);
    action(path);
  };

  const openDialog = (kind: NonNullable<typeof dialog>['kind']) =>
    runMenuAction((path) => setDialog({ kind, path, isFolder: menu?.isFolder }));

  const expandFolder = (path: string) => {
    if (!useStore.getState().expandedFolders.has(path)) toggleFolder(path);
  };

  // folder '' es la raíz de la bóveda
  const handleNewNote = async (folder: string, name: string) => {
    const path = `${folder ? folder + '/' : ''}${name}${/\.md$/i.test(name) ? '' : '.md'}`;
    await filesApi.createNote(path);
    await refreshTree();
    if (folder) expandFolder(folder);
    openFile(path, fileName(path));
    setDialog(null);
  };

  const handleNewFolder = async (folder: string, name: string) => {
    await filesApi.createFolder(`${folder ? folder + '/' : ''}${name}`);
    await refreshTree();
    if (folder) expandFolder(folder);
    setDialog(null);
  };

  const handleCopy = async (path: string) => {
    try {
      await flushPendingSave(path);
      await filesApi.copyFile(path);
      await refreshTree();
    } catch (err) {
      alert(`No se pudo copiar: ${(err as Error).message}`);
    }
  };

  // Renombrar y mover son el mismo cambio de ruta en el servidor
  const changePath = async (oldPath: string, newPath: string) => {
    await flushPendingSave(oldPath);
    await filesApi.renameFile(oldPath, newPath);
    renameTab(oldPath, newPath);
    await refreshTree();
    setDialog(null);
  };

  const handleRename = (oldPath: string, newName: string, isFolder?: boolean) => {
    const ext = !isFolder && /\.md$/i.test(oldPath) && !/\.md$/i.test(newName) ? '.md' : '';
    const folder = parentFolder(oldPath);
    return changePath(oldPath, `${folder ? folder + '/' : ''}${newName}${ext}`);
  };

  const handleMove = (oldPath: string, folder: string) =>
    changePath(oldPath, `${folder ? folder + '/' : ''}${fileName(oldPath)}`);

  const handleDelete = async (path: string, images: string[]) => {
    cancelPendingSave(path);
    await filesApi.deleteFile(path);
    removeTab(path);
    for (const image of images) {
      await filesApi.deleteFile(image);
      removeTab(image);
    }
    await refreshTree();
    setDialog(null);
  };

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const matchers = hiddenMatchers(hiddenFolders);
  const visibleTree = matchers.length
    ? tree.filter((item) => !isHiddenPath(item.path, item.type === 'folder', matchers))
    : tree;
  const { roots, grouped } = buildTree(visibleTree);

  return (
    <>
      <div className="sidebar-toolbar">
        <button className="icon-btn" title="Crear nota" onClick={() => setDialog({ kind: 'new-note', path: '' })}>
          <IconFileNew size={16} />
        </button>
        <button className="icon-btn" title="Crear carpeta" onClick={() => setDialog({ kind: 'new-folder', path: '' })}>
          <IconFolderNew size={16} />
        </button>
        <button className="icon-btn" title="Contraer todo" onClick={collapseAll}>
          <IconCollapseAll size={16} />
        </button>
      </div>
      <div className="file-explorer">
        {roots.map((item) => (
          <FileTreeNode
            key={item.path}
            item={item}
            grouped={grouped}
            expandedFolders={expandedFolders}
            onToggle={toggleFolder}
            onSelect={handleSelect}
            onContextMenu={handleContextMenu}
            depth={0}
          />
        ))}
      </div>
      {menu && (
        <div ref={menuRef} className="context-menu" style={{ top: menu.y, left: menu.x }}>
          {menu.isFolder ? (
            <>
              <div className="dropdown-item" onClick={() => openDialog('new-note')}>
                Nueva nota
              </div>
              <div className="dropdown-item" onClick={() => openDialog('new-folder')}>
                Nueva carpeta
              </div>
            </>
          ) : (
            <div className="dropdown-item" onClick={() => runMenuAction(handleOpenInNewTab)}>
              Abrir en pestaña nueva
            </div>
          )}
          <hr className="dropdown-divider" />
          <div className="dropdown-item" onClick={() => runMenuAction(handleCopy)}>
            Hacer una copia
          </div>
          <div className="dropdown-item" onClick={() => openDialog('move')}>
            {menu.isFolder ? 'Mover carpeta a...' : 'Mover archivo a...'}
          </div>
          <div className="dropdown-item" onClick={() => openDialog('rename')}>
            Renombrar
          </div>
          <hr className="dropdown-divider" />
          <div className="dropdown-item danger" onClick={() => openDialog('delete')}>
            Borrar
          </div>
        </div>
      )}
      {(dialog?.kind === 'new-note' || dialog?.kind === 'new-folder') && (
        <RenameDialog
          title={dialog.kind === 'new-note' ? 'Nueva nota' : 'Nueva carpeta'}
          confirmLabel="Crear"
          placeholder={dialog.kind === 'new-note' ? 'Nombre de la nota' : 'Nombre de la carpeta'}
          initialName=""
          onSubmit={(name) =>
            dialog.kind === 'new-note' ? handleNewNote(dialog.path, name) : handleNewFolder(dialog.path, name)
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'rename' && (
        <RenameDialog
          initialName={displayName({
            type: dialog.isFolder ? 'folder' : /\.md$/i.test(dialog.path) ? 'file' : 'other',
            path: dialog.path,
            name: fileName(dialog.path),
          })}
          onSubmit={(name) => handleRename(dialog.path, name, dialog.isFolder)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'move' && (
        <MoveDialog
          title={dialog.isFolder ? 'Mover carpeta a...' : 'Mover archivo a...'}
          folders={tree
            .filter((i) => i.type === 'folder' && !(dialog.isFolder && isUnder(i.path, dialog.path)))
            .map((i) => i.path)
            .sort((a, b) => a.localeCompare(b))}
          currentFolder={parentFolder(dialog.path)}
          onSubmit={(folder) => handleMove(dialog.path, folder)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteFileDialog
          path={dialog.path}
          isFolder={dialog.isFolder}
          title={dialog.isFolder ? 'Borrar carpeta' : 'Borrar archivo'}
          confirmLabel="Borrar"
          onDelete={(images) => handleDelete(dialog.path, images)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
