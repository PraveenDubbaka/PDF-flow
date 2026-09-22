export interface TrackerEntry {
  id: string;
  date: string;
  clientName: string;
  engagementId: string;
  category: string;
  type: 'Automatic' | 'Manual';
  billable: boolean;
  startTime: string;
  endTime: string;
  notes: string;
  userName?: string;
  isIdle?: boolean;
}

export const BILLABLE_CATEGORIES = [
  'Client Onboarding', 'Documents', 'Trial Balance & Adj. Entries',
  'Procedures', 'Financial Statements', 'Completion & Signoffs',
  'Admin', 'Client meeting', 'Internal meeting', 'Miscellaneous',
];

export const NON_BILLABLE_CATEGORIES = [
  'Admin', 'Client meeting', 'Internal meeting',
  'Business development', 'Education & learning', 'Miscellaneous',
];

export const DEMO_CLIENTS: Record<string, string[]> = {
  'Northline Precision': ['AUD-NPM-Dec312025'],
  'Harbor Freight Logistics': ['AUD-HFL-Mar312025'],
  'Kaushal Corp': ['COM-KAU-Feb282025'],
};

const STORAGE_KEY = 'tracker-modal-entries';

function makeSeed(): TrackerEntry[] {
  const d = new Date().toISOString().slice(0, 10);
  return [
    { id: 'tm-seed-1', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Client Onboarding', type: 'Automatic', billable: true, startTime: '09:00', endTime: '09:50', notes: 'Client Onboarding completed', userName: 'Praveen D.' },
    { id: 'tm-seed-2', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Documents', type: 'Automatic', billable: true, startTime: '10:00', endTime: '10:40', notes: 'Document addition completed', userName: 'Praveen D.' },
    { id: 'tm-seed-3', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Financial Statements', type: 'Automatic', billable: true, startTime: '11:00', endTime: '11:40', notes: 'Financial Statements reviewed', userName: 'Praveen D.' },
    { id: 'tm-seed-4', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Procedures', type: 'Automatic', billable: true, startTime: '13:00', endTime: '13:05', notes: 'Procedures leadsheet completed', userName: 'Praveen D.' },
    { id: 'tm-seed-5', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Procedures', type: 'Automatic', billable: false, startTime: '13:05', endTime: '13:35', notes: '', isIdle: true, userName: 'Praveen D.' },
    { id: 'tm-seed-6', date: d, clientName: 'Northline Precision', engagementId: 'AUD-NPM-Dec312025', category: 'Procedures', type: 'Automatic', billable: true, startTime: '14:00', endTime: '14:15', notes: 'Procedures leadsheet completed', userName: 'Praveen D.' },
  ];
}

export function loadTrackerEntries(): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrackerEntry[];
    const seed = makeSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function saveTrackerEntries(entries: TrackerEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

export function calcDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
  const m = (totalMin % 60).toString().padStart(2, '0');
  return `${h}h:${m}m:00s`;
}

export function fmtTime12(time24: string): string {
  if (!time24) return '—';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${mStr ?? '00'} ${ampm}`;
}
