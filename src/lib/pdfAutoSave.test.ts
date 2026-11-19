import { describe, expect, it } from 'vitest';
import { PdfAutoSave, requiresManualPdfSave, formatOriginalAmount } from './pdfAutoSave';

describe('PDF UAT save rules', () => {
  it('serializes edits and writes the most recent state last', async () => {
    const writes: number[] = [];
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queue = new PdfAutoSave<number>(async (state) => { if (state === 1) await gate; writes.push(state); }, () => {});
    const saved = queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    release?.();
    expect(await saved).toBe(true);
    expect(writes).toEqual([1, 3]);
  });
  it('reports failed saves and recovers on the next successful edit', async () => {
    const statuses: string[] = [];
    const queue = new PdfAutoSave<number>(async (state) => { if (state === 1) throw new Error('offline'); }, (status) => statuses.push(status));
    expect(await queue.enqueue(1)).toBe(false);
    expect(statuses.at(-1)).toBe('error');
    expect(await queue.enqueue(2)).toBe(true);
    expect(statuses.at(-1)).toBe('saved');
  });
  it('keeps manual Save for simulated and password-protected documents only', () => {
    expect(requiresManualPdfSave(false)).toBe(false);
    expect(requiresManualPdfSave(true)).toBe(true);
    expect(requiresManualPdfSave(false, { user: 'protected', owner: '' })).toBe(true);
  });
  it('preserves the Original amount decimals rather than rounding to an integer', () => {
    expect(formatOriginalAmount(237307.23)).toBe('237,307.23');
    expect(formatOriginalAmount(445.5)).toBe('445.50');
  });
});