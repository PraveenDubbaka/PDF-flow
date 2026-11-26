import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PDFDocument } from 'pdf-lib';
import { PdfWorkspace } from './PdfWorkspace';
import { persistPdfEditState } from '@/lib/pdfDocuments';
import { printGeneratedPdf } from '@/lib/pdfPrint';

vi.mock('@/lib/pdfDocuments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfDocuments')>(),
  persistPdfEditState: vi.fn(), getPdfDocument: vi.fn(),
}));
vi.mock('@/lib/pdfPrint', () => ({
  isMacPlatform: () => false, createPdfPrinter: vi.fn(),
  printGeneratedPdf: vi.fn(async (generate: () => Promise<Uint8Array>) => generate()),
}));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {}, OPS: { setFont: 1 },
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 2,
    getPage: async () => ({
      rotate: 0,
      getViewport: ({ scale, rotation = 0 }: { scale: number; rotation?: number }) => ({
        width: (rotation % 180 ? 792 : 612) * scale,
        height: (rotation % 180 ? 612 : 792) * scale,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      getTextContent: async () => ({ items: [] }),
      getOperatorList: async () => ({ fnArray: [], argsArray: [] }),
    }),
  }) }),
}));

beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn().mockReturnValue('blob:letter-test');
    static revokeObjectURL = vi.fn();
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function setup() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => bytes.slice().buffer }));
  const view = render(<MemoryRouter><TooltipProvider><PdfWorkspace documentId="letter-test" letterSource={{ bytes, name: 'AL1.1 Engagement Letter' }} /></TooltipProvider></MemoryRouter>);
  await screen.findByRole('button', { name: 'Rotate right' });
  return { ...view, bytes };
}

describe('read-only engagement letter PDF workspace', () => {
  it('rotates all pages locally and resets when reopened without persisting anything', async () => {
    const view = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    await waitFor(() => expect(document.querySelector('[data-pdf-page] canvas')?.getAttribute('width')).toBe('990'));
    fireEvent.keyDown(window, { key: 'R', shiftKey: true });
    await waitFor(() => expect(document.querySelector('[data-pdf-page] canvas')?.getAttribute('width')).toBe('765'));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    view.unmount();
    await setup();
    await waitFor(() => expect(document.querySelector('[data-pdf-page] canvas')?.getAttribute('width')).toBe('765'));
    expect(persistPdfEditState).not.toHaveBeenCalled();
  });

  it('Print and Download consume the original bytes even after rotation', async () => {
    const { bytes } = await setup();
    const downloaded: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => { if (blob instanceof Blob) downloaded.push(blob); return 'blob:download'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(printGeneratedPdf).toHaveBeenCalledOnce());
    const generate = vi.mocked(printGeneratedPdf).mock.calls[0]?.[0];
    if (!generate) throw new Error('Print did not receive letter source');
    expect(await generate()).toEqual(bytes);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(downloaded).toHaveLength(1));
    const data = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Invalid PDF'));
      reader.readAsArrayBuffer(downloaded[0]);
    });
    expect(new Uint8Array(data)).toEqual(bytes);
    expect((await PDFDocument.load(data)).getPages()[0].getRotation().angle).toBe(0);
    expect(persistPdfEditState).not.toHaveBeenCalled();
  });
});