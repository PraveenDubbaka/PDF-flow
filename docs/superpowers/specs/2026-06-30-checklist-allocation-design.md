# Checklist / Question Allocation at Portal Level

**Date:** 2026-06-30  
**Status:** Approved  
**Approach:** Lightweight extension of existing portal share flow

---

## Goal

Allow a team member to allocate an entire checklist OR individual questions to a specific person (client contact or firm staff). Multiple people can be assigned different pieces of the same questionnaire. Responses consolidate back centrally. Auditor sees who answered each question via an initials badge with a full-name tooltip.

---

## Section 1 — Data Model

### New type: `Assignee`

```ts
export interface Assignee {
  id: string;
  name: string;
  initials: string;
  role: string;
  type: 'client' | 'staff';
}
```

### Extended types

**`Question`** gains one optional field:
```ts
assignedTo?: Assignee;
```

**`ClientResponse`** (in `useClientResponses.ts`) gains one optional field:
```ts
answeredBy?: Assignee;
```

### Persistence

Assignments are stored in localStorage under the key:
```
checklist-assignments-{engagementId}-{checklistId}
```

Shape: `Record<questionId | '__all__', Assignee>`  
`'__all__'` means every question in the checklist is assigned to that person.

---

## Section 2 — `useChecklistAssignments` Hook

**File:** `src/hooks/useChecklistAssignments.ts`

```ts
interface UseChecklistAssignments {
  assignments: Record<string, Assignee>;        // questionId → Assignee
  assign(scope: 'all' | 'selected', selectedIds: string[], assignee: Assignee): void;
  clearAssignment(questionId: string): void;
  getAssignee(questionId: string): Assignee | undefined;
  allAssignee: Assignee | undefined;            // set when scope === 'all'
}
```

- Reads/writes localStorage key `checklist-assignments-{engagementId}-{checklistId}`
- `assign('all', [], assignee)` sets `__all__` key and clears per-question entries
- `assign('selected', ids, assignee)` sets each id; if `__all__` existed it is cleared
- `getAssignee(questionId)` falls back to `allAssignee` if no per-question entry

---

## Section 3 — `AssignmentDialog` Component

**File:** `src/components/AssignmentDialog.tsx`

```ts
interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistName?: string;
  hasSelectedQuestions?: boolean;
  onConfirm: (scope: 'all' | 'selected', assignee: Assignee) => void;
}
```

**Layout:** mirrors `ShareWithClientDialog` — `sm:max-w-md`, centered header with `UserPlus` icon.

**Sections:**

1. **What to Assign** — `RadioGroup` with "Assign All Questions" / "Assign Selected Questions" (disabled + note when no selection, same pattern as Share dialog)

2. **Assign To** — scrollable list of mock team members:
   - 4 client contacts: CFO, CEO, Controller, VP Finance
   - 4 firm staff: Engagement Partner, Senior Auditor, Staff Auditor, Manager
   - Each row: `Avatar` (initials) + name + role + type badge (`bg-blue-500/10 text-blue-600` for client, `bg-violet-500/10 text-violet-600` for staff)
   - Selected row highlighted with `border-primary bg-primary/5`

3. **Footer:** Cancel + Assign buttons (Assign disabled until a person is selected)

---

## Section 4 — Toolbar Button & Response Badge

### Toolbar — `EngagementDetail.tsx`

New `ExpandableIconButton` with `UserPlus` icon and label "Assign" placed immediately to the left of the existing "Share" button. Uses the same `hasSelectedQuestions` state already threaded through the toolbar. Clicking opens `AssignmentDialog`.

### Response badge — `DocumentView.tsx`

When `answeredBy` is present on a `ClientResponse`, render a small assignee chip below the answer field:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 cursor-default">
        {assignee.initials}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-xs">{assignee.name} · {assignee.role}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

- Client contact badge: `bg-primary/10 text-primary`
- Firm staff badge: `bg-muted text-muted-foreground`
- Only rendered on answered/applied questions; invisible on unanswered questions

---

## End-to-End Flow

1. Auditor selects questions (or leaves all selected) → clicks **Assign**
2. `AssignmentDialog` opens → selects scope + person → clicks Assign
3. `useChecklistAssignments.assign()` persists to localStorage
4. Auditor clicks **Share** → `shareWithClient()` fires → mock responses come back with `answeredBy` set from assignments
5. Auditor clicks **Apply responses** → each question gets its answer + `answeredBy` stored
6. `DocumentView` renders initials badge under each answered question; tooltip shows full name + role

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useChecklistAssignments.ts` | Assignment state + localStorage |
| `src/components/AssignmentDialog.tsx` | Assignment modal (scope + person picker) |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/checklist.ts` | Add `Assignee` interface; add `assignedTo?: Assignee` to `Question` |
| `src/hooks/useClientResponses.ts` | Add `answeredBy?: Assignee` to `ClientResponse`; populate from assignments in `shareWithClient` |
| `src/components/DocumentView.tsx` | Render initials badge + tooltip when `answeredBy` present |
| `src/pages/EngagementDetail.tsx` (or wherever toolbar lives) | Add Assign `ExpandableIconButton`; wire `AssignmentDialog`; pass `useChecklistAssignments` results to `useClientResponses` |

---

## Out of Scope

- Real API / notification to assigned person (mock only)
- Assignment history / audit log
- Reassignment UX (clearing + re-assigning is enough for MVP)
- Assignment on sub-questions (top-level questions only)
