import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefButton, type RefDoc } from "@/components/RefButton";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export interface AdjLine {
  id: string;
  accNo: string;
  description: string;
  debit: string;
  credit: string;
}

export interface AdjEntryMeta {
  entryNo: string;
  entryType: string;
  entryDate: string;
  notes: string;
}

export function mkAdjLine(): AdjLine {
  return { id: Math.random().toString(36).slice(2, 9), accNo: "", description: "", debit: "", credit: "" };
}

export const ENTRY_TYPES = ["Journal", "Adjusting", "Reclassification", "Proposed"] as const;
export const ENTRY_PREFIX: Record<string, string> = { Journal: "JE", Adjusting: "AJE", Reclassification: "RE", Proposed: "PE" };

export function parseYearEndToDate(yearEnd: string): string {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const m = yearEnd.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return yearEnd;
  return `${months[m[1]] ?? "12"}/${m[2].padStart(2, "0")}/${m[3]}`;
}

export const tbAccounts = [
  { id: "1", accNo: "1010", description: "Cash & Bank", grouping: "Assets" },
  { id: "2", accNo: "1100", description: "Accounts Receivable", grouping: "Assets" },
  { id: "3", accNo: "1105", description: "Allowance for Doubtful Accounts", grouping: "Assets" },
  { id: "4", accNo: "1200", description: "Inventory", grouping: "Assets" },
  { id: "5", accNo: "1300", description: "Prepaid Expenses", grouping: "Assets" },
  { id: "6", accNo: "1510", description: "Right-of-Use Assets (ASC 842)", grouping: "Assets" },
  { id: "7", accNo: "1600", description: "Property Plant & Equipment", grouping: "Assets" },
  { id: "8", accNo: "1605", description: "Accumulated Depreciation", grouping: "Assets" },
  { id: "9", accNo: "1700", description: "Goodwill", grouping: "Assets" },
  { id: "10", accNo: "1900", description: "Other Assets", grouping: "Assets" },
  { id: "10a", accNo: "1.5", description: "Asset - AIM", grouping: "Assets" },
  { id: "11", accNo: "2010", description: "Accounts Payable", grouping: "Liabilities" },
  { id: "12", accNo: "2100", description: "Accrued Liabilities", grouping: "Liabilities" },
  { id: "13", accNo: "2200", description: "Deferred Revenue", grouping: "Liabilities" },
  { id: "14", accNo: "2310", description: "Current Portion LT Debt", grouping: "Liabilities" },
  { id: "15", accNo: "2320", description: "Lease Liability - Current", grouping: "Liabilities" },
  { id: "16", accNo: "2500", description: "Long-term Debt", grouping: "Liabilities" },
  { id: "17", accNo: "2510", description: "Lease Liability - Non-Current", grouping: "Liabilities" },
  { id: "18", accNo: "2900", description: "Other Long-term Liabilities", grouping: "Liabilities" },
  { id: "19", accNo: "3100", description: "Common Stock", grouping: "Equity" },
  { id: "20", accNo: "3200", description: "Retained Earnings (opening)", grouping: "Equity" },
  { id: "21", accNo: "4000", description: "Service Revenue", grouping: "Revenue" },
  { id: "22", accNo: "4900", description: "Other Income", grouping: "Revenue" },
  { id: "23", accNo: "5000", description: "Cost of Services", grouping: "Expenses" },
  { id: "24", accNo: "6100", description: "Salaries & Benefits", grouping: "Expenses" },
  { id: "25", accNo: "6200", description: "Fuel & Vehicle", grouping: "Expenses" },
  { id: "26", accNo: "6300", description: "Rent & Occupancy", grouping: "Expenses" },
  { id: "27", accNo: "6400", description: "Depreciation & Amortization", grouping: "Expenses" },
  { id: "28", accNo: "6500", description: "Interest Expense", grouping: "Expenses" },
  { id: "29", accNo: "6900", description: "Other Operating Expenses", grouping: "Expenses" },
  { id: "30", accNo: "7000", description: "Income Tax Expense", grouping: "Expenses" },
];

