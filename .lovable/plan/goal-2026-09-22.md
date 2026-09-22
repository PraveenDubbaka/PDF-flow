## Goal
Add the four missing PDF editor capabilities shown in the supplied screenshots, using the existing compact editor rail and design system.

## Features
1. **Document details:** bookmarks with page navigation, editable title/author/subject/keywords/creator properties, and detected font listing.
2. **OCR:** recognize page text, show progress and extracted text, and persist searchable OCR data with the PDF.
3. **Calculations:** build multi-line calculations with operators, totals, labels/colors, place results on the current page, and edit/remove placed calculations.
4. **Ask Luka:** page-aware prompts, free-form questions, generated document responses, and actions to place a response as a note or calculation.

## Implementation
- Extend the saved PDF edit state for bookmarks, properties, OCR text, and calculations.
- Add four tools to the fixed right-side rail and matching panels.
- Reuse PDF text extraction and existing PDF annotations so results persist through Save/Cancel and saved versions.
- Keep all controls compact, token-based, and aligned with the existing editor.

## Validation
- Exercise each new panel in the current PDF: create and navigate a bookmark, save properties, extract text, calculate and place a result, ask a page question, and place the answer.
- Save, reopen, and confirm the new state remains available.
- Check the current build and preview diagnostics.
