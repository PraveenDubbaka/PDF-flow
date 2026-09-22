import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Info, Plus, Trash2, Copy, CalendarClock, Send, Paperclip, MessageSquare, Pencil, ChevronDown, ChevronRight, Inbox, ArrowUpDown, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RefButton, RefDoc } from '@/components/RefButton';

interface BulkRequestsWorksheetProps {
 isUS?: boolean;
}

type RequestStatus = 'Pending' | 'Sent' | 'Overdue' | 'Received' | 'Cancelled';

interface RequestRow {
 id: string;
 type: 'General' | 'Line Item';
 recipient: string;
 priority: 'High' | 'Medium' | 'Low';
 docName: string;
 description: string;
 dueDate: string;
 wpRef: RefDoc[];
 attachments: File[];
}

interface SentRequest extends Omit<RequestRow, 'attachments'> {
 reqId: string;
 folder: string;
 subFolder: string;
 sentAt: string; // ISO
 status: RequestStatus;
 batchId: string;
 attachments: number;
 comments: number;
}

// Mirrors the left-menu Audit engagement folder structure (Sidebar.tsx)
const FOLDER_STRUCTURE: Record<string, string[]> = {
 'Client Onboarding': [
 '408 — Initial Audit Engagements',
 '410 — New or Existing Engagement — Acceptance/Continuance',
 '440 — Information / Analysis Requested from Management',
 'AL1.1 — Engagement Letter',
 ],
 'Planning': [
 '420 — Materiality',
 '428 — Selecting Auditor\'s Expert',
 '430 — Overall Audit Strategy',
 '436 — Team Planning Discussions',
 '450 — Time Tracker',
 ],
 'Risk Assessment': [
 'GI — Gather Information',
 'IR — Identify Risk',
 'PR — Populate Responses',
 ],
 'Response to Assessed Risks': [
 'OAR — Overall Audit Response',
 'TOC — Test of Controls',
 'SAP — Substantive Analytical Procedures',
 'TR — Test of Details — Revenue',
 'TE — Test of Details — Expenses',
 'RPT — Related Party Transactions',
 'GWI — Goodwill Impairment Assessment',
 'APS — Audit Procedures Summary',
 ],
 'Documents': [
 'SHA — Shareholders Agreements',
 'REN — Rental/Lease Agreements',
 'INC — Incorporation Documents',
 'BAN — Banking Agreements',
 'CMA — Contracts & Material Agreements',
 'CMB — Corporate Minute Book',
 'RCF — Regulatory & Compliance Filings',
 ],
 'Trial Balance & Adjusting Entries': [
 'Trial Balance & Adjusting Entries',
 ],
 'Procedures': [
 'Assets',
 'Liabilities',
 'Equity',
 'Revenue',
 'Expenses',
 ],
 'Financial Statements': [
 'Financial Statement Docs',
 ],
 'Completion & Signoffs': [
 'AIM — Accumulation of Identified Misstatements',
 'FAR — Final Analytical Review',
 'SE — Subsequent Events',
 'GC — Going Concern (Final Assessment)',
 'SD — Notes on Significant Audit Decisions',
 'KAM — Key Audit Matters Worksheet',
 'FND — Audit Findings and Matters for Discussion',
 'MC — Matters Communicated to Management and TCWG',
 'FC — Matters for Future Consideration',
 'CON — Documenting Consultation',
 'MR — Management Representation Letter',
 'IC — Internal Control Deficiencies Communication',
 'TCWG — Communication with Those Charged with Governance',
 'CM — Completion Checklist',
 'DC — Disclosure Checklist',
 'QCR — Quality Control Review',
 'WD — Withdrawal Worksheet',
 'SO — Signoffs',
 'FR — Final Review',
 'ALF — Archive & Lock File',
 ],
};
const ENGAGEMENT_FOLDERS = Object.keys(FOLDER_STRUCTURE);
const RECIPIENTS = ['one@gmail.com', 'cfo@client.com', 'controller@client.com', 'accounting@client.com'];

const defaultDueDate = () => {
 const d = new Date();
 d.setDate(d.getDate() + 7);
 return d.toISOString().slice(0, 10);
};

const newRow = (): RequestRow => ({
 id: crypto.randomUUID(),
 type: 'General',
 recipient: '',
 priority: 'Medium',
 docName: '',
 description: '',
 dueDate: defaultDueDate(),
 wpRef: [],
 attachments: [],
});

