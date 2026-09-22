import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type RefField = RefDoc[];

interface PartAEntry {
 formAndDate: string;
 wpRef: RefField;
}

interface PartBRow {
 id: string;
 nature: string;
 dateDiscussed: string;
 dateWritten: string;
 wpRef: RefField;
}

interface Data340 {
 partA: Record<string, PartAEntry>;
 partB: PartBRow[];
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

// ── Part A: fixed required-communication items ────────────────────────────────
interface PartAItem {
 id: string;
 pegMap: string;
 title: string;
 bullets: string[];
}

const PART_A_ITEMS: PartAItem[] = [
 {
  id: "a1",
  pegMap: "1",
  title: "Preliminary activities",
  bullets: [
   "The identity and role of the engagement partner (CSQC 1.30(a)).",
   "The auditor is responsible for forming and expressing an opinion on the financial statements that have been prepared by management with the oversight of TCWG.",
   "The audit of the financial statements does not relieve management or TCWG of their responsibilities (CAS 260.14).",
  ],
 },
 {
  id: "a2",
  pegMap: "1 or 10",
  title: "Independence",
  bullets: [
   "Private entities: All relationships and other matters between the firm, network firms and the entity that, in the auditor's professional judgment, may reasonably be thought to bear on independence.",
   "Listed entities only (CAS 260.17): A statement in writing that the engagement team, the firm and, when applicable, network firms have complied with relevant ethical requirements regarding independence, including all relationships and other matters, total fees charged for audit and non-audit services, and related safeguards applied.",
  ],
 },
 {
  id: "a3",
  pegMap: "3 or 7",
  title: "Planned scope and timing of the audit",
  bullets: [
   "Provide an overview of the planned scope and timing of the audit, which includes communicating the significant risks identified (CAS 260.15).",
   "Discuss issues of risk and the concept of materiality.",
   "Identify any areas where TCWG may request additional procedures.",
   "Where applicable, discuss any planned use of the work of the internal audit function (CAS 260.A14).",
   "For group audits: communicate overview of component work, concerns about component auditor quality, audit limitations, and any fraud identified involving group management (CAS 600.49).",
  ],
 },
 {
  id: "a4",
  pegMap: "3 to 12",
  title: "Significant control deficiencies",
  bullets: [
   "Communicate in writing to management and TCWG significant deficiencies in internal control identified during the audit (CAS 265.9).",
  ],
 },
 {
  id: "a5",
  pegMap: "10",
  title: "Fraud",
  bullets: [
   "Unless all of TCWG are involved in managing the entity: communicate fraud identified or suspected involving management, employees with significant roles in internal control, or others where fraud results in a material misstatement (CAS 240.41).",
   "If fraud is suspected involving management: communicate suspicions to TCWG and discuss the nature, timing and extent of procedures necessary to complete the audit (CAS 240.42).",
   "Communicate any other fraud-related matters relevant to TCWG's responsibilities (CAS 240.43).",
  ],
 },
 {
  id: "a6",
  pegMap: "11",
  title: "Significant findings from the audit",
  bullets: [
   "Significant deficiencies in internal control not already communicated at risk assessment phase (CAS 265.10).",
   "The auditor's views about significant qualitative aspects of accounting practices (policies, estimates, disclosures) — including why a significant practice is not most appropriate if applicable (CAS 260.16(a)).",
   "Significant difficulties encountered during the audit (CAS 260.16(b)).",
   "Unless all of TCWG manage the entity: significant matters discussed with management, including non-compliance with laws/regulations (CAS 250.23), uncorrected misstatements and their effect (CAS 450.12-13), unreasonable refusal of confirmation (CAS 505.9), opening balance misstatements (CAS 510.7), related party matters (CAS 550.27), going concern doubts (CAS 570.25), group audit deficiencies (CAS 600.46), and expected modifications/EOM/OM paragraphs in the report (CAS 705.30, 706.12).",
   "Written representations that the auditor is requesting (CAS 580).",
   "Other matters significant to the oversight of the financial reporting process (CAS 260.16(d)).",
  ],
 },
 {
  id: "a7",
  pegMap: "If applicable",
  title: "Key audit matters",
  bullets: [
   "Where the auditor decides (or is required) to communicate key audit matters in the audit report, each matter shall be communicated with TCWG (CAS 701.17).",
  ],
 },
];

// ── Part B: pre-seeded communications log ────────────────────────────────────
const PART_B_SEEDS: Omit<PartBRow, "dateDiscussed" | "dateWritten" | "wpRef">[] = [
 { id: "b1", nature: "Planned scope and timing of the audit, including significant risks (refer to Sample Letter AL3.1)" },
 { id: "b2", nature: "Significant deficiencies in internal control (refer to Sample Letter AL3.4)" },
 { id: "b3", nature: "Summary of audit findings (refer to Sample Letter AL3.3)" },
 { id: "b4", nature: "Other (such as independence, fraud, group audit and key audit matters)" },
];

function blankA(): PartAEntry { return { formAndDate: "", wpRef: [] }; }
function blankB(idx: number): PartBRow {
 return { id: `b-${Date.now()}-${idx}`, nature: "", dateDiscussed: "", dateWritten: "", wpRef: [] };
}

function buildDefault(): Data340 {
 const partA: Record<string, PartAEntry> = {};
 PART_A_ITEMS.forEach(item => { partA[item.id] = blankA(); });
 const partB: PartBRow[] = PART_B_SEEDS.map(s => ({ ...s, dateDiscussed: "", dateWritten: "", wpRef: [] }));
 return {
  partA,
  partB,
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false,
  concludedOn: "",
 };
}

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-2.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-4 py-2.5 text-sm text-foreground border-b border-border align-top";

export function Audit340Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-340-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data340>(
  () => readJsonFromLocalStorage<Data340>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updA(id: string, patch: Partial<PartAEntry>) {
  setData(d => ({ ...d, partA: { ...d.partA, [id]: { ...d.partA[id], ...patch } } }));
 }
 function updB(id: string, patch: Partial<PartBRow>) {
  setData(d => ({ ...d, partB: d.partB.map(r => r.id === id ? { ...r, ...patch } : r) }));
 }
 function addB() {
  setData(d => ({ ...d, partB: [...d.partB, blankB(d.partB.length)] }));
 }
 function removeB(id: string) {
  const isSeeded = PART_B_SEEDS.some(s => s.id === id);
  if (isSeeded) return;
  setData(d => ({ ...d, partB: d.partB.filter(r => r.id !== id) }));
 }

 return (
  <WorksheetLayout
   heading="Canada > Completion & Signoffs"
   objective="To promote effective two-way communication between the auditor and those charged with governance, and to address matters that are required to be communicated (refer to CAS 260 and 265)."
   standard={`${ctx.standardPrefix} 260 / 265`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="340"
    title="Matters to be Communicated to Management and TCWG"
    standard={`${ctx.standardPrefix} 260 / 265`}
    overallRisk={undefined}
   />

   {/* ── Definitions ────────────────────────────────────────────────────── */}
   <div className="flex items-start gap-3 px-5 py-4 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-sm">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
    <div className="space-y-1">
     <p><span className="font-semibold">Management:</span> Person(s) with the executive responsibility for the conduct of the entity's operations.</p>
     <p><span className="font-semibold">TCWG (Those charged with governance):</span> Persons with the responsibility for overseeing the strategic direction of the entity and obligations related to accountability. For some entities, management may include some or all of TCWG, such as an owner-manager or executive members of a governance board (CAS 260.13).</p>
     <p className="text-xs text-blue-700 dark:text-blue-300">This form does not address risk assessment procedures, such as inquiries to be made of management and TCWG.</p>
    </div>
   </div>

   {/* ── Part A: Required communications ────────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-3 border-b border-border">
     <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Part A — Matters to be communicated</span>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[700px] border-collapse table-fixed">
      <colgroup>
       <col className="w-16" />
       <col className="w-[calc(50%-40px)]" />
       <col className="w-[calc(50%-40px)]" />
       <col className="w-24" />
      </colgroup>
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-16 text-center"}>PEG MAP</th>
        <th className={TH}>Matter to be communicated</th>
        <th className={TH}>Form (such as letter) and date of communication</th>
        <th className={TH + " w-24 text-center"}>W/P Ref.</th>
       </tr>
      </thead>
      <tbody>
       {PART_A_ITEMS.map(item => {
        const entry = data.partA[item.id] ?? blankA();
        return (
         <tr key={item.id} className="hover:bg-muted/20">
          <td className={TD + " w-16 text-center"}>
           <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
            {item.pegMap}
           </span>
          </td>
          <td className={TD + " min-w-[280px]"}>
           <p className="font-semibold text-sm text-foreground mb-1">{item.title}</p>
           <ul className="list-disc list-inside space-y-1">
            {item.bullets.map((b, i) => (
             <li key={i} className="text-xs text-muted-foreground leading-relaxed">{b}</li>
            ))}
           </ul>
          </td>
          <td className={TD + " min-w-[280px]"}>
           <Textarea
            disabled={locked}
            value={entry.formAndDate}
            onChange={e => updA(item.id, { formAndDate: e.target.value })}
            placeholder="e.g. Engagement letter dated Jan 15, 2025 / Planning memo / Management letter…"
            className="min-h-[72px] text-sm resize-none"
           />
          </td>
          <td className={TD + " w-24 text-center"}>
           <RefButton
            reference={entry.wpRef}
            onAttach={doc => updA(item.id, { wpRef: [...entry.wpRef, doc] })}
            onRemove={i => updA(item.id, { wpRef: entry.wpRef.filter((_, i2) => i2 !== i) })}
            disabled={locked}
           />
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
   </div>

   {/* ── Part B: Record of communications ───────────────────────────────── */}
   <div className={CARD}>
    <div className="px-5 py-3 border-b border-border">
     <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Part B — Record of communications with management / TCWG</span>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[700px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " min-w-[240px]"}>Nature of communications and comments</th>
        <th className={TH + " w-40"}>Date discussed with management or TCWG</th>
        <th className={TH + " w-44"}>Date of written communication (if required)</th>
        <th className={TH + " w-24 text-center"}>W/P Ref.</th>
        <th className={TH + " w-8"} />
       </tr>
      </thead>
      <tbody>
       {data.partB.map(row => {
        const isSeeded = PART_B_SEEDS.some(s => s.id === row.id);
        return (
         <tr key={row.id} className="hover:bg-muted/20">
          <td className={TD + " min-w-[240px]"}>
           <Textarea
            disabled={locked}
            value={row.nature}
            onChange={e => updB(row.id, { nature: e.target.value })}
            placeholder="Describe the nature of the communication…"
            className="min-h-[56px] text-sm resize-none"
           />
          </td>
          <td className={TD + " w-40"}>
           <Input
            disabled={locked}
            type="date"
            value={row.dateDiscussed}
            onChange={e => updB(row.id, { dateDiscussed: e.target.value })}
            className="h-9 text-sm"
           />
          </td>
          <td className={TD + " w-44"}>
           <Input
            disabled={locked}
            type="date"
            value={row.dateWritten}
            onChange={e => updB(row.id, { dateWritten: e.target.value })}
            className="h-9 text-sm"
           />
          </td>
          <td className={TD + " w-24 text-center"}>
           <RefButton
            reference={row.wpRef}
            onAttach={doc => updB(row.id, { wpRef: [...row.wpRef, doc] })}
            onRemove={i => updB(row.id, { wpRef: row.wpRef.filter((_, i2) => i2 !== i) })}
            disabled={locked}
           />
          </td>
          <td className={TD + " w-8 text-center"}>
           {!locked && !isSeeded && (
            <button
             onClick={() => removeB(row.id)}
             className="text-muted-foreground hover:text-destructive transition-colors"
            >
             <Trash2 className="h-3.5 w-3.5" />
            </button>
           )}
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
    {!locked && (
     <div className="px-4 py-3 border-t border-border">
      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={addB}>
       <Plus className="h-3 w-3" /> Add Row
      </Button>
     </div>
    )}
   </div>

   <ConcludeBar
    worksheetKey="audit-340"
    engagementId={engagementId}
    concluded={data.concluded}
    concludedOn={data.concludedOn}
    onConclude={() => {
     const u = { ...data, concluded: true, concludedOn: new Date().toISOString() };
     setData(u); writeJsonToLocalStorage(storageKey, u);
    }}
    onReopen={() => {
     const u = { ...data, concluded: false, concludedOn: "" };
     setData(u); writeJsonToLocalStorage(storageKey, u);
    }}
   />
  </WorksheetLayout>
 );
}
