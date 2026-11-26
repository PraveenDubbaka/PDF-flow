import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist';
import { EngagementLetterPreview, LETTER_PREVIEW_TIMEOUT_MS } from './EngagementLetterPreview';
import { generateEngagementLetterPdf } from '@/lib/engagementLetterPdf';
import { printGeneratedPdf } from '@/lib/pdfPrint';

vi.mock('@/lib/engagementLetterPdf', () => ({ generateEngagementLetterPdf: vi.fn() }));
vi.mock('@/lib/pdfPrint', () => ({
  createPdfPrinter: vi.fn(() => ({ print: vi.fn().mockResolvedValue(undefined), fallback: vi.fn(), dispose: vi.fn() })),
  printGeneratedPdf: vi.fn(async (generate: () => Promise<Uint8Array>, printer: { print: (bytes: Uint8Array) => Promise<void> }) => printer.print(await generate())),
}));
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));

const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const destroy = vi.fn().mockResolvedValue(undefined);
let resizeCallback: (() => void) | null = null;
const pageDimensions: Record<number, { width: number; height: number }> = {
  1: { width: 600, height: 800 },
  2: { width: 800, height: 600 },
};
const pdf = {
  numPages: 2,
  getPage: vi.fn(async (pageNumber: number) => {
    const dims = pageDimensions[pageNumber] ?? { width: 600, height: 800 };
    return {
      rotate: 0,
      getViewport: ({ scale, rotation = 0 }: { scale: number; rotation?: number }) => ({
        width: (Math.abs(rotation % 180) === 90 ? dims.height : dims.width) * scale,
        height: (Math.abs(rotation % 180) === 90 ? dims.width : dims.height) * scale,
      }),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      pageNumber,
    };
  }),
};

function setup(open = true) {
  return render(<EngagementLetterPreview open={open} onOpenChange={vi.fn()} engagementCode="COM-ENT-Nov212025" letterHtml="<p>Saved letter content</p>" clientName="Northline Precision" />);
}

