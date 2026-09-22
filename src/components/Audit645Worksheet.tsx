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
 LCNC_RISK_KEYWORDS,
 type LcncMatter, type MatterType, type MatterStatus, type CounselStatus,
 type YN, type YNNA,
} from "@/lib/audit645Bridge";
import {
 WorksheetLayout, WorksheetSection, LinkedRisksCard, ProcedureTable, ConcludeBar, makeProcRow,
 type ProcRow,
} from "@/components/audit/WorksheetShell";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Data645 {
 // Matters register (drives / 580 / 700 downstream)
 matters: LcncMatter[];

 // Procedure sections (verbatim aligned to CAS 250 / CAS 501 —)
 procPreparation: ProcRow[];
 procCompleteness: ProcRow[];
 procLegalCounsel: ProcRow[];
 procAccuracyValuation: ProcRow[];
 procExistence: ProcRow[];
 procPresentation: ProcRow[];

 // Overall evaluation
 nonComplianceIdentified: YN;
 nonComplianceNotes: string;
 rmmReassessmentNeeded: YN;
 rmmReassessmentNotes: string;
 reportModificationConsidered: YN;
 reportModificationNotes: string;

 // Communication & reporting
 tcwgCommunicated: YN;
 tcwgCommunicationLog: string;
 externalReportingRequired: YN;
 externalReportingNotes: string;

 // Disclosures
 disclosuresAdequate: YNNA;
 disclosureNotes: string;

 // Other / conclusion
 otherProcedures: string;
 evidenceSufficient: YN;
 evidenceRationale: string;

 concluded: boolean;
 concludedOn: string;
}

// ── Default procedure rows (Form 645 — CAS 250 / CAS 501) ────────────────────

const dPreparation = (): ProcRow[] => [
 makeProcRow(
 "Review and understand the reasoning for the assessed risk of material misstatement resulting from litigation, claims and non-compliance (Forms 520 and 590).",
 ),
];

const dCompleteness = (): ProcRow[] => [
 makeProcRow("1a. Inquire of management and others within the entity about actual or threatened litigation, claims and non-compliance with laws and regulations.", "C (AV E)"),
 makeProcRow("1b. Review minutes of meetings of those charged with governance and correspondence between the entity and external legal counsel.", "C (AV E)"),
 makeProcRow("1c. Review legal expense accounts for items suggesting unrecorded claims or fines.", "C (AV E)"),
 makeProcRow("1d. Review correspondence with relevant regulatory, licensing and taxation authorities.", "C (AV E)"),
 makeProcRow("1e. Consider results of other audit procedures for indications of non-compliance or suspected non-compliance.", "C (AV E)"),
];

const dLegalCounsel = (): ProcRow[] => [
 makeProcRow("2a. Where assessed risk is high or material litigation may exist, send a letter of inquiry to external legal counsel (prepared by management, reply direct to the auditor). Send at least three weeks before effective date — refer to PEG sample letters AL7.7 / AL7.8.", "C (AV E)"),
 makeProcRow("2b. Meet with legal counsel to discuss the likely outcome of litigation or claims, where appropriate.", "C (AV E)"),
 makeProcRow("2c. Where management refuses permission to send the legal letter, perform alternative procedures or assess the implications for the auditor's report.", "C (AV E)"),
];

const dAccuracyValuation = (): ProcRow[] => [
 makeProcRow("1a. Discuss identified or suspected non-compliance with management and TCWG; obtain sufficient information to assess the financial-statement impact.", "AV"),
 makeProcRow("1b. Consider obtaining legal advice where doubt exists and the effect may be material.", "AV"),
 makeProcRow("1c. Where it is not possible to determine whether material non-compliance has occurred, modify the auditor's report accordingly.", "AV"),
 makeProcRow("2. Impact on estimates — consider whether information obtained provides new evidence about the valuation of litigation, claims or fines / penalties payable for non-compliance.", "AV (C)"),
];

const dExistence = (): ProcRow[] => [
 makeProcRow("a. Review the entity's insurance coverage for adequate protection against normal business risks.", "E (AV)"),
 makeProcRow("b. Inquire whether claims already made or expected may not be covered; estimate the extent and the potential financial-statement effect.", "E (AV)"),
 makeProcRow("c. Where claims are handled by an insurer, consider obtaining written confirmation of outstanding claims from the insurer's law firm.", "E (AV)"),
];

