import {
  Bookmark,
  ChevronDown,
  ClipboardCopy,
  FileBarChart,
  MessageSquare,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  computeProcedureTotals,
  formatProcedureChangePct,
  formatProcedureNumber,
  PROCEDURE_AMOUNT_COLUMNS,
  type ProcedureAmountColumn,
  type Row,
} from "@/lib/tbGroups";

interface ProcedureLeadSheetTableBaseProps {
  rows: Row[];
}

interface ProcedureLeadSheetPageProps extends ProcedureLeadSheetTableBaseProps {
  mode: "page";
  linkedLine?: string | null;
  linkedColumn?: string | null;
  highlightLink?: boolean;
}

interface ProcedureLeadSheetPickerProps extends ProcedureLeadSheetTableBaseProps {
  mode: "picker";
  leadSheetCode?: string;
  onSelectRow: (row: Row) => void;
  onSelectCell: (row: Row, column: ProcedureAmountColumn) => void;
}

export type ProcedureLeadSheetTableProps = ProcedureLeadSheetPageProps | ProcedureLeadSheetPickerProps;

function columnAmount(row: Row, column: ProcedureAmountColumn): number | null | undefined {
  if (column === "Original") return row.original;
  if (column === "Adj") return row.adj;
  if (column === "Final") return row.final;
  return row.py1;
}

