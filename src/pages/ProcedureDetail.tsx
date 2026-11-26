import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { loadEngagements } from "@/store/engagementsStore";
import { Layout } from "@/components/Layout";
import { useSecondaryPanel } from "@/hooks/useSecondaryPanel";
import { EngagementRightPanel } from "@/components/EngagementRightPanel";
import { Badge } from "@/components/ui/badge";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
 ChevronDown,
 ChevronRight,
 Settings2,
 Building2,
 FileText,
 Calendar,
 Check,
 Landmark,
 PencilLine,
 FileSpreadsheet,
} from "lucide-react";
import xeroLogo from "@/assets/xero-logo.png";
import quickbooksLogo from "@/assets/quickbooks-intuit-logo.png";
import { leadSheetRows } from '@/lib/pdfEngagementLinks';
import { ProcedureLeadSheetTable } from "@/components/ProcedureLeadSheetTable";
import { getAccountsForProcedure } from "@/lib/tbGroups";


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

export default function ProcedureDetail() {
 const { engagementId, procedureId } = useParams<{ engagementId: string; procedureId: string }>();
 const navigate = useNavigate();
 const [linkParams] = useSearchParams();
 const linkedLine = linkParams.get('line');
 const linkedColumn = linkParams.get('column');
 const [highlightLink, setHighlightLink] = useState(false);
 useEffect(() => {
   if (!linkedLine) return;
   setHighlightLink(true);
   const timer = setTimeout(() => setHighlightLink(false), 3000);
   return () => clearTimeout(timer);
 }, [linkedLine, linkedColumn]);
 const { isCollapsed: isPanelCollapsed, toggle: togglePanel } = useSecondaryPanel();
 const [comment, setComment] = useState("");

 const allEngagements = useMemo(() => loadEngagements(), []);
 const engagement = engagementId ? allEngagements.find(e => e.id === engagementId) ?? null : null;
 const clientName = engagement?.client || "Unknown Client";
 const displayId = engagementId || "Unknown";
 const status: string = engagement?.status || "In Progress";

 const clientEngagements = allEngagements.filter(e => e.client === clientName);

 const sourceIcon = useMemo(() => {
 if (!engagementId) return null;
 try {
 const raw = localStorage.getItem(`connectors-${engagementId}`);
 const apps: string[] = raw ? JSON.parse(raw) : [];
 const joined = apps.join(" ").toLowerCase();
 if (joined.includes("xero")) return (
 <div className="ml-1 inline-flex items-center justify-center h-7 w-20 px-1 bg-card border border-border rounded-sm gap-1">
 <img src={xeroLogo} alt="Xero" className="h-4 w-auto object-contain" />
 <span className="text-xs font-medium text-foreground">Xero</span>
 </div>
 );
 if (joined.includes("quickbooks") || joined.includes("qbo")) return (
 <div className="ml-1 inline-flex items-center justify-center h-7 px-2 bg-card border border-border rounded-sm gap-1">
 <img src={quickbooksLogo} alt="QuickBooks" className="h-4 w-auto object-contain" />
 <span className="text-xs font-medium text-foreground">QuickBooks</span>
 </div>
 );
 } catch { /* ignore */ }
 return null;
 }, [engagementId]);

 const procedureInfo = procedureId ? getAccountsForProcedure(procedureId) : null;
 const accounts = procedureId ? leadSheetRows(procedureId) : [];

 const breadcrumbParts = procedureInfo?.breadcrumb || [];
 const title = procedureInfo?.title || "Procedure";

 const procedureBreadcrumb = (
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
 <DropdownMenuSeparator />
 {clientEngagements.map(eng => (
 <DropdownMenuItem key={eng.id} onClick={() => navigate(`/engagements/${eng.id}`)} className="flex items-center gap-3 cursor-pointer group py-2">
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-mono text-sm font-medium truncate">{eng.id}</span>
 <div className="flex items-center gap-2 mt-0.5">
 <Calendar className="h-3 w-3 text-muted-foreground" />
 <span className="text-xs text-muted-foreground">{eng.yearEnd}</span>
 </div>
 </div>
 {eng.id === displayId && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>

 {/* Status Badge */}
 <Badge variant={status === "Completed" ? "completed" : status === "Not Started" ? "notStarted" : "inProgress"} className="ml-2 whitespace-nowrap">
 {status}
 </Badge>

 {sourceIcon}
 </div>
 );

 return (
 <Layout title="Engagements" headerContent={procedureBreadcrumb}>
 <div className="flex h-full overflow-hidden">
 {/* Main Content Area */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
 {/* Top Header Bar - tools only */}
 <div className="flex items-center justify-between gap-1 px-4 py-1.5 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
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
 <div className="flex items-center gap-1">
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


 {/* Content Area */}
 <div className="flex-1 overflow-auto bg-card">
 <div className="mx-6 mt-6 mb-6">
 {/* Breadcrumb row */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
 {breadcrumbParts.map((part, i) => (
 <span key={i} className="flex items-center gap-2">
 <span>{part}</span>
 <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
 </span>
 ))}
 <span>{title}</span>
 </div>
 <span className="text-xs text-muted-foreground">
 Last updated on: <span className="font-semibold text-foreground">1 week ago</span>
 </span>
 </div>

 {/* Accounts Table */}
 <ProcedureLeadSheetTable
 mode="page"
 rows={accounts}
 linkedLine={linkedLine}
 linkedColumn={linkedColumn}
 highlightLink={highlightLink}
 />

 {/* General Notes Section */}
 <div className="mt-6 border border-border rounded-lg overflow-hidden bg-card">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="text-sm font-bold text-foreground">General Notes</h3>
 </div>
 <div className="p-4">
 <Textarea
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 placeholder="Comment"
 className="min-h-[100px] resize-none border-border bg-background"
 />
 <div className="flex items-center justify-end gap-2 mt-4">
 <Button variant="outline" size="sm" onClick={() => setComment("")}>
 Cancel
 </Button>
 <Button size="sm">
 Save
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Right Panel */}
 <EngagementRightPanel />
 </div>
 </Layout>
 );
}
