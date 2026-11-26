import { normalizeColorToHex } from './pdfRichText';

export const DEFAULT_RICH_FONT_SIZE = 12;
export const ZERO_WIDTH_SPACE = '\u200B';

const INLINE_TAGS = new Set(['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'FONT']);

export interface RichTextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color?: string;
  highlight?: string;
  fontSize: number;
}

export interface RichTextFormatPatch {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string | null;
  highlight?: string | null;
  fontSize?: number;
}

export interface RichTextSelectionState {
  bold: boolean | 'mixed';
  italic: boolean | 'mixed';
  underline: boolean | 'mixed';
  strike: boolean | 'mixed';
  color: string | 'mixed' | null;
  highlight: string | 'mixed' | null;
  fontSize: number | 'mixed';
  hasSelection: boolean;
}

export const DEFAULT_SELECTION_STATE: RichTextSelectionState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: null,
  highlight: null,
  fontSize: DEFAULT_RICH_FONT_SIZE,
  hasSelection: false,
};

export function getEffectiveFormat(node: Node, editor: HTMLElement): RichTextFormat {
  const ancestors: HTMLElement[] = [];
  let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== editor) {
    if (current.nodeType === Node.ELEMENT_NODE) ancestors.push(current as HTMLElement);
    current = current.parentNode;
  }
  ancestors.reverse();

  const format: RichTextFormat = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    color: undefined,
    highlight: undefined,
    fontSize: DEFAULT_RICH_FONT_SIZE,
  };

  for (const el of ancestors) {
    const tag = el.tagName.toUpperCase();
    if (tag === 'B' || tag === 'STRONG' || el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600) {
      format.bold = true;
    } else if (el.style.fontWeight === 'normal' || el.style.fontWeight === '400') {
      format.bold = false;
    }
    if (tag === 'I' || tag === 'EM' || el.style.fontStyle === 'italic') {
      format.italic = true;
    } else if (el.style.fontStyle === 'normal') {
      format.italic = false;
    }
    const dec = `${el.style.textDecorationLine} ${el.style.textDecoration}`.trim();
    if (dec === 'none') {
      format.underline = false;
      format.strike = false;
    } else {
      if (tag === 'U' || dec.includes('underline')) format.underline = true;
      if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || dec.includes('line-through')) format.strike = true;
    }
    const color = normalizeColorToHex(el.style.color || el.getAttribute('color'));
    if (color) format.color = color;
    const bg = normalizeColorToHex(el.style.backgroundColor);
    if (bg) format.highlight = bg;
    else if (el.style.backgroundColor === 'transparent') format.highlight = undefined;
    const sizeMatch = el.style.fontSize.match(/^(\d+(?:\.\d+)?)px$/);
    if (sizeMatch) format.fontSize = Math.max(8, Math.min(48, Math.round(Number(sizeMatch[1]))));
  }

  return format;
}

function textNodeHasSelectedChars(node: Text, range: Range): boolean {
  if (node.data.length === 0) return false;
  if (node === range.startContainer && node === range.endContainer) {
    return range.endOffset > range.startOffset;
  }
  if (node === range.startContainer) return range.startOffset < node.data.length;
  if (node === range.endContainer) return range.endOffset > 0;
  const nodeRange = node.ownerDocument.createRange();
  nodeRange.selectNodeContents(node);
  return (
    range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0
    && range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
  );
}

function collectTextNodes(editor: HTMLElement): Text[] {
  const result: Text[] = [];
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    result.push(current as Text);
    current = walker.nextNode();
  }
  return result;
}

function aggregateValue<T>(values: T[]): T | 'mixed' {
  const first = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== first) return 'mixed';
  }
  return first as T;
}

