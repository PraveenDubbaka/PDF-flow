import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";

export interface PBCRequest {
 threadId: string;
 engagementId: string;
 createdAt: string;
 requestType: "single" | "multi";
 wpNumbers: string[];
 templateId: string;
 documentContent: string;
 sentAt?: string;
 status: "draft" | "sent" | "responded";
}

export interface PBCNotification {
 threadId: string;
 receivedAt: string;
}

export function savePBCRequest(r: PBCRequest): void {
 const key = `pbc-requests-${r.engagementId}`;
 const existing = readJsonFromLocalStorage<PBCRequest[]>(key, []);
 const idx = existing.findIndex(x => x.threadId === r.threadId);
 if (idx > -1) existing[idx] = r; else existing.push(r);
 writeJsonToLocalStorage(key, existing);
}

export function getPBCRequests(engagementId: string): PBCRequest[] {
 return readJsonFromLocalStorage<PBCRequest[]>(`pbc-requests-${engagementId}`, []);
}

export function addPBCNotification(engagementId: string, threadId: string): void {
 const key = `pbc-notifications-${engagementId}`;
 const existing = readJsonFromLocalStorage<PBCNotification[]>(key, []);
 writeJsonToLocalStorage(key, [...existing, { threadId, receivedAt: new Date().toISOString() }]);
 window.dispatchEvent(new CustomEvent("pbc-notification-update", { detail: { engagementId } }));
}

export function clearPBCNotifications(engagementId: string): void {
 writeJsonToLocalStorage(`pbc-notifications-${engagementId}`, []);
 window.dispatchEvent(new CustomEvent("pbc-notification-update", { detail: { engagementId } }));
}

export function getPBCNotificationCount(engagementId: string): number {
 return readJsonFromLocalStorage<PBCNotification[]>(`pbc-notifications-${engagementId}`, []).length;
}

export function getPBCNotifications(engagementId: string): PBCNotification[] {
 return readJsonFromLocalStorage<PBCNotification[]>(`pbc-notifications-${engagementId}`, []);
}

export function getPBCRequestByThread(engagementId: string, threadId: string): PBCRequest | undefined {
 return getPBCRequests(engagementId).find(r => r.threadId === threadId);
}

export interface GlobalPBCNotification {
 id: string;
 engagementId: string;
 threadId: string;
 clientName: string;
 receivedAt: string;
 read: boolean;
}

export function addGlobalPBCNotification(n: Omit<GlobalPBCNotification, 'id' | 'read'>): void {
 const key = 'global-pbc-notifications';
 const existing = readJsonFromLocalStorage<GlobalPBCNotification[]>(key, []);
 const entry: GlobalPBCNotification = { ...n, id: `gpbc-${Date.now()}`, read: false };
 writeJsonToLocalStorage(key, [entry, ...existing]);
 window.dispatchEvent(new CustomEvent('global-pbc-notification', { detail: entry }));
}

export function getGlobalPBCNotifications(): GlobalPBCNotification[] {
 return readJsonFromLocalStorage<GlobalPBCNotification[]>('global-pbc-notifications', []);
}

export function markGlobalPBCNotificationRead(id: string): void {
 const key = 'global-pbc-notifications';
 const existing = readJsonFromLocalStorage<GlobalPBCNotification[]>(key, []);
 writeJsonToLocalStorage(key, existing.map(n => n.id === id ? { ...n, read: true } : n));
}
