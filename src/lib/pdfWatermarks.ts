import {
  clip,
  degrees,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { PdfWatermark } from './pdfDocuments';

export type WatermarkScopeMode = 'all' | 'current' | 'range';

function uniqueSorted(pages: number[]): number[] {
  return [...new Set(pages.filter((page) => Number.isInteger(page) && page >= 1))].sort((a, b) => a - b);
}

function watermarkCoversPage(wm: PdfWatermark, sourcePage: number): boolean {
  if (!wm.text.trim()) return false;
  if (wm.pages === undefined) return true;
  return wm.pages.includes(sourcePage);
}

/**
 * Enforces at most one watermark per page.
 * When multiple watermarks overlap (including migrated legacy stacked watermarks),
 * the most recently added watermark (later in the array) wins on overlapping pages.
 */
export function normalizeWatermarks(list: PdfWatermark[], allPages?: number[]): PdfWatermark[] {
  const validAll = allPages?.length ? uniqueSorted(allPages) : null;
  const validAllSet = validAll ? new Set(validAll) : null;
  const claimed = new Set<number>();
  let allClaimed = false;
  const reversedKept: PdfWatermark[] = [];

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const wm = list[i];
    if (!wm || !wm.text.trim()) continue;

    if (validAll && validAllSet) {
      const effective = wm.pages === undefined
        ? validAll
        : uniqueSorted(wm.pages).filter((page) => validAllSet.has(page));
      const kept = effective.filter((page) => !claimed.has(page));
      if (kept.length === 0) continue;
      for (const page of kept) claimed.add(page);
      const coversAll = wm.pages === undefined && kept.length === validAll.length;
      reversedKept.push(coversAll ? { ...wm, pages: undefined } : { ...wm, pages: kept });
      continue;
    }

    if (allClaimed) continue;
    if (wm.pages === undefined) {
      reversedKept.push({ ...wm, pages: undefined });
      allClaimed = true;
      continue;
    }
    const kept = uniqueSorted(wm.pages).filter((page) => !claimed.has(page));
    if (kept.length === 0) continue;
    for (const page of kept) claimed.add(page);
    reversedKept.push({ ...wm, pages: kept });
  }

  return reversedKept.reverse();
}

export function applyWatermarkToPages(
  existing: PdfWatermark[],
  incoming: Omit<PdfWatermark, 'id'> & { id?: string },
  allPages: number[],
): PdfWatermark[] {
  const normalized = normalizeWatermarks(existing, allPages);
  const validAll = uniqueSorted(allPages);
  const validAllSet = new Set(validAll);
  const targetPages = incoming.pages === undefined
    ? validAll
    : uniqueSorted(incoming.pages).filter((page) => validAllSet.has(page));
  if (!incoming.text.trim() || targetPages.length === 0) return normalized;

  const targetSet = new Set(targetPages);
  const shrunk: PdfWatermark[] = [];
  for (const wm of normalized) {
    const currentPages = wm.pages === undefined ? validAll : wm.pages.filter((page) => validAllSet.has(page));
    const remaining = currentPages.filter((page) => !targetSet.has(page));
    if (remaining.length > 0) shrunk.push({ ...wm, pages: remaining });
  }

  const nextWatermark: PdfWatermark = {
    id: incoming.id ?? crypto.randomUUID(),
    text: incoming.text.trim(),
    opacity: incoming.opacity,
    rotation: incoming.rotation,
    fontSize: incoming.fontSize,
    color: incoming.color,
    ...(incoming.pages === undefined ? {} : { pages: targetPages }),
  };
  return [...shrunk, nextWatermark];
}

export function updateWatermarkOnPages(
  existing: PdfWatermark[],
  id: string,
  updates: Omit<PdfWatermark, 'id'>,
  allPages: number[],
): PdfWatermark[] {
  const normalized = normalizeWatermarks(existing, allPages);
  if (!normalized.some((wm) => wm.id === id)) {
    return applyWatermarkToPages(normalized, { id, ...updates }, allPages);
  }
  const validAll = uniqueSorted(allPages);
  const validAllSet = new Set(validAll);
  const targetPages = updates.pages === undefined
    ? validAll
    : uniqueSorted(updates.pages).filter((page) => validAllSet.has(page));
  if (!updates.text.trim() || targetPages.length === 0) {
    return normalized.filter((wm) => wm.id !== id);
  }

  const targetSet = new Set(targetPages);
  const next: PdfWatermark[] = [];
  for (const wm of normalized) {
    if (wm.id === id) {
      next.push({
        id,
        text: updates.text.trim(),
        opacity: updates.opacity,
        rotation: updates.rotation,
        fontSize: updates.fontSize,
        color: updates.color,
        ...(updates.pages === undefined ? {} : { pages: targetPages }),
      });
      continue;
    }
    const currentPages = wm.pages === undefined ? validAll : wm.pages.filter((page) => validAllSet.has(page));
    const remaining = currentPages.filter((page) => !targetSet.has(page));
    if (remaining.length > 0) next.push({ ...wm, pages: remaining });
  }
  return next;
}

