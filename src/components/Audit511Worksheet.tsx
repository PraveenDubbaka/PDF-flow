import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Info, AlertTriangle, X } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { cn } from "@/lib/utils";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

type YN = "Y" | "N" | "";
type RefField = RefDoc[];

interface ITApplication {
 id: string;
 num: number;
 name: string;
 appType: string;
 network: string;
 database: string;
 os: string;
 purpose: string;
 relevant: YN;
}

interface AppDetail {
 automation: string;
 systemReports: string;
 dataInputs: string;
 volumeComplexity: string;
 emergingTech: string;
}

interface ProcessRow {
 psc: string;
 wpRef: RefField;
 response: string;
}

interface TestingCheck {
 automatedSignificant: boolean;
 automatedPlanned: boolean;
 systemReportsRelied: boolean;
 substantiveInsufficient: boolean;
 gitcRelevant: boolean;
}

interface Data511 {
 // Part A
 aGovernance: string;
 aGovernanceWp: RefField;
 aOrgStructure: string;
 aOrgStructureWp: RefField;
 aLawsRegs: string;
 aLawsRegsWp: RefField;

 // Part B
 apps: ITApplication[];
 appDetails: Record<string, AppDetail>;

 // Part C
 cSecurity: ProcessRow;
 cSecurityBreaches: ProcessRow;
 cProgramChanges: ProcessRow;
 cDataConversion: ProcessRow;
 cItOperations: ProcessRow;

