import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Checklist } from '@/types/checklist';
import { ImportNotesDialog, ImportResult } from '@/components/ImportNotesDialog';

interface Audit506ImportBannerProps {
  checklist: Checklist | null;
  onUpdate: (updated: Checklist) => void;
  connectedApps?: Set<string>;
  onOpenConnectors?: () => void;
}

export function Audit506ImportBanner({ checklist, onUpdate, connectedApps, onOpenConnectors }: Audit506ImportBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imported, setImported] = useState(false);
  const [importedDate, setImportedDate] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(0);

  const handleImport = (result: ImportResult) => {
    if (!checklist) return;

    const partnerName = result.attendees?.find(a => a.role?.toLowerCase().includes('partner'))?.name ?? '';
    const managerName = result.attendees?.find(a => a.role?.toLowerCase().includes('manager'))?.name ?? '';
    const auditorName = partnerName || managerName || 'Engagement Manager';

    // Client-side attendees (management / TCWG)
    const clientAttendees = result.attendees?.filter(a =>
      a.role?.toLowerCase().includes('cfo') ||
      a.role?.toLowerCase().includes('controller') ||
      a.role?.toLowerCase().includes('client') ||
      a.role?.toLowerCase().includes('ceo') ||
      a.role?.toLowerCase().includes('board') ||
      a.role?.toLowerCase().includes('chair') ||
      a.role?.toLowerCase().includes('director')
    ) ?? [];
    const mgmtInterviewee = clientAttendees.find(a =>
      a.role?.toLowerCase().includes('cfo') || a.role?.toLowerCase().includes('ceo') || a.role?.toLowerCase().includes('controller')
    )?.name ?? clientAttendees[0]?.name ?? 'CFO / Controller';
    const tcwgInterviewee = clientAttendees.find(a =>
      a.role?.toLowerCase().includes('board') || a.role?.toLowerCase().includes('chair') || a.role?.toLowerCase().includes('director')
    )?.name ?? clientAttendees[clientAttendees.length - 1]?.name ?? 'Board Chair / Audit Committee';

    const meetingDate = result.meetingDate ? result.meetingDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const attendeeList = result.attendees?.map(a => `${a.name} (${a.role})`).join(', ') ?? '';

    type FieldFill = { answer?: string; explanation?: string; labelAnswer?: string };
    const fields: Record<string, FieldFill> = {
      '506-mgmt-iv': { answer: meetingDate, labelAnswer: mgmtInterviewee, explanation: auditorName },
      '506-mgmt-1': { answer: 'Yes', explanation: 'Management identified revenue cut-off as a potential fraud risk. Misstatement risk noted for voyage completion percentages at year-end.' },
      '506-mgmt-2': { answer: 'No', explanation: 'Management confirmed no knowledge of any actual, suspected or alleged fraud affecting the entity.' },
      '506-mgmt-3': { answer: 'Yes', explanation: 'Management confirmed understanding of the fraud risk management process. Controls include segregation of duties in revenue recognition, dual authorization for journal entries, and CFO review of unusual transactions.' },
      '506-mgmt-4': { answer: 'No', explanation: 'Management is not aware of any allegations or suspicions of fraud from former employees, analysts, regulators, or other parties.' },
      '506-mgmt-5': { answer: 'Yes', explanation: 'Management confirmed consideration of fraud risk across key assertions including revenue recognition cut-off and management override of controls.' },
      '506-tcwg-iv': { answer: meetingDate, labelAnswer: tcwgInterviewee, explanation: auditorName },
      '506-tcwg-1': { answer: 'No', explanation: 'TCWG confirmed no awareness of actual, suspected or alleged fraud affecting the entity.' },
      '506-tcwg-2': { answer: 'Yes', explanation: `TCWG oversight documented through Board minutes and Audit Committee communications. Attendees: ${attendeeList}.` },
      '506-b1': { answer: 'Yes', explanation: `Engagement team brainstorming held on ${meetingDate}. Discussed: revenue recognition fraud risk, management override, and potential misappropriation of assets.` },
      '506-b2': { answer: 'Yes', explanation: 'Revenue recognition presumed risk not rebutted given complexity of voyage completion estimates at year-end. Retained as significant risk.' },
      '506-b3': { answer: 'Yes', explanation: 'Management override of controls identified as a significant risk per CAS 240. Cannot be rebutted.' },
      '506-b4': { answer: 'Yes', explanation: 'Journal entry testing procedures identified — all entries above $25K and all unusual or late entries to be tested.' },
      '506-b5': { answer: 'Yes', explanation: 'Accounting estimates reviewed for management bias, including vessel impairment estimates and revenue accruals at year-end.' },
      '506-b6': { answer: 'Yes', explanation: 'Significant and unusual transactions reviewed; no unusual related-party transactions identified beyond normal course of business.' },
      '506-b7': { answer: 'Yes', explanation: 'Fraud risk assessment communicated to engagement management and incorporated into audit plan and risk response procedures.' },
    };

    const updatedSections = checklist.sections.map(section => ({
      ...section,
      questions: section.questions.map(question => {
        const fill = fields[question.id];
        if (!fill) return question;
        return {
          ...question,
          ...(fill.answer !== undefined ? { answer: fill.answer } : {}),
          ...(fill.labelAnswer !== undefined ? { labelAnswer: fill.labelAnswer } : {}),
          ...(fill.explanation !== undefined ? { explanation: fill.explanation } : {}),
        };
      }),
    }));

    onUpdate({ ...checklist, sections: updatedSections, updatedAt: new Date() });

    const now = new Date();
    setImportedDate(now.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }));
    setAttendeeCount(result.attendees?.length ?? 0);
    setImported(true);
    toast.success('Fraud inquiry notes imported. Review the pre-populated fields before saving.');
  };

  if (imported) {
    return (
      <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
        <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0" />
        <span className="text-sm text-foreground flex-1">Import your fraud inquiry call transcript to pre-fill this checklist</span>
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
        <span className="text-sm text-foreground flex-1">Import your fraud inquiry call transcript to pre-fill this checklist</span>
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
