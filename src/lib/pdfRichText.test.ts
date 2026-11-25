import { describe, expect, it } from 'vitest';
import { extractPlainText, parseRichTextRuns, sanitizeRichText } from './pdfRichText';

describe('PDF rich text helpers', () => {
  it('strips unsafe tags and keeps allowed formatting', () => {
    const cleaned = sanitizeRichText('<script>alert(1)</script><b style="color: rgb(239, 68, 68); font-size: 16px;">Note</b><span style="background-color: #facc15; text-decoration: underline line-through;">Hi</span>');
    expect(cleaned).not.toContain('script');
    expect(cleaned).not.toContain('alert(1)');
    expect(cleaned).toContain('Note');
    expect(cleaned).toContain('rgb(239, 68, 68)');
    expect(cleaned).toContain('16px');
    expect(extractPlainText(cleaned)).toBe('NoteHi');
  });

  it('parses styled runs for PDF export', () => {
    const runs = parseRichTextRuns(
      '<b><i style="color: #2563eb; font-size: 14px;">Total</i></b><br><span style="background-color: #facc15; text-decoration: underline line-through;">Check</span>',
      '',
      '#111827',
      12,
    );
    expect(runs).toHaveLength(2);
    expect(runs[0]?.[0]).toMatchObject({ text: 'Total', bold: true, italic: true, color: '#2563eb', fontSize: 14 });
    expect(runs[1]?.[0]).toMatchObject({ text: 'Check', highlight: '#facc15', underline: true, strike: true });
  });
});