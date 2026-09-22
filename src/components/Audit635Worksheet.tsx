import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { loadRisks520, overallRisk520, filterRisks, type Risk520Row } from "@/lib/audit520Bridge";
import { ESTIMATE_RISK_KEYWORDS, type YN, type YNNA } from "@/lib/audit635Bridge";
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

interface Data635 {
 // Estimate context (auto-populated)
 selectedRiskRef: string; // ref of the linked 520 risk
 estimateName: string;
 estimateAmount: string;
 managementMethod: string;

 // Approach selection (A / B / C)
 approachA: boolean;
 approachB: boolean;
 approachC: boolean;

 // Procedures (per doc)
 proceduresA: ProcRow[];
 proceduresB: ProcRow[];
 proceduresC: ProcRow[];

 // Tests of controls
 testsOfControlsApplicable: boolean;
 testsOfControls: ProcRow[];

 // Overall evaluation
 managementBiasIdentified: YN;
 managementBiasNotes: string;
 rmmReassessmentAppropriate: YN;
 rmmReassessmentNotes: string;
 pointEstimateRange: string;

 // Presentation & disclosure
 allEstimatesDisclosed: YN;
 afrfCompliant: YN;
 presentationAppropriate: YNNA;
 presentationNotes: string;

 // Audit conclusion
 evidenceSufficient: YN;
 evidenceRationale: string;

 concluded: boolean;
 concludedOn: string;
}

// ── Default procedure rows (verbatim from CAS 540) ──────────────────

function defaultProceduresA(): ProcRow[] {
 return [
 makeProcRow(
 "1. Actual outcomes — obtain evidence subsequent to the balance-sheet date for actual outcomes (amounts) of estimates. If different from the estimate at the measurement date, inquire about reasons and request adjustments.",
 "AV (C E)",
 ),
 makeProcRow(
 "2. Changes in circumstances — inquire about any changes in circumstances and other relevant conditions since the measurement date that may affect the estimate.",
 "AV (C E)",
 ),
 ];
}

function defaultProceduresB(): ProcRow[] {
 return [
 makeProcRow(
 "1. Methods — evaluate whether the method used to prepare the estimate is appropriate under the AFRF and consistent with prior periods; where the method changed, evaluate whether the change is appropriate.",
 "AV (C E)",
 ),
 makeProcRow(
 "2. Management bias — evaluate whether judgments made in selecting the method indicate possible management bias.",
 "AV (C E)",
 ),
 makeProcRow(
 "3. Mathematical accuracy — determine whether the estimate was prepared in accordance with the stated method and the calculations are mathematically accurate.",
 "AV",
 ),
 makeProcRow(
 "4. Management's use of experts — assess competency, expertise and objectivity; obtain the engagement letter and expert report; review assumptions, methods and data; recompute key calculations.",
 "AV (C E)",
 ),
 makeProcRow(
 "5. Complex modelling — where modelling is used, evaluate that the design meets the AFRF measurement objective, changes from the prior period are appropriate, and adjustments to model output are consistent with the AFRF.",
 "AV",
 ),
 makeProcRow(
 "6. Significant assumptions — evaluate whether assumptions (individually and as a whole) are appropriate under the AFRF, reflect current market conditions, are consistent with each other and with assumptions used elsewhere, and that management has the ability and intent to carry out planned actions. Consider sensitivity and bias indicators.",
 "AV (C E)",
 ),
 makeProcRow(
 "7. Data — obtain sufficient evidence about the selection and application of data: appropriateness under the AFRF, credibility of sources, competence of preparers, relevance and reliability, and that contractual requirements are correctly understood.",
 "AV (C E)",
 ),
 makeProcRow(
 "8. Management's point estimate — understand how management addressed estimation uncertainty in selecting the point estimate and how related disclosures were developed.",
 "AV (C E)",
 ),
 makeProcRow(
 "9. Integrity of assumptions and data — confirm the integrity of significant assumptions and data has been maintained throughout the application of the method.",
 "AV (C E)",
 ),
 makeProcRow(
 "10. Estimation uncertainty not understood — where management has not adequately addressed estimation uncertainty, request additional procedures, reconsider the point estimate, develop an auditor's point estimate, and evaluate whether a significant control deficiency exists.",
 "AV (C E)",
 ),
 ];
}

