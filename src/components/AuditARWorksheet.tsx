import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilePlus, RotateCcw, Trash2, X, ChevronDown, Search, EyeOff } from "lucide-react";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { getEngagementContext } from "@/lib/engagementContext";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { WorksheetLayout, WorksheetSection, ConcludeBar } from "@/components/audit/WorksheetShell";
import { LukaWorkPaperPanel } from "@/components/demo/LukaWorkPaperPanel";
import { DEMO_LUKA_PROC_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { GreenDot } from "@/components/demo/GreenDot";

type Nature = "Required" | "Optional" | "Additional Procedure" | "";
type ProcType = "Inquiries" | "Analytics" | "Observation" | "Inspection" | "Recalculation" | "Other" | "";

interface ARRow {
  id: string;
  nature: Nature;
  type: ProcType;
  description: string;
  comments: string;
  wpRef: RefDoc[];
  hidden?: boolean;
}

interface ARSection {
  title: string;
  rows: ARRow[];
}

interface DataAR {
  auditProcedures: ARSection[];
  confirmationProcedures: ARSection[];
  concluded: boolean;
  concludedOn: string;
}

function mkRow(nature: Nature, type: ProcType, description: string): ARRow {
  return { id: Math.random().toString(36).slice(2, 11), nature, type, description, comments: "", wpRef: [] };
}

function buildDefault(): DataAR {
  return {
    auditProcedures: [
      {
        title: "BASIC",
        rows: [
          mkRow("Required", "Inspection", "Preparation — Obtain a detailed (and aged) listing of trade accounts and other accounts receivable at the period end."),
          mkRow("Required", "Inspection", "Preparation — Obtain an understanding of the standard terms of sale, revenue recognition and credit and collection policies."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Review the assessed risks being addressed by this audit plan (by assertion) and ensure the planned procedures (including relevant procedures contained in other audit programs) provide an appropriate response."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Review the identified estimates, and ensure that the planned procedures (including the relevant procedures) provide an appropriate response."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Where necessary, add additional audit procedures, change existing procedures and eliminate redundant procedures."),
          mkRow("Required", "Analytics", "Analytical procedures — Accounts receivable balance compared to the previous period."),
          mkRow("Required", "Analytics", "Analytical procedures — Aging of accounts receivable by customer and aging category (e.g., current, 30-60, 60-90, etc.) compared to the previous period."),
          mkRow("Required", "Analytics", "Analytical procedures — Number of days' sales in accounts receivable compared to the previous period."),
          mkRow("Required", "Analytics", "Analytical procedures — Credit balances in accounts receivable."),
          mkRow("Optional", "Analytics", "Analytical procedures — Other unexpected variations (explain)."),
          mkRow("Optional", "Analytics", "Analytical procedures — Other (non-trade receivables)."),
          mkRow("Required", "Inquiries", "Accounting policies — Have there been any changes to accounting policies affecting accounts receivable balances for this period? If so, describe the reasons why."),
          mkRow("Required", "Inspection", "Accounting policies — Ensure the accounting policies in use are appropriate and consistently applied."),
        ],
      },
      {
        title: "COMPLETENESS",
        rows: [
          mkRow("Required", "Inquiries", "Unrecorded or missing receivables — Identify personnel responsible for, or familiar with, accounts receivables and ask whether they are aware of any unrecorded or missing receivables as a result of: Inconsistent application of accounting policies. Sales in the current period being recorded in a subsequent period. Unusual journal entries. Unrecorded receivables with related parties or other customers."),
          mkRow("Required", "Inspection", "Subsequent receipts testing — Based on the assessment of the risks of material misstatement (fraud and error), obtain a listing of invoices paid after the period end to the date of the auditor's report to see if any goods or services should have been recognized in revenue in the period currently being audited. Document and resolve any exceptions."),
          mkRow("Required", "Inspection", "Coordination with revenue testing — Consider the impact of the audit procedures planned for the revenue cycle to ensure the procedures are sufficient to address revenue completeness."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of details: i. Obtain a listing of sales invoices paid after the period end. ii. Review the listing for large or unusual amounts. iii. Select a sample of paid sales invoices in addition to material invoices paid subsequent to period end. iv. Review the shipping/transaction date to see if goods or services have been recognized in the appropriate period. v. Review the sales journal or accounts receivable listing to ensure the amount was recorded in revenue."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of controls: Select a sample of _______ and ensure ________."),
        ],
      },
      {
        title: "ACCURACY / VALUATION",
        rows: [
          mkRow("Required", "Recalculation", "Accuracy of listing and aging — Check arithmetic accuracy of the accounts receivable listing (adds and cross-adds) and agree to the general ledger balance."),
          mkRow("Required", "Inspection", "Accuracy of listing and aging — Based on the assessment of the risks of material misstatement, consider testing the accuracy of the aged accounts receivable listing."),
          mkRow("Required", "Inspection", "Classification — Investigate and document the reasons for material credit balances in accounts receivable. Consider confirmation and reclassification to accounts payable. Where the entity has significant unapplied payments, consider the impact on the A/R aging and risk of fraud or error, and consider whether additional audit procedures are necessary."),
          mkRow("Required", "Inspection", "Cut-off — Document the entity's procedures to ensure accounts receivable balances are recorded in the correct accounting period at period end."),
          mkRow("Required", "Inspection", "Cut-off — Select sales invoices, both before and after the period end, and ensure the transactions were recorded in the appropriate period. (In determining the extent of this procedure, consider the work performed in other parts of the transaction stream, such as revenue/receivables/receipts.)"),
          mkRow("Required", "Inspection", "Component entities and related parties — Document transactions and ending balances with component entities or related parties. Review the detailed accounts receivable sub-ledger to ensure all related parties have been identified."),
          mkRow("Required", "Inspection", "Allowance for doubtful accounts — a. Review the aged accounts receivable trial balance and compare it to the preceding year or periods. Review the payments received subsequent to period end."),
          mkRow("Required", "Inspection", "Allowance for doubtful accounts — b. For all significant or material accounts over 90 days that have not been paid subsequent to period end, obtain the invoice date to determine exactly how old the invoice is. Obtain documentation for each invoice supporting when the good was shipped or service was provided."),
          mkRow("Required", "Inspection", "Allowance for doubtful accounts — c. Review any analysis or assumptions used in preparing the allowance for doubtful accounts provision, and agree the amount to the general ledger. Note any changes in the assumptions or methodology used in calculating the allowance."),
          mkRow("Required", "Inspection", "Allowance for doubtful accounts — d. Agree bad debt expenses and related bad debt write-offs to supporting documentation (e.g., letter from trustees in bankruptcy), and ensure proper approval of write-offs."),
          mkRow("Required", "Inquiries", "Allowance for doubtful accounts — e. Discuss with management key assumptions used in preparing the allowance. Document results of the conversation, including the individuals interviewed and the date."),
          mkRow("Required", "Inspection", "Translation — Ensure all account balances are translated into Canadian funds at the period-end exchange rate."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of details: Select a sample of accounts receivable invoices. Review the invoice date, balance, etc., and calculate the number of days the invoice is outstanding since the period end. Ensure the classification of the invoice on the aging is appropriate and the invoice details match what is on the listing."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of controls: Select a sample of _______ and ensure ________."),
        ],
      },
      {
        title: "EXISTENCE",
        rows: [
          mkRow("Required", "Inquiries", "Invalid receivables — Identify personnel responsible for, or familiar with, accounts receivables and ask whether they are aware of any recorded receivables that are invalid as a result of: Inconsistent application of accounting policies. Sales from a subsequent period being recorded in the current period. Sales to related parties or others in the current period that were returned after period end."),
          mkRow("Required", "Inspection", "Unusual or large balances — Review the composition of the sub-ledger balances, and look for unusual items (e.g., even dollar amounts, unapplied payments, unusual entity names and known related parties, and foreign suppliers). Identify and document how unusual items and exceptions were investigated."),
          mkRow("Required", "Inspection", "Validation of accounts receivable — Determine what (if any) accounts receivable balances to confirm or whether alternative procedures would be sufficient. Consider: nature and composition of accounts receivable, significant balances, related parties, previous confirmation response rates, length of time between the period end and the field work."),
          mkRow("Required", "Inspection", "Validation — Confirmation: Where confirmations are deemed to be effective (based on the assessment of risks of material misstatement), perform the procedures outlined in Form C.110."),
          mkRow("Required", "Inspection", "Validation — Confirmations unlikely to be effective: Select a sample of accounts receivable invoices or balances. Agree the invoices or balances to supporting documentation (such as packing slip and shipping advice)."),
          mkRow("Required", "Inspection", "Validation — Alternative to confirmation: Where a significant amount of time has elapsed since the period end, consider extending the testing of subsequent receipts instead of confirming accounts receivable."),
          mkRow("Required", "Inspection", "Coordination with revenue testing — Consider the impact of the audit procedures planned for the revenue cycle to ensure the procedures are sufficient to address revenue existence and accuracy."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of details: Confirmations — Select a sample of accounts receivable for confirmation. Document how the sample was selected (i.e., level of assurance required) and how the items were selected (i.e., judgmental or using monetary unit sampling). Perform the procedures outlined in Form C.110."),
          mkRow("Optional", "Inspection", "Sampling procedures — Tests of controls: Select a sample of _______ and ensure _______."),
        ],
      },
      {
        title: "PRESENTATION",
        rows: [
          mkRow("Required", "Inspection", "Classification — Have the balances been appropriately classified, aggregated or disaggregated and characterized in accordance with the applicable financial reporting framework?"),
          mkRow("Required", "Inspection", "Disclosures — Do the notes to the financial statements include disclosures required by the applicable financial reporting framework?"),
          mkRow("Required", "Inspection", "Relevant information — Has the overall presentation of the financial statements been undermined by including information that is not relevant or that obscures a proper understanding of the matters disclosed?"),
        ],
      },
      {
        title: "OTHER",
        rows: [
          mkRow("Optional", "", "Other procedures (specify)"),
        ],
      },
    ],
    confirmationProcedures: [
      {
        title: "CONFIRMATION PROCEDURES",
        rows: [
          mkRow("Required", "Inspection", "Obtain a copy of the accounts receivable sub-ledger/trial balance as at the confirmation date — a. Agree the balances to general ledger."),
          mkRow("Required", "Inspection", "Obtain a copy of the accounts receivable sub-ledger — b. Identify the large and unusual items."),
          mkRow("Required", "Inspection", "Obtain a copy of the accounts receivable sub-ledger — c. Select a sample of accounts receivable invoices or balances for confirmation including the large and unusual items."),
          mkRow("Required", "Inspection", "Obtain a copy of the accounts receivable sub-ledger — d. Document how the sample of accounts receivable was chosen (i.e., judgmental or using monetary unit sampling). Include the desired percentage of coverage, starting point and intervals."),
          mkRow("Optional", "Inspection", "Obtain a copy of the accounts receivable sub-ledger — e. Where a fraud risk exists or where confirmations will be sent by fax, consider agreeing names and addresses on confirmations on a test basis to telephone directories or trade publications to ensure accounts are not fictitious."),
          mkRow("Required", "Inquiries", "Management refusal — Where management refuses to allow the auditor to send a confirmation request(s): obtain explanations for management's refusal, obtain audit evidence as to their validity, and determine what alternative procedures can be performed."),
          mkRow("Required", "Inspection", "Prepare the confirmation requests and maintain control over the requests until they are mailed."),
          mkRow("Required", "Inspection", "Second request — After _____ days, with no reply received, mail a second request."),
          mkRow("Required", "Inspection", "Differences — When confirmation replies indicate that a difference exists: ask management for assistance in reconciling the differences, and assess whether the explanations provided are satisfactory."),
          mkRow("Required", "Inspection", "Alternative procedures — Where confirmations are not returned or results are not satisfactory, perform alternative auditing procedures: a. Agree subsequent payments to the account and to duplicate deposit slips. b. Agree shipping records and sales invoices to the account. c. Examine other supporting documentation. d. Consider whether the test results may be indicative of a previously unidentified fraud risk."),
          mkRow("Required", "Inspection", "Complete confirmation statistics summary and determine whether the test objectives have been met."),
          mkRow("Required", "Inspection", "Ensure that auditing procedures in related areas (e.g., sales, receipts, etc.) are coordinated where necessary."),
        ],
      },
    ],
    concluded: false,
    concludedOn: "",
  };
}

type DocKey = "auditProcedures" | "confirmationProcedures";

const AR_AUDIT_MATCHES: Record<string, { docKey: DocKey; sectionIdx: number; match: string }> = {
  "ar-audit-basic-obtain":           { docKey: "auditProcedures", sectionIdx: 0, match: "Preparation — Obtain a detailed (and aged) listing" },
  "ar-audit-accuracy-check":         { docKey: "auditProcedures", sectionIdx: 2, match: "Accuracy of listing and aging — Check arithmetic accuracy of the accounts receivable listing (adds and cross-adds) and agree to the general ledger balance" },
  "ar-audit-existence-unusual":      { docKey: "auditProcedures", sectionIdx: 3, match: "Unusual or large balances — Review the composition of the sub-ledger balances" },
  "ar-audit-allowance-a":            { docKey: "auditProcedures", sectionIdx: 2, match: "Allowance for doubtful accounts — a. Review the aged accounts receivable trial balance" },
  "ar-audit-allowance-b":            { docKey: "auditProcedures", sectionIdx: 2, match: "Allowance for doubtful accounts — b. For all significant or material accounts over 90 days" },
  "ar-audit-existence-validate":     { docKey: "auditProcedures", sectionIdx: 3, match: "Validation of accounts receivable — Determine what" },
  "ar-audit-existence-confirmation": { docKey: "auditProcedures", sectionIdx: 3, match: "Validation — Confirmation: Where confirmations are deemed to be effective" },
  "ar-audit-completeness-subsequent":{ docKey: "auditProcedures", sectionIdx: 1, match: "Subsequent receipts testing — Based on the assessment of the risks" },
  "ar-audit-existence-alternative":  { docKey: "auditProcedures", sectionIdx: 3, match: "Validation — Alternative to confirmation: Where a significant amount of time has elapsed" },
};

const ARCONF_MATCHES: Record<string, { match: string }> = {
  "arconf-agree-gl":         { match: "Obtain a copy of the accounts receivable sub-ledger/trial balance as at the confirmation date — a. Agree the balances to general ledger" },
  "arconf-identify-large":   { match: "Obtain a copy of the accounts receivable sub-ledger — b. Identify the large and unusual items" },
  "arconf-select-sample":    { match: "Obtain a copy of the accounts receivable sub-ledger — c. Select a sample of accounts receivable invoices or balances for confirmation" },
  "arconf-document-sample":  { match: "Obtain a copy of the accounts receivable sub-ledger — d. Document how the sample of accounts receivable was chosen" },
  "arconf-prepare-requests": { match: "Prepare the confirmation requests and maintain control" },
  "arconf-second-request":   { match: "Second request — After" },
  "arconf-differences":      { match: "Differences — When confirmation replies indicate that a difference exists" },
  "arconf-alternative":      { match: "Alternative procedures — Where confirmations are not returned or results are not satisfactory" },
  "arconf-statistics":       { match: "Complete confirmation statistics summary" },
};

type RowSetter = (docKey: DocKey, sectionIdx: number, rowId: string, field: keyof ARRow, value: string | RefDoc[]) => void;

const TD = "border-b border-border px-3 py-2.5 text-sm align-top";

const PROC_DOCS = [
  { id: "proc-doc-1", name: "Bank Statement — RBC Dec 2024" },
  { id: "proc-doc-2", name: "General Ledger Export" },
  { id: "proc-doc-3", name: "Bank Confirmation Letter" },
  { id: "proc-doc-4", name: "Trial Balance — Dec 2024" },
  { id: "proc-doc-5", name: "Accounts Receivable Aging Report" },
  { id: "proc-doc-6", name: "Management Representation Letter" },
  { id: "proc-doc-7", name: "Invoices Sample — Oct-Dec 2024" },
  { id: "proc-doc-8", name: "AR Confirmation Letters — Dec 2024" },
  { id: "proc-doc-9", name: "Company Policy.pdf" },
  { id: "proc-doc-10", name: "Compliance Checklist.xlsx" },
];

function AddReferenceModal({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (docs: RefDoc[]) => void;
}) {
  const [section, setSection] = useState<"left" | "right">("left");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RefDoc[]>([]);

  useEffect(() => {
    if (open) { setSection("left"); setSearch(""); setSelected([]); }
  }, [open]);

  const filtered = PROC_DOCS.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const isSelected = (id: string) => selected.some(s => s.id === id);

  function toggleDoc(doc: { id: string; name: string }) {
    setSelected(prev =>
      prev.some(s => s.id === doc.id)
        ? prev.filter(s => s.id !== doc.id)
        : [...prev, { id: doc.id, name: doc.name }]
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reference</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Section Type</p>
            <div className="flex gap-6">
              {(["left", "right"] as const).map(s => (
                <div key={s} className="flex items-center gap-2 cursor-pointer" onClick={() => setSection(s)}>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${section === s ? "border-primary" : "border-muted-foreground/40"}`}>
                    {section === s && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm">{s === "left" ? "Left Section" : "Right Section"}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Document</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9 text-sm" />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0
              ? <p className="text-sm text-muted-foreground p-3 text-center">No documents found.</p>
              : filtered.map(d => (
                  <button key={d.id} onClick={() => toggleDoc(d)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${isSelected(d.id) ? "bg-primary/10" : "hover:bg-muted"}`}
                  >
                    <Checkbox checked={isSelected(d.id)} className="h-4 w-4 pointer-events-none" />
                    <span className="truncate">{d.name}</span>
                  </button>
                ))
            }
          </div>
          {selected.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Selected References ({selected.length})</p>
              <div className="flex flex-wrap gap-1">
                {selected.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-xs text-primary">
                    {s.name}
                    <button onClick={() => setSelected(prev => prev.filter(p => p.id !== s.id))} className="hover:text-destructive ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onAdd(selected); onClose(); }} disabled={selected.length === 0}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProcTable({ docKey, sections, locked, onRowField, onToggleHidden, onDeleteRow, lukaHighlightMatches, onLukaRowToggle }: {
  docKey: DocKey;
  sections: ARSection[];
  locked: boolean;
  onRowField: RowSetter;
  onToggleHidden: (docKey: DocKey, sectionIdx: number, rowId: string) => void;
  onDeleteRow: (docKey: DocKey, sectionIdx: number, rowId: string) => void;
  lukaHighlightMatches?: string[];
  onLukaRowToggle?: (description: string, sectionIdx: number) => void;
}) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [refModal, setRefModal] = useState<{ sectionIdx: number; rowId: string } | null>(null);

  const allVisible = sections.flatMap(s => s.rows.filter(r => !r.hidden));
  const allChecked = allVisible.length > 0 && allVisible.every(r => selectedRows.has(r.id));

  type HiddenEntry = { row: ARRow; sectionIdx: number; sectionTitle: string };
  const hiddenRows: HiddenEntry[] = sections.flatMap((s, si) =>
    s.rows.filter(r => r.hidden).map(r => ({ row: r, sectionIdx: si, sectionTitle: s.title }))
  );

  const modalRow = refModal
    ? sections[refModal.sectionIdx]?.rows.find(r => r.id === refModal.rowId) ?? null
    : null;

  function hideSelected() {
    const targets = new Map<string, number>();
    sections.forEach((s, si) => {
      s.rows.forEach(r => {
        if (!r.hidden && selectedRows.has(r.id)) targets.set(r.id, si);
      });
    });
    targets.forEach((si, rowId) => onToggleHidden(docKey, si, rowId));
    setSelectedRows(new Set());
  }

  function deleteSelected() {
    const targets = new Map<string, number>();
    sections.forEach((s, si) => {
      s.rows.forEach(r => {
        if (!r.hidden && selectedRows.has(r.id)) targets.set(r.id, si);
      });
    });
    targets.forEach((si, rowId) => onDeleteRow(docKey, si, rowId));
    setSelectedRows(new Set());
  }

  return (
    <>
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20 bg-primary/[0.05] text-sm">
          <span className="font-medium">{selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""} selected</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={hideSelected}>
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </Button>
            <Button variant="secondary" size="sm" onClick={deleteSelected} className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:border-destructive/60 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedRows(new Set())} title="Clear selection" className="px-2">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-3 py-2.5 border-b border-border w-[44px] text-center">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={c => {
                    const next = new Set<string>();
                    if (c) allVisible.forEach(r => next.add(r.id));
                    setSelectedRows(next);
                  }}
                  className="h-4 w-4"
                />
              </th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[140px]">Nature</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[150px]">Type</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[300px]">Description</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[300px]">Comments</th>
              <th className="text-center px-3 py-2.5 font-medium border-b border-border w-[80px]">W/P Ref</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border w-[120px]">Status</th>
              <th className="text-center px-3 py-2.5 font-medium border-b border-border w-[72px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s, si) => (
              <Fragment key={`${docKey}-s-${si}`}>
                <tr className="bg-primary/[0.06]">
                  <td colSpan={8} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary border-b border-border">{s.title}</td>
                </tr>
                {s.rows.filter(r => !r.hidden).map(r => {
                  const isLukaHighlighted = lukaHighlightMatches?.some(m => r.description.includes(m)) ?? false;
                  return (
                  <tr
                    key={r.id}
                    className={`hover:bg-muted/20 ${selectedRows.has(r.id) ? "bg-primary/[0.04]" : ""} ${isLukaHighlighted ? "bg-violet-200/60 dark:bg-violet-900/30" : ""} ${onLukaRowToggle ? "cursor-pointer" : ""}`}
                    onClick={onLukaRowToggle ? () => onLukaRowToggle(r.description, si) : undefined}
                  >
                    <td className={`${TD} text-center`}>
                      <Checkbox
                        checked={selectedRows.has(r.id)}
                        onCheckedChange={c => {
                          setSelectedRows(prev => {
                            const next = new Set(prev);
                            if (c) next.add(r.id); else next.delete(r.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={TD}>
                      <Select disabled={locked} value={r.nature} onValueChange={v => onRowField(docKey, si, r.id, "nature", v)}>
                        <SelectTrigger className="h-8 text-sm min-w-0"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Required" className="text-sm">Required</SelectItem>
                          <SelectItem value="Optional" className="text-sm">Optional</SelectItem>
                          <SelectItem value="Additional Procedure" className="text-sm">Additional Procedure</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={TD}>
                      <Select disabled={locked} value={r.type} onValueChange={v => onRowField(docKey, si, r.id, "type", v)}>
                        <SelectTrigger className="h-8 text-sm min-w-0"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inquiries" className="text-sm">Inquiries</SelectItem>
                          <SelectItem value="Analytics" className="text-sm">Analytics</SelectItem>
                          <SelectItem value="Observation" className="text-sm">Observation</SelectItem>
                          <SelectItem value="Inspection" className="text-sm">Inspection</SelectItem>
                          <SelectItem value="Recalculation" className="text-sm">Recalculation</SelectItem>
                          <SelectItem value="Other" className="text-sm">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={TD}><span className="block whitespace-pre-wrap leading-snug">{r.description}</span></td>
                    <td className={TD}>
                      <div className="flex items-start gap-1.5">
                        <GreenDot show={!!r.comments} />
                        <Textarea
                          disabled={locked}
                          value={r.comments}
                          onChange={e => onRowField(docKey, si, r.id, "comments", e.target.value)}
                          className="min-h-[56px] text-sm resize-none flex-1"
                          placeholder="—"
                        />
                      </div>
                    </td>
                    <td className={`${TD} text-center`}>
                      <div className="flex items-start gap-1.5">
                        <GreenDot show={r.wpRef != null && r.wpRef.length > 0} />
                        <RefButton
                          reference={r.wpRef}
                          disabled={locked}
                          onAttach={doc => onRowField(docKey, si, r.id, "wpRef", [...r.wpRef, doc])}
                          onRemove={idx => onRowField(docKey, si, r.id, "wpRef", r.wpRef.filter((_, j) => j !== (idx ?? -1)))}
                        />
                      </div>
                    </td>
                    <td className={TD}>
                      <span className="text-sm text-muted-foreground px-1">—</span>
                    </td>
                    <td className={`${TD} text-center`}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => setRefModal({ sectionIdx: si, rowId: r.id })}
                          disabled={locked}
                          title="Add Reference"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <FilePlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onToggleHidden(docKey, si, r.id)}
                          disabled={locked}
                          title="Hide row"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenRows.length > 0 && (
        <div className="border-t border-border">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30">
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hidden Rows ({hiddenRows.length})
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => hiddenRows.forEach(({ row, sectionIdx }) => onToggleHidden(docKey, sectionIdx, row.id))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
                <RotateCcw className="h-3 w-3" /> Restore All
              </button>
              <button onClick={() => hiddenRows.forEach(({ row, sectionIdx }) => onDeleteRow(docKey, sectionIdx, row.id))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors">
                <Trash2 className="h-3 w-3" /> Delete All
              </button>
            </div>
          </div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {hiddenRows.map(({ row, sectionIdx, sectionTitle }) => (
                <tr key={row.id} className="border-b border-border/50 bg-muted/10">
                  <td className="px-3 py-2 text-sm text-muted-foreground" colSpan={6}>
                    <span className="italic">{row.description || "(empty)"}</span>
                    <span className="ml-2 text-xs opacity-60">— {sectionTitle}</span>
                  </td>
                  <td className="px-3 py-2" colSpan={2}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onToggleHidden(docKey, sectionIdx, row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => onDeleteRow(docKey, sectionIdx, row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refModal && modalRow && (
        <AddReferenceModal
          open={true}
          onClose={() => setRefModal(null)}
          onAdd={docs => {
            onRowField(docKey, refModal.sectionIdx, refModal.rowId, "wpRef", [...(modalRow.wpRef ?? []), ...docs]);
          }}
        />
      )}
    </>
  );
}

function useARStore() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const storageKey = `audit-ar-v1-${engagementId ?? "global"}`;

  const [data, setData] = useState<DataAR>(() =>
    readJsonFromLocalStorage<DataAR>(storageKey, buildDefault()) ?? buildDefault()
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, storageKey]);

  function handleRowField(docKey: DocKey, sectionIdx: number, rowId: string, field: keyof ARRow, value: string | RefDoc[]) {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as ARSection[]).map((s, si) =>
        si !== sectionIdx ? s : {
          ...s,
          rows: s.rows.map(r => r.id !== rowId ? r : {...r, [field]: value }),
        }
      ),
    }));
  }

  function addRow(docKey: DocKey, sectionIdx: number) {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as ARSection[]).map((s, si) =>
        si !== sectionIdx ? s : {...s, rows: [...s.rows, mkRow("Optional", "", "")] }
      ),
    }));
  }

  function conclude() {
    setData(d => ({...d, concluded: true, concludedOn: new Date().toISOString() }));
  }
  function reopen() {
    setData(d => ({...d, concluded: false, concludedOn: "" }));
  }

  function toggleHidden(docKey: DocKey, sectionIdx: number, rowId: string) {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as ARSection[]).map((s, si) =>
        si !== sectionIdx ? s : {
          ...s,
          rows: s.rows.map(r => r.id !== rowId ? r : {...r, hidden: !r.hidden }),
        }
      ),
    }));
  }

  function deleteRow(docKey: DocKey, sectionIdx: number, rowId: string) {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as ARSection[]).map((s, si) =>
        si !== sectionIdx ? s : {...s, rows: s.rows.filter(r => r.id !== rowId) },
      ),
    }));
  }

  const ctx = getEngagementContext(engagementId);
  const fmtAmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const arFsa = ctx.fsas.find(f => f.fsa === "Accounts Receivable");
  const lsAccountBalance = arFsa ? fmtAmt(arFsa.amount) : "";
  const materiality = ctx.overallMateriality ? fmtAmt(ctx.overallMateriality) : "";

  function lukaApplyWorkPapersAR(rowIds: string[]) {
    const rowConfigs: Record<string, { docKey: DocKey; sectionIdx: number; match: string; wpName: string; comment: string }> = {
      "ar-audit-basic-obtain": {
        docKey: "auditProcedures", sectionIdx: 0,
        match: "Preparation — Obtain a detailed (and aged) listing",
        wpName: "B-1 AR Audit Procedures",
        comment: `Luka: AR aged trial balance obtained from Xero (A/R Aging Summary, Dec 31, 2025). Total: ${lsAccountBalance}. Agreed to GL acct #1200. Current $1,240,000 (69%), 31–60 days $310,000 (17%), 61–90 days $180,000 (10%), >90 days $70,000 (4%). ✓`,
      },
      "ar-audit-accuracy-check": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Accuracy of listing and aging — Check arithmetic accuracy of the accounts receivable listing (adds and cross-adds) and agree to the general ledger balance",
        wpName: "B-1 AR Audit Procedures",
        comment: `Luka: Aging subtotals verified: $1,240,000 + $310,000 + $180,000 + $70,000 = ${lsAccountBalance}. Agreed to Xero GL acct #1200 at Dec 31, 2025. No discrepancy. ✓`,
      },
      "ar-audit-existence-unusual": {
        docKey: "auditProcedures", sectionIdx: 3,
        match: "Unusual or large balances — Review the composition of the sub-ledger balances",
        wpName: "B-1 AR Audit Procedures",
        comment: "Luka: Sub-ledger reviewed. Balances above $100,000 flagged: Kestrel Manufacturing $285,000, Southfield Group $210,000, Bellmore Industries $175,000. No even-dollar amounts, fictitious names, or undisclosed related parties. All 3 selected for confirmation (see B-2). ✓",
      },
      "ar-audit-allowance-a": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Allowance for doubtful accounts — a. Review the aged accounts receivable trial balance",
        wpName: "B-1 AR Audit Procedures",
        comment: `Luka: Aged AR trial balance reviewed vs. Dec 31, 2024 ($1,620,000). Current year increase $180,000 (+11%). Post year-end receipts Jan 1–31, 2026: $940,000 (52% of ${lsAccountBalance}). Management allowance: $35,000 (applied to >90 day bucket). ✓`,
      },
      "ar-audit-allowance-b": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Allowance for doubtful accounts — b. For all significant or material accounts over 90 days",
        wpName: "B-1 AR Audit Procedures",
        comment: "Luka: >90 day balances: 4 invoices totalling $70,000 (Aug–Sep 2025). Northfield Supply Ltd $45,000 — payment arrangement in place, $15,000 received Jan 15, 2026. Orion Tech Inc $25,000 — disputed invoice, under review. Management specific allowance $35,000 documented. ✓",
      },
      "ar-audit-existence-validate": {
        docKey: "auditProcedures", sectionIdx: 3,
        match: "Validation of accounts receivable — Determine what",
        wpName: "B-2 Confirmation Procedures",
        comment: `Luka: Positive confirmations selected for balances >$100,000 (3 items, $670,000, 37% of ${lsAccountBalance}). Alternative procedures (subsequent receipts) applied to remaining 63%. See B-2. ✓`,
      },
      "ar-audit-existence-confirmation": {
        docKey: "auditProcedures", sectionIdx: 3,
        match: "Validation — Confirmation: Where confirmations are deemed to be effective",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Positive confirmation letters prepared for Kestrel Manufacturing ($285,000), Southfield Group ($210,000), Bellmore Industries ($175,000). Mailed Jan 8, 2026. C.110 procedures initiated. See B-2. ✓",
      },
      "ar-audit-completeness-subsequent": {
        docKey: "auditProcedures", sectionIdx: 1,
        match: "Subsequent receipts testing — Based on the assessment of the risks",
        wpName: "B-1 AR Audit Procedures",
        comment: `Luka: Xero payment listing Jan 1–31, 2026 obtained. Total receipts $940,000 matched to Dec 31, 2025 AR invoices. Coverage 52% of ${lsAccountBalance}. No invoices identified where revenue should have been recognized in a prior period. ✓`,
      },
      "ar-audit-existence-alternative": {
        docKey: "auditProcedures", sectionIdx: 3,
        match: "Validation — Alternative to confirmation: Where a significant amount of time has elapsed",
        wpName: "B-1 AR Audit Procedures",
        comment: `Luka: For balances <$100,000 ($1,130,000 / 63% of ${lsAccountBalance}), subsequent receipts extended to Feb 28, 2026. Receipts applied: $840,000 (74% coverage). Remaining unpaid ($290,000) — management explanations obtained. No material misstatement identified. ✓`,
      },
    };
    setData(d => {
      let updated = { ...d };
      for (const rowId of rowIds) {
        const cfg = rowConfigs[rowId];
        if (!cfg) continue;
        const ref: RefDoc = { id: rowId, name: cfg.wpName };
        updated = {
          ...updated,
          [cfg.docKey]: (updated[cfg.docKey] as ARSection[]).map((s, si) =>
            si !== cfg.sectionIdx ? s : {
              ...s,
              rows: s.rows.map(r =>
                r.description.includes(cfg.match) && !r.wpRef.some(w => w.id === rowId)
                  ? { ...r, wpRef: [...r.wpRef, ref], comments: r.comments || cfg.comment }
                  : r
              ),
            }
          ),
        };
      }
      return updated;
    });
  }

  function lukaApplyWorkPapersARConf(rowIds: string[]) {
    const rowConfigs: Record<string, { match: string; wpName: string; comment: string }> = {
      "arconf-agree-gl": {
        match: "Obtain a copy of the accounts receivable sub-ledger/trial balance as at the confirmation date — a. Agree the balances to general ledger",
        wpName: "B-2 Confirmation Procedures",
        comment: `Luka: AR subledger as at Jan 8, 2026 (confirmation date) agreed to Xero GL acct #1200. Total: ${lsAccountBalance}. No reconciling items. ✓`,
      },
      "arconf-identify-large": {
        match: "Obtain a copy of the accounts receivable sub-ledger — b. Identify the large and unusual items",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Large balances (>$100,000): Kestrel Manufacturing $285,000, Southfield Group $210,000, Bellmore Industries $175,000. All three selected for positive confirmation. No fictitious names or undisclosed related parties noted. ✓",
      },
      "arconf-select-sample": {
        match: "Obtain a copy of the accounts receivable sub-ledger — c. Select a sample of accounts receivable invoices or balances for confirmation",
        wpName: "B-2 Confirmation Procedures",
        comment: `Luka: 3 positive confirmations selected — all balances >$100,000, totalling $670,000 (37% of ${lsAccountBalance}). Judgmental selection — all material items included. ✓`,
      },
      "arconf-document-sample": {
        match: "Obtain a copy of the accounts receivable sub-ledger — d. Document how the sample of accounts receivable was chosen",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Judgmental selection — all balances >$100,000 (3 items) confirmed. Remaining 63% covered by subsequent receipts testing (see B-1). No monetary unit sampling applied given small population. ✓",
      },
      "arconf-prepare-requests": {
        match: "Prepare the confirmation requests and maintain control",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Positive confirmation letters prepared on firm letterhead for all 3 debtors. Letters include debtor name/address, Dec 31, 2025 balance, and instruction to reply directly to audit firm. Mailed Jan 8, 2026 via registered mail. Copies on file. ✓",
      },
      "arconf-second-request": {
        match: "Second request — After",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Second request mailed Jan 22, 2026 (14 days after first request) to Kestrel Manufacturing ($285,000), the sole non-respondent. Southfield Group and Bellmore Industries had already replied. ✓",
      },
      "arconf-differences": {
        match: "Differences — When confirmation replies indicate that a difference exists",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Southfield Group reply indicated difference of $8,400 — credit note (CN-2025-0847, Dec 28, 2025) not yet applied by client. Management confirmed and credit note located in Xero. Balance adjusted. No fraud indicators. ✓",
      },
      "arconf-alternative": {
        match: "Alternative procedures — Where confirmations are not returned or results are not satisfactory",
        wpName: "B-2 Confirmation Procedures",
        comment: "Luka: Kestrel Manufacturing ($285,000) did not respond after two requests. Alternative procedures: (a) subsequent payment of $285,000 confirmed received Feb 3, 2026 (deposit slip obtained); (b) underlying invoices INV-5841 to INV-5847 agreed to shipping records. Balance confirmed valid. ✓",
      },
      "arconf-statistics": {
        match: "Complete confirmation statistics summary",
        wpName: "B-2 Confirmation Procedures",
        comment: `Luka: Confirmation statistics — Items selected: 3 ($670,000 / 37% of ${lsAccountBalance}). Responses received: 2 of 3 (67%). Differences: 1 ($8,400 — explained). Alternative procedures: 1 (Kestrel $285,000 — confirmed by subsequent receipt). Conclusion: No material misstatements identified. ✓`,
      },
    };
    setData(d => {
      let updated = { ...d };
      for (const rowId of rowIds) {
        const cfg = rowConfigs[rowId];
        if (!cfg) continue;
        const ref: RefDoc = { id: rowId, name: cfg.wpName };
        updated = {
          ...updated,
          confirmationProcedures: (updated.confirmationProcedures as ARSection[]).map((s, si) =>
            si !== 0 ? s : {
              ...s,
              rows: s.rows.map(r =>
                r.description.includes(cfg.match) && !r.wpRef.some(w => w.id === rowId)
                  ? { ...r, wpRef: [...r.wpRef, ref], comments: r.comments || cfg.comment }
                  : r
              ),
            }
          ),
        };
      }
      return updated;
    });
  }

  return { data, locked: data.concluded, engagementId, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersAR, lukaApplyWorkPapersARConf };
}

