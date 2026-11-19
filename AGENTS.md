# Architecture rules

- Size shared calculation stamps with shared intrinsic label/value columns, wrapping labels at 240px and keeping first-line values separated by at least 12px; mirror wrapping in export and measure previews without forcing output width so both borders contain every row.

- Scope PDF calculator typography overrides to `.pdf-calculator-panel` and exclude the shared stamp; this preserves other editor panels and native stamp sizing.
- Persist optional calculator result overrides and per-line stamp visibility in PDF edit state; shared stamp rendering uses these fields while preserving legacy stamp defaults and arithmetic.
- Keep calculator preview selection indices aligned with persisted calculation rows, and honor comparison visibility in all stamp renderers, so preview selections match placed output.
- Handle annotation dragging in the shared CanvasPage outside edit mode and commit only at drag end, so all placed item types move without duplicate actions or history entries.
- Store PDF edit-panel width in shared workspace state with a 360px minimum and container-based reflow for every tool, so resizing persists across switches without clipping.
- Measure calculator previews against their checkbox-free output and pass native-relative scale to placement and updates; normalize page resize commits by PDF zoom so saved sizing remains independent of viewport zoom.
- Resize placed calculations through a measured stamp wrapper and persist scale with annotation bounds at drag end; this keeps text, borders, and exported sizing proportional without changing arithmetic.
- Resolve legacy label-only calculations, including text annotations with a numeric Calculation label or matching calculation record, through the same page/export stamp path; this preserves existing result-only stamps without reclassifying ordinary text or changing arithmetic.
- Format calculator numeric drafts with caret-preserving grouping and reserve a shared amount/result grid track so large values stay readable without changing arithmetic.
- Keep Luka as a normal entry in the PDF tool rail list, distinguished only by its brighter brand-gradient icon with a soft glow (dimmer in dark mode), so it matches the other tools' button treatment.
- Size the calculator amount column from the longest formatted value (shared by every amount input and the result box) and keep descriptions single-line with ellipsis truncation, so large values stay aligned and descriptions never wrap.
- Serialize PDF edit-state auto-saves, acknowledge only successful writes, and synchronize open editor windows through a document-scoped BroadcastChannel; this prevents stale writes and preserves edits on Done or window close.
- Use a dedicated PDF editor-window route sharing PdfWorkspace, with manual saving reserved for protected PDFs and the URL-driven protection flag; this keeps in-window tools and persistence consistent with the engagement.
- Store trial balance links with account identity and selected column, never an amount snapshot; resolve hover amounts from the shared live trial balance source and auto-close on selection, so links follow current figures.
- Share the trial balance seed rows and publish displayed account amounts to an engagement-scoped reactive store; this keeps PDF link tooltips and the Trial Balance page on the same source without altering adjustment logic.
- Carry linked account, column and a same-engagement PDF return URL in trial balance navigation; scroll and briefly highlight the target, retaining the PDF page on return.

- Share engagement sidebar seed trees and worksheet templates with the hyperlink picker, attach selected procedure checklists and engagement-local documents/custom sections, and persist only relative target identity plus line/column; this keeps links scoped and amounts resolved from lead-sheet rows.
- Use a shared same-engagement document-return strip on destination layouts and hide secondary portals on phones during linked visits; this keeps the highlighted target visible without changing ordinary destination views.
- Keep Add link tab sizing in the shared dialog and scroll only the engagement picker list; scoped controls and intrinsic amount columns prevent tab jumps and clipped amounts without affecting other dialogs.
- Keep Engagement picker expansion separate from target selection: full-row folder toggles and trailing lead-sheet plus/minus toggles replace chevrons, so folders never place links and lead-sheet names remain selectable.
