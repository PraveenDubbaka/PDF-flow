// Shared UI building blocks for Response-to-Risk worksheets (605/610/625/630/635/645)
// Design standards aligned with AuditMaterialityWorksheet (cards, objective bar, scroll body).
import { useState, useEffect, useRef } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { CURRENT_USER } from "@/lib/useTimeEntries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefButton, type RefDoc } from "@/components/RefButton";
import type { ReactNode } from "react";
import type { EngagementContext } from "@/lib/engagementContext";
import type { Risk520Row } from "@/lib/audit520Bridge";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import { GreenDot } from "@/components/demo/GreenDot";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";

export interface ManualRisk {
 id: string;
 fsArea: string;
 rmmIdentified: string;
 wpRef: RefDoc[];
 wpRefText?: string;
 fraudRisk?: "Y" | "N" | "";
 inherentRisk?: "H" | "M" | "L" | "";
 significantRisk?: "Y" | "N" | "";
}

type RiskOverride = {
 wpRef?: string;
 fsArea?: string;
 rmmIdentified?: string;
 fraudRisk?: "Y" | "N" | "";
 inherentRisk?: "H" | "M" | "L" | "";
 significantRisk?: "Y" | "N" | "";
};

interface LinkedRisksPersistedState {
 manualRisks: ManualRisk[];
 riskWpRefs: Record<string, RefDoc[]>;
 hiddenRefs?: string[];
 riskOverrides?: Record<string, RiskOverride>;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const FS_AREA_OPTIONS = [
 "Cash & Bank", "Accounts Receivable", "Inventory", "Prepaid Expenses",
 "Property, Plant & Equipment", "Intangible Assets", "Investments",
 "Accounts Payable", "Accrued Liabilities", "Debt & Financing", "Equity",
 "Revenue", "Cost of Sales", "Operating Expenses", "Payroll & Benefits",
 "Related party transactions", "Financial statement level", "Other",
];

const HML_CLASS: Record<string, string> = {
 H: "bg-red-50 text-red-700 border-red-200",
 M: "bg-amber-50 text-amber-700 border-amber-200",
 L: "bg-green-50 text-green-700 border-green-200",
};

const RISK_TONE: Record<string, string> = {
 High: "bg-red-50 text-red-700 border-red-200",
 Moderate: "bg-amber-50 text-amber-700 border-amber-200",
 Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const SECTION_HEADER = "px-6 py-3.5 bg-card border-b border-border flex items-center gap-3";

// ─── Page layout ───────────────────────────────────────────────────────────────
export function WorksheetLayout({
 objective,
 standard: _standard,
 children,
 heading,
 onAdd,
 lukaButton,
 banner,
}: {
 objective?: string;
 standard?: string;
 children: ReactNode;
 heading?: string;
 onAdd?: () => void;
 lukaButton?: ReactNode;
 banner?: ReactNode;
}) {
 return (
 <div className="flex flex-col h-full">
 {banner}
 <div className="flex-1 overflow-y-auto bg-muted/30">
 {objective && (
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-base font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-base text-muted-foreground flex-1 leading-relaxed">{objective}</p>
 {lukaButton}
 </div>
 )}
 <div className="p-6 space-y-4">{children}</div>
 </div>
 </div>
 );
}

// ─── Section wrapper (matches Materiality card chrome) ─────────────────────────
export function WorksheetSection({
 title,
 right,
 children,
 bodyClassName = "p-6",
}: {
 title: string;
 right?: ReactNode;
 children: ReactNode;
 bodyClassName?: string;
}) {
 return (
 <div className={CARD}>
 <div className={SECTION_HEADER}>
 <span className="text-sm font-semibold text-foreground">{title}</span>
 <div className="flex-1" />
 {right}
 </div>
 <div className={bodyClassName}>{children}</div>
 </div>
 );
}

// ─── Header card (entity / period / framework / FS-risk chip) ──────────────────
/** @deprecated Header card removed — entity context lives in the page chrome,
 * and the FS-level risk badge now renders inside the Linked Risks card header. */
export function WorksheetHeader(_props: {
 ctx: EngagementContext;
 formNo: string;
 title: string;
 standard: string;
 overallRisk?: "High" | "Moderate" | "Low";
 objective?: string;
}) {
 return null;
}

function Chip({ label, value }: { label: string; value: string }) {
 return (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border text-[11px]">
 <span className="text-muted-foreground">{label}:</span>
 <span className="font-medium text-foreground">{value}</span>
 </span>
 );
}

// ─── Linked Risks card ─────────────────────────────────────────────────────────
export function LinkedRisksCard({
 risks,
 emptyHint,
 overallRisk,
 storageKey,
 locked = false,
}: {
 risks: Risk520Row[];
 emptyHint?: string;
 overallRisk?: "High" | "Moderate" | "Low";
 storageKey?: string;
 locked?: boolean;
}) {
 const defaultState: LinkedRisksPersistedState = { manualRisks: [], riskWpRefs: {}, hiddenRefs: [], riskOverrides: {} };
 const [state, setState] = useState<LinkedRisksPersistedState>(() => {
 const stored = storageKey ? (readJsonFromLocalStorage<LinkedRisksPersistedState>(storageKey, defaultState) ?? defaultState) : defaultState;
 return {...defaultState,...stored };
 });
 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const first = useRef(true);
 const newRowIdRef = useRef<string | null>(null);

 useEffect(() => {
 if (first.current) { first.current = false; return; }
 if (!storageKey) return;
 if (saveTimer.current) clearTimeout(saveTimer.current);
 saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, state), 450);
 }, [state, storageKey]);