const statusStyles: Record<RequestStatus, string> = {
 Pending: 'bg-amber-50 text-amber-700 border-amber-200',
 Sent: 'bg-blue-50 text-blue-700 border-blue-200',
 Overdue: 'bg-red-50 text-red-700 border-red-200',
 Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
 Cancelled: 'bg-muted text-muted-foreground border-border',
};

const formatDateTime = (iso: string) => {
 const d = new Date(iso);
 return d.toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const daysUntil = (iso: string) => {
 const due = new Date(iso).getTime();
 const today = new Date(); today.setHours(0, 0, 0, 0);
 return Math.ceil((due - today.getTime()) / (1000 * 60 * 60 * 24));
};

export function BulkRequestsWorksheet({ isUS = false }: BulkRequestsWorksheetProps) {
 const [activeTab, setActiveTab] = useState<'create' | 'all' | 'available'>('create');
 const [folder, setFolder] = useState('Client Onboarding');
 const [subFolder, setSubFolder] = useState(FOLDER_STRUCTURE['Client Onboarding'][0]);
 const [globalDueDate, setGlobalDueDate] = useState(defaultDueDate());
 const [rows, setRows] = useState<RequestRow[]>(() => Array.from({ length: 3 }, newRow));
 const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
 const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
 const fileInputRef = useRef<HTMLInputElement>(null);
 const uploadTargetRowId = useRef<string | null>(null);

 const update = (id: string, patch: Partial<RequestRow>) =>
 setRows(prev => prev.map(r => (r.id === id ? {...r,...patch } : r)));

 const addRow = () => setRows(prev => [...prev, {...newRow(), dueDate: globalDueDate }]);
 const duplicateRow = (id: string) => {
 const src = rows.find(r => r.id === id);
 if (!src) return;
 setRows(prev => [...prev, {...src, id: crypto.randomUUID() }]);
 };
 const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

 const applyGlobalDueDate = () => {
 setRows(prev => prev.map(r => ({...r, dueDate: globalDueDate })));
 toast.success(`Due date applied to ${rows.length} requests`);
 };

 const validCount = rows.filter(r => r.recipient && r.docName.trim() && r.dueDate).length;
 const allRowsValid = rows.length > 0 && validCount === rows.length;

 const handleSendAll = () => {
 if (!allRowsValid) {
 toast.error('All mandatory fields must be filled before sending');
 return;
 }
 const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
 const sentAt = new Date().toISOString();
 const nextSeq = sentRequests.length;
 const newSent: SentRequest[] = rows.map((r, i) => ({
...r,
 reqId: `REQ-${nextSeq + i + 1}`,
 folder,
 subFolder,
 sentAt,
 status: daysUntil(r.dueDate) < 0 ? 'Overdue' : 'Sent',
 batchId,
 attachments: 0,
 comments: 0,
 }));
 setSentRequests(prev => [...newSent,...prev]);
 toast.success(`${validCount} request${validCount > 1 ? 's' : ''} sent successfully`);
 // Defer tab switch + row reset so any open Radix Select/Popover portals
 // can close & cleanup before the create form unmounts (avoids React
 // "removeChild" NotFoundError from stale portal nodes).
 setTimeout(() => {
 setRows(Array.from({ length: 3 }, newRow));
 setActiveTab('all');
 }, 0);
 };

 // Group sent requests by folder/subFolder
 const grouped = useMemo(() => {
 const map: Record<string, SentRequest[]> = {};
 sentRequests.forEach(r => {
 const key = `${r.folder} › ${r.subFolder}`;
 (map[key] ||= []).push(r);
 });
 return map;
 }, [sentRequests]);

 const availableRequests = sentRequests.filter(r => r.status === 'Received');

 const toggleGroup = (key: string) => setExpandedGroups(p => ({...p, [key]: !(p[key] ?? true) }));

 const cardCls = 'bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden';
 const cardHeaderCls = 'px-6 py-3.5 bg-card border-b border-border flex items-center gap-3';
 const thCls = 'px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap';
 const required = <span className="text-destructive ml-0.5">*</span>;

 const allCount = sentRequests.length;
 const availableCount = availableRequests.length;

 return (
 <div className="flex flex-col h-full">
 <input
 ref={fileInputRef}
 type="file"
 multiple
 className="hidden"
 onChange={e => {
 const files = Array.from(e.target.files ?? []);
 if (files.length && uploadTargetRowId.current) {
 update(uploadTargetRowId.current, { attachments: [...(rows.find(r => r.id === uploadTargetRowId.current)?.attachments ?? []),...files] });
 }
 e.target.value = '';
 }}
 />
 <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
 {/* Tabs bar */}
 <div className="px-6 pt-4 bg-muted/30 shrink-0">
 <TabsList>
 <TabsTrigger value="create">
 <Plus className="h-3.5 w-3.5 mr-1.5" /> Create New
 </TabsTrigger>
 <TabsTrigger value="all" className="gap-1.5">
 All Requests
 <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-foreground text-[10px] font-semibold">
 {allCount}
 </span>
 </TabsTrigger>
 <TabsTrigger value="available" className="gap-1.5">
 Available
 <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-foreground text-[10px] font-semibold">
 {availableCount}
 </span>
 </TabsTrigger>
 </TabsList>
 </div>

 {/* Body */}
 <div className="flex-1 overflow-y-auto bg-muted/30 min-h-0">
 {/* ============ CREATE NEW ============ */}
 <TabsContent forceMount value="create" className="m-0 p-6 space-y-4 data-[state=inactive]:hidden">
 {/* Batch Settings */}
 <div className={cardCls}>
 <div className={cardHeaderCls}>
 <span className="text-sm font-semibold text-foreground">Batch Settings</span>
 <span title="Apply common folder and due-date settings to all rows below.">
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </span>
 </div>
 <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="text-xs font-medium text-foreground block mb-1.5">Engagement Folder{required}</label>
 <Select value={folder} onValueChange={(v) => { setFolder(v); setSubFolder(FOLDER_STRUCTURE[v]?.[0] ?? ''); }}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {ENGAGEMENT_FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="text-xs font-medium text-foreground block mb-1.5">Sub Folder{required}</label>
 <Select value={subFolder} onValueChange={setSubFolder}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {(FOLDER_STRUCTURE[folder] ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="text-xs font-medium text-foreground block mb-1.5">Auto-Populate Due Date</label>
 <Input type="date" value={globalDueDate} onChange={e => setGlobalDueDate(e.target.value)} className="h-8 text-sm" />
 </div>
 <div className="flex items-end">
 <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={applyGlobalDueDate}>
 <CalendarClock className="h-3.5 w-3.5" /> Apply to All
 </Button>
 </div>
 </div>
 </div>

 {/* Requests Table */}
 <div className={cardCls}>
 <div className={cardHeaderCls}>
 <span className="text-sm font-semibold text-foreground">Document Requests</span>
 <span title="Add one row per request. All required fields must be filled before sending.">
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </span>
 <div className="flex-1" />
 <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={addRow}>
 <Plus className="h-3.5 w-3.5" /> Add Request
 </Button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className={cn(thCls, 'w-10')}>#</th>
 <th className={cn(thCls, 'w-[130px]')}>Type{required}</th>
 <th className={cn(thCls, 'w-[200px]')}>Recipient{required}</th>
 <th className={cn(thCls, 'w-[120px]')}>Priority{required}</th>
 <th className={thCls}>Document Name{required}</th>
 <th className={thCls}>Description</th>
 <th className={cn(thCls, 'w-[160px]')}>Due Date{required}</th>
 <th className={cn(thCls, 'w-[160px]')}>Attachments</th>
 <th className={cn(thCls, 'w-[90px] text-center sticky right-0 bg-muted')}>Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {rows.map((row, idx) => {
 const invalid = !row.recipient || !row.docName.trim() || !row.dueDate;
 return (
 <tr key={row.id} className={cn('bg-background hover:bg-muted/50 transition-colors', invalid && '!bg-destructive/[0.02]')}>
 <td className="px-4 py-2.5 align-top text-xs text-muted-foreground">{idx + 1}</td>
 <td className="px-4 py-2.5 align-top">
 <Select value={row.type} onValueChange={v => update(row.id, { type: v as RequestRow['type'] })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="General">General</SelectItem>
 <SelectItem value="Line Item">Line Item</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top">
 <Select value={row.recipient} onValueChange={v => update(row.id, { recipient: v })}>
 <SelectTrigger className={cn('h-8 text-sm', !row.recipient && 'border-destructive')}>
 <SelectValue placeholder="Select recipient" />
 </SelectTrigger>
 <SelectContent>
 {RECIPIENTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top">
 <Select value={row.priority} onValueChange={v => update(row.id, { priority: v as RequestRow['priority'] })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="High">High</SelectItem>
 <SelectItem value="Medium">Medium</SelectItem>
 <SelectItem value="Low">Low</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[300px]">
 <Input value={row.docName} onChange={e => update(row.id, { docName: e.target.value })} placeholder="Document name" className={cn('h-8 text-sm', !row.docName.trim() && 'border-destructive')} />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[200px]">
 <Input value={row.description} onChange={e => update(row.id, { description: e.target.value })} placeholder="Optional notes" className="h-8 text-sm" />
 </td>
 <td className="px-4 py-2.5 align-top">
 <Input type="date" value={row.dueDate} onChange={e => update(row.id, { dueDate: e.target.value })} className={cn('h-8 text-sm', !row.dueDate && 'border-destructive')} />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[160px]">
 <div className="flex flex-col gap-1">
 {row.attachments.map((f, fi) => (
 <div key={fi} className="flex items-center gap-1 text-xs text-foreground bg-muted rounded px-2 py-0.5 group">
 <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
 <span className="truncate max-w-[100px]" title={f.name}>{f.name}</span>
 <button type="button" className="ml-auto text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => update(row.id, { attachments: row.attachments.filter((_, i) => i !== fi) })}>×</button>
 </div>
 ))}
 <button
 type="button"
 className="inline-flex items-center gap-1 text-xs text-link hover:text-link/80 transition-colors"
 onClick={() => { uploadTargetRowId.current = row.id; fileInputRef.current?.click(); }}
 >
 <Paperclip className="h-3 w-3" />
 {row.attachments.length === 0 ? 'Attach file' : 'Add more'}
 </button>
 </div>
 </td>
 <td className="px-4 py-2.5 align-top sticky right-0 bg-card">
 <div className="flex items-center justify-center gap-1">
 <Button variant="ghost" size="icon" className="h-7 w-7 text-link hover:bg-link/10" onClick={() => duplicateRow(row.id)} title="Duplicate">
 <Copy className="h-3.5 w-3.5" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeRow(row.id)} disabled={rows.length === 1} title="Remove">
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-muted/20">
 <p className="text-xs text-muted-foreground">
 <span className="font-semibold text-foreground">{validCount}</span> of {rows.length} ready to send
 </p>
 <Button onClick={handleSendAll} disabled={!allRowsValid} size="sm" className="gap-1.5">
 <Send className="h-3.5 w-3.5" />
 Send {validCount > 0 ? `${validCount} ` : ''}Request{validCount === 1 ? '' : 's'}
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* ============ ALL REQUESTS ============ */}
 <TabsContent forceMount value="all" className="m-0 p-6 space-y-4 data-[state=inactive]:hidden">
 <div className={cardCls}>
 <div className={cardHeaderCls}>
 <span className="text-sm font-semibold text-foreground">All Requests</span>
 <span title="All requests grouped by engagement folder/sub-folder.">
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </span>
 <div className="flex-1" />
 <Button variant="outline" size="sm" className="h-8 gap-1.5">
 <ArrowUpDown className="h-3.5 w-3.5" /> Sort By
 </Button>
 </div>

 {sentRequests.length === 0 ? (
 <EmptyState icon={<Inbox className="h-10 w-10 text-muted-foreground" />} title="No requests yet" description="Create and send requests from the Create New tab — they'll be tracked here." />
 ) : (
 <div className="divide-y divide-border">
 {Object.entries(grouped).map(([groupKey, items]) => {
 const expanded = expandedGroups[groupKey] ?? true;
 return (
 <div key={groupKey}>
 <button
 type="button"
 onClick={() => toggleGroup(groupKey)}
 className="w-full px-6 py-3 flex items-center gap-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
 >
 {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 <span className="text-sm font-semibold text-foreground flex-1">{groupKey}</span>
 <span className="text-xs text-muted-foreground">({items.length})</span>
 </button>
 {expanded && (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-card border-b border-border">
 <th className={cn(thCls, 'w-[100px]')}>Req ID</th>
 <th className={thCls}>Document</th>
 <th className={cn(thCls, 'w-[200px]')}>Recipient</th>
 <th className={cn(thCls, 'w-[110px]')}>Priority</th>
 <th className={cn(thCls, 'w-[140px]')}>Due Date</th>
 <th className={cn(thCls, 'w-[160px]')}>Sent</th>
 <th className={cn(thCls, 'w-[120px]')}>Status</th>
 <th className={cn(thCls, 'w-[100px] text-center')}>Activity</th>
 <th className={cn(thCls, 'w-[90px] text-center sticky right-0 bg-card')}>Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {items.map(req => {
 const days = daysUntil(req.dueDate);
 return (
 <tr key={req.reqId} className="hover:bg-muted/30 transition-colors">
 <td className="px-4 py-2.5 text-xs font-mono text-link">{req.reqId}</td>
 <td className="px-4 py-2.5">
 <div className="text-sm text-foreground font-medium">{req.docName}</div>
 {req.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</div>}
 </td>
 <td className="px-4 py-2.5 text-xs text-foreground">{req.recipient}</td>
 <td className="px-4 py-2.5">
 <Badge variant="outline" className="text-xs font-normal">{req.priority}</Badge>
 </td>
 <td className="px-4 py-2.5">
 <div className="text-xs text-foreground">{req.dueDate}</div>
 {req.status !== 'Received' && req.status !== 'Cancelled' && (
 <div className={cn('text-[10px] mt-0.5', days < 0 ? 'text-destructive' : days <= 3 ? 'text-amber-600' : 'text-muted-foreground')}>
 {days < 0 ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Due today' : `${days}d left`}
 </div>
 )}
 </td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(req.sentAt)}</td>
 <td className="px-4 py-2.5">
 <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[req.status])}>{req.status}</Badge>
 </td>
 <td className="px-4 py-2.5">
 <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
 <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{req.attachments}</span>
 <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{req.comments}</span>
 </div>
 </td>
 <td className="px-4 py-2.5 sticky right-0 bg-card">
 <div className="flex items-center justify-center gap-1">
 <Button variant="ghost" size="icon" className="h-7 w-7 text-link hover:bg-link/10" title="Edit">
 <Pencil className="h-3.5 w-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 text-destructive hover:bg-destructive/10"
 title="Cancel"
 onClick={() => setSentRequests(prev => prev.filter(r => r.reqId !== req.reqId))}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </TabsContent>

 {/* ============ AVAILABLE ============ */}
 <TabsContent forceMount value="available" className="m-0 p-6 space-y-4 data-[state=inactive]:hidden">
 <div className={cardCls}>
 <div className={cardHeaderCls}>
 <span className="text-sm font-semibold text-foreground">Available Documents</span>
 <span title="Documents received from clients in response to sent requests.">
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </span>
 </div>
 {availableRequests.length === 0 ? (
 <EmptyState icon={<Inbox className="h-10 w-10 text-muted-foreground" />} title="There are no available docs to show up" description="Documents submitted by the client will appear here once received." />
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className={cn(thCls, 'w-[100px]')}>Req ID</th>
 <th className={thCls}>Document</th>
 <th className={cn(thCls, 'w-[220px]')}>Folder</th>
 <th className={cn(thCls, 'w-[200px]')}>Received From</th>
 <th className={cn(thCls, 'w-[160px]')}>Received On</th>
 <th className={cn(thCls, 'w-[90px] text-center sticky right-0 bg-muted')}>Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {availableRequests.map(req => (
 <tr key={req.reqId} className="hover:bg-muted/30 transition-colors">
 <td className="px-4 py-2.5 text-xs font-mono text-link">{req.reqId}</td>
 <td className="px-4 py-2.5 text-sm text-foreground font-medium">{req.docName}</td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">{req.folder} › {req.subFolder}</td>
 <td className="px-4 py-2.5 text-xs text-foreground">{req.recipient}</td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(req.sentAt)}</td>
 <td className="px-4 py-2.5 sticky right-0 bg-card">
 <div className="flex items-center justify-center">
 <Button variant="ghost" size="icon" className="h-7 w-7 text-link hover:bg-link/10" title="Download">
 <Download className="h-3.5 w-3.5" />
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </TabsContent>
 </div>
 </Tabs>
 </div>
 );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
 return (
 <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
 <div className="mb-4 opacity-70">{icon}</div>
 <p className="text-sm font-semibold text-foreground">{title}</p>
 <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
 </div>
 );
}
