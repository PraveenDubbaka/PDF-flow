// — Final Analytical Procedures (CAS 520 / AU-C 520)
// Aligned with WorksheetShell design standards.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { formatCurrency } from "@/lib/engagementContext";
import { loadRisks520, overallRisk520 } from "@/lib/audit520Bridge";
import { RefButton, type RefDoc } from "@/components/RefButton";
import {
 WorksheetLayout, WorksheetSection, LinkedRisksCard, ConcludeBar,
} from "@/components/audit/WorksheetShell";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

type YN = "Y" | "N" | "";

interface AnalyticalRow {
 id: string;
 caption: string; // line caption (e.g. "Sales")
 preliminary: string; // if available (editable)
 finalAmount: string; // final F/S result
 priorYear: string;
 varianceExplain: string;
 consistent: YN;
 followUp: string;
 wpRef: RefDoc[];
}

interface Data655 {
 rows: AnalyticalRow[];
 ratios: AnalyticalRow[];
 unexpectedRelationships: YN;
 unexpectedRelationshipsNotes: string;
 newRisksIdentified: YN;
 newRisksNotes: string;
 rmmReassessmentNeeded: YN;
 rmmReassessmentNotes: string;
 evidenceSufficient: YN;
 evidenceRationale: string;
 concluded: boolean;
 concludedOn: string;
}

// Seeded captions from CPA — preliminary auto-fills from FSA if available.
const FS_CAPTIONS = [
 "Total sales", "Cost of sales", "Gross margin ($)", "Gross margin (%)",
 "Salaries / payroll", "Occupancy", "Interest / bank charges",
 "Repairs and maintenance", "Bonuses", "Non-recurring transactions",
 "Other expenses", "Net income before tax",
 "Cash", "Investments", "Accounts receivable", "Inventory",
 "Property, plant and equipment", "Other assets", "Total assets",
 "Bank indebtedness", "Accounts payable and accrued liabilities",
 "Deferred revenue", "Customer deposits", "Loans payable",
 "Income taxes payable", "Long-term debt", "Other liabilities",
 "Total equity", "Total liabilities and equity",
];
const RATIO_CAPTIONS = [
 "Working capital", "Days in receivables", "Days sales in inventory",
 "Inventory turnover", "Days purchases in trade payables", "Debt-to-equity ratio",
];

function newRow(caption = ""): AnalyticalRow {
 return {
 id: Math.random().toString(36).slice(2, 9),
 caption,
 preliminary: "", finalAmount: "", priorYear: "",
 varianceExplain: "", consistent: "", followUp: "", wpRef: [],
 };
}

function buildDefault(prelimFromFsas: Record<string, number>): Data655 {
 const matchPrelim = (caption: string) => {
 const cap = caption.toLowerCase();
 for (const k of Object.keys(prelimFromFsas)) {
 if (cap.includes(k.toLowerCase())) return String(prelimFromFsas[k]);
 }
 return "";
 };
 return {
 rows: FS_CAPTIONS.map(c => ({...newRow(c), preliminary: matchPrelim(c) })),
 ratios: RATIO_CAPTIONS.map(c => newRow(c)),
 unexpectedRelationships: "", unexpectedRelationshipsNotes: "",
 newRisksIdentified: "", newRisksNotes: "",
 rmmReassessmentNeeded: "", rmmReassessmentNotes: "",
 evidenceSufficient: "", evidenceRationale: "",
 concluded: false, concludedOn: "",
 };
}

function Label({ children }: { children: React.ReactNode }) {
 return <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">{children}</label>;
}
function YNSelect({ value, onChange, locked }: { value: string; onChange: (v: string) => void; locked: boolean }) {
 return (
 <Select disabled={locked} value={value} onValueChange={onChange}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Yes</SelectItem><SelectItem value="N">No</SelectItem></SelectContent>
 </Select>
 );
}

