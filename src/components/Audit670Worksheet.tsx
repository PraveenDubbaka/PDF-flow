// — Use of Journal Entries (CAS 240 / AU-C 240)
// Aligned with WorksheetShell design standards.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { formatCurrency } from "@/lib/engagementContext";
import { loadRisks520, overallRisk520, filterRisks } from "@/lib/audit520Bridge";
import {
 WorksheetLayout, WorksheetSection, LinkedRisksCard, ProcedureTable, ConcludeBar, makeProcRow,
 type ProcRow,
} from "@/components/audit/WorksheetShell";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

type YN = "Y" | "N" | "";

type JeOutcome = "Appropriate" | "Requires follow-up" | "Misstatement identified" | "";

interface JournalEntry {
 id: string;
 jeRef: string; // JE number
 date: string;
 preparer: string;
 approver: string;
 amount: string;
 accounts: string;
 attributes: string; // round numbers / unusual account / etc.
 rationale: string;
 supportingDoc: string;
 outcome: JeOutcome;
 wpRef: string;
}

interface Data670 {
 scopeBefore: string; // days/weeks/months before period end
 scopeAfter: string;
 totalEntriesPopulation: string;
 selectionRationale: string;

 entries: JournalEntry[];

 procPreparation: ProcRow[];
 procCompleteness: ProcRow[];
 procExistence: ProcRow[];
 procOther: ProcRow[];

 extendToFullPeriod: YN;
 extendNotes: string;
 managementOverrideIndicated: YN;
 managementOverrideNotes: string;
 reportToTcwg: YN;
 reportToTcwgNotes: string;

 evidenceSufficient: YN;
 evidenceRationale: string;
 concluded: boolean;
 concludedOn: string;
}

const dPreparation = (): ProcRow[] => [
 makeProcRow("Review understanding of journal entries and for any RMM relating to the entity's financial-reporting process, management override or other fraud risks."),
];
const dCompleteness = (): ProcRow[] => [
 makeProcRow("2. Prior period JEs — ensure prior period adjusting entries have been properly recorded in the opening balances for the current period accounting records.", "C"),
 makeProcRow("3. Current period JEs — ensure all usual/required period-end journal entries have been made.", "C"),
];
const dExistence = (): ProcRow[] => [
 makeProcRow("4. Inquire of individuals involved in the financial-reporting process about unusual entries or unusual activity in processing JEs and other adjustments.", "E (C AV)"),
 makeProcRow("5. Identify unusual or inappropriate JEs around period end — select entries based on defined attributes recorded before/after period end (made by atypical preparers; unusual/seldom-used accounts; post-closing entries with little/no description; round/consistent numbers; complex or estimate-heavy accounts; intercompany; reconciliation issues).", "E (C AV)"),
 makeProcRow("6. Investigation — for each entry selected, determine who initiated/approved, assess reasonableness of rationale, review supporting documentation, design any further procedures, and consider reporting to mgmt/TCWG. (Reduce extent of substantive testing where controls on Forms 550/551 have been tested for operating effectiveness.)", "E (C AV)"),
 makeProcRow("7. Identify unusual / inappropriate JEs during the period — based on results above and RMM, consider extending testing over the full reporting period.", "E (C AV)"),
];
const dOther = (): ProcRow[] => [
 makeProcRow("Other procedures (specify)."),
];

function newEntry(): JournalEntry {
 return {
 id: Math.random().toString(36).slice(2, 9),
 jeRef: "", date: "", preparer: "", approver: "", amount: "",
 accounts: "", attributes: "", rationale: "", supportingDoc: "",
 outcome: "", wpRef: "",
 };
}

