import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Info, Download, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { formatCurrency } from "@/lib/engagementContext";
import { WorksheetLayout, WorksheetHeader, ConcludeBar, type SignOffData } from "@/components/audit/WorksheetShell";
import { NewAdjEntryModal, type AdjLine, type AdjEntryMeta, tbAccounts } from "@/components/NewAdjEntryModal";

type RefField = RefDoc[];
type YN = "Y" | "N" | "";

type EntryType = "Known" | "Projected" | "Judgmental" | "Journal" | "Adjusting" | "Reclassification" | "";

interface MisstatementRow {
  id: string;
  refNo: string;
  description: string;
  entryType: EntryType;
  corrected: YN;
  assets: string;
  liabilities: string;
  pretaxIncome: string;
  equity: string;
  disclosures: string;
  wpRef: RefField;
}

interface DataAIM {
  performanceMateriality: string;
  trivialThreshold: string;
  sectionA: MisstatementRow[];
  sectionB: MisstatementRow[];
  taxEffect: { assets: string; liabilities: string; pretaxIncome: string; equity: string };
  priorPeriod: { assets: string; liabilities: string; pretaxIncome: string; equity: string };
  materialityRevised: string;
  finalMateriality: string;
  conclusion: string;
  signOff: SignOffData;
  concluded: boolean;
  concludedOn: string;
}

function blankRow(idx: number): MisstatementRow {
  return {
    id: `row-${Date.now()}-${idx}`,
    refNo: "",
    description: "",
    entryType: "",
    corrected: "",
    assets: "",
    liabilities: "",
    pretaxIncome: "",
    equity: "",
    disclosures: "",
    wpRef: [],
  };
}