 // Part D
 dComplexity: ProcessRow;
 dFsRisks: ProcessRow;
 dTestingChecks: TestingCheck;
 dTestingResponse: ProcessRow;
 conclusion: string;
 notes: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyApp = (num: number): ITApplication => ({
 id: uid(), num, name: "", appType: "", network: "", database: "", os: "", purpose: "", relevant: "",
});

const emptyAppDetail = (): AppDetail => ({
 automation: "", systemReports: "", dataInputs: "", volumeComplexity: "", emergingTech: "",
});

const emptyProcess = (): ProcessRow => ({ psc: "", wpRef: [], response: "" });

const emptyChecks = (): TestingCheck => ({
 automatedSignificant: false,
 automatedPlanned: false,
 systemReportsRelied: false,
 substantiveInsufficient: false,
 gitcRelevant: false,
});

function buildDefault(isUS = false): Data511 {
 const entity = isUS ? "Harbor Freight LLC" : "Shipping Line Inc.";
 const itLead = isUS ? "M. Reyes (Director of IT)" : "D. Whitfield (IT Manager)";
 const msp = isUS ? "NorthPoint Managed IT (MSP)" : "PacificEdge IT Services (MSP)";
 const erpName = isUS ? "NetSuite (cloud ERP)" : "Microsoft Dynamics 365 Business Central (cloud ERP)";
 const tmsName = "CargoWise One (cloud-based transport management system)";
 const payrollName = isUS ? "ADP Workforce Now (cloud payroll)" : "Ceridian Dayforce (cloud payroll & HCM)";
 const fleetName = "ShipNet Telematics (cloud SaaS — fleet & emissions)";
 const m365 = "Microsoft 365 (Exchange Online, SharePoint, Teams)";

 const apps: ITApplication[] = [
 { id: uid(), num: 1, name: erpName, appType: "Commercial cloud (SaaS)", network: "Cloud-based — accessed via VPN over WLAN", database: "Vendor-managed (Azure SQL)", os: "Windows 11 (clients) / vendor-hosted (server)", purpose: "General ledger, AP, AR, fixed assets, financial close and reporting.", relevant: "Y" },
 { id: uid(), num: 2, name: tmsName, appType: "Commercial cloud (SaaS)", network: "Cloud-based — accessed via VPN over WLAN", database: "Vendor-managed (Oracle)", os: "Windows 11 (clients)", purpose: "Voyage costing, freight billing, port operations and customs — source of revenue posting feeds to ERP.", relevant: "Y" },
 { id: uid(), num: 3, name: payrollName, appType: "Commercial cloud (SaaS)", network: "Web-based — TLS over public internet", database: "Vendor-managed", os: "Web-based", purpose: "Payroll processing, statutory remittances and year-end reporting; posts a summarized journal feed to ERP.", relevant: "Y" },
 { id: uid(), num: 4, name: fleetName, appType: "Commercial cloud (SaaS)", network: "Cellular/satellite + cloud", database: "Vendor-managed", os: "Embedded / Web-based", purpose: "Fuel consumption, voyage telematics and emissions data used in operational KPIs and capitalization decisions.", relevant: "N" },
 { id: uid(), num: 5, name: m365, appType: "Commercial cloud (SaaS)", network: "Cloud-based", database: "Vendor-managed", os: "Windows 11 / Web", purpose: "Email, file storage, collaboration; supports financial reporting workflow and supporting documentation.", relevant: "N" },
 ];

 const appDetails: Record<string, AppDetail> = {};
 const [erpApp, tmsApp, payrollApp] = apps;
 appDetails[erpApp.id] = {
 automation: "Heavy reliance on automated controls within the ERP — 3-way match (PO/receipt/invoice) with configured tolerances, automated FX revaluation, automated bank reconciliation matching and automated period-end close routines.",
 systemReports: "AR ageing, trial balance, GL detail, accruals listing and bank reconciliation reports are standardized and reviewed monthly by the CFO; relied on for both management decision-making and audit substantive procedures.",
 dataInputs: "AP/AR clerks input transactions through the application UI; bank feeds and the TMS revenue feed import nightly via API. No direct database access — all changes via screens with full audit trail.",
 volumeComplexity: "Medium-high volume — ~45,000 GL postings/year, multi-currency, multi-entity consolidation. Greater automation reliance due to volume.",
 emergingTech: "No use of blockchain, RPA or AI in the financial reporting process at this time.",
 };
 appDetails[tmsApp.id] = {
 automation: "Relies on automated tariff/rate-card calculations to bill voyages, automated cost accruals based on voyage % complete, and an automated revenue/cost posting feed to the ERP at month-end.",
 systemReports: "Voyage profitability, unbilled revenue ageing and weekly bunker-cost reports — source data for revenue cut-off testing and operational KPIs.",
 dataInputs: "Operational data entered by port agents and operations team; nightly automated interface posts revenue and voyage cost summaries to ERP. No direct database access for any user.",
 volumeComplexity: "High volume — ~12,000 freight movements / ~1,800 voyages per year. Complex due to multi-leg voyages, FX and bunker cost allocation.",
 emergingTech: "Telematics-derived emissions data is consumed operationally but does not directly post to the GL.",
 };
 appDetails[payrollApp.id] = {
 automation: "Relies on automated gross-to-net calculations, statutory tax tables and automated GL posting feed; Controller reviews summarized journal before posting.",
 systemReports: "Payroll register and statutory remittance reports reviewed by Controller each pay period.",
 dataInputs: "Time data imported from time-clock interface; manual one-off adjustments require Controller approval. No direct database access.",
 volumeComplexity: "Medium volume — ~200 employees, weekly and monthly pay cycles.",
 emergingTech: "None.",
 };

 return {
 aGovernance: isUS
 ? `Board-approved 3-year IT strategic plan (2024–2026) aligned with the post-acquisition integration roadmap. Director of IT (${itLead}) owns the plan and reports to the CFO; reviewed by the Audit Committee quarterly. IT risks tracked in a quarterly IT risk register covering cyber, vendor concentration and data privacy. Formal policies in place: Information Security, Acceptable Use, Change Management, Backup & Recovery, Incident Response and Data Privacy (CCPA-aligned).`
 : `Board-approved 3-year IT strategic plan (2024–2026) aligned with the fleet modernization and ESG roadmap. IT Manager (${itLead}) owns the plan and reports to the CFO; reviewed by the Audit Committee semi-annually. IT risks tracked in a formal IT risk register refreshed quarterly. Policies in place: Information Security, Acceptable Use, Change Management, Backup & Recovery, Incident Response and PIPEDA Privacy Policy.`,
 aGovernanceWp: [],

 aOrgStructure: isUS
 ? `Small in-house IT team (Director of IT + 2 analysts) responsible for end-user computing, application administration and vendor management. Infrastructure monitoring, network and helpdesk co-sourced to ${msp} (SOC 2 Type II). All key financial applications are cloud SaaS — application and database hosting is vendor-managed. ${itLead} reports to the CFO and is the key contact for ${msp}. Training: annual security-awareness mandatory for all staff; admins attend vendor and CISSP-level training.`
 : `Lean in-house IT team (IT Manager + 1 analyst) responsible for end-user computing, application administration and vendor oversight. Infrastructure monitoring, network and helpdesk co-sourced to ${msp} (CSAE 3416 / SOC 2 Type II). All key financial applications are cloud SaaS managed by the vendor. ${itLead} reports to the CFO and is the key contact for ${msp}. Training: annual security-awareness for all staff; vendor product training for admins.`,
 aOrgStructureWp: [],

 aLawsRegs: isUS
 ? "Subject to CCPA / CPRA (California) for employee and customer data and SOC obligations through commercial contracts. Federal maritime data and EPA reporting handled operationally. Director of IT and Compliance monitor regulatory change. No direct effect on F/S; indirect contingent-liability risk considered immaterial at this stage."
 : "Subject to PIPEDA (federal) and BC PIPA for employee and customer data. IT Manager and external counsel monitor regulatory change; MSP advises on new requirements. Transport Canada and CBSA filings are operational. No direct effect on F/S; indirect contingent-liability risk from data-breach fines considered remote and immaterial.",
 aLawsRegsWp: [],

 apps,
 appDetails,

 cSecurity: { psc: "Y", wpRef: [], response: `Unique user IDs and complex passwords enforced through Azure AD / Entra ID SSO with MFA required for all cloud apps. Joiner-mover-leaver process driven by HR ticket — provisioning by IT, quarterly access reviews signed off by department heads. Privileged (sysadmin) access restricted to ${itLead} and one ${msp} engineer; reviewed monthly. Physical: head office uses keycard access and CCTV; servers are vendor-hosted in tier-3 data centres. Monitoring: managed firewall, EDR (CrowdStrike) and centralized log alerts via ${msp} 24/7 SOC. Anti-virus, anti-spam and DNS filtering in place.` },
 cSecurityBreaches: { psc: "Y", wpRef: [], response: `${itLead} confirmed no material cyber incidents or breaches in the current fiscal year. One phishing attempt blocked by EDR; no data exfiltration. Logged and reported to the Audit Committee — no impact on the planned audit approach.` },
 cProgramChanges: { psc: "Y", wpRef: [], response: "All key financial systems are vendor-managed SaaS — entity has no access to source code. Vendor patches and minor releases applied automatically on the vendor cadence. No major version upgrades or platform changes during the period. Internal configuration changes (chart of accounts, three-way-match tolerance limits, TMS tariffs) follow the Change Management Policy — change ticket, CFO approval and post-implementation review for any financially-relevant change." },
 cDataConversion: { psc: "Y", wpRef: [], response: isUS
 ? "CoastLine Drayage acquisition (Q4 2024) — payroll and AP master data migrated into ADP and NetSuite using vendor migration tooling. Reconciliation of opening balances signed off by Controller; no exceptions noted. No other data conversions in the year."
 : "No major data conversions occurred during the year. The 2023 migration from on-premise QuickBooks to Dynamics 365 BC remains stable; no residual conversion issues identified." },
 cItOperations: { psc: "Y", wpRef: [], response: `Cloud SaaS providers manage application backups (geo-redundant). ${msp} performs daily backup of M365 mailboxes and SharePoint via Veeam Cloud Connect with monthly restore tests. Job scheduling: ERP and TMS month-end close jobs monitored by ${itLead}; failures alert via PagerDuty. No significant operational incidents in the period.` },

 dComplexity: { psc: "Y", wpRef: [], response: `${entity} operates a moderately complex IT environment relying on three cloud SaaS financial systems (ERP, TMS and Payroll) with automated interfaces. Reliance on automated controls is material for revenue recognition (voyage % complete from TMS) and bunker fuel inventory. An IT specialist is engaged to assist with reliance on system-generated reports and the TMS-to-ERP interface; otherwise complexity is manageable without a specialist.` },
 dFsRisks: { psc: "Y", wpRef: [], response: "F/S-level risk identified: reliance on the automated revenue posting from TMS to ERP — risk of incomplete or inaccurate revenue. Documented No other F/S-level IT risks identified." },
 dTestingChecks: {
 automatedSignificant: true,
 automatedPlanned: true,
 systemReportsRelied: true,
 substantiveInsufficient: false,
 gitcRelevant: true,
 },
 dTestingResponse: { psc: "Y", wpRef: [], response: `Plan to test operating effectiveness of GITCs (access management, change management and IT operations) for the ERP and TMS Substantive testing alone is not sufficient for the high-volume automated revenue posting; GITC reliance reduces substantive sample sizes. Payroll: substantive analytical procedures with corroboration of the summarized GL feed considered sufficient — GITCs not relied on.` },
 conclusion: `Sufficient information has been obtained to understand the IT environment relevant to the preparation of the F/S of ${entity}. RAFUIT and planned GITC testing carried forward; F/S-level IT risk carried forward`,
 notes: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
 title: string; subtitle?: string; children: React.ReactNode;
}) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
 </div>
 {children}
 </div>
 );
}

