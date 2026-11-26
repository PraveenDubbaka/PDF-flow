import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { EngagementDocumentPreviewTrigger } from './EngagementDocumentPreviewTrigger';
import { generateDocumentPreviewPdf } from '@/lib/documentPreviewPdf';
import { FS_PREVIEW_TITLES, resolveEngagementPreviewTarget } from '@/lib/engagementDocumentPreview';
import {
  generateAuditEngagementLetterChecklist,
  generateAuditEngagementLetterGAASUSGAAP,
  generateAuditUnqualifiedASPE,
  generateClientAcceptanceContinuanceChecklist,
  generateCommunicationTCWGFinalUS,
  generateCommunicationTCWGPlanningUS,
  generateCompilationEngagementReport,
  generateEngagementLetterChecklist,
  generateLetterToManagementSignificantDeficienciesUS,
  generateLetterToPredecessorAccountingFirmChecklist,
  generateManagementRepLetterAUC580,
  generateManagementResponsibilityChecklist,
  generateReviewEngagementLetterMaster,
  generateReviewUnqualifiedASPE,
  generateTCWGFinalCommunicationChecklist,
  generateTCWGPlanningCommunicationChecklist,
} from '@/lib/globalTemplates';
import type { Checklist } from '@/types/checklist';

vi.mock('@/lib/documentPreviewPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/documentPreviewPdf')>();
  return { ...actual, generateDocumentPreviewPdf: vi.fn(actual.generateDocumentPreviewPdf) };
});
vi.mock('@/lib/pdfPrint', () => ({
  createPdfPrinter: vi.fn(() => ({ print: vi.fn().mockResolvedValue(undefined), fallback: vi.fn(), dispose: vi.fn() })),
  printGeneratedPdf: vi.fn(async (generate: () => Promise<Uint8Array>, printer: { print: (bytes: Uint8Array) => Promise<void> }) => printer.print(await generate())),
}));
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));

const stubBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const stubPdf = {
  numPages: 2,
  getPage: vi.fn(async () => ({
    rotate: 0,
    getViewport: ({ scale, rotation = 0 }: { scale: number; rotation?: number }) => ({
      width: (Math.abs(rotation % 180) === 90 ? 792 : 612) * scale,
      height: (Math.abs(rotation % 180) === 90 ? 612 : 792) * scale,
    }),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
  })),
};

