let isOpen = false;
const listeners = new Set<(open: boolean) => void>();

export const setLukaOpen = (open: boolean) => {
 if (isOpen === open) return;
 isOpen = open;
 listeners.forEach((fn) => fn(open));
};

export const getLukaOpen = () => isOpen;

export const subscribeLukaOpen = (fn: (open: boolean) => void) => {
 listeners.add(fn);
 return () => {
 listeners.delete(fn);
 };
};

// ── Config API — lets callers open Luka with a specific flow pre-loaded ──

export interface LukaOpenConfig {
 tab?: 'threads' | 'workspace';
 flow?: 'pbc-request';
 engagementId?: string;
 threadId?: string;
}

let _pendingConfig: LukaOpenConfig | null = null;
const _configListeners: Array<(c: LukaOpenConfig | null) => void> = [];

export function openLukaWithConfig(config: LukaOpenConfig) {
 _pendingConfig = config;
 setLukaOpen(true);
 _configListeners.forEach(l => l(config));
}

export function consumeLukaConfig(): LukaOpenConfig | null {
 const c = _pendingConfig;
 _pendingConfig = null;
 return c;
}

export function subscribeLukaConfig(fn: (c: LukaOpenConfig | null) => void): () => void {
 _configListeners.push(fn);
 return () => {
 const i = _configListeners.indexOf(fn);
 if (i > -1) _configListeners.splice(i, 1);
 };
}

