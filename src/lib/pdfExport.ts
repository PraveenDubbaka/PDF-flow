import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFArray, PDFName, degrees, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { emptyPdfEditState, type PdfEditState } from './pdfDocuments';

export interface PdfExportFonts {
  font: PDFFont;
  fontRegular: PDFFont;
  fontItalic: PDFFont;
  fontBoldItalic: PDFFont;
  fontTimesItalic: PDFFont;
}

/** The same export is used by Save, Download and Print, regardless of editor mode. */
export async function exportPdfBytes({ sourceBytes, editState, pageBounds, renderPage }: {
  sourceBytes: Uint8Array;
  editState?: Partial<PdfEditState> | null;
  pageBounds?: (sourcePage: number) => Promise<readonly number[]>;
  renderPage?: (args: { output: PDFDocument; copiedPage: PDFPage; sourcePage: number; fonts: PdfExportFonts }) => Promise<void>;
}) {
  const defaults = emptyPdfEditState();
  const state = { ...defaults, ...editState, properties: editState?.properties ?? defaults.properties };
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const order = state.pageOrder?.length ? state.pageOrder : source.getPages().map((_, index) => index + 1);
  for (const sourcePage of new Set(order)) {
    const page = source.getPages()[sourcePage - 1];
    if (!page) throw new Error(`PDF page ${sourcePage} is unavailable.`);
    // PDF.js accepts a missing/incomplete MediaBox (and supplies viewer bounds),
    // while pdf-lib getSize() performs a strict PDFArray lookup and throws.
    const box = page.node.getInheritableAttribute(PDFName.MediaBox);
    const resolved = box ? source.context.lookup(box) : undefined;
    let valid = resolved instanceof PDFArray && resolved.size() === 4;
    if (valid) {
      try { const size = page.getSize(); valid = Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0; }
      catch { valid = false; }
    }
    if (!valid) {
      const bounds = await pageBounds?.(sourcePage);
      if (!bounds || bounds.length < 4) throw new Error(`Unable to recover the bounds of PDF page ${sourcePage}.`);
      const [x, y, right, top] = bounds;
      if (![x, y, right, top].every(Number.isFinite) || right <= x || top <= y) throw new Error(`Invalid bounds for PDF page ${sourcePage}.`);
      page.setMediaBox(x, y, right - x, top - y);
    }
  }
  const output = await PDFDocument.create();
  output.registerFontkit(fontkit);
  const metadata = state.properties;
  if (metadata?.title) output.setTitle(metadata.title);
  if (metadata?.author) output.setAuthor(metadata.author);
  if (metadata?.subject) output.setSubject(metadata.subject);
  if (metadata?.keywords) output.setKeywords(metadata.keywords.split(',').map((value) => value.trim()).filter(Boolean));
  if (metadata?.creator) output.setCreator(metadata.creator);
  const fonts: PdfExportFonts = {
    font: await output.embedFont(StandardFonts.HelveticaBold),
    fontRegular: await output.embedFont(StandardFonts.Helvetica),
    fontItalic: await output.embedFont(StandardFonts.HelveticaOblique),
    fontBoldItalic: await output.embedFont(StandardFonts.HelveticaBoldOblique),
    fontTimesItalic: await output.embedFont(StandardFonts.TimesRomanItalic),
  };
  const copied = await output.copyPages(source, order.map((page) => page - 1));
  for (const [index, copiedPage] of copied.entries()) {
    const sourcePage = order[index];
    copiedPage.setRotation(degrees(state.rotations?.[String(sourcePage)] ?? 0));
    output.addPage(copiedPage);
    await renderPage?.({ output, copiedPage, sourcePage, fonts });
  }
  return output.save({ useObjectStreams: state.optimize !== false });
}