beforeEach(() => {
  vi.mocked(generateDocumentPreviewPdf).mockResolvedValue(stubBytes);
  vi.mocked(pdfjs.getDocument).mockReturnValue({
    promise: Promise.resolve(stubPdf),
    destroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof pdfjs.getDocument>);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function PreviewHarness({
  engagementCode,
  checklistKey,
  checklist,
  customLetterExists,
  customSectionName,
  contentHtml,
  pdfDocumentId,
}: {
  engagementCode: string;
  checklistKey?: string;
  checklist?: Checklist | null;
  customLetterExists?: boolean;
  customSectionName?: string;
  contentHtml: string;
  pdfDocumentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const target = resolveEngagementPreviewTarget({ checklistKey, checklist, customLetterExists, customSectionName, pdfDocumentId });
  return (
    <>
      <EngagementDocumentPreviewTrigger target={target} onOpen={() => setOpen(true)} />
      {target && (
        <DocumentPreviewModal
          open={open}
          onOpenChange={setOpen}
          engagementCode={engagementCode}
          documentTitle={target.title}
          contentHtml={contentHtml}
          variant={target.variant}
        />
      )}
    </>
  );
}

describe('DocumentPreviewModal across engagement letters and reports', () => {
  it('renders a Preview button for every letter, custom letter, and Financial Statement report/page type, and omits it on checklists and PDFs', () => {
    const letterTemplates: Array<[string, Checklist]> = [
      ['co-el', generateEngagementLetterChecklist()],
      ['co-mr', generateManagementResponsibilityChecklist()],
      ['aud-el', generateAuditEngagementLetterChecklist()],
      ['aud-pred', generateLetterToPredecessorAccountingFirmChecklist()],
      ['aud-tcwg-pl', generateTCWGPlanningCommunicationChecklist()],
      ['aud-tcwg-fin', generateTCWGFinalCommunicationChecklist()],
      ['aud-us-el', generateAuditEngagementLetterGAASUSGAAP()],
      ['aud-us-pred', generateLetterToPredecessorAccountingFirmChecklist()],
      ['aud-us-tcwg-pl', generateCommunicationTCWGPlanningUS()],
      ['aud-us-mr', generateManagementRepLetterAUC580()],
      ['aud-us-tcwg-fin', generateCommunicationTCWGFinalUS()],
      ['aud-us-sig-def', generateLetterToManagementSignificantDeficienciesUS()],
      ['review-el', generateReviewEngagementLetterMaster()],
      ['review-rpt', generateReviewUnqualifiedASPE()],
      ['comp-rpt', generateCompilationEngagementReport()],
      ['audit-rpt', generateAuditUnqualifiedASPE()],
    ];

    for (const [key, checklist] of letterTemplates) {
      const view = render(<PreviewHarness engagementCode="ENG-2025" checklistKey={key} checklist={checklist} contentHtml={checklist.sections[0].questions[0].text} />);
      expect(screen.getAllByRole('button', { name: 'Preview' })).toHaveLength(1);
      view.unmount();
    }

    // Every Financial Statement report & page key renders Preview
    for (const fsKey of Object.keys(FS_PREVIEW_TITLES)) {
      const view = render(<PreviewHarness engagementCode="ENG-2025" checklistKey={fsKey} contentHtml={`<h1>${FS_PREVIEW_TITLES[fsKey]}</h1>`} />);
      expect(screen.getAllByRole('button', { name: 'Preview' })).toHaveLength(1);
      view.unmount();
    }

    // Custom letter section shows Preview only when a letter exists
    const customWithLetter = render(<PreviewHarness engagementCode="ENG-2025" checklistKey="custom-1" customLetterExists customSectionName="Lawyer Letter" contentHtml="<p>Counsel inquiry</p>" />);
    expect(screen.getAllByRole('button', { name: 'Preview' })).toHaveLength(1);
    customWithLetter.unmount();

    const customEmpty = render(<PreviewHarness engagementCode="ENG-2025" checklistKey="custom-1" customLetterExists={false} customSectionName="Lawyer Letter" contentHtml="" />);
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
    customEmpty.unmount();

    // Non-letter questionnaire checklist and uploaded PDF workspace omit Preview
    const questionnaire = render(<PreviewHarness engagementCode="ENG-2025" checklistKey="co-ca" checklist={generateClientAcceptanceContinuanceChecklist()} contentHtml="" />);
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
    questionnaire.unmount();

    const pdfDoc = render(<PreviewHarness engagementCode="ENG-2025" pdfDocumentId="pdf-1" checklist={generateEngagementLetterChecklist()} contentHtml="" />);
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
    pdfDoc.unmount();
  });

  it('opens the modal with the right file name, content, Fit, and Rotate for four distinct engagement documents', async () => {
    const cases = [
      {
        code: 'COM-ENT-Nov212025',
        key: 'co-mr',
        checklist: generateManagementResponsibilityChecklist(),
        html: generateManagementResponsibilityChecklist().sections[0].questions[0].text,
        expectedName: 'COM-ENT-Nov212025-Management-responsibility-and-acknowledgement.pdf',
        expectedVariant: 'letter',
      },
      {
        code: 'AUD-ENT-2025',
        key: 'aud-fs-iar',
        checklist: null,
        html: "<h1>Independent Auditor's Report</h1><p>Unqualified opinion under CAS.</p>",
        expectedName: "AUD-ENT-2025-Independent-Auditor's-Report.pdf",
        expectedVariant: 'report',
      },
      {
        code: 'COM-ENT-Nov212025',
        key: 'fs-comp',
        checklist: null,
        html: '<h1>Compilation Engagement Report</h1><p>Compiled under CSRS 4200.</p>',
        expectedName: 'COM-ENT-Nov212025-Compilation-Report.pdf',
        expectedVariant: 'report',
      },
      {
        code: 'AUD-US-2025',
        key: 'aud-us-mr',
        checklist: generateManagementRepLetterAUC580(),
        html: generateManagementRepLetterAUC580().sections[0].questions[0].text,
        expectedName: 'AUD-US-2025-Management-Representation-Letter.pdf',
        expectedVariant: 'letter',
      },
    ];

    for (const item of cases) {
      const view = render(
        <PreviewHarness
          engagementCode={item.code}
          checklistKey={item.key}
          checklist={item.checklist}
          contentHtml={item.html}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
      expect(await screen.findByText(item.expectedName)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Fit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rotate left' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rotate right' })).toBeInTheDocument();
      expect(generateDocumentPreviewPdf).toHaveBeenLastCalledWith(expect.objectContaining({
        engagementCode: item.code,
        html: item.html,
        variant: item.expectedVariant,
      }));
      view.unmount();
    }
  });
});