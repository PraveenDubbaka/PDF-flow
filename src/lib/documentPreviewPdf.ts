import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 72;
const BODY_SIZE = 11;
const BODY_LEADING = 16;

export type DocumentPreviewVariant = 'letter' | 'report';

export interface DocumentPreviewPdfInput {
  html: string;
  engagementCode: string;
  documentTitle: string;
  clientName?: string;
  variant?: DocumentPreviewVariant;
  now?: Date;
}

export interface DocumentPreviewBlock {
  text: string;
  bold: boolean;
  centered?: boolean;
  fontSize?: number;
  gapBefore?: number;
  pageBreakBefore?: boolean;
  cells?: string[];
}

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);
const CONTAINER_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TFOOT']);
const IGNORED_PLACEHOLDERS = new Set(['header will come here', 'footer will come here', 'header goes here', 'draft under discussion']);

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[\t\r\n ]+/g, ' ').trim();
}

export function formatDocumentPreviewFileName(engagementCode: string, documentTitle: string): string {
  const safeTitle = documentTitle
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Document';
  return `${engagementCode}-${safeTitle}.pdf`;
}

export function documentPreviewBlocks(html: string, clientName?: string): DocumentPreviewBlock[] {
  const resolvedHtml = clientName ? html.split('Shipping Line Inc.').join(clientName) : html;
  const doc = new DOMParser().parseFromString('<!doctype html><html><body></body></html>', 'text/html');
  const root = doc.createElement('div');
  root.innerHTML = resolvedHtml;
  doc.body.appendChild(root);
  root.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));

  const blocks: DocumentPreviewBlock[] = [];
  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (child.tagName === 'BR' || child.tagName === 'BUTTON' || child.tagName === 'SVG') continue;
      if (child.tagName === 'HR' && child.getAttribute('data-page-break') === 'true') {
        if (blocks.length) blocks.push({ text: '', bold: false, pageBreakBefore: true });
        continue;
      }
      if (child.tagName === 'LI') {
        const text = cleanText(child.textContent ?? '');
        if (text) blocks.push({ text: `- ${text}`, bold: false });
        continue;
      }
      if (child.tagName === 'TR') {
        const rawCells = Array.from(child.children).map((cell) => cleanText(cell.textContent ?? ''));
        const nonEmpty = rawCells.filter(Boolean);
        if (!nonEmpty.length) continue;
        const isBold = child.querySelector('th, strong, b') !== null || (child as HTMLElement).style?.fontWeight === '700' || Array.from(child.children).some((c) => (c as HTMLElement).style?.fontWeight === '700');
        if (rawCells.length > 1) {
          blocks.push({ text: nonEmpty.join('  '), bold: isBold, cells: rawCells });
        } else {
          blocks.push({ text: nonEmpty[0], bold: isBold });
        }
        continue;
      }
      if (child.hasAttribute('data-preview-row')) {
        const cells = Array.from(child.children).map((c) => cleanText(c.textContent ?? '')).filter(Boolean);
        if (cells.length >= 2) {
          const isBold = child.getAttribute('data-preview-bold') === 'true';
          blocks.push({ text: cells.join('  '), bold: isBold, cells });
          continue;
        }
      }
      if (CONTAINER_TAGS.has(child.tagName) && child.querySelector('p, li, tr, h1, h2, h3, h4, h5, h6, blockquote, pre, div, section, article, hr[data-page-break]')) {
        visit(child);
        continue;
      }
      if (BLOCK_TAGS.has(child.tagName) || CONTAINER_TAGS.has(child.tagName)) {
        const text = cleanText(child.textContent ?? '');
        if (!text || IGNORED_PLACEHOLDERS.has(text.toLowerCase())) continue;
        const headingMatch = /^H([1-6])$/.exec(child.tagName);
        const style = (child as HTMLElement).style;
        const isBold = Boolean(headingMatch) || child.querySelector('strong, b') !== null || style?.fontWeight === '700' || style?.fontWeight === 'bold';
        const centered = style?.textAlign === 'center' || child.getAttribute('data-preview-center') === 'true';
        const fontSize = headingMatch ? (headingMatch[1] === '1' ? 14 : 12) : undefined;
        blocks.push({ text, bold: isBold, ...(centered ? { centered: true } : {}), ...(fontSize ? { fontSize } : {}) });
        continue;
      }
      visit(child);
    }
  };
  visit(root);

  if (!blocks.length) {
    const text = cleanText(root.textContent ?? '');
    if (text && !IGNORED_PLACEHOLDERS.has(text.toLowerCase())) blocks.push({ text, bold: false });
  }
  return blocks;
}

/** Extract clean, selectable HTML from rendered Financial Statement `[data-fs-page]` nodes. */
export function extractFsPagesHtml(container: HTMLElement | null, fallbackTitle: string): string {
  if (!container) return `<h1>${fallbackTitle}</h1>`;
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-fs-page]'));
  if (!pages.length) return `<h1>${fallbackTitle}</h1>`;

  const serializePage = (pageEl: HTMLElement): string => {
    const clone = pageEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, input, textarea, select, svg, [role="toolbar"], [data-fs-ignore]').forEach((el) => el.remove());
    // Mark horizontal flex rows with 2 text spans (e.g. Table of Contents rows) as two-column preview rows.
    clone.querySelectorAll<HTMLElement>('div').forEach((div) => {
      const txt = cleanText(div.textContent ?? '').toLowerCase();
      if (IGNORED_PLACEHOLDERS.has(txt)) {
        div.remove();
        return;
      }
      if (div.style.display === 'flex' && div.style.justifyContent === 'space-between' && div.children.length === 2 && !div.querySelector('table, p, h1, h2, h3')) {
        div.setAttribute('data-preview-row', 'true');
        if (Array.from(div.children).some((c) => (c as HTMLElement).style?.fontWeight === '700')) {
          div.setAttribute('data-preview-bold', 'true');
        }
      }
    });
    return clone.innerHTML;
  };

  return pages.map(serializePage).join('<hr data-page-break="true" />');
}

