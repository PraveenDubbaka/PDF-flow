import { useState, useCallback, useEffect, useRef } from "react";
import { writeJsonToLocalStorage } from "@/lib/safeJson";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Info, RefreshCw, Trash2, Plus, Calendar } from "lucide-react";
import { ProvenancePopover } from "@/components/demo/ProvenancePopover";
import { DEMO_PROVENANCE, DEMO_LUKA_ACTIONS } from "@/components/demo/demoFixtureData";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';
import { RefButton, RefDoc } from "@/components/RefButton";
import { AddToMyTemplatesDialog } from "@/components/AddToMyTemplatesDialog";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { lukaSequentialFill } from "@/lib/lukaInlineFill";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EntityRow {
 id: string;
 entityName: string;
 basis: string;
 periodAmount: string;
 extrapolatedPeriod: string;
 benchmarkPct: string;
 materialityCY: string; // calculated
 materialityPY: string;
 comments: string;
}

interface IntendedUser {
 id: string;
 user: string;
 factors: string;
}

interface QualitativeItem {
 id: string;
 nature: string;
 impact: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
 return Math.random().toString(36).slice(2, 9);
}

function formatNum(val: string | number): string {
 const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
 if (isNaN(n)) return "";
 return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcMatCY(periodAmount: string, benchmarkPct: string): string {
 const a = parseFloat(periodAmount.replace(/[^0-9.]/g, ""));
 const p = parseFloat(benchmarkPct.replace(/[^0-9.]/g, ""));
 if (isNaN(a) || isNaN(p)) return "";
 return formatNum(a * p / 100);
}

function sumColumn(rows: EntityRow[], field: keyof EntityRow): string {
 let total = 0;
 let hasValue = false;
 for (const row of rows) {
 const v = parseFloat(String(row[field]).replace(/[^0-9.]/g, ""));
 if (!isNaN(v)) { total += v; hasValue = true; }
 }
 return hasValue ? formatNum(total) : "";
}

// TB benchmark values — sourced from QBO connector via TrialBalance
const TB_CA = { grossRevenue: 12500000, profitBeforeTax: 460000, totalAssets: 21800000, totalExpenses: 12040000, netAssets: 8400000 };
const TB_US = { grossRevenue: 18400000, profitBeforeTax: 1003000, totalAssets: 13100000, totalExpenses: 17444000, netAssets: 3183000 };
const TB_NPM = { grossRevenue: 14200000, profitBeforeTax: 1140000, totalAssets: 9617340, totalExpenses: 13060000, netAssets: 4800000 };
type TBKey = keyof typeof TB_CA;

const BASIS_OPTIONS: { value: string; label: string; tbKey: TBKey }[] = [
 { value: "grossRevenue", label: "Gross Revenue", tbKey: "grossRevenue" },
 { value: "profitBeforeTax", label: "Profit Before Tax", tbKey: "profitBeforeTax" },
 { value: "totalAssets", label: "Total Assets", tbKey: "totalAssets" },
 { value: "totalExpenses", label: "Total Expenses", tbKey: "totalExpenses" },
 { value: "netAssets", label: "Net Assets / Equity", tbKey: "netAssets" },
];

const SEED_ROW_A = "mat-row-a";
const SEED_ROW_B = "mat-row-b";

const formatDisplay = (v: string) => {
 const n = parseFloat(String(v).replace(/,/g, ""));
 if (isNaN(n)) return v;
 return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function TdInput({
 value,
 onChange,
 placeholder,
 type = "text",
 readOnly,
 className = "",
}: {
 value: string;
 onChange?: (v: string) => void;
 placeholder?: string;
 type?: string;
 readOnly?: boolean;
 className?: string;
}) {
 return (
 <Input
 type={type}
 readOnly={readOnly}
 value={value}
 onChange={(e) => onChange?.(e.target.value)}
 placeholder={placeholder}
 className={`h-8 text-sm ${className}`}
 />
 );
}

function TdSelect({
 value,
 onChange,
 options,
 placeholder = "Select…",
}: {
 value: string;
 onChange: (v: string) => void;
 options: { value: string; label: string }[];
 placeholder?: string;
}) {
 return (
 <Select value={value} onValueChange={onChange}>
 <SelectTrigger className="h-8 text-sm">
 <SelectValue placeholder={placeholder} />
 </SelectTrigger>
 <SelectContent>
 {options.map((o) => (
 <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface AuditMaterialityWorksheetProps {
 isUS?: boolean;
 engagementId?: string;
}

export function AuditMaterialityWorksheet({ isUS = false, engagementId }: AuditMaterialityWorksheetProps) {
 const isDemoEngagement = engagementId === 'AUD-NPM-Dec312025';
 const [showAddDialog, setShowAddDialog] = useState(false);
 const [concluded, setConcluded] = useState(false);

 const [periodStart, setPeriodStart] = useState(isUS ? "2024-01-01" : "2024-04-01");
 const [periodEnd, setPeriodEnd] = useState(isUS ? "2024-12-31" : "2025-03-31");

 const TB = isDemoEngagement ? TB_NPM : (isUS ? TB_US : TB_CA);
 const entityLabel = isDemoEngagement ? "Northline Precision Manufacturing Inc." : (isUS ? "Harbor Freight LLC" : "Shipping Line Inc.");

 // Preliminary Materiality — two benchmark rows seeded from Trial Balance
 const [selectedRowId, setSelectedRowId] = useState(SEED_ROW_A);
 const [entityRows, setEntityRows] = useState<EntityRow[]>([
 {
 id: SEED_ROW_A,
 entityName: entityLabel,
 basis: "grossRevenue",
 periodAmount: String(TB.grossRevenue),
 extrapolatedPeriod: String(TB.grossRevenue),
 benchmarkPct: "1.00",
 materialityCY: calcMatCY(String(TB.grossRevenue), "1.00"),
 materialityPY: "",
 comments: "",
 },
 {
 id: SEED_ROW_B,
 entityName: entityLabel,
 basis: "profitBeforeTax",
 periodAmount: String(TB.profitBeforeTax),
 extrapolatedPeriod: String(TB.profitBeforeTax),
 benchmarkPct: "5.00",
 materialityCY: calcMatCY(String(TB.profitBeforeTax), "5.00"),
 materialityPY: "",
 comments: "",
 },
 ]);

 // Clearly trivial
 const [ctThresholdPct, setCtThresholdPct] = useState("5.00");

 // Performance Materiality
 const [pmPct, setPmPct] = useState("70");
 const [pmRationale, setPmRationale] = useState("");

 // Intended Users
 const [intendedUsers, setIntendedUsers] = useState<IntendedUser[]>([
 { id: uid(), user: "", factors: "" },
 ]);

 // Qualitative considerations
 const [qualitative, setQualitative] = useState<QualitativeItem[]>([
 { id: uid(), nature: "", impact: "" },
 ]);

 // Section B — Qualitative disclosures
 const [qualDisclosures, setQualDisclosures] = useState(
 isUS
 ? "ASC 842 first-year lease adoption — nature and extent of leases, ROU asset measurement, discount rate policy, and transition adjustments require complete disclosure. Goodwill impairment testing methodology and assumptions also require qualitative disclosure per ASC 350."
 : "Vessel impairment indicators — nature of impairment assessment and key assumptions (charter rate forecasts, useful lives) require qualitative disclosure. Foreign currency risk management policy disclosure under ASPE s.3856."
 );

 // Section C adjusted — Performance materiality for specific F/S areas
 interface AdjPMRow { id: string; area: string; amount: string; reasoning: string; pyAmount: string; }
 const initAdjPM: AdjPMRow[] = isUS ? [
 { id: uid(), area: "Revenue (ASC 606 — contract estimates)", amount: "92000", reasoning: "Higher risk of misstatement due to percentage-of-completion estimates. PM set at 50% of overall.", pyAmount: "" },
 { id: uid(), area: "ROU Assets & Lease Liabilities (ASC 842)", amount: "64000", reasoning: "First-year adoption — increased inherent risk. PM set at 35% of overall.", pyAmount: "" },
 ] : [
 { id: uid(), area: "Vessel PP&E (impairment)", amount: "62000", reasoning: "Significant judgment in impairment assessment. PM set at 50% of performance materiality.", pyAmount: "" },
 ];
 const [adjPMRows, setAdjPMRows] = useState<AdjPMRow[]>(initAdjPM);

 // Section D — Materiality for specific circumstances
 interface SpecMatRow { id: string; description: string; amount: string; reasoning: string; wpRef: RefDoc[]; pyAmount: string; }
 const initSpecMat: SpecMatRow[] = isUS ? [
 { id: uid(), description: "Related party transactions (ASC 850) — Board member loans and management compensation", amount: "10000", reasoning: "Users (lenders) particularly sensitive to RPTs. Lower materiality applied to ensure completeness of disclosure.", wpRef: [{ name: "WP-RPT-01" }], pyAmount: "" },
 { id: uid(), description: "Going concern disclosures — elevated D/E ratio (2.71x) and covenant compliance", amount: "0", reasoning: "Qualitative — any indication of substantial doubt requires disclosure regardless of dollar amount.", wpRef: [{ name: "WP-GC-01" }], pyAmount: "" },
 ] : [
 { id: uid(), description: "Related party transactions — shareholder loans and management fees", amount: "5000", reasoning: "Bank covenant requires disclosure of all RPTs. Lower threshold applied for completeness.", wpRef: [{ name: "WP-RPT-01" }], pyAmount: "" },
 ];
 const [specMatRows, setSpecMatRows] = useState<SpecMatRow[]>(initSpecMat);

 // Section E — Performance materiality for specific circumstances
 const [specPMAmount, setSpecPMAmount] = useState(isUS ? "7000" : "3500");
 const [specPMReasoning, setSpecPMReasoning] = useState(
 isUS
 ? "Performance materiality for RPTs set at 70% of specific materiality ($10,000 × 70% = $7,000). Ensures detection of individually insignificant RPTs that aggregate to material amounts."
 : "Performance materiality for RPTs set at 70% of specific materiality ($5,000 × 70% = $3,500)."
 );
 const [specPMPY, setSpecPMPY] = useState("");
 const [specPMWPRef, setSpecPMWPRef] = useState<RefDoc[]>([{ name: "WP-RPT-PM" }]);

 // Additional comments & conclusion
 const [additionalComments, setAdditionalComments] = useState("");
 const [conclusion, setConclusion] = useState(
 "I am satisfied that the engagement planning adequately addresses the areas in the financial statements where material misstatements are likely to arise"
 );

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const matFillRef = useRef<HTMLTableRowElement>(null);
 function markLukaFilled(fieldId: string) {
   setLukaFilledFields(prev => new Set(prev).add(fieldId));
   setLukaHighlightFields(prev => new Set(prev).add(fieldId));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(fieldId); return n; }), 2000);
 }

 // ── Derived ──────────────────────────────────────────────────────────────────

 const updateEntityRow = useCallback(
 (id: string, field: keyof EntityRow, value: string) => {
 setEntityRows((prev) =>
 prev.map((row) => {
 if (row.id !== id) return row;
 const updated = {...row, [field]: value };
 // auto-populate from TB when basis changes
 if (field === "basis") {
 const opt = BASIS_OPTIONS.find(o => o.value === value);
 if (opt) {
 const tbVal = String(TB[opt.tbKey]);
 updated.periodAmount = tbVal;
 updated.extrapolatedPeriod = tbVal;
 updated.materialityCY = calcMatCY(tbVal, row.benchmarkPct);
 }
 }
 // recalculate when amounts or % change (use extrapolated as the basis amount)
 if (field === "periodAmount" || field === "extrapolatedPeriod" || field === "benchmarkPct") {
 const extAmt = field === "extrapolatedPeriod" ? value
 : (row.extrapolatedPeriod || (field === "periodAmount" ? value : row.periodAmount));
 const bPct = field === "benchmarkPct" ? value : row.benchmarkPct;
 updated.materialityCY = calcMatCY(extAmt, bPct);
 }
 return updated;
 })
 );
 },
 [TB]
 );

 const handleRefresh = () => {
 setEntityRows(prev => prev.map(row => {
 const opt = BASIS_OPTIONS.find(o => o.value === row.basis);
 if (!opt) return row;
 const tbVal = String(TB[opt.tbKey]);
 return {...row, periodAmount: tbVal, extrapolatedPeriod: tbVal, materialityCY: calcMatCY(tbVal, row.benchmarkPct) };
 }));
 toast.success("Benchmarks refreshed from Trial Balance");
 };

 const addEntityRow = () => {
 setEntityRows((prev) => [
...prev,
 {
 id: uid(),
 entityName: entityLabel,
 basis: "",
 periodAmount: "",
 extrapolatedPeriod: "",
 benchmarkPct: "1.00",
 materialityCY: "",
 materialityPY: "",
 comments: "",
 },
 ]);
 };

 const removeEntityRow = (id: string) => {
 setEntityRows((prev) => {
 const next = prev.filter((r) => r.id !== id);
 if (id === selectedRowId && next.length > 0) setSelectedRowId(next[0].id);
 return next;
 });
 };

 // Overall materiality = selected row's materialityCY (not a sum)
 const selectedRow = entityRows.find(r => r.id === selectedRowId) ?? entityRows[0];
 const overallMateriality = selectedRow?.materialityCY ?? "";

 // Reference totals (period/extrapolated displayed in summary row)
 const totalPeriod = sumColumn(entityRows, "periodAmount");
 const totalExtrapolated = sumColumn(entityRows, "extrapolatedPeriod");
 const totalMatPY = sumColumn(entityRows, "materialityPY");

 // Clearly trivial — flows from overall materiality
 const ctAmount = (() => {
 const m = parseFloat(overallMateriality.replace(/[^0-9.]/g, ""));
 const p = parseFloat(ctThresholdPct.replace(/[^0-9.]/g, ""));
 if (isNaN(m) || isNaN(p)) return "";
 return formatNum(m * p / 100);
 })();

 // Performance Materiality — flows from overall materiality
 const pmAmount = (() => {
 const m = parseFloat(overallMateriality.replace(/[^0-9.]/g, ""));
 const p = parseFloat(pmPct.replace(/[^0-9.]/g, ""));
 if (isNaN(m) || isNaN(p)) return "";
 return formatNum(m * p / 100);
 })();

 // Persist key derived values for cross-worksheet auto-population (e.g., 513)
 useEffect(() => {
 const key = `audit-materiality-data-${isUS ? "us" : "ca"}`;
 writeJsonToLocalStorage(key, {
 overallMateriality,
 performanceMateriality: pmAmount,
 clearlyTrivial: ctAmount,
 });
 }, [isUS, overallMateriality, pmAmount, ctAmount]);

 const title = "Materiality";

 const periodLabel = periodStart && periodEnd
 ? (() => {
 const fmt = (d: string) => {
 const dt = new Date(d + 'T00:00:00');
 return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '');
 };
 return `${fmt(periodStart)}-${fmt(periodEnd)}($)`;
 })()
 : "Period ($)";

 return (
 <div className="flex flex-col h-full">

 <LukaStatusBar
   isActive={isDemoEngagement}
   message={
     lukaState === 'loading'
       ? "Luka is populating materiality fields from Xero GL and prior file…"
       : lukaState === 'done'
       ? "Luka has populated 3 fields — review and confirm."
       : "Luka is populating information from Xero and prior file…"
   }
   actions={lukaState === 'idle' ? DEMO_LUKA_ACTIONS.generic.actions.map(a => ({
     ...a,
     onTrigger: () => {
       setLukaState('loading');
       lukaSequentialFill([
         { scrollRef: matFillRef as React.RefObject<HTMLElement>, set: () => {
             setEntityRows(prev => prev.map((r, i) => i === 0
               ? { ...r, periodAmount: '14,200,000.00', extrapolatedPeriod: '14,200,000.00', materialityCY: '142,000.00' }
               : r));
             markLukaFilled('mat-row-0-amount');
           }
         },
         { set: () => {
             setEntityRows(prev => prev.map((r, i) => i === 0
               ? { ...r, materialityPY: '138,000.00' }
               : r));
             markLukaFilled('mat-row-0-py');
           }
         },
         { set: () => {
             setEntityRows(prev => prev.map((r, i) => i === 0
               ? { ...r, comments: 'Revenue benchmark selected — manufacturing entity with volatile earnings; primary users are lender and shareholder (CAS 320.08).' }
               : r));
             markLukaFilled('mat-row-0-comments');
           }
         },
       ], () => setLukaState('done'));
     },
   })) : []}
 />

 {/* Objective bar */}

 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Establish overall materiality, performance materiality, and the clearly trivial threshold for the audit
 and document the rationale for each determination.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* ── Preliminary Materiality ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Preliminary Materiality</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Set the period dates and populate the table below to calculate overall materiality.</TooltipContent>
 </Tooltip>
 <Input
 type="date"
 value={periodStart}
 onChange={(e) => setPeriodStart(e.target.value)}
 className="h-8 text-sm w-44 pr-2"
 />
 <Input
 type="date"
 value={periodEnd}
 onChange={(e) => setPeriodEnd(e.target.value)}
 className="h-8 text-sm w-44 pr-2"
 />
 <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-muted/40 border-border">
 <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M14 11.5C12.6193 11.5 11.5 12.6193 11.5 14C11.5 15.3807 12.6193 16.5 14 16.5C15.3807 16.5 16.5 15.3807 16.5 14C16.5 12.6193 15.3807 11.5 14 11.5ZM14 11.5V5.66667C14 5.22464 13.8244 4.80072 13.5118 4.48816C13.1993 4.17559 12.7754 4 12.3333 4H9.83333M4 6.5C5.38071 6.5 6.5 5.38071 6.5 4C6.5 2.61929 5.38071 1.5 4 1.5C2.61929 1.5 1.5 2.61929 1.5 4C1.5 5.38071 2.61929 6.5 4 6.5ZM4 6.5V16.5" stroke="#A7B2C2" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </Button>
 <div className="flex-1" />
 <Button
 variant="outline"
 size="sm"
 onClick={addEntityRow}
 className="h-7 text-xs gap-1"
 >
 <Plus className="h-3.5 w-3.5 mr-1.5" />
 Add Row
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={handleRefresh}
 className="h-8 text-sm"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh
 </Button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-3 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-10">Primary</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Basis for Calculations</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap min-w-[185px]">{periodLabel}</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap min-w-[185px]">Extrapolated ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap w-28">Benchmark (%)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap min-w-[185px]">Materiality CY ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap min-w-[165px]">Materiality PY ($)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Comments</th>
 <th className="px-2 py-3 w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {entityRows.map((row, rowIdx) => {
 const isSelected = row.id === selectedRowId;
 return (
 <tr
 key={row.id}
 ref={rowIdx === 0 ? matFillRef : undefined}
 className={`transition-colors ${isSelected ? "bg-primary/[0.04]" : "hover:bg-muted/50"}${
   isDemoEngagement && rowIdx === 0 && lukaHighlightFields.has('mat-row-0-amount')
     ? ' border-l-2 border-violet-400 bg-violet-50/40'
     : ''
 }`}
 >
 <td className="px-3 py-2.5 align-middle text-center">
 <input
 type="radio"
 name="primary-benchmark"
 checked={isSelected}
 onChange={() => setSelectedRowId(row.id)}
 className="h-4 w-4 accent-primary cursor-pointer"
 />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[170px]">
 <TdSelect
 value={row.basis}
 onChange={(v) => updateEntityRow(row.id, "basis", v)}
 options={BASIS_OPTIONS}
 placeholder="Select basis…"
 />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[185px] text-right">
 {isDemoEngagement && row.basis === 'grossRevenue' ? (
   <div className="flex items-center justify-end gap-1.5 min-h-[32px]">
     <ProvenancePopover data={DEMO_PROVENANCE.revenue}>
       <span className="text-sm tabular-nums">{row.periodAmount ? formatDisplay(row.periodAmount) : "—"}</span>
     </ProvenancePopover>
   </div>
 ) : (
 <div className="relative">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('mat-row-0-amount')}>
 <TdInput
 value={row.periodAmount ? formatDisplay(row.periodAmount) : ""}
 onChange={(v) => updateEntityRow(row.id, "periodAmount", v.replace(/[^0-9.]/g, ""))}
 placeholder="e.g. 12,500,000.00"
 className="tabular-nums text-right"
 />
 </LukaTypingRow>
 </div>
 )}
 </td>
 <td className="px-4 py-2.5 align-top min-w-[185px] text-right">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.extrapolatedPeriod} />
   <TdInput
   value={row.extrapolatedPeriod ? formatDisplay(row.extrapolatedPeriod) : ""}
   onChange={(v) => updateEntityRow(row.id, "extrapolatedPeriod", v.replace(/[^0-9.]/g, ""))}
   placeholder="e.g. 12,500,000.00"
   className="tabular-nums text-right flex-1"
   />
 </div>
 </td>
 <td className="px-4 py-2.5 align-top w-28 text-right">
 <TdInput
 value={row.benchmarkPct}
 onChange={(v) => updateEntityRow(row.id, "benchmarkPct", v.replace(/[^0-9.]/g, ""))}
 placeholder="1.00"
 className="tabular-nums text-right"
 />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[185px] text-right">
 <TdInput
 value={formatDisplay(row.materialityCY)}
 readOnly
 className={`tabular-nums text-right${isSelected ? " font-semibold" : ""}`}
 />
 </td>
 <td className="px-4 py-2.5 align-top min-w-[165px] text-right">
 <div className="relative">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('mat-row-0-py')}>
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.materialityPY} />
   <TdInput
   value={row.materialityPY ? formatDisplay(row.materialityPY) : ""}
   onChange={(v) => updateEntityRow(row.id, "materialityPY", v.replace(/[^0-9.]/g, ""))}
   placeholder="—"
   className="tabular-nums text-right flex-1"
   />
 </div>
 </LukaTypingRow>
 </div>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[160px]">
 <div className="relative">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('mat-row-0-comments')}>
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.comments} />
   <TdInput
   value={row.comments}
   onChange={(v) => updateEntityRow(row.id, "comments", v)}
   placeholder="Comments…"
   className="flex-1"
   />
 </div>
 </LukaTypingRow>
 </div>
 </td>
 <td className="px-2 py-2.5 align-top text-center">
 <button
 onClick={() => removeEntityRow(row.id)}
 className="text-muted-foreground hover:text-destructive transition-colors"
 disabled={entityRows.length === 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 );
 })}
 {/* Overall Materiality summary row */}
 <tr className="bg-primary/[0.06] border-t-2 border-primary/20">
 <td className="px-3 py-2" />
 <td className="px-4 py-2 text-sm font-semibold text-primary">
 Overall Materiality — {BASIS_OPTIONS.find(o => o.value === selectedRow?.basis)?.label ?? "Select a primary benchmark ↑"}
 </td>
 <td className="pl-4 pr-7 py-2 text-sm tabular-nums text-foreground text-right">{selectedRow?.periodAmount ? formatDisplay(selectedRow.periodAmount) : "—"}</td>
 <td className="pl-4 pr-7 py-2 text-sm tabular-nums text-foreground text-right">{selectedRow?.extrapolatedPeriod ? formatDisplay(selectedRow.extrapolatedPeriod) : "—"}</td>
 <td className="pl-4 pr-7 py-2 text-sm tabular-nums text-foreground text-right">{selectedRow?.benchmarkPct || "—"}</td>
 <td className="pl-4 pr-7 py-2 text-sm tabular-nums font-bold text-primary text-right">
 {isDemoEngagement && overallMateriality ? (
   <div className="flex items-center justify-end gap-1.5">
     <ProvenancePopover data={DEMO_PROVENANCE.materiality}>
       <span className="font-bold text-primary">{formatDisplay(overallMateriality)}</span>
     </ProvenancePopover>
   </div>
 ) : (overallMateriality ? formatDisplay(overallMateriality) : "—")}
 </td>
 <td className="pl-4 pr-7 py-2 text-sm tabular-nums text-foreground text-right">{selectedRow?.materialityPY || "—"}</td>
 <td className="px-4 py-2" />
 <td className="px-4 py-2" />
 </tr>
 </tbody>
 </table>
 </div>
 {/* Clearly Trivial Misstatements footer — inside the same card */}
 <div className="border-t border-border px-4 py-3">
 <div className="flex items-center">
 <span className="text-sm text-foreground flex-1">Clearly trivial misstatements</span>
 <div className="flex items-center gap-8 mr-8">
 <div className="flex flex-col items-end gap-1">
 <span className="text-sm text-muted-foreground">Threshold (%)</span>
 <TdInput
 value={ctThresholdPct}
 onChange={(v) => setCtThresholdPct(v.replace(/[^0-9.]/g, ""))}
 placeholder="5.00"
 className="w-24 tabular-nums text-right"
 />
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="text-sm text-muted-foreground">Amount ($)</span>
 <TdInput
 value={ctAmount ? formatDisplay(ctAmount) : ""}
 readOnly
 className="w-32 tabular-nums text-right"
 />
 </div>
 </div>
 </div>
 </div>
 {/* Opening balances note */}
 <div className="border-t border-border px-4 py-3 flex items-start gap-2 bg-muted/20">
 <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
 <p className="text-sm text-muted-foreground">If overall materiality is lower than in previous audits, consider whether misstatements may exist in the opening balances.</p>
 </div>
 </div>

 {/* ── Performance Materiality ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Performance Materiality</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Reduces the risk that aggregate uncorrected and undetected misstatements exceed overall materiality.</TooltipContent>
 </Tooltip>
 </div>
 <div className="px-6 py-5">
 <table className="w-full text-sm">
 <tbody className="divide-y divide-border">
 <tr className="hover:bg-muted/10 transition-colors">
 <td className="py-2 text-sm text-muted-foreground w-56">% of Overall Materiality</td>
 <td className="px-1 py-1 w-36">
 <TdInput
 value={pmPct}
 onChange={(v) => setPmPct(v.replace(/[^0-9.]/g, ""))}
 placeholder="70"
 className="tabular-nums text-right w-28"
 />
 </td>
 </tr>
 <tr className="hover:bg-muted/10 transition-colors">
 <td className="py-2 text-sm text-muted-foreground">Performance Materiality ($)</td>
 <td className="px-1 py-1">
 <TdInput
 value={pmAmount ? pmAmount : "—"}
 readOnly
 className="tabular-nums text-right font-semibold w-28"
 />
 </td>
 </tr>
 <tr className="hover:bg-muted/10 transition-colors">
 <td className="py-2 text-sm text-muted-foreground align-top pt-3">Rationale</td>
 <td className="px-2 py-2 w-full">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!pmRationale} />
   <Textarea
   value={pmRationale}
   onChange={(e) => setPmRationale(e.target.value)}
   placeholder="Explain why this percentage was selected…"
   className="min-h-[72px] text-sm resize-none bg-background border-border flex-1"
   />
 </div>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Intended Users ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Intended Users</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Identify the primary users of the financial statements and the factors affecting their decision making.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-1/3">Users</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Factors affecting users decision making</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-16">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {intendedUsers.map((u) => (
 <tr key={u.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={u.user}
 onChange={(v) =>
 setIntendedUsers((prev) =>
 prev.map((x) => (x.id === u.id ? {...x, user: v } : x))
 )
 }
 placeholder="Define user"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={u.factors}
 onChange={(v) =>
 setIntendedUsers((prev) =>
 prev.map((x) => (x.id === u.id ? {...x, factors: v } : x))
 )
 }
 placeholder="Describe factors"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center">
 <button
 onClick={() =>
 setIntendedUsers((prev) => prev.filter((x) => x.id !== u.id))
 }
 className="text-muted-foreground hover:text-destructive transition-colors"
 disabled={intendedUsers.length === 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border">
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs gap-1"
 onClick={() => setIntendedUsers((prev) => [...prev, { id: uid(), user: "", factors: "" }])}
 >
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
 </div>
 </div>

 {/* ── Qualitative Considerations ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Qualitative Considerations</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Document any qualitative factors that influenced the materiality determination.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-1/2">Nature</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Impact</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-16">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {qualitative.map((item) => (
 <tr key={item.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={item.nature}
 onChange={(v) =>
 setQualitative((prev) =>
 prev.map((x) => (x.id === item.id ? {...x, nature: v } : x))
 )
 }
 placeholder="Describe Nature"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={item.impact}
 onChange={(v) =>
 setQualitative((prev) =>
 prev.map((x) => (x.id === item.id ? {...x, impact: v } : x))
 )
 }
 placeholder="Describe impact"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center">
 <button
 onClick={() =>
 setQualitative((prev) => prev.filter((x) => x.id !== item.id))
 }
 className="text-muted-foreground hover:text-destructive transition-colors"
 disabled={qualitative.length === 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border">
 <Button
 size="sm"
 variant="outline"
 className="h-7 text-xs gap-1"
 onClick={() => setQualitative((prev) => [...prev, { id: uid(), nature: "", impact: "" }])}
 >
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
 </div>
 </div>

 {/* ── Section B: Possible misstatements in qualitative disclosures ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">B. Possible Misstatements in Qualitative Disclosures</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Identify any possible misstatements in qualitative F/S disclosures that could be material to intended users. Consider significant transactions, applicable framework, and nature of entity.</TooltipContent>
 </Tooltip>
 </div>
 <div className="px-6 py-5">
 <p className="text-sm text-muted-foreground mb-2">Describe the nature of any qualitative disclosures that could be material to F/S users.</p>
 <AttributedComment value={qualDisclosures} onChange={v => setQualDisclosures(v)} storageKey={`materiality-qualDisc-${isUS ? "us" : "ca"}`} placeholder="Describe qualitative disclosures that could be material…" className="min-h-[80px] text-sm resize-none" />
 </div>
 </div>

 {/* ── Section C Adjusted: Performance materiality for specific F/S areas ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">C. Adjusted Performance Materiality Levels</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Set adjusted performance materiality for specific F/S areas with higher risk. Set at an amount lower than overall performance materiality.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">F/S Area or Disclosure</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider min-w-[130px]">Amount ($)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Reasoning</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider min-w-[120px]">PY Amount ($)</th>
 <th className="px-4 py-3 w-10" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {adjPMRows.map((row) => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top"><TdInput value={row.area} onChange={(v) => setAdjPMRows(p => p.map(r => r.id === row.id ? {...r, area: v} : r))} placeholder="F/S area or disclosure" /></td>
 <td className="px-4 py-2.5 align-top min-w-[130px]"><TdInput value={row.amount ? formatDisplay(row.amount) : ""} onChange={(v) => setAdjPMRows(p => p.map(r => r.id === row.id ? {...r, amount: v.replace(/[^0-9.]/g,"")} : r))} placeholder="0.00" className="text-right tabular-nums" /></td>
 <td className="px-4 py-2.5 align-top"><TdInput value={row.reasoning} onChange={(v) => setAdjPMRows(p => p.map(r => r.id === row.id ? {...r, reasoning: v} : r))} placeholder="Reasoning…" /></td>
 <td className="px-4 py-2.5 align-top min-w-[120px]"><TdInput value={row.pyAmount ? formatDisplay(row.pyAmount) : ""} onChange={(v) => setAdjPMRows(p => p.map(r => r.id === row.id ? {...r, pyAmount: v.replace(/[^0-9.]/g,"")} : r))} placeholder="—" className="text-right tabular-nums" /></td>
 <td className="px-2 py-2.5 align-top text-center"><button onClick={() => setAdjPMRows(p => p.filter(r => r.id !== row.id))} className="text-muted-foreground hover:text-destructive transition-colors" disabled={adjPMRows.length === 1}><Trash2 className="h-3.5 w-3.5" /></button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border space-y-2">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setAdjPMRows(p => [...p, {id: uid(), area:"", amount:"", reasoning:"", pyAmount:""}])}><Plus className="h-3.5 w-3.5" />Add Row</Button>
 <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
 <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
 If there are more than two F/S areas or disclosures that require an adjusted performance materiality level, provide details on a supplementary work paper that cross-references to this form.
 </p>
 </div>
 </div>

 {/* ── Section D: Materiality for specific circumstances ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">D. Materiality for Specific Circumstances</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Set lower materiality for specific classes of transactions, balances or disclosures where users are particularly sensitive.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Description / User Expectation</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider min-w-[130px]">Amount ($)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Reasoning</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">W/P Ref.</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-24">PY ($)</th>
 <th className="px-4 py-3 w-10" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {specMatRows.map((row) => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top"><TdInput value={row.description} onChange={(v) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, description: v} : r))} placeholder="Describe specific circumstances…" /></td>
 <td className="px-4 py-2.5 align-top min-w-[130px]"><TdInput value={row.amount ? formatDisplay(row.amount) : ""} onChange={(v) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, amount: v.replace(/[^0-9.]/g,"")} : r))} placeholder="0.00" className="text-right tabular-nums" /></td>
 <td className="px-4 py-2.5 align-top"><TdInput value={row.reasoning} onChange={(v) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, reasoning: v} : r))} placeholder="Reasoning…" /></td>
 <td className="px-4 py-2.5 align-top"><RefButton reference={row.wpRef} onAttach={(doc) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, wpRef: [...r.wpRef, doc]} : r))} onRemove={(idx) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, wpRef: r.wpRef.filter((_,j) => j !== idx)} : r))} /></td>
 <td className="px-4 py-2.5 align-top"><TdInput value={row.pyAmount ? formatDisplay(row.pyAmount) : ""} onChange={(v) => setSpecMatRows(p => p.map(r => r.id === row.id ? {...r, pyAmount: v.replace(/[^0-9.]/g,"")} : r))} placeholder="—" className="text-right tabular-nums" /></td>
 <td className="px-2 py-2.5 align-top text-center"><button onClick={() => setSpecMatRows(p => p.filter(r => r.id !== row.id))} className="text-muted-foreground hover:text-destructive transition-colors" disabled={specMatRows.length === 1}><Trash2 className="h-3.5 w-3.5" /></button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-3 border-t border-border">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setSpecMatRows(p => [...p, {id: uid(), description:"", amount:"", reasoning:"", wpRef:[], pyAmount:""}])}><Plus className="h-3.5 w-3.5" />Add Row</Button>
 </div>
 </div>

 {/* ── Section E: Performance materiality for specific circumstances ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">E. Performance Materiality for Specific Circumstances</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Performance materiality applied to the specific circumstances identified in Step D.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider min-w-[130px]">Amount ($)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Reasoning</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">W/P Ref.</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider min-w-[120px]">PY Amount ($)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 <tr className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top min-w-[130px]"><TdInput value={specPMAmount ? formatDisplay(specPMAmount) : ""} onChange={(v) => setSpecPMAmount(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="text-right tabular-nums" /></td>
 <td className="px-4 py-2.5 align-top"><TdInput value={specPMReasoning} onChange={setSpecPMReasoning} placeholder="Reasoning…" /></td>
 <td className="px-4 py-2.5 align-top"><RefButton reference={specPMWPRef} onAttach={(doc) => setSpecPMWPRef(p => [...p, doc])} onRemove={(idx) => setSpecPMWPRef(p => p.filter((_,j) => j !== idx))} /></td>
 <td className="px-4 py-2.5 align-top min-w-[120px]"><TdInput value={specPMPY ? formatDisplay(specPMPY) : ""} onChange={(v) => setSpecPMPY(v.replace(/[^0-9.]/g, ""))} placeholder="—" className="text-right tabular-nums" /></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Additional Comments ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Additional Comments</span>
 </div>
 <div className="px-6 py-5">
 <AttributedComment
 value={additionalComments}
 onChange={setAdditionalComments}
 storageKey={`materiality-comments-${isUS ? 'us' : 'ca'}`}
 placeholder="Add Comments"
 className="min-h-[80px] text-sm resize-none bg-background"
 />
 </div>
 </div>

 {/* ── Conclusion ── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-2">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 <span className="text-sm text-muted-foreground">— Document any changes in the materiality assessments and the final materiality</span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 value={conclusion}
 onChange={(e) => setConclusion(e.target.value)}
 className="min-h-[72px] text-sm resize-none bg-background"
 />
 </div>
 </div>

 {/* Conclude button — bottom right */}
 <div className="flex justify-end">
 <Button
 onClick={() => {
 setConcluded(true);
 toast.success("Materiality worksheet concluded");
 }}
 disabled={concluded}
 >
 {concluded ? "Worksheet concluded" : "Conclude worksheet"}
 </Button>
 </div>

 </div>
 </div>

 {/* Dialog */}
 <AddToMyTemplatesDialog
 open={showAddDialog}
 onOpenChange={setShowAddDialog}
 checklist={{
 id: isUS ? "aud-us-mat-worksheet" : "aud-mat-worksheet",
 title,
 sections: [],
 createdAt: new Date(),
 updatedAt: new Date(),
 }}
 checklistName={title}
 />
 </div>
 );
}
