import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { emptyPdfEditState, getEditStateWatermarks, type PdfWatermark } from './pdfDocuments';
import { exportPdfBytes } from './pdfExport';
import { applyUndoSnapshot, captureUndoSnapshot, emptyUndoStack, popRedo, popUndo, pushUndo, type PdfUndoSnapshot } from './pdfUndo';
import {
  applyWatermarkToPages,
  drawPageWatermarkToPdf,
  formatWatermarkScopeLabel,
  getWatermarkForPage,
  normalizeWatermarks,
  parseWatermarkPageRange,
  removeWatermarkById,
  updateWatermarkOnPages,
} from './pdfWatermarks';

const tenPages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const base = (text: string, pages?: number[], id?: string): PdfWatermark => ({
  id: id ?? `wm-${text.toLowerCase()}`,
  text,
  opacity: 0.3,
  rotation: 45,
  fontSize: 48,
  color: '#595959',
  ...(pages ? { pages } : {}),
});

describe('PDF one-watermark-per-page rules', () => {
  it('replaces existing watermarks on overlapping pages while leaving non-overlapping pages intact', () => {
    const first = applyWatermarkToPages([], base('DRAFT', [1, 2, 3], 'w1'), tenPages);
    const second = applyWatermarkToPages(first, base('FINAL', [4, 5, 6, 7, 8, 9, 10], 'w2'), tenPages);
    expect(second).toHaveLength(2);
    expect(formatWatermarkScopeLabel(second[0]!, tenPages)).toBe('pages 1–3');
    expect(formatWatermarkScopeLabel(second[1]!, tenPages)).toBe('pages 4–10');

    // Applying CONFIDENTIAL to all pages replaces both DRAFT and FINAL
    const replacedAll = applyWatermarkToPages(second, base('CONFIDENTIAL', undefined, 'w3'), tenPages);
    expect(replacedAll).toHaveLength(1);
    expect(replacedAll[0]?.text).toBe('CONFIDENTIAL');
    expect(formatWatermarkScopeLabel(replacedAll[0]!, tenPages)).toBe('all pages');

    // Applying REVIEWED to pages 1-3 replaces DRAFT only; FINAL on 4-10 stays untouched
    const replacedFirst = applyWatermarkToPages(second, base('REVIEWED', [1, 2, 3], 'w4'), tenPages);
    expect(replacedFirst.map((w) => [w.text, formatWatermarkScopeLabel(w, tenPages)])).toEqual([
      ['FINAL', 'pages 4–10'],
      ['REVIEWED', 'pages 1–3'],
    ]);
  });

  it('shrinks or splits existing scopes on partial overlap and removes empty rows', () => {
    // All-pages DRAFT shrunk by FINAL on pages 4-10 -> DRAFT (1-3) + FINAL (4-10)
    const allDraft = applyWatermarkToPages([], base('DRAFT', undefined, 'w1'), tenPages);
    const splitTail = applyWatermarkToPages(allDraft, base('FINAL', [4, 5, 6, 7, 8, 9, 10], 'w2'), tenPages);
    expect(splitTail.map((w) => [w.text, formatWatermarkScopeLabel(w, tenPages)])).toEqual([
      ['DRAFT', 'pages 1–3'],
      ['FINAL', 'pages 4–10'],
    ]);
    expect(getWatermarkForPage(splitTail, 3)?.text).toBe('DRAFT');
    expect(getWatermarkForPage(splitTail, 4)?.text).toBe('FINAL');

    // Middle overlap splits an existing row into disjoint ranges
    const splitMid = applyWatermarkToPages(allDraft, base('CONFIDENTIAL', [4, 5, 6], 'w3'), tenPages);
    expect(splitMid.map((w) => [w.text, formatWatermarkScopeLabel(w, tenPages)])).toEqual([
      ['DRAFT', 'pages 1–3, 7–10'],
      ['CONFIDENTIAL', 'pages 4–6'],
    ]);

    // Editing row w1 updates it on its pages and removes it on Remove
    const edited = updateWatermarkOnPages(splitTail, 'w1', {
      text: 'PRELIMINARY',
      opacity: 0.4,
      rotation: 30,
      fontSize: 36,
      color: '#1C63A6',
      pages: [1, 2, 3, 4, 5],
    }, tenPages);
    expect(edited.map((w) => [w.text, formatWatermarkScopeLabel(w, tenPages)])).toEqual([
      ['PRELIMINARY', 'pages 1–5'],
      ['FINAL', 'pages 6–10'],
    ]);

    const afterRemove = removeWatermarkById(edited, 'w1');
    expect(afterRemove.map((w) => w.text)).toEqual(['FINAL']);
    expect(getWatermarkForPage(afterRemove, 2)).toBeNull();
    expect(getWatermarkForPage(afterRemove, 6)?.text).toBe('FINAL');
  });

  it('migrates saved documents with stacked watermarks by keeping the most recently added one per page', () => {
    // Stacked all-pages watermarks: keep only the latest
    const stackedAll = getEditStateWatermarks({
      watermarks: [base('OLD DRAFT', undefined, 'old'), base('NEW FINAL', undefined, 'new')],
    }, [1, 2, 3, 4]);
    expect(stackedAll.map((w) => w.text)).toEqual(['NEW FINAL']);

    // Without allPages provided, stacked all-pages still keeps only the latest
    const stackedNoPages = normalizeWatermarks([base('OLD DRAFT', undefined, 'old'), base('NEW FINAL', undefined, 'new')]);
    expect(stackedNoPages.map((w) => w.text)).toEqual(['NEW FINAL']);

    // Partially stacked ranges keep the latest on overlapping pages and retain earlier on non-overlapping pages
    const stackedRanges = getEditStateWatermarks({
      watermarks: [
        base('FIRST', undefined, 'w1'),
        base('SECOND', [2, 3], 'w2'),
        base('THIRD', [3, 4], 'w3'),
      ],
    }, [1, 2, 3, 4]);
    expect(stackedRanges.map((w) => [w.text, w.pages])).toEqual([
      ['FIRST', [1]],
      ['SECOND', [2]],
      ['THIRD', [3, 4]],
    ]);
  });

  it('validates page range input for empty, negative, non-numeric, inverted, and out-of-range values', () => {
    expect(parseWatermarkPageRange('1-3, 5', 10)).toEqual({ pages: [1, 2, 3, 5], error: null });
    expect(parseWatermarkPageRange('2–4', 5)).toEqual({ pages: [2, 3, 4], error: null });
    expect(parseWatermarkPageRange('', 5).error).toBeTruthy();
    expect(parseWatermarkPageRange('abc', 5).error).toBeTruthy();
    expect(parseWatermarkPageRange('0', 5).error).toBeTruthy();
    expect(parseWatermarkPageRange('-1', 5).error).toBeTruthy();
    expect(parseWatermarkPageRange('6', 5).error).toBeTruthy();
    expect(parseWatermarkPageRange('4-2', 5).error).toBeTruthy();
  });

  it('preserves one-watermark-per-page transitions across undo and redo', () => {
    const pages = [1, 2, 3, 4];
    const s0 = emptyPdfEditState();
    const s1 = { ...s0, watermarks: applyWatermarkToPages([], base('DRAFT', undefined, 'w1'), pages) };
    const s2 = { ...s1, watermarks: applyWatermarkToPages(s1.watermarks, base('FINAL', [3, 4], 'w2'), pages) };

    const stack = pushUndo(pushUndo(emptyUndoStack<PdfUndoSnapshot>(), captureUndoSnapshot(s0)), captureUndoSnapshot(s1));
    const undone = popUndo(stack, captureUndoSnapshot(s2))!;
    const afterUndo = applyUndoSnapshot(s2, undone.state);
    expect(afterUndo.watermarks?.map((w) => [w.text, w.pages])).toEqual([['DRAFT', undefined]]);

    const redone = popRedo(undone.stack, captureUndoSnapshot(afterUndo))!;
    const afterRedo = applyUndoSnapshot(afterUndo, redone.state);
    expect(afterRedo.watermarks?.map((w) => [w.text, w.pages])).toEqual([
      ['DRAFT', [1, 2]],
      ['FINAL', [3, 4]],
    ]);
  });

  it('exports at most one watermark per page even when given stacked legacy watermarks', async () => {
    const src = await PDFDocument.create();
    for (let i = 0; i < 4; i += 1) src.addPage([612, 792]);
    const sourceBytes = await src.save();

    // Legacy stacked input: OLD on all pages, NEW on pages 2-4
    const normalized = getEditStateWatermarks({
      watermarks: [base('OLDWATERMARK', undefined, 'w1'), base('NEWWATERMARK', [2, 3, 4], 'w2')],
    }, [1, 2, 3, 4]);

    const drawnPerPage: Record<number, string[]> = {};
    const exported = await exportPdfBytes({
      sourceBytes,
      editState: { ...emptyPdfEditState(), watermarks: normalized },
      renderPage: async ({ copiedPage, sourcePage, fonts }) => {
        const drawn = drawPageWatermarkToPdf({ copiedPage, sourcePage, watermarks: normalized, font: fonts.font });
        drawnPerPage[sourcePage] = drawn ? [drawn.text] : [];
      },
    });

    expect(drawnPerPage).toEqual({
      1: ['OLDWATERMARK'],
      2: ['NEWWATERMARK'],
      3: ['NEWWATERMARK'],
      4: ['NEWWATERMARK'],
    });

    // Read back the actual exported PDF bytes with pdfjs to confirm text per page
    const task = pdfjs.getDocument({ data: exported, disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]);
    const loaded = await task.promise;
    try {
      const texts: string[] = [];
      for (let p = 1; p <= loaded.numPages; p += 1) {
        const content = await (await loaded.getPage(p)).getTextContent();
        texts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
      }
      expect(texts[0]).toContain('OLDWATERMARK');
      expect(texts[0]).not.toContain('NEWWATERMARK');
      for (const idx of [1, 2, 3]) {
        expect(texts[idx]).toContain('NEWWATERMARK');
        expect(texts[idx]).not.toContain('OLDWATERMARK');
      }
    } finally {
      await task.destroy();
    }
  });
});