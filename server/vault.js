import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, renameSync, existsSync, copyFileSync, cpSync } from 'fs';
import { join, resolve, relative, dirname, basename, extname, isAbsolute, sep } from 'path';

const guardPath = (vaultPath, userPath) => {
  const root = resolve(vaultPath);
  const resolved = resolve(root, userPath);
  const rel = relative(root, resolved);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Path traversal attempt');
  }
  return resolved;
};

const toVaultPath = (vaultPath, fullPath) => relative(resolve(vaultPath), fullPath).split('\\').join('/');

export const readFile = (vaultPath, filePath) => {
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
