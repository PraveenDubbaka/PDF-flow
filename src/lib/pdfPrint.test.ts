import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist';
import { createPdfPrinter, printGeneratedPdf, type PdfPrinter } from './pdfPrint';

vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn() }));

function printer(): PdfPrinter {
  return { print: vi.fn().mockResolvedValue(undefined), fallback: vi.fn().mockResolvedValue(undefined), dispose: vi.fn() };
}

describe('edited PDF print handler', () => {
  it('generates the edited PDF and invokes printing with its bytes', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const generate = vi.fn().mockResolvedValue(bytes);
    const output = printer();
    await printGeneratedPdf(generate, output);
    expect(generate).toHaveBeenCalledOnce();
    expect(output.print).toHaveBeenCalledWith(bytes);
    expect(output.fallback).not.toHaveBeenCalled();
  });
  it('opens the generated PDF fallback when print throws', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const output = printer();
    vi.mocked(output.print).mockRejectedValue(new Error('Printing blocked'));
    await printGeneratedPdf(async () => bytes, output);
    expect(output.fallback).toHaveBeenCalledWith(bytes);
  });
  it('reports generation failures and cleans up without attempting print', async () => {
    const output = printer();
    await expect(printGeneratedPdf(async () => { throw new Error('Export failed'); }, output)).rejects.toThrow('Export failed');
    expect(output.dispose).toHaveBeenCalledOnce();
    expect(output.print).not.toHaveBeenCalled();
    expect(output.fallback).not.toHaveBeenCalled();
  });
  it('reports a blocked fallback rather than silently succeeding', async () => {
    const output = printer();
    vi.mocked(output.print).mockRejectedValue(new Error('Blocked'));
    vi.mocked(output.fallback).mockRejectedValue(new Error('Allow pop-ups'));
    await expect(printGeneratedPdf(async () => new Uint8Array([1]), output)).rejects.toThrow('Allow pop-ups');
    expect(output.dispose).toHaveBeenCalledOnce();
  });
});

describe('browser PDF printer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.querySelectorAll('iframe').forEach((frame) => frame.remove());
  });

  it('prints decoded iframe pages without opening any tab and removes the frame after print', async () => {
    vi.useFakeTimers();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    const destroy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(pdfjs.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: async () => ({
        getViewport: () => ({ width: 1200, height: 1600 }),
        render: () => ({ promise: Promise.resolve() }),
      }) }), destroy,
    } as unknown as ReturnType<typeof pdfjs.getDocument>);
    const manual = vi.fn();
    const output = createPdfPrinter(manual);
    expect(open).not.toHaveBeenCalled();
    const print = vi.fn();
    const decode = vi.fn().mockResolvedValue(undefined);
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      const result = append(node);
      if (node instanceof HTMLIFrameElement && node.contentDocument && node.contentWindow) {
        // jsdom does not render srcdoc; populate its print document before load.
        const image = node.contentDocument.createElement('img');
        image.decode = decode;
        node.contentDocument.body.appendChild(image);
        node.contentWindow.print = print;
        node.contentWindow.focus = vi.fn();
      }
      return result;
    });
    await output.print(new Uint8Array([1]));
    const frame = document.querySelector('iframe');
    if (!frame?.contentWindow) throw new Error('Missing print frame');
    expect(print).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    expect(manual).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
    frame.contentWindow.dispatchEvent(new Event('afterprint'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('opens only the generated PDF URL after the primary path fails', async () => {
    vi.useFakeTimers();
    const target = { opener: window, addEventListener: vi.fn(), close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window);
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:generated-pdf'), revokeObjectURL: revoke });
    const manual = vi.fn();
    const output = createPdfPrinter(manual);
    vi.spyOn(output, 'print').mockRejectedValue(new Error('Printing blocked'));
    await printGeneratedPdf(async () => new Uint8Array([1]), output);
    expect(open).toHaveBeenCalledExactlyOnceWith('blob:generated-pdf', '_blank');
    expect(manual).toHaveBeenCalledWith();
    output.dispose();
    expect(revoke).toHaveBeenCalledWith('blob:generated-pdf');
  });

  it('offers an action that opens the retained PDF URL when the fallback is blocked', async () => {
    vi.useFakeTimers();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:blocked-pdf'), revokeObjectURL: revoke });
    const manual = vi.fn();
    const output = createPdfPrinter(manual);
    vi.spyOn(output, 'print').mockRejectedValue(new Error('Printing blocked'));
    await printGeneratedPdf(async () => new Uint8Array([1]), output);
    expect(manual).toHaveBeenCalledWith(expect.any(Function));
    expect(revoke).not.toHaveBeenCalled();
    const action = manual.mock.calls[0]?.[0];
    if (typeof action !== 'function') throw new Error('Missing Open PDF action');
    open.mockReturnValue({ addEventListener: vi.fn(), close: vi.fn() } as unknown as Window);
    action();
    expect(open).toHaveBeenNthCalledWith(2, 'blob:blocked-pdf', '_blank');
    vi.advanceTimersByTime(600000);
    expect(revoke).toHaveBeenCalledWith('blob:blocked-pdf');
  });
});