import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info, AlertTriangle } from "lucide-react";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { cn } from "@/lib/utils";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

type BiasAnswer = "Yes" | "No" | "N/A" | "";

interface EstimateRow {
 id: string;
 estimateType: string;
 priorAmt: string;
 actualAmt: string;
 explanationVariance: string;
 bias: BiasAnswer;
 implications: string;
}

interface Data514 {
 rows: EstimateRow[];
 conclusion: string;
 concluded: boolean;
 concludedOn: string;
}

const ESTIMATE_TYPE_OPTIONS = [
 "Allowance for Doubtful Accounts",
 "Inventory Obsolescence Reserve",
 "Useful Life of Capital Assets",
 "Accrued Warranty Provision",
 "Employee Future Benefits",
 "Revenue Recognition (Stage of Completion)",
 "Goodwill Impairment",
 "Environmental Remediation Provision",
 "Income Tax Provision",
 "Other",
];

const uid = () => Math.random().toString(36).slice(2, 9);

function newRow(): EstimateRow {
 return {
 id: uid(),
 estimateType: "",
 priorAmt: "",
 actualAmt: "",
 explanationVariance: "",
 bias: "",
 implications: "",
 };
}

function buildDefault(): Data514 {
 return {
 rows: [
 {
 id: uid(),
 estimateType: "Allowance for Doubtful Accounts",
 priorAmt: "245000",
 actualAmt: "218000",
 explanationVariance: "Actual write-offs lower than estimated due to improved collections performance and proactive AR follow-up.",
 bias: "No",
 implications: "Management's estimate appears conservative. Consider adjusting the current-year allowance methodology.",
 },
 {
 id: uid(),
 estimateType: "Inventory Obsolescence Reserve",
 priorAmt: "88000",
 actualAmt: "112000",
 explanationVariance: "Actual obsolescence exceeded estimate following introduction of new product lines that accelerated turnover of legacy SKUs.",
 bias: "Yes",
 implications: "Indicates possible underestimation bias. Obtain management's updated methodology and test reasonableness of current-year reserve.",
 },
 {
 id: uid(),
 estimateType: "Accrued Warranty Provision",
 priorAmt: "156000",
 actualAmt: "149000",
 explanationVariance: "Slight overstatement; fewer warranty claims filed than anticipated, consistent with improved product quality controls.",
 bias: "No",
 implications: "Immaterial difference. No change to audit approach required.",
 },
 ],
 conclusion: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Derived calc helpers ───────────────────────────────────────────────────────

function parseNum(s: string): number | null {
 const n = parseFloat(s.replace(/,/g, ""));
 return isNaN(n) ? null : n;
}

function fmtDollar(n: number | null): string {
 if (n === null) return "—";
 return n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number | null): string {
 if (n === null) return "—";
 return (n * 100).toFixed(1) + "%";
}

function calcRow(row: EstimateRow): { diff: number | null; pct: number | null } {
 const prior = parseNum(row.priorAmt);
 const actual = parseNum(row.actualAmt);
 if (prior === null || actual === null) return { diff: null, pct: null };
 const diff = actual - prior;
 const pct = prior !== 0 ? diff / prior : null;
 return { diff, pct };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 </div>
 {children}
 </div>
 );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Audit514Worksheet({ isUS = false }: { isUS?: boolean }) {
 const storageKey = `audit-514-data-${isUS ? "us" : "ca"}`;

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLDivElement>(null);
 const [data, setData] = useState<Data514>(() => {
 const saved = readJsonFromLocalStorage<Data514 | null>(storageKey, null);
 if (!saved) return buildDefault();
 return {...buildDefault(),...saved };
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const { engagementId = "default" } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const locked = data.concluded;

 function updateRow(id: string, field: keyof EstimateRow, val: string) {
 setData(d => ({...d, rows: d.rows.map(r => r.id === id ? {...r, [field]: val } : r) }));
 }
 function addRow() { setData(d => ({...d, rows: [...d.rows, newRow()] })); }
 function removeRow(id: string) { setData(d => ({...d, rows: d.rows.filter(r => r.id !== id) })); }
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 const calcMap = useMemo(() => {
 const m: Record<string, { diff: number | null; pct: number | null }> = {};
 data.rows.forEach(r => { m[r.id] = calcRow(r); });
 return m;
 }, [data.rows]);

 const biasYesCount = data.rows.filter(r => r.bias === "Yes").length;


 return (
 <div className="flex flex-col h-full">
 {isDemoEngagement && (
 <LukaStatusBar
 isActive={true}
 message={
   lukaState === 'loading'
     ? "Luka is populating fields from prior file and connected sources…"
     : lukaState === 'done'
     ? "Luka has reviewed this section — fields flagged for your review."
     : "Luka is populating information from Xero and prior file…"
 }
 actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.riskAssessment.actions.map(a => ({
   ...a,
   onTrigger: () => {
     setLukaState('loading');
     const r0 = data.rows[0]?.id;
     const r1 = data.rows[1]?.id;
     const r2 = data.rows[2]?.id;
     lukaSequentialFill([
       {
         scrollRef: firstFillRef as unknown as import('react').RefObject<HTMLElement>,
         set: () => {
           if (r0) {
             setData(d => ({...d, rows: d.rows.map(r => r.id !== r0 ? r : {
               ...r,
               estimateType: "Allowance for Doubtful Accounts",
               priorAmt: "245000",
               actualAmt: "218000",
               explanationVariance: "Actual write-offs lower than estimated; improved collections performance and proactive AR follow-up.",
               bias: "No" as BiasAnswer,
               implications: "Management estimate is conservative. Consider adjusting the current-year allowance methodology.",
             })}));
             markLukaFilled(r0);
           }
         },
       },
       {
         set: () => {
           if (r1) {
             setData(d => ({...d, rows: d.rows.map(r => r.id !== r1 ? r : {
               ...r,
               estimateType: "Inventory Obsolescence Reserve",
               priorAmt: "88000",
               actualAmt: "112000",
               explanationVariance: "Actual obsolescence exceeded estimate; new product lines accelerated turnover of legacy SKUs.",
               bias: "Yes" as BiasAnswer,
               implications: "Possible underestimation bias. Obtain updated methodology and test current-year reserve.",
             })}));
             markLukaFilled(r1);
           }
         },
       },
       {
         set: () => {
           if (r2) {
             setData(d => ({...d, rows: d.rows.map(r => r.id !== r2 ? r : {
               ...r,
               estimateType: "Accrued Warranty Provision",
               priorAmt: "156000",
               actualAmt: "149000",
               explanationVariance: "Slight overstatement; fewer warranty claims than anticipated, consistent with improved product quality controls.",
               bias: "No" as BiasAnswer,
               implications: "Immaterial difference. No change to audit approach required.",
             })}));
             markLukaFilled(r2);
           }
         },
       },
     ], () => setLukaState('done'));
   },
 }))}
 />
 )}

 {/* ── Objective bar ─────────────────────────────────────────────────── */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-foreground leading-relaxed">
 <span className="font-semibold text-primary">Objective: </span>
 To facilitate and document the results of reviewing the outcome of previous years&apos; accounting estimates, and assess whether differences indicate possible management bias or require audit response.
 </p>
 </div>
 <div className="p-6 space-y-6">

 {/* ── Management bias summary banner ─────────────────────────────── */}
 {biasYesCount > 0 && (
 <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-2.5">
 <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
 <p className="text-sm text-amber-800 dark:text-amber-300">
 <span className="font-semibold">{biasYesCount} estimate{biasYesCount > 1 ? "s" : ""} indicate possible management bias.</span> Document implications and consider impact on the current period audit response.
 </p>
 </div>
 )}

 {/* ── Estimates table ───────────────────────────────────────────── */}
 {isDemoEngagement && <div ref={firstFillRef} />}
 <SectionCard title="Prior Period Estimates — Outcome Analysis">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Type of Estimate</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Prior Period $</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Actual Outcome $</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Difference $</th>
 <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">% Variance</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Explanation of Variance</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Management Bias?</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Implications for Current Period</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.rows.map(row => {
 const { diff, pct } = calcMap[row.id];
 const hasBias = row.bias === "Yes";

 return (
 <tr key={row.id} className={cn(
 "transition-colors",
 hasBias ? "bg-amber-50/60 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20" : "hover:bg-muted/50",
 isDemoEngagement && lukaHighlightFields.has(row.id) ? "border-l-2 border-violet-400 bg-violet-50/40" : ""
 )}>
 <td className="px-4 py-2.5 align-top min-w-[220px]">
 <Select
 disabled={locked}
 value={row.estimateType}
 onValueChange={v => updateRow(row.id, "estimateType", v)}
 >
 <SelectTrigger className="h-8 text-sm">
 <SelectValue placeholder="Select estimate type…" />
 </SelectTrigger>
 <SelectContent>
 {ESTIMATE_TYPE_OPTIONS.map(opt => (
 <SelectItem key={opt} value={opt}>{opt}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top text-right w-32">
 <Input
 disabled={locked}
 value={row.priorAmt}
 onChange={e => updateRow(row.id, "priorAmt", e.target.value)}
 placeholder="0"
 className="h-8 text-sm tabular-nums text-right"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-right w-32">
 <Input
 disabled={locked}
 value={row.actualAmt}
 onChange={e => updateRow(row.id, "actualAmt", e.target.value)}
 placeholder="0"
 className="h-8 text-sm tabular-nums text-right"
 />
 </td>
 <td className="px-4 py-2.5 align-middle text-right w-28 tabular-nums">
 <span className="text-sm font-mono text-foreground">
 {fmtDollar(diff)}
 </span>
 </td>
 <td className="px-4 py-2.5 align-middle text-right w-24 tabular-nums">
 <span className="text-sm font-mono text-foreground">
 {fmtPct(pct)}
 </span>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[200px]">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has(row.id)}>
 <Input
 disabled={locked}
 value={row.explanationVariance}
 onChange={e => updateRow(row.id, "explanationVariance", e.target.value)}
 placeholder="Reason for variance…"
 className="h-8 text-sm"
 />
 </LukaTypingRow>
 </td>
 <td className="px-4 py-2.5 align-top w-36">
 <Select
 disabled={locked}
 value={row.bias}
 onValueChange={v => updateRow(row.id, "bias", v as BiasAnswer)}
 >
 <SelectTrigger className="h-8 text-sm">
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Yes">Yes — bias indicated</SelectItem>
 <SelectItem value="No">No</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[200px]">
 <Input
 disabled={locked}
 value={row.implications}
 onChange={e => updateRow(row.id, "implications", e.target.value)}
 placeholder="Implications for current period…"
 className="h-8 text-sm"
 />
 </td>
 {!locked && (
 <td className="px-2 py-2.5 align-middle text-center">
 <button
 onClick={() => removeRow(row.id)}
 className="text-muted-foreground hover:text-destructive transition-colors"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 {!locked && (
 <div className="border-t border-border px-4 py-3">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addRow}>
 <Plus className="h-3 w-3" /> Add Estimate
 </Button>
 </div>
 )}
 </SectionCard>

 {/* ── Conclusion ────────────────────────────────────────────────── */}
 <SectionCard title="Overall Conclusion">
 <div className="px-6 py-5 space-y-4">
 <p className="text-sm text-muted-foreground">
 Summarize whether any differences indicate possible management bias and the overall impact on the current period audit.
 </p>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.conclusion} />
 <Textarea
 disabled={locked}
 value={data.conclusion}
 onChange={e => setData(d => ({...d, conclusion: e.target.value }))}
 placeholder="Document your conclusion…"
 className="min-h-[120px] text-sm resize-none bg-background flex-1"
 />
 </div>
 </div>
 </SectionCard>

 <WorksheetSignOff worksheetKey="audit-514" engagementId={engagementId} />

 {locked
 ? <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { setData(d => { const next = {...d, concluded: false, concludedOn: '' }; writeJsonToLocalStorage(storageKey, next); return next; }); }} />
 : <div className="flex justify-end"><Button onClick={() => { const now = new Date().toISOString(); setData(d => { const next = {...d, concluded: true, concludedOn: now }; writeJsonToLocalStorage(storageKey, next); return next; }); }}>Conclude Worksheet</Button></div>
 }

 </div>
 </div>
 </div>
 );
}
