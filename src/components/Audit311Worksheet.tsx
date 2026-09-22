import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type RefField = RefDoc[];

interface RowData {
 reasoning: string;
 wpRef: RefField;
}

interface Data311 {
 // 1a-1k: sub-situations under "Document the reason..."
 a: RowData; b: RowData; c: RowData; d: RowData; e: RowData;
 f: RowData; g: RowData; h: RowData; i: RowData; j: RowData; k: RowData;
 // 2: Permitted to withdraw
 permitted: RowData;
 // 3: Communicate reason
 communicate: RowData;
 signOff: SignOffData;
 concluded: boolean; concludedOn: string;
}

function blankRow(): RowData { return { reasoning: "", wpRef: [] }; }

function buildDefault(): Data311 {
 return {
  a: blankRow(), b: blankRow(), c: blankRow(), d: blankRow(), e: blankRow(),
  f: blankRow(), g: blankRow(), h: blankRow(), i: blankRow(), j: blankRow(), k: blankRow(),
  permitted: blankRow(),
  communicate: blankRow(),
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false, concludedOn: "",
 };
}

type RowKey = keyof Omit<Data311, "signOff" | "concluded" | "concludedOn">;

const SITUATIONS: { key: RowKey; label: string; ref: string }[] = [
 {
  key: "a",
  label: "Reasonable assurance cannot be obtained (such as a failure to achieve an objective in a relevant CAS) and: A qualified opinion in the auditor's report is insufficient. The auditor did not disclaim an opinion.",
  ref: "CAS 200.12",
 },
 {
  key: "b",
  label: "Where there has been a change in the terms of the engagement that the auditor does not agree with, and the auditor is not permitted by management to continue with the original audit engagement.",
  ref: "CAS 210.17(a)",
 },
 {
  key: "c",
  label: "Appropriate actions could not be taken to eliminate or reduce threats to independence.",
  ref: "CAS 220.C11(Cc)",
 },
 {
  key: "d",
  label: "An exceptional circumstance exists as a result of a misstatement resulting from fraud or suspected fraud. The auditor is therefore unable to continue performing the audit.",
  ref: "CAS 240.39, A55",
 },
 {
  key: "e",
  label: "Identified or suspected non-compliance with laws or regulations, which: Have not been remediated by management or TCWG. Raises questions about the integrity of management or TCWG.",
  ref: "CAS 250.A25",
 },
 {
  key: "f",
  label: "Two-way communication between the auditor and TCWG is inadequate and cannot be resolved.",
  ref: "CAS 260.A53",
 },
 {
  key: "g",
  label: "There is a significant risk of management misrepresentation in the financial statements. An audit cannot be continued when there are concerns about the competence, integrity, ethical values or diligence of management or its commitment to enforcement of these values.",
  ref: "CAS 580.A24",
 },
 {
  key: "h",
  label: "The auditor's understanding and evaluation of the control environment and other components of the entity's system of internal control raises doubts about the auditor's ability to obtain sufficient and appropriate audit evidence.",
  ref: "CAS 315.A198",
 },
 {
  key: "i",
  label: "In a group engagement, the group engagement partner concludes that: It will not be possible for the group engagement team to obtain sufficient appropriate audit evidence due to restrictions imposed by group management. The possible effect of this inability will result in a disclaimer of opinion on the group financial statements.",
  ref: "CAS 600",
 },
 {
  key: "j",
  label: "The possible effects on the financial statements of undetected misstatements, if any, could be both material and pervasive. As a result, a qualification of the audit opinion would be inadequate to communicate the gravity of the situation.",
  ref: "CAS 705.13(b)",
 },
 {
  key: "k",
  label: "A material misstatement exists in other information obtained prior to the date of the auditor's report. This misstatement remains uncorrected after communicating with those charged with governance.",
  ref: "CAS 720.18",
 },
];

const MAIN_ROWS: { key: RowKey; num: string; label: string }[] = [
 {
  key: "permitted",
  num: "2.",
  label: "Document whether the firm is permitted to withdraw from the engagement based on: The applicable provincial Code of Professional Conduct / Code of Ethics. The firm's quality control policies and procedures.",
 },
 {
  key: "communicate",
  num: "3.",
  label: "Communicate the reason(s) for withdrawing from the engagement. Include a copy of the communication in the working papers along with management's response, if any.",
 },
];

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-4 py-3 text-sm text-foreground border-b border-border align-top";