export function getSelectionFormatState(editor: HTMLElement, range: Range | null): RichTextSelectionState {
  if (!range || !editor.contains(range.commonAncestorContainer)) {
    return DEFAULT_SELECTION_STATE;
  }
  if (range.collapsed) {
    const fmt = getEffectiveFormat(range.startContainer, editor);
    return {
      bold: fmt.bold,
      italic: fmt.italic,
      underline: fmt.underline,
      strike: fmt.strike,
      color: fmt.color ?? null,
      highlight: fmt.highlight ?? null,
      fontSize: fmt.fontSize,
      hasSelection: false,
    };
  }
  const textNodes = collectTextNodes(editor).filter(
    (node) => node.data.replace(/\u200B/g, '').length > 0 && textNodeHasSelectedChars(node, range),
  );
  if (textNodes.length === 0) {
    const fmt = getEffectiveFormat(range.startContainer, editor);
    return {
      bold: fmt.bold,
      italic: fmt.italic,
      underline: fmt.underline,
      strike: fmt.strike,
      color: fmt.color ?? null,
      highlight: fmt.highlight ?? null,
      fontSize: fmt.fontSize,
      hasSelection: false,
    };
  }
  const formats = textNodes.map((node) => getEffectiveFormat(node, editor));
  return {
    bold: aggregateValue(formats.map((f) => f.bold)),
    italic: aggregateValue(formats.map((f) => f.italic)),
    underline: aggregateValue(formats.map((f) => f.underline)),
    strike: aggregateValue(formats.map((f) => f.strike)),
    color: aggregateValue(formats.map((f) => f.color ?? null)),
    highlight: aggregateValue(formats.map((f) => f.highlight ?? null)),
    fontSize: aggregateValue(formats.map((f) => f.fontSize)),
    hasSelection: true,
  };
}

function mergeFormat(base: RichTextFormat, patch: RichTextFormatPatch): RichTextFormat {
  return {
    bold: patch.bold !== undefined ? patch.bold : base.bold,
    italic: patch.italic !== undefined ? patch.italic : base.italic,
    underline: patch.underline !== undefined ? patch.underline : base.underline,
    strike: patch.strike !== undefined ? patch.strike : base.strike,
    color: patch.color === undefined ? base.color : (patch.color ?? undefined),
    highlight: patch.highlight === undefined ? base.highlight : (patch.highlight ?? undefined),
    fontSize: patch.fontSize !== undefined ? patch.fontSize : base.fontSize,
  };
}

function createStyledSpan(doc: Document, format: RichTextFormat): HTMLSpanElement | null {
  const hasDecor = format.underline || format.strike;
  const hasSize = format.fontSize !== DEFAULT_RICH_FONT_SIZE;
  if (!format.bold && !format.italic && !hasDecor && !format.color && !format.highlight && !hasSize) {
    return null;
  }
  const span = doc.createElement('span');
  if (format.bold) span.style.fontWeight = 'bold';
  if (format.italic) span.style.fontStyle = 'italic';
  if (hasDecor) {
    const parts: string[] = [];
    if (format.underline) parts.push('underline');
    if (format.strike) parts.push('line-through');
    span.style.textDecoration = parts.join(' ');
  }
  if (format.color) span.style.color = format.color;
  if (format.highlight) span.style.backgroundColor = format.highlight;
  if (hasSize) span.style.fontSize = `${format.fontSize}px`;
  return span;
}

/** Split inline formatting ancestors around `target` so unselected siblings keep their exact styles. */
function splitInlineAncestors(target: Node, editor: HTMLElement): void {
  while (target.parentNode && target.parentNode !== editor) {
    const parent = target.parentNode as HTMLElement;
    if (!INLINE_TAGS.has(parent.tagName.toUpperCase())) break;
    const grandparent = parent.parentNode;
    if (!grandparent) break;
    const before: Node[] = [];
    const after: Node[] = [];
    let passed = false;
    for (const child of Array.from(parent.childNodes)) {
      if (child === target) passed = true;
      else if (!passed) before.push(child);
      else after.push(child);
    }
    if (before.length > 0) {
      const beforeClone = parent.cloneNode(false) as HTMLElement;
      before.forEach((n) => beforeClone.appendChild(n));
      grandparent.insertBefore(beforeClone, parent);
    }
    grandparent.insertBefore(target, parent);
    if (after.length > 0) {
      const afterClone = parent.cloneNode(false) as HTMLElement;
      after.forEach((n) => afterClone.appendChild(n));
      grandparent.insertBefore(afterClone, parent);
    }
    grandparent.removeChild(parent);
  }
}

function pruneEmptyInlineElements(editor: HTMLElement, keepNode?: Node): void {
  const elements = Array.from(editor.querySelectorAll('span, b, strong, i, em, u, s, strike, del, font')).reverse();
  for (const el of elements) {
    if (keepNode && el.contains(keepNode)) continue;
    if (!el.textContent && !el.querySelector('br')) {
      el.parentNode?.removeChild(el);
    }
  }
}

