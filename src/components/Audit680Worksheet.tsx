// — ASPE Supplementary Audit Procedures
// First-time adoption (1500), Financial instruments (3856), Employee future benefits (3462).
// Aligned with WorksheetShell design standards.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
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

// ── Procedure seeds ──────────────────────────────────────────────────────────

// First-time adoption (Section 1500) — high-level grouping
const d1500_Understanding = (): ProcRow[] => [
 makeProcRow("Review the ASPE accounting policies adopted at the date of transition: identify differences between pre-changeover and ASPE policies; identify Section 1500 exemptions chosen; assess impact on the opening balance sheet at transition.", "AV (C E)"),
];
const d1500_OBS = (): ProcRow[] => [
 makeProcRow("Opening balance sheet — confirm correct transition date applied; consistent accounting policies across all periods presented; all assets/liabilities recognised, measured & classified per ASPE; no items recognised that ASPE does not permit.", "AV (P)"),
];
const d1500_Risk = (): ProcRow[] => [
 makeProcRow("Assess RMM resulting from first-time adoption based on the understanding above and other risk factors on Forms 520 / 590.", "AV (C E)"),
];
const d1500_Exemptions = (): ProcRow[] => [
 makeProcRow("a. Business combinations — where Section 1582 not applied retrospectively: confirm related standards adopted (1601 / 1602); recognition of past-combination assets/liabilities; intangibles & goodwill treatment; impairment testing; consistent treatment across combinations.", "AV (P)"),
 makeProcRow("b. Fair value — where PP&E measured at fair value as deemed cost: obtain calculations and FV assumptions; assess management's expert; examine OBS / amortization / opening RE adjustments.", "AV (P)"),
 makeProcRow("c. Employee future benefits — unamortized transitional balances recognised in opening RE per Section 3462 transitional provisions.", "AV (P)"),
 makeProcRow("d. Cumulative translation differences reset to zero on adoption — review OBS / opening RE adjustments.", "AV (P)"),
 makeProcRow("e. FI — compound instruments (liability expired): supporting calculations and evidence reviewed.", "AV (P)"),
 makeProcRow("f. FI — designated at fair value on adoption: calculations, expert qualifications, reasonableness, OBS / RE adjustments.", "AV (P)"),
 makeProcRow("g. FI — retractable / mandatorily redeemable shares (tax planning): redemption amount recognised at appropriate date.", "AV (P)"),
 makeProcRow("h. FI — related-party transitional provisions (Section 3856.68): calculations / cost assumptions, OBS & opening RE adjustments.", "AV (P)"),
 makeProcRow("i. Stock-based payment — elections not to apply recognition/measurement or calculated-value method supported by documentation.", "AV"),
 makeProcRow("j. Asset retirement obligations — nature & valuation; cash-flow assumptions; profit component if self-performed; discount rate; expert assessment; difference between obligation change & asset carrying-amount change charged to opening RE.", "AV (P)"),
 makeProcRow("k. Related-party transactions — election not to restate disclosed.", "AV"),
];
const d1500_Reporting = (): ProcRow[] => [
 makeProcRow("5. Corresponding figures — revised engagement letter; additional auditor's-report paragraph; impact of transition adjustments; disclosure that comparatives and opening balances are unaudited.", "P"),
 makeProcRow("6. Comparative F/S — revised engagement & representation letters covering two-year opinion; subsequent events impact across the comparative period; consistent note detail; additional audit procedures on comparatives as applicable.", "P"),
];

