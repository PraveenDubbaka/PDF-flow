# Checklist/Question Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow team members to assign entire checklists or individual questions to specific people; applied responses display an initials badge with a hover tooltip showing who answered.

**Architecture:** Lightweight extension of the existing share/response flow. New `useChecklistAssignments` hook owns localStorage persistence. `AssignmentDialog` mirrors `ShareWithClientDialog` structure. `answeredBy` flows through `useClientResponses` into the `Question` object, which `DocumentView` reads directly.

**Tech Stack:** React 18 + TypeScript strict, Zustand (store untouched), Tailwind CSS 3, Lucide icons, shadcn/ui components (Dialog, RadioGroup, Tooltip)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/types/checklist.ts` | Add `Assignee` interface; add `assignedTo?` + `answeredBy?` to `Question` |
| Create | `src/hooks/useChecklistAssignments.ts` | Assignment state + localStorage |
| Modify | `src/hooks/useClientResponses.ts` | Add `answeredBy` to `ClientResponse`; accept `assignments` param; populate on simulate |
| Create | `src/components/AssignmentDialog.tsx` | Scope picker + team member list modal |
| Modify | `src/pages/EngagementDetail.tsx` | Hook wiring, Assign button, dialog render, update callback signature |
| Modify | `src/components/DocumentView.tsx` | Initials badge after `ResponseField` in `QuestionInlineColumns` |

---

## Task 1: Add `Assignee` type and extend `Question`

**Files:**
- Modify: `src/types/checklist.ts`

- [ ] **Step 1: Add `Assignee` interface and extend `Question`**

In `src/types/checklist.ts`, add `Assignee` just before the `Question` interface (after line 21), and add two optional fields to `Question`:

```ts
export interface Assignee {
  id: string;
  name: string;
  initials: string;
  role: string;
  type: 'client' | 'staff';
}
```

In `Question`, add after the `reference?` field (after `reference?: string;`):
```ts
  assignedTo?: Assignee;
  answeredBy?: Assignee;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors (or same errors as before — no new ones).

- [ ] **Step 3: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/types/checklist.ts
git commit -m "feat: add Assignee type and assignedTo/answeredBy fields to Question"
```

---

## Task 2: Create `useChecklistAssignments` hook

**Files:**
- Create: `src/hooks/useChecklistAssignments.ts`

- [ ] **Step 1: Create the hook file**

Create `/Users/countable/countable-design-system/src/hooks/useChecklistAssignments.ts` with this full content:

```ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { Assignee } from '@/types/checklist';

const storageKey = (engagementId: string, checklistId: string) =>
  `checklist-assignments-${engagementId}-${checklistId}`;

