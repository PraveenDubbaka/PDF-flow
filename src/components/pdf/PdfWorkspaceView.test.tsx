import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PDFDocument } from 'pdf-lib';
import { PdfWorkspace } from './PdfWorkspace';
import { persistPdfEditState, getPdfDocument, getPdfBlobUrl, emptyPdfEditState } from '@/lib/pdfDocuments';
import { printGeneratedPdf } from '@/lib/pdfPrint';

vi.mock('@/lib/pdfDocuments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfDocuments')>(),
  persistPdfEditState: vi.fn(), getPdfDocument: vi.fn(), getPdfBlobUrl: vi.fn(),
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
  vi.stubGlobal('BroadcastChannel', class { close() {} postMessage() {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function setup() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => bytes.slice().buffer }));
  vi.mocked(getPdfDocument).mockResolvedValue({ id: 'pdf-test', name: 'test.pdf', current_version: 1, edit_state: emptyPdfEditState() } as Awaited<ReturnType<typeof getPdfDocument>>);
  vi.mocked(getPdfBlobUrl).mockResolvedValue('blob:test');
  const view = render(<MemoryRouter><TooltipProvider><PdfWorkspace documentId="pdf-test" /></TooltipProvider></MemoryRouter>);
  await screen.findByRole('button', { name: 'Rotate view right (not saved)' });
  return { ...view, bytes };
}

describe('PDF editor view-only controls', () => {
  it('rotates all pages locally and resets when reopened without persisting anything', async () => {
    const view = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Rotate view right (not saved)' }));
    await waitFor(() => expect(document.querySelector('[data-view-rotation]')?.getAttribute('data-view-rotation')).toBe('90'));
    fireEvent.keyDown(window, { key: 'R', shiftKey: true });
    await waitFor(() => expect(document.querySelector('[data-view-rotation]')?.getAttribute('data-view-rotation')).toBe('0'));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate view right (not saved)' }));
    view.unmount();
    await setup();
    await waitFor(() => expect(document.querySelector('[data-view-rotation]')?.getAttribute('data-view-rotation')).toBe('0'));
    expect(persistPdfEditState).not.toHaveBeenCalled();
  });

  it('Ctrl+0 activates fit and rotated editing is disabled until reset', async () => {
    await setup();
    fireEvent.keyDown(window, { key: '0', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Fit to page' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.keyDown(window, { key: 'r' });
    await screen.findByText('Reset view rotation to edit');
    expect(document.querySelector('.pdf-edit-panel [inert]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset rotation' }));
    await waitFor(() => expect(document.querySelector('[data-view-rotation]')).toHaveAttribute('data-view-rotation', '0'));
    expect(persistPdfEditState).not.toHaveBeenCalled();
  });

  it('cycles the Fit button between fit to page and fit width', async () => {
    await setup();
    const fitButton = () => screen.getByRole('button', { name: 'Fit' });
    expect(fitButton().querySelector('svg')).toHaveClass('lucide-maximize');

    fireEvent.click(fitButton());
    const fittedToPage = screen.getByRole('button', { name: 'Fit to page' });
    expect(fittedToPage).toHaveAttribute('aria-pressed', 'true');
    expect(fittedToPage.querySelector('svg')).toHaveClass('lucide-shrink');

    fireEvent.click(fittedToPage);
    const fittedToWidth = screen.getByRole('button', { name: 'Fit width' });
    expect(fittedToWidth).toHaveAttribute('aria-pressed', 'true');
    expect(fittedToWidth.querySelector('svg')).toHaveClass('lucide-move-horizontal');

    fireEvent.click(fittedToWidth);
    const fittedAgain = screen.getByRole('button', { name: 'Fit to page' });
    expect(fittedAgain).toHaveAttribute('aria-pressed', 'true');
    expect(fittedAgain.querySelector('svg')).toHaveClass('lucide-shrink');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Fit options' }), { key: 'Enter' });
    expect(screen.getByRole('menuitem', { name: 'Fit to page' }).querySelector('svg')).toHaveClass('lucide-check');
    expect(screen.getByRole('menuitem', { name: 'Fit width' }).querySelector('svg')).toBeNull();
  });

  it('Print and Download export without view rotation', async () => {
    await setup();
    const downloaded: Blob[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => { if (blob instanceof Blob) downloaded.push(blob); return 'blob:download'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Rotate view right (not saved)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(printGeneratedPdf).toHaveBeenCalledOnce());
    const generate = vi.mocked(printGeneratedPdf).mock.calls[0]?.[0];
    if (!generate) throw new Error('Print did not receive PDF source');
    expect((await PDFDocument.load(await generate())).getPages()[0].getRotation().angle).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(downloaded).toHaveLength(1));
    const data = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Invalid PDF'));
      reader.readAsArrayBuffer(downloaded[0]);
    });
    
    expect((await PDFDocument.load(data)).getPages()[0].getRotation().angle).toBe(0);
    expect(persistPdfEditState).not.toHaveBeenCalled();
  });
});