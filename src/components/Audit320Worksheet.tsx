import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type YN = "Y" | "N" | "";
type RefField = RefDoc[];

interface DecisionRow {
 id: string;
 description: string;
 proposedResolution: string;
 conclusion: string;
 reportToTCWG: YN;
 wpRef: RefField;
}

interface Data320 {
 rows: DecisionRow[];
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

function blankRow(idx: number): DecisionRow {
 return {
  id: `row-${Date.now()}-${idx}`,
  description: "",
  proposedResolution: "",
  conclusion: "",
  reportToTCWG: "",
  wpRef: [],
 };
}

function buildDefault(): Data320 {
 return {
  rows: Array.from({ length: 8 }, (_, i) => blankRow(i)),
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false,
  concludedOn: "",
 };
}

const EXAMPLES = [
 "Estimates prepared by management.",
 "Application of significant accounting policies.",
 "Proposed adjustments to financial statements.",
 "Financial statement disclosure/presentation matters.",
 "Management judgments on asset impairment.",
 "Doubts about the entity's ability to continue as a going concern.",
];

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";

export function Audit320Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-320-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data320>(
  () => readJsonFromLocalStorage<Data320>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updRow(id: string, patch: Partial<DecisionRow>) {
  setData(d => ({ ...d, rows: d.rows.map(r => r.id === id ? { ...r, ...patch } : r) }));
 }

 function addRow() {
  setData(d => ({ ...d, rows: [...d.rows, blankRow(d.rows.length)] }));
 }

 function removeRow(id: string) {
  setData(d => ({ ...d, rows: d.rows.filter(r => r.id !== id) }));
 }

 return (
  <WorksheetLayout
   heading="Canada > Completion & Signoffs"
   objective="To document significant matters arising during the audit, the conclusions reached and the professional judgments made in reaching those conclusions. If applicable, identify any matters communicated to those charged with governance (TCWG)."
   standard={`${ctx.standardPrefix} 220`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="320"
    title="Notes on Significant Audit Decisions"
    standard={`${ctx.standardPrefix} 220`}
    overallRisk={undefined}
   />

   {/* Examples notice */}
   <div className="flex items-start gap-3 px-5 py-4 rounded-md border border-blue-200 bg-blue-50 text-blue-900 text-sm">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
    <div>
     <p className="font-semibold mb-1">Examples of significant matters would include:</p>
     <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
      {EXAMPLES.map((ex, i) => (
       <div key={i} className="flex items-start gap-1.5">
        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
        <span>{ex}</span>
       </div>
      ))}
     </div>
    </div>
   </div>

   {/* Main table */}
   <div className={CARD}>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[900px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-10 text-center"}>#</th>
        <th className={TH}>Description of significant matter</th>
        <th className={TH}>Proposed resolution</th>
        <th className={TH}>Conclusion reached (including professional judgments made)</th>
        <th className={TH + " w-[110px] text-center"}>Report to TCWG?</th>
        <th className={TH + " w-[100px] text-center"}>W/P Ref.</th>
        <th className={TH + " w-8"} />
       </tr>
      </thead>
      <tbody>
       {data.rows.map((row, idx) => (
        <tr key={row.id} className="hover:bg-muted/20">
         <td className={TD + " text-center text-muted-foreground font-medium w-10"}>{idx + 1}.</td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.description}
           onChange={e => updRow(row.id, { description: e.target.value })}
           placeholder="Describe the significant matter…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.proposedResolution}
           onChange={e => updRow(row.id, { proposedResolution: e.target.value })}
           placeholder="Proposed resolution…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.conclusion}
           onChange={e => updRow(row.id, { conclusion: e.target.value })}
           placeholder="Conclusion reached…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD + " text-center w-[110px]"}>
          <Select
           disabled={locked}
           value={row.reportToTCWG}
           onValueChange={v => updRow(row.id, { reportToTCWG: v as YN })}
          >
           <SelectTrigger className="text-sm h-9">
            <SelectValue placeholder="—" />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="Y">Y</SelectItem>
            <SelectItem value="N">N</SelectItem>
           </SelectContent>
          </Select>
         </td>
         <td className={TD + " text-center w-[100px]"}>
          <RefButton
           reference={row.wpRef}
           onAttach={doc => updRow(row.id, { wpRef: [...row.wpRef, doc] })}
           onRemove={i => updRow(row.id, { wpRef: row.wpRef.filter((_, idx2) => idx2 !== i) })}
           disabled={locked}
          />
         </td>
         <td className={TD + " w-8 text-center"}>
          {!locked && (
           <button
            onClick={() => removeRow(row.id)}
            className="text-muted-foreground hover:text-destructive transition-colors"
           >
            <Trash2 className="h-3.5 w-3.5" />
           </button>
          )}
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
    {!locked && (
     <div className="px-4 py-3 border-t border-border">
      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
       <Plus className="h-3 w-3" /> Add Row
      </Button>
     </div>
    )}
   </div>

   <ConcludeBar
    worksheetKey="audit-320"
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
