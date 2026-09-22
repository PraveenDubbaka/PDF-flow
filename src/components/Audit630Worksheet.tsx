import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { loadRisks520, overallRisk520 } from "@/lib/audit520Bridge";
import {
 WorksheetLayout, WorksheetHeader, LinkedRisksCard, ConcludeBar, type SignOffData,
} from "@/components/audit/WorksheetShell";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

interface ConfirmRow {
 id: string;
 area: string;
 wpRef: string;
 type: "Positive" | "Negative" | "";
 nature: string; // brief description
 itemsSent: string;
 itemsReceived: string;
 amountConfirmed: string;
 exceptions: string;
 psc: "Y" | "N" | "" ;
}

interface Data630 {
 rows: ConfirmRow[];
 controlSummary: string;
 overallConclusion: string;
 signOff: SignOffData;
 concluded: boolean; concludedOn: string;
}

// Source PEG worksheet 630 standard rows
const DEFAULT_AREAS: { area: string; wpRef: string }[] = [
 { area: "Bank balances or debt", wpRef: "" },
 { area: "Accounts receivable", wpRef: "C.110" },
 { area: "Loans and advances receivable", wpRef: "" },
 { area: "Accounts payable", wpRef: "CC.110" },
 { area: "Estimates", wpRef: "" },
 { area: "Notes payable", wpRef: "" },
 { area: "Long-term debt", wpRef: "" },
 { area: "Legal letter", wpRef: "" },
 { area: "Inventory held by others", wpRef: "" },
];

function blankRow(area = "", wpRef = ""): ConfirmRow {
 return { id: Math.random().toString(36).slice(2), area, wpRef, type: "", nature: "", itemsSent: "", itemsReceived: "", amountConfirmed: "", exceptions: "", psc: "" };
}

function buildDefault(): Data630 {
 return {
 rows: DEFAULT_AREAS.map(a => blankRow(a.area, a.wpRef)),
 controlSummary: "Control was maintained over the confirmation process: selection of confirming parties, validation of names / addresses / amounts, sending and receipt of confirmations including follow-ups for non-responses (second requests).",
 overallConclusion: "",
 signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
 concluded: false, concludedOn: "",
 };
}

