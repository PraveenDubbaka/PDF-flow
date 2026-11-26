import { documentPreviewBlocks, generateDocumentPreviewPdf, type DocumentPreviewBlock } from './documentPreviewPdf';

export interface EngagementLetterPdfInput {
  html: string;
  engagementCode: string;
  clientName?: string;
  now?: Date;
}

export type EngagementLetterBlock = Pick<DocumentPreviewBlock, 'text' | 'bold' | 'gapBefore'>;

export function engagementLetterBlocks(html: string, clientName?: string): EngagementLetterBlock[] {
  return documentPreviewBlocks(html, clientName).map(({ text, bold, gapBefore }) =>
    gapBefore !== undefined ? { text, bold, gapBefore } : { text, bold },
  );
}

export async function generateEngagementLetterPdf(input: EngagementLetterPdfInput): Promise<Uint8Array> {
  return generateDocumentPreviewPdf({
    ...input,
    documentTitle: 'Engagement Letter',
    variant: 'letter',
  });
}
