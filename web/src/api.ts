const API_URL = '/api';

export const setupApi = {
  checkStatus: async () => {
    const res = await fetch(`${API_URL}/setup/status`);
    return res.json();
  },
  init: async (setupToken: string, vaultPath: string, password: string, port: number = 3000) => {
    const res = await fetch(`${API_URL}/setup/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupToken, vaultPath, password, port }),
    });
    return res.json();
  },
};

export const authApi = {
  login: async (password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    // El formulario muestra `error` (contraseña incorrecta, demasiados intentos...)
    if (!res.ok) throw await res.json().catch(() => ({}));
    return res.json();
  },
  logout: async () => {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
    });
    return res.json();
  },
};

export const filesApi = {
  getTree: async () => {
    const res = await fetch(`${API_URL}/files/tree`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  readFile: async (filePath: string) => {
    const res = await fetch(`${API_URL}/files/read/${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  writeFile: async (filePath: string, content: string) => {
    const res = await fetch(`${API_URL}/files/write/${encodeURIComponent(filePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  deleteFile: async (filePath: string) => {
    const res = await fetch(`${API_URL}/files/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  renameFile: async (oldPath: string, newPath: string) => {
    const res = await fetch(`${API_URL}/files/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  copyFile: async (path: string): Promise<{ path: string }> => {
    const res = await fetch(`${API_URL}/files/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  createNote: async (path: string) => {
    const res = await fetch(`${API_URL}/files/create-note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  // Devuelve la ruta dentro del vault donde se ha guardado el adjunto
  uploadAttachment: async (notePath: string, file: Blob, name: string): Promise<{ path: string }> => {
    const params = new URLSearchParams({ note: notePath, name });
    const res = await fetch(`${API_URL}/files/upload?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  createFolder: async (path: string) => {
    const res = await fetch(`${API_URL}/files/create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export const settingsApi = {
  getVault: async (): Promise<{ vaultPath: string }> => {
    const res = await fetch(`${API_URL}/settings/vault`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  setVault: async (vaultPath: string): Promise<{ vaultPath: string }> => {
    const res = await fetch(`${API_URL}/settings/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  getAttachments: async (): Promise<{ attachmentFolderPath: string }> => {
    const res = await fetch(`${API_URL}/settings/attachments`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  setAttachments: async (attachmentFolderPath: string): Promise<{ attachmentFolderPath: string }> => {
    const res = await fetch(`${API_URL}/settings/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachmentFolderPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};

export interface SearchMatch {
  line: number;
  text: string;
  start: number;
  length: number;
}

export interface SearchResult {
  path: string;
  name: string;
  nameMatch: boolean;
  total: number;
  matches: SearchMatch[];
}

export const searchApi = {
  search: async (q: string, signal?: AbortSignal): Promise<SearchResult[]> => {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
};
