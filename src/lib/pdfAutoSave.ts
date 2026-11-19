export type PdfSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Serialize writes so an older request cannot overwrite a more recent edit.
export class PdfAutoSave<T> {
  private pending: T | undefined;
  private running: Promise<boolean> | null = null;
  constructor(private persist: (state: T) => Promise<void>, private status: (status: PdfSaveStatus, state?: T) => void) {}

  enqueue(state: T): Promise<boolean> {
    this.pending = state;
    if (!this.running) {
      this.status('saving');
      this.running = this.drain().finally(() => { this.running = null; });
    }
    return this.running;
  }

  private async drain() {
    let success = true;
    while (this.pending !== undefined) {
      const state = this.pending;
      this.pending = undefined;
      try {
        await this.persist(state);
        this.status(this.pending === undefined ? 'saved' : 'saving', state);
        success = true;
      } catch {
        this.status('error');
        success = false;
      }
    }
    return success;
  }
}

export function requiresManualPdfSave(simulated: boolean, passwords?: { user: string; owner: string }) {
  return simulated || Boolean(passwords?.user || passwords?.owner);
}

export function formatOriginalAmount(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}