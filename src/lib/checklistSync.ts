/**
 * Custom event-based sync for checklist data.
 * This enables real-time updates within the same browser session
 * (localStorage events only fire for other tabs/windows).
 */

export const CHECKLIST_SYNC_EVENT = 'checklist-sync';

export interface ChecklistSyncPayload {
 checklistId: string;
 data: any;
 timestamp: number;
}

/**
 * Dispatch a sync event when checklist data is updated
 */
export function dispatchChecklistSync(checklistId: string, data: any): void {
 const payload: ChecklistSyncPayload = {
 checklistId,
 data,
 timestamp: Date.now(),
 };
 
 window.dispatchEvent(
 new CustomEvent(CHECKLIST_SYNC_EVENT, { detail: payload })
 );
}

/**
 * Subscribe to checklist sync events
 * Returns an unsubscribe function
 */
export function subscribeToChecklistSync(
 callback: (payload: ChecklistSyncPayload) => void
): () => void {
 const handler = (event: Event) => {
 const customEvent = event as CustomEvent<ChecklistSyncPayload>;
 callback(customEvent.detail);
 };
 
 window.addEventListener(CHECKLIST_SYNC_EVENT, handler);
 
 return () => {
 window.removeEventListener(CHECKLIST_SYNC_EVENT, handler);
 };
}
