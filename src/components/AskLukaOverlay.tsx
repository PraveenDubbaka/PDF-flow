import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from "react";
import { setLukaOpen, subscribeLukaConfig } from "@/lib/lukaOpenStore";
import { getPBCRequestByThread } from "@/lib/pbcRequestStore";
import { loadEngagements } from "@/store/engagementsStore";

import LukaActivityPanel, { type ActivityEntry } from "@/components/luka/LukaActivityPanel";
import { LukaIcon as LukaHeaderIcon } from "@/components/LukaIcon";
import quickbooksLogo from "@/assets/quickbooks-intuit-logo.png";
import xeroLogo from "@/assets/xero-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
 TooltipProvider,
} from "@/components/ui/tooltip";
import WorkspaceView from "@/components/luka/workspace/WorkspaceView";
import WorkspaceEmptyState from "@/components/luka/workspace/WorkspaceEmptyState";
import AddEngagementModal from "@/components/luka/workspace/AddEngagementModal";
import EngagementWorkspaceShell from "@/components/luka/workspace/EngagementWorkspaceShell";
import LukaSettingsOverlay from "@/components/luka/LukaSettingsOverlay";
import ReconciliationFlow from "@/components/luka/reconciliation/ReconciliationFlow";
import TaxPayableFlow from "@/components/luka/TaxPayableFlow";
import { PBCRequestFlow } from "@/components/luka/PBCRequestFlow";
import { RichTextToolbar } from "@/components/RichTextToolbar";
import {
 X,
 Menu,
 Minus,
 Maximize2,
 Minimize2,
 ExternalLink,
 Zap,
 Plus,
 Inbox,
 Mic,
 Send,
 Sparkles,
 MessageSquare,
 Search,
 ChevronDown,
 PlusCircle,
 Pin,
 ChevronsLeft,
 ChevronsRight,
 Wand2,
 Loader2,
 Check,
 Upload,
 GitBranch,
 Globe,
 MessageCircle,
 Settings,
 MoreVertical,
 Trash2,
 PinOff,
 CheckCircle2,
 Circle,
 ArrowRight,
 Smartphone,
 FileSpreadsheet,
 Pencil,
 FileText,
 PanelLeftClose,
 Download,
} from "lucide-react";
import EditMenuDropdown from "@/components/luka/workspace/EditMenuDropdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Interfaces (preserved from design system for backward compat) ── */

interface FillSummary {
 filledCount: number;
 totalCount: number;
 skippedItems: Array<{ sectionTitle: string; questionText: string }>;
}

export interface AllTemplateSummary {
 templates: Array<{ name: string; code?: string; filledCount: number; totalCount: number; section?: string }>;
 totalFilled: number;
 totalFields: number;
 engagementLabel?: string;
}

export interface AutoFillProgressItem {
 code: string;
 label: string;
 status: 'pending' | 'running' | 'done';
 filledCount?: number;
 totalCount?: number;
}

interface AskLukaOverlayProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 initialQuery?: string;
 autoFillMode?: boolean;
 checklistLabel?: string;
 engagementLabel?: string;
 autoFillSources?: string[];
 onAutoFillConfirmed?: () => void;
 onAutoFillAll?: () => void;
 summaryMode?: boolean;
 fillSummary?: FillSummary;
 allTemplateSummary?: AllTemplateSummary;
 autoFillProgress?: AutoFillProgressItem[];
 nextChecklistLabel?: string;
 onNavigateNext?: () => void;
 onOpenEngagementSheet?: () => void;
 engagementOverviewMode?: boolean;
 onStartSectionBySection?: () => void;
 initialTab?: "threads" | "workspace";
 initialWorkspaceEngagement?: { name: string; code: string; source?: "quickbooks" | "xero" };
 pap501Mode?: boolean;
 pap501IsRegenerate?: boolean;
 pap501Sources?: string[];
 onPap501Accept?: () => void;
 currentEngagementId?: string;
 currentChecklistKey?: string;
 initialAiMessage?: string;
 initialAiMessagePrompts?: string[];
 onAutoFillFromThread?: () => void;
}

const quickPrompts = [
 "/Variance Analysis",
 "/Account Reconciliation",
 "/Bank Reconciliation",
 "/Capital Asset Amortization",
];

type ThreadItem = { name: string; createdAt: Date };

const initialPinnedThreads: ThreadItem[] = [
 { name: "Capital Asset Amortization", createdAt: new Date(2026, 4, 28, 9, 14) },
 { name: "Generate Variance Analysis", createdAt: new Date(2026, 4, 26, 15, 42) },
 { name: "Summarise Uploaded Report", createdAt: new Date(2026, 4, 22, 11, 5) },
];

const initialRecentThreads: ThreadItem[] = [
 { name: "Run Client Health Check", createdAt: new Date(2026, 4, 30, 8, 21) },
 { name: "Aged AR Analysis", createdAt: new Date(2026, 4, 29, 17, 3) },
 { name: "Generate Trial Balance", createdAt: new Date(2026, 4, 29, 10, 47) },
 { name: "Capital Asset Amortization", createdAt: new Date(2026, 4, 28, 14, 12) },
 { name: "Summarise Uploaded Report", createdAt: new Date(2026, 4, 27, 9, 33) },
 { name: "Bank To Trial Balance", createdAt: new Date(2026, 4, 26, 16, 58) },
 { name: "Account Reconciliation", createdAt: new Date(2026, 4, 25, 13, 24) },
 { name: "Notes Generator", createdAt: new Date(2026, 4, 24, 11, 9) },
];

const formatThreadDate = (d: Date) =>
 d.toLocaleString(undefined, {
 month: "short",
 day: "numeric",
 year: "numeric",
 hour: "numeric",
 minute: "2-digit",
 });

interface ThreadRowProps {
 thread: ThreadItem;
 icon: React.ReactNode;
 isPinned: boolean;
 onPinToggle: () => void;
 onDelete: () => void;
}

const ThreadRow = ({ thread, icon, isPinned, onPinToggle, onDelete }: ThreadRowProps) => {
 const [menuOpen, setMenuOpen] = useState(false);
 return (
 <TooltipProvider delayDuration={300}>
 <Tooltip delayDuration={300}>
 <TooltipTrigger asChild>
 <div className="luka-thread-item group relative pr-7" role="button" tabIndex={0}>
 {icon}
 <span className="truncate flex-1 text-left">{thread.name}</span>
 <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
 <DropdownMenuTrigger asChild>
 <button
 type="button"
 onClick={(e) => e.stopPropagation()}
 className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition-opacity duration-150 hover:bg-[hsl(var(--primary)/0.12)] ${
 menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
 }`}
 aria-label="Thread actions"
 >
 <MoreVertical size={14} className="text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" side="right" className="w-36">
 <DropdownMenuItem onClick={onPinToggle}>
 {isPinned ? (
 <>
 <PinOff size={14} className="mr-2" /> Unpin
 </>
 ) : (
 <>
 <Pin size={14} className="mr-2" /> Pin
 </>
 )}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
 <Trash2 size={14} className="mr-2" /> Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </TooltipTrigger>
 <TooltipContent side="right" className="max-w-xs">
 <div className="font-medium text-xs">{thread.name}</div>
 <div className="text-[10px] opacity-70 mt-0.5">Created {formatThreadDate(thread.createdAt)}</div>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 );
};


/* ── AutoFill constants ── */
function LukaIcon({ size = 20 }: { size?: number; animated?: boolean }) {
 return <Zap className="text-white" size={size} fill="white" strokeWidth={0} />;
}

const ENGAGEMENT_SECTIONS = [
 { code: 'CO', label: 'Client Onboarding', forms: 3, estimatedPct: 75 },
 { code: 'PL', label: 'Planning', forms: 8, estimatedPct: 80 },
 { code: 'RA', label: 'Risk Assessment', forms: 20, estimatedPct: 65 },
 { code: 'RP', label: 'Response to Risk', forms: 11, estimatedPct: 70 },
 { code: 'SO', label: 'Completion & Signoffs', forms: 20, estimatedPct: 60 },
];

const SECTION_BADGE_COLORS: Record<string, string> = {
 CO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
 PL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
 RA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
 RP: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
 SO: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
};

const RELATED_TEMPLATES = [
 "Management Representation Letter",
 "Risk Assessment Summary",
 "Audit Planning Memo",
];

/* ── Form slash-command registry — add entries here to extend /NNN pattern ── */
interface FormCommand {
 code: string;
 label: string;
 formKey: string;
 section: string;
}
const FORM_COMMANDS: FormCommand[] = [
 { code: "501", label: "Observation & Inquiry", formKey: "aud-ra-obs", section: "RA" },
 { code: "505", label: "Management Inquiries", formKey: "aud-505", section: "RA" },
 { code: "507", label: "Governance Minutes", formKey: "aud-507", section: "RA" },
 { code: "510", label: "Entity Understanding", formKey: "aud-510", section: "RA" },
 { code: "511", label: "IT Environment", formKey: "aud-511", section: "RA" },
 { code: "514", label: "Prior Period Errors", formKey: "aud-514", section: "RA" },
];

type PromptItem =
 | { kind: "generic"; label: string }
 | { kind: "form"; code: string; label: string; formKey: string; section: string };

/* ── FormCommandFlow — connected vs disconnected mode ── */
interface FormCommandFlowProps {
 formCommand: FormCommand;
 phase: "idle" | "analyzing" | "done" | "scraping" | "preview";
 connectedSources: string[];
 uploadedFile: string | null;
 engagement: { client: string; id: string } | null;
 onUpload: (fileName: string) => void;
 onPopulate: () => void;
 onBack: () => void;
}

function FormCommandFlow({ formCommand, phase, connectedSources, uploadedFile, engagement, onUpload, onPopulate, onBack }: FormCommandFlowProps) {
 const isConnected = connectedSources.length > 0;
 const sourceName = connectedSources[0] ?? "data source";
 return (
 <div className="flex flex-col items-center px-6 pt-8 pb-6 min-h-[60vh] overflow-y-auto">
 <div className="mb-3 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]">
 <Zap className="text-white" size={22} fill="white" strokeWidth={0} />
 </div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${SECTION_BADGE_COLORS[formCommand.section] ?? "bg-muted text-muted-foreground"}`}>
 {formCommand.section}
 </span>
 <span className="text-xs font-mono text-muted-foreground">/{formCommand.code}</span>
 </div>
 <h2 className="text-lg font-semibold text-foreground mb-0.5 text-center">{formCommand.label}</h2>
 {engagement && (
 <p className="text-xs text-muted-foreground text-center mb-5">{engagement.client} · {engagement.id}</p>
 )}

 {isConnected ? (
 phase === "analyzing" ? (
 <div className="flex flex-col items-center gap-3 mt-2 w-full max-w-[280px]">
 <p className="text-sm text-muted-foreground text-center">
 Pulling from <span className="font-medium">{sourceName}</span>…
 </p>
 <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
 <motion.div
 className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4]"
 initial={{ width: "0%" }}
 animate={{ width: "100%" }}
 transition={{ duration: 2.5, ease: "linear" }}
 />
 </div>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 Analyzing form fields…
 </div>
 </div>
 ) : (
 <div className="w-full max-w-[300px]">
 <div className="rounded-[10px] border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 mb-4">
 <div className="flex items-center gap-2 mb-2.5">
 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
 <span className="text-sm font-semibold text-green-700 dark:text-green-400">Ready to populate</span>
 </div>
 <div className="space-y-1.5 text-sm">
 {[["Procedure comments", "8 fields"], ["Done-by fields", "4 fields"], ["WP references", "3 fields"]].map(([k, v]) => (
 <div key={k} className="flex justify-between text-foreground/70">
 <span>{k}</span><span className="font-mono text-xs font-semibold">{v}</span>
 </div>
 ))}
 </div>
 <p className="text-[10px] text-muted-foreground mt-2.5 pt-2 border-t border-green-200 dark:border-green-800">Source: {sourceName}</p>
 </div>
 <button onClick={onPopulate} className="w-full h-10 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md mb-2.5 flex items-center justify-center gap-2">
 <Check className="h-4 w-4" /> Populate {formCommand.label}
 </button>
 <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">← Back to chat</button>
 </div>
 )
 ) : phase === "idle" ? (
 <div className="w-full max-w-[300px]">
 <p className="text-sm text-muted-foreground text-center mb-4 leading-relaxed">
 No data source connected. Upload the minutes or governance document and Luka will extract and populate the form.
 </p>
 <label className="block w-full rounded-[12px] border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer p-6 text-center mb-3">
 <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
 <p className="text-sm font-medium text-foreground mb-1">Drop file here</p>
 <p className="text-xs text-muted-foreground">PDF, Word, or Excel</p>
 <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f.name); }} />
 </label>
 <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">← Back to chat</button>
 </div>
 ) : phase === "scraping" ? (
 <div className="flex flex-col items-center gap-3 mt-2 w-full max-w-[280px]">
 {uploadedFile && (
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-1.5">
 <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[200px]">{uploadedFile}</span>
 </div>
 )}
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Loader2 className="h-4 w-4 animate-spin" /> Scraping document…
 </div>
 </div>
 ) : (
 <div className="w-full max-w-[300px]">
 {uploadedFile && (
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-1.5 mb-3 w-fit mx-auto">
 <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /><span className="truncate max-w-[200px]">{uploadedFile}</span>
 </div>
 )}
 <div className="rounded-[10px] border border-primary/20 bg-primary/5 p-4 mb-4">
 <div className="flex items-center gap-2 mb-2.5">
 <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
 <span className="text-sm font-semibold text-foreground">Extraction complete</span>
 </div>
 <div className="space-y-1.5 text-sm">
 {[["Agenda items found", "7 items"], ["Part A comments", "5 fields"], ["Part B comments", "2 fields"]].map(([k, v]) => (
 <div key={k} className="flex justify-between text-foreground/70">
 <span>{k}</span><span className="font-mono text-xs font-semibold">{v}</span>
 </div>
 ))}
 </div>
 </div>
 <button onClick={onPopulate} className="w-full h-10 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md mb-2.5 flex items-center justify-center gap-2">
 <Check className="h-4 w-4" /> Populate {formCommand.label}
 </button>
 <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">← Back to chat</button>
 </div>
 )}
 </div>
 );
}

// ── PBC Document Viewer helpers ─────────────────────────────────────────────

const PBC_HEAD = "hsl(215 75% 22%)";
const PBC_BODY = "hsl(222 35% 16%)";
const PBC_SUBTLE = "hsl(222 15% 55%)";
const PBC_FONT = "'DM Sans', system-ui, sans-serif";

function renderPBCInline(text: string): React.ReactNode[] {
 return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
 part.startsWith("**") && part.endsWith("**")
 ? <strong key={i}>{part.slice(2, -2)}</strong>
 : part
 );
}

