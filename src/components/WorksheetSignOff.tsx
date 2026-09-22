import { ChecklistSignOff } from "@/components/ChecklistSignOff";
import type { Checklist } from "@/types/checklist";
import { Button } from "@/components/ui/button";
import { CURRENT_USER } from "@/lib/useTimeEntries";

function fmtTs(iso: string) {
 try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }); }
 catch { return iso; }
}

export function ConcludedRow({ concludedOn, onReopen }: { concludedOn: string; onReopen?: () => void }) {
 return (
 <div className="flex items-center justify-end gap-3 py-1">
 <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
 {CURRENT_USER.initials}
 </div>
 <div className="min-w-0">
 <p className="text-[11px] text-muted-foreground leading-tight">Concluded by</p>
 <p className="text-sm font-medium leading-tight">{CURRENT_USER.name}</p>
 <p className="text-[11px] text-muted-foreground leading-tight">{fmtTs(concludedOn)}</p>
 </div>
 {onReopen && <Button size="sm" onClick={onReopen}>Reopen worksheet</Button>}
 </div>
 );
}

/**
 * Standard sign-off block for worksheets. Wraps ChecklistSignOff so every
 * worksheet gets the same four-role Preparer / Partner / Quality Reviewer /
 * Admin-Tax Reviewer UI as regular checklists. Storage is isolated per
 * worksheet via a synthetic checklist id.
 */
export function WorksheetSignOff({
 worksheetKey,
 engagementId = "default",
 isEngagementMode = true,
 isPreviewMode = false,
}: {
 worksheetKey: string;
 engagementId?: string;
 isEngagementMode?: boolean;
 isPreviewMode?: boolean;
}) {
 const id = `worksheet:${engagementId}:${worksheetKey}`;
 const pseudoChecklist = { id } as unknown as Checklist;
 return (
 <ChecklistSignOff
 checklist={pseudoChecklist}
 isEngagementMode={isEngagementMode}
 isPreviewMode={isPreviewMode}
 />
 );
}
