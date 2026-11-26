import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  buildSignatureAnnotationFields,
  canPlaceSignature,
  DEFAULT_SIGNATURE_FONT,
  DEFAULT_SIGNATURE_INK,
  formatSignatureListTitle,
  resolveSignatureData,
} from './pdfSignature';
import {
  MAX_SIGNATURE_UPLOAD_BYTES,
  removeNearWhitePixels,
  validateSignatureUploadFile,
} from './pdfSignatureUpload';
import { drawSignatureStampToPdf } from './pdfSignatureExport';
import type { PdfAnnotation } from './pdfDocuments';

const TINY_TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('PDF signature data model and legacy migration', () => {
  it('saves structured draw signature data without typed fields', () => {
    const fields = buildSignatureAnnotationFields({
      signatureMode: 'draw',
      signatureImage: TINY_TRANSPARENT_PNG,
      signatureText: '',
      signatureFont: 'Dancing Script',
      inkColor: '#1f2a44',
      signerName: 'Venkata Ramana',
      signerRole: 'Reviewed by',
      signedDate: '2026-11-26',
    });

    expect(fields.signatureMode).toBe('draw');
    expect(fields.signatureImage).toBe(TINY_TRANSPARENT_PNG);
    expect(fields.signatureText).toBeUndefined();
    expect(fields.signatureFont).toBeUndefined();
    expect(fields.inkColor).toBe('#1f2a44');
    expect(fields.signerName).toBe('Venkata Ramana');
    expect(fields.signerRole).toBe('Reviewed by');
    expect(fields.signedDate).toBe('2026-11-26');
    expect(fields.label).toBe('Signature — Venkata Ramana');
  });

  it('saves structured type signature data without drawn image', () => {
    const fields = buildSignatureAnnotationFields({
      signatureMode: 'type',
      signatureImage: TINY_TRANSPARENT_PNG,
      signatureText: 'V. Ramana',
      signatureFont: 'Great Vibes',
      inkColor: '#1d4ed8',
      signerName: 'Venkata Ramana',
      signerRole: 'Approved by',
      signedDate: '2026-11-26',
    });

    expect(fields.signatureMode).toBe('type');
    expect(fields.signatureImage).toBeUndefined();
    expect(fields.signatureText).toBe('V. Ramana');
    expect(fields.signatureFont).toBe('Great Vibes');
    expect(fields.inkColor).toBe('#1d4ed8');
    expect(fields.signerName).toBe('Venkata Ramana');
    expect(fields.signerRole).toBe('Approved by');
    expect(fields.signedDate).toBe('2026-11-26');
    expect(fields.label).toBe('Signature — Venkata Ramana');
  });

  it('migrates legacy signerLabel and signedDate annotations into stamp data', () => {
    const legacy: PdfAnnotation = {
      id: 'sig-legacy',
      kind: 'signature',
      page: 1,
      x: 10,
      y: 20,
      width: 24,
      height: 7,
      color: '#111827',
      signerLabel: 'Reviewed by Alex Chen',
      signedDate: '2026-11-25',
      label: 'Reviewed by Alex Chen · 2026-11-25',
    };

    const resolved = resolveSignatureData(legacy);
    expect(resolved.signatureMode).toBe('type');
    expect(resolved.signerRole).toBe('Reviewed by');
    expect(resolved.signerName).toBe('Alex Chen');
    expect(resolved.signatureText).toBe('Alex Chen');
    expect(resolved.signatureFont).toBe(DEFAULT_SIGNATURE_FONT);
    expect(resolved.inkColor).toBe('#111827');
    expect(resolved.signedDate).toBe('2026-11-25');
    expect(formatSignatureListTitle(legacy)).toBe('Signature — Alex Chen');
  });

  it('migrates legacy annotations without a role prefix and defaults ink color when missing', () => {
    const resolved = resolveSignatureData({
      kind: 'signature',
      signerLabel: 'Priya Patel',
      signedDate: '2026-11-20',
      color: '',
    });
    expect(resolved.signerRole).toBe('');
    expect(resolved.signerName).toBe('Priya Patel');
    expect(resolved.signatureText).toBe('Priya Patel');
    expect(resolved.inkColor).toBe(DEFAULT_SIGNATURE_INK);
  });

  it('disables placement when draw pad or typed signature is empty', () => {
    expect(canPlaceSignature({ signatureMode: 'draw', signatureImage: undefined, signatureText: '', hasDrawnStrokes: false })).toBe(false);
    expect(canPlaceSignature({ signatureMode: 'draw', signatureImage: TINY_TRANSPARENT_PNG, signatureText: '', hasDrawnStrokes: false })).toBe(true);
    expect(canPlaceSignature({ signatureMode: 'draw', signatureImage: undefined, signatureText: '', hasDrawnStrokes: true })).toBe(true);
    expect(canPlaceSignature({ signatureMode: 'type', signatureImage: undefined, signatureText: '   ', hasDrawnStrokes: false })).toBe(false);
    expect(canPlaceSignature({ signatureMode: 'type', signatureImage: undefined, signatureText: 'Alex', hasDrawnStrokes: false })).toBe(true);
    expect(canPlaceSignature({ signatureMode: 'upload', signatureImage: undefined, signatureText: '' })).toBe(false);
    expect(canPlaceSignature({ signatureMode: 'upload', signatureImage: TINY_TRANSPARENT_PNG, signatureText: '' })).toBe(true);
  });

  it('saves structured upload signature data, validates file type/size, and removes near-white pixels', () => {
    const fields = buildSignatureAnnotationFields({
      signatureMode: 'upload',
      signatureImage: TINY_TRANSPARENT_PNG,
      signatureText: '',
      signatureFont: 'Dancing Script',
      inkColor: '#1f2a44',
      signerName: 'Alex Chen',
      signerRole: 'Reviewed by',
      signedDate: '2026-11-26',
    });
    expect(fields.signatureMode).toBe('upload');
    expect(fields.signatureImage).toBe(TINY_TRANSPARENT_PNG);
    expect(fields.signatureText).toBeUndefined();
    expect(resolveSignatureData(fields)).toMatchObject({
      signatureMode: 'upload',
      signatureImage: TINY_TRANSPARENT_PNG,
      signerName: 'Alex Chen',
    });

    expect(validateSignatureUploadFile({ name: 'sig.png', type: 'image/png', size: 1024 })).toBeNull();
    expect(validateSignatureUploadFile({ name: 'sig.jpg', type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateSignatureUploadFile({ name: 'sig.svg', type: 'image/svg+xml', size: 1024 })).toBeNull();
    expect(validateSignatureUploadFile({ name: 'doc.pdf', type: 'application/pdf', size: 1024 })).toMatch(/PNG, JPG, or SVG/i);
    expect(validateSignatureUploadFile({ name: 'huge.png', type: 'image/png', size: MAX_SIGNATURE_UPLOAD_BYTES + 1 })).toMatch(/2 MB/i);

    // Pixel 0: near-white (250,250,250,255) -> alpha 0; Pixel 1: dark ink (20,30,60,255) -> unchanged
    const pixels = new Uint8ClampedArray([250, 250, 250, 255, 20, 30, 60, 255]);
    removeNearWhitePixels(pixels);
    expect(pixels[3]).toBe(0);
    expect(pixels[7]).toBe(255);
  });
});

describe('PDF signature export', () => {
  it('exports drawn and typed signature stamps with embedded script font and italic fallback', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const page = doc.addPage([612, 792]);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontMedium = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalicFallback = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const cache = new Map();

    const loadLocalFont = async (ttfUrl: string) => {
      const fullPath = path.resolve(process.cwd(), 'public', ttfUrl.replace(/^\//, ''));
      return fs.readFileSync(fullPath);
    };

    const typedItem: PdfAnnotation = {
      id: 'sig-type',
      kind: 'signature',
      page: 1,
      x: 10,
      y: 10,
      width: 24,
      height: 11,
      color: '#1f2a44',
      ...buildSignatureAnnotationFields({
        signatureMode: 'type',
        signatureText: 'Venkata Ramana',
        signatureFont: 'Dancing Script',
        inkColor: '#1f2a44',
        signerName: 'Venkata Ramana',
        signerRole: 'Reviewed by',
        signedDate: '2026-11-26',
      }),
    };

    const drawnItem: PdfAnnotation = {
      id: 'sig-draw',
      kind: 'signature',
      page: 1,
      x: 40,
      y: 10,
      width: 24,
      height: 11,
      color: '#1d4ed8',
      ...buildSignatureAnnotationFields({
        signatureMode: 'draw',
        signatureImage: TINY_TRANSPARENT_PNG,
        signatureText: '',
        signatureFont: 'Dancing Script',
        inkColor: '#1d4ed8',
        signerName: 'Venkata Ramana',
        signerRole: 'Reviewed by',
        signedDate: '2026-11-26',
      }),
    };

    await drawSignatureStampToPdf({
      output: doc,
      page,
      item: typedItem,
      x: 60,
      y: 620,
      boxWidth: 160,
      boxHeight: 80,
      fontRegular,
      fontMedium,
      fontItalicFallback,
      scriptFontCache: cache,
      loadFontBytes: loadLocalFont,
    });
    expect(cache.has('Dancing Script')).toBe(true);

    // Also test fallback when font loading fails
    const failCache = new Map();
    await drawSignatureStampToPdf({
      output: doc,
      page,
      item: { ...typedItem, signatureFont: 'Caveat' },
      x: 60,
      y: 500,
      boxWidth: 160,
      boxHeight: 80,
      fontRegular,
      fontMedium,
      fontItalicFallback,
      scriptFontCache: failCache,
      loadFontBytes: async () => { throw new Error('network error'); },
    });
    expect(failCache.has('Caveat')).toBe(false);

    await drawSignatureStampToPdf({
      output: doc,
      page,
      item: drawnItem,
      x: 260,
      y: 620,
      boxWidth: 160,
      boxHeight: 80,
      fontRegular,
      fontMedium,
      fontItalicFallback,
      scriptFontCache: cache,
      loadFontBytes: loadLocalFont,
    });

    await drawSignatureStampToPdf({
      output: doc,
      page,
      item: { ...drawnItem, id: 'sig-upload', signatureMode: 'upload' },
      x: 260,
      y: 500,
      boxWidth: 160,
      boxHeight: 80,
      fontRegular,
      fontMedium,
      fontItalicFallback,
      scriptFontCache: cache,
      loadFontBytes: loadLocalFont,
    });

    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(1000);
  });
});