function num(v: string): number { const n = parseFloat((v || "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; }

export function Audit655Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);

 // Build a caption→preliminary lookup from FSAs in engagement context
 const prelimMap = useMemo(() => {
 const m: Record<string, number> = {};
 for (const f of ctx.fsas) m[f.fsa] = f.amount;
 m["Total assets"] = ctx.tb.totalAssets;
 m["Total equity"] = ctx.tb.netAssets;
 m["Net income before tax"] = ctx.tb.profitBeforeTax;
 m["Total sales"] = ctx.tb.grossRevenue;
 return m;
 }, [ctx]);

 const storageKey = `audit-655-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data655>(() => {
 const def = buildDefault(prelimMap);
 const stored = readJsonFromLocalStorage<Partial<Data655>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data655;
 if (!Array.isArray(merged.rows) || merged.rows.length === 0) merged.rows = def.rows;
 if (!Array.isArray(merged.ratios) || merged.ratios.length === 0) merged.ratios = def.ratios;
 // Migrate legacy string wpRef → RefDoc[]
 const normalize = (r: AnalyticalRow): AnalyticalRow => ({...r, wpRef: Array.isArray(r.wpRef) ? r.wpRef : (r.wpRef ? [{ name: String(r.wpRef) }] : []) });
 merged.rows = merged.rows.map(normalize);
 merged.ratios = merged.ratios.map(normalize);
 return merged;
 });

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLElement>(null);
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }
 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
 if (first.current) { first.current = false; return; }
 if (saveTimer.current) clearTimeout(saveTimer.current);
 saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 const updRow = (which: "rows" | "ratios", id: string, patch: Partial<AnalyticalRow>) =>
 setData(d => ({...d, [which]: d[which].map(r => r.id === id ? {...r,...patch } : r) }));
 const addRow = (which: "rows" | "ratios") =>
 setData(d => ({...d, [which]: [...d[which], newRow()] }));
 const delRow = (which: "rows" | "ratios", id: string) =>
 setData(d => ({...d, [which]: d[which].filter(r => r.id !== id) }));

 function variance(r: AnalyticalRow): { abs: string; pct: string; tone: string } {
 const a = num(r.finalAmount), b = num(r.priorYear);
 if (!b) return { abs: "—", pct: "—", tone: "text-muted-foreground" };
 const diff = a - b;
 const pct = (diff / b) * 100;
 const tone = Math.abs(pct) >= 10 ? "text-amber-700" : "text-muted-foreground";
 return { abs: diff.toLocaleString(undefined, { maximumFractionDigits: 0 }), pct: pct.toFixed(1) + "%", tone };
 }

 const allAddressed = useMemo(() =>
 [...data.rows,...data.ratios].every(r => r.consistent !== "")
, [data]);

 function RowsTable({ which, title, rows }: { which: "rows" | "ratios"; title: string; rows: AnalyticalRow[] }) {
 return (
 <WorksheetSection
 title={title}
 right={<Button size="sm" variant="secondary" className="h-7 text-xs gap-1" disabled={locked} onClick={() => addRow(which)}><Plus className="h-3 w-3 mr-1" />Add line</Button>}
 bodyClassName="p-0"
 >
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead><tr className="bg-muted/40">
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[180px]">Caption</th>
 <th className="text-right px-3 py-2.5 font-medium border-b border-border w-[110px]">Preliminary (501)</th>
 <th className="text-right px-3 py-2.5 font-medium border-b border-border w-[110px]">Final</th>
 <th className="text-right px-3 py-2.5 font-medium border-b border-border w-[110px]">Prior year</th>
 <th className="text-right px-3 py-2.5 font-medium border-b border-border w-[110px]">Variance / %</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border">Explanation</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[90px]">Consistent?</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[140px]">W/P ref.</th>
 <th className="px-3 py-2.5 border-b border-border w-[40px]" />
 </tr></thead>
 <tbody>
 {rows.map((r, ri) => {
 const v = variance(r);
 const fillId = `rows-${ri}-varianceExplain`;
 const isHighlighted = isDemoEngagement && lukaHighlightFields.has(fillId);
 const isFilled = isDemoEngagement && lukaFilledFields.has(fillId);
 return (
 <tr key={r.id} className={`hover:bg-muted/20 align-top${isHighlighted ? ' bg-violet-50/40' : ''}`}>
 <td className="border-b border-border p-2"><Input disabled={locked} value={r.caption} onChange={e => updRow(which, r.id, { caption: e.target.value })} className="h-8 text-sm" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={r.preliminary} onChange={e => updRow(which, r.id, { preliminary: e.target.value })} className="h-8 text-sm font-mono text-right" inputMode="decimal" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={r.finalAmount} onChange={e => updRow(which, r.id, { finalAmount: e.target.value })} className="h-8 text-sm font-mono text-right" inputMode="decimal" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={r.priorYear} onChange={e => updRow(which, r.id, { priorYear: e.target.value })} className="h-8 text-sm font-mono text-right" inputMode="decimal" /></td>
 <td className={`border-b border-border p-2 text-right font-mono text-sm ${v.tone}`}>{v.abs}<div className="text-[10px]">{v.pct}</div></td>
 <td className={`border-b border-border p-2${isHighlighted ? ' border-l-2 border-l-violet-400' : ''}`}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!r.varianceExplain} />
 <div className="flex-1">
 <LukaTypingRow filled={isFilled}>
 <Textarea disabled={locked} value={r.varianceExplain} onChange={e => updRow(which, r.id, { varianceExplain: e.target.value })} className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Explain variance / unexpected relationship" />
 </LukaTypingRow>
 </div>
 </div>
 </td>
 <td className="border-b border-border p-2"><YNSelect value={r.consistent} onChange={v => updRow(which, r.id, { consistent: v as YN })} locked={locked} /></td>
 <td className="border-b border-border p-2"><RefButton reference={r.wpRef} disabled={locked} onAttach={(doc) => updRow(which, r.id, { wpRef: [...r.wpRef, doc] })} onRemove={(idx) => updRow(which, r.id, { wpRef: typeof idx === "number" ? r.wpRef.filter((_, i) => i !== idx) : [] })} /></td>
 <td className="border-b border-border p-2 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" disabled={locked} onClick={() => delRow(which, r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </WorksheetSection>
 );
 }

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Assist in forming an overall conclusion on whether the F/S are consistent with our understanding of the entity, and corroborate the conclusions formed on individual components."
 standard={`${ctx.standardPrefix} 520.6`}
 banner={isDemoEngagement ? (
   <LukaStatusBar
     isActive={true}
     message={
       lukaState === 'loading'
         ? "Luka is populating fields from prior file and connected sources…"
         : lukaState === 'done'
         ? "Luka has reviewed this section — fields flagged for your review."
         : "Luka is populating information from Xero and prior file…"
     }
     actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.completion.actions.map(a => ({
       ...a,
       onTrigger: () => {
         setLukaState('loading');
         lukaSequentialFill([
           { scrollRef: firstFillRef as React.RefObject<HTMLElement>, set: () => {
               setData(d => ({ ...d, rows: d.rows.map((r, i) => i === 0 ? { ...r, varianceExplain: 'Revenue consistent with prior year within expectations. Organic growth of 4.2% reflects new customer additions in Q3/Q4. Variance within acceptable range — no further procedures required.' } : r) }));
               markLukaFilled('rows-0-varianceExplain');
             }
           },
           { set: () => {
               setData(d => ({ ...d, rows: d.rows.map((r, i) => i === 3 ? { ...r, varianceExplain: 'Gross margin percentage consistent with prior year. Minor 0.3pp decline explained by freight cost increases passed through to COGS. Management confirmed no changes to pricing strategy.' } : r) }));
               markLukaFilled('rows-3-varianceExplain');
             }
           },
           { set: () => {
               setData(d => ({ ...d, evidenceRationale: 'Final analytical procedures performed over all significant statement of operations and financial position line items and key ratios. Results consistent with our understanding of the entity and audit evidence obtained. No unexpected relationships identified requiring additional investigation.' }));
               markLukaFilled('evidenceRationale');
             }
           },
         ], () => setLukaState('done'));
       },
     }))}
   />
 ) : undefined}
 >
 <WorksheetSection title="Performance materiality">
 <div className="text-sm font-mono">{formatCurrency(ctx.performanceMateriality)}</div>
 </WorksheetSection>

 <LinkedRisksCard overallRisk={overall} risks={risks}
 emptyHint="No risks loaded Identified risks help frame which variances warrant additional inquiry."
 storageKey={`audit-655-risks-${engagementId ?? "default"}`} locked={locked} />

 <div ref={firstFillRef as React.RefObject<HTMLDivElement>}>
 <RowsTable which="rows" title="Statement of operations & financial position" rows={data.rows} />
 </div>
 <RowsTable which="ratios" title="Key ratios" rows={data.ratios} />

 <WorksheetSection title="Overall evaluation">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div><Label>Unexpected relationships identified?</Label><YNSelect value={data.unexpectedRelationships} onChange={v => setData(d => ({...d, unexpectedRelationships: v as YN }))} locked={locked} /></div>
 <div><Label>New risk factors identified?</Label><YNSelect value={data.newRisksIdentified} onChange={v => setData(d => ({...d, newRisksIdentified: v as YN }))} locked={locked} /></div>
 <div><Label>RMM reassessment needed?</Label><YNSelect value={data.rmmReassessmentNeeded} onChange={v => setData(d => ({...d, rmmReassessmentNeeded: v as YN }))} locked={locked} /></div>
 {data.unexpectedRelationships === "Y" && (
 <div className="md:col-span-3"><Label>Unexpected relationships — nature & response</Label>
 <div className="flex items-start gap-1.5"><GreenDot show={!!data.unexpectedRelationshipsNotes} /><div className="flex-1"><AttributedComment value={data.unexpectedRelationshipsNotes} onChange={v => setData(d => ({...d, unexpectedRelationshipsNotes: v }))} storageKey={`655-${engagementId ?? "def"}-unexpRel`} placeholder="Describe inconsistencies with our understanding of the entity and the additional procedures performed." disabled={locked} className="text-sm min-h-[72px]" /></div></div>
 </div>
 )}
 {data.newRisksIdentified === "Y" && (
 <div className="md:col-span-3"><Label>New risks — nature & resolution</Label>
 <div className="flex items-start gap-1.5"><GreenDot show={!!data.newRisksNotes} /><Textarea disabled={locked} value={data.newRisksNotes} onChange={e => setData(d => ({...d, newRisksNotes: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="Document the risk and how it was resolved (update Forms 520 / 590)." /></div>
 </div>
 )}
 {data.rmmReassessmentNeeded === "Y" && (
 <div className="md:col-span-3"><Label>RMM reassessment notes</Label>
 <div className="flex items-start gap-1.5"><GreenDot show={!!data.rmmReassessmentNotes} /><Textarea disabled={locked} value={data.rmmReassessmentNotes} onChange={e => setData(d => ({...d, rmmReassessmentNotes: e.target.value }))} className="flex-1 text-sm min-h-[64px]" placeholder="Required updates / 590." /></div>
 </div>
 )}
 </div>
 </WorksheetSection>

 <WorksheetSection title={`Audit conclusion (${ctx.standardPrefix} 520)`}
 right={allAddressed && data.evidenceSufficient === "" ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">All lines addressed — ready to conclude</span>
 ) : null}
 >
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
 <div><Label>Final analytics support audit conclusions?</Label><YNSelect value={data.evidenceSufficient} onChange={v => setData(d => ({...d, evidenceSufficient: v as YN }))} locked={locked} /></div>
 <div className={isDemoEngagement && lukaHighlightFields.has('evidenceRationale') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}>
 <Label>Rationale</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.evidenceRationale} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('evidenceRationale')}>
 <Textarea disabled={locked} value={data.evidenceRationale} onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="The final analytical procedures corroborate the conclusions formed during the audit and no unidentified RMM was identified." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-655"
 engagementId={engagementId}
 concluded={data.concluded}
 concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 />
 </WorksheetLayout>
 );
}