function PBCDocContent({ content }: { content: string }) {
 const lines = content.split("\n");
 const elements: React.ReactNode[] = [];
 const tableBuffer: string[] = [];
 let k = 0;

 const flushTable = () => {
 if (!tableBuffer.length) return;
 const rows = tableBuffer.splice(0);
 const dataRows = rows.filter(r => /[a-zA-Z0-9#*☐]/.test(r));
 const parsedRows = dataRows.map(r =>
 r.split("|").filter((_, j, a) => j > 0 && j < a.length - 1).map(c => c.trim())
 );
 if (!parsedRows.length) return;
 elements.push(
 <div key={k++} style={{ overflowX: "auto", marginBottom: 16 }}>
 <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: PBC_FONT }}>
 <thead>
 <tr>
 {parsedRows[0].map((cell, j) => (
 <th key={j} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: PBC_HEAD, borderBottom: "2px solid hsl(220 20% 90%)", background: "hsl(220 30% 97%)" }}>
 {renderPBCInline(cell)}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {parsedRows.slice(1).map((row, j) => (
 <tr key={j} style={{ borderBottom: "1px solid hsl(220 20% 94%)" }}>
 {row.map((cell, m) => (
 <td key={m} style={{ padding: "8px 12px", fontSize: 13, color: PBC_BODY, verticalAlign: "top", lineHeight: 1.6 }}>
 {renderPBCInline(cell)}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
 };

 for (const line of lines) {
 if (line.startsWith("|")) { tableBuffer.push(line); continue; }
 if (tableBuffer.length) flushTable();

 if (/^---+$/.test(line)) {
 elements.push(<hr key={k++} style={{ border: "none", borderTop: "1px solid hsl(220 20% 90%)", margin: "16px 0" }} />);
 } else if (line.startsWith("# ")) {
 elements.push(<h1 key={k++} style={{ fontSize: 20, fontWeight: 700, color: PBC_HEAD, fontFamily: PBC_FONT, margin: "0 0 8px 0", lineHeight: 1.3 }}>{renderPBCInline(line.slice(2))}</h1>);
 } else if (line.startsWith("## ")) {
 elements.push(<h2 key={k++} style={{ fontSize: 15, fontWeight: 700, color: PBC_HEAD, fontFamily: PBC_FONT, margin: "24px 0 8px 0", paddingBottom: 6, borderBottom: "2px solid hsl(215 75% 22% / 0.15)" }}>{renderPBCInline(line.slice(3))}</h2>);
 } else if (line.startsWith("### ")) {
 elements.push(<h3 key={k++} style={{ fontSize: 12, fontWeight: 700, color: PBC_HEAD, fontFamily: PBC_FONT, margin: "16px 0 6px 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{renderPBCInline(line.slice(4))}</h3>);
 } else if (/^[-*] /.test(line)) {
 elements.push(
 <div key={k++} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
 <span style={{ color: PBC_SUBTLE, flexShrink: 0, marginTop: 2 }}>•</span>
 <span style={{ fontSize: 13, color: PBC_BODY, fontFamily: PBC_FONT, lineHeight: 1.7 }}>{renderPBCInline(line.slice(2))}</span>
 </div>
 );
 } else if (line.trim() === "") {
 elements.push(<div key={k++} style={{ height: 8 }} />);
 } else {
 elements.push(<p key={k++} style={{ fontSize: 13, color: PBC_BODY, fontFamily: PBC_FONT, lineHeight: 1.7, margin: "0 0 6px 0" }}>{renderPBCInline(line)}</p>);
 }
 }
 if (tableBuffer.length) flushTable();

 return <>{elements}</>;
}

function PBCEditableContent({
 html,
 editRef,
 onDirty,
}: {
 html: string;
 editRef: React.RefObject<HTMLDivElement>;
 onDirty: () => void;
}) {
 const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
 const toolbarRef = useRef<HTMLDivElement>(null);
 const savedRangeRef = useRef<Range | null>(null);

 useEffect(() => {
 if (editRef.current) editRef.current.innerHTML = html;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const updateToolbar = () => {
 const sel = window.getSelection();
 if (!sel || sel.isCollapsed || !sel.rangeCount) {
 setToolbarPos(null);
 return;
 }
 // Only show if selection is inside the editor
 const range = sel.getRangeAt(0);
 if (!editRef.current?.contains(range.commonAncestorContainer)) {
 setToolbarPos(null);
 return;
 }
 savedRangeRef.current = range.cloneRange();
 const rect = range.getBoundingClientRect();
 setToolbarPos({
 x: rect.left + rect.width / 2,
 y: rect.top - 8,
 });
 };

 useEffect(() => {
 document.addEventListener('selectionchange', updateToolbar);
 return () => document.removeEventListener('selectionchange', updateToolbar);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleFormatAction = (action: string, formatValue?: string) => {
 if (!editRef.current) return;
 // Restore selection before applying format (toolbar click deselects)
 if (savedRangeRef.current) {
 const sel = window.getSelection();
 sel?.removeAllRanges();
 sel?.addRange(savedRangeRef.current);
 }
 editRef.current.focus();
 switch (action) {
 case 'bold': document.execCommand('bold', false); break;
 case 'italic': document.execCommand('italic', false); break;
 case 'underline': document.execCommand('underline', false); break;
 case 'superscript': document.execCommand('superscript', false); break;
 case 'bulletList': document.execCommand('insertUnorderedList', false); break;
 case 'numberedList': document.execCommand('insertOrderedList', false); break;
 case 'alignLeft': document.execCommand('justifyLeft', false); break;
 case 'alignCenter': document.execCommand('justifyCenter', false); break;
 case 'alignRight': document.execCommand('justifyRight', false); break;
 case 'textStyle': document.execCommand('formatBlock', false, formatValue); break;
 case 'textColor': document.execCommand('foreColor', false, formatValue); break;
 case 'undo': document.execCommand('undo', false); break;
 case 'redo': document.execCommand('redo', false); break;
 }
 onDirty();
 };

 return (
 <div style={{ position: "relative" }}>
 {toolbarPos && (
 <div
 style={{
 position: "fixed",
 left: toolbarPos.x,
 top: toolbarPos.y,
 transform: "translate(-50%, -100%)",
 zIndex: 9999,
 pointerEvents: "auto",
 }}
 onMouseDown={e => e.preventDefault()}
 >
 <RichTextToolbar
 inline
 toolbarRef={toolbarRef}
 onFormatAction={handleFormatAction}
 />
 </div>
 )}
 <div
 ref={editRef}
 contentEditable
 suppressContentEditableWarning
 onInput={onDirty}
 style={{ outline: "none", cursor: "text", minHeight: 600 }}
 />
 </div>
 );
}

export function AskLukaOverlay({
 open,
 onOpenChange,
 initialQuery,
 autoFillMode,
 checklistLabel,
 engagementLabel,
 autoFillSources,
 onAutoFillConfirmed,
 onAutoFillAll,
 summaryMode,
 fillSummary,
 allTemplateSummary,
 autoFillProgress,
 nextChecklistLabel,
 onNavigateNext,
 onOpenEngagementSheet,
 engagementOverviewMode,
 onStartSectionBySection,
 initialTab,
 initialWorkspaceEngagement,
 pap501Mode,
 pap501IsRegenerate,
 pap501Sources,
 onPap501Accept,
 currentEngagementId,
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 currentChecklistKey,
 initialAiMessage,
 initialAiMessagePrompts,
 onAutoFillFromThread,
}: AskLukaOverlayProps) {
 const [activeTab, setActiveTab] = useState<"threads" | "workspace">("threads");
 const [inputValue, setInputValue] = useState("");
 const [threadSearch, setThreadSearch] = useState("");
 const [aiConversation, setAiConversation] = useState<{ role: "luka" | "user"; text: string; chips?: string[] }[]>([]);
 const [aiConversationTyping, setAiConversationTyping] = useState(false);
 const aiConvBottomRef = useRef<HTMLDivElement>(null);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const [threadsSidebarCollapsed, setThreadsSidebarCollapsed] = useState(true);
 const [workspaceSidebarCollapsed, setWorkspaceSidebarCollapsed] = useState(false);
 const [pinnedThreads, setPinnedThreads] = useState<ThreadItem[]>(initialPinnedThreads);
 const [recentThreads, setRecentThreads] = useState<ThreadItem[]>(initialRecentThreads);
 const [settingsOpen, setSettingsOpen] = useState(false);
 const [analysisPhase, setAnalysisPhase] = useState<"idle" | "analyzing" | "ready">("idle");
 const [pap501Phase, setPap501Phase] = useState<"source-select" | "upload" | "analyzing" | "artifact">("source-select");
 const [pap501SourceType, setPap501SourceType] = useState<'connected' | 'upload' | null>(null);
 const [pap501Files, setPap501Files] = useState<{ year1: File | null; year2: File | null; year3: File | null }>({ year1: null, year2: null, year3: null });
 const pap501AnalyzingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 useEffect(() => {
 if (open && initialQuery) setInputValue(initialQuery);
 }, [open, initialQuery]);

 useEffect(() => {
 if (open && initialAiMessage) {
 setAiConversation([{ role: "luka", text: initialAiMessage, chips: initialAiMessagePrompts ?? quickPrompts }]);
 setAiConversationTyping(false);
 } else if (!open) {
 setAiConversation([]);
 setAiConversationTyping(false);
 }
 }, [open, initialAiMessage]);

 useEffect(() => {
 if (aiConvBottomRef.current) {
 aiConvBottomRef.current.scrollIntoView({ behavior: "smooth" });
 }
 }, [aiConversation, aiConversationTyping]);

 useEffect(() => {
 if (open && autoFillMode) {
 setAnalysisPhase("analyzing");
 const t = window.setTimeout(() => setAnalysisPhase("ready"), 2200);
 return () => window.clearTimeout(t);
 } else {
 setAnalysisPhase("idle");
 }
 }, [open, autoFillMode]);

 useEffect(() => {
 if (pap501AnalyzingTimerRef.current) clearTimeout(pap501AnalyzingTimerRef.current);
 if (open && pap501Mode) {
 if (pap501IsRegenerate) {
 setPap501Phase("analyzing");
 pap501AnalyzingTimerRef.current = setTimeout(() => setPap501Phase("artifact"), 2500);
 } else {
 setPap501Phase("source-select");
 setPap501SourceType(null);
 setPap501Files({ year1: null, year2: null, year3: null });
 }
 } else {
 setPap501Phase("source-select");
 setPap501SourceType(null);
 setPap501Files({ year1: null, year2: null, year3: null });
 }
 return () => { if (pap501AnalyzingTimerRef.current) clearTimeout(pap501AnalyzingTimerRef.current); };
 }, [open, pap501Mode, pap501IsRegenerate]);

 // Auto-select the current engagement when opening
 useEffect(() => {
 if (!open || selectedEngagement) return;
 // Prefer direct ID match from currentEngagementId prop
 if (currentEngagementId) {
 const byId = ENGAGEMENTS.find(e => e.id === currentEngagementId);
 if (byId) { setSelectedEngagement(byId); return; }
 }
 // Fall back to label matching in autoFill/pap501 modes
 if ((autoFillMode || pap501Mode) && engagementLabel) {
 const match = ENGAGEMENTS.find(e =>
 e.id.toLowerCase().includes(engagementLabel.toLowerCase()) ||
 engagementLabel.toLowerCase().includes(e.id.toLowerCase()) ||
 e.client.toLowerCase().includes(engagementLabel.toLowerCase())
 );
 if (match) {
 setSelectedEngagement(match);
 } else {
 const parts = engagementLabel.split(" · ");
 setSelectedEngagement({ client: parts[0] ?? engagementLabel, id: parts[1] ?? engagementLabel, yearEnd: "", status: "Active" });
 }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [open, currentEngagementId, autoFillMode, pap501Mode, engagementLabel]);

 useEffect(() => {
 const openHandler = () => setSettingsOpen(true);
 window.addEventListener("open-luka-settings", openHandler);
 return () => window.removeEventListener("open-luka-settings", openHandler);
 }, []);

 useEffect(() => {
 setLukaOpen(open);
 }, [open]);

 useEffect(() => {
 if (!open) return;
 if (initialTab === "workspace") {
 setActiveTab("workspace");
 setIsFullscreen(true);
 setThreadsSidebarCollapsed(true);
 if (initialWorkspaceEngagement) {
 setWorkspaceEngagement(initialWorkspaceEngagement);
 setHasWorkspaceEngagement(true);
 }
 } else {
 setActiveTab("threads");
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [open, initialTab]);

 const unpinThread = (idx: number) => {
 setPinnedThreads((prev) => {
 const next = [...prev];
 const [item] = next.splice(idx, 1);
 if (item) setRecentThreads((r) => [item,...r]);
 return next;
 });
 };
 const pinThread = (idx: number) => {
 setRecentThreads((prev) => {
 const next = [...prev];
 const [item] = next.splice(idx, 1);
 if (item) setPinnedThreads((p) => [...p, item]);
 return next;
 });
 };
 const deletePinned = (idx: number) =>
 setPinnedThreads((prev) => prev.filter((_, i) => i !== idx));
 const deleteRecent = (idx: number) =>
 setRecentThreads((prev) => prev.filter((_, i) => i !== idx));
 const [isMinimized, setIsMinimized] = useState(false);
const [workspaceLoading, setWorkspaceLoading] = useState(false);
 const [hasWorkspaceEngagement, setHasWorkspaceEngagement] = useState(false);
 const [showAddEngagementModal, setShowAddEngagementModal] = useState(false);
 const [workspaceEngagement, setWorkspaceEngagement] = useState<{ name: string; code: string; source?: "quickbooks" | "xero" } | null>(null);
 const [showPromptWindow, setShowPromptWindow] = useState(false);
 const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
 const [activeFlow, setActiveFlow] = useState<string | null>(null);
 const hasLoadedWorkspace = useRef(false);
 const threadsFullscreenRef = useRef(false);
 const inputRef = useRef<HTMLTextAreaElement>(null);
 const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
 const [activityMinimized, setActivityMinimized] = useState(false);
 const [isActivityProcessing, setIsActivityProcessing] = useState(false);
 const activityIdCounter = useRef(0);
 const [isEnhancing, setIsEnhancing] = useState(false);
 const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
 const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
 const [enhanceCount, setEnhanceCount] = useState(0);
 const [selectedModel, setSelectedModel] = useState("GPT-5.4 Pro");
 const [showModelDropdown, setShowModelDropdown] = useState(false);
 const [hoveredModelIndex, setHoveredModelIndex] = useState(-1);
 const modelDropdownRef = useRef<HTMLDivElement>(null);
 const [showPlusTray, setShowPlusTray] = useState(false);
 const plusTrayRef = useRef<HTMLDivElement>(null);
 const [showEngagementTray, setShowEngagementTray] = useState(false);
 const [engagementSearch, setEngagementSearch] = useState("");
 const [selectedEngagement, setSelectedEngagement] = useState<{ client: string; id: string; yearEnd: string; status: string } | null>(null);
 const engagementTrayRef = useRef<HTMLDivElement>(null);
 const [activeFormCommand, setActiveFormCommand] = useState<FormCommand | null>(null);
 const [formCommandPhase, setFormCommandPhase] = useState<"idle" | "analyzing" | "done" | "scraping" | "preview">("idle");
 const [uploadedFile, setUploadedFile] = useState<string | null>(null);

 // PBC Request flow state
 const [pbcThreadId, setPBCThreadId] = useState<string | null>(null);
 const [pbcDocContent, setPBCDocContent] = useState<string>("");
 const [pbcViewingDoc, setPBCViewingDoc] = useState<{ templateLabel: string } | null>(null);
 const [pbcEditing, setPBCEditing] = useState(false);
 const [pbcDocHtml, setPBCDocHtml] = useState<string | null>(null);
 const [pbcInitialPhase, setPBCInitialPhase] = useState<string | undefined>(undefined);
 const [pbcInitialWpNumbers, setPBCInitialWpNumbers] = useState<string[] | undefined>(undefined);
 const [pbcInitialTemplateId, setPBCInitialTemplateId] = useState<string | undefined>(undefined);
 const [pbcEditDirty, setPBCEditDirty] = useState(false);
 const pbcPreviewRef = useRef<HTMLDivElement>(null);
 const pbcEditRef = useRef<HTMLDivElement>(null);
 const ENGAGEMENTS = useMemo(() =>
 loadEngagements().map(e => ({
 client: e.client,
 id: e.id,
 yearEnd: e.yearEnd,
 status: e.status === "New" ? "New" : "Active",
 })),
 [open]);
 useEffect(() => {
 if (!showEngagementTray) return;
 const handler = (e: MouseEvent) => {
 if (engagementTrayRef.current && !engagementTrayRef.current.contains(e.target as Node)) {
 setShowEngagementTray(false);
 }
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, [showEngagementTray]);

 // React to openLukaWithConfig() calls via push subscription (works even when overlay is already open)
 useEffect(() => {
 return subscribeLukaConfig((config) => {
 if (!config) return;
 if (config.tab) setActiveTab(config.tab);
 if (config.flow !== "pbc-request") {
 setActiveFlow(null);
 setPBCViewingDoc(null);
 setPBCEditing(false);
 setPBCEditDirty(false);
 setIsFullscreen(false);
 setThreadsSidebarCollapsed(true);
 }
 if (config.flow === "pbc-request") {
 if (config.engagementId) {
 const eng = ENGAGEMENTS.find(e => e.id === config.engagementId);
 if (eng) setSelectedEngagement(eng);
 }
 if (config.threadId && config.engagementId) {
 // Restore existing thread
 const stored = getPBCRequestByThread(config.engagementId, config.threadId);
 setPBCThreadId(config.threadId);
 setPBCInitialPhase(stored?.status === "responded" ? "responding" : undefined);
 setPBCInitialWpNumbers(stored?.wpNumbers);
 setPBCInitialTemplateId(stored?.templateId);
 setPBCDocContent(stored?.documentContent ?? "");
 } else {
 const newThreadId = `pbc-${Date.now()}`;
 const threadName = `PBC Request — ${new Date().toLocaleDateString()}`;
 setRecentThreads(prev => [{ name: threadName, createdAt: new Date() },...prev]);
 setPBCThreadId(newThreadId);
 setPBCInitialPhase(undefined);
 setPBCInitialWpNumbers(undefined);
 setPBCInitialTemplateId(undefined);
 setPBCDocContent("");
 }
 setPBCViewingDoc(null);
 setPBCEditing(false);
 setActiveFlow("pbc-request");
 setIsFullscreen(false);
 setThreadsSidebarCollapsed(true);
 }
 });
 }, []);


 // Connector definitions - stateful
 const [connectors, setConnectors] = useState([
 { id: "quickbooks", name: "QuickBooks", connected: false, color: "#2CA01C", abbr: "QB" },
 { id: "xero", name: "Xero", connected: false, color: "#13B5EA", abbr: "XE" },
 { id: "google-drive", name: "Google Drive", connected: false, color: "#4285F4", abbr: "GD" },
 { id: "slack", name: "Slack", connected: false, color: "#4A154B", abbr: "SL" },
 { id: "plaid", name: "Plaid", connected: false, color: "#111111", abbr: "PL" },
 { id: "hubspot", name: "HubSpot", connected: false, color: "#FF7A59", abbr: "HS" },
 { id: "stripe", name: "Stripe", connected: false, color: "#635BFF", abbr: "ST" },
 { id: "excel", name: "Microsoft Excel", connected: false, color: "#217346", abbr: "XL" },
 { id: "outlook", name: "Microsoft Outlook", connected: false, color: "#0078D4", abbr: "OL" },
 ]);

 const connectedConnectors = connectors.filter(c => c.connected);
 const availableConnectors = connectors.filter(c => !c.connected);

 const handleConnectConnector = useCallback((id: string) => {
 setConnectors(prev => prev.map(c => c.id === id ? {...c, connected: true } : c));
 }, []);

 // Close plus tray on outside click
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (plusTrayRef.current && !plusTrayRef.current.contains(e.target as Node)) {
 setShowPlusTray(false);
 }
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);


 const openaiIcon = (
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
 <path d="M22.28 9.37a5.98 5.98 0 0 0-.52-4.93 6.07 6.07 0 0 0-6.55-2.91A5.98 5.98 0 0 0 10.69 0a6.07 6.07 0 0 0-5.8 4.27 5.98 5.98 0 0 0-4 2.9 6.07 6.07 0 0 0.74 7.12 5.98 5.98 0 0 0.52 4.93 6.07 6.07 0 0 0 6.55 2.91A5.98 5.98 0 0 0 13.31 24a6.07 6.07 0 0 0 5.8-4.27 5.98 5.98 0 0 0 4-2.9 6.07 6.07 0 0 0-.74-7.12ZM13.31 22.43a4.48 4.48 0 0 1-2.88-1.05l.14-.08 4.79-2.76a.78.78 0 0 0.39-.67v-6.74l2.02 1.17a.07.07 0 0 1.04.05v5.58a4.5 4.5 0 0 1-4.5 4.5ZM3.51 18.29a4.47 4.47 0 0 1-.54-3.01l.14.09 4.79 2.76a.78.78 0 0 0.78 0l5.85-3.38v2.33a.07.07 0 0 1-.03.06l-4.84 2.8a4.5 4.5 0 0 1-6.15-1.65ZM2.27 7.87a4.48 4.48 0 0 1 2.34-1.97V11.6a.78.78 0 0 0.39.67l5.85 3.38-2.02 1.17a.07.07 0 0 1-.07 0L3.92 14a4.5 4.5 0 0 1-1.65-6.15Zm17.15 4 L13.57 8.5l2.02-1.17a.07.07 0 0 1.07 0l4.84 2.8a4.5 4.5 0 0 1-.7 8.12V12.56a.78.78 0 0 0-.39-.67Zm2.01-3.02-.14-.09-4.79-2.76a.78.78 0 0 0-.78 0L9.87 9.38V7.05a.07.07 0 0 1.03-.06l4.84-2.8a4.5 4.5 0 0 1 6.69 4.66ZM8.72 12.63l-2.02-1.17a.07.07 0 0 1-.04-.05V5.83a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.79 2.76a.78.78 0 0 0-.39.67v6.74Zm1.1-2.37 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5v-3Z" fill="currentColor"/>
 </svg>
 );

 const googleIcon = (
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
 <path d="M5.84 14.09A6.56 6.56 0 0 1 5.5 12c0-.72.12-1.43.34-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
 </svg>
 );

 const anthropicIcon = (
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
 <path d="M13.83 2H16.8l6.2 20h-2.97l-1.51-5.08h-7.25L9.76 22H6.8l7.04-20Zm1.37 3.63L12.45 14.2h5.5l-2.75-8.57ZM8.6 2H5.6L0 22h2.97L8.6 2Z" fill="#D4A27F"/>
 </svg>
 );

 const modelGroups = [
 {
 ecosystem: "ChatGPT Ecosystem",
 icon: openaiIcon,
 models: [
 { name: "GPT-5.4 Pro", desc: "Analyze deeply", badge: "Thinking" },
 { name: "GPT-5.4 Standard", desc: "Write / summarize", badge: "Fast" },
 { name: "o3 Reasoning", desc: "Complex calculations", badge: "Reasoning" },
 { name: "GPT-4.1 Mini", desc: "Everyday tasks", badge: "Cheap + fast tasks" },
 ],
 },
 {
 ecosystem: "Google · Gemini",
 icon: googleIcon,
 models: [
 { name: "Gemini 3.1 Pro", desc: "Large documents", badge: "Large documents" },
 { name: "Gemini 3.1 Flash", desc: "Fast analysis", badge: "Fast" },
 { name: "Gemini Deep Think", desc: "Advanced reasoning", badge: "Reasoning" },
 ],
 },
 {
 ecosystem: "Anthropic · Claude",
 icon: anthropicIcon,
 models: [
 { name: "Claude Opus 4.6", desc: "Deep analysis", badge: "Large documents" },
 { name: "Claude Sonnet 4.6", desc: "Cheap + fast", badge: "Fast" },
 { name: "Claude Haiku", desc: "Cheap + fast", badge: "Cheap + fast tasks" },
 ],
 },
 ];

 const allModels = modelGroups.flatMap(g => g.models);

 // Close model dropdown on outside click
 const handleModelDropdownOutsideClick = useCallback((e: MouseEvent) => {
 if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
 setShowModelDropdown(false);
 }
 }, []);

 useEffect(() => {
 document.addEventListener("mousedown", handleModelDropdownOutsideClick);
 return () => document.removeEventListener("mousedown", handleModelDropdownOutsideClick);
 }, [handleModelDropdownOutsideClick]);

 const GENERIC_PROMPTS = [
 "Variance Analysis",
 "General Ledger Analysis",
 "Account Reconciliation",
 "Bank Reconciliation",
 "Aged AR Analysis",
 "Loan Amortization",
 "Tax Payable",
 ];

 // Slash-filter: text typed after the last '/'
 const slashFilter = inputValue.includes("/")
 ? inputValue.slice(inputValue.lastIndexOf("/") + 1).toLowerCase()
 : "";

 // Combined prompt list: form commands + generic prompts, filtered and ordered
 const allPromptItems: PromptItem[] = (() => {
 const formItems = FORM_COMMANDS
.filter(fc => !slashFilter || fc.code.startsWith(slashFilter) || fc.label.toLowerCase().includes(slashFilter))
.map(fc => ({ kind: "form" as const, code: fc.code, label: fc.label, formKey: fc.formKey, section: fc.section }));
 const genericItems = GENERIC_PROMPTS
.filter(p => !slashFilter || p.toLowerCase().includes(slashFilter))
.map(label => ({ kind: "generic" as const, label }));
 // When filter looks like a form code (starts with digit), show form commands first
 return /^\d/.test(slashFilter)
 ? [...formItems,...genericItems]
 : [...genericItems,...formItems];
 })();

 const autoResizeTextarea = useCallback(() => {
 const el = inputRef.current;
 if (!el) return;
 el.style.height = 'auto';
 const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
 const maxHeight = lineHeight * 12;
 el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
 el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
 }, []);

 const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 const val = e.target.value;
 setInputValue(val);
 if (val.includes("/")) {
 setShowPromptWindow(true);
 setSelectedPromptIndex(0);
 } else {
 setShowPromptWindow(false);
 }
 requestAnimationFrame(autoResizeTextarea);
 };

 useEffect(() => {
 autoResizeTextarea();
 }, [inputValue, autoResizeTextarea]);

 const handleActivityUpdate = useCallback((text: string, status: "done" | "processing" | "pending", highlight?: boolean) => {
 const now = new Date();
 const timestamp = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
 
 setActivityEntries(prev => {
 // If status is "done", find and update existing entry with same text
 if (status === "done") {
 const existingIdx = prev.findIndex(e => e.text === text && e.status === "processing");
 if (existingIdx !== -1) {
 const updated = [...prev];
 updated[existingIdx] = {...updated[existingIdx], status: "done", timestamp };
 return updated;
 }
 }
 // If status is "processing", check if already exists as processing
 if (status === "processing") {
 const exists = prev.find(e => e.text === text && e.status === "processing");
 if (exists) return prev;
 }
 activityIdCounter.current += 1;
 return [...prev, { id: `act-${activityIdCounter.current}`, text, timestamp, status, highlight }];
 });
 
 setIsActivityProcessing(status === "processing");
 }, []);

 const handleInitialAiChip = (prompt: string) => {
 const label = prompt.replace(/^\//, "");
 setAiConversation(prev => [...prev, { role: "user", text: label }]);
 setAiConversationTyping(true);
 const workpaperTitle = initialAiMessage?.match(/"([^"]+)"/)?.[1] ?? "this workpaper";
 const l = label.toLowerCase();
 let response = "";
 let followUpChips: string[] = [];
 if (l.includes("explain")) {
 response = `The ${workpaperTitle} workpaper documents your engagement's acceptance and continuance assessment.\n\nKey requirements:\n• Confirm the applicable reporting framework (ASPE or IFRS)\n• Document management's acknowledgement of their responsibilities\n• Record any scope limitations or changes from prior year\n• Confirm auditor independence and ethical requirements\n\nWould you like me to walk through each field step by step?`;
 followUpChips = ["/Walk me through each field", "/What framework applies?", "/Show me an example"];
 } else if (l.includes("auto-fill") || l.includes("fill")) {
 response = `Starting auto-fill for ${workpaperTitle}. Analyzing your Xero connection and prior responses now...\n\nFields requiring judgment will be flagged for your review — everything else will be pre-populated.`;
 followUpChips = [];
 window.setTimeout(() => { onAutoFillFromThread?.(); }, 1500);
 } else if (l.includes("review")) {
 response = `I've scanned your current responses in ${workpaperTitle}:\n\n• Engagement risk assessment — answered\n• Independence evaluation — incomplete (2 fields missing)\n• Prior period comparison — not started\n\n2 sections need attention before this can be signed off. Want me to jump to the first incomplete field?`;
 followUpChips = ["/Jump to first issue", "/Show all incomplete fields", "/Dismiss warnings"];
 } else if (l.includes("risk")) {
 response = `Key risks identified for this section:\n\n• Revenue recognition — first-year audit with no prior comparatives; requires additional procedures\n• Related parties — shareholder agreements reference intercompany transactions not yet documented\n• Going concern — stable operations, no immediate indicators; standard procedures apply\n\nThese are reflected in workpaper 530 (Pervasive Risks). Want to open it?`;
 followUpChips = ["/Open workpaper 530", "/How do I address these?", "/Add to risk register"];
 } else if (l.includes("walk me through")) {
 response = `Sure! Let's go field by field.\n\n1. Reporting Framework — select ASPE or IFRS based on the entity type. For private companies this is almost always ASPE.\n\n2. Management Responsibilities — confirm management has acknowledged their role in preparing the financial statements.\n\n3. Independence — document your independence declaration and any threats identified.\n\nReady to move to the next group of fields?`;
 followUpChips = ["/Next group of fields", "/Flag a concern", "/Mark section complete"];
 } else if (l.includes("yes, start") || l.includes("start auto")) {
 response = `Starting now. I'll fill in all eligible fields and flag anything that needs your review.`;
 followUpChips = [];
 window.setTimeout(() => { onAutoFillFromThread?.(); }, 1500);
 } else if (l.includes("jump to first")) {
 response = `The first incomplete section is Independence Evaluation — question 3.2:\n\n"Describe any threats to independence identified and the safeguards applied."\n\nThis field is required before sign-off. Would you like me to suggest standard language based on the engagement profile?`;
 followUpChips = ["/Suggest standard language", "/Mark as N/A", "/Assign to team member"];
 } else if (l.includes("open workpaper 530")) {
 response = `Opening Pervasive Risks (530)...\n\nThis workpaper already has 3 identified risks from your risk assessment. You can link the risks flagged here directly to procedures in the Risk Response section.\n\nWant me to link them automatically?`;
 followUpChips = ["/Yes, link automatically", "/Show me the risks", "/Add a new risk"];
 } else {
 response = `I'm looking into that for the ${workpaperTitle} workpaper. What else would you like to know?`;
 followUpChips = ["/Explain requirements", "/Auto-fill this section", "/What are the risks?"];
 }
 window.setTimeout(() => {
 setAiConversationTyping(false);
 setAiConversation(prev => [...prev, { role: "luka", text: response, chips: followUpChips }]);
 }, 1400);
 };

 const handlePromptSelect = (item: PromptItem) => {
 if (item.kind === "form") {
 setShowPromptWindow(false);
 setInputValue("");
 setActiveFlow("form-command");
 setActiveFormCommand({ code: item.code, label: item.label, formKey: item.formKey, section: item.section });
 setIsFullscreen(true);
 setThreadsSidebarCollapsed(true);
 setActivityEntries([]);
 const connected = connectors.filter(c => c.connected);
 setFormCommandPhase(connected.length > 0 ? "analyzing" : "idle");
 if (connected.length > 0) {
 window.setTimeout(() => setFormCommandPhase("done"), 2500);
 }
 return;
 }
 if (item.label === "Account Reconciliation") {
 setShowPromptWindow(false);
 setInputValue("");
 setActiveFlow("account-reconciliation");
 setIsFullscreen(true);
 setThreadsSidebarCollapsed(true);
 setActivityEntries([]);
 setActivityMinimized(true);
 return;
 }
 if (item.label === "Tax Payable") {
 setShowPromptWindow(false);
 setInputValue("");
 setActiveFlow("tax-payable");
 setIsFullscreen(true);
 setThreadsSidebarCollapsed(true);
 setActivityEntries([]);
 setActivityMinimized(false);
 return;
 }
 setInputValue(inputValue.replace(/\/$/, "") + "/" + item.label + " ");
 setShowPromptWindow(false);
 inputRef.current?.focus();
 };

 const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
 if (!showPromptWindow) return;
 if (e.key === "ArrowDown") {
 e.preventDefault();
 setSelectedPromptIndex((prev) => Math.min(prev + 1, allPromptItems.length - 1));
 } else if (e.key === "ArrowUp") {
 e.preventDefault();
 setSelectedPromptIndex((prev) => Math.max(prev - 1, 0));
 } else if (e.key === "Enter") {
 e.preventDefault();
 const item = allPromptItems[selectedPromptIndex];
 if (item) handlePromptSelect(item);
 } else if (e.key === "Escape") {
 e.preventDefault();
 setShowPromptWindow(false);
 }
 };
 const handleEnhancePrompt = useCallback(async () => {
 if (!inputValue.trim() || isEnhancing) return;
 const source = inputValue.trim();
 setOriginalPrompt(source);
 setIsEnhancing(true);
 await new Promise((r) => setTimeout(r, 1200));
 const enhanced = `Analyze and provide a detailed breakdown of ${source}, including key insights, trends, and actionable recommendations based on the current financial data.`;
 setEnhancedPrompt(enhanced);
 setEnhanceCount(prev => prev + 1);
 setIsEnhancing(false);
 }, [inputValue, isEnhancing]);

 const handleReplaceWithEnhanced = useCallback(() => {
 if (!enhancedPrompt) return;
 setInputValue(enhancedPrompt);
 setEnhancedPrompt(null);
 setOriginalPrompt(null);
 setEnhanceCount(0);
 inputRef.current?.focus();
 }, [enhancedPrompt]);

 const handleDismissEnhanced = useCallback(() => {
 setEnhancedPrompt(null);
 setOriginalPrompt(null);
 setEnhanceCount(0);
 }, []);

 const handleOpenNewWindow = useCallback(() => {
 const newWindow = window.open("", "_blank", "width=720,height=700,menubar=no,toolbar=no,location=no,status=no");
 if (newWindow) {
 newWindow.document.title = "Luka Chat";
 newWindow.document.body.innerHTML = `
 <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#333;">
 <div style="text-align:center;">
 <h2>⚡ Luka Chat</h2>
 <p style="color:#888;">Chat window opened in new tab</p>
 </div>
 </div>
 `;
 }
 }, []);

 const handleFullscreen = useCallback(() => {
 setIsFullscreen((prev) => !prev);
 }, []);

 const handleMinimize = useCallback(() => {
 setIsMinimized((prev) => !prev);
 }, []);

 const isWorkspace = activeTab === "workspace";
 const isPostAutomation = false;

 return (
 <AnimatePresence>
 {open && (
 <>
 {/* Overlay */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="fixed inset-0 bg-black/50" style={{ zIndex: 45 }}
 onClick={() => onOpenChange(false)}
 />

 {/* Panel */}
 <motion.div
 initial={{ x: "100%", opacity: 0.6 }}
 animate={
 isFullscreen
 ? { x: 0, y: 0, opacity: 1, width: "100vw" }
 : isMinimized
 ? { x: 0, y: "calc(100% - 56px)", opacity: 1, width: threadsSidebarCollapsed ? 640 : 909 }
 : { x: 0, y: 0, opacity: 1, width: threadsSidebarCollapsed ? 640 : 909 }
 }
 exit={{ x: "100%", opacity: 0.6 }}
 transition={{ type: "spring", damping: 32, stiffness: 280, mass: 0.85 }}
 className={`fixed top-0 right-0 z-50 flex ${isFullscreen ? "w-full h-full" : "h-full rounded-l-2xl overflow-hidden"}`}
 style={isFullscreen ? undefined : { maxWidth: "98vw" }}
 >
 {/* LHS sidebar — only show in threads mode */}
 {!isWorkspace && !isPostAutomation && (
 <motion.div
 className="luka-threads-sidebar"
 animate={{ width: threadsSidebarCollapsed ? 0 : 269 }}
 transition={{ type: "spring", damping: 32, stiffness: 280, mass: 0.85 }}
 style={{ overflow: threadsSidebarCollapsed ? "hidden" : "visible", position: "relative", zIndex: 10 }}
 >
 <div className={`flex flex-col h-full ${threadsSidebarCollapsed ? 'items-center' : ''}`} style={{ overflowX: "visible", overflowY: "auto", scrollbarWidth: "none" }}>
 
 {/* ─── Collapsed icon view ─── */}
 {threadsSidebarCollapsed ? (
 <>
 {/* Expand toggle */}
 <div className="flex flex-col items-center pt-3 pb-1 gap-2">
 <motion.button
 whileHover={{ scale: 1.12, backgroundColor: "hsl(270 60% 55% / 0.08)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setThreadsSidebarCollapsed(false)}
 className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group"
 style={{
 color: "hsl(var(--muted-foreground))",
 background: "hsl(var(--muted) / 0.5)",
 border: "1px solid hsl(var(--border) / 0.6)",
 }}
 >
 <motion.div
 animate={{ x: [0, 2, 0] }}
 transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
 >
 <ChevronsRight size={16} />
 </motion.div>
 <div className="lhs-tooltip">Expand sidebar</div>
 </motion.button>
 </div>

 <div className="w-6 h-px rounded-full mx-auto my-1" style={{ background: "hsl(var(--border))" }} />

 {/* Luka logo icon */}
 <div className="flex flex-col items-center gap-1.5">
 <motion.div
 whileHover={{ scale: 1.08 }}
 className="w-8 h-8 rounded-lg flex items-center justify-center relative group cursor-pointer"
 style={{ background: "linear-gradient(135deg, hsl(270 60% 55% / 0.1), hsl(207 71% 38% / 0.08))", border: "1px solid hsl(270 60% 55% / 0.15)" }}
 >
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
 <defs><linearGradient id="luka-grad-c" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#9747FF" /><stop offset="100%" stopColor="#115697" /></linearGradient></defs>
 <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#luka-grad-c)" />
 </svg>
 <div className="lhs-tooltip">Luka</div>
 </motion.div>

 {/* New thread */}
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "hsl(207 71% 38% / 0.12)" }}
 whileTap={{ scale: 0.92 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group"
 style={{ background: "linear-gradient(135deg, hsl(207 71% 38% / 0.06), hsl(260 70% 60% / 0.04))", border: "1px solid hsl(207 71% 38% / 0.12)", color: "hsl(207 71% 34%)" }}
 >
 <PlusCircle size={15} />
 <div className="lhs-tooltip">Start new thread</div>
 </motion.button>

 {/* Search */}
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "hsl(var(--muted))" }}
 whileTap={{ scale: 0.92 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group"
 style={{ color: "hsl(var(--muted-foreground))", background: "transparent", border: "1px solid transparent" }}
 >
 <Search size={15} />
 <div className="lhs-tooltip">Search threads</div>
 </motion.button>
 </div>

 <div className="w-6 h-px rounded-full mx-auto my-1.5" style={{ background: "hsl(var(--border))" }} />

 {/* Pinned threads as icons */}
 <div className="flex flex-col items-center gap-1">
 {pinnedThreads.map((thread, i) => (
 <motion.button
 key={`pinned-c-${i}`}
 whileHover={{ scale: 1.1, backgroundColor: "hsl(var(--primary) / 0.06)" }}
 whileTap={{ scale: 0.92 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group"
 style={{ color: "hsl(var(--muted-foreground))", background: "transparent", border: "1px solid transparent" }}
 >
 <Pin size={14} />
 <div className="lhs-tooltip">
 <div className="font-medium">{thread.name}</div>
 <div className="text-[10px] opacity-70 mt-0.5">{formatThreadDate(thread.createdAt)}</div>
 </div>
 </motion.button>
 ))}
 </div>

 <div className="w-6 h-px rounded-full mx-auto my-1.5" style={{ background: "hsl(var(--border))" }} />

 {/* Recent threads as icons */}
 <div className="flex flex-col items-center gap-1">
 {recentThreads.slice(0, 5).map((thread, i) => (
 <motion.button
 key={`recent-c-${i}`}
 whileHover={{ scale: 1.1, backgroundColor: "hsl(var(--primary) / 0.06)" }}
 whileTap={{ scale: 0.92 }}
 className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative group"
 style={{ color: "hsl(var(--muted-foreground) / 0.55)", background: "transparent", border: "1px solid transparent" }}
 >
 <MessageSquare size={13} />
 <div className="lhs-tooltip">
 <div className="font-medium">{thread.name}</div>
 <div className="text-[10px] opacity-70 mt-0.5">{formatThreadDate(thread.createdAt)}</div>
 </div>
 </motion.button>
 ))}
 </div>

 {/* Bottom utility icons: AI Settings, Credit Usage, Help */}
 <div className="mt-auto pb-3 flex flex-col items-center gap-1.5">
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "hsl(270 60% 55% / 0.08)" }}
 whileTap={{ scale: 0.92 }}
 onClick={() => setSettingsOpen(true)}
 className="w-9 h-9 rounded-xl flex items-center justify-center relative group cursor-pointer transition-all duration-200"
 style={{ color: "hsl(var(--muted-foreground))", background: "transparent", border: "1px solid transparent" }}
 >
 <Settings size={15} />
 <div className="lhs-tooltip">AI Settings</div>
 </motion.button>
 </div>
 </>
 ) : (
 /* ─── Expanded full view ─── */
 <>
 <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
 {/* Logo + collapse toggle */}
 <div className="flex items-center gap-2 px-4 pt-4 pb-3">
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
 <defs><linearGradient id="luka-grad-sm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#9747FF" /><stop offset="100%" stopColor="#115697" /></linearGradient></defs>
 <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#luka-grad-sm)" />
 </svg>
 <span className="text-lg font-bold" style={{ background: "linear-gradient(135deg, #9747FF, #115697)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Luka</span>
 <motion.button
 whileHover={{ scale: 1.12, backgroundColor: "hsl(270 60% 55% / 0.08)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setThreadsSidebarCollapsed(true)}
 className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200"
 style={{
 color: "hsl(var(--muted-foreground))",
 background: "hsl(var(--muted) / 0.4)",
 border: "1px solid hsl(var(--border) / 0.5)",
 }}
 title="Collapse sidebar"
 >
 <ChevronsLeft size={15} />
 </motion.button>
 </div>

 {/* Start new thread */}
 <div className="px-3 mb-3">
 <motion.button
 whileHover={{ scale: 1.01, x: 2 }}
 whileTap={{ scale: 0.98 }}
 className="luka-new-thread-btn"
 >
 <PlusCircle size={16} />
 <span>Start new thread</span>
 </motion.button>
 </div>

 {/* Search */}
 <div className="px-3 mb-4">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search"
 value={threadSearch}
 onChange={(e) => setThreadSearch(e.target.value)}
 className="luka-thread-search"
 />
 </div>
 </div>

 {/* Pinned */}
 <div className="px-4 mb-1">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</span>
 </div>
 <div className="px-2 mb-4">
 {pinnedThreads.map((thread, i) => (
 <ThreadRow
 key={`pinned-${i}`}
 thread={thread}
 icon={<Pin size={13} className="text-muted-foreground shrink-0" />}
 isPinned
 onPinToggle={() => unpinThread(i)}
 onDelete={() => deletePinned(i)}
 />
 ))}
 </div>

 {/* Recents */}
 <div className="px-4 mb-1">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recents</span>
 </div>
 <div className="px-2">
 {recentThreads.map((thread, i) => (
 <ThreadRow
 key={`recent-${i}`}
 thread={thread}
 icon={<MessageSquare size={13} className="text-muted-foreground shrink-0" />}
 isPinned={false}
 onPinToggle={() => pinThread(i)}
 onDelete={() => deleteRecent(i)}
 />
 ))}
 </div>

 {/* View all */}
 <div className="px-4 pt-3 pb-4">
 <motion.button
 whileHover={{ x: 2 }}
 className="text-sm font-medium"
 style={{ color: "hsl(var(--link-color))" }}
 >
 View all
 </motion.button>
 </div>
 </div>

 {/* Bottom utility menu — AI Settings */}
 <div className="border-t" style={{ borderColor: "hsl(var(--border))" }}>
 <div className="px-2 pt-2 pb-1">
 <motion.button
 whileHover={{ x: 2, backgroundColor: "hsl(270 60% 55% / 0.06)" }}
 whileTap={{ scale: 0.99 }}
 onClick={() => setSettingsOpen(true)}
 className="luka-thread-item w-full"
 >
 <Settings size={14} className="text-muted-foreground shrink-0" />
 <span className="truncate">AI Settings</span>
 </motion.button>
 </div>
 </div>
 </>
 )}
 </div>
 </motion.div>
 )}

 {/* Main area */}
 <div className={cn("bg-card border-l relative flex", pbcViewingDoc ? "flex-row flex-1" : "flex-1 flex-col")} style={{ borderColor: "hsl(var(--border))" }}>
 {/* Chat column — shrinks to 40% when doc viewer is open */}
 <div className={cn("flex flex-col min-h-0", pbcViewingDoc ? "w-[40%] border-r border-border shrink-0" : "flex-1")} style={pbcViewingDoc ? { borderColor: "hsl(var(--border))" } : undefined}>
 {/* Header */}
 <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
 {/* Left controls — hamburger when threads sidebar collapsed, spacer otherwise for visual balance */}
 <div className="flex items-center gap-1 shrink-0">
 {activeTab === "threads" && threadsSidebarCollapsed ? (
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "hsl(270 60% 55% / 0.08)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setThreadsSidebarCollapsed(false)}
 className="action-icon"
 style={{ color: "hsl(0 0% 0%)" }}
 >
 <Menu size={18} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Open Threads</p></TooltipContent>
 </Tooltip>
 ) : activeTab === "workspace" && hasWorkspaceEngagement && workspaceSidebarCollapsed ? (
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "hsl(270 60% 55% / 0.08)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setWorkspaceSidebarCollapsed(false)}
 className="action-icon"
 style={{ color: "hsl(0 0% 0%)" }}
 >
 <Menu size={18} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Open Workspace</p></TooltipContent>
 </Tooltip>
 ) : (
 <span className="action-icon w-8 h-8 invisible" />
 )}
 <span className="action-icon w-8 h-8 invisible" />
 <span className="action-icon w-8 h-8 invisible" />
 <span className="action-icon w-8 h-8 invisible" />
 </div>

 {/* Tabs — pill switch */}
 <div className="flex-1 flex items-center justify-center">
 <div
 className="relative flex items-center gap-1 rounded-full p-1"
 style={{
 background: "hsl(0 0% 100%)",
 border: "1px solid hsl(220 20% 92%)",
 boxShadow: "0 6px 18px -8px hsl(250 40% 40% / 0.18), 0 1px 2px hsl(220 30% 50% / 0.05)",
 }}
 >
 {([
 { id: "threads", label: "Threads", icon: MessageCircle },
 { id: "workspace", label: "Workspace", icon: Zap },
 ] as const).map((tab) => {
 const isActive = activeTab === tab.id;
 const Icon = tab.icon;
 return (
 <motion.button
 key={tab.id}
 onClick={() => {
 setActiveTab((prevTab) => {
 if (tab.id === "workspace" && prevTab !== "workspace") {
 threadsFullscreenRef.current = isFullscreen;
 setIsFullscreen(true);
 setThreadsSidebarCollapsed(true);
 } else if (tab.id === "threads" && prevTab === "workspace") {
 setIsFullscreen(threadsFullscreenRef.current);
 }
 return tab.id;
 });
 }}
 whileTap={{ scale: 0.96 }}
 className="relative z-10 pl-2.5 pr-5 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer"
 style={{
 color: isActive ? "hsl(0 0% 100%)" : "hsl(222 30% 18%)",
 }}
 >
 <motion.div
 className="absolute inset-0 rounded-full"
 initial={false}
 animate={{ opacity: isActive ? 1 : 0 }}
 transition={{ duration: 0.15 }}
 style={{
 background: "linear-gradient(135deg, #6C2FF2 0%, #8A5BFF 55%, #B084FF 100%)",
 boxShadow: "0 6px 16px -6px hsl(265 80% 55% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
 }}
 />
 <Icon size={14} className="relative z-10" />
 <span className="relative z-10">{tab.label}</span>
 </motion.button>
 );
 })}
 </div>
 </div>

 {/* Window controls */}
 <div className="flex items-center gap-1 shrink-0">
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleOpenNewWindow} className="action-icon" aria-label="Open in new window">
 <ExternalLink size={16} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Open in new window</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={activeTab === "workspace" ? undefined : { scale: 1.1 }}
 whileTap={activeTab === "workspace" ? undefined : { scale: 0.9 }}
 onClick={activeTab === "workspace" ? undefined : handleFullscreen}
 disabled={activeTab === "workspace"}
 className={`action-icon ${isFullscreen ? "action-icon-active" : ""} ${activeTab === "workspace" ? "action-icon-disabled" : ""}`}
 aria-label={activeTab === "workspace" ? "Fullscreen disabled in workspace" : isFullscreen ? "Exit fullscreen" : "Fullscreen"}
 >
 {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>{activeTab === "workspace" ? "Fullscreen disabled in workspace" : isFullscreen ? "Exit fullscreen" : "Fullscreen"}</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleMinimize} className="action-icon" aria-label={isMinimized ? "Restore" : "Minimize"}>
 <Minus size={16} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>{isMinimized ? "Restore" : "Minimize"}</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onOpenChange(false)} className="action-icon" aria-label="Close">
 <X size={16} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Close</p></TooltipContent>
 </Tooltip>
 </div>
 </div>

 {activeTab === "threads" ? (
 <>
 {/* Context bar */}
 <div className="flex items-center gap-3 px-4 py-2.5 border-b relative" style={{ borderColor: "hsl(var(--border))" }}>
 <motion.button
 whileHover={{ backgroundColor: "hsl(var(--muted) / 0.6)" }}
 whileTap={{ scale: 0.98 }}
 onClick={(e) => { e.stopPropagation(); setShowEngagementTray((v) => !v); }}
 className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors"
 >
 <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
 <Inbox size={14} className="text-muted-foreground" />
 </div>
 <span className="text-sm font-medium text-foreground">
 {selectedEngagement ? selectedEngagement.id : "Select Engagement"}
 </span>
 <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showEngagementTray ? "rotate-180" : ""}`} />
 </motion.button>
 {(() => {
 const src = [...(autoFillSources ?? []), ...(pap501Sources ?? [])].join(" ").toLowerCase();
 const connRaw = selectedEngagement ? (() => { try { return localStorage.getItem(`connectors-${selectedEngagement.id}`); } catch { return null; } })() : null;
 const connApps: string[] = connRaw ? JSON.parse(connRaw) : [];
 const connStr = connApps.join(" ").toLowerCase();
 const isXero = src.includes("xero") || connStr.includes("xero");
 const isQBO = src.includes("quickbooks") || src.includes("qbo") || connStr.includes("quickbooks") || connStr.includes("qbo");
 if (isXero) return <img src={xeroLogo} alt="Xero" className="h-[18px] w-auto object-contain shrink-0" />;
 if (isQBO) return <img src={quickbooksLogo} alt="QuickBooks" className="h-[20px] w-auto object-contain shrink-0" />;
 return null;
 })()}
 
 {/* Minimized activity badge */}
 {(activeFlow === "account-reconciliation" || activeFlow === "tax-payable") && activityMinimized && (
 <div className="ml-auto">
 <LukaActivityPanel
 entries={activityEntries}
 isProcessing={isActivityProcessing}
 minimized={true}
 onToggleMinimize={() => setActivityMinimized(false)}
 />
 </div>
 )}
 </div>

 {/* Enhanced Prompt Banner — sticky at top of chat area */}
 <AnimatePresence>
 {(enhancedPrompt || isEnhancing) && (
 <motion.div
 initial={{ opacity: 0, y: -8, height: 0 }}
 animate={{ opacity: 1, y: 0, height: "auto" }}
 exit={{ opacity: 0, y: -8, height: 0 }}
 transition={{ type: "spring", damping: 24, stiffness: 320 }}
 className="border-b overflow-hidden"
 style={{
 borderColor: "hsl(var(--border))",
 background: "linear-gradient(135deg, hsl(270 65% 55% / 0.04), hsl(207 71% 38% / 0.04))",
 }}
 >
 <div className="px-4 py-3 flex items-start gap-3">
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
 style={{
 background: "linear-gradient(135deg, hsl(270 65% 55%), hsl(207 71% 38%))",
 boxShadow: "0 2px 8px hsl(270 65% 55% / 0.25)",
 }}
 >
 {isEnhancing ? (
 <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
 <Loader2 size={14} className="text-white" />
 </motion.div>
 ) : (
 <Wand2 size={14} className="text-white" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span
 className="text-[10px] font-bold uppercase tracking-wider"
 style={{ color: "hsl(270 65% 45%)", fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.08em" }}
 >
 {isEnhancing ? "Enhancing prompt…" : "Enhanced by Luka"}
 </span>
 {enhanceCount > 0 && !isEnhancing && (
 <span
 className="text-[9px] font-bold px-1.5 rounded-md"
 style={{
 background: "hsl(270 65% 55%)",
 color: "white",
 height: 14,
 lineHeight: "14px",
 }}
 >
 v{enhanceCount}
 </span>
 )}
 </div>
 {isEnhancing ? (
 <div className="flex gap-1.5">
 {[0, 1, 2].map((i) => (
 <motion.div
 key={i}
 className="h-2 rounded-full"
 style={{ background: "hsl(270 65% 55% / 0.25)", flex: i === 1 ? 2 : 1 }}
 animate={{ opacity: [0.3, 0.9, 0.3] }}
 transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
 />
 ))}
 </div>
 ) : (
 <p className="text-[12.5px] leading-relaxed text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
 {enhancedPrompt}
 </p>
 )}
 </div>
 {!isEnhancing && enhancedPrompt && (
 <div className="flex items-center gap-1.5 shrink-0">
 <motion.button
 whileHover={{ scale: 1.04 }}
 whileTap={{ scale: 0.96 }}
 onClick={handleReplaceWithEnhanced}
 className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-semibold cursor-pointer"
 style={{
 background: "linear-gradient(135deg, hsl(270 65% 55%), hsl(207 71% 38%))",
 color: "white",
 boxShadow: "0 2px 6px hsl(270 65% 55% / 0.3)",
 }}
 >
 <Check size={12} strokeWidth={2.5} />
 Replace
 </motion.button>
 <motion.button
 whileHover={{ scale: 1.08, backgroundColor: "hsl(var(--muted) / 0.7)" }}
 whileTap={{ scale: 0.92 }}
 onClick={handleDismissEnhanced}
 className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
 style={{ color: "hsl(var(--muted-foreground))" }}
 title="Dismiss"
 >
 <X size={13} />
 </motion.button>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Chat body */}
 <div className="relative flex-1 flex flex-col overflow-hidden">
 {/* Engagement Selection Tray */}
 <AnimatePresence>
 {showEngagementTray && (
 <motion.div
 ref={engagementTrayRef}
 initial={{ opacity: 0, y: 16, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 12, scale: 0.98 }}
 transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.7 }}
 className="absolute left-4 right-4 bottom-2 z-30"
 style={{ maxHeight: "60%" }}
 >
 <div className="prompt-window-shimmer-border rounded-2xl h-full">
 <div
 className="rounded-2xl overflow-hidden h-full flex flex-col"
 style={{
 background: "hsl(var(--card))",
 boxShadow: "0 8px 32px -8px hsla(260, 60%, 40%, 0.18), 0 2px 8px -2px hsla(210, 80%, 50%, 0.1)",
 }}
 >
 <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
 <h3 className="text-base font-semibold text-foreground">Select Engagement</h3>
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
 <input
 value={engagementSearch}
 onChange={(e) => setEngagementSearch(e.target.value)}
 placeholder="Search"
 className="h-9 w-56 pl-8 pr-3 text-sm border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
 style={{ borderColor: "hsl(var(--border))", borderRadius: "8px" }}
 />
 </div>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.05, backgroundColor: "hsl(var(--muted) / 0.8)" }}
 whileTap={{ scale: 0.95 }}
 onClick={() => { setShowEngagementTray(false); setEngagementSearch(""); }}
 className="h-9 w-9 inline-flex items-center justify-center border transition-colors"
 style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--background))", borderRadius: "8px" }}
 aria-label="Close"
 >
 <X size={14} className="text-foreground" />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Close</p></TooltipContent>
 </Tooltip>
 </div>
 </div>
 <div className="overflow-x-auto overflow-y-auto flex-1" style={{ maxHeight: "calc(60vh - 70px)" }}>
 <table className="w-full text-sm" style={{ minWidth: 720 }}>
 <thead>
 <tr className="text-left" style={{ borderTop: "1px solid hsl(var(--border) / 0.6)", borderBottom: "1px solid hsl(var(--border) / 0.6)" }}>
 <th className="px-5 py-2.5 font-medium text-muted-foreground">
 <span className="inline-flex items-center gap-1">Client Name</span>
 </th>
 <th className="px-5 py-2.5 font-medium text-muted-foreground">Engagement ID</th>
 <th className="px-5 py-2.5 font-medium text-muted-foreground">Year End</th>
 <th className="px-5 py-2.5 font-medium text-muted-foreground">Status</th>
 </tr>
 </thead>
 <tbody>
 {ENGAGEMENTS.filter((e) => {
 const q = engagementSearch.toLowerCase().trim();
 if (!q) return true;
 return e.client.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
 }).map((e, i) => (
 <motion.tr
 key={`${e.client}-${i}`}
 whileHover={{ backgroundColor: "hsl(270, 80%, 65% / 0.06)" }}
 onClick={() => {
 setSelectedEngagement(e);
 setShowEngagementTray(false);
 setEngagementSearch("");
 }}
 className="cursor-pointer"
 style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
 >
 <td className="px-5 py-3 font-semibold text-foreground whitespace-nowrap">{e.client}</td>
 <td className="px-5 py-3 text-foreground whitespace-nowrap">{e.id}</td>
 <td className="px-5 py-3 text-foreground whitespace-nowrap">{e.yearEnd}</td>
 <td className="px-5 py-3 whitespace-nowrap">
 <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium" style={{ background: "hsl(142, 70%, 45% / 0.12)", color: "hsl(142, 70%, 35%)", border: "1px solid hsl(142, 70%, 45% / 0.3)", borderRadius: "6px" }}>
 {e.status}
 </span>
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {activeFlow === "account-reconciliation" ? (
 <>
 <ReconciliationFlow onActivity={handleActivityUpdate} activityMinimized={activityMinimized} />
 {!activityMinimized && (
 <LukaActivityPanel
 entries={activityEntries}
 isProcessing={isActivityProcessing}
 minimized={false}
 onToggleMinimize={() => setActivityMinimized(true)}
 />
 )}
 </>
 ) : activeFlow === "tax-payable" ? (
 <>
 <TaxPayableFlow onActivity={handleActivityUpdate} activityMinimized={activityMinimized} />
 {!activityMinimized && (
 <LukaActivityPanel
 entries={activityEntries}
 isProcessing={isActivityProcessing}
 minimized={false}
 onToggleMinimize={() => setActivityMinimized(true)}
 />
 )}
 </>
 ) : activeFlow === "form-command" && activeFormCommand ? (
 <FormCommandFlow
 formCommand={activeFormCommand}
 phase={formCommandPhase}
 connectedSources={connectors.filter(c => c.connected).map(c => c.name)}
 uploadedFile={uploadedFile}
 engagement={selectedEngagement}
 onUpload={(fileName) => {
 setUploadedFile(fileName);
 setFormCommandPhase("scraping");
 window.setTimeout(() => setFormCommandPhase("preview"), 2500);
 }}
 onPopulate={() => {
 window.dispatchEvent(new CustomEvent("luka-populate-form", {
 detail: { formKey: activeFormCommand.formKey, engagementId: currentEngagementId },
 }));
 onOpenChange(false);
 }}
 onBack={() => {
 setActiveFlow(null);
 setActiveFormCommand(null);
 setFormCommandPhase("idle");
 setUploadedFile(null);
 setIsFullscreen(false);
 }}
 />
 ) : activeFlow === "pbc-request" && pbcThreadId ? (
 <PBCRequestFlow
 engagementId={selectedEngagement?.id ?? "default"}
 clientName={selectedEngagement?.client ?? ""}
 yearEnd={selectedEngagement?.yearEnd ?? ""}
 threadId={pbcThreadId}
 initialPhase={pbcInitialPhase as Parameters<typeof PBCRequestFlow>[0]['initialPhase']}
 initialWpNumbers={pbcInitialWpNumbers}
 initialTemplateId={pbcInitialTemplateId}
 initialDocContent={pbcDocContent || undefined}
 onViewDoc={(content, templateLabel) => {
 setPBCDocContent(content);
 setPBCDocHtml(null);
 setPBCEditing(false);
 setPBCEditDirty(false);
 setPBCViewingDoc({ templateLabel });
 setIsFullscreen(true);
 }}
 onSentToPortal={() => {
 // global notification dispatched inside PBCRequestFlow
 }}
 onApplyResponses={(responses) => {
 window.dispatchEvent(new CustomEvent("pbc-apply-responses", { detail: responses }));
 }}
 />
 ) : allTemplateSummary ? (
 /* ── All-templates post-fill summary ── */
 <div className="flex flex-col items-center px-6 pt-6 pb-6 min-h-[60vh] overflow-y-auto">
 <div className="mb-3 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]"><LukaIcon size={22} /></div>
 {allTemplateSummary.engagementLabel && <p className="text-xs font-medium text-muted-foreground mb-1 text-center tracking-wide uppercase">{allTemplateSummary.engagementLabel}</p>}
 <h2 className="text-lg font-semibold text-foreground mb-1 text-center">All Templates Auto-filled</h2>
 <p className="text-sm text-muted-foreground text-center mb-4 max-w-[320px]">Luka filled <span className="font-semibold text-foreground">{allTemplateSummary.totalFilled}</span> of <span className="font-semibold text-foreground">{allTemplateSummary.totalFields}</span> fields across <span className="font-semibold text-foreground">{allTemplateSummary.templates.length}</span> template{allTemplateSummary.templates.length !== 1 ? 's' : ''} ({Math.round(allTemplateSummary.totalFilled / Math.max(allTemplateSummary.totalFields, 1) * 100)}%).</p>
 <div className="w-full max-w-[320px] h-2 rounded-full bg-muted mb-4 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4]" style={{ width: `${Math.round(allTemplateSummary.totalFilled / Math.max(allTemplateSummary.totalFields, 1) * 100)}%` }} /></div>
 <div className="w-full max-w-[340px] rounded-[10px] border border-border bg-muted/30 px-4 py-3 mb-5">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Template breakdown</p>
 <ScrollArea className="max-h-[360px]">
 <div className="space-y-3 pr-1">
 {(() => {
 const SECTION_LABELS: Record<string, string> = { CO: 'Client Onboarding', PL: 'Planning', DO: 'Documents', TB: 'Trial Balance & Adjusting Entries', RA: 'Risk Assessment', RP: 'Response to Assessed Risks', PR: 'Procedures', FS: 'Financial Statements', SO: 'Completion & Signoffs' };
 const SECTION_ORDER = ['CO','PL','DO','TB','RA','RP','PR','FS','SO'];
 const grouped: Record<string, typeof allTemplateSummary.templates> = {};
 const ungrouped: typeof allTemplateSummary.templates = [];
 for (const t of allTemplateSummary.templates) { if (t.section) { (grouped[t.section] = grouped[t.section] || []).push(t); } else { ungrouped.push(t); } }
 const sections = SECTION_ORDER.filter(s => grouped[s]);
 return (<>{sections.map(sectionCode => (<div key={sectionCode}><div className="flex items-center gap-1.5 mb-1.5"><span className="text-[10px] font-bold text-muted-foreground font-mono">{sectionCode}</span><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{SECTION_LABELS[sectionCode]}</span></div><div className="pl-3 space-y-1 border-l border-border/60">{grouped[sectionCode].map((t, i) => (<div key={i} className="flex items-start gap-2 py-0.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{t.code && <span className="text-[10px] font-bold text-muted-foreground font-mono shrink-0 mt-0.5">{t.code}</span>}<span className="text-sm text-foreground flex-1 min-w-0 break-words leading-snug">{t.name}</span><span className="text-xs text-muted-foreground shrink-0 tabular-nums">{t.filledCount}/{t.totalCount}</span></div>))}</div></div>))}{ungrouped.map((t, i) => (<div key={`ung-${i}`} className="flex items-start gap-2 py-0.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{t.code && <span className="text-[10px] font-bold text-muted-foreground font-mono shrink-0 mt-0.5">{t.code}</span>}<span className="text-sm text-foreground flex-1 min-w-0 break-words leading-snug">{t.name}</span><span className="text-xs text-muted-foreground shrink-0 tabular-nums">{t.filledCount}/{t.totalCount}</span></div>))}</>);
 })()}
 </div>
 </ScrollArea>
 </div>
 <div className="flex flex-col items-center gap-2.5 w-full max-w-[320px]">
 {allTemplateSummary.templates.some(t => (t.totalCount - t.filledCount) > 0) && (<button onClick={() => onOpenChange(false)} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md">Review {allTemplateSummary.templates.reduce((s, t) => s + Math.max(0, t.totalCount - t.filledCount), 0)} flagged items</button>)}
 <button onClick={() => onOpenEngagementSheet?.()} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/5 transition-colors">View engagement overview</button>
 <button onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to checklist</button>
 </div>

 {/* ── Client delivery section ── */}
 <div className="w-full max-w-[320px] mt-4">
 <div className="flex items-center gap-2 mb-3">
 <div className="flex-1 h-px bg-border" />
 <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Next step</span>
 <div className="flex-1 h-px bg-border" />
 </div>
 <p className="text-xs text-muted-foreground text-center mb-3 leading-relaxed">
 Luka can automatically deliver required letters and documents to your client via their portal or mobile app.
 </p>
 <div className="flex flex-col gap-2">
 <button
 onClick={() => { /* portal delivery — stub */ }}
 className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md"
 >
 <Globe className="h-4 w-4" />
 Send to Client Portal
 </button>
 <button
 onClick={() => { /* mobile app delivery — stub */ }}
 className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors"
 >
 <Smartphone className="h-4 w-4" />
 Send to Client App
 </button>
 <p className="text-[10px] text-muted-foreground text-center mt-1">
 Documents are encrypted in transit and require client authentication.
 </p>
 </div>
 </div>
 </div>
 ) : summaryMode && fillSummary ? (
 /* ── Single checklist fill summary ── */
 <div className="flex flex-col items-center px-8 pt-8 pb-6 min-h-[60vh] overflow-y-auto">
 <div className="mb-4 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]"><LukaIcon size={22} /></div>
 <h2 className="text-lg font-semibold text-foreground mb-1 text-center">Auto-fill Complete</h2>
 <p className="text-sm text-muted-foreground text-center mb-5 max-w-[320px]">Luka filled <span className="font-semibold text-foreground">{fillSummary.filledCount}</span> of <span className="font-semibold text-foreground">{fillSummary.totalCount}</span> fields ({Math.round(fillSummary.filledCount / Math.max(fillSummary.totalCount, 1) * 100)}%).</p>
 <div className="w-full max-w-[320px] h-2 rounded-full bg-muted mb-5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4]" style={{ width: `${Math.round(fillSummary.filledCount / Math.max(fillSummary.totalCount, 1) * 100)}%` }} /></div>
 <div className="w-full max-w-[320px] rounded-[10px] border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3 mb-4"><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><span className="text-sm font-semibold text-green-700 dark:text-green-400">{fillSummary.filledCount} fields auto-filled by Luka</span></div><p className="text-xs text-green-700/70 dark:text-green-400/70 pl-6">Responses populated from connected sources and prior year files.</p></div>
 {fillSummary.skippedItems.length > 0 && (<div className="w-full max-w-[320px] rounded-[10px] border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 mb-5"><div className="flex items-center gap-2 mb-2"><span className="text-amber-500 text-base">△</span><span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{fillSummary.skippedItems.length} items need your review</span></div><ScrollArea className="max-h-[200px]"><div className="space-y-2">{fillSummary.skippedItems.map((item, i) => (<div key={i} className="pl-1"><p className="text-xs font-medium text-amber-700/80 dark:text-amber-400/80">{item.sectionTitle}</p><p className="text-xs text-amber-700/60 dark:text-amber-400/60 truncate">{item.questionText || '(question)'}</p></div>))}</div></ScrollArea></div>)}
 <div className="flex flex-col items-center gap-2.5 w-full max-w-[320px]">
 {nextChecklistLabel && <button onClick={() => { onNavigateNext?.(); onOpenChange(false); }} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md"><ArrowRight className="h-4 w-4" />Next → {nextChecklistLabel}</button>}
 <button onClick={() => onOpenChange(false)} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/5 transition-colors">Back to checklist</button>
 </div>
 </div>
 ) : engagementOverviewMode ? (
 /* ── Engagement overview mode ── */
 <div className="flex flex-col items-center px-8 pt-8 pb-6 min-h-[60vh] overflow-y-auto">
 <div className="mb-5 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]"><LukaIcon size={22} /></div>
 {engagementLabel && <p className="text-xs font-medium text-muted-foreground mb-1 text-center tracking-wide uppercase">{engagementLabel}</p>}
 <h2 className="text-lg font-semibold text-foreground mb-1 text-center">Engagement Auto-fill Plan</h2>
 <p className="text-sm text-muted-foreground text-center mb-5 max-w-[340px]">Select sections to fill and start Luka's engagement-wide auto-fill.</p>
 <div className="w-full max-w-[380px] space-y-1.5 mb-5">
 {ENGAGEMENT_SECTIONS.map((section, idx) => (
 <div key={section.code}>
 <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 border border-border bg-card">
 <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0", SECTION_BADGE_COLORS[section.code])}>{section.code}</span>
 <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-foreground truncate">{section.label}</span><span className="text-xs text-muted-foreground shrink-0">{section.forms} forms</span></div><div className="mt-1 flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4]" style={{ width: `${section.estimatedPct}%` }} /></div><span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">~{section.estimatedPct}%</span></div></div>
 </div>
 {idx < ENGAGEMENT_SECTIONS.length - 1 && <div className="flex justify-center py-0.5"><ArrowRight className="h-3 w-3 text-muted-foreground/40 rotate-90" /></div>}
 </div>
 ))}
 </div>
 <p className="text-xs text-muted-foreground mb-5 text-center max-w-[340px] leading-relaxed">Luka fills each field one by one with citations from connected sources. Items requiring professional judgment stay flagged for review.</p>
 <div className="flex flex-col items-center gap-2.5 w-full max-w-[380px]">
 <button onClick={() => onAutoFillAll?.()} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md"><Zap className="h-4 w-4 text-white fill-white" strokeWidth={0} />Auto-fill entire engagement</button>
 <button onClick={() => onStartSectionBySection?.()} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/5 transition-colors">Start section by section</button>
 </div>
 </div>
 ) : pap501Mode ? (
 /* ── PAP 501 workspace-style generation / regeneration view ── */
 <div className="flex-1 flex flex-col overflow-y-auto">
 <div className="w-full max-w-[640px] mx-auto px-6 py-7">

 {/* ── Source selection (new generation only) ── */}
 {pap501Phase === 'source-select' && !pap501IsRegenerate && (
 <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
 <div className="flex items-start gap-3 mb-6">
 <div className="shrink-0 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={32} animated />
 </div>
 <div className="flex-1 min-w-0 pt-0.5">
 <span className="text-[15px] leading-relaxed" style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 How would you like to generate the PAP 501 worksheet?
 </span>
 <p className="text-sm text-muted-foreground mt-0.5">Choose your data source to begin the preliminary analytical procedures.</p>
 </div>
 </div>
 <div className="ml-11 grid grid-cols-2 gap-3 mb-6">
 {/* Connected data option */}
 <button
 onClick={() => setPap501SourceType('connected')}
 className="text-left rounded-xl border p-4 transition-all"
 style={{
 borderColor: pap501SourceType === 'connected' ? 'hsl(265 65% 58%)' : 'hsl(220 20% 88%)',
 background: pap501SourceType === 'connected' ? 'hsl(265 65% 58% / 0.06)' : 'hsl(220 20% 98%)',
 boxShadow: pap501SourceType === 'connected' ? '0 0 0 2px hsl(265 65% 58% / 0.18)' : 'none',
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 {(pap501Sources ?? []).join(' ').toLowerCase().includes('xero')
 ? <img src={xeroLogo} alt="Xero" className="h-5 w-auto object-contain" />
 : (pap501Sources ?? []).join(' ').toLowerCase().includes('quickbooks')
 ? <img src={quickbooksLogo} alt="QuickBooks" className="h-5 w-auto object-contain" />
 : <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />}
 {pap501SourceType === 'connected' && <Check size={14} className="ml-auto" style={{ color: 'hsl(265 65% 58%)' }} />}
 </div>
 <p className="text-sm font-semibold text-foreground">Use connected data</p>
 <p className="text-xs text-muted-foreground mt-0.5">{(pap501Sources ?? ['Accounting system', 'Predecessor file']).join(' · ')}</p>
 </button>
 {/* Upload option */}
 <button
 onClick={() => setPap501SourceType('upload')}
 className="text-left rounded-xl border p-4 transition-all"
 style={{
 borderColor: pap501SourceType === 'upload' ? 'hsl(265 65% 58%)' : 'hsl(220 20% 88%)',
 background: pap501SourceType === 'upload' ? 'hsl(265 65% 58% / 0.06)' : 'hsl(220 20% 98%)',
 boxShadow: pap501SourceType === 'upload' ? '0 0 0 2px hsl(265 65% 58% / 0.18)' : 'none',
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <Upload className="h-5 w-5 text-muted-foreground" />
 {pap501SourceType === 'upload' && <Check size={14} className="ml-auto" style={{ color: 'hsl(265 65% 58%)' }} />}
 </div>
 <p className="text-sm font-semibold text-foreground">Upload trial balance</p>
 <p className="text-xs text-muted-foreground mt-0.5">Excel or CSV · 1–3 years</p>
 </button>
 </div>
 <div className="ml-11">
 <button
 disabled={!pap501SourceType}
 onClick={() => {
 if (pap501SourceType === 'upload') {
 setPap501Phase('upload');
 } else {
 setPap501Phase('analyzing');
 pap501AnalyzingTimerRef.current = setTimeout(() => setPap501Phase('artifact'), 2500);
 }
 }}
 className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
 style={{ background: 'linear-gradient(135deg, #8649F1, #2355A4)' }}
 >
 Continue <ArrowRight size={14} />
 </button>
 </div>
 </motion.div>
 )}

 {/* ── Upload phase ── */}
 {pap501Phase === 'upload' && (
 <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
 <div className="flex items-start gap-3 mb-6">
 <div className="shrink-0 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={32} />
 </div>
 <div className="flex-1 min-w-0 pt-0.5">
 <span className="text-[15px] leading-relaxed" style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 Upload your trial balance files
 </span>
 <p className="text-sm text-muted-foreground mt-0.5">Minimum 2 years required. Upload one file per year (Excel or CSV).</p>
 </div>
 </div>
 <div className="ml-11 space-y-3 mb-6">
 {([
 { key: 'year1' as const, label: 'Current year', required: true },
 { key: 'year2' as const, label: 'Prior year (Year −1)', required: true },
 { key: 'year3' as const, label: '2 years prior (Year −2)', required: false },
 ] as const).map(({ key, label, required }) => {
 const file = pap501Files[key];
 return (
 <div key={key}>
 <div className="flex items-center gap-1.5 mb-1.5">
 <span className="text-xs font-semibold text-foreground">{label}</span>
 {required && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'hsl(265 65% 58% / 0.1)', color: 'hsl(265 65% 48%)' }}>Required</span>}
 {!required && <span className="text-[10px] text-muted-foreground">Optional</span>}
 </div>
 <label
 className="flex items-center gap-3 w-full rounded-lg border px-4 py-3 cursor-pointer transition-all"
 style={{
 borderColor: file ? 'hsl(142 60% 45%)' : 'hsl(220 20% 88%)',
 background: file ? 'hsl(142 60% 45% / 0.05)' : 'hsl(220 20% 98%)',
 borderStyle: file ? 'solid' : 'dashed',
 }}
 >
 <input
 type="file"
 accept=".xlsx,.xls,.csv"
 className="sr-only"
 onChange={(e) => {
 const f = e.target.files?.[0] ?? null;
 setPap501Files(prev => ({ ...prev, [key]: f }));
 e.target.value = '';
 }}
 />
 {file
 ? <><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'hsl(142 60% 45%)' }} /><span className="text-sm font-medium text-foreground truncate flex-1">{file.name}</span><span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span></>
 : <><Upload className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-muted-foreground">Drop file here or click to upload</span></>
 }
 </label>
 </div>
 );
 })}
 </div>
 <div className="ml-11 flex items-center gap-2">
 <button
 onClick={() => setPap501Phase('source-select')}
 className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border text-muted-foreground hover:bg-muted/50 transition-colors"
 style={{ borderColor: 'hsl(220 20% 88%)' }}
 >
 ← Back
 </button>
 <button
 disabled={!pap501Files.year1 || !pap501Files.year2}
 onClick={() => {
 setPap501Phase('analyzing');
 pap501AnalyzingTimerRef.current = setTimeout(() => setPap501Phase('artifact'), 3000);
 }}
 className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
 style={{ background: 'linear-gradient(135deg, #8649F1, #2355A4)' }}
 >
 Generate <ArrowRight size={14} />
 </button>
 {(!pap501Files.year1 || !pap501Files.year2) && (
 <span className="text-xs text-muted-foreground">Upload at least 2 years to continue</span>
 )}
 </div>
 </motion.div>
 )}

 {/* Regenerate: prior thread context */}
 {pap501IsRegenerate && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="mb-6"
 >
 {/* Previous generation (muted) */}
 <div className="flex items-start gap-3 opacity-40 mb-1">
 <div className="shrink-0 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={32} />
 </div>
 <div className="flex-1 min-w-0 pt-1.5">
 <p className="text-sm" style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 PAP 501 worksheet generated
 </p>
 <div className="mt-2 flex items-center gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: "hsl(220 20% 88%)", background: "hsl(220 20% 97%)" }}>
 <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
 <span className="text-xs text-muted-foreground truncate">501 Worksheet — Preliminary Analytical Procedures.xlsm</span>
 </div>
 </div>
 </div>
 {/* Divider */}
 <div className="ml-11 flex items-center gap-2 my-4">
 <div className="flex-1 h-px" style={{ background: "hsl(220 20% 90%)" }} />
 <span className="text-[11px] font-medium" style={{ color: "hsl(222 20% 55%)" }}>New request</span>
 <div className="flex-1 h-px" style={{ background: "hsl(220 20% 90%)" }} />
 </div>
 {/* User regenerate message */}
 <div className="ml-11 flex items-center gap-2 mb-6">
 <span
 className="w-2 h-2 rounded-full shrink-0"
 style={{ background: "hsl(265 65% 58%)" }}
 />
 <span className="text-sm font-medium" style={{ color: "hsl(222 30% 22%)" }}>
 Regenerate — check for updated figures
 </span>
 </div>
 </motion.div>
 )}

 {/* ── Analyzing + artifact (only shown in analyzing/artifact phases) ── */}
 {(pap501Phase === 'analyzing' || pap501Phase === 'artifact') && (<>

 {/* Luka icon + status header */}
 <div className="flex items-start gap-3 mb-5">
 <div className="shrink-0 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={pap501Phase === 'artifact' ? 32 : 44} animated={pap501Phase !== 'artifact'} />
 </div>
 <div className="flex-1 min-w-0 pt-0.5">
 <div className="flex items-center gap-2">
 <span
 className="text-[15px] leading-relaxed"
 style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 {pap501Phase === 'artifact'
 ? (pap501IsRegenerate ? 'Updated PAP 501 ready for review' : 'PAP 501 worksheet ready for review')
 : (pap501IsRegenerate ? 'Checking for updated figures' : 'Analyzing sources for PAP 501 — Preliminary Analytical Procedures')}
 </span>
 {pap501Phase !== 'artifact' && (
 <span className="flex items-center gap-1 shrink-0">
 {[0, 1, 2].map((i) => (
 <motion.span
 key={i}
 className="w-1.5 h-1.5 rounded-full"
 style={{ background: "hsl(265 75% 60%)" }}
 animate={{ opacity: [0.3, 1, 0.3] }}
 transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
 />
 ))}
 </span>
 )}
 </div>
 {pap501Phase === 'artifact' && (
 <p className="text-sm text-muted-foreground mt-0.5">
 {pap501IsRegenerate
 ? `Compared against ${(pap501Sources ?? ['Xero connection', 'Predecessor file']).join(' and ')} — figures updated.`
 : pap501SourceType === 'upload'
 ? `Analyzed ${[pap501Files.year1?.name, pap501Files.year2?.name, pap501Files.year3?.name].filter(Boolean).join(', ')}${engagementLabel ? ` for ${engagementLabel.split(' · ')[0]}` : ''}. 5 procedures · Income statement · Balance sheet · Ratios`
 : `Analyzed ${(pap501Sources ?? ['Xero connection', 'Predecessor file']).join(' and ')}${engagementLabel ? ` for ${engagementLabel.split(' · ')[0]}` : ''}. 5 procedures · Income statement · Balance sheet · Ratios`}
 </p>
 )}
 </div>
 </div>

 {/* Analyzing step indicators */}
 {pap501Phase !== 'artifact' && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="ml-11 space-y-2.5 mb-4"
 >
 {(pap501IsRegenerate ? [
 'Reading latest Xero general ledger data',
 'Comparing figures against prior version',
 'Recalculating analytical procedures & ratios',
 'Rebuilding PAP 501 with updated numbers',
 ] : pap501SourceType === 'upload' ? [
 `Parsing trial balance — ${pap501Files.year1?.name ?? 'Year 1'}`,
 `Parsing trial balance — ${pap501Files.year2?.name ?? 'Year 2'}${pap501Files.year3 ? `, ${pap501Files.year3.name}` : ''}`,
 'Extracting income statement & balance sheet',
 'Calculating analytical procedures & ratios',
 'Populating PAP 501 template',
 ] : [
 'Reading Xero general ledger data',
 'Extracting income statement & balance sheet',
 'Calculating analytical procedures & ratios',
 'Populating PAP 501 template',
 ]).map((step, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, x: -4 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.4 + i * 0.18 }}
 className="flex items-center gap-2.5"
 >
 <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(265 75% 60% / 0.5)" }} />
 <span className="text-sm italic" style={{ color: "hsl(222 20% 40%)" }}>{step}</span>
 </motion.div>
 ))}
 </motion.div>
 )}

 {/* Artifact card */}
 {pap501Phase === 'artifact' && (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className="ml-11"
 >
 <div
 className="rounded-xl border bg-card overflow-hidden"
 style={{ borderColor: "hsl(220 20% 88%)", boxShadow: "0 2px 10px hsl(222 30% 20% / 0.07)" }}
 >
 <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220 20% 88%)" }}>
 <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center shrink-0">
 <FileSpreadsheet className="h-5 w-5 text-green-600" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-foreground truncate">501 Worksheet — Preliminary Analytical Procedures.xlsm</p>
 <p className="text-xs text-muted-foreground">XLSX Document · 3 sheets · Part A, Part B, Part C</p>
 </div>
 </div>
 <div className="px-4 py-2.5 border-b" style={{ background: "hsl(220 20% 97%)", borderColor: "hsl(220 20% 88%)" }}>
 <p className="text-xs text-muted-foreground">
 <span className="font-medium text-foreground">Sources:</span>{' '}
 {pap501SourceType === 'upload'
 ? [pap501Files.year1?.name, pap501Files.year2?.name, pap501Files.year3?.name].filter(Boolean).join(', ')
 : (pap501Sources ?? ['Xero connection', 'Predecessor file']).join(', ')}
 </p>
 <p className="text-xs text-muted-foreground mt-0.5">5 analytical procedures · Income statement · Balance sheet · Ratios</p>
 </div>
 <div className={`flex gap-2 px-4 py-3 ${pap501IsRegenerate ? 'justify-end' : ''}`}>
 <button
 onClick={() => onPap501Accept?.()}
 className={`${pap501IsRegenerate ? '' : 'flex-1 '}inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 px-4`}
 style={{ background: 'linear-gradient(135deg, #8649F1, #2355A4)' }}
 >
 <Check size={14} />
 {pap501IsRegenerate ? 'Replace worksheet' : 'Accept & open worksheet'}
 </button>
 <button
 onClick={() => onOpenChange(false)}
 className="inline-flex items-center justify-center px-4 h-8 rounded-lg text-sm font-medium border text-muted-foreground hover:bg-muted/50 transition-colors"
 style={{ borderColor: "hsl(220 20% 88%)" }}
 >
 Dismiss
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </>)}
 </div>
 </div>
 ) : autoFillMode ? (
 /* ── AutoFill analysis view ── */
 <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-[60vh]">
 {autoFillProgress ? (
 <div className="w-full max-w-[360px]">
 <div className="mb-6 flex items-center gap-3"><div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] shrink-0"><LukaIcon size={18} /></div><div><h2 className="text-base font-semibold text-foreground">Filling your engagement…</h2><p className="text-xs text-muted-foreground">Luka is auto-filling each section</p></div></div>
 <div className="space-y-3">
 {autoFillProgress.map(item => (
 <div key={item.code} className="flex items-center gap-3">
 {item.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : item.status === 'running' ? <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
 <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0", item.status === 'done' ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : item.status === 'running' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{item.code}</span>
 <span className={cn("text-sm flex-1", item.status === 'pending' ? "text-muted-foreground" : "text-foreground")}>{item.label}</span>
 <span className="text-xs text-muted-foreground tabular-nums shrink-0">{item.status === 'done' && item.filledCount !== undefined ? `${item.filledCount} / ${item.totalCount}` : item.status === 'running' ? 'filling…' : '—'}</span>
 </div>
 ))}
 </div>
 </div>
 ) : analysisPhase === "analyzing" ? (
 <>
 <div className="mb-6 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]"><LukaIcon size={24} /></div>
 <h2 className="text-lg font-semibold text-foreground mb-2 text-center">Analyzing your {checklistLabel || "checklist"}…</h2>
 <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} /></div>
 </>
 ) : (
 <>
 <div className="mb-5 flex items-center justify-center w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4]"><LukaIcon size={22} /></div>
 {engagementLabel && <p className="text-xs font-medium text-muted-foreground mb-1 text-center tracking-wide uppercase">{engagementLabel}</p>}
 <h2 className="text-lg font-semibold text-foreground mb-1 text-center">{checklistLabel || "checklist"}</h2>
 <p className="text-sm text-muted-foreground text-center mb-5 max-w-[340px]">Luka analyzed {(autoFillSources ?? []).length} connected source{(autoFillSources ?? []).length !== 1 ? "s" : ""} and found responses for <span className="font-semibold text-foreground">{Math.min(90, 60 + (autoFillSources ?? []).length * 10)}%</span> of fields.</p>
 <div className="w-full max-w-[320px] rounded-[10px] border border-border bg-muted/30 px-4 py-3 mb-5 space-y-2">{(autoFillSources ?? []).map(src => (<div key={src} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm text-foreground">{src}</span></div>))}</div>
 <div className="w-full max-w-[320px] mb-6"><p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Also fill related templates</p><div className="flex flex-wrap gap-2">{RELATED_TEMPLATES.map(t => (<span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground">{t}</span>))}</div></div>
 <div className="flex flex-col items-center gap-2.5 w-full max-w-[320px]">
 <button onClick={() => { onAutoFillConfirmed?.(); onOpenChange(false); }} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity shadow-md"><Zap className="h-4 w-4 text-white fill-white" strokeWidth={0} />Auto-fill this checklist</button>
 <button onClick={() => { onAutoFillAll?.(); }} className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"><Zap className="h-4 w-4 shrink-0" />Auto-fill all templates</button>
 </div>
 <p className="text-xs text-muted-foreground mt-3 text-center max-w-[300px]">Luka fills each field one by one with citations. Items requiring judgment stay flagged.</p>
 </>
 )}
 </div>
 ) : initialAiMessage ? (
 <div className="flex-1 flex flex-col luka-chat-body p-4 gap-4 overflow-y-auto">
 {(() => {
 const lastChipsIdx = aiConversation.reduce((acc, m, i) => m.role === "luka" && m.chips?.length ? i : acc, -1);
 return aiConversation.map((msg, i) => (
 <Fragment key={i}>
 {msg.role === "luka" ? (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i === 0 ? 0.15 : 0, duration: 0.3 }}
 className="flex items-start gap-3"
 >
 <div className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center">
 <LukaHeaderIcon size={32} bare inverted animated />
 </div>
 <p className="flex-1 text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 {msg.text}
 </p>
 </motion.div>
 ) : (
 <motion.div
 initial={{ opacity: 0, x: 12 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.25 }}
 className="flex justify-end"
 >
 <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 {msg.text}
 </div>
 </motion.div>
 )}
 {msg.role === "luka" && msg.chips?.length && i === lastChipsIdx && !aiConversationTyping && (
 <div className="flex flex-wrap gap-2 pl-11">
 {msg.chips.map((prompt) => (
 <motion.button
 key={prompt}
 initial={{ opacity: 0, y: 4 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i === 0 ? 0.4 : 0.1 }}
 whileHover={{ scale: 1.04, y: -1 }}
 whileTap={{ scale: 0.97 }}
 className="luka-prompt-chip"
 onClick={() => handleInitialAiChip(prompt)}
 >
 <span style={{ color: "hsl(207 71% 38%)", fontWeight: 700 }}>/</span>{prompt.replace(/^\//, "")}
 </motion.button>
 ))}
 </div>
 )}
 </Fragment>
 ));
 })()}
 {aiConversationTyping && (
 <motion.div
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0 }}
 className="flex items-start gap-3"
 >
 <div className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center">
 <LukaHeaderIcon size={32} bare inverted />
 </div>
 <div className="flex items-center gap-1 pt-1">
 {[0, 1, 2].map(dot => (
 <motion.span
 key={dot}
 className="w-2 h-2 rounded-full bg-muted-foreground/50"
 animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
 transition={{ duration: 0.9, delay: dot * 0.2, repeat: Infinity }}
 />
 ))}
 </div>
 </motion.div>
 )}
 <div ref={aiConvBottomRef} />
 </div>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center luka-chat-body">
 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
 className="flex flex-col items-center gap-5"
 >
 <motion.div
 className="luka-bolt-icon"
 animate={{
 scale: [1, 1.06, 1],
 boxShadow: [
 "0 0 0px hsla(270, 65%, 64%, 0.15)",
 "0 0 24px hsla(270, 65%, 64%, 0.25)",
 "0 0 0px hsla(270, 65%, 64%, 0.15)",
 ],
 }}
 transition={{
 duration: 3,
 repeat: Infinity,
 ease: "easeInOut",
 }}
 >
 <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
 <defs>
 <linearGradient id="luka-grad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#9747FF" />
 <stop offset="100%" stopColor="#115697" />
 </linearGradient>
 </defs>
 <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#luka-grad)" />
 </svg>
 </motion.div>
 <h3 className="text-xl font-semibold text-foreground">How can I help you today?</h3>

 {/* Quick prompts */}
 <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
 {quickPrompts.map((prompt) => (
 <motion.button
 key={prompt}
 whileHover={{ scale: 1.04, y: -1 }}
 whileTap={{ scale: 0.97 }}
 className="luka-prompt-chip"
 onClick={() => handlePromptSelect({ kind: "generic", label: prompt.replace(/^\//, "") })}
 >
 <span style={{ color: "hsl(207 71% 38%)", fontWeight: 700 }}>/</span>{prompt.replace(/^\//, "")}
 </motion.button>
 ))}
 </div>
 </motion.div>
 </div>
 )}
 </div>

 {/* Input area — hidden in autoFill/summary/overview/pap501/pbc-request modes */}
 {!autoFillMode && !summaryMode && !allTemplateSummary && !engagementOverviewMode && !pap501Mode && activeFlow !== "pbc-request" && (
 <div className="px-4 pb-4 pt-2 relative">
 {/* Prompt Window */}
 <AnimatePresence>
 {showPromptWindow && (
 <motion.div
 initial={{ opacity: 0, y: 8, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.96 }}
 transition={{ type: "spring", damping: 22, stiffness: 400 }}
 className="absolute bottom-full left-4 right-4 mb-2 z-50"
 >
 <div className="prompt-window-shimmer-border rounded-2xl">
 <div
 className="rounded-2xl overflow-hidden"
 style={{
 background: "hsl(var(--card))",
 boxShadow: "0 8px 32px -8px hsla(260, 60%, 40%, 0.18), 0 2px 8px -2px hsla(210, 80%, 50%, 0.1)",
 }}
 >
 <div className="py-1">
 {allPromptItems.length === 0 ? (
 <div className="px-5 py-4 text-sm text-muted-foreground text-center">No commands found</div>
 ) : allPromptItems.map((item, i) => (
 <motion.button
 key={item.kind === "form" ? `form-${item.code}` : `generic-${item.label}`}
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.03, duration: 0.2 }}
 onClick={() => handlePromptSelect(item)}
 onMouseEnter={() => setSelectedPromptIndex(i)}
 className="w-full text-left px-5 py-3 text-[15px] font-medium transition-colors duration-150 cursor-pointer flex items-center gap-2.5"
 style={{
 color: selectedPromptIndex === i ? "hsl(var(--foreground))" : "hsl(var(--foreground) / 0.8)",
 background: selectedPromptIndex === i ? "hsl(var(--muted) / 0.6)" : "transparent",
 borderBottom: i < allPromptItems.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : "none",
 }}
 >
 {item.kind === "form" ? (
 <>
 <span className={`inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${SECTION_BADGE_COLORS[item.section] ?? "bg-muted text-muted-foreground"}`}>{item.section}</span>
 <span className="font-mono text-xs text-muted-foreground shrink-0">/{item.code}</span>
 <span>{item.label}</span>
 </>
 ) : item.label}
 </motion.button>
 ))}
 </div>
 <div
 className="flex items-center justify-between px-5 py-2.5 text-xs"
 style={{
 color: "hsl(var(--muted-foreground))",
 borderTop: "1px solid hsl(var(--border) / 0.4)",
 }}
 >
 <div className="flex items-center gap-2">
 <span>Use</span>
 <kbd className="inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-semibold" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.5)" }}>↑</kbd>
 <kbd className="inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-semibold" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.5)" }}>↓</kbd>
 <span>to navigate</span>
 </div>
 <div className="flex items-center gap-2">
 <span>To close, press</span>
 <kbd className="inline-flex items-center justify-center px-2 h-6 rounded-md border text-[11px] font-semibold" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.5)" }}>Esc</kbd>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="luka-input-wrapper">
 <textarea
 ref={inputRef}
 value={inputValue}
 onChange={handleInputChange}
 onKeyDown={handleInputKeyDown}
 placeholder="Type / for prompts or just ask anything..."
 rows={1}
 className="luka-input luka-input-autoresize"
 />
 <div className="flex items-center justify-between pt-1 px-1">
 <div className="flex items-center gap-2">
 {/* + Button with Tray */}
 <div ref={plusTrayRef} style={{ position: "relative" }}>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.1, boxShadow: "0 2px 8px hsla(0,0%,0%,0.10)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setShowPlusTray(prev => !prev)}
 style={{
 width: 30, height: 30, borderRadius: 8,
 display: "flex", alignItems: "center", justifyContent: "center",
 background: showPlusTray ? "hsl(var(--muted))" : "hsl(var(--background))",
 border: `1px solid ${showPlusTray ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.6)"}`,
 boxShadow: "0 1px 3px hsla(0,0%,0%,0.06)",
 color: "hsl(0 0% 0%)", cursor: "pointer",
 transition: "background 0.2s, border-color 0.2s",
 }}
 >
 <motion.div animate={{ rotate: showPlusTray ? 45 : 0 }} transition={{ duration: 0.2 }}>
 <Plus size={15} strokeWidth={2.2} />
 </motion.div>
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" sideOffset={6}>
 Add files & connectors
 </TooltipContent>
 </Tooltip>

 <AnimatePresence>
 {showPlusTray && (
 <motion.div
 initial={{ opacity: 0, y: 6, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 6, scale: 0.96 }}
 transition={{ type: "spring", damping: 24, stiffness: 400 }}
 style={{
 position: "absolute",
 bottom: "calc(100% + 8px)",
 left: 0,
 width: 280,
 background: "hsl(var(--card))",
 border: "1px solid hsl(var(--border))",
 borderRadius: 12,
 boxShadow: "0 8px 32px -8px hsla(220, 40%, 20%, 0.18), 0 2px 8px -2px hsla(220, 40%, 20%, 0.08)",
 zIndex: 100,
 overflow: "hidden",
 }}
 >
 {/* Upload & Repository */}
 <div style={{ padding: "6px 0" }}>
 <motion.button
 whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
 style={{
 width: "100%", display: "flex", alignItems: "center", gap: 10,
 padding: "10px 14px", fontSize: 13, fontWeight: 500,
 color: "hsl(var(--foreground))", background: "transparent",
 border: "none", cursor: "pointer", transition: "background 0.15s",
 }}
 >
 <div style={{
 width: 32, height: 32, borderRadius: 8,
 display: "flex", alignItems: "center", justifyContent: "center",
 background: "hsl(207 71% 38% / 0.08)",
 color: "hsl(207 71% 31%)",
 }}>
 <Upload size={16} strokeWidth={2} />
 </div>
 <div style={{ textAlign: "left" }}>
 <div style={{ fontWeight: 600, fontSize: 13 }}>Upload from Computer</div>
 <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>PDF, Excel, CSV, Images</div>
 </div>
 </motion.button>
 <motion.button
 whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
 style={{
 width: "100%", display: "flex", alignItems: "center", gap: 10,
 padding: "10px 14px", fontSize: 13, fontWeight: 500,
 color: "hsl(var(--foreground))", background: "transparent",
 border: "none", cursor: "pointer", transition: "background 0.15s",
 }}
 >
 <div style={{
 width: 32, height: 32, borderRadius: 8,
 display: "flex", alignItems: "center", justifyContent: "center",
 background: "hsl(270 60% 55% / 0.08)",
 color: "hsl(270 60% 50%)",
 }}>
 <GitBranch size={16} strokeWidth={2} />
 </div>
 <div style={{ textAlign: "left" }}>
 <div style={{ fontWeight: 600, fontSize: 13 }}>Pull from Repository</div>
 <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>Drop previous years files</div>
 </div>
 </motion.button>
 </div>

 {/* Divider */}
 <div style={{ height: 1, background: "hsl(var(--border) / 0.6)", margin: "0 12px" }} />

 {/* Available Connectors Header */}
 <div style={{
 padding: "10px 14px 6px",
 display: "flex", alignItems: "center", justifyContent: "space-between",
 }}>
 <span style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
 Available Connectors
 </span>
 <span style={{
 fontSize: 10, fontWeight: 600,
 padding: "2px 7px", borderRadius: 10,
 background: "hsl(207 71% 38% / 0.1)",
 color: "hsl(207 71% 31%)",
 }}>
 {availableConnectors.length}
 </span>
 </div>

 {/* Connector List */}
 <div style={{ padding: "2px 0 8px", maxHeight: 200, overflowY: "auto", scrollbarWidth: "none" }}>
 {availableConnectors.map((connector) => (
 <motion.button
 key={connector.id}
 whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
 onClick={() => handleConnectConnector(connector.id)}
 style={{
 width: "100%", display: "flex", alignItems: "center", gap: 10,
 padding: "8px 14px", fontSize: 13, fontWeight: 400,
 color: "hsl(var(--foreground))", background: "transparent",
 border: "none", cursor: "pointer", transition: "background 0.15s",
 }}
 >
 <div style={{
 width: 28, height: 28, borderRadius: 7,
 display: "flex", alignItems: "center", justifyContent: "center",
 background: `${connector.color}14`,
 border: `1px solid ${connector.color}20`,
 }}>
 <Globe size={14} style={{ color: connector.color }} />
 </div>
 <span style={{ flex: 1, textAlign: "left" }}>{connector.name}</span>
 <span style={{
 fontSize: 10, fontWeight: 500,
 padding: "3px 8px", borderRadius: 6,
 background: "hsl(var(--muted) / 0.6)",
 color: "hsl(var(--muted-foreground))",
 }}>
 Connect
 </span>
 </motion.button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.1, boxShadow: "0 2px 8px hsla(0,0%,0%,0.10)" }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setShowEngagementTray((v) => !v)}
 style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.6)", boxShadow: "0 1px 3px hsla(0,0%,0%,0.06)", color: "hsl(0 0% 0%)", cursor: "pointer" }}
 >
 <Inbox size={15} strokeWidth={2.2} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" sideOffset={6}>
 Select Engagement
 </TooltipContent>
 </Tooltip>
 <div ref={modelDropdownRef} style={{ position: "relative" }}>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.03 }}
 whileTap={{ scale: 0.97 }}
 className="luka-model-badge"
 onClick={() => setShowModelDropdown(prev => !prev)}
 style={{ cursor: "pointer" }}
 >
 <Sparkles size={12} style={{ color: "hsl(40 90% 50%)" }} />
 <span>{selectedModel}</span>
 <ChevronDown size={14} strokeWidth={2.2} className="ml-0.5 opacity-60" style={{ transition: "transform 0.2s ease", transform: showModelDropdown ? "rotate(180deg)" : "rotate(0deg)" }} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" sideOffset={6}>
 Change AI model
 </TooltipContent>
 </Tooltip>

 <AnimatePresence>
 {showModelDropdown && (
 <motion.div
 initial={{ opacity: 0, y: 6, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 6, scale: 0.96 }}
 transition={{ type: "spring", damping: 24, stiffness: 400 }}
 style={{
 position: "absolute",
 bottom: "calc(100% + 8px)",
 left: 0,
 minWidth: 260,
 background: "hsl(var(--card))",
 border: "1px solid #0C2D55",
 borderRadius: 12,
 boxShadow: "0 8px 32px -8px hsla(220, 40%, 20%, 0.18), 0 2px 8px -2px hsla(220, 40%, 20%, 0.08)",
 zIndex: 100,
 overflow: "hidden",
 }}
 >
 <div style={{ padding: "10px 12px 6px", fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
 Select Model
 </div>
 <div style={{ padding: "0 0 6px", maxHeight: 380, overflowY: "auto", scrollbarWidth: "none" }}>
 {modelGroups.map((group, gi) => (
 <div key={group.ecosystem}>
 {gi > 0 && <div style={{ height: 1, background: "hsl(var(--border) / 0.5)", margin: "4px 12px" }} />}
 <div
 style={{ padding: "6px 12px", margin: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground) / 0.7)", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s ease, color 0.15s ease", cursor: "default" }}
 onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--muted) / 0.5)"; e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
 onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(var(--muted-foreground) / 0.7)"; }}
 >
 {group.icon}
 {group.ecosystem}
 </div>
 {group.models.map((model) => {
 const isSelected = selectedModel === model.name;
 return (
 <motion.button
 key={model.name}
 onClick={() => { setSelectedModel(model.name); setShowModelDropdown(false); }}
 style={{
 width: "100%",
 display: "flex",
 alignItems: "center",
 gap: 8,
 padding: "7px 12px",
 fontSize: 13,
 fontWeight: isSelected ? 600 : 400,
 color: isSelected ? "#0C2D55" : "#1a1a1a",
 background: isSelected ? "hsl(var(--muted) / 0.5)" : "transparent",
 border: "none",
 cursor: "pointer",
 transition: "background 0.15s ease",
 }}
 onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "hsl(var(--muted) / 0.4)"; }}
 onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
 >
 <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{model.name}</span>
 <span style={{
 fontSize: 10,
 fontWeight: 500,
 padding: "2px 6px",
 borderRadius: 6,
 background: "hsl(var(--muted) / 0.6)",
 color: "#555555",
 minWidth: 44,
 textAlign: "center",
 flexShrink: 0,
 }}>
 {model.badge}
 </span>
 <div style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
 {isSelected && <Check size={14} strokeWidth={2.5} style={{ color: "#0C2D55" }} />}
 </div>
 </motion.button>
 );
 })}
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 {/* Luka Enhancer moved next to mic */}
 {/* Connected Connectors - visible labels */}
 <AnimatePresence>
 {connectedConnectors.map((connector) => (
 <motion.div
 key={connector.id}
 initial={{ opacity: 0, scale: 0.8, width: 0 }}
 animate={{ opacity: 1, scale: 1, width: "auto" }}
 exit={{ opacity: 0, scale: 0.8, width: 0 }}
 transition={{ type: "spring", damping: 20, stiffness: 300 }}
 style={{
 display: "inline-flex",
 alignItems: "center",
 gap: 5,
 padding: "4px 10px 4px 6px",
 borderRadius: 7,
 border: `1px solid ${connector.color}30`,
 background: `${connector.color}08`,
 cursor: "default",
 overflow: "hidden",
 whiteSpace: "nowrap",
 }}
 >
 <div style={{
 width: 6, height: 6, borderRadius: "50%",
 background: connector.color,
 flexShrink: 0,
 }} />
 <span style={{
 fontSize: 11, fontWeight: 600,
 color: connector.color,
 letterSpacing: "0.01em",
 }}>
 {connector.abbr}
 </span>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 <div className="flex items-center gap-2">
 {/* Luka Enhancer (icon-only) — sits to the left of audio */}
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={inputValue.trim() && !isEnhancing ? { scale: 1.1, boxShadow: "0 2px 8px hsla(270,65%,55%,0.18)" } : {}}
 whileTap={inputValue.trim() && !isEnhancing ? { scale: 0.9 } : {}}
 onClick={handleEnhancePrompt}
 disabled={!inputValue.trim() || isEnhancing}
 style={{
 position: "relative",
 width: 30,
 height: 30,
 borderRadius: 8,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 background: "hsl(var(--background))",
 border: "1px solid hsl(var(--border) / 0.6)",
 boxShadow: "0 1px 3px hsla(0,0%,0%,0.06)",
 color: "hsl(270 65% 55%)",
 cursor: !inputValue.trim() || isEnhancing ? "not-allowed" : "pointer",
 opacity: !inputValue.trim() ? 0.4 : 1,
 transition: "opacity 0.2s ease",
 }}
 >
 <AnimatePresence mode="wait">
 {isEnhancing ? (
 <motion.div
 key="loader"
 initial={{ opacity: 0, rotate: 0 }}
 animate={{ opacity: 1, rotate: 360 }}
 exit={{ opacity: 0 }}
 transition={{ rotate: { duration: 0.8, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.15 } }}
 >
 <Loader2 size={15} strokeWidth={2.2} />
 </motion.div>
 ) : (
 <motion.div
 key="wand"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15 }}
 >
 <Wand2 size={15} strokeWidth={2.2} />
 </motion.div>
 )}
 </AnimatePresence>
 <AnimatePresence>
 {enhanceCount > 0 && !isEnhancing && (
 <motion.span
 initial={{ opacity: 0, scale: 0.5 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.5 }}
 transition={{ type: "spring", damping: 18, stiffness: 400 }}
 style={{
 position: "absolute",
 top: -4,
 right: -4,
 display: "inline-flex",
 alignItems: "center",
 justifyContent: "center",
 minWidth: 14,
 height: 14,
 borderRadius: 7,
 fontSize: 9,
 fontWeight: 700,
 lineHeight: 1,
 padding: "0 4px",
 background: "hsl(270 65% 55%)",
 color: "hsl(0 0% 100%)",
 letterSpacing: "0.02em",
 }}
 >
 {enhanceCount}
 </motion.span>
 )}
 </AnimatePresence>
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Enhance your prompt with Luka</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button whileHover={{ scale: 1.1, boxShadow: "0 2px 8px hsla(0,0%,0%,0.10)" }} whileTap={{ scale: 0.9 }} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.6)", boxShadow: "0 1px 3px hsla(0,0%,0%,0.06)", color: "hsl(0 0% 0%)", cursor: "pointer" }}>
 <Mic size={15} strokeWidth={2.2} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" sideOffset={6}>
 Voice input
 </TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={inputValue.trim() ? { scale: 1.1 } : {}}
 whileTap={inputValue.trim() ? { scale: 0.9 } : {}}
 className={`luka-send-btn ${inputValue.trim() ? "enabled" : ""}`}
 disabled={!inputValue.trim()}
 >
 <Send size={15} strokeWidth={2.2} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" sideOffset={6}>
 Send message
 </TooltipContent>
 </Tooltip>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 ) : activeTab === "workspace" ? (
 !hasWorkspaceEngagement ? (
 <>
 <WorkspaceEmptyState onAddEngagement={() => setShowAddEngagementModal(true)} />
 <AddEngagementModal
 open={showAddEngagementModal}
 onClose={() => setShowAddEngagementModal(false)}
 onSelect={(eng) => {
 setWorkspaceEngagement({ name: eng.name, code: eng.code, source: eng.source });
 setShowAddEngagementModal(false);
 setHasWorkspaceEngagement(true);
 }}
 />
 </>
 ) : (
 <EngagementWorkspaceShell
 engagement={workspaceEngagement ?? { name: "", code: "" }}
 onAddEngagement={() => setShowAddEngagementModal(true)}
 collapsed={workspaceSidebarCollapsed}
 onCollapse={() => setWorkspaceSidebarCollapsed(true)}
 />
 )
 ) : (
 <WorkspaceView postAutomationActive={true} />
 )}
 <LukaSettingsOverlay
 open={settingsOpen}
 onClose={() => setSettingsOpen(false)}
 activeTab={activeTab}
 onOpenNewWindow={handleOpenNewWindow}
 onFullscreen={handleFullscreen}
 onMinimize={handleMinimize}
 isFullscreen={isFullscreen}
 isMinimized={isMinimized}
 />
 </div>
 {/* Document viewer panel — workspace FinancialStatementPreview style */}
 {pbcViewingDoc && (
 <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "hsl(220 30% 97%)", borderLeft: "1px solid hsl(220 20% 90%)" }}>
 {/* Header */}
 <div
 className="flex items-center justify-between px-4 py-2.5 shrink-0"
 style={{ background: "white", borderBottom: "1px solid hsl(220 20% 90%)" }}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <button
 onClick={() => { setPBCViewingDoc(null); setPBCEditing(false); setPBCEditDirty(false); }}
 className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
 style={{ color: PBC_SUBTLE }}
 >
 <PanelLeftClose className="h-4 w-4" />
 </button>
 <span
 className="text-sm font-semibold truncate"
 style={{ color: PBC_HEAD, fontFamily: PBC_FONT }}
 >
 {pbcViewingDoc.templateLabel}
 </span>
 </div>
 {pbcEditing ? (
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => { setPBCEditing(false); setPBCEditDirty(false); }}
 className="px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[hsl(220_20%_96%)]"
 style={{ border: "1px solid hsl(220 20% 60%)", background: "white", color: PBC_BODY, fontFamily: PBC_FONT }}
 >
 Cancel
 </button>
 <button
 onClick={() => {
 if (pbcEditRef.current) setPBCDocHtml(pbcEditRef.current.innerHTML);
 setPBCEditing(false);
 setPBCEditDirty(false);
 }}
 disabled={!pbcEditDirty}
 className="px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors"
 style={{
 border: `1px solid ${pbcEditDirty ? PBC_HEAD : "hsl(220 20% 85%)"}`,
 background: pbcEditDirty ? PBC_HEAD : "hsl(220 20% 92%)",
 color: pbcEditDirty ? "white" : "hsl(220 15% 60%)",
 cursor: pbcEditDirty ? "pointer" : "not-allowed",
 fontFamily: PBC_FONT,
 }}
 >
 Save
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => {
 const w = window.open("", "_blank");
 if (!w) return;
 const bodyHtml = pbcPreviewRef.current?.innerHTML ?? "";
 w.document.write(`<!DOCTYPE html><html><head><title>${pbcViewingDoc?.templateLabel ?? "Document"}</title><style>
 body{font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#1b2337;max-width:820px;margin:40px auto;padding:0 48px;line-height:1.7}
 h1{font-size:20px;font-weight:700;color:#193565;margin:0 0 12px}
 h2{font-size:15px;font-weight:700;color:#193565;margin:24px 0 8px;padding-bottom:5px;border-bottom:2px solid rgba(25,53,101,0.15)}
 h3{font-size:12px;font-weight:700;color:#193565;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.05em}
 hr{border:none;border-top:1px solid #dde1ea;margin:18px 0}
 p,li{margin:4px 0}
 strong{font-weight:600}
 table{width:100%;border-collapse:collapse;margin:12px 0}
 th{padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#193565;border-bottom:2px solid #e5e9f0;background:#f5f7fb}
 td{padding:8px 12px;font-size:13px;vertical-align:top;border-bottom:1px solid #e5e9f0}
 @media print{body{margin:20px auto}}
 </style></head><body>${bodyHtml}</body></html>`);
 w.document.close();
 setTimeout(() => { w.focus(); w.print(); }, 300);
 }}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[hsl(220_20%_96%)]"
 style={{ border: "1px solid hsl(220 20% 85%)", background: "white", color: PBC_BODY, fontFamily: PBC_FONT }}
 >
 <Download className="h-3.5 w-3.5" /> Download PDF
 </button>
 <EditMenuDropdown
 onEditManually={() => {
 const html = pbcPreviewRef.current?.innerHTML ?? "";
 setPBCDocHtml(html);
 setPBCEditDirty(false);
 setPBCEditing(true);
 }}
 onTellLuka={() => {}}
 />
 </div>
 )}
 </div>
 {/* Scrollable document body */}
 <div className="flex-1 overflow-auto px-6 py-8">
 <div
 className="mx-auto"
 style={{
 width: "min(820px, 100%)",
 background: "white",
 borderRadius: 14,
 boxShadow: "0 8px 32px hsl(220 30% 30% / 0.08), 0 1px 8px hsl(220 20% 40% / 0.06)",
 border: pbcEditing ? "2px solid hsl(265 75% 60% / 0.35)" : "1px solid hsl(220 20% 90%)",
 overflow: "hidden",
 fontFamily: PBC_FONT,
 transition: "border-color 0.15s",
 }}
 >
 <div style={{ height: 6, background: PBC_HEAD }} />
 <div style={{ padding: "32px 48px", minHeight: 600 }}>
 {pbcEditing ? (
 <PBCEditableContent
 html={pbcDocHtml ?? ""}
 editRef={pbcEditRef}
 onDirty={() => setPBCEditDirty(true)}
 />
 ) : (
 <div ref={pbcPreviewRef}>
 {pbcDocHtml !== null ? (
 <div dangerouslySetInnerHTML={{ __html: pbcDocHtml }} />
 ) : (
 <PBCDocContent content={pbcDocContent} />
 )}
 </div>
 )}
 </div>
 <div style={{ height: 6, background: PBC_HEAD }} />
 </div>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}

export default AskLukaOverlay;
