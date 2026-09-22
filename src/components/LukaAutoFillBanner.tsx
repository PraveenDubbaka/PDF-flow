import { useMemo } from "react";
import { ArrowLeftRight, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEngagements } from "@/store/EngagementsContext";
import { getEngagementMeta } from "@/store/engagementsStore";

const CHECKLIST_LABELS: Record<string, string> = {
 "aud-mat": "Materiality",
 "aud-us-mat": "Materiality",
 "aud-tb": "Time Budget",
 "aud-us-tb": "Time Budget",
 "aud-db": "Detailed Budget",
 "aud-us-db": "Detailed Budget",
 "aud-scope": "Audit Scope",
 "aud-us-scope": "Audit Scope",
 "aud-pap": "Plan Audit Procedures",
 "aud-us-pap": "Plan Audit Procedures",
 "aud-sae": "Auditor's Expert",
 "aud-us-sae": "Auditor's Expert",
 "aud-asm": "Overall Audit Strategy",
 "aud-us-asm": "Overall Audit Strategy",
 "aud-iar": "Management Requests",
 "aud-us-iar": "Management Requests",
 "aud-cac": "Client Acceptance & Continuance",
 "aud-form-410": "Client Acceptance & Continuance",
};

const CHECKLIST_CONTEXT: Record<string, string> = {
 "aud-mat": "Materiality benchmarks extracted from Xero trial balance. Gross revenue, pre-tax income, and net assets ready to populate thresholds and calculate performance materiality.",
 "aud-us-mat": "Materiality benchmarks extracted from connected trial balance. Gross revenue, pre-tax income, and net assets ready to populate thresholds and calculate performance materiality.",
 "aud-tb": "Time estimates pre-populated from similar engagements and prior year actuals. Hours by section and partner/staff allocation ready to fill.",
 "aud-us-tb": "Time estimates pre-populated from similar engagements and prior year actuals. Hours by section and partner/staff allocation ready to fill.",
 "aud-db": "Detailed budget lines mapped from prior year actuals and current engagement scope. Budgeted hours per procedure area ready to pre-fill.",
 "aud-us-db": "Detailed budget lines mapped from prior year actuals and current engagement scope. Budgeted hours per procedure area ready to pre-fill.",
 "aud-scope": "Audit scope parameters derived from entity profile, Xero chart of accounts, and engagement settings. Coverage assertions and rationale ready to populate.",
 "aud-us-scope": "Audit scope parameters derived from entity profile, connected chart of accounts, and engagement settings. Coverage assertions and rationale ready to populate.",
 "aud-pap": "Planned procedures matched to identified risks from prior files. Budgeted hours and assertions ready to pre-populate for all significant account areas.",
 "aud-us-pap": "Planned procedures matched to identified risks from prior files. Budgeted hours and assertions ready to pre-populate for all significant account areas.",
 "aud-sae": "Auditor's expert engagement details pre-populated from engagement meta. Expert independence assessment and scope of work ready to fill.",
 "aud-us-sae": "Auditor's expert engagement details pre-populated from engagement meta. Expert independence assessment and scope of work ready to fill.",
 "aud-asm": "Overall audit strategy parameters derived from scope, materiality, and risk assessment. Entity and environment considerations ready to populate.",
 "aud-us-asm": "Overall audit strategy parameters derived from scope, materiality, and risk assessment. Entity and environment considerations ready to populate.",
 "aud-iar": "Management information requests pre-populated from prior year files and Xero chart of accounts. Complete request list ready to generate.",
 "aud-us-iar": "Management information requests pre-populated from prior year files and connected accounting data. Complete request list ready to generate.",
 "aud-cac": "Risk factors cross-referenced against Xero transaction history and predecessor audit files. Ready to flag acceptance concerns and auto-populate standard responses.",
 "aud-form-410": "Risk factors cross-referenced against Xero transaction history and predecessor audit files. Ready to flag acceptance concerns and auto-populate standard responses.",
};

const GENERIC_CONTEXT = "Connected data sources analyzed and ready to populate this checklist with citations. Items requiring professional judgment will be flagged for review.";

export type AutoFillConfig = {
 query: string;
 label: string;
 sources: string[];
 engagementLabel: string;
};

interface LukaAutoFillBannerProps {
 checklistKey: string;
 engagementId: string;
 checklistName?: string;
 onRunAutoFill: (config: AutoFillConfig) => void;
 fillStatus?: 'idle' | 'completed' | 'prerequisite-missing';
 filledCount?: number;
 totalCount?: number;
 prerequisiteLabel?: string;
 onNavigateToPrerequisite?: () => void;
 onOpenLukaStatus?: () => void;
}

