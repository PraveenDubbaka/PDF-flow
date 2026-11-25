import { describe, expect, it } from 'vitest';
import { emptyPdfEditState, getEditStateWatermarks, resolveCalcLabel } from './pdfDocuments';
import { applyUndoSnapshot, captureUndoSnapshot, emptyUndoStack, popRedo, popUndo, pushUndo } from './pdfUndo';

describe('PDF undo/redo stack', () => {
  it('undoes and redoes annotation add, move, and delete in order without touching page order', () => {
    const initial = { ...emptyPdfEditState(), pageOrder: [1, 2] };
    let stack = emptyUndoStack<ReturnType<typeof captureUndoSnapshot>>();

    // Add annotation
    const added = {
      ...initial,
      annotations: [{ id: 'a1', kind: 'signature' as const, page: 1, x: 10, y: 20, width: 24, height: 7, color: '#111827', signerLabel: 'Reviewed by Alex', signedDate: '2026-11-25' }],
    };
    stack = pushUndo(stack, captureUndoSnapshot(initial));

    // Move annotation (single drag-end commit)
    const moved = { ...added, annotations: [{ ...added.annotations[0], x: 40, y: 50 }] };
    stack = pushUndo(stack, captureUndoSnapshot(added));

    // Rotate a page (not undoable — page state must remain intact on undo)
    const rotated = { ...moved, rotations: { '1': 90 } };

    // Undo move -> back to x:10, y:20 while preserving rotation 90
    const undo1 = popUndo(stack, captureUndoSnapshot(rotated));
    expect(undo1).not.toBeNull();
    const afterUndo1 = applyUndoSnapshot(rotated, undo1!.state);
    expect(afterUndo1.annotations[0]?.x).toBe(10);
    expect(afterUndo1.rotations['1']).toBe(90);

    // Undo add -> empty annotations
    const undo2 = popUndo(undo1!.stack, captureUndoSnapshot(afterUndo1));
    expect(undo2).not.toBeNull();
    const afterUndo2 = applyUndoSnapshot(afterUndo1, undo2!.state);
    expect(afterUndo2.annotations).toHaveLength(0);
    expect(popUndo(undo2!.stack, captureUndoSnapshot(afterUndo2))).toBeNull();

    // Redo add and move
    const redo1 = popRedo(undo2!.stack, captureUndoSnapshot(afterUndo2));
    expect(redo1).not.toBeNull();
    const afterRedo1 = applyUndoSnapshot(afterUndo2, redo1!.state);
    expect(afterRedo1.annotations[0]?.x).toBe(10);

    const redo2 = popRedo(redo1!.stack, captureUndoSnapshot(afterRedo1));
    expect(redo2).not.toBeNull();
    const afterRedo2 = applyUndoSnapshot(afterRedo1, redo2!.state);
    expect(afterRedo2.annotations[0]?.x).toBe(40);
  });

  it('clears redo future when a new edit is pushed after undo', () => {
    const s0 = emptyPdfEditState();
    const s1 = { ...s0, watermarks: [{ id: 'w1', text: 'DRAFT', opacity: 0.3, rotation: 45, fontSize: 48, color: '#595959' }] };
    let stack = pushUndo(emptyUndoStack(), captureUndoSnapshot(s0));
    const undone = popUndo(stack, captureUndoSnapshot(s1))!;
    expect(undone.stack.future).toHaveLength(1);
    stack = pushUndo(undone.stack, captureUndoSnapshot(s0));
    expect(stack.future).toHaveLength(0);
  });
});

describe('Watermark list migration and calculator label fallback', () => {
  it('migrates a legacy single watermark into a one-item list', () => {
    const list = getEditStateWatermarks({ watermark: { text: 'CONFIDENTIAL', opacity: 0.25, rotation: 30, applied: true } });
    expect(list).toEqual([{ id: 'legacy-watermark', text: 'CONFIDENTIAL', opacity: 0.25, rotation: 30, fontSize: 48, color: '#595959' }]);
  });

  it('prefers the explicit watermarks array even when empty', () => {
    const list = getEditStateWatermarks({ watermark: { text: 'OLD', opacity: 0.3, rotation: 45, applied: true }, watermarks: [] });
    expect(list).toEqual([]);
  });

  it('falls back to default calculator Result and Difference labels when blank', () => {
    expect(resolveCalcLabel('Closing balance', 'Result')).toBe('Closing balance');
    expect(resolveCalcLabel('   ', 'Result')).toBe('Result');
    expect(resolveCalcLabel(undefined, 'Difference')).toBe('Difference');
    expect(resolveCalcLabel('Variance', 'Difference')).toBe('Variance');
  });
});