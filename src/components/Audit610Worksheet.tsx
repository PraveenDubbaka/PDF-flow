import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext, } from "@/hooks/useEngagementContext";
import { loadRisks520, overallRisk520 } from "@/lib/audit520Bridge";
import { formatCurrency } from "@/lib/engagementContext";
import {
 WorksheetLayout, WorksheetHeader, LinkedRisksCard, ConcludeBar, type SignOffData,
} from "@/components/audit/WorksheetShell";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ─── Sample-plan calculator (mirrors the spreadsheet on pages 1-3 of the source workbook) ──
type Method = "statistical" | "non-statistical";

interface SamplePlan {
 fsArea: string;
 assertions: string;
 purpose: string;
 populationDesc: string;
 controlsTested: string;
 riskLevel: "Low" | "Moderate" | "High";
 totalValue: string; // A
 numberOfItems: string;
 keyItemsNature: string;
 keyItemsValue: string; // B
 keyItemsCount: string;
 performanceMateriality: string; // D
 confidenceFactor: string; // E (statistical only)
 method: Method;
}

interface TestResultItem {
 id: string;
 originalValue: string;
 auditedValue: string;
 reason: string;
}

interface Data610 {
 plan: SamplePlan;
 documentation: string;
 replacements: string;
 anomalies: string;
 results: TestResultItem[];
 testObjectivesMet: "Y" | "N" | "";
 testObjectivesMetExplain: string;
 deviationsOtherAreas: "Y" | "N" | "";
 deviationsOtherAreasExplain: string;
 conclusion: string;
 signOff: SignOffData;
 concluded: boolean; concludedOn: string;
}

function num(v: string): number { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }

function newRow(): TestResultItem { return { id: Math.random().toString(36).slice(2), originalValue: "", auditedValue: "", reason: "" }; }

function buildDefault(initialPM: number): Data610 {
 return {
 plan: {
 fsArea: "", assertions: "", purpose: "", populationDesc: "", controlsTested: "",
 riskLevel: "Moderate",
 totalValue: "", numberOfItems: "",
 keyItemsNature: "", keyItemsValue: "0", keyItemsCount: "0",
 performanceMateriality: initialPM ? String(Math.round(initialPM)) : "",
 confidenceFactor: "1.6",
 method: "statistical",
 },
 documentation: "",
 replacements: "",
 anomalies: "",
 results: Array.from({ length: 5 }, newRow),
 testObjectivesMet: "", testObjectivesMetExplain: "",
 deviationsOtherAreas: "", deviationsOtherAreasExplain: "",
 conclusion: "",
 signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
 concluded: false, concludedOn: "",
 };
}

