// — Related-Party Transactions (CAS 550 / AU-C 550)
// Aligned with WorksheetShell design standards.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AttributedComment } from "@/components/ui/AttributedComment";
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
type YNNA = YN | "N/A";

type RpRelationship = "Parent" | "Subsidiary" | "Affiliate" | "Owner / shareholder" | "KMP / family" | "Other" | "";

interface RelatedParty {
 id: string;
 name: string;
 relationship: RpRelationship;
 natureOfTxn: string; // e.g. management fees, loans
 amount: string;
 armsLength: YNNA;
 outsideNormal: YN; // outside ordinary course of business
 disclosureAdequate: YNNA;
 wpRef: string;
}

interface Data666 {
 parties: RelatedParty[];
 procPreparation: ProcRow[];
 procCompleteness: ProcRow[];
 procAccuracyValuation: ProcRow[];
 procExistence: ProcRow[];
 procPresentation: ProcRow[];

 unidentifiedFound: YN;
 unidentifiedNotes: string;
 tcwgCommunicated: YN;
 tcwgCommunicationLog: string;
 disclosuresAdequate: YNNA;
 disclosureNotes: string;
 otherProcedures: string;
 evidenceSufficient: YN;
 evidenceRationale: string;
 concluded: boolean;
 concludedOn: string;
}

const dPreparation = (): ProcRow[] => [
 makeProcRow("Complete Review the list of related parties provided by management and the assessed RMM (Forms 520 / 590)."),
];
const dCompleteness = (): ProcRow[] => [
 makeProcRow("1a. Inquire and review documents (board minutes, unusual period-end invoices, legal correspondence, asset transactions, contracts, loans, guarantees, investments) to identify undisclosed related-party transactions.", "C"),
 makeProcRow("1b. Examine purpose, documentation and authorization for material transactions with component entities.", "C"),
 makeProcRow("2. Where previously undisclosed related-party transactions are identified: update RMM and assess need for further procedures (especially where non-disclosure appears intentional); inform other engagement team members; perform sufficient work to identify all RP transactions; obtain explanations for why they were not earlier identified.", "C (AV)"),
];
const dAccuracyValuation = (): ProcRow[] => [
 makeProcRow("1. Accounting treatment — review nature/extent of RP transactions and determine accounting and presentation are in accordance with the AFRF.", "AV (C E)"),
 makeProcRow("2. Communications — communicate significant matters relating to related parties (including previously undisclosed RP transactions) to TCWG (unless all TCWG are involved in management).", "AV"),
];
const dExistence = (): ProcRow[] => [
 makeProcRow("1. Transactions outside normal course of business — review underlying contracts, terms and accounting to evaluate management's stated business rationale; consider whether the transaction may have been used for fraudulent reporting or to conceal misappropriation; obtain evidence of authorization/approval.", "E (AV)"),
 makeProcRow("2. Arm's-length transactions — corroborate management's assertion (bargaining power of each party, similar market transactions, confirmation with counterparties).", "E (AV)"),
];
const dPresentation = (): ProcRow[] => [
 makeProcRow("Classification — balances and classes of transactions appropriately classified, aggregated/disaggregated and characterized per AFRF.", "P"),
 makeProcRow("Disclosures — notes include all disclosures required by the AFRF (see FRF 900 series).", "P"),
 makeProcRow("Relevant information — overall presentation not undermined by irrelevant information that obscures the matters disclosed.", "P"),
];

function newParty(seed?: Partial<RelatedParty>): RelatedParty {
 return {
 id: Math.random().toString(36).slice(2, 9),
 name: "", relationship: "", natureOfTxn: "", amount: "",
 armsLength: "", outsideNormal: "", disclosureAdequate: "", wpRef: "",
...seed,
 };
}

