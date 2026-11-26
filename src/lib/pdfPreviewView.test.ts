import { describe, expect, it } from 'vitest';
import { fitPreviewZoom, pdfViewShortcut, rotatePreview } from './pdfPreviewView';

describe('PDF viewing transforms', () => {
  it('rotates in 90 degree steps with wraparound', () => {
    expect(rotatePreview(0, 1)).toBe(90);
    expect(rotatePreview(0, -1)).toBe(270);
    expect(rotatePreview(270, 1)).toBe(0);
  });

  it('fits portrait pages to page and width', () => {
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 648, height: 448 }, 0, 'page')).toBe(0.5);
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 648, height: 448 }, 0, 'width')).toBe(1);
  });

  it('fits landscape pages to page and width', () => {
    expect(fitPreviewZoom({ width: 800, height: 600 }, { width: 448, height: 648 }, 0, 'page')).toBe(0.5);
    expect(fitPreviewZoom({ width: 800, height: 600 }, { width: 448, height: 648 }, 0, 'width')).toBe(0.5);
  });

  it('fits rotated pages using swapped dimensions', () => {
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 448, height: 648 }, 90, 'page')).toBe(0.5);
    expect(fitPreviewZoom({ width: 600, height: 800 }, { width: 448, height: 648 }, 270, 'width')).toBe(0.5);
  });

  it('supports Ctrl and Cmd fit plus both rotation shortcuts', () => {
    const base = { key: '0', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
    expect(pdfViewShortcut(base, false)).toBe('fit');
    expect(pdfViewShortcut({ ...base, ctrlKey: false, metaKey: true }, false)).toBe('fit');
    expect(pdfViewShortcut({ ...base, ctrlKey: false, key: 'r' }, false)).toBe('right');
    expect(pdfViewShortcut({ ...base, ctrlKey: false, key: 'R', shiftKey: true }, false)).toBe('left');
    expect(pdfViewShortcut(base, true)).toBeNull();
    expect(pdfViewShortcut({ ...base, ctrlKey: false, key: 'r' }, true)).toBeNull();
    expect(pdfViewShortcut({ ...base, key: 'r' }, false)).toBeNull();
  });
});