export function LukaAutoFillBanner({ checklistKey, engagementId, checklistName, onRunAutoFill, fillStatus = 'idle', filledCount, totalCount, prerequisiteLabel, onNavigateToPrerequisite, onOpenLukaStatus }: LukaAutoFillBannerProps) {
 const { engagements } = useEngagements();
 const engagement = engagements.find(e => e.id === engagementId);
 const meta = useMemo(() => getEngagementMeta(engagementId), [engagementId]);

 const label = checklistName || CHECKLIST_LABELS[checklistKey] || checklistKey;
 const context = CHECKLIST_CONTEXT[checklistKey] || GENERIC_CONTEXT;

 const sources: string[] = [];
 sources.push("Xero connection");
 if (!meta.firstYearAudit) sources.push("Predecessor file");
 if (meta.budget) sources.push("Time budget");

 const score = Math.min(90, 60 + sources.length * 10);

 const buildQuery = () => {
 const period = meta.periodStart && meta.periodEnd
 ? `${meta.periodStart} to ${meta.periodEnd}`
 : engagement?.yearEnd ? `year ending ${engagement.yearEnd}` : "";
 const framework = meta.accountingFramework || "";
 return [
 `Please analyze the ${label} checklist for ${engagement?.client || engagementId}`,
 period ? `(period: ${period})` : "",
 framework ? `using ${framework}` : "",
 "and auto-fill responses using the connected Xero data",
 !meta.firstYearAudit ? "and prior year files." : ".",
 "Populate field-by-field with citations. Flag any items requiring professional judgment.",
 ].filter(Boolean).join(" ");
 };

 const lukaStatusBtn = onOpenLukaStatus ? (
 <button
 onClick={onOpenLukaStatus}
 className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors"
 >
 <Zap className="h-3 w-3 opacity-60" />
 LUKA status
 </button>
 ) : null;

 if (fillStatus === 'completed') {
 const skipped = (totalCount ?? 0) - (filledCount ?? 0);
 return (
 <div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-3">
 <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed opacity-60">
 {context}
 {meta.firstYearAudit && " This is a first-year engagement — predecessor files are not available."}
 </p>
 <div className="flex items-center gap-2 flex-wrap">
 <button
 onClick={() => onRunAutoFill({
 query: buildQuery(),
 label,
 sources,
 engagementLabel: [engagement?.client, engagementId].filter(Boolean).join(' · '),
 })}
 className={cn(
 "inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-xs font-semibold text-white shadow-sm",
 "bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity"
 )}
 >
 <Zap className="h-3.5 w-3.5 text-white fill-white" strokeWidth={0} />
 Re-run Luka auto-fill
 </button>
 <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
 <CheckCircle2 className="h-3 w-3 shrink-0" />
 {filledCount ?? 0} filled{skipped > 0 ? ` · ${skipped} flagged` : ''}
 </span>
 {lukaStatusBtn}
 </div>
 </div>
 );
 }

 if (fillStatus === 'prerequisite-missing') {
 return (
 <div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-3 border-l-4 border-l-amber-400">
 <div className="flex items-center gap-2 flex-wrap">
 <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
 <span className="text-sm text-muted-foreground">
 Complete{' '}
 <button
 onClick={onNavigateToPrerequisite}
 className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
 >
 {prerequisiteLabel ?? 'Materiality'}
 </button>
 {' '}first for best results →
 </span>
 {lukaStatusBtn}
 </div>
 </div>
 );
 }

 return (
 <div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-3">
 <p className="text-sm text-muted-foreground mb-2.5 leading-relaxed">
 {context}
 {meta.firstYearAudit && " This is a first-year engagement — predecessor files are not available."}
 </p>
 <div className="flex items-center gap-2 flex-wrap">
 <button
 onClick={() => onRunAutoFill({
 query: buildQuery(),
 label,
 sources,
 engagementLabel: [engagement?.client, engagementId].filter(Boolean).join(' · '),
 })}
 className={cn(
 "inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-xs font-semibold text-white shadow-sm",
 "bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity"
 )}
 >
 <Zap className="h-3.5 w-3.5 text-white fill-white" strokeWidth={0} />
 Run Luka auto-fill
 </button>
 {lukaStatusBtn}
 </div>
 </div>
 );
}
