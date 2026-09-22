import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info, BookOpen, X } from "lucide-react";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { ProvenancePopover } from "@/components/demo/ProvenancePopover";
import { DEMO_PROVENANCE, DEMO_LUKA_ACTIONS } from "@/components/demo/demoFixtureData";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { cn } from "@/lib/utils";
import { buildAutoFillRows, mergeAutoFill } from "@/lib/audit520AutoFill";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { GreenDot } from "@/components/demo/GreenDot";

// ── Types ─────────────────────────────────────────────────────────────────────

type YN = "Y" | "N" | "";
type HML = "H" | "M" | "L" | "";

interface PartARow {
 id: string;
 wpRefSource: RefDoc[];
 rmmIdentified: string;
 fraudRisk: YN;
 rmmAssessment: HML;
 auditResponse: string;
 wpRef: RefDoc[];
}

interface PartBRow {
 id: string;
 wpRefSource: RefDoc[];
 rmmIdentified: string;
 scotabd: string;
 balanceValue: string;
 assertions: string[];
 irFactors: string;
 fraudRisk: YN;
 irLikelihood: HML;
 irMagnitude: HML;
 inherentRisk: HML;
 significantRisk: YN;
 substantiveSufficient: YN;
 procedures: string[];
}

interface Data520 {
 partARows: PartARow[];
 partBRows: PartBRow[];
 conclusion: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const HML_OPTIONS: HML[] = ["H", "M", "L"];
const YN_OPTIONS: YN[] = ["Y", "N"];
const ASSERTION_OPTIONS = ["C", "AV", "E", "P"] as const;

const SCOTABD_OPTIONS = [
 "Cash and cash equivalents",
 "Accounts receivable",
 "Inventories",
 "Short-term investments",
 "Loans and notes receivable",
 "Other current assets",
 "Property, plant and equipment",
 "Long-term investments",
 "Accounts payable",
 "Taxes payable",
 "Short-term debt",
 "Other long-term liabilities",
 "Long-term debt",
 "Equity",
 "Revenue",
 "Cost of sales",
 "Expenses",
 "Other expenses (income)",
 "Related-party transactions",
 "Disclosures",
];
interface RiskLibraryEntry {
 id: string;
 name: string;
 scotabd: string;
 assertions: string[];
 irFactors: string;
 procedures: string[];
}

const RISK_LIBRARY: RiskLibraryEntry[] = [
 {
  id: "governance",
  name: "Governance — weaknesses in board and oversight",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "No emphasis on integrity and ethical values; directors lack financial expertise or independence; no audit committee; no strategic plan or budget; inadequate review of major decisions; board dominated by a single person; high turnover in board, management, or accounting personnel; no process for staff to report suspected improprieties.",
  procedures: [
   "Inquire of management and TCWG regarding the entity's governance structure and oversight processes.",
   "Review board minutes for evidence of active engagement with financial reporting and internal control matters.",
   "Assess whether an audit committee exists and has members with appropriate financial expertise.",
   "Evaluate whether a code of conduct or equivalent process has been established and communicated.",
   "Document the entity's process for reporting suspected improprieties and assess its adequacy.",
   "Consider the overall tone at the top and its impact on the control environment.",
  ],
 },
 {
  id: "mgmt-attitudes",
  name: "Management attitudes — inadequate supervision and high risk tolerance",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "Significant internal control deficiencies ignored or uncorrected; inadequate supervision of financial staff; ineffective or improperly qualified accounting or IT staff; history of accepting high risks; failure to monitor significant controls; high turnover of management personnel; lack of mandatory vacations for personnel in key control functions.",
  procedures: [
   "Inquire of management regarding their approach to risk identification and response.",
   "Assess whether management information reports are timely and relevant for monitoring business activity.",
   "Evaluate whether procedures exist to prevent unauthorized access to assets, documents, and records.",
   "Review whether a disaster recovery plan exists to protect accounting records.",
   "Assess the adequacy of management's process for monitoring compliance with internal control policies.",
  ],
 },
 {
  id: "complex-structure",
  name: "Complex operating structure and unusual transactions",
  scotabd: "Related-party transactions",
  assertions: ["C", "AV", "E"],
  irFactors: "Overly complex organizational structure with no apparent reason; significant revenue not in ordinary course of business; contractual arrangements without apparent business purpose; unusual transactions at or near period end; significant cash transactions; aggressive timing of revenue recognition; significant related-party transactions; highly complex transactions toward period end.",
  procedures: [
   "Obtain an understanding of the entity's organizational structure and the business rationale for its complexity.",
   "Identify significant transactions outside the normal course of business and assess their business purpose.",
   "Review board minutes and shareholder agreements for related-party transactions and significant decisions.",
   "Test a sample of unusual or significant period-end transactions for proper authorization, recording, and disclosure.",
   "Assess whether management has policies to review and approve significant and complex transactions before they occur.",
   "Verify that significant journal entries are supported and explanations are provided.",
  ],
 },
 {
  id: "regulatory",
  name: "Regulatory environment — non-compliance and legal exposure",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "Legislation or regulations with significant negative impact not adequately addressed; entity prone to lawsuits or controversies; history of regulatory violations; disregard for regulatory authorities; lack of documentation of actual or pending regulatory events; overly optimistic assessments of investigations and regulatory reviews.",
  procedures: [
   "Inquire of management regarding applicable laws, regulations, and the entity's compliance processes.",
   "Review correspondence with regulatory authorities and legal counsel for indications of non-compliance.",
   "Assess whether all relevant legislation with financial impact has been identified and policies established for compliance.",
   "Evaluate whether a risk management process exists with action steps to minimize regulatory exposures.",
   "Consider whether the board or senior management has set clear direction regarding compliance requirements.",
  ],
 },
 {
  id: "accounting-policies",
  name: "Accounting policies — aggressive or manipulative choices",
  scotabd: "Revenue",
  assertions: ["C", "AV", "E"],
  irFactors: "Proposed changes in accounting principles not addressed; frequent changes in accounting policies; policies chosen to manipulate earnings; use of aggressive accounting practices to maintain stock price or earnings trends; accounting changes that ensure lucrative bonus plans are paid; overly optimistic or pessimistic estimates.",
  procedures: [
   "Inquire of management regarding any changes in accounting policies during the period and the rationale.",
   "Assess whether an independent audit committee has addressed the impact of all accounting changes.",
   "Review significant accounting estimates for evidence of management bias toward a desired outcome.",
   "Evaluate the appropriateness of revenue recognition policies and their consistent application.",
   "Consider whether controls exist over the selection and application of accounting principles.",
  ],
 },
 {
  id: "industry-conditions",
  name: "Deteriorating industry conditions — competitive pressure and declining demand",
  scotabd: "Revenue",
  assertions: ["C", "AV", "E"],
  irFactors: "High degree of competition or market saturation; declining profit margins; declining industry with increasing business failures; significant declines in customer demand; high vulnerability to rapidly changing technology; intense or new competition; aggressive earnings forecasts committed to third parties; excessive interest in maintaining stock price or earnings trend.",
  procedures: [
   "Perform analytical procedures comparing revenue and gross profit to prior periods and budget; investigate significant variances.",
   "Inquire of management regarding the entity's competitive position and industry outlook.",
   "Assess whether management has analyzed business risks and taken appropriate action.",
   "Evaluate whether management monitors compliance with internal control policies and investigates variances on a timely basis.",
  ],
 },
 {
  id: "financial-deterioration",
  name: "Deteriorating financial conditions — going concern and covenant risk",
  scotabd: "Long-term debt",
  assertions: ["C", "AV"],
  irFactors: "Marginal ability to meet debt repayment requirements; threat of bankruptcy, foreclosure, or hostile takeover; pressures to obtain new capital; negative cash flows; contingent liabilities; high vulnerability to changes in interest rates; unusually high dependence on debt; management has personally guaranteed significant debts; aggressive sales or profitability incentive programs.",
  procedures: [
   "Obtain management's going concern assessment and review assumptions and period covered.",
   "Review cash flow forecasts for reasonableness; compare projected cash flows to historical results.",
   "Confirm outstanding loan facilities; review maturity dates, renewal terms, and covenant compliance.",
   "Identify any covenant breaches and assess whether waivers have been obtained.",
   "Assess whether meaningful plans exist to address debt repayment and financing requirements.",
   "Review post-period events for evidence that alleviates or exacerbates going concern indicators.",
  ],
 },
 {
  id: "rapid-growth",
  name: "Rapid business growth — control environment lag",
  scotabd: "Revenue",
  assertions: ["C", "AV", "E"],
  irFactors: "Directors or management poorly skilled or inexperienced to deal with growth; inability to attract competent personnel; control systems unable to adapt quickly enough to changing circumstances; inadequate cash availability; growth not profitable; little attention paid by board to financial reporting and internal control; lucrative bonus or stock option plans based on performance.",
  procedures: [
   "Assess whether the entity's control systems have kept pace with the growth in operations.",
   "Inquire of management regarding the adequacy of staffing and competencies in key areas.",
   "Evaluate whether mechanisms exist to identify and react to events affecting achievement of objectives.",
   "Review whether management provides accounting and key personnel with sufficient resources and training.",
   "Assess whether entity goals are supported by strategic plans and monitored against actual results.",
  ],
 },
 {
  id: "major-changes",
  name: "Major changes in business activities — acquisitions, restructuring, new operations",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "Major acquisitions, divestitures, or reorganizations; going public or new sources of financing; new product launch or production facility; start of operations in foreign jurisdictions; change of control; significant new contracts; material transactions or adjustments near period end; lack of documentation of major transactions; significant transactions with related parties.",
  procedures: [
   "Obtain an understanding of significant changes in the entity's business activities during the period.",
   "Review board minutes, agreements, and contracts related to major transactions or structural changes.",
   "Assess whether the board or its committees are competent to review the implications of major new initiatives.",
   "Test a sample of transactions arising from major changes for proper authorization, recording, and disclosure.",
   "Evaluate whether management has clear objectives that are actively communicated and monitored.",
  ],
 },
 {
  id: "acctg-estimates",
  name: "Accounting estimates and judgments — management bias",
  scotabd: "Other current assets",
  assertions: ["AV"],
  irFactors: "Issues regarding realization of assets, contingent liabilities, or unusual uncertainties; allowance for bad debts; obsolete inventory provisions; cost allocations to inventory; impairment of long-lived assets; history of significant audit adjustments; judgment required in timing of revenue recognition; stock option or performance plans tied to income; desire to minimize tax liabilities.",
  procedures: [
   "Obtain management's listing of significant accounting estimates and assess whether all material estimates are identified.",
   "For each significant estimate, evaluate the appropriateness of the valuation method and reasonableness of key assumptions.",
   "Develop an independent expectation or range for significant estimates and compare to management's estimates.",
   "Test the underlying data used in the estimation process for accuracy, completeness, and relevance.",
   "Review prior-period estimates for indications of management bias by comparing estimates to actual outcomes.",
  ],
 },
 {
  id: "financial-reporting-process",
  name: "Financial reporting process — period-end close deficiencies",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "No procedures or timetable for period-end close; persons assigned responsibility not trained; roles not clearly defined; no cut-off requirements for inventory, purchases, and sales; period-end reconciliations not performed; no control over use of spreadsheets; no standardization of software used; no supervision or review of work performed; poor intra-organizational communication.",
  procedures: [
   "Inquire of management regarding period-end close procedures, timetable, and assigned responsibilities.",
   "Assess whether period-end reporting instructions address all steps involved and key dates.",
   "Evaluate whether accountability for each step in the financial reporting process is clearly defined and communicated.",
   "Review the entity's policy on use of spreadsheets and test the integrity of key calculations.",
   "Assess whether reconciliations of key accounts are performed at period end and reviewed.",
  ],
 },
 {
  id: "auditor-mgmt-relations",
  name: "Auditor and management relations — restrictions and evasiveness",
  scotabd: "Disclosures",
  assertions: ["C", "AV", "E"],
  irFactors: "History of changing auditors, lawyers, or key advisors; frequent disputes on accounting or reporting matters; unreasonable demands or constraints in performing the audit; restrictions limiting auditor access to people or information; history of receiving incomplete or misleading information; consistent choice of aggressive accounting policies; domineering management behaviour.",
  procedures: [
   "Assess whether management's responses to audit inquiries are complete, timely, and consistent.",
   "Document any restrictions placed on the audit and evaluate the implications for the audit strategy.",
   "Consider whether an independent audit committee effectively addresses management-auditor friction.",
   "Evaluate whether information provided by management is consistent with information obtained from other sources.",
  ],
 },
 {
  id: "misappropriation",
  name: "Misappropriation of assets — theft and fraud risk",
  scotabd: "Cash and cash equivalents",
  assertions: ["E", "AV"],
  irFactors: "Large amounts of cash on hand or processed regularly; inventory with high value or high demand; easily convertible assets; history of asset theft; poor physical safeguards over cash, investments, inventory, or fixed assets; high number of insurance claims; lack of procedures to screen job applicants for positions with access to susceptible assets; collusion with suppliers and customers; financial stress of personnel.",
  procedures: [
   "Assess the adequacy of physical safeguards over cash, investments, inventory, and other susceptible assets.",
   "Review reconciliations of amounts recorded in the accounting system to physical assets.",
   "Evaluate whether controls exist to address asset security and the risk of theft or misappropriation.",
   "Assess whether mandatory vacations are required for accounting personnel performing key control functions.",
   "Inquire of management regarding any known or suspected instances of asset theft or misappropriation.",
   "Perform surprise cash counts or inventory observations where the risk of misappropriation is elevated.",
  ],
 },
];


const formatRefList = (refs: RefDoc[]) => refs.map(r => r.name).join(", ") || "—";

function bestLibraryMatch(scotabd: string, rmmText?: string): RiskLibraryEntry | null {
  // 1. SCOTABD exact / first-word match
  if (scotabd) {
    const norm = scotabd.toLowerCase().trim();
    const hit = RISK_LIBRARY.find(e => {
      const en = e.scotabd.toLowerCase();
      return en === norm || en.split(" ")[0] === norm.split(" ")[0];
    });
    if (hit) return hit;
  }
  // 2. RMM text keyword fallback
  if (rmmText) {
    const r = rmmText.toLowerCase();
    if (r.includes("misappropriat") || r.includes("theft") || r.includes("cash on hand")) return RISK_LIBRARY.find(e => e.id === "misappropriation") ?? null;
    if (r.includes("going concern") || r.includes("debt covenant") || r.includes("negative cash flow")) return RISK_LIBRARY.find(e => e.id === "financial-deterioration") ?? null;
    if (r.includes("related-party") || r.includes("related party") || r.includes("unusual transaction")) return RISK_LIBRARY.find(e => e.id === "complex-structure") ?? null;
    if (r.includes("accounting estimate") || r.includes("estimates") || r.includes("impairment")) return RISK_LIBRARY.find(e => e.id === "acctg-estimates") ?? null;
    if (r.includes("management override") || r.includes("journal entr") || r.includes("period-end") || r.includes("close")) return RISK_LIBRARY.find(e => e.id === "financial-reporting-process") ?? null;
    if (r.includes("governance") || r.includes("board") || r.includes("audit committee")) return RISK_LIBRARY.find(e => e.id === "governance") ?? null;
    if (r.includes("regulatory") || r.includes("compliance") || r.includes("regulation")) return RISK_LIBRARY.find(e => e.id === "regulatory") ?? null;
    if (r.includes("growth") || r.includes("rapid") || r.includes("expansion")) return RISK_LIBRARY.find(e => e.id === "rapid-growth") ?? null;
    if (r.includes("acquisition") || r.includes("restructur") || r.includes("reorganiz") || r.includes("major change")) return RISK_LIBRARY.find(e => e.id === "major-changes") ?? null;
    if (r.includes("industry") || r.includes("competition") || r.includes("market saturation")) return RISK_LIBRARY.find(e => e.id === "industry-conditions") ?? null;
    if (r.includes("aggressive") || r.includes("accounting polic") || r.includes("earnings manipulation")) return RISK_LIBRARY.find(e => e.id === "accounting-policies") ?? null;
    if (r.includes("auditor") || r.includes("restriction") || r.includes("misleading information")) return RISK_LIBRARY.find(e => e.id === "auditor-mgmt-relations") ?? null;
    if (r.includes("revenue")) return RISK_LIBRARY.find(e => e.id === "industry-conditions") ?? null;
  }
  return null;
}

function newPartARow(): PartARow {
 return { id: uid(), wpRefSource: [{ name: "510" }], rmmIdentified: "", fraudRisk: "", rmmAssessment: "", auditResponse: "", wpRef: [] };
}

function newPartBRow(): PartBRow {
 return { id: uid(), wpRefSource: [], rmmIdentified: "", scotabd: "", balanceValue: "", assertions: [], irFactors: "", fraudRisk: "", irLikelihood: "", irMagnitude: "", inherentRisk: "", significantRisk: "", substantiveSufficient: "", procedures: [] };
}

function buildDefault(): Data520 {
 return {
 partARows: [
 {
 id: uid(),
 wpRefSource: [{ name: "510" }],
 rmmIdentified: "Management override of controls",
 fraudRisk: "Y",
 rmmAssessment: "H",
 auditResponse: "1. Test appropriateness of journal entries recorded in the general ledger and other adjustments.\n2. Review accounting estimates for biases and evaluate whether any bias represents an RMM due to fraud.\n3. Evaluate whether significant transactions outside the normal course of business suggest fraudulent financial reporting or concealment of misappropriation.",
 wpRef: [{ name: "670" }],
 },
 ],
 partBRows: [
  {
   id: uid(),
   wpRefSource: [{ name: "510" }],
   rmmIdentified: "Financial reporting process — period-end close deficiencies",
   scotabd: "Disclosures",
   balanceValue: "",
   assertions: ["C", "AV", "E"],
   irFactors: "No procedures or timetable for period-end close; persons assigned responsibility not trained; roles not clearly defined; no cut-off requirements for inventory, purchases, and sales; period-end reconciliations not performed; no control over use of spreadsheets; no standardization of software used; no supervision or review of work performed; poor intra-organizational communication.",
   fraudRisk: "Y",
   irLikelihood: "M",
   irMagnitude: "H",
   inherentRisk: "H",
   significantRisk: "Y",
   substantiveSufficient: "N",
   procedures: [
    "Inquire of management regarding period-end close procedures, timetable, and assigned responsibilities.",
    "Assess whether period-end reporting instructions address all steps involved and key dates.",
    "Evaluate whether accountability for each step in the financial reporting process is clearly defined and communicated.",
    "Review the entity's policy on use of spreadsheets and test the integrity of key calculations.",
    "Assess whether reconciliations of key accounts are performed at period end and reviewed.",
   ],
  },
  {
   id: uid(),
   wpRefSource: [{ name: "515" }],
   rmmIdentified: "Complex operating structure and unusual transactions",
   scotabd: "Related-party transactions",
   balanceValue: "",
   assertions: ["C", "AV", "E"],
   irFactors: "Overly complex organizational structure with no apparent reason; significant revenue not in ordinary course of business; contractual arrangements without apparent business purpose; unusual transactions at or near period end; significant cash transactions; aggressive timing of revenue recognition; significant related-party transactions; highly complex transactions toward period end.",
   fraudRisk: "Y",
   irLikelihood: "M",
   irMagnitude: "H",
   inherentRisk: "H",
   significantRisk: "Y",
   substantiveSufficient: "N",
   procedures: [
    "Obtain an understanding of the entity's organizational structure and the business rationale for its complexity.",
    "Identify significant transactions outside the normal course of business and assess their business purpose.",
    "Review board minutes and shareholder agreements for related-party transactions and significant decisions.",
    "Test a sample of unusual or significant period-end transactions for proper authorization, recording, and disclosure.",
    "Assess whether management has policies to review and approve significant and complex transactions before they occur.",
    "Verify that significant journal entries are supported and explanations are provided.",
   ],
  },
  {
   id: uid(),
   wpRefSource: [{ name: "510" }],
   rmmIdentified: "Misappropriation of assets — theft and fraud risk",
   scotabd: "Cash and cash equivalents",
   balanceValue: "",
   assertions: ["E", "AV"],
   irFactors: "Large amounts of cash on hand or processed regularly; inventory with high value or high demand; easily convertible assets; history of asset theft; poor physical safeguards over cash, investments, inventory, or fixed assets; high number of insurance claims; lack of procedures to screen job applicants for positions with access to susceptible assets; collusion with suppliers and customers; financial stress of personnel.",
   fraudRisk: "Y",
   irLikelihood: "L",
   irMagnitude: "M",
   inherentRisk: "M",
   significantRisk: "N",
   substantiveSufficient: "Y",
   procedures: [
    "Assess the adequacy of physical safeguards over cash, investments, inventory, and other susceptible assets.",
    "Review reconciliations of amounts recorded in the accounting system to physical assets.",
    "Evaluate whether controls exist to address asset security and the risk of theft or misappropriation.",
    "Assess whether mandatory vacations are required for accounting personnel performing key control functions.",
    "Inquire of management regarding any known or suspected instances of asset theft or misappropriation.",
    "Perform surprise cash counts or inventory observations where the risk of misappropriation is elevated.",
   ],
  },
 ],
 conclusion: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 </div>
 {children}
 </div>
 );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Audit520Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const storageKey = `audit-520-data-${engagementId ?? "default"}`;

 const [data, setData] = useState<Data520>(() => {
  const raw = readJsonFromLocalStorage<Data520 | null>(storageKey, null);

  // Discard stale saved data that pre-dates the Form 508 library update
  const STALE_MARKERS = [
   "Inventory value could be overstated",
   "cut-off of charter agreements",
   "cut-off of vessel charter",
   "incorrect cut-off",
   "obsolescence provision",
   "Management override of controls — journal entries",
   "Related-party transactions — incomplete or not disclosed",
   "cash and inventory theft risk",
  ];
  const isStale = raw?.partBRows?.some(r =>
   STALE_MARKERS.some(marker => r.rmmIdentified?.includes(marker))
  );
  if (isStale) {
   localStorage.removeItem(storageKey);
  }

  const saved = isStale ? null : raw;

  const toRefDocs = (v: unknown): RefDoc[] => {
   if (Array.isArray(v)) return v as RefDoc[];
   if (typeof v === "string" && v) return [{ name: v }];
   return [];
  };
  const base: Data520 = saved
   ? {
    ...buildDefault(),
    ...saved,
    partARows: saved.partARows.map(r => ({
     ...r,
     wpRefSource: toRefDocs(r.wpRefSource),
     wpRef: toRefDocs(r.wpRef),
    })),
    partBRows: saved.partBRows.map(r => ({
     procedures: [] as string[],
     balanceValue: "",
     ...r,
     wpRefSource: toRefDocs(r.wpRefSource),
    })),
   }
   : buildDefault();
  const auto = buildAutoFillRows(engagementId ?? "default");
  const merged = mergeAutoFill(base, auto);
  return {...base, ...merged } as Data520;
 });


 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 // Auto-populate procedures and normalize SCOTABD for rows missing either
 useEffect(() => {
 setData(d => {
 let changed = false;
 const partBRows = d.partBRows.map(row => {
 const hasProcs = (row.procedures ?? []).length > 0;
 const validScotabd = SCOTABD_OPTIONS.includes(row.scotabd);
 if (hasProcs && validScotabd) return row;
 const match = bestLibraryMatch(row.scotabd, row.rmmIdentified);
 if (!match) return row;
 const updates: Partial<PartBRow> = {};
 if (!hasProcs) updates.procedures = [...match.procedures];
 if (!validScotabd) updates.scotabd = match.scotabd;
 if (Object.keys(updates).length === 0) return row;
 changed = true;
 return { ...row, ...updates };
 });
 return changed ? { ...d, partBRows } : d;
 });
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 const locked = data.concluded;
 const isDemoEngagement = engagementId === 'AUD-NPM-Dec312025';

 function updatePartA(id: string, field: keyof PartARow, val: string) {
 setData(d => ({...d, partARows: d.partARows.map(r => r.id === id ? {...r, [field]: val } : r) }));
 }
 function setPartAWpRef(id: string, wpRef: RefDoc[]) {
 setData(d => ({...d, partARows: d.partARows.map(r => r.id === id ? {...r, wpRef } : r) }));
 }
 function updatePartB(id: string, field: keyof PartBRow, val: string) {
 setData(d => ({...d, partBRows: d.partBRows.map(r => r.id === id ? {...r, [field]: val } : r) }));
 }
 function toggleAssertionB(id: string, a: string) {
 setData(d => ({...d, partBRows: d.partBRows.map(r => {
 if (r.id !== id) return r;
 const has = r.assertions.includes(a);
 return {...r, assertions: has ? r.assertions.filter(x => x !== a) : [...r.assertions, a] };
 }) }));
 }

 const [showLibraryPicker, setShowLibraryPicker] = useState(false);
 const [editingProcsRowId, setEditingProcsRowId] = useState<string | null>(null);
 const [pickerForRowId, setPickerForRowId] = useState<string | null>(null);
 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLDivElement>(null);

 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 function loadLibraryForRow(rowId: string, entry: RiskLibraryEntry) {
 setData(d => ({...d, partBRows: d.partBRows.map(r =>
 r.id !== rowId ? r : {...r, procedures: [...entry.procedures], scotabd: r.scotabd || entry.scotabd, assertions: r.assertions.length ? r.assertions : entry.assertions }
 ) }));
 setPickerForRowId(null);
 setEditingProcsRowId(null);
 }

 function addFromLibrary(entry: RiskLibraryEntry) {
 const newRow: PartBRow = { id: uid(), wpRefSource: [], rmmIdentified: entry.name, scotabd: entry.scotabd, balanceValue: "", assertions: entry.assertions, irFactors: entry.irFactors, fraudRisk: "", irLikelihood: "", irMagnitude: "", inherentRisk: "", significantRisk: "", substantiveSufficient: "", procedures: [...entry.procedures] };
 setData(d => ({...d, partBRows: [...d.partBRows, newRow] }));
 setShowLibraryPicker(false);
 }

 function updateProcedure(rowId: string, index: number, value: string) {
 setData(d => ({...d, partBRows: d.partBRows.map(r => {
 if (r.id !== rowId) return r;
 const procs = [...(r.procedures ?? [])];
 procs[index] = value;
 return {...r, procedures: procs };
 }) }));
 }

 function addProcedure(rowId: string) {
 setData(d => ({...d, partBRows: d.partBRows.map(r =>
 r.id !== rowId ? r : {...r, procedures: [...(r.procedures ?? []), ""] }
 ) }));
 }

 function removeProcedure(rowId: string, index: number) {
 setData(d => ({...d, partBRows: d.partBRows.map(r => {
 if (r.id !== rowId) return r;
 return {...r, procedures: (r.procedures ?? []).filter((_, i) => i !== index) };
 }) }));
 }

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
            const b0 = data.partBRows[0]?.id;
            const b1 = data.partBRows[1]?.id;
            const b2 = data.partBRows[2]?.id;
            lukaSequentialFill([
              {
                scrollRef: firstFillRef as unknown as import('react').RefObject<HTMLElement>,
                set: () => {
                  if (b0) {
                    setData(d => ({...d, partBRows: d.partBRows.map(r => r.id !== b0 ? r : {
                      ...r,
                      rmmIdentified: "Financial reporting process — period-end close deficiencies",
                      scotabd: "Disclosures",
                      assertions: ["C", "AV", "E"],
                      irFactors: "No procedures or timetable for period-end close; persons assigned responsibility not trained; roles not clearly defined; no cut-off requirements for inventory, purchases, and sales; period-end reconciliations not performed; no control over use of spreadsheets; no standardization of software used; no supervision or review of work performed; poor intra-organizational communication.",
                      fraudRisk: "Y" as YN,
                      irLikelihood: "M" as HML,
                      irMagnitude: "H" as HML,
                      inherentRisk: "H" as HML,
                      significantRisk: "Y" as YN,
                      substantiveSufficient: "N" as YN,
                    })}));
                    markLukaFilled(b0);
                  }
                },
              },
              {
                set: () => {
                  if (b1) {
                    setData(d => ({...d, partBRows: d.partBRows.map(r => r.id !== b1 ? r : {
                      ...r,
                      rmmIdentified: "Complex operating structure and unusual transactions",
                      scotabd: "Related-party transactions",
                      assertions: ["C", "AV", "E"],
                      irFactors: "Overly complex organizational structure with no apparent reason; significant revenue not in ordinary course of business; contractual arrangements without apparent business purpose; unusual transactions at or near period end; significant cash transactions; aggressive timing of revenue recognition; significant related-party transactions; highly complex transactions toward period end.",
                      fraudRisk: "Y" as YN,
                      irLikelihood: "M" as HML,
                      irMagnitude: "H" as HML,
                      inherentRisk: "H" as HML,
                      significantRisk: "Y" as YN,
                      substantiveSufficient: "N" as YN,
                    })}));
                    markLukaFilled(b1);
                  }
                },
              },
              {
                set: () => {
                  if (b2) {
                    setData(d => ({...d, partBRows: d.partBRows.map(r => r.id !== b2 ? r : {
                      ...r,
                      rmmIdentified: "Misappropriation of assets — theft and fraud risk",
                      scotabd: "Cash and cash equivalents",
                      assertions: ["E", "AV"],
                      irFactors: "Large amounts of cash on hand or processed regularly; inventory with high value or high demand; easily convertible assets; history of asset theft; poor physical safeguards over cash, investments, inventory, or fixed assets; high number of insurance claims; lack of procedures to screen job applicants for positions with access to susceptible assets; collusion with suppliers and customers; financial stress of personnel.",
                      fraudRisk: "Y" as YN,
                      irLikelihood: "L" as HML,
                      irMagnitude: "M" as HML,
                      inherentRisk: "M" as HML,
                      significantRisk: "N" as YN,
                      substantiveSufficient: "Y" as YN,
                    })}));
                    markLukaFilled(b2);
                  }
                },
              },
            ], () => setLukaState('done'));
          },
        }))}
      />
    )}

 {/* ── Objective bar ─────────────────────────────────────────────── */}

 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-foreground leading-relaxed flex-1">
 <span className="font-semibold text-primary">Objective: </span>
 To document and assess identified risks of material misstatement at the financial statement level and assess inherent risk(s) at the assertion level, including significant risks, to be used as a basis for designing and implementing the appropriate audit response.
 </p>
 </div>
 <div className="p-6 space-y-6">

 {/* ── Part A ────────────────────────────────────────────────── */}
 <SectionCard title="Part A — Identify and Assess RMMs at the Financial Statement Level">
 <div className="px-6 py-2 border-b border-border bg-muted/20">
 <p className="text-sm text-muted-foreground">Document the risks identified that relate to the financial statements as a whole. Complete Part A before Part B, as FSL risks can impact assertion-level risks.</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-24">Risk Source<br /><span className="font-normal normal-case text-muted-foreground">(W/P Ref.)</span></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">RMM Identified</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-20">Fraud Risk<br /><span className="font-normal normal-case text-muted-foreground">(Y/N)</span></th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">Assess RMM<br /><span className="font-normal normal-case text-muted-foreground">(H/M/L)</span></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Overall Audit Response</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">W/P Ref.</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.partARows.map(row => (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top w-28">
 <div className="h-8 flex items-center px-2 text-sm text-foreground bg-muted/40 rounded-md border border-border/60 whitespace-nowrap">
 {formatRefList(row.wpRefSource)}
 </div>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[240px]">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.rmmIdentified} />
   <AttributedComment value={row.rmmIdentified} onChange={v => updatePartA(row.id, "rmmIdentified", v)} storageKey={`520-${engagementId ?? "def"}-pA-rmm-${row.id}`} placeholder="Describe the risk of material misstatement…" disabled={locked} className="flex-1 min-h-[72px] text-sm resize-none bg-background" />
 </div>
 {isDemoEngagement && row.rmmIdentified && (() => {
   const rmmLower = row.rmmIdentified.toLowerCase();
   const provenance =
     rmmLower.includes('warranty') ? DEMO_PROVENANCE.warrantyProvision :
     rmmLower.includes('related') ? DEMO_PROVENANCE.relatedParty :
     null;
   return provenance ? (
     <div className="mt-1">
       <ProvenancePopover data={provenance}>
         <span className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">Why this? ↗</span>
       </ProvenancePopover>
     </div>
   ) : null;
 })()}
 </td>
 <td className="px-4 py-2.5 align-top w-20">
 <Select disabled={locked} value={row.fraudRisk} onValueChange={v => updatePartA(row.id, "fraudRisk", v as YN)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{YN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-24">
 <Select disabled={locked} value={row.rmmAssessment} onValueChange={v => updatePartA(row.id, "rmmAssessment", v as HML)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{HML_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[260px]">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.auditResponse} />
   <AttributedComment value={row.auditResponse} onChange={v => updatePartA(row.id, "auditResponse", v)} storageKey={`520-${engagementId ?? "def"}-pA-resp-${row.id}`} placeholder="Document overall audit response…" disabled={locked} className="flex-1 min-h-[72px] text-sm resize-none bg-background" />
 </div>
 </td>
 <td className="px-4 py-2.5 align-top w-28">
 <RefButton
 reference={row.wpRef}
 onAttach={doc => setPartAWpRef(row.id, [...row.wpRef, doc])}
 onRemove={i => setPartAWpRef(row.id, row.wpRef.filter((_, idx) => idx !== i))}
 disabled={locked}
 />
 </td>
 {!locked && (
 <td className="px-2 py-2.5 align-middle text-center">
 <button onClick={() => setData(d => ({...d, partARows: d.partARows.filter(r => r.id !== row.id) }))} className="text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {!locked && (
 <div className="border-t border-border px-4 py-3">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setData(d => ({...d, partARows: [...d.partARows, newPartARow()] }))}>
 <Plus className="h-3 w-3" /> Add Risk
 </Button>
 </div>
 )}
 </SectionCard>

 {/* ── Part B ────────────────────────────────────────────────── */}
 {isDemoEngagement && <div ref={firstFillRef} />}
 <SectionCard title="Part B — Identify RMMs and Assess Inherent Risk at the Assertion Level">
 <div className="px-6 py-2 border-b border-border bg-muted/20">
 <p className="text-sm text-muted-foreground">
 Document risks at the assertion level and assess inherent risk (IR), including significant risks.&nbsp;
 <span className="font-medium text-foreground">Assertions:</span> C = Completeness · AV = Accuracy &amp; Valuation · E = Existence · P = Presentation
 </p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider min-w-[260px]">Risk</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">Risk Source<br /><span className="font-normal normal-case text-muted-foreground">(W/P Ref.)</span></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider min-w-[180px]">RMM Identified</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider min-w-[140px]">SCOTABD<br /><span className="font-normal normal-case text-muted-foreground">Impacted</span></th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-20">F/S<br />Assertions</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider min-w-[200px]">IR Factors &amp; Susceptibility</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-16">Fraud<br />Risk</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-16">IR<br />Likelihood</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-16">IR<br />Magnitude</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-16">Assess<br />IR</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-20">Significant<br />Risk</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">Substantive<br />Sufficient</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.partBRows.map(row => (
 <tr key={row.id} className={cn("transition-colors", row.significantRisk === "Y" ? "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60" : "hover:bg-muted/50", isDemoEngagement && lukaHighlightFields.has(row.id) ? "border-l-2 border-violet-400 bg-violet-50/40" : "")}>
 <td className="px-4 py-2.5 align-top min-w-[260px]">
 {(() => {
 const procs = row.procedures ?? [];
 const isEditing = editingProcsRowId === row.id;
 const isPicking = pickerForRowId === row.id;
 const suggestion = bestLibraryMatch(row.scotabd, row.rmmIdentified);

 if (procs.length === 0 && !isEditing) {
 return (
 <div className="space-y-1.5">
 <span className="text-sm text-muted-foreground italic">No procedures documented</span>
 {!locked && (
 <div className="flex flex-wrap items-center gap-2">
 <button onClick={() => setPickerForRowId(isPicking ? null : row.id)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
 <BookOpen className="h-3 w-3" /> Load from library
 </button>
 <span className="text-muted-foreground text-xs">·</span>
 <button onClick={() => { addProcedure(row.id); setEditingProcsRowId(row.id); }} className="text-xs text-primary hover:underline flex items-center gap-0.5">
 <Plus className="h-3 w-3" /> Add manually
 </button>
 </div>
 )}
 {suggestion && !locked && !isPicking && (
 <div className="flex items-center gap-1.5 mt-0.5 px-2 py-1.5 rounded-md bg-primary/[0.06] border border-primary/20">
 <span className="text-sm text-muted-foreground">Suggested:</span>
 <button onClick={() => loadLibraryForRow(row.id, suggestion)} className="text-xs text-primary hover:underline text-left leading-snug">
 {suggestion.name}
 </button>
 </div>
 )}
 {isPicking && (
 <div className="mt-0.5 border border-border rounded-md overflow-hidden bg-popover shadow-lg">
 <div className="px-2 py-1.5 border-b border-border bg-muted/30 flex items-center justify-between">
 <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Risk Library</span>
 <button onClick={() => setPickerForRowId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
 </div>
 <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
 {RISK_LIBRARY.map(entry => (
 <button key={entry.id} onClick={() => loadLibraryForRow(row.id, entry)} className="w-full text-left px-2 py-1.5 hover:bg-muted transition-colors">
 <div className="text-xs font-medium text-foreground leading-snug">{entry.name}</div>
 <div className="text-[11px] text-muted-foreground">{entry.scotabd} · {entry.assertions.join(", ")}</div>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 }

 if (isEditing) {
 return (
 <div className="space-y-1">
 {procs.map((proc, i) => (
 <div key={i} className="flex items-start gap-1 group">
 <span className="text-muted-foreground text-xs w-5 shrink-0 pt-2 select-none">{i + 1}.</span>
 <textarea
 value={proc}
 onChange={e => updateProcedure(row.id, i, e.target.value)}
 rows={1}
 className="flex-1 text-sm py-1.5 px-0 bg-transparent border-0 border-b border-border focus:outline-none focus:border-primary resize-none leading-snug"
 />
 <button onClick={() => removeProcedure(row.id, i)} className="text-muted-foreground hover:text-destructive shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <X className="h-3 w-3" />
 </button>
 </div>
 ))}
 <div className="flex items-center gap-3 pt-1 border-t border-border/40 mt-1">
 <button onClick={() => addProcedure(row.id)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
 <Plus className="h-3 w-3" /> Add
 </button>
 <button onClick={() => setPickerForRowId(isPicking ? null : row.id)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
 <BookOpen className="h-3 w-3" /> From library
 </button>
 <button onClick={() => { setEditingProcsRowId(null); setPickerForRowId(null); }} className="text-sm text-muted-foreground hover:text-foreground ml-auto border border-border rounded px-2 py-0.5">
 Done
 </button>
 </div>
 {isPicking && (
 <div className="mt-1 border border-border rounded-md overflow-hidden bg-popover shadow-lg">
 <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
 {RISK_LIBRARY.map(entry => (
 <button key={entry.id} onClick={() => loadLibraryForRow(row.id, entry)} className="w-full text-left px-2 py-1.5 hover:bg-muted transition-colors">
 <div className="text-xs font-medium text-foreground">{entry.name}</div>
 <div className="text-[11px] text-muted-foreground">{entry.scotabd}</div>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 }

 return (
 <div>
 <ol className="space-y-1.5">
 {procs.slice(0, 4).map((proc, i) => (
 <li key={i} className="flex items-start gap-1.5 text-sm">
 <span className="text-muted-foreground text-xs shrink-0 w-5 pt-0.5 select-none">{i + 1}.</span>
 <span className="text-foreground leading-snug line-clamp-2">{proc}</span>
 </li>
 ))}
 </ol>
 {procs.length > 4 && (
 <p className="text-sm text-muted-foreground mt-1 pl-5">…and {procs.length - 4} more</p>
 )}
 {!locked && (
 <button onClick={() => setEditingProcsRowId(row.id)} className="mt-2 text-xs text-primary hover:underline flex items-center gap-0.5 pl-5">
 ✏ Edit procedures
 </button>
 )}
 </div>
 );
 })()}
 </td>
 <td className="px-4 py-2.5 align-top w-28">
 <div className="h-8 flex items-center px-2 text-sm text-foreground bg-muted/40 rounded-md border border-border/60 whitespace-nowrap">
 {formatRefList(row.wpRefSource)}
 </div>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[180px]">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has(row.id)}>
   <div className="flex items-start gap-1.5">
     <GreenDot show={!!row.rmmIdentified} />
     <AttributedComment value={row.rmmIdentified} onChange={v => updatePartB(row.id, "rmmIdentified", v)} storageKey={`520-${engagementId ?? "def"}-pB-rmm-${row.id}`} placeholder="Describe the RMM…" disabled={locked} className="flex-1 min-h-[72px] text-sm resize-none bg-background" />
   </div>
 </LukaTypingRow>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[140px]">
 <Select value={row.scotabd} onValueChange={v => updatePartB(row.id, "scotabd", v)} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>{SCOTABD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 <input
 type="text"
 value={row.balanceValue ?? ""}
 onChange={e => updatePartB(row.id, "balanceValue", e.target.value)}
 placeholder="Balance ($)"
 disabled={locked}
 className="mt-1 w-full h-7 px-2 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
 />
 </td>
 <td className="px-4 py-2.5 align-top text-center w-20">
 <div className="flex flex-wrap gap-1 justify-center">
 {ASSERTION_OPTIONS.map(a => {
 const active = (Array.isArray(row.assertions) ? row.assertions : []).includes(a);
 return (
 <button key={a} type="button" disabled={locked} onClick={() => toggleAssertionB(row.id, a)}
 className={`px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>
 {a}
 </button>
 );
 })}
 </div>
 </td>
 <td className="px-4 py-2.5 align-top min-w-[200px]">
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!row.irFactors} />
   <AttributedComment value={row.irFactors} onChange={v => updatePartB(row.id, "irFactors", v)} storageKey={`520-${engagementId ?? "def"}-pB-ir-${row.id}`} placeholder="Document how IR factors affect susceptibility to misstatement…" disabled={locked} className="flex-1 min-h-[72px] text-sm resize-none bg-background" />
 </div>
 </td>
 <td className="px-4 py-2.5 align-top w-16">
 <Select disabled={locked} value={row.fraudRisk} onValueChange={v => updatePartB(row.id, "fraudRisk", v as YN)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{YN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-16">
 <Select disabled={locked} value={row.irLikelihood} onValueChange={v => updatePartB(row.id, "irLikelihood", v as HML)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{HML_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-16">
 <Select disabled={locked} value={row.irMagnitude} onValueChange={v => updatePartB(row.id, "irMagnitude", v as HML)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{HML_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-16">
 <Select disabled={locked} value={row.inherentRisk} onValueChange={v => updatePartB(row.id, "inherentRisk", v as HML)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{HML_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-20">
 <Select disabled={locked} value={row.significantRisk} onValueChange={v => updatePartB(row.id, "significantRisk", v as YN)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{YN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2.5 align-top w-24">
 <Select disabled={locked} value={row.substantiveSufficient} onValueChange={v => updatePartB(row.id, "substantiveSufficient", v as YN)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>{YN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
 </Select>
 </td>
 {!locked && (
 <td className="px-2 py-2.5 align-middle text-center">
 <button onClick={() => setData(d => ({...d, partBRows: d.partBRows.filter(r => r.id !== row.id) }))} className="text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {!locked && (
 <div className="border-t border-border px-4 py-3 flex items-center gap-2">
 <div className="relative">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setShowLibraryPicker(v => !v)}>
 <BookOpen className="h-3 w-3" /> From Library
 </Button>
 {showLibraryPicker && (
 <div className="absolute bottom-9 left-0 z-30 w-[340px] bg-popover border border-border rounded-md shadow-xl overflow-hidden">
 <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
 <span className="text-xs font-semibold text-foreground">Risk Library — select to auto-populate</span>
 <button onClick={() => setShowLibraryPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
 </div>
 <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
 {RISK_LIBRARY.map(entry => (
 <button key={entry.id} className="w-full flex flex-col items-start px-3 py-2 hover:bg-muted text-left transition-colors" onClick={() => addFromLibrary(entry)}>
 <span className="text-sm text-foreground leading-snug">{entry.name}</span>
 <span className="text-sm text-muted-foreground mt-0.5">{entry.scotabd} · {entry.assertions.join(", ")}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setData(d => ({...d, partBRows: [...d.partBRows, newPartBRow()] }))}>
 <Plus className="h-3 w-3" /> Add manually
 </Button>
 </div>
 )}
 </SectionCard>

 {/* ── Conclusion ─────────────────────────────────────────────── */}
 <SectionCard title="Overall Conclusion">
 <div className="px-6 py-5 space-y-4">
 <p className="text-sm text-muted-foreground">
 RMMs at the financial statement level and inherent risk at the assertion level have been appropriately identified and assessed.
 </p>
 <Textarea
 disabled={locked}
 value={data.conclusion}
 onChange={e => setData(d => ({...d, conclusion: e.target.value }))}
 placeholder="Document your conclusion…"
 className="min-h-[120px] text-sm resize-none bg-background"
 />
 </div>
 </SectionCard>

 <WorksheetSignOff worksheetKey="audit-520" engagementId={engagementId} />

 {locked
 ? <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { setData(d => { const next = {...d, concluded: false, concludedOn: '' }; writeJsonToLocalStorage(storageKey, next); return next; }); }} />
 : <div className="flex justify-end"><Button onClick={() => { const now = new Date().toISOString(); setData(d => { const next = {...d, concluded: true, concludedOn: now }; writeJsonToLocalStorage(storageKey, next); return next; }); }}>Conclude Worksheet</Button></div>
 }

 </div>
 </div>
 </div>
 );
}
