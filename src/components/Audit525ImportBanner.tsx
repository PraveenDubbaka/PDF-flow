import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Checklist } from '@/types/checklist';
import { ImportNotesDialog, ImportResult } from '@/components/ImportNotesDialog';

interface Audit525ImportBannerProps {
  checklist: Checklist | null;
  onUpdate: (updated: Checklist) => void;
  connectedApps?: Set<string>;
  onOpenConnectors?: () => void;
}

export function Audit525ImportBanner({ checklist, onUpdate, connectedApps, onOpenConnectors }: Audit525ImportBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imported, setImported] = useState(false);
  const [importedDate, setImportedDate] = useState('');

  const handleImport = (result: ImportResult) => {
    if (!checklist) return;

    const partnerName = result.attendees?.find(a => a.role?.toLowerCase().includes('partner'))?.name ?? '';
    const managerName = result.attendees?.find(a => a.role?.toLowerCase().includes('manager'))?.name ?? '';
    const auditorName = partnerName || managerName || 'Engagement Manager';

    const clientAttendees = result.attendees?.filter(a =>
      a.role?.toLowerCase().includes('cfo') ||
      a.role?.toLowerCase().includes('ceo') ||
      a.role?.toLowerCase().includes('controller') ||
      a.role?.toLowerCase().includes('board') ||
      a.role?.toLowerCase().includes('chair') ||
      a.role?.toLowerCase().includes('director') ||
      a.role?.toLowerCase().includes('president') ||
      a.role?.toLowerCase().includes('owner')
    ) ?? [];

    const mgmtInterviewee = clientAttendees.find(a =>
      a.role?.toLowerCase().includes('cfo') || a.role?.toLowerCase().includes('ceo') || a.role?.toLowerCase().includes('controller')
    )?.name ?? clientAttendees[0]?.name ?? 'CFO / Controller';

    const tcwgInterviewee = clientAttendees.find(a =>
      a.role?.toLowerCase().includes('board') || a.role?.toLowerCase().includes('chair') || a.role?.toLowerCase().includes('director')
    )?.name ?? clientAttendees[1]?.name ?? 'Board Chair / Audit Committee';

    const meetingDate = result.meetingDate ? result.meetingDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

    // Fill yes-no questions
    type FieldFill = { answer?: string; explanation?: string };
    const fields: Record<string, FieldFill> = {
      '525-1a':     { answer: 'Yes', explanation: 'Management confirmed a preliminary going concern assessment was performed. No material uncertainty was identified.' },
      '525-1a-i':   { answer: 'No',  explanation: 'Management did not identify any events or conditions that cast significant doubt on the entity\'s ability to continue as a going concern.' },
      '525-1a-ii':  { answer: 'Yes', explanation: 'The assessment was evaluated for completeness and all relevant information considered.' },
      '525-1b':     { answer: 'No',  explanation: 'Management has no knowledge of events or conditions beyond the assessment period that would cast doubt on going concern.' },
      '525-1c':     { answer: 'No',  explanation: 'Not applicable — management performed a going concern assessment.' },
      '525-1c-i':   { answer: 'Yes', explanation: 'Management confirmed awareness of their responsibility to assess going concern and no relevant events or conditions were identified.' },
      '525-1d':     { answer: 'No',  explanation: 'No adverse events or conditions were identified as a result of other risk assessment procedures.' },
      '525-1d-i':   { answer: 'No',  explanation: 'No significant financing or cash flow challenges identified.' },
      '525-1d-ii':  { answer: 'No',  explanation: 'No adverse market conditions, trends or events identified.' },
      '525-1d-iii': { answer: 'No',  explanation: 'No regulatory or legal challenges identified.' },
      '525-1d-iv':  { answer: 'No',  explanation: 'No other adverse events or conditions identified.' },
      '525-1e':     { answer: 'Yes', explanation: 'No adverse events or conditions were identified, therefore no additional documentation is required and 625 is not applicable.' },
      // Appendix A — Financing / Cash Flow
      '525-A1a': { answer: 'No', explanation: 'Entity has positive equity and adequate working capital.' },
      '525-A1b': { answer: 'No', explanation: 'Entity has access to existing borrowing facilities.' },
      '525-A1c': { answer: 'No', explanation: 'No indications of withdrawal of financial support.' },
      '525-A1d': { answer: 'No', explanation: 'Operating cash flows are positive per current F/S.' },
      '525-A1e': { answer: 'No', explanation: 'No evidence of inability to pay creditors on due dates.' },
      '525-A1f': { answer: 'No', explanation: 'Entity is in compliance with loan agreements.' },
      // Appendix A — Market Conditions
      '525-A2a': { answer: 'No', explanation: 'Management has no intention to liquidate or cease operations.' },
      '525-A2b': { answer: 'No', explanation: 'No loss of key management or employees without replacement.' },
      '525-A2c': { answer: 'No', explanation: 'No loss of major market, key customer, franchise, licence or principal supplier.' },
      '525-A2d': { answer: 'No', explanation: 'No emergence of a highly successful competitor identified.' },
      '525-A2e': { answer: 'No', explanation: 'No substantial operating losses or significant deterioration in asset values.' },
      // Appendix A — Regulatory / Legal
      '525-A3a': { answer: 'No', explanation: 'No pending legal or regulatory proceedings.' },
      '525-A3b': { answer: 'No', explanation: 'No adverse changes in law or regulation expected.' },
      '525-A3c': { answer: 'No', explanation: 'Entity is in compliance with capital and statutory requirements.' },
      // Appendix A — Other
      '525-A4a': { answer: 'No', explanation: 'No significant estimation uncertainty relating to accounting estimates.' },
    };

    // Update questions
    const updatedSections = checklist.sections.map(section => {
      // Fill formLayout Inquiries section
      if (section.formLayout) {
        const inqData: Record<string, string> = {
          'ra525-inq-1-who':  mgmtInterviewee,
          'ra525-inq-1-date': meetingDate,
          'ra525-inq-1-by':   auditorName,
          'ra525-inq-2-who':  tcwgInterviewee,
          'ra525-inq-2-date': meetingDate,
          'ra525-inq-2-by':   auditorName,
        };
        const updatedElements = section.formLayout.elements.map(el => {
          const v = inqData[el.id];
          return v !== undefined ? { ...el, value: v } : el;
        });
        return { ...section, isExpanded: true, formLayout: { ...section.formLayout, elements: updatedElements } };
      }

      // Fill yes-no questions
      const updatedQuestions = section.questions.map(q => {
        const fill = fields[q.id];
        if (!fill) return q;
        return {
          ...q,
          ...(fill.answer !== undefined ? { answer: fill.answer } : {}),
          ...(fill.explanation !== undefined ? { explanation: fill.explanation } : {}),
        };
      });
      return { ...section, isExpanded: true, questions: updatedQuestions };
    });

    onUpdate({ ...checklist, sections: updatedSections, updatedAt: new Date() });

    const now = new Date();
    setImportedDate(now.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }));
    setImported(true);
    toast.success('Going concern inquiry notes imported. Review pre-populated fields before saving.');
  };

  if (imported) {
    return (
      <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
        <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0" />
        <span className="text-sm text-foreground flex-1">Import your going concern inquiry transcript to pre-fill this checklist</span>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
          <Check className="h-3 w-3" />
          Imported — {importedDate}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
        <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0" />
        <span className="text-sm text-foreground flex-1">Import your going concern inquiry transcript to pre-fill this checklist</span>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 shrink-0 whitespace-nowrap">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Import
        </Button>
      </div>
      <ImportNotesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onImport={handleImport}
        connectedApps={connectedApps}
        onOpenConnectors={onOpenConnectors}
      />
    </>
  );
}
