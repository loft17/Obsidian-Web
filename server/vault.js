import { readFileSync, writeFileSync, readdirSync, statSync, lstatSync, realpathSync, mkdirSync, renameSync, existsSync, copyFileSync, cpSync } from 'fs';
import { join, resolve, relative, dirname, basename, extname, isAbsolute, sep } from 'path';

// Como existsSync, pero también cuenta los enlaces simbólicos rotos
const entryExists = (p) => {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
};

const isInside = (root, target) => {
  const rel = relative(root, target);
  return !rel.startsWith('..') && !isAbsolute(rel);
};

const guardPath = (vaultPath, userPath) => {
  const root = resolve(vaultPath);
  const resolved = resolve(root, userPath);
  const rel = relative(root, resolved);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Path traversal attempt');
  }
  // Los enlaces simbólicos no pueden sacar la ruta fuera de la bóveda: se resuelve
  // el ancestro más cercano que exista (la ruta final puede no existir aún al crear).
  // Un enlace roto hace fallar realpathSync, así que tampoco se puede escribir a través de él
  let existing = resolved;
  while (!entryExists(existing) && dirname(existing) !== existing) existing = dirname(existing);
  if (!isInside(realpathSync(root), realpathSync(existing))) {
    throw new Error('Path traversal attempt');
  }
  return resolved;
};

const toVaultPath = (vaultPath, fullPath) => relative(resolve(vaultPath), fullPath).split('\\').join('/');

export const resolveFile = (vaultPath, filePath) => guardPath(vaultPath, filePath);

export const readFile =(vaultPath, filePath) => {
  const fullPath = guardPath(vaultPath, filePath);
  return readFileSync(fullPath, 'utf8');
};

export const writeFile = (vaultPath, filePath, content) => {
  const fullPath = guardPath(vaultPath, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
};

export const deleteFile = (vaultPath, filePath) => {
  const fullPath = guardPath(vaultPath, filePath);
  const trashPath = join(vaultPath, '.trash');
  mkdirSync(trashPath, { recursive: true });
  const fileName = basename(fullPath);
  const timestamp = Date.now();
  const trashFile = join(trashPath, `${fileName}.${timestamp}.deleted`);
  renameSync(fullPath, trashFile);
};

export const renameFile = (vaultPath, oldPath, newPath) => {
  const oldFull = guardPath(vaultPath, oldPath);
  const newFull = guardPath(vaultPath, newPath);
  if (oldFull === newFull) return;
  if (!existsSync(oldFull)) throw new Error('El archivo no existe');
  // Una carpeta no puede moverse dentro de sí misma ni de sus subcarpetas
  if (newFull.toLowerCase().startsWith(oldFull.toLowerCase() + sep)) {
    throw new Error('No se puede mover una carpeta dentro de sí misma');
  }
  // Permite cambiar solo mayúsculas/minúsculas en sistemas que no distinguen
  if (existsSync(newFull) && oldFull.toLowerCase() !== newFull.toLowerCase()) {
    throw new Error('Ya existe un archivo con ese nombre');
  }
  mkdirSync(dirname(newFull), { recursive: true });
  renameSync(oldFull, newFull);
};

// Copia el archivo o carpeta junto al original como "Nombre 1.md", "Nombre 2.md"...
export const copyFile = (vaultPath, filePath) => {
  const srcFull = guardPath(vaultPath, filePath);
  if (!existsSync(srcFull)) throw new Error('El archivo no existe');
  const isDir = statSync(srcFull).isDirectory();
  const ext = isDir ? '' : extname(srcFull);
  const base = basename(srcFull, ext);
  let n = 1;
  let destFull;
  do {
    destFull = join(dirname(srcFull), `${base} ${n}${ext}`);
    n++;
  } while (existsSync(destFull));
  if (isDir) cpSync(srcFull, destFull, { recursive: true });
  else copyFileSync(srcFull, destFull);
  return toVaultPath(vaultPath, destFull);
};

// Ajustes de Obsidian (.obsidian/app.json) compartidos con la app de escritorio
const appConfigPath = (vaultPath) => join(resolve(vaultPath), '.obsidian', 'app.json');

export const readAppConfig = (vaultPath) => {
  try {
    return JSON.parse(readFileSync(appConfigPath(vaultPath), 'utf8'));
  } catch {
    return {};
  }
};

export const updateAppConfig = (vaultPath, changes) => {
  const path = appConfigPath(vaultPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...readAppConfig(vaultPath), ...changes }, null, 2), 'utf8');
};

// Carpeta (ruta dentro del vault) donde se guardan los adjuntos de `notePath`,
// según `attachmentFolderPath` de Obsidian:
//   "/" → raíz · "./" → carpeta de la nota · "./sub" → subcarpeta de la nota · "dir" → carpeta fija
export const attachmentFolder = (vaultPath, notePath) => {
  const setting = String(readAppConfig(vaultPath).attachmentFolderPath ?? '/').trim();
  const noteDir = notePath.split('/').slice(0, -1).join('/');
  let folder;
  if (setting === '' || setting === '/') folder = '';
  else if (setting === '.' || setting === './') folder = noteDir;
  else if (setting.startsWith('./')) folder = [noteDir, setting.slice(2)].filter(Boolean).join('/');
  else folder = setting;
  return folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
};

// Guarda un adjunto sin sobrescribir: "imagen.png", "imagen 1.png"...
export const saveAttachment = (vaultPath, folder, fileName, data) => {
  const safeName = basename(fileName.replace(/\\/g, '/')).replace(/[<>:"|?*\x00-\x1f]/g, '') || 'adjunto';
  const ext = extname(safeName);
  const base = basename(safeName, ext);
  let fullPath = guardPath(vaultPath, folder ? `${folder}/${safeName}` : safeName);
  for (let n = 1; existsSync(fullPath); n++) {
    fullPath = join(dirname(fullPath), `${base} ${n}${ext}`);
  }
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, data);
  return toVaultPath(vaultPath, fullPath);
};

export const createNote = (vaultPath, filePath) => {
  const fullPath = guardPath(vaultPath, filePath);
  if (existsSync(fullPath)) throw new Error('Ya existe un archivo con ese nombre');
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, '', 'utf8');
};

export const createFolder = (vaultPath, folderPath) => {
  const fullPath = guardPath(vaultPath, folderPath);
  if (existsSync(fullPath)) throw new Error('Ya existe una carpeta con ese nombre');
  mkdirSync(fullPath, { recursive: true });
};

export const listTree = (vaultPath) => {
  const tree = [];
  const walk = (dir, parentPath = '') => {
    const items = readdirSync(dir).sort();
    for (const item of items) {
      if (item === '.trash' || item.startsWith('.')) continue;
      const fullPath = join(dir, item);
      // Los enlaces simbólicos no se muestran: podrían apuntar fuera de la bóveda o crear ciclos
      if (lstatSync(fullPath).isSymbolicLink()) continue;
      const stat = statSync(fullPath);
      const path = parentPath ? `${parentPath}/${item}` : item;
      if (stat.isDirectory()) {
        tree.push({ type: 'folder', path, name: item });
        walk(fullPath, path);
      } else if (item.endsWith('.md')) {
        tree.push({ type: 'file', path, name: item });
      } else {
        tree.push({ type: 'other', path, name: item });
      }
    }
  };
  walk(vaultPath);
  return tree;
};
