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
const pdf = {
  numPages: 2,
  getPage: vi.fn(async (pageNumber: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    pageNumber,
  })),
};

function setup(open = true) {
  return render(<EngagementLetterPreview open={open} onOpenChange={vi.fn()} engagementCode="COM-ENT-Nov212025" letterHtml="<p>Saved letter content</p>" clientName="Northline Precision" />);
}

beforeEach(() => {
  vi.mocked(generateEngagementLetterPdf).mockResolvedValue(bytes);
  vi.mocked(pdfjs.getDocument).mockReturnValue({ promise: Promise.resolve(pdf), destroy } as unknown as ReturnType<typeof pdfjs.getDocument>);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
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
  it('opens the named PDF with thumbnails and page/zoom controls, without editor controls', async () => {
    setup();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('COM-ENT-Nov212025-Engagement-Letter.pdf')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Go to page/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Hide page thumbnails' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    for (const name of [/Fit/i, /Rotate/i, /Undo/i, /Redo/i, /Annotations/i, /^Edit$/]) {
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

  it('uses exactly the same generated PDF bytes for Download and Print', async () => {
    setup();
    await screen.findByText('Page 1 of 2');
    const downloaded: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => { if (blob instanceof Blob) downloaded.push(blob); return 'blob:letter-preview'; });
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
