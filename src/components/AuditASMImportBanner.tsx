import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Checklist } from '@/types/checklist';

interface AuditASMImportBannerProps {
 checklist: Checklist | null;
 onUpdate: (updated: Checklist) => void;
 isUS?: boolean;
}

const CA_IMPORT_DATA = {
 engagementName: 'Shipping Line Inc. — Mar 31, 2024',
 meetingDate: 'April 14, 2024',
 meetingTime: '9:00 AM',
 attendeeCount: 6,
 fields: {
 'asm-s2-2': 'Planning meeting held April 14, 2024 at 9:00 AM. Attendees: J. Williams (Partner), S. Chen (Manager), A. Kumar (Senior), T. Nguyen (Staff), R. Patel (CFO — Shipping Line Inc.), M. Singh (Controller — Shipping Line Inc.). Discussed key audit areas, risk factors, and engagement timeline.',
 'asm-s4-1': 'J. Williams, CPA — Engagement Partner. 18 years experience.',
 'asm-s4-2': 'S. Chen, CPA — Engagement Manager. 9 years experience.',
 'asm-s4-3': 'A. Kumar — Senior Associate. 4 years experience.',
 'asm-s4-4': 'T. Nguyen — Staff Associate. 1 year experience.',
 'asm-s3-2': 'Two new freight contracts commenced Q3 2024. USD revenue exposure increased (~35% of revenue). New crew management software implemented Q2 2024.',
 },
};

const US_IMPORT_DATA = {
 engagementName: 'Harbor Freight Logistics LLC — Dec 31, 2024',
 meetingDate: 'January 15, 2025',
 meetingTime: '10:00 AM',
 attendeeCount: 6,
 fields: {
 'us-asm-s2-2': 'Planning meeting held January 15, 2025 at 10:00 AM. Attendees: M. Thompson (Partner), L. Garcia (Manager), Senior 1 (Revenue/AR), Senior 2 (Expenses/ASC 842), J. Reyes (CFO — Harbor Freight Logistics LLC), K. Park (Controller — Harbor Freight Logistics LLC). Discussed key audit areas, ASC 842 adoption, risk factors, and engagement timeline.',
 'us-asm-s4-1': 'M. Thompson, CPA — Engagement Partner. 20 years experience.',
 'us-asm-s4-2': 'L. Garcia, CPA — Engagement Manager. 10 years experience.',
 'us-asm-s4-3': 'Senior 1 (Revenue/AR) and Senior 2 (Expenses/ASC 842). 3+ years experience each.',
 'us-asm-s4-4': 'Staff 1 (AP/Cash) and Staff 2 (Fixed assets/Other).',
 'us-asm-s3-2': 'ASC 842 adopted for new finance leases Q1 2024. LoadMaster Pro billing system upgraded Q2 2024. Expansion to 3 additional states (10 to 12 states) Q3 2024.',
 },
};

export function AuditASMImportBanner({ checklist, onUpdate, isUS = false }: AuditASMImportBannerProps) {
 const [showConfirm, setShowConfirm] = useState(false);
 const [imported, setImported] = useState(false);
 const [importedDate, setImportedDate] = useState<string>('');

 const data = isUS ? US_IMPORT_DATA : CA_IMPORT_DATA;

 const handleConfirmImport = () => {
 if (!checklist) return;

 const updatedSections = checklist.sections.map(section => ({
...section,
 questions: section.questions.map(question => {
 const newAnswer = data.fields[question.id as keyof typeof data.fields];
 if (newAnswer !== undefined) {
 return {...question, answer: newAnswer };
 }
 return question;
 }),
 }));

 onUpdate({...checklist, sections: updatedSections, updatedAt: new Date() });

 const now = new Date();
 const dateStr = now.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
 setImportedDate(dateStr);
 setImported(true);
 setShowConfirm(false);
 toast.success('Meeting notes imported. Review the pre-populated fields before saving.');
 };

 if (imported) {
 return (
 <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
 <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0" />
 <span className="text-sm text-foreground flex-1">Import your Team Planning Discussion notes to pre-fill this strategy</span>
 <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
 <Check className="h-3 w-3" />
 Imported — {importedDate}
 </div>
 </div>
 );
 }

 if (showConfirm) {
 return (
 <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 mb-4">
 <div className="flex items-start gap-3">
 <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0 mt-0.5" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-foreground">Meeting found: Team Planning Discussion — {data.engagementName}</p>
 <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{data.meetingDate} at {data.meetingTime}</span>
 <span className="flex items-center gap-1"><Users className="h-3 w-3" />{data.attendeeCount} attendees</span>
 </div>
 <div className="flex gap-2 mt-3">
 <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
 <Button
 size="sm"
 className="bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] text-white hover:opacity-90"
 onClick={handleConfirmImport}
 >
 <Check className="h-3.5 w-3.5 mr-1.5" />
 Confirm &amp; Import
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-gradient-to-r from-[#1C63A6]/5 to-[#7A31D8]/5 border border-[#1C63A6]/20 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
 <Sparkles className="h-4 w-4 text-[#1C63A6] flex-shrink-0" />
 <span className="text-sm text-foreground flex-1">Import your Team Planning Discussion notes to pre-fill this strategy</span>
 <button
 onClick={() => setShowConfirm(true)}
 className="bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] text-white text-xs font-medium px-3 py-1.5 rounded-full gap-1.5 flex items-center hover:opacity-90 transition-opacity"
 >
 <Sparkles className="h-3 w-3" />
 Import Notes
 </button>
 </div>
 );
}
