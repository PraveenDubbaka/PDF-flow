export type EngagementRecord = {
 id: string;
 client: string;
 type: string;
 yearEnd: string;
 team: string;
 status: 'New' | 'In Progress';
 statusVariant: 'new' | 'inProgress';
 hasRF: boolean;
 dateCreated: string;
 firstYearAudit: boolean;
};

const ENG_KEY = 'cds_engagements_v1';
const META_KEY = (id: string) => `engagement-meta-${id}`;

export const SEED_ENGAGEMENTS: EngagementRecord[] = [
 { id: "AUD-NPM-Dec312025", client: "Northline Precision Manufacturing Inc.", type: "Audit (AUD)", yearEnd: "Dec 31, 2025", team: "R. Chandra · S. Whitfield · D. Okonkwo", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jul 27, 2026 09:00 AM", firstYearAudit: true },
 { id: "AUD-US-Dec312024", client: "Harbor Freight Logistics LLC", type: "Audit (AUD)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 22, 2026 08:00 AM", firstYearAudit: false },
 { id: "AUD-SL-Mar312024", client: "Shipping Line Inc.", type: "Audit (AUD)", yearEnd: "Mar 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 21, 2026 10:00 AM", firstYearAudit: false },
 { id: "COM-CON-Dec312024", client: "Shipping Line Inc.", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 21, 2026 09:00 AM", firstYearAudit: false },
 { id: "COM-PSP-Dec312023", client: "Source 40", type: "Compilation (COM)", yearEnd: "Dec 31, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Dec 30, 2025 06:26 AM", firstYearAudit: false },
 { id: "COM-QB-Dec312025", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Dec 31, 2025", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: true, dateCreated: "Jan 16, 2026 01:15 PM", firstYearAudit: false },
 { id: "COM-QB-Dec312024", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 13, 2026 01:36 AM", firstYearAudit: false },
 { id: "COM-CHE-Dec252024", client: "check add", type: "Compilation (COM)", yearEnd: "Dec 25, 2024", team: "View Assignees", status: "New", statusVariant: "new", hasRF: false, dateCreated: "Jan 16, 2026 08:20 AM", firstYearAudit: false },
 { id: "COM-OTH-Dec312024", client: "Other Revenue", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 16, 2026 02:38 AM", firstYearAudit: false },
 { id: "T2-AUT-Dec312023", client: "Shipping Line Inc.", type: "T2 (Corporations)", yearEnd: "Dec 31, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Dec 30, 2025 08:48 AM", firstYearAudit: false },
 { id: "COM-CAS-Dec312024", client: "cash flow ls", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: false, dateCreated: "Jan 13, 2026 09:21 AM", firstYearAudit: false },
 { id: "COM-QB-Jan142026", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Jan 14, 2026", team: "View Assignees", status: "New", statusVariant: "new", hasRF: false, dateCreated: "Jan 13, 2026 04:36 AM", firstYearAudit: false },
 { id: "COM-SHR-Dec302023", client: "ShRoll Forward", type: "Compilation (COM)", yearEnd: "Dec 30, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress", hasRF: true, dateCreated: "Jan 13, 2026 03:51 AM", firstYearAudit: false },
];

function seedDemoEngagementMeta() {
 const key = 'engagement-meta-AUD-NPM-Dec312025';
 if (localStorage.getItem(key)) return;
 const meta: EngagementMeta = {
   firstYearAudit: true,
   accountingFramework: 'ASPE',
   accountingStandards: 'CAS',
   industry: 'Manufacturing',
   periodStart: 'Jan 1, 2025',
   periodEnd: 'Dec 31, 2025',
   auditPeriodType: 'Full Year',
   firstTimeAdoption: false,
   budget: '138',
 };
 localStorage.setItem(key, JSON.stringify(meta));
}

export function loadEngagements(): EngagementRecord[] {
 seedDemoEngagementMeta();
 try {
   const raw = localStorage.getItem(ENG_KEY);
   if (raw) return JSON.parse(raw);
 } catch {}
 return SEED_ENGAGEMENTS;
}

export function loadAuditEngagements(): EngagementRecord[] {
 return loadEngagements().filter(e => e.type === 'Audit (AUD)');
}

export function saveEngagements(list: EngagementRecord[]): void {
 try {
 localStorage.setItem(ENG_KEY, JSON.stringify(list));
 } catch {}
}

export type EngagementMeta = {
 firstYearAudit: boolean;
 firstYearOnPlatform?: string;
 isRollForward?: string;
 firstYearTemplates?: string[];
 templateId?: string;
 accountingFramework?: string;
 industry?: string;
 accountingStandards?: string;
 budget?: string;
 periodStart?: string;
 periodEnd?: string;
 auditPeriodType?: string; // "Full Year" | "Interim (6-month)" | "Stub Period" | "Other"
 annualizeInterim?: boolean; // true by default when auditPeriodType === "Interim (6-month)"
 firstTimeAdoption?: boolean; // first-time adoption of accounting standard
};

export function getEngagementMeta(id: string): EngagementMeta {
 try {
 const raw = localStorage.getItem(META_KEY(id));
 if (raw) return JSON.parse(raw);
 } catch {}
 return { firstYearAudit: false };
}

export function setEngagementMeta(id: string, meta: EngagementMeta): void {
 try {
 localStorage.setItem(META_KEY(id), JSON.stringify(meta));
 } catch {}
}
