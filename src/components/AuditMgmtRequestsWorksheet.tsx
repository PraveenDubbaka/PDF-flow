import { useState } from 'react';
import { Info, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AuditMgmtRequestsWorksheetProps {
 isUS?: boolean;
}

interface RequestRow {
 id: string;
 description: string;
 com: 'V' | 'L' | 'Em' | '';
 personResponsible: string;
 requestDate: string;
 followUpDate: string;
 dateReceived: string;
 wpRef: string;
}

const todayStr = () => {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const makeRow = (id: string, overrides: Partial<RequestRow> = {}): RequestRow => ({
 id, description: '', com: '', personResponsible: '', requestDate: todayStr(),
 followUpDate: '', dateReceived: '', wpRef: '',...overrides,
});

const MOCK_CA: RequestRow[] = [
 makeRow('r1', { description: 'Trial balance as at March 31, 2024 (with comparative)', com: 'Em', personResponsible: 'M. Singh (Controller)', requestDate: '2024-04-08', followUpDate: '2024-04-12', dateReceived: '2024-04-11', wpRef: 'TB-01' }),
 makeRow('r2', { description: 'Aged accounts receivable listing as at March 31, 2024', com: 'Em', personResponsible: 'M. Singh (Controller)', requestDate: '2024-04-08', followUpDate: '2024-04-12', dateReceived: '2024-04-15', wpRef: 'AR-01' }),
 makeRow('r3', { description: 'Share register and minute book — updated to March 31, 2024', com: 'L', personResponsible: 'R. Patel (CFO)', requestDate: '2024-04-08', followUpDate: '2024-04-22', dateReceived: '', wpRef: 'EQ-01' }),
];

const MOCK_US: RequestRow[] = [
 makeRow('r1', { description: 'Trial balance as at December 31, 2024 (with comparative)', com: 'Em', personResponsible: 'K. Park (Controller)', requestDate: '2025-01-06', followUpDate: '2025-01-10', dateReceived: '2025-01-09', wpRef: 'TB-01' }),
 makeRow('r2', { description: 'Aged accounts receivable listing as at December 31, 2024', com: 'Em', personResponsible: 'K. Park (Controller)', requestDate: '2025-01-06', followUpDate: '2025-01-10', dateReceived: '2025-01-13', wpRef: 'AR-01' }),
 makeRow('r3', { description: 'Operating lease agreements and amortization schedules (ASC 842)', com: 'L', personResponsible: 'J. Reyes (CFO)', requestDate: '2025-01-06', followUpDate: '2025-01-20', dateReceived: '', wpRef: 'LEASE-01' }),
];

export function AuditMgmtRequestsWorksheet({ isUS = false }: AuditMgmtRequestsWorksheetProps) {
 const [rows, setRows] = useState<RequestRow[]>(isUS ? MOCK_US : MOCK_CA);
 const [conclusion, setConclusion] = useState('');
 const [concluded, setConcluded] = useState(false);

 const update = (id: string, field: keyof RequestRow, value: string) =>
 setRows(prev => prev.map(r => r.id !== id ? r : {...r, [field]: value }));

 const addRow = () => setRows(prev => [...prev, makeRow(`r-${Date.now()}`)]);
 const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

 const StatusBadge = ({ row }: { row: RequestRow }) => {
 if (!row.description) return null;
 if (row.dateReceived)
 return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">Received</span>;
 return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">Outstanding</span>;
 };

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Document requests made to management for preparing analysis or obtaining documents that will assist in the audit.
 &nbsp;<span className="font-medium">Com:</span> V = Verbal &nbsp;|&nbsp; L = Letter &nbsp;|&nbsp; Em = Email
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* Requests table */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Information &amp; Analysis Requested from Management</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Track all requests made to management — documents, schedules, analyses — and monitor receipt status.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 220 }}>Description of assistance requested</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 80 }}>Com</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 150 }}>Person responsible</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Request date</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Follow-up date</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Date received</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 90 }}>W/P ref.</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 110 }}>Status</th>
 <th className="px-4 py-3" style={{ width: 40 }} />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {rows.map(row => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top">
 <Textarea
 className="min-h-[56px] text-sm resize-none"
 value={row.description}
 onChange={e => update(row.id, 'description', e.target.value)}
 placeholder="Describe request…"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Select
 value={row.com}
 onValueChange={v => update(row.id, 'com', v)}
 >
 <SelectTrigger className="h-8 text-sm">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="V">V</SelectItem>
 <SelectItem value="L">L</SelectItem>
 <SelectItem value="Em">Em</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input className="h-8 text-sm" value={row.personResponsible} onChange={e => update(row.id, 'personResponsible', e.target.value)} placeholder="Name" />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input type="date" className="h-8 text-sm" value={row.requestDate} onChange={e => update(row.id, 'requestDate', e.target.value)} />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input type="date" className="h-8 text-sm" value={row.followUpDate} onChange={e => update(row.id, 'followUpDate', e.target.value)} />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input type="date" className="h-8 text-sm" value={row.dateReceived} onChange={e => update(row.id, 'dateReceived', e.target.value)} />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input className="h-8 text-sm" value={row.wpRef} onChange={e => update(row.id, 'wpRef', e.target.value)} placeholder="—" />
 </td>
 <td className="px-4 py-2.5 align-top pt-3">
 <StatusBadge row={row} />
 </td>
 <td className="px-2 py-2.5 align-top text-center">
 <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addRow}>
 <Plus className="h-3.5 w-3.5" />Add Request
 </Button>
 </div>
 </div>

 {/* Conclusion */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 value={conclusion}
 onChange={e => setConclusion(e.target.value)}
 placeholder="Document any conclusions or follow-up actions arising from information requests…"
 className="min-h-[72px] text-sm resize-none bg-background"
 />
 </div>
 </div>

 {/* Conclude button — bottom right */}
 <div className="flex justify-end">
 <Button
 onClick={() => { setConcluded(true); toast.success('Information requests worksheet concluded'); }}
 disabled={concluded}
 >
 {concluded ? 'Worksheet concluded' : 'Conclude worksheet'}
 </Button>
 </div>

 </div>
 </div>
 </div>
 );
}