function readStored(key: string): Record<string, Assignee> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useChecklistAssignments(engagementId: string, checklistId: string) {
  const key = storageKey(engagementId, checklistId);
  const keyRef = useRef(key);

  const [assignments, setAssignments] = useState<Record<string, Assignee>>(
    () => readStored(key)
  );

  // Reload when navigation changes the active checklist
  useEffect(() => {
    if (key !== keyRef.current) {
      keyRef.current = key;
      setAssignments(readStored(key));
    }
  }, [key]);

  const persist = (next: Record<string, Assignee>) => {
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    setAssignments(next);
  };

  const assign = useCallback(
    (scope: 'all' | 'selected', selectedIds: string[], assignee: Assignee) => {
      if (scope === 'all') {
        persist({ __all__: assignee });
      } else {
        const next = { ...assignments };
        delete next.__all__;
        selectedIds.forEach(id => { next[id] = assignee; });
        persist(next);
      }
    },
    [assignments, key]
  );

  const clearAssignment = useCallback(
    (questionId: string) => {
      const next = { ...assignments };
      delete next[questionId];
      persist(next);
    },
    [assignments, key]
  );

  const allAssignee: Assignee | undefined = assignments.__all__;

  const getAssignee = useCallback(
    (questionId: string): Assignee | undefined =>
      assignments[questionId] ?? allAssignee,
    [assignments, allAssignee]
  );

  return { assignments, assign, clearAssignment, getAssignee, allAssignee };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/hooks/useChecklistAssignments.ts
git commit -m "feat: add useChecklistAssignments hook with localStorage persistence"
```

---

## Task 3: Extend `useClientResponses` with assignment awareness

**Files:**
- Modify: `src/hooks/useClientResponses.ts`

- [ ] **Step 1: Add `answeredBy` to `ClientResponse` and import `Assignee`**

At the top of `src/hooks/useClientResponses.ts`, change:
```ts
import { Checklist, Question } from '@/types/checklist';
```
to:
```ts
import { Assignee, Checklist, Question } from '@/types/checklist';
```

In the `ClientResponse` interface, add `answeredBy?` after `explanation?`:
```ts
export interface ClientResponse {
  questionId: string;
  questionText?: string;
  answer: string;
  explanation?: string;
  answeredBy?: Assignee;
}
```

- [ ] **Step 2: Accept `assignments` in `generateMockResponses` and populate `answeredBy`**

Change the `generateMockResponses` signature from:
```ts
const generateMockResponses = (checklist: Checklist): ClientResponse[] => {
```
to:
```ts
const generateMockResponses = (checklist: Checklist, assignments: Record<string, Assignee>): ClientResponse[] => {
```

Inside `processQuestion`, find the line:
```ts
if (answer) {
  responses.push({ questionId: question.id, questionText: question.text, answer, explanation });
}
```
Replace it with:
```ts
if (answer) {
  const answeredBy: Assignee | undefined = assignments.__all__ ?? assignments[question.id];
  responses.push({
    questionId: question.id,
    questionText: question.text,
    answer,
    explanation,
    ...(answeredBy ? { answeredBy } : {}),
  });
}
```

- [ ] **Step 3: Accept `assignments` param in the hook and pass to `generateMockResponses`**

Change the hook signature from:
```ts
export function useClientResponses(checklist: Checklist | null) {
```
to:
```ts
export function useClientResponses(
  checklist: Checklist | null,
  assignments: Record<string, Assignee> = {}
) {
```

Inside `shareWithClient`, change:
```ts
const mockResponses = generateMockResponses(checklist);
```
to:
```ts
const mockResponses = generateMockResponses(checklist, assignments);
```

- [ ] **Step 4: Pass `answeredBy` through `applyFilteredResponses` callback**

Change the `onUpdateQuestion` callback type in `applyFilteredResponses` from:
```ts
onUpdateQuestion: (questionId: string, answer: string, explanation?: string) => void,
```
to:
```ts
onUpdateQuestion: (questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => void,
```

Inside `applyNext`, change:
```ts
onUpdateQuestion(response.questionId, response.answer, response.explanation);
```
to:
```ts
onUpdateQuestion(response.questionId, response.answer, response.explanation, response.answeredBy);
```

Also update `applyResponses` (which delegates to `applyFilteredResponses`) — its `onUpdateQuestion` type must match. Change:
```ts
const applyResponses = useCallback((
  onUpdateQuestion: (questionId: string, answer: string, explanation?: string) => void,
  onComplete: () => void
) => {
```
to:
```ts
const applyResponses = useCallback((
  onUpdateQuestion: (questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => void,
  onComplete: () => void
) => {
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -30
```
Expected: errors now appear in `EngagementDetail.tsx` about `updateQuestionAnswer` signature mismatch — that's expected and will be fixed in Task 5.

- [ ] **Step 6: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/hooks/useClientResponses.ts
git commit -m "feat: add answeredBy to ClientResponse; wire assignments into mock response generation"
```

---

## Task 4: Create `AssignmentDialog` component

**Files:**
- Create: `src/components/AssignmentDialog.tsx`

- [ ] **Step 1: Create the file**

Create `/Users/countable/countable-design-system/src/components/AssignmentDialog.tsx` with this full content:

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Check } from "lucide-react";
import { Assignee } from "@/types/checklist";

type AssignScope = "all" | "selected";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistName?: string;
  hasSelectedQuestions?: boolean;
  onConfirm: (scope: AssignScope, assignee: Assignee) => void;
}

const TEAM_MEMBERS: Assignee[] = [
  { id: "c1", name: "Robert Morrison", initials: "RM", role: "CEO", type: "client" },
  { id: "c2", name: "Sarah Chen", initials: "SC", role: "CFO", type: "client" },
  { id: "c3", name: "David Patel", initials: "DP", role: "Controller", type: "client" },
  { id: "c4", name: "Lisa Nguyen", initials: "LN", role: "VP Finance", type: "client" },
  { id: "s1", name: "Michael Torres", initials: "MT", role: "Engagement Partner", type: "staff" },
  { id: "s2", name: "Emma Wilson", initials: "EW", role: "Senior Auditor", type: "staff" },
  { id: "s3", name: "James Kim", initials: "JK", role: "Staff Auditor", type: "staff" },
  { id: "s4", name: "Priya Sharma", initials: "PS", role: "Manager", type: "staff" },
];

export function AssignmentDialog({
  open,
  onOpenChange,
  checklistName,
  hasSelectedQuestions = false,
  onConfirm,
}: AssignmentDialogProps) {
  const [scope, setScope] = useState<AssignScope>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const reset = () => {
    setScope("all");
    setSelectedMemberId(null);
  };

  const handleConfirm = () => {
    const member = TEAM_MEMBERS.find((m) => m.id === selectedMemberId);
    if (!member) return;
    onConfirm(scope, member);
    onOpenChange(false);
    reset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Assign {checklistName ? `"${checklistName}"` : "Questions"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Scope */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">What to Assign</p>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as AssignScope)}
              className="space-y-2"
            >
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  scope === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="all" id="assign-all" />
                <Label htmlFor="assign-all" className="text-sm font-medium cursor-pointer">
                  Assign All Questions
                </Label>
              </label>
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  scope === "selected"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                } ${!hasSelectedQuestions ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem value="selected" id="assign-selected" disabled={!hasSelectedQuestions} />
                <Label
                  htmlFor="assign-selected"
                  className={`text-sm font-medium ${hasSelectedQuestions ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  Assign Selected Questions
                  {!hasSelectedQuestions && (
                    <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                      No questions selected
                    </span>
                  )}
                </Label>
              </label>
            </RadioGroup>
          </div>

          {/* Team member list */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Assign To</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Client contacts */}
              <p className="text-xs text-muted-foreground px-1 pb-0.5">Client Contacts</p>
              {TEAM_MEMBERS.filter((m) => m.type === "client").map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    selectedMemberId === member.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold flex items-center justify-center">
                    {member.initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">{member.role}</span>
                  </span>
                  <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-blue-500/10 text-blue-600 font-medium shrink-0">
                    Client
                  </span>
                </button>
              ))}

              {/* Firm staff */}
              <p className="text-xs text-muted-foreground px-1 pb-0.5 pt-2">Firm Staff</p>
              {TEAM_MEMBERS.filter((m) => m.type === "staff").map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    selectedMemberId === member.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 text-xs font-semibold flex items-center justify-center">
                    {member.initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">{member.role}</span>
                  </span>
                  <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-violet-500/10 text-violet-600 font-medium shrink-0">
                    Staff
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedMemberId} className="flex-1">
            <Check className="h-4 w-4" />
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors from `AssignmentDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/components/AssignmentDialog.tsx
git commit -m "feat: add AssignmentDialog component with scope picker and team member list"
```

---

## Task 5: Wire everything in `EngagementDetail`

**Files:**
- Modify: `src/pages/EngagementDetail.tsx`

This task has multiple steps that modify the same file. Make each change, then do one tsc check at the end before committing.

- [ ] **Step 1: Add imports**

In the existing lucide-react import line (~line 3), add `UserPlus` to the list:
```ts
// Find: ChevronRight, ChevronDown, ...
// Add UserPlus to the destructured list, e.g.:
import { ..., UserPlus } from "lucide-react";
```

Add these two new imports near the other hook/component imports:
```ts
import { useChecklistAssignments } from "@/hooks/useChecklistAssignments";
import { AssignmentDialog } from "@/components/AssignmentDialog";
```

- [ ] **Step 2: Add dialog state**

Near the `showShareDialog` state (around line 782), add:
```ts
const [showAssignDialog, setShowAssignDialog] = useState(false);
```

- [ ] **Step 3: Call `useChecklistAssignments`**

Near where `useClientResponses` is called (line 922), add the new hook call just before or after it:
```ts
const checklistAssignments = useChecklistAssignments(
  engagementId,
  checklist?.id ?? checklistKey ?? ''
);
```

- [ ] **Step 4: Pass `assignments` to `useClientResponses`**

Change line 922 from:
```ts
const clientResponses = useClientResponses(checklist);
```
to:
```ts
const clientResponses = useClientResponses(checklist, checklistAssignments.assignments);
```

- [ ] **Step 5: Fix `updateQuestionAnswer` to accept and store `answeredBy`**

First, add `Assignee` to the existing checklist type import at the top of `EngagementDetail.tsx`. Find the line that imports from `@/types/checklist` and add `Assignee` to it:
```ts
import { Assignee, Checklist, Question, ... } from '@/types/checklist';
```

Then find `updateQuestionAnswer` (around line 1631). Change the callback signature from:
```ts
const updateQuestionAnswer = useCallback((questionId: string, answer: string, explanation?: string) => {
```
to:
```ts
const updateQuestionAnswer = useCallback((questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => {
```

Inside `updateQuestionAnswer`, find:
```ts
return {
  ...q,
  answer,
  ...(explanation ? {
    explanation
  } : {})
};
```
Change to:
```ts
return {
  ...q,
  answer,
  ...(explanation ? { explanation } : {}),
  ...(answeredBy ? { answeredBy } : {}),
};
```

- [ ] **Step 6: Fix `handleAcceptSelectedResponses` to forward `answeredBy`**

Find `handleAcceptSelectedResponses` (around line 1665). Change the inner callback from:
```ts
(questionId, answer, explanation) => updateQuestionAnswer(questionId, answer, explanation),
```
to:
```ts
(questionId, answer, explanation, answeredBy) => updateQuestionAnswer(questionId, answer, explanation, answeredBy),
```

- [ ] **Step 7: Add the Assign button before the Share button in the checklist toolbar**

Find the block starting at line ~2087:
```tsx
<div className="relative">
  <ExpandableIconButton
    variant="secondary"
    size="sm"
    icon={<Share2 className="h-4 w-4" />}
    label={clientResponses.hasResponses ? 'Responses!' : 'Share'}
```

Insert the Assign button immediately before the `<div className="relative">` that wraps the Share button:
```tsx
<ExpandableIconButton
  variant="secondary"
  size="sm"
  icon={<UserPlus className="h-4 w-4" />}
  label="Assign"
  onClick={() => setShowAssignDialog(true)}
/>
```

- [ ] **Step 8: Render `AssignmentDialog` near `ShareWithClientDialog`**

Find where `ShareWithClientDialog` is rendered (around line 2351). Add `AssignmentDialog` immediately before or after it:
```tsx
<AssignmentDialog
  open={showAssignDialog}
  onOpenChange={setShowAssignDialog}
  checklistName={checklist?.title}
  hasSelectedQuestions={selectedQuestions.size > 0}
  onConfirm={(scope, assignee) => {
    checklistAssignments.assign(
      scope,
      scope === 'selected' ? Array.from(selectedQuestions) : [],
      assignee
    );
    toast.success(
      scope === 'all'
        ? `All questions assigned to ${assignee.name}`
        : `${selectedQuestions.size} question(s) assigned to ${assignee.name}`
    );
  }}
/>
```

- [ ] **Step 9: Verify TypeScript compiles with 0 new errors**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 new errors. If any appear, fix them before committing.

- [ ] **Step 10: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/pages/EngagementDetail.tsx
git commit -m "feat: wire assignment dialog and hook into EngagementDetail toolbar"
```

---

## Task 6: Add `answeredBy` badge in `DocumentView`

**Files:**
- Modify: `src/components/DocumentView.tsx`

- [ ] **Step 1: Import `Assignee` at top of file**

Add `Assignee` to the checklist type import at the top of `src/components/DocumentView.tsx`:
```ts
// Find the existing import from '@/types/checklist', e.g.:
import { ... } from '@/types/checklist';
// Add Assignee to the destructured imports
```

Check whether this import already exists:
```bash
grep "from '@/types/checklist'" /Users/countable/countable-design-system/src/components/DocumentView.tsx | head -5
```

- [ ] **Step 2: Add the badge in `QuestionInlineColumns` after `ResponseField`**

In `QuestionInlineColumns`, find the response column div (around line 1251):
```tsx
<div className="flex flex-nowrap items-center justify-start gap-2 min-w-0 overflow-visible px-2 relative group/resp self-center"
  style={{ flex: `0 0 ${widths[widthIdx] * 100}%` }}>
  <ResponseField question={question} onUpdate={onUpdate} isPreviewMode={isPreviewMode} isEngagementMode={isEngagementMode} />
  {canEdit &&
    <ResponseTypePicker ...
```

After `<ResponseField ... />` and before the `{canEdit && <ResponseTypePicker ...` block, add:
```tsx
{isEngagementMode && question.answeredBy && question.answer && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={`inline-flex items-center rounded-full text-[10px] font-medium px-2 py-0.5 cursor-default shrink-0 ${
          question.answeredBy.type === 'client'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {question.answeredBy.initials}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-xs">{question.answeredBy.name} · {question.answeredBy.role}</p>
    </TooltipContent>
  </Tooltip>
)}
```

Note: `Tooltip`, `TooltipTrigger`, `TooltipContent` are already imported at line 15, and the app-level `TooltipProvider` in `App.tsx` wraps the whole app so no extra provider is needed here.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/countable/countable-design-system && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/countable/countable-design-system
git add src/components/DocumentView.tsx
git commit -m "feat: show answeredBy initials badge with tooltip in question response column"
```

---

## Task 7: Browser verification + push

- [ ] **Step 1: Start dev server (if not running)**

```bash
cd /Users/countable/countable-design-system && npm run dev
```
Dev server runs at `http://127.0.0.1:8080`.

- [ ] **Step 2: Verify Assign button appears**

Navigate to any engagement checklist page. Confirm the **Assign** button (UserPlus icon) appears to the left of the **Share** button in the toolbar.

- [ ] **Step 3: Test assignment flow**

1. Click **Assign** → `AssignmentDialog` opens with "Assign All Questions" selected and team member list
2. Select "Sarah Chen (CFO)" → Assign button enables
3. Click **Assign** → dialog closes, toast shows "All questions assigned to Sarah Chen"
4. Click **Share** → portal share → wait 3 seconds for mock responses
5. Click the pulsing **Responses!** button → `ClientResponseDialog` opens with responses
6. Click **Accept All** → responses apply one by one with the pulsing animation
7. After applying: check that answered questions show "SC" badge in the Response column
8. Hover the badge → tooltip shows "Sarah Chen · CFO"

- [ ] **Step 4: Test selected questions flow**

1. Select 2–3 questions using the drag handle checkboxes
2. Click **Assign** → "Assign Selected Questions" option is now enabled
3. Select it → pick "James Kim (Staff Auditor)" → Assign
4. Toast confirms N questions assigned to James Kim
5. After Share + Apply, only those questions show "JK" badge in muted style (staff type)

- [ ] **Step 5: Verify no regressions**

- Share dialog still works normally (click Share without assigning first → no badge appears after applying)
- Other tabs (Loans, Continuity, etc.) are unaffected
- Dark mode: badge readable in both themes

- [ ] **Step 6: Push to GitHub**

```bash
cd /Users/countable/countable-design-system && git push origin main
```