function buildDefault(): Data670 {
 return {
 scopeBefore: "30 days", scopeAfter: "30 days",
 totalEntriesPopulation: "", selectionRationale: "",
 entries: [],
 procPreparation: dPreparation(), procCompleteness: dCompleteness(),
 procExistence: dExistence(), procOther: dOther(),
 extendToFullPeriod: "", extendNotes: "",
 managementOverrideIndicated: "", managementOverrideNotes: "",
 reportToTcwg: "", reportToTcwgNotes: "",
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

type SectionKey = "procPreparation" | "procCompleteness" | "procExistence" | "procOther";

const JE_KEYWORDS = ["journal", "management override", "override", "fraud", "manual entr", "post-clos"];

export function Audit670Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);
 const jeRisks = useMemo(() => filterRisks(risks, JE_KEYWORDS), [risks]);
 const fraudRisks = useMemo(() => risks.filter(r => r.fraudRisk === "Y"), [risks]);

 const storageKey = `audit-670-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data670>(() => {
 const def = buildDefault();
 const stored = readJsonFromLocalStorage<Partial<Data670>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data670;
 if (!Array.isArray(merged.entries)) merged.entries = [];
 (["procPreparation","procCompleteness","procExistence","procOther"] as SectionKey[])
.forEach(k => { if (!Array.isArray(merged[k])) (merged as unknown as Record<SectionKey, ProcRow[]>)[k] = (def as unknown as Record<SectionKey, ProcRow[]>)[k]; });
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

 function updProc(section: SectionKey, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) {
 setData(d => ({...d, [section]: (d[section] as ProcRow[]).map(r => r.id === rowId ? {...r, [field]: value } : r) }));
 }
 const handler = (section: SectionKey) =>
 (_si: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) =>
 updProc(section, rowId, field, value);

 const updEntry = (id: string, patch: Partial<JournalEntry>) =>
 setData(d => ({...d, entries: d.entries.map(e => e.id === id ? {...e,...patch } : e) }));

 const followUps = data.entries.filter(e => e.outcome === "Requires follow-up" || e.outcome === "Misstatement identified");
 const allProcsAddressed = useMemo(() => {
 const all = [...data.procPreparation,...data.procCompleteness,...data.procExistence,...data.procOther];
 return all.length > 0 && all.every(p => p.psc !== "");
 }, [data]);

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Determine whether material misstatements (fraud or error) have occurred from inappropriate, fictitious, or unauthorized journal entries (responding to the presumed management-override risk)."
 standard={`${ctx.standardPrefix} 240.32`}
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
               setData(d => ({ ...d, totalEntriesPopulation: '184', selectionRationale: 'Journal entries selected based on the following attributes: (1) entries posted by atypical preparers (system administrator, owner); (2) post-period-end entries with limited descriptions; (3) round dollar amounts ≥ $50,000; (4) entries to seldom-used or suspense accounts; (5) entries reversing prior period accruals. Population of 184 entries reviewed — 25 selected for detailed testing.' }));
               markLukaFilled('selectionRationale');
             }
           },
           { set: () => {
               setData(d => ({ ...d, managementOverrideIndicated: 'N' }));
               markLukaFilled('managementOverrideIndicated');
             }
           },
           { set: () => {
               setData(d => ({ ...d, evidenceRationale: '25 journal entries tested across the 30-day pre and post period-end window. All entries reviewed for preparer authorization, supporting documentation and business rationale. No unusual, unauthorized or fictitious entries identified. Management override risk addressed — evidence is sufficient and appropriate.' }));
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
 <div className="flex items-center gap-6">
 <div className="text-sm font-mono">{formatCurrency(ctx.performanceMateriality)}</div>
 {fraudRisks.length > 0 && (
 <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1">
 {fraudRisks.length} fraud risk{fraudRisks.length === 1 ? "" : "s"} identified in — consider extending JE testing.
 </div>
 )}
 </div>
 </WorksheetSection>

 <LinkedRisksCard overallRisk={overall} risks={jeRisks}
 emptyHint="No JE / management-override risks tagged in Management-override is presumed; document attributes selected."
 storageKey={`audit-670-risks-${engagementId ?? "default"}`} locked={locked} />

 <WorksheetSection title="Selection scope">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div><Label>Days before period end</Label><Input disabled={locked} value={data.scopeBefore} onChange={e => setData(d => ({...d, scopeBefore: e.target.value }))} className="h-8 text-sm" placeholder="e.g. 30 days" /></div>
 <div><Label>Days after period end</Label><Input disabled={locked} value={data.scopeAfter} onChange={e => setData(d => ({...d, scopeAfter: e.target.value }))} className="h-8 text-sm" placeholder="e.g. 30 days" /></div>
 <div><Label>JE population size</Label><Input disabled={locked} value={data.totalEntriesPopulation} onChange={e => setData(d => ({...d, totalEntriesPopulation: e.target.value }))} className="h-8 text-sm" placeholder="# of entries" /></div>
 <div ref={firstFillRef as React.RefObject<HTMLDivElement>} className={`md:col-span-4${isDemoEngagement && lukaHighlightFields.has('selectionRationale') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}`}>
 <Label>Selection rationale / attributes used</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.selectionRationale} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('selectionRationale')}>
 <Textarea disabled={locked} value={data.selectionRationale} onChange={e => setData(d => ({...d, selectionRationale: e.target.value }))} className="flex-1 text-sm min-h-[72px]"
 placeholder="Document selection attributes: unusual preparers, seldom-used accounts, post-closing entries with limited descriptions, round numbers, accounts with estimates / reconciliation issues / intercompany, identified fraud-risk accounts." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <WorksheetSection
 title="Selected journal entries — testing register"
 right={<Button size="sm" variant="secondary" className="h-7 text-xs gap-1" disabled={locked} onClick={() => setData(d => ({...d, entries: [...d.entries, newEntry()] }))}><Plus className="h-3 w-3 mr-1" />Add JE</Button>}
 bodyClassName="p-0"
 >
 {data.entries.length === 0 ? (
 <p className="px-6 py-4 text-sm text-muted-foreground">No journal entries selected yet. Each entry tested records the preparer, approver, attributes triggered, rationale and outcome — feeding the fraud assessment.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead><tr className="bg-muted/40">
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[80px]">JE #</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[110px]">Date</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Preparer</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Approver</th>
 <th className="text-right px-3 py-2.5 font-medium border-b border-border w-[110px]">Amount</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Accounts</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Attributes triggered</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border">Rationale / support</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[160px]">Outcome</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[80px]">W/P</th>
 <th className="px-3 py-2.5 border-b border-border w-[40px]" />
 </tr></thead>
 <tbody>
 {data.entries.map(ent => (
 <tr key={ent.id} className="hover:bg-muted/20 align-top">
 <td className="border-b border-border p-2"><Input disabled={locked} value={ent.jeRef} onChange={e => updEntry(ent.id, { jeRef: e.target.value })} className="h-8 text-sm font-mono" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} type="date" value={ent.date} onChange={e => updEntry(ent.id, { date: e.target.value })} className="h-8 text-sm" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={ent.preparer} onChange={e => updEntry(ent.id, { preparer: e.target.value })} className="h-8 text-sm" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={ent.approver} onChange={e => updEntry(ent.id, { approver: e.target.value })} className="h-8 text-sm" /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={ent.amount} onChange={e => updEntry(ent.id, { amount: e.target.value })} className="h-8 text-sm font-mono text-right" inputMode="decimal" /></td>
 <td className="border-b border-border p-2">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!ent.accounts} />
 <Textarea disabled={locked} value={ent.accounts} onChange={e => updEntry(ent.id, { accounts: e.target.value })} className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Dr / Cr accounts" />
 </div>
 </td>
 <td className="border-b border-border p-2">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!ent.attributes} />
 <Textarea disabled={locked} value={ent.attributes} onChange={e => updEntry(ent.id, { attributes: e.target.value })} className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Round amt, post-close, unusual account…" />
 </div>
 </td>
 <td className="border-b border-border p-2">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!ent.rationale} />
 <Textarea disabled={locked} value={ent.rationale} onChange={e => updEntry(ent.id, { rationale: e.target.value })} className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Business rationale & supporting doc reviewed" />
 </div>
 </td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={ent.outcome} onValueChange={v => updEntry(ent.id, { outcome: v as JeOutcome })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Appropriate">Appropriate</SelectItem>
 <SelectItem value="Requires follow-up">Requires follow-up</SelectItem>
 <SelectItem value="Misstatement identified">Misstatement identified</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={ent.wpRef} onChange={e => updEntry(ent.id, { wpRef: e.target.value })} className="h-8 text-sm" placeholder="—" /></td>
 <td className="border-b border-border p-2 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" disabled={locked} onClick={() => setData(d => ({...d, entries: d.entries.filter(x => x.id !== ent.id) }))}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 {followUps.length > 0 && (
 <div className="px-6 py-3 border-t border-border bg-amber-50 text-sm text-amber-800">
 {followUps.length} entr{followUps.length === 1 ? "y" : "ies"} flagged for follow-up — ensure each is resolved before concluding, and consider impact /
 </div>
 )}
 </WorksheetSection>

 <WorksheetSection title="Basic — preparation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Foundations", rows: data.procPreparation }]} locked={locked} onChange={handler("procPreparation")} />
 </WorksheetSection>
 <WorksheetSection title="Completeness" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Prior and current period JEs", rows: data.procCompleteness }]} locked={locked} onChange={handler("procCompleteness")} />
 </WorksheetSection>
 <WorksheetSection title="Existence — testing of JEs" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Inquiry, selection, investigation", rows: data.procExistence }]} locked={locked} onChange={handler("procExistence")} />
 </WorksheetSection>
 <WorksheetSection title="Other procedures" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Additional", rows: data.procOther }]} locked={locked} onChange={handler("procOther")} />
 </WorksheetSection>

 <WorksheetSection title="Evaluation & escalation">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div><Label>Extend testing to full period?</Label><YNSelect value={data.extendToFullPeriod} onChange={v => setData(d => ({...d, extendToFullPeriod: v as YN }))} locked={locked} /></div>
 <div><Label>Indicators of management override?</Label><YNSelect value={data.managementOverrideIndicated} onChange={v => setData(d => ({...d, managementOverrideIndicated: v as YN }))} locked={locked} /></div>
 <div><Label>Reported to TCWG?</Label><YNSelect value={data.reportToTcwg} onChange={v => setData(d => ({...d, reportToTcwg: v as YN }))} locked={locked} /></div>
 {data.extendToFullPeriod === "Y" && (
 <div className="md:col-span-3"><Label>Extended testing — basis & approach</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.extendNotes} />
 <Textarea disabled={locked} value={data.extendNotes} onChange={e => setData(d => ({...d, extendNotes: e.target.value }))} className="flex-1 text-sm min-h-[64px]" placeholder="Rationale for extending; period covered; selection approach." />
 </div>
 </div>
 )}
 {data.managementOverrideIndicated === "Y" && (
 <div className="md:col-span-3"><Label>Management override — nature & response</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.managementOverrideNotes} />
 <Textarea disabled={locked} value={data.managementOverrideNotes} onChange={e => setData(d => ({...d, managementOverrideNotes: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="Update fraud assessment and RMM accordingly." />
 </div>
 </div>
 )}
 {data.reportToTcwg === "Y" && (
 <div className="md:col-span-3"><Label>TCWG communication</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.reportToTcwgNotes} />
 <Textarea disabled={locked} value={data.reportToTcwgNotes} onChange={e => setData(d => ({...d, reportToTcwgNotes: e.target.value }))} className="flex-1 text-sm min-h-[64px]" placeholder="What was communicated, when, to whom." />
 </div>
 </div>
 )}
 </div>
 </WorksheetSection>

 <WorksheetSection title={`Audit conclusion (${ctx.standardPrefix} 240.32)`}
 right={allProcsAddressed && data.evidenceSufficient === "" ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">All procedures addressed — ready to conclude</span>
 ) : null}
 >
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
 <div><Label>Evidence sufficient & appropriate?</Label><YNSelect value={data.evidenceSufficient} onChange={v => setData(d => ({...d, evidenceSufficient: v as YN }))} locked={locked} /></div>
 <div className={isDemoEngagement && lukaHighlightFields.has('evidenceRationale') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}>
 <Label>Rationale</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.evidenceRationale} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('evidenceRationale')}>
 <Textarea disabled={locked} value={data.evidenceRationale} onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))} className="flex-1 text-sm min-h-[72px]"
 placeholder="JE testing performed addresses the presumed management-override fraud risk; evidence is sufficient and appropriate to reduce RMM to an acceptably low level." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-670"
 engagementId={engagementId}
 concluded={data.concluded}
 concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 />
 </WorksheetLayout>
 );
}