function defaultProceduresC(): ProcRow[] {
 return [
 makeProcRow(
 "1. Point estimate — develop a point estimate to evaluate management's estimate and related disclosures about estimation uncertainty. Record any differences and obtain explanations.",
 "E",
 ),
 makeProcRow(
 "2. Range estimate — develop a range supported by audit evidence and reasonable under the AFRF; perform procedures over disclosure of estimation uncertainty. Record any differences",
 "E",
 ),
 makeProcRow(
 "3. Use of auditor's expert — assess competency, expertise and objectivity; obtain engagement letter and report; review the reasonableness of assumptions, methods and data; verify mathematical accuracy.",
 "",
 ),
 ];
}

function defaultTestsOfControls(): ProcRow[] {
 return [
 makeProcRow(
 "Tests of controls — perform tests of operating effectiveness at the assertion level where the assessment of control risk is other than maximum, or where substantive procedures alone would not provide sufficient appropriate audit evidence.",
 "",
 ),
 ];
}

function buildDefault(): Data635 {
 return {
 selectedRiskRef: "",
 estimateName: "",
 estimateAmount: "",
 managementMethod: "",
 approachA: true,
 approachB: true,
 approachC: true,
 proceduresA: defaultProceduresA(),
 proceduresB: defaultProceduresB(),
 proceduresC: defaultProceduresC(),
 testsOfControlsApplicable: false,
 testsOfControls: defaultTestsOfControls(),
 managementBiasIdentified: "",
 managementBiasNotes: "",
 rmmReassessmentAppropriate: "",
 rmmReassessmentNotes: "",
 pointEstimateRange: "",
 allEstimatesDisclosed: "",
 afrfCompliant: "",
 presentationAppropriate: "",
 presentationNotes: "",
 evidenceSufficient: "",
 evidenceRationale: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Auto-population: derive an estimate label from a 520 risk ────────────────

function summariseRiskAsEstimate(r: Risk520Row): string {
 // Prefer the FS area; fall back to first sentence of RMM
 if (r.scotabd) return r.scotabd;
 const first = r.rmmIdentified.split(/[.;]/)[0]?.trim() ?? "";
 return first.length > 80 ? first.slice(0, 77) + "…" : first;
}

// ── Component ────────────────────────────────────────────────────────────────

type SectionKey = "proceduresA" | "proceduresB" | "proceduresC" | "testsOfControls";

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


export function Audit635Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);
 const estimateRisks = useMemo(
 () => filterRisks(risks, ESTIMATE_RISK_KEYWORDS),
 [risks],
 );

 const storageKey = `audit-635-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data635>(() => {
 const def = buildDefault();
 const stored = readJsonFromLocalStorage<Partial<Data635>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data635;
 // Migration guards for arrays
 if (!Array.isArray(merged.proceduresA)) merged.proceduresA = def.proceduresA;
 if (!Array.isArray(merged.proceduresB)) merged.proceduresB = def.proceduresB;
 if (!Array.isArray(merged.proceduresC)) merged.proceduresC = def.proceduresC;
 if (!Array.isArray(merged.testsOfControls)) merged.testsOfControls = def.testsOfControls;
 return merged;
 });

 // Auto-select the first estimate-related 520 risk on first load
 useEffect(() => {
 if (!data.selectedRiskRef && !data.estimateName && estimateRisks.length > 0) {
 const r = estimateRisks[0];
 setData(d => ({
...d,
 selectedRiskRef: r.ref,
 estimateName: summariseRiskAsEstimate(r),
 }));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [estimateRisks.length]);

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
 const firstFillRef = useRef<HTMLDivElement>(null);
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }
 const linkedRisk = useMemo(
 () => estimateRisks.find(r => r.ref === data.selectedRiskRef),
 [estimateRisks, data.selectedRiskRef],
 );

 // Auto-suggest evidence-sufficient based on PSC completion
 const allProcsAddressed = useMemo(() => {
 const active: ProcRow[] = [
...(data.approachA ? data.proceduresA : []),
...(data.approachB ? data.proceduresB : []),
...(data.approachC ? data.proceduresC : []),
...(data.testsOfControlsApplicable ? data.testsOfControls : []),
 ];
 if (active.length === 0) return false;
 return active.every(p => p.psc !== "");
 }, [data]);

 // ── Procedure updaters ──────────────────────────────────────────────────────

 function updateProcRow(
 section: SectionKey,
 rowId: string,
 field: keyof ProcRow,
 value: string | RefDoc[],
 ) {
 setData(d => ({
...d,
 [section]: d[section].map(r => r.id === rowId ? {...r, [field]: value } : r),
 }));
 }

 const handler = (section: SectionKey) =>
 (_si: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) =>
 updateProcRow(section, rowId, field, value);

 function selectLinkedRisk(ref: string) {
 const r = estimateRisks.find(x => x.ref === ref);
 setData(d => ({
...d,
 selectedRiskRef: ref,
 estimateName: r ? summariseRiskAsEstimate(r) : d.estimateName,
 }));
 }

 // ── Local helpers ───────────────────────────────────────────────────────────

 const YNSelect = ({ value, onChange, withNA = false }: { value: string; onChange: (v: string) => void; withNA?: boolean }) => (
 <YNSelectImpl value={value} onChange={onChange} withNA={withNA} locked={locked} />
 );

 const Label = LabelImpl;


 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Document the further audit procedures to obtain evidence about the reasonableness of an accounting estimate (including fair value) and the adequacy of related disclosures. Use this form for ONE estimate at a time."
 standard={`${ctx.standardPrefix} 540`}
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
               setData(d => ({ ...d, estimateName: 'Allowance for Doubtful Accounts', estimateAmount: '84,500' }));
               markLukaFilled('estimate-name');
             }
           },
           {
             set: () => {
               setData(d => ({ ...d, managementMethod: 'Management applied an aging schedule analysis using historical write-off rates by aging bucket. Accounts over 90 days past due: estimated at 50% uncollectible; 61–90 days: 20%; 31–60 days: 5%. Historical average write-off rate over 3 years: 2.1% of gross receivables.' }));
               markLukaFilled('estimate-method');
             }
           },
           {
             set: () => {
               setData(d => ({ ...d, evidenceRationale: 'Reviewed aging analysis, applied independent recalculation using historical write-off rates, and tested reasonableness against subsequent cash receipts. Estimate falls within the range of reasonable outcomes under ASPE/IFRS. No material exceptions identified.' }));
               markLukaFilled('evidence-rationale');
             }
           },
         ], () => setLukaState('done'));
       },
     }))}
   />
 ) : undefined}
 >
 {/* Linked 520 estimate-risks */}
 <LinkedRisksCard
 overallRisk={overall}
 risks={estimateRisks}
 emptyHint="No estimate-related risks tagged in Tag risks (e.g. allowance, provision, valuation, impairment) to flow them through."
 storageKey={`audit-635-risks-${engagementId ?? "default"}`}
 locked={locked}
 />

 {/* Estimate context */}
 <WorksheetSection
 title="Estimate addressed by this worksheet"
 right={<span className="text-[11px] text-muted-foreground">Linked · editable</span>}
 >
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="md:col-span-2">
 <Label>Linked risk</Label>
 <Select disabled={locked || estimateRisks.length === 0} value={data.selectedRiskRef} onValueChange={selectLinkedRisk}>
 <SelectTrigger className="h-9 text-sm">
 <SelectValue placeholder={estimateRisks.length === 0 ? "No estimate risks in" : "Select linked risk"} />
 </SelectTrigger>
 <SelectContent>
 {estimateRisks.map(r => (
 <SelectItem key={r.ref} value={r.ref}>
 {r.ref} · {r.scotabd ?? "FS-level"} — {r.rmmIdentified.slice(0, 70)}{r.rmmIdentified.length > 70 ? "…" : ""}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {linkedRisk && (
 <p className="text-[11px] text-muted-foreground mt-1.5">
 IR: <span className="font-medium">{linkedRisk.inherentRisk || "—"}</span>
 {" · "}Sig. risk: <span className="font-medium">{linkedRisk.significantRisk === "Y" ? "Yes" : "No"}</span>
 {" · "}Fraud: <span className="font-medium">{linkedRisk.fraudRisk === "Y" ? "Yes" : "No"}</span>
 </p>
 )}
 </div>
 <div>
 <Label>Estimate amount ($)</Label>
 <Input
 disabled={locked}
 value={data.estimateAmount}
 onChange={e => setData(d => ({...d, estimateAmount: e.target.value }))}
 className="h-9 text-sm"
 placeholder="0"
 inputMode="decimal"
 />
 </div>
 <div ref={firstFillRef} className={`md:col-span-3${isDemoEngagement && lukaHighlightFields.has('estimate-name') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}`}>
 <Label>Estimate name / description</Label>
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('estimate-name')}>
   <Input
   disabled={locked}
   value={data.estimateName}
   onChange={e => setData(d => ({...d, estimateName: e.target.value }))}
   className="h-9 text-sm"
   placeholder="e.g. Allowance for doubtful accounts"
   />
 </LukaTypingRow>
 </div>
 <div className={`md:col-span-3${isDemoEngagement && lukaHighlightFields.has('estimate-method') ? ' border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}`}>
 <Label>Method used by management to prepare the estimate</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.managementMethod} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('estimate-method')}>
   <Textarea
   disabled={locked}
   value={data.managementMethod}
   onChange={e => setData(d => ({...d, managementMethod: e.target.value }))}
   className="flex-1 text-sm min-h-[72px]"
   placeholder="Describe the method, key assumptions, data sources and any model or expert used."
   />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 {/* Testing approach selection */}
 <WorksheetSection
 title="Testing approach"
 right={<span className="text-[11px] text-muted-foreground">Select one or more — procedures load below</span>}
 >
 <div className="flex flex-wrap gap-6 text-sm">
 {([
 ["approachA", "A · Evaluating subsequent events"],
 ["approachB", "B · Testing management's accounting estimate"],
 ["approachC", "C · Developing a point estimate or range"],
 ] as const).map(([k, label]) => (
 <label key={k} className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 disabled={locked}
 checked={data[k] as boolean}
 onCheckedChange={v => setData(d => ({...d, [k]: !!v }))}
 />
 <span>{label}</span>
 </label>
 ))}
 </div>
 <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
 Scale the response based on the assessed risks. Add or remove procedures as necessary to provide a complete and appropriate response.
 </p>
 </WorksheetSection>

 {/* A — Subsequent events */}
 {data.approachA && (
 <WorksheetSection title="A · Evaluating subsequent events" bodyClassName="p-0">
 <ProcedureTable
 sections={[{ title: "Subsequent-event procedures", rows: data.proceduresA }]}
 locked={locked}
 showNumbers={false}
 onChange={handler("proceduresA")}
 />
 </WorksheetSection>
 )}

 {/* B — Testing management's estimate */}
 {data.approachB && (
 <WorksheetSection title="B · Testing management's accounting estimate" bodyClassName="p-0">
 <ProcedureTable
 sections={[{ title: "Method, assumptions, data and bias", rows: data.proceduresB }]}
 locked={locked}
 showNumbers={false}
 onChange={handler("proceduresB")}
 />
 </WorksheetSection>
 )}

 {/* C — Auditor's point estimate / range */}
 {data.approachC && (
 <WorksheetSection title="C · Developing a point estimate or range" bodyClassName="p-0">
 <ProcedureTable
 sections={[{ title: "Auditor's independent estimate", rows: data.proceduresC }]}
 locked={locked}
 showNumbers={false}
 onChange={handler("proceduresC")}
 />
 </WorksheetSection>
 )}

 {/* Tests of controls */}
 <WorksheetSection
 title="Performing tests of controls"
 right={
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <Checkbox
 disabled={locked}
 checked={data.testsOfControlsApplicable}
 onCheckedChange={v => setData(d => ({...d, testsOfControlsApplicable: !!v }))}
 />
 Applicable
 </label>
 }
 bodyClassName={data.testsOfControlsApplicable ? "p-0" : "p-6"}
 >
 {data.testsOfControlsApplicable ? (
 <ProcedureTable
 sections={[{ title: "Operating-effectiveness procedures", rows: data.testsOfControls }]}
 locked={locked}
 showNumbers={false}
 onChange={handler("testsOfControls")}
 />
 ) : (
 <p className="text-sm text-muted-foreground">
 Not applicable — substantive procedures alone provide sufficient appropriate audit evidence at the assertion level.
 </p>
 )}
 </WorksheetSection>

 {/* Overall evaluation */}
 <WorksheetSection title="Overall evaluation">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label>Indicators of management bias?</Label>
 <YNSelect
 value={data.managementBiasIdentified}
 onChange={v => setData(d => ({...d, managementBiasIdentified: v as YN }))}
 />
 <p className="text-[11px] text-muted-foreground mt-1.5">
 Where identified, record the risk and evaluate the implications for the audit.
 </p>
 </div>
 <div>
 <Label>Assessed RMM at the assertion level still appropriate?</Label>
 <YNSelect
 value={data.rmmReassessmentAppropriate}
 onChange={v => setData(d => ({...d, rmmReassessmentAppropriate: v as YN }))}
 />
 </div>
 {data.managementBiasIdentified === "Y" && (
 <div className="md:col-span-2">
 <Label>Management bias — supporting evidence</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.managementBiasNotes} />
 <Textarea
 disabled={locked}
 value={data.managementBiasNotes}
 onChange={e => setData(d => ({...d, managementBiasNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[64px]"
 placeholder="Describe the judgments / decisions that indicate possible bias and the implications for the audit."
 />
 </div>
 </div>
 )}
 {data.rmmReassessmentAppropriate === "N" && (
 <div className="md:col-span-2">
 <Label>RMM reassessment — required change</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.rmmReassessmentNotes} />
 <Textarea
 disabled={locked}
 value={data.rmmReassessmentNotes}
 onChange={e => setData(d => ({...d, rmmReassessmentNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[64px]"
 placeholder="Document the revised assessment and update accordingly."
 />
 </div>
 </div>
 )}
 <div className="md:col-span-2">
 <Label>Auditor's point estimate / range vs management's estimate</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.pointEstimateRange} />
 <Textarea
 disabled={locked}
 value={data.pointEstimateRange}
 onChange={e => setData(d => ({...d, pointEstimateRange: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]"
 placeholder="Document the point estimate or range, the difference vs management's estimate, and whether the difference is within performance materiality."
 />
 </div>
 </div>
 </div>
 </WorksheetSection>

 {/* Presentation & disclosure */}
 <WorksheetSection title="Presentation & disclosure">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <Label>All estimates disclosed?</Label>
 <YNSelect
 value={data.allEstimatesDisclosed}
 onChange={v => setData(d => ({...d, allEstimatesDisclosed: v as YN }))}
 />
 <p className="text-[11px] text-muted-foreground mt-1.5">No other events/conditions identified during the audit that require recognition or disclosure.</p>
 </div>
 <div>
 <Label>Financial statements comply with the AFRF?</Label>
 <YNSelect
 value={data.afrfCompliant}
 onChange={v => setData(d => ({...d, afrfCompliant: v as YN }))}
 />
 </div>
 <div>
 <Label>Presentation appropriate?</Label>
 <YNSelect
 value={data.presentationAppropriate}
 onChange={v => setData(d => ({...d, presentationAppropriate: v as YNNA }))}
 withNA
 />
 <p className="text-[11px] text-muted-foreground mt-1.5">Classification, aggregation, terminology, and estimation-uncertainty disclosure.</p>
 </div>
 <div className="md:col-span-3">
 <Label>Presentation & disclosure notes</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.presentationNotes} />
 <Textarea
 disabled={locked}
 value={data.presentationNotes}
 onChange={e => setData(d => ({...d, presentationNotes: e.target.value }))}
 className="flex-1 text-sm min-h-[72px]"
 placeholder="Conclude on whether the F/S disclose estimation uncertainty and that information is relevant, reliable, comparable and understandable (fair-presentation or compliance framework)."
 />
 </div>
 </div>
 </div>
 </WorksheetSection>

 {/* Audit conclusion */}
 <WorksheetSection
 title="Audit conclusion"
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
 <Label>Evidence sufficient &amp; appropriate?</Label>
 <YNSelect
 value={data.evidenceSufficient}
 onChange={v => setData(d => ({...d, evidenceSufficient: v as YN }))}
 />
 </div>
 <div className={isDemoEngagement && lukaHighlightFields.has('evidence-rationale') ? 'border-l-2 border-violet-400 bg-violet-50/40 pl-2 rounded' : ''}>
 <Label>Rationale</Label>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.evidenceRationale} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('evidence-rationale')}>
   <Textarea
   disabled={locked}
   value={data.evidenceRationale}
   onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))}
   className="flex-1 text-sm min-h-[72px]"
   placeholder="Confirm the audit evidence obtained is sufficient and appropriate to reduce the RMM related to this estimate to an acceptably low level."
   />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-635"
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
