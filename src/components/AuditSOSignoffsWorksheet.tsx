import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetLayout, WorksheetHeader } from "@/components/audit/WorksheetShell";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { WorksheetIcon } from "@/components/icons/WorksheetIcon";
import { LetterIcon } from "@/components/icons/LetterIcon";
import { CompletionIcon } from "@/components/icons/CompletionIcon";
import { WordDocIcon } from "@/components/icons/WordDocIcon";
import { BookIcon } from "@/components/icons/BookIcon";
import { FolderSolidIcon } from "@/components/icons/FolderIcons";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MemberSignoff {
  signed: boolean;
  signedAt: string;
}

interface SignoffState {
  [itemKey: string]: {
    [memberKey: string]: MemberSignoff;
  };
}

interface SignoffsData {
  signoffs: SignoffState;
}

// ── Sections matching CA audit engagement tree ────────────────────────────────

interface SignoffItem {
  code?: string;
  label: string;
  icon: "checklist" | "worksheet" | "letter" | "book" | "doc" | "folder" | "completion";
}

interface SignoffSection {
  key: string;
  title: string;
  items: SignoffItem[];
}

const SIGNOFF_SECTIONS: SignoffSection[] = [
  {
    key: "co",
    title: "Client Onboarding",
    items: [
      { code: "408",   label: "Initial Audit Engagements",                       icon: "checklist" },
      { code: "410",   label: "New/Existing Engagement — Acceptance/Continuance", icon: "checklist" },
      { code: "AL1.1", label: "Engagement Letter",                               icon: "letter"    },
    ],
  },
  {
    key: "pl",
    title: "Planning",
    items: [
      { code: "420", label: "Materiality",              icon: "worksheet" },
      { code: "428", label: "Auditor's Expert",          icon: "worksheet" },
      { code: "430", label: "Overall Audit Strategy",    icon: "worksheet" },
      { code: "436", label: "Team Planning Discussions", icon: "worksheet" },
      { code: "450", label: "Time Tracker",              icon: "worksheet" },
    ],
  },
  {
    key: "ra-gi",
    title: "Risk Assessment — Gather Information",
    items: [
      { code: "500",   label: "Observation & Inspection",          icon: "checklist" },
      { code: "501-A", label: "Preliminary Analytical Procedures", icon: "worksheet" },
      { code: "501-B", label: "Preliminary Analytical Procedures", icon: "checklist" },
      { code: "505",   label: "Mgmt Inquiries",                    icon: "checklist" },
      { code: "507",   label: "Governance Minutes",                icon: "worksheet" },
      { code: "510",   label: "Entity Understanding",              icon: "worksheet" },
      { code: "511",   label: "IT Environment",                    icon: "worksheet" },
      { code: "514",   label: "Prior Period Estimates",            icon: "worksheet" },
    ],
  },
  {
    key: "ra-ir",
    title: "Risk Assessment — Identify Risk",
    items: [
      { code: "506", label: "Fraud",                             icon: "checklist" },
      { code: "513", label: "Accounting Estimates",              icon: "worksheet" },
      { code: "515", label: "Related Parties",                   icon: "worksheet" },
      { code: "525", label: "Going Concern",                     icon: "checklist" },
      { code: "530", label: "Entity Level — Risks and Controls", icon: "checklist" },
      { code: "580", label: "Revenue Recognition",               icon: "worksheet" },
      { code: "520", label: "Risk Register",                     icon: "worksheet" },
      { code: "590", label: "Engagement Scoping",                icon: "worksheet" },
    ],
  },
  {
    key: "ra-pr",
    title: "Risk Assessment — Populate Responses",
    items: [
      { code: "535", label: "Info System",          icon: "worksheet" },
      { code: "540", label: "Control Design",       icon: "worksheet" },
      { code: "550", label: "Control Activities",   icon: "worksheet" },
      { code: "551", label: "General IT Controls",  icon: "worksheet" },
      { code: "575", label: "Control Deficiencies", icon: "worksheet" },
    ],
  },
  {
    key: "rp",
    title: "Response to Assessed Risks",
    items: [
      { code: "605", label: "Risk Responses",                         icon: "worksheet" },
      { code: "610", label: "Sampling — Tests of Details",            icon: "worksheet" },
      { code: "625", label: "Going Concern",                          icon: "worksheet" },
      { code: "630", label: "Confirmations",                          icon: "worksheet" },
      { code: "635", label: "Accounting Estimates",                   icon: "worksheet" },
      { code: "645", label: "Litigation, Claims and Non-Compliance",  icon: "worksheet" },
      { code: "650", label: "Subsequent Events",                      icon: "worksheet" },
      { code: "655", label: "Final Analytics",                        icon: "worksheet" },
      { code: "666", label: "Related Parties",                        icon: "worksheet" },
      { code: "670", label: "Use of Journal Entries",                 icon: "worksheet" },
      { code: "680", label: "ASPE Supplementary Audit Procedures",    icon: "worksheet" },
    ],
  },
  {
    key: "do",
    title: "Documents",
    items: [
      { code: "SHA", label: "Shareholders Agreements",         icon: "folder" },
      { code: "REN", label: "Rental/Lease Agreements",         icon: "folder" },
      { code: "INC", label: "Incorporation Documents",         icon: "folder" },
      { code: "BAN", label: "Banking Agreements",              icon: "folder" },
      { code: "CMA", label: "Contracts & Material Agreements", icon: "folder" },
      { code: "CMB", label: "Corporate Minute Book",           icon: "folder" },
      { code: "RCF", label: "Regulatory & Compliance Filings", icon: "folder" },
    ],
  },
  {
    key: "tb",
    title: "Trial Balance & Adjusting Entries",
    items: [
      { label: "Trial Balance & Adjusting Entries", icon: "worksheet" },
    ],
  },
  {
    key: "pr",
    title: "Procedures",
    items: [
      { code: "A",  label: "Cash and cash equivalents",    icon: "book" },
      { code: "B",  label: "Accounts receivable",          icon: "book" },
      { code: "C",  label: "Inventories",                  icon: "book" },
      { code: "D",  label: "Short-term investments",       icon: "book" },
      { code: "E",  label: "Loans and notes receivable",   icon: "book" },
      { code: "I",  label: "Other current assets",         icon: "book" },
      { code: "H",  label: "Property, plant and equipment", icon: "book" },
      { code: "K",  label: "Long-term investments",        icon: "book" },
      { code: "BB", label: "Accounts payable",             icon: "book" },
      { code: "CC", label: "Taxes payable",                icon: "book" },
      { code: "DD", label: "Short-term debt",              icon: "book" },
      { code: "JJ", label: "Other long-term liabilities",  icon: "book" },
      { code: "KK", label: "Long-term debt",               icon: "book" },
      { code: "TT", label: "Equity",                       icon: "book" },
      { code: "20", label: "Revenue",                      icon: "book" },
      { code: "30", label: "Cost of sales",                icon: "book" },
      { code: "40", label: "Expenses",                     icon: "book" },
      { code: "80", label: "Other expenses (income)",      icon: "book" },
    ],
  },
  {
    key: "fs",
    title: "Financial Statements",
    items: [
      { label: "Cover Page",                                                     icon: "doc"       },
      { label: "Table of Contents",                                              icon: "doc"       },
      { label: "Independent Auditor's Report",                                   icon: "checklist" },
      { label: "Balance Sheet",                                                  icon: "doc"       },
      { label: "Statement of Income (Loss) and Retained Earnings (Deficit)",    icon: "doc"       },
      { label: "Statement of Cash Flows",                                        icon: "doc"       },
      { label: "Statement of Changes in Equity",                                 icon: "doc"       },
      { label: "Notes to Financial Statements",                                  icon: "doc"       },
    ],
  },
  {
    key: "so",
    title: "Completion & Signoffs",
    items: [
      { code: "AIM", label: "Accumulation of Identified Misstatements", icon: "completion" },
      { code: "650", label: "Subsequent Events",                        icon: "worksheet"  },
      { code: "314", label: "Management Representations",               icon: "checklist"  },
      { code: "305", label: "Auditor's Report",                         icon: "checklist"  },
      { code: "306", label: "Modified Opinion",                         icon: "checklist"  },
      { code: "310", label: "Audit Completion",                         icon: "checklist"  },
      { code: "311", label: "Withdrawal",                               icon: "worksheet"  },
      { code: "312", label: "Engagement Partner",                       icon: "checklist"  },
      { code: "313", label: "Supplementary Info",                       icon: "checklist"  },
      { code: "320", label: "Significant Decisions",                    icon: "worksheet"  },
      { code: "325", label: "Key Audit Matters",                        icon: "worksheet"  },
      { code: "330", label: "Findings & Discussion",                    icon: "worksheet"  },
      { code: "335", label: "Identified Misstatements",                 icon: "worksheet"  },
      { code: "340", label: "Mgmt & TCWG Matters",                     icon: "worksheet"  },
      { code: "370", label: "Future Considerations",                    icon: "worksheet"  },
      { code: "375", label: "Consultation",                             icon: "worksheet"  },
      { code: "CM",  label: "Completion",                               icon: "completion" },
      { code: "DC",  label: "Disclosure",                               icon: "checklist"  },
    ],
  },
];

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

