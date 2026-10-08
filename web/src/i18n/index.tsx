// Traducción de la interfaz. Cada idioma es un diccionario plano clave → texto; `es` es la
// referencia: los demás deben tener exactamente sus mismas claves (lo comprueba TypeScript).
// Los textos admiten variables con {nombre}: t('search.line', { n: 3 })
import { Fragment, useMemo, type ReactNode } from 'react';
import { create } from 'zustand';
import { es } from './es';
import { en } from './en';

export type Lang = 'es' | 'en';
export type MessageKey = keyof typeof es;
export type Messages = Record<MessageKey, string>;
type Params = Record<string, string | number>;

const MESSAGES: Record<Lang, Messages> = { es, en };

// Cada idioma se muestra con su propio nombre en el selector
export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.value === value);

// Sin preferencia guardada: el primer idioma del navegador que esté disponible; si no, inglés
const LANG_KEY = 'lang';
const initialLang = ((): Lang => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // almacenamiento no disponible: se usa el idioma del navegador
  }
  const browser = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .map((l) => l?.slice(0, 2).toLowerCase())
    .find(isLang);
  return browser ?? 'en';
})();

const applyLang = (lang: Lang) => {
  document.documentElement.lang = lang;
};
applyLang(initialLang);

export const useI18n = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: initialLang,
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // almacenamiento no disponible: la preferencia solo dura la sesión
    }
    applyLang(lang);
    set({ lang });
  },
}));

const format = (lang: Lang, key: MessageKey, params?: Params) => {
  const text = MESSAGES[lang][key] ?? es[key] ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
};

export type TFunction = (key: MessageKey, params?: Params) => string;

// Fuera de React (alertas, widgets del editor...): usa el idioma actual en el momento de llamarla
export const t: TFunction = (key, params) => format(useI18n.getState().lang, key, params);

// Idioma actual, también para formatear fechas con toLocaleString
export const getLang = () => useI18n.getState().lang;

// En componentes: vuelve a pintar el componente al cambiar de idioma
export function useT(): TFunction {
  const lang = useI18n((s) => s.lang);
  return useMemo(() => (key, params) => format(lang, key, params), [lang]);
}

// Texto con elementos dentro: las variables {nombre} se sustituyen por nodos de React.
// <Trans k="files.hidden.desc" values={{ example: <code>_*</code> }} />
export function Trans({ k, values }: { k: MessageKey; values: Record<string, ReactNode> }) {
  const lang = useI18n((s) => s.lang);
  const parts = MESSAGES[lang][k].split(/\{(\w+)\}/g);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{i % 2 === 1 ? (part in values ? values[part] : `{${part}}`) : part}</Fragment>
      ))}
    </>
  );
}
