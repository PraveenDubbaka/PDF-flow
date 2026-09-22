import { useState, useCallback, useEffect } from "react";
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
import { Info, RefreshCw, Trash2, Plus, FileText } from "lucide-react";
import { AddToMyTemplatesDialog } from "@/components/AddToMyTemplatesDialog";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FSARow {
 id: string;
 ls: string;
 description: string;
 periodAmount: string;
 materiality: "Yes" | "No" | "";
 misstatementLikely: "Yes" | "No" | "Maybe" | "";
 potentialEffect: string;
 procedures: string;
}

interface PervasiveRow {
 id: string;
 misstatement: string;
 response: string;
 wpRef: string;
}

interface DisclosureRow {
 id: string;
 misstatement: string;
 procedures: string;
 wpRef: string;
}

interface ThresholdRow {
 label: string;
 pct: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
 return Math.random().toString(36).slice(2, 9);
}

function formatNum(val: number): string {
 return val.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcThresholdAmt(materiality: string, pct: string): string {
 const m = parseFloat(materiality.replace(/[^0-9.]/g, ""));
 const p = parseFloat(pct.replace(/[^0-9.]/g, ""));
 if (isNaN(m) || isNaN(p)) return "—";
 return formatNum(m * p / 100);
}

const DEFAULT_FSA_ROWS: FSARow[] = [
 { id: "fsa-a", ls: "A", description: "Cash and cash equivalents", periodAmount: "", materiality: "Yes", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-b", ls: "B", description: "Accounts receivable", periodAmount: "", materiality: "Yes", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-c", ls: "C", description: "Inventories", periodAmount: "", materiality: "No", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-d", ls: "D", description: "Short-term investments", periodAmount: "", materiality: "No", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-h", ls: "H", description: "Property, plant and equipment", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-i", ls: "I", description: "Intangible assets", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-j", ls: "J", description: "Investments and long-term receivables", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-aa", ls: "AA", description: "Accounts payable and accrued liabilities", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-bb", ls: "BB", description: "Income taxes payable", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-cc", ls: "CC", description: "Long-term debt", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-tt", ls: "TT", description: "Equity / shareholders' equity", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-700", ls: "700", description: "Revenue / net sales", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-710", ls: "710", description: "Cost of goods sold", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
 { id: "fsa-720", ls: "720", description: "Operating expenses", periodAmount: "", materiality: "", misstatementLikely: "", potentialEffect: "", procedures: "" },
];

const DEFAULT_THRESHOLD_ROWS: ThresholdRow[] = [
 { label: "Assets", pct: "19" },
 { label: "Liabilities", pct: "25" },
 { label: "Equity", pct: "25" },
 { label: "Revenue", pct: "50" },
 { label: "Cost of Sales", pct: "50" },
 { label: "Expenses", pct: "50" },
];

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

function TdTextarea({
 value,
 onChange,
 placeholder,
 className = "",
}: {
 value: string;
 onChange: (v: string) => void;
 placeholder?: string;
 className?: string;
}) {
 return (
 <Textarea
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 className={`min-h-[56px] text-sm resize-none ${className}`}
 />
 );
}

function TdSelect({
 value,
 onChange,
 options,
 placeholder = "Select…",
 className = "",
}: {
 value: string;
 onChange: (v: string) => void;
 options: { value: string; label: string }[];
 placeholder?: string;
 className?: string;
}) {
 return (
 <Select value={value} onValueChange={onChange}>
 <SelectTrigger className={`h-8 text-sm ${className}`}>
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

interface AuditScopeWorksheetProps {
 isUS?: boolean;
 overallMateriality?: string;
 performanceMateriality?: string;
 clearlyTrivial?: string;
}

export function AuditScopeWorksheet({
 isUS = false,
 overallMateriality: propOM,
 performanceMateriality: propPM,
 clearlyTrivial: propCT,
}: AuditScopeWorksheetProps) {
 const [showAddDialog, setShowAddDialog] = useState(false);
 const [concluded, setConcluded] = useState(false);

 // Materiality carry-forward
 const [materialityAmt, setMaterialityAmt] = useState(propOM ?? "15778.36");
 const [clearlyTrivialAmt, setClearlyTrivialAmt] = useState(propCT ?? "788.92");

 const loadFromMateriality = useCallback(() => {
 const storageKey = `audit-materiality-data-${isUS ? 'us' : 'ca'}`;
 const saved = localStorage.getItem(storageKey);
 if (saved) {
 try {
 const data = JSON.parse(saved);
 if (data.overallMateriality) setMaterialityAmt(data.overallMateriality.replace(/,/g, ""));
 if (data.clearlyTrivial) setClearlyTrivialAmt(data.clearlyTrivial.replace(/,/g, ""));
 toast.success("Materiality values refreshed from worksheet.");
 } catch {
 toast.error("Could not parse saved materiality data.");
 }
 } else {
 toast("No saved materiality data found. Complete the Materiality worksheet first.");
 }
 }, [isUS]);

 useEffect(() => {
 loadFromMateriality();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Threshold rows
 const [thresholdRows, setThresholdRows] = useState<ThresholdRow[]>(DEFAULT_THRESHOLD_ROWS);

 // FSA rows
 const [fsaRows, setFsaRows] = useState<FSARow[]>(
 DEFAULT_FSA_ROWS.map((r) => ({...r, id: uid() }))
 );

 // Pervasive misstatements
 const [pervasiveRows, setPervasiveRows] = useState<PervasiveRow[]>([
 { id: uid(), misstatement: "", response: "", wpRef: "" },
 ]);

 // Financial statement disclosures
 const [disclosureRows, setDisclosureRows] = useState<DisclosureRow[]>([
 { id: uid(), misstatement: "", procedures: "", wpRef: "" },
 ]);

 // Additional comments & conclusion
 const [additionalComments, setAdditionalComments] = useState("");
 const [conclusion, setConclusion] = useState(
 "I am satisfied that the engagement planning adequately addresses the areas in the financial statements where material misstatements are likely to arise"
 );

 const updateFSARow = useCallback((id: string, field: keyof FSARow, value: string) => {
 setFsaRows((prev) =>
 prev.map((r) => (r.id === id ? {...r, [field]: value } : r))
 );
 }, []);

 // suppress unused prop warning
 void propPM;

 const title = isUS ? "Engagement Scope — US GAAS" : "Engagement Scope — CAS";

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Define and document the scope of the audit engagement: entity coverage, reporting period,
 applicable framework, financial statement areas in scope, significant risks, and agreed
 reporting requirements.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* ── Materiality Carry-Forward ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Materiality Carry-Forward</span>
 <button
 onClick={loadFromMateriality}
 className="text-xs text-primary hover:underline ml-auto"
 >
 ↻ Refresh from Materiality
 </button>
 </div>
 <div className="px-6 py-5">
 <div className="flex flex-col sm:flex-row gap-4">
 {/* Left side: carry-forward values */}
 <div className="flex flex-col gap-3 sm:w-64">
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Materiality ($)</label>
 <Input
 value={materialityAmt}
 onChange={(e) => setMaterialityAmt(e.target.value.replace(/[^0-9.]/g, ""))}
 className="h-9 text-sm bg-muted/40 tabular-nums"
 readOnly
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Clearly trivial misstatement ($)</label>
 <Input
 value={clearlyTrivialAmt}
 onChange={(e) => setClearlyTrivialAmt(e.target.value.replace(/[^0-9.]/g, ""))}
 className="h-9 text-sm bg-muted/40 tabular-nums"
 readOnly
 />
 </div>
 </div>

 {/* Right side: threshold table */}
 <div className="flex-1 border border-border rounded-lg overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-1/3">Area</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">Threshold (%)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Materiality ($)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {thresholdRows.map((row, idx) => (
 <tr key={idx} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top text-sm text-foreground">{row.label}</td>
 <td className="px-4 py-2.5 align-top">
 <Input
 value={row.pct}
 onChange={(e) => {
 const v = e.target.value.replace(/[^0-9.]/g, "");
 setThresholdRows((prev) =>
 prev.map((r, i) => (i === idx ? {...r, pct: v } : r))
 );
 }}
 className="h-7 text-sm w-20 tabular-nums"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-sm tabular-nums font-medium text-foreground">
 {calcThresholdAmt(materialityAmt, row.pct)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* ── Specific FSAs ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Specific FSA's</span>
 <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto">
 <RefreshCw className="h-3 w-3" />
 Refresh
 </Button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full" style={{ minWidth: 900 }}>
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-10">LS</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-44">Description</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28 whitespace-nowrap">
 {isUS ? "Current Period ($)" : "Dec31–Dec30 ($)"}
 </th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-24">Materiality</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-36 whitespace-nowrap">Material misstatement likely</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Describe Potential Effect</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-36">Significant Planned Procedures</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {fsaRows.map((row) => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors align-top">
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={row.ls}
 onChange={(v) => updateFSARow(row.id, "ls", v)}
 className="w-12 font-mono"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={row.description}
 onChange={(v) => updateFSARow(row.id, "description", v)}
 placeholder="Description"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={row.periodAmount}
 onChange={(v) => updateFSARow(row.id, "periodAmount", v.replace(/[^0-9.]/g, ""))}
 placeholder="0"
 className="tabular-nums"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdSelect
 value={row.materiality}
 onChange={(v) => updateFSARow(row.id, "materiality", v)}
 options={[
 { value: "Yes", label: "Yes" },
 { value: "No", label: "No" },
 ]}
 placeholder="—"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdSelect
 value={row.misstatementLikely}
 onChange={(v) => updateFSARow(row.id, "misstatementLikely", v)}
 options={[
 { value: "Yes", label: "Yes" },
 { value: "No", label: "No" },
 { value: "Maybe", label: "Maybe" },
 ]}
 placeholder="Select…"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdTextarea
 value={row.potentialEffect}
 onChange={(v) => updateFSARow(row.id, "potentialEffect", v)}
 placeholder="Description"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <button
 onClick={() => toast.info("Map Procedures — link your audit procedures here")}
 className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors px-1"
 >
 Map Procedures
 </button>
 </td>
 <td className="px-2 py-2 text-center">
 <button
 onClick={() => setFsaRows((prev) => prev.filter((r) => r.id !== row.id))}
 className="text-muted-foreground hover:text-destructive transition-colors"
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
 onClick={() =>
 setFsaRows((prev) => [
...prev,
 {
 id: uid(),
 ls: "",
 description: "",
 periodAmount: "",
 materiality: "",
 misstatementLikely: "",
 potentialEffect: "",
 procedures: "",
 },
 ])
 }
 >
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
 </div>
 </div>

 {/* ── Pervasive Material Misstatements ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Pervasive Material Misstatements</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Identify any misstatements that could have a pervasive effect across multiple financial statement areas.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Describe potential misstatements</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Describe the overall response planned</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">W/P reference</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {pervasiveRows.map((row) => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top">
 <TdTextarea
 value={row.misstatement}
 onChange={(v) =>
 setPervasiveRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, misstatement: v } : x))
 )
 }
 placeholder="Describe potential misstatements"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdTextarea
 value={row.response}
 onChange={(v) =>
 setPervasiveRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, response: v } : x))
 )
 }
 placeholder="Describe Response"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={row.wpRef}
 onChange={(v) =>
 setPervasiveRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, wpRef: v } : x))
 )
 }
 placeholder="-"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center">
 <div className="flex items-center gap-1.5 justify-center">
 <button
 className="text-muted-foreground hover:text-primary transition-colors"
 title="View document"
 >
 <FileText className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() =>
 setPervasiveRows((prev) => prev.filter((x) => x.id !== row.id))
 }
 className="text-muted-foreground hover:text-destructive transition-colors"
 disabled={pervasiveRows.length === 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
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
 onClick={() =>
 setPervasiveRows((prev) => [
...prev,
 { id: uid(), misstatement: "", response: "", wpRef: "" },
 ])
 }
 >
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
 </div>
 </div>

 {/* ── Financial Statement Disclosures ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Financial Statement Disclosures</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Identify significant disclosures and document planned audit procedures.</TooltipContent>
 </Tooltip>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Describe potential misstatements</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Describe the planned procedures</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">W/P reference</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {disclosureRows.map((row) => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top">
 <TdTextarea
 value={row.misstatement}
 onChange={(v) =>
 setDisclosureRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, misstatement: v } : x))
 )
 }
 placeholder="Describe potential misstatements"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdTextarea
 value={row.procedures}
 onChange={(v) =>
 setDisclosureRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, procedures: v } : x))
 )
 }
 placeholder="Describe planned procedures"
 />
 </td>
 <td className="px-4 py-2.5 align-top">
 <TdInput
 value={row.wpRef}
 onChange={(v) =>
 setDisclosureRows((prev) =>
 prev.map((x) => (x.id === row.id ? {...x, wpRef: v } : x))
 )
 }
 placeholder="-"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center">
 <div className="flex items-center gap-1.5 justify-center">
 <button
 className="text-muted-foreground hover:text-primary transition-colors"
 title="View document"
 >
 <FileText className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() =>
 setDisclosureRows((prev) => prev.filter((x) => x.id !== row.id))
 }
 className="text-muted-foreground hover:text-destructive transition-colors"
 disabled={disclosureRows.length === 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
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
 onClick={() =>
 setDisclosureRows((prev) => [
...prev,
 { id: uid(), misstatement: "", procedures: "", wpRef: "" },
 ])
 }
 >
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
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
 storageKey={`scope-comments-${isUS ? 'us' : 'ca'}`}
 placeholder="Comments"
 className="min-h-[80px] text-sm resize-none bg-background"
 />
 </div>
 </div>

 {/* ── Conclusion ── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 value={conclusion}
 onChange={(e) => setConclusion(e.target.value)}
 className="min-h-[72px] text-sm resize-none bg-background"
 />
 <div className="flex justify-end mt-4">
 <Button
 onClick={() => {
 setConcluded(true);
 toast.success("Engagement scope worksheet concluded");
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
 id: isUS ? "aud-us-scope-worksheet" : "aud-scope-worksheet",
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
