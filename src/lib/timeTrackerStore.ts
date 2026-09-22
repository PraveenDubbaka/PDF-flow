// Global time-tracker state — signal-bus pattern (mirrors lukaOpenStore.ts)

export interface TrackedEngagement {
  id: string;
  clientName: string;
  activeSec: number;
  idleSec: number;
  isIdle: boolean;
  isRecording: boolean; // true while the EngagementDetail is mounted
}

const ENABLED_KEY = 'time-tracking-enabled';
const ENGAGEMENTS_KEY = 'time-tracker-engagements';

function loadEngagements(): Map<string, TrackedEngagement> {
  try {
    const raw = localStorage.getItem(ENGAGEMENTS_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as TrackedEngagement[];
    const map = new Map<string, TrackedEngagement>();
    arr.forEach(e => map.set(e.id, { ...e, isRecording: false }));
    return map;
  } catch {
    return new Map();
  }
}

let _enabled: boolean = localStorage.getItem(ENABLED_KEY) === 'true';
let _engagements: Map<string, TrackedEngagement> = loadEngagements();

type Listener<T> = (val: T) => void;
const enabledListeners = new Set<Listener<boolean>>();
const engagementsListeners = new Set<Listener<Map<string, TrackedEngagement>>>();

function notifyEnabled() { enabledListeners.forEach(fn => fn(_enabled)); }
function notifyEngagements() { engagementsListeners.forEach(fn => fn(new Map(_engagements))); }

function persistEngagements() {
  try {
    localStorage.setItem(ENGAGEMENTS_KEY, JSON.stringify(Array.from(_engagements.values())));
  } catch { /* ignore */ }
}

// ── Subscriptions ────────────────────────────────────────────────────────────
export function subscribeEnabled(fn: Listener<boolean>) {
  enabledListeners.add(fn);
  return () => { enabledListeners.delete(fn); };
}

export function subscribeEngagements(fn: Listener<Map<string, TrackedEngagement>>) {
  engagementsListeners.add(fn);
  return () => { engagementsListeners.delete(fn); };
}

// ── Getters ──────────────────────────────────────────────────────────────────
export function getEnabled(): boolean { return _enabled; }
export function getEngagements(): Map<string, TrackedEngagement> { return new Map(_engagements); }

// ── Setters ──────────────────────────────────────────────────────────────────
export function setEnabled(val: boolean) {
  _enabled = val;
  localStorage.setItem(ENABLED_KEY, String(val));
  notifyEnabled();
}

export function registerEngagement(id: string, clientName: string) {
  const existing = _engagements.get(id);
  _engagements.set(id, {
    id,
    clientName,
    activeSec: existing?.activeSec ?? 0,
    idleSec: existing?.idleSec ?? 0,
    isIdle: false,
    isRecording: true,
  });
  persistEngagements();
  notifyEngagements();
}

export function unregisterEngagement(id: string, activeSec: number, idleSec: number) {
  const eng = _engagements.get(id);
  if (!eng) return;
  _engagements.set(id, { ...eng, activeSec, idleSec, isRecording: false });
  persistEngagements();
  notifyEngagements();
}

export function updateEngagementTime(id: string, activeSec: number, idleSec: number, isIdle: boolean) {
  const eng = _engagements.get(id);
  if (!eng) return;
  _engagements.set(id, { ...eng, activeSec, idleSec, isIdle });
  notifyEngagements(); // high-frequency — no persist here
}

export function logEngagementTime(id: string) {
  const eng = _engagements.get(id);
  if (!eng) return;
  const totalSec = eng.activeSec + eng.idleSec;
  const hrs = parseFloat((Math.round(totalSec / 900) / 4).toFixed(2));
  if (hrs > 0) {
    const entry = {
      id: `e-tt-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      roleKey: 'manager',
      userName: 'Praveen D.',
      tbRowId: 'g1',
      tbSection: 'general',
      hours: hrs,
      description: 'Time tracked via auto-timer',
    };
    try {
      const key = `audit-time-entries-${id}`;
      const raw = localStorage.getItem(key);
      const entries: unknown[] = raw ? JSON.parse(raw) : [];
      entries.unshift(entry);
      localStorage.setItem(key, JSON.stringify(entries));
    } catch { /* ignore */ }
  }
  clearEngagement(id);
}

export function clearEngagement(id: string) {
  _engagements.delete(id);
  persistEngagements();
  notifyEngagements();
}