// Financial instruments (Section 3856)
const d3856_Understanding = (): ProcRow[] => [
 makeProcRow("Identify and understand all financial instruments meeting the definition of a financial asset/liability (AR/AP, loans, RP loans, mandatorily redeemable shares, portfolio investments).", "C AV E"),
];
const d3856_General = (): ProcRow[] => [
 makeProcRow("FI policy — appropriateness of accounting policy note; instruments at amortised cost; fair-value calculations (cash flows, discount rates); assumptions; coverage of all FAs/FLs.", "AV (P)"),
];
const d3856_InitArms = (): ProcRow[] => [
 makeProcRow("Arm's-length initial recognition at fair value, adjusted by transaction costs/financing fees when not subsequently at FV.", "AV"),
];
const d3856_InitRP = (): ProcRow[] => [
 makeProcRow("Related-party initial recognition — at FV (quoted equity/debt or observable inputs or derivative) or at cost (with/without repayment terms); not recorded for variable/contingent portion.", "AV"),
];
const d3856_Forgiveness = (): ProcRow[] => [
 makeProcRow("RP forgiveness of debt — recognised in equity (not in normal course) or net income (in normal course / impracticable to determine).", "AV"),
];
const d3856_RPImpair = (): ProcRow[] => [
 makeProcRow("RP impairment — significant adverse change → carrying amount reduced (debt: highest of undiscounted CFs, sale value, collateral value; equity: amount realisable on sale).", "AV"),
];
const d3856_PrefShares = (): ProcRow[] => [
 makeProcRow("Mandatorily redeemable / retractable preferred shares — initial measurement & classification (equity at par/stated/assigned OR liability at redemption amount).", "AV (C)"),
 makeProcRow("Subsequent measurement — if equity-classification conditions no longer met: measure at redemption amount; present as financial liability; adjust RE / separate equity component.", "AV (C)"),
];
const d3856_NonMarket = (): ProcRow[] => [
 makeProcRow("Loan / receivable at non-market rate — supporting fair value calculations; policy note; appropriate discount rate.", "AV (P)"),
];
const d3856_Portfolio = (): ProcRow[] => [
 makeProcRow("Portfolio investments in active markets — policy wording; brokerage confirmations of FV; opening/closing balance adjustments; income tax considerations under 3465.", "AV (P)"),
];
const d3856_FxDeriv = (): ProcRow[] => [
 makeProcRow("FX contracts / derivatives without hedge accounting — identified as freestanding derivatives; FV documentation; period-end gain/loss; note disclosure.", "AV (P)"),
];

// Employee future benefits (Section 3462)
const d3462_Understanding = (): ProcRow[] => [
 makeProcRow("Identify and understand all employment benefits meeting Section 3462 (pension / other retirement / post-employment / termination / compensated absences).", "C AV E P"),
];
const d3462_DC = (): ProcRow[] => [
 makeProcRow("Defined contribution plans — understanding of plan & benefits; liability measured on discounted basis (or undiscounted if < 12 months); future-contribution valuation including current service cost, interest cost, past-service cost amortization, interest income on surplus; assumptions reviewed.", "AV"),
];
const d3462_DB = (): ProcRow[] => [
 makeProcRow("Defined benefit plans — understanding of plan; policies (funding vs accounting valuation, actuarial gains/losses & past-service costs); actuarial valuation, FV of plan assets, mgmt reps and supporting docs; period cost composition (current service, net finance cost, remeasurements per 3462.85).", "AV"),
];
const d3462_Termination = (): ProcRow[] => [
 makeProcRow("Termination benefits — liability & expense recognised in the period the conditions of the special/contractual benefit arrangement are met (approval, communication, identification of affected employees, estimability, etc.).", "AV (C E)"),
];
const d3462_Actuary = (): ProcRow[] => [
 makeProcRow("Actuarial valuation — written confirmation from actuary: standards followed (CIA); methods in accordance with 3462; appropriate materiality; coverage of all benefit plans; agreement to communicate intervening events; extrapolation representation where applicable.", "AV"),
 makeProcRow("Evaluate competence/objectivity of the actuary; assumptions reflect mgmt's best estimates; data accurate/reliable based on payroll-stream procedures.", "AV"),
];
const d3462_Assets = (): ProcRow[] => [
 makeProcRow("Plan assets — confirmation as to existence, ownership and valuation (e.g. brokerage statements).", "C AV E P"),
];

// ── State ────────────────────────────────────────────────────────────────────

interface Data680 {
 // Section toggles
 apply1500: boolean;
 apply3856: boolean;
 apply3462: boolean;

 // First-time adoption — exemption checkboxes (drive procedures relevance)
 exBusinessCombinations: boolean;
 exFairValue: boolean;
 exEmployeeBenefits: boolean;
 exCumulativeTranslation: boolean;
 exFiCompound: boolean;
 exFiFairValue: boolean;
 exFiRetractable: boolean;
 exFiRelatedParty: boolean;
 exStockBased: boolean;
 exARO: boolean;
 exRelatedParty: boolean;
 reportingChoice: "Corresponding figures" | "Comparative F/S" | "Neither" | "";

 // Procedure tables
 proc1500_Understanding: ProcRow[];
 proc1500_OBS: ProcRow[];
 proc1500_Risk: ProcRow[];
 proc1500_Exemptions: ProcRow[];
 proc1500_Reporting: ProcRow[];

