import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type RefField = RefDoc[];

interface KAMRow {
 id: string;
 description: string;
 significance: string;
 mannerAddressed: string;
 wpRef: RefField;
}

interface Data325 {
 rows: KAMRow[];
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

function blankRow(idx: number): KAMRow {
 return {
  id: `row-${Date.now()}-${idx}`,
  description: "",
  significance: "",
  mannerAddressed: "",
  wpRef: [],
 };
}

function buildDefault(): Data325 {
 return {
  rows: Array.from({ length: 8 }, (_, i) => blankRow(i)),
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false,
  concludedOn: "",
 };
}

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";

export function Audit325Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-325-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data325>(
  () => readJsonFromLocalStorage<Data325>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updRow(id: string, patch: Partial<KAMRow>) {
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
   objective="To document key audit matters that the auditor decides (or is required) to communicate in the auditor's report in accordance with CAS 701."
   standard={`${ctx.standardPrefix} 701`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="325"
    title="Key Audit Matters"
    standard={`${ctx.standardPrefix} 701`}
    overallRisk={undefined}
   />

   {/* Info notice */}
   <div className="flex items-start gap-3 px-5 py-4 rounded-md border border-blue-200 bg-blue-50 text-blue-900 text-sm">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
    <p>
     Key audit matters are matters that, in the auditor's professional judgment, were of most significance in the audit of the financial statements of the current period. Key audit matters are selected from matters communicated to those charged with governance. Remember to communicate each key audit matter selected for inclusion in the audit report with those charged with governance.
    </p>
   </div>

   {/* Main table */}
   <div className={CARD}>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[800px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-10 text-center"}>#</th>
        <th className={TH}>Description of the key audit matter</th>
        <th className={TH}>Significance</th>
        <th className={TH}>Manner addressed in the audit</th>
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
           placeholder="Describe the key audit matter…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.significance}
           onChange={e => updRow(row.id, { significance: e.target.value })}
           placeholder="Why it was significant…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.mannerAddressed}
           onChange={e => updRow(row.id, { mannerAddressed: e.target.value })}
           placeholder="How it was addressed in the audit…"
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
    worksheetKey="audit-325"
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
