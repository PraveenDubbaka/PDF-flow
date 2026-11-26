import { describe, expect, it, vi } from 'vitest';
import { printGeneratedPdf, type PdfPrinter } from './pdfPrint';

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