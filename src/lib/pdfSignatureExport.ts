import { rgb, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PdfAnnotation } from './pdfDocuments';
import { formatSignatureCaption, resolveSignatureData, resolveSignatureFont } from './pdfSignature';

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return rgb(0.12, 0.16, 0.27);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
};

const safeWinAnsi = (text: string) => text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

function fitTextToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (!text || maxWidth <= 0) return '';
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '...';
  let end = text.length;
  while (end > 0 && font.widthOfTextAtSize(text.slice(0, end) + ellipsis, size) > maxWidth) {
    end -= 1;
  }
  return end > 0 ? text.slice(0, end) + ellipsis : '';
}

export type FontBytesLoader = (ttfUrl: string) => Promise<ArrayBuffer | Uint8Array>;

const defaultFontBytesLoader: FontBytesLoader = async (ttfUrl: string) => {
  const response = await fetch(ttfUrl);
  if (!response.ok) throw new Error(`Failed to fetch font ${ttfUrl}: ${response.status}`);
  return response.arrayBuffer();
};

export async function embedSignatureFont(
  output: PDFDocument,
  fontName: string | undefined,
  fallbackItalicFont: PDFFont,
  cache: Map<string, PDFFont>,
  loadFontBytes: FontBytesLoader = defaultFontBytesLoader,
): Promise<PDFFont> {
  const option = resolveSignatureFont(fontName);
  const cached = cache.get(option.name);
  if (cached) return cached;
  try {
    const bytes = await loadFontBytes(option.ttfUrl);
    const normalized = bytes instanceof Uint8Array
      ? Uint8Array.from(bytes)
      : new Uint8Array(bytes);
    const embedded = await output.embedFont(normalized, { subset: true });
    // Validate now, inside the fallback guard, rather than first discovering a
    // font serialization failure during the final whole-document save.
    await embedded.embed();
    cache.set(option.name, embedded);
    return embedded;
  } catch {
    return fallbackItalicFont;
  }
}

function decodeDataUrlBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function drawSignatureStampToPdf({
  output,
  page,
  item,
  x,
  y,
  boxWidth,
  boxHeight,
  fontRegular,
  fontMedium,
  fontItalicFallback,
  scriptFontCache,
  loadFontBytes,
  onWarning,
}: {
  output: PDFDocument;
  page: PDFPage;
  item: PdfAnnotation;
  x: number;
  y: number;
  boxWidth: number;
  boxHeight: number;
  fontRegular: PDFFont;
  fontMedium: PDFFont;
  fontItalicFallback: PDFFont;
  scriptFontCache: Map<string, PDFFont>;
  loadFontBytes?: FontBytesLoader;
  onWarning?: (message: string) => void;
}) {
  const sig = resolveSignatureData(item);
  const ink = hexToRgb(sig.inkColor);
  const scale = Math.max(0.5, item.stampScale ?? 1);
  const cardWidth = Math.max(boxWidth, 96 * scale);
  const cardHeight = Math.max(boxHeight, 52 * scale);
  const padX = Math.min(cardWidth * 0.08, 8 * scale);
  const padY = Math.min(cardHeight * 0.09, 5 * scale);
  const innerWidth = Math.max(12, cardWidth - padX * 2);

  // White stamp background + thin ink-coloured border
  page.drawRectangle({
    x,
    y,
    width: cardWidth,
    height: cardHeight,
    color: rgb(1, 1, 1),
    opacity: 0.96,
    borderColor: ink,
    borderWidth: Math.max(0.7, 0.9 * scale),
  });

  // Vertical geometry matching screen card: top signature area, line, caption + muted date underneath
  const captionSize = Math.max(5.5, Math.min(11 * scale, cardHeight * 0.135));
  const dateSize = Math.max(5, Math.min(9.5 * scale, cardHeight * 0.115));
  const hasDate = Boolean(sig.signedDate);
  const footerHeight = captionSize + (hasDate ? dateSize + 2.5 * scale : 0) + 3 * scale;
  const lineY = y + padY + footerHeight;
  const sigBottom = lineY + 2 * scale;
  const sigTop = y + cardHeight - padY;
  const sigAreaHeight = Math.max(10, sigTop - sigBottom);

  if ((sig.signatureMode === 'draw' || sig.signatureMode === 'upload') && sig.signatureImage) {
    try {
      const bytes = decodeDataUrlBytes(sig.signatureImage);
      const embedded = sig.signatureImage.includes('image/jpeg')
        ? await output.embedJpg(bytes)
        : await output.embedPng(bytes);
      const imgRatio = embedded.width / Math.max(1, embedded.height);
      let drawW = innerWidth;
      let drawH = drawW / imgRatio;
      if (drawH > sigAreaHeight) {
        drawH = sigAreaHeight;
        drawW = drawH * imgRatio;
      }
      page.drawImage(embedded, {
        x: x + padX + (innerWidth - drawW) / 2,
        y: sigBottom + (sigAreaHeight - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } catch {
      onWarning?.(`Skipped a broken signature image on page ${item.page}; used an italic name instead.`);
      // If PNG decoding fails, draw signer name as italic fallback.
      const fallbackText = safeWinAnsi(sig.signerName || 'Signed');
      if (fallbackText) {
        page.drawText(fitTextToWidth(fallbackText, fontItalicFallback, Math.min(16 * scale, sigAreaHeight * 0.7), innerWidth), {
          x: x + padX,
          y: sigBottom + 2,
          size: Math.min(16 * scale, sigAreaHeight * 0.7),
          font: fontItalicFallback,
          color: ink,
        });
      }
    }
  } else {
    const rawText = sig.signatureText || sig.signerName;
    if (rawText) {
      const scriptFont = await embedSignatureFont(output, sig.signatureFont, fontItalicFallback, scriptFontCache, loadFontBytes);
      const safeText = scriptFont === fontItalicFallback ? safeWinAnsi(rawText) : rawText;
      if (safeText) {
        let sigSize = Math.min(24 * scale, sigAreaHeight * 0.82);
        const measured = scriptFont.widthOfTextAtSize(safeText, sigSize);
        if (measured > innerWidth && measured > 0) {
          sigSize = Math.max(8, sigSize * (innerWidth / measured));
        }
        const drawTextWidth = scriptFont.widthOfTextAtSize(safeText, sigSize);
        page.drawText(safeText, {
          x: x + padX + Math.max(0, (innerWidth - drawTextWidth) / 2),
          y: sigBottom + Math.max(1, (sigAreaHeight - sigSize) * 0.25),
          size: sigSize,
          font: scriptFont,
          color: ink,
        });
      }
    }
  }

  // Thin signature baseline
  page.drawLine({
    start: { x: x + padX, y: lineY },
    end: { x: x + cardWidth - padX, y: lineY },
    color: ink,
    opacity: 0.55,
    thickness: Math.max(0.5, 0.7 * scale),
  });

  // Caption "{Role} {Name}" on one line
  const caption = safeWinAnsi(formatSignatureCaption(sig.signerRole, sig.signerName));
  if (caption) {
    const fittedCaption = fitTextToWidth(caption, fontMedium, captionSize, innerWidth);
    if (fittedCaption) {
      page.drawText(fittedCaption, {
        x: x + padX,
        y: lineY - captionSize - 2.2 * scale,
        size: captionSize,
        font: fontMedium,
        color: ink,
      });
    }
  }

  // Date on next line, muted
  if (hasDate) {
    const safeDate = safeWinAnsi(sig.signedDate);
    const fittedDate = fitTextToWidth(safeDate, fontRegular, dateSize, innerWidth);
    if (fittedDate) {
      page.drawText(fittedDate, {
        x: x + padX,
        y: Math.max(y + padY * 0.5, lineY - captionSize - dateSize - 4.2 * scale),
        size: dateSize,
        font: fontRegular,
        color: ink,
        opacity: 0.65,
      });
    }
  }
}