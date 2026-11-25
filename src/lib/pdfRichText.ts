export interface StyledTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  highlight?: string;
  fontSize: number;
}

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SPAN', 'BR', 'DIV', 'P', 'FONT']);
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT']);

function normalizeColorToHex(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  if (!value || value === 'transparent' || value === 'inherit' || value === 'initial' || value === 'rgba(0, 0, 0, 0)') return undefined;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const hex = [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex}`;
  }
  return undefined;
}

export function sanitizeRichText(html: string): string {
  if (!html.trim()) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';
  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (DROPPED_TAGS.has(tag)) return null;
    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }
    if (tag === 'BR') return doc.createElement('br');
    const target = doc.createElement(tag === 'FONT' ? 'span' : tag.toLowerCase());
    const color = normalizeColorToHex(el.style.color || el.getAttribute('color'));
    if (color) target.style.color = color;
    const bg = normalizeColorToHex(el.style.backgroundColor);
    if (bg) target.style.backgroundColor = bg;
    const sizeMatch = el.style.fontSize.match(/^(\d+(?:\.\d+)?)px$/);
    if (sizeMatch) {
      const px = Math.max(8, Math.min(48, Math.round(Number(sizeMatch[1]))));
      target.style.fontSize = `${px}px`;
    }
    if (el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600) target.style.fontWeight = 'bold';
    if (el.style.fontStyle === 'italic') target.style.fontStyle = 'italic';
    if (el.style.textDecorationLine || el.style.textDecoration) {
      const dec = `${el.style.textDecorationLine} ${el.style.textDecoration}`;
      const parts: string[] = [];
      if (dec.includes('underline')) parts.push('underline');
      if (dec.includes('line-through')) parts.push('line-through');
      if (parts.length) target.style.textDecoration = parts.join(' ');
    }
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) target.appendChild(cleaned);
    });
    return target;
  };
  const out = doc.createElement('div');
  Array.from(root.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) out.appendChild(cleaned);
  });
  return out.innerHTML;
}

export function extractPlainText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

export function parseRichTextRuns(html: string, fallbackText: string, defaultColor: string, defaultSize = 12): StyledTextRun[][] {
  const lines: StyledTextRun[][] = [[]];
  const base: Omit<StyledTextRun, 'text'> = {
    bold: false, italic: false, underline: false, strike: false,
    color: normalizeColorToHex(defaultColor) ?? '#111827', fontSize: defaultSize,
  };
  if (!html.trim()) {
    if (!fallbackText) return [];
    return fallbackText.split('\n').map((line) => [{ ...base, text: line }]);
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return fallbackText ? [[{ ...base, text: fallbackText }]] : [];

  const walk = (node: Node, style: Omit<StyledTextRun, 'text'>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\u00a0/g, ' ');
      if (text) lines[lines.length - 1]?.push({ ...style, text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === 'BR') { lines.push([]); return; }
    const isBlock = (tag === 'DIV' || tag === 'P') && (lines[lines.length - 1]?.length ?? 0) > 0;
    if (isBlock) lines.push([]);
    const next = { ...style };
    if (tag === 'B' || tag === 'STRONG' || el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600) next.bold = true;
    if (tag === 'I' || tag === 'EM' || el.style.fontStyle === 'italic') next.italic = true;
    const dec = `${el.style.textDecorationLine} ${el.style.textDecoration}`;
    if (tag === 'U' || dec.includes('underline')) next.underline = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || dec.includes('line-through')) next.strike = true;
    const color = normalizeColorToHex(el.style.color || el.getAttribute('color'));
    if (color) next.color = color;
    const bg = normalizeColorToHex(el.style.backgroundColor);
    if (bg) next.highlight = bg;
    const sizeMatch = el.style.fontSize.match(/^(\d+(?:\.\d+)?)px$/);
    if (sizeMatch) next.fontSize = Math.max(8, Math.min(48, Number(sizeMatch[1])));
    Array.from(el.childNodes).forEach((child) => walk(child, next));
  };
  Array.from(root.childNodes).forEach((child) => walk(child, base));
  const nonEmpty = lines.filter((line) => line.length > 0);
  return nonEmpty.length ? nonEmpty : fallbackText ? [[{ ...base, text: fallbackText }]] : [];
}