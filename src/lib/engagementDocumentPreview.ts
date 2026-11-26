import type { Checklist } from '@/types/checklist';
import type { DocumentPreviewVariant } from './documentPreviewPdf';

export interface EngagementPreviewTarget {
  title: string;
  variant: DocumentPreviewVariant;
  source: 'letter' | 'custom-letter' | 'fs';
}

export const FS_PREVIEW_TITLES: Record<string, string> = {
  'aud-fs-cover': 'Cover Page',
  'aud-fs-toc': 'Table of Contents',
  'aud-fs-iar': "Independent Auditor's Report",
  'aud-fs-bs': 'Balance Sheet',
  'aud-fs-is': 'Statement of Income Loss',
  'aud-fs-cf': 'Statement of Cash Flows',
  'aud-fs-eq': 'Statement of Equity',
  'aud-fs-notes': 'Notes to Financial Information',
  'aud-us-fs-cover': 'Cover Page',
  'aud-us-fs-toc': 'Table of Contents',
  'aud-us-fs-bs': 'Balance Sheet',
  'aud-us-fs-is': 'Statement of Income Loss',
  'aud-us-fs-cf': 'Statement of Cash Flows',
  'aud-us-fs-eq': 'Statement of Equity',
  'aud-us-fs-notes': 'Notes to Financial Information',
  'fs-cover': 'Cover Page',
  'fs-toc': 'Table of Contents',
  'fs-comp': 'Compilation Report',
  'fs-bs': 'Balance Sheet',
  'fs-is': 'Statement of Income Loss',
  'fs-cf': 'Statement of Cash Flows',
  'fs-notes': 'Notes to Financial Information',
};

export function isLetterChecklist(checklist: Checklist | null | undefined): boolean {
  return !!(
    checklist &&
    checklist.sections?.length > 0 &&
    checklist.sections[0]?.questions?.length > 0 &&
    checklist.sections[0].questions[0]?.answerType === 'none' &&
    !checklist.objective
  );
}

export function previewVariantForChecklist(checklist: Pick<Checklist, 'id' | 'title'>): DocumentPreviewVariant {
  if (checklist.id?.startsWith('grpt-')) return 'report';
  if (/\b(report|opinion|disclaimer|emphasis of matter|other matter)\b/i.test(checklist.title ?? '')) return 'report';
  return 'letter';
}

export function resolveEngagementPreviewTarget(params: {
  checklistKey?: string;
  checklist?: Checklist | null;
  pdfDocumentId?: string;
  customLetterExists?: boolean;
  customSectionName?: string;
}): EngagementPreviewTarget | null {
  const { checklistKey, checklist, pdfDocumentId, customLetterExists, customSectionName } = params;
  if (pdfDocumentId) return null;
  if (checklistKey && checklistKey in FS_PREVIEW_TITLES) {
    return { title: FS_PREVIEW_TITLES[checklistKey], variant: 'report', source: 'fs' };
  }
  if (checklistKey?.startsWith('custom-')) {
    return customLetterExists
      ? { title: customSectionName || 'Letter', variant: 'letter', source: 'custom-letter' }
      : null;
  }
  if (isLetterChecklist(checklist) && checklist) {
    return {
      title: checklist.title || 'Engagement Letter',
      variant: previewVariantForChecklist(checklist),
      source: 'letter',
    };
  }
  return null;
}