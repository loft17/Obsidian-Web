export type FrontmatterData = Record<string, unknown>;

export interface ParsedNote {
  data: FrontmatterData;
  body: string;
  // Texto original anterior al cuerpo (frontmatter incluido), tal cual está en el fichero
  head: string | null;
  valid: boolean;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const isDateString = (value: unknown): value is string =>
  typeof value === 'string' && DATE_ONLY.test(value);

const FRONTMATTER = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

function parseScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try {
      return JSON.parse(s);
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  if (/^[-+]?(0|[1-9]\d*)(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function splitInline(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = '';
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = '';
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') parts.push(current);
  return parts;
}

// Parser mínimo del YAML habitual de Obsidian: `clave: valor`, listas con guiones y listas en línea.
// Devuelve null si encuentra algo que no sabe representar (mapas anidados, bloques multilínea...)
function parseYaml(text: string): FrontmatterData | null {
  const data: FrontmatterData = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = /^([^\s#\-][^:]*?):(?:[ \t]+(.*))?$/.exec(line);
    if (!m) return null;
    const key = m[1].trim();
    let rest = (m[2] ?? '').trim();
    if (!/^["']/.test(rest)) rest = rest.replace(/\s+#.*$/, '');

    if (rest === '') {
      const items: unknown[] = [];
      while (i < lines.length && /^\s*-(\s|$)/.test(lines[i])) {
        items.push(parseScalar(lines[i].replace(/^\s*-\s?/, '').replace(/\s+#.*$/, '')));
        i++;
      }
      if (i < lines.length && /^\s+\S/.test(lines[i])) return null;
      data[key] = items.length > 0 ? items : null;
    } else if (rest.startsWith('[')) {
      if (!rest.endsWith(']')) return null;
      data[key] = splitInline(rest.slice(1, -1)).map(parseScalar);
    } else if (/^[{|>&*!]/.test(rest)) {
      return null;
    } else {
      data[key] = parseScalar(rest);
    }
  }
  return data;
}

export function parseNote(content: string): ParsedNote {
  const match = FRONTMATTER.exec(content);
  if (!match) return { data: {}, body: content, head: '', valid: true };
  const data = parseYaml(match[1] ?? '');
  if (!data) return { data: {}, body: content, head: '', valid: false };
  return { data, body: content.slice(match[0].length), head: match[0], valid: true };
}

function needsQuotes(s: string): boolean {
  if (s === '' || s !== s.trim()) return true;
  if (/[\n\r\t]/.test(s)) return true;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true;
  if (/: |\s#|:$/.test(s)) return true;
  if (/^(true|false|null|yes|no|on|off|y|n|~)$/i.test(s)) return true;
  if (/^[-+]?[\d.][\d._eE+\-:]*$/.test(s) && !DATE_ONLY.test(s)) return true;
  return false;
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return needsQuotes(value) ? JSON.stringify(value) : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function stringifyFrontmatter(data: FrontmatterData): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${scalar(item)}`);
      }
    } else {
      const text = scalar(value);
      lines.push(text === '' && value == null ? `${key}:` : `${key}: ${text}`);
    }
  }
  return lines.join('\n');
}

export function composeNote(data: FrontmatterData, body: string): string {
  const yaml = stringifyFrontmatter(data);
  return yaml ? `---\n${yaml}\n---\n${body}` : body;
}