beforeEach(() => {
  resizeCallback = null;
  vi.mocked(generateEngagementLetterPdf).mockResolvedValue(bytes);
  vi.mocked(pdfjs.getDocument).mockReturnValue({ promise: Promise.resolve(pdf), destroy } as unknown as ReturnType<typeof pdfjs.getDocument>);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { resizeCallback = cb; }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn().mockReturnValue('blob:letter-preview');
    static revokeObjectURL = vi.fn();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('Engagement Letter Preview modal', () => {
  it('opens the named PDF with thumbnails, Fit, Rotate, and page/zoom controls, without editor controls', async () => {
    setup();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('COM-ENT-Nov212025-Engagement-Letter.pdf')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Go to page/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Hide page thumbnails' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    for (const name of [/Undo/i, /Redo/i, /Annotations/i, /^Edit$/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('110%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide page thumbnails' }));
    expect(screen.queryByRole('complementary', { name: 'Letter page thumbnails' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show page thumbnails' }));
    expect(screen.getByRole('complementary', { name: 'Letter page thumbnails' })).toBeInTheDocument();
  });

  it('cycles Fit button states, shows active dropdown checkmark, recomputes on resize/page/rotation, and turns Fit off on zoom', async () => {
    setup();
    await screen.findByText('Page 1 of 2');
    const viewer = document.querySelector('[data-letter-page="1"]')?.parentElement?.parentElement as HTMLElement;
    let vw = 648;
    let vh = 448;
    Object.defineProperty(viewer, 'clientWidth', { configurable: true, get: () => vw });
    Object.defineProperty(viewer, 'clientHeight', { configurable: true, get: () => vh });

    const fitInitial = screen.getByRole('button', { name: 'Fit' });
    expect(fitInitial).toHaveAttribute('aria-pressed', 'false');
    expect(fitInitial.querySelector('svg')).toHaveClass('lucide-maximize');

    // Not fitted -> Fit to page (600x800 in 648x448 => min(600/600, 400/800) = 50%)
    fireEvent.click(fitInitial);
    const fitPage = screen.getByRole('button', { name: 'Fit to page' });
    expect(fitPage).toHaveAttribute('aria-pressed', 'true');
    expect(fitPage.querySelector('svg')).toHaveClass('lucide-shrink');
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());

    // Re-fits on page change to landscape page 2 (800x600 in 648x448 => min(600/800, 400/600) = 67%)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getByText('67%')).toBeInTheDocument());

    // Back to page 1, Fit to page -> Fit width (600/600 = 100%)
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fit to page' }));
    const fitWidth = screen.getByRole('button', { name: 'Fit width' });
    expect(fitWidth).toHaveAttribute('aria-pressed', 'true');
    expect(fitWidth.querySelector('svg')).toHaveClass('lucide-move-horizontal');
    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument());

    // Re-fits on viewport resize while Fit width is active (948 -> (948-48)/600 = 150%)
    vw = 948;
    act(() => { resizeCallback?.(); });
    await waitFor(() => expect(screen.getByText('150%')).toBeInTheDocument());

    // Re-fits on rotation while Fit width is active (90° swaps to 800 width -> 900/800 = 113%)
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    await waitFor(() => expect(screen.getByText('113%')).toBeInTheDocument());

    // Fit width -> Fit to page
    fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
    const fitPageAgain = screen.getByRole('button', { name: 'Fit to page' });
    expect(fitPageAgain).toHaveAttribute('aria-pressed', 'true');
    expect(fitPageAgain.querySelector('svg')).toHaveClass('lucide-shrink');

    // Dropdown shows checkmark only on active mode
    fireEvent.keyDown(screen.getByRole('button', { name: 'Fit options' }), { key: 'Enter' });
    expect(screen.getByRole('menuitem', { name: 'Fit to page' }).querySelector('svg')).toHaveClass('lucide-check');
    expect(screen.getByRole('menuitem', { name: 'Fit width' }).querySelector('svg')).toBeNull();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Fit to page' }), { key: 'Escape' });

    // Manual zoom turns Fit off
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('rotates all pages and thumbnails via buttons and shortcuts, and resets rotation on reopen', async () => {
    const view = setup(true);
    await screen.findByText('Page 1 of 2');
    const pageRotations = () => Array.from(document.querySelectorAll('[data-letter-page]')).map((el) => el.getAttribute('data-view-rotation'));
    const thumbRotations = () => Array.from(document.querySelectorAll('[data-thumbnail-rotation]')).map((el) => el.getAttribute('data-thumbnail-rotation'));

    expect(pageRotations()).toEqual(['0', '0']);
    expect(thumbRotations()).toEqual(['0', '0']);

    // Button rotate right + keyboard R / Shift+R / Ctrl+0
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    expect(pageRotations()).toEqual(['90', '90']);
    expect(thumbRotations()).toEqual(['90', '90']);

    fireEvent.keyDown(window, { key: 'r' });
    expect(pageRotations()).toEqual(['180', '180']);
    expect(thumbRotations()).toEqual(['180', '180']);

    fireEvent.keyDown(window, { key: 'R', shiftKey: true });
    expect(pageRotations()).toEqual(['90', '90']);

    fireEvent.keyDown(window, { key: '0', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Fit to page' })).toHaveAttribute('aria-pressed', 'true');

    // Close and reopen -> rotation and fit reset
    view.rerender(<EngagementLetterPreview open={false} onOpenChange={vi.fn()} engagementCode="COM-ENT-Nov212025" letterHtml="<p>Saved letter content</p>" clientName="Northline Precision" />);
    view.rerender(<EngagementLetterPreview open={true} onOpenChange={vi.fn()} engagementCode="COM-ENT-Nov212025" letterHtml="<p>Saved letter content</p>" clientName="Northline Precision" />);
    await screen.findByText('Page 1 of 2');
    expect(pageRotations()).toEqual(['0', '0']);
    expect(thumbRotations()).toEqual(['0', '0']);
    expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps Download and Print PDF bytes unchanged when view rotation is applied', async () => {
    setup();
    await screen.findByText('Page 1 of 2');
    const downloaded: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => { if (blob instanceof Blob) downloaded.push(blob); return 'blob:letter-preview'; });
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    expect(document.querySelector('[data-letter-page="1"]')).toHaveAttribute('data-view-rotation', '90');
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(printGeneratedPdf).toHaveBeenCalledOnce());
    const generate = vi.mocked(printGeneratedPdf).mock.calls[0]?.[0];
    if (!generate) throw new Error('Missing print source');
    expect(await generate()).toEqual(bytes);
    expect(downloaded).toHaveLength(1);
    const downloadedBytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Invalid PDF'));
      reader.onerror = reject;
      reader.readAsArrayBuffer(downloaded[0]);
    }));
    expect(downloadedBytes).toEqual(bytes);
    expect(generateEngagementLetterPdf).toHaveBeenCalledOnce();
  });

  it('shows Retry after an opening failure and recovers', async () => {
    vi.mocked(generateEngagementLetterPdf).mockRejectedValueOnce(new Error('Generation failed'));
    setup();
    expect(await screen.findByText('We couldn’t open the engagement letter.')).toBeInTheDocument();
    expect(screen.getByText('Generation failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('times out instead of hanging while the PDF is being generated', async () => {
    vi.useFakeTimers();
    vi.mocked(generateEngagementLetterPdf).mockReturnValue(new Promise(() => {}));
    setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(LETTER_PREVIEW_TIMEOUT_MS + 1); });
    expect(screen.getByText('We couldn’t open the engagement letter.')).toBeInTheDocument();
    expect(screen.getByText('The letter took too long to open. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
