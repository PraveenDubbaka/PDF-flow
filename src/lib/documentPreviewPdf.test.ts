import { describe, expect, it } from 'vitest';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { extractFsPagesHtml, formatDocumentPreviewFileName, generateDocumentPreviewPdf } from './documentPreviewPdf';
import { isLetterChecklist, previewVariantForChecklist } from './engagementDocumentPreview';
import {
  generateAuditEngagementLetterChecklist,
  generateCompilationEngagementReport,
  generateLetterToManagementSignificantDeficienciesUS,
  generateManagementRepLetterAUC580,
  generateManagementResponsibilityChecklist,
  generateTCWGFinalCommunicationChecklist,
  generateClientAcceptanceContinuanceChecklist,
} from './globalTemplates';

function extractSelectableText(pdf: PDFDocument, pageIndex = 0) {
  const contents = pdf.context.lookup(pdf.getPage(pageIndex).node.Contents());
  const stream = contents instanceof PDFRawStream
    ? contents
    : contents instanceof PDFArray
      ? contents.asArray().map((entry) => pdf.context.lookup(entry)).find((entry): entry is PDFRawStream => entry instanceof PDFRawStream)
      : undefined;
  if (!stream) throw new Error('Missing PDF content stream');
  const operators = new TextDecoder().decode(decodePDFRawStream(stream).decode());
  return Array.from(operators.matchAll(/<([0-9A-F]+)> Tj/g), (match) =>
    (match[1].match(/.{2}/g) ?? []).map((byte) => String.fromCharCode(Number.parseInt(byte, 16))).join(''),
  ).join('\n');
}

describe('generic engagement document PDF preview', () => {
  it('formats "{engagement code}-{document name}.pdf" cleanly across letters and reports', () => {
    expect(formatDocumentPreviewFileName('COM-ENT-Nov212025', 'Engagement Letter')).toBe('COM-ENT-Nov212025-Engagement-Letter.pdf');
    expect(formatDocumentPreviewFileName('COM-ENT-Nov212025', 'Management responsibility and acknowledgement')).toBe('COM-ENT-Nov212025-Management-responsibility-and-acknowledgement.pdf');
    expect(formatDocumentPreviewFileName('AUD-2025', "Independent Auditor's Report")).toBe("AUD-2025-Independent-Auditor's-Report.pdf");
    expect(formatDocumentPreviewFileName('AUD-2025', 'TCWG Communication — Planning')).toBe('AUD-2025-TCWG-Communication-Planning.pdf');
  });

  it('generates distinct selectable-text PDFs for letters and reports (without adding letterheads to reports)', async () => {
    const mr = generateManagementResponsibilityChecklist();
    const mrBytes = await generateDocumentPreviewPdf({
      html: mr.sections[0].questions[0].text,
      engagementCode: 'COM-2025',
      documentTitle: mr.title,
      clientName: 'Northline Precision',
      variant: 'letter',
    });
    const mrPdf = await PDFDocument.load(mrBytes);
    expect(mrPdf.getTitle()).toBe('COM-2025-Management-responsibility-and-acknowledgement.pdf');
    const mrText = extractSelectableText(mrPdf);
    expect(mrText).toContain('MAPLE GROVE ACCOUNTING');

    const compReport = generateCompilationEngagementReport();
    const reportBytes = await generateDocumentPreviewPdf({
      html: compReport.sections[0].questions[0].text,
      engagementCode: 'COM-2025',
      documentTitle: compReport.title,
      variant: 'report',
    });
    const reportPdf = await PDFDocument.load(reportBytes);
    expect(reportPdf.getTitle()).toBe('COM-2025-Compilation-Engagement-Report.pdf');
    const reportText = extractSelectableText(reportPdf);
    expect(reportText).not.toContain('MAPLE GROVE ACCOUNTING');
    expect(reportText).toContain('COMPILATION ENGAGEMENT REPORT');
  });

  it('extracts Financial Statement DOM pages without placeholders and splits multi-page notes', async () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <div data-fs-page>
        <div>Header will come here</div>
        <h1>Balance Sheet</h1>
        <table><tr><td>Cash</td><td>$125,000</td></tr></table>
        <div>DRAFT UNDER DISCUSSION</div>
        <div>Footer will come here</div>
      </div>
      <div data-fs-page>
        <h2>Note 1 — Significant Accounting Policies</h2>
        <p>Basis of presentation under ASPE.</p>
      </div>
    `;
    const extracted = extractFsPagesHtml(host, 'Balance Sheet');
    const bytes = await generateDocumentPreviewPdf({
      html: extracted,
      engagementCode: 'AUD-2025',
      documentTitle: 'Balance Sheet',
      variant: 'report',
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    const page1 = extractSelectableText(pdf, 0);
    const page2 = extractSelectableText(pdf, 1);
    expect(page1).toContain('Balance Sheet');
    expect(page1).toContain('Cash');
    expect(page1).toContain('$125,000');
    expect(page1).not.toContain('Header will come here');
    expect(page1).not.toContain('DRAFT UNDER DISCUSSION');
    expect(page2).toContain('Basis of presentation under ASPE');
  });

  it('classifies all letter/report templates vs questionnaire checklists accurately', () => {
    expect(isLetterChecklist(generateAuditEngagementLetterChecklist())).toBe(true);
    expect(isLetterChecklist(generateManagementResponsibilityChecklist())).toBe(true);
    expect(isLetterChecklist(generateManagementRepLetterAUC580())).toBe(true);
    expect(isLetterChecklist(generateTCWGFinalCommunicationChecklist())).toBe(true);
    expect(isLetterChecklist(generateLetterToManagementSignificantDeficienciesUS())).toBe(true);
    expect(isLetterChecklist(generateClientAcceptanceContinuanceChecklist())).toBe(false);
    expect(previewVariantForChecklist(generateCompilationEngagementReport())).toBe('report');
    expect(previewVariantForChecklist(generateAuditEngagementLetterChecklist())).toBe('letter');
  });
});