const dPresentation = (): ProcRow[] => [
 makeProcRow("1. Disclosures — confirm notes to the financial statements include disclosures required by the AFRF (refer to the 900-series forms).", "P"),
 makeProcRow("2. Relevant information — ensure overall presentation is not undermined by irrelevant information that obscures a proper understanding of the matters disclosed.", "P"),
];

function buildDefault(): Data645 {
 return {
 matters: [],
 procPreparation: dPreparation(),
 procCompleteness: dCompleteness(),
 procLegalCounsel: dLegalCounsel(),
 procAccuracyValuation: dAccuracyValuation(),
 procExistence: dExistence(),
 procPresentation: dPresentation(),
 nonComplianceIdentified: "",
 nonComplianceNotes: "",
 rmmReassessmentNeeded: "",
 rmmReassessmentNotes: "",
 reportModificationConsidered: "",
 reportModificationNotes: "",
 tcwgCommunicated: "",
 tcwgCommunicationLog: "",
 externalReportingRequired: "",
 externalReportingNotes: "",
 disclosuresAdequate: "",
 disclosureNotes: "",
 otherProcedures: "",
 evidenceSufficient: "",
 evidenceRationale: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Local stable components (module scope to keep React identity) ────────────

function LabelImpl({ children }: { children: React.ReactNode }) {
 return <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">{children}</label>;
}

function YNSelectImpl({ value, onChange, withNA = false, locked }: { value: string; onChange: (v: string) => void; withNA?: boolean; locked: boolean }) {
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

type SectionKey =
 | "procPreparation" | "procCompleteness" | "procLegalCounsel"
 | "procAccuracyValuation" | "procExistence" | "procPresentation";

function makeMatter(seed?: Partial<LcncMatter>): LcncMatter {
 return {
 id: Math.random().toString(36).slice(2, 9),
 type: "Litigation",
 description: "",
 counterparty: "",
 status: "",
 amount: "",
 counselStatus: "",
 fsImpact: "",
 disclosureAdequate: "",
 affectsEstimate: "",
...seed,
 };
}

// ── Component ────────────────────────────────────────────────────────────────

export function Audit645Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);
 const lcncRisks = useMemo(() => filterRisks(risks, LCNC_RISK_KEYWORDS), [risks]);

 const storageKey = `audit-645-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data645>(() => {
 const def = buildDefault();
 const stored = readJsonFromLocalStorage<Partial<Data645>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data645;
 // Migration guards (legacy v1 used `sections: [{title, rows}]`)
 if (!Array.isArray(merged.matters)) merged.matters = [];
 if (!Array.isArray(merged.procPreparation)) merged.procPreparation = def.procPreparation;
 if (!Array.isArray(merged.procCompleteness)) merged.procCompleteness = def.procCompleteness;
 if (!Array.isArray(merged.procLegalCounsel)) merged.procLegalCounsel = def.procLegalCounsel;
 if (!Array.isArray(merged.procAccuracyValuation)) merged.procAccuracyValuation = def.procAccuracyValuation;
 if (!Array.isArray(merged.procExistence)) merged.procExistence = def.procExistence;
 if (!Array.isArray(merged.procPresentation)) merged.procPresentation = def.procPresentation;
 return merged;
 });

 // Persist (debounced)
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
 const firstFillRef = useRef<HTMLElement>(null);
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 // Ready-to-conclude when every active procedure has been addressed
 const allProcsAddressed = useMemo(() => {
 const all: ProcRow[] = [
...data.procPreparation,...data.procCompleteness,...data.procLegalCounsel,
...data.procAccuracyValuation,...data.procExistence,...data.procPresentation,
 ];
 if (all.length === 0) return false;
 return all.every(p => p.psc !== "");
 }, [data]);

 // ── Procedure updaters ──────────────────────────────────────────────────────

 function updateProcRow(section: SectionKey, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) {
 setData(d => ({
...d,
 [section]: (d[section] as ProcRow[]).map(r => r.id === rowId ? {...r, [field]: value } : r),
 }));
 }
 const handler = (section: SectionKey) =>
 (_si: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) =>
 updateProcRow(section, rowId, field, value);

 // ── Matter helpers ──────────────────────────────────────────────────────────

 const addMatter = (seed?: Partial<LcncMatter>) =>
 setData(d => ({...d, matters: [...d.matters, makeMatter(seed)] }));
 const updateMatter = (id: string, patch: Partial<LcncMatter>) =>
 setData(d => ({...d, matters: d.matters.map(m => m.id === id ? {...m,...patch } : m) }));
 const removeMatter = (id: string) =>
 setData(d => ({...d, matters: d.matters.filter(m => m.id !== id) }));

 const YNSelect = ({ value, onChange, withNA = false }: { value: string; onChange: (v: string) => void; withNA?: boolean }) => (
 <YNSelectImpl value={value} onChange={onChange} withNA={withNA} locked={locked} />
 );
 const Label = LabelImpl;

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Identify and respond appropriately to litigation, claims and instances of non-compliance with laws and regulations that may be material to the financial statements."
 standard={`${ctx.standardPrefix} 250 / ${ctx.standardPrefix} 501`}
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
               setData(d => ({ ...d, tcwgCommunicationLog: 'Discussed litigation, claims and non-compliance procedures with TCWG (board minutes reviewed). No items of concern communicated — management confirmed no pending, threatened or actual litigation, claims or regulatory non-compliance at balance sheet date.' }));
               markLukaFilled('tcwgCommunicationLog');
             }
           },
           { set: () => {
               setData(d => ({ ...d, disclosureNotes: 'Reviewed financial statement note disclosures — no contingent liabilities, provisions or non-compliance disclosures required for the current period. Financial statements present all required disclosures in accordance with the applicable financial reporting framework.' }));
               markLukaFilled('disclosureNotes');
             }
           },
           { set: () => {
               setData(d => ({ ...d, evidenceRationale: 'Procedures performed in accordance with CAS 250 and CAS 501. Inquiries of management and review of correspondence, minutes and legal expense accounts identified no material litigation, claims or instances of non-compliance. Legal letter not required — no indicators of material litigation identified. Evidence is sufficient and appropriate.' }));
               markLukaFilled('evidenceRationale');
             }
           },
         ], () => setLukaState('done'));
       },
     }))}
   />
 ) : undefined}
 >
 {/* Performance materiality */}
 <WorksheetSection title="Performance materiality">
 <div className="text-sm font-mono">{formatCurrency(ctx.performanceMateriality)}</div>
 </WorksheetSection>

 {/* Linked 520 LCNC-risks */}
 <LinkedRisksCard
 overallRisk={overall}
 risks={lcncRisks}
 emptyHint="No litigation, claims or non-compliance risks tagged in Tag risks (e.g. litigation, claim, regulator, fine) to flow them through."
 storageKey={`audit-645-risks-${engagementId ?? "default"}`}
 locked={locked}
 />

 {/* Matters register (drives downstream forms) */}
 <WorksheetSection
 title="Litigation, claims & non-compliance register"
 right={
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" disabled={locked} onClick={() => addMatter()}>
 <Plus className="h-3 w-3 mr-1" /> Add matter
 </Button>
 }
 bodyClassName="p-0"
 >
 {data.matters.length === 0 ? (
 <p className="px-6 py-4 text-sm text-muted-foreground">
 No matters recorded. Add each identified litigation, claim, or instance of non-compliance — these flow in (TCWG), (representations), (estimates) and (auditor's report).
 </p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-muted/40">
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Type</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border">Description</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[140px]">Counterparty</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Status</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[110px]">Exposure ($)</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Legal counsel</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[140px]">F/S impact</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[90px]">Disclosure</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[90px]">→ 635?</th>
 <th className="px-3 py-2.5 border-b border-border w-[40px]" />
 </tr>
 </thead>
 <tbody>
 {data.matters.map(m => (
 <tr key={m.id} className="hover:bg-muted/20 align-top">
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={m.type} onValueChange={v => updateMatter(m.id, { type: v as MatterType })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Litigation">Litigation</SelectItem>
 <SelectItem value="Claim">Claim</SelectItem>
 <SelectItem value="Non-compliance">Non-compliance</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!m.description} />
 <Textarea disabled={locked} value={m.description} onChange={e => updateMatter(m.id, { description: e.target.value })}
 className="flex-1 min-h-[44px] text-sm resize-none" placeholder="Nature of matter" />
 </div>
 </td>
 <td className="border-b border-border p-2">
 <Input disabled={locked} value={m.counterparty} onChange={e => updateMatter(m.id, { counterparty: e.target.value })}
 className="h-8 text-sm" placeholder="—" />
 </td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={m.status} onValueChange={v => updateMatter(m.id, { status: v as MatterStatus })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Open">Open</SelectItem>
 <SelectItem value="Threatened">Threatened</SelectItem>
 <SelectItem value="Settled">Settled</SelectItem>
 <SelectItem value="Closed">Closed</SelectItem>
 <SelectItem value="Unknown">Unknown</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2">
 <Input disabled={locked} value={m.amount} onChange={e => updateMatter(m.id, { amount: e.target.value })}
 className="h-8 text-sm font-mono" placeholder="0" inputMode="decimal" />
 </td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={m.counselStatus} onValueChange={v => updateMatter(m.id, { counselStatus: v as CounselStatus })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Not required">Not required</SelectItem>
 <SelectItem value="Letter sent">Letter sent</SelectItem>
 <SelectItem value="Reply received">Reply received</SelectItem>
 <SelectItem value="Reply outstanding">Reply outstanding</SelectItem>
 <SelectItem value="Refused by mgmt">Refused by mgmt</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2">
 <Input disabled={locked} value={m.fsImpact} onChange={e => updateMatter(m.id, { fsImpact: e.target.value })}
 className="h-8 text-sm" placeholder="Recognised / disclosed / none" />
 </td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={m.disclosureAdequate} onValueChange={v => updateMatter(m.id, { disclosureAdequate: v as YNNA })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Yes</SelectItem>
 <SelectItem value="N">No</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2">
 <Select disabled={locked} value={m.affectsEstimate} onValueChange={v => updateMatter(m.id, { affectsEstimate: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Yes</SelectItem>
 <SelectItem value="N">No</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="border-b border-border p-2 text-center">
 <Button size="icon" variant="ghost" className="h-7 w-7" disabled={locked} onClick={() => removeMatter(m.id)}>
 <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </WorksheetSection>

 {/* Procedure sections (per CAS 250 / 501) */}
 <WorksheetSection title="Preparation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Understand the assessed risk", rows: data.procPreparation }]} locked={locked} onChange={handler("procPreparation")} />
 </WorksheetSection>

 <WorksheetSection title="Completeness — identify litigation, claims and non-compliance" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Inquiries, minutes, accounts and correspondence", rows: data.procCompleteness }]} locked={locked} onChange={handler("procCompleteness")} />
 </WorksheetSection>

 <WorksheetSection title="Completeness — communications with legal counsel" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Legal letters & meetings", rows: data.procLegalCounsel }]} locked={locked} onChange={handler("procLegalCounsel")} />
 </WorksheetSection>

 <WorksheetSection title="Accuracy / valuation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Identified or suspected non-compliance & impact on estimates", rows: data.procAccuracyValuation }]} locked={locked} onChange={handler("procAccuracyValuation")} />
 </WorksheetSection>

 <WorksheetSection title="Existence — insurance coverage" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Insurance review and claim confirmations", rows: data.procExistence }]} locked={locked} onChange={handler("procExistence")} />
 </WorksheetSection>

 <WorksheetSection title="Presentation" bodyClassName="p-0">
 <ProcedureTable showNumbers={false} sections={[{ title: "Disclosures & overall presentation", rows: data.procPresentation }]} locked={locked} onChange={handler("procPresentation")} />
 </WorksheetSection>

 {/* Overall evaluation */}
 <WorksheetSection title="Overall evaluation">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <Label>Non-compliance identified or suspected?</Label>
 <YNSelect value={data.nonComplianceIdentified} onChange={v => setData(d => ({...d, nonComplianceIdentified: v as YN }))} />
 </div>
 <div>
 <Label>RMM reassessment needed?</Label>
 <YNSelect value={data.rmmReassessmentNeeded} onChange={v => setData(d => ({...d, rmmReassessmentNeeded: v as YN }))} />
 </div>
 <div>
 <Label>Auditor's report modification considered?</Label>
 <YNSelect value={data.reportModificationConsidered} onChange={v => setData(d => ({...d, reportModificationConsidered: v as YN }))} />
 </div>
 {data.nonComplianceIdentified === "Y" && (
 <div className="md:col-span-3">
 <Label>Non-compliance — nature and financial-statement impact</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.nonComplianceNotes} />
 <Textarea disabled={locked} value={data.nonComplianceNotes} onChange={e => setData(d => ({...d, nonComplianceNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]" placeholder="Describe the suspected/identified non-compliance, evidence obtained and the impact on the financial statements." />
 </div>
 </div>
 )}
 {data.rmmReassessmentNeeded === "Y" && (
 <div className="md:col-span-3">
 <Label>RMM reassessment — required updates</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.rmmReassessmentNotes} />
 <Textarea disabled={locked} value={data.rmmReassessmentNotes} onChange={e => setData(d => ({...d, rmmReassessmentNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[64px]" placeholder="Document the revised assessment and update accordingly." />
 </div>
 </div>
 )}
 {data.reportModificationConsidered === "Y" && (
 <div className="md:col-span-3">
 <Label>Auditor's report — implications</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.reportModificationNotes} />
 <Textarea disabled={locked} value={data.reportModificationNotes} onChange={e => setData(d => ({...d, reportModificationNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[64px]" placeholder="Describe the nature of the modification considered (qualification / EOM / OM) and link" />
 </div>
 </div>
 )}
 </div>
 </WorksheetSection>

 {/* Communicating & reporting */}
 <WorksheetSection title="Communicating & reporting">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label>Communicated to TCWG?</Label>
 <YNSelect value={data.tcwgCommunicated} onChange={v => setData(d => ({...d, tcwgCommunicated: v as YN }))} />
 </div>
 <div>
 <Label>External reporting responsibility?</Label>
 <YNSelect value={data.externalReportingRequired} onChange={v => setData(d => ({...d, externalReportingRequired: v as YN }))} />
 </div>
 <div ref={firstFillRef as React.RefObject<HTMLDivElement>} className={`md:col-span-2${isDemoEngagement && lukaHighlightFields.has('tcwgCommunicationLog') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}`}>
 <Label>TCWG communication log</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.tcwgCommunicationLog} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('tcwgCommunicationLog')}>
 <Textarea disabled={locked} value={data.tcwgCommunicationLog} onChange={e => setData(d => ({...d, tcwgCommunicationLog: e.target.value }))}
 className="flex-1 text-sm min-h-[80px]" placeholder="Summarise what was communicated, to whom, and on what date. Where intentional management non-compliance is suspected, communicate directly with TCWG." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 {data.externalReportingRequired === "Y" && (
 <div className="md:col-span-2">
 <Label>External reporting — basis and actions taken</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.externalReportingNotes} />
 <Textarea disabled={locked} value={data.externalReportingNotes} onChange={e => setData(d => ({...d, externalReportingNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[64px]" placeholder="Identify the authority, the legal basis for reporting, and the steps taken (or planned)." />
 </div>
 </div>
 )}
 </div>
 </WorksheetSection>

 {/* Disclosures */}
 <WorksheetSection title="Disclosures">
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
 <div>
 <Label>Disclosures adequate (AFRF)?</Label>
 <YNSelect value={data.disclosuresAdequate} onChange={v => setData(d => ({...d, disclosuresAdequate: v as YNNA }))} withNA />
 </div>
 <div className={isDemoEngagement && lukaHighlightFields.has('disclosureNotes') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}>
 <Label>Disclosure notes</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.disclosureNotes} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('disclosureNotes')}>
 <Textarea disabled={locked} value={data.disclosureNotes} onChange={e => setData(d => ({...d, disclosureNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]" placeholder="Confirm notes to the F/S include all required disclosures (provisions, contingent liabilities, non-compliance impacts) and that overall presentation is not obscured." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 {/* Other procedures */}
 <WorksheetSection title="Other procedures (specify)">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.otherProcedures} />
 <Textarea disabled={locked} value={data.otherProcedures} onChange={e => setData(d => ({...d, otherProcedures: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]" placeholder="Add any additional procedures performed in response to identified risks." />
 </div>
 </WorksheetSection>

 {/* Audit conclusion */}
 <WorksheetSection
 title={`Audit conclusion (${ctx.standardPrefix} 250 / ${ctx.standardPrefix} 501)`}
 right={
 allProcsAddressed && data.evidenceSufficient === "" ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
 All procedures addressed — ready to conclude
 </span>
 ) : null
 }
 >
 <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
 <div>
 <Label>Evidence sufficient & appropriate?</Label>
 <YNSelect value={data.evidenceSufficient} onChange={v => setData(d => ({...d, evidenceSufficient: v as YN }))} />
 </div>
 <div className={isDemoEngagement && lukaHighlightFields.has('evidenceRationale') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2' : ''}>
 <Label>Rationale</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.evidenceRationale} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('evidenceRationale')}>
 <Textarea disabled={locked} value={data.evidenceRationale} onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]"
 placeholder="The audit evidence obtained is sufficient and appropriate to reduce the risk of material misstatement from litigation, claims and non-compliance to an acceptably low level." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-645"
 engagementId={engagementId}
 concluded={data.concluded}
 concludedOn={data.concludedOn}
 onConclude={() => {
 const u = {...data, concluded: true, concludedOn: new Date().toISOString() };
 setData(u);
 writeJsonToLocalStorage(storageKey, u);
 }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 />
 </WorksheetLayout>
 );
}
