import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SendHorizontal, ClipboardList, PencilLine, FileSpreadsheet, Settings2, ChevronDown, ChevronRight, Download, FileText, FileType, Landmark, Building2, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LukaIcon } from "@/components/LukaIcon";
import { AuditCashWorksheet, AuditCashBankRecWorksheet, AuditCashCountWorksheet } from "@/components/AuditCashWorksheet";
import { AuditARWorksheet, AuditARConfirmationWorksheet } from "@/components/AuditARWorksheet";
import { loadEngagements } from "@/store/engagementsStore";
import xeroLogo from "@/assets/xero-logo.png";
import quickbooksLogo from "@/assets/quickbooks-intuit-logo.png";

const TBCheckIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7.84228 5.33609V8.00276M7.84228 10.6694H7.84895M6.91916 1.93057L1.43591 11.4017C1.13177 11.927 0.979701 12.1896 1.00218 12.4052C1.02178 12.5933 1.12029 12.7641 1.2732 12.8753C1.4485 13.0028 1.75201 13.0028 2.35903 13.0028H13.3255C13.9326 13.0028 14.2361 13.0028 14.4114 12.8753C14.5643 12.7641 14.6628 12.5933 14.6824 12.4052C14.7049 12.1896 14.5528 11.927 14.2487 11.4017L8.76541 1.93057C8.46236 1.40713 8.31084 1.14541 8.11315 1.05751C7.94071 0.980831 7.74386 0.980831 7.57142 1.05751C7.37373 1.14541 7.22221 1.40713 6.91916 1.93057Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WORKSHEET_TITLES: Record<string, string> = {
  "gca-ws-proc-cash":       "A Cash > Audit Procedures",
  "gca-ws-proc-cash-bank":  "A Cash > Bank Reconciliation",
  "gca-ws-proc-cash-count": "A Cash > Cash Count",
  "gca-ws-proc-ar":         "B Accounts Receivable > Audit Procedures",
  "gca-ws-proc-ar-conf":    "B Accounts Receivable > Confirmation Procedures",
};

function getWorksheetComponent(id: string): React.ReactNode | null {
  switch (id) {
    case "gca-ws-proc-cash":       return <AuditCashWorksheet />;
    case "gca-ws-proc-cash-bank":  return <AuditCashBankRecWorksheet />;
    case "gca-ws-proc-cash-count": return <AuditCashCountWorksheet />;
    case "gca-ws-proc-ar":         return <AuditARWorksheet />;
    case "gca-ws-proc-ar-conf":    return <AuditARConfirmationWorksheet />;
    default:                        return null;
  }
}

export function GcaProcPage() {
  const { worksheetId, engagementId } = useParams<{ worksheetId: string; engagementId: string }>();
  const navigate = useNavigate();
  const component = worksheetId ? getWorksheetComponent(worksheetId) : null;
  const title = worksheetId ? WORKSHEET_TITLES[worksheetId] : undefined;

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

  const engagementBreadcrumb = (
    <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-sidebar-foreground">
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
          <Building2 className="h-3.5 w-3.5 text-sidebar-foreground" />
        </div>
        <span className="text-sm font-medium text-sidebar-foreground">{clientName}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex items-center gap-1.5 px-2 py-1 rounded-md border border-sidebar-foreground/20 hover:bg-sidebar-foreground/10 transition-colors">
            <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-sidebar-foreground" />
            </div>
            <span className="text-sm font-medium text-sidebar-foreground font-mono">{displayId}</span>
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/60" />
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
      <Badge variant={status === "Completed" ? "completed" : status === "Not Started" ? "notStarted" : "inProgress"} className="ml-2 whitespace-nowrap">
        {status}
      </Badge>
      {sourceIcon}
    </div>
  );

  return (
    <Layout title="Engagements" headerContent={engagementBreadcrumb}>
      <div className="h-full flex flex-col min-w-0 overflow-hidden">
        {title && (
          <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
            {/* First row: title + action buttons */}
            <div className="flex items-center justify-between px-4 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-semibold text-foreground truncate text-lg">{title}</h1>
              </div>
              <div className="flex items-center gap-1">
                <ExpandableIconButton
                  variant="secondary"
                  size="sm"
                  icon={<SendHorizontal className="h-4 w-4" />}
                  label="Request"
                  onClick={() => toast('Coming soon')}
                />
                <ExpandableIconButton
                  variant="secondary"
                  size="sm"
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="PBC List"
                  onClick={() => toast('Coming soon')}
                />
                <ExpandableIconButton
                  variant="secondary"
                  size="sm"
                  icon={<TBCheckIcon className="h-4 w-4" />}
                  label="TB Check"
                  onClick={() => toast('Coming soon')}
                />
                <ExpandableIconButton
                  variant="secondary"
                  size="sm"
                  icon={<PencilLine className="h-4 w-4" />}
                  label="Adj. Entries"
                  onClick={() => toast('Coming soon')}
                />
                <ExpandableIconButton
                  variant="secondary"
                  size="sm"
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  label="Workbook"
                  onClick={() => window.open(`${import.meta.env.BASE_URL}engagements/${engagementId}/workbook`, "_blank", "noopener,noreferrer")}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ExpandableIconButton
                      variant="secondary"
                      size="sm"
                      icon={<Settings2 className="h-4 w-4" />}
                      label={<span className="inline-flex items-center gap-1">Tools<ChevronDown className="h-3 w-3" /></span>}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast('Coming soon')}>
                      <Landmark className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span>Connect Bank</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast('Coming soon')}>
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span>Source Docs</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {/* Second row: Workspace + Export */}
            <div className="flex items-center justify-end gap-1 px-4 py-1.5 border-t border-border/50">
              <button
                onClick={() => toast('Coming soon')}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-xs font-semibold text-white shadow-sm bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity"
              >
                <LukaIcon size={20} bare animated />
                Workspace
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ExpandableIconButton variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} label="Export" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-max">
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast('Export as PDF coming soon')}>
                    <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>Export as PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast('Export as Word coming soon')}>
                    <FileType className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>Export as Word</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto bg-card">
          {component ?? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Worksheet not yet available.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