/** Apply `patch` strictly to the selected range, or to a caret placeholder for upcoming typed text. */
export function applyFormatToRange(
  editor: HTMLElement,
  inputRange: Range,
  patch: RichTextFormatPatch,
): Range | null {
  if (!editor.contains(inputRange.commonAncestorContainer)) return null;
  const doc = editor.ownerDocument;
  const range = inputRange.cloneRange();

  if (range.collapsed) {
    const current = getEffectiveFormat(range.startContainer, editor);
    const next = mergeFormat(current, patch);
    let zwsNode: Text | null = null;

    if (range.startContainer.nodeType === Node.TEXT_NODE && (range.startContainer as Text).data === ZERO_WIDTH_SPACE) {
      zwsNode = range.startContainer as Text;
    } else {
      zwsNode = doc.createTextNode(ZERO_WIDTH_SPACE);
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer as Text;
        if (range.startOffset <= 0) {
          textNode.parentNode?.insertBefore(zwsNode, textNode);
        } else if (range.startOffset >= textNode.data.length) {
          textNode.parentNode?.insertBefore(zwsNode, textNode.nextSibling);
        } else {
          const right = textNode.splitText(range.startOffset);
          textNode.parentNode?.insertBefore(zwsNode, right);
        }
      } else {
        const container = range.startContainer;
        const refNode = container.childNodes[range.startOffset] ?? null;
        container.insertBefore(zwsNode, refNode);
      }
    }

    splitInlineAncestors(zwsNode, editor);
    const span = createStyledSpan(doc, next);
    if (span && zwsNode.parentNode) {
      zwsNode.parentNode.insertBefore(span, zwsNode);
      span.appendChild(zwsNode);
    }
    pruneEmptyInlineElements(editor, zwsNode);

    const nextRange = doc.createRange();
    nextRange.setStart(zwsNode, zwsNode.data.length);
    nextRange.collapse(true);
    return nextRange;
  }

  // Non-collapsed selection: split boundary text nodes cleanly before styling.
  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer as Text;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    if (endOffset < textNode.data.length) textNode.splitText(endOffset);
    const selectedNode = startOffset > 0 ? textNode.splitText(startOffset) : textNode;
    range.setStart(selectedNode, 0);
    range.setEnd(selectedNode, selectedNode.data.length);
  } else {
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      const endText = range.endContainer as Text;
      if (range.endOffset > 0 && range.endOffset < endText.data.length) {
        endText.splitText(range.endOffset);
        range.setEnd(endText, endText.data.length);
      }
    }
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const startText = range.startContainer as Text;
      if (range.startOffset > 0 && range.startOffset < startText.data.length) {
        const right = startText.splitText(range.startOffset);
        range.setStart(right, 0);
      }
    }
  }

  const selectedNodes = collectTextNodes(editor).filter(
    (node) => node.data.replace(/\u200B/g, '').length > 0 && textNodeHasSelectedChars(node, range),
  );
  if (selectedNodes.length === 0) return range;

  for (const textNode of selectedNodes) {
    const current = getEffectiveFormat(textNode, editor);
    const next = mergeFormat(current, patch);
    splitInlineAncestors(textNode, editor);
    const span = createStyledSpan(doc, next);
    if (span && textNode.parentNode) {
      textNode.parentNode.insertBefore(span, textNode);
      span.appendChild(textNode);
    }
  }
  pruneEmptyInlineElements(editor);

  const first = selectedNodes[0]!;
  const last = selectedNodes[selectedNodes.length - 1]!;
  const nextRange = doc.createRange();
  nextRange.setStart(first, 0);
  nextRange.setEnd(last, last.data.length);
  return nextRange;
}

/** Strip zero-width spaces once real characters have been typed alongside them, preserving caret offset. */
export function cleanTypedZeroWidthSpaces(editor: HTMLElement): void {
  const selection = window.getSelection();
  const activeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  for (const node of collectTextNodes(editor)) {
    if (!node.data.includes(ZERO_WIDTH_SPACE) || node.data.length <= 1) continue;
    const isCaretHere = activeRange && activeRange.collapsed && activeRange.startContainer === node;
    const prevOffset = isCaretHere ? activeRange.startOffset : 0;
    const removedBeforeCaret = isCaretHere
      ? (node.data.slice(0, prevOffset).match(/\u200B/g) ?? []).length
      : 0;
    node.data = node.data.replace(/\u200B/g, '');
    if (isCaretHere && selection) {
      const nextRange = editor.ownerDocument.createRange();
      nextRange.setStart(node, Math.max(0, Math.min(node.data.length, prevOffset - removedBeforeCaret)));
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
  }
}