function buildDefault(pm: number, ct: number): DataAIM {
  return {
    performanceMateriality: pm > 0 ? String(pm) : "",
    trivialThreshold: ct > 0 ? String(ct) : "",
    sectionA: [],
    sectionB: [],
    taxEffect: { assets: "", liabilities: "", pretaxIncome: "", equity: "" },
    priorPeriod: { assets: "", liabilities: "", pretaxIncome: "", equity: "" },
    materialityRevised: "",
    finalMateriality: pm > 0 ? formatCurrency(pm) : "",
    conclusion: "",
    signOff: { preparedBy: "", preparedDate: "", reviewedBy: "", reviewedDate: "" },
    concluded: false,
    concludedOn: "",
  };
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function sumCol(rows: MisstatementRow[], col: keyof Pick<MisstatementRow, "assets" | "liabilities" | "pretaxIncome" | "equity">) {
  return rows.reduce((acc, r) => acc + parseNum(r[col]), 0);
}

function fmtAmt(v: number): string {
  if (v === 0) return "0.00";
  return v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden";
const TH = "px-3 py-2.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border whitespace-nowrap";
const TD = "px-3 py-2 text-sm text-foreground border-b border-border align-top";
const TOTAL_ROW = "bg-muted/60 font-semibold text-sm";

const ENTRY_TYPES: EntryType[] = ["Known", "Projected", "Judgmental", "Journal", "Adjusting", "Reclassification"];

const CAS450_EVAL = [
  {
    id: "e1",
    question: "Revise the overall materiality for any new information obtained that would have caused a different amount to have been initially determined, and describe the new information. Consider changes in financial statement users, operations, and financial results.",
    shortLabel: "Revise materiality if new information obtained",
  },
  {
    id: "e2",
    question: "Does the aggregate of uncorrected misstatements (quantitative and qualitative) approach or exceed performance materiality? Consider whether to revise risk assessments and extend audit procedures.",
    shortLabel: "Aggregate approaches performance materiality?",
  },
  {
    id: "e3",
    question: "Has each identified misstatement been communicated to management on a timely basis and has management been asked to correct the misstatements? (CAS 450.8)",
    shortLabel: "Misstatements communicated to management?",
  },
  {
    id: "e4",
    question: "If management has declined to correct some or all misstatements, has the auditor obtained an understanding of management's reasons for not making the corrections and taken those reasons into account in the overall conclusion? (CAS 450.9)",
    shortLabel: "Management reasons for non-correction understood?",
  },
];

interface EvalItem { psc: "Y" | "N" | "NA" | ""; response: string; wpRef: RefField; }
function blankEval(): EvalItem { return { psc: "", response: "", wpRef: [] }; }

export function AuditAIMWorksheet() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const ctx = useEngagementContext();
  const storageKey = `audit-aim-data-${engagementId ?? "default"}`;
  const [viewEntry, setViewEntry] = useState<{ open: boolean; prefillLines: AdjLine[]; prefillMeta: AdjEntryMeta | null; storedClientName: string; entryId: string }>({ open: false, prefillLines: [], prefillMeta: null, storedClientName: "", entryId: "" });

  const [data, setData] = useState<DataAIM & { eval1: EvalItem; eval2: EvalItem; eval3: EvalItem; eval4: EvalItem }>(() => {
    const saved = readJsonFromLocalStorage<Partial<DataAIM & { eval1: EvalItem; eval2: EvalItem; eval3: EvalItem; eval4: EvalItem }>>(storageKey, null);
    const base = buildDefault(ctx.performanceMateriality, ctx.clearlyTrivial);
    const defaults = { ...base, eval1: blankEval(), eval2: blankEval(), eval3: blankEval(), eval4: blankEval() };
    if (!saved) return defaults;
    return { ...defaults, ...saved };
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
  }, [data, storageKey]);

  const locked = data.concluded;

  // ── Import from 670 ─────────────────────────────────────────────────────────
  const je670Misstatements = useMemo(() => {
    const je670 = readJsonFromLocalStorage<{ entries?: { id: string; accounts: string; amount: string; attributes: string; rationale: string; outcome: string }[] }>(
      `audit-670-data-${engagementId ?? "default"}`, null,
    );
    return (je670?.entries ?? []).filter(e => e.outcome === "Misstatement identified");
  }, [engagementId]);

  const importedIds = useMemo(() => new Set([...data.sectionA, ...data.sectionB].map(r => r.id)), [data.sectionA, data.sectionB]);
  const newToImport = je670Misstatements.filter(e => !importedIds.has(`670-${e.id}`)).length;

  function importFrom670() {
    const newRows = je670Misstatements
      .filter(e => !importedIds.has(`670-${e.id}`))
      .map((e, i) => ({ ...blankRow(i), id: `670-${e.id}`, description: e.accounts || "", entryType: "Known" as EntryType, pretaxIncome: e.amount || "" }));
    if (newRows.length === 0) return;
    setData(d => ({ ...d, sectionA: [...d.sectionA.filter(r => r.description !== "" || r.pretaxIncome !== ""), ...newRows] }));
  }

  // ── Calculations ────────────────────────────────────────────────────────────
  const totA = { assets: sumCol(data.sectionA, "assets"), liabilities: sumCol(data.sectionA, "liabilities"), pretaxIncome: sumCol(data.sectionA, "pretaxIncome"), equity: sumCol(data.sectionA, "equity") };
  const totB = { assets: sumCol(data.sectionB, "assets"), liabilities: sumCol(data.sectionB, "liabilities"), pretaxIncome: sumCol(data.sectionB, "pretaxIncome"), equity: sumCol(data.sectionB, "equity") };
  const totC = {
    assets: totA.assets - totB.assets,
    liabilities: totA.liabilities - totB.liabilities,
    pretaxIncome: totA.pretaxIncome - totB.pretaxIncome,
    equity: totA.equity - totB.equity,
  };
  const taxEffect = { assets: parseNum(data.taxEffect.assets), liabilities: parseNum(data.taxEffect.liabilities), pretaxIncome: parseNum(data.taxEffect.pretaxIncome), equity: parseNum(data.taxEffect.equity) };
  const priorPeriod = { assets: parseNum(data.priorPeriod.assets), liabilities: parseNum(data.priorPeriod.liabilities), pretaxIncome: parseNum(data.priorPeriod.pretaxIncome), equity: parseNum(data.priorPeriod.equity) };
  const carriedFwd = {
    assets: totC.assets + taxEffect.assets + priorPeriod.assets,
    liabilities: totC.liabilities + taxEffect.liabilities + priorPeriod.liabilities,
    pretaxIncome: totC.pretaxIncome + taxEffect.pretaxIncome + priorPeriod.pretaxIncome,
    equity: totC.equity + taxEffect.equity + priorPeriod.equity,
  };

  // PM gauge
  const pm = parseNum(data.performanceMateriality);
  const uncorrectedAbs = Math.abs(totC.pretaxIncome);
  const pmRatio = pm > 0 ? Math.min(uncorrectedAbs / pm, 1.2) : 0;
  const pmPct = pm > 0 ? ((uncorrectedAbs / pm) * 100).toFixed(1) : null;
  const gaugeColor = pmRatio === 0 ? "bg-green-500" : pmRatio < 0.5 ? "bg-green-500" : pmRatio < 0.8 ? "bg-amber-400" : pmRatio < 1 ? "bg-orange-500" : "bg-red-600";
  const gaugeBg = pmRatio === 0 ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : pmRatio < 0.5 ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : pmRatio < 0.8 ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : pmRatio < 1 ? "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800" : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
  const gaugeLabel = pmRatio === 0 ? "No uncorrected misstatements" : pmRatio < 0.5 ? "Well below PM — not material" : pmRatio < 0.8 ? "Approaching PM — monitor" : pmRatio < 1 ? "Near PM — extended procedures recommended" : "Exceeds PM — consider effect on opinion";

  // ── Row helpers ──────────────────────────────────────────────────────────────
  function updRow(section: "sectionA" | "sectionB", id: string, patch: Partial<MisstatementRow>) {
    setData(d => ({ ...d, [section]: d[section].map(r => r.id === id ? { ...r, ...patch } : r) }));
  }
  function addRow(section: "sectionA" | "sectionB") {
    setData(d => ({ ...d, [section]: [...d[section], blankRow(d[section].length)] }));
  }
  function removeRow(section: "sectionA" | "sectionB", id: string) {
    if (id.startsWith("670-")) return; // imported rows can be deleted too
    setData(d => ({ ...d, [section]: d[section].filter(r => r.id !== id) }));
  }

  function updEval(key: "eval1" | "eval2" | "eval3" | "eval4", patch: Partial<EvalItem>) {
    setData(d => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function MisstatementTable({ section, label }: { section: "sectionA" | "sectionB"; label: string }) {
    const rows = data[section];
    const tot = section === "sectionA" ? totA : totB;
    return (
      <div className={CARD}>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {!locked && section === "sectionA" && je670Misstatements.length > 0 && (
              <Button variant="secondary" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={importFrom670}>
                <Download className="h-3 w-3" />
                {newToImport > 0 ? `Import ${newToImport} from JE Testing (670)` : "All JE misstatements imported"}
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className={TH + " w-20"}>Ref No.</th>
                <th className={TH + " min-w-[180px]"}>Description</th>
                <th className={TH + " w-28"}>Entry type</th>
                <th className={TH + " w-16 text-center"}>Corrected</th>
                <th className={TH + " w-28 text-right"}>Assets</th>
                <th className={TH + " w-28 text-right"}>Liabilities</th>
                <th className={TH + " w-28 text-right"}>Pre-tax income</th>
                <th className={TH + " w-28 text-right"}>Equity</th>
                <th className={TH + " w-24 text-center"}>W/P Ref.</th>
                <th className={TH + " w-8"} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-6 text-sm text-muted-foreground text-center italic">
                    No misstatements recorded. {!locked && "Use Add Row or import from JE Testing."}
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row.id} className={cn("hover:bg-muted/20", row.corrected === "Y" && "bg-green-50/40 dark:bg-green-950/10", row.corrected === "N" && "bg-amber-50/40 dark:bg-amber-950/10")}>
                  <td className={TD + " w-20"}>
                    {row.id.startsWith("tb-") ? (
                      <button
                        className="text-link text-xs font-semibold hover:underline focus:outline-none"
                        onClick={() => {
                          const entryId = row.refNo.replace(/[^a-zA-Z0-9]/g, "-");
                          const stored = readJsonFromLocalStorage<{ lines: AdjLine[]; meta: AdjEntryMeta; clientName: string; engId: string }>(
                            `adj-entry-${engagementId ?? "default"}-${entryId}`,
                            null as unknown as { lines: AdjLine[]; meta: AdjEntryMeta; clientName: string; engId: string }
                          );
                          if (!stored) return;
                          setViewEntry({ open: true, prefillLines: stored.lines, prefillMeta: stored.meta, storedClientName: stored.clientName, entryId });
                        }}
                      >
                        {row.refNo}
                      </button>
                    ) : (
                      <Input disabled={locked} value={row.refNo} onChange={e => updRow(section, row.id, { refNo: e.target.value })} placeholder="e.g. A1" className="h-7 text-xs" />
                    )}
                  </td>
                  <td className={TD + " min-w-[180px]"}>
                    <Textarea disabled={locked} value={row.description} onChange={e => updRow(section, row.id, { description: e.target.value })} placeholder="Description of misstatement…" className="min-h-[56px] text-xs resize-none" />
                  </td>
                  <td className={TD + " w-28"}>
                    <Select disabled={locked} value={row.entryType} onValueChange={v => updRow(section, row.id, { entryType: v as EntryType })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {ENTRY_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={TD + " w-16 text-center"}>
                    <Checkbox
                      disabled={locked}
                      checked={row.corrected === "Y"}
                      onCheckedChange={checked => updRow(section, row.id, { corrected: checked ? "Y" : "" })}
                      className="mx-auto"
                    />
                  </td>
                  {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                    <td key={col} className={TD + " w-28"}>
                      <Input disabled={locked} value={row[col]} onChange={e => updRow(section, row.id, { [col]: e.target.value })} placeholder="0.00" className="h-7 text-xs text-right" />
                    </td>
                  ))}
                  <td className={TD + " w-24 text-center"}>
                    <RefButton reference={row.wpRef} onAttach={doc => updRow(section, row.id, { wpRef: [...row.wpRef, doc] })} onRemove={i => updRow(section, row.id, { wpRef: row.wpRef.filter((_, i2) => i2 !== i) })} disabled={locked} />
                  </td>
                  <td className={TD + " w-8 text-center"}>
                    {!locked && (
                      <button onClick={() => removeRow(section, row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr className={TOTAL_ROW}>
                <td className="px-3 py-2 border-b border-border" />
                <td className="px-3 py-2 border-b border-border text-xs font-semibold" colSpan={3}>
                  {section === "sectionA" ? "Total identified misstatements" : "Total corrected misstatements"}
                </td>
                {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                  <td key={col} className="px-3 py-2 border-b border-border text-right text-xs font-mono">{fmtAmt(tot[col])}</td>
                ))}
                <td className="px-3 py-2 border-b border-border" colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
        {!locked && (
          <div className="px-4 py-3 border-t border-border">
            <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={() => addRow(section)}>
              <Plus className="h-3 w-3" /> Add Row
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <WorksheetLayout
      heading="Canada > Completion & Signoffs"
      objective="To document misstatements identified during the audit, evaluate their effect on the engagement, and assess whether uncorrected misstatements are material, individually or in the aggregate, to the financial statements (CAS 450)."
      standard={`${ctx.standardPrefix} 450`}
    >
      <WorksheetHeader
        ctx={ctx}
        formNo="AIM"
        title="Accumulation of Identified Misstatements"
        standard={`${ctx.standardPrefix} 450`}
        overallRisk={undefined}
      />

      {/* ── Materiality ─────────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Materiality thresholds</span>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Performance materiality (PM)</label>
            <Input disabled={locked} value={data.performanceMateriality} onChange={e => setData(d => ({ ...d, performanceMateriality: e.target.value }))} placeholder={formatCurrency(ctx.performanceMateriality)} className="h-9 text-sm w-[180px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clearly trivial threshold</label>
            <Input disabled={locked} value={data.trivialThreshold} onChange={e => setData(d => ({ ...d, trivialThreshold: e.target.value }))} placeholder={formatCurrency(ctx.clearlyTrivial)} className="h-9 text-sm w-[180px]" />
          </div>
        </div>
      </div>

      {/* ── PM Gauge ────────────────────────────────────────────────────── */}
      {pm > 0 && (
        <div className={cn("flex items-start gap-3 px-5 py-4 rounded-md border text-sm", gaugeBg)}>
          <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold">{gaugeLabel}</span>
              {pmPct && <span className="font-mono text-sm">{pmPct}% of PM</span>}
            </div>
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", gaugeColor)} style={{ width: `${Math.min(pmRatio * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs opacity-70">
              <span>0</span>
              <span>50% PM</span>
              <span>PM ({formatCurrency(pm)})</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Section A ───────────────────────────────────────────────────── */}
      <MisstatementTable section="sectionA" label="A — All identified misstatements (proposed)" />

      {/* ── Section B ───────────────────────────────────────────────────── */}
      <MisstatementTable section="sectionB" label="B — Corrected misstatements" />

      {/* ── Section C + summary rows ─────────────────────────────────────── */}
      <div className={CARD}>
        <div className="px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">C — Summary of uncorrected misstatements</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className={TH + " min-w-[280px]"}>Item</th>
                <th className={TH + " w-32 text-right"}>Assets</th>
                <th className={TH + " w-32 text-right"}>Liabilities</th>
                <th className={TH + " w-32 text-right"}>Pre-tax income</th>
                <th className={TH + " w-32 text-right"}>Equity</th>
              </tr>
            </thead>
            <tbody>
              {/* C = A - B */}
              <tr className={TOTAL_ROW}>
                <td className="px-3 py-2.5 border-b border-border text-xs font-semibold">C — Total uncorrected misstatements (A − B)</td>
                {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                  <td key={col} className={cn("px-3 py-2.5 border-b border-border text-right text-xs font-mono", Math.abs(totC[col]) > 0 && "text-amber-700 dark:text-amber-400")}>{fmtAmt(totC[col])}</td>
                ))}
              </tr>
              {/* Tax effect — editable */}
              <tr className="hover:bg-muted/20">
                <td className="px-3 py-2 border-b border-border text-xs text-muted-foreground">Effect of uncorrected misstatements on income taxes</td>
                {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                  <td key={col} className="px-3 py-2 border-b border-border">
                    <Input disabled={locked} value={data.taxEffect[col]} onChange={e => setData(d => ({ ...d, taxEffect: { ...d.taxEffect, [col]: e.target.value } }))} placeholder="0.00" className="h-7 text-xs text-right" />
                  </td>
                ))}
              </tr>
              {/* Prior period — editable */}
              <tr className="hover:bg-muted/20">
                <td className="px-3 py-2 border-b border-border text-xs text-muted-foreground">Any uncorrected misstatements from prior periods</td>
                {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                  <td key={col} className="px-3 py-2 border-b border-border">
                    <Input disabled={locked} value={data.priorPeriod[col]} onChange={e => setData(d => ({ ...d, priorPeriod: { ...d.priorPeriod, [col]: e.target.value } }))} placeholder="0.00" className="h-7 text-xs text-right" />
                  </td>
                ))}
              </tr>
              {/* Carried forward — calculated */}
              <tr className={TOTAL_ROW}>
                <td className="px-3 py-2.5 border-b border-border text-xs font-semibold">Uncorrected misstatements to be carried forward</td>
                {(["assets", "liabilities", "pretaxIncome", "equity"] as const).map(col => (
                  <td key={col} className="px-3 py-2.5 border-b border-border text-right text-xs font-mono">{fmtAmt(carriedFwd[col])}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Evaluation of misstatements (CAS 450) ────────────────────────── */}
      <div className={CARD}>
        <div className="px-5 py-3.5 border-b border-border">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Evaluation of misstatements (CAS 450)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className={TH + " min-w-[260px]"}>Evaluation of misstatements</th>
                <th className={TH + " w-20 text-center"}>PSC?</th>
                <th className={TH + " min-w-[220px]"}>Document the response / conclusion</th>
                <th className={TH + " w-24 text-center"}>W/P Ref.</th>
              </tr>
            </thead>
            <tbody>
              {CAS450_EVAL.map((item, idx) => {
                const key = `eval${idx + 1}` as "eval1" | "eval2" | "eval3" | "eval4";
                const evalItem = data[key];
                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className={TD + " min-w-[260px] text-xs leading-relaxed"}>{item.question}</td>
                    <td className={TD + " w-20 text-center"}>
                      <Select disabled={locked} value={evalItem.psc} onValueChange={v => updEval(key, { psc: v as "Y" | "N" | "NA" | "" })}>
                        <SelectTrigger className="h-7 text-xs w-16 mx-auto"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Y" className="text-xs">Y</SelectItem>
                          <SelectItem value="N" className="text-xs">N</SelectItem>
                          <SelectItem value="NA" className="text-xs">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={TD + " min-w-[220px]"}>
                      <Textarea disabled={locked} value={evalItem.response} onChange={e => updEval(key, { response: e.target.value })} placeholder="Document your response or conclusion…" className="min-h-[72px] text-xs resize-none" />
                    </td>
                    <td className={TD + " w-24 text-center"}>
                      <RefButton reference={evalItem.wpRef} onAttach={doc => updEval(key, { wpRef: [...evalItem.wpRef, doc] })} onRemove={i => updEval(key, { wpRef: evalItem.wpRef.filter((_, i2) => i2 !== i) })} disabled={locked} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Materiality revision */}
        <div className="px-5 py-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revised performance materiality (if applicable)</label>
            <Input disabled={locked} value={data.materialityRevised} onChange={e => setData(d => ({ ...d, materialityRevised: e.target.value }))} placeholder="Enter revised PM amount or leave blank if unchanged…" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final materiality</label>
            <Input disabled={locked} value={data.finalMateriality} onChange={e => setData(d => ({ ...d, finalMateriality: e.target.value }))} placeholder={pm > 0 ? formatCurrency(pm) : "Enter final materiality…"} className="h-9 text-sm" />
          </div>
        </div>
      </div>

      {/* ── Conclusion ───────────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="px-5 py-3.5 border-b border-border">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Conclusion</span>
        </div>
        <div className="px-5 py-4">
          <Textarea
            disabled={locked}
            value={data.conclusion}
            onChange={e => setData(d => ({ ...d, conclusion: e.target.value }))}
            placeholder="The uncorrected identified misstatements are not material, either individually or in the aggregate, to the financial statements."
            className="min-h-[96px] text-sm resize-none"
          />
        </div>
      </div>

      <ConcludeBar
        worksheetKey="audit-aim"
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

      <NewAdjEntryModal
        open={viewEntry.open}
        onClose={() => setViewEntry(v => ({ ...v, open: false }))}
        onSave={(savedLines, meta) => {
          writeJsonToLocalStorage(`adj-entry-${engagementId ?? "default"}-${viewEntry.entryId}`, {
            lines: savedLines, meta, clientName: viewEntry.storedClientName, engId: engagementId,
          });
          let assets = 0, liabilities = 0, pretaxIncome = 0, equity = 0;
          savedLines.forEach(l => {
            const acc = tbAccounts.find(a => a.accNo === l.accNo);
            const net = (parseFloat(l.debit) || 0) - (parseFloat(l.credit) || 0);
            const g = (acc?.grouping ?? "").toLowerCase();
            if (g.includes("asset")) assets += net;
            else if (g.includes("liabilit")) liabilities += -net;
            else if (g.includes("equity")) equity += -net;
            else pretaxIncome += -net;
          });
          const origRefNo = viewEntry.prefillMeta?.entryNo ?? "";
          setData(d => ({
            ...d,
            sectionA: d.sectionA.map(r =>
              r.refNo === origRefNo
                ? {
                    ...r,
                    refNo: meta.entryNo,
                    entryType: meta.entryType as EntryType,
                    description: meta.notes || r.description,
                    assets: assets !== 0 ? String(assets) : "",
                    liabilities: liabilities !== 0 ? String(liabilities) : "",
                    pretaxIncome: pretaxIncome !== 0 ? String(pretaxIncome) : "",
                    equity: equity !== 0 ? String(equity) : "",
                  }
                : r
            ),
          }));
          setViewEntry({ open: false, prefillLines: [], prefillMeta: null, storedClientName: "", entryId: "" });
        }}
        engId={engagementId ?? ""}
        clientName={viewEntry.storedClientName}
        yearEnd={ctx.periodEndDisplay}
        prefillLines={viewEntry.prefillLines}
        prefillMeta={viewEntry.prefillMeta ?? undefined}
      />
    </WorksheetLayout>
  );
}
