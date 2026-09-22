import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProcRow {
 id: string;
 checked: boolean;
 psc: string;
 response: string;
 wpRef: RefDoc[];
}

interface OIData {
 rows: Record<string, ProcRow>;
 conclusion: string;
 concluded: boolean;
 concludedBy: string;
 concludedOn: string;
}

// ── Procedure definitions ──────────────────────────────────────────────────────

const PROC1_ITEMS = [
 { id: "p1-a", label: "Business plans, financial budgets and cash flow projections." },
 { id: "p1-b", label: "Risk assessments." },
 { id: "p1-c", label: "Terms of new financing arrangements." },
 { id: "p1-d", label: "Significant contracts and agreements." },
 { id: "p1-e", label: "Financial and other reports prepared by management." },
 { id: "p1-f", label: "Minutes of directors'/audit committee meetings." },
 { id: "p1-g", label: "Reports/letters, etc., from regulators or government agencies." },
 { id: "p1-h", label: "Tax assessments and correspondence." },
 { id: "p1-i", label: "Details of actual/threatened litigation, including correspondence with external legal counsel." },
 { id: "p1-j", label: "Policy and procedure manuals." },
 { id: "p1-k", label: "Consultant reports on financial or organizational matters." },
 { id: "p1-l", label: "Communications with staff or TCWG that address organizational changes, views on business practices/ethical behaviour, processes for identifying and responding to the risks of fraud, or other relevant matters." },
 { id: "p1-m", label: "Media articles about the entity, its industry and direct competitors." },
 { id: "p1-n", label: "Other key documents (possibly identified as a result of inquiries of management and others)." },
];

const PROC2_ITEMS = [
 { id: "p2-a", label: "Nature of operations." },
 { id: "p2-b", label: "How operations are organized and managed." },
 { id: "p2-c", label: "Staff and management morale, knowledge and general competency." },
 { id: "p2-d", label: "Poor security over fixed assets and inventories (storage and handling)." },
 { id: "p2-e", label: "Unorganized, obsolete or slow-moving inventory." },
 { id: "p2-f", label: "Idle or unused plant and equipment." },
 { id: "p2-g", label: "Deficiencies in financial control systems and IT support." },
 { id: "p2-h", label: "Possible non-compliance with laws or regulations with a financial impact (such as handling of waste and toxic materials)." },
 { id: "p2-i", label: "Other (specify)." },
];

// Top-level procedure rows (Inspection + Observation)
const TOP_ROWS = [
 {
 id: "proc-1",
 num: "1",
 description: "Inspection of key documents",
 detail: "Obtain and read key entity documents. Then record or update ( or 520) any risk factors identified that may require an audit response. Indicate what documents were inspected, such as:",
 items: PROC1_ITEMS,
 },
 {
 id: "proc-2",
 num: "2",
 description: "Observation of entity operations, premises and plant facilities",
 detail: "Visit the entity's premises, walk around the operations and talk with staff. Record or update ( or equivalent) any risk factors identified that may require an audit response. Consider the following:",
 items: PROC2_ITEMS,
 },
];

// All row ids we need to track
const ALL_ROW_IDS = [
...TOP_ROWS.map((r) => r.id),
...PROC1_ITEMS.map((i) => i.id),
...PROC2_ITEMS.map((i) => i.id),
];

function makeDefaultRow(id: string): ProcRow {
 return { id, checked: false, psc: "", response: "", wpRef: [] };
}

function buildDefault(): OIData {
 const rows: Record<string, ProcRow> = {};
 ALL_ROW_IDS.forEach((id) => { rows[id] = makeDefaultRow(id); });
 return { rows, conclusion: "", concluded: false, concludedBy: "", concludedOn: "" };
}

// ── Column header ──────────────────────────────────────────────────────────────

