# PDF editor — 7 changes (plan only)

Nothing outside these items changes. Existing icons, tokens, 13px panel scale and 32px controls are reused. Each item lists the files, the place in the UI, and any open questions.

## Where things are today (checked)
- **Trial Balance link flow**: there's no "Trial Balance tab" inside a dialog. It's the **Trial balance** tool in the left tool rail (`activePanel === 'trial-balance'`, PdfWorkspace.tsx ~1816). You click the page, and an account popup opens (`pdf-tb-dialog`, ~2162) with columns Original / PY1 / PY2 and a "Trial Balance (general)" row.
- **Lead sheets** are in the Hyperlink tool's "Add link" dialog, under the **Engagement** tab (`EngagementLinkPicker.tsx`, using `leadSheetRows` / `leadSheetAmount` from `src/lib/pdfEngagementLinks.ts`).
- **Calculator stamp**: `CalcStamp` in PdfWorkspace.tsx (~175–206). The panel preview is in `CalculationPreview.tsx` and the placed stamp in `ResizableCalculationStamp.tsx`.
- **Redact and watermark**: tool panel at PdfWorkspace.tsx ~1823. The watermark is a single object in `PdfEditState.watermark` (`src/lib/pdfDocuments.ts:103`). Redactions are `kind: 'redaction'` annotations.
- **History**: there's a change log (`withHistory`) but no undo stack.

## 1. Lead sheet links move to Trial Balance
- **Files**: `EngagementLinkPicker.tsx`, `PdfWorkspace.tsx` (TB popup ~2162–2200), `src/lib/pdfEngagementLinks.ts` (unchanged helpers, reused), `EngagementLinkPicker.test.tsx`.
- **Hyperlink > Engagement**: lead sheet rows (procedure folders with line items) are hidden. Letters, checklists, documents and custom sections stay as they are.
- **Trial Balance popup**: add a two-tab switcher at the top of the popup, **Accounts** (today's table, unchanged) and **Lead sheets**. Lead sheets reuse the same tree, search, +/− line-item toggle, amount picking, label, tooltip and navigation to the procedure. The popup keeps its current width, and the list scrolls inside it.
- **Existing links**: lead-sheet links already placed as hyperlinks keep working (same data, same tooltip and navigation). Nothing is migrated.
- **Ambiguous**:
  - (a) Should the procedure folders that contain the lead sheets also disappear from Engagement, or only the lead sheet rows? Proposal: hide only lead sheets and their line items.
  - (b) Should new lead-sheet links show in the Trial balance tool's list, not the Hyperlinks list? Proposal: yes, Trial balance list.

## 2. Calculator — editable labels
- **Files**: `src/lib/pdfDocuments.ts` (optional `resultLabel`, `differenceLabel` on a calculation), `PdfWorkspace.tsx` (`CalcStamp` and calculator panel state), `CalculationPreview.tsx`, `ResizableCalculationStamp.tsx`, export drawing in PdfWorkspace.
- **UI**: in the calculator panel, the "Result" and "Difference" labels become inline text fields (same style as the "Type heading" field) with defaults "Result" and "Difference". Placed stamps, the preview and the PDF export use the custom text. Values and the arithmetic don't change. An empty field falls back to the default.
- **Ambiguous**: edit only in the panel, or also by clicking on a placed stamp? Proposal: panel only. Placed stamps are edited through their existing edit flow.

## 3. Text box / Callout — rich text and background fill
- **Files**: `PdfWorkspace.tsx` (text/callout editing in CanvasPage, annotation styling, export), `src/lib/pdfDocuments.ts` (optional `richText` HTML and `fillColor`), new `src/components/pdf/PdfTextFormatToolbar.tsx`.
- **UI**: while a Text box or Callout is in edit mode, a small floating toolbar sits just above the box: text colour, highlight, B, I, U, S, font size. Formatting applies to the selected text. A **Fill** colour swatch for the box background sits next to the existing border colour in the Annotations panel and on the toolbar, and offers "No fill".
- **Export**: the downloaded PDF draws the background fill and the text in its colours, sizes, bold and italic. Highlight, underline and strikethrough are drawn as rectangles or lines.
- **Ambiguous**:
  - (a) Font size choices. Proposal: 10, 12, 14, 16, 20, 24.
  - (b) Colour set. Proposal: reuse the annotation colour swatches.
  - (c) Your Monday Board rule of "no colours in rich text" is scoped to Monday Board. I'm assuming it doesn't apply here.

## 4. Signature annotation
- **Files**: `src/lib/pdfDocuments.ts` (new kind `'signature'` with `signerLabel` and `signedDate`), `PdfWorkspace.tsx` (tool grid, click-to-place, rendering, list, export).
- **UI**: a new **Signature** tile in the Annotations tool grid, using a lucide `Signature` icon. Clicking the page asks for the label (default "Reviewed by <current user>") and the date (default today). It draws a line with the label and date under it. It moves like other annotations, appears in the annotation list, and can be deleted. It's included in the PDF export.
- **Ambiguous**: just a typed name, or also a drawn or handwritten signature? Proposal: typed name only.

## 5. Undo / Redo
- **Files**: new `src/lib/pdfUndo.ts` (stack of edit-state snapshots, with tests), `PdfWorkspace.tsx`.
- **Placement (proposal)**: two icon buttons (Undo2 / Redo2, tooltips with the shortcuts) at the left of the editor header's right-hand group, before the auto-save status. Edit mode only.
- **Covers**: adding, editing, moving and deleting annotations, plus redaction and watermark changes (item 7). Moves are recorded once, when the drag ends. Shortcuts are Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (plus Ctrl+Y), ignored while typing in a field. The stack resets on reload.
- **Ambiguous**: should page operations (rotate, delete, duplicate) also be undoable? Proposal: no, annotations, redactions and watermarks only, as you listed.

## 6. Print
- **Files**: `PdfWorkspace.tsx`.
- **Placement (proposal)**: a Printer button next to Download in the header, in both view and edit mode.
- **Behaviour**: builds the same PDF as Download (with annotations, redactions and watermarks), loads it into a hidden frame and opens the browser's print dialog for the PDF only.
- **Ambiguous**: print the original file or the edited version? Proposal: the edited version, same as Download.

## 7. Redactions and watermarks as editable items
- **Files**: `src/lib/pdfDocuments.ts` (`watermarks: Watermark[]` with id, text, opacity, rotation, fontSize, color; the old single `watermark` is read as a one-item list), `PdfWorkspace.tsx` (redact panel ~1823, CanvasPage selection and resize handles, export).
- **Redactions**: in edit mode, a redaction box can be selected, moved, resized with corner handles, and deleted (Delete key or a trash icon). A **Redactions** list under "Add redaction", grouped by page, jumps to the box when you click it and has a delete action.
- **Watermarks**: a **Watermarks** list with Edit (loads the form, the button becomes "Update") and Remove. Several watermarks can exist at once. The form gains **Font size** and **Colour** fields. All are drawn on every page and in the export.
- Every change goes through undo/redo and history.
- **Optional (my proposal, not a stakeholder request)**: a confirmation dialog ("Redaction permanently removes content on export") before a redaction is applied.
- **Ambiguous**: are redactions "applied" on draw or on export? Today they're drawn as boxes and flattened on export. Proposal: confirm on draw, if the optional step is wanted.

## Technical notes
- New tests: `pdfUndo.test.ts` (undo/redo order, drag-end only), watermark list migration, label fallback for item 2, and picker scoping for item 1.
- AGENTS.md gets rules for the undo stack, the watermark list and the lead-sheet location. roadmap.md gets 7 tasks.