 const patchForm520 = (ref: string, patch: Partial<RiskOverride>) =>
 setState(s => ({
...s,
 riskOverrides: {...(s.riskOverrides ?? {}), [ref]: {...(s.riskOverrides?.[ref] ?? {}),...patch } },
 }));

 const patchManual = (id: string, patch: Partial<Pick<ManualRisk, "fsArea" | "rmmIdentified" | "wpRefText" | "fraudRisk" | "inherentRisk" | "significantRisk">>) =>
 setState(s => ({...s, manualRisks: s.manualRisks.map(r => r.id === id ? {...r,...patch } : r) }));

 const addManual = () => {
 const id = uid();
 newRowIdRef.current = id;
 setState(s => ({...s, manualRisks: [...s.manualRisks, { id, fsArea: "", rmmIdentified: "", wpRef: [] }] }));
 };

 const removeManual = (id: string) =>
 setState(s => ({...s, manualRisks: s.manualRisks.filter(r => r.id !== id) }));

 const hideForm520 = (ref: string) =>
 setState(s => ({...s, hiddenRefs: [...(s.hiddenRefs ?? []), ref] }));

 const visibleRisks = risks.filter(r => !(state.hiddenRefs ?? []).includes(r.ref));
 const hasRows = visibleRisks.length > 0 || state.manualRisks.length > 0;

 const th = "text-left px-3 py-2.5 font-medium text-sm border-b border-border";
 const td = "px-3 py-2.5 text-sm align-top border-b border-border last:border-b-0";

