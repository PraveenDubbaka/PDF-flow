import { useState } from "react";
import { cn } from "@/lib/utils";
import { LukaIcon } from "@/components/LukaIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronLeft, ChevronUp, Clock, Database } from "lucide-react";

interface TargetRow { id: string; label: string; }

interface WorkPaperAction {
  label: string;
  description: string;
  estimatedTime: string;
  source: string;
  targetRows: TargetRow[];
}

interface ProcData {
  sources: string[];
  procedureType: string;
  actions: WorkPaperAction[];
}

interface LukaWorkPaperPanelProps {
  worksheetId: string;
  procData: ProcData;
  lukaState: "idle" | "loading" | "done";
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  onInitiate: (rowIds: string[]) => void;
  selecting: boolean;
  rowSelectIds: Set<string>;
  onSelectingChange: (selecting: boolean) => void;
  onRowSelectIdsChange: (ids: Set<string>) => void;
}

export function LukaWorkPaperPanel({
  procData,
  lukaState,
  selectedIds,
  onSelectionChange,
  onInitiate,
  selecting,
  rowSelectIds,
  onSelectingChange,
  onRowSelectIdsChange,
}: LukaWorkPaperPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const allSelected = selectedIds.size === procData.actions.length;

  function getTargetRows(): { actionLabel: string; row: TargetRow }[] {
    const result: { actionLabel: string; row: TargetRow }[] = [];
    selectedIds.forEach(idx => {
      const action = procData.actions[idx];
      if (action?.targetRows) {
        action.targetRows.forEach(r => result.push({ actionLabel: action.label, row: r }));
      }
    });
    return result;
  }

  function handleInitiateClick() {
    const allTargetRows = getTargetRows();
    onRowSelectIdsChange(new Set(allTargetRows.map(t => t.row.id)));
    onSelectingChange(true);
    setExpanded(false);
  }

  function handleConfirm() {
    onSelectingChange(false);
    onInitiate(Array.from(rowSelectIds));
  }

  function toggleRowId(id: string) {
    const next = new Set(rowSelectIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onRowSelectIdsChange(next);
  }

  function toggleAll() {
    onSelectionChange(
      allSelected ? new Set() : new Set(procData.actions.map((_, i) => i))
    );
  }

  function toggleOne(idx: number) {
    const next = new Set(selectedIds);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    onSelectionChange(next);
  }

  if (lukaState === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-200 animate-pulse">
        <LukaIcon size={13} bare inverted className="text-violet-700 shrink-0" />
        <span className="text-xs font-medium text-violet-700">
          Luka is preparing work papers from connected sources…
        </span>
      </div>
    );
  }

  if (lukaState === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-200">
        <LukaIcon size={13} bare inverted className="text-violet-700 shrink-0" />
        <span className="text-xs font-medium text-violet-700">
          Luka has filled in {selectedIds.size} work paper{selectedIds.size !== 1 ? "s" : ""} — review before proceeding.
        </span>
        <span className="ml-auto text-[10px] text-violet-600 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">
          ✓ Ready
        </span>
      </div>
    );
  }

  if (selecting) {
    const allTargetRows = getTargetRows();
    const allRowsSelected = allTargetRows.length > 0 && allTargetRows.every(t => rowSelectIds.has(t.row.id));
    const someRowsSelected = allTargetRows.some(t => rowSelectIds.has(t.row.id));

    const groups: Map<string, TargetRow[]> = new Map();
    allTargetRows.forEach(({ actionLabel, row }) => {
      if (!groups.has(actionLabel)) groups.set(actionLabel, []);
      groups.get(actionLabel)!.push(row);
    });

    function toggleSelectAll() {
      if (allRowsSelected) {
        onRowSelectIdsChange(new Set());
      } else {
        onRowSelectIdsChange(new Set(allTargetRows.map(t => t.row.id)));
      }
    }

    return (
      <div className="bg-violet-50 border-b border-violet-200">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-100">
          <div className="flex items-center gap-2">
            <LukaIcon size={13} bare inverted className="text-violet-700 shrink-0" />
            <span className="text-xs font-semibold text-violet-700">Luka — Select Procedure Rows</span>
            <span className="text-[10px] text-violet-400">· Choose which rows Luka will fill in</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 border-b border-violet-100">
          <Checkbox
            id="luka-row-select-all"
            checked={allRowsSelected ? true : someRowsSelected ? "indeterminate" : false}
            onCheckedChange={toggleSelectAll}
            className="border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
          />
          <label
            htmlFor="luka-row-select-all"
            className="text-[11px] font-medium text-violet-600 cursor-pointer select-none"
          >
            Select all ({allTargetRows.length} procedure row{allTargetRows.length !== 1 ? "s" : ""})
          </label>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-violet-100">
          {Array.from(groups.entries()).map(([groupLabel, rows]) => {
            const isCollapsed = collapsedGroups.has(groupLabel);
            const groupSelected = rows.filter(r => rowSelectIds.has(r.id)).length;
            const groupTotal = rows.length;
            return (
              <div key={groupLabel}>
                <button
                  type="button"
                  onClick={() => setCollapsedGroups(prev => {
                    const next = new Set(prev);
                    next.has(groupLabel) ? next.delete(groupLabel) : next.add(groupLabel);
                    return next;
                  })}
                  className="w-full flex items-center gap-1.5 px-4 py-1.5 bg-violet-100/60 hover:bg-violet-200/50 transition-colors"
                >
                  <ChevronDown className={cn("h-3 w-3 text-violet-500 shrink-0 transition-transform", isCollapsed && "-rotate-90")} />
                  <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">{groupLabel}</span>
                  <span className="ml-auto text-[10px] text-violet-400">{groupSelected}/{groupTotal}</span>
                </button>
                {!isCollapsed && rows.map(row => (
                  <div
                    key={row.id}
                    onClick={() => toggleRowId(row.id)}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-2 cursor-pointer hover:bg-violet-100/60 transition-colors",
                      rowSelectIds.has(row.id) && "bg-violet-100/40"
                    )}
                  >
                    <Checkbox
                      id={`luka-row-${row.id}`}
                      checked={rowSelectIds.has(row.id)}
                      onCheckedChange={() => toggleRowId(row.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 shrink-0 border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <label
                      htmlFor={`luka-row-${row.id}`}
                      className="text-[11px] text-foreground leading-snug cursor-pointer select-none"
                      onClick={e => e.stopPropagation()}
                    >
                      {row.label}
                    </label>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-violet-200 bg-violet-50/80">
          <button
            type="button"
            onClick={() => { onSelectingChange(false); setExpanded(true); }}
            className="inline-flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-700 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to work papers
          </button>
          <Button
            size="sm"
            disabled={rowSelectIds.size === 0}
            onClick={handleConfirm}
            className="h-7 px-3 text-xs bg-[#1C63A6] hover:bg-[#1a5a9e] text-white disabled:opacity-40"
          >
            <LukaIcon size={11} bare className="mr-1.5 text-white" />
            Confirm & initiate ({rowSelectIds.size})
          </Button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b border-violet-200">
        <div className="flex items-center gap-2">
          <LukaIcon size={13} bare inverted className="text-violet-700 shrink-0" />
          <span className="text-xs font-medium text-violet-700">
            Luka can initiate{" "}
            <span className="font-semibold">
              {procData.actions.length} work paper{procData.actions.length !== 1 ? "s" : ""}
            </span>
            {" "}for this procedure
            <span className="ml-1.5 text-violet-400 font-normal">· {procData.procedureType}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            onSelectionChange(new Set(procData.actions.map((_, i) => i)));
          }}
          className="inline-flex items-center gap-1 bg-white border border-violet-300 text-violet-700
                     text-[11px] font-medium rounded px-2.5 py-0.5 hover:bg-violet-50 transition-colors shrink-0"
        >
          <LukaIcon size={11} bare inverted />
          <span>Select work papers</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-violet-50 border-b border-violet-200">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <LukaIcon size={13} bare inverted className="text-violet-700 shrink-0" />
          <span className="text-xs font-semibold text-violet-700">Luka — Available Work Papers</span>
          <span className="text-[10px] text-violet-400">· {procData.procedureType}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-violet-400 hover:text-violet-600 transition-colors"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-violet-100">
        <Database className="h-3 w-3 text-violet-400 shrink-0" />
        <span className="text-[10px] text-violet-500 font-medium">Sources:</span>
        {procData.sources.map((s, i) => (
          <span key={i} className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-4 py-2 border-b border-violet-100">
        <Checkbox
          id="luka-select-all"
          checked={allSelected}
          onCheckedChange={toggleAll}
          className="border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
        />
        <label
          htmlFor="luka-select-all"
          className="text-[11px] font-medium text-violet-600 cursor-pointer select-none"
        >
          Select all ({procData.actions.length})
        </label>
      </div>

      <div className="divide-y divide-violet-100">
        {procData.actions.map((action, idx) => (
          <div
            key={idx}
            onClick={() => toggleOne(idx)}
            className={cn(
              "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-violet-100/60 transition-colors",
              selectedIds.has(idx) && "bg-violet-100/40"
            )}
          >
            <Checkbox
              id={`luka-wp-${idx}`}
              checked={selectedIds.has(idx)}
              onCheckedChange={() => toggleOne(idx)}
              onClick={e => e.stopPropagation()}
              className="mt-0.5 border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug">{action.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{action.description}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] text-violet-500">
                  <Clock className="h-2.5 w-2.5" />{action.estimatedTime}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-violet-500">
                  <Database className="h-2.5 w-2.5" />{action.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-violet-200 bg-violet-50/80">
        <p className="text-[10px] text-violet-400">
          {selectedIds.size === 0
            ? "Select work papers above to initiate"
            : `${selectedIds.size} of ${procData.actions.length} selected — Luka will draft, you review and confirm`}
        </p>
        <Button
          size="sm"
          disabled={selectedIds.size === 0}
          onClick={handleInitiateClick}
          className="h-7 px-3 text-xs bg-[#1C63A6] hover:bg-[#1a5a9e] text-white disabled:opacity-40"
        >
          <LukaIcon size={11} bare className="mr-1.5 text-white" />
          Initiate selected
        </Button>
      </div>
    </div>
  );
}
