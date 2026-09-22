import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_ENGAGEMENT_ID, DEMO_TEAM, DEMO_LUKA_ACTIONS } from "@/components/demo/demoFixtureData";
import { GreenDot } from "@/components/demo/GreenDot";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RowState {
 wpRef: string;
 response: string;
 initials: string;
 date: string;
}

interface TeamRowState extends RowState {
 name: string;
}

function emptyRow(): RowState {
 return { wpRef: "", response: "", initials: "", date: "" };
}

function teamRow(name: string, response: string): TeamRowState {
 return { wpRef: "", response, initials: "", date: "", name };
}

// ── US mock data ───────────────────────────────────────────────────────────────

const US_DATA = {
 entity: "Harbor Freight Logistics LLC",
 period: "December 31, 2024",
 s1: [
 { wpRef: "", response: "US GAAP — Financial Accounting Standards Board (FASB) Accounting Standards Codification (ASC)", initials: "", date: "" },
 { wpRef: "", response: "Freight logistics and warehousing — DOT/FMCSA regulations, multi-state operations", initials: "", date: "" },
 ],
 s2: [
 { wpRef: "", response: "Draft FS to management by February 28, 2025. Final report by March 15, 2025.", initials: "", date: "" },
 { wpRef: "", response: "Planning meeting held January 20, 2025. Attendees: M. Thompson (Partner), L. Garcia (Manager), K. Patel (Senior), J. Chen (Staff), R. Morrison (CFO), S. Williams (Controller).", initials: "", date: "" },
 { wpRef: "", response: "January 20 – February 7, 2025", initials: "", date: "" },
 { wpRef: "", response: "Manager review: ongoing. Partner review: February 10, 2025. EQCR: February 12, 2025.", initials: "", date: "" },
 { wpRef: "", response: "Interim: January 22, 2025. Completion: February 14, 2025.", initials: "", date: "" },
 { wpRef: "", response: "", initials: "", date: "" },
 ],
 s3: [
 { wpRef: "", response: "Revenue $18.4M, ROU Assets $2.8M (new — ASC 842), Goodwill $1.42M, Long-term Debt $4.32M, Accounts Receivable $2.1M. ", initials: "", date: "" },
 { wpRef: "", response: "ASC 842 lease adoption (first year), new $5M credit facility, new Controller (S. Williams, July 2024), new AP ERP module.", initials: "", date: "" },
 { wpRef: "", response: "ASC 842 Leases — first-year adoption effective January 1, 2024. Three operating leases capitalized.", initials: "", date: "" },
 { wpRef: "", response: "First-year engagement. No predecessor findings received.", initials: "", date: "" },
 { wpRef: "", response: "Revenue recognition (ASC 606) — significant risk. Management override — presumed risk. Goodwill impairment (ASC 350) — elevated. ", initials: "", date: "" },
 { wpRef: "", response: "Valuation specialist for goodwill impairment assessment — Summit Valuation Group.", initials: "", date: "" },
 { wpRef: "", response: "ADP Workforce Now (payroll) — SOC 1 Type II report obtained.", initials: "", date: "" },
 { wpRef: "", response: "N/A — single entity", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A — private company audit (AICPA non-issuer). CAMs not required.", initials: "", date: "" },
 ],
 s4team: [
 teamRow("M. Thompson, CPA", "18 years experience"),
 teamRow("L. Garcia, CPA", "9 years experience"),
 teamRow("K. Patel", "4 years experience"),
 teamRow("J. Chen", "1 year experience"),
 teamRow("", ""),
 teamRow("Summit Valuation Group", "Goodwill impairment"),
 teamRow("D. Anderson, CPA", "independent reviewer"),
 ],
 s5: { wpRef: "", response: "Budgeted fee: $42,500. Estimated hours: 280..", initials: "", date: "" },
 s6: { wpRef: "", response: "Audit plan documented in Forms 500-590. TCWG planning communication: Letter AL3.1 sent January 22, 2025.", initials: "", date: "" },
 subseq: { wpRef: "", response: "", initials: "", date: "" },
 preparedBy: "L. Garcia",
 preparedDate: "January 21, 2025",
 reviewedBy: "M. Thompson",
 reviewedDate: "January 22, 2025",
};

const CA_DATA = {
 entity: "Shipping Line Inc.",
 period: "March 31, 2024",
 s1: [
 { wpRef: "", response: "Canadian Accounting Standards for Private Enterprises (ASPE) — CPA Canada Handbook Part II", initials: "", date: "" },
 { wpRef: "", response: "Marine freight and shipping — Transport Canada regulations, cross-border customs compliance", initials: "", date: "" },
 ],
 s2: [
 { wpRef: "", response: "Draft FS to management by May 31, 2024. Final report by June 14, 2024.", initials: "", date: "" },
 { wpRef: "", response: "Planning meeting held April 8, 2024. Attendees: J. Patel (Partner), A. Nguyen (Manager), T. Brown (Senior), D. Kim (Staff), P. Singh (CFO), C. Okafor (Controller).", initials: "", date: "" },
 { wpRef: "", response: "April 8 – May 10, 2024", initials: "", date: "" },
 { wpRef: "", response: "Manager review: ongoing. Partner review: May 15, 2024. EQCR: May 17, 2024.", initials: "", date: "" },
 { wpRef: "", response: "Interim: April 10, 2024. Completion: May 20, 2024.", initials: "", date: "" },
 { wpRef: "", response: "", initials: "", date: "" },
 ],
 s3: [
 { wpRef: "", response: "Revenue $12.6M, PP&E $4.2M, Long-term Debt $3.1M, Accounts Receivable $1.8M. ", initials: "", date: "" },
 { wpRef: "", response: "New vessel charter agreement ($2.1M), refinanced credit facility, fleet expansion (2 vessels added).", initials: "", date: "" },
 { wpRef: "", response: "No new ASPE standards effective for this period. Review ASPE 3065 for new lease terms.", initials: "", date: "" },
 { wpRef: "", response: "Prior year: minor AR cut-off adjustment ($42K). Management has addressed through improved invoicing process.", initials: "", date: "" },
 { wpRef: "", response: "Revenue recognition (ASPE 3400) — significant risk. Management override — presumed risk. Going concern — monitor leverage. ", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A — single entity", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A", initials: "", date: "" },
 { wpRef: "", response: "N/A — private company audit, ASPE. Not applicable.", initials: "", date: "" },
 ],
 s4team: [
 teamRow("J. Patel, CPA", "15 years experience"),
 teamRow("A. Nguyen, CPA", "7 years experience"),
 teamRow("T. Brown", "3 years experience"),
 teamRow("D. Kim", "1 year experience"),
 teamRow("", ""),
 teamRow("", ""),
 teamRow("S. Lavoie, CPA (independent reviewer)", ""),
 ],
 s5: { wpRef: "", response: "Budgeted fee: $31,000. Estimated hours: 195..", initials: "", date: "" },
 s6: { wpRef: "", response: "Audit plan documented in Forms 500-590. TCWG planning communication: Letter AL3.1 sent April 9, 2024.", initials: "", date: "" },
 subseq: { wpRef: "", response: "", initials: "", date: "" },
 preparedBy: "A. Nguyen",
 preparedDate: "April 9, 2024",
 reviewedBy: "J. Patel",
 reviewedDate: "April 10, 2024",
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface AuditASMWorksheetProps {
 isUS?: boolean;
}

export function AuditASMWorksheet({ isUS = false }: AuditASMWorksheetProps) {
 const { engagementId = "" } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const seed = isUS ? US_DATA : CA_DATA;

 // ── Header fields ────────────────────────────────────────────────────────────
 const [entity, setEntity] = useState(seed.entity);
 const [period, setPeriod] = useState(seed.period);

 // ── Section 1 ────────────────────────────────────────────────────────────────
 const [s1, setS1] = useState<RowState[]>(seed.s1.map((r) => ({...r })));

 // ── Section 2 ────────────────────────────────────────────────────────────────
 const [s2, setS2] = useState<RowState[]>(seed.s2.map((r) => ({...r })));

 // ── Section 3 ────────────────────────────────────────────────────────────────
 const [s3, setS3] = useState<RowState[]>(seed.s3.map((r) => ({...r })));

 // ── Section 4 (audit team) ───────────────────────────────────────────────────
 const [s4, setS4] = useState<TeamRowState[]>(seed.s4team.map((r) => ({...r })));

 // ── Section 5 ────────────────────────────────────────────────────────────────
 const [s5, setS5] = useState<RowState>({...seed.s5 });

 // ── Section 6 ────────────────────────────────────────────────────────────────
 const [s6, setS6] = useState<RowState>({...seed.s6 });

 // ── Subsequent changes ───────────────────────────────────────────────────────
 const [subseq, setSubseq] = useState<RowState>({...seed.subseq });

 // ── Footer ───────────────────────────────────────────────────────────────────
 const [preparedBy, setPreparedBy] = useState(isDemoEngagement ? DEMO_TEAM.senior : seed.preparedBy);
 const [preparedDate, setPreparedDate] = useState(seed.preparedDate);
 const [reviewedBy, setReviewedBy] = useState(isDemoEngagement ? DEMO_TEAM.manager : seed.reviewedBy);
 const [reviewedDate, setReviewedDate] = useState(seed.reviewedDate);

 // ── Import flow ───────────────────────────────────────────────────────────────
 const [imported, setImported] = useState(false);
 const [importStep, setImportStep] = useState(0); // 0=closed,1=calendar,2=ai,3=preview,4=review
 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');

 const handleOpenImport = () => setImportStep(1);

 useEffect(() => {
 if (importStep === 1) {
 const t = setTimeout(() => setImportStep(2), 1500);
 return () => clearTimeout(t);
 }
 if (importStep === 2) {
 const t = setTimeout(() => setImportStep(3), 2500);
 return () => clearTimeout(t);
 }
 }, [importStep]);

 const handleConfirmImport = () => {
 setImportStep(0);
 setImported(true);
 // Auto-fill team planning discussion row (s2[1]) and Section 4 team rows
 const teamPlanningText = isUS
 ? "Planning meeting held January 20, 2025. Attendees: M. Thompson (Partner), L. Garcia (Manager), K. Patel (Senior), J. Chen (Staff), R. Morrison (CFO), S. Williams (Controller)."
 : "Planning meeting held April 8, 2024. Attendees: J. Patel (Partner), A. Nguyen (Manager), T. Brown (Senior), D. Kim (Staff), P. Singh (CFO), C. Okafor (Controller).";
 setS2((prev) => {
 const next = [...prev];
 next[1] = {...next[1], response: teamPlanningText };
 return next;
 });
 // Fill Section 4 team rows from seed (already loaded, just ensure they're populated)
 setS4(seed.s4team.map((r) => ({...r })));
 toast.success("Meeting notes imported. Team planning discussion and audit team sections populated.");
 };

 const handleCloseModal = () => setImportStep(0);

 // ── Helpers ───────────────────────────────────────────────────────────────────

 function updateRow(
 setter: React.Dispatch<React.SetStateAction<RowState[]>>,
 idx: number,
 field: keyof RowState,
 value: string
 ) {
 setter((prev) => {
 const next = [...prev];
 next[idx] = {...next[idx], [field]: value };
 return next;
 });
 }

 function updateTeamRow(idx: number, field: keyof TeamRowState, value: string) {
 setS4((prev) => {
 const next = [...prev];
 next[idx] = {...next[idx], [field]: value };
 return next;
 });
 }

 function updateSingle(
 setter: React.Dispatch<React.SetStateAction<RowState>>,
 field: keyof RowState,
 value: string
 ) {
 setter((prev) => ({...prev, [field]: value }));
 }

 // ── Row render helpers ────────────────────────────────────────────────────────

 function DataRow({
 num,
 description,
 row,
 onChange,
 extra,
 storageKey,
 }: {
 num: string;
 description: React.ReactNode;
 row: RowState;
 onChange: (field: keyof RowState, value: string) => void;
 extra?: React.ReactNode;
 storageKey?: string;
 }) {
 return (
 <tr className="hover:bg-muted/50 transition-colors">
 <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono align-top whitespace-nowrap">{num}</td>
 <td className="px-4 py-2.5 text-sm text-foreground align-top">{description}</td>
 <td className="px-3 py-2 align-top">
 <Input
 className="h-7 text-sm w-16 text-center"
 value={row.wpRef}
 onChange={(e) => onChange("wpRef", e.target.value)}
 placeholder="—"
 />
 </td>
 <td className="px-3 py-2 align-top">
 <div className="relative">
 {storageKey ? (
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <AttributedComment
 value={row.response}
 onChange={(v) => onChange("response", v)}
 storageKey={storageKey}
 className="flex-1 min-h-[56px] text-sm resize-none"
 />
 </div>
 ) : (
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <Textarea
 className="flex-1 min-h-[56px] text-sm resize-none"
 value={row.response}
 onChange={(e) => onChange("response", e.target.value)}
 />
 </div>
 )}
 {extra && <div className="mt-1.5">{extra}</div>}
 </div>
 </td>
 </tr>
 );
 }

 function SectionHeader({ label }: { label: string }) {
 return (
 <tr className="bg-muted/60">
 <td className="px-3 py-2.5 text-sm font-bold text-foreground" colSpan={5}>
 {label}
 </td>
 </tr>
 );
 }

 function SubNote({ text }: { text: string }) {
 return (
 <tr className="bg-muted/20">
 <td className="px-3 py-1" />
 <td className="px-4 py-1.5 text-sm text-muted-foreground italic" colSpan={4}>
 {text}
 </td>
 </tr>
 );
 }

 const s2Labels = [
 "Entity's reporting deadlines (if any).",
 "Team planning discussions.",
 "Planned fieldwork start/end.",
 "File reviews (including EQCR).",
 "Meetings with management and TCWG.",
 "Other (specify).",
 ];

 const s3Labels = [
 "Material financial statement areas and disclosures.",
 "Major operational or control changes during the period.",
 "Impact of changes in accounting standards.",
 "Matters raised (such as problem areas) from past experience.",
 "Significant risks and going-concern uncertainties.",
 "Use of auditor experts.",
 "Use of service organization reports.",
 "Use of component auditors.",
 "Coordination of work with a group auditor.",
 "Need for stand-alone audited financial statements of subsidiaries.",
 "Key audit matters (where applicable).",
 ];

 const s4Roles = ["Partner", "Manager", "Senior", "Assistant", "Assistant 1", "Expert", "EQCR"];

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
   actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.generic.actions.map(a => ({
     ...a,
     onTrigger: () => {
       setLukaState('loading');
       setTimeout(() => setLukaState('done'), 2200);
     },
   }))}
  />
 )}

 {/* ── Body ── */}
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="p-6">

 {/* ── Main card ── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">

 {/* ── Card header ── */}
 <div className="px-6 py-4 border-b border-border bg-card">
 <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-3">
 <div className="flex items-center gap-3">
 <span className="text-xs font-semibold text-muted-foreground w-24 shrink-0">Entity:</span>
 <Input
 className="h-8 text-sm flex-1"
 value={entity}
 onChange={(e) => setEntity(e.target.value)}
 />
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs font-semibold text-muted-foreground w-24 shrink-0">Period ended:</span>
 <Input
 className="h-8 text-sm flex-1"
 value={period}
 onChange={(e) => setPeriod(e.target.value)}
 />
 </div>
 <div className="col-span-2 flex items-start gap-3">
 <span className="text-xs font-semibold text-muted-foreground w-24 shrink-0 pt-0.5">Objective:</span>
 <p className="text-sm text-muted-foreground leading-relaxed flex-1">
 To document the scope, timing and direction of the audit as a guide for the development of the audit plan.
 </p>
 </div>
 </div>
 <div className="mt-2 px-3 py-1.5 bg-muted/50 rounded text-sm text-muted-foreground">
 <span className="font-semibold">Legend:</span> EQCR = Engagement quality control review. TCWG = Those charged with governance.
 </div>
 </div>

 {/* ── Main table ── */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="w-12 px-3 py-2.5 text-left text-sm font-semibold text-foreground uppercase">#</th>
 <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase">Description</th>
 <th className="w-20 px-3 py-2.5 text-center text-sm font-semibold text-foreground uppercase">W/P Ref.</th>
 <th className="w-80 px-3 py-2.5 text-left text-sm font-semibold text-foreground uppercase">Responses and Comments</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">

 {/* ── Section 1 ── */}
 <SectionHeader label="1. Reporting requirements" />
 <DataRow
 num="1.1"
 description="The applicable financial reporting framework (such as Canadian Accounting Standards for Private Enterprises (ASPE))."
 row={s1[0]}
 onChange={(f, v) => updateRow(setS1, 0, f, v)}
 storageKey={`asm-${engagementId}-s1-0`}
 />
 {isDemoEngagement && (
 <tr>
  <td colSpan={99} className="px-4 pb-2">
   <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Populated from Xero trial balance · Dec 31, 2025</span>
   </div>
  </td>
 </tr>
 )}
 <DataRow
 num="1.2"
 description="Industry-specific or specialized requirements."
 row={s1[1]}
 onChange={(f, v) => updateRow(setS1, 1, f, v)}
 storageKey={`asm-${engagementId}-s1-1`}
 />

 {/* ── Section 2 ── */}
 <SectionHeader label="2. Timing" />
 {s2Labels.map((label, i) => (
 <DataRow
 key={i}
 num={`2.${i + 1}`}
 description={label}
 row={s2[i]}
 onChange={(f, v) => updateRow(setS2, i, f, v)}
 storageKey={`asm-${engagementId}-s2-${i}`}
 extra={
 i === 1 ? (
 imported ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 ✅ Imported
 </span>
 ) : (
 <button
 onClick={handleOpenImport}
 className="h-7 px-2.5 rounded-full bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] hover:from-[#1a5a96] hover:to-[#6a2bc2] text-white text-xs font-medium gap-1.5 flex items-center shadow-sm"
 >
 <Sparkles className="h-3 w-3 animate-[spin_3s_linear_infinite]" />
 Import Meeting Notes
 </button>
 )
 ) : undefined
 }
 />
 ))}

 {/* ── Section 3 ── */}
 <SectionHeader label="3. Factors to consider in the audit" />
 <SubNote text="Identify key areas to be addressed in the audit:" />
 {s3Labels.map((label, i) => (
 <DataRow
 key={i}
 num={`3.${i + 1}`}
 description={label}
 row={s3[i]}
 onChange={(f, v) => updateRow(setS3, i, f, v)}
 storageKey={`asm-${engagementId}-s3-${i}`}
 />
 ))}

 {/* ── Section 4 ── */}
 <SectionHeader label="4. Audit team" />
 <SubNote text="Identify the audit team members assigned and their roles. Ensure the assignment of appropriately experienced team members to areas where there may be higher risks of material misstatement." />
 {s4Roles.map((role, i) => (
 <tr key={i} className="hover:bg-muted/50 transition-colors">
 <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono align-top whitespace-nowrap">{`4.${i + 1}`}</td>
 <td className="px-4 py-2.5 text-sm text-foreground align-top font-medium">{role}</td>
 <td className="px-3 py-2 align-top">
 <Input
 className="h-7 text-sm w-16 text-center"
 value={s4[i].wpRef}
 onChange={(e) => updateTeamRow(i, "wpRef", e.target.value)}
 placeholder="—"
 />
 </td>
 <td className="px-3 py-2 align-top">
 <div className="flex flex-col gap-1">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!s4[i].name} />
 <Input
 className="flex-1 h-7 text-sm"
 placeholder="Name"
 value={s4[i].name}
 onChange={(e) => updateTeamRow(i, "name", e.target.value)}
 />
 </div>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!s4[i].response} />
 <Input
 className="flex-1 h-7 text-sm"
 placeholder="Experience / notes"
 value={s4[i].response}
 onChange={(e) => updateTeamRow(i, "response", e.target.value)}
 />
 </div>
 </div>
 </td>
 </tr>
 ))}

 {/* ── Section 5 ── */}
 <SectionHeader label="5. Budget" />
 <DataRow
 num="5.1"
 description="Establish the budgeted audit fee and labour hours."
 row={s5}
 onChange={(f, v) => updateSingle(setS5, f, v)}
 storageKey={`asm-${engagementId}-s5`}
 />

 {/* ── Section 6 ── */}
 <SectionHeader label="6. Audit strategy" />
 <DataRow
 num="6.1"
 description={
 <>
 Provide a cross-reference to documents that outline the planned scope and timing of the audit, such as the communication with management and to TCWG. For an example of a written planning letter, refer to Sample Letter AL3.1.
 </>
 }
 row={s6}
 onChange={(f, v) => updateSingle(setS6, f, v)}
 storageKey={`asm-${engagementId}-s6`}
 />

 {/* ── Subsequent changes ── */}
 <tr className="bg-muted">
 <td className="px-3 py-3 text-sm font-bold text-foreground uppercase tracking-wide" colSpan={5}>
 Subsequent Changes in Strategy
 </td>
 </tr>
 <DataRow
 num=""
 description="Outline any significant changes made to the original audit strategy for this period as a result of performing further procedures or obtaining new information."
 row={subseq}
 onChange={(f, v) => updateSingle(setSubseq, f, v)}
 storageKey={`asm-${engagementId}-subseq`}
 />

 </tbody>
 </table>
 </div>

 {/* ── Sign-off ── */}
 <WorksheetSignOff worksheetKey="asm" engagementId={engagementId} />
 <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-between">
 <span className="text-sm text-muted-foreground">Overall audit strategy — 430</span>
 <span className="text-sm text-muted-foreground">©2022 CPA Canada PEG</span>
 </div>

 </div>
 </div>
 </div>

 {/* ── Import Meeting Notes Modal ── */}
 {importStep > 0 && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
 <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

 {/* Step 1: Calendar Connection */}
 {importStep === 1 && (
 <div className="p-8 flex flex-col items-center gap-5 text-center" style={{ animation: "fadeInUp 0.25s ease" }}>
 <div className="text-4xl">🗓️</div>
 <p className="text-sm font-semibold text-foreground">Connecting to Google Calendar...</p>
 <div className="flex items-center justify-center">
 <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
 </svg>
 </div>
 <p className="text-sm text-muted-foreground">Retrieving planning meetings for {entity}...</p>
 </div>
 )}

 {/* Step 2: AI Analysis */}
 {importStep === 2 && (
 <div className="p-8 flex flex-col items-center gap-5 text-center" style={{ animation: "fadeInUp 0.25s ease" }}>
 <div className="text-4xl">✨</div>
 <p className="text-sm font-semibold text-foreground">Luka AI is analyzing your meeting notes...</p>
 <ProgressBar />
 <p className="text-sm text-muted-foreground">Reading transcript... Extracting attendees... Mapping team roles...</p>
 </div>
 )}

 {/* Step 3: Preview */}
 {importStep === 3 && (
 <div style={{ animation: "fadeInUp 0.25s ease" }}>
 <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
 <p className="text-sm font-semibold text-foreground">Draft Content Found</p>
 <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground transition-colors">
 <X className="h-4 w-4" />
 </button>
 </div>
 <div className="px-6 py-5 space-y-4">
 <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
 <p className="text-sm font-medium text-foreground">📅 Meeting found</p>
 <p className="text-sm text-muted-foreground">"Audit Planning Discussion — {entity}"</p>
 <p className="text-sm text-muted-foreground">{isUS ? "Jan 20, 2025, 2:00 PM" : "Apr 8, 2024, 10:00 AM"}</p>
 </div>
 <div className="space-y-2">
 {[
 isUS ? "6 Attendees identified" : "6 Attendees identified",
 "Team planning discussion text extracted",
 "Section 4 audit team roles populated",
 isUS ? "4 firm members + 2 client representatives" : "4 firm members + 2 client representatives",
 ].map((item) => (
 <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-green-50 border border-green-200">
 <span className="text-green-600">✅</span>
 <span className="text-sm text-green-800">{item}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="px-6 pb-6 flex gap-3 justify-end">
 <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
 <Button onClick={() => setImportStep(4)}>Review Draft</Button>
 </div>
 </div>
 )}

 {/* Step 4: Review Draft */}
 {importStep === 4 && (
 <div style={{ animation: "fadeInUp 0.25s ease" }}>
 <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
 <p className="text-sm font-semibold text-foreground">Review Draft</p>
 <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground transition-colors">
 <X className="h-4 w-4" />
 </button>
 </div>
 <div className="px-6 py-5 max-h-80 overflow-y-auto space-y-3">
 <ReviewSection title="Team Planning Discussion (§2.2)">
 <ReviewField label="Meeting date" value={isUS ? "January 20, 2025" : "April 8, 2024"} />
 <ReviewField label="Attendees" value={isUS ? "M. Thompson, L. Garcia, K. Patel, J. Chen, R. Morrison, S. Williams" : "J. Patel, A. Nguyen, T. Brown, D. Kim, P. Singh, C. Okafor"} />
 </ReviewSection>
 <ReviewSection title="Audit Team (§4)">
 <ReviewField label="Partner" value={isUS ? "M. Thompson, CPA — 18 years" : "J. Patel, CPA — 15 years"} />
 <ReviewField label="Manager" value={isUS ? "L. Garcia, CPA — 9 years" : "A. Nguyen, CPA — 7 years"} />
 <ReviewField label="Senior" value={isUS ? "K. Patel — 4 years" : "T. Brown — 3 years"} />
 <ReviewField label="Assistant" value={isUS ? "J. Chen — 1 year" : "D. Kim — 1 year"} />
 <ReviewField label="EQCR" value={isUS ? "D. Anderson, CPA (independent)" : "S. Lavoie, CPA (independent)"} />
 </ReviewSection>
 </div>
 <div className="px-6 pb-6 flex gap-3 justify-end border-t border-border pt-4">
 <Button variant="outline" onClick={() => setImportStep(3)}>← Back</Button>
 <Button
 onClick={handleConfirmImport}
 className="bg-green-600 hover:bg-green-700 text-white"
 >
 ✓ Confirm &amp; Import
 </Button>
 </div>
 </div>
 )}

 </div>
 </div>
 )}

 <style>{`
 @keyframes fadeInUp {
 from { opacity: 0; transform: translateY(8px); }
 to { opacity: 1; transform: translateY(0); }
 }
 `}</style>
 </div>
 );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressBar() {
 const [width, setWidth] = useState(0);
 useEffect(() => {
 const t = setTimeout(() => setWidth(100), 50);
 return () => clearTimeout(t);
 }, []);
 return (
 <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] rounded-full transition-all duration-[2400ms] ease-linear"
 style={{ width: `${width}%` }}
 />
 </div>
 );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="rounded-md border border-border overflow-hidden">
 <div className="px-3 py-2 bg-muted border-b border-border">
 <p className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</p>
 </div>
 <div className="px-3 py-2 space-y-1">{children}</div>
 </div>
 );
}

function ReviewField({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex items-start gap-2 text-sm">
 <span className="text-muted-foreground shrink-0 w-28">{label}:</span>
 <span className="text-foreground">{value}</span>
 </div>
 );
}
