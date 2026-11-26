import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 72;
const BODY_SIZE = 11;
const BODY_LEADING = 16;

export interface EngagementLetterPdfInput {
  html: string;
  engagementCode: string;
  clientName?: string;
  now?: Date;
}

export interface EngagementLetterBlock {
  text: string;
  bold: boolean;
  gapBefore?: number;
}

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);
const CONTAINER_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'TABLE', 'TBODY', 'THEAD']);

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[\t\r\n ]+/g, ' ').trim();
}

/** Convert the saved letter markup into readable, selectable text blocks. */
export function engagementLetterBlocks(html: string, clientName?: string): EngagementLetterBlock[] {
  const resolvedHtml = clientName ? html.split('Shipping Line Inc.').join(clientName) : html;
  const document = new DOMParser().parseFromString('<!doctype html><html><body></body></html>', 'text/html');
  const root = document.createElement('div');
  root.innerHTML = resolvedHtml;
  document.body.appendChild(root);
  root.querySelectorAll('br').forEach((breakNode) => breakNode.replaceWith('\n'));

  const blocks: EngagementLetterBlock[] = [];
  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (child.tagName === 'BR') continue;
      if (child.tagName === 'LI') {
        const text = cleanText(child.textContent ?? '');
        if (text) blocks.push({ text: `- ${text}`, bold: false });
        continue;
      }
      if (child.tagName === 'TR') {
        const text = Array.from(child.children).map((cell) => cleanText(cell.textContent ?? '')).filter(Boolean).join('  ');
        if (text) blocks.push({ text, bold: child.querySelector('th') !== null });
        continue;
      }
      if (CONTAINER_TAGS.has(child.tagName) && child.querySelector('p, li, tr, h1, h2, h3, h4, h5, h6, blockquote, pre, div, section, article')) {
        visit(child);
        continue;
      }
      if (BLOCK_TAGS.has(child.tagName) || CONTAINER_TAGS.has(child.tagName)) {
        const text = cleanText(child.textContent ?? '');
        if (text) blocks.push({ text, bold: /^H[1-6]$/.test(child.tagName) || child.querySelector('strong, b') !== null });
        continue;
      }
      visit(child);
    }
  };
  visit(root);

  if (!blocks.length) {
    const text = cleanText(root.textContent ?? '');
    if (text) blocks.push({ text, bold: false });
  }
  return blocks;
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
  page.drawText(safe, { x: (PAGE_WIDTH - font.widthOfTextAtSize(safe, size)) / 2, y, size, font, color: rgb(0.08, 0.1, 0.14) });
}

/** Generate a Letter-size PDF with real text rather than a screenshot of the page. */
export async function generateEngagementLetterPdf({ html, engagementCode, clientName, now = new Date() }: EngagementLetterPdfInput): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const regular = await output.embedFont(StandardFonts.TimesRoman);
  const bold = await output.embedFont(StandardFonts.TimesRomanBold);
  const firmFont = await output.embedFont(StandardFonts.HelveticaBold);
  const firmSmall = await output.embedFont(StandardFonts.Helvetica);
  output.setTitle(`${engagementCode}-Engagement-Letter.pdf`);
  output.setAuthor('MAPLE GROVE ACCOUNTING');
  output.setSubject('Engagement Letter');
  output.setCreator('Engagement Letter Preview');

  let page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let firstPage = true;
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const beginPage = () => {
    if (!firstPage) return;
    drawCentered(page, 'MAPLE GROVE ACCOUNTING', y - 8, firmFont, 20);
    drawCentered(page, 'PROFESSIONAL CORPORATION', y - 28, firmSmall, 8);
    drawCentered(page, 'CHARTERED PROFESSIONAL ACCOUNTANT', y - 42, firmSmall, 8);
    page.drawLine({ start: { x: PAGE_MARGIN, y: y - 58 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: y - 58 }, thickness: 0.6, color: rgb(0.76, 0.46, 0.29) });
    y -= 92;
    firstPage = false;
  };
  const nextPage = () => {
    page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN;
  };
  beginPage();

  const date = now.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const signatureBlocks: EngagementLetterBlock[] = [
    { text: '(Signature)', bold: false, gapBefore: 24 },
    { text: `${date}\n(Date)`, bold: false, gapBefore: 20 },
    { text: `Acknowledged and agreed on behalf of the management of ${clientName || 'Entity Name'}`, bold: true, gapBefore: 20 },
    { text: 'Client Signature\n(Signature)', bold: false, gapBefore: 12 },
    { text: 'Client Signed Date\n(Date)', bold: false, gapBefore: 12 },
  ];
  const blocks = [...engagementLetterBlocks(html, clientName), ...signatureBlocks];

  for (const block of blocks) {
    y -= block.gapBefore ?? 0;
    const font = block.bold ? bold : regular;
    for (const sourceLine of block.text.split('\n')) {
      const lines = wrapText(sourceLine, font, BODY_SIZE, PAGE_WIDTH - PAGE_MARGIN * 2);
      for (const line of lines) {
        if (y < PAGE_MARGIN + BODY_LEADING) nextPage();
        page.drawText(safeWinAnsi(line), { x: PAGE_MARGIN, y, size: BODY_SIZE, font, color: rgb(0.08, 0.1, 0.14) });
        y -= BODY_LEADING;
      }
    }
    y -= 9;
  }

  return output.save();
}
