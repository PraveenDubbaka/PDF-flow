import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { formatCurrency } from "@/lib/engagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";
import { cn } from "@/lib/utils";

type YN = "Y" | "N" | "";
type RefField = RefDoc[];

interface MisstatementRow {
 id: string;
 description: string;
 circumstances: string;
 assets: string;
 liabilities: string;
 pretaxIncome: string;
 equity: string;
 disclosures: string;
 corrected: YN;
 wpRef: RefField;
}

interface EvalItem {
 psc: "Y" | "N" | "NA" | "";
 response: string;
 wpRef: RefField;
}

interface Data335 {
 performanceMateriality: string;
 trivialThreshold: string;
 rows: MisstatementRow[];
 eval1: EvalItem;
 eval2: EvalItem;
 eval3: EvalItem;
 eval4: EvalItem;
 conclusion: string;
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

function blankRow(idx: number): MisstatementRow {
 return {
  id: `row-${Date.now()}-${idx}`,
  description: "",
  circumstances: "",
  assets: "",
  liabilities: "",
  pretaxIncome: "",
  equity: "",
  disclosures: "",
  corrected: "",
  wpRef: [],
 };
}

function blankEval(): EvalItem { return { psc: "", response: "", wpRef: [] }; }

function parseAmt(s: string): number {
 if (!s.trim()) return 0;
 const neg = s.includes("(") || s.trim().startsWith("-");
 const n = parseFloat(s.replace(/[^0-9.]/g, ""));
 return isNaN(n) ? 0 : (neg ? -n : n);
}

function fmtTotalAmt(n: number): string {
 if (n === 0) return "—";
 const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 return n < 0 ? `(${abs})` : abs;
}

const CONCLUSION_DEFAULT =
 "In my opinion, the identified and uncorrected misstatements (if any) are not material, either individually or in aggregate, to the financial statements.\n\n[If misstatements are material, explain why and describe the impact on the auditor's opinion.]";

const EVAL_ITEMS = [
 {
  num: "1.",
  text: "Revise the overall/performance materiality for any new information obtained that would have caused a different amount to have been initially determined. Consider changes in financial statement users, operations and financial results.",
 },
 {
  num: "2.",
  text: "Describe additional work required: as a result of a change in overall/performance materiality; where the aggregate of accumulated misstatements approaches or exceeds performance materiality; or where the nature of the misstatements indicates that other misstatements may exist.",
 },
 {
  num: "3.",
  text: "Identify and discuss with management: any patterns in the misstatements that might indicate possible management bias or possible fraud; the effect of identified misstatements on compliance with regulatory requirements, debt or other contractual covenants, or individual line items.",
 },
 {
  num: "4.",
  text: "Ask management to correct all identified misstatements. Document management's reasoning if any are not corrected. Communicate uncorrected misstatements to TCWG and obtain written representation that management believes uncorrected misstatements are immaterial (CAS 450).",
 },
];

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-3 py-2.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";

export function Audit335Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-335-data-${engagementId ?? "default"}`;

 const seeded = useMemo(() => ({
  performanceMateriality: formatCurrency(ctx.performanceMateriality),
  trivialThreshold: formatCurrency(ctx.clearlyTrivial),
 }), [ctx.performanceMateriality, ctx.clearlyTrivial]);

 const [data, setData] = useState<Data335>(() => {
  const saved = readJsonFromLocalStorage<Data335>(storageKey, null);
  if (saved) return saved;
  return {
   performanceMateriality: seeded.performanceMateriality,
   trivialThreshold: seeded.trivialThreshold,
   rows: Array.from({ length: 8 }, (_, i) => blankRow(i)),
   eval1: blankEval(), eval2: blankEval(), eval3: blankEval(), eval4: blankEval(),
   conclusion: CONCLUSION_DEFAULT,
   signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
   concluded: false, concludedOn: "",
  };
 });

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 // ── Import from 670 Journal Entry Testing ────────────────────────────────────
 const je670Available = useMemo(() => {
  const je670 = readJsonFromLocalStorage<{ entries?: { id: string; outcome: string; accounts: string; amount: string; attributes: string; rationale: string }[] }>(
   `audit-670-data-${engagementId ?? "default"}`, null,
  );
  return (je670?.entries ?? []).filter(e => e.outcome === "Misstatement identified");
 }, [engagementId]);

 const alreadyImportedIds = useMemo(() => new Set(data.rows.map(r => r.id)), [data.rows]);

 function importFrom670() {
  const newRows = je670Available
   .filter(e => !alreadyImportedIds.has(`670-${e.id}`))
   .map(e => ({
    ...blankRow(0),
    id: `670-${e.id}`,
    description: e.accounts || "",
    circumstances: e.attributes || e.rationale || "Identified during journal entry testing (670)",
    pretaxIncome: e.amount || "",
   }));
  if (newRows.length === 0) return;
  setData(d => ({
   ...d,
   rows: [...d.rows.filter(r => r.description !== "" || r.pretaxIncome !== ""), ...newRows],
  }));
 }

 const newToImport = je670Available.filter(e => !alreadyImportedIds.has(`670-${e.id}`)).length;

 // ── Auto-calculated totals ──────────────────────────────────────────────────
 const totals = useMemo(() => {
  const sum = (field: keyof Pick<MisstatementRow, "assets"|"liabilities"|"pretaxIncome"|"equity">) => ({
   total: data.rows.reduce((a, r) => a + parseAmt(r[field]), 0),
   corrected: data.rows.filter(r => r.corrected === "Y").reduce((a, r) => a + parseAmt(r[field]), 0),
   uncorrected: data.rows.filter(r => r.corrected === "N").reduce((a, r) => a + parseAmt(r[field]), 0),
  });
  return {
   assets: sum("assets"),
   liabilities: sum("liabilities"),
   pretaxIncome: sum("pretaxIncome"),
   equity: sum("equity"),
  };
 }, [data.rows]);

 const totalUncorrectedPretax = totals.pretaxIncome.uncorrected;
 const pm = parseAmt(data.performanceMateriality);
 const trivial = parseAmt(data.trivialThreshold);
 const absUncorrected = Math.abs(totalUncorrectedPretax);

 // ── Helpers ─────────────────────────────────────────────────────────────────
 function updRow(id: string, patch: Partial<MisstatementRow>) {
  setData(d => ({ ...d, rows: d.rows.map(r => r.id === id ? { ...r, ...patch } : r) }));
 }
 function addRow() {
  setData(d => ({ ...d, rows: [...d.rows, blankRow(d.rows.length)] }));
 }
 function removeRow(id: string) {
  setData(d => ({ ...d, rows: d.rows.filter(r => r.id !== id) }));
 }
 function setEval(key: "eval1"|"eval2"|"eval3"|"eval4", patch: Partial<EvalItem>) {
  setData(d => ({ ...d, [key]: { ...d[key], ...patch } }));
 }

 // ── PM gauge ─────────────────────────────────────────────────────────────────
 let gaugeColor = "bg-green-500";
 let gaugeLabel = "Within trivial threshold";
 let GaugeIcon = CheckCircle2;
 let gaugeTextColor = "text-green-700 dark:text-green-400";
 if (pm > 0 && absUncorrected > trivial && absUncorrected <= pm * 0.75) {
  gaugeColor = "bg-amber-400"; gaugeLabel = "Approaching performance materiality";
  GaugeIcon = Info; gaugeTextColor = "text-amber-700 dark:text-amber-400";
 } else if (pm > 0 && absUncorrected > pm * 0.75 && absUncorrected <= pm) {
  gaugeColor = "bg-orange-500"; gaugeLabel = "Near performance materiality — review required";
  GaugeIcon = AlertTriangle; gaugeTextColor = "text-orange-700 dark:text-orange-400";
 } else if (pm > 0 && absUncorrected > pm) {
  gaugeColor = "bg-destructive"; gaugeLabel = "Exceeds performance materiality — opinion impacted";
  GaugeIcon = AlertTriangle; gaugeTextColor = "text-destructive";
 }
 const gaugeWidth = pm > 0 ? Math.min(100, (absUncorrected / pm) * 100) : 0;

 // ── Totals row renderer ──────────────────────────────────────────────────────
 function TotalsRow({ label, getter }: { label: string; getter: (k: keyof typeof totals) => number }) {
  return (
   <tr className="bg-muted/30">
    <td className={TD + " font-semibold"} colSpan={3}>{label}</td>
    <td className={TD + " text-right font-mono text-xs"}>{fmtTotalAmt(getter("assets"))}</td>
    <td className={TD + " text-right font-mono text-xs"}>{fmtTotalAmt(getter("liabilities"))}</td>
    <td className={TD + " text-right font-mono text-xs"}>{fmtTotalAmt(getter("pretaxIncome"))}</td>
    <td className={TD + " text-right font-mono text-xs"}>{fmtTotalAmt(getter("equity"))}</td>
    <td className={TD} />
    <td className={TD} />
    <td className={TD} />
    <td className={TD} />
   </tr>
  );
 }

 return (
  <WorksheetLayout
   heading="Canada > Completion & Signoffs"
   objective="To document misstatements identified during the audit and to evaluate their effect on the audit and on the financial statements."
   standard={`${ctx.standardPrefix} 450`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="335"
    title="Summary of Identified Misstatements"
    standard={`${ctx.standardPrefix} 450`}
    overallRisk={undefined}
   />

   {/* ── Materiality Header ─────────────────────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-4 grid grid-cols-2 gap-4">
     <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
       Performance materiality ($)
      </label>
      <Input
       disabled={locked}
       value={data.performanceMateriality}
       onChange={e => setData(d => ({ ...d, performanceMateriality: e.target.value }))}
       placeholder="e.g. 87,500.00"
       className="h-9 text-sm"
      />
      <p className="text-xs text-muted-foreground">Pre-filled from engagement context</p>
     </div>
     <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
       Trivial threshold — misstatements under this amount need not be recorded below ($)
      </label>
      <Input
       disabled={locked}
       value={data.trivialThreshold}
       onChange={e => setData(d => ({ ...d, trivialThreshold: e.target.value }))}
       placeholder="e.g. 6,250.00"
       className="h-9 text-sm"
      />
     </div>
    </div>
   </div>

   {/* ── Misstatements Table ────────────────────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
     <div>
      <span className="text-sm font-semibold text-foreground">Identified misstatements</span>
      <span className="ml-2 text-xs text-muted-foreground">Positive = overstatement · Negative / (brackets) = understatement</span>
     </div>
     {!locked && je670Available.length > 0 && (
      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={importFrom670}>
       <Download className="h-3 w-3" />
       {newToImport > 0 ? `Import ${newToImport} from JE Testing (670)` : "All JE misstatements imported"}
      </Button>
     )}
    </div>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[1100px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-8 text-center"}>#</th>
        <th className={TH + " min-w-[180px]"}>Description of misstatement</th>
        <th className={TH + " min-w-[150px]"}>Circumstances of occurrence</th>
        <th className={TH + " w-24 text-right"}>Assets</th>
        <th className={TH + " w-24 text-right"}>Liabilities</th>
        <th className={TH + " w-24 text-right"}>Pre-tax income</th>
        <th className={TH + " w-20 text-right"}>Equity</th>
        <th className={TH + " w-36"}>F/S disclosures</th>
        <th className={TH + " w-24 text-center"}>Corrected?</th>
        <th className={TH + " w-20 text-center"}>W/P Ref.</th>
        <th className={TH + " w-8"} />
       </tr>
      </thead>
      <tbody>
       {data.rows.map((row, idx) => {
        const isCorrected = row.corrected === "Y";
        const isUncorrected = row.corrected === "N";
        return (
         <tr
          key={row.id}
          className={cn(
           "hover:bg-muted/20 transition-colors",
           isCorrected && "bg-green-50/40 dark:bg-green-950/20",
           isUncorrected && "bg-amber-50/40 dark:bg-amber-950/20",
          )}
         >
          <td className={TD + " text-center text-muted-foreground font-medium w-8"}>{idx + 1}.</td>
          <td className={TD + " min-w-[180px]"}>
           <Textarea disabled={locked} value={row.description}
            onChange={e => updRow(row.id, { description: e.target.value })}
            placeholder="Describe the misstatement…"
            className="min-h-[60px] text-sm resize-none" />
          </td>
          <td className={TD + " min-w-[150px]"}>
           <Textarea disabled={locked} value={row.circumstances}
            onChange={e => updRow(row.id, { circumstances: e.target.value })}
            placeholder="How was it identified…"
            className="min-h-[60px] text-sm resize-none" />
          </td>
          {(["assets","liabilities","pretaxIncome","equity"] as const).map(col => (
           <td key={col} className={TD + " w-24"}>
            <Input disabled={locked} value={(row as unknown as Record<string, string>)[col]}
             onChange={e => updRow(row.id, { [col]: e.target.value })}
             placeholder="0.00" className="h-8 text-sm text-right" />
           </td>
          ))}
          <td className={TD + " w-36"}>
           <Textarea disabled={locked} value={row.disclosures}
            onChange={e => updRow(row.id, { disclosures: e.target.value })}
            placeholder="Disclosure impact…"
            className="min-h-[60px] text-sm resize-none" />
          </td>
          <td className={TD + " w-24 text-center"}>
           <Select disabled={locked} value={row.corrected}
            onValueChange={v => updRow(row.id, { corrected: v as YN })}>
            <SelectTrigger className={cn(
             "text-sm h-9",
             isCorrected && "border-green-400 text-green-700 dark:text-green-400",
             isUncorrected && "border-amber-400 text-amber-700 dark:text-amber-400",
            )}>
             <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
             <SelectItem value="Y">Y — Corrected</SelectItem>
             <SelectItem value="N">N — Uncorrected</SelectItem>
            </SelectContent>
           </Select>
          </td>
          <td className={TD + " w-20 text-center"}>
           <RefButton reference={row.wpRef}
            onAttach={doc => updRow(row.id, { wpRef: [...row.wpRef, doc] })}
            onRemove={i => updRow(row.id, { wpRef: row.wpRef.filter((_, i2) => i2 !== i) })}
            disabled={locked} />
          </td>
          <td className={TD + " w-8 text-center"}>
           {!locked && (
            <button onClick={() => removeRow(row.id)}
             className="text-muted-foreground hover:text-destructive transition-colors">
             <Trash2 className="h-3.5 w-3.5" />
            </button>
           )}
          </td>
         </tr>
        );
       })}

       {/* ── Totals ────────────────────────────────────────────────────── */}
       <TotalsRow label="Total of identified misstatements" getter={k => totals[k].total} />
       <TotalsRow label="Misstatements corrected by management" getter={k => totals[k].corrected} />
       <TotalsRow label="Total uncorrected misstatements" getter={k => totals[k].uncorrected} />
      </tbody>
     </table>
    </div>
    {!locked && (
     <div className="px-4 py-3 border-t border-border">
      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
      <Plus className="h-3 w-3" /> Add Row
     </Button>
     </div>
    )}
   </div>

   {/* ── PM Gauge ──────────────────────────────────────────────────────── */}
   {pm > 0 && (
    <div className={cn(CARD, "p-5")}>
     <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-foreground">Uncorrected misstatements vs. performance materiality (pre-tax income)</span>
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", gaugeTextColor)}>
       <GaugeIcon className="h-3.5 w-3.5" />
       {gaugeLabel}
      </div>
     </div>
     <div className="h-2.5 rounded-full bg-muted overflow-hidden">
      <div
       className={cn("h-full rounded-full transition-all duration-500", gaugeColor)}
       style={{ width: `${gaugeWidth}%` }}
      />
     </div>
     <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
      <span>$0</span>
      <span className="font-mono">
       {fmtTotalAmt(totalUncorrectedPretax)} uncorrected
       {pm > 0 && ` / $${data.performanceMateriality} PM`}
      </span>
      <span>PM</span>
     </div>
    </div>
   )}

   {/* ── Evaluation of Misstatements ──────────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-3.5 border-b border-border">
     <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Evaluation of misstatements</span>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-[42%]"}>Evaluation of misstatements</th>
        <th className={TH + " w-[90px] text-center"}>PSC?</th>
        <th className={TH}>Document the response and any difficulties encountered</th>
        <th className={TH + " w-24 text-center"}>W/P Ref.</th>
       </tr>
      </thead>
      <tbody>
       {EVAL_ITEMS.map((item, i) => {
        const key = `eval${i + 1}` as "eval1"|"eval2"|"eval3"|"eval4";
        const evalData = data[key];
        return (
         <tr key={key} className="hover:bg-muted/20">
          <td className={TD + " w-[42%]"}>
           <span className="font-medium">{item.num}</span>{" "}{item.text}
          </td>
          <td className={TD + " w-[90px] text-center"}>
           <Select disabled={locked} value={evalData.psc}
            onValueChange={v => setEval(key, { psc: v as EvalItem["psc"] })}>
            <SelectTrigger className={cn(
             "text-sm h-9 w-20 mx-auto",
             evalData.psc === "Y" && "border-green-400 text-green-700 dark:text-green-400",
             evalData.psc === "N" && "border-destructive text-destructive",
            )}>
             <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
             <SelectItem value="Y">Y</SelectItem>
             <SelectItem value="N">N</SelectItem>
             <SelectItem value="NA">N/A</SelectItem>
            </SelectContent>
           </Select>
          </td>
          <td className={TD}>
           <Textarea disabled={locked} value={evalData.response}
            onChange={e => setEval(key, { response: e.target.value })}
            placeholder="Document response and any difficulties encountered…"
            className="min-h-[72px] text-sm resize-none" />
          </td>
          <td className={TD + " w-24 text-center"}>
           <RefButton
            reference={evalData.wpRef}
            onAttach={doc => setEval(key, { wpRef: [...evalData.wpRef, doc] })}
            onRemove={i => setEval(key, { wpRef: evalData.wpRef.filter((_, i2) => i2 !== i) })}
            disabled={locked}
           />
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
   </div>

   {/* ── Conclusion ───────────────────────────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-3.5 border-b border-border">
     <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Conclusion</span>
    </div>
    <div className="p-5">
     <Textarea
      disabled={locked}
      value={data.conclusion}
      onChange={e => setData(d => ({ ...d, conclusion: e.target.value }))}
      className="min-h-[120px] text-sm resize-none"
     />
    </div>
   </div>

   <ConcludeBar
    worksheetKey="audit-335"
    engagementId={engagementId}
    concluded={data.concluded}
    concludedOn={data.concludedOn}
    onConclude={() => {
     const u = { ...data, concluded: true, concludedOn: new Date().toISOString() };
     setData(u); writeJsonToLocalStorage(storageKey, u);
    }}
    onReopen={() => {
     const u = { ...data, concluded: false, concludedOn: "" };
     setData(u); writeJsonToLocalStorage(storageKey, u);
    }}
   />
  </WorksheetLayout>
 );
}