 proc3856_Understanding: ProcRow[];
 proc3856_General: ProcRow[];
 proc3856_InitArms: ProcRow[];
 proc3856_InitRP: ProcRow[];
 proc3856_Forgiveness: ProcRow[];
 proc3856_RPImpair: ProcRow[];
 proc3856_PrefShares: ProcRow[];
 proc3856_NonMarket: ProcRow[];
 proc3856_Portfolio: ProcRow[];
 proc3856_FxDeriv: ProcRow[];

 proc3462_Understanding: ProcRow[];
 proc3462_DC: ProcRow[];
 proc3462_DB: ProcRow[];
 proc3462_Termination: ProcRow[];
 proc3462_Actuary: ProcRow[];
 proc3462_Assets: ProcRow[];

 evidenceSufficient: YN;
 evidenceRationale: string;
 concluded: boolean;
 concludedOn: string;
}

const PROC_KEYS = [
 "proc1500_Understanding","proc1500_OBS","proc1500_Risk","proc1500_Exemptions","proc1500_Reporting",
 "proc3856_Understanding","proc3856_General","proc3856_InitArms","proc3856_InitRP","proc3856_Forgiveness",
 "proc3856_RPImpair","proc3856_PrefShares","proc3856_NonMarket","proc3856_Portfolio","proc3856_FxDeriv",
 "proc3462_Understanding","proc3462_DC","proc3462_DB","proc3462_Termination","proc3462_Actuary","proc3462_Assets",
] as const;
type ProcKey = (typeof PROC_KEYS)[number];