export function Audit610Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();
 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);

 const storageKey = `audit-610-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data610>(() => {
 const def = buildDefault(ctx.performanceMateriality);
 const stored = readJsonFromLocalStorage<Partial<Data610>>(storageKey, def) ?? def;
 return {
...def,
...stored,
 plan: {...def.plan,...(stored.plan ?? {}) },
 results: stored.results?.length ? stored.results : def.results,
 signOff: {...def.signOff,...(stored.signOff ?? {}) },
 } as Data610;
 });

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
 if (first.current) { first.current = false; return; }
 if (saveTimer.current) clearTimeout(saveTimer.current);
 saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;
 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLDivElement>(null);
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }
 const p = data.plan;

 // Derived calculations (matches the source spreadsheet)
 const A = num(p.totalValue);
 const B = num(p.keyItemsValue);
 const C = Math.max(A - B, 0); // remaining population
 const D = num(p.performanceMateriality);
 const E = num(p.confidenceFactor) || 0;
 const F = E > 0 ? D / E : 0; // sampling interval
 const G = F > 0 ? Math.ceil(C / F) : 0; // sample size

 // Projected misstatements
 const projected = data.results.reduce((acc, r) => {
 const ov = num(r.originalValue), av = num(r.auditedValue);
 const m = ov - av;
 const pctMis = ov !== 0 ? m / ov : 0;
 const proj = data.plan.method === "statistical" ? pctMis * F : m;
 return acc + proj;
 }, 0);

 const upd = <K extends keyof SamplePlan>(k: K, v: SamplePlan[K]) =>
 setData(d => ({...d, plan: {...d.plan, [k]: v } }));

 const updResult = (id: string, field: keyof TestResultItem, value: string) =>
 setData(d => ({...d, results: d.results.map(r => r.id === id ? {...r, [field]: value } : r) }));

 const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
 <label className="text-xs font-medium text-foreground block mb-1.5">{children}{hint && <span className="text-muted-foreground font-normal"> · {hint}</span>}</label>
 );
 const Stat = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
 <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
 <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
 <div className={`text-sm font-semibold text-foreground mt-0.5 ${mono ? "tabular-nums" : ""}`}>{value}</div>
 </div>
 );

 const th = "px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap";
 const td = "px-4 py-2.5 align-top text-sm";

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Use statistical or non-statistical (judgmental) sampling to provide a reasonable basis for conclusions about the population from which the sample is selected."
 standard={`${ctx.standardPrefix} 530`}
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
          {
            scrollRef: firstFillRef,
            set: () => {
              setData(d => ({ ...d, plan: { ...d.plan, fsArea: 'Accounts Receivable', assertions: 'Existence, Valuation, Cut-off', purpose: 'Verify that accounts receivable balances exist and are properly stated at period end.' } }));
              markLukaFilled('plan-fsArea');
            }
          },
          {
            set: () => {
              setData(d => ({ ...d, plan: { ...d.plan, populationDesc: 'All A/R invoice items outstanding as at December 31, 2025 with a balance > $500. Total population: $2,847,650 (412 items).', controlsTested: 'Invoice authorization controls reviewed — no material exceptions noted.' } }));
              markLukaFilled('plan-population');
            }
          },
          {
            set: () => {
              setData(d => ({ ...d, documentation: 'Sample selection performed using Audit Command Language (ACL). Random sample of 25 items selected from stratified population. All items traced to supporting invoices, shipping documents, and subsequent cash receipts.' }));
              markLukaFilled('documentation');
            }
          },
        ], () => setLukaState('done'));
      },
    }))}
  />
 ) : undefined}
 >
 <WorksheetHeader
 ctx={ctx}
 formNo="610"
 title="Sampling — Tests of Details"
 standard={`${ctx.standardPrefix} 530`}
 overallRisk={overall}
 />


 <LinkedRisksCard overallRisk={overall} risks={risks.filter(r => r.source === "B")} storageKey={`audit-610-risks-${engagementId ?? "default"}`} locked={locked} emptyHint="Add assertion-level risks in to scope this sample." />

 {/* ── Plan inputs ── */}
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="text-sm font-semibold text-foreground">1 · Sample design</h3></div>
 <div className="p-4 grid grid-cols-2 gap-4">
 <div ref={firstFillRef} className={isDemoEngagement && lukaHighlightFields.has('plan-fsArea') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}>
 <Label>Financial-statement area</Label>
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('plan-fsArea')}>
   <Input disabled={locked} value={p.fsArea} onChange={e => upd("fsArea", e.target.value)} className="h-8 text-sm" placeholder="e.g. Accounts Receivable" />
 </LukaTypingRow>
 </div>
 <div><Label>Assertion(s) addressed</Label><Input disabled={locked} value={p.assertions} onChange={e => upd("assertions", e.target.value)} className="h-8 text-sm" placeholder="e.g. C, AV, E" /></div>
 <div className="col-span-2"><Label>Purpose of the audit procedure</Label><div className="flex items-start gap-1.5"><GreenDot show={!!p.purpose} /><div className="flex-1"><AttributedComment value={p.purpose} onChange={v => upd("purpose", v)} storageKey={`610-${engagementId ?? "def"}-purpose`} placeholder="Describe what the test is intended to detect or substantiate" disabled={locked} className="text-sm min-h-[60px]" /></div></div></div>
 <div className={`col-span-2${isDemoEngagement && lukaHighlightFields.has('plan-population') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}`}>
 <Label>Population characteristics</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!p.populationDesc} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('plan-population')}>
   <Textarea disabled={locked} value={p.populationDesc} onChange={e => upd("populationDesc", e.target.value)} className="flex-1 text-sm min-h-[60px]" placeholder="e.g. all customer invoices issued during the period, excluding intercompany" />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 <div className="col-span-2"><Label>Controls also tested (if any) and cross-reference</Label><div className="flex items-start gap-1.5"><GreenDot show={!!p.controlsTested} /><div className="flex-1"><AttributedComment value={p.controlsTested} onChange={v => upd("controlsTested", v)} storageKey={`610-${engagementId ?? "def"}-controlsTested`} placeholder="None / describe and reference WP" disabled={locked} className="text-sm min-h-[48px]" /></div></div></div>
 <div>
 <Label>Assessed RMM</Label>
 <Select disabled={locked} value={p.riskLevel} onValueChange={(v: SamplePlan["riskLevel"]) => upd("riskLevel", v)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Moderate">Moderate</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
 </Select>
 </div>
 <div>
 <Label>Evaluation method</Label>
 <Select disabled={locked} value={p.method} onValueChange={(v: Method) => upd("method", v)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent><SelectItem value="statistical">Statistical (MUS)</SelectItem><SelectItem value="non-statistical">Non-statistical</SelectItem></SelectContent>
 </Select>
 </div>
 </div>
 </div>

 {/* ── Sizing ── */}
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="text-sm font-semibold text-foreground">2 · Population, key items &amp; sample size</h3></div>
 <div className="p-4 grid grid-cols-3 gap-4">
 <div><Label hint="A">Total monetary value $</Label><Input disabled={locked} value={p.totalValue} onChange={e => upd("totalValue", e.target.value)} className="h-8 text-sm" placeholder="0" /></div>
 <div><Label>Number of physical items</Label><Input disabled={locked} value={p.numberOfItems} onChange={e => upd("numberOfItems", e.target.value)} className="h-8 text-sm" placeholder="0" /></div>
 <div><Label hint="">Performance materiality $ (D)</Label><Input disabled={locked} value={p.performanceMateriality} onChange={e => upd("performanceMateriality", e.target.value)} className="h-8 text-sm" placeholder={String(Math.round(ctx.performanceMateriality))} /></div>
 <div className="col-span-3"><Label>Nature of key items removed and tested separately</Label><div className="flex items-start gap-1.5"><GreenDot show={!!p.keyItemsNature} /><Textarea disabled={locked} value={p.keyItemsNature} onChange={e => upd("keyItemsNature", e.target.value)} className="flex-1 text-sm min-h-[48px]" placeholder="e.g. balances ≥ $100K, related-party items" /></div></div>
 <div><Label hint="B">Value of key items $</Label><Input disabled={locked} value={p.keyItemsValue} onChange={e => upd("keyItemsValue", e.target.value)} className="h-8 text-sm" placeholder="0" /></div>
 <div><Label>Number of key items</Label><Input disabled={locked} value={p.keyItemsCount} onChange={e => upd("keyItemsCount", e.target.value)} className="h-8 text-sm" placeholder="0" /></div>
 {p.method === "statistical" && (
 <div><Label hint="E · e.g. 1.6 (95 %)">Confidence factor</Label><Input disabled={locked} value={p.confidenceFactor} onChange={e => upd("confidenceFactor", e.target.value)} className="h-8 text-sm" /></div>
 )}
 </div>
 <div className="px-4 pb-4 grid grid-cols-4 gap-3">
 <Stat label="Remaining population (C = A−B)" value={formatCurrency(C)} mono />
 {p.method === "statistical" ? <>
 <Stat label="Sampling interval (F = D ÷ E)" value={F ? formatCurrency(F) : "—"} mono />
 <Stat label="Suggested sample size (G = C ÷ F)" value={G > 0 ? String(G) : "—"} mono />
 <Stat label="Confidence" value={`${E}x`} />
 </> : <>
 <Stat label="Performance materiality" value={D ? formatCurrency(D) : "—"} mono />
 <Stat label="Risk-based sample size" value={p.riskLevel === "High" ? "60" : p.riskLevel === "Moderate" ? "35" : "20"} />
 <Stat label="Coverage of population" value={A ? `${((B / A) * 100).toFixed(1)} % key + sample` : "—"} />
 </>}
 </div>
 </div>

 {/* ── Test results ── */}
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-foreground">3 · Test results &amp; projected misstatement</h3>
 {!locked && <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setData(d => ({...d, results: [...d.results, newRow()] }))}><Plus className="h-3.5 w-3.5" /> Add item</Button>}
 </div>
 <div className="p-4 grid grid-cols-1 gap-4">
 <div className={isDemoEngagement && lukaHighlightFields.has('documentation') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}>
 <Label>Documentation of items selected (W/P cross-reference)</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.documentation} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('documentation')}>
   <Textarea disabled={locked} value={data.documentation} onChange={e => setData(d => ({...d, documentation: e.target.value }))} className="flex-1 text-sm min-h-[56px]" />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div><Label>Replacements (count and reason)</Label><div className="flex items-start gap-1.5"><GreenDot show={!!data.replacements} /><Textarea disabled={locked} value={data.replacements} onChange={e => setData(d => ({...d, replacements: e.target.value }))} className="flex-1 text-sm min-h-[48px]" /></div></div>
 <div><Label>Anomalies identified</Label><div className="flex items-start gap-1.5"><GreenDot show={!!data.anomalies} /><Textarea disabled={locked} value={data.anomalies} onChange={e => setData(d => ({...d, anomalies: e.target.value }))} className="flex-1 text-sm min-h-[48px]" /></div></div>
 </div>
 </div>
 <div className="overflow-x-auto border-t border-border">
 <table className="w-full">
 <thead className="bg-muted/30">
 <tr>
 <th className={`${th} w-12 text-center`}>#</th>
 <th className={`${th} text-right`}>Original value $</th>
 <th className={`${th} text-right`}>Audited value $</th>
 <th className={`${th} text-right`}>Misstatement $</th>
 <th className={`${th} text-right`}>Projected $</th>
 <th className={th}>Reason for misstatement</th>
 {!locked && <th className="px-2 py-3 w-10" />}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.results.map((r, i) => {
 const ov = num(r.originalValue), av = num(r.auditedValue), mis = ov - av;
 const pct = ov !== 0 ? mis / ov : 0;
 const proj = data.plan.method === "statistical" ? pct * F : mis;
 return (
 <tr key={r.id} className="hover:bg-muted/20">
 <td className={`${td} text-center text-muted-foreground tabular-nums`}>{i + 1}</td>
 <td className={`${td} text-right`}><Input disabled={locked} value={r.originalValue} onChange={e => updResult(r.id, "originalValue", e.target.value)} className="h-8 text-sm text-right tabular-nums" placeholder="0" /></td>
 <td className={`${td} text-right`}><Input disabled={locked} value={r.auditedValue} onChange={e => updResult(r.id, "auditedValue", e.target.value)} className="h-8 text-sm text-right tabular-nums" placeholder="0" /></td>
 <td className={`${td} text-right tabular-nums text-foreground`}>{mis ? formatCurrency(mis) : "—"}</td>
 <td className={`${td} text-right tabular-nums text-foreground`}>{proj ? formatCurrency(proj) : "—"}</td>
 <td className={td}><div className="flex items-start gap-1.5"><GreenDot show={!!r.reason} /><Textarea disabled={locked} value={r.reason} onChange={e => updResult(r.id, "reason", e.target.value)} className="flex-1 min-h-[40px] text-sm resize-none" /></div></td>
 {!locked && <td className={`${td} text-center w-10`}><button onClick={() => setData(d => ({...d, results: d.results.filter(x => x.id !== r.id) }))} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button></td>}
 </tr>
 );
 })}
 <tr className="bg-muted/40">
 <td colSpan={4} className={`${td} text-right font-semibold text-foreground`}>Projected misstatement (record)</td>
 <td className={`${td} text-right tabular-nums font-bold text-primary`}>{projected ? formatCurrency(projected) : "—"}</td>
 <td colSpan={!locked ? 2 : 1}></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Conclusion ── */}
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="text-sm font-semibold text-foreground">4 · Conclusion</h3></div>
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>Were the test objectives achieved?</Label>
 <Select disabled={locked} value={data.testObjectivesMet} onValueChange={(v: "Y" | "N" | "") => setData(d => ({...d, testObjectivesMet: v }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Yes</SelectItem><SelectItem value="N">No</SelectItem></SelectContent>
 </Select>
 </div>
 <div>
 <Label>Deviations with possible effect on other audit areas?</Label>
 <Select disabled={locked} value={data.deviationsOtherAreas} onValueChange={(v: "Y" | "N" | "") => setData(d => ({...d, deviationsOtherAreas: v }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Yes</SelectItem><SelectItem value="N">No</SelectItem></SelectContent>
 </Select>
 </div>
 {data.testObjectivesMet === "N" && <div className="col-span-2"><Label>Explanation</Label><div className="flex items-start gap-1.5"><GreenDot show={!!data.testObjectivesMetExplain} /><Textarea disabled={locked} value={data.testObjectivesMetExplain} onChange={e => setData(d => ({...d, testObjectivesMetExplain: e.target.value }))} className="flex-1 text-sm min-h-[56px]" placeholder="Explain and describe further procedures planned" /></div></div>}
 {data.deviationsOtherAreas === "Y" && <div className="col-span-2"><Label>Impact on other audit areas</Label><div className="flex items-start gap-1.5"><GreenDot show={!!data.deviationsOtherAreasExplain} /><Textarea disabled={locked} value={data.deviationsOtherAreasExplain} onChange={e => setData(d => ({...d, deviationsOtherAreasExplain: e.target.value }))} className="flex-1 text-sm min-h-[56px]" placeholder="Describe the effect; update the audit strategy accordingly" /></div></div>}
 </div>
 <div>
 <Label>Overall sampling conclusion</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.conclusion} />
 <Textarea disabled={locked} value={data.conclusion} onChange={e => setData(d => ({...d, conclusion: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="Conclude on whether the population is fairly stated within performance materiality." />
 </div>
 </div>
 </div>
 </div>

 <ConcludeBar worksheetKey="audit-610" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }} />
 </WorksheetLayout>
 );
}
