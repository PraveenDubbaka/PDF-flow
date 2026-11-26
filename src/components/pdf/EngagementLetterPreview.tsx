import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Checklist } from '@/types/checklist';
import { LetterView } from '@/components/LetterView';
import { generateEngagementLetterPdf } from '@/lib/engagementLetterPdf';
import { PdfWorkspace } from './PdfWorkspace';
import './engagement-letter-preview.css';

export function EngagementLetterPreview({ checklist, clientName }: { checklist: Checklist; clientName?: string }) {
  const source = useRef<HTMLDivElement>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const html = checklist.sections?.[0]?.questions?.[0]?.text ?? '';
  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setError('');
    const sheet = source.current?.querySelector<HTMLElement>('.max-w-3xl');
    if (sheet) void generateEngagementLetterPdf(sheet).then((result) => {
      if (!cancelled) setBytes(result);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to preview letter.'); });
    return () => { cancelled = true; };
  }, [html, clientName]);
  const name = `AL1.1 ${checklist.title || 'Engagement Letter'}`;
  return <div className="flex h-full min-h-0 flex-1 flex-col" data-engagement-letter-preview>
    {bytes ? <PdfWorkspace key={checklist.id} documentId={checklist.id} letterSource={{ bytes, name }} /> : <div className="flex flex-1 items-center justify-center gap-2 text-foreground">{error || <><Loader2 className="h-5 w-5 animate-spin" />Opening letter…</>}</div>}
    <div ref={source} data-letter-pdf-source aria-hidden="true" className="engagement-letter-pdf-source">
      <LetterView checklist={checklist} onUpdate={() => {}} clientName={clientName} />
    </div>
  </div>;
}