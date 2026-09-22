import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Send, Clock, MessageSquare, FolderOpen, Search, Plus, CalendarClock, ArrowLeft, Upload, X, Layers, Pencil, Trash2, Paperclip, Filter } from 'lucide-react';
import { FolderPlusIcon, FolderMinusIcon } from '@/components/icons/FolderIcons';
import { MultipleRequestModal } from './MultipleRequestModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EngagementRightPanelProps {
 className?: string;
}

type PanelMode = 'folders' | 'doc-request';

interface DocRequestContext {
 folder: string;
 subFolder: string;
}

const menuItems = [
 { icon: Send, label: 'Send', id: 'send' },
 { icon: Clock, label: 'Timeline', id: 'timeline' },
 { icon: MessageSquare, label: 'Messages', id: 'messages' },
 { icon: FolderOpen, label: 'Folders', id: 'folders' },
];

const ENGAGEMENT_FOLDERS = ['Client Onboarding', 'Planning', 'Risk Assessment', 'Procedures', 'Financial Statements', 'Completion & Signoffs'];
const DOC_TYPES = ['General', 'Urgent', 'Internal', 'External'];
const PRIORITIES = ['High', 'Medium', 'Low'];

interface MockRequest {
 id: string;
 reqNum: string;
 folder: string;
 section: string;
 docName: string;
 dueDate: string;
 notes: string;
 date: string;
 initials: string;
 avatarColor: string;
 attachments: number;
 comments: number;
 status: 'pending' | 'available' | 'batch';
}

