import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PDFDocument } from 'pdf-lib';
import { PdfWorkspace } from './PdfWorkspace';
import { persistPdfEditState, getPdfDocument, getPdfBlobUrl, emptyPdfEditState } from '@/lib/pdfDocuments';
import type { PdfEditState } from '@/lib/pdfDocuments';
import { printGeneratedPdf } from '@/lib/pdfPrint';
import { loadPdfAnnotationDefaults, savePdfAnnotationDefaults, SYSTEM_ANNOTATION_STYLE_DEFAULTS, type PdfAnnotationStyleDefaults } from '@/lib/pdfAnnotationDefaults';
import { normalizeColorToHex } from '@/lib/pdfRichText';

vi.mock('@/lib/pdfDocuments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfDocuments')>(),
  persistPdfEditState: vi.fn(), getPdfDocument: vi.fn(), getPdfBlobUrl: vi.fn(),
}));
vi.mock('@/lib/pdfAnnotationDefaults', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfAnnotationDefaults')>(),
  loadPdfAnnotationDefaults: vi.fn(async () => ({ ...SYSTEM_ANNOTATION_STYLE_DEFAULTS })),
  savePdfAnnotationDefaults: vi.fn(async (style: PdfAnnotationStyleDefaults) => style),
  subscribePdfAnnotationDefaults: vi.fn(() => () => {}),
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

async function setup(initialEditState?: Partial<PdfEditState>, documentId = 'pdf-test') {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => bytes.slice().buffer }));
  vi.mocked(getPdfDocument).mockResolvedValue({
    id: documentId,
    name: `${documentId}.pdf`,
    current_version: 1,
    edit_state: { ...emptyPdfEditState(), ...initialEditState },
  } as Awaited<ReturnType<typeof getPdfDocument>>);
  vi.mocked(getPdfBlobUrl).mockResolvedValue('blob:test');
  const view = render(<MemoryRouter><TooltipProvider><PdfWorkspace documentId={documentId} /></TooltipProvider></MemoryRouter>);
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

  it('consolidates Link tools into one rail button, keeps Signature present, and renders all link kinds in one list', async () => {
    const existingLinks: PdfEditState['annotations'] = [
      { id: 'l-web', kind: 'link', page: 1, x: 10, y: 10, width: 4, height: 4, color: '#1C63A6', label: 'https://countable.co', value: 'https://countable.co' },
      { id: 'l-doc', kind: 'link', page: 1, x: 10, y: 20, width: 4, height: 4, color: '#1C63A6', label: 'AR Aging Summary 2025.pdf', value: 'AR Aging Summary 2025.pdf', engagementLink: { targetId: 'ls-doc-b-1', route: 'procedure/aud-wp-b', reference: '', name: 'AR Aging Summary 2025.pdf', kind: 'document', documentId: 'ls-doc-b-1' } },
      { id: 'l-eng', kind: 'link', page: 1, x: 10, y: 30, width: 4, height: 4, color: '#1C63A6', label: 'AL1.1 Engagement Letter', value: 'AL1.1 Engagement Letter', engagementLink: { targetId: 'aud-el', route: 'checklist/aud-el', reference: 'AL1.1', name: 'Engagement Letter' } },
      { id: 'l-ls', kind: 'trial-balance', page: 1, x: 10, y: 40, width: 4, height: 4, color: '#2563eb', label: 'B · Accounts Receivable (A/R) · PY1', value: 'B · Accounts Receivable (A/R) · PY1', engagementLink: { targetId: 'aud-wp-b', route: 'procedure/aud-wp-b', reference: 'B', name: 'Accounts Receivable (A/R)', lineId: '1100', column: 'PY1' } },
      { id: 'l-tb', kind: 'trial-balance', page: 1, x: 10, y: 50, width: 4, height: 4, color: '#2563eb', label: '1010 Cash & Bank · PY1', value: '1010 Cash & Bank · PY1', trialBalanceLink: { accountNo: '1010', description: 'Cash & Bank', column: 'PY1' } },
    ];
    await setup({ annotations: existingLinks });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    // Signature tool is kept in Annotations
    expect(screen.getByRole('button', { name: 'Signature' })).toBeInTheDocument();

    // Only one "Link" rail button exists; Hyperlinks & Trial balance rail buttons are removed
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hyperlinks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trial balance' })).not.toBeInTheDocument();

    // Combined links panel shows all 5 link types with their type icons
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(screen.getByLabelText('Web URL link')).toBeInTheDocument();
    expect(screen.getByLabelText('Document link')).toBeInTheDocument();
    expect(screen.getByLabelText('Engagement link')).toBeInTheDocument();
    expect(screen.getByLabelText('Lead sheet link')).toBeInTheDocument();
    expect(screen.getByLabelText('Trial balance link')).toBeInTheDocument();

    // Placement bar shows "To place a link, click on the page." + Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(screen.getByText('To place a link, click on the page.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('To place a link, click on the page.')).not.toBeInTheDocument();
  });

  it('persists per-user default annotation style across documents and applies only to new annotations', async () => {
    let savedDefaults: PdfAnnotationStyleDefaults = { ...SYSTEM_ANNOTATION_STYLE_DEFAULTS };
    vi.mocked(loadPdfAnnotationDefaults).mockImplementation(async () => ({ ...savedDefaults }));
    vi.mocked(savePdfAnnotationDefaults).mockImplementation(async (next) => {
      savedDefaults = { ...next };
      return savedDefaults;
    });

    const existingBox: PdfEditState['annotations'][number] = {
      id: 'existing-box',
      kind: 'text',
      page: 1,
      x: 10,
      y: 10,
      width: 24,
      height: 8,
      color: '#ef4444',
      fillColor: undefined,
      textColor: '#111827',
      label: 'Existing note',
    };

    const firstDoc = await setup({ annotations: [existingBox] }, 'pdf-doc-1');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    // Update "My default style" to green text, green border, white background
    fireEvent.click(screen.getByRole('button', { name: 'Default text colour #22c55e' }));
    fireEvent.click(screen.getByRole('button', { name: 'Default border colour #22c55e' }));
    fireEvent.click(screen.getByRole('button', { name: 'Default background #ffffff' }));

    expect(savedDefaults).toEqual({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: '#ffffff' });

    // Existing annotation must remain unchanged (still red border, transparent background)
    const existingEl = document.querySelector('[data-annotation-id="existing-box"]') as HTMLElement;
    expect(normalizeColorToHex(existingEl.style.borderColor)).toBe('#ef4444');
    expect(existingEl.style.backgroundColor).toBe('transparent');

    // Unmount doc 1 and open doc 2 -> defaults reload and apply to new text box from character 1
    firstDoc.unmount();
    await setup({ annotations: [] }, 'pdf-doc-2');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Default text colour #22c55e' })).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Text box' }));
    const pageEl = document.querySelector('[data-pdf-page="1"]') as HTMLElement;
    vi.spyOn(pageEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 612, height: 792, right: 612, bottom: 792, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.click(pageEl, { clientX: 120, clientY: 160 });

    const textbox = await screen.findByRole('textbox', { name: 'Text box content' });
    expect(normalizeColorToHex(textbox.style.color)).toBe('#22c55e');
    const newBoxWrapper = textbox.closest('[data-annotation-id]') as HTMLElement;
    expect(normalizeColorToHex(newBoxWrapper.style.borderColor)).toBe('#22c55e');
    expect(normalizeColorToHex(newBoxWrapper.style.backgroundColor)).toBe('#ffffff');

    // Reset to system default
    fireEvent.click(screen.getByRole('button', { name: 'Reset to system default' }));
    expect(savedDefaults).toEqual(SYSTEM_ANNOTATION_STYLE_DEFAULTS);
    // Previously created box still keeps its green/white style
    expect(normalizeColorToHex(newBoxWrapper.style.borderColor)).toBe('#22c55e');

    // Select the green/white box and click "Set as my default"
    fireEvent.keyDown(textbox, { key: 'Escape' });
    fireEvent.click(newBoxWrapper);
    const setAsDefaultBtn = await screen.findByRole('button', { name: 'Set as my default' });
    fireEvent.click(setAsDefaultBtn);
    expect(savedDefaults).toEqual({ textColor: '#22c55e', borderColor: '#22c55e', fillColor: '#ffffff' });
  }, 15000);
});