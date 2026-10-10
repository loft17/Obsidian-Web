import { create } from 'zustand';

// Fuentes de la carpeta fonts/ del servidor: se registran con @font-face al entrar en la app
interface ServerFont {
  file: string;
  family: string;
  weight: string;
  style: string;
}

interface ServerFontsStore {
  families: string[];
}

export const useServerFonts = create<ServerFontsStore>(() => ({ families: [] }));

const STYLE_ID = 'server-fonts';

const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

const fontFace = (f: ServerFont) => {
  const ext = f.file.split('.').pop()!.toLowerCase();
  const url = `/api/fonts/file/${encodeURIComponent(f.file)}`;
  return `@font-face {
  font-family: "${f.family}";
  src: url("${url}") format("${FORMATS[ext]}");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`;
};

// Sin sesión o con un servidor antiguo simplemente no hay fuentes propias
export const loadServerFonts = async () => {
  let fonts: ServerFont[];
  try {
    const res = await fetch('/api/fonts');
    if (!res.ok) return;
    fonts = await res.json();
  } catch {
    return;
  }
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = fonts.map(fontFace).join('\n');
  useServerFonts.setState({ families: [...new Set(fonts.map((f) => f.family))] });
};
