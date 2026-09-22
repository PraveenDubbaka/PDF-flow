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
type RowStatus = "Complete" | "N/A" | "";

interface CashRow {
  id: string;
  nature: Nature;
  type: ProcType;
  description: string;
  comments: string;
  wpRef: RefDoc[];
  status: RowStatus;
  hidden?: boolean;
}

interface CashSection {
  title: string;
  rows: CashRow[];
}

interface DataCash {
  lsName: string;
  lsAccountBalance: string;
  materiality: string;
  auditProcedures: CashSection[];
  cashCountProcedures: CashSection[];
  bankRecProcedures: CashSection[];
  concluded: boolean;
  concludedOn: string;
}

function mkRow(nature: Nature, type: ProcType, description: string): CashRow {
  return { id: Math.random().toString(36).slice(2, 11), nature, type, description, comments: "", wpRef: [], status: "" };
}

function buildDefault(): DataCash {
  return {
    lsName: "",
    lsAccountBalance: "",
    materiality: "",

    auditProcedures: [
      {
        title: "BASIC",
        rows: [
          mkRow("Required", "Inspection", "Preparation — Obtain details of cash and bank balances at the period end and agree it to the general ledger."),
          mkRow("Required", "Inspection", "Preparation — Obtain details of, and document, any covenants, withdrawal restrictions or minimum balance requirements regarding the use or withdrawal of cash and cash equivalents."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Review the assessed risks being addressed by this audit plan (by assertion) and ensure the planned procedures (including relevant procedures contained in other audit programs) provide an appropriate response."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Review the identified estimates, and ensure that the planned procedures (including the relevant procedures) provide an appropriate response."),
          mkRow("Required", "Inspection", "Finalize the audit plan — Where necessary, add additional audit procedures, change existing procedures and eliminate redundant procedures."),
          mkRow("Required", "Analytics", "Analytical procedures — Develop and document expectations for cash balances based on information obtained from understanding the entity. Investigate and document significant variances between the expectations developed and the actual cash balances."),
          mkRow("Required", "Analytics", "Analytical procedures — Cash and cash equivalents balance compared to the previous period."),
          mkRow("Required", "Analytics", "Analytical procedures — The reasonableness of interest paid/received on a month-to-month or quarterly basis."),
          mkRow("Required", "Inquiries", "Accounting policies — Have there been any changes to accounting policies affecting cash balances for this period? If so, describe the reasons why."),
          mkRow("Required", "Inquiries", "Accounting policies — Ensure the accounting policies in use are appropriate and consistently applied."),
        ],
      },
      {
        title: "COMPLETENESS",
        rows: [
          mkRow("Required", "Inquiries", "Unrecorded cash and bank accounts — Ask personnel familiar with or handling cash transactions whether they are aware of any cash balances or bank accounts that are not recorded in the accounting records."),
          mkRow("Required", "Inquiries", "Unrecorded cash and bank accounts — Review correspondence or other evidence available to ensure that accounts used in previous periods have indeed been closed."),
          mkRow("Required", "Inquiries", "Unrecorded cash transactions — Ask personnel familiar with or handling cash transactions whether they are aware of any unrecorded cash transfers, receipts or expenditures (such as cash in unrecorded loan, cash in transit or cash held in a safe)."),
          mkRow("Required", "Inquiries", "Unrecorded cash transactions — Based on our understanding of the entity and assessment of risks, design risk-specific procedures (as necessary) to respond to the potential for unrecorded cash transactions as a result of fraud."),
          mkRow("Required", "Inquiries", "Significant cash transactions — Identify the nature and extent of cash transactions (cash deposits and payments) through inquiry, review of cash deposits, cash disbursements and any cheques made out to cash."),
          mkRow("Required", "Inquiries", "Significant cash transactions — Count the material cash funds or undeposited receipts at, or close to, period end. If counting is not possible, examine other evidence (such as deposits, invoices or vouchers) in the subsequent period to validate the existence of the cash balance at period end."),
          mkRow("Required", "Inquiries", "Significant cash transactions — Understand the rationale for the extent of such transactions and ensure they were properly authorized."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "Analytics", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "", "Sampling procedures — Tests of details. Tests of controls (Where appropriate -). Select a sample of _______ and ensure ________"),
        ],
      },
      {
        title: "ACCURACY / VALUATION",
        rows: [
          mkRow("Required", "Inspection", "Bank reconciliations — Review the reconciliations for accuracy and agree balances to bank statements and the accounting records."),
          mkRow("Required", "Inspection", "Bank reconciliations — Ensure there are no stale-dated cheques included."),
          mkRow("Required", "Inspection", "Bank reconciliations — Obtain explanations for very large, any old or unusual items. Also consider the procedures on Form A.110."),
          mkRow("Required", "Inquiries", "Compliance with agreements and restrictions — Review compliance with any bank covenants, withdrawal restrictions or minimum balance requirements during the period."),
          mkRow("Required", "Inquiries", "Compliance with agreements and restrictions — Document any violations and plans (if any) for their resolution. Also consider the impact on the entity (i.e., going concern), the need for note disclosure and the need to confirm management representations received directly with the lending institution."),
          mkRow("Required", "Inspection", "Classification — Ensure that cheques prepared but unissued at the period end are reclassified (if material) as accounts payable, rather than outstanding cheques, for financial statement purposes."),
          mkRow("Required", "Inspection", "Cut-off — Document the entity's procedures to ensure cash receipts and disbursements are recorded in the correct accounting period."),
          mkRow("Required", "Inspection", "Cut-off — Select cash receipts and cash disbursements, both before and after the period end, and ensure the transactions were recorded in the appropriate period. (In determining the extent of this procedure, consider the work performed in other parts of the transaction stream.)"),
          mkRow("Required", "Inspection", "Bank transfers — Identify and document transfers between bank accounts, including those with branches or component entities, for five days before and after period end. Ensure both sides of these transfers have been recorded on the same day."),
          mkRow("Required", "Inspection", "Translation — Ensure all cash and bank balances in other currencies have been translated into Canadian funds at the appropriate period-end exchange rate."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "Analytics", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "", "Sampling procedures — Tests of details. Tests of controls (Where appropriate -). Select a sample of _______ and ensure ________"),
        ],
      },
      {
        title: "EXISTENCE",
        rows: [
          mkRow("Required", "Inquiries", "Validity — Select bank accounts to confirm the period-end balance directly with the bank. Consider size of balance, number of transactions and any fraud risk identified."),
          mkRow("Required", "Inquiries", "Validity — Send out bank confirmation for all accounts selected and agree details to the bank reconciliations. Ensure control of the confirmation process is maintained and verify confirmation details (e.g., contact name, address and fax number)."),
          mkRow("Required", "Inquiries", "Validity — For accounts not confirmed, perform alternative procedures (such as reviewing copies of bank statements, correspondence, cheques and deposits). Count any material cash balances."),
          mkRow("Optional", "", "Risk-specific procedures — Insert procedures as required."),
          mkRow("Optional", "Analytics", "Substantive analytical procedures — Insert procedures as required."),
          mkRow("Optional", "", "Sampling procedures — Tests of details. Tests of controls (Where appropriate -). Select a sample of _______ and ensure _______"),
        ],
      },
      {
        title: "PRESENTATION",
        rows: [
          mkRow("Required", "Inspection", "Classification — Have the balances been appropriately classified, aggregated or disaggregated and characterized in accordance with the applicable financial reporting framework?"),
          mkRow("Required", "Inspection", "Disclosures — Do the notes to the financial statements include disclosures required by the applicable financial reporting framework? (See FRF 900 series of forms for additional guidance.)"),
          mkRow("Required", "Inspection", "Relevant information — Has the overall presentation of the financial statements been undermined by including information that is not relevant or that obscures a proper understanding of the matters disclosed?"),
        ],
      },
      {
        title: "OTHER",
        rows: [
          mkRow("Optional", "", "Other procedures (specify)"),
        ],
      },
      {
        title: "AUDIT PLAN COMPLETION",
        rows: [
          mkRow("Required", "", "An appropriate level of professional skepticism was used in evaluating audit evidence obtained."),
          mkRow("Required", "Inquiries", "Management bias — Evaluate whether any of management's judgments or decisions (either individually or as a whole) are indicators of possible management bias. Where indicators of possible management bias are identified, record the risk and evaluate the implications for the audit."),
          mkRow("Required", "", "Misstatements identified (other than those deemed trivial) have been recorded or equivalent."),
          mkRow("Required", "", "New risk factors identified (and revised assessments of existing risks) were documented, assessed (such as on Forms 520 or 590) and addressed through the procedures performed above."),
        ],
      },
      {
        title: "AUDIT CONCLUSIONS",
        rows: [
          mkRow("Required", "", "The audit evidence obtained is sufficient and appropriate to reduce the risk of material misstatement to an acceptably low level."),
        ],
      },
    ],

    cashCountProcedures: [
      {
        title: "CASH ON HAND",
        rows: [
          mkRow("Required", "Observation", "Cash on hand — Identify the sources of cash that are or should be on the entity's premises, in transit or at other locations. Also consider any fraud risk identified that could affect cash balances."),
          mkRow("Required", "Observation", "Cash on hand — Determine what cash funds should be counted. Consider performing some counts on a surprise basis."),
        ],
      },
      {
        title: "CASH COUNTS",
        rows: [
          mkRow("Required", "Observation", "Cash counts — For funds selected to be counted, ensure the count is performed in the presence of the custodian who should be asked to sign a representation that \"cash funds of $ were counted in my presence and returned to me intact on (insert date).\""),
          mkRow("Required", "Observation", "Cash counts — Obtain explanations for any differences between cash counted and the accounting records."),
          mkRow("Required", "Observation", "Cash counts — Inquire into and obtain explanations for any unusual items, such as older documents, IOUs and expenses that do not appear to be in the normal course of business."),
          mkRow("Required", "Observation", "Cash counts — Record details of the last cash sales/cheques at period end (particularly if large) and ensure they were properly recorded in the accounting records and in the correct period."),
        ],
      },
      {
        title: "FOLLOW UP",
        rows: [
          mkRow("Required", "Inspection", "Follow up — Trace large undeposited receipts to bank deposits and the bank statement."),
          mkRow("Required", "Inspection", "Follow up — Investigate any cheques subsequently dishonoured."),
        ],
      },
    ],

    bankRecProcedures: [
      {
        title: "BANK RECONCILIATION",
        rows: [
          mkRow("Required", "Inspection", "Obtain copies of bank reconciliations — Agree the bank reconciliation details to bank confirmations."),
          mkRow("Required", "Inspection", "Obtain copies of bank reconciliations — Agree the bank reconciliation details to the bank statement."),
          mkRow("Required", "Inspection", "Obtain copies of bank reconciliations — Agree the bank reconciliation details to the general ledger."),
          mkRow("Required", "Inspection", "Obtain copies of bank reconciliations — Agree the bank reconciliation details to supporting detail (e.g., list of outstanding cheques)."),
          mkRow("Required", "Recalculation", "Arithmetic check — Check the arithmetic accuracy of the bank reconciliation."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Obtain directly from the bank a copy of the bank statement (or an \"on line\" bank statement) for an immediate period (e.g., two weeks or one month) subsequent to the period-end date."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Agree a sample of cheques dated prior to or as at period-end date to the list of outstanding cheques and cash disbursements journal. Investigate reasons for any cheques returned but not listed as outstanding."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Agree a sample of deposits on bank statement to list of outstanding deposits. Compare date of deposit noted in the books with date entered in the bank statement. Investigate unusual time delays."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Examine bank debit and credit notes. Ensure that these notes have been properly recorded in the cash journals in the appropriate period."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Agree opening bank statement balance to bank reconciliation."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Scrutinize a sample of cheques for authorized signatures and proper endorsement. Investigate alterations and propriety of cheques made to cash or entity officials."),
          mkRow("Required", "Inspection", "Subsequent bank statement — Inquire about the reason for large, unusual or stale-dated outstanding cheques that have not been returned by the bank. Agree such cheques to original supporting documentation (e.g., purchase invoices). Recommend reversal of long-outstanding cheques. If an adequate explanation is not received, record details for further consideration."),
        ],
      },
    ],

    concluded: false,
    concludedOn: "",
  };
}

type DocKey = "auditProcedures" | "cashCountProcedures" | "bankRecProcedures";

const CASH_AUDIT_MATCHES: Record<string, { docKey: DocKey; sectionIdx: number; match: string }> = {
  "cash-audit-bankRec-review":    { docKey: "auditProcedures", sectionIdx: 2, match: "Bank reconciliations — Review the reconciliations for accuracy" },
  "cash-audit-bankRec-stale":     { docKey: "auditProcedures", sectionIdx: 2, match: "Bank reconciliations — Ensure there are no stale-dated cheques included" },
  "cash-audit-bankRec-explain":   { docKey: "auditProcedures", sectionIdx: 2, match: "Bank reconciliations — Obtain explanations for very large" },
  "cash-audit-count-significant": { docKey: "auditProcedures", sectionIdx: 1, match: "Count the material cash funds" },
};

const CASH_BANKREC_MATCHES: Record<string, { match: string }> = {
  "cash-bank-confirm":      { match: "Agree the bank reconciliation details to bank confirmations" },
  "cash-bank-statement":    { match: "Agree the bank reconciliation details to the bank statement" },
  "cash-bank-gl":           { match: "Agree the bank reconciliation details to the general ledger" },
  "cash-bank-supporting":   { match: "Agree the bank reconciliation details to supporting detail" },
  "cash-bank-arithmetic":   { match: "Arithmetic check — Check the arithmetic accuracy" },
  "cash-bank-sub-obtain":   { match: "Obtain directly from the bank a copy of the bank statement" },
  "cash-bank-sub-cheques":  { match: "Agree a sample of cheques dated prior to or as at period-end" },
  "cash-bank-sub-deposits": { match: "Agree a sample of deposits on bank statement to list of outstanding deposits" },
  "cash-bank-sub-notes":    { match: "Examine bank debit and credit notes" },
  "cash-bank-sub-opening":  { match: "Agree opening bank statement balance to bank reconciliation" },
  "cash-bank-sub-sigs":     { match: "Scrutinize a sample of cheques for authorized signatures" },
  "cash-bank-sub-stale":    { match: "Inquire about the reason for large, unusual or stale-dated outstanding cheques" },
};

type RowSetter = (docKey: DocKey, sectionIdx: number, rowId: string, field: keyof CashRow, value: string | RefDoc[]) => void;

const TD = "border-b border-border px-3 py-2.5 text-sm align-top";

const PROC_DOCS = [
  { id: "proc-doc-1", name: "Bank Statement — RBC Dec 2024" },
  { id: "proc-doc-2", name: "General Ledger Export" },
  { id: "proc-doc-3", name: "Bank Confirmation Letter" },
  { id: "proc-doc-4", name: "Trial Balance — Dec 2024" },
  { id: "proc-doc-5", name: "Cash Count Sheet — Dec 31 2024" },
  { id: "proc-doc-6", name: "Accounts Receivable Aging Report" },
  { id: "proc-doc-7", name: "Management Representation Letter" },
  { id: "proc-doc-8", name: "Invoices Sample — Oct-Dec 2024" },
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
  sections: CashSection[];
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

  type HiddenEntry = { row: CashRow; sectionIdx: number; sectionTitle: string };
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

function useCashStore() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const storageKey = `audit-cash-v2-${engagementId ?? "global"}`;

  const [data, setData] = useState<DataCash>(() =>
    readJsonFromLocalStorage<DataCash>(storageKey, buildDefault()) ?? buildDefault()
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
  }, [data, storageKey]);

  function setHeader(field: "lsName" | "lsAccountBalance" | "materiality", value: string) {
    setData(d => ({...d, [field]: value }));
  }

  const handleRowField: RowSetter = (docKey, sectionIdx, rowId, field, value) => {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as CashSection[]).map((s, si) =>
        si !== sectionIdx ? s : {
          ...s,
          rows: s.rows.map(r => r.id !== rowId ? r : {...r, [field]: value }),
        }
      ),
    }));
  };

  function addRow(docKey: DocKey, sectionIdx: number) {
    setData(d => ({
      ...d,
      [docKey]: (d[docKey] as CashSection[]).map((s, si) =>
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
      [docKey]: (d[docKey] as CashSection[]).map((s, si) =>
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
      [docKey]: (d[docKey] as CashSection[]).map((s, si) =>
        si !== sectionIdx ? s : {...s, rows: s.rows.filter(r => r.id !== rowId) },
      ),
    }));
  }

  const ctx = getEngagementContext(engagementId);
  const fmtAmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const cashFsa = ctx.fsas.find(f => f.fsa === "Cash & Bank");
  const lsAccountBalance = cashFsa ? fmtAmt(cashFsa.amount) : "";
  const materiality = ctx.overallMateriality ? fmtAmt(ctx.overallMateriality) : "";

  function lukaApplyWorkPapersAudit(rowIds: string[]) {
    const rowConfigs: Record<string, { docKey: DocKey; sectionIdx: number; match: string; wpName: string; comment: string }> = {
      "cash-audit-bankRec-review": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Bank reconciliations — Review the reconciliations for accuracy",
        wpName: "A-2 Bank Reconciliation",
        comment: `Luka: TB cash balance ${lsAccountBalance} at Dec 31, 2025 agreed to Xero GL (acct #1010, RBC). Bank statement balance: $847,250. Outstanding cheques: $4,750 (3 items). Outstanding deposit: $2,000. Reconciled balance: ${lsAccountBalance}. ✓`,
      },
      "cash-audit-bankRec-stale": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Bank reconciliations — Ensure there are no stale-dated cheques included",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Outstanding cheques list reviewed. No stale-dated cheques (>180 days) identified. All outstanding items dated Nov–Dec 2025. ✓",
      },
      "cash-audit-bankRec-explain": {
        docKey: "auditProcedures", sectionIdx: 2,
        match: "Bank reconciliations — Obtain explanations for very large",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Outstanding cheques — 3 items totalling $4,750: #5821 $3,200 Hydro One (Dec 28), #5826 $1,050 Office Depot (Dec 30), #5829 $500 Canada Post (Dec 31). Outstanding deposit — $2,000 Dec 31 deposit cleared Jan 2, 2026. All items traced and explained. See A-2.",
      },
      "cash-audit-count-significant": {
        docKey: "auditProcedures", sectionIdx: 1,
        match: "Count the material cash funds",
        wpName: "A-3 Cash Count",
        comment: "Luka: Petty cash balance per TB: $12,500. Physical count performed Dec 31, 2025 with custodian E. Rawlins present. Counted: $12,500. Variance: NIL. Custodian signed representation. No IOUs or unusual items noted. ✓",
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
          [cfg.docKey]: (updated[cfg.docKey] as CashSection[]).map((s, si) =>
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

  function lukaApplyWorkPapersBankRec(rowIds: string[]) {
    const rowConfigs: Record<string, { match: string; wpName: string; comment: string }> = {
      "cash-bank-confirm": {
        match: "Agree the bank reconciliation details to bank confirmations",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Bank confirmation obtained from RBC. Dec 31, 2025 balance: $847,250. Agreed to bank reconciliation. ✓",
      },
      "cash-bank-statement": {
        match: "Agree the bank reconciliation details to the bank statement",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: RBC bank statement (Dec 31, 2025) obtained. Ending balance $847,250 agreed to bank reconciliation. ✓",
      },
      "cash-bank-gl": {
        match: "Agree the bank reconciliation details to the general ledger",
        wpName: "A-2 Bank Reconciliation",
        comment: `Luka: GL balance per Xero acct #1010 at Dec 31, 2025: ${lsAccountBalance}. Agreed to bank reconciliation. ✓`,
      },
      "cash-bank-supporting": {
        match: "Agree the bank reconciliation details to supporting detail",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Outstanding cheques list (3 items, $4,750) and outstanding deposit ($2,000) agreed to bank reconciliation detail. ✓",
      },
      "cash-bank-arithmetic": {
        match: "Arithmetic check — Check the arithmetic accuracy",
        wpName: "A-2 Bank Reconciliation",
        comment: `Luka: Bank balance $847,250 + outstanding deposits $2,000 − outstanding cheques $4,750 = ${lsAccountBalance}. Arithmetic verified. ✓`,
      },
      "cash-bank-sub-obtain": {
        match: "Obtain directly from the bank a copy of the bank statement",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: January 2026 bank statement obtained directly from RBC online banking portal. Statement period: Jan 1–31, 2026. ✓",
      },
      "cash-bank-sub-cheques": {
        match: "Agree a sample of cheques dated prior to or as at period-end",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: All 3 outstanding cheques (#5821, #5826, #5829) traced to Jan 2026 statement. All cleared within 10 business days. No items unaccounted for. ✓",
      },
      "cash-bank-sub-deposits": {
        match: "Agree a sample of deposits on bank statement to list of outstanding deposits",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Outstanding deposit $2,000 (Dec 31) confirmed cleared Jan 2, 2026 on subsequent statement. No unusual time delays. ✓",
      },
      "cash-bank-sub-notes": {
        match: "Examine bank debit and credit notes",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: No bank debit or credit notes noted in December 2025 statement. Service charges of $45 recorded in correct period. ✓",
      },
      "cash-bank-sub-opening": {
        match: "Agree opening bank statement balance to bank reconciliation",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Opening balance on Jan 2026 statement: $844,500. Agreed to closing balance on Dec 2025 bank reconciliation. ✓",
      },
      "cash-bank-sub-sigs": {
        match: "Scrutinize a sample of cheques for authorized signatures",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: Authorized signing officers confirmed per banking agreement (R. Chandra, CFO; M. Osei, Controller). All 3 outstanding cheques bear authorized signatures. No alterations noted. ✓",
      },
      "cash-bank-sub-stale": {
        match: "Inquire about the reason for large, unusual or stale-dated outstanding cheques",
        wpName: "A-2 Bank Reconciliation",
        comment: "Luka: No large, unusual, or stale-dated outstanding cheques noted. All 3 items cleared in January 2026. Management confirms no outstanding items older than 60 days. ✓",
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
          bankRecProcedures: (updated.bankRecProcedures as CashSection[]).map((s, si) =>
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

  return { data, locked: data.concluded, engagementId, setHeader, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersAudit, lukaApplyWorkPapersBankRec };
}

export function AuditCashWorksheet() {
  const { data, locked, engagementId, setHeader, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersAudit } = useCashStore();
  const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
  const [lukaState, setLukaState] = useState<"idle" | "loading" | "done">("idle");
  const [selectedWorkPapers, setSelectedWorkPapers] = useState<Set<number>>(new Set());
  const [lukaSelecting, setLukaSelecting] = useState(false);
  const [lukaRowSelectIds, setLukaRowSelectIds] = useState<Set<string>>(new Set());

  const lukaHighlightMatches = lukaSelecting
    ? Array.from(lukaRowSelectIds).map(id => CASH_AUDIT_MATCHES[id]?.match).filter((m): m is string => !!m)
    : undefined;

  useEffect(() => {
    if (!lukaSelecting) return;
    requestAnimationFrame(() => {
      const rows = document.querySelectorAll("tr");
      const first = Array.from(rows).find(r => r.className.includes("bg-violet-200"));
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [lukaSelecting]);

  function handleLukaRowToggle(description: string, _sectionIdx: number) {
    const entry = Object.entries(CASH_AUDIT_MATCHES).find(([, cfg]) => description.includes(cfg.match));
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
      heading="A Cash > Audit Procedures"
      onAdd={locked ? undefined : () => addRow("auditProcedures", 5)}
      objective="Obtain sufficient appropriate audit evidence that cash and cash equivalents exist, are complete, are accurately valued, are properly classified, and are adequately disclosed in the financial statements."
      banner={isDemoEngagement ? (
        <LukaWorkPaperPanel
          worksheetId="gca-ws-proc-cash"
          procData={DEMO_LUKA_PROC_ACTIONS["gca-ws-proc-cash"]}
          lukaState={lukaState}
          selectedIds={selectedWorkPapers}
          onSelectionChange={setSelectedWorkPapers}
          selecting={lukaSelecting}
          rowSelectIds={lukaRowSelectIds}
          onSelectingChange={setLukaSelecting}
          onRowSelectIdsChange={setLukaRowSelectIds}
          onInitiate={(rowIds) => { setLukaSelecting(false); setLukaState("loading"); setTimeout(() => { lukaApplyWorkPapersAudit(rowIds); setLukaState("done"); }, 2600); }}
        />
      ) : undefined}
    >
      <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">LS Name</label>
            <Select disabled value="A Cash">
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A Cash" className="text-sm">A Cash</SelectItem>
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

      <ConcludeBar worksheetKey="audit-cash" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn} onConclude={conclude} onReopen={reopen} />
    </WorksheetLayout>
  );
}

export function AuditCashBankRecWorksheet() {
  const { data, locked, engagementId, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow, lukaApplyWorkPapersBankRec } = useCashStore();
  const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
  const [lukaState, setLukaState] = useState<"idle" | "loading" | "done">("idle");
  const [selectedWorkPapers, setSelectedWorkPapers] = useState<Set<number>>(new Set());
  const [lukaSelecting, setLukaSelecting] = useState(false);
  const [lukaRowSelectIds, setLukaRowSelectIds] = useState<Set<string>>(new Set());

  const lukaHighlightMatches = lukaSelecting
    ? Array.from(lukaRowSelectIds).map(id => CASH_BANKREC_MATCHES[id]?.match).filter((m): m is string => !!m)
    : undefined;

  function handleLukaRowToggle(description: string, _sectionIdx: number) {
    const entry = Object.entries(CASH_BANKREC_MATCHES).find(([, cfg]) => description.includes(cfg.match));
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
      heading="A Cash > Bank Reconciliation"
      onAdd={locked ? undefined : () => addRow("bankRecProcedures", 0)}
      objective="Perform bank reconciliation procedures to verify that the bank statement balances agree to the general ledger and that reconciling items are valid and properly recorded."
      banner={isDemoEngagement ? (
        <LukaWorkPaperPanel
          worksheetId="gca-ws-proc-cash-bank"
          procData={DEMO_LUKA_PROC_ACTIONS["gca-ws-proc-cash-bank"]}
          lukaState={lukaState}
          selectedIds={selectedWorkPapers}
          onSelectionChange={setSelectedWorkPapers}
          selecting={lukaSelecting}
          rowSelectIds={lukaRowSelectIds}
          onSelectingChange={setLukaSelecting}
          onRowSelectIdsChange={setLukaRowSelectIds}
          onInitiate={(rowIds) => { setLukaSelecting(false); setLukaState("loading"); setTimeout(() => { lukaApplyWorkPapersBankRec(rowIds); setLukaState("done"); }, 2600); }}
        />
      ) : undefined}
    >
      <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">LS Name</label>
            <Select disabled value="A Cash">
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A Cash" className="text-sm">A Cash</SelectItem>
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

      <WorksheetSection title="A.110 · Bank Reconciliation Procedures" bodyClassName="p-0">
        <ProcTable
          docKey="bankRecProcedures"
          sections={data.bankRecProcedures}
          locked={locked}
          onRowField={handleRowField}
          onToggleHidden={toggleHidden}
          onDeleteRow={deleteRow}
          lukaHighlightMatches={lukaHighlightMatches}
          onLukaRowToggle={lukaSelecting ? handleLukaRowToggle : undefined}
        />
      </WorksheetSection>

      <ConcludeBar worksheetKey="audit-cash" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn} onConclude={conclude} onReopen={reopen} />
    </WorksheetLayout>
  );
}

export function AuditCashCountWorksheet() {
  const { data, locked, engagementId, handleRowField, addRow, conclude, reopen, lsAccountBalance, materiality, toggleHidden, deleteRow } = useCashStore();
  return (
    <WorksheetLayout
      heading="A Cash > Cash Count"
      onAdd={locked ? undefined : () => addRow("cashCountProcedures", 2)}
      objective="Count cash on hand to verify existence and completeness of cash balances at the period end date."
    >
      <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">LS Name</label>
            <Select disabled value="A Cash">
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A Cash" className="text-sm">A Cash</SelectItem>
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

      <WorksheetSection title="A.115 · Cash Count Procedures" bodyClassName="p-0">
        <ProcTable docKey="cashCountProcedures" sections={data.cashCountProcedures} locked={locked} onRowField={handleRowField} onToggleHidden={toggleHidden} onDeleteRow={deleteRow} />
      </WorksheetSection>

      <ConcludeBar worksheetKey="audit-cash" engagementId={engagementId} concluded={data.concluded} concludedOn={data.concludedOn} onConclude={conclude} onReopen={reopen} />
    </WorksheetLayout>
  );
}