function safeWinAnsi(text: string) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const pushLongWord = (word: string) => {
    let part = '';
    for (const character of word) {
      if (part && font.widthOfTextAtSize(part + character, size) > maxWidth) {
        lines.push(part);
        part = character;
      } else part += character;
    }
    return part;
  };
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = font.widthOfTextAtSize(word, size) <= maxWidth ? word : pushLongWord(word);
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number) {
  const safe = safeWinAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: Math.max(PAGE_MARGIN, (PAGE_WIDTH - width) / 2), y, size, font, color: rgb(0.08, 0.1, 0.14) });
}

/** Generate a Letter-size PDF with real selectable text for any engagement letter or report. */
export async function generateDocumentPreviewPdf({
  html,
  engagementCode,
  documentTitle,
  clientName,
  variant = 'letter',
  now = new Date(),
}: DocumentPreviewPdfInput): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const regular = await output.embedFont(StandardFonts.TimesRoman);
  const bold = await output.embedFont(StandardFonts.TimesRomanBold);
  const firmFont = await output.embedFont(StandardFonts.HelveticaBold);
  const firmSmall = await output.embedFont(StandardFonts.Helvetica);
  const fileName = formatDocumentPreviewFileName(engagementCode, documentTitle);
  output.setTitle(fileName);
  output.setAuthor('MAPLE GROVE ACCOUNTING');
  output.setSubject(documentTitle);
  output.setCreator('Document Preview');

  let page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

  if (variant === 'letter') {
    drawCentered(page, 'MAPLE GROVE ACCOUNTING', y - 8, firmFont, 20);
    drawCentered(page, 'PROFESSIONAL CORPORATION', y - 28, firmSmall, 8);
    drawCentered(page, 'CHARTERED PROFESSIONAL ACCOUNTANT', y - 42, firmSmall, 8);
    page.drawLine({ start: { x: PAGE_MARGIN, y: y - 58 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: y - 58 }, thickness: 0.6, color: rgb(0.76, 0.46, 0.29) });
    y -= 92;
  }

  const nextPage = () => {
    page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN;
  };

  const parsedBlocks = documentPreviewBlocks(html, clientName);
  const date = now.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const signatureBlocks: DocumentPreviewBlock[] = variant === 'letter'
    ? [
        { text: '(Signature)', bold: false, gapBefore: 24 },
        { text: `${date}\n(Date)`, bold: false, gapBefore: 20 },
        { text: `Acknowledged and agreed on behalf of the management of ${clientName || 'Entity Name'}`, bold: true, gapBefore: 20 },
        { text: 'Client Signature\n(Signature)', bold: false, gapBefore: 12 },
        { text: 'Client Signed Date\n(Date)', bold: false, gapBefore: 12 },
      ]
    : [];
  const blocks = [...parsedBlocks, ...signatureBlocks];

  for (const block of blocks) {
    if (block.pageBreakBefore) {
      nextPage();
      continue;
    }
    y -= block.gapBefore ?? 0;
    const font = block.bold ? bold : regular;
    const size = block.fontSize ?? BODY_SIZE;
    const leading = Math.max(BODY_LEADING, Math.round(size * 1.45));

    if (block.cells && block.cells.length > 1) {
      const numCols = block.cells.length - 1;
      const valueColWidth = Math.min(115, Math.floor((contentWidth * 0.48) / numCols));
      const labelWidth = Math.max(160, contentWidth - valueColWidth * numCols - 12);
      const labelLines = wrapText(block.cells[0] ?? '', font, size, labelWidth);
      if (y - labelLines.length * leading < PAGE_MARGIN) nextPage();
      const rowTopY = y;
      for (const line of labelLines) {
        page.drawText(safeWinAnsi(line), { x: PAGE_MARGIN, y, size, font, color: rgb(0.08, 0.1, 0.14) });
        y -= leading;
      }
      for (let idx = 1; idx < block.cells.length; idx++) {
        const cellText = safeWinAnsi(block.cells[idx] ?? '');
        if (!cellText) continue;
        const textWidth = font.widthOfTextAtSize(cellText, size);
        const rightEdge = PAGE_WIDTH - PAGE_MARGIN - (block.cells.length - 1 - idx) * valueColWidth;
        page.drawText(cellText, { x: Math.max(PAGE_MARGIN + labelWidth + 8, rightEdge - textWidth), y: rowTopY, size, font, color: rgb(0.08, 0.1, 0.14) });
      }
      y -= 5;
      continue;
    }

    for (const sourceLine of block.text.split('\n')) {
      const lines = wrapText(sourceLine, font, size, contentWidth);
      for (const line of lines) {
        if (y < PAGE_MARGIN + leading) nextPage();
        if (block.centered) {
          drawCentered(page, line, y, font, size);
        } else {
          page.drawText(safeWinAnsi(line), { x: PAGE_MARGIN, y, size, font, color: rgb(0.08, 0.1, 0.14) });
        }
        y -= leading;
      }
    }
    y -= 9;
  }

  return output.save();
}