const MOCK_REQUESTS: MockRequest[] = [
 { id: '1',  reqNum: 'REQ-20', folder: 'Client Onboarding',      section: 'AL1.1 Engagement Letter',                              docName: 'Engagement Letter — Signed',                  dueDate: 'Aug 16, 2026', notes: 'Please return countersigned engagement letter',                              date: 'Aug 14, 2026 09:15 AM', initials: 'JP', avatarColor: '#E97316', attachments: 1, comments: 0, status: 'available' },
 { id: '2',  reqNum: 'REQ-19', folder: 'Client Onboarding',      section: 'AL1.1 Engagement Letter',                              docName: 'Director Authorization — Signed',              dueDate: 'Aug 18, 2026', notes: 'Signed authorization from director to proceed with engagement',              date: 'Aug 14, 2026 09:18 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 0, status: 'pending' },
 { id: '3',  reqNum: 'REQ-18', folder: 'Client Onboarding',      section: '410 New/Existing Engagement — Acceptance/Continuance', docName: 'Incorporation Documents',                      dueDate: 'Aug 18, 2026', notes: 'Certificate of incorporation and constating documents',                    date: 'Aug 14, 2026 09:20 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 1, status: 'pending' },
 { id: '4',  reqNum: 'REQ-17', folder: 'Client Onboarding',      section: '410 New/Existing Engagement — Acceptance/Continuance', docName: 'AML / KYC Questionnaire',                     dueDate: 'Aug 20, 2026', notes: 'Anti-money laundering and know-your-client completed questionnaire',       date: 'Aug 14, 2026 09:22 AM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 0, comments: 0, status: 'pending' },
 { id: '5',  reqNum: 'REQ-16', folder: 'Planning',               section: '501-A Preliminary Analytical',                         docName: 'Prior Year Financial Statements',              dueDate: 'Aug 15, 2026', notes: 'FY2024 comparative financials for opening balances',                       date: 'Aug 14, 2026 09:45 AM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 1, comments: 0, status: 'available' },
 { id: '6',  reqNum: 'REQ-15', folder: 'Planning',               section: '501-A Preliminary Analytical',                         docName: 'Trial Balance — Unadjusted (FY2025)',          dueDate: 'Aug 17, 2026', notes: 'Unadjusted trial balance as at December 31, 2025',                       date: 'Aug 14, 2026 09:50 AM', initials: 'JP', avatarColor: '#E97316', attachments: 0, comments: 1, status: 'pending' },
 { id: '7',  reqNum: 'REQ-14', folder: 'Planning',               section: '507 Governance Minutes',                               docName: 'Board Minutes — 2025',                        dueDate: 'Aug 20, 2026', notes: 'Minutes from all board and shareholder meetings in 2025',                 date: 'Aug 14, 2026 10:00 AM', initials: 'JP', avatarColor: '#E97316', attachments: 0, comments: 0, status: 'pending' },
 { id: '8',  reqNum: 'REQ-13', folder: 'Planning',               section: '507 Governance Minutes',                               docName: 'Shareholder Resolutions — 2025',               dueDate: 'Aug 22, 2026', notes: 'Shareholder meeting resolutions and special resolutions passed in 2025',   date: 'Aug 14, 2026 10:05 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 0, status: 'pending' },
 { id: '9',  reqNum: 'REQ-12', folder: 'Risk Assessment',        section: '515 Related Parties',                                  docName: 'Related Party Listing',                       dueDate: 'Aug 22, 2026', notes: 'Identify all related parties and outstanding balances',                   date: 'Aug 14, 2026 10:30 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 2, status: 'pending' },
 { id: '10', reqNum: 'REQ-11', folder: 'Risk Assessment',        section: '515 Related Parties',                                  docName: 'Intercompany Balances Schedule',               dueDate: 'Aug 24, 2026', notes: 'Schedule of intercompany receivables and payables with elimination entries', date: 'Aug 14, 2026 10:35 AM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 0, comments: 0, status: 'pending' },
 { id: '11', reqNum: 'REQ-10', folder: 'Procedures',             section: 'A Cash and Cash Equivalents',                          docName: 'Bank Statements — Q4 2025',                   dueDate: 'Aug 25, 2026', notes: 'All bank account statements for Oct–Dec 2025',                          date: 'Aug 14, 2026 11:00 AM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 0, comments: 0, status: 'pending' },
 { id: '12', reqNum: 'REQ-9',  folder: 'Procedures',             section: 'A Cash and Cash Equivalents',                          docName: 'Bank Reconciliation — Dec 31, 2025',           dueDate: 'Aug 27, 2026', notes: 'Year-end bank reconciliation for all bank accounts',                      date: 'Aug 14, 2026 11:05 AM', initials: 'JP', avatarColor: '#E97316', attachments: 0, comments: 0, status: 'pending' },
 { id: '13', reqNum: 'REQ-8',  folder: 'Procedures',             section: 'B Accounts Receivable',                                docName: 'Accounts Receivable Subledger',                dueDate: 'Aug 25, 2026', notes: 'Year-end AR aging schedule as at Dec 31, 2025',                           date: 'Aug 14, 2026 11:15 AM', initials: 'JP', avatarColor: '#E97316', attachments: 1, comments: 0, status: 'available' },
 { id: '14', reqNum: 'REQ-7',  folder: 'Procedures',             section: 'B Accounts Receivable',                                docName: 'Customer Confirmations — Top 10 Accounts',    dueDate: 'Aug 29, 2026', notes: 'Positive confirmation letters sent to top 10 customers by balance',       date: 'Aug 14, 2026 11:20 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 1, status: 'pending' },
 { id: '15', reqNum: 'REQ-6',  folder: 'Procedures',             section: 'H Property, Plant and Equipment',                      docName: 'Fixed Asset Continuity Schedule',              dueDate: 'Aug 28, 2026', notes: 'PPE and ROU asset roll-forward with depreciation detail',                date: 'Aug 14, 2026 11:30 AM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 0, status: 'pending' },
 { id: '16', reqNum: 'REQ-5',  folder: 'Procedures',             section: 'H Property, Plant and Equipment',                      docName: 'Capital Expenditure Approvals (>$10K)',        dueDate: 'Aug 30, 2026', notes: 'Board-approved capex requests and invoices for additions in 2025',       date: 'Aug 14, 2026 11:35 AM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 0, comments: 0, status: 'pending' },
 { id: '17', reqNum: 'REQ-4',  folder: 'Financial Statements',   section: 'FS Financial Statements',                              docName: 'Draft Financial Statements',                  dueDate: 'Sep 1, 2026',  notes: 'Management-prepared ASPE financial statements for review',               date: 'Aug 14, 2026 01:39 PM', initials: 'TB', avatarColor: '#8B5CF6', attachments: 0, comments: 1, status: 'batch' },
 { id: '18', reqNum: 'REQ-3',  folder: 'Financial Statements',   section: 'FS Financial Statements',                              docName: 'Management Discussion & Analysis',             dueDate: 'Sep 3, 2026',  notes: "MD&A narrative to accompany the year-end financial statements",            date: 'Aug 14, 2026 01:42 PM', initials: 'JP', avatarColor: '#E97316', attachments: 0, comments: 0, status: 'batch' },
 { id: '19', reqNum: 'REQ-2',  folder: 'Completion & Signoffs',  section: 'MR Management Representation Letter',                  docName: 'Management Representation Letter',             dueDate: 'Sep 10, 2026', notes: 'To be signed by CEO and CFO per CAS 580 requirements',                   date: 'Aug 14, 2026 01:45 PM', initials: 'JP', avatarColor: '#E97316', attachments: 0, comments: 0, status: 'batch' },
 { id: '20', reqNum: 'REQ-1',  folder: 'Completion & Signoffs',  section: 'MR Management Representation Letter',                  docName: 'Officer Certificate — CFO',                   dueDate: 'Sep 10, 2026', notes: 'CFO certification confirming accuracy of financial information provided',  date: 'Aug 14, 2026 01:47 PM', initials: 'AN', avatarColor: '#3B82F6', attachments: 0, comments: 0, status: 'pending' },
];

const MOCK_BY_SECTION: [string, MockRequest[]][] = (() => {
 const g: Record<string, MockRequest[]> = {};
 for (const r of MOCK_REQUESTS) { g[r.section] = g[r.section] ?? []; g[r.section].push(r); }
 return Object.entries(g);
})();

function DocRequestForm({ context, onBack }: { context: DocRequestContext; onBack: () => void }) {
 const [folder, setFolder] = useState(context.folder || '');
 const [subFolder, setSubFolder] = useState(context.subFolder || '');
 const [type, setType] = useState('General');
 const [recipient, setRecipient] = useState('');
 const [priority, setPriority] = useState('Medium');
 const [docName, setDocName] = useState('');
 const [notes, setNotes] = useState('');
 const [dueDate, setDueDate] = useState('');
 const [files, setFiles] = useState<File[]>([]);
 const [bulkOpen, setBulkOpen] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const isValid = folder && recipient.trim() && docName.trim() && dueDate;

 const handleFileDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const dropped = Array.from(e.dataTransfer.files);
 setFiles(prev => [...prev,...dropped]);
 };

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files) setFiles(prev => [...prev,...Array.from(e.target.files!)]);
 };

 const handleSend = () => {
 if (!isValid) return;
 onBack();
 };

 const labelCls = "text-xs font-medium text-foreground block mb-1";
 const requiredMark = <span className="text-destructive ml-0.5">*</span>;

 return (
 <div className="w-full h-full flex flex-col overflow-hidden">
 {/* Header */}
 <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
 <button type="button" onClick={onBack} className="p-1 hover:bg-muted rounded-md transition-colors">
 <ArrowLeft className="h-4 w-4 text-muted-foreground" />
 </button>
 <h3 className="text-sm font-semibold text-foreground flex-1">Doc Request</h3>
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 className="h-7 px-2 gap-1.5 text-[11px] font-medium text-[#0C2D55] border-[#0C2D55]/30"
 onClick={() => setBulkOpen(true)}
 >
 <Layers className="h-3 w-3" />
 Multiple Request
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom">Raise multiple PBC requests at once</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 <MultipleRequestModal open={bulkOpen} onOpenChange={setBulkOpen} />
 </div>

 {/* Form */}
 <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
 {/* Engagement Folder */}
 <div>
 <label className={labelCls}>Engagement Folder{requiredMark}</label>
 <Select value={folder} onValueChange={setFolder}>
 <SelectTrigger className="h-9 text-sm w-full">
 <SelectValue placeholder="Select folder" />
 </SelectTrigger>
 <SelectContent>
 {ENGAGEMENT_FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>

 {/* Sub Folder */}
 <div>
 <label className={labelCls}>Sub Folder{requiredMark}</label>
 <Input
 value={subFolder}
 onChange={e => setSubFolder(e.target.value)}
 placeholder="Sub folder"
 className="h-9 text-sm"
 />
 </div>

 {/* Type */}
 <div>
 <label className={labelCls}>Type{requiredMark}</label>
 <Select value={type} onValueChange={setType}>
 <SelectTrigger className="h-9 text-sm w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>

 {/* Recipient */}
 <div>
 <label className={labelCls}>Recipient{requiredMark}</label>
 <Input
 value={recipient}
 onChange={e => setRecipient(e.target.value)}
 placeholder="one@gmail.com"
 type="email"
 className="h-9 text-sm"
 />
 </div>

 {/* Priority */}
 <div>
 <label className={labelCls}>Priority{requiredMark}</label>
 <Select value={priority} onValueChange={setPriority}>
 <SelectTrigger className="h-9 text-sm w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>

 {/* Document Name */}
 <div>
 <label className={labelCls}>Document Name{requiredMark}</label>
 <Input
 value={docName}
 onChange={e => setDocName(e.target.value)}
 placeholder="Document name"
 className={cn("h-9 text-sm", !docName && "border-destructive focus-visible:ring-destructive/30")}
 />
 </div>

 {/* Description / Notes */}
 <div>
 <label className={labelCls}>Description/Notes{requiredMark}</label>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 placeholder="Description/Notes"
 rows={3}
 className={cn(
 "w-full rounded-md border px-3 py-2 text-sm resize-none outline-none transition-colors",
 "bg-background text-foreground placeholder:text-muted-foreground",
 "border-input focus:border-primary focus:ring-1 focus:ring-primary/30",
 !notes && "border-destructive focus:ring-destructive/30"
 )}
 />
 </div>

 {/* Due Date */}
 <div>
 <label className={labelCls}>
 Due Date <span className="text-destructive">**</span>
 </label>
 <div className="relative">
 <Input
 value={dueDate}
 onChange={e => setDueDate(e.target.value)}
 placeholder="Due date"
 type="date"
 className={cn("h-9 text-sm pr-9", !dueDate && "border-destructive focus-visible:ring-destructive/30")}
 />
 </div>
 </div>

 {/* File Upload */}
 <div
 className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
 onDragOver={e => e.preventDefault()}
 onDrop={handleFileDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
 <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
 <p className="text-xs text-muted-foreground">
 <span className="text-primary font-medium">Click to upload</span> or drag and drop
 </p>
 </div>

 {/* Uploaded files list */}
 {files.length > 0 && (
 <div className="space-y-1">
 {files.map((f, i) => (
 <div key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
 <span className="truncate flex-1">{f.name}</span>
 <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-2 text-muted-foreground hover:text-destructive">
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
 <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>Cancel</Button>
 <Button size="sm" className="flex-1" disabled={!isValid} onClick={handleSend}>Send Request</Button>
 </div>
 </div>
 );
}

function Highlight({ text, query }: { text: string; query: string }) {
 if (!query.trim()) return <>{text}</>;
 const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
 return (
  <>
   {parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
     <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5 not-italic">{part}</mark>
    ) : (
     <span key={i}>{part}</span>
    )
   )}
  </>
 );
}

export function EngagementRightPanel({ className }: EngagementRightPanelProps) {
 const [isExpanded, setIsExpanded] = useState(false);
 const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
 const toggleFolder = (f: string) => setCollapsedFolders(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });
 const [showSearch, setShowSearch] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedFolder, setSelectedFolder] = useState('all-folders');
 const [selectedSection, setSelectedSection] = useState('');
 const [activeItem, setActiveItem] = useState('folders');
 const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
 const [mode, setMode] = useState<PanelMode>('folders');
 const [docRequestCtx, setDocRequestCtx] = useState<DocRequestContext>({ folder: '', subFolder: '' });

 useEffect(() => {
 const el = document.getElementById('right-panel-portal');
 if (el) setPortalTarget(el);
 }, []);

 useEffect(() => {
 const handler = (e: Event) => {
 const { folder, subFolder } = (e as CustomEvent).detail ?? {};
 setDocRequestCtx({ folder: folder ?? '', subFolder: subFolder ?? '' });
 setMode('doc-request');
 setIsExpanded(true);
 };
 window.addEventListener('raise-doc-request', handler);
 return () => window.removeEventListener('raise-doc-request', handler);
 }, []);


 const panel = (
 <div className={cn("flex mr-1 mb-1 rounded-xl overflow-hidden bg-white dark:bg-card border border-border/50 shadow-md h-full", className)}>
 {/* Icon Bar - Always visible */}
 <div className="w-12 flex flex-col items-center py-3 gap-1 m-1 rounded-lg bg-[#F5F8FF] dark:bg-muted/40">
 <Button
 variant="ghost"
 size="icon"
 className="h-9 w-9 mb-2 hover:bg-muted"
 onClick={() => setIsExpanded(!isExpanded)}
 >
 {isExpanded ? (
 <ChevronRight className="h-4 w-4 text-primary" />
 ) : (
 <ChevronLeft className="h-4 w-4 text-primary" />
 )}
 </Button>

 {menuItems.map((item) => (
 <Button
 key={item.id}
 variant="ghost"
 size="icon"
 className={cn(
 "h-9 w-9 hover:bg-muted",
 activeItem === item.id && "bg-muted text-primary"
 )}
 onClick={() => {
 setActiveItem(item.id);
 if (item.id === 'folders') setMode('folders');
 if (!isExpanded) setIsExpanded(true);
 }}
 >
 <item.icon className="h-4 w-4 text-primary" />
 </Button>
 ))}
 </div>

 {/* Expanded Content Panel */}
 <div
 className={cn(
 "transition-all duration-300 overflow-hidden",
 isExpanded ? "w-72" : "w-0"
 )}
 >
 {isExpanded && (
 <div className="w-72 h-full flex flex-col">
 {mode === 'doc-request' ? (
 <DocRequestForm
 context={docRequestCtx}
 onBack={() => { setMode('folders'); setActiveItem('folders'); }}
 />
 ) : (
 <>
 {/* Header */}
 <div className="flex items-center gap-2 px-4 py-3 relative">
 <h3 className="font-semibold text-sm text-foreground flex-1">Engagement Folders</h3>
 <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setShowSearch(p => !p); setSearchQuery(''); }}>
 <Search className="h-3.5 w-3.5 text-muted-foreground" />
 </Button>
 <Button variant="outline" size="icon" className="h-7 w-7 shrink-0 border-border">
 <Plus className="h-3.5 w-3.5 text-foreground" />
 </Button>
 {showSearch && (
 <div className="absolute inset-0 flex items-center gap-2 px-4 bg-background rounded-t-[inherit]">
  <div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
  <input
   autoFocus
   value={searchQuery}
   onChange={e => setSearchQuery(e.target.value)}
   onKeyDown={e => e.key === 'Escape' && (setShowSearch(false), setSearchQuery(''))}
   placeholder="Search requests..."
   className="input-double-border flex w-full rounded-[10px] transition-all duration-200 px-3 py-2 bg-white text-foreground placeholder:text-muted-foreground/70 border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)] pl-9 h-8 text-sm"
  />
  {searchQuery && (
   <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
   <X className="h-3.5 w-3.5" />
   </button>
  )}
  </div>
  <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
  <X className="h-3.5 w-3.5" />
  </button>
 </div>
 )}
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-foreground">
  Choose Engagement Folder <span className="text-destructive">*</span>
 </label>
 <Select value={selectedFolder} onValueChange={v => { setSelectedFolder(v); setSelectedSection(''); }}>
  <SelectTrigger className="h-9 text-sm w-full">
   <SelectValue placeholder="Select folder" />
  </SelectTrigger>
  <SelectContent>
   <SelectItem value="all-folders">Show All Folders</SelectItem>
   <SelectItem value="client-onboarding">Client Onboarding</SelectItem>
   <SelectItem value="planning">Planning</SelectItem>
   <SelectItem value="risk-assessment">Risk Assessment</SelectItem>
   <SelectItem value="response">Response to Assessed Risks</SelectItem>
   <SelectItem value="documents">Documents</SelectItem>
   <SelectItem value="trial-balance">Trial Balance &amp; Adjusting Entries</SelectItem>
   <SelectItem value="procedures">Procedures</SelectItem>
   <SelectItem value="financials">Financial Statements</SelectItem>
   <SelectItem value="completion">Completion &amp; Signoffs</SelectItem>
  </SelectContent>
 </Select>
 </div>

 {selectedFolder !== 'all-folders' && (() => {
 const FOLDER_SECTIONS: Record<string, { value: string; label: string }[]> = {
  'client-onboarding': [
  { value: 'al1-engagement-letter', label: 'AL1.1 Engagement Letter' },
  { value: '410-acceptance', label: '410 New/Existing Engagement — Acceptance/Continuance' },
  ],
  'planning': [
  { value: '501a-preliminary', label: '501-A Preliminary Analytical' },
  ],
  'risk-assessment': [
  { value: '507-governance', label: '507 Governance Minutes' },
  { value: '515-related-parties', label: '515 Related Parties' },
  ],
  'response': [],
  'documents': [],
  'trial-balance': [],
  'procedures': [
  { value: 'a-cash', label: 'A Cash and Cash Equivalents' },
  { value: 'b-ar', label: 'B Accounts Receivable' },
  { value: 'h-ppe', label: 'H Property, Plant and Equipment' },
  ],
  'financials': [
  { value: 'fs-financial', label: 'FS Financial Statements' },
  ],
  'completion': [
  { value: 'mr-management', label: 'MR Management Representation Letter' },
  ],
 };
 const sections = FOLDER_SECTIONS[selectedFolder] ?? [];
 return (
  <div className="space-y-1.5">
  <label className="text-xs font-medium text-foreground">
   Choose Engagement Section <span className="text-destructive">*</span>
  </label>
  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={sections.length === 0}>
   <SelectTrigger className="h-9 text-sm w-full">
   <SelectValue placeholder={sections.length === 0 ? 'No sections available' : 'Select section'} />
   </SelectTrigger>
   <SelectContent>
   {sections.map(s => (
    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
   ))}
   </SelectContent>
  </Select>
  </div>
 );
 })()}

 <Button
 className="w-full justify-center gap-2 h-10 text-xs font-medium bg-[#1C63A6] hover:bg-[#1a5a9e] text-white border-0"
 >
 <CalendarClock className="h-3.5 w-3.5" />
 Schedule Document Request
 </Button>

 <Tabs defaultValue="all" className="w-full">
 <TabsList className="w-full h-8 p-0.5 bg-muted/60 rounded-lg">
 <TabsTrigger value="all" className="flex-1 text-[11px] h-full px-1 min-w-0 truncate rounded-md">All Requests</TabsTrigger>
 <TabsTrigger value="available" className="flex-1 text-[11px] h-full px-1 min-w-0 truncate rounded-md">Available</TabsTrigger>
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <TabsTrigger value="backlog" className="flex-1 text-[11px] h-full px-1 min-w-0 truncate rounded-md">Batch</TabsTrigger>
 </TooltipTrigger>
 <TooltipContent side="bottom">
 <p>Batch Requests</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </TabsList>
 <TabsContent value="all" className="mt-4">
 <div className="space-y-3">
  <div className="flex items-center justify-end">
   <button type="button" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
    <span>Sort By</span><Filter className="h-3 w-3 ml-0.5" />
   </button>
  </div>
  {(() => {
  const q = searchQuery.toLowerCase();
  const filteredSections = q
   ? MOCK_BY_SECTION.map(([s, rs]) => [s, rs.filter(r => r.reqNum.toLowerCase().includes(q) || r.docName.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q) || s.toLowerCase().includes(q))] as [string, typeof rs]).filter(([, rs]) => rs.length > 0)
   : MOCK_BY_SECTION;
  if (filteredSections.length === 0) return (
   <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
    <Search className="h-8 w-8 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">No requests match "{searchQuery}"</p>
   </div>
  );
  return <>{filteredSections.map(([section, reqs]) => {
   const isCollapsed = collapsedFolders.has(section);
   return (
   <div key={section} className="space-y-2">
    <button type="button" onClick={() => toggleFolder(section)} className="w-full flex items-center gap-1.5 hover:opacity-80 transition-opacity">
     {isCollapsed
      ? <FolderPlusIcon className="h-3.5 w-3.5 text-primary shrink-0" />
      : <FolderMinusIcon className="h-3.5 w-3.5 text-primary shrink-0" />}
   <span className="text-[13px] font-medium text-foreground truncate flex-1 text-left"><Highlight text={section} query={searchQuery} /></span>
     <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-emphasized bg-secondary text-secondary-foreground border border-secondary-foreground/10">{reqs.length}</span>
    </button>
    {!isCollapsed && reqs.map(req => (
    <div key={req.id} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
     <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground"><Highlight text={req.reqNum} query={searchQuery} /></span>
      <span className="text-[12px] text-muted-foreground flex-1 text-right">{req.date}</span>
      <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: req.avatarColor }}>{req.initials}</div>
     </div>
     <div className="flex items-start gap-1">
      <span className="text-[13px] font-semibold text-foreground flex-1 min-w-0 truncate"><Highlight text={req.docName} query={searchQuery} /></span>
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-200 ease-emphasized bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50 shrink-0">Due by {req.dueDate}</span>
     </div>
     <p className="text-[12px] text-muted-foreground"><Highlight text={req.notes} query={searchQuery} /></p>
     <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><Paperclip className="h-3 w-3" /><span>{req.attachments}</span></div>
      <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><MessageSquare className="h-3 w-3" /><span>{req.comments}</span></div>
      <div className="ml-auto flex items-center gap-1">
       <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
       <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Trash2 className="h-3 w-3 text-destructive/70" /></button>
      </div>
     </div>
    </div>
    ))}
   </div>
   );
  })}</>;
 })()}
 </div>
 </TabsContent>
 <TabsContent value="available" className="mt-4">
 {(() => {
  const q5 = searchQuery.toLowerCase();
  const avail = MOCK_REQUESTS.filter(r => r.status === 'available' && (!q5 || r.reqNum.toLowerCase().includes(q5) || r.docName.toLowerCase().includes(q5) || r.notes.toLowerCase().includes(q5)));
  if (!avail.length) return (
   <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
     <FolderOpen className="h-8 w-8 text-primary/40" />
    </div>
    <p className="text-sm text-muted-foreground">No available requests</p>
   </div>
  );
  return <div className="space-y-2">{avail.map(req => (
   <div key={req.id} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
    <div className="flex items-center gap-1.5">
     <span className="text-[13px] font-medium text-muted-foreground"><Highlight text={req.reqNum} query={searchQuery} /></span>
     <span className="text-[12px] text-muted-foreground flex-1 text-right">{req.date}</span>
     <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: req.avatarColor }}>{req.initials}</div>
    </div>
    <div className="flex items-start gap-1">
     <span className="text-[13px] font-semibold text-foreground flex-1 min-w-0 truncate"><Highlight text={req.docName} query={searchQuery} /></span>
     <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-200 ease-emphasized bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50 shrink-0">Due by {req.dueDate}</span>
    </div>
    <p className="text-[12px] text-muted-foreground"><Highlight text={req.notes} query={searchQuery} /></p>
    <div className="flex items-center gap-2">
     <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><Paperclip className="h-3 w-3" /><span>{req.attachments}</span></div>
     <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><MessageSquare className="h-3 w-3" /><span>{req.comments}</span></div>
     <div className="ml-auto flex items-center gap-1">
      <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
      <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Trash2 className="h-3 w-3 text-destructive/70" /></button>
     </div>
    </div>
   </div>
  ))}</div>;
 })()}
 </TabsContent>
 <TabsContent value="backlog" className="mt-4">
 {(() => {
  const q6 = searchQuery.toLowerCase();
  const batch = MOCK_REQUESTS.filter(r => r.status === 'batch' && (!q6 || r.reqNum.toLowerCase().includes(q6) || r.docName.toLowerCase().includes(q6) || r.notes.toLowerCase().includes(q6)));
  if (!batch.length) return (
   <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
     <FolderOpen className="h-8 w-8 text-primary/40" />
    </div>
    <p className="text-sm text-muted-foreground">No batch requests</p>
   </div>
  );
  return <div className="space-y-2">{batch.map(req => (
   <div key={req.id} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
    <div className="flex items-center gap-1.5">
     <span className="text-[13px] font-medium text-muted-foreground"><Highlight text={req.reqNum} query={searchQuery} /></span>
     <span className="text-[12px] text-muted-foreground flex-1 text-right">{req.date}</span>
     <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: req.avatarColor }}>{req.initials}</div>
    </div>
    <div className="flex items-start gap-1">
     <span className="text-[13px] font-semibold text-foreground flex-1 min-w-0 truncate"><Highlight text={req.docName} query={searchQuery} /></span>
     <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-200 ease-emphasized bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50 shrink-0">Due by {req.dueDate}</span>
    </div>
    <p className="text-[12px] text-muted-foreground"><Highlight text={req.notes} query={searchQuery} /></p>
    <div className="flex items-center gap-2">
     <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><Paperclip className="h-3 w-3" /><span>{req.attachments}</span></div>
     <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><MessageSquare className="h-3 w-3" /><span>{req.comments}</span></div>
     <div className="ml-auto flex items-center gap-1">
      <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
      <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors"><Trash2 className="h-3 w-3 text-destructive/70" /></button>
     </div>
    </div>
   </div>
  ))}</div>;
 })()}
 </TabsContent>
 </Tabs>
 </div>
 </>
 )}
 </div>
 )}
 </div>
 </div>
 );

 if (!portalTarget) return null;
 return createPortal(panel, portalTarget);
}
