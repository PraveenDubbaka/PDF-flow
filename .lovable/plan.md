## Goal

Add a **Section Summary / Jump-to** panel to the existing Floating Action Bar (the utility pill on the right). It gives users a hovering table of contents showing every section with its completion progress (answered / total) and jumps to that section on click — solving the Jira feedback about reviewing long T2-style checklists.

No existing design changes. New button lives inside the FAB pill; content opens in a Popover styled like the other FAB popovers.

## Where it lives

- Only in `FloatingActionBar.tsx`, only for checklists (`isChecklist`), visible in both edit and preview modes.
- New icon button inserted between "Collapse/Expand Sections" (Layers) and "Reorder" (ArrowUpDown) — natural place for navigation.
- Icon: `ListTree` from `lucide-react` (matches existing lucide set).
- Opens a `Popover` (same pattern as Smart Layout / Add Category) anchored `side="left"`.

## Panel contents

Header row: "Sections" title + small "X of Y completed" summary.

Scrollable list (max-height ~ 60vh). Each row:
```
[index]  Section title                     [answered/total]  [progress bar]
```
- Rows are buttons; click → smooth-scroll to the section and close the popover.
- If a section is fully answered, show a subtle check accent (no new colors — use `text-primary`/existing tokens).
- Indeterminate / mixed shows a filled bar proportional to answered/total.
- Empty state ("No sections yet") when checklist has none.

Search input at top (simple filter over section titles) — helpful for the 200-question T2 case mentioned in the ticket.

## Progress computation

Helper `getSectionProgress(section: Section)` in the same file:
- `total` = count of questions + subQuestions + subSubQuestions where `answerType !== 'none'`.
- `answered` = same, but where `answer` is a non-empty string (or `labelAnswer` non-empty when `labelPlaceholder` is set).
- Return `{ answered, total }`.

Totals for header sum across sections.

## Jump-to scroll

Sections don't currently expose DOM anchors. Minimal, non-visual change:

- `src/components/ChecklistSection.tsx`: add `id={`checklist-section-${section.id}`}` and `data-section-id={section.id}` to the outermost wrapper `<div>`. Also add `scroll-mt-40` so the sticky header doesn't cover it.

Jump handler in the new panel:
```ts
const el = document.getElementById(`checklist-section-${id}`);
el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
```
If the section is collapsed, first dispatch an expand: reuse `onExpandSections` isn't per-section, so we set `isExpanded: true` on that section via the existing `onUpdate(checklist)` prop before scrolling.

## Props added to FloatingActionBar

`checklist` prop already passed in. No new required props. Uses existing `onUpdate` for the "expand target section" case.

## Files touched

1. `src/components/FloatingActionBar.tsx`
   - Import `ListTree`, add local state `showSectionsPopover`.
   - Insert new `<Popover>` button in the pill (checklist-only, both modes).
   - Add small helpers: `getSectionProgress`, `jumpToSection`.
2. `src/components/ChecklistSection.tsx`
   - Add `id` + `data-section-id` + `scroll-mt-40` on the outer wrapper only. No visual change.

That's it — no changes to worksheets, no new global state, no new routes.

## Out of scope (can be follow-up)

- Persisting last-viewed section.
- Hover-preview of section contents.
- Applying to non-checklist worksheets (ticket is specifically about checklists).