function buildDefault(): Data666 {
 return {
 parties: [],
 procPreparation: dPreparation(), procCompleteness: dCompleteness(),
 procAccuracyValuation: dAccuracyValuation(), procExistence: dExistence(), procPresentation: dPresentation(),
 unidentifiedFound: "", unidentifiedNotes: "",
 tcwgCommunicated: "", tcwgCommunicationLog: "",
 disclosuresAdequate: "", disclosureNotes: "",
 otherProcedures: "", evidenceSufficient: "", evidenceRationale: "",
 concluded: false, concludedOn: "",
 };
}

function Label({ children }: { children: React.ReactNode }) {
 return <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">{children}</label>;
}
function YNSelect({ value, onChange, withNA = false, locked }: { value: string; onChange: (v: string) => void; withNA?: boolean; locked: boolean }) {
 return (
 <Select disabled={locked} value={value} onValueChange={onChange}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Yes</SelectItem>
 <SelectItem value="N">No</SelectItem>
 {withNA && <SelectItem value="N/A">N/A</SelectItem>}
 </SelectContent>
 </Select>
 );
}

type SectionKey = "procPreparation" | "procCompleteness" | "procAccuracyValuation" | "procExistence" | "procPresentation";

const RP_KEYWORDS = ["related part", "related-party", "shareholder", "management fee", "common control", "affiliate", "intercompany"];

