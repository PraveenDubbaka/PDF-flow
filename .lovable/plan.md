## Goal

Turn uploaded PDF rows in the engagement’s left menu into a complete PDF workspace matching the supplied flow, styled with the current Countable design system. PDFs and saved edits will persist privately in Lovable Cloud.

## User flow

1. Upload one or more PDFs from a Documents folder in the left menu.
2. Store the real file, filename, folder, size, and engagement association in Lovable Cloud.
3. Click a PDF row to open it in the main work area and highlight the active row.
4. Preview pages with a thumbnail rail, current-page indicator, page navigation, zoom controls, loading/error states, and an “open in window” option.
5. Enter Edit mode to reveal Save, Cancel, and the right-side editing rail.
6. Save edits as a new current PDF version; Cancel restores the last saved version.

## PDF editing workspace

Build the screenshot’s editing modes as one consistent right rail:

- **Pages:** page thumbnails, selection, reorder, rotate, duplicate, and delete.
- **Search:** search extracted document text, show result counts, and jump between matches.
- **Images:** list detected images and replace a selected image while retaining its position and bounds.
- **Annotations:** selection, highlight, underline, strikeout, freehand, text, rectangle, circle, and arrow tools; color editing, rename, and delete.
- **Hyperlinks:** place a link region, attach a URL or another page, edit, and remove it.
- **Trial balance links:** place a reference region and associate it with an engagement trial-balance account.
- **Comments:** place sticky notes, edit comment text, and delete comments.
- **Redact and watermark:** draw permanent redaction regions; configure watermark text, opacity, rotation, and apply it to every page.
- **Security and optimization:** password/permission controls, decrypt when a password is supplied, sanitize embedded active content, and optimize the saved PDF.
- **History safety:** maintain a saved source version and working edit state so destructive tools are not committed until Save.

## Visual direction

- Preserve the existing full-height engagement shell, global header, left navigation, and right utility strip.
- Use the project’s semantic background, foreground, card, muted, border, primary, destructive, and focus tokens.
- Keep controls compact, 8–10px radii, flat interactions, black/high-contrast supporting text, and no hover lift or scale.
- Use existing Button, Input, Tooltip, ScrollArea, Dropdown, Dialog, and confirmation patterns.
- Adapt the workspace at narrower widths by collapsing thumbnail and property rails without obscuring the PDF.

## Cloud data and security

- Create a private `engagement-pdfs` storage bucket.
- Add authenticated, row-level-protected records for PDF documents, versions, annotations, comments, links, trial-balance references, and security/edit metadata.
- Scope every read/write to the signed-in owner and engagement; grant only authenticated users and service operations.
- Upload actual PDF bytes rather than retaining filename-only placeholders.
- Remove stored objects when a document is deleted and preserve version metadata for safe replacement/download.

## Implementation structure

- Add a focused PDF workspace component and smaller page rail, canvas, editor rail, and tool-panel components.
- Add a PDF document store/service that owns Cloud upload, download, version save, and edit-state serialization.
- Extend the existing engagement detail screen with a PDF document mode rather than creating a separate shell.
- Extend left-menu document records with Cloud IDs, storage paths, MIME type, size, and selected-document routing.
- Use a proven PDF renderer/manipulation library for page rendering and saved output; keep interaction overlays in React.
- Update generated Cloud types after schema creation.

## Validation

- Upload a real multi-page PDF from the left menu and reopen it from the active document row.
- Verify thumbnails, page navigation, zoom, search, each editing panel, Save/Cancel, download, and new-window viewing.
- Reload and confirm the PDF plus annotations/comments remain available from Lovable Cloud.
- Verify permanent redaction/watermark output by downloading and reopening the saved file.
- Verify desktop and compact-width layouts, focus states, empty/loading/error states, and no overlapping controls.
- Check current build, runtime, console, and network diagnostics after implementation.

## Technical note

True PDF encryption/decryption, sanitization, and content-stream optimization will run during the Cloud save pipeline rather than being represented by UI-only toggles. If a source PDF uses an unsupported encryption variant, the editor will retain the original and show a clear non-destructive error.
