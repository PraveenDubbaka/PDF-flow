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
type ITLayer = "Application" | "Database" | "Operating system" | "Network" | "";
type ITProcess = "IT Security" | "Program changes" | "IT operations" | "";
type PrevDet = "Preventive" | "Detective" | "";
type GitcCategory = "access" | "change" | "operations";

interface RafuitRow {
 id: string;
 automatedControl: string; // ref / description
 itLayer: ITLayer;
 rafuit: string; // risk arising from use of IT
 itProcess: ITProcess;
 gitcRefs: string; // e.g. "C1, C5" — links to GITC rows
}

interface GitcRow {
 id: string;
 ref: string; // C1, C2 …
 description: string;
 itLayer: ITLayer;
 frequency: string;
 prevDet: PrevDet;
 designEffective: YSN; // Y/S/N
 implemented: YN; // Y/N/NA
 supportingDocs: RefDoc[];
 oeTestPlanned: YN;
 oeTestEffective: YN;
}

interface GitcSection {
 key: GitcCategory;
 title: string;
 rows: GitcRow[];
}

interface GitcSheet {
 scope: "common" | "application";
 appName: string; // only used when scope === 'application'
 sections: GitcSection[];
}

interface Data551 {
 rafuit: RafuitRow[];
 rafuitConclusion: YSN;
 rafuitRationale: string;
 commonGitc: GitcSheet;
 appGitc: GitcSheet[]; // one sheet per relevant IT application
 gitcConclusion: YSN;
 gitcRationale: string;
 notes: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Reference data ─────────────────────────────────────────────────────────────

const IT_LAYERS: ITLayer[] = ["Application", "Database", "Operating system", "Network"];
const IT_PROCESSES: ITProcess[] = ["IT Security", "Program changes", "IT operations"];
const FREQUENCIES = ["Per event", "Daily", "Weekly", "Monthly", "Quarterly", "Annually", "Ad hoc"];

const GITC_CATEGORIES: { key: GitcCategory; title: string; hint: string }[] = [
 { key: "access", title: "Access (Security)", hint: "Logical access, authentication, privileged access, segregation." },
 { key: "change", title: "Program Change", hint: "Authorization, testing, migration of program changes and configurations." },
 { key: "operations", title: "IT Operations", hint: "Backup & recovery, job scheduling, job monitoring, incident response." },
];

// Common RAFUIT library (Appendix 1)
const RAFUIT_LIBRARY = [
 "Unauthorized access to financial systems or data",
 "Inappropriate changes to application programs or configurations",
 "Direct data changes that bypass application controls",
 "Failure of automated processing (batch, interface) leading to incomplete data",
 "Loss of data integrity due to inadequate backup or recovery",
 "Inadequate segregation of duties in IT (developer with production access)",
 "Privileged access not monitored / not removed timely",
 "Unauthorized changes to master files (vendors, customers, pay rates)",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function emptyRafuit(): RafuitRow {
 return { id: uid(), automatedControl: "", itLayer: "", rafuit: "", itProcess: "", gitcRefs: "" };
}
function emptyGitc(ref = ""): GitcRow {
 return {
 id: uid(), ref, description: "", itLayer: "", frequency: "", prevDet: "",
 designEffective: "", implemented: "", supportingDocs: [], oeTestPlanned: "", oeTestEffective: "",
 };
}
function buildSection(key: GitcCategory, title: string, startNum: number, count: number): GitcSection {
 return {
 key, title,
 rows: Array.from({ length: count }, (_, i) => emptyGitc(`C${startNum + i}`)),
 };
}
function buildGitcSheet(scope: "common" | "application", appName = ""): GitcSheet {
 return {
 scope, appName,
 sections: [
 buildSection("access", "Access (Security)", 1, 5),
 buildSection("change", "Program Change", 6, 5),
 buildSection("operations", "IT Operations", 11, 5),
 ],
 };
}

function refStartForSection(key: GitcCategory): number {
 if (key === "access") return 1;
 if (key === "change") return 6;
 return 11;
}

function backfillGitcRefs(sheet: GitcSheet): GitcSheet {
 return {
...sheet,
 sections: sheet.sections.map(sec => ({
...sec,
 rows: sec.rows.map((row, index) => ({
...row,
 ref: row.ref?.trim() || `C${refStartForSection(sec.key) + index}`,
 })),
 })),
 };
}

function buildDefault(): Data551 {
 return {
 rafuit: [emptyRafuit()],
 rafuitConclusion: "",
 rafuitRationale: "",
 commonGitc: buildGitcSheet("common"),
 appGitc: [],
 gitcConclusion: "",
 gitcRationale: "",
 notes: "",
 concluded: false, concludedOn: "",
 };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Audit551Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const storageKey = `audit-551-data-${engagementId ?? "default"}`;
 const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isFirstRender = useRef(true);

 const [data, setData] = useState<Data551>(() => {
 const saved = readJsonFromLocalStorage<Data551 | null>(storageKey, null);
 if (!saved) return buildDefault();
 const def = buildDefault();
 return {
...def,
...saved,
 rafuit: saved.rafuit?.length ? saved.rafuit : def.rafuit,
 commonGitc: saved.commonGitc ? backfillGitcRefs(saved.commonGitc) : def.commonGitc,
 appGitc: (saved.appGitc ?? []).map(backfillGitcRefs),
 };
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

 // ── RAFUIT mutators ─────────────────────────────────────────────────────────
 function setRafuit(id: string, patch: Partial<RafuitRow>) {
 setData(d => ({...d, rafuit: d.rafuit.map(r => r.id === id ? {...r,...patch } : r) }));
 }
 function addRafuit(preset?: string) {
 setData(d => ({...d, rafuit: [...d.rafuit, {...emptyRafuit(), rafuit: preset ?? "" }] }));
 }
 function removeRafuit(id: string) {
 setData(d => ({...d, rafuit: d.rafuit.length > 1 ? d.rafuit.filter(r => r.id !== id) : d.rafuit }));
 }

 // ── GITC mutators (works on a sheet) ────────────────────────────────────────
 function updateSheet(target: "common" | { appIdx: number }, mut: (s: GitcSheet) => GitcSheet) {
 setData(d => {
 if (target === "common") return {...d, commonGitc: mut(d.commonGitc) };
 return {...d, appGitc: d.appGitc.map((s, i) => i === target.appIdx ? mut(s) : s) };
 });
 }
 function patchGitcRow(target: "common" | { appIdx: number }, sectionKey: GitcCategory, rowId: string, patch: Partial<GitcRow>) {
 updateSheet(target, s => ({
...s,
 sections: s.sections.map(sec => sec.key !== sectionKey ? sec : {
...sec, rows: sec.rows.map(r => r.id === rowId ? {...r,...patch } : r),
 }),
 }));
 }
 function addGitcRow(target: "common" | { appIdx: number }, sectionKey: GitcCategory) {
 updateSheet(target, s => {
 const allRows = s.sections.flatMap(x => x.rows);
 const nums = allRows.map(r => parseInt(r.ref.replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
 const next = (nums.length ? Math.max(...nums) : 0) + 1;
 return {
...s,
 sections: s.sections.map(sec => sec.key !== sectionKey ? sec : {
...sec, rows: [...sec.rows, emptyGitc(`C${next}`)],
 }),
 };
 });
 }
 function removeGitcRow(target: "common" | { appIdx: number }, sectionKey: GitcCategory, rowId: string) {
 updateSheet(target, s => ({
...s,
 sections: s.sections.map(sec => sec.key !== sectionKey ? sec : {
...sec, rows: sec.rows.length > 1 ? sec.rows.filter(r => r.id !== rowId) : sec.rows,
 }),
 }));
 }
 function addAppSheet() {
 setData(d => ({...d, appGitc: [...d.appGitc, buildGitcSheet("application", "")] }));
 }
 function removeAppSheet(idx: number) {
 setData(d => ({...d, appGitc: d.appGitc.filter((_, i) => i !== idx) }));
 }
 function renameAppSheet(idx: number, name: string) {
 setData(d => ({...d, appGitc: d.appGitc.map((s, i) => i === idx ? {...s, appName: name } : s) }));
 }

 // ── Render helpers ──────────────────────────────────────────────────────────

 function renderGitcSheet(sheet: GitcSheet, target: "common" | { appIdx: number }, idx?: number) {
 const scopeLabel = sheet.scope === "common" ? "Common GITCs" : `Application GITCs — ${sheet.appName || "(unnamed)"}`;
 return (
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-start justify-between gap-4">
 <div className="flex-1">
 <h3 className="text-sm font-semibold text-foreground">{scopeLabel}</h3>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 {sheet.scope === "common"
 ? "GITCs that apply across all relevant IT systems (Note 1)."
 : "GITCs specific to this application/IT system."}
 </p>
 </div>
 {sheet.scope === "application" && !locked && idx !== undefined && (
 <div className="flex items-center gap-2">
 <Input value={sheet.appName} onChange={e => renameAppSheet(idx, e.target.value)}
 placeholder="Application name (e.g., QuickBooks, TruckMate)…"
 className="h-8 text-sm w-64" />
 <button onClick={() => removeAppSheet(idx)} className="text-muted-foreground hover:text-destructive" title="Remove application">
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 )}
 </div>

 {sheet.sections.map((sec) => (
 <div key={sec.key} className="border-b border-border last:border-b-0">
 <div className="px-6 py-2.5 bg-muted/40 flex items-center justify-between">
 <div>
 <span className="text-sm font-semibold text-foreground uppercase tracking-wider">{sec.title}</span>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 {GITC_CATEGORIES.find(c => c.key === sec.key)?.hint}
 </p>
 </div>
 {!locked && (
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
 onClick={() => addGitcRow(target, sec.key)}>
 <Plus className="h-3.5 w-3.5" /> Add GITC
 </Button>
 )}
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-3 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 72, minWidth: 72 }}>Ref</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 280 }}>GITC description</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130 }}>IT layer</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 120 }}>Frequency</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 120 }}>Prev / Det</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 110 }}>Design (Y/S/N)</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 110 }}>Implemented</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>Support W/P</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 100 }}>OE planned</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 100 }}>OE effective</th>
 {!locked && <th className="px-2 py-3 w-8" />}
 </tr>
 </thead>
 <tbody>
 {sec.rows.map((r, ri) => {
 const gitcFillKey = (isDemoEngagement && target === 'common' && sec.key === 'access' && ri === 0) ? '551-access0'
  : (isDemoEngagement && target === 'common' && sec.key === 'change' && ri === 0) ? '551-change0'
  : '';
 return (
 <tr key={r.id} className={`hover:bg-muted/50 transition-colors align-top border-b border-border last:border-b-0${gitcFillKey && lukaHighlightFields.has(gitcFillKey) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-2 py-2 text-center" style={{ width: 72, minWidth: 72 }}>
 <Input disabled={locked} value={r.ref}
 onChange={e => patchGitcRow(target, sec.key, r.id, { ref: e.target.value })}
 className="h-8 min-w-12 px-1 text-sm text-center font-mono" />
 </td>
 <td className="px-3 py-2">
 <LukaTypingRow filled={!!gitcFillKey && lukaFilledFields.has(gitcFillKey)}>
  <div className="flex items-start gap-1.5">
    <GreenDot show={!!r.description} />
    <Textarea disabled={locked} value={r.description}
    onChange={e => patchGitcRow(target, sec.key, r.id, { description: e.target.value })}
    placeholder="Describe the GITC and how it operates…"
    className="flex-1 min-h-[60px] text-sm resize-none rounded-[10px]" />
  </div>
 </LukaTypingRow>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.itLayer}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { itLayer: v as ITLayer })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 {IT_LAYERS.map(l => <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.frequency}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { frequency: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 {FREQUENCIES.map(f => <SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.prevDet}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { prevDet: v as PrevDet })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Preventive" className="text-sm">Preventive</SelectItem>
 <SelectItem value="Detective" className="text-sm">Detective</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={r.designEffective}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { designEffective: v as YSN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Effective</SelectItem>
 <SelectItem value="S" className="text-sm">S — Some treatment</SelectItem>
 <SelectItem value="N" className="text-sm">N — Deficiency</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={r.implemented}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { implemented: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <RefButton
 reference={r.supportingDocs}
 onAttach={doc => patchGitcRow(target, sec.key, r.id, { supportingDocs: [...r.supportingDocs, doc] })}
 onRemove={i2 => patchGitcRow(target, sec.key, r.id, { supportingDocs: r.supportingDocs.filter((_, k) => k !== i2) })}
 />
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={r.oeTestPlanned}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { oeTestPlanned: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={r.oeTestEffective}
 onValueChange={v => patchGitcRow(target, sec.key, r.id, { oeTestEffective: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 {!locked && (
 <td className="px-2 py-2 text-center">
 <button onClick={() => removeGitcRow(target, sec.key, r.id)} className="text-muted-foreground hover:text-destructive">
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
 ))}
 </div>
 );
 }

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
            const rafuit0 = data.rafuit[0];
            const accessSec = data.commonGitc.sections.find(s => s.key === 'access')!;
            const changeSec = data.commonGitc.sections.find(s => s.key === 'change')!;
            const accessRow0 = accessSec.rows[0];
            const changeRow0 = changeSec.rows[0];
            lukaSequentialFill([
              {
                scrollRef: firstFillRef,
                set: () => {
                  setRafuit(rafuit0.id, {
                    automatedControl: 'Automated posting of journal entries via ERP (SAP) — vendor payment processing module',
                    itLayer: 'Application',
                    rafuit: 'Unauthorized access to the payment processing module could result in fraudulent vendor payments being posted without detection.',
                    itProcess: 'IT Security',
                    gitcRefs: 'C1, C2',
                  });
                  markLukaFilled('551-rafuit0');
                },
              },
              {
                set: () => {
                  patchGitcRow('common', 'access', accessRow0.id, {
                    description: 'User access to financial systems is reviewed quarterly by the IT Security Manager. Logical access is provisioned through role-based access control (RBAC); requests require line-manager approval and are documented in the ticketing system.',
                  });
                  markLukaFilled('551-access0');
                },
              },
              {
                set: () => {
                  patchGitcRow('common', 'change', changeRow0.id, {
                    description: 'All program changes are documented in the change management system, tested in a QA environment, and require approval from the IT Manager and business owner before migration to production.',
                  });
                  markLukaFilled('551-change0');
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
 To identify and evaluate risks arising from the use of IT (RAFUITs) and the general IT controls (GITCs)
 implemented by the entity that address those risks — including design and implementation.
 <span className="block mt-1.5 text-[11px]">
 <span className="font-semibold text-foreground">Legend: </span>
 IT layers: Application / Database / Operating system / Network. &nbsp;
 IT processes: Security, Program changes, IT operations. &nbsp;
 Design: <b>Y</b> = Effective, <b>S</b> = Some treatment, <b>N</b> = Deficiency.
 </span>
 </p>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">

 {/* Part A — RAFUIT */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-start justify-between gap-4">
 <div>
 <h3 className="text-sm font-semibold text-foreground">Part A — Risks arising from the use of IT (RAFUIT)</h3>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 For each automated control identified, document the IT layer, risk, related IT process,
 and the GITCs (from Part B) that address the risk.
 </p>
 </div>
 {!locked && (
 <div className="flex gap-2 shrink-0">
 <Select onValueChange={v => addRafuit(v)}>
 <SelectTrigger className="h-7 text-sm w-44"><SelectValue placeholder="Insert from library…" /></SelectTrigger>
 <SelectContent className="max-h-80">
 {RAFUIT_LIBRARY.map(t => (
 <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => addRafuit()}>
 <Plus className="h-3.5 w-3.5" /> Add RAFUIT
 </Button>
 </div>
 )}
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-3 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-10">#</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 220 }}>Automated control</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 150 }}>IT layer<sup>(1)</sup></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 260 }}>Risk arising from use of IT</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 160 }}>IT process<sup>(2)</sup></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 150 }}>GITC reference(s)<sup>(3)</sup></th>
 {!locked && <th className="px-2 py-3 w-8" />}
 </tr>
 </thead>
 <tbody>
 {data.rafuit.map((r, i) => (
 <tr key={r.id}
  ref={i === 0 && isDemoEngagement ? firstFillRef as any : undefined}
  className={`hover:bg-muted/50 transition-colors align-top border-b border-border last:border-b-0${isDemoEngagement && i === 0 && lukaHighlightFields.has('551-rafuit0') ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-3 py-2 text-center font-mono">{i + 1}</td>
 <td className="px-3 py-2">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!r.automatedControl} />
   <Textarea disabled={locked} value={r.automatedControl}
   onChange={e => setRafuit(r.id, { automatedControl: e.target.value })}
   placeholder="Reference or describe the automated control…"
   className="flex-1 min-h-[56px] text-sm resize-none rounded-[10px]" />
 </div>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.itLayer}
 onValueChange={v => setRafuit(r.id, { itLayer: v as ITLayer })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 {IT_LAYERS.map(l => <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <LukaTypingRow filled={isDemoEngagement && i === 0 && lukaFilledFields.has('551-rafuit0')}>
  <div className="flex items-start gap-1.5">
    <GreenDot show={!!r.rafuit} />
    <Textarea disabled={locked} value={r.rafuit}
    onChange={e => setRafuit(r.id, { rafuit: e.target.value })}
    placeholder="Describe the RAFUIT (Appendix 1)…"
    className="flex-1 min-h-[56px] text-sm resize-none rounded-[10px]" />
  </div>
 </LukaTypingRow>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={r.itProcess}
 onValueChange={v => setRafuit(r.id, { itProcess: v as ITProcess })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 {IT_PROCESSES.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <Input disabled={locked} value={r.gitcRefs}
 onChange={e => setRafuit(r.id, { gitcRefs: e.target.value })}
 placeholder="e.g., C1, C5"
 className="h-8 text-sm font-mono" />
 </td>
 {!locked && (
 <td className="px-2 py-2 text-center">
 <button onClick={() => removeRafuit(r.id)} className="text-muted-foreground hover:text-destructive">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div className="px-6 py-4 bg-muted/20 border-t border-border grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Part A conclusion</label>
 <Select disabled={locked} value={data.rafuitConclusion}
 onValueChange={v => setData(d => ({...d, rafuitConclusion: v as YSN }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — All automated controls supported by effective GITCs</SelectItem>
 <SelectItem value="S" className="text-sm">S — Partial coverage / residual risk</SelectItem>
 <SelectItem value="N" className="text-sm">N — Significant gaps identified</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="col-span-2 space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Rationale</label>
 <Input disabled={locked} value={data.rafuitRationale}
 onChange={e => setData(d => ({...d, rafuitRationale: e.target.value }))}
 placeholder="Brief support for the conclusion."
 className="h-8 text-sm" />
 </div>
 </div>
 </div>

 {/* Part B — Common */}
 {renderGitcSheet(data.commonGitc, "common")}

 {/* Part B — Application-specific */}
 {data.appGitc.map((sheet, idx) => (
 <div key={idx}>
 {renderGitcSheet(sheet, { appIdx: idx }, idx)}
 </div>
 ))}

 {!locked && (
 <div>
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addAppSheet}>
 <Plus className="h-3.5 w-3.5" /> Add application-specific GITC sheet
 </Button>
 </div>
 )}

 {/* Notes (1-2) reminder */}
 <div className="bg-primary/[0.03] border border-primary/15 rounded-md p-4 text-sm text-foreground/85 space-y-1.5">
 <p className="font-semibold text-foreground">Form 551 — Notes:</p>
 <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
 <li><b>Note 1:</b> Some GITCs are common to all relevant IT applications (e.g., a single Active Directory access process). Document these in the Common GITCs sheet.</li>
 <li><b>Note 2:</b> Communicate significant deficiencies in writing to TCWG on a timely basis. Implementation cannot be determined by inquiry alone.</li>
 <li><b>Note 3:</b> Cross-reference each RAFUIT to the GITCs that address it; a single risk may be addressed by multiple GITCs and a single GITC may address multiple risks.</li>
 </ol>
 </div>

 {/* Overall GITC conclusion */}
 <div className="bg-card border border-border rounded-md p-5 space-y-3">
 <h3 className="text-sm font-semibold text-foreground">Overall GITC conclusion</h3>
 <p className="text-sm text-muted-foreground">
 Based on the work done, conclude on whether identified GITCs are designed appropriately and implemented,
 and whether they support reliance on the automated controls documented
 </p>
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Overall conclusion</label>
 <Select disabled={locked} value={data.gitcConclusion}
 onValueChange={v => setData(d => ({...d, gitcConclusion: v as YSN }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — GITCs designed &amp; implemented</SelectItem>
 <SelectItem value="S" className="text-sm">S — Partial reliance / residual risk</SelectItem>
 <SelectItem value="N" className="text-sm">N — Significant deficiencies identified</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="col-span-2 space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Supporting rationale</label>
 <Input disabled={locked} value={data.gitcRationale}
 onChange={e => setData(d => ({...d, gitcRationale: e.target.value }))}
 placeholder="Briefly support the overall conclusion."
 className="h-8 text-sm" />
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
   placeholder="Additional observations, IT environment context, follow-ups, or communications to TCWG…"
   className="flex-1 min-h-[90px] text-sm resize-none rounded-[10px]" />
 </div>
 </div>

 <WorksheetSignOff worksheetKey="audit-551" engagementId={engagementId} />

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
