import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Info, Plus } from "lucide-react";
import { AddToMyTemplatesDialog } from "@/components/AddToMyTemplatesDialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNum(val: number): string {
 if (isNaN(val)) return "";
 return val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(cy: number, py: number): string {
 if (py === 0) return "—";
 const p = ((cy - py) / py) * 100;
 return p.toFixed(1) + "%";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TdInput({
 value,
 onChange,
 placeholder,
 readOnly,
 className = "",
}: {
 value: string;
 onChange?: (v: string) => void;
 placeholder?: string;
 readOnly?: boolean;
 className?: string;
}) {
 return (
 <Input
 readOnly={readOnly}
 value={value}
 onChange={(e) => onChange?.(e.target.value)}
 placeholder={placeholder}
 className={`h-8 text-sm ${className}`}
 />
 );
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function ThresholdBadge({ exceeded }: { exceeded: boolean }) {
 return exceeded ? (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
 Yes
 </span>
 ) : (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
 No
 </span>
 );
}

function PriorityBadge({ priority }: { priority: string }) {
 if (priority === "High")
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
 High
 </span>
 );
 if (priority === "Medium")
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
 Medium
 </span>
 );
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
 Low
 </span>
 );
}

function StatusBadge({ status }: { status: string }) {
 if (status === "Addressed")
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
 Addressed
 </span>
 );
 if (status === "In Progress")
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
 In Progress
 </span>
 );
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
 Planned
 </span>
 );
}

function RatioStatusBadge({ status }: { status: string }) {
 if (status.startsWith("✅"))
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
 {status}
 </span>
 );
 if (status.startsWith("⚠️"))
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
 {status}
 </span>
 );
 return (
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
 {status}
 </span>
 );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ISRow {
 label: string;
 cy: number;
 py: number;
 explanation: string;
}

interface BSRow {
 label: string;
 cy: number;
 py: number;
 explanation: string;
}

interface RatioRow {
 ratio: string;
 formula: string;
 cy: string;
 py: string;
 benchmark: string;
 status: string;
 notes: string;
}