const INFO_CARD = "bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden p-6";

function ARInfoBlock({ lsAccountBalance, materiality }: { lsAccountBalance: string; materiality: string }) {
  return (
    <div className={INFO_CARD}>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">LS Name</label>
          <Select disabled value="B Accounts Receivable">
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="B Accounts Receivable" className="text-sm">B Accounts Receivable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">LS Account Balance</label>
          <Input disabled value={lsAccountBalance} className="h-8 text-sm" placeholder="Automated" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Materiality</label>
          <Input disabled value={materiality} className="h-8 text-sm" placeholder="Automated" />
        </div>
      </div>
    </div>
  );
}

export function AuditARWorksheet() {
  const { data, locked, engagementId, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersAR } = useARStore();
  const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
  const [lukaState, setLukaState] = useState<"idle" | "loading" | "done">("idle");
  const [selectedWorkPapers, setSelectedWorkPapers] = useState<Set<number>>(new Set());
  const [lukaSelecting, setLukaSelecting] = useState(false);
  const [lukaRowSelectIds, setLukaRowSelectIds] = useState<Set<string>>(new Set());

  const lukaHighlightMatches = lukaSelecting
    ? Array.from(lukaRowSelectIds).map(id => AR_AUDIT_MATCHES[id]?.match).filter((m): m is string => !!m)
    : undefined;

  function handleLukaRowToggle(description: string, _sectionIdx: number) {
    const entry = Object.entries(AR_AUDIT_MATCHES).find(([, cfg]) => description.includes(cfg.match));
    if (!entry) return;
    const [lukaId] = entry;
    setLukaRowSelectIds(prev => {
      const next = new Set(prev);
      next.has(lukaId) ? next.delete(lukaId) : next.add(lukaId);
      return next;
    });
  }

  return (
    <WorksheetLayout
      heading="B Accounts Receivable > Audit Procedures"
      onAdd={locked ? undefined : () => addRow("auditProcedures", 5)}
      objective="To respond appropriately to assessed risks at the assertion level through the design and performance of further audit procedures for accounts receivable, trade and other."
      banner={isDemoEngagement ? (
        <LukaWorkPaperPanel
          worksheetId="gca-ws-proc-ar"
          procData={DEMO_LUKA_PROC_ACTIONS["gca-ws-proc-ar"]}
          lukaState={lukaState}
          selectedIds={selectedWorkPapers}
          onSelectionChange={setSelectedWorkPapers}
          selecting={lukaSelecting}
          rowSelectIds={lukaRowSelectIds}
          onSelectingChange={setLukaSelecting}
          onRowSelectIdsChange={setLukaRowSelectIds}
          onInitiate={(rowIds) => { setLukaSelecting(false); setLukaState("loading"); setTimeout(() => { lukaApplyWorkPapersAR(rowIds); setLukaState("done"); }, 2600); }}
        />
      ) : undefined}
    >
      <ARInfoBlock lsAccountBalance={lsAccountBalance} materiality={materiality} />

      <WorksheetSection title="Audit Procedures" bodyClassName="p-0">
        <ProcTable
          docKey="auditProcedures"
          sections={data.auditProcedures}
          locked={locked}
          onRowField={handleRowField}
          onToggleHidden={toggleHidden}
          onDeleteRow={deleteRow}
          lukaHighlightMatches={lukaHighlightMatches}
          onLukaRowToggle={lukaSelecting ? handleLukaRowToggle : undefined}
        />
      </WorksheetSection>

      <ConcludeBar worksheetKey="audit-ar" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn} onConclude={conclude} onReopen={reopen} />
    </WorksheetLayout>
  );
}

