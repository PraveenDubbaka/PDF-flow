import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";

type RefField = RefDoc[];

interface MatterRow {
 id: string;
 description: string;
 suggestedAction: string;
 wpRef: RefField;
}

interface Data370 {
 rows: MatterRow[];
 signOff: SignOffData;
 concluded: boolean;
 concludedOn: string;
}

function blankRow(idx: number): MatterRow {
 return {
  id: `row-${Date.now()}-${idx}`,
  description: "",
  suggestedAction: "",
  wpRef: [],
 };
}

function buildDefault(): Data370 {
 return {
  rows: Array.from({ length: 10 }, (_, i) => blankRow(i)),
  signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
  concluded: false,
  concludedOn: "",
 };
}

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";

export function Audit370Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const ctx = useEngagementContext();
 const storageKey = `audit-370-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data370>(
  () => readJsonFromLocalStorage<Data370>(storageKey, buildDefault()) ?? buildDefault(),
 );

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 useEffect(() => {
  if (first.current) { first.current = false; return; }
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;

 function updRow(id: string, patch: Partial<MatterRow>) {
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
   objective="To document matters that will be carried forward to assist in the planning and performance of future engagements."
   standard={`${ctx.standardPrefix} 300`}
  >
   <WorksheetHeader
    ctx={ctx}
    formNo="370"
    title="Matters for Future Consideration"
    standard={`${ctx.standardPrefix} 300`}
    overallRisk={undefined}
   />

   {/* ── Guidance ─────────────────────────────────────────────────────── */}
   <div className="flex items-start gap-3 px-5 py-4 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-sm">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
    <p>
     Consider matters such as: difficulties encountered; suggestions for alternative or revised audit procedures; advice for future engagement teams; anticipated changes in the entity; changes in business or fraud risks; and revisions to internal control.
    </p>
   </div>

   {/* ── Main Table ───────────────────────────────────────────────────── */}
   <div className={CARD}>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[600px] border-collapse">
      <thead>
       <tr className="bg-muted">
        <th className={TH + " w-10 text-center"}>#</th>
        <th className={TH}>Description of matter</th>
        <th className={TH}>Suggested action</th>
        <th className={TH + " w-24 text-center"}>W/P Ref.</th>
        <th className={TH + " w-8"} />
       </tr>
      </thead>
      <tbody>
       {data.rows.map((row, idx) => (
        <tr key={row.id} className="hover:bg-muted/20">
         <td className={TD + " w-10 text-center text-muted-foreground font-medium"}>{idx + 1}.</td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.description}
           onChange={e => updRow(row.id, { description: e.target.value })}
           placeholder="Describe the matter to carry forward…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD}>
          <Textarea
           disabled={locked}
           value={row.suggestedAction}
           onChange={e => updRow(row.id, { suggestedAction: e.target.value })}
           placeholder="Suggested action for future engagement…"
           className="min-h-[72px] text-sm resize-none"
          />
         </td>
         <td className={TD + " w-24 text-center"}>
          <RefButton
           reference={row.wpRef}
           onAttach={doc => updRow(row.id, { wpRef: [...row.wpRef, doc] })}
           onRemove={i => updRow(row.id, { wpRef: row.wpRef.filter((_, i2) => i2 !== i) })}
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
    worksheetKey="audit-370"
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
