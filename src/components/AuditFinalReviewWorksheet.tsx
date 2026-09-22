import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckSquare, Square, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetLayout, WorksheetHeader } from "@/components/audit/WorksheetShell";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { loadEngagements } from "@/store/engagementsStore";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CheckState {
  [key: string]: boolean;
}

interface MemberFinalSignoff {
  signed: boolean;
  signedAt: string;
}

interface FinalReviewData {
  checks: CheckState;
  teamChecks: { [rowKey: string]: { [memberKey: string]: boolean } };
  clientSignoffDate: string;
  clientSignoffNote: string;
  engLetterDate: string;
  finalSignoffs: { [memberKey: string]: MemberFinalSignoff };
  packagerName: string;
  packagerInstructions: string;
  packagerDueDate: string;
  packagerAssigned: boolean;
}

function buildDefault(): FinalReviewData {
  return {
    checks: {},
    teamChecks: {},
    clientSignoffDate: "",
    clientSignoffNote: "",
    engLetterDate: "",
    finalSignoffs: {},
    packagerName: "",
    packagerInstructions: "",
    packagerDueDate: "",
    packagerAssigned: false,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberKey(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function nowStamp(): string {
  return new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
];

// ── Simple checkbox for checklist sub-items ───────────────────────────────────

function Cb({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="inline-flex items-center justify-center w-5 h-5 rounded border border-border bg-background hover:border-primary/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      aria-checked={checked}
      role="checkbox"
    >
      {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/40" />}
    </button>
  );
}

// ── Row class helpers ─────────────────────────────────────────────────────────

const TH = "px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20";
const TD = "px-4 py-2.5 text-sm text-foreground border-b border-border";
const SEC_HEAD = "px-4 py-2 bg-muted/30 border-b border-border text-sm font-semibold text-foreground";

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditFinalReviewWorksheet() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const ctx = useEngagementContext();
  const storageKey = `audit-fr-final-review-${engagementId ?? "default"}`;

  const engRec = loadEngagements().find(e => e.id === (engagementId ?? "")) ?? null;
  const team = ctx.team;

  const [data, setData] = useState<FinalReviewData>(() => {
    const stored = readJsonFromLocalStorage<FinalReviewData>(storageKey, buildDefault());
    return stored ? { ...buildDefault(), ...stored } : buildDefault();
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
  }, [data, storageKey]);

  function upd<K extends keyof FinalReviewData>(key: K, val: FinalReviewData[K]) {
    setData(d => ({ ...d, [key]: val }));
  }

  function toggleCheck(key: string) {
    setData(d => ({ ...d, checks: { ...d.checks, [key]: !d.checks[key] } }));
  }

  function toggleTeamCheck(rowKey: string, mKey: string) {
    setData(d => {
      const row = d.teamChecks[rowKey] ?? {};
      return { ...d, teamChecks: { ...d.teamChecks, [rowKey]: { ...row, [mKey]: !(row[mKey] ?? false) } } };
    });
  }

  function signAllMember(mKey: string) {
    const SECTION_KEYS = ["co-checklist", "pl", "ra", "rp", "tb", "pr", "issues", "comments", "docs-req", "completion", "client-signoff"];
    setData(d => {
      const next = { ...d.teamChecks };
      SECTION_KEYS.forEach(k => {
        next[k] = { ...(next[k] ?? {}), [mKey]: true };
      });
      return { ...d, teamChecks: next };
    });
  }

  function toggleFinalSignoff(mKey: string) {
    setData(d => {
      const prev = d.finalSignoffs[mKey] ?? { signed: false, signedAt: "" };
      const nowSigned = !prev.signed;
      return {
        ...d,
        finalSignoffs: {
          ...d.finalSignoffs,
          [mKey]: { signed: nowSigned, signedAt: nowSigned ? nowStamp() : "" },
        },
      };
    });
  }

  const allFinalSigned = team.length > 0 && team.every(m => data.finalSignoffs[memberKey(m.role)]?.signed);

  return (
    <WorksheetLayout
      heading="Canada > Completion & Signoffs"
      standard="CAS 220"
    >
      <WorksheetHeader
        ctx={ctx}
        formNo="FR"
        title="Final Review"
        standard="CAS 220"
        overallRisk={undefined}
      />

      {/* ── Engagement Info ────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
        <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wide">Engagement Info</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-muted/10 w-[160px]">Engagement ID</td>
                <td className="px-4 py-3 text-sm text-foreground border-b border-border border-r border-border/40">{engagementId ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-muted/10 w-[140px]">Engagement Type</td>
                <td className="px-4 py-3 text-sm text-foreground border-b border-border border-r border-border/40">{engRec?.type ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-muted/10 w-[160px]">Accounting Standards</td>
                <td className="px-4 py-3 text-sm text-foreground border-b border-border">Canadian Auditing Standards (CAS)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase bg-muted/10 border-b border-border">Year End Date</td>
                <td className="px-4 py-3 text-sm text-foreground border-b border-border border-r border-border/40">{engRec?.yearEnd ?? ctx.periodEndDisplay ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase bg-muted/10 border-b border-border">Legal Entity Name</td>
                <td className="px-4 py-3 text-sm text-foreground border-b border-border border-r border-border/40">{engRec?.client ?? ctx.entityName ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase bg-muted/10 border-b border-border">Engagement Status</td>
                <td className="px-4 py-3 border-b border-border">
                  {engRec ? (
                    <Badge variant={engRec.statusVariant as Parameters<typeof Badge>[0]["variant"]}>{engRec.status}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Team Info ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
          <div className={SEC_HEAD}>Client Team Info</div>
          <div className="px-4 py-3 text-sm text-foreground">
            <div className="font-semibold">{engRec?.client ?? ctx.entityName ?? "—"}</div>
            <div className="text-muted-foreground text-xs mt-0.5">Client</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
          <div className={SEC_HEAD}>Team Info</div>
          <div className="px-4 py-3 flex flex-wrap gap-3">
            {team.map((m, i) => (
              <div key={m.role} className="flex items-center gap-1.5">
                <span className={`h-6 w-6 rounded-full text-[10px] font-bold text-white inline-flex items-center justify-center ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {initials(m.name)}
                </span>
                <div>
                  <div className="text-xs font-semibold text-primary leading-tight">{m.name.split(" ").slice(0, 2).join(" ")}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final Review type ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
        <div className={SEC_HEAD}>Final Review *</div>
        <div className="px-4 py-3">
          <Select defaultValue="audit-cas">
            <SelectTrigger className="h-9 text-sm w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="audit-cas">Audit (CAS)</SelectItem>
              <SelectItem value="audit-us">Audit (GAAS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── File Completion Checklist ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH + " min-w-[220px]"}>File Completion Checklist</th>
              <th className={TH + " w-16 text-center"}>Done</th>
              {team.map((m, i) => (
                <th key={m.role} className={TH + " w-36 text-center"}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`h-6 w-6 rounded-full text-[10px] font-bold text-white inline-flex items-center justify-center ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(m.name)}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground normal-case">{m.name.split(" ").slice(0, 2).join(" ")}</span>
                    <span className="text-[9px] font-normal text-muted-foreground normal-case">{m.role}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Master SignOff All row */}
            <tr className="border-b border-border bg-muted/10">
              <td className={TD + " font-semibold"} />
              <td className={TD + " text-center"} />
              {team.map(m => (
                <td key={m.role} className={TD + " text-center"}>
                  <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => signAllMember(memberKey(m.role))}>
                    Signoff All
                  </Button>
                </td>
              ))}
            </tr>

            {/* Client Onboarding — single row, sub-items in first cell */}
            <tr className="border-b border-border hover:bg-muted/5">
              <td className={TD + " align-top"}>
                <div className="font-medium text-sm mb-2">Client Onboarding</div>
                <div className="space-y-1.5 pl-1">
                  {([
                    { key: "co-408",      label: "408 Initial Audit Engagements" },
                    { key: "co-410",      label: "410 New Engagement — Acceptance/Continuance" },
                    { key: "co-al1-1",    label: "AL1.1 Engagement Letter" },
                  ] as { key: string; label: string }[]).map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Cb checked={!!data.checks[item.key]} onChange={() => toggleCheck(item.key)} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      {item.key === "co-eng-letter" && (
                        <Input
                          type="date"
                          value={data.engLetterDate}
                          onChange={e => upd("engLetterDate", e.target.value)}
                          className="h-6 text-xs w-32 ml-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </td>
              <td className={TD + " text-center align-top pt-3"}>
                <Cb checked={!!data.checks["co-section"]} onChange={() => toggleCheck("co-section")} />
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center align-top pt-3"}>
                  <Cb
                    checked={!!(data.teamChecks["co-checklist"]?.[memberKey(m.role)])}
                    onChange={() => toggleTeamCheck("co-checklist", memberKey(m.role))}
                  />
                </td>
              ))}
            </tr>

            {/* Section rows with per-member checkboxes */}
            {[
              { key: "pl",         label: "Planning" },
              { key: "ra",         label: "Risk Assessment" },
              { key: "rp",         label: "Response to Assessed Risks" },
              { key: "tb",         label: "Trial Balance & Adj Entries" },
              { key: "pr",         label: "Procedures" },
            ].map(row => (
              <tr key={row.key} className="border-b border-border hover:bg-muted/5">
                <td className={TD + " font-medium"}>{row.label}</td>
                <td className={TD + " text-center"}>
                  <Cb checked={!!data.checks[row.key]} onChange={() => toggleCheck(row.key)} />
                </td>
                {team.map(m => (
                  <td key={m.role} className={TD + " text-center"}>
                    <Cb
                      checked={!!(data.teamChecks[row.key]?.[memberKey(m.role)])}
                      onChange={() => toggleTeamCheck(row.key, memberKey(m.role))}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* Completion and Signoffs sub-section */}
            <tr className="border-b border-border">
              <td className={SEC_HEAD} colSpan={2 + team.length}>Completion and Signoffs</td>
            </tr>
            {[
              { key: "so-aim", label: "Accumulation of Identified Misstatements (AIM)" },
              { key: "so-se",  label: "Subsequent events" },
            ].map(item => (
              <tr key={item.key} className="border-b border-border/50 hover:bg-muted/5">
                <td className={TD + " pl-8"}>
                  <div className="flex items-center gap-2">
                    <Cb checked={!!data.checks[item.key]} onChange={() => toggleCheck(item.key)} />
                    <span>{item.label}</span>
                  </div>
                </td>
                <td className={TD + " text-center"}>
                  {data.checks[item.key] && <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />}
                </td>
                {team.map(m => <td key={m.role} className={TD} />)}
              </tr>
            ))}

            {/* Issues */}
            <tr className="border-b border-border hover:bg-muted/5">
              <td className={TD + " font-medium"}>
                <div className="flex items-center gap-2">Issues <Badge variant="success">Resolved</Badge></div>
              </td>
              <td className={TD + " text-center"}>
                <Cb checked={!!data.checks["issues"]} onChange={() => toggleCheck("issues")} />
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center"}>
                  <Cb checked={!!(data.teamChecks["issues"]?.[memberKey(m.role)])} onChange={() => toggleTeamCheck("issues", memberKey(m.role))} />
                </td>
              ))}
            </tr>

            {/* Comments */}
            <tr className="border-b border-border hover:bg-muted/5">
              <td className={TD + " font-medium"}>
                <div className="flex items-center gap-2">Comments <Badge variant="success">Resolved</Badge></div>
              </td>
              <td className={TD + " text-center"}>
                <Cb checked={!!data.checks["comments"]} onChange={() => toggleCheck("comments")} />
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center"}>
                  <Cb checked={!!(data.teamChecks["comments"]?.[memberKey(m.role)])} onChange={() => toggleTeamCheck("comments", memberKey(m.role))} />
                </td>
              ))}
            </tr>

            {/* Documents Request List */}
            <tr className="border-b border-border hover:bg-muted/5">
              <td className={TD + " font-medium"}>
                <div className="flex items-center gap-2">Documents Request List <Badge variant="completed">Completed</Badge></div>
              </td>
              <td className={TD + " text-center"}>
                <Cb checked={!!data.checks["docs-req"]} onChange={() => toggleCheck("docs-req")} />
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center"}>
                  <Cb checked={!!(data.teamChecks["docs-req"]?.[memberKey(m.role)])} onChange={() => toggleTeamCheck("docs-req", memberKey(m.role))} />
                </td>
              ))}
            </tr>

            {/* Completion */}
            <tr className="border-b border-border hover:bg-muted/5">
              <td className={TD + " font-medium"}>Completion</td>
              <td className={TD + " text-center"}>
                <Cb checked={!!data.checks["completion"]} onChange={() => toggleCheck("completion")} />
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center"}>
                  <Cb checked={!!(data.teamChecks["completion"]?.[memberKey(m.role)])} onChange={() => toggleTeamCheck("completion", memberKey(m.role))} />
                </td>
              ))}
            </tr>

            {/* Client Signoff */}
            <tr className="border-b border-border">
              <td className={SEC_HEAD} colSpan={2 + team.length}>Client Signoff</td>
            </tr>
            <tr className="border-b border-border">
              <td className={TD} colSpan={2}>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Client Signoff Date (MM/DD/YYYY) *
                    </label>
                    <Input
                      type="date"
                      value={data.clientSignoffDate}
                      onChange={e => upd("clientSignoffDate", e.target.value)}
                      className="h-9 text-sm max-w-[220px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Note</label>
                    <Textarea
                      value={data.clientSignoffNote}
                      onChange={e => upd("clientSignoffNote", e.target.value)}
                      placeholder="Add a note..."
                      className="min-h-[72px] text-sm resize-none max-w-md"
                    />
                  </div>
                </div>
              </td>
              {team.map(m => (
                <td key={m.role} className={TD + " text-center align-middle"}>
                  <Cb checked={!!(data.teamChecks["client-signoff"]?.[memberKey(m.role)])} onChange={() => toggleTeamCheck("client-signoff", memberKey(m.role))} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Sign Off Disclaimer ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
        <div className={SEC_HEAD}>Sign Off Disclaimer</div>
        <div className="px-4 py-3 text-sm text-foreground leading-relaxed">
          <p>
            By signing off below, you are agreeing to this statement that you have reviewed all the relevant
            associated working papers and cleared all your queries and documented the matters appropriately
            that may cause the financial statements and note disclosures, if applicable, to be false and/or
            misleading.
          </p>
        </div>
      </div>

      {/* ── Final Completion Signoff — one card per team member ───────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
        <div className={SEC_HEAD}>Final Completion Signoff</div>
        <div className="px-4 py-4 flex flex-wrap gap-4">
          {team.map((m, i) => {
            const mKey = memberKey(m.role);
            const sig = data.finalSignoffs[mKey] ?? { signed: false, signedAt: "" };
            return (
              <div key={mKey} className="flex flex-col items-start gap-1 min-w-[140px]">
                <div className="flex items-center gap-2">
                  <span className={`h-7 w-7 rounded-full text-[11px] font-bold text-white inline-flex items-center justify-center ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(m.name)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground leading-tight">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{m.role}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={sig.signed ? "outline" : "default"}
                  className={sig.signed ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400" : ""}
                  onClick={() => toggleFinalSignoff(mKey)}
                >
                  {sig.signed ? "Unsign" : "Sign"}
                </Button>
                {sig.signed && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {sig.signedAt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Assign Packager ────────────────────────────────────────────── */}
      {!data.packagerAssigned ? (
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
          <div className={SEC_HEAD}>Assign Packager</div>
          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assign team member *</label>
              <Select value={data.packagerName} onValueChange={v => upd("packagerName", v)}>
                <SelectTrigger className="h-9 text-sm w-64">
                  <SelectValue placeholder="Select Packager" />
                </SelectTrigger>
                <SelectContent>
                  {team.map(m => (
                    <SelectItem key={m.role} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Instructions for final package (if applicable) *
              </label>
              <Textarea
                value={data.packagerInstructions}
                onChange={e => upd("packagerInstructions", e.target.value)}
                placeholder="Add Instructions here"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Due date for packaging (MM/DD/YYYY) *
              </label>
              <Input
                type="date"
                value={data.packagerDueDate}
                onChange={e => upd("packagerDueDate", e.target.value)}
                className="h-9 text-sm max-w-[220px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { upd("packagerName", ""); upd("packagerInstructions", ""); upd("packagerDueDate", ""); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => upd("packagerAssigned", true)}
                disabled={!data.packagerName || !data.packagerDueDate}
              >
                Assign
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
          <div className={SEC_HEAD}>Packager Assigned</div>
          <div className="px-4 py-3 text-sm text-foreground flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Assigned to <strong>{data.packagerName}</strong> · Due {data.packagerDueDate || "—"}</span>
            <button
              type="button"
              onClick={() => upd("packagerAssigned", false)}
              className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* ── Final actions ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
        <div className={SEC_HEAD}>Actions</div>
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {[
            { label: "Finalize Report",       disabled: !allFinalSigned     },
            { label: "Create Package",         disabled: !data.packagerAssigned },
            { label: "Roll Forward Template",  disabled: false               },
            { label: "Complete & Archive",     disabled: !allFinalSigned     },
            { label: "Export Data",            disabled: false               },
          ].map(action => (
            <Button
              key={action.label}
              variant={action.disabled ? "outline" : "default"}
              size="sm"
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}
        </div>
        {!allFinalSigned && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 border-t border-border bg-amber-50/50 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Complete all Final Completion Signoffs to enable Finalize Report and Complete &amp; Archive.
          </div>
        )}
      </div>
    </WorksheetLayout>
  );
}