export function Audit630Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();
 const risks = useMemo(() => loadRisks520(engagementId), [engagementId]);
 const overall = useMemo(() => overallRisk520(risks), [risks]);

 const storageKey = `audit-630-data-${engagementId ?? "default"}`;
 const [data, setData] = useState<Data630>(() => readJsonFromLocalStorage<Data630>(storageKey, buildDefault()) ?? buildDefault());

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
 const upd = (id: string, field: keyof ConfirmRow, value: string) =>
 setData(d => ({...d, rows: d.rows.map(r => r.id === id ? {...r, [field]: value } : r) }));

 const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
 const td = "border-b border-border px-3 py-2.5 text-sm align-top";

 return (
 <WorksheetLayout
 heading="Canada > Worksheets"
 objective="Summarise the use of external confirmation procedures, the nature and number of items confirmed, and any exceptions or difficulties encountered."
 standard={`${ctx.standardPrefix} 505`}
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
               setData(d => ({ ...d, rows: d.rows.map((r, i) => i === 0
                 ? { ...r, type: 'Positive' as const, nature: 'Bank confirmation for operating account', itemsSent: '1', itemsReceived: '1', amountConfirmed: '485,230', exceptions: 'None', psc: 'Y' as const }
                 : r
               )}));
               markLukaFilled('confirm-0');
             }
           },
           {
             set: () => {
               setData(d => ({ ...d, rows: d.rows.map((r, i) => i === 1
                 ? { ...r, type: 'Positive' as const, nature: 'Accounts receivable — top 20 customers by balance', itemsSent: '20', itemsReceived: '17', amountConfirmed: '1,245,800', exceptions: '3 non-responses; alternative procedures applied (subsequent cash receipts confirmed)' }
                 : r
               )}));
               markLukaFilled('confirm-1');
             }
           },
           {
             set: () => {
               setData(d => ({ ...d, overallConclusion: 'Confirmation procedures performed. Bank balance confirmed without exception. AR sample of 20 confirmations: 17 positive responses received; 3 non-responses resolved via subsequent cash receipts testing. No material exceptions identified.' }));
               markLukaFilled('conclusion');
             }
           },
         ], () => setLukaState('done'));
       },
     }))}
   />
 ) : undefined}
 >
 <WorksheetHeader
 ctx={ctx}
 formNo="630"
 title="Summary of External Confirmations"
 standard={`${ctx.standardPrefix} 505`}
 overallRisk={overall}
 />

 <LinkedRisksCard overallRisk={overall}
 risks={risks.filter(r => /receiv|payab|bank|debt|loan|invent|legal|confirm/i.test(`${r.scotabd ?? ""} ${r.rmmIdentified}`))}
 emptyHint="No risks tagged for areas typically requiring confirmation."
 storageKey={`audit-630-risks-${engagementId ?? "default"}`}
 locked={locked}
 />

 <div className={CARD} ref={firstFillRef}>
 <div className="px-6 py-3.5 border-b border-border flex items-center justify-between">
 <h3 className="text-sm font-semibold">Confirmation register</h3>
 {!locked && (
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => setData(d => ({...d, rows: [...d.rows, blankRow()] }))}>
 <Plus className="h-3.5 w-3.5" /> Add area
 </Button>
 )}
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead><tr className="bg-muted/40">
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[170px]">Audit area</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[110px]">W/P ref.</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[120px]">Type</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border">Nature &amp; number of items confirmed</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[80px]">Sent</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[80px]">Received</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[120px]">Amount $</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border">Exceptions / difficulties</th>
 <th className="text-left px-3 py-2.5 font-medium text-sm border-b border-border w-[80px]">PSC</th>
 
 {!locked && <th className="border-b border-border w-[44px]"></th>}
 </tr></thead>
 <tbody>
 {data.rows.map((r, rowIndex) => (
 <tr key={r.id} className={`hover:bg-muted/20${isDemoEngagement && (rowIndex === 0 ? lukaHighlightFields.has('confirm-0') : rowIndex === 1 ? lukaHighlightFields.has('confirm-1') : false) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className={td}><Input disabled={locked} value={r.area} onChange={e => upd(r.id, "area", e.target.value)} className="h-8 text-sm" /></td>
 <td className={td}><Input disabled={locked} value={r.wpRef} onChange={e => upd(r.id, "wpRef", e.target.value)} className="h-8 text-sm font-mono" placeholder="—" /></td>
 <td className={td}>
 <Select disabled={locked} value={r.type} onValueChange={(v: "Positive" | "Negative") => upd(r.id, "type", v)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Positive">Positive</SelectItem>
 <SelectItem value="Negative">Negative</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={td}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!r.nature} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && (rowIndex === 0 ? lukaFilledFields.has('confirm-0') : rowIndex === 1 ? lukaFilledFields.has('confirm-1') : false)}>
   <Textarea disabled={locked} value={r.nature} onChange={e => upd(r.id, "nature", e.target.value)} className="flex-1 min-h-[56px] text-sm resize-none" placeholder="e.g. top 15 customers by balance" />
 </LukaTypingRow>
 </div>
 </div>
 </td>
 <td className={td}><Input disabled={locked} value={r.itemsSent} onChange={e => upd(r.id, "itemsSent", e.target.value)} className="h-8 text-sm" placeholder="0" /></td>
 <td className={td}><Input disabled={locked} value={r.itemsReceived} onChange={e => upd(r.id, "itemsReceived", e.target.value)} className="h-8 text-sm" placeholder="0" /></td>
 <td className={td}><Input disabled={locked} value={r.amountConfirmed} onChange={e => upd(r.id, "amountConfirmed", e.target.value)} className="h-8 text-sm" placeholder="0" /></td>
 <td className={td}><div className="flex items-start gap-1.5"><GreenDot show={!!r.exceptions} /><div className="flex-1"><AttributedComment value={r.exceptions} onChange={v => upd(r.id, "exceptions", v)} storageKey={`630-${engagementId ?? "def"}-exc-${r.id}`} placeholder="None / describe" disabled={locked} className="min-h-[56px] text-sm resize-none" /></div></div></td>
 <td className={td}>
 <Select disabled={locked} value={r.psc} onValueChange={(v: "Y" | "N") => upd(r.id, "psc", v)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
 </Select>
 </td>
 
 {!locked && (
 <td className={td + " text-center"}>
 <button onClick={() => setData(d => ({...d, rows: d.rows.filter(x => x.id !== r.id) }))} className="text-muted-foreground hover:text-destructive">
 <Trash2 className="h-4 w-4" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-2.5 text-sm text-muted-foreground border-t border-border bg-muted/30">
 Negative confirmations are appropriate only when: RMM is low; other substantive evidence exists; controls are reliable; population is large, small and homogeneous; and a low exception rate is expected.
 </div>
 </div>

 <div className={CARD}>
 <div className="px-6 py-3.5 border-b border-border"><h3 className="text-sm font-semibold">Control over the confirmation process</h3></div>
 <div className="p-6">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.controlSummary} />
 <Textarea disabled={locked} value={data.controlSummary} onChange={e => setData(d => ({...d, controlSummary: e.target.value }))} className="flex-1 text-sm min-h-[80px]" />
 </div>
 </div>
 </div>

 <div className={CARD}>
 <div className="px-6 py-3.5 border-b border-border"><h3 className="text-sm font-semibold">Overall conclusion</h3></div>
 <div className={`p-6${isDemoEngagement && lukaHighlightFields.has('conclusion') ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.overallConclusion} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('conclusion')}>
   <Textarea disabled={locked} value={data.overallConclusion} onChange={e => setData(d => ({...d, overallConclusion: e.target.value }))} className="flex-1 text-sm min-h-[88px]" placeholder="Conclude on the sufficiency of evidence obtained from external confirmations." />
 </LukaTypingRow>
 </div>
 </div>
 </div>
 </div>

 <ConcludeBar worksheetKey="audit-630" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn}
 onConclude={() => { const u = {...data, concluded: true, concludedOn: new Date().toISOString() }; setData(u); writeJsonToLocalStorage(storageKey, u); }}
 onReopen={() => { const u = {...data, concluded: false, concludedOn: "" }; setData(u); writeJsonToLocalStorage(storageKey, u); }} />
 </WorksheetLayout>
 );
}
