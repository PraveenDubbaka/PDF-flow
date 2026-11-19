import { useState, useRef, useEffect } from "react";
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { baseTrialBalanceData } from '@/data/trialBalanceRows';
import { publishTrialBalanceAccounts } from '@/lib/trialBalanceSource';
import { cn } from '@/lib/utils';
import { useEngagements } from "@/store/EngagementsContext";
import { toast } from "sonner";
import { EngagementRightPanel } from "@/components/EngagementRightPanel";
import { Layout } from "@/components/Layout";
import { useSecondaryPanel } from "@/hooks/useSecondaryPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import { StyledCard } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewAdjEntryModal, type AdjLine, type AdjEntryMeta } from "@/components/NewAdjEntryModal";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { getUnresolvedDuplicateCount } from "@/data/mergeAccountsData";
import { engagementsData } from "@/data/engagementsData";
import MergeAccounts from "@/pages/MergeAccounts";
import {
 ChevronDown,
 ChevronLeft,
 ChevronRight,
 ChevronUp,
 Landmark,
 FileText,
 Triangle,
 PencilLine,
 FileSpreadsheet,
 Download,
 RefreshCw,
 Upload,
 Search,
 MoreVertical,
 GripVertical,
 FileX2,
 Network,
 Settings2,
 Building2,
 Calendar,
 Check,
 Plus,
 Trash2,
 GitMerge,
 AlertTriangle,
 Wrench,
 EyeOff,
 Eye,
 ListFilter,
 ArrowLeft,
 X,
 Info,
 CloudUpload,
 Plug,
} from "lucide-react";

// Filter categories with badge colors and short labels (matching screenshot)
const FILTER_CATEGORIES = [
 { id: "unmapped", label: "Unmapped", short: "UNM", color: "hsl(22 45% 48%)" },
 { id: "autoMapped", label: "Auto Mapped", short: "AUT", color: "hsl(28 55% 55%)" },
 { id: "newRow", label: "New row", short: "NEW", color: "hsl(40 50% 50%)" },
 { id: "addedRow", label: "Added row", short: "ADD", color: "hsl(195 45% 55%)" },
 { id: "changeRow", label: "Change row", short: "CHG", color: "hsl(140 35% 50%)" },
 { id: "zeroBal", label: "$0 Bal. Acc.", short: "$0", color: "hsl(0 0% 70%)" },
] as const;

type FilterId = typeof FILTER_CATEGORIES[number]["id"];

const getUniqueClients = () => {
 const clients = new Set<string>();
 Object.values(engagementsData).forEach(e => clients.add(e.client));
 return Array.from(clients);
};

const getEngagementsForClient = (clientName: string) => {
 return Object.values(engagementsData).filter(e => e.client === clientName);
};

// Custom TB Check icon
const TBCheckIcon = ({ className }: { className?: string }) => (
 <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
 <path d="M7.84228 5.33609V8.00276M7.84228 10.6694H7.84895M6.91916 1.93057L1.43591 11.4017C1.13177 11.927 0.979701 12.1896 1.00218 12.4052C1.02178 12.5933 1.12029 12.7641 1.2732 12.8753C1.4485 13.0028 1.75201 13.0028 2.35903 13.0028H13.3255C13.9326 13.0028 14.2361 13.0028 14.4114 12.8753C14.5643 12.7641 14.6628 12.5933 14.6824 12.4052C14.7049 12.1896 14.5528 11.927 14.2487 11.4017L8.76541 1.93057C8.46236 1.40713 8.31084 1.14541 8.11315 1.05751C7.94071 0.980831 7.74386 0.980831 7.57142 1.05751C7.37373 1.14541 7.22221 1.40713 6.91916 1.93057Z" stroke="#F04438" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
);

const inlineHeaderActions = [
 { id: "tb", label: "TB Check", icon: TBCheckIcon },
 { id: "adj", label: "Adj. Entries", icon: PencilLine },
 { id: "workbook", label: "Workbook", icon: FileSpreadsheet },
];

const toolsMenuActions = [
 { id: "bank", label: "Connect Bank", icon: Landmark },
 { id: "docs", label: "Source Docs", icon: FileText },
];


// Harbor Freight Logistics LLC — Trial Balance (USD) — Dec 31, 2025


const formatNumber = (val: number | string) => {
 if (typeof val === "string") return val;
 const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 if (val === 0) return "0.00";
 if (val < 0) return `(${fmt(Math.abs(val))})`;
 return fmt(val);
};

// trialBalanceData is managed as state inside the TrialBalance component

const totals = { original: 0.00, adj: 0.00, final: 0.00, py1: 0.00, py2: 0.00 };
const netIncome = { original: 847000, adj: 0.00, final: 847000, py1: 740000, py2: "589,000.00" };


const TB_LOADED_KEY = (id: string) => `tb-loaded-${id}`;