function PartHeader({ letter, title, description }: { letter: string; title: string; description: string }) {
 return (
 <div className="flex items-start gap-3 pb-1">
 <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1C63A6] text-white text-xs font-bold shrink-0 mt-0.5">
 {letter}
 </span>
 <div>
 <p className="text-sm font-semibold text-foreground">{title}</p>
 <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
 </div>
 </div>
 );
}

function NarrativeRow({ label, bullets, value, wpRef, locked, onChange, onWpChange, lukaFilled, lukaHighlight, lukaRef }: {
 label: string;
 bullets?: string[];
 value: string;
 wpRef: RefField;
 locked: boolean;
 onChange: (v: string) => void;
 onWpChange: (r: RefField) => void;
 lukaFilled?: boolean;
 lukaHighlight?: boolean;
 lukaRef?: { current: HTMLElement | null };
}) {
 return (
 <tr ref={lukaRef as any} className={`group hover:bg-muted/30 transition-colors align-top${lukaHighlight ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-5 py-3 text-sm text-foreground w-[38%]">
 <span className="font-medium">{label}</span>
 {bullets && (
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 {bullets.map((b, i) => <li key={i} className="text-sm text-muted-foreground">{b}</li>)}
 </ul>
 )}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!value} />
 <div className="flex-1">
 <LukaTypingRow filled={lukaFilled ?? false}>
 <Textarea
 disabled={locked}
 value={value}
 onChange={e => onChange(e.target.value)}
 placeholder="Enter response…"
 className="min-h-[72px] text-sm bg-background resize-none"
 />
 </LukaTypingRow>
 {lukaFilled && (
 <div className="mt-1">
 </div>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-center w-[100px]">
 <RefButton
 reference={wpRef}
 onAttach={doc => onWpChange([...wpRef, doc])}
 onRemove={i => onWpChange(wpRef.filter((_, idx) => idx !== i))}
 disabled={locked}
 />
 </td>
 </tr>
 );
}

function ProcessTable({ rows, locked, onChange, lukaFilledFields, lukaHighlightFields }: {
 rows: { id: string; label: string; bullets?: string[]; row: ProcessRow }[];
 locked: boolean;
 onChange: (id: string, patch: Partial<ProcessRow>) => void;
 lukaFilledFields?: Set<string>;
 lukaHighlightFields?: Set<string>;
}) {
 return (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-5 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[38%]">Procedure</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-28">PSC? (Y/N)</th>
 <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[38%]">Response / Comments</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">W/P Ref.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {rows.map(({ id, label, bullets, row }) => (
 <tr key={id} className={`group hover:bg-muted/30 transition-colors align-top${lukaHighlightFields?.has(id) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-5 py-3 text-sm text-foreground">
 <span className="font-medium">{label}</span>
 {bullets && (
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 {bullets.map((b, i) => <li key={i} className="text-sm text-muted-foreground">{b}</li>)}
 </ul>
 )}
 </td>
 <td className="px-4 py-3 w-28">
 <Select value={row.psc} onValueChange={v => onChange(id, { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <div className="flex-1">
 <LukaTypingRow filled={lukaFilledFields?.has(id) ?? false}>
 <Textarea
 disabled={locked}
 value={row.response}
 onChange={e => onChange(id, { response: e.target.value })}
 placeholder="Enter response…"
 className="min-h-[64px] text-sm bg-background resize-none"
 />
 </LukaTypingRow>
 {lukaFilledFields?.has(id) && (
 <div className="mt-1">
 </div>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-center w-24">
 <RefButton
 reference={row.wpRef}
 onAttach={doc => onChange(id, { wpRef: [...row.wpRef, doc] })}
 onRemove={i => onChange(id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

// ── B1 Dropdown Options ────────────────────────────────────────────────────────

const APP_TYPE_OPTIONS = [
  "Commercial cloud (SaaS)",
  "Commercial on-premise",
  "ERP / integrated suite",
  "Custom / in-house developed",
  "Third-party managed service",
  "Open-source software",
];

const NETWORK_OPTIONS = [
  "Cloud-based (SaaS / PaaS)",
  "Cloud-based — VPN access",
  "On-premise LAN",
  "Web-based — public internet",
  "Hybrid (on-premise + cloud)",
  "Cellular / satellite + cloud",
  "Client-server (internal only)",
];

const DATABASE_OPTIONS = [
  "Vendor-managed (cloud)",
  "Microsoft SQL Server",
  "Oracle Database",
  "MySQL / MariaDB",
  "PostgreSQL",
  "Azure SQL",
  "Amazon RDS",
  "Google Cloud SQL",
  "SAP HANA",
];

const OS_OPTIONS = [
  "Windows 11 (clients)",
  "Windows Server 2022",
  "macOS (clients)",
  "Linux / Ubuntu Server",
  "Web-based (no local OS)",
  "iOS / Android (mobile)",
  "Embedded / vendor-hosted",
];

const PURPOSE_OPTIONS = [
  "General ledger / Financial reporting",
  "Accounts payable / Receivable",
  "Payroll & HCM",
  "Inventory management",
  "Revenue recognition",
  "Fixed assets",
  "Banking & treasury",
  "Tax compliance",
  "CRM / Sales",
  "Operational / logistics management",
  "Document / records management",
  "IT infrastructure / monitoring",
];

function DropOrText({ value, onChange, disabled, options, placeholder = "Select…", multiline = false }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
  options: string[]; placeholder?: string; multiline?: boolean;
}) {
  const [customMode, setCustomMode] = useState(() => value !== "" && !options.includes(value));
  if (customMode) {
    return (
      <div className="flex gap-1 items-start">
        {multiline
          ? <Textarea disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
              className="min-h-[56px] text-sm bg-background resize-none flex-1" />
          : <Input disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
              className="h-7 text-sm bg-background flex-1" />}
        {!disabled && (
          <button onClick={() => { onChange(""); setCustomMode(false); }}
            className="mt-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Clear">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
  return (
    <Select value={value} onValueChange={v => { if (v === "__other__") { setCustomMode(true); } else onChange(v); }} disabled={disabled}>
      <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        <SelectItem value="__other__">Other…</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Audit511Worksheet({ isUS = false }: { isUS?: boolean }) {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();
 const storageKey = `audit-511-data-v2-${engagementId ?? (isUS ? "us" : "ca")}`;

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLElement>(null);
 const [data, setData] = useState<Data511>(() => {
 const saved = readJsonFromLocalStorage<Data511 | null>(storageKey, null);
 if (!saved) return buildDefault(isUS);
 const def = buildDefault(isUS);
 return {...def,...saved };
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const locked = data.concluded;

 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 function patch<K extends keyof Data511>(key: K, val: Data511[K]) {
 setData(d => ({...d, [key]: val }));
 }

 function patchProcess(key: keyof Data511, partial: Partial<ProcessRow>) {
 setData(d => ({...d, [key]: {...(d[key] as ProcessRow),...partial } }));
 }

 // App management
 function addApp() {
 const num = data.apps.length + 1;
 const newApp = emptyApp(num);
 setData(d => ({...d, apps: [...d.apps, newApp] }));
 }

 function updateApp(idx: number, partial: Partial<ITApplication>) {
 setData(d => {
 const apps = [...d.apps];
 apps[idx] = {...apps[idx],...partial };
 return {...d, apps };
 });
 }

 function deleteApp(idx: number) {
 setData(d => {
 const apps = d.apps.filter((_, i) => i !== idx).map((a, i) => ({...a, num: i + 1 }));
 return {...d, apps };
 });
 }

 function getAppDetail(id: string): AppDetail {
 return data.appDetails[id] ?? emptyAppDetail();
 }

 function updateAppDetail(id: string, partial: Partial<AppDetail>) {
 setData(d => ({
...d,
 appDetails: {...d.appDetails, [id]: {...getAppDetail(id),...partial } },
 }));
 }

 // Part C process rows
 const PART_C_KEYS = ["cSecurity", "cSecurityBreaches", "cProgramChanges", "cDataConversion", "cItOperations"] as const;

 function patchPartC(id: string, partial: Partial<ProcessRow>) {
 const key = id as typeof PART_C_KEYS[number];
 patchProcess(key, partial);
 }

 const partCRows: { id: string; label: string; bullets?: string[]; row: ProcessRow }[] = [
 {
 id: "cSecurity",
 label: "1. IT security",
 bullets: [
 "Authentication — unique user IDs and complex passwords.",
 "User access management — how users are added, modified and removed.",
 "Privileged (system administrator) user access management.",
 "Physical access — how IT systems are physically protected.",
 "Security monitoring — firewalls, security logs, periodic access reviews.",
 "Cyber risks — anti-virus, anti-spam, notifications monitored by management.",
 ],
 row: data.cSecurity,
 },
 {
 id: "cSecurityBreaches",
 label: "2. IT security breaches",
 bullets: [
 "Document any breaches or cyber incidents (e.g., ransomware) during the audit year.",
 "Note the impact of any breach on the planned audit approach.",
 ],
 row: data.cSecurityBreaches,
 },
 {
 id: "cProgramChanges",
 label: "3. Program changes",
 bullets: [
 "Frequency and implementation of program changes to key IT systems.",
 "Whether the entity can modify the source code of key financial software.",
 "Nature and extent of modifications made during the period.",
 "Process for upgrading software and converting data (e.g., vendor patches).",
 "Minor/major version upgrades, new releases or platform changes.",
 "Key configurations made to financial applications (e.g., tolerance limits).",
 ],
 row: data.cProgramChanges,
 },
 {
 id: "cDataConversion",
 label: "4. Data conversion",
 bullets: [
 "Document any major data conversions during the year and the risks/impact to the audit.",
 ],
 row: data.cDataConversion,
 },
 {
 id: "cItOperations",
 label: "5. IT operations",
 bullets: [
 "Data backup and recovery — financial data backed up and tested for recovery.",
 "Job scheduling and monitoring — production jobs operate as intended.",
 ],
 row: data.cItOperations,
 },
 ];

 const APP_DETAIL_TOPICS: { key: keyof AppDetail; label: string; bullets?: string[] }[] = [
 {
 key: "automation",
 label: "Automation",
 bullets: [
 "Extent to which management relies on automated controls to ensure completeness and accuracy of financial information.",
 "E.g., does management rely on automated controls within the inventory system to calculate cost of inventory?",
 ],
 },
 {
 key: "systemReports",
 label: "System generated reports",
 bullets: [
 "Extent of the entity's reliance on system generated reports in the processing of information.",
 "If management relies on system-generated reports and the audit team intends to rely on them without testing GITCs, the reports must be substantively tested.",
 ],
 },
 {
 key: "dataInputs",
 label: "Data inputs and system interfaces",
 bullets: [
 "How financial information is recorded (manual data inputs vs. automated inputs).",
 "Number of interfaces between key financial systems and how management monitors them.",
 "Whether anyone has direct access to the financial system database to record, modify or delete data.",
 ],
 },
 {
 key: "volumeComplexity",
 label: "Volume and complexity of data",
 bullets: [
 "Volume and complexity of financial transactions processed in the year.",
 "Whether transactions and source information are stored in paper or digital form.",
 "Greater volume/complexity increases reliance on automated controls.",
 ],
 },
 {
 key: "emergingTech",
 label: "Emerging technologies",
 bullets: [
 "Use or development of emerging technologies affecting the entity's financial reporting processes or internal controls (e.g., blockchain, RPA, AI).",
 ],
 },
 ];

 return (
 <div className="flex flex-col h-full">
 {isDemoEngagement && (
 <LukaStatusBar
 isActive={true}
 message={
   lukaState === 'loading'
     ? "Luka is populating fields from prior file and connected sources…"
     : lukaState === 'done'
     ? "Luka has reviewed this section — fields flagged for your review."
     : "Luka is populating information from Xero and prior file…"
 }
 actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.riskAssessment.actions.map(a => ({
   ...a,
   onTrigger: () => {
     setLukaState('loading');
     lukaSequentialFill([
       {
         scrollRef: firstFillRef,
         set: () => {
           setData(d => ({ ...d, aGovernance: isUS ? 'Board-approved 3-year IT strategic plan (2024–2026). Director of IT reports to the CFO. IT risks tracked in a quarterly IT risk register. Formal policies in place: Information Security, Acceptable Use, Change Management, Backup & Recovery, Incident Response and Data Privacy (CCPA-aligned).' : 'Board-approved 3-year IT strategic plan (2024–2026). IT Manager reports to the CFO; reviewed by Audit Committee semi-annually. IT risks tracked in a formal IT risk register refreshed quarterly. Policies in place: Information Security, Acceptable Use, Change Management, Backup & Recovery, Incident Response and PIPEDA Privacy Policy.' }));
           markLukaFilled('aGovernance');
         },
       },
       {
         set: () => {
           setData(d => ({ ...d, aOrgStructure: isUS ? 'Small in-house IT team (Director of IT + 2 analysts). Infrastructure and helpdesk co-sourced to NorthPoint Managed IT (SOC 2 Type II). All key financial applications are cloud SaaS managed by the vendor.' : 'Lean in-house IT team (IT Manager + 1 analyst). Infrastructure and helpdesk co-sourced to PacificEdge IT Services (CSAE 3416 / SOC 2 Type II). All key financial applications are cloud SaaS managed by the vendor.' }));
           markLukaFilled('aOrgStructure');
         },
       },
       {
         set: () => {
           setData(d => ({ ...d, cSecurity: { ...d.cSecurity, response: 'Unique user IDs and complex passwords enforced through Azure AD / Entra ID SSO with MFA required for all cloud apps. Joiner-mover-leaver process driven by HR ticket. Privileged access restricted to IT Manager and one MSP engineer; reviewed monthly. Physical: head office uses keycard access and CCTV. Monitoring: managed firewall, EDR (CrowdStrike) and centralized log alerts via MSP 24/7 SOC.' } }));
           markLukaFilled('cSecurity');
         },
       },
     ], () => setLukaState('done'));
   },
 }))}
 />
 )}
 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Gain an understanding of the entity's IT environment and assess the overall criticality of IT to the entity and impact on the audit approach. Complete Parts A–C, then to document information flows. Identified RAFUIT and GITCs are documented
 </p>
 </div>
 <div className="p-6 space-y-6">

 {/* ── PART A ─────────────────────────────────────────────────────── */}
 <PartHeader
 letter="A"
 title="IT Governance, Strategy and Structure"
 description="Understand and document the entity's overall IT governance, strategy and structure to identify organizational-level risks relevant to financial reporting."
 />

 <SectionCard title="A. IT Governance, Strategy and Structure">
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-5 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[38%]">Document</th>
 <th className="w-[38%] px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Response / Comments</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-[100px]">W/P Ref.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 <NarrativeRow
 label="1. IT governance and strategy"
 bullets={[
 "Existence of a formalized IT strategic plan aligned with the entity's business plan.",
 "How IT risks are identified and managed.",
 "Existence of formal IT-related policies and procedures (e.g., IT security policy, program change policy).",
 "Importance of IT to the industry and whether it drives growth and success.",
 ]}
 value={data.aGovernance}
 wpRef={data.aGovernanceWp}
 locked={locked}
 onChange={v => patch("aGovernance", v)}
 onWpChange={r => patch("aGovernanceWp", r)}
 lukaFilled={isDemoEngagement && lukaFilledFields.has('aGovernance')}
 lukaHighlight={isDemoEngagement && lukaHighlightFields.has('aGovernance')}
 lukaRef={firstFillRef}
 />
 <NarrativeRow
 label="2. IT organizational structure"
 bullets={[
 "Number of IT staff, their responsibilities and skill levels.",
 "Physical location of servers (on-premises, cloud, or combination).",
 "IT oversight and management — internal or outsourced to a third party?",
 ]}
 value={data.aOrgStructure}
 wpRef={data.aOrgStructureWp}
 locked={locked}
 onChange={v => patch("aOrgStructure", v)}
 onWpChange={r => patch("aOrgStructureWp", r)}
 lukaFilled={isDemoEngagement && lukaFilledFields.has('aOrgStructure')}
 lukaHighlight={isDemoEngagement && lukaHighlightFields.has('aOrgStructure')}
 />
 <NarrativeRow
 label="Laws and regulations"
 bullets={[
 "Whether the entity is required to follow data protection legislation.",
 "Whether there is a direct or indirect effect on the entity's F/S.",
 ]}
 value={data.aLawsRegs}
 wpRef={data.aLawsRegsWp}
 locked={locked}
 onChange={v => patch("aLawsRegs", v)}
 onWpChange={r => patch("aLawsRegsWp", r)}
 />
 </tbody>
 </table>
 </div>
 </SectionCard>

 {/* ── PART B ─────────────────────────────────────────────────────── */}
 <PartHeader
 letter="B"
 title="IT Applications and Underlying Infrastructure"
 description="Identify key financial systems in scope to determine inherent reliance on IT for financial transaction processing and reporting."
 />

 {/* Applications table */}
 <SectionCard title="B1. IT Applications — Infrastructure Overview">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[1280px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border text-sm font-semibold text-foreground uppercase tracking-wider">
 <th className="px-4 py-2.5 text-center" style={{ width: 40 }}>#</th>
 <th className="px-4 py-2.5 text-left" style={{ width: 280 }}>Application Name & Type</th>
 <th className="px-4 py-2.5 text-left" style={{ width: 170 }}>Network</th>
 <th className="px-4 py-2.5 text-left" style={{ width: 170 }}>Database</th>
 <th className="px-4 py-2.5 text-left" style={{ width: 175 }}>Operating System</th>
 <th className="px-4 py-2.5 text-left" style={{ width: 200 }}>Nature & Purpose</th>
 <th className="px-4 py-2.5 text-center" style={{ width: 130 }}>Relevant to Audit?</th>
 <th style={{ width: 32 }} />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.apps.map((app, i) => (
 <tr key={app.id} className="group hover:bg-muted/30 transition-colors align-top">
 <td className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">{app.num}</td>
 <td className="px-4 py-2.5 space-y-1">
 <Textarea disabled={locked} value={app.name} onChange={e => updateApp(i, { name: e.target.value })}
 placeholder="E.g., QuickBooks, SAP…" className="min-h-[56px] text-sm bg-background resize-none" />
 <DropOrText value={app.appType} onChange={v => updateApp(i, { appType: v })} disabled={locked}
   options={APP_TYPE_OPTIONS} placeholder="Application type…" />
 </td>
 <td className="px-4 py-2.5">
   <DropOrText value={app.network} onChange={v => updateApp(i, { network: v })} disabled={locked}
     options={NETWORK_OPTIONS} placeholder="Network type…" />
 </td>
 <td className="px-4 py-2.5">
   <DropOrText value={app.database} onChange={v => updateApp(i, { database: v })} disabled={locked}
     options={DATABASE_OPTIONS} placeholder="Database…" />
 </td>
 <td className="px-4 py-2.5">
   <DropOrText value={app.os} onChange={v => updateApp(i, { os: v })} disabled={locked}
     options={OS_OPTIONS} placeholder="Operating system…" />
 </td>
 <td className="px-4 py-2.5">
   <DropOrText value={app.purpose} onChange={v => updateApp(i, { purpose: v })} disabled={locked}
     options={PURPOSE_OPTIONS} placeholder="Nature & purpose…" multiline />
 </td>
 <td className="px-4 py-2.5">
 <Select value={app.relevant} onValueChange={v => updateApp(i, { relevant: v as YN })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-2 py-2 text-center">
 {!locked && (
 <button onClick={() => deleteApp(i)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
 <Trash2 className="h-3 w-3 text-destructive" />
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {!locked && (
 <div className="px-6 py-3 border-t border-border">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addApp}>
 <Plus className="h-3.5 w-3.5" /> Add application
 </Button>
 </div>
 )}
 </div>
 </SectionCard>

 {/* Per-application detail cards */}
 {data.apps.length > 0 && (
 <div className="space-y-4">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
 B2. Application Detail — For each application identified above
 </p>
 {data.apps.map(app => {
 const detail = getAppDetail(app.id);
 const appLabel = app.name || `Application ${app.num}`;
 return (
 <SectionCard
 key={app.id}
 title={`${app.num}. ${appLabel}`}
 subtitle={app.appType || undefined}
 >
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-5 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[32%]">Topic</th>
 <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Response / Comments</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {APP_DETAIL_TOPICS.map(topic => (
 <tr key={topic.key} className="group hover:bg-muted/30 transition-colors align-top">
 <td className="px-5 py-3 text-sm text-foreground">
 <span className="font-medium">{topic.label}</span>
 {topic.bullets && (
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 {topic.bullets.map((b, i) => (
 <li key={i} className="text-sm text-muted-foreground">{b}</li>
 ))}
 </ul>
 )}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!detail[topic.key]} />
 <Textarea
 disabled={locked}
 value={detail[topic.key]}
 onChange={e => updateAppDetail(app.id, { [topic.key]: e.target.value })}
 placeholder="Enter response…"
 className="min-h-[64px] text-sm bg-background resize-none flex-1"
 />
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </SectionCard>
 );
 })}
 </div>
 )}

 {/* ── PART C ─────────────────────────────────────────────────────── */}
 <PartHeader
 letter="C"
 title="IT Processes Related to Financial Reporting IT Systems"
 description="Understand the IT processes that manage the environment and operations relevant to information processing. Understanding GITCs helps identify those relevant to applications subject to RAFUIT."
 />

 <SectionCard title="C. IT Processes">
 <ProcessTable
 rows={partCRows}
 locked={locked}
 onChange={patchPartC}
 lukaFilledFields={isDemoEngagement ? lukaFilledFields : undefined}
 lukaHighlightFields={isDemoEngagement ? lukaHighlightFields : undefined}
 />
 </SectionCard>

 {/* ── PART D ─────────────────────────────────────────────────────── */}
 <PartHeader
 letter="D"
 title="Evaluation and Overall Conclusion"
 description="Evaluate the impact of the IT environment on the planned audit approach and identify any RAFUIT."
 />

 <SectionCard title="D. Evaluation">
 <ProcessTable
 rows={[
 {
 id: "dComplexity",
 label: "Complexity of the IT environment",
 bullets: [
 "Extent of customization — COTS with little customization, or custom/complex ERP with source code access?",
 "Extent of integration — integrated with other applications? Are financial systems web-facing?",
 "Extent of automation — highly automated paperless processing or complex automated procedures?",
 "Based on above, evaluate whether an IT expert is required.",
 ],
 row: data.dComplexity,
 },
 {
 id: "dFsRisks",
 label: "Financial statement level risks",
 bullets: [
 "Document any F/S level risks identified from the IT environment information",
 ],
 row: data.dFsRisks,
 },
 ]}
 locked={locked}
 onChange={(id, partial) => patchProcess(id as keyof Data511, partial)}
 />
 </SectionCard>

 {/* Testing OE checkboxes */}
 <SectionCard title="D. Testing Operating Effectiveness of Controls">
 <div className="px-5 py-4 space-y-4">
 <p className="text-sm text-foreground font-medium">
 Based on risk assessment procedures and information obtained, check all that apply:
 </p>
 <div className="space-y-3">
 {([
 ["automatedSignificant", "There are automated controls that address a risk determined to be a significant risk."],
 ["automatedPlanned", "There are automated controls that management is relying on and that the auditor plans to test."],
 ["systemReportsRelied", "There are system generated reports on which the auditor intends to rely as audit evidence without testing inputs and outputs."],
 ["substantiveInsufficient", "There are automated controls addressing risks where substantive procedures alone are not sufficient for audit evidence."],
 ["gitcRelevant", "There are applications where, using professional judgment, an understanding of the GITCs may be relevant."],
 ] as [keyof TestingCheck, string][]).map(([key, label]) => (
 <div key={key} className="flex items-start gap-3">
 <Checkbox
 id={key}
 checked={data.dTestingChecks[key]}
 onCheckedChange={v => patch("dTestingChecks", {...data.dTestingChecks, [key]: !!v })}
 disabled={locked}
 className="mt-0.5 shrink-0"
 />
 <label htmlFor={key} className="text-sm text-foreground leading-relaxed cursor-pointer">{label}</label>
 </div>
 ))}
 </div>

 {(data.dTestingChecks.automatedSignificant ||
 data.dTestingChecks.automatedPlanned ||
 data.dTestingChecks.systemReportsRelied ||
 data.dTestingChecks.substantiveInsufficient ||
 data.dTestingChecks.gitcRelevant) && (
 <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 flex items-start gap-2">
 <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
 <p className="text-sm text-amber-800 dark:text-amber-300">
 Identify RAFUIT and the general IT controls that mitigate such risks.
 </p>
 </div>
 )}

 <div className="pt-2 border-t border-border space-y-2">
 <p className="text-sm font-medium text-muted-foreground">Response / Comments</p>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!data.dTestingResponse.response} />
 <Textarea
 disabled={locked}
 value={data.dTestingResponse.response}
 onChange={e => patchProcess("dTestingResponse", { response: e.target.value })}
 placeholder="Document your assessment of testing operating effectiveness of controls…"
 className="min-h-[80px] text-sm resize-none bg-background flex-1"
 />
 </div>
 <div className="flex items-center gap-3">
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">PSC?</p>
 <Select value={data.dTestingResponse.psc} onValueChange={v => patchProcess("dTestingResponse", { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 w-24 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">W/P Ref.</p>
 <RefButton
 reference={data.dTestingResponse.wpRef}
 onAttach={doc => patchProcess("dTestingResponse", { wpRef: [...data.dTestingResponse.wpRef, doc] })}
 onRemove={i => patchProcess("dTestingResponse", { wpRef: data.dTestingResponse.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </div>
 </div>
 </div>
 </div>
 </SectionCard>

 {/* Conclusion */}
 {/* Notes */}
 <div className="bg-card border border-border rounded-md p-5 space-y-2">
 <h3 className="text-sm font-semibold text-foreground">Notes</h3>
 <Textarea
 disabled={locked}
 value={data.notes}
 onChange={e => patch("notes", e.target.value)}
 placeholder="Additional observations, IT scoping decisions, cross-references to Forms 535 / 551, follow-ups…"
 className="min-h-[90px] text-sm resize-none rounded-[10px]"
 />
 </div>

 <SectionCard title="Overall Conclusion">
 <div className="px-6 py-5 space-y-4">
 <p className="text-sm text-muted-foreground">
 Sufficient information has been obtained to understand the IT environment relevant to the preparation of the F/S.
 </p>
 <Textarea
 disabled={locked}
 value={data.conclusion}
 onChange={e => patch("conclusion", e.target.value)}
 placeholder="Document your overall conclusion on the IT environment and its impact on the audit approach…"
 className="min-h-[100px] text-sm resize-none bg-background"
 />
 </div>
 </SectionCard>

 <WorksheetSignOff worksheetKey="audit-511" engagementId={engagementId ?? "default"} />

 {locked ? (
 <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { setData(d => { const next = {...d, concluded: false, concludedOn: '' }; writeJsonToLocalStorage(storageKey, next); return next; }); }} />
 ) : (
 <div className="flex justify-end">
 <Button
 disabled={locked}
 onClick={() => {
 const now = new Date().toISOString();
 setData(d => {
 const next = {...d, concluded: true, concludedOn: now };
 writeJsonToLocalStorage(storageKey, next);
 return next;
 });
 }}
 >
 Conclude Worksheet
 </Button>
 </div>
 )}

 </div>
 </div>
 </div>
 );
}