export function AuditARConfirmationWorksheet() {
  const { data, locked, engagementId, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersARConf } = useARStore();
  const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
  const [lukaState, setLukaState] = useState<"idle" | "loading" | "done">("idle");
  const [selectedWorkPapers, setSelectedWorkPapers] = useState<Set<number>>(new Set());
  const [lukaSelecting, setLukaSelecting] = useState(false);
  const [lukaRowSelectIds, setLukaRowSelectIds] = useState<Set<string>>(new Set());

  const lukaHighlightMatches = lukaSelecting
    ? Array.from(lukaRowSelectIds).map(id => ARCONF_MATCHES[id]?.match).filter((m): m is string => !!m)
    : undefined;

  function handleLukaRowToggle(description: string, _sectionIdx: number) {
    const entry = Object.entries(ARCONF_MATCHES).find(([, cfg]) => description.includes(cfg.match));
    if (!entry) return;
    const [lukaId] = entry;
    setLukaRowSelectIds(prev => {
      const next = new Set(prev);
      next.has(lukaId) ? next.delete(lukaId) : next.add(lukaId);
      return next;
    });
  }

  return (
    <WorksheetLayout
      heading="B Accounts Receivable > Confirmation Procedures"
      onAdd={locked ? undefined : () => addRow("confirmationProcedures", 0)}
      objective="Perform accounts receivable confirmation procedures to obtain sufficient appropriate audit evidence regarding the existence and accuracy of recorded receivable balances."
      banner={isDemoEngagement ? (
        <LukaWorkPaperPanel
          worksheetId="gca-ws-proc-ar-conf"
          procData={DEMO_LUKA_PROC_ACTIONS["gca-ws-proc-ar-conf"]}
          lukaState={lukaState}
          selectedIds={selectedWorkPapers}
          onSelectionChange={setSelectedWorkPapers}
          selecting={lukaSelecting}
          rowSelectIds={lukaRowSelectIds}
          onSelectingChange={setLukaSelecting}
          onRowSelectIdsChange={setLukaRowSelectIds}
          onInitiate={(rowIds) => { setLukaSelecting(false); setLukaState("loading"); setTimeout(() => { lukaApplyWorkPapersARConf(rowIds); setLukaState("done"); }, 2600); }}
        />
      ) : undefined}
    >
      <ARInfoBlock lsAccountBalance={lsAccountBalance} materiality={materiality} />

      <WorksheetSection title="C.110 · Confirmation Supplementary Procedures" bodyClassName="p-0">
        <ProcTable
          docKey="confirmationProcedures"
          sections={data.confirmationProcedures}
          locked={locked}
          onRowField={handleRowField}
          onToggleHidden={toggleHidden}
          onDeleteRow={deleteRow}
          lukaHighlightMatches={lukaHighlightMatches}
          onLukaRowToggle={lukaSelecting ? handleLukaRowToggle : undefined}
        />
      </WorksheetSection>

      <ConcludeBar worksheetKey="audit-ar" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn} onConclude={conclude} onReopen={reopen} />
    </WorksheetLayout>
  );
}