function buildDefault(): Data680 {
 return {
 apply1500: false, apply3856: true, apply3462: false,
 exBusinessCombinations: false, exFairValue: false, exEmployeeBenefits: false,
 exCumulativeTranslation: false, exFiCompound: false, exFiFairValue: false,
 exFiRetractable: false, exFiRelatedParty: false, exStockBased: false,
 exARO: false, exRelatedParty: false, reportingChoice: "",

 proc1500_Understanding: d1500_Understanding(), proc1500_OBS: d1500_OBS(),
 proc1500_Risk: d1500_Risk(), proc1500_Exemptions: d1500_Exemptions(),
 proc1500_Reporting: d1500_Reporting(),

 proc3856_Understanding: d3856_Understanding(), proc3856_General: d3856_General(),
 proc3856_InitArms: d3856_InitArms(), proc3856_InitRP: d3856_InitRP(),
 proc3856_Forgiveness: d3856_Forgiveness(), proc3856_RPImpair: d3856_RPImpair(),
 proc3856_PrefShares: d3856_PrefShares(), proc3856_NonMarket: d3856_NonMarket(),
 proc3856_Portfolio: d3856_Portfolio(), proc3856_FxDeriv: d3856_FxDeriv(),

 proc3462_Understanding: d3462_Understanding(), proc3462_DC: d3462_DC(),
 proc3462_DB: d3462_DB(), proc3462_Termination: d3462_Termination(),
 proc3462_Actuary: d3462_Actuary(), proc3462_Assets: d3462_Assets(),

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

const ASPE_KEYWORDS = ["aspe", "first-time", "transition", "financial instrument", "pension", "actuari", "employee benefit", "retract", "mandator", "asset retirement"];

export function Audit680Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();

 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);
 const aspeRisks = useMemo(() => filterRisks(risks, ASPE_KEYWORDS), [risks]);

 const storageKey = `audit-680-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data680>(() => {
 const def = buildDefault();
 const stored = readJsonFromLocalStorage<Partial<Data680>>(storageKey, def) ?? def;
 const merged = {...def,...stored } as Data680;
 for (const k of PROC_KEYS) {
 if (!Array.isArray((merged as unknown as Record<ProcKey, ProcRow[]>)[k])) {
 (merged as unknown as Record<ProcKey, ProcRow[]>)[k] = (def as unknown as Record<ProcKey, ProcRow[]>)[k];
 }
 }
 return merged;
 });

 // Auto-detect framework — only show ASPE worksheet meaningfully if framework matches
 const isAspe = /ASPE|Section 3856|Part II/i.test(ctx.framework);

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

 function updProc(section: ProcKey, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) {
 setData(d => ({...d, [section]: (d[section] as ProcRow[]).map(r => r.id === rowId ? {...r, [field]: value } : r) }));
 }
 const handler = (section: ProcKey) =>
 (_si: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) =>
 updProc(section, rowId, field, value);

 const allAddressed = useMemo(() => {
 const active: ProcRow[] = [];
 if (data.apply1500) {
 active.push(...data.proc1500_Understanding,...data.proc1500_OBS,...data.proc1500_Risk);
 // Only include exemption rows where its checkbox is on (best-effort — match by index/text isn't reliable, so use a sensible default: include all when section enabled)
 active.push(...data.proc1500_Exemptions,...data.proc1500_Reporting);
 }
 if (data.apply3856) {
 active.push(
...data.proc3856_Understanding,...data.proc3856_General,...data.proc3856_InitArms,...data.proc3856_InitRP,
...data.proc3856_Forgiveness,...data.proc3856_RPImpair,...data.proc3856_PrefShares,
...data.proc3856_NonMarket,...data.proc3856_Portfolio,...data.proc3856_FxDeriv,
 );
 }
 if (data.apply3462) {
 active.push(
...data.proc3462_Understanding,...data.proc3462_DC,...data.proc3462_DB,
...data.proc3462_Termination,...data.proc3462_Actuary,...data.proc3462_Assets,
 );
 }
 return active.length > 0 && active.every(p => p.psc !== "");
 }, [data]);

 function ExemptionRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
 return (
 <label className="flex items-start gap-2 text-sm cursor-pointer">
 <Checkbox disabled={locked} checked={value} onCheckedChange={c => onChange(!!c)} className="mt-0.5" />
 <span>{label}</span>
 </label>
 );
 }

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Document supplementary audit procedures for ASPE areas: first-time adoption (Section 1500), financial instruments (Section 3856) and employee future benefits (Section 3462)."
 standard="CPA Canada Handbook — Part II"
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
               setData(d => ({ ...d, proc3856_Understanding: d.proc3856_Understanding.map((r, i) => i === 0 ? { ...r, psc: 'Y' as const, comments: 'Identified all financial instruments: accounts receivable (AR), accounts payable (AP), operating line of credit, shareholder loan, and term debt. All meet the definition of financial assets/liabilities under Section 3856.' } : r) }));
               markLukaFilled('proc3856-understanding-0');
             }
           },
           { set: () => {
               setData(d => ({ ...d, proc3856_General: d.proc3856_General.map((r, i) => i === 0 ? { ...r, psc: 'Y' as const, comments: 'Financial instruments accounting policy note reviewed — instruments appropriately carried at amortised cost. Fair value disclosures for related-party instruments reviewed. No instruments held at fair value through net income.' } : r) }));
               markLukaFilled('proc3856-general-0');
             }
           },
           { set: () => {
               setData(d => ({ ...d, evidenceRationale: 'ASPE supplementary procedures performed for applicable sections (Section 3856 — Financial Instruments). All financial instruments identified, initial recognition reviewed, and Section 3856 measurement requirements confirmed. Evidence is sufficient and appropriate.' }));
               markLukaFilled('evidenceRationale');
             }
           },
         ], () => setLukaState('done'));
       },
     }))}
   />
 ) : undefined}
 >
 {!isAspe && (
 <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 Engagement framework: <span className="font-medium">{ctx.framework}</span>. This form is designed for ASPE engagements — these procedures may not apply. Toggle the applicable sections below.
 </div>
 )}

 <WorksheetSection title="Applicable sections" right={<span className="text-[11px] text-muted-foreground">Toggle off any sections that are not relevant</span>}>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 bg-card">
 <Checkbox disabled={locked} checked={data.apply1500} onCheckedChange={c => setData(d => ({...d, apply1500: !!c }))} />
 <span><span className="font-medium">First-time adoption</span> <span className="text-muted-foreground">— Section 1500</span></span>
 </label>
 <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 bg-card">
 <Checkbox disabled={locked} checked={data.apply3856} onCheckedChange={c => setData(d => ({...d, apply3856: !!c }))} />
 <span><span className="font-medium">Financial instruments</span> <span className="text-muted-foreground">— Section 3856</span></span>
 </label>
 <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 bg-card">
 <Checkbox disabled={locked} checked={data.apply3462} onCheckedChange={c => setData(d => ({...d, apply3462: !!c }))} />
 <span><span className="font-medium">Employee future benefits</span> <span className="text-muted-foreground">— Section 3462</span></span>
 </label>
 </div>
 </WorksheetSection>

 <LinkedRisksCard overallRisk={overall} risks={aspeRisks}
 emptyHint="No ASPE-specific risks tagged in Tag risks (financial instruments, pension, ARO, RP transactions) to flow them through."
 storageKey={`audit-680-risks-${engagementId ?? "default"}`} locked={locked} />

 {/* SECTION 1500 */}
 {data.apply1500 && (
 <>
 <WorksheetSection title="First-time adoption (Section 1500) — understanding" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "Policies, exemptions & opening balance sheet impact", rows: data.proc1500_Understanding }]} locked={locked} onChange={handler("proc1500_Understanding")} />
 </WorksheetSection>
 <WorksheetSection title="First-time adoption — opening balance sheet" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "Transition date, classification & recognition", rows: data.proc1500_OBS }]} locked={locked} onChange={handler("proc1500_OBS")} />
 </WorksheetSection>
 <WorksheetSection title="First-time adoption — risk assessment" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "RMM from transition", rows: data.proc1500_Risk }]} locked={locked} onChange={handler("proc1500_Risk")} />
 </WorksheetSection>

 <WorksheetSection title="First-time adoption — exemptions elected (par. 1500.09)">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
 <ExemptionRow label="a. Business combinations" value={data.exBusinessCombinations} onChange={v => setData(d => ({...d, exBusinessCombinations: v }))} />
 <ExemptionRow label="b. Fair value as deemed cost (PP&E)" value={data.exFairValue} onChange={v => setData(d => ({...d, exFairValue: v }))} />
 <ExemptionRow label="c. Employee future benefits" value={data.exEmployeeBenefits} onChange={v => setData(d => ({...d, exEmployeeBenefits: v }))} />
 <ExemptionRow label="d. Cumulative translation differences" value={data.exCumulativeTranslation} onChange={v => setData(d => ({...d, exCumulativeTranslation: v }))} />
 <ExemptionRow label="e. FI — compound instrument" value={data.exFiCompound} onChange={v => setData(d => ({...d, exFiCompound: v }))} />
 <ExemptionRow label="f. FI — designated at fair value" value={data.exFiFairValue} onChange={v => setData(d => ({...d, exFiFairValue: v }))} />
 <ExemptionRow label="g. FI — retractable / mandatorily redeemable shares" value={data.exFiRetractable} onChange={v => setData(d => ({...d, exFiRetractable: v }))} />
 <ExemptionRow label="h. FI — related-party transitional provisions (3856.68)" value={data.exFiRelatedParty} onChange={v => setData(d => ({...d, exFiRelatedParty: v }))} />
 <ExemptionRow label="i. Stock-based payment" value={data.exStockBased} onChange={v => setData(d => ({...d, exStockBased: v }))} />
 <ExemptionRow label="j. Asset retirement obligations" value={data.exARO} onChange={v => setData(d => ({...d, exARO: v }))} />
 <ExemptionRow label="k. Related-party transactions" value={data.exRelatedParty} onChange={v => setData(d => ({...d, exRelatedParty: v }))} />
 </div>
 </WorksheetSection>
 <WorksheetSection title="First-time adoption — exemption procedures" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "Document procedures for each elected exemption", rows: data.proc1500_Exemptions }]} locked={locked} onChange={handler("proc1500_Exemptions")} />
 </WorksheetSection>

 <WorksheetSection title="First-time adoption — reporting choice">
 <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
 <div><Label>Comparative reporting</Label>
 <Select disabled={locked} value={data.reportingChoice} onValueChange={v => setData(d => ({...d, reportingChoice: v as Data680["reportingChoice"] }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Corresponding figures">Corresponding figures (comparatives unaudited)</SelectItem>
 <SelectItem value="Comparative F/S">Comparative F/S (two-year opinion)</SelectItem>
 <SelectItem value="Neither">Neither</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="text-sm text-muted-foreground self-end pb-1">
 Selection determines the procedures applicable in the table below (revised engagement letter, EOM paragraph, additional procedures over comparatives, etc.).
 </div>
 </div>
 </WorksheetSection>
 <WorksheetSection title="First-time adoption — reporting procedures" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "Reporting & comparatives", rows: data.proc1500_Reporting }]} locked={locked} onChange={handler("proc1500_Reporting")} />
 </WorksheetSection>
 </>
 )}

 {/* SECTION 3856 */}
 {data.apply3856 && (
 <>
 <WorksheetSection title="Financial instruments (Section 3856) — understanding" bodyClassName="p-0">
 <div ref={firstFillRef as React.RefObject<HTMLDivElement>}>
 <ProcedureTable sections={[{ title: "Identification of FA / FL", rows: data.proc3856_Understanding }]} locked={locked} onChange={handler("proc3856_Understanding")}
 />
 </div>
 </WorksheetSection>
 <WorksheetSection title="FI — general & initial recognition" bodyClassName="p-0">
 <ProcedureTable sections={[
 { title: "Policy & general procedures", rows: data.proc3856_General },
 { title: "Arm's-length initial recognition", rows: data.proc3856_InitArms },
 { title: "Related-party initial recognition", rows: data.proc3856_InitRP },
 { title: "Related-party forgiveness of debt", rows: data.proc3856_Forgiveness },
 { title: "Related-party impairment", rows: data.proc3856_RPImpair },
 ]} locked={locked} onChange={(si, rowId, f, v) => {
 const map: ProcKey[] = ["proc3856_General","proc3856_InitArms","proc3856_InitRP","proc3856_Forgiveness","proc3856_RPImpair"];
 updProc(map[si], rowId, f, v);
 }}
 />
 </WorksheetSection>
 <WorksheetSection title="FI — specific instruments" bodyClassName="p-0">
 <ProcedureTable sections={[
 { title: "Mandatorily redeemable / retractable preferred shares", rows: data.proc3856_PrefShares },
 { title: "Non-market rate loans / receivables", rows: data.proc3856_NonMarket },
 { title: "Portfolio investments (active markets)", rows: data.proc3856_Portfolio },
 { title: "FX contracts / freestanding derivatives", rows: data.proc3856_FxDeriv },
 ]} locked={locked} onChange={(si, rowId, f, v) => {
 const map: ProcKey[] = ["proc3856_PrefShares","proc3856_NonMarket","proc3856_Portfolio","proc3856_FxDeriv"];
 updProc(map[si], rowId, f, v);
 }} />
 </WorksheetSection>
 </>
 )}

 {/* SECTION 3462 */}
 {data.apply3462 && (
 <>
 <WorksheetSection title="Employee future benefits (Section 3462) — understanding" bodyClassName="p-0">
 <ProcedureTable sections={[{ title: "Identification of in-scope plans", rows: data.proc3462_Understanding }]} locked={locked} onChange={handler("proc3462_Understanding")} />
 </WorksheetSection>
 <WorksheetSection title="EFB — plan-type procedures" bodyClassName="p-0">
 <ProcedureTable sections={[
 { title: "Defined contribution plans", rows: data.proc3462_DC },
 { title: "Defined benefit plans", rows: data.proc3462_DB },
 { title: "Termination benefits", rows: data.proc3462_Termination },
 ]} locked={locked} onChange={(si, rowId, f, v) => {
 const map: ProcKey[] = ["proc3462_DC","proc3462_DB","proc3462_Termination"];
 updProc(map[si], rowId, f, v);
 }} />
 </WorksheetSection>
 <WorksheetSection title="EFB — actuary & plan assets" bodyClassName="p-0">
 <ProcedureTable sections={[
 { title: "Actuarial valuation & evaluation", rows: data.proc3462_Actuary },
 { title: "Plan assets confirmation", rows: data.proc3462_Assets },
 ]} locked={locked} onChange={(si, rowId, f, v) => {
 const map: ProcKey[] = ["proc3462_Actuary","proc3462_Assets"];
 updProc(map[si], rowId, f, v);
 }} />
 </WorksheetSection>
 </>
 )}

 <WorksheetSection title="Audit conclusion"
 right={allAddressed && data.evidenceSufficient === "" ? (
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
 <Textarea disabled={locked} value={data.evidenceRationale} onChange={e => setData(d => ({...d, evidenceRationale: e.target.value }))} className="flex-1 text-sm min-h-[72px]" placeholder="The audit evidence obtained for applicable ASPE supplementary areas is sufficient and appropriate to reduce RMM to an acceptably low level." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>
 </WorksheetSection>

 <ConcludeBar
 worksheetKey="audit-680"
 engagementId={engagementId}
 concluded={data.concluded}
 concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 />
 </WorksheetLayout>
 );
}
