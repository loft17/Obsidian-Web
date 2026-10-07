import { create } from 'zustand';

interface TreeItem {
  type: 'folder' | 'file' | 'other';
  path: string;
  name: string;
}

interface Tab {
  path: string;
  name: string;
  isDirty: boolean;
}

interface AppStore {
  hiddenFolders: string;
  setHiddenFolders: (value: string) => void;
  tree: TreeItem[];
  setTree: (tree: TreeItem[]) => void;
  tabs: Tab[];
  addTab: (path: string, name: string) => void;
  openFile: (path: string, name: string) => void;
  renameTab: (oldPath: string, newPath: string) => void;
  removeTab: (path: string) => void;
  activeTab: string | null;
  setActiveTab: (path: string | null) => void;
  setTabDirty: (path: string, isDirty: boolean) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  defaultEditMode: boolean;
  setDefaultEditMode: (mode: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  collapseAll: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarView: SidebarView;
  showSidebarView: (view: SidebarView) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchTag: (tag: string) => void;
}

export type SidebarView = 'files' | 'search';

// true si `path` es `base` o está dentro de la carpeta `base`
export const isUnder = (path: string, base: string) => path === base || path.startsWith(base + '/');

const DEFAULT_MODE_KEY = 'defaultNoteMode';
const initialDefaultEditMode = (() => {
  try {
    return localStorage.getItem(DEFAULT_MODE_KEY) !== 'view';
  } catch {
    return true;
  }
})();

export type Theme = 'dark' | 'light' | 'system';

// Debe coincidir con el script en línea de index.html, que aplica el tema antes de pintar
const THEME_KEY = 'theme';
const initialTheme = ((): Theme => {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'system' ? value : 'dark';
  } catch {
    return 'dark';
  }
})();

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = (theme: Theme) => {
  const resolved = theme === 'system' ? (systemDark.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
};

applyTheme(initialTheme);
// En modo "sistema", seguir los cambios del sistema operativo en caliente
systemDark.addEventListener('change', () => applyTheme(useStore.getState().theme));

const HIDDEN_KEY = 'hiddenFolders';
const initialHiddenFolders = (() => {
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? '';
  } catch {
    return '';
  }
})();

// Un patrón por línea; `*` es comodín. Se compara con el nombre de cada carpeta (sin distinguir mayúsculas)
export const hiddenMatchers = (patterns: string): RegExp[] =>
  patterns
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i'));

// true si alguna carpeta de la ruta coincide con los patrones ocultos
export const isHiddenPath = (path: string, isFolder: boolean, matchers: RegExp[]) => {
  const segments = path.split('/');
  const folders = isFolder ? segments : segments.slice(0, -1);
  return folders.some((name) => matchers.some((re) => re.test(name)));
};

export const useStore =create<AppStore>((set) => ({
  hiddenFolders: initialHiddenFolders,
  setHiddenFolders: (value) => {
    try {
      localStorage.setItem(HIDDEN_KEY, value);
    } catch {
      // almacenamiento no disponible: la preferencia solo dura la sesión
    }
    set({ hiddenFolders: value });
  },
  tree: [],
  setTree: (tree) => set({ tree }),
  tabs: [],
  addTab: (path, name) =>
    set((state) => {
      if (state.tabs.find((t) => t.path === path)) return state;
      return { tabs: [...state.tabs, { path, name, isDirty: false }] };
    }),
  openFile: (path, name) =>
    set((state) => {
      // Ya abierto en alguna pestaña: solo activarla
      if (state.tabs.find((t) => t.path === path)) return { activeTab: path };
      const tab = { path, name, isDirty: false };
      const idx = state.tabs.findIndex((t) => t.path === state.activeTab);
      const editMode = state.defaultEditMode;
      // Sin pestaña activa: crear una; si no, reemplazar la activa
      if (idx < 0) return { tabs: [...state.tabs, tab], activeTab: path, editMode };
      const tabs = [...state.tabs];
      tabs[idx] = tab;
      return { tabs, activeTab: path, editMode };
    }),
  // Si la ruta es una carpeta, afecta también a todo lo que contiene
  renameTab: (oldPath, newPath) =>
    set((state) => {
      const move = (p: string) => (isUnder(p, oldPath) ? newPath + p.substring(oldPath.length) : p);
      return {
        tabs: state.tabs.map((t) => {
          if (!isUnder(t.path, oldPath)) return t;
          const path = move(t.path);
          return { ...t, path, name: path.split('/').pop() || path };
        }),
        activeTab: state.activeTab && move(state.activeTab),
        expandedFolders: new Set([...state.expandedFolders].map(move)),
      };
    }),
  removeTab: (path) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => !isUnder(t.path, path)),
      activeTab: state.activeTab && isUnder(state.activeTab, path) ? null : state.activeTab,
    })),
  activeTab: null,
  setActiveTab: (path) => set({ activeTab: path }),
  setTabDirty: (path, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, isDirty } : t)),
    })),
  editMode: initialDefaultEditMode,
  setEditMode: (mode) => set({ editMode: mode }),
  defaultEditMode: initialDefaultEditMode,
  setDefaultEditMode: (mode) => {
    try {
      localStorage.setItem(DEFAULT_MODE_KEY, mode ? 'edit' : 'view');
    } catch {
      // almacenamiento no disponible: la preferencia solo dura la sesión
    }
    set({ defaultEditMode: mode });
  },
  theme: initialTheme,
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // almacenamiento no disponible: la preferencia solo dura la sesión
    }
    applyTheme(theme);
    set({ theme });
  },
  expandedFolders: new Set(),
  collapseAll: () => set({ expandedFolders: new Set() }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  sidebarView: 'files',
  // Pulsar la vista que ya está abierta cierra la barra lateral, como en Obsidian
  showSidebarView: (view) =>
    set((state) =>
      state.sidebarOpen && state.sidebarView === view
        ? { sidebarOpen: false }
        : { sidebarOpen: true, sidebarView: view }
    ),
  // Se conserva la última búsqueda al cambiar entre vistas de la barra lateral
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchTag: (tag) =>
    set({ sidebarOpen: true, sidebarView: 'search', searchQuery: `tag:${tag.replace(/^#/, '')}` }),
  toggleFolder: (path) =>
    set((state) => {
      const expanded = new Set(state.expandedFolders);
      if (expanded.has(path)) {
        expanded.delete(path);
      } else {
        expanded.add(path);
      }
      return { expandedFolders: expanded };
    }),
}));
