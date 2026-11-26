import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfAnnotation } from '@/lib/pdfDocuments';

const mockStore = new Map<string, unknown>();
let currentUserId = 'user-1';

vi.mock('@/lib/pdfDocuments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfDocuments')>(),
  requireUser: vi.fn(async () => ({ id: currentUserId })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col: string, userId: string) => ({
          maybeSingle: async () => ({
            data: mockStore.has(userId) ? { pdf_annotation_defaults: mockStore.get(userId) } : null,
            error: null,
          }),
        }),
      }),
      upsert: async (row: { user_id: string; pdf_annotation_defaults: unknown }) => {
        mockStore.set(row.user_id, row.pdf_annotation_defaults);
        return { error: null };
      },
    }),
  },
}));

import {
  clearPdfAnnotationDefaultsCache,
  extractAnnotationStyle,
  isSystemAnnotationDefaults,
  loadPdfAnnotationDefaults,
  normalizeAnnotationDefaults,
  savePdfAnnotationDefaults,
  SYSTEM_ANNOTATION_STYLE_DEFAULTS,
} from './pdfAnnotationDefaults';

describe('Per-user PDF annotation style defaults', () => {
  beforeEach(() => {
    mockStore.clear();
    clearPdfAnnotationDefaultsCache();
    currentUserId = 'user-1';
  });

  it('falls back to system defaults when nothing is saved for the user', async () => {
    const loaded = await loadPdfAnnotationDefaults();
    expect(loaded).toEqual({ textColor: '#ef4444', borderColor: '#22c55e', fillColor: null });
    expect(isSystemAnnotationDefaults(loaded)).toBe(true);
  });

  it('persists per user and reloads across sessions and documents', async () => {
    await savePdfAnnotationDefaults({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: '#ffffff' });
    clearPdfAnnotationDefaultsCache();

    const reloaded = await loadPdfAnnotationDefaults();
    expect(reloaded).toEqual({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: '#ffffff' });
    expect(isSystemAnnotationDefaults(reloaded)).toBe(false);

    // Another signed-in user sees system defaults, not user-1's row
    currentUserId = 'user-2';
    expect(await loadPdfAnnotationDefaults()).toEqual(SYSTEM_ANNOTATION_STYLE_DEFAULTS);
  });

  it('preserves previously saved colours including the old system colours', async () => {
    mockStore.set(currentUserId, { textColor: '#111827', borderColor: '#facc15', fillColor: null });
    expect(await loadPdfAnnotationDefaults()).toEqual({ textColor: '#111827', borderColor: '#facc15', fillColor: null });
  });

  it('normalizes malformed saved preferences safely', () => {
    expect(normalizeAnnotationDefaults({ textColor: 'invalid', borderColor: '#22C55E', fillColor: '' })).toEqual({
      textColor: SYSTEM_ANNOTATION_STYLE_DEFAULTS.textColor,
      borderColor: '#22c55e',
      fillColor: null,
    });
  });

  it('extracts text, border, and fill colours from a selected text box annotation', () => {
    const box: PdfAnnotation = {
      id: 'b1',
      kind: 'text',
      page: 1,
      x: 10,
      y: 10,
      width: 24,
      height: 8,
      color: '#22c55e',
      fillColor: '#ffffff',
      textColor: '#22c55e',
      label: 'Tie to TB',
      richText: '<span style="color: #22c55e;">Tie to TB</span>',
    };
    expect(extractAnnotationStyle(box)).toEqual({
      textColor: '#22c55e',
      borderColor: '#22c55e',
      fillColor: '#ffffff',
    });
  });

  it('serializes rapid default updates so the latest selection always wins', async () => {
    const p1 = savePdfAnnotationDefaults({ textColor: '#22c55e', borderColor: '#facc15', fillColor: null });
    const p2 = savePdfAnnotationDefaults({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: null });
    const p3 = savePdfAnnotationDefaults({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: '#ffffff' });
    await Promise.all([p1, p2, p3]);

    clearPdfAnnotationDefaultsCache();
    expect(await loadPdfAnnotationDefaults()).toEqual({
      textColor: '#22c55e',
      borderColor: '#22c55e',
      fillColor: '#ffffff',
    });
  });
});