export function ProcedureLeadSheetTable(props: ProcedureLeadSheetTableProps) {
  const { rows } = props;
  const totals = computeProcedureTotals(rows);

  if (props.mode === "picker") {
    const { leadSheetCode, onSelectRow, onSelectCell } = props;
    return (
      <div className="overflow-x-auto rounded-[8px] border border-border bg-card">
        <table className="w-full min-w-[680px] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-muted-foreground">
              <th className="whitespace-nowrap px-2 py-2 font-semibold">Acc No.</th>
              <th className="px-2 py-2 font-semibold">Description</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-semibold">Original</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-bold text-foreground">Adj</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-bold text-foreground">Final</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-semibold">PY1</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-semibold">Change(%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-lead-line={row.id}
                className="cursor-pointer border-b border-border hover:bg-muted/50"
                onClick={() => onSelectRow(row)}
              >
                <td className="whitespace-nowrap px-2 py-1.5 text-foreground tabular-nums">{row.accNo}</td>
                <td className="w-full max-w-0 p-0">
                  <Button
                    type="button"
                    variant="ghost"
                    title={row.description}
                    aria-label={`${leadSheetCode ? `${leadSheetCode} · ` : ""}${row.description}`}
                    className="h-8 w-full justify-start rounded-none px-2 text-xs font-normal text-foreground hover:bg-transparent"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectRow(row);
                    }}
                  >
                    <span className="block truncate">{row.description}</span>
                  </Button>
                </td>
                {PROCEDURE_AMOUNT_COLUMNS.map((column) => {
                  const amount = columnAmount(row, column);
                  const empty = amount == null || !Number.isFinite(amount);
                  const formatted = formatProcedureNumber(amount);
                  const bold = column === "Adj" || column === "Final";
                  return (
                    <td key={column} className="p-0 text-right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={empty}
                        aria-label={`${row.description} · ${column}: ${formatted}`}
                        className={`pdf-tb-amount h-8 w-full justify-end rounded-none px-2 text-xs tabular-nums ${bold ? "font-bold" : "font-normal"} ${empty ? "pdf-tb-empty" : "text-foreground hover:bg-primary/15 hover:text-primary"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCell(row, column);
                        }}
                      >
                        {formatted}
                      </Button>
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-foreground tabular-nums">
                  {formatProcedureChangePct(row.final, row.py1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 text-xs font-bold text-foreground">
              <td className="px-2 py-2" />
              <td className="px-2 py-2">Total</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatProcedureNumber(totals.original)}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatProcedureNumber(totals.adj)}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatProcedureNumber(totals.final)}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatProcedureNumber(totals.py1)}</td>
              <td className="px-2 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  const { linkedLine, linkedColumn, highlightLink } = props;
  const showPy2 = linkedColumn === "PY2";
  const gridClass = showPy2
    ? "grid-cols-[40px_100px_minmax(120px,1fr)_110px_80px_110px_110px_110px_90px_60px_80px_160px]"
    : "grid-cols-[40px_100px_minmax(120px,1fr)_110px_80px_110px_110px_90px_60px_80px_160px]";
  const cellHighlight = (rowId: string, column: string) =>
    highlightLink && rowId === linkedLine && linkedColumn === column ? "bg-primary/20 ring-2 ring-inset ring-primary" : "";

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
      <div className="min-w-[960px]">
        <div className={`grid ${gridClass} bg-muted border-b border-border text-xs font-semibold text-muted-foreground`}>
          <div className="flex items-center justify-center py-2.5"><Checkbox className="h-4 w-4" /></div>
          <div className="py-2.5 px-2">Acc No.</div>
          <div className="py-2.5 px-2">Description</div>
          <div className="py-2.5 px-2 text-right">Original</div>
          <div className="py-2.5 px-2 text-right font-bold text-foreground">Adj</div>
          <div className="py-2.5 px-2 text-right font-bold text-foreground">Final</div>
          <div className="py-2.5 px-2 text-right">PY1</div>
          {showPy2 && <div className="py-2.5 px-2 text-right">PY2</div>}
          <div className="py-2.5 px-2 text-right flex items-center justify-end gap-1">
            Change(%)
            <ChevronDown className="h-3 w-3" />
          </div>
          <div className="py-2.5 px-2 text-center">Ref</div>
          <div className="py-2.5 px-2 text-center">Ticks</div>
          <div className="py-2.5 px-2 text-center">Actions</div>
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            data-lead-line={row.id}
            className={`grid ${gridClass} border-b border-border hover:bg-muted/30 transition-colors text-sm ${highlightLink && row.id === linkedLine ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""}`}
          >
            <div className="flex items-center justify-center py-2.5"><Checkbox className="h-4 w-4" /></div>
            <div className="py-2.5 px-2 text-foreground">{row.accNo}</div>
            <div className="py-2.5 px-2 text-foreground">{row.description}</div>
            <div data-lead-column="Original" className={`py-2.5 px-2 text-right text-foreground ${cellHighlight(row.id, "Original")}`}>{formatProcedureNumber(row.original)}</div>
            <div data-lead-column="Adj" className={`py-2.5 px-2 text-right font-bold text-foreground ${cellHighlight(row.id, "Adj")}`}>{formatProcedureNumber(row.adj)}</div>
            <div data-lead-column="Final" className={`py-2.5 px-2 text-right font-bold text-foreground ${cellHighlight(row.id, "Final")}`}>{formatProcedureNumber(row.final)}</div>
            <div data-lead-column="PY1" className={`py-2.5 px-2 text-right text-foreground ${cellHighlight(row.id, "PY1")}`}>{formatProcedureNumber(row.py1)}</div>
            {showPy2 && <div data-lead-column="PY2" className={`py-2.5 px-2 text-right text-foreground ${cellHighlight(row.id, "PY2")}`}>{formatProcedureNumber(row.py2)}</div>}
            <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureChangePct(row.final, row.py1)}</div>
            <div className="py-2.5 px-2 text-center text-muted-foreground">{row.ref ?? "-"}</div>
            <div className="py-2.5 px-2 text-center flex items-center justify-center gap-1">
              <span className="text-muted-foreground">-</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="py-2.5 px-2 flex items-center justify-center gap-1">
              <button className="p-1 hover:bg-muted rounded text-primary" title="Add to workbook"><ClipboardCopy className="h-4 w-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-primary" title="View report"><FileBarChart className="h-4 w-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-primary" title="Comment"><MessageSquare className="h-4 w-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-primary" title="Bookmark"><Bookmark className="h-4 w-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-primary" title="Send"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        ))}

        <div className={`grid ${gridClass} bg-muted/50 text-sm font-bold`}>
          <div className="py-2.5" />
          <div className="py-2.5" />
          <div className="py-2.5 px-2 text-foreground">Total</div>
          <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureNumber(totals.original)}</div>
          <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureNumber(totals.adj)}</div>
          <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureNumber(totals.final)}</div>
          <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureNumber(totals.py1)}</div>
          {showPy2 && <div className="py-2.5 px-2 text-right text-foreground">{formatProcedureNumber(rows.reduce((total, row) => total + (row.py2 ?? 0), 0))}</div>}
          <div className="py-2.5 px-2" />
          <div className="py-2.5 px-2" />
          <div className="py-2.5 px-2" />
          <div className="py-2.5 px-2" />
        </div>
      </div>
    </div>
  );
}