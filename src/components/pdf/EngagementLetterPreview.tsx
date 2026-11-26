import { DocumentPreviewModal, DOCUMENT_PREVIEW_TIMEOUT_MS } from './DocumentPreviewModal';
import { generateEngagementLetterPdf } from '@/lib/engagementLetterPdf';

export const LETTER_PREVIEW_TIMEOUT_MS = DOCUMENT_PREVIEW_TIMEOUT_MS;

interface EngagementLetterPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementCode: string;
  letterHtml: string;
  clientName?: string;
}

export function EngagementLetterPreview({ open, onOpenChange, engagementCode, letterHtml, clientName }: EngagementLetterPreviewProps) {
  return (
    <DocumentPreviewModal
      open={open}
      onOpenChange={onOpenChange}
      engagementCode={engagementCode}
      documentTitle="Engagement Letter"
      contentHtml={letterHtml}
      clientName={clientName}
      variant="letter"
      generatePdf={() => generateEngagementLetterPdf({ html: letterHtml, engagementCode, clientName })}
      testId="engagement-letter-preview"
    />
  );
}
