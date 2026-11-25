import type { PdfEditState } from './pdfDocuments';

export type PdfUndoSnapshot = Pick<PdfEditState, 'annotations' | 'calculations' | 'watermarks' | 'watermark' | 'history'>;

export interface UndoStack<T> {
  past: T[];
  future: T[];
}

export const emptyUndoStack = <T,>(): UndoStack<T> => ({ past: [], future: [] });

export function captureUndoSnapshot(state: PdfEditState): PdfUndoSnapshot {
  return structuredClone({
    annotations: state.annotations,
    calculations: state.calculations,
    watermarks: state.watermarks,
    watermark: state.watermark,
    history: state.history,
  });
}

export function applyUndoSnapshot(current: PdfEditState, snapshot: PdfUndoSnapshot): PdfEditState {
  const copy = structuredClone(snapshot);
  return {
    ...current,
    annotations: copy.annotations,
    calculations: copy.calculations,
    watermarks: copy.watermarks,
    watermark: copy.watermark,
    history: copy.history,
  };
}

export function pushUndo<T>(stack: UndoStack<T>, snapshot: T, limit = 50): UndoStack<T> {
  const past = [...stack.past, snapshot];
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    future: [],
  };
}

export function popUndo<T>(stack: UndoStack<T>, current: T): { stack: UndoStack<T>; state: T } | null {
  if (!stack.past.length) return null;
  const previous = stack.past[stack.past.length - 1];
  if (previous === undefined) return null;
  return {
    state: previous,
    stack: {
      past: stack.past.slice(0, -1),
      future: [current, ...stack.future],
    },
  };
}

export function popRedo<T>(stack: UndoStack<T>, current: T): { stack: UndoStack<T>; state: T } | null {
  if (!stack.future.length) return null;
  const next = stack.future[0];
  if (next === undefined) return null;
  return {
    state: next,
    stack: {
      past: [...stack.past, current],
      future: stack.future.slice(1),
    },
  };
}