interface MatterRow {
 ref: string;
 matter: string;
 amount: string;
 priority: string;
 response: string;
 status: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const US_IS_ROWS: ISRow[] = [
 { label: "Revenue", cy: 18400000, py: 17000000, explanation: "Revenue increased 8.2% driven by new customer contracts and 12% volume growth in freight services. Tested via revenue cut-off procedures." },
 { label: "Cost of Revenue", cy: 12144000, py: 11390000, explanation: "" },
 { label: "Gross Profit", cy: 6256000, py: 5610000, explanation: "" },
 { label: "Operating Expenses", cy: 4920000, py: 4420000, explanation: "" },
 { label: "EBITDA", cy: 1960000, py: 1710000, explanation: "" },
 { label: "Depreciation", cy: 480000, py: 320000, explanation: "Significant increase due to adoption of ASC 842 — Right-of-use asset depreciation recognized for first time ($480K vs $320K prior year). No prior year comparator." },
 { label: "EBIT", cy: 1480000, py: 1390000, explanation: "" },
 { label: "Interest Expense", cy: 384000, py: 280000, explanation: "Interest expense increase consistent with new $5M credit facility drawn January 2025." },
 { label: "Income Before Tax", cy: 1096000, py: 1110000, explanation: "" },
 { label: "Income Tax", cy: 249000, py: 252000, explanation: "" },
 { label: "Net Income", cy: 847000, py: 858000, explanation: "" },
];

const CA_IS_ROWS: ISRow[] = [
 { label: "Revenue", cy: 12500000, py: 11800000, explanation: "" },
 { label: "Cost of Revenue", cy: 8375000, py: 7847000, explanation: "" },
 { label: "Gross Profit", cy: 4125000, py: 3953000, explanation: "" },
 { label: "Operating Expenses", cy: 3200000, py: 2980000, explanation: "" },
 { label: "EBITDA", cy: 1250000, py: 1100000, explanation: "" },
 { label: "Depreciation", cy: 280000, py: 250000, explanation: "" },
 { label: "EBIT", cy: 970000, py: 850000, explanation: "" },
 { label: "Interest Expense", cy: 123000, py: 95000, explanation: "" },
 { label: "Income Before Tax", cy: 847000, py: 755000, explanation: "" },
 { label: "Net Income", cy: 624000, py: 558000, explanation: "" },
];

const US_BS_ROWS: BSRow[] = [
 { label: "Cash", cy: 1240000, py: 980000, explanation: "" },
 { label: "Accounts Receivable", cy: 2100000, py: 1850000, explanation: "" },
 { label: "Inventory", cy: 340000, py: 290000, explanation: "" },
 { label: "Other Current Assets", cy: 185000, py: 140000, explanation: "" },
 { label: "Total Current Assets", cy: 3865000, py: 3260000, explanation: "" },
 { label: "PP&E Net", cy: 4820000, py: 4960000, explanation: "" },
 { label: "ROU Assets", cy: 2800000, py: 0, explanation: "New right-of-use assets recognized on adoption of ASC 842 effective January 1, 2024. Three operating leases totaling $2.8M capitalized." },
 { label: "Goodwill", cy: 1420000, py: 1420000, explanation: "" },
 { label: "Other Non-Current", cy: 195000, py: 150000, explanation: "" },
 { label: "Total Assets", cy: 13100000, py: 9790000, explanation: "" },
 { label: "Accounts Payable", cy: 1400000, py: 1180000, explanation: "" },
 { label: "Accrued Liabilities", cy: 620000, py: 540000, explanation: "" },
 { label: "Current Portion LT Debt", cy: 480000, py: 380000, explanation: "" },
 { label: "Total Current Liabilities", cy: 2500000, py: 2100000, explanation: "" },
 { label: "Long-term Debt", cy: 4320000, py: 2800000, explanation: "Increase reflects new $5M revolving credit facility with First National Bank, partially drawn at year-end." },
 { label: "Lease Liabilities", cy: 2750000, py: 0, explanation: "New lease liabilities recognized on adoption of ASC 842 effective January 1, 2024." },
 { label: "Total Liabilities", cy: 9570000, py: 4900000, explanation: "" },
 { label: "Total Equity", cy: 3530000, py: 4890000, explanation: "" },
];

const US_RATIOS: RatioRow[] = [
 { ratio: "Current Ratio", formula: "Current Assets / Current Liabilities", cy: "1.55", py: "1.55", benchmark: "1.5–2.0", status: "✅ Normal", notes: "" },
 { ratio: "Quick Ratio", formula: "(CA - Inventory) / CL", cy: "1.41", py: "1.42", benchmark: "1.0–1.5", status: "✅ Normal", notes: "" },
 { ratio: "Gross Margin %", formula: "Gross Profit / Revenue", cy: "34.0%", py: "33.0%", benchmark: "30–35%", status: "✅ Normal", notes: "" },
 { ratio: "Net Margin %", formula: "Net Income / Revenue", cy: "4.6%", py: "5.0%", benchmark: "3–6%", status: "✅ Normal", notes: "" },
 { ratio: "Debt-to-Equity", formula: "Total Liabilities / Equity", cy: "2.71", py: "1.00", benchmark: "<2.0", status: "⚠️ Elevated", notes: "Elevated due to new lease liabilities from ASC 842 adoption." },
 { ratio: "AR Days", formula: "AR / Revenue × 365", cy: "41.6 days", py: "39.7 days", benchmark: "30–45 days", status: "✅ Normal", notes: "" },
 { ratio: "Revenue per Employee", formula: "Revenue / 147 employees", cy: "$125,170", py: "$115,646", benchmark: "Industry avg $120K", status: "✅ Normal", notes: "" },
 { ratio: "Interest Coverage", formula: "EBIT / Interest", cy: "3.85x", py: "4.96x", benchmark: ">3x", status: "✅ Acceptable", notes: "" },
];

const CA_RATIOS: RatioRow[] = [
 { ratio: "Current Ratio", formula: "Current Assets / Current Liabilities", cy: "—", py: "—", benchmark: "1.5–2.0", status: "✅ Normal", notes: "" },
 { ratio: "Gross Margin %", formula: "Gross Profit / Revenue", cy: "33.0%", py: "33.5%", benchmark: "30–35%", status: "✅ Normal", notes: "" },
 { ratio: "Net Margin %", formula: "Net Income / Revenue", cy: "5.0%", py: "4.7%", benchmark: "3–6%", status: "✅ Normal", notes: "" },
 { ratio: "Interest Coverage", formula: "EBIT / Interest", cy: "7.9x", py: "8.9x", benchmark: ">3x", status: "✅ Acceptable", notes: "" },
];

const US_MATTERS: MatterRow[] = [
 { ref: "PAP-01", matter: "Revenue recognition cut-off — $68K accrued revenue identified near year-end", amount: "$68,000", priority: "High", response: "Perform revenue cut-off testing for 15 days before/after year-end", status: "Addressed" },
 { ref: "PAP-02", matter: "ASC 842 lease adoption — New ROU assets $2.8M and lease liabilities $2.75M", amount: "$2,800,000", priority: "High", response: "Review lease agreements, test calculation of ROU asset and lease liability balances", status: "In Progress" },
 { ref: "PAP-03", matter: "Goodwill impairment — No impairment recorded despite revenue growth slowing in logistics segment", amount: "$1,420,000", priority: "Medium", response: "Obtain management's impairment assessment, review DCF assumptions with valuation specialist", status: "In Progress" },
 { ref: "PAP-04", matter: "Debt-to-equity ratio elevated at 2.71x — covenant monitoring required", amount: "N/A", priority: "Medium", response: "Review loan agreements, confirm covenant compliance, test debt disclosure", status: "Planned" },
];

const CA_MATTERS: MatterRow[] = [
 { ref: "PAP-01", matter: "Revenue growth of 5.9% — above industry average; test for cut-off and completeness", amount: "$700,000", priority: "Medium", response: "Perform revenue cut-off testing for 10 days before/after year-end", status: "Planned" },
 { ref: "PAP-02", matter: "Interest expense increase of 29.5% relative to prior year", amount: "$28,000", priority: "Medium", response: "Obtain new loan agreements, recalculate interest accruals, confirm outstanding balances", status: "Planned" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

interface AuditPAPWorksheetProps {
 isUS?: boolean;
}

export function AuditPAPWorksheet({ isUS = false }: AuditPAPWorksheetProps) {
 const [showAddDialog, setShowAddDialog] = useState(false);
 const [concluded, setConcluded] = useState(false);
 const [conclusion, setConclusion] = useState(
 "Based on the preliminary analytical procedures performed, no conditions have been identified that suggest the financial statements may be materially misstated, other than the matters documented above. The analytical procedures confirm our understanding of the entity obtained during planning and identify risk areas requiring additional audit attention during fieldwork."
 );

 // Engagement info
 const [preparer, setPreparer] = useState(isUS ? "L. Garcia, CPA" : "J. Smith, CPA");
 const [date, setDate] = useState(isUS ? "January 20, 2025" : "May 15, 2024");

 // Loaded from localStorage
 const [perfMateriality, setPerfMateriality] = useState<string>("");
 const [clearlyTrivial, setClearlyTrivial] = useState<string>("");

 useEffect(() => {
 try {
 const key = isUS ? "audit-materiality-data-us" : "audit-materiality-data-ca";
 const raw = localStorage.getItem(key);
 if (raw) {
 const data = JSON.parse(raw);
 if (data.performanceMateriality) setPerfMateriality(data.performanceMateriality);
 if (data.clearlyTrivial) setClearlyTrivial(data.clearlyTrivial);
 }
 } catch {
 // ignore
 }
 }, [isUS]);

 // IS rows state
 const baseISRows = isUS ? US_IS_ROWS : CA_IS_ROWS;
 const [isExplanations, setIsExplanations] = useState<string[]>(
 baseISRows.map((r) => r.explanation)
 );

 // BS rows state (US only populated fully)
 const [bsExplanations, setBsExplanations] = useState<string[]>(
 US_BS_ROWS.map((r) => r.explanation)
 );

 // Ratio notes state
 const baseRatios = isUS ? US_RATIOS : CA_RATIOS;
 const [ratioNotes, setRatioNotes] = useState<string[]>(baseRatios.map((r) => r.notes));

 // Matters state
 const baseMatters = isUS ? US_MATTERS : CA_MATTERS;
 const [matterResponses, setMatterResponses] = useState<string[]>(
 baseMatters.map((m) => m.response)
 );

 // Derived
 const perfMatNum = parseFloat(String(perfMateriality).replace(/[^0-9.]/g, "")) || 0;

 const title = "Preliminary Analytical Procedures";
 const entityName = isUS ? "Harbor Freight Logistics LLC" : "Shipping Line Inc.";
 const period = isUS ? "January 1, 2024 – December 31, 2024" : "April 1, 2023 – March 31, 2024";
 const framework = isUS ? "US GAAP / ASC" : "IFRS / ASPE";

 const bsRows = isUS ? US_BS_ROWS : [];

 // Section card wrapper
 const SectionCard = ({
 title: sTitle,
 tooltip,
 children,
 }: {
 title: string;
 tooltip?: string;
 children: React.ReactNode;
 }) => (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">{sTitle}</span>
 {tooltip && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>{tooltip}</TooltipContent>
 </Tooltip>
 )}
 </div>
 {children}
 </div>
 );

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Perform preliminary analytical procedures to understand the entity and its environment, identify
 unusual fluctuations, and highlight areas requiring additional audit attention.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* ── Section 1: Engagement Information ── */}
 <SectionCard title="Section 1 — Engagement Information" tooltip="Identifies the engagement context, applicable standards, and key materiality thresholds.">
 <div className="px-6 py-5">
 <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Entity</span>
 <span className="font-medium text-foreground">{entityName}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Framework</span>
 <span className="font-medium text-foreground">{framework}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Period</span>
 <span className="font-medium text-foreground">{period}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Preparer</span>
 <TdInput value={preparer} onChange={setPreparer} className="w-48" />
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Performance Materiality</span>
 <span className="font-medium text-foreground tabular-nums">
 {perfMateriality ? `$${perfMateriality}` : <span className="text-muted-foreground italic text-xs">Not set — complete Materiality worksheet first</span>}
 </span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Date</span>
 <TdInput value={date} onChange={setDate} className="w-48" />
 </div>
 <div className="flex items-center gap-3">
 <span className="text-muted-foreground w-44 shrink-0">Clearly Trivial</span>
 <span className="font-medium text-foreground tabular-nums">
 {clearlyTrivial ? `$${clearlyTrivial}` : <span className="text-muted-foreground italic text-xs">Not set</span>}
 </span>
 </div>
 </div>
 </div>
 </SectionCard>

 {/* ── Section 2: Income Statement ── */}
 <SectionCard title="Section 2 — Income Statement: Current vs Prior Year" tooltip="Compare current and prior year income statement amounts; flag items exceeding performance materiality.">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-44">Line Item</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">Current Year ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">Prior Year ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">$ Change</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-24">% Change</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-36">Threshold Exceeded</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Explanation / Audit Response</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {baseISRows.map((row, i) => {
 const change = row.cy - row.py;
 const exceeded = perfMatNum > 0 && Math.abs(change) > perfMatNum;
 return (
 <tr key={row.label} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{row.label}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right">${formatNum(row.cy)}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right">${formatNum(row.py)}</td>
 <td className={`px-4 py-2.5 text-sm tabular-nums text-right font-medium ${change >= 0 ? "text-emerald-700" : "text-red-600"}`}>
 {change >= 0 ? "+" : ""}${formatNum(Math.abs(change))}
 </td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-right text-muted-foreground">{pct(row.cy, row.py)}</td>
 <td className="px-4 py-2.5 text-center">
 <ThresholdBadge exceeded={exceeded} />
 </td>
 <td className="px-4 py-2 min-w-[280px]">
 <TdInput
 value={isExplanations[i]}
 onChange={(v) => setIsExplanations((prev) => prev.map((x, j) => j === i ? v : x))}
 placeholder={exceeded ? "Required — explain variance…" : "Optional note…"}
 className="text-sm"
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </SectionCard>

 {/* ── Section 3: Balance Sheet — US only ── */}
 {isUS && (
 <SectionCard title="Section 3 — Balance Sheet: Current vs Prior Year" tooltip="Compare current and prior year balance sheet amounts; flag items exceeding performance materiality.">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-52">Line Item</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">Current Year ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">Prior Year ($)</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-32">$ Change</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-24">% Change</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-36">Threshold Exceeded</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Explanation / Audit Response</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {bsRows.map((row, i) => {
 const change = row.cy - row.py;
 const exceeded = perfMatNum > 0 && Math.abs(change) > perfMatNum;
 return (
 <tr key={row.label} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{row.label}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right">${formatNum(row.cy)}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right">{row.py === 0 ? "—" : `$${formatNum(row.py)}`}</td>
 <td className={`px-4 py-2.5 text-sm tabular-nums text-right font-medium ${change >= 0 ? "text-emerald-700" : "text-red-600"}`}>
 {change >= 0 ? "+" : ""}${formatNum(Math.abs(change))}
 </td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-right text-muted-foreground">{row.py === 0 ? "NEW" : pct(row.cy, row.py)}</td>
 <td className="px-4 py-2.5 text-center">
 <ThresholdBadge exceeded={exceeded} />
 </td>
 <td className="px-4 py-2 min-w-[280px]">
 <TdInput
 value={bsExplanations[i]}
 onChange={(v) => setBsExplanations((prev) => prev.map((x, j) => j === i ? v : x))}
 placeholder={exceeded ? "Required — explain variance…" : "Optional note…"}
 className="text-sm"
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </SectionCard>
 )}

 {/* ── Section 4: Key Financial Ratios ── */}
 <SectionCard
 title={`Section ${isUS ? "4" : "3"} — Key Financial Ratios`}
 tooltip="Calculate key ratios to identify trends and benchmark against industry norms."
 >
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-44">Ratio</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Formula</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-28">Current Year</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-28">Prior Year</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-36">Industry Benchmark</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-36">Status</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {baseRatios.map((row, i) => (
 <tr key={row.ratio} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{row.ratio}</td>
 <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.formula}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right font-medium">{row.cy}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-muted-foreground text-right">{row.py}</td>
 <td className="px-4 py-2.5 text-sm text-muted-foreground text-center">{row.benchmark}</td>
 <td className="px-4 py-2.5 text-center">
 <RatioStatusBadge status={row.status} />
 </td>
 <td className="px-4 py-2 min-w-[220px]">
 <TdInput
 value={ratioNotes[i]}
 onChange={(v) => setRatioNotes((prev) => prev.map((x, j) => j === i ? v : x))}
 placeholder="Add note…"
 className="text-sm"
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </SectionCard>

 {/* ── Section 5: Summary of Matters Identified ── */}
 <SectionCard
 title={`Section ${isUS ? "5" : "4"} — Summary of Matters Identified`}
 tooltip="Document all matters identified through PAP that require follow-up during fieldwork."
 >
 <div className="px-6 py-3 border-b border-border">
 <p className="text-sm text-muted-foreground">
 The following matters were identified through preliminary analytical procedures and require follow-up during fieldwork.
 </p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">Ref</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Matter Identified</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider w-28">Amount</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">Priority</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Planned Audit Response</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-28">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {baseMatters.map((m, i) => (
 <tr key={m.ref} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 text-sm font-mono font-medium text-foreground">{m.ref}</td>
 <td className="px-4 py-2.5 text-sm text-foreground">{m.matter}</td>
 <td className="px-4 py-2.5 text-sm tabular-nums text-foreground text-right">{m.amount}</td>
 <td className="px-4 py-2.5 text-center">
 <PriorityBadge priority={m.priority} />
 </td>
 <td className="px-4 py-2 min-w-[260px]">
 <TdInput
 value={matterResponses[i]}
 onChange={(v) => setMatterResponses((prev) => prev.map((x, j) => j === i ? v : x))}
 placeholder="Describe planned response…"
 className="text-sm"
 />
 </td>
 <td className="px-4 py-2.5 text-center">
 <StatusBadge status={m.status} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </SectionCard>

 {/* ── Section 6: Overall Conclusion ── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">
 Section {isUS ? "6" : "5"} — Overall Conclusion
 </span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 value={conclusion}
 onChange={(e) => setConclusion(e.target.value)}
 className="min-h-[96px] text-sm resize-none bg-background"
 />
 <div className="flex justify-end mt-4">
 <Button
 onClick={() => {
 setConcluded(true);
 toast.success("PAP worksheet concluded");
 }}
 disabled={concluded}
 >
 {concluded ? "Worksheet concluded" : "Conclude worksheet"}
 </Button>
 </div>
 </div>
 </div>

 </div>
 </div>

 {/* Dialog */}
 <AddToMyTemplatesDialog
 open={showAddDialog}
 onOpenChange={setShowAddDialog}
 checklist={{
 id: isUS ? "aud-us-pap-worksheet" : "aud-pap-worksheet",
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
