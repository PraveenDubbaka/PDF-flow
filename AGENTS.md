# Architecture rules

- Scope PDF calculator typography overrides to `.pdf-calculator-panel` and exclude the shared stamp; this preserves other editor panels and native stamp sizing.
- Persist optional calculator result overrides and per-line stamp visibility in PDF edit state; shared stamp rendering uses these fields while preserving legacy stamp defaults and arithmetic.
- Keep calculator preview selection indices aligned with persisted calculation rows, and honor comparison visibility in all stamp renderers, so preview selections match placed output.
- Handle annotation dragging in the shared CanvasPage outside edit mode and commit only at drag end, so all placed item types move without duplicate actions or history entries.
- Store PDF edit-panel width in shared workspace state rather than per-tool state so resizing persists across tool switches.
- Scale calculator previews in a measured wrapper, not the shared stamp, so preview width and height fit without changing document output.
- Resize placed calculations through a measured stamp wrapper and persist scale with annotation bounds at drag end; this keeps text, borders, and exported sizing proportional without changing arithmetic.
- Resolve legacy label-only calculation annotations through the same calculation rendering path on the page and export; this preserves existing result-only stamps without changing stored arithmetic.