export function Audit311Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-311-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data311>(
  () => readJsonFromLocalStorage<Data311>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updRow(key: RowKey, patch: Partial<RowData>) {
  setData(d => ({ ...d, [key]: { ...(d[key] as RowData), ...patch } }));
 }

 return (
  <WorksheetLayout
   heading="Canada > Completion & Signoffs"
   objective="To document situations where withdrawal from an audit engagement is the appropriate conclusion."
   standard={`${ctx.standardPrefix} 705`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="311"
    title="Withdrawal"
    standard={`${ctx.standardPrefix} 705`}
    overallRisk={undefined}
   />

   {/* Warning notice */}
   <div className="flex items-start gap-3 px-5 py-4 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm">
    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
    <div className="space-y-1">
     <p className="font-semibold">WARNING: Withdrawal from an audit engagement is not always possible.</p>
     <p>Prior to withdrawal:</p>
     <ul className="list-disc list-inside space-y-0.5 ml-1">
      <li>Refer to your provincial Code of Professional Conduct / Code of Ethics to ensure that withdrawal is permitted.</li>
      <li>Consider obtaining advice from your lawyer and insurance company.</li>
     </ul>
    </div>
   </div>

   {/* Main procedures table */}
   <div className={CARD}>
    <div className="overflow-x-auto">
     <table className="w-full border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-[42%]"}>Procedure</th>
        <th className={TH}>Document the reasoning, discussions and conclusions reached</th>
        <th className={TH + " w-[110px] text-center"}>W/P Ref.</th>
       </tr>
      </thead>
      <tbody>

       {/* Section 1 header */}
       <tr>
        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-foreground bg-muted/40 border-b border-border">
         1. Document the reason for your withdrawal, the actions taken and discussions with management, including any of the following situations:
        </td>
       </tr>

       {/* Sub-rows a–k */}
       {SITUATIONS.map((s, idx) => {
        const letter = String.fromCharCode(97 + idx);
        const row = data[s.key] as RowData;
        return (
         <tr key={s.key} className="hover:bg-muted/20">
          <td className={TD}>
           <span className="font-medium">{letter}.</span>{" "}
           {s.label}
           {s.ref && (
            <span className="ml-1 text-xs text-muted-foreground">({s.ref})</span>
           )}
          </td>
          <td className={TD}>
           <Textarea
            disabled={locked}
            value={row.reasoning}
            onChange={e => updRow(s.key, { reasoning: e.target.value })}
            placeholder="Document reasoning, discussions and conclusions…"
            className="min-h-[72px] text-sm resize-none"
           />
          </td>
          <td className={TD + " text-center"}>
           <RefButton
            reference={row.wpRef}
            onAttach={doc => updRow(s.key, { wpRef: [...row.wpRef, doc] })}
            onRemove={i => updRow(s.key, { wpRef: row.wpRef.filter((_, idx2) => idx2 !== i) })}
            disabled={locked}
           />
          </td>
         </tr>
        );
       })}

       {/* Rows 2 and 3 */}
       {MAIN_ROWS.map(mr => {
        const row = data[mr.key] as RowData;
        return (
         <tr key={mr.key} className="hover:bg-muted/20">
          <td className={TD}>
           <span className="font-semibold">{mr.num}</span>{" "}{mr.label}
          </td>
          <td className={TD}>
           <Textarea
            disabled={locked}
            value={row.reasoning}
            onChange={e => updRow(mr.key, { reasoning: e.target.value })}
            placeholder="Document reasoning, discussions and conclusions…"
            className="min-h-[88px] text-sm resize-none"
           />
          </td>
          <td className={TD + " text-center"}>
           <RefButton
            reference={row.wpRef}
            onAttach={doc => updRow(mr.key, { wpRef: [...row.wpRef, doc] })}
            onRemove={i => updRow(mr.key, { wpRef: row.wpRef.filter((_, idx2) => idx2 !== i) })}
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

   <ConcludeBar
    worksheetKey="audit-311"
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