 return (
 <WorksheetSection
 title="Linked risks"
 right={
 <div className="flex items-center gap-2">
 {overallRisk && (
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${RISK_TONE[overallRisk]}`}>
 <span className="opacity-70">FS-level risk</span> · {overallRisk}
 </span>
 )}
 {!locked && (
 <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addManual}>
 <Plus className="h-3 w-3" /> Add risk
 </Button>
 )}
 </div>
 }
 bodyClassName="p-0"
 >
 {!hasRows ? (
 <p className="px-6 py-4 text-sm text-muted-foreground">
 {emptyHint ?? "No matching risks identified in Update to flow risks through."}
 </p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-muted/40">
 <th className={`${th} text-center w-10`}>#</th>
 <th className={`${th} w-[90px]`}>W/P</th>
 <th className={`${th} w-[160px]`}>FS area</th>
 <th className={th}>RMM identified</th>
 <th className={`${th} text-center w-[90px]`}>Fraud risk</th>
 <th className={`${th} text-center w-[80px]`}>IR</th>
 <th className={`${th} text-center w-[90px]`}>Sig. risk</th>
 {!locked && <th className="border-b border-border w-8" />}
 </tr>
 </thead>
 <tbody>
 {visibleRisks.map((r, i) => {
 const ov = state.riskOverrides?.[r.ref] ?? {};
 const fsAreaVal = ov.fsArea !== undefined ? ov.fsArea : (r.scotabd ?? "");
 const rmmVal = ov.rmmIdentified !== undefined ? ov.rmmIdentified : r.rmmIdentified;
 const fraudVal = ov.fraudRisk !== undefined ? ov.fraudRisk : (r.fraudRisk ?? "");
 const irVal = ov.inherentRisk !== undefined ? ov.inherentRisk : (r.inherentRisk ?? "");
 const sigVal = ov.significantRisk !== undefined ? ov.significantRisk : (r.significantRisk === "Y" ? "Y" : r.significantRisk === "N" ? "N" : "");
 return (
 <tr key={r.ref} className="hover:bg-muted/20 transition-colors">
 <td className={`${td} text-center font-mono text-foreground/60`}>{i + 1}</td>
 <td className={td}>
 <Input disabled={locked} value={ov.wpRef ?? r.ref}
 onChange={e => patchForm520(r.ref, { wpRef: e.target.value })}
 className="h-8 text-sm font-mono w-24" placeholder={r.ref} />
 </td>
 <td className={td}>
 <Select disabled={locked} value={fsAreaVal} onValueChange={v => patchForm520(r.ref, { fsArea: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select area…" /></SelectTrigger>
 <SelectContent>
 {FS_AREA_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className={td}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!rmmVal} />
 <Textarea disabled={locked} value={rmmVal}
 onChange={e => patchForm520(r.ref, { rmmIdentified: e.target.value })}
 placeholder="Risk of material misstatement…"
 className="text-sm min-h-[56px] resize-none min-w-[200px] flex-1" />
 </div>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={fraudVal} onValueChange={v => patchForm520(r.ref, { fraudRisk: v as "Y" | "N" | "" })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Yes</SelectItem>
 <SelectItem value="N" className="text-sm">N — No</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={irVal} onValueChange={v => patchForm520(r.ref, { inherentRisk: v as "H" | "M" | "L" | "" })}>
 <SelectTrigger className={`h-8 text-sm ${HML_CLASS[irVal] ?? ""}`}><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="H" className="text-sm">H — High</SelectItem>
 <SelectItem value="M" className="text-sm">M — Moderate</SelectItem>
 <SelectItem value="L" className="text-sm">L — Low</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={sigVal} onValueChange={v => patchForm520(r.ref, { significantRisk: v as "Y" | "N" | "" })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Yes</SelectItem>
 <SelectItem value="N" className="text-sm">N — No</SelectItem>
 </SelectContent>
 </Select>
 </td>
 {!locked && (
 <td className={`${td} text-center`}>
 <button onClick={() => hideForm520(r.ref)} className="p-1 hover:text-destructive text-muted-foreground transition-colors" title="Remove">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 );
 })}
 {state.manualRisks.map((r, i) => (
 <tr key={r.id} className="hover:bg-muted/20 transition-colors">
 <td className={`${td} text-center font-mono text-foreground/60`}>{visibleRisks.length + i + 1}</td>
 <td className={td}>
 <Input disabled={locked} value={r.wpRefText ?? ""}
 onChange={e => patchManual(r.id, { wpRefText: e.target.value })}
 className="h-8 text-sm font-mono w-24" placeholder="W/P ref" />
 </td>
 <td className={td}>
 <Select disabled={locked} value={r.fsArea} onValueChange={v => patchManual(r.id, { fsArea: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select area…" /></SelectTrigger>
 <SelectContent>
 {FS_AREA_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className={td}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!r.rmmIdentified} />
 <Textarea disabled={locked} value={r.rmmIdentified}
 autoFocus={r.id === newRowIdRef.current}
 onChange={e => patchManual(r.id, { rmmIdentified: e.target.value })}
 placeholder="Risk of material misstatement…"
 className="text-sm min-h-[56px] resize-none min-w-[200px] flex-1" />
 </div>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={r.fraudRisk ?? ""} onValueChange={v => patchManual(r.id, { fraudRisk: v as "Y" | "N" | "" })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Yes</SelectItem>
 <SelectItem value="N" className="text-sm">N — No</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={r.inherentRisk ?? ""} onValueChange={v => patchManual(r.id, { inherentRisk: v as "H" | "M" | "L" | "" })}>
 <SelectTrigger className={`h-8 text-sm ${HML_CLASS[r.inherentRisk ?? ""] ?? ""}`}><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="H" className="text-sm">H — High</SelectItem>
 <SelectItem value="M" className="text-sm">M — Moderate</SelectItem>
 <SelectItem value="L" className="text-sm">L — Low</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={`${td} text-center`}>
 <Select disabled={locked} value={r.significantRisk ?? ""} onValueChange={v => patchManual(r.id, { significantRisk: v as "Y" | "N" | "" })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Yes</SelectItem>
 <SelectItem value="N" className="text-sm">N — No</SelectItem>
 </SelectContent>
 </Select>
 </td>
 {!locked && (
 <td className={`${td} text-center`}>
 <button onClick={() => removeManual(r.id)} className="p-1 hover:text-destructive text-muted-foreground transition-colors" title="Remove">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </WorksheetSection>
 );
}

// ─── Procedure row (used by 605/625/635/645) ───────────────────────────────────
export interface ProcRow {
 id: string;
 procedure: string;
 psa?: string;
 wpRef: RefDoc[];
 psc: "Y" | "N" | "N/A" | "";
 comments: string;
}

export function ProcedureTable({
 sections,
 locked,
 onChange,
 showPsa = true,
 showNumbers = true,
 renderRowBadge,
}: {
 sections: { title: string; rows: ProcRow[] }[];
 locked: boolean;
 onChange: (sectionIdx: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) => void;
 showPsa?: boolean;
 showNumbers?: boolean;
 renderRowBadge?: (sectionIdx: number, rowIdx: number) => ReactNode;
}) {
 const td = "border-b border-border px-3 py-2.5 text-sm align-top";
 const colCount = (showNumbers ? 1 : 0) + (showPsa ? 1 : 0) + 4;
 return (
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-muted/40">
 {showNumbers && <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[40px]">#</th>}
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[320px]">Procedure</th>
 {showPsa && <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[80px]">P&amp;SA</th>}
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[70px]">PSC</th>
 <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[260px]">Comments / exceptions</th>
 <th className="text-center px-3 py-2.5 font-medium border-b border-border w-[90px]">W/P ref.</th>
 </tr>
 </thead>
 <tbody>
 {sections.map((s, si) => (
 <FragmentRows key={si} title={s.title} rows={s.rows} sectionIdx={si} td={td} locked={locked} onChange={onChange} showPsa={showPsa} showNumbers={showNumbers} colCount={colCount} renderRowBadge={renderRowBadge} />
 ))}
 </tbody>
 </table>
 </div>
 );
}


function FragmentRows({ title, rows, sectionIdx, td, locked, onChange, showPsa, showNumbers, colCount, renderRowBadge }: {
 title: string; rows: ProcRow[]; sectionIdx: number; td: string; locked: boolean;
 onChange: (sectionIdx: number, rowId: string, field: keyof ProcRow, value: string | RefDoc[]) => void;
 showPsa: boolean; showNumbers: boolean; colCount: number;
 renderRowBadge?: (sectionIdx: number, rowIdx: number) => ReactNode;
}) {
 let n = 0;
 return (
 <>
 <tr className="bg-primary/[0.06]">
 <td colSpan={colCount} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary border-b border-border">{title}</td>
 </tr>
 {rows.map((r, rowIdx) => {
 n += 1;
 return (
 <tr key={r.id} className="hover:bg-muted/20">
 {showNumbers && <td className={`${td} text-muted-foreground font-medium`}>{n}</td>}
 <td className={td}><span className="block whitespace-pre-wrap leading-snug">{r.procedure}</span></td>
 {showPsa && <td className={`${td} font-mono text-xs whitespace-nowrap`}>{r.psa || "—"}</td>}
 <td className={td}>
 <Select disabled={locked} value={r.psc} onValueChange={v => onChange(sectionIdx, r.id, "psc", v)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y</SelectItem>
 <SelectItem value="N" className="text-sm">N</SelectItem>
 <SelectItem value="N/A" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className={td}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!r.comments} />
 <Textarea disabled={locked} value={r.comments} onChange={e => onChange(sectionIdx, r.id, "comments", e.target.value)}
 className="min-h-[56px] text-sm resize-none flex-1" placeholder="—" />
 </div>
 {renderRowBadge?.(sectionIdx, rowIdx)}
 </td>
 <td className={`${td} text-center`}>
 <RefButton
 reference={r.wpRef}
 disabled={locked}
 onAttach={doc => onChange(sectionIdx, r.id, "wpRef", [...r.wpRef, doc])}
 onRemove={idx => onChange(sectionIdx, r.id, "wpRef", r.wpRef.filter((_, j) => j !== (idx ?? -1)))}
 />
 </td>
 </tr>
 );
 })}
 </>
 );
}


// ─── Sign-off (kept for backward-compat type only; UI removed per requirements) ─
export interface SignOffData {
 preparedBy: string; preparedDate: string;
 reviewedBy: string; reviewedDate: string;
}
/** @deprecated Sign-off section removed from worksheets per design standards. */
export function SignOffCard(_props: { data: SignOffData; locked: boolean; onChange: (k: keyof SignOffData, v: string) => void }) {
 return null;
}

// ─── Conclude bar ──────────────────────────────────────────────────────────────
function formatConcludeTs(iso: string) {
 try {
   return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
 } catch { return iso; }
}

export function ConcludedRow({ concludedOn, onReopen }: { concludedOn: string; onReopen?: () => void }) {
 return (
 <div className="flex items-center gap-3 py-1">
 <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
 {CURRENT_USER.initials}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs text-muted-foreground leading-tight">Concluded by</p>
 <p className="text-sm font-medium leading-tight">{CURRENT_USER.name}</p>
 <p className="text-xs text-muted-foreground leading-tight">{formatConcludeTs(concludedOn)}</p>
 </div>
 {onReopen && <Button size="sm" onClick={onReopen}>Reopen worksheet</Button>}
 </div>
 );
}

export function ConcludeBar({ concluded, concludedOn, onConclude, onReopen, worksheetKey, engagementId }: {
 concluded: boolean; concludedOn: string; onConclude: () => void; onReopen?: () => void;
 worksheetKey?: string; engagementId?: string;
}) {
 const signOff = worksheetKey ? (
 <>
 <WorksheetSignOff worksheetKey={worksheetKey} engagementId={engagementId} />
 <div className="flex justify-end pt-1">
 {concluded
 ? <ConcludedRow concludedOn={concludedOn} onReopen={onReopen} />
 : <Button size="sm" onClick={onConclude}>Conclude worksheet</Button>}
 </div>
 </>
 ) : concluded ? (
 <ConcludedRow concludedOn={concludedOn} onReopen={onReopen} />
 ) : (
 <div className="flex justify-end">
 <Button size="sm" onClick={onConclude}>Conclude worksheet</Button>
 </div>
 );
 return signOff;
}


export function makeProcRow(procedure: string, psa = ""): ProcRow {
 return { id: Math.random().toString(36).slice(2, 9), procedure, psa, wpRef: [], psc: "", comments: "" };
}