function computeAdjFromStorage(engId: string): Record<string, number> {
  const prefix = `adj-entry-${engId}-`;
  const accAdj: Record<string, number> = {};
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(key => {
    try {
      const entry = JSON.parse(localStorage.getItem(key) ?? "{}") as { lines?: AdjLine[] };
      (entry.lines ?? []).forEach(l => {
        const net = (parseFloat(l.debit) || 0) - (parseFloat(l.credit) || 0);
        if (net !== 0) accAdj[l.accNo] = (accAdj[l.accNo] ?? 0) + net;
      });
    } catch {}
  });
  return accAdj;
}

export default function TrialBalance() {
 const navigate = useNavigate();
 const [linkParams] = useSearchParams();
 const linkedAccount = linkParams.get('account');
 const linkedColumn = linkParams.get('column') ?? 'Original';
 const returnUrl = linkParams.get('document');
 const [linkedHighlight, setLinkedHighlight] = useState(false);
 const { engagementId } = useParams();
 const [dateFilter] = useState("Dec 31 2024");
 const [hideZeroAcc, setHideZeroAcc] = useState(false);
 const zeroAccCount = 0;
 const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
 const [adjModalOpen, setAdjModalOpen] = useState(false);
 const [mergeModalOpen, setMergeModalOpen] = useState(false);
 const [selectedAdjRow, setSelectedAdjRow] = useState<{ accNo: string; description: string } | null>(null);
 const [trialBalanceData, setTrialBalanceData] = useState([...baseTrialBalanceData]);
 const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set());
 const { isCollapsed: isPanelCollapsed, toggle: togglePanel } = useSecondaryPanel();

 useEffect(() => {
   if (!engagementId) return;
   publishTrialBalanceAccounts(engagementId, trialBalanceData.map((row) => ({
     accNo: row.accNo, description: row.description, balance: row.original, py1: row.py1,
     py2: Number(row.py2.replace(/[,()]/g, '')) * (row.py2.startsWith('(') ? -1 : 1),
   })));
 }, [engagementId, trialBalanceData]);

 // Restore adj amounts from saved AJE entries on mount
 useEffect(() => {
   if (!engagementId) return;
   const accAdj = computeAdjFromStorage(engagementId);
   if (Object.keys(accAdj).length === 0) return;
   setTrialBalanceData(prev =>
     prev.map(row => {
       const adj = accAdj[row.accNo] ?? 0;
       return { ...row, adj, final: row.original + adj };
     })
   );
 }, [engagementId]);

 // TB load state — persisted per engagement
 const [tbLoaded, setTbLoaded] = useState(() =>
 Boolean(linkedAccount) || (engagementId ? !!localStorage.getItem(TB_LOADED_KEY(engagementId)) : false)
 );
 useEffect(() => {
   if (!linkedAccount || !tbLoaded) return;
   setActiveFilters(new Set());
   const timer = window.setTimeout(() => {
     const row = Array.from(document.querySelectorAll<HTMLElement>('[data-tb-account]')).find((el) => el.dataset.tbAccount === linkedAccount);
     const cell = row?.querySelector<HTMLElement>(`[data-tb-column="${linkedColumn}"]`);
     cell?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
     setLinkedHighlight(true);
   }, 100);
   const clear = window.setTimeout(() => setLinkedHighlight(false), 3000);
   return () => { window.clearTimeout(timer); window.clearTimeout(clear); };
 }, [linkedAccount, linkedColumn, tbLoaded]);

 const [showImport, setShowImport] = useState(false);
 const [cyFile, setCyFile] = useState<File | null>(null);
 const [py1File, setPy1File] = useState<File | null>(null);
 const [py2File, setPy2File] = useState<File | null>(null);
 const [isUploading, setIsUploading] = useState(false);
 const cyInputRef = useRef<HTMLInputElement>(null);
 const py1InputRef = useRef<HTMLInputElement>(null);
 const py2InputRef = useRef<HTMLInputElement>(null);

 const { engagements, updateEngagement } = useEngagements();
 const contextEng = engagements.find(e => e.id === engagementId);
 const staticEng = engagementId ? engagementsData[engagementId] : null;

 const toggleFilter = (id: FilterId) => {
 setActiveFilters(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id); else next.add(id);
 return next;
 });
 };
 const clearFilters = () => setActiveFilters(new Set());

 const handleUpload = () => {
 if (!cyFile || !engagementId) return;
 setIsUploading(true);
 setTimeout(() => {
 localStorage.setItem(TB_LOADED_KEY(engagementId), '1');
 setTbLoaded(true);
 setShowImport(false);
 setIsUploading(false);
 setCyFile(null); setPy1File(null); setPy2File(null);
 updateEngagement(engagementId, { status: 'In Progress', statusVariant: 'inProgress' });
 toast.success('Trial balance imported successfully');
 }, 1200);
 };

 const cyYear = (() => {
 const ye = contextEng?.yearEnd || staticEng?.yearEnd || '';
 const m = ye.match(/\d{4}/);
 return m ? parseInt(m[0]) : new Date().getFullYear();
 })();

 const engagement = staticEng;
 const displayId = engagementId || "Unknown";
 const clientName = contextEng?.client || engagement?.client || "Unknown Client";
 const status = contextEng?.status || engagement?.status || "In Progress";
 const uniqueClients = getUniqueClients();
 const clientEngagements = getEngagementsForClient(clientName);
 const duplicateCount = getUnresolvedDuplicateCount(engagementId);
 const duplicatesPending = duplicateCount > 0;

 const trialBalanceBreadcrumb = (
 <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-sidebar-foreground">
 {/* Client Name (read-only) */}
 <div className="flex items-center gap-1.5 px-2 py-1">
 <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
 <Building2 className="h-3.5 w-3.5 text-sidebar-foreground" />
 </div>
 <span className="text-sm font-medium text-sidebar-foreground">{clientName}</span>
 </div>

 <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60" />

 {/* Engagement Selector */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="group flex items-center gap-1.5 px-2 py-1 rounded-md border border-sidebar-foreground/20 hover:bg-sidebar-foreground/10 transition-colors">
 <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
 <FileText className="h-3.5 w-3.5 text-sidebar-foreground" />
 </div>
 <span className="text-sm font-medium text-sidebar-foreground group-hover:text-sidebar-foreground transition-colors font-mono">{displayId}</span>
 <ChevronDown className="h-3 w-3 text-sidebar-foreground/60 group-hover:text-sidebar-foreground transition-colors" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-72">
 <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Engagements for {clientName}</div>
 {clientEngagements.map((eng) => (
 <DropdownMenuItem key={eng.id} onClick={() => navigate(`/engagements/${eng.id}/trial-balance`)} className="flex items-center gap-3 cursor-pointer group py-2">
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-mono text-sm font-medium truncate">{eng.id}</span>
 <div className="flex items-center gap-2 mt-0.5">
 <Calendar className="h-3 w-3 text-muted-foreground group-hover:text-white transition-colors" />
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">{eng.yearEnd}</span>
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">•</span>
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">{eng.type}</span>
 </div>
 </div>
 {eng.id === displayId && <Check className="h-4 w-4 text-primary group-hover:text-primary-foreground flex-shrink-0" />}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>

 {/* Status Badge */}
 <Badge
 variant={status === 'Completed' || status === 'New' ? 'completed' : status === 'Not Started' ? 'notStarted' : 'inProgress'}
 className="ml-1 whitespace-nowrap"
 >
 {status}
 </Badge>

 {/* Xero Integration Badge */}
 <div className="ml-1 inline-flex items-center justify-center h-7 w-20 px-1 bg-card border border-border rounded-sm gap-1">
 <img src="https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg" alt="Xero" className="h-4" />
 <span className="text-xs font-medium text-foreground">Xero</span>
 </div>
 </div>
 );

 // ── Empty state — only for New engagements without a loaded TB ──────────
 if (!tbLoaded && !showImport && status === 'New') {
 return (
 <Layout title="Engagements" headerContent={trialBalanceBreadcrumb}>
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
 {/* Level-1 sticky header — matches loaded TB */}
 <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
 <div className="flex items-center gap-2">
 <button disabled className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground opacity-40 pointer-events-none flex-shrink-0">
 <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
 <path fill="currentColor" d="M20.25 7c0-.69-.56-1.25-1.25-1.25H9.75v12.5H19c.69 0 1.25-.56 1.25-1.25zM3.75 17c0.69.56 1.25 1.25 1.25h3.25V5.75H5c-.69 0-1.25.56-1.25 1.25zm18 0A2.75 2.75 0 0 1 19 19.75H5A2.75 2.75 0 0 1 2.25 17V7A2.75 2.75 0 0 1 5 4.25h14A2.75 2.75 0 0 1 21.75 7z" />
 </svg>
 </button>
 <h1 className="text-lg font-semibold text-foreground truncate">Trial Balance</h1>
 </div>
 <div className="flex items-center gap-2">
 {returnUrl?.startsWith(`/engagements/${engagementId}/pdf/`) && <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => navigate(returnUrl)}><ChevronLeft />Back to document</Button>}
 {inlineHeaderActions.map(action => (
 <ExpandableIconButton key={action.id} variant="secondary" size="sm" icon={<action.icon className="h-4 w-4" />} label={action.label} disabled />
 ))}
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Settings2 className="h-4 w-4" />}
 label={<span className="inline-flex items-center gap-1">Tools<ChevronDown className="h-3 w-3" /></span>}
 disabled
 />
 </div>
 </div>
 {/* Level-2 sticky sub-toolbar — matches loaded TB */}
 <div className="sticky top-[42px] z-10 bg-card px-4 py-2 border-b border-border/50">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Button variant="secondary" size="sm" className="h-9 text-xs gap-1.5 opacity-40 pointer-events-none" disabled>
 {dateFilter} <ChevronDown className="h-3.5 w-3.5" />
 </Button>
 </div>
 <div className="flex items-center gap-2">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton variant="secondary" icon={<Wrench className="h-4 w-4" />} label={<span className="inline-flex items-center gap-1">Actions<ChevronDown className="h-3 w-3" /></span>} />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-44">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => setShowImport(true)}>
 <Upload className="h-4 w-4 text-muted-foreground" /><span>Import</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem disabled className="flex items-center gap-2 opacity-40">
 <Plus className="h-4 w-4 text-muted-foreground" /><span>Add</span>
 </DropdownMenuItem>
 <DropdownMenuItem disabled className="flex items-center gap-2 opacity-40">
 <Trash2 className="h-4 w-4 text-destructive" /><span>Delete</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem disabled className="flex items-center gap-2 opacity-40">
 <FileX2 className="h-4 w-4 text-muted-foreground" /><span>Unmap</span>
 </DropdownMenuItem>
 <DropdownMenuItem disabled className="flex items-center gap-2 opacity-40">
 <Network className="h-4 w-4 text-muted-foreground" /><span>Auto Map</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem disabled className="flex items-center gap-2 opacity-40">
 <Download className="h-4 w-4 text-muted-foreground" /><span>Export</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 <ExpandableIconButton variant="secondary" icon={<RefreshCw className="h-4 w-4" />} label={<span className="inline-flex items-center gap-1">Refresh<ChevronDown className="h-3 w-3" /></span>} disabled />
 <ExpandableIconButton variant="secondary" icon={<EyeOff className="h-4 w-4" />} label="Hide $0 Acc. (0)" disabled />
 <ExpandableSearch disabled />
 </div>
 </div>
 </div>
 {/* Content */}
 <div className="flex-1 overflow-auto flex items-center justify-center p-6">
 <div className="bg-card border border-border rounded-xl p-10 max-w-2xl w-full text-center shadow-sm">
 <p className="text-base font-semibold text-foreground mb-1">No Trial Balance Data Found</p>
 <p className="text-sm text-muted-foreground mb-8">Please Retrieve Data Using One of the Options</p>
 <div className="flex items-stretch gap-6 justify-center">
 {/* Import CSV/Excel/PDF */}
 <div className="flex-1 max-w-xs flex flex-col items-center gap-3 bg-muted/40 border border-border rounded-xl p-6">
 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
 <CloudUpload className="h-7 w-7 text-primary" />
 </div>
 <p className="text-sm font-semibold text-foreground">Import Data from CSV/Excel/PDF</p>
 <p className="text-xs text-muted-foreground text-center">Choose and import the respective file to effortlessly bring in all data with a single click</p>
 <Button size="sm" className="mt-auto gap-1.5" onClick={() => setShowImport(true)}>
 <Upload className="h-4 w-4" /> Import
 </Button>
 </div>
 <div className="flex items-center text-sm font-medium text-muted-foreground">OR</div>
 {/* Accounting software */}
 <div className="flex-1 max-w-xs flex flex-col items-center gap-3 bg-muted/40 border border-border rounded-xl p-6">
 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
 <Plug className="h-7 w-7 text-primary" />
 </div>
 <p className="text-sm font-semibold text-foreground">Integrate with Accounting Software</p>
 <p className="text-xs text-muted-foreground text-center">Instantly import data by login and linking to the accounting source</p>
 <Button size="sm" variant="outline" className="mt-auto gap-1.5" onClick={() => toast.info('Accounting source integration coming soon')}>
 <Plug className="h-4 w-4" /> Select Account Source
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </Layout>
 );
 }

 // ── Import view ───────────────────────────────────────────────────────────
 if (showImport) {
 const years = [cyYear, cyYear - 1, cyYear - 2];
 const DropZone = ({ label, file, onFile, inputRef }: { label: string; file: File | null; onFile: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement> }) => (
 <div className="flex items-start gap-6 py-4 border-b border-border last:border-b-0">
 <span className="w-44 shrink-0 text-sm font-medium text-foreground pt-4">{label}</span>
 <div className="flex-1">
 {file ? (
 <div className="flex items-center gap-3 border border-border rounded-lg px-4 py-3 bg-card">
 <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
 <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
 <button onClick={() => onFile(null)} className="text-destructive hover:text-destructive/80">
 <X className="h-4 w-4" />
 </button>
 </div>
 ) : (
 <div
 className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
 onClick={() => inputRef.current?.click()}
 >
 <CloudUpload className="h-8 w-8 text-muted-foreground" />
 <p className="text-sm text-muted-foreground">
 <span className="text-link font-medium">Click to upload</span> or Drag and drop the file
 </p>
 <p className="text-xs text-muted-foreground">(CSV/Excel/PDF)</p>
 </div>
 )}
 <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden"
 onChange={e => { const f = e.target.files?.[0] ?? null; onFile(f); e.target.value = ''; }} />
 </div>
 </div>
 );

 return (
 <Layout title="Engagements" headerContent={trialBalanceBreadcrumb}>
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
 {/* Level-1 sticky header — matches main TB page */}
 <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowImport(false)}
 className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
 >
 <ArrowLeft className="h-4 w-4" />
 </button>
 <h1 className="text-lg font-semibold text-foreground">Import Trial Balance</h1>
 </div>
 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowImport(false)}>
 <FileSpreadsheet className="h-4 w-4" /> Import TB
 </Button>
 </div>

 {/* Level-2 sticky sub-toolbar — year tabs + upload actions */}
 <div className="sticky top-[42px] z-10 bg-card px-4 py-2 border-b border-border/50">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-medium text-muted-foreground mb-1.5">Year End</p>
 <div className="flex">
 {years.map((y, i) => (
 <button key={y} className={`px-3 py-1.5 text-sm border transition-colors
 ${i === 0 ? 'rounded-l-md' : '-ml-px'}
 ${i === years.length - 1 ? 'rounded-r-md' : ''}
 ${i === 0 ? 'bg-[#1C63A6] text-white border-primary z-10 relative' : 'border-border text-muted-foreground hover:bg-muted'}`}>
 {y} (0)
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button size="sm" variant="outline" disabled={!cyFile && !py1File && !py2File}>Delete Draft</Button>
 <Button size="sm" disabled={!cyFile} onClick={handleUpload} className="gap-1.5">
 {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
 Upload
 </Button>
 </div>
 </div>
 </div>

 {/* Body — full width */}
 <div className="flex-1 overflow-auto p-6">
 <p className="text-sm text-muted-foreground mb-2">
 This feature allows you to upload trial balance data from desktop-based accounting software for one or multiple years. Ensure files follow the specified format in the upload section. The system will auto-generate groupings, and data can only be imported once all items are fully mapped.
 </p>
 <p className="text-sm text-link mb-6 flex items-start gap-1.5">
 <Info className="h-4 w-4 shrink-0 mt-0.5" />
 <em>Note: If results are not as expected, ensure your file has accurate headers with Acc No., Description, Debit, and Credit details and import again.</em>
 </p>

 {/* Upload zones */}
 <div className="bg-card border border-border rounded-xl p-6">
 <DropZone label="Current Year (CY) Trial Balance" file={cyFile} onFile={setCyFile} inputRef={cyInputRef} />
 <DropZone label="Prior Year 1 (PY1) Trial Balance" file={py1File} onFile={setPy1File} inputRef={py1InputRef} />
 <DropZone label="Prior Year 2 (PY2) Trial Balance" file={py2File} onFile={setPy2File} inputRef={py2InputRef} />
 <div className="mt-4">
 <Button className="w-full gap-1.5" disabled={!cyFile} onClick={handleUpload}>
 {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
 Upload
 </Button>
 </div>
 </div>
 </div>
 </div>
 </Layout>
 );
 }

 return (
 <Layout title="Engagements" headerContent={trialBalanceBreadcrumb}>
 <div className="flex h-full overflow-hidden">
 {returnUrl?.startsWith(`/engagements/${engagementId}/pdf/`) && createPortal(<Button variant="secondary" className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 sm:hidden" onClick={() => navigate(returnUrl)}><ChevronLeft />Back to document</Button>, document.body)}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
 {/* Top Header Bar - title and tool actions */}
 <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
 <div className="flex items-center gap-2">
 <button
 onClick={togglePanel}
 aria-label={isPanelCollapsed ? "Expand sections panel" : "Collapse sections panel"}
 title={isPanelCollapsed ? "Expand sections panel" : "Collapse sections panel"}
 className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0" aria-hidden="true">
 <path fill="currentColor" d="M20.25 7c0-.69-.56-1.25-1.25-1.25H9.75v12.5H19c.69 0 1.25-.56 1.25-1.25zM3.75 17c0.69.56 1.25 1.25 1.25h3.25V5.75H5c-.69 0-1.25.56-1.25 1.25zm18 0A2.75 2.75 0 0 1 19 19.75H5A2.75 2.75 0 0 1 2.25 17V7A2.75 2.75 0 0 1 5 4.25h14A2.75 2.75 0 0 1 21.75 7z"></path>
 </svg>
 </button>
 <h1 className="text-lg font-semibold text-foreground truncate">
 Trial Balance
 </h1>
 </div>
 <div className="flex items-center gap-2">
 {returnUrl?.startsWith(`/engagements/${engagementId}/pdf/`) && <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => navigate(returnUrl)}><ChevronLeft />Back to document</Button>}
 {inlineHeaderActions.map(action => (
 <ExpandableIconButton
 key={action.id}
 variant="secondary"
 size="sm"
 icon={<action.icon className="h-4 w-4" />}
 label={action.label}
 />
 ))}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Settings2 className="h-4 w-4" />}
 label={<span className="inline-flex items-center gap-1">Tools<ChevronDown className="h-3 w-3" /></span>}
 />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 {toolsMenuActions.map(action => (
 <DropdownMenuItem key={action.id} className="flex items-center gap-2 cursor-pointer group">
 <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>{action.label}</span>
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 </div>

 {/* Sub header toolbar - always visible */}
 <div className="sticky top-[42px] z-10 bg-card px-4 py-2 border-b border-border/50">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {/* Date Selector - dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="secondary" size="sm" className="h-9 text-xs gap-1.5">
 {dateFilter}
 <ChevronDown className="h-3.5 w-3.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent>
 <DropdownMenuItem>Dec 31 2025</DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>

 </div>

 <div className="flex items-center gap-2">
 {/* Actions dropdown - Add / Merge / Delete / Unmap / Auto Map */}
 <Tooltip>
 <DropdownMenu>
 <TooltipTrigger asChild>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton
 variant={duplicatesPending ? undefined : "secondary"}
 icon={duplicatesPending ? <AlertTriangle className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
 label={<span className="inline-flex items-center gap-1">Actions<ChevronDown className="h-3 w-3" /></span>}
 className={duplicatesPending ? "bg-amber-50 border-2 border-amber-500 text-amber-700 hover:bg-amber-100" : undefined}
 />
 </DropdownMenuTrigger>
 </TooltipTrigger>
 <DropdownMenuContent align="end" className="w-44">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
 <Plus className="h-4 w-4 text-muted-foreground" />
 <span>Add</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 className="flex items-center gap-2 cursor-pointer"
 onClick={() => setMergeModalOpen(true)}
 >
 <GitMerge className="h-4 w-4 text-muted-foreground" />
 <span className="flex-1">Merge</span>
 {duplicatesPending && <AlertTriangle className="h-4 w-4 text-amber-600" />}
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
 <Trash2 className="h-4 w-4 text-destructive" />
 <span>Delete</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
 <FileX2 className="h-4 w-4 text-muted-foreground" />
 <span>Unmap</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
 <Network className="h-4 w-4 text-muted-foreground" />
 <span>Auto Map</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
 <Upload className="h-4 w-4 text-muted-foreground" />
 <span>Import</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
 <Download className="h-4 w-4 text-muted-foreground" />
 <span>Export</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 {duplicatesPending && (
 <TooltipContent side="top" className="bg-card text-foreground border border-border shadow-md">
 {duplicateCount} duplicate account{duplicateCount === 1 ? "" : "s"} found
 </TooltipContent>
 )}
 </Tooltip>

 {/* Refresh button beside Actions */}
 <Tooltip>
 <DropdownMenu>
 <TooltipTrigger asChild>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton
 variant="secondary"
 icon={<RefreshCw className="h-4 w-4" />}
 label={<span className="inline-flex items-center gap-1">Refresh<ChevronDown className="h-3 w-3" /></span>}
 />
 </DropdownMenuTrigger>
 </TooltipTrigger>
 <DropdownMenuContent align="end" className="z-[100]">
 <DropdownMenuItem>All Years</DropdownMenuItem>
 <DropdownMenuItem>Current Year</DropdownMenuItem>
 <DropdownMenuItem>PY 1</DropdownMenuItem>
 <DropdownMenuItem>PY 2</DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 <TooltipContent side="bottom" sideOffset={8} className="z-[110]">
 Last updated: <span className="font-medium">54 min ago</span>
 </TooltipContent>
 </Tooltip>



 {/* Hide / Show $0 Accounts toggle */}
 <ExpandableIconButton
 variant="secondary"
 icon={hideZeroAcc ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
 label={`${hideZeroAcc ? "Show" : "Hide"} $0 Acc. (${zeroAccCount})`}
 onClick={() => setHideZeroAcc(v => !v)}
 />

 <ExpandableSearch />
 </div>
 </div>
 </div>

 {/* Table */}
 <StyledCard className="mx-6 mt-6 mb-6 overflow-hidden flex flex-col flex-1 min-h-0">
 <div className="flex-1 overflow-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-0 py-3 align-middle" style={{ width: "16px", minWidth: "16px", maxWidth: "16px" }}>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 aria-label="Filter rows"
 className="inline-flex items-center justify-center w-4 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors relative ml-2"
 >
 <ListFilter className="h-3.5 w-3.5" />
 {activeFilters.size > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
 )}
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-56">
 <div className="flex items-center justify-between px-2 py-1.5">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter</span>
 <button
 onClick={clearFilters}
 className="text-xs font-medium text-link hover:underline"
 >
 Clear All
 </button>
 </div>
 <DropdownMenuSeparator />
 {FILTER_CATEGORIES.map(cat => {
 const checked = activeFilters.has(cat.id);
 return (
 <DropdownMenuItem
 key={cat.id}
 onSelect={(e) => { e.preventDefault(); toggleFilter(cat.id); }}
 className="flex items-center gap-2 cursor-pointer group"
 >
 <Checkbox checked={checked} className="pointer-events-none" />
 <span className="flex-1 text-sm">{cat.label}</span>
 <span
 className="w-2.5 h-2.5 rounded-full flex-shrink-0"
 style={{ backgroundColor: cat.color }}
 />
 </DropdownMenuItem>
 );
 })}
 </DropdownMenuContent>
 </DropdownMenu>
 </th>
 <th className="px-2 py-3 w-8"></th>
 <th className="px-2 py-3 w-8"><Checkbox /></th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Acc No.</th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap min-w-[180px]">Description</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Original</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Adj</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Final</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">PY1</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">
 Change (%) <ChevronDown className="inline h-3 w-3" />
 </th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">PY2</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Map No.</th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">LS</th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Grouping</th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Sub Grouping</th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">CF Category</th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">Tax Code</th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-foreground whitespace-nowrap">
 FX Rate <span className="text-muted-foreground">⚙</span>
 </th>
 </tr>
 </thead>
 <tbody>
 {trialBalanceData.map((row, idx) => {
 // Demo: assign each row a filter category cyclically so badges are visible
 const cat = FILTER_CATEGORIES[idx % FILTER_CATEGORIES.length];
 const visible = activeFilters.size === 0 || activeFilters.has(cat.id);
 if (!visible) return null;
 return (
 <tr
 key={row.id}
 data-tb-account={row.accNo}
 className={cn("border-b border-border hover:bg-muted/30 transition-colors cursor-pointer", linkedHighlight && row.accNo === linkedAccount && "bg-primary/10")}
 >
 <td className="p-0 relative" style={{ width: "16px", minWidth: "16px", maxWidth: "16px" }}>
 <div
 className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tracking-wider overflow-hidden"
 style={{ backgroundColor: cat.color, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
 title={cat.label}
 >
 {cat.short}
 </div>
 </td>
 <td className="px-2 py-2 text-center">
 <button className="text-muted-foreground hover:text-foreground">
 <MoreVertical className="h-3.5 w-3.5" />
 </button>
 </td>
 <td className="px-2 py-2"><Checkbox /></td>
 <td className="px-6 py-2 text-foreground whitespace-nowrap">{row.accNo}</td>
 <td className="px-6 py-2 text-foreground whitespace-nowrap">{row.description}</td>
 <td data-tb-column="Original" className={cn("px-6 py-2 text-right text-foreground whitespace-nowrap", linkedHighlight && row.accNo === linkedAccount && linkedColumn === 'Original' && "bg-primary/20 ring-2 ring-inset ring-primary font-semibold")}>{formatNumber(row.original)}</td>
 <td className="px-6 py-2 text-right whitespace-nowrap">
 <button onClick={() => { setSelectedAdjRow({ accNo: row.accNo, description: row.description }); setAdjModalOpen(true); }} className="text-link font-medium hover:underline focus:outline-none">
   {formatNumber(row.adj)}
 </button>
 </td>
 <td className="px-6 py-2 text-right text-foreground whitespace-nowrap">{formatNumber(row.final)}</td>
 <td data-tb-column="PY1" className={cn("px-6 py-2 text-right text-foreground whitespace-nowrap", linkedHighlight && row.accNo === linkedAccount && linkedColumn === 'PY1' && "bg-primary/20 ring-2 ring-inset ring-primary font-semibold")}>{formatNumber(row.py1)}</td>
 <td className="px-6 py-2 text-right text-foreground whitespace-nowrap">{row.changePct}</td>
 <td data-tb-column="PY2" className={cn("px-6 py-2 text-right text-foreground whitespace-nowrap", linkedHighlight && row.accNo === linkedAccount && linkedColumn === 'PY2' && "bg-primary/20 ring-2 ring-inset ring-primary font-semibold")}>{row.py2}</td>
 <td className="px-6 py-2 text-right whitespace-nowrap">
 <span className="text-link font-medium">{formatNumber(row.mapNo)}</span>
 </td>
 <td className="px-6 py-2 text-center whitespace-nowrap">
 <span className="text-link font-medium">{row.ls}</span>
 </td>
 <td className="px-6 py-2 text-foreground whitespace-nowrap">{row.grouping}</td>
 <td className="px-6 py-2 text-foreground whitespace-nowrap">{row.subGrouping}</td>
 <td className="px-6 py-2 text-center whitespace-nowrap">
 <span className="text-link font-medium">{row.cfCategory}</span>
 </td>
 <td className="px-6 py-2 text-center whitespace-nowrap">
 <span className="text-link font-medium">{row.taxCode}</span>
 </td>
 <td className="px-6 py-2 text-right text-foreground whitespace-nowrap">{row.fxRate.toFixed(2)}</td>
 </tr>
 );
 })}

 </tbody>
 <tfoot className="sticky bottom-0 z-10">
 {/* Totals row */}
 <tr className="bg-muted border-t border-border">
 <td className="px-6 py-2" colSpan={5}></td>
 <td className="px-6 py-2 text-right font-semibold text-foreground whitespace-nowrap">{formatNumber(totals.original)}</td>
 <td className="px-6 py-2 text-right font-semibold text-foreground whitespace-nowrap">{formatNumber(totals.adj)}</td>
 <td className="px-6 py-2 text-right font-semibold text-foreground whitespace-nowrap">{formatNumber(totals.final)}</td>
 <td className="px-6 py-2 text-right font-semibold text-foreground whitespace-nowrap">{formatNumber(totals.py1)}</td>
 <td className="px-6 py-2"></td>
 <td className="px-6 py-2 text-right font-semibold text-foreground whitespace-nowrap">{formatNumber(totals.py2)}</td>
 <td colSpan={7}></td>
 </tr>

 {/* Net Income row */}
 <tr className="bg-muted border-t border-border">
 <td className="px-6 py-2" colSpan={4}></td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">Net Income (loss)</td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">{formatNumber(netIncome.original)}</td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">{formatNumber(netIncome.adj)}</td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">{formatNumber(netIncome.final)}</td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">{formatNumber(netIncome.py1)}</td>
 <td className="px-6 py-2"></td>
 <td className="px-6 py-2 text-right font-bold text-foreground whitespace-nowrap">{netIncome.py2}</td>
 <td colSpan={7}></td>
 </tr>
 </tfoot>
 </table>
 </div>
 </StyledCard>
 </div>

 <NewAdjEntryModal
   key={adjModalOpen ? "open" : "closed"}
   open={adjModalOpen}
   onClose={() => setAdjModalOpen(false)}
   onSave={(savedLines, meta) => {
     const entryId = meta.entryNo.replace(/[^a-zA-Z0-9]/g, "-");
     const engId = engagementId ?? "default";

     // 1. Persist the adj entry
     writeJsonToLocalStorage(`adj-entry-${engId}-${entryId}`, { lines: savedLines, meta, clientName, engId: engagementId });

     // 2. Recompute ALL adj from storage (avoids double-counting on re-save)
     const accAdj = computeAdjFromStorage(engId);
     setTrialBalanceData(prev =>
       prev.map(row => {
         const adj = accAdj[row.accNo] ?? 0;
         return { ...row, adj, final: row.original + adj };
       })
     );

     // 3. Write/update the AIM sectionA row
     const aimKey = `audit-aim-data-${engId}`;
     const existing = readJsonFromLocalStorage<{ sectionA?: unknown[]; sectionB?: unknown[] }>(aimKey, { sectionA: [], sectionB: [] });
     let assets = 0, liabilities = 0, pretaxIncome = 0, equity = 0;
     savedLines.forEach(l => {
       const tbRow = baseTrialBalanceData.find(r => r.accNo === l.accNo);
       const net = (parseFloat(l.debit) || 0) - (parseFloat(l.credit) || 0);
       const g = (tbRow?.grouping ?? "").toLowerCase();
       if (g.includes("asset")) assets += net;
       else if (g.includes("liabilit")) liabilities += -net;
       else if (g.includes("equity")) equity += -net;
       else pretaxIncome += -net;
     });
     const fallbackDesc = savedLines.filter(l => l.description).map(l => l.description).join("; ") || savedLines.filter(l => l.accNo).map(l => l.accNo).join("; ");
     const newRow = {
       id: `tb-${entryId}-${Date.now()}`,
       refNo: meta.entryNo,
       description: meta.notes || fallbackDesc,
       entryType: meta.entryType,
       corrected: "",
       assets: assets !== 0 ? String(assets) : "",
       liabilities: liabilities !== 0 ? String(liabilities) : "",
       pretaxIncome: pretaxIncome !== 0 ? String(pretaxIncome) : "",
       equity: equity !== 0 ? String(equity) : "",
       disclosures: "",
       wpRef: [],
     };
     // Update existing AIM row if same entryNo, otherwise append
     const prevRows = (existing.sectionA ?? []) as typeof newRow[];
     const aimRows = prevRows.some(r => r.refNo === meta.entryNo)
       ? prevRows.map(r => r.refNo === meta.entryNo ? { ...newRow, id: r.id } : r)
       : [...prevRows, newRow];
     writeJsonToLocalStorage(aimKey, { ...existing, sectionA: aimRows });

     toast.success("Adjusting entry saved");
   }}
   engId={engagementId ?? ""}
   clientName={clientName}
   yearEnd={staticEng?.yearEnd ?? "Dec 31, 2024"}
   prefillRow={selectedAdjRow ?? undefined}
 />
 <MergeAccounts open={mergeModalOpen} onOpenChange={setMergeModalOpen} engagementId={engagementId} />
 {/* Right Panel */}
 <EngagementRightPanel />
 </div>
 </Layout>
 );
}