export function removeWatermarkById(existing: PdfWatermark[], id: string): PdfWatermark[] {
  return existing.filter((wm) => wm.id !== id);
}

/** Returns the single active watermark for a given source page, or null. */
export function getWatermarkForPage(watermarks: PdfWatermark[], sourcePage: number): PdfWatermark | null {
  for (let i = watermarks.length - 1; i >= 0; i -= 1) {
    const wm = watermarks[i];
    if (wm && watermarkCoversPage(wm, sourcePage)) return wm;
  }
  return null;
}

/** Parses 1-based display page range input (e.g. "1-3, 5") against totalPages. */
export function parseWatermarkPageRange(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { pages: [], error: 'Enter page numbers or a range (e.g. 1–3, 5).' };
  if (totalPages < 1) return { pages: [], error: 'No pages available.' };

  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { pages: [], error: 'Enter page numbers or a range (e.g. 1–3, 5).' };

  const collected: number[] = [];
  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        return { pages: [], error: `Pages must be between 1 and ${totalPages}.` };
      }
      if (start > end) {
        return { pages: [], error: `Invalid range "${part}": start must not exceed end.` };
      }
      for (let p = start; p <= end; p += 1) collected.push(p);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const single = Number(part);
      if (single < 1 || single > totalPages) {
        return { pages: [], error: `Pages must be between 1 and ${totalPages}.` };
      }
      collected.push(single);
      continue;
    }
    return { pages: [], error: 'Use page numbers or ranges like 1–3, 5.' };
  }
  return { pages: uniqueSorted(collected), error: null };
}

function compactRanges(displayPages: number[], separator: string): string {
  const sorted = uniqueSorted(displayPages);
  if (sorted.length === 0) return '';
  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = start;
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    if (current === prev + 1) {
      prev = current;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}${separator}${prev}`);
      start = current;
      prev = current;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}${separator}${prev}`);
  return ranges.join(', ');
}

export function watermarkDisplayPages(wm: PdfWatermark, visiblePages: number[]): number[] {
  if (wm.pages === undefined) return visiblePages.map((_, index) => index + 1);
  const display: number[] = [];
  for (const sourcePage of wm.pages) {
    const index = visiblePages.indexOf(sourcePage);
    if (index >= 0) display.push(index + 1);
  }
  return uniqueSorted(display);
}

export function formatWatermarkScopeLabel(wm: PdfWatermark, visiblePages: number[]): string {
  if (wm.pages === undefined) return 'all pages';
  const display = watermarkDisplayPages(wm, visiblePages);
  if (display.length === 0) return 'no pages';
  if (display.length === 1) return `page ${display[0]}`;
  return `pages ${compactRanges(display, '–')}`;
}

export function formatWatermarkRangeInput(wm: PdfWatermark, visiblePages: number[]): string {
  return compactRanges(watermarkDisplayPages(wm, visiblePages), '-');
}

function parseHexColor(hex: string) {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return rgb(0.35, 0.35, 0.35);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

/** Draws at most one watermark on a single exported PDF page. */
export function drawPageWatermarkToPdf({
  copiedPage,
  sourcePage,
  watermarks,
  font,
}: {
  copiedPage: PDFPage;
  sourcePage: number;
  watermarks: PdfWatermark[];
  font: PDFFont;
}): PdfWatermark | null {
  const wm = getWatermarkForPage(watermarks, sourcePage);
  if (!wm || !wm.text.trim()) return null;
  const { width, height } = copiedPage.getSize();
  const wmSize = Math.max(8, Math.min(200, wm.fontSize || 48));
  const textWidth = font.widthOfTextAtSize(wm.text, wmSize);
  const rad = (wm.rotation * Math.PI) / 180;
  copiedPage.pushOperators(pushGraphicsState(), rectangle(0, 0, width, height), clip(), endPath());
  copiedPage.drawText(wm.text, {
    x: width / 2 - (textWidth / 2) * Math.cos(rad) + (wmSize / 3) * Math.sin(rad),
    y: height / 2 - (textWidth / 2) * Math.sin(rad) - (wmSize / 3) * Math.cos(rad),
    size: wmSize,
    font,
    color: parseHexColor(wm.color || '#595959'),
    opacity: Math.max(0.05, Math.min(1, wm.opacity)),
    rotate: degrees(wm.rotation),
  });
  copiedPage.pushOperators(popGraphicsState());
  return wm;
}