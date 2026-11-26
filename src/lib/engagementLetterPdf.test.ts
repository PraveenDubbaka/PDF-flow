import { describe, expect, it } from 'vitest';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { engagementLetterBlocks, generateEngagementLetterPdf } from './engagementLetterPdf';

describe('engagement letter PDF generation', () => {
  it('turns saved markup into readable text blocks and replaces the template client name', () => {
    expect(engagementLetterBlocks('<h1>Engagement Letter</h1><p>Dear <strong>Shipping Line Inc.</strong>,</p><ul><li>First term</li></ul><p>Next<br/>line</p>', 'Northline Precision')).toEqual([
      { text: 'Engagement Letter', bold: true },
      { text: 'Dear Northline Precision,', bold: true },
      { text: '- First term', bold: false },
      { text: 'Next line', bold: false },
    ]);
  });

  it('generates a real Letter-size PDF with selectable text operators and signature content', async () => {
    const bytes = await generateEngagementLetterPdf({
      html: '<p>Engagement terms for Shipping Line Inc.</p>',
      engagementCode: 'COM-ENT-Nov212025',
      clientName: 'Northline Precision',
      now: new Date('2026-11-26T16:30:00Z'),
    });
    expect(bytes.length).toBeGreaterThan(1000);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe('COM-ENT-Nov212025-Engagement-Letter.pdf');
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    // pdf-lib emits text-showing operators for embedded, selectable text.
    const contents = pdf.context.lookup(pdf.getPage(0).node.Contents());
    const stream = contents instanceof PDFRawStream
      ? contents
      : contents instanceof PDFArray
        ? contents.asArray().map((entry) => pdf.context.lookup(entry)).find((entry): entry is PDFRawStream => entry instanceof PDFRawStream)
        : undefined;
    if (!stream) throw new Error('Missing letter content stream');
    const operators = new TextDecoder().decode(decodePDFRawStream(stream).decode());
    expect(operators).toContain('Tj');
    const selectableText = Array.from(operators.matchAll(/<([0-9A-F]+)> Tj/g), (match) =>
      (match[1].match(/.{2}/g) ?? []).map((byte) => String.fromCharCode(Number.parseInt(byte, 16))).join(''),
    ).join('\n');
    expect(selectableText).toContain('Engagement terms for Northline Precision');
  });

  it('paginates long letters without dropping paragraphs', async () => {
    const html = Array.from({ length: 100 }, (_, index) => `<p>Paragraph ${index + 1}: ${'Engagement terms '.repeat(15)}</p>`).join('');
    const bytes = await generateEngagementLetterPdf({ html, engagementCode: 'AUD-US-Dec312024' });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: 612, height: 792 });
  });
});