function cellKey(sectionKey: string, itemIdx: number) {
  return `${sectionKey}::${itemIdx}`;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
];

// ── Icon (matches sidebar renderIcon) ─────────────────────────────────────────

function ItemIcon({ type }: { type: SignoffItem["icon"] }) {
  if (type === "completion") return <CompletionIcon className="h-4 w-4 flex-shrink-0" />;
  if (type === "letter")     return <LetterIcon className="h-4 w-4 flex-shrink-0" />;
  if (type === "doc")        return <WordDocIcon className="h-4 w-4 flex-shrink-0" />;
  if (type === "book")       return <BookIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#778599" }} />;
  if (type === "folder")     return <FolderSolidIcon className="h-4 w-4 flex-shrink-0 text-primary" />;
  if (type === "worksheet")  return <WorksheetIcon className="h-4 w-4 flex-shrink-0" />;
  return <ChecklistIcon className="h-4 w-4 flex-shrink-0" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditSOSignoffsWorksheet() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const ctx = useEngagementContext();
  const storageKey = `audit-so-signoffs-${engagementId ?? "default"}`;

  const [data, setData] = useState<SignoffsData>(
    () => readJsonFromLocalStorage<SignoffsData>(storageKey, { signoffs: {} }) ?? { signoffs: {} }
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
  }, [data, storageKey]);

  function toggle(sectionKey: string, itemIdx: number, mKey: string) {
    const k = cellKey(sectionKey, itemIdx);
    setData(d => {
      const prev = d.signoffs[k]?.[mKey] ?? { signed: false, signedAt: "" };
      const nowSigned = !prev.signed;
      return {
        ...d,
        signoffs: {
          ...d.signoffs,
          [k]: { ...(d.signoffs[k] ?? {}), [mKey]: { signed: nowSigned, signedAt: nowSigned ? nowStamp() : "" } },
        },
      };
    });
  }

  function signSection(section: SignoffSection, mKey: string, sign: boolean) {
    const stamp = sign ? nowStamp() : "";
    setData(d => {
      const next = { ...d.signoffs };
      section.items.forEach((_, idx) => {
        const k = cellKey(section.key, idx);
        next[k] = { ...(next[k] ?? {}), [mKey]: { signed: sign, signedAt: stamp } };
      });
      return { ...d, signoffs: next };
    });
  }

  function signAll(mKey: string, sign: boolean) {
    const stamp = sign ? nowStamp() : "";
    setData(d => {
      const next = { ...d.signoffs };
      SIGNOFF_SECTIONS.forEach(section => {
        section.items.forEach((_, idx) => {
          const k = cellKey(section.key, idx);
          next[k] = { ...(next[k] ?? {}), [mKey]: { signed: sign, signedAt: stamp } };
        });
      });
      return { ...d, signoffs: next };
    });
  }

  function isSectionAllSigned(section: SignoffSection, mKey: string): boolean {
    return section.items.every((_, idx) => data.signoffs[cellKey(section.key, idx)]?.[mKey]?.signed);
  }

  function isAllSigned(mKey: string): boolean {
    return SIGNOFF_SECTIONS.every(s => isSectionAllSigned(s, mKey));
  }

  const team = ctx.team;

  return (
    <WorksheetLayout
      heading="Canada > Completion & Signoffs"
      standard="CAS 220"
    >
      <WorksheetHeader
        ctx={ctx}
        formNo="SO"
        title="Signoffs"
        standard="CAS 220"
        overallRisk={undefined}
      />

      <div className="bg-card border border-border rounded-md overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[260px]">
                File Completion Checklist
              </th>
              {team.map((m, i) => (
                <th key={m.role} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`h-7 w-7 rounded-full text-[11px] font-bold text-white inline-flex items-center justify-center ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(m.name)}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground normal-case leading-tight">{m.name}</span>
                    <span className="text-[10px] font-normal text-muted-foreground normal-case leading-tight">{m.role}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Master row */}
            <tr className="border-b border-border bg-muted/20">
              <td className="px-4 py-3 text-sm font-semibold text-foreground">Signoffs Master Sheet</td>
              {team.map((m, i) => {
                const mKey = memberKey(m.role);
                const allSigned = isAllSigned(mKey);
                return (
                  <td key={m.role} className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={allSigned ? "outline" : "default"}
                      className={allSigned ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400" : ""}
                      onClick={() => signAll(mKey, !allSigned)}
                    >
                      {allSigned ? "UnSignOff All" : "SignOff All"}
                    </Button>
                  </td>
                );
              })}
            </tr>

            {/* Sections */}
            {SIGNOFF_SECTIONS.map(section => (
              <>
                {/* Section header */}
                <tr key={`${section.key}-hdr`} className="border-b border-border bg-muted/10">
                  <td className="px-4 py-2 text-sm font-semibold text-foreground">{section.title}</td>
                  {team.map(m => {
                    const mKey = memberKey(m.role);
                    const allSigned = isSectionAllSigned(section, mKey);
                    return (
                      <td key={m.role} className="px-4 py-2 text-center">
                        <Button
                          size="sm"
                          variant={allSigned ? "outline" : "default"}
                          className={allSigned ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400" : ""}
                          onClick={() => signSection(section, mKey, !allSigned)}
                        >
                          {allSigned ? "Unsign section" : "Signoff section"}
                        </Button>
                      </td>
                    );
                  })}
                </tr>

                {/* Item rows */}
                {section.items.map((item, idx) => {
                  const k = cellKey(section.key, idx);
                  return (
                    <tr key={k} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-2">
                        <div className="flex items-center gap-2">
                          <ItemIcon type={item.icon} />
                          {item.code && (
                            <span className="text-sm font-semibold text-primary flex-shrink-0">{item.code}</span>
                          )}
                          <span className="text-sm text-foreground">{item.label}</span>
                        </div>
                      </td>
                      {team.map((m, i) => {
                        const mKey = memberKey(m.role);
                        const sig = data.signoffs[k]?.[mKey];
                        return (
                          <td key={m.role} className="px-3 py-2 text-center">
                            {sig?.signed ? (
                              <button
                                type="button"
                                onClick={() => toggle(section.key, idx, mKey)}
                                className="inline-flex items-center gap-1.5 text-[11px] text-foreground hover:opacity-80 transition-opacity"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                <span className="text-muted-foreground leading-tight text-left">
                                  {sig.signedAt}
                                </span>
                                <span className={`h-5 w-5 rounded-full text-[9px] font-bold text-white inline-flex items-center justify-center flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                                  {initials(m.name)}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggle(section.key, idx, mKey)}
                                className="h-4 w-4 rounded border border-border bg-background hover:border-primary/60 transition-colors mx-auto block"
                                aria-label={`Sign off ${item.label} for ${m.name}`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </WorksheetLayout>
  );
}
