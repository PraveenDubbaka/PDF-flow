import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type RefField = RefDoc[];

interface FindingRow {
 id: string;
 finding: string;
 suggestedResolution: string;
 actualResolution: string;
 wpRef: RefField;
}

interface Data330 {
 rows: FindingRow[];
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

function blankRow(idx: number): FindingRow {
 return {
  id: `row-${Date.now()}-${idx}`,
  finding: "",
  suggestedResolution: "",
  actualResolution: "",
  wpRef: [],
 };
}

function buildDefault(): Data330 {
 return {
  rows: Array.from({ length: 12 }, (_, i) => blankRow(i)),
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false,
  concludedOn: "",
 };
}

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";

export function Audit330Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-330-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data330>(
  () => readJsonFromLocalStorage<Data330>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updRow(id: string, patch: Partial<FindingRow>) {
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
   objective="To record audit findings (matters identified during the audit as a result of performing audit procedures) and how they were resolved."
   standard={`${ctx.standardPrefix} 220`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="330"
    title="Audit Findings and Matters for Discussion"
    standard={`${ctx.standardPrefix} 220`}
    overallRisk={undefined}
   />

   {/* Main table */}
   <div className={CARD}>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[800px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-10 text-center"}>#</th>
        <th className={TH}>Audit finding<br /><span className="text-muted-foreground font-normal normal-case">(such as possible bias in an estimate)</span></th>
        <th className={TH}>Suggested resolution<br /><span className="text-muted-foreground font-normal normal-case">(such as impact on F/S or audit procedures)</span></th>
        <th className={TH}>Actual resolution reached and the reasoning</th>
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
           value={row.finding}
           onChange={e => updRow(row.id, { finding: e.target.value })}
           placeholder="Describe the audit finding…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.suggestedResolution}
           onChange={e => updRow(row.id, { suggestedResolution: e.target.value })}
           placeholder="Suggested resolution…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.actualResolution}
           onChange={e => updRow(row.id, { actualResolution: e.target.value })}
           placeholder="Actual resolution and reasoning…"
           className="min-h-[72px] text-sm resize-none"
          />
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
    worksheetKey="audit-330"
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