export function Audit666Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);
 const rpRisks = useMemo(() => filterRisks(risks, RP_KEYWORDS), [risks]);

 // FSA exposure (from engagement context)
 const fsaRp = ctx.fsas.find(f => /related[- ]?part/i.test(f.fsa));

 const storageKey = `audit-666-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data666>(() => {
 const def = buildDefault();
 const stored = readJsonFromLocalStorage<Partial<Data666>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data666;
 if (!Array.isArray(merged.parties)) merged.parties = [];
 (["procPreparation","procCompleteness","procAccuracyValuation","procExistence","procPresentation"] as SectionKey[])
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

 const addParty = () => setData(d => ({...d, parties: [...d.parties, newParty()] }));
 const updParty = (id: string, patch: Partial<RelatedParty>) =>
 setData(d => ({...d, parties: d.parties.map(p => p.id === id ? {...p,...patch } : p) }));
 const removeParty = (id: string) =>
 setData(d => ({...d, parties: d.parties.filter(p => p.id !== id) }));

 const allProcsAddressed = useMemo(() => {
 const all = [...data.procPreparation,...data.procCompleteness,...data.procAccuracyValuation,...data.procExistence,...data.procPresentation];
 return all.length > 0 && all.every(p => p.psc !== "");
 }, [data]);

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Obtain evidence that related-party relationships and transactions have been identified, accounted for, and disclosed in the F/S in accordance with the AFRF."
 standard={`${ctx.standardPrefix} 550`}
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
               setData(d => ({ ...d, tcwgCommunicationLog: 'All related-party relationships and transactions communicated to TCWG at the audit planning and completion meetings. TCWG confirmed completeness of the related-party register and noted no additional undisclosed transactions. Minutes reviewed and on file.' }));
               markLukaFilled('tcwgCommunicationLog');
             }
           },
           { set: () => {
               setData(d => ({ ...d, disclosureNotes: 'Related-party note disclosures reviewed against AFRF requirements. Transactions with owners and management are appropriately disclosed including nature, amounts, outstanding balances, and terms. Arm\'s-length characterization reviewed and supported.' }));
               markLukaFilled('disclosureNotes');
             }
           },
           { set: () => {
               setData(d => ({ ...d, evidenceRationale: 'Procedures performed in accordance with CAS 550. Related-party register confirmed with management and TCWG. Underlying contracts and authorizations reviewed for transactions outside the normal course of business. Evidence is sufficient and appropriate.' }));
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
 {fsaRp && (
 <div className="text-[11px] text-muted-foreground">
 FSA classification flags related-party disclosures
 {fsaRp.significantRisk === "Y" && <span className="ml-2 text-red-700 font-medium">· Significant risk</span>}
 </div>
 )}
 </div>
 </WorksheetSection>

 <LinkedRisksCard overallRisk={overall} risks={rpRisks}
 emptyHint="No related-party-tagged risks in Tag risks containing keywords (related party, shareholder, affiliate, intercompany, management fee) to flow them through."
 storageKey={`audit-666-risks-${engagementId ?? "default"}`} locked={locked} />

 <WorksheetSection
 title="Related parties & transactions register"
 right={<Button size="sm" variant="secondary" className="h-7 text-xs gap-1" disabled={locked} onClick={addParty}><Plus className="h-3 w-3 mr-1" /> Add party / transaction</Button>}
 bodyClassName="p-0"
 >
 {data.parties.length === 0 ? (
 <p className="px-6 py-4 text-sm text-muted-foreground">
 No related parties recorded. Each entry flows in (TCWG), (representations) and the 900-series disclosure forms.
 </p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead><tr className="bg-muted/40">
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Name</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Relationship</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border">Nature of transaction</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[110px]">Amount ($)</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[110px]">Arm's-length?</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Outside normal?</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[110px]">Disclosure</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[80px]">W/P</th>
 <th className="px-3 py-2.5 border-b border-border w-[40px]" />
 </tr></thead>
 <tbody>
 {data.parties.map(p => (
 <tr key={p.id} className="hover:bg-muted/20 align-top">
 <td className="border-b border-border p-2"><Input disabled={locked} value={p.name} onChange={e => updParty(p.id, { name: e.target.value })} className="h-8 text-sm" placeholder="—" /></td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={p.relationship} onValueChange={v => updParty(p.id, { relationship: v as RpRelationship })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Parent">Parent</SelectItem>
 <SelectItem value="Subsidiary">Subsidiary</SelectItem>
 <SelectItem value="Affiliate">Affiliate</SelectItem>
 <SelectItem value="Owner / shareholder">Owner / shareholder</SelectItem>
 <SelectItem value="KMP / family">KMP / family</SelectItem>
 <SelectItem value="Other">Other</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2"><div className="flex items-start gap-1.5"><GreenDot show={!!p.natureOfTxn} /><Textarea disabled={locked} value={p.natureOfTxn} onChange={e => updParty(p.id, { natureOfTxn: e.target.value })} className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Loans, mgmt fees, leases, sales…" /></div></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={p.amount} onChange={e => updParty(p.id, { amount: e.target.value })} className="h-8 text-sm font-mono text-right" inputMode="decimal" placeholder="0" /></td>
 <td className="border-b border-border p-2"><YNSelect value={p.armsLength} onChange={v => updParty(p.id, { armsLength: v as YNNA })} withNA locked={locked} /></td>
 <td className="border-b border-border p-2"><YNSelect value={p.outsideNormal} onChange={v => updParty(p.id, { outsideNormal: v as YN })} locked={locked} /></td>
 <td className="border-b border-border p-2"><YNSelect value={p.disclosureAdequate} onChange={v => updParty(p.id, { disclosureAdequate: v as YNNA })} withNA locked={locked} /></td>
 <td className="border-b border-border p-2"><Input disabled={locked} value={p.wpRef} onChange={e => updParty(p.id, { wpRef: e.target.value })} className="h-8 text-sm" placeholder="—" /></td>
 <td className="border-b border-border p-2 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" disabled={locked} onClick={() => removeParty(p.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </WorksheetSection>

 <WorksheetSection title="Preparation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Risk assessments", rows: data.procPreparation }]} locked={locked} onChange={handler("procPreparation")} />
 </WorksheetSection>
 <WorksheetSection title="Completeness — identify related parties & transactions" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Search & follow-up", rows: data.procCompleteness }]} locked={locked} onChange={handler("procCompleteness")} />
 </WorksheetSection>
 <WorksheetSection title="Accuracy / valuation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Accounting treatment & TCWG communication", rows: data.procAccuracyValuation }]} locked={locked} onChange={handler("procAccuracyValuation")} />
 </WorksheetSection>
 <WorksheetSection title="Existence" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Outside-normal & arm's-length corroboration", rows: data.procExistence }]} locked={locked} onChange={handler("procExistence")} />
 </WorksheetSection>
 <WorksheetSection title="Presentation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Classification, disclosures & relevant information", rows: data.procPresentation }]} locked={locked} onChange={handler("procPresentation")} />
 </WorksheetSection>

 <WorksheetSection title="Overall evaluation">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div><Label>Previously unidentified RP transactions found?</Label><YNSelect value={data.unidentifiedFound} onChange={v => setData(d => ({...d, unidentifiedFound: v as YN }))} locked={locked} /></div>
 <div><Label>Communicated to TCWG?</Label><YNSelect value={data.tcwgCommunicated} onChange={v => setData(d => ({...d, tcwgCommunicated: v as YN }))} locked={locked} /></div>
 {data.unidentifiedFound === "Y" && (
 <div className="md:col-span-2"><Label>Unidentified RP transactions — nature & response</Label>
 <div className="flex items-start gap-1.5"><GreenDot show={!!data.unidentifiedNotes} /><div className="flex-1"><AttributedComment value={data.unidentifiedNotes} onChange={v => setData(d => ({...d, unidentifiedNotes: v }))} storageKey={`666-${engagementId ?? "def"}-unidentNotes`} placeholder="Describe the transactions, why not identified earlier, and updated RMM response." disabled={locked} className="text-sm min-h-[72px]" /></div></div>
 </div>
 )}
 <div ref={firstFillRef as React.RefObject<HTMLDivElement>} className={`md:col-span-2${isDemoEngagement && lukaHighlightFields.has('tcwgCommunicationLog') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}`}>
 <Label>TCWG communication log</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.tcwgCommunicationLog} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('tcwgCommunicationLog')}>
 <AttributedComment value={data.tcwgCommunicationLog} onChange={v => setData(d => ({...d, tcwgCommunicationLog: v }))} storageKey={`666-${engagementId ?? "def"}-tcwgLog`} placeholder="Summarise communication, date, attendees, matters discussed." disabled={locked} className="text-sm min-h-[64px]" />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <WorksheetSection title="Disclosures">
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
 <div><Label>Disclosures adequate (AFRF)?</Label><YNSelect value={data.disclosuresAdequate} onChange={v => setData(d => ({...d, disclosuresAdequate: v as YNNA }))} withNA locked={locked} /></div>
 <div className={isDemoEngagement && lukaHighlightFields.has('disclosureNotes') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}>
 <Label>Disclosure notes</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.disclosureNotes} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('disclosureNotes')}>
 <AttributedComment value={data.disclosureNotes} onChange={v => setData(d => ({...d, disclosureNotes: v }))} storageKey={`666-${engagementId ?? "def"}-discNotes`} placeholder="Confirm notes meet AFRF related-party disclosure requirements." disabled={locked} className="text-sm min-h-[72px]" />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <WorksheetSection title="Other procedures (specify)">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.otherProcedures} />
 <div className="flex-1">
 <AttributedComment value={data.otherProcedures} onChange={v => setData(d => ({...d, otherProcedures: v }))} storageKey={`666-${engagementId ?? "def"}-otherProcs`} placeholder="Additional procedures performed in response to identified risks." disabled={locked} className="text-sm min-h-[72px]" />
 </div>
 </div>
 </WorksheetSection>

 <WorksheetSection title={`Audit conclusion (${ctx.standardPrefix} 550)`}
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
 <Textarea disabled={locked} value={data.evidenceRationale} onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="The audit evidence obtained over related-party relationships and transactions is sufficient and appropriate to reduce RMM to an acceptably low level." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-666"
 engagementId={engagementId}
 concluded={data.concluded}
 concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 />
 </WorksheetLayout>
 );
}
