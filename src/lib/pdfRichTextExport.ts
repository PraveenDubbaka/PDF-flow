import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PdfAnnotation } from './pdfDocuments';
import { parseRichTextRuns, type StyledTextRun } from './pdfRichText';

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return rgb(0.07, 0.09, 0.15);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
};

const safeWinAnsi = (text: string) => text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

function sameRunStyle(a: StyledTextRun, b: StyledTextRun): boolean {
  return (
    a.bold === b.bold
    && a.italic === b.italic
    && a.underline === b.underline
    && a.strike === b.strike
    && a.color === b.color
    && a.highlight === b.highlight
    && a.fontSize === b.fontSize
  );
}

function pushRunSegment(line: StyledTextRun[], segment: StyledTextRun): void {
  const prev = line[line.length - 1];
  if (prev && sameRunStyle(prev, segment)) {
    prev.text += segment.text;
  } else {
    line.push({ ...segment });
  }
}

/** Word-wrap styled rich text paragraphs to fit inside `maxWidth` while preserving per-run styles. */
export function wrapRichTextRuns(
  paragraphs: StyledTextRun[][],
  maxWidth: number,
  measureWidth: (text: string, run: StyledTextRun) => number,
): StyledTextRun[][] {
  const limit = Math.max(8, maxWidth);
  const wrapped: StyledTextRun[][] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      wrapped.push([]);
      continue;
    }
    let currentLine: StyledTextRun[] = [];
    let currentWidth = 0;

    const flushLine = () => {
      wrapped.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    };

    for (const run of paragraph) {
      const cleanText = safeWinAnsi(run.text);
      if (!cleanText) continue;
      const tokens = cleanText.split(/(\s+)/).filter(Boolean);
      for (const token of tokens) {
        const isSpace = /^\s+$/.test(token);
        if (isSpace && currentLine.length === 0) continue;
        const tokenWidth = measureWidth(token, run);
        if (currentWidth + tokenWidth <= limit || (isSpace && currentLine.length > 0)) {
          pushRunSegment(currentLine, { ...run, text: token });
          currentWidth += tokenWidth;
          continue;
        }
        if (currentLine.length > 0) flushLine();
        if (measureWidth(token, run) <= limit) {
          pushRunSegment(currentLine, { ...run, text: token });
          currentWidth = measureWidth(token, run);
          continue;
        }
        // Character-break single word wider than the box width.
        let chunk = '';
        for (const ch of token) {
          const nextChunk = chunk + ch;
          if (chunk && measureWidth(nextChunk, run) > limit) {
            pushRunSegment(currentLine, { ...run, text: chunk });
            flushLine();
            chunk = ch;
          } else {
            chunk = nextChunk;
          }
        }
        if (chunk) {
          pushRunSegment(currentLine, { ...run, text: chunk });
          currentWidth = measureWidth(chunk, run);
        }
      }
    }
    wrapped.push(currentLine);
  }

  return wrapped;
}

export function drawRichTextBoxToPdf({
  page,
  item,
  x,
  y,
  boxWidth,
  boxHeight,
  fontRegular,
  fontBold,
  fontItalic,
  fontBoldItalic,
}: {
  page: PDFPage;
  item: PdfAnnotation;
  x: number;
  y: number;
  boxWidth: number;
  boxHeight: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  fontBoldItalic: PDFFont;
}): StyledTextRun[][] {
  const borderColor = hexToRgb(item.color || '#111827');
  page.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    borderColor,
    borderWidth: 1,
    ...(item.fillColor ? { color: hexToRgb(item.fillColor) } : {}),
  });
  if (item.kind === 'callout') {
    page.drawLine({ start: { x, y }, end: { x: x - 6, y: y - 6 }, color: borderColor, thickness: 1 });
  }

  const padX = 4;
  const padY = 4;
  const contentWidth = Math.max(8, boxWidth - padX * 2);
  const pickFont = (run: StyledTextRun) => (
    run.bold && run.italic ? fontBoldItalic : run.bold ? fontBold : run.italic ? fontItalic : fontRegular
  );
  const runPdfSize = (run: StyledTextRun) => Math.max(7, run.fontSize * 0.8);
  const paragraphs = parseRichTextRuns(item.richText ?? '', item.label ?? item.value ?? '', item.textColor || '#111827', 12);
  const wrappedLines = wrapRichTextRuns(paragraphs, contentWidth, (text, run) => (
    pickFont(run).widthOfTextAtSize(text, runPdfSize(run))
  ));

  let cursorY = y + boxHeight - padY;
  for (const lineRuns of wrappedLines) {
    const lineFontSize = lineRuns.length
      ? Math.max(8, ...lineRuns.map((run) => runPdfSize(run)))
      : 9.6;
    cursorY -= lineFontSize + 2;
    if (cursorY < y + 2) break;
    let cursorX = x + padX;
    for (const run of lineRuns) {
      const text = safeWinAnsi(run.text);
      if (!text) continue;
      const runFont = pickFont(run);
      const size = runPdfSize(run);
      const runWidth = runFont.widthOfTextAtSize(text, size);
      const runColor = hexToRgb(run.color);
      if (run.highlight) {
        page.drawRectangle({
          x: cursorX,
          y: cursorY - size * 0.2,
          width: runWidth,
          height: size * 1.15,
          color: hexToRgb(run.highlight),
          opacity: 0.45,
        });
      }
      page.drawText(text, { x: cursorX, y: cursorY, size, font: runFont, color: runColor });
      if (run.underline) {
        page.drawLine({
          start: { x: cursorX, y: cursorY - 1.5 },
          end: { x: cursorX + runWidth, y: cursorY - 1.5 },
          color: runColor,
          thickness: 0.75,
        });
      }
      if (run.strike) {
        page.drawLine({
          start: { x: cursorX, y: cursorY + size * 0.3 },
          end: { x: cursorX + runWidth, y: cursorY + size * 0.3 },
          color: runColor,
          thickness: 0.75,
        });
      }
      cursorX += runWidth;
    }
  }

  return wrappedLines;
}