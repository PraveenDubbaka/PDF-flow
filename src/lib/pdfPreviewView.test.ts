import { describe, expect, it } from 'vitest';
import { fitPreviewZoom, originalLetterBytes, rotatePreview } from './pdfPreviewView';

describe('letter preview viewing transforms', () => {
  it('rotates in 90 degree steps with wraparound', () => {
    expect(rotatePreview(0, 1)).toBe(90);
    expect(rotatePreview(0, -1)).toBe(270);
    expect(rotatePreview(270, 1)).toBe(0);
  });
  it('fits portrait pages to width and height', () => {
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 648, height: 448 }, 0, 'page')).toBe(0.5);
  });
  it('fits landscape pages to width and height', () => {
    expect(fitPreviewZoom({ width: 800, height: 600 }, { width: 448, height: 648 }, 0, 'page')).toBe(0.5);
  });
  it('fits rotated pages using swapped dimensions', () => {
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 448, height: 648 }, 90, 'page')).toBe(0.5);
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 448, height: 648 }, 270, 'width')).toBe(0.5);
  });
  it('keeps original print/download bytes independent of view rotation', () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const before = originalLetterBytes(bytes);
    rotatePreview(0, 1);
    expect(originalLetterBytes(bytes)).toEqual(before);
    expect(originalLetterBytes(bytes)).not.toBe(bytes);
  });
});