function ColHeaders() {
 return (
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" />
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider">#</th>
 <th className="w-[200px] px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Description</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 200, minWidth: 200 }}>Procedure successfully completed</th>
 <th className="w-[350px] px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Responses and any difficulties encountered</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 110, minWidth: 110 }}>w/p reference</th>
 </tr>
 </thead>
 );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AuditOIWorksheet({ isUS = false }: { isUS?: boolean }) {
 const storageKey = `audit-oi-data-${isUS ? "us" : "ca"}`;
 const [data, setData] = useState<OIData>(() => {
 const saved = readJsonFromLocalStorage<OIData | null>(storageKey, null);
 if (!saved) return buildDefault();
 const merged = buildDefault();
 merged.conclusion = saved.conclusion ?? "";
 merged.concluded = saved.concluded ?? false;
 merged.concludedBy = saved.concludedBy ?? "";
 merged.concludedOn = saved.concludedOn ?? "";
 if (saved.rows) {
 ALL_ROW_IDS.forEach((id) => {
 if (saved.rows[id]) merged.rows[id] = {...merged.rows[id],...saved.rows[id] };
 });
 }
 return merged;
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const locked = data.concluded;

 function setRow(id: string, patch: Partial<ProcRow>) {
 setData((d) => ({...d, rows: {...d.rows, [id]: {...d.rows[id],...patch } } }));
 }

 function handleConclude() {
 const now = new Date().toISOString().slice(0, 10);
 setData((d) => { const next = {...d, concluded: true, concludedOn: now }; writeJsonToLocalStorage(storageKey, next); return next; });
 }

 // ── Row renderers ────────────────────────────────────────────────────────────

 function TopRow({ proc }: { proc: typeof TOP_ROWS[0] }) {
 const row = data.rows[proc.id];
 return (
 <tr className="hover:bg-muted/50 transition-colors group border-b border-border">
 <td className="px-4 py-3 text-center align-top">
 <Checkbox checked={row.checked} onCheckedChange={(v) => setRow(proc.id, { checked: !!v })} disabled={locked} />
 </td>
 <td className="px-4 py-3 text-center align-top text-sm font-semibold text-foreground font-mono">{proc.num}</td>
 <td className="w-[200px] px-4 py-3 align-top">
 <p className="text-sm font-semibold text-foreground mb-1">{proc.description}</p>
 <p className="text-sm text-muted-foreground leading-relaxed">{proc.detail}</p>
 </td>
 <td className="px-4 py-3 align-top" style={{ width: 200 }}>
 <Select value={row.psc} onValueChange={(v) => setRow(proc.id, { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-background w-full">
 <SelectValue placeholder="Select" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Yes">Yes</SelectItem>
 <SelectItem value="No">No</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="w-[350px] px-4 py-3 align-top">
 <Textarea
 disabled={locked}
 placeholder="Enter your response"
 className="min-h-[88px] text-sm resize-y bg-background"
 value={row.response}
 onChange={(e) => setRow(proc.id, { response: e.target.value })}
 />
 </td>
 <td className="px-4 py-3 align-top text-center" style={{ width: 110 }}>
 <RefButton
 reference={row.wpRef}
 onAttach={(doc) => setRow(proc.id, { wpRef: [...row.wpRef, doc] })}
 onRemove={(i) => setRow(proc.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 );
 }

 function SubRow({ item, letterIdx }: { item: { id: string; label: string }; letterIdx: number }) {
 const row = data.rows[item.id];
 return (
 <tr className="bg-muted/[0.03] hover:bg-muted/40 transition-colors border-b border-border last:border-0">
 <td className="px-4 py-2.5 text-center align-top">
 <Checkbox checked={row.checked} onCheckedChange={(v) => setRow(item.id, { checked: !!v })} disabled={locked} />
 </td>
 <td className="px-4 py-2.5 text-center align-top text-xs text-muted-foreground font-mono">
 {String.fromCharCode(97 + letterIdx)}.
 </td>
 <td className="w-[200px] py-2.5 pl-10 pr-4 align-top border-l-2 border-primary/20">
 <span className="text-sm text-foreground">{item.label}</span>
 </td>
 <td className="px-4 py-2.5 align-top" style={{ width: 200 }}>
 <Select value={row.psc} onValueChange={(v) => setRow(item.id, { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-background w-full">
 <SelectValue placeholder="Select" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Yes">Yes</SelectItem>
 <SelectItem value="No">No</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="w-[350px] px-4 py-2.5 align-top">
 <Textarea
 disabled={locked}
 placeholder="Enter your response"
 className="min-h-[88px] text-sm resize-y bg-background"
 value={row.response}
 onChange={(e) => setRow(item.id, { response: e.target.value })}
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center" style={{ width: 110 }}>
 <RefButton
 reference={row.wpRef}
 onAttach={(doc) => setRow(item.id, { wpRef: [...row.wpRef, doc] })}
 onRemove={(i) => setRow(item.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 );
 }

 // ── Render ───────────────────────────────────────────────────────────────────

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 To provide a listing of typical observation and inspection risk assessment procedures that may support,
 corroborate or contradict other inquiries of management and others, and provide information about the entity
 and its environment. Use this form in conjunction with.{" "}
 <span className="font-medium text-foreground">PSC</span> = Procedure successfully completed.{" "}
 <span className="font-medium text-foreground">TCWG</span> = Those charged with governance.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* One card per procedure */}
 {TOP_ROWS.map((proc) => (
 <div
 key={proc.id}
 className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden"
 >
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">
 {proc.num}. {proc.description}
 </span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <ColHeaders />
 <tbody className="divide-y divide-border">
 <TopRow proc={proc} />
 {proc.items.map((item, idx) => (
 <SubRow key={item.id} item={item} letterIdx={idx} />
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ))}

 {/* Conclusion card */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 </div>
 <div className="px-6 py-5 space-y-4">
 {data.concluded ? (
 <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
 Concluded on {data.concludedOn}
 </div>
 ) : null}
 <Textarea
 disabled={locked}
 placeholder="Document your conclusion and overall assessment of the observation and inspection procedures performed…"
 className="min-h-[80px] text-sm resize-none bg-background"
 value={data.conclusion}
 onChange={(e) => setData((d) => ({...d, conclusion: e.target.value }))}
 />
 <div className="flex justify-end">
 <Button onClick={handleConclude} disabled={locked}>
 Conclude worksheet
 </Button>
 </div>
 </div>
 </div>

 </div>
 </div>

 </div>
 );
}
