import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Trash2 } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

type YSN = "Y" | "S" | "N" | "";
type YN = "Y" | "N" | "NA" | "";
type Classification = "Material weakness" | "Significant deficiency" | "Control deficiency" | "Observation" | "";

interface DeficiencyRow {
 id: string;
 description: string;
 source: string; // / 522 / 530 / 550 / Audit procedure
 area: string; // Process / cycle
 classification: Classification;
 potentialImpact: string;
 rootCause: string;
 mgmtResponse: string;
 remediationDate: string;
 responseRef: string; // ref audit response
 reportedInWriting: YN;
 dateReported: string;
 wpRef: RefDoc[];
}

interface Data575 {
 rows: DeficiencyRow[];
 communicationDate: string;
 overallConclusion: YSN;
 conclusionRationale: string;
 notes: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Reference data ─────────────────────────────────────────────────────────────

const SOURCES = ["Form 520", "Form 522", "Form 530", "Form 540", "Form 550", "Form 551", "Audit procedure", "Other"];

const CLASSIFICATION_OPTIONS: Classification[] = [
 "Material weakness",
 "Significant deficiency",
 "Control deficiency",
 "Observation",
];

const classificationBadge = (c: Classification): string => {
 switch (c) {
 case "Material weakness": return "bg-red-50 text-red-700 border-red-200";
 case "Significant deficiency": return "bg-amber-50 text-amber-700 border-amber-200";
 case "Control deficiency": return "bg-yellow-50 text-yellow-700 border-yellow-200";
 case "Observation": return "bg-muted text-muted-foreground border-border";
 default: return "";
 }
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function emptyRow(): DeficiencyRow {
 return {
 id: uid(), description: "", source: "", area: "", classification: "",
 potentialImpact: "", rootCause: "", mgmtResponse: "", remediationDate: "",
 responseRef: "", reportedInWriting: "", dateReported: "", wpRef: [],
 };
}
function buildDefault(): Data575 {
 return {
 rows: [emptyRow()],
 communicationDate: "",
 overallConclusion: "",
 conclusionRationale: "",
 notes: "",
 concluded: false, concludedOn: "",
 };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Audit575Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const storageKey = `audit-575-data-${engagementId ?? "default"}`;
 const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isFirstRender = useRef(true);

 const [data, setData] = useState<Data575>(() => {
 const saved = readJsonFromLocalStorage<Data575 | null>(storageKey, null);
 if (!saved) return buildDefault();
 const def = buildDefault();
 return {...def,...saved, rows: saved.rows?.length ? saved.rows : def.rows };
 });

 useEffect(() => {
 if (isFirstRender.current) { isFirstRender.current = false; return; }
 if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
 saveTimerRef.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;
 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLElement>(null);

 function markLukaFilled(id: string) {
  setLukaFilledFields(prev => new Set(prev).add(id));
  setLukaHighlightFields(prev => new Set(prev).add(id));
  setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 function patchRow(id: string, patch: Partial<DeficiencyRow>) {
 setData(d => ({...d, rows: d.rows.map(r => r.id === id ? {...r,...patch } : r) }));
 }
 function addRow() { setData(d => ({...d, rows: [...d.rows, emptyRow()] })); }
 function removeRow(id: string) {
 setData(d => ({...d, rows: d.rows.length > 1 ? d.rows.filter(r => r.id !== id) : d.rows }));
 }

 // ── Summary counts ──────────────────────────────────────────────────────────
 const counts = data.rows.reduce(
 (acc, r) => {
 if (r.classification === "Material weakness") acc.mw++;
 else if (r.classification === "Significant deficiency") acc.sd++;
 else if (r.classification === "Control deficiency") acc.cd++;
 else if (r.classification === "Observation") acc.obs++;
 return acc;
 },
 { mw: 0, sd: 0, cd: 0, obs: 0 }
 );

 // ── Render ──────────────────────────────────────────────────────────────────

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
    actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.riskAssessment.actions.map(a => ({
      ...a,
      onTrigger: () => {
        setLukaState('loading');
        const row0 = data.rows[0];
        const row1Id = data.rows[1]?.id ?? uid();
        if (!data.rows[1]) {
          setData(d => ({ ...d, rows: [...d.rows, { ...emptyRow(), id: row1Id }] }));
        }
        lukaSequentialFill([
          {
            scrollRef: firstFillRef,
            set: () => {
              patchRow(row0.id, {
                description: 'Segregation of duties gap in accounts payable: the same individual can create vendors, process invoices, and approve payments without independent review.',
                source: 'Form 550',
                area: 'Accounts Payable',
                classification: 'Significant deficiency' as Classification,
                potentialImpact: 'Unauthorized payments or fraudulent vendor creation could go undetected — affects completeness and existence of AP balances.',
                rootCause: 'Insufficient staffing in the finance function; no compensating controls in place.',
              });
              markLukaFilled('575-row0');
            },
          },
          {
            set: () => {
              patchRow(row1Id, {
                description: 'Lack of formal IT change management process: program changes are implemented directly to production without documented testing or independent approval.',
                source: 'Form 551',
                area: 'IT General Controls',
                classification: 'Significant deficiency' as Classification,
                potentialImpact: 'Unauthorized or untested changes could affect accuracy of automated financial calculations and ERP reporting outputs.',
                rootCause: 'No formal change management policy exists; IT team operates without documented change procedures.',
              });
              markLukaFilled('575-row1');
            },
          },
          {
            set: () => {
              setData(d => ({
                ...d,
                overallConclusion: 'S' as YSN,
                conclusionRationale: 'Two significant deficiencies identified — no material weaknesses. Management responses obtained; additional substantive procedures applied to affected areas.',
              }));
              markLukaFilled('575-conclusion');
            },
          },
        ], () => setLukaState('done'));
      },
    }))}
  />
 )}
 {/* Objective banner */}
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-3 shrink-0">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Document internal control deficiencies identified during the audit (from Forms 520, 522, 530, 540, 550 and
 audit procedures), classify them by severity, assess potential impact on the financial statements, and
 record management's response. Significant deficiencies and material weaknesses must be communicated in
 writing to those charged with governance.
 </p>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">

 {/* Classification reference */}
 <div className="bg-card border border-border rounded-md p-4">
 <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Classification reference</p>
 <div className="grid grid-cols-3 gap-3 text-sm leading-relaxed">
 <div className="rounded-md border border-red-200 bg-red-50/40 p-3">
 <span className="font-semibold text-red-700">Material weakness</span>
 <p className="text-muted-foreground mt-1">
 One or more deficiencies such that there is a reasonable possibility of material misstatement not
 being prevented or detected on a timely basis.
 </p>
 </div>
 <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3">
 <span className="font-semibold text-amber-700">Significant deficiency</span>
 <p className="text-muted-foreground mt-1">
 Less severe than a material weakness yet important enough to merit attention by those charged with
 governance.
 </p>
 </div>
 <div className="rounded-md border border-yellow-200 bg-yellow-50/40 p-3">
 <span className="font-semibold text-yellow-700">Control deficiency</span>
 <p className="text-muted-foreground mt-1">
 A deficiency in the design or operation of a control that does not rise to the level of a significant
 deficiency.
 </p>
 </div>
 </div>
 </div>

 {/* Summary chips */}
 <div className="flex flex-wrap gap-2 text-sm">
 <span className="px-3 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 font-medium">
 Material weakness: <b>{counts.mw}</b>
 </span>
 <span className="px-3 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700 font-medium">
 Significant deficiency: <b>{counts.sd}</b>
 </span>
 <span className="px-3 py-1 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-700 font-medium">
 Control deficiency: <b>{counts.cd}</b>
 </span>
 <span className="px-3 py-1 rounded-md border border-border bg-muted text-muted-foreground font-medium">
 Observations: <b>{counts.obs}</b>
 </span>
 <span className="px-3 py-1 rounded-md border border-border bg-card text-foreground font-medium">
 Total: <b>{data.rows.length}</b>
 </span>
 </div>

 {/* Deficiencies table */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold text-foreground">Internal control deficiencies identified</h3>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 One row per deficiency. Cross-reference to the source form and to the audit response
 </p>
 </div>
 {!locked && (
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addRow}>
 <Plus className="h-3.5 w-3.5" /> Add deficiency
 </Button>
 )}
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-3 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-10">#</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 240 }}>Deficiency description</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Source</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 140 }}>Area / Process</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 170 }}>Classification</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 200 }}>Potential impact</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 180 }}>Root cause</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 200 }}>Management response</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Target remediation</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Ref.</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>Reported in writing?</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>W/P ref.</th>
 {!locked && <th className="px-2 py-3 w-8" />}
 </tr>
 </thead>
 <tbody>
 {data.rows.map((r, i) => {
 const rowFillKey = i === 0 ? '575-row0' : i === 1 ? '575-row1' : '';
 return (
 <tr key={r.id}
  ref={i === 0 && isDemoEngagement ? firstFillRef as any : undefined}
  className={`hover:bg-muted/50 transition-colors align-top border-b border-border last:border-b-0${isDemoEngagement && rowFillKey && lukaHighlightFields.has(rowFillKey) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-3 py-2 text-center font-mono">{i + 1}</td>
 <td className="px-3 py-2">
 <LukaTypingRow filled={isDemoEngagement && !!rowFillKey && lukaFilledFields.has(rowFillKey)}>
  <div className="flex items-start gap-1.5">
    <GreenDot show={!!r.description} />
    <Textarea disabled={locked} value={r.description}
    onChange={e => patchRow(r.id, { description: e.target.value })}
    placeholder="Describe the deficiency…"
    className="flex-1 min-h-[72px] text-sm resize-none rounded-[10px]" />
  </div>
 </LukaTypingRow>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.source} onValueChange={v => patchRow(r.id, { source: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 {SOURCES.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <Input disabled={locked} value={r.area} onChange={e => patchRow(r.id, { area: e.target.value })}
 placeholder="e.g., Payroll"
 className="h-8 text-sm" />
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.classification}
 onValueChange={v => patchRow(r.id, { classification: v as Classification })}>
 <SelectTrigger className={`h-8 text-sm ${r.classification ? `${classificationBadge(r.classification)} font-medium` : ""}`}>
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 {CLASSIFICATION_OPTIONS.map(o => (
 <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!r.potentialImpact} />
   <Textarea disabled={locked} value={r.potentialImpact}
   onChange={e => patchRow(r.id, { potentialImpact: e.target.value })}
   placeholder="Assertions / accounts affected, magnitude…"
   className="flex-1 min-h-[72px] text-sm resize-none rounded-[10px]" />
 </div>
 </td>
 <td className="px-3 py-2">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!r.rootCause} />
   <Textarea disabled={locked} value={r.rootCause}
   onChange={e => patchRow(r.id, { rootCause: e.target.value })}
   placeholder="Underlying cause…"
   className="flex-1 min-h-[72px] text-sm resize-none rounded-[10px]" />
 </div>
 </td>
 <td className="px-3 py-2">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!r.mgmtResponse} />
   <Textarea disabled={locked} value={r.mgmtResponse}
   onChange={e => patchRow(r.id, { mgmtResponse: e.target.value })}
   placeholder="Management's planned response…"
   className="flex-1 min-h-[72px] text-sm resize-none rounded-[10px]" />
 </div>
 </td>
 <td className="px-3 py-2 text-center">
 <Input disabled={locked} type="date" value={r.remediationDate}
 onChange={e => patchRow(r.id, { remediationDate: e.target.value })}
 className="h-8 text-sm" />
 </td>
 <td className="px-3 py-2">
 <Input disabled={locked} value={r.responseRef}
 onChange={e => patchRow(r.id, { responseRef: e.target.value })}
 placeholder="e.g., 590-Rev-3"
 className="h-8 text-sm font-mono" />
 </td>
 <td className="px-3 py-2 space-y-1.5">
 <Select disabled={locked} value={r.reportedInWriting}
 onValueChange={v => patchRow(r.id, { reportedInWriting: v as YN })}>
 <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 <Input disabled={locked} type="date" value={r.dateReported}
 onChange={e => patchRow(r.id, { dateReported: e.target.value })}
 className="h-7 text-sm" />
 </td>
 <td className="px-3 py-2 text-center">
 <RefButton
 reference={r.wpRef}
 onAttach={doc => patchRow(r.id, { wpRef: [...r.wpRef, doc] })}
 onRemove={idx => patchRow(r.id, { wpRef: r.wpRef.filter((_, i2) => i2 !== idx) })}
 />
 </td>
 {!locked && (
 <td className="px-2 py-2 text-center">
 <button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* CAS 265 reminder */}
 <div className="bg-primary/[0.03] border border-primary/15 rounded-md p-4 text-sm text-foreground/85 space-y-1.5">
 <p className="font-semibold text-foreground">Reminders:</p>
 <ul className="list-disc list-inside space-y-1 text-muted-foreground">
 <li>Communicate significant deficiencies in writing to management and TCWG on a timely basis.</li>
 <li>Consider the need for additional audit procedures to respond to the related risks of material misstatement.</li>
 <li>Reassess control risk where deficiencies affect controls previously relied upon.</li>
 </ul>
 </div>

 {/* Communication & conclusion */}
 <div className="bg-card border border-border rounded-md p-5 space-y-3">
 <h3 className="text-sm font-semibold text-foreground">Communication &amp; overall conclusion</h3>
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Date communicated to management / TCWG</label>
 <Input disabled={locked} type="date" value={data.communicationDate}
 onChange={e => setData(d => ({...d, communicationDate: e.target.value }))}
 className="h-8 text-sm" />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Overall conclusion</label>
 <Select disabled={locked} value={data.overallConclusion}
 onValueChange={v => setData(d => ({...d, overallConclusion: v as YSN }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — No matters affecting opinion</SelectItem>
 <SelectItem value="S" className="text-sm">S — Deficiencies noted; addressed by response</SelectItem>
 <SelectItem value="N" className="text-sm">N — Material weakness — escalation required</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Rationale</label>
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('575-conclusion')}>
  <Input disabled={locked} value={data.conclusionRationale}
  onChange={e => setData(d => ({...d, conclusionRationale: e.target.value }))}
  placeholder="Briefly support the conclusion."
  className="h-8 text-sm" />
 </LukaTypingRow>
 </div>
 </div>
 </div>

 {/* Notes */}
 <div className="bg-card border border-border rounded-md p-5 space-y-2">
 <h3 className="text-sm font-semibold text-foreground">Notes</h3>
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!data.notes} />
   <Textarea disabled={locked} value={data.notes}
   onChange={e => setData(d => ({...d, notes: e.target.value }))}
   placeholder="Additional observations, follow-ups, prior-year carry-forwards, or cross-references…"
   className="flex-1 min-h-[90px] text-sm resize-none rounded-[10px]" />
 </div>
 </div>

 <WorksheetSignOff worksheetKey="audit-575" engagementId={engagementId} />

 {locked ? (
 <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { const u = {...data, concluded: false, concludedOn: '' }; setData(u); writeJsonToLocalStorage(storageKey, u); }} />
 ) : (
 <div className="flex justify-end">
 <Button size="sm" onClick={() => {
 const today = new Date().toISOString();
 const updated = {...data, concluded: true, concludedOn: today };
 setData(updated);
 writeJsonToLocalStorage(storageKey, updated);
 }}>
 Conclude Worksheet
 </Button>
 </div>
 )}
 </div>
 </div>
 );
}