function AccSearch({ value, onChange }: { value: string; onChange: (accNo: string, desc: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = tbAccounts.filter(a =>
    !q || a.accNo.toLowerCase().includes(q.toLowerCase()) || a.description.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <DropdownMenu onOpenChange={open => { if (!open) setQ(""); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full justify-between font-normal h-8">
          {value ? <span className="truncate">{value}</span> : <span className="text-muted-foreground">Select</span>}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 w-64" align="start">
        <div className="p-1.5" onMouseDown={e => e.stopPropagation()}>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="h-7 text-xs" autoFocus />
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-44 overflow-y-auto">
          {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>}
          {filtered.map(a => (
            <DropdownMenuItem key={a.id} onSelect={() => onChange(a.accNo, a.description)}>
              <span className="font-mono shrink-0 w-12 text-muted-foreground text-xs">{a.accNo}</span>
              <span className="truncate text-xs">{a.description}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DescSearch({ value, onChange }: { value: string; onChange: (desc: string, accNo: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  useEffect(() => { setQ(value); }, [value]);
  const filtered = tbAccounts.filter(a =>
    !q || a.description.toLowerCase().includes(q.toLowerCase()) || a.accNo.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onClick={e => e.stopPropagation()}
            placeholder="Type here to search"
            className="h-8"
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0 min-w-[200px]" align="start" onInteractOutside={() => setOpen(false)}>
        <div className="max-h-44 overflow-y-auto">
          {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>}
          {filtered.map(a => (
            <DropdownMenuItem key={a.id} onSelect={() => { onChange(a.description, a.accNo); setQ(a.description); }}>
              <span className="font-mono shrink-0 w-12 text-muted-foreground text-xs">{a.accNo}</span>
              <span className="truncate text-xs">{a.description}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NewAdjEntryModal({ open, onClose, onSave, engId, clientName, yearEnd, prefillRow, prefillLines, prefillMeta }: {
  open: boolean;
  onClose: () => void;
  onSave: (lines: AdjLine[], meta: AdjEntryMeta) => void;
  engId: string;
  clientName: string;
  yearEnd: string;
  prefillRow?: { accNo: string; description: string };
  prefillLines?: AdjLine[];
  prefillMeta?: AdjEntryMeta;
}) {
  const [entryDate, setEntryDate] = useState(() => prefillMeta?.entryDate ?? parseYearEndToDate(yearEnd));
  const [entryType, setEntryType] = useState(prefillMeta?.entryType ?? "Journal");
  const [entryCounter, setEntryCounter] = useState(() => {
    if (prefillMeta?.entryNo) {
      const parts = prefillMeta.entryNo.split("-");
      const num = parseInt(parts[parts.length - 1]);
      return isNaN(num) ? 1 : num;
    }
    return 1;
  });
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState(prefillMeta?.notes ?? "");
  const [lines, setLines] = useState<AdjLine[]>(() => {
    if (prefillLines && prefillLines.length > 0) {
      return prefillLines.map(l => ({ ...l, id: Math.random().toString(36).slice(2, 9) }));
    }
    const first = mkAdjLine();
    if (prefillRow) { first.accNo = prefillRow.accNo; first.description = prefillRow.description; }
    return [first, mkAdjLine()];
  });
  const [refDocs, setRefDocs] = useState<RefDoc[]>([]);

  // Reset state when modal opens with new prefill data
  useEffect(() => {
    if (!open) return;
    setEntryDate(prefillMeta?.entryDate ?? parseYearEndToDate(yearEnd));
    setEntryType(prefillMeta?.entryType ?? "Journal");
    setEntryCounter(() => {
      if (prefillMeta?.entryNo) {
        const parts = prefillMeta.entryNo.split("-");
        const num = parseInt(parts[parts.length - 1]);
        return isNaN(num) ? 1 : num;
      }
      return 1;
    });
    setNotes(prefillMeta?.notes ?? "");
    if (prefillLines && prefillLines.length > 0) {
      setLines(prefillLines.map(l => ({ ...l, id: Math.random().toString(36).slice(2, 9) })));
    } else {
      const first = mkAdjLine();
      if (prefillRow) { first.accNo = prefillRow.accNo; first.description = prefillRow.description; }
      setLines([first, mkAdjLine()]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prefix = ENTRY_PREFIX[entryType] ?? "JE";
  const entryNo = `${prefix}-${entryCounter}`;
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.001;
  const hasActivity = totalDebit > 0 || totalCredit > 0;
  const hasUnselectedAcc = lines.some(l => (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0) && !l.accNo);
  const canSave = balanced && !hasUnselectedAcc && hasActivity;

  function updateLine(id: string, field: keyof AdjLine, val: string) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  }
  function setLineAccDesc(id: string, accNo: string, description: string) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, accNo, description } : l));
  }

  const isEditing = !!prefillMeta;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-4xl overflow-hidden [&>button.absolute]:hidden">
        {/* Dark header bar */}
        <div className="flex items-center justify-between px-5 py-2.5 text-white text-sm" style={{ background: "#0d2240" }}>
          <span className="font-semibold">{engId}</span>
          <span className="font-semibold">{clientName}</span>
          <span>Year End Date: {yearEnd}</span>
        </div>

        <div className="px-5 pt-4 pb-3 space-y-4">
          <p className="text-base font-bold text-foreground">{isEditing ? "Adjusting Entry" : "New Adjusting Entry"}</p>

          {/* Fields row */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Entity Name 1</span>
              <Input value={clientName} disabled className="h-8 min-w-[100px]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Entry Date</span>
              <div className="relative">
                <Input value={entryDate} onChange={e => setEntryDate(e.target.value)} className="h-8 pr-8 w-[148px]" />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Entry Type <span className="text-destructive">*</span></span>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger className="h-8 min-w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Entry No <span className="text-destructive">*</span></span>
              <div className="flex items-center gap-0.5">
                <Button variant="secondary" size="icon-sm" type="button" onClick={() => setEntryCounter(c => Math.max(1, c - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Input value={entryNo} readOnly className="h-8 w-[64px] text-center" />
                <Button variant="secondary" size="icon-sm" type="button" onClick={() => setEntryCounter(c => c + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-foreground">Reference</span>
              <RefButton
                reference={refDocs}
                onAttach={doc => setRefDocs(prev => [...prev, doc])}
                onRemove={idx => { if (typeof idx === "number") setRefDocs(prev => prev.filter((_, i) => i !== idx)); }}
              />
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-xs text-foreground">Recurring</span>
              <div className="h-8 flex items-center">
                <Checkbox checked={recurring} onCheckedChange={v => setRecurring(!!v)} className="rounded" />
              </div>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-xs text-foreground">Delete</span>
              <Button variant="destructive" size="icon-sm" type="button">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lines table */}
          <div className="border border-border rounded overflow-visible">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-foreground w-[130px]">Acc No.</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-foreground">Description</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-foreground w-[130px]">Debit</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-foreground w-[130px]">Credit</th>
                  <th className="px-3 py-2 text-xs font-semibold text-foreground w-[72px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const ownDebit = parseFloat(line.debit) > 0;
                  const ownCredit = parseFloat(line.credit) > 0;
                  const otherDebit = (totalDebit - (parseFloat(line.debit) || 0)) > 0;
                  const otherCredit = (totalCredit - (parseFloat(line.credit) || 0)) > 0;
                  const showDebit = !ownCredit && (ownDebit || !otherDebit);
                  const showCredit = !ownDebit && (ownCredit || !otherCredit);
                  return (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="px-2 py-1.5">
                      <AccSearch value={line.accNo} onChange={(a, d) => setLineAccDesc(line.id, a, d)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <DescSearch value={line.description} onChange={(d, a) => setLineAccDesc(line.id, a, d)} />
                    </td>
                    <td className="px-2 py-1.5">
                      {!showDebit ? (
                        <span className="flex h-8 items-center justify-end px-1 text-sm text-muted-foreground">—</span>
                      ) : (
                        <Input type="number" value={line.debit} min="0" step="0.01" placeholder="0.00"
                          onChange={e => updateLine(line.id, "debit", e.target.value)}
                          onFocus={e => (e.target as HTMLInputElement).select()}
                          className="h-8 text-right" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {!showCredit ? (
                        <span className="flex h-8 items-center justify-end px-1 text-sm text-muted-foreground">—</span>
                      ) : (
                        <Input type="number" value={line.credit} min="0" step="0.01" placeholder="0.00"
                          onChange={e => updateLine(line.id, "credit", e.target.value)}
                          onFocus={e => (e.target as HTMLInputElement).select()}
                          className="h-8 text-right" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-start gap-0.5">
                        <Button variant="ghost" size="icon-sm" type="button"
                          onClick={() => setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== line.id) : prev)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {idx === lines.length - 1 && (
                          <Button variant="ghost" size="icon-sm" type="button"
                            onClick={() => setLines(prev => [...prev, mkAdjLine()])}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted border-t border-border">
                  <td colSpan={2} className="px-3 py-2 text-right text-xs font-bold text-foreground">Total</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-foreground">{totalDebit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-foreground">{totalCredit.toFixed(2)}</td>
                  <td />
                </tr>
                {!balanced && hasActivity && (
                  <tr className="border-t border-border/50">
                    <td colSpan={2} className="px-3 py-2 text-right text-xs font-bold text-foreground">Difference</td>
                    <td />
                    <td className="px-3 py-2 text-right text-sm font-bold text-destructive">({Math.abs(diff).toFixed(2)})</td>
                    <td />
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">Notes</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="h-20 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button onClick={() => { if (canSave) { onSave(lines, { entryNo, entryType, entryDate, notes }); onClose(); } }} disabled={!canSave}>
                  Save
                </Button>
              </span>
            </TooltipTrigger>
            {!canSave && (
              <TooltipContent side="top">
                {hasUnselectedAcc ? "Please select account" : !balanced ? "Debits must equal credits" : "Add at least one amount"}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </DialogContent>
    </Dialog>
  );
}
