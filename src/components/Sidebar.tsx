import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

const SCROLL_KEY = 'sidebar-scroll';
function getScroll(): number { try { return parseInt(sessionStorage.getItem(SCROLL_KEY) ?? '0', 10) || 0; } catch { return 0; } }
function setScroll(v: number) { try { sessionStorage.setItem(SCROLL_KEY, String(v)); } catch {} }

const DEFAULT_CA_SO_HIDDEN: Record<string, string[]> = {
  "aud-so": [
    "aud-fs-iar",  // 305 Auditor's Report
    "aud-so-306",  // 306 Modified Opinion
    "aud-so-310",  // 310 Audit Completion
    "aud-so-311",  // 311 Withdrawal
    "aud-so-312",  // 312 Engagement Partner
    "aud-so-313",  // 313 Supplementary Info
    "aud-so-320",  // 320 Significant Decisions
    "aud-so-325",  // 325 Key Audit Matters
    "aud-so-330",  // 330 Findings & Discussion
    "aud-so-335",  // 335 Identified Misstatements
    "aud-so-340",  // 340 Mgmt & TCWG Matters
    "aud-so-370",  // 370 Future Considerations
    "aud-so-375",  // 375 Consultation
    "aud-comp",    // CM Completion
  ],
};
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronLeft, Search, Plus, Expand, Trash2, Folder, Headphones, Check, FileText, FileBarChart, NotebookPen, Table, Copy, Pencil, FolderInput, MoreVertical, GripVertical, X, Save, Files, Send, AlertCircle, MessageSquare, FilePlus2, FolderPlus, ArrowUpDown, Upload, Image, Download, Move, Eye } from "lucide-react";
import { templateTree, allTemplateViews, type TreeItem, TEMPLATE_CONFIG } from "@/lib/engagementTemplatesData";
import { FolderSolidIcon, FolderPlusIcon, FolderMinusIcon } from "@/components/icons/FolderIcons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LukaIcon } from "@/components/LukaIcon";
import lukaLogo from "@/assets/luka-logo.png";
import { BulkAddToMyTemplatesDialog } from "@/components/BulkAddToMyTemplatesDialog";
import {
 getGlobalTemplateChecklist,
 generateClientAcceptanceContinuanceChecklist,
 generateIndependenceChecklist,
 generateKnowledgeOfClientBusinessChecklist,
 generatePlanningChecklist,
 generateEngagementLetterChecklist,
 generateManagementResponsibilityChecklist,
} from "@/lib/globalTemplates";
import { readJsonFromLocalStorage, removeLocalStorageKey, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LetterIcon } from "@/components/icons/LetterIcon";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { CompletionIcon } from "@/components/icons/CompletionIcon";
import { WordDocIcon } from "@/components/icons/WordDocIcon";
import { BookIcon } from "@/components/icons/BookIcon";
import { WorksheetIcon } from "@/components/icons/WorksheetIcon";
import { XlsxIcon } from "@/components/icons/XlsxIcon";
import { PdfIcon } from "@/components/icons/PdfIcon";
import { ReportIcon } from "@/components/icons/ReportIcon";
import { SignoffsOverlay } from "@/components/SignoffsOverlay";
import signoffCheckAllIcon from "@/assets/signoff-check-all.png";
import signoffUncheckAllIcon from "@/assets/signoff-uncheck-all.png";
import { useSecondaryPanel } from "@/hooks/useSecondaryPanel";
import { FinancialStatementsPanelContent } from "@/components/FinancialStatementsPanelContent";
import { FinancialStatementsIcon } from "@/components/icons/FinancialStatementsIcon";

interface FirmProfile {
 id: string;
 name: string;
 region: "ca" | "us";
 city: string;
 initials: string;
 color: string;
 firmGroupId: string;
 firmGroupName: string;
 isMainOffice: boolean;
}

const DEFAULT_FIRMS: FirmProfile[] = [
 {
  id: "firm-ca-1",
  name: "Maple Grove Accounting PC",
  region: "ca",
  city: "Toronto, ON",
  initials: "MG",
  color: "bg-red-600",
  firmGroupId: "group-maple",
  firmGroupName: "Maple Grove Group",
  isMainOffice: true,
 },
 {
  id: "firm-us-1",
  name: "Maple Grove Accounting PC",
  region: "us",
  city: "New York, NY",
  initials: "MG",
  color: "bg-blue-600",
  firmGroupId: "group-maple",
  firmGroupName: "Maple Grove Group",
  isMainOffice: false,
 },
];

function SidebarHighlight({ text, query }: { text: string; query: string }) {
 if (!query.trim()) return <>{text}</>;
 const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
 return (
 <>
 {parts.map((part, i) =>
 part.toLowerCase() === query.toLowerCase() ? (
 <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5 not-italic">{part}</mark>
 ) : (
 <span key={i}>{part}</span>
 )
 )}
 </>
 );
}

interface Template {
 id: string;
 name: string;
 type: "folder" | "file";
 children?: Template[];
 isExpanded?: boolean;
}
export interface SavedChecklist {
 id: string;
 name: string;
 folderId: string;
 folderName: string;
 country?: "CA" | "US" | "both";
 data?: any; // Full checklist data for editing
}

export interface CustomSection {
 id: string;
 name: string;
 category: 'checklist' | 'letter' | 'folder';
 parentId: string;
 engId: string;
 createdAt: string;
}
const initialTemplates: Template[] = [{
 id: "1",
 name: "Northline Holdings",
 type: "folder",
 children: []
}, {
 id: "2",
 name: "Fairmont Group",
 type: "folder",
 children: []
}, {
 id: "3",
 name: "Pacific Rim Corp",
 type: "folder",
 children: []
}, {
 id: "4",
 name: "Cedar Valley Enterprises",
 type: "folder",
 children: []
}, {
 id: "5",
 name: "Compilation Checklists",
 type: "folder",
 isExpanded: true,
 children: []
}, {
 id: "6",
 name: "Summit Industrial Inc.",
 type: "folder",
 children: []
}, {
 id: "7",
 name: "Review Checklists",
 type: "folder",
 children: []
}, {
 id: "8",
 name: "Audit Checklists",
 type: "folder",
 children: []
}, {
 id: "9",
 name: "US Audit Checklists",
 type: "folder",
 children: []
}];

// Global Templates data structure for "master" tab
export interface GlobalTemplate {
 id: string;
 name: string;
 type: "folder" | "file";
 children?: GlobalTemplate[];
 isExpanded?: boolean;
}

export const initialGlobalTemplates: GlobalTemplate[] = [
 {
 id: "global-1",
 name: "Compilation",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "global-1-1", name: "Client Acceptance and Continuance", type: "file" },
 { id: "global-1-2", name: "Independence", type: "file" },
 { id: "global-1-3", name: "Knowledge of the Business", type: "file" },
 { id: "global-1-4", name: "Planning", type: "file" },
 { id: "global-1-5", name: "Withdrawal", type: "file" },
 { id: "global-1-6", name: "Completion", type: "file" },
 ]
 },
 {
 id: "global-2",
 name: "Review",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-2-1", name: "New engagement acceptance", type: "file" },
 { id: "global-2-2", name: "Existing engagement continuance", type: "file" },
 { id: "global-2-3", name: "Understanding the entity - Basics", type: "file" },
 { id: "global-2-4", name: "Engagement Planning", type: "file" },
 { id: "global-2-5", name: "Completion", type: "file" },
 { id: "global-2-6", name: "Subsequent events", type: "file" },
 { id: "global-2-7", name: "Withdrawal", type: "file" },
 { id: "global-2-8", name: "Understanding the entity - Systems", type: "file" },
 { id: "global-2-9", name: "ASPE - General - Disclosure checklist", type: "file" },
 { id: "global-2-10", name: "ASPE - Income taxes - Disclosure checklist", type: "file" },
 { id: "global-2-11", name: "ASPE - Leases - Disclosure checklist", type: "file" },
 { id: "global-2-12", name: "ASPE - Goodwill and intangible assets - Disclosure checklist", type: "file" },
 { id: "global-2-13", name: "ASPE - Employee future benefits - Disclosure checklist", type: "file" },
 { id: "global-2-14", name: "ASPE - Supplementary - Disclosure checklist", type: "file" },
 { id: "global-2-15", name: "ASPE - Agriculture - Disclosure checklist", type: "file" },
 { id: "global-2-16", name: "Specific Circumstances", type: "file" },
 ]
 },
 {
 id: "global-3",
 name: "Tax",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-3-1", name: "Completion", type: "file" },
 ]
 },
 {
 id: "global-4",
 name: "Audit",
 type: "folder",
 isExpanded: false,
 children: [
 {
 id: "global-4-ca",
 name: "Canada",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "gca-cl-408", name: "408 Initial Audit Engagements", type: "file" },
 { id: "gca-cl-410", name: "410 New/Existing Engagement — Acceptance/Continuance", type: "file" },
 { id: "gca-cl-500", name: "500 Observation & Inspection", type: "file" },
 { id: "gca-cl-501a", name: "501-B Preliminary Analytical", type: "file" },
 { id: "gca-cl-505", name: "505 Mgmt Inquiries", type: "file" },
 { id: "gca-cl-525", name: "525 Going Concern", type: "file" },
 { id: "gca-cl-530", name: "530 Pervasive Risks", type: "file" },
 { id: "gca-cl-iar", name: "Independent Auditor's Report", type: "file" },
 { id: "gca-cl-aim", name: "AIM Misstatements", type: "file" },
 { id: "gca-cl-far", name: "FAR Final Analytical Review", type: "file" },
 { id: "gca-cl-se", name: "SE Subsequent Events", type: "file" },
 { id: "gca-cl-gc", name: "GC Going Concern (Final Assessment)", type: "file" },
 { id: "gca-cl-mr", name: "MR Management Representation Letter", type: "file" },
 { id: "gca-cl-disc", name: "DC Disclosure Checklist", type: "file" },
 ]
 },
 {
 id: "global-4-us",
 name: "United States",
 type: "folder",
 isExpanded: false,
 children: [
 {
 id: "global-4-us-1",
 name: "Pre-Engagement",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-4-us-1-1", name: "Assessing Acceptability of Financial Reporting Framework", type: "file" },
 { id: "global-4-us-1-2", name: "Audit Team Competency Matrix", type: "file" },
 { id: "global-4-us-1-3", name: "Auditor's Declaration — Code of Ethics", type: "file" },
 { id: "global-4-us-1-4", name: "Declaration of Conflict of Interest", type: "file" },
 { id: "global-4-us-1-5", name: "Declaration of NO Conflict of Interest", type: "file" },
 { id: "global-4-us-1-6", name: "Assessment of Ethical Threats and Safeguards", type: "file" },
 { id: "global-4-us-1-7", name: "Audit Engagement Letter", type: "file" },
 ]
 },
 {
 id: "global-4-us-2",
 name: "Audit Planning",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-4-us-2-1", name: "Understanding the Entity and Its Environment", type: "file" },
 { id: "global-4-us-2-2", name: "Determining Materiality", type: "file" },
 { id: "global-4-us-2-3", name: "Overall Audit Strategy and Audit Plan", type: "file" },
 { id: "global-4-us-2-4", name: "Direct Assistance — Internal Auditors Agreement", type: "file" },
 ]
 },
 {
 id: "global-4-us-3",
 name: "Completion & Review",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-4-us-3-1", name: "Evaluating Misstatements", type: "file" },
 { id: "global-4-us-3-2", name: "Analytical Procedures — End of Audit", type: "file" },
 { id: "global-4-us-3-3", name: "Management Representation Letter", type: "file" },
 ]
 },
 {
 id: "global-4-us-4",
 name: "Reporting",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-4-us-4-1", name: "Auditor's Report — Fair Presentation Framework", type: "file" },
 { id: "global-4-us-4-2", name: "Auditor's Report — Compliance Framework", type: "file" },
 { id: "global-4-us-4-3", name: "Qualified Opinion — Material Misstatement (Fair Presentation)", type: "file" },
 { id: "global-4-us-4-4", name: "Qualified Opinion — Material Misstatement (Compliance)", type: "file" },
 { id: "global-4-us-4-5", name: "Qualified Opinion — Insufficient Evidence", type: "file" },
 { id: "global-4-us-4-6", name: "Adverse Opinion", type: "file" },
 { id: "global-4-us-4-7", name: "Disclaimer of Opinion", type: "file" },
 { id: "global-4-us-4-8", name: "Auditor's Report with Key Audit Matters and Emphasis of Matter", type: "file" },
 { id: "global-4-us-4-9", name: "Qualified Opinion with Emphasis of Matter", type: "file" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "global-5",
 name: "Compilation 2026",
 type: "folder",
 isExpanded: false,
 children: [
 { id: "global-5-1", name: "Client Acceptance and Continuance", type: "file" },
 ]
 }
];

// Country-specific engagement template trees for the picker panel
const engPickerTreeCA: TreeItem[] = [
 { id: "compilation", label: "Compilation", type: "folder", children: [
  { id: "comp4200", label: "Compilation CSRS 4200", type: "file", suggested: true },
 ]},
 { id: "review", label: "Review", type: "folder", children: [
  { id: "rev2400", label: "Review Section 2400", type: "file", suggested: true },
 ]},
 { id: "audit", label: "Audit", type: "folder", children: [
  { id: "audit5100", label: "CAS / ASPE — Private (5100)", type: "file", suggested: true },
  { id: "audit5101", label: "CAS / NFP — ASNPO (5101)", type: "file" },
 ]},
 { id: "tax", label: "Tax", type: "folder", children: [
  { id: "tax-t2", label: "T2 (Corporations)", type: "file" },
 ]},
];

const engPickerTreeUS: TreeItem[] = [
 { id: "compilation-us", label: "Compilation", type: "folder", children: [
  { id: "comp-us-ssars21", label: "SSARS 21 — Compilation of Financial Statements", type: "file", suggested: true },
  { id: "comp-us-arc80", label: "AR-C 80 Compilation Engagement", type: "file" },
 ]},
 { id: "review-us", label: "Review", type: "folder", children: [
  { id: "rev-us-ssars21", label: "SSARS 21 — Review of Financial Statements", type: "file", suggested: true },
  { id: "rev-us-arc90", label: "AR-C 90 Review Engagement", type: "file" },
 ]},
 { id: "audit-us-root", label: "Audit", type: "folder", children: [
  { id: "audit6100", label: "GAAS / US GAAP — Private (6100)", type: "file", suggested: true },
  { id: "audit6200", label: "PCAOB / SOX Public (6200)", type: "file" },
 ]},
 { id: "tax-us", label: "Tax", type: "folder", children: [
  { id: "tax-us-1120", label: "Form 1120 (C-Corporations)", type: "file", suggested: true },
  { id: "tax-us-1120s", label: "Form 1120-S (S-Corporations)", type: "file" },
  { id: "tax-us-1065", label: "Form 1065 (Partnerships)", type: "file" },
 ]},
];

// Labels for every engagement picker leaf, so saved templates never show a raw slug.
const engPickerLabelById: Record<string, string> = (() => {
 const map: Record<string, string> = {};
 const walk = (items: TreeItem[]) => items.forEach(i => {
  if (i.type === "folder") walk(i.children ?? []);
  else map[i.id] = i.label;
 });
 walk(engPickerTreeCA);
 walk(engPickerTreeUS);
 return map;
})();

// US picker entries that reuse an existing template view's content (US label kept).
const engPickerViewFallback: Record<string, string> = {
 "comp-us-ssars21": "comp4200",
 "comp-us-arc80": "comp4200",
 "rev-us-ssars21": "rev2400",
 "rev-us-arc90": "rev2400",
 "tax-us-1120": "tax-t2",
 "tax-us-1120s": "tax-t2",
 "tax-us-1065": "tax-t2",
};

function getEngPickerTemplateView(id: string) {
 const direct = allTemplateViews[id];
 if (direct) return direct;
 const fallbackId = engPickerViewFallback[id];
 const base = fallbackId ? allTemplateViews[fallbackId] : undefined;
 if (!base) return null;
 return { ...base, title: engPickerLabelById[id] || base.title };
}


// Global Worksheets data structure — shown when "Worksheets" is selected in the dropdown
export const initialGlobalWorksheets: GlobalTemplate[] = [
 {
 id: "gws-review",
 name: "Review",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "global-2-17", name: "Accounting Estimates (including Fair Values)", type: "file" },
 { id: "global-2-18", name: "Going Concern", type: "file" },
 ]
 },
 {
 id: "gws-audit",
 name: "Audit",
 type: "folder",
 isExpanded: true,
 children: [
 {
 id: "gws-audit-ca",
 name: "Canada",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "gca-ws-mat", name: "420 Materiality", type: "file" },
 { id: "gca-ws-sae", name: "428 Auditor's Expert", type: "file" },
 { id: "gca-ws-asm", name: "430 Overall Audit Strategy", type: "file" },
 { id: "gca-ws-plan", name: "436 Team Planning Discussions", type: "file" },
 { id: "gca-ws-tt", name: "450 Time Tracker", type: "file" },
 { id: "gca-ws-501b", name: "501-A Preliminary Analytical", type: "file" },
 { id: "gca-ws-507", name: "507 Governance Minutes", type: "file" },
 { id: "gca-ws-510", name: "510 Entity Understanding", type: "file" },
 { id: "gca-ws-511", name: "511 IT Environment", type: "file" },
 { id: "gca-ws-514", name: "514 Prior Period Estimates", type: "file" },
 { id: "gca-ws-506", name: "506 Fraud", type: "file" },
 { id: "gca-ws-513", name: "513 Accounting Estimates", type: "file" },
 { id: "gca-ws-515", name: "515 Related Parties", type: "file" },
 { id: "gca-ws-580", name: "580 Revenue Recognition", type: "file" },
 { id: "gca-ws-520", name: "520 Risk Register", type: "file" },
 { id: "gca-ws-590", name: "590 Engagement Scoping", type: "file" },
 { id: "gca-ws-535", name: "535 Info System", type: "file" },
 { id: "gca-ws-540", name: "540 Control Design", type: "file" },
 { id: "gca-ws-550", name: "550 Control Activities", type: "file" },
 { id: "gca-ws-551", name: "551 General IT Controls", type: "file" },
 { id: "gca-ws-575", name: "575 Control Deficiencies", type: "file" },
 { id: "gca-ws-605", name: "605 Risk Responses", type: "file" },
 { id: "gca-ws-610", name: "610 Sampling — Tests of Details", type: "file" },
 { id: "gca-ws-625", name: "625 Going Concern", type: "file" },
 { id: "gca-ws-630", name: "630 Confirmations", type: "file" },
 { id: "gca-ws-635", name: "635 Accounting Estimates", type: "file" },
 { id: "gca-ws-645", name: "645 Litigation, Claims and Non-Compliance", type: "file" },
 { id: "gca-ws-650", name: "650 Subsequent Events", type: "file" },
 { id: "gca-ws-655", name: "655 Final Analytics", type: "file" },
 { id: "gca-ws-666", name: "666 Related Parties", type: "file" },
 { id: "gca-ws-670", name: "670 Use of Journal Entries", type: "file" },
 { id: "gca-ws-680", name: "680 ASPE Supplementary Audit Procedures", type: "file" },
 {
 id: "gca-ws-proc", name: "Procedures", type: "folder", isExpanded: false, children: [
 { id: "gca-ws-proc-cash-grp", name: "Cash", type: "folder", isExpanded: false, children: [
 { id: "gca-ws-proc-cash", name: "Audit Procedures", type: "file" },
 { id: "gca-ws-proc-cash-bank", name: "Bank Reconciliation", type: "file" },
 { id: "gca-ws-proc-cash-count", name: "Cash Count", type: "file" },
 ]},
 { id: "gca-ws-proc-ar-grp", name: "Accounts Receivable", type: "folder", isExpanded: false, children: [
 { id: "gca-ws-proc-ar", name: "Audit Procedures", type: "file" },
 { id: "gca-ws-proc-ar-conf", name: "Confirmation Procedures", type: "file" },
 ]},
 { id: "gca-ws-proc-inv", name: "Inventory", type: "file" },
 { id: "gca-ws-proc-invest", name: "Investments", type: "file" },
 { id: "gca-ws-proc-lr", name: "Loans & Advances Receivable", type: "file" },
 { id: "gca-ws-proc-rp", name: "Related party", type: "file" },
 { id: "gca-ws-proc-ppe", name: "Property, Plant and Equipment", type: "file" },
 { id: "gca-ws-proc-intang", name: "Intangibles and Goodwill", type: "file" },
 { id: "gca-ws-proc-ltinv", name: "Other Investments", type: "file" },
 { id: "gca-ws-proc-bankdebt", name: "Bank indebtedness", type: "file" },
 { id: "gca-ws-proc-ap", name: "Accounts Payable and Accrued Liability", type: "file" },
 { id: "gca-ws-proc-tax", name: "Income Taxes", type: "file" },
 { id: "gca-ws-proc-notedebt", name: "Note Payable and Bank Debt", type: "file" },
 { id: "gca-ws-proc-lp", name: "Loans & Advances Payable", type: "file" },
 { id: "gca-ws-proc-ltd", name: "Long term debt", type: "file" },
 { id: "gca-ws-proc-equity", name: "Equity", type: "file" },
 { id: "gca-ws-proc-rev", name: "Revenue", type: "file" },
 { id: "gca-ws-proc-cos", name: "Cost of Sales", type: "file" },
 { id: "gca-ws-proc-payroll", name: "Payroll", type: "file" },
 { id: "gca-ws-proc-exp", name: "Other Expenses", type: "file" },
 ]
 },
 ]
 },
 {
 id: "gws-audit-us",
 name: "United States",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "global-us-4-1", name: "Withdrawal", type: "file" },
 { id: "global-us-4-2", name: "Notes on Significant Audit Decisions", type: "file" },
 { id: "global-us-4-3", name: "Key Audit Matters (AU-C 701)", type: "file" },
 { id: "global-us-4-4", name: "Audit Findings and Matters for Discussion", type: "file" },
 { id: "global-us-4-5", name: "Accumulation of Identified Misstatements (AIM)", type: "file" },
 { id: "global-us-4-6", name: "Matters Communicated to Those Charged with Governance (AU-C 260)", type: "file" },
 { id: "global-us-4-7", name: "Matters for Future Consideration", type: "file" },
 { id: "global-us-4-8", name: "Documenting Consultation", type: "file" },
 {
 id: "gus-ws-proc", name: "Procedures", type: "folder", isExpanded: false, children: [
 { id: "gus-ws-proc-cash", name: "Cash", type: "file" },
 { id: "gus-ws-proc-ar", name: "Accounts Receivable", type: "file" },
 { id: "gus-ws-proc-inv", name: "Inventory", type: "file" },
 { id: "gus-ws-proc-invest", name: "Investments", type: "file" },
 { id: "gus-ws-proc-lr", name: "Loans & Advances Receivable", type: "file" },
 { id: "gus-ws-proc-rp", name: "Related party", type: "file" },
 { id: "gus-ws-proc-ppe", name: "Property, Plant and Equipment", type: "file" },
 { id: "gus-ws-proc-intang", name: "Intangibles and Goodwill", type: "file" },
 { id: "gus-ws-proc-ltinv", name: "Other Investments", type: "file" },
 { id: "gus-ws-proc-bankdebt", name: "Bank indebtedness", type: "file" },
 { id: "gus-ws-proc-ap", name: "Accounts Payable and Accrued Liability", type: "file" },
 { id: "gus-ws-proc-tax", name: "Income Taxes", type: "file" },
 { id: "gus-ws-proc-notedebt", name: "Note Payable and Bank Debt", type: "file" },
 { id: "gus-ws-proc-lp", name: "Loans & Advances Payable", type: "file" },
 { id: "gus-ws-proc-ltd", name: "Long term debt", type: "file" },
 { id: "gus-ws-proc-equity", name: "Equity", type: "file" },
 { id: "gus-ws-proc-rev", name: "Revenue", type: "file" },
 { id: "gus-ws-proc-cos", name: "Cost of Sales", type: "file" },
 { id: "gus-ws-proc-payroll", name: "Payroll", type: "file" },
 { id: "gus-ws-proc-exp", name: "Other Expenses", type: "file" },
 ]
 },
 ]
 },
 ]
 },
];

// Global Letters data structure — shown when "Letters" is selected in the dropdown
const initialGlobalLetters: GlobalTemplate[] = [
 { id: "glt-compilation", name: "Compilation", type: "folder", isExpanded: true, children: [
 { id: "glt-1-1", name: "Engagement Letter — Compilation (Corp)", type: "file" },
 { id: "glt-1-2", name: "Management Responsibility & Acknowledgement CSRS 4200 (Corp)", type: "file" },
 ]},
 { id: "glt-review", name: "Review", type: "folder", isExpanded: true, children: [
 { id: "glt-2-1", name: "Engagement Letter Review — Master (Corp)", type: "file" },
 { id: "glt-2-2", name: "Management Representation Letter Review (Corp)", type: "file" },
 { id: "glt-2-3", name: "Review Findings Letter (Corp)", type: "file" },
 { id: "glt-2-4", name: "Letter to a Predecessor (Corp)", type: "file" },
 { id: "glt-2-5", name: "Letter to a Successor (Corp)", type: "file" },
 { id: "glt-2-6", name: "Request for Management Assistance (Corp)", type: "file" },
 ]},
 { id: "glt-tax", name: "Tax", type: "folder", isExpanded: false, children: [
 { id: "glt-3-1", name: "Tax Engagement Letter", type: "file" },
 ]},
 { id: "glt-additional", name: "Additional Letters", type: "folder", isExpanded: false, children: [
 { id: "glt-4-1", name: "Closing Cover Letter", type: "file" },
 { id: "glt-4-2", name: "Letter to Lawyer (Long Form)", type: "file" },
 { id: "glt-4-3", name: "Letter to Lawyer (Short Form)", type: "file" },
 { id: "glt-4-4", name: "Letter to Predecessor Accountant", type: "file" },
 { id: "glt-4-5", name: "Letter to Successor Accountant", type: "file" },
 ]},
 { id: "glt-audit", name: "Audit", type: "folder", isExpanded: true, children: [
 { id: "glt-audit-ca", name: "Canada", type: "folder", isExpanded: true, children: [
 { id: "glt-ca-1", name: "Audit Engagement Letter (CAS/ASPE)", type: "file" },
 { id: "glt-ca-2", name: "Audit Engagement Letter (CAS/ASNPO)", type: "file" },
 { id: "glt-ca-3", name: "Management Representation Letter (CAS 580)", type: "file" },
 { id: "glt-ca-4", name: "Communication with Those Charged with Governance — Planning (CAS 260)", type: "file" },
 { id: "glt-ca-5", name: "Communication with Those Charged with Governance — Final (CAS 260)", type: "file" },
 { id: "glt-ca-6", name: "Inquiry to Legal Counsel (Lawyer's Letter)", type: "file" },
 { id: "glt-ca-7", name: "Communication to Predecessor Auditor", type: "file" },
 { id: "glt-ca-8", name: "Letter to Management — Significant Deficiencies (CAS 265)", type: "file" },
 { id: "glt-ca-9", name: "Letter to a predecessor accounting firm", type: "file" },
 ]},
 { id: "glt-audit-us", name: "United States", type: "folder", isExpanded: true, children: [
 { id: "glt-us-1", name: "Audit Engagement Letter (GAAS/US GAAP)", type: "file" },
 { id: "glt-us-2", name: "Management Representation Letter (AU-C 580)", type: "file" },
 { id: "glt-us-3", name: "Communication with Those Charged with Governance — Planning (AU-C 260)", type: "file" },
 { id: "glt-us-4", name: "Communication with Those Charged with Governance — Final (AU-C 260)", type: "file" },
 { id: "glt-us-5", name: "Inquiry to Legal Counsel", type: "file" },
 { id: "glt-us-6", name: "Letter to Management — Significant Deficiencies (AU-C 265)", type: "file" },
 { id: "glt-us-7", name: "Communication to Predecessor Auditor (AU-C 210)", type: "file" },
 ]},
 ]},
];

// Global Reports data structure — shown when "Reports" is selected in the dropdown
const initialGlobalReports: GlobalTemplate[] = [
 {
 id: "grpt-compilation",
 name: "Compilation",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "grpt-1-1", name: "Engagement Report", type: "file" },
 ]
 },
 {
 id: "grpt-review",
 name: "Review",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "grpt-2-1", name: "Unqualified Report (ASPE)", type: "file" },
 { id: "grpt-2-2", name: "Modified Report (ASPE)", type: "file" },
 { id: "grpt-2-3", name: "Unqualified Report (ASNPO)", type: "file" },
 { id: "grpt-2-4", name: "Modified Report (ASNPO)", type: "file" },
 { id: "grpt-2-5", name: "Special purpose unqualified report", type: "file" },
 { id: "grpt-2-6", name: "Special purpose modified report", type: "file" },
 ]
 },
 {
 id: "grpt-audit",
 name: "Audit",
 type: "folder",
 isExpanded: true,
 children: [
 {
 id: "grpt-audit-ca",
 name: "Canada",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "grpt-ca-1", name: "Unqualified Auditor's Report (ASPE)", type: "file" },
 { id: "grpt-ca-2", name: "Unqualified Auditor's Report (ASNPO)", type: "file" },
 { id: "grpt-ca-3", name: "Qualified Opinion — Material Misstatement", type: "file" },
 { id: "grpt-ca-4", name: "Qualified Opinion — Insufficient Evidence", type: "file" },
 { id: "grpt-ca-5", name: "Adverse Opinion", type: "file" },
 { id: "grpt-ca-6", name: "Disclaimer of Opinion", type: "file" },
 { id: "grpt-ca-7", name: "Auditor's Report — Emphasis of Matter", type: "file" },
 { id: "grpt-ca-8", name: "Auditor's Report — Other Matter Paragraph", type: "file" },
 ]
 },
 {
 id: "grpt-audit-us",
 name: "United States",
 type: "folder",
 isExpanded: true,
 children: [
 { id: "grpt-us-1", name: "Auditor's Report — Fair Presentation Framework (AU-C 700)", type: "file" },
 { id: "grpt-us-2", name: "Auditor's Report — Compliance Framework (AU-C 800)", type: "file" },
 { id: "grpt-us-3", name: "Qualified Opinion — Material Misstatement (Fair Presentation)", type: "file" },
 { id: "grpt-us-4", name: "Qualified Opinion — Material Misstatement (Compliance)", type: "file" },
 { id: "grpt-us-5", name: "Qualified Opinion — Insufficient Evidence", type: "file" },
 { id: "grpt-us-6", name: "Adverse Opinion", type: "file" },
 { id: "grpt-us-7", name: "Disclaimer of Opinion", type: "file" },
 { id: "grpt-us-8", name: "Auditor's Report with Key Audit Matters and Emphasis of Matter", type: "file" },
 { id: "grpt-us-9", name: "Qualified Opinion with Emphasis of Matter", type: "file" },
 ]
 },
 ]
 },
];

// Icon components matching the screenshot
const AnalyticsIcon = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 {/* Bar chart icon */}
 <rect x="3" y="10" width="3" height="7" rx="0.5" fill="currentColor" />
 <rect x="8.5" y="6" width="3" height="11" rx="0.5" fill="currentColor" />
 <rect x="14" y="3" width="3" height="14" rx="0.5" fill="currentColor" />
 </svg>;
const GlassesIcon = () => <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M17.8332 16.5V14.8333C17.8332 13.2801 16.7709 11.9751 15.3332 11.605M12.4165 1.7423C13.6381 2.23679 14.4998 3.43443 14.4998 4.83333C14.4998 6.23224 13.6381 7.42988 12.4165 7.92437M13.6665 16.5C13.6665 14.9469 13.6665 14.1703 13.4128 13.5577C13.0745 12.741 12.4255 12.092 11.6088 11.7537C10.9962 11.5 10.2196 11.5 8.6665 11.5H6.1665C4.61337 11.5 3.8368 11.5 3.22423 11.7537C2.40747 12.092 1.75855 12.741 1.42024 13.5577C1.1665 14.1703 1.1665 14.9469 1.1665 16.5M10.7498 4.83333C10.7498 6.67428 9.25745 8.16667 7.4165 8.16667C5.57555 8.16667 4.08317 6.67428 4.08317 4.83333C4.08317 2.99238 5.57555 1.5 7.4165 1.5C9.25745 1.5 10.7498 2.99238 10.7498 4.83333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>;
const ChatIcon = () => <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M10.3332 8.16667H14.3332C15.2666 8.16667 15.7333 8.16667 16.0898 8.34832C16.4034 8.50811 16.6584 8.76308 16.8182 9.07668C16.9998 9.4332 16.9998 9.89991 16.9998 10.8333V16.5M10.3332 16.5V4.16667C10.3332 3.23325 10.3332 2.76654 10.1515 2.41002C9.99173 2.09641 9.73676 1.84144 9.42316 1.68166C9.06664 1.5 8.59993 1.5 7.6665 1.5H4.6665C3.73308 1.5 3.26637 1.5 2.90985 1.68166C2.59625 1.84144 2.34128 2.09641 2.18149 2.41002C1.99984 2.76654 1.99984 3.23325 1.99984 4.16667V16.5M17.8332 16.5H1.1665M4.9165 4.83333H7.4165M4.9165 8.16667H7.4165M4.9165 11.5H7.4165" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>;
const BriefcaseIcon = () => <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M1.58317 7.99992H4.40148C4.97248 7.99992 5.49448 8.32253 5.74984 8.83325C6.0052 9.34397 6.52719 9.66659 7.0982 9.66659H11.9015C12.4725 9.66659 12.9945 9.34397 13.2498 8.83325C13.5052 8.32253 14.0272 7.99992 14.5982 7.99992H17.4165M6.97197 1.33325H12.0277C12.9251 1.33325 13.3738 1.33325 13.7699 1.46989C14.1202 1.59072 14.4393 1.78792 14.704 2.04721C15.0034 2.34042 15.2041 2.74175 15.6054 3.5444L17.4109 7.15534C17.5684 7.47032 17.6471 7.62782 17.7027 7.79287C17.752 7.93946 17.7876 8.09031 17.809 8.24347C17.8332 8.41594 17.8332 8.59202 17.8332 8.94419V10.6666C17.8332 12.0667 17.8332 12.7668 17.5607 13.3016C17.321 13.772 16.9386 14.1544 16.4681 14.3941C15.9334 14.6666 15.2333 14.6666 13.8332 14.6666H5.1665C3.76637 14.6666 3.06631 14.6666 2.53153 14.3941C2.06112 14.1544 1.67867 13.772 1.43899 13.3016C1.1665 12.7668 1.1665 12.0667 1.1665 10.6666V8.94419C1.1665 8.59202 1.1665 8.41594 1.19065 8.24347C1.21209 8.09031 1.2477 7.93946 1.29702 7.79287C1.35255 7.62782 1.4313 7.47032 1.5888 7.15534L3.39426 3.5444C3.79559 2.74174 3.99626 2.34042 4.29562 2.04721C4.56036 1.78792 4.87943 1.59072 5.22974 1.46989C5.62588 1.33325 6.07458 1.33325 6.97197 1.33325Z" stroke="#5599D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>;
const FileIcon = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 {/* Document/file icon */}
 <path d="M5 2h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
 <path d="M12 2v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
 </svg>;
const navItems = [{
 icon: AnalyticsIcon,
 label: "Dashboard",
 route: "/dashboard"
}, {
 icon: GlassesIcon,
 label: "Team",
 route: "/teams"
}, {
 icon: ChatIcon,
 label: "Clients",
 route: "/clients"
}, {
 icon: ({ className }: { className?: string }) => <svg className={className} width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.08317 8.00016H4.90148C5.47248 8.00016 5.99448 8.32277 6.24984 8.8335C6.5052 9.34422 7.02719 9.66683 7.5982 9.66683H12.4015C12.9725 9.66683 13.4945 9.34422 13.7498 8.8335C14.0052 8.32277 14.5272 8.00016 15.0982 8.00016H17.9165M7.47197 1.3335H12.5277C13.4251 1.3335 13.8738 1.3335 14.2699 1.47013C14.6202 1.59096 14.9393 1.78816 15.204 2.04745C15.5034 2.34066 15.7041 2.742 16.1054 3.54464L17.9109 7.15558C18.0684 7.47057 18.1471 7.62806 18.2027 7.79312C18.252 7.9397 18.2876 8.09055 18.309 8.24372C18.3332 8.41618 18.3332 8.59227 18.3332 8.94443V10.6668C18.3332 12.067 18.3332 12.767 18.0607 13.3018C17.821 13.7722 17.4386 14.1547 16.9681 14.3943C16.4334 14.6668 15.7333 14.6668 14.3332 14.6668H5.6665C4.26637 14.6668 3.56631 14.6668 3.03153 14.3943C2.56112 14.1547 2.17867 13.7722 1.93899 13.3018C1.6665 12.767 1.6665 12.067 1.6665 10.6668V8.94443C1.6665 8.59227 1.6665 8.41618 1.69065 8.24372C1.71209 8.09055 1.7477 7.9397 1.79702 7.79312C1.85255 7.62806 1.9313 7.47057 2.0888 7.15558L3.89426 3.54464C4.29559 2.74199 4.49626 2.34066 4.79562 2.04745C5.06036 1.78816 5.37943 1.59096 5.72974 1.47013C6.12588 1.3335 6.57458 1.3335 7.47197 1.3335Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
 label: "Engagements",
 route: "/engagements"
}, {
 icon: FileIcon,
 label: "Templates",
 route: "/create"
}];

// Luka Logo Component
const LukaLogo = () => <LukaIcon size={28} />;

// Dropdown menu items with colored icons
const EngagementDropdownIcon = ({ className }: { className?: string }) => <svg className={className} width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.08317 8.00016H4.90148C5.47248 8.00016 5.99448 8.32277 6.24984 8.8335C6.5052 9.34422 7.02719 9.66683 7.5982 9.66683H12.4015C12.9725 9.66683 13.4945 9.34422 13.7498 8.8335C14.0052 8.32277 14.5272 8.00016 15.0982 8.00016H17.9165M7.47197 1.3335H12.5277C13.4251 1.3335 13.8738 1.3335 14.2699 1.47013C14.6202 1.59096 14.9393 1.78816 15.204 2.04745C15.5034 2.34066 15.7041 2.742 16.1054 3.54464L17.9109 7.15558C18.0684 7.47057 18.1471 7.62806 18.2027 7.79312C18.252 7.9397 18.2876 8.09055 18.309 8.24372C18.3332 8.41618 18.3332 8.59227 18.3332 8.94443V10.6668C18.3332 12.067 18.3332 12.767 18.0607 13.3018C17.821 13.7722 17.4386 14.1547 16.9681 14.3943C16.4334 14.6668 15.7333 14.6668 14.3332 14.6668H5.6665C4.26637 14.6668 3.56631 14.6668 3.03153 14.3943C2.56112 14.1547 2.17867 13.7722 1.93899 13.3018C1.6665 12.767 1.6665 12.067 1.6665 10.6668V8.94443C1.6665 8.59227 1.6665 8.41618 1.69065 8.24372C1.71209 8.09055 1.7477 7.9397 1.79702 7.79312C1.85255 7.62806 1.9313 7.47057 2.0888 7.15558L3.89426 3.54464C4.29559 2.74199 4.49626 2.34066 4.79562 2.04745C5.06036 1.78816 5.37943 1.59096 5.72974 1.47013C6.12588 1.3335 6.57458 1.3335 7.47197 1.3335Z" stroke="#5599D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const dropdownItems = [{
 id: "engagements",
 label: "Engagements",
 icon: EngagementDropdownIcon,
 color: "text-blue-500",
 showCreator: false
}, {
 id: "financial-statements",
 label: "Financial Statements",
 icon: FinancialStatementsIcon,
 color: "text-emerald-500",
 showCreator: false
}, {
 id: "letters",
 label: "Letters",
 icon: FileText,
 color: "text-purple-500",
 showCreator: true
}, {
 id: "checklists",
 label: "Checklists",
 icon: ChecklistIcon,
 color: "text-orange-500",
 showCreator: true
}, {
 id: "reports",
 label: "Reports",
 icon: ReportIcon,
 color: "text-[#be185d]",
 showCreator: true
}, {
 id: "notes",
 label: "Notes to Financial Statements",
 icon: NotebookPen,
 color: "text-yellow-500",
 showCreator: true
}, {
 id: "worksheets",
 label: "Worksheets",
 icon: Table,
 color: "text-blue-400",
 showCreator: false
}];
export type ContentType = "letters" | "checklists" | "reports" | "notes";

interface SidebarProps {
 pageTitle?: string;
 showBackButton?: boolean;
 onBack?: () => void;
}

function getFileTypeIcon(filename: string, sizeClass = 'h-4 w-4') {
 const ext = filename.split('.').pop()?.toLowerCase() ?? '';
 if (['xlsx', 'xls', 'csv', 'numbers'].includes(ext))
 return <XlsxIcon className={`${sizeClass} flex-shrink-0`} />;
 if (['doc', 'docx', 'odt', 'rtf'].includes(ext))
 return <WordDocIcon className={`${sizeClass} flex-shrink-0`} />;
 if (ext === 'pdf')
 return <PdfIcon className={`${sizeClass} flex-shrink-0`} />;
 if (['ppt', 'pptx', 'key'].includes(ext))
 return <FileBarChart className={`${sizeClass} flex-shrink-0 text-orange-500`} />;
 if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext))
 return <Image className={`${sizeClass} flex-shrink-0 text-purple-500`} />;
 if (['txt', 'md', 'log'].includes(ext))
 return <FileText className={`${sizeClass} flex-shrink-0 text-muted-foreground`} />;
 return <Files className={`${sizeClass} flex-shrink-0 text-muted-foreground`} />;
}

export function Sidebar({ pageTitle, showBackButton, onBack }: SidebarProps) {
 const navigate = useNavigate();
 const location = useLocation();
 const { toast } = useToast();
 const [searchParams, setSearchParams] = useSearchParams();
 const [templates, setTemplates] = useState<Template[]>(initialTemplates);
 const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>(initialGlobalTemplates);
 const [globalWorksheets, setGlobalWorksheets] = useState<GlobalTemplate[]>(initialGlobalWorksheets);
 const [globalReports, setGlobalReports] = useState<GlobalTemplate[]>(initialGlobalReports);
 const [globalLetters, setGlobalLetters] = useState<GlobalTemplate[]>(initialGlobalLetters);
 const [activeTab, setActiveTab] = useState<"firm" | "master">("firm");
 const [searchQuery, setSearchQuery] = useState("");
 const { isCollapsed: isTemplatesPanelCollapsed, setIsCollapsed: setIsTemplatesPanelCollapsed } = useSecondaryPanel();
 const [selectedGlobalTemplate, setSelectedGlobalTemplate] = useState<string | null>("global-1-1");

 // Engagement Templates tree state
 const [engTemplateExpandedFolders, setEngTemplateExpandedFolders] = useState<Set<string>>(
 () => new Set(["compilation", "review", "audit"])
 );
 const engTemplateSelectedId = searchParams.get("template") || null;
 const [engTemplateSearchQuery, setEngTemplateSearchQuery] = useState("");
 const [engSidebarSearchQuery, setEngSidebarSearchQuery] = useState("");

 const toggleEngTemplateFolder = useCallback((id: string) => {
 setEngTemplateExpandedFolders((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }, []);

 const selectEngTemplate = useCallback((id: string) => {
 setSearchParams({ template: id }, { replace: true });
 }, [setSearchParams]);
 
 // Multi-select state for Global Templates
 const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
 const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
 const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);

 // Multi-select state for Engagement Templates tree
 const [selectedEngTemplates, setSelectedEngTemplates] = useState<Set<string>>(new Set());
 const [engBulkAddDialogOpen, setEngBulkAddDialogOpen] = useState(false);
 const [engActiveTab, setEngActiveTab] = useState<"my" | "global">("my");
 const [engPickerOpen, setEngPickerOpen] = useState(false);
 const [engPickerCountry, setEngPickerCountry] = useState<"CA" | "US">("CA");
 const [myEngagementTemplates, setMyEngagementTemplates] = useState<import("@/lib/engagementTemplatesData").MyEngagementTemplate[]>(() =>
 readJsonFromLocalStorage("myEngagementTemplates", [])
 );
 const [engMyFolderExpanded, setEngMyFolderExpanded] = useState<Set<string>>(new Set());
 const [engMySearchQuery, setEngMySearchQuery] = useState("");
 const [engMySelectedIds, setEngMySelectedIds] = useState<Set<string>>(new Set());
 const [engMyDeleteConfirmOpen, setEngMyDeleteConfirmOpen] = useState(false);
 // Context menu state
 type EngMyFolder = { id: string; name: string; templates: import("@/lib/engagementTemplatesData").MyEngagementTemplate[] };
 const [engMyCtxFolder, setEngMyCtxFolder] = useState<EngMyFolder | null>(null);
 const [engMyCtxTemplate, setEngMyCtxTemplate] = useState<import("@/lib/engagementTemplatesData").MyEngagementTemplate | null>(null);
 const [engMyFolderRenameOpen, setEngMyFolderRenameOpen] = useState(false);
 const [engMyFolderDeleteOpen, setEngMyFolderDeleteOpen] = useState(false);
 const [engMyFolderRenameValue, setEngMyFolderRenameValue] = useState("");
 const [engMyTemplateRenameOpen, setEngMyTemplateRenameOpen] = useState(false);
 const [engMyTemplateRenameValue, setEngMyTemplateRenameValue] = useState("");
 const [engMyTemplateSingleDeleteOpen, setEngMyTemplateSingleDeleteOpen] = useState(false);
 const [engMyTemplateMoveOpen, setEngMyTemplateMoveOpen] = useState(false);
 const [engMyTemplateMoveTargetId, setEngMyTemplateMoveTargetId] = useState("");
 const [engMyDefaultId, setEngMyDefaultId] = useState<string | null>(() => {
  try { return localStorage.getItem("defaultEngagementTemplateId"); } catch { return null; }
 });

 // Engagement My Templates – context menu handlers
 const engMyUpdateStorage = (updated: import("@/lib/engagementTemplatesData").MyEngagementTemplate[]) => {
  writeJsonToLocalStorage("myEngagementTemplates", updated);
  setMyEngagementTemplates(updated);
 };
 const handleEngMyFolderRenameConfirm = () => {
  if (!engMyCtxFolder || !engMyFolderRenameValue.trim()) return;
  const updated = myEngagementTemplates.map(t =>
   t.folderId === engMyCtxFolder.id ? { ...t, folderName: engMyFolderRenameValue.trim() } : t
  );
  engMyUpdateStorage(updated);
  setEngMyFolderRenameOpen(false);
 };
 const handleEngMyFolderDelete = () => {
  if (!engMyCtxFolder) return;
  const remaining = myEngagementTemplates.filter(t => t.folderId !== engMyCtxFolder.id);
  engMyUpdateStorage(remaining);
  if (engMyCtxFolder.templates.some(t => t.id === searchParams.get("myTemplate"))) {
   setSearchParams({}, { replace: true });
  }
  setEngMyFolderDeleteOpen(false);
  toast({ title: `Folder "${engMyCtxFolder.name}" and its templates deleted` });
 };
 const handleEngMyTemplateRenameConfirm = () => {
  if (!engMyCtxTemplate || !engMyTemplateRenameValue.trim()) return;
  const updated = myEngagementTemplates.map(t =>
   t.id === engMyCtxTemplate.id ? { ...t, name: engMyTemplateRenameValue.trim() } : t
  );
  engMyUpdateStorage(updated);
  setEngMyTemplateRenameOpen(false);
 };
 const handleEngMyTemplateDuplicate = (t: import("@/lib/engagementTemplatesData").MyEngagementTemplate) => {
  const copy = { ...t, id: `my-eng-${Date.now()}`, name: `${t.name} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  engMyUpdateStorage([...myEngagementTemplates, copy]);
  toast({ title: "Template duplicated" });
 };
 const handleEngMyTemplateSingleDelete = () => {
  if (!engMyCtxTemplate) return;
  const remaining = myEngagementTemplates.filter(t => t.id !== engMyCtxTemplate.id);
  engMyUpdateStorage(remaining);
  if (searchParams.get("myTemplate") === engMyCtxTemplate.id) setSearchParams({}, { replace: true });
  setEngMyTemplateSingleDeleteOpen(false);
  toast({ title: "Template deleted" });
 };
 const handleEngMyTemplateMoveConfirm = () => {
  if (!engMyCtxTemplate || !engMyTemplateMoveTargetId) return;
  const targetFolder = Object.values(
   myEngagementTemplates.reduce((acc, t) => { acc[t.folderId] = { id: t.folderId, name: t.folderName }; return acc; }, {} as Record<string, {id: string; name: string}>)
  ).find(f => f.id === engMyTemplateMoveTargetId);
  if (!targetFolder) return;
  const updated = myEngagementTemplates.map(t =>
   t.id === engMyCtxTemplate.id ? { ...t, folderId: targetFolder.id, folderName: targetFolder.name } : t
  );
  engMyUpdateStorage(updated);
  setEngMyTemplateMoveOpen(false);
  toast({ title: "Template moved" });
 };
 const handleEngMySetDefault = (id: string) => {
  const next = engMyDefaultId === id ? null : id;
  setEngMyDefaultId(next);
  if (next) localStorage.setItem("defaultEngagementTemplateId", next);
  else localStorage.removeItem("defaultEngagementTemplateId");
 };

 const handleEngTemplateCheckbox = (id: string, checked: boolean) => {
 setSelectedEngTemplates(prev => {
 const next = new Set(prev);
 checked ? next.add(id) : next.delete(id);
 return next;
 });
 };

 const getAllEngFileIds = (items: TreeItem[]): string[] =>
 items.flatMap(item =>
 item.type === "folder" ? getAllEngFileIds(item.children ?? []) : [item.id]
 );

 const getAllEngFolderIds = (items: TreeItem[]): string[] =>
 items.flatMap(item =>
 item.type === "folder"
 ? [item.id,...getAllEngFolderIds(item.children ?? [])]
 : []
 );

 // Returns the IDs of all ancestor folders for a given file ID
 const findAncestorFolderIds = (items: TreeItem[], targetId: string, ancestors: string[] = []): string[] | null => {
 for (const item of items) {
 if (item.id === targetId) return ancestors;
 if (item.type === "folder" && item.children) {
 const result = findAncestorFolderIds(item.children, targetId, [...ancestors, item.id]);
 if (result !== null) return result;
 }
 }
 return null;
 };

 // Auto-expand ancestor folders whenever the selected template changes
 useEffect(() => {
 if (!engTemplateSelectedId) return;
 const ancestors = findAncestorFolderIds(templateTree, engTemplateSelectedId);
 if (ancestors && ancestors.length > 0) {
 setEngTemplateExpandedFolders(prev => {
 const next = new Set(prev);
 ancestors.forEach(id => next.add(id));
 return next;
 });
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [engTemplateSelectedId]);

 const activeEngPickerTree = engPickerCountry === "CA" ? engPickerTreeCA : engPickerTreeUS;
 const allEngFolderIds = getAllEngFolderIds(activeEngPickerTree);
 const allEngExpanded = allEngFolderIds.every(id => engTemplateExpandedFolders.has(id));

 const handleEngExpandCollapseAll = () => {
 if (allEngExpanded) {
 setEngTemplateExpandedFolders(new Set());
 } else {
 setEngTemplateExpandedFolders(new Set(allEngFolderIds));
 }
 };

 const allEngMyFolderIds = Array.from(new Set(myEngagementTemplates.map(t => t.folderId)));
 const allEngMyExpanded = allEngMyFolderIds.length > 0 && allEngMyFolderIds.every(id => engMyFolderExpanded.has(id));
 const handleEngMyExpandCollapseAll = () => {
 if (allEngMyExpanded) {
 setEngMyFolderExpanded(new Set());
 } else {
 setEngMyFolderExpanded(new Set(allEngMyFolderIds));
 }
 };

 const handleEngFolderCheckbox = (item: TreeItem, checked: boolean) => {
 const childIds = getAllEngFileIds(item.children ?? []);
 setSelectedEngTemplates(prev => {
 const next = new Set(prev);
 childIds.forEach(id => checked ? next.add(id) : next.delete(id));
 return next;
 });
 };

 const isEngFolderChecked = (item: TreeItem): boolean => {
 const ids = getAllEngFileIds(item.children ?? []);
 return ids.length > 0 && ids.every(id => selectedEngTemplates.has(id));
 };

 const isEngFolderIndeterminate = (item: TreeItem): boolean => {
 const ids = getAllEngFileIds(item.children ?? []);
 const count = ids.filter(id => selectedEngTemplates.has(id)).length;
 return count > 0 && count < ids.length;
 };

 // Resizable panel state
 const [panelWidth, setPanelWidth] = useState(() => {
 const stored = localStorage.getItem("sidebarPanelWidth_v2");
 if (stored) {
 const parsed = parseInt(stored, 10);
 if (!isNaN(parsed) && parsed >= 200 && parsed <= 600) {
 return parsed;
 }
 }
 return 400;
 });
 const [isResizing, setIsResizing] = useState(false);
 const [isResizeHovering, setIsResizeHovering] = useState(false);
 const panelRef = useRef<HTMLDivElement>(null);

 // Save panel width to localStorage
 useEffect(() => {
 if (!isTemplatesPanelCollapsed) {
 localStorage.setItem("sidebarPanelWidth_v2", String(panelWidth));
 }
 }, [panelWidth, isTemplatesPanelCollapsed]);

 // Resize handlers
 const startResizing = useCallback((e: React.MouseEvent) => {
 e.preventDefault();
 setIsResizing(true);
 }, []);

 const stopResizing = useCallback(() => {
 setIsResizing(false);
 }, []);

 const resize = useCallback(
 (e: MouseEvent) => {
 if (isResizing && panelRef.current) {
 const panelRect = panelRef.current.getBoundingClientRect();
 const newWidth = e.clientX - panelRect.left;
 
 if (newWidth >= 200 && newWidth <= 500) {
 setPanelWidth(newWidth);
 } else if (newWidth < 200) {
 setPanelWidth(200);
 } else if (newWidth > 500) {
 setPanelWidth(500);
 }
 }
 },
 [isResizing]
 );

 useEffect(() => {
 if (isResizing) {
 window.addEventListener("mousemove", resize);
 window.addEventListener("mouseup", stopResizing);
 document.body.style.cursor = "col-resize";
 document.body.style.userSelect = "none";
 }

 return () => {
 window.removeEventListener("mousemove", resize);
 window.removeEventListener("mouseup", stopResizing);
 document.body.style.cursor = "";
 document.body.style.userSelect = "";
 };
 }, [isResizing, resize, stopResizing]);

 // Persist dropdown selection in localStorage
 const [selectedDropdown, setSelectedDropdown] = useState(() => {
 const stored = localStorage.getItem("selectedDropdown");
 return stored || "engagements";
 });

 // Sync selection to localStorage whenever it changes
 useEffect(() => {
 localStorage.setItem("selectedDropdown", selectedDropdown);
 }, [selectedDropdown]);

 // Collapse/restore secondary panel when FS template edit mode changes
 useEffect(() => {
 let wasCollapsed = false;
 const handler = (e: Event) => {
 const { active } = (e as CustomEvent<{ active: boolean }>).detail;
 if (active) {
 wasCollapsed = isTemplatesPanelCollapsed;
 setIsTemplatesPanelCollapsed(true);
 } else {
 setIsTemplatesPanelCollapsed(wasCollapsed);
 }
 };
 window.addEventListener("fs-template-edit-mode", handler);
 return () => window.removeEventListener("fs-template-edit-mode", handler);
 }, []);

 // Toggle secondary panel from FS template edit mode header button
 useEffect(() => {
 const handler = () => setIsTemplatesPanelCollapsed(prev => !prev);
 window.addEventListener("fs-template-panel-toggle", handler);
 return () => window.removeEventListener("fs-template-panel-toggle", handler);
 }, []);

 // On templates pages: ensure panel is expanded (not stuck collapsed from edit mode)
 useEffect(() => {
 if (location.pathname.startsWith("/financial-statement-templates") || location.pathname.startsWith("/templates") || location.pathname.startsWith("/engagement-templates")) {
 setIsTemplatesPanelCollapsed(false);
 }
 }, [location.pathname]);

 // Restore selection from navigation state if contentType is passed
 useEffect(() => {
 const navState = location.state as {
 contentType?: string;
 } | null;
 if (navState?.contentType) {
 setSelectedDropdown(navState.contentType);
 }
 }, [location.state]);
 const [savedChecklists, setSavedChecklists] = useState<SavedChecklist[]>([]);

 // Context menu state
 const [renameDialogOpen, setRenameDialogOpen] = useState(false);
 const [moveDialogOpen, setMoveDialogOpen] = useState(false);
 const [selectedChecklist, setSelectedChecklist] = useState<SavedChecklist | null>(null);
 const [renameValue, setRenameValue] = useState("");
 const [selectedMoveFolder, setSelectedMoveFolder] = useState("");

 // Map of aud-wp-* → selected gca-ws-proc-* IDs, synced from 590 worksheet
 const [wpProcMap, setWpProcMapState] = useState<Record<string, string[]>>(() => {
  const id = location.pathname.split("/engagements/")[1]?.split("/")[0];
  if (!id) return {};
  try {
   const raw = localStorage.getItem(`audit-590-wp-proc-map-${id}`);
   return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
 });
 useEffect(() => {
  const id = location.pathname.split("/engagements/")[1]?.split("/")[0];
  if (!id) return;
  const key = `audit-590-wp-proc-map-${id}`;
  const read = () => {
   try {
    const raw = localStorage.getItem(key);
    setWpProcMapState(raw ? JSON.parse(raw) : {});
   } catch { setWpProcMapState({}); }
  };
  read();
  const onStorage = (e: StorageEvent) => { if (e.key === key) read(); };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
 }, [location.pathname]);

 // Derive activeProcedureIds from wpProcMap — single source of truth, no race condition
 const activeProcedureIds = Object.keys(wpProcMap).filter(id => (wpProcMap[id]?.length ?? 0) > 0);

 // Load saved checklists on mount and listen for new saves
 useEffect(() => {
 const SEED_VERSION = "5";
 const seedAllChecklists = (): SavedChecklist[] => {
 // Compilation Checklists (folder id "5") — CA
 const compilationItems: { id: string; generator: () => any }[] = [
 { id: "default-compilation-cac", generator: generateClientAcceptanceContinuanceChecklist },
 { id: "default-compilation-independence", generator: generateIndependenceChecklist },
 { id: "default-compilation-kcb", generator: generateKnowledgeOfClientBusinessChecklist },
 { id: "default-compilation-planning", generator: generatePlanningChecklist },
 { id: "default-compilation-el", generator: generateEngagementLetterChecklist },
 { id: "default-compilation-mr", generator: generateManagementResponsibilityChecklist },
 ];
 const compilationSeeds: SavedChecklist[] = compilationItems.map(({ id, generator }) => {
 const data = generator();
 return { id, name: data.title, folderId: "5", folderName: "Compilation Checklists", country: "CA" as const, data };
 });
 // Review Checklists (folder id "7") — CA
 const reviewNames = [
 "New Engagement Acceptance",
 "Existing Engagement Continuance",
 "Understanding the Entity — Basics",
 "Understanding the Entity — Systems",
 "Engagement Planning",
 "Subsequent Events",
 "Withdrawal",
 "Completion",
 ];
 const reviewSeeds: SavedChecklist[] = reviewNames.map((name, i) => ({
 id: `default-review-${i + 1}`,
 name,
 folderId: "7",
 folderName: "Review Checklists",
 country: "CA" as const,
 }));
 // Audit Checklists — Canada CAS items (shared by "Audit Checklists" id "8" and "Northline Holdings" id "1")
 const caAuditNames = [
 "408 Initial Audit Engagements",
 "410 New/Existing Engagement — Acceptance/Continuance",
 "500 Observation & Inspection",
 "501-B Preliminary Analytical",
 "505 Mgmt Inquiries",
 "525 Going Concern",
 "530 Pervasive Risks",
 "Independent Auditor's Report",
 "AIM Misstatements",
 "FAR Final Analytical Review",
 "SE Subsequent Events",
 "GC Going Concern (Final Assessment)",
 "MR Management Representation Letter",
 "DC Disclosure Checklist",
 ];
 const auditSeeds: SavedChecklist[] = caAuditNames.map((name, i) => ({
 id: `default-audit-ca-${i + 1}`,
 name,
 folderId: "8",
 folderName: "Audit Checklists",
 country: "CA" as const,
 }));
 const northlineSeeds: SavedChecklist[] = caAuditNames.map((name, i) => ({
 id: `default-northline-audit-${i + 1}`,
 name,
 folderId: "1",
 folderName: "Northline Holdings",
 country: "CA" as const,
 }));
 // US Audit Checklists (folder id "9") — Pacific Rim Corp (id "3") shares same items
 const usAuditNames = [
 "Assessing Acceptability of Financial Reporting Framework",
 "Audit Team Competency Matrix",
 "Auditor's Declaration — Code of Ethics",
 "Declaration of Conflict of Interest",
 "Declaration of NO Conflict of Interest",
 "Assessment of Ethical Threats and Safeguards",
 "Audit Engagement Letter",
 "Understanding the Entity and Its Environment",
 "Determining Materiality",
 "Overall Audit Strategy and Audit Plan",
 "Direct Assistance — Internal Auditors Agreement",
 "Evaluating Misstatements",
 "Analytical Procedures — End of Audit",
 "Management Representation Letter",
 "Auditor's Report — Fair Presentation Framework",
 "Auditor's Report — Compliance Framework",
 ];
 const usAuditSeeds: SavedChecklist[] = usAuditNames.map((name, i) => ({
 id: `default-audit-us-${i + 1}`,
 name,
 folderId: "9",
 folderName: "US Audit Checklists",
 country: "US" as const,
 }));
 const pacificRimSeeds: SavedChecklist[] = usAuditNames.map((name, i) => ({
 id: `default-pacific-rim-audit-${i + 1}`,
 name,
 folderId: "3",
 folderName: "Pacific Rim Corp",
 country: "US" as const,
 }));
 const seeded = [...compilationSeeds, ...reviewSeeds, ...auditSeeds, ...northlineSeeds, ...usAuditSeeds, ...pacificRimSeeds];
 writeJsonToLocalStorage("savedChecklists", seeded);
 localStorage.setItem("savedChecklistsVersion", SEED_VERSION);
 return seeded;
 };

 const loadSavedChecklists = () => {
 const version = localStorage.getItem("savedChecklistsVersion");
 if (version !== SEED_VERSION) {
 // Outdated or missing version — re-seed with updated defaults
 setSavedChecklists(seedAllChecklists());
 return;
 }
 const parsed = readJsonFromLocalStorage<unknown>("savedChecklists", []);
 if (Array.isArray(parsed) && parsed.length > 0) {
 setSavedChecklists(parsed as SavedChecklist[]);
 } else {
 removeLocalStorageKey("savedChecklists");
 setSavedChecklists(seedAllChecklists());
 }
 };
 loadSavedChecklists();
 const handleChecklistSaved = (event: CustomEvent<SavedChecklist>) => {
 setSavedChecklists(prev => prev.some(c => c.id === event.detail.id) ? prev : [...prev, event.detail]);
 };
 window.addEventListener("checklistSaved", handleChecklistSaved as EventListener);

 const handleEngTemplateSaved = () => {
 const updated = readJsonFromLocalStorage<import("@/lib/engagementTemplatesData").MyEngagementTemplate[]>("myEngagementTemplates", []);
 setMyEngagementTemplates(updated);
 setEngActiveTab("my");
 };
 window.addEventListener("engagementTemplateSaved", handleEngTemplateSaved);

 return () => {
 window.removeEventListener("checklistSaved", handleChecklistSaved as EventListener);
 window.removeEventListener("engagementTemplateSaved", handleEngTemplateSaved);
 };
 }, []);

 // Sync to localStorage whenever savedChecklists changes
 useEffect(() => {
 if (savedChecklists.length > 0) {
 writeJsonToLocalStorage("savedChecklists", savedChecklists);
 }
 }, [savedChecklists]);
 const handleDropdownSelect = (itemId: string) => {
 // Write synchronously BEFORE any navigation so that if the Sidebar
 // remounts on the new page it reads the correct value from localStorage.
 localStorage.setItem("selectedDropdown", itemId);
 setSelectedDropdown(itemId);
 if (itemId === "engagements") {
 if (location.pathname !== "/engagement-templates") {
 navigate("/engagement-templates");
 } else {
 setSearchParams({}, { replace: true });
 }
 } else if (itemId === "checklists") {
 navigate("/create", { state: { contentType: "checklists" } });
 } else {
 // financial-statements, letters, reports, notes, worksheets
 // Navigate to the builder with a clear flag so the placeholder is shown.
 navigate("/builder", { state: { clearContent: true } });
 }
 };
 const toggleFolder = (id: string) => {
 setTemplates(prev => prev.map(t => t.id === id ? {
...t,
 isExpanded: !t.isExpanded
 } : t));
 };

 // Toggle global template folder (supports nested folders)
 const toggleGlobalFolder = (id: string) => {
 const toggle = (items: GlobalTemplate[]): GlobalTemplate[] =>
 items.map(t => t.id === id
 ? {...t, isExpanded: !t.isExpanded }
 : t.children
 ? {...t, children: toggle(t.children) }
 : t
 );
 setGlobalTemplates(prev => toggle(prev));
 };

 // Toggle global report folder
 const toggleGlobalReport = (id: string) => {
 const toggle = (items: GlobalTemplate[]): GlobalTemplate[] =>
 items.map(t => t.id === id
 ? {...t, isExpanded: !t.isExpanded }
 : t.children
 ? {...t, children: toggle(t.children) }
 : t
 );
 setGlobalReports(prev => toggle(prev));
 };

 // Toggle global worksheet folder (mirrors toggleGlobalFolder but for worksheets state)
 const toggleGlobalWorksheet = (id: string) => {
 const toggle = (items: GlobalTemplate[]): GlobalTemplate[] =>
 items.map(t => t.id === id
 ? {...t, isExpanded: !t.isExpanded }
 : t.children
 ? {...t, children: toggle(t.children) }
 : t
 );
 setGlobalWorksheets(prev => toggle(prev));
 };

 // Toggle global letter folder
 const toggleGlobalLetter = (id: string) => {
 const toggle = (items: GlobalTemplate[]): GlobalTemplate[] =>
 items.map(t => t.id === id
 ? {...t, isExpanded: !t.isExpanded }
 : t.children
 ? {...t, children: toggle(t.children) }
 : t
 );
 setGlobalLetters(prev => toggle(prev));
 };

 // Get all child template IDs from a folder
 const getChildTemplateIds = (folder: GlobalTemplate): string[] => {
 if (!folder.children) return [];
 return folder.children.filter(c => c.type === 'file').map(c => c.id);
 };

 // Handle template checkbox change
 const handleTemplateCheckboxChange = (templateId: string, checked: boolean) => {
 setSelectedTemplates(prev => {
 const newSet = new Set(prev);
 if (checked) {
 newSet.add(templateId);
 } else {
 newSet.delete(templateId);
 }
 return newSet;
 });
 };

 // Handle folder checkbox change (selects all children)
 const handleFolderCheckboxChange = (folder: GlobalTemplate, checked: boolean) => {
 const childIds = getChildTemplateIds(folder);
 
 if (checked) {
 // Unselect any previously selected folder's children
 if (selectedFolder && selectedFolder !== folder.id) {
 const prevFolder = globalTemplates.find(t => t.id === selectedFolder);
 if (prevFolder) {
 const prevChildIds = getChildTemplateIds(prevFolder);
 setSelectedTemplates(prev => {
 const newSet = new Set(prev);
 prevChildIds.forEach(id => newSet.delete(id));
 childIds.forEach(id => newSet.add(id));
 return newSet;
 });
 } else {
 setSelectedTemplates(prev => {
 const newSet = new Set(prev);
 childIds.forEach(id => newSet.add(id));
 return newSet;
 });
 }
 } else {
 setSelectedTemplates(prev => {
 const newSet = new Set(prev);
 childIds.forEach(id => newSet.add(id));
 return newSet;
 });
 }
 setSelectedFolder(folder.id);
 } else {
 setSelectedTemplates(prev => {
 const newSet = new Set(prev);
 childIds.forEach(id => newSet.delete(id));
 return newSet;
 });
 setSelectedFolder(null);
 }
 };

 // Check if a folder is fully selected
 const isFolderSelected = (folder: GlobalTemplate): boolean => {
 const childIds = getChildTemplateIds(folder);
 if (childIds.length === 0) return false;
 return childIds.every(id => selectedTemplates.has(id));
 };

 // Check if folder selection is disabled (another folder is selected)
 const isFolderDisabled = (folderId: string): boolean => {
 return selectedFolder !== null && selectedFolder !== folderId;
 };

 // Clear selection
 const clearSelection = () => {
 setSelectedTemplates(new Set());
 setSelectedFolder(null);
 };

 // Get selected template details for the dialog
 const getSelectedTemplateDetails = (): { id: string; name: string }[] => {
 return Array.from(selectedTemplates).map(id => {
 // Find the template name from globalTemplates
 for (const folder of globalTemplates) {
 if (folder.children) {
 const child = folder.children.find(c => c.id === id);
 if (child) {
 return { id: child.id, name: child.name };
 }
 }
 }
 return { id, name: id };
 });
 };

 // Render global template item with checkbox.
 // onToggle overrides the default toggleGlobalFolder — pass toggleGlobalWorksheet for the worksheets panel.
 const renderGlobalTemplate = (template: GlobalTemplate, depth = 0, onToggle?: (id: string) => void) => {
 const q = searchQuery.trim().toLowerCase();
 const globalTemplateMatches = (t: GlobalTemplate): boolean => {
 if (t.name.toLowerCase().includes(q)) return true;
 return t.children?.some(globalTemplateMatches) ?? false;
 };
 if (q && !globalTemplateMatches(template)) return null;

 const hasChildren = template.children && template.children.length > 0;
 const isSelected = selectedGlobalTemplate === template.id;
 const isTemplateChecked = selectedTemplates.has(template.id);
 const isFolderChecked = template.type === "folder" && isFolderSelected(template);
 const folderDisabled = template.type === "folder" && isFolderDisabled(template.id);
 const isExpanded = q ? true : template.isExpanded;
 const WORKSHEET_IDS = new Set([
 "global-4-7","global-4-8","global-4-9","global-4-10","global-4-11","global-4-12","global-4-13","global-4-14",
 "global-us-4-1","global-us-4-2","global-us-4-3","global-us-4-4","global-us-4-5","global-us-4-6","global-us-4-7","global-us-4-8",
 "global-2-17","global-2-18",
 ]);
 const isWorksheetItem = template.type === "file" && (WORKSHEET_IDS.has(template.id) || template.id.startsWith("gca-ws-") || template.id.startsWith("gus-ws-"));
 const isReportItem = template.type === "file" && template.id.startsWith("grpt-");
 const isLetterItem = template.type === "file" && template.id.startsWith("glt-");
 
 return (
 <div key={template.id}>
 <div
 className={cn(
 "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
 isSelected && template.type === "file" ? "bg-primary/10 text-primary" : "hover:bg-muted",
 folderDisabled && "opacity-50"
 )}
 style={{ paddingLeft: `${depth * 16 + 8}px` }}
 >
 {/* Checkbox */}
 <Checkbox
 checked={template.type === "folder" ? isFolderChecked : isTemplateChecked}
 disabled={folderDisabled}
 onCheckedChange={(checked) => {
 if (template.type === "folder") {
 handleFolderCheckboxChange(template, !!checked);
 } else {
 handleTemplateCheckboxChange(template.id, !!checked);
 }
 }}
 onClick={(e) => e.stopPropagation()}
 className="h-4 w-4 flex-shrink-0"
 />
 
 {template.type === "folder" ? (
 <>
 <div
 className="flex items-center gap-1 flex-1 min-w-0"
 onClick={() => (onToggle ?? toggleGlobalFolder)(template.id)}
 >
 {hasChildren ? (
 isExpanded
 ? <FolderMinusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 : <FolderPlusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 ) : (
 <FolderSolidIcon className="h-4 w-4 text-primary flex-shrink-0" />
 )}
 <span className="truncate flex-1 font-semibold"><SidebarHighlight text={template.name} query={searchQuery} /></span>
 </div>
 </>
 ) : (
 <div
 className="flex items-center gap-2 flex-1 min-w-0"
 onClick={() => {
 setSelectedGlobalTemplate(template.id);
 // Navigate to builder with global template ID for preview
 navigate("/builder", {
 state: {
 globalTemplateId: template.id,
 timestamp: Date.now()
 }
 });
 }}
 >
 {isReportItem
 ? <ReportIcon className="h-4 w-4 flex-shrink-0 text-[#be185d]" />
 : isLetterItem
 ? <LetterIcon className="h-4 w-4 flex-shrink-0 text-purple-500" />
 : isWorksheetItem
 ? <WorksheetIcon className="h-4 w-4 flex-shrink-0" />
 : <ChecklistIcon className="h-4 w-4 flex-shrink-0" />}
 <span className={cn(
 "truncate flex-1",
 isSelected ? "font-semibold" : ""
 )}>
 <SidebarHighlight text={template.name} query={searchQuery} />
 </span>
 </div>
 )}
 </div>
 {template.type === "folder" && isExpanded && template.children && (
 <div>
 {template.children.map(child => renderGlobalTemplate(child, depth + 1, onToggle))}
 </div>
 )}
 </div>
 );
 };

 // ── Engagement Template Tree Node (for sidebar) ──
 const renderEngTemplateTreeNode = (item: TreeItem, depth: number): React.ReactNode => {
 const q = engTemplateSearchQuery.trim().toLowerCase();
 const engItemMatches = (it: TreeItem): boolean => {
 if (it.label.toLowerCase().includes(q)) return true;
 return it.children?.some(engItemMatches) ?? false;
 };
 if (q && !engItemMatches(item)) return null;

 const isExpanded = q ? true : engTemplateExpandedFolders.has(item.id);

 if (item.type === "folder") {
 const folderChecked = isEngFolderChecked(item);
 const folderIndeterminate = isEngFolderIndeterminate(item);
 return (
 <div key={item.id}>
 <div
 className={cn(
 "flex items-center gap-2 w-full py-1.5 px-2 text-sm hover:bg-primary/10 cursor-pointer select-none rounded-[8px]",
 hasDarkSecondary ? "text-white" : "text-black dark:text-white"
 )}
 style={{ paddingLeft: `${depth * 18 + 8}px` }}
 >
 <Checkbox
 checked={folderIndeterminate ? "indeterminate" : folderChecked}
 onCheckedChange={(checked) => handleEngFolderCheckbox(item, !!checked)}
 onClick={(e) => e.stopPropagation()}
 className="h-4 w-4 flex-shrink-0"
 />
 <div
 className="flex items-center gap-1.5 flex-1 min-w-0 font-semibold"
 onClick={() => toggleEngTemplateFolder(item.id)}
 >
 {isExpanded ? (
 <FolderMinusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 ) : (
 <FolderPlusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 )}
 <span className="flex-1 text-left truncate"><SidebarHighlight text={item.label} query={engTemplateSearchQuery} /></span>
 </div>
 </div>
 {isExpanded && item.children?.map((child) => renderEngTemplateTreeNode(child, depth + 1))}
 </div>
 );
 }

 // File leaf
 const isSelected = engTemplateSelectedId === item.id;
 const isChecked = selectedEngTemplates.has(item.id);
 return (
 <div
 key={item.id}
 className={cn(
 "flex items-center gap-2 w-full py-1.5 px-2 text-sm hover:bg-primary/10 cursor-pointer select-none rounded-[8px] font-medium",
 isSelected
 ? (hasDarkSecondary ? "bg-white/15 text-white" : "bg-primary/10 text-primary ring-1 ring-primary/25")
 : (hasDarkSecondary ? "text-white/80" : "text-black dark:text-white")
 )}
 style={{ paddingLeft: `${depth * 18 + 8}px` }}
 >
 <Checkbox
 checked={isChecked}
 onCheckedChange={(checked) => handleEngTemplateCheckbox(item.id, !!checked)}
 onClick={(e) => e.stopPropagation()}
 className="h-4 w-4 flex-shrink-0"
 />
 <div
 className="flex items-center gap-1.5 flex-1 min-w-0"
 onClick={() => selectEngTemplate(item.id)}
 >
 <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M2.08317 8.00016H4.90148C5.47248 8.00016 5.99448 8.32277 6.24984 8.8335C6.5052 9.34422 7.02719 9.66683 7.5982 9.66683H12.4015C12.9725 9.66683 13.4945 9.34422 13.7498 8.8335C14.0052 8.32277 14.5272 8.00016 15.0982 8.00016H17.9165M7.47197 1.3335H12.5277C13.4251 1.3335 13.8738 1.3335 14.2699 1.47013C14.6202 1.59096 14.9393 1.78816 15.204 2.04745C15.5034 2.34066 15.7041 2.742 16.1054 3.54464L17.9109 7.15558C18.0684 7.47057 18.1471 7.62806 18.2027 7.79312C18.252 7.9397 18.2876 8.09055 18.309 8.24372C18.3332 8.41618 18.3332 8.59227 18.3332 8.94443V10.6668C18.3332 12.067 18.3332 12.767 18.0607 13.3018C17.821 13.7722 17.4386 14.1547 16.9681 14.3943C16.4334 14.6668 15.7333 14.6668 14.3332 14.6668H5.6665C4.26637 14.6668 3.56631 14.6668 3.03153 14.3943C2.56112 14.1547 2.17867 13.7722 1.93899 13.3018C1.6665 12.767 1.6665 12.067 1.6665 10.6668V8.94443C1.6665 8.59227 1.6665 8.41618 1.69065 8.24372C1.71209 8.09055 1.7477 7.9397 1.79702 7.79312C1.85255 7.62806 1.9313 7.47057 2.0888 7.15558L3.89426 3.54464C4.29559 2.74199 4.49626 2.34066 4.79562 2.04745C5.06036 1.78816 5.37943 1.59096 5.72974 1.47013C6.12588 1.3335 6.57458 1.3335 7.47197 1.3335Z" stroke="#5599D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 <span className="flex-1 text-left truncate"><SidebarHighlight text={item.label} query={engTemplateSearchQuery} /></span>
 </div>
 </div>
 );
 };

 // Checklist actions
 const handleDuplicate = (checklist: SavedChecklist) => {
 const newChecklist: SavedChecklist = {
...checklist,
 id: `checklist-${Date.now()}`,
 name: `${checklist.name} (Copy)`
 };
 setSavedChecklists(prev => [...prev, newChecklist]);
 };
 const handleDelete = (checklistId: string) => {
 setSavedChecklists(prev => prev.filter(c => c.id !== checklistId));
 const remaining = savedChecklists.filter(c => c.id !== checklistId);
 writeJsonToLocalStorage("savedChecklists", remaining);
 };
 const handleRenameStart = (checklist: SavedChecklist) => {
 setSelectedChecklist(checklist);
 setRenameValue(checklist.name);
 setRenameDialogOpen(true);
 };
 const handleRenameConfirm = () => {
 if (selectedChecklist && renameValue.trim()) {
 setSavedChecklists(prev => prev.map(c => c.id === selectedChecklist.id ? {
...c,
 name: renameValue.trim()
 } : c));
 setRenameDialogOpen(false);
 setSelectedChecklist(null);
 }
 };
 const handleMoveStart = (checklist: SavedChecklist) => {
 setSelectedChecklist(checklist);
 setSelectedMoveFolder(checklist.folderId);
 setMoveDialogOpen(true);
 };
 const handleMoveConfirm = () => {
 if (selectedChecklist && selectedMoveFolder) {
 const targetFolder = templates.find(t => t.id === selectedMoveFolder);
 if (targetFolder) {
 setSavedChecklists(prev => prev.map(c => c.id === selectedChecklist.id ? {
...c,
 folderId: selectedMoveFolder,
 folderName: targetFolder.name
 } : c));
 }
 setMoveDialogOpen(false);
 setSelectedChecklist(null);
 }
 };

 // Get checklists for a specific folder
 const getChecklistsForFolder = (folderId: string) => {
 return savedChecklists.filter(c => c.folderId === folderId);
 };
 const renderTemplate = (template: Template, depth = 0) => {
 const q = searchQuery.trim().toLowerCase();
 const myTemplateMatches = (t: Template): boolean => {
 if (t.name.toLowerCase().includes(q)) return true;
 if (getChecklistsForFolder(t.id).some(c => c.name.toLowerCase().includes(q))) return true;
 return t.children?.some(myTemplateMatches) ?? false;
 };
 if (q && !myTemplateMatches(template)) return null;

 const folderChecklists = template.type === "folder" ? getChecklistsForFolder(template.id) : [];
 const hasChildren = template.children && template.children.length > 0 || folderChecklists.length > 0;
 return <div key={template.id}>
 <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted transition-colors text-sm ${depth > 0 ? "ml-6" : ""}`} onClick={() => template.type === "folder" && toggleFolder(template.id)}>
 <Checkbox className="h-4 w-4" />
 {template.type === "folder" ? <>
 <span className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
 {hasChildren ? (
 template.isExpanded
 ? <FolderMinusIcon className="h-4 w-4 text-primary" />
 : <FolderPlusIcon className="h-4 w-4 text-primary" />
 ) : (
 <FolderSolidIcon className="h-4 w-4 text-primary" />
 )}
 </span>
 </> : <>
 <span className="w-4 flex-shrink-0" />
 <ChecklistIcon className="h-4 w-4 flex-shrink-0" />
 </>}
 <span className="truncate flex-1 text-foreground font-semibold"><SidebarHighlight text={template.name} query={searchQuery} /></span>
 {folderChecklists.length > 0 && <span className="text-xs text-muted-foreground">{folderChecklists.length}</span>}
 </div>
 {template.type === "folder" && (q ? true : template.isExpanded) && <>
 {/* Render saved checklists */}
 {folderChecklists.filter(c => !q || c.name.toLowerCase().includes(q)).map(checklist => <div key={checklist.id} className="group flex items-center gap-2 py-1.5 px-2 pl-8 rounded-md cursor-pointer hover:bg-muted transition-colors text-sm" onClick={() => {
 // Navigate to builder with saved checklist ID
 navigate("/builder", {
 state: {
 checklistId: checklist.id,
 timestamp: Date.now()
 }
 });
 }}>
 <Checkbox className="h-4 w-4" onClick={e => e.stopPropagation()} />
 <ChecklistIcon className="h-4 w-4 flex-shrink-0" />
 <span className="truncate flex-1 text-foreground font-semibold"><SidebarHighlight text={checklist.name} query={searchQuery} /></span>

 {/* Context Menu */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted-foreground/10 rounded transition-opacity">
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground icon-more" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-48">
 <DropdownMenuItem onClick={e => {
 e.stopPropagation();
 handleDuplicate(checklist);
 }} className="gap-2 cursor-pointer">
 <Copy className="h-4 w-4 text-primary icon-copy" />
 Duplicate
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => {
 e.stopPropagation();
 handleDelete(checklist.id);
 }} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
 <Trash2 className="h-4 w-4 icon-trash" />
 Delete
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={e => {
 e.stopPropagation();
 handleRenameStart(checklist);
 }} className="gap-2 cursor-pointer">
 <Pencil className="h-4 w-4 text-primary icon-edit" />
 Rename
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => {
 e.stopPropagation();
 handleMoveStart(checklist);
 }} className="gap-2 cursor-pointer">
 <FolderInput className="h-4 w-4 text-primary icon-folder" />
 Move to different folder
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>)}
 {/* Render child folders/templates */}
 {template.children?.map(child => renderTemplate(child, depth + 1))}
 </>}
 </div>;
 };
 const [isNavExpanded, setIsNavExpanded] = useState(false);
 const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
 try {
 const stored = localStorage.getItem('sidebar-expanded-sections');
 if (stored) return new Set<string>(JSON.parse(stored));
 } catch {}
 return new Set(["co"]);
 });
 const [allSectionsExpanded, setAllSectionsExpanded] = useState(false);
 const [showSignoffs, setShowSignoffs] = useState(false);
 const [signoffsMode, setSignoffsMode] = useState(false);
 const [isSearchFocused, setIsSearchFocused] = useState(false);
 const [signoffChecks, setSignoffChecks] = useState<Record<string, { p1: boolean; p2: boolean }>>({});
 const allNodeIdsRef = useRef<string[]>([]);
 const [hasDarkSecondary, setHasDarkSecondary] = useState(false);
 const [sectionFillStatus, setSectionFillStatus] = useState<Record<string, boolean>>({});
 const [notesPages, setNotesPages] = useState<Set<string>>(new Set());
 const [nodeDocuments, setNodeDocuments] = useState<Record<string, { id: string; name: string; type?: 'note' }[]>>({});
 const [collapsedNodeDocs, setCollapsedNodeDocs] = useState<Set<string>>(new Set());
 const [addDocModal, setAddDocModal] = useState<{ nodeId: string; nodeCode?: string; nodeLabel: string } | null>(null);
 const [pendingDocFiles, setPendingDocFiles] = useState<{ name: string }[]>([]);
 const [addNoteModal, setAddNoteModal] = useState<{ nodeId: string; nodeCode?: string; nodeLabel: string } | null>(null);
 const [addNoteName, setAddNoteName] = useState('');
 const [hiddenChildren, setHiddenChildren] = useState<Record<string, string[]>>({});

 // Firm switcher state — persisted to localStorage to stay in sync with Settings > Firm Info
 const [firmProfiles, setFirmProfiles] = useState<FirmProfile[]>(() => {
  try {
   const s = localStorage.getItem("firmProfiles");
   if (s) {
    const parsed: FirmProfile[] = JSON.parse(s);
    const isStale = parsed.some(f => f.id === "firm-us-1" && (f.initials === "AS" || f.name === "Ascend LLP"));
    if (isStale) {
     localStorage.setItem("firmProfiles", JSON.stringify(DEFAULT_FIRMS));
     return DEFAULT_FIRMS;
    }
    return parsed;
   }
   return DEFAULT_FIRMS;
  } catch { return DEFAULT_FIRMS; }
 });
 const [activeFirmId, setActiveFirmId] = useState<string>(() => localStorage.getItem("activeFirmId") ?? "firm-ca-1");
 const activeFirm = firmProfiles.find(f => f.id === activeFirmId) ?? firmProfiles[0];

 const [registerFirmOpen, setRegisterFirmOpen] = useState(false);
 const [newFirmStep, setNewFirmStep] = useState<1 | 2 | 3>(1);
 const [newFirmData, setNewFirmData] = useState({
  name: "",
  region: "ca" as "ca" | "us",
  city: "",
  firmGroupChoice: "existing" as "existing" | "new",
  newGroupName: "",
  isMainOffice: false,
 });

 const [firmPopoverOpen, setFirmPopoverOpen] = useState(false);
 const [switchingFirm, setSwitchingFirm] = useState<{ name: string; region: "ca" | "us" } | null>(null);
 const firmCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const openFirmPopover = () => { if (firmCloseTimer.current) clearTimeout(firmCloseTimer.current); setFirmPopoverOpen(true); };
 const scheduleFirmClose = () => { firmCloseTimer.current = setTimeout(() => setFirmPopoverOpen(false), 180); };

 // Sync with SettingsPanel when firm data changes there
 useEffect(() => {
  const handler = () => {
   try {
    const s = localStorage.getItem("firmProfiles");
    if (s) setFirmProfiles(JSON.parse(s));
    const id = localStorage.getItem("activeFirmId");
    if (id) setActiveFirmId(id);
   } catch {}
  };
  window.addEventListener("firm-profiles-updated", handler);
  return () => window.removeEventListener("firm-profiles-updated", handler);
 }, []);

 // Persist expanded sections across route changes
 useEffect(() => {
 try {
 localStorage.setItem('sidebar-expanded-sections', JSON.stringify([...expandedSections]));
 } catch {}
 }, [expandedSections]);

 // Auto-expand aud-wp-* nodes that have mapped procedure worksheet children
 useEffect(() => {
  const nodesWithChildren = Object.keys(wpProcMap).filter(id => (wpProcMap[id]?.length ?? 0) > 0);
  if (nodesWithChildren.length === 0) return;
  setExpandedSections(prev => {
   const next = new Set(prev);
   for (const id of nodesWithChildren) next.add(id);
   return next;
  });
 }, [wpProcMap]);

 // Load hidden-children state per engagement
 useEffect(() => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) { setHiddenChildren({}); return; }
 const engMetaRaw = localStorage.getItem(`engagement-meta-${engId}`);
 const engMeta = engMetaRaw ? (() => { try { return JSON.parse(engMetaRaw); } catch { return null; } })() : null;
 const sidebarType = engMeta?.templateId && TEMPLATE_CONFIG[engMeta.templateId]
  ? TEMPLATE_CONFIG[engMeta.templateId].sidebarType
  : engId.includes('-US-') ? 'audit-us' : engId.startsWith('AUD-') ? 'audit-ca' : 'review-comp';
 const defaultHidden = sidebarType === 'audit-ca' ? DEFAULT_CA_SO_HIDDEN : {};
 setHiddenChildren(readJsonFromLocalStorage<Record<string, string[]>>(`sidebar-hidden-${engId}`, defaultHidden));
 }, [location.pathname.split("/engagements/")[1]?.split("/")[0]]);

 // Load notes index for the current engagement
 useEffect(() => {
 const readNotesIndex = () => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) return;
 try {
 const raw = localStorage.getItem(`engagement-notes-index-${engId}`);
 const arr: string[] = raw ? JSON.parse(raw) : [];
 setNotesPages(new Set(arr));
 } catch { setNotesPages(new Set()); }
 };
 readNotesIndex();
 window.addEventListener('storage', readNotesIndex);
 window.addEventListener('page-notes-updated', readNotesIndex);
 return () => {
 window.removeEventListener('storage', readNotesIndex);
 window.removeEventListener('page-notes-updated', readNotesIndex);
 };
 }, [location.pathname]);

 // Load attached documents per node for the current engagement
 useEffect(() => {
 const load = () => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) return;
 try {
 const raw = localStorage.getItem(`engagement-node-docs-${engId}`);
 const defaultDocs = {
 'aud-pl-sec': [{ id: 'note-aud-pl-sec-default', name: 'PL-1-Planning Notes', type: 'note' as const }],
 'aud-us-pl-sec': [{ id: 'note-aud-us-pl-sec-default', name: 'PL-1-Planning Notes', type: 'note' as const }],
 };
 setNodeDocuments(raw ? JSON.parse(raw) : defaultDocs);
 } catch { setNodeDocuments({}); }
 };
 load();
 window.addEventListener('storage', load);
 window.addEventListener('node-docs-updated', load);
 return () => {
 window.removeEventListener('storage', load);
 window.removeEventListener('node-docs-updated', load);
 };
 }, [location.pathname]);

 const saveNodeDocs = (docs: Record<string, { id: string; name: string; type?: 'note' }[]>) => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) return;
 localStorage.setItem(`engagement-node-docs-${engId}`, JSON.stringify(docs));
 setNodeDocuments(docs);
 window.dispatchEvent(new CustomEvent('node-docs-updated'));
 };

 const handleAddNote = () => {
 if (!addNoteModal) return;
 const noteName = addNoteName.trim() || 'Notes';
 const existingItems = nodeDocuments[addNoteModal.nodeId] ?? [];
 const existingNoteCount = existingItems.filter(d => d.type === 'note').length;
 const prefix = `${addNoteModal.nodeCode ?? 'N'}-${existingNoteCount + 1}-`;
 const fullName = prefix + noteName;
 const newNote = { id: `note-${addNoteModal.nodeId}-${Date.now()}`, name: fullName, type: 'note' as const };
 saveNodeDocs({...nodeDocuments, [addNoteModal.nodeId]: [newNote,...existingItems] });
 setAddNoteModal(null);
 setAddNoteName('');
 };

 const handleAddDocs = () => {
 if (!addDocModal || pendingDocFiles.length === 0) return;
 const existing = nodeDocuments[addDocModal.nodeId] ?? [];
 const code = addDocModal.nodeCode ?? 'DOC';
 const newDocs = pendingDocFiles.map((f, i) => ({
 id: `${addDocModal.nodeId}-${Date.now()}-${i}`,
 name: `${code}-${existing.length + i + 1}-${f.name}`,
 }));
 saveNodeDocs({...nodeDocuments, [addDocModal.nodeId]: [...existing,...newDocs] });
 setAddDocModal(null);
 setPendingDocFiles([]);
 };

 const [customSections, setCustomSections] = useState<CustomSection[]>([]);
 const [addSectionModal, setAddSectionModal] = useState<{ open: boolean; parentNodeId: string } | null>(null);
 const [addSectionName, setAddSectionName] = useState('');
 const [addSectionCategory, setAddSectionCategory] = useState<'checklist' | 'letter'>('checklist');
 const [addFolderModal, setAddFolderModal] = useState<{ parentNodeId: string } | null>(null);
 const [addFolderName, setAddFolderName] = useState('');

 useEffect(() => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) { setCustomSections([]); return; }
 const read = () => setCustomSections(readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engId}`, []));
 read();
 window.addEventListener('custom-sections-updated', read);
 window.addEventListener('storage', read);
 return () => { window.removeEventListener('custom-sections-updated', read); window.removeEventListener('storage', read); };
 }, [location.pathname]);

 const handleAddSection = () => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId || !addSectionModal || !addSectionName.trim()) return;
 const id = `custom-${Date.now()}`;
 const newSection: CustomSection = { id, name: addSectionName.trim(), category: addSectionCategory, parentId: addSectionModal.parentNodeId, engId, createdAt: new Date().toISOString() };
 const existing = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engId}`, []);
 writeJsonToLocalStorage(`engagement-custom-sections-${engId}`, [...existing, newSection]);
 window.dispatchEvent(new CustomEvent('custom-sections-updated'));
 setAddSectionModal(null);
 setAddSectionName('');
 navigate(`/engagements/${engId}/checklist/${id}`);
 };

 const handleAddFolder = () => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId || !addFolderModal || !addFolderName.trim()) return;
 const id = `custom-${Date.now()}`;
 const newSection: CustomSection = { id, name: addFolderName.trim(), category: 'folder', parentId: addFolderModal.parentNodeId, engId, createdAt: new Date().toISOString() };
 const existing = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engId}`, []);
 writeJsonToLocalStorage(`engagement-custom-sections-${engId}`, [...existing, newSection]);
 window.dispatchEvent(new CustomEvent('custom-sections-updated'));
 setAddFolderModal(null);
 setAddFolderName('');
 };

 // Listen for Luka fill status changes in localStorage
 useEffect(() => {
 const readFillStatuses = () => {
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (!engId) return;
 const next: Record<string, boolean> = {};
 ['CO', 'PL', 'RA', 'RP', 'SO'].forEach(code => {
 next[code] = !!localStorage.getItem(`luka-fill-status-${engId}-${code}`);
 });
 setSectionFillStatus(next);
 };
 readFillStatuses();
 window.addEventListener('storage', readFillStatuses);
 window.addEventListener('luka-fill-status-updated', readFillStatuses);
 return () => {
 window.removeEventListener('storage', readFillStatuses);
 window.removeEventListener('luka-fill-status-updated', readFillStatuses);
 };
 }, [location.pathname]);

 const toggleAllSignoffs = (pid: "p1" | "p2") => {
 const ids = allNodeIdsRef.current;
 if (ids.length === 0) return;
 const allChecked = ids.every(id => !!signoffChecks[id]?.[pid]);
 setSignoffChecks(prev => {
 const next = {...prev };
 ids.forEach(id => {
 const cur = next[id] ?? { p1: false, p2: false };
 next[id] = {...cur, [pid]: !allChecked };
 });
 return next;
 });
 };

 const isAllSignoffsChecked = (pid: "p1" | "p2") => {
 const ids = allNodeIdsRef.current;
 return ids.length > 0 && ids.every(id => !!signoffChecks[id]?.[pid]);
 };

 // All parent IDs in the engagement tree (used to expand all)
 const allParentIds = [
 "co", "do", "pr", "pr-assets", "pr-ca", "pr-ppe",
 "pr-liab", "pr-cl", "pr-ltl", "pr-equity", "pr-sc",
 "pr-rev", "pr-rev-sub", "pr-exp", "pr-opex",
 "fs", "fs-docs", "so"
 ];

 const enterSignoffsMode = () => {
 setSignoffsMode(true);
 setExpandedSections(new Set(allParentIds));
 setAllSectionsExpanded(true);
 };
 const exitSignoffsMode = () => setSignoffsMode(false);


 useEffect(() => {
 const checkGradient = () => {
 const val = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-secondary-gradient').trim();
 setHasDarkSecondary(!!val && val !== 'none');
 };
 checkGradient();
 const observer = new MutationObserver(checkGradient);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
 return () => observer.disconnect();
 }, []);

 // Portal target for secondary panels (rendered below the global header in Layout)
 const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
 useEffect(() => {
 const el = document.getElementById('sidebar-secondary-portal');
 setPortalTarget(el);
 }, []);

 // Preserve sidebar scroll position across navigations.
 // The scroll div lives inside a createPortal that only renders when portalTarget is set,
 // so we depend on both location.pathname AND portalTarget. This way, when portalTarget
 // transitions null → element (after a fresh Sidebar mount), this effect re-runs with a
 // valid ref and can restore the saved position before the browser paints.
 const sidebarScrollRef = useRef<HTMLDivElement>(null);

 useLayoutEffect(() => {
 const el = sidebarScrollRef.current;
 if (el) el.scrollTop = getScroll();
 return () => {
 const el2 = sidebarScrollRef.current;
 if (el2 && el2.scrollTop > 0) setScroll(el2.scrollTop);
 };
 }, [location.pathname, portalTarget]);

 // Real-time save via scroll event; re-attaches when portal div appears
 useEffect(() => {
 const el = sidebarScrollRef.current;
 if (!el) return;
 const saveScroll = () => { setScroll(el.scrollTop); };
 el.addEventListener('scroll', saveScroll, { passive: true });
 return () => { el.removeEventListener('scroll', saveScroll); };
 }, [location.pathname, portalTarget]);
 
 // Determine if a secondary panel is visible and expanded (for dark mode gradient)
 const isOnEngagementDetail = location.pathname.startsWith("/engagements/") && location.pathname !== "/engagements/create";
 const isOnTemplatesPage = location.pathname !== "/dashboard" && location.pathname !== "/clients" && location.pathname !== "/engagements" && location.pathname !== "/teams" && location.pathname !== "/design-system" && !location.pathname.startsWith("/engagements/");
 const hasSecondaryPanelExpanded = (isOnEngagementDetail || isOnTemplatesPage) && !isTemplatesPanelCollapsed;
 
 return <div className={`flex h-screen relative group/sidebar`} style={{ background: 'transparent' }}>
 {/* Icon sidebar - dark navy with curved corner, expands on click only */}
 <div className={`sidebar-nav bg-transparent relative flex flex-col py-4 gap-2 transition-all duration-300 ease-in-out ${isNavExpanded ? "w-56 items-start px-3" : "w-14 items-center group/sidebar-collapsed"}`}>
 {/* Luka Logo / Sidebar toggle */}
 <div className={`h-10 mb-4 flex items-center ${isNavExpanded ? "px-2 w-full justify-between" : "justify-center w-full cursor-pointer"}`} onClick={() => !isNavExpanded && setIsNavExpanded(true)} title={!isNavExpanded ? "Expand sidebar" : undefined}>
 {isNavExpanded ? (
 <>
 <svg width="140" height="19" viewBox="0 0 234 32" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M7.53909 28.2869C3.03402 25.659 0 20.7708 0 15.1701C0 6.79591 6.79591 0 15.1778 0C23.5597 0 30.3556 6.79591 30.3556 15.1778C30.3556 17.9743 29.5434 20.4184 28.218 22.6709L24.2645 20.3801C25.1456 18.8477 25.6436 17.0702 25.6436 15.1778C25.6436 9.40088 20.9547 4.71193 15.1778 4.71193C9.40088 4.71193 4.71193 9.40088 4.71193 15.1778C4.71193 19.0086 6.77292 22.3644 9.84525 24.1879L7.53909 28.2946V28.2869Z" fill="white" />
 <path d="M34.3629 2.82739C38.8679 5.45535 41.9019 10.3435 41.9019 15.9442C41.9019 24.3261 35.106 31.122 26.7242 31.122C18.3423 31.122 11.5464 24.3261 11.5464 15.9442C11.5464 13.1477 12.3585 10.7036 13.684 8.45106L17.6374 10.7419C16.7563 12.2742 16.2583 14.0517 16.2583 15.9442C16.2583 21.7211 20.9473 26.41 26.7242 26.41C32.5011 26.41 37.19 21.7211 37.19 15.9442C37.19 12.1133 35.129 8.75753 32.0567 6.93405L34.3629 2.82739Z" fill="white" />
 <path d="M65.7268 17.9589L70.7146 21.2611C68.9677 23.7281 66.0486 25.2835 62.6162 25.2835C56.9848 25.2835 52.7173 21.1002 52.7173 15.5455C52.7173 9.99076 56.9848 5.83813 62.6162 5.83813C66.0486 5.83813 68.9754 7.39346 70.7146 9.83753L65.7268 13.1397C65.0296 12.228 63.9263 11.6917 62.6162 11.6917C60.3866 11.6917 58.7547 13.3006 58.7547 15.5531C58.7547 17.8057 60.3943 19.4146 62.6162 19.4146C63.934 19.4146 65.0296 18.8783 65.7268 17.9666V17.9589Z" fill="white" />
 <path d="M93.0561 15.5455C93.0561 21.1002 88.7885 25.2835 83.1572 25.2835C77.5259 25.2835 73.2583 21.1002 73.2583 15.5455C73.2583 9.99076 77.5259 5.83813 83.1572 5.83813C88.7885 5.83813 93.0561 10.0214 93.0561 15.5455ZM87.0187 15.5455C87.0187 13.2929 85.3791 11.684 83.1572 11.684C80.9353 11.684 79.2957 13.2929 79.2957 15.5455C79.2957 17.798 80.9353 19.407 83.1572 19.407C85.3791 19.407 87.0187 17.8287 87.0187 15.5455Z" fill="white" />
 <path d="M114.853 6.15991V17.346C114.853 22.9237 111.39 25.2835 106.295 25.2835C101.2 25.2835 97.7373 22.9237 97.7373 17.346V6.15991H103.744V16.7024C103.744 18.4492 104.656 19.4146 106.295 19.4146C107.935 19.4146 108.816 18.4492 108.816 16.7024V6.15991H114.853Z" fill="white" />
 <path d="M137.593 6.15991V24.931H132.146L126.246 15.4382V24.931H120.209V6.15991H125.656L131.556 15.6527V6.15991H137.593Z" fill="white" />
 <path d="M156.954 11.684H152.556V24.931H146.518V11.684H142.144V6.15991H156.946V11.684H156.954Z" fill="white" />
 <path d="M171.435 22.0349H166.125L165.32 24.931H158.831L165.106 6.15991H172.454L178.728 24.931H172.239L171.435 22.0349ZM170.278 17.8516L168.776 12.4042L167.274 17.8516H170.278Z" fill="white" />
 <path d="M198.625 19.384C198.625 23.2225 196.021 24.9387 190.849 24.9387H182.75V6.15991H190.129C195.308 6.15991 197.936 7.6616 197.936 11.2319C197.936 13.1091 197.047 14.3196 195.599 15.0398V15.0934C197.476 15.8443 198.633 17.2157 198.633 19.384H198.625ZM188.78 10.5041V13.3772H189.884C191.14 13.3772 191.814 12.9175 191.814 11.9292C191.814 10.9408 191.14 10.5041 189.884 10.5041H188.78ZM192.534 18.9013C192.534 17.9129 191.837 17.4532 190.604 17.4532H188.78V20.38H190.604C191.837 20.38 192.534 19.8973 192.534 18.9013Z" fill="white" />
 <path d="M216.218 19.4069V24.931H203.185V6.15991H209.222V19.4069H216.225H216.218Z" fill="white" />
 <path d="M234 19.8896V24.931H220.776V6.15991H233.755V11.2013H226.806V13.2929H232.897V17.6371H226.806V19.8896H233.992H234Z" fill="white" />
 </svg>
 <button
 onClick={(e) => { e.stopPropagation(); setIsNavExpanded(false); }}
 aria-label="Collapse sidebar"
 className="w-7 h-7 rounded-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0" aria-hidden="true">
 <path fill="currentColor" d="M20.25 7c0-.69-.56-1.25-1.25-1.25H9.75v12.5H19c.69 0 1.25-.56 1.25-1.25zM3.75 17c0 .69.56 1.25 1.25 1.25h3.25V5.75H5c-.69 0-1.25.56-1.25 1.25zm18 0A2.75 2.75 0 0 1 19 19.75H5A2.75 2.75 0 0 1 2.25 17V7A2.75 2.75 0 0 1 5 4.25h14A2.75 2.75 0 0 1 21.75 7z"></path>
 </svg>
 </button>
 </>
 ) : (
 <div className="relative w-10 h-10 flex items-center justify-center">
 <img src={lukaLogo} alt="Countable" className="w-7 h-7 object-contain transition-opacity duration-200 group-hover/sidebar-collapsed:opacity-0" />
 <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20" className="absolute shrink-0 text-white opacity-0 group-hover/sidebar-collapsed:opacity-100 transition-opacity duration-200" aria-hidden="true">
 <path fill="currentColor" d="M20.25 7c0-.69-.56-1.25-1.25-1.25H9.75v12.5H19c.69 0 1.25-.56 1.25-1.25zM3.75 17c0 .69.56 1.25 1.25 1.25h3.25V5.75H5c-.69 0-1.25.56-1.25 1.25zm18 0A2.75 2.75 0 0 1 19 19.75H5A2.75 2.75 0 0 1 2.25 17V7A2.75 2.75 0 0 1 5 4.25h14A2.75 2.75 0 0 1 21.75 7z"></path>
 </svg>
 </div>
 )}
 </div>

 {/* Nav items */}
 {navItems.map((item, index) => {
 const isTemplatesItem = item.label === "Templates";
 const isActive = isTemplatesItem
 ? (location.pathname === "/engagement-templates" || location.pathname === "/create" || location.pathname.startsWith("/financial-statement-templates"))
 : (item.route ? location.pathname === item.route : false);
 return <div key={index} className={`sidebar-item ${isActive ? "active" : ""} ${isNavExpanded ? "w-full justify-start gap-3 px-3" : ""} ${item.route ? "cursor-pointer" : ""}`} title={!isNavExpanded ? item.label : undefined} onClick={() => {
 if (isTemplatesItem) {
 handleDropdownSelect("engagements");
 } else {
 item.route && navigate(item.route);
 }
 }}>
 <item.icon />
 {isNavExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
 </div>;
 })}

 {/* Spacer */}
 <div className="flex-1" />




 {/* Support */}
 <Tooltip>
 <TooltipTrigger asChild>
 <div className={`sidebar-item cursor-pointer ${isNavExpanded ? "w-full justify-start gap-3 px-3" : ""}`}>
 <Headphones className="h-5 w-5 icon-bounce" />
 {isNavExpanded && <span className="text-sm font-medium">Support</span>}
 </div>
 </TooltipTrigger>
 {!isNavExpanded && <TooltipContent side="right">Support</TooltipContent>}
 </Tooltip>

 {/* Firm badge — icon-only, always at bottom */}
 <div className={cn("pb-3 pt-1", isNavExpanded ? "px-2" : "flex justify-center")}>
  <Popover open={firmPopoverOpen} onOpenChange={setFirmPopoverOpen}>
   <PopoverTrigger asChild>
    <button
     onMouseEnter={openFirmPopover}
     onMouseLeave={scheduleFirmClose}
     onClick={() => setFirmPopoverOpen(v => !v)}
     className={cn(
      "relative w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/30",
      activeFirm.color
     )}
     title={activeFirm.name}
    >
     {activeFirm.initials}
     <span className="absolute -bottom-2 -right-2 text-[12px] leading-none pointer-events-none">
      {activeFirm.region === "ca" ? "🇨🇦" : "🇺🇸"}
     </span>
    </button>
   </PopoverTrigger>
   <PopoverContent
    side="right"
    align="end"
    sideOffset={8}
    className="w-64 p-2"
    onMouseEnter={openFirmPopover}
    onMouseLeave={scheduleFirmClose}
   >
    {(() => {
     const groups = new Map<string, FirmProfile[]>();
     firmProfiles.forEach(f => {
      const gid = (f as any).firmGroupId ?? "default";
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(f);
     });
     const groupCount = groups.size;
     return (
      <>
       <div className="px-2 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Your Offices</p>
        {firmProfiles.length > 1 && (
         <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          {groupCount} group{groupCount !== 1 ? "s" : ""} · {firmProfiles.length} offices
         </p>
        )}
       </div>
       {Array.from(groups.entries()).map(([gid, firms]) => {
        const groupName = (firms[0] as any).firmGroupName ?? firms[0].name;
        return (
         <div key={gid}>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{groupName}</p>
          {firms.map(firm => (
           <button
            key={firm.id}
            onClick={() => {
             if (firm.id === activeFirmId) return;
             setSwitchingFirm({ name: firm.name, region: firm.region });
             setTimeout(() => {
              setActiveFirmId(firm.id);
              localStorage.setItem("activeFirmId", firm.id);
              localStorage.setItem("firmProfiles", JSON.stringify(firmProfiles));
              window.dispatchEvent(new CustomEvent("firmSwitched"));
              setSwitchingFirm(null);
             }, 900);
            }}
            className={cn(
             "w-full flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-left",
             activeFirmId === firm.id && "bg-primary/10"
            )}
           >
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0", firm.color)}>
             {firm.initials}
            </div>
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-foreground truncate">
              {firm.region === "ca" ? "🇨🇦" : "🇺🇸"} {firm.city}
             </p>
            </div>
            {(firm as any).isMainOffice && (
             <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-primary/10 text-primary">Main</span>
            )}
            {activeFirmId === firm.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
           </button>
          ))}
         </div>
        );
       })}
      </>
     );
    })()}
    <div className="border-t border-border my-1" />
    <button
     className="w-full flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-primary text-left"
     onClick={() => {
      setFirmPopoverOpen(false);
      window.dispatchEvent(new CustomEvent("open-settings-firm-info", { detail: { showAddOffice: true } }));
     }}
    >
     <Plus className="h-4 w-4" />
     <span className="text-sm font-medium">Add Office</span>
    </button>
   </PopoverContent>
  </Popover>
 </div>

 </div>

 {/* Engagement Sections panel - portalled below the global header */}
 {portalTarget && location.pathname.startsWith("/engagements/") && location.pathname !== "/engagements/create" && location.pathname !== "/engagements/create-new" && createPortal(<>
 <div 
 ref={panelRef}
 style={{ width: isTemplatesPanelCollapsed ? 0 : (signoffsMode ? Math.max(panelWidth, 440) : panelWidth) }}
 className={cn(
 `flex flex-col relative z-40 transition-all group/templates sidebar-secondary-panel ${hasDarkSecondary ? 'sidebar-dark-theme' : ''}`,
 isTemplatesPanelCollapsed
 ? "overflow-hidden shadow-none bg-transparent"
 : "shadow-md bg-white dark:bg-card border border-border/50 rounded-xl mb-1 mr-1",
 isResizing && "transition-none"
 )}
 >
 {signoffsMode && !isTemplatesPanelCollapsed && (
 <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-border/60 z-10" style={{ right: "104px" }} />
 )}
 <div className={`p-3 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 <div className="flex gap-2 items-start">
 <div className={cn("relative transition-all duration-300 ease-in-out", isSearchFocused ? "flex-1" : "flex-1")}>
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground icon-search" />
 <Input
 placeholder="Search"
 className="pl-9 h-9 text-sm"
 value={engSidebarSearchQuery}
 onChange={e => setEngSidebarSearchQuery(e.target.value)}
 onFocus={() => setIsSearchFocused(true)}
 onBlur={() => setIsSearchFocused(false)}
 />
 </div>
 <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0"
 onClick={() => {
 // All parent node IDs that have children
 const allParentIds = [
 "co", "do", "pr", "pr-assets", "pr-ca", "pr-ppe",
 "pr-liab", "pr-cl", "pr-ltl", "pr-equity", "pr-sc",
 "pr-rev", "pr-rev-sub", "pr-exp", "pr-opex",
 "fs", "fs-docs", "so"
 ];
 if (allSectionsExpanded) {
 setExpandedSections(new Set());
 } else {
 setExpandedSections(new Set(allParentIds));
 }
 setAllSectionsExpanded(!allSectionsExpanded);
 }}
 >
 <svg className="text-foreground" width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
 {allSectionsExpanded ? (
 <path d="M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583V10.4163M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967" stroke="currentColor" strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
 ) : (
 <path d="M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583L2.08325 10.4163" stroke="currentColor" strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
 )}
 </svg>
 </Button>
 <Button
 size="sm"
 variant="secondary"
 onClick={() => (signoffsMode ? exitSignoffsMode() : enterSignoffsMode())}
 aria-label={signoffsMode ? "Close Signoffs" : "Open Signoffs"}
 title="Signoffs"
 className={cn(
 "h-9 shrink-0 gap-1 transition-all duration-300 ease-in-out overflow-hidden",
 isSearchFocused ? "w-9 px-0 justify-center" : "px-2",
 signoffsMode ? "bg-secondary-button-active border-secondary-button-border-active" : ""
 )}
 >
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 <circle cx="12" cy="12" r="10" />
 <path d="M9 12l2 2 4-4" />
 </svg>
 <span
 className={cn(
 "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden",
 isSearchFocused ? "max-w-0 opacity-0 ml-0" : "max-w-[80px] opacity-100"
 )}
 >
 Signoffs
 </span>
 </Button>
 {/* Signoffs preparer chips - inline beside the Signoffs button when active */}
 {signoffsMode && (
 <div className="flex items-start gap-2 pl-3 ml-auto">
 {[
 { id: "p1", initials: "CA", label: "Preparer", color: "bg-purple-500" },
 { id: "p2", initials: "JD", label: "Reviewer", color: "bg-sky-500" },
 ].map(p => (
 <div key={p.id} className="w-9 flex flex-col items-center gap-1">
 <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white", p.color)}>
 {p.initials}
 </div>
 <span className="text-[9px] text-muted-foreground leading-tight whitespace-nowrap">{p.label}</span>
 <button
 type="button"
 onClick={() => toggleAllSignoffs(p.id as "p1" | "p2")}
 aria-label={isAllSignoffsChecked(p.id as "p1" | "p2") ? `Uncheck all ${p.label} signoffs` : `Check all ${p.label} signoffs`}
 className="h-6 w-6 rounded-md flex items-center justify-center hover:opacity-80 transition-opacity"
 >
 <img
 src={isAllSignoffsChecked(p.id as "p1" | "p2") ? signoffUncheckAllIcon : signoffCheckAllIcon}
 alt=""
 className="h-6 w-6"
 />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 <div ref={sidebarScrollRef} className={`flex-1 overflow-y-auto scrollbar-hide p-2 pt-0 ${signoffsMode ? "pr-3" : ""} ${isTemplatesPanelCollapsed ? "hidden" : ""}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
 {/* Engagement Sections - recursive tree */}
 {(() => {
 type SectionNode = {
 id: string;
 code?: string;
 label: string;
 icon?: "checklist" | "letter" | "folder" | "doc" | "completion" | "book" | "worksheet";
 hasPlus?: boolean;
 route?: string;
 children?: SectionNode[];
 };

 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 const engMeta = (() => { try { const r = engId ? localStorage.getItem(`engagement-meta-${engId}`) : null; return r ? JSON.parse(r) : null; } catch { return null; } })();
 const sidebarType = engMeta?.templateId && TEMPLATE_CONFIG[engMeta.templateId]
 ? TEMPLATE_CONFIG[engMeta.templateId].sidebarType
 : engId?.includes('-US-') ? 'audit-us' : engId?.startsWith('AUD-') ? 'audit-ca' : 'review-comp';
 const isUSAuditEngagement = sidebarType === 'audit-us';
 const isAuditEngagement = sidebarType === 'audit-ca' || sidebarType === 'audit-us';
 const engFirstYear = engMeta?.firstYearAudit === true;

 // Find a node by ID within a GlobalTemplate tree (used for building procedure children)
 const findInGlobalTemplates = (nodes: GlobalTemplate[], id: string): GlobalTemplate | null => {
  for (const node of nodes) {
   if (node.id === id) return node;
   if (node.children) { const f = findInGlobalTemplates(node.children, id); if (f) return f; }
  }
  return null;
 };

 // Build sidebar child nodes for an aud-wp-* node from its mapped gca-ws-proc-* items
 const buildWpChildren = (audWpId: string, map: Record<string, string[]>): SectionNode[] => {
  const gcaIds = map[audWpId] ?? [];
  const lsCode = audWpId.replace("aud-wp-", "").toUpperCase();
  const seen = new Set<string>();
  const result: SectionNode[] = [];
  for (const gcaId of gcaIds) {
   const node = findInGlobalTemplates(initialGlobalWorksheets, gcaId);
   if (!node) continue;
   if (node.type === "folder" && node.children) {
    for (const child of node.children) {
     if (!seen.has(child.id)) {
      seen.add(child.id);
      const seq = result.length + 1;
      result.push({ id: child.id, code: `${lsCode}-${seq}`, label: child.name, icon: "worksheet", route: `gca-proc/${child.id}` });
     }
    }
   } else if (!seen.has(node.id)) {
    seen.add(node.id);
    const seq = result.length + 1;
    result.push({ id: node.id, code: `${lsCode}-${seq}`, label: node.name, icon: "worksheet", route: `gca-proc/${node.id}` });
   }
  }
  return result;
 };

 // Filter aud-wp-* leaf nodes to only those planned in the 590 worksheet; attach their procedure children
 const filterProcTree = (nodes: SectionNode[], activeIds: string[], procMap: Record<string, string[]>): SectionNode[] =>
  nodes.reduce<SectionNode[]>((acc, node) => {
   if (node.id.startsWith("aud-wp-")) {
    // Always show all lead-sheet nodes; only inject procedure children for active ones
    if (activeIds.includes(node.id)) {
     const children = buildWpChildren(node.id, procMap);
     acc.push(children.length > 0 ? { ...node, children } : node);
    } else {
     acc.push(node);
    }
   } else if (node.children) {
    const kids = filterProcTree(node.children, activeIds, procMap);
    if (kids.length > 0) acc.push({ ...node, children: kids });
   } else {
    acc.push(node);
   }
   return acc;
  }, []);

 const usAuditEngagementTree: SectionNode[] = [
 {
 id: "aud-us-co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
...(engFirstYear ? [{ id: "aud-us-form-408", code: "408", label: "Initial Audit Engagements", icon: "checklist" as const, route: "checklist/aud-us-form-408" }] : []),
 { id: "aud-us-form-410", code: "410", label: engFirstYear ? "New Engagement — Acceptance/Continuance" : "Existing Engagement — Acceptance/Continuance", icon: "checklist", route: "checklist/aud-us-form-410" },
 { id: "aud-us-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/aud-us-el" },
 ]
 },
 {
 id: "aud-us-pl-sec", code: "PL", label: "Planning", icon: "folder",
 children: [
 { id: "aud-us-mat", code: "420", label: "Materiality", icon: "worksheet", route: "checklist/aud-us-mat" },
 { id: "aud-us-sae", code: "428", label: "Auditor's Expert", icon: "worksheet", route: "checklist/aud-us-sae" },
 { id: "aud-us-asm", code: "430", label: "Overall Audit Strategy", icon: "worksheet", route: "checklist/aud-us-asm" },
 { id: "aud-us-plan", code: "436", label: "Team Planning Discussions", icon: "worksheet", route: "checklist/aud-us-plan" },
 { id: "aud-us-tt", code: "450", label: "Time Tracker", icon: "worksheet", route: "checklist/aud-us-tt" },
 ]
 },
 {
 id: "aud-us-ra-sec", code: "RA", label: "Risk Assessment", icon: "folder",
 children: [
 { id: "aud-us-ra-rap", code: "RAP", label: "Risk Assessment Procedures", icon: "checklist", route: "checklist/aud-us-ra-rap" },
 { id: "aud-us-ra-ic", code: "IC", label: "Understanding Internal Controls", icon: "checklist", route: "checklist/aud-us-ra-ic" },
 { id: "aud-us-ra-itgc", code: "ITGC", label: "IT General Controls (ITGC)", icon: "checklist", route: "checklist/aud-us-ra-itgc" },
 { id: "aud-us-ra-fraud", code: "FRA", label: "Fraud Risk Assessment (AU-C 240)", icon: "checklist", route: "checklist/aud-us-ra-fraud" },
 { id: "aud-us-ra-srr", code: "SRR", label: "Significant Risks Register", icon: "checklist", route: "checklist/aud-us-ra-srr" },
 { id: "aud-us-ra-rmm", code: "RMM", label: "Risk of Material Misstatement (RMM)", icon: "checklist", route: "checklist/aud-us-ra-rmm" },
 { id: "aud-us-ra-scot-rev", code: "S1", label: "SCOT — Revenue Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-rev" },
 { id: "aud-us-ra-scot-exp", code: "S2", label: "SCOT — Expenditure Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-exp" },
 { id: "aud-us-ra-scot-pay", code: "S3", label: "SCOT — Payroll Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-pay" },
 { id: "aud-us-ra-gc", code: "GC", label: "Going Concern (Initial Assessment)", icon: "checklist", route: "checklist/aud-us-ra-gc" },
 { id: "aud-us-ra-je", code: "JE", label: "Journal Entry Testing Log (AU-C 240)", icon: "checklist", route: "checklist/aud-us-ra-je" },
 ]
 },
 {
 id: "aud-us-rp-sec", code: "RP", label: "Response to Assessed Risks", icon: "folder",
 children: [
 { id: "aud-us-rp-oar", code: "OAR", label: "Overall Audit Response", icon: "checklist", route: "checklist/aud-us-rp-oar" },
 { id: "aud-us-rp-toc", code: "TOC", label: "Test of Controls", icon: "checklist", route: "checklist/aud-us-rp-toc" },
 { id: "aud-us-rp-sap", code: "SAP", label: "Substantive Analytical Procedures", icon: "checklist", route: "checklist/aud-us-rp-sap" },
 { id: "aud-us-rp-tod-rev", code: "TR", label: "Test of Details — Revenue", icon: "checklist", route: "checklist/aud-us-rp-tod-rev" },
 { id: "aud-us-rp-tod-exp", code: "TE", label: "Test of Details — Expenses", icon: "checklist", route: "checklist/aud-us-rp-tod-exp" },
 { id: "aud-us-rp-rpt", code: "RPT", label: "Related Party Transactions (ASC 850 / AU-C 550)", icon: "checklist", route: "checklist/aud-us-rp-rpt" },
 { id: "aud-us-rp-gwi", code: "GWI", label: "Goodwill Impairment Assessment (ASC 350)", icon: "checklist", route: "checklist/aud-us-rp-gwi" },
 { id: "aud-us-rp-aps", code: "APS", label: "Audit Procedures Summary", icon: "checklist", route: "checklist/aud-us-rp-aps" },
 ]
 },
 {
 id: "aud-us-do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "aud-us-do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "aud-us-do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "aud-us-do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "aud-us-do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 { id: "aud-us-do-cma", code: "CMA", label: "Contracts & Material Agreements", icon: "folder" },
 { id: "aud-us-do-cmb", code: "CMB", label: "Corporate Minute Book", icon: "folder" },
 { id: "aud-us-do-rcf", code: "RCF", label: "Regulatory & Compliance Filings", icon: "folder" },
 ]
 },
 {
 id: "aud-us-tb", code: "TB", label: "Trial Balance & Adjusting Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "aud-us-pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "aud-us-pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "aud-us-pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "aud-us-wp-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/aud-us-wp-a" },
 { id: "aud-us-wp-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/aud-us-wp-b" },
 { id: "aud-us-wp-c", code: "C", label: "Inventories", icon: "book", route: "procedure/aud-us-wp-c" },
 { id: "aud-us-wp-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/aud-us-wp-d" },
 { id: "aud-us-wp-e", code: "E", label: "Loans and notes receivable", icon: "book", route: "procedure/aud-us-wp-e" },
 { id: "aud-us-wp-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/aud-us-wp-i" },
 ]
 },
 {
 id: "aud-us-pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "aud-us-wp-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/aud-us-wp-h" },
 ]
 },
 {
 id: "aud-us-pr-lta", label: "Long-term assets", icon: "folder",
 children: [
 { id: "aud-us-wp-k", code: "K", label: "Long-term investments", icon: "book", route: "procedure/aud-us-wp-k" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "aud-us-pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "aud-us-wp-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/aud-us-wp-bb" },
 { id: "aud-us-wp-cc", code: "CC", label: "Taxes payable", icon: "book", route: "procedure/aud-us-wp-cc" },
 { id: "aud-us-wp-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/aud-us-wp-dd" },
 ]
 },
 {
 id: "aud-us-pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "aud-us-wp-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/aud-us-wp-jj" },
 { id: "aud-us-wp-kk", code: "KK", label: "Long-term debt", icon: "book", route: "procedure/aud-us-wp-kk" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "aud-us-pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "aud-us-wp-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/aud-us-wp-tt" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "aud-us-pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "aud-us-wp-20", code: "20", label: "Revenue", icon: "book", route: "procedure/aud-us-wp-20" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-cos", label: "Cost of sales", icon: "folder",
 children: [
 {
 id: "aud-us-pr-cos-sub", label: "Cost of sales", icon: "folder",
 children: [
 { id: "aud-us-wp-30", code: "30", label: "Cost of sales", icon: "book", route: "procedure/aud-us-wp-30" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "aud-us-pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "aud-us-wp-40", code: "40", label: "Expenses", icon: "book", route: "procedure/aud-us-wp-40" },
 ]
 },
 {
 id: "aud-us-pr-oie", label: "Other Income(Expenses)", icon: "folder",
 children: [
 { id: "aud-us-wp-80", code: "80", label: "Other expenses (income)", icon: "book", route: "procedure/aud-us-wp-80" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "aud-us-fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "aud-us-fs-docs", label: "Financial Statement Docs", icon: "folder",
 children: [
 { id: "aud-us-fs-cover", label: "Cover Page", icon: "doc", route: "checklist/aud-us-fs-cover" },
 { id: "aud-us-fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/aud-us-fs-toc" },
 { id: "aud-us-fs-iar", label: "Independent Auditor's Report (AU-C 700)", icon: "checklist", route: "checklist/aud-us-ar" },
 { id: "aud-us-fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/aud-us-fs-bs" },
 { id: "aud-us-fs-is", label: "Statement of Income (Loss) and Retained Earnings (Deficit)", icon: "doc", route: "checklist/aud-us-fs-is" },
 { id: "aud-us-fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/aud-us-fs-cf" },
 { id: "aud-us-fs-eq", label: "Statement of Changes in Equity", icon: "doc", route: "checklist/aud-us-fs-eq" },
 { id: "aud-us-fs-notes", label: "Notes to Financial Statements", icon: "doc", route: "checklist/aud-us-fs-notes" },
 ]
 },
 ]
 },
 {
 id: "aud-us-so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "aud-us-so-aim", code: "AIM", label: "Misstatements", icon: "worksheet", route: "checklist/aud-us-so-aim" },
 { id: "aud-us-so-far", code: "FAR", label: "Final Analytical Review", icon: "checklist", route: "checklist/aud-us-so-far" },
 { id: "aud-us-subseq", code: "SE", label: "Subsequent Events", icon: "checklist", route: "checklist/aud-us-subseq" },
 { id: "aud-us-wgc-final", code: "GC", label: "Going Concern (Final Assessment)", icon: "checklist", route: "checklist/aud-us-wgc-final" },
 { id: "aud-us-so-sd", code: "SD", label: "Notes on Significant Audit Decisions (AU-C 230)", icon: "checklist", route: "checklist/aud-us-so-sd" },
 { id: "aud-us-so-kam", code: "KAM", label: "Key Audit Matters Worksheet (AU-C 701)", icon: "checklist", route: "checklist/aud-us-so-kam" },
 { id: "aud-us-so-find", code: "FND", label: "Audit Findings and Matters for Discussion", icon: "checklist", route: "checklist/aud-us-so-find" },
 { id: "aud-us-so-mc", code: "MC", label: "Matters Communicated to Management and TCWG", icon: "checklist", route: "checklist/aud-us-so-mc" },
 { id: "aud-us-so-fc", code: "FC", label: "Matters for Future Consideration", icon: "checklist", route: "checklist/aud-us-so-fc" },
 { id: "aud-us-so-dc", code: "CON", label: "Documenting Consultation", icon: "checklist", route: "checklist/aud-us-so-dc" },
 { id: "aud-us-mr", code: "MR", label: "Management Representation Letter (AU-C 580)", icon: "letter", route: "checklist/aud-us-mr" },
 { id: "aud-us-sig-def", code: "IC", label: "Internal Control Deficiencies Communication (AU-C 265)", icon: "letter", route: "checklist/aud-us-sig-def" },
 { id: "aud-us-tcwg-fin", code: "TCWG", label: "Communication with Those Charged with Governance (AU-C 260)", icon: "letter", route: "checklist/aud-us-tcwg-fin" },
 { id: "aud-us-comp", code: "CM", label: "Completion Checklist", icon: "completion", route: "checklist/aud-us-comp" },
 { id: "aud-us-disc", code: "DC", label: "Disclosure Checklist", icon: "checklist" },
 { id: "aud-us-ep", code: "QCR", label: "Quality Control Review", icon: "completion", route: "checklist/aud-us-ep" },
 { id: "aud-us-so-wd", code: "WD", label: "Withdrawal Worksheet (AU-C 705)", icon: "checklist", route: "checklist/aud-us-so-wd" },
 { id: "aud-us-so-sign", code: "SO", label: "Signoffs", icon: "completion" },
 { id: "aud-us-so-fr", code: "FR", label: "Final Review", icon: "completion" },
 { id: "aud-us-so-alf", code: "ALF", label: "Archive & Lock File", icon: "completion" },
 ]
 },
 ];

 const auditEngagementTree: SectionNode[] = [
 {
 id: "aud-co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
...(engFirstYear ? [{ id: "aud-form-408", code: "408", label: "Initial Audit Engagements", icon: "checklist" as const, route: "checklist/aud-form-408" }] : []),
 { id: "aud-form-410", code: "410", label: engFirstYear ? "New Engagement — Acceptance/Continuance" : "Existing Engagement — Acceptance/Continuance", icon: "checklist", route: "checklist/aud-form-410" },
 { id: "aud-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/aud-el" },
 ]
 },
 {
 id: "aud-pl-sec", code: "PL", label: "Planning", icon: "folder",
 children: [
 { id: "aud-mat", code: "420", label: "Materiality", icon: "worksheet", route: "checklist/aud-mat" },
 { id: "aud-sae", code: "428", label: "Auditor's Expert", icon: "worksheet", route: "checklist/aud-sae" },
 { id: "aud-asm", code: "430", label: "Overall Audit Strategy", icon: "worksheet", route: "checklist/aud-asm" },
 { id: "aud-plan", code: "436", label: "Team Planning Discussions", icon: "worksheet", route: "checklist/aud-plan" },
 { id: "aud-tt", code: "450", label: "Time Tracker", icon: "worksheet", route: "checklist/aud-tt" },
 ]
 },
 {
 id: "aud-ra-sec", code: "RA", label: "Risk Assessment", icon: "folder",
 children: [
 {
 id: "aud-ra-gather", code: "GI", label: "Gather Information", icon: "folder",
 children: [
 { id: "aud-ra-oi", code: "500", label: "Observation & Inspection", icon: "checklist", route: "checklist/aud-ra-oi" },
 { id: "aud-ra-pap501bc", code: "501-A", label: "Preliminary Analytical", icon: "worksheet", route: "checklist/aud-ra-pap501bc" },
 { id: "aud-ra-pap501a", code: "501-B", label: "Preliminary Analytical", icon: "checklist", route: "checklist/aud-ra-pap501a" },
 { id: "aud-ra-505", code: "505", label: "Mgmt Inquiries", icon: "checklist", route: "checklist/aud-ra-505" },
 { id: "aud-ra-507", code: "507", label: "Governance Minutes", icon: "worksheet", route: "checklist/aud-ra-507" },
 { id: "aud-ra-510", code: "510", label: "Entity Understanding", icon: "worksheet", route: "checklist/aud-ra-510" },
 { id: "aud-ra-511", code: "511", label: "IT Environment", icon: "worksheet", route: "checklist/aud-ra-511" },
 { id: "aud-ra-514", code: "514", label: "Prior Period Estimates", icon: "worksheet", route: "checklist/aud-ra-514" },
 ]
 },
 {
 id: "aud-ra-identify", code: "IR", label: "Identify Risk", icon: "folder",
 children: [
 { id: "aud-ra-506", code: "506", label: "Fraud", icon: "checklist", route: "checklist/aud-ra-506" },
 { id: "aud-ra-580", code: "580", label: "Revenue Recognition", icon: "worksheet", route: "checklist/aud-ra-580" },
 { id: "aud-ra-513", code: "513", label: "Accounting Estimates", icon: "worksheet", route: "checklist/aud-ra-513" },
 { id: "aud-ra-515", code: "515", label: "Related Parties", icon: "worksheet", route: "checklist/aud-ra-515" },
 { id: "aud-ra-525", code: "525", label: "Going Concern", icon: "checklist", route: "checklist/aud-ra-525" },
 { id: "aud-ra-530", code: "530", label: "Entity Level - Risks and Controls", icon: "checklist", route: "checklist/aud-ra-530" },
 { id: "aud-ra-520", code: "520", label: "Risk Register", icon: "worksheet", route: "checklist/aud-ra-520" },
 { id: "aud-ra-590", code: "590", label: "Engagement Scoping", icon: "worksheet", route: "checklist/aud-ra-590" },
 ]
 },
 {
 id: "aud-ra-respond", code: "PR", label: "Populate Responses", icon: "folder",
 children: [
 { id: "aud-ra-535", code: "535", label: "Info System", icon: "worksheet", route: "checklist/aud-ra-535" },
 { id: "aud-ra-540", code: "540", label: "Control Design", icon: "worksheet", route: "checklist/aud-ra-540" },
 { id: "aud-ra-550", code: "550", label: "Control Activities", icon: "worksheet", route: "checklist/aud-ra-550" },
 { id: "aud-ra-551", code: "551", label: "General IT Controls", icon: "worksheet", route: "checklist/aud-ra-551" },
 { id: "aud-ra-575", code: "575", label: "Control Deficiencies", icon: "worksheet", route: "checklist/aud-ra-575" },
 ]
 },
 ]
 },
 {
 id: "aud-rp-sec", code: "RP", label: "Response to Assessed Risks", icon: "folder",
 children: [
 { id: "aud-rp-605", code: "605", label: "Risk Responses", icon: "worksheet", route: "checklist/aud-rp-605" },
 { id: "aud-rp-610", code: "610", label: "Sampling — Tests of Details", icon: "worksheet", route: "checklist/aud-rp-610" },
 { id: "aud-rp-625", code: "625", label: "Going Concern", icon: "worksheet", route: "checklist/aud-rp-625" },
 { id: "aud-rp-630", code: "630", label: "Confirmations", icon: "worksheet", route: "checklist/aud-rp-630" },
 { id: "aud-rp-635", code: "635", label: "Accounting Estimates", icon: "worksheet", route: "checklist/aud-rp-635" },
 { id: "aud-rp-645", code: "645", label: "Litigation, Claims and Non-Compliance", icon: "worksheet", route: "checklist/aud-rp-645" },
 { id: "aud-rp-666", code: "666", label: "Related Parties", icon: "worksheet", route: "checklist/aud-rp-666" },
 { id: "aud-rp-670", code: "670", label: "Use of Journal Entries", icon: "worksheet", route: "checklist/aud-rp-670" },
 { id: "aud-rp-680", code: "680", label: "ASPE Supplementary Audit Procedures", icon: "worksheet", route: "checklist/aud-rp-680" },
 ]
 },
 {
 id: "aud-do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "aud-do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "aud-do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "aud-do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "aud-do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 { id: "aud-do-cma", code: "CMA", label: "Contracts & Material Agreements", icon: "folder" },
 { id: "aud-do-cmb", code: "CMB", label: "Corporate Minute Book", icon: "folder" },
 { id: "aud-do-rcf", code: "RCF", label: "Regulatory & Compliance Filings", icon: "folder" },
 ]
 },
 {
 id: "aud-tb", code: "TB", label: "Trial Balance & Adjusting Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "aud-pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "aud-pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "aud-pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "aud-wp-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/aud-wp-a" },
 { id: "aud-wp-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/aud-wp-b" },
 { id: "aud-wp-c", code: "C", label: "Inventories", icon: "book", route: "procedure/aud-wp-c" },
 { id: "aud-wp-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/aud-wp-d" },
 { id: "aud-wp-e", code: "E", label: "Loans and notes receivable", icon: "book", route: "procedure/aud-wp-e" },
 { id: "aud-wp-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/aud-wp-i" },
 ]
 },
 {
 id: "aud-pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "aud-wp-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/aud-wp-h" },
 ]
 },
 {
 id: "aud-pr-lta", label: "Long-term assets", icon: "folder",
 children: [
 { id: "aud-wp-f", code: "F", label: "Intangibles and goodwill", icon: "book", route: "procedure/aud-wp-f" },
         { id: "aud-wp-k", code: "K", label: "Long-term investments", icon: "book", route: "procedure/aud-wp-k" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "aud-pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "aud-wp-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/aud-wp-bb" },
 { id: "aud-wp-cc", code: "CC", label: "Taxes payable", icon: "book", route: "procedure/aud-wp-cc" },
 { id: "aud-wp-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/aud-wp-dd" },
 ]
 },
 {
 id: "aud-pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "aud-wp-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/aud-wp-jj" },
 { id: "aud-wp-kk", code: "KK", label: "Long-term debt", icon: "book", route: "procedure/aud-wp-kk" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "aud-pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "aud-wp-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/aud-wp-tt" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "aud-pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "aud-wp-20", code: "20", label: "Revenue", icon: "book", route: "procedure/aud-wp-20" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-cos", label: "Cost of sales", icon: "folder",
 children: [
 {
 id: "aud-pr-cos-sub", label: "Cost of sales", icon: "folder",
 children: [
 { id: "aud-wp-30", code: "30", label: "Cost of sales", icon: "book", route: "procedure/aud-wp-30" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "aud-pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "aud-wp-40", code: "40", label: "Expenses", icon: "book", route: "procedure/aud-wp-40" },
 ]
 },
 {
 id: "aud-pr-oie", label: "Other Income(Expenses)", icon: "folder",
 children: [
 { id: "aud-wp-80", code: "80", label: "Other expenses (income)", icon: "book", route: "procedure/aud-wp-80" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "aud-fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "aud-fs-docs", label: "Financial Statement Docs", icon: "folder",
 children: [
 { id: "aud-fs-cover", label: "Cover Page", icon: "doc", route: "checklist/aud-fs-cover" },
 { id: "aud-fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/aud-fs-toc" },
 { id: "aud-fs-iar", label: "Independent Auditor's Report", icon: "doc", route: "checklist/aud-fs-iar" },
 { id: "aud-fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/aud-fs-bs" },
 { id: "aud-fs-is", label: "Statement of Income (Loss) and Retained Earnings (Deficit)", icon: "doc", route: "checklist/aud-fs-is" },
 { id: "aud-fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/aud-fs-cf" },
 { id: "aud-fs-notes", label: "Notes to Financial Statements", icon: "doc", route: "checklist/aud-fs-notes" },
 ]
 },
 ]
 },
 {
 id: "aud-so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "aud-rp-655", code: "655", label: "Final Analytics", icon: "worksheet", route: "checklist/aud-rp-655" },
 { id: "aud-so-aim", code: "AIM", label: "Misstatements", icon: "completion", route: "checklist/aud-so-aim" },
 { id: "aud-mr", code: "314", label: "Mgmt Representations", icon: "checklist", route: "checklist/aud-mr" },
 { id: "aud-rp-650", code: "650", label: "Subsequent Events", icon: "worksheet", route: "checklist/aud-rp-650" },
 { id: "aud-disc", code: "DC", label: "Disclosure", icon: "checklist", route: "checklist/aud-disc" },
 { id: "aud-so-sign", code: "SO", label: "Signoffs", icon: "completion", route: "checklist/aud-so-sign" },
 { id: "aud-so-fr", code: "FR", label: "Final Review", icon: "completion", route: "checklist/aud-so-fr" },
 { id: "aud-fs-iar", code: "305", label: "Auditor's Report", icon: "checklist", route: "checklist/aud-ar" },
 { id: "aud-so-306", code: "306", label: "Modified Opinion", icon: "checklist", route: "checklist/aud-so-306" },
 { id: "aud-so-310", code: "310", label: "Audit Completion", icon: "checklist", route: "checklist/aud-so-310" },
 { id: "aud-so-311", code: "311", label: "Withdrawal", icon: "worksheet", route: "checklist/aud-so-311" },
 { id: "aud-so-312", code: "312", label: "Engagement Partner", icon: "checklist", route: "checklist/aud-so-312" },
 { id: "aud-so-313", code: "313", label: "Supplementary Info", icon: "checklist", route: "checklist/aud-so-313" },
 { id: "aud-so-320", code: "320", label: "Significant Decisions", icon: "worksheet", route: "checklist/aud-so-320" },
 { id: "aud-so-325", code: "325", label: "Key Audit Matters", icon: "worksheet", route: "checklist/aud-so-325" },
 { id: "aud-so-330", code: "330", label: "Findings & Discussion", icon: "worksheet", route: "checklist/aud-so-330" },
 { id: "aud-so-335", code: "335", label: "Identified Misstatements", icon: "worksheet", route: "checklist/aud-so-335" },
 { id: "aud-so-340", code: "340", label: "Mgmt & TCWG Matters", icon: "worksheet", route: "checklist/aud-so-340" },
 { id: "aud-so-370", code: "370", label: "Future Considerations", icon: "worksheet", route: "checklist/aud-so-370" },
 { id: "aud-so-375", code: "375", label: "Consultation", icon: "worksheet", route: "checklist/aud-so-375" },
 { id: "aud-comp", code: "CM", label: "Completion", icon: "completion", route: "checklist/aud-comp" },
 ]
 },
 ];

 const engagementTree: SectionNode[] = [
 {
 id: "co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
 { id: "co-ca", code: "CA", label: "Client acceptance and continuance", icon: "checklist", route: "checklist/co-ca" },
 { id: "co-ind", code: "IND", label: "Independence", icon: "checklist", route: "checklist/co-ind" },
 { id: "co-kcb", code: "KCB", label: "Knowledge of client business", icon: "checklist", route: "checklist/co-kcb" },
 { id: "co-pl", code: "PL", label: "Planning", icon: "checklist", route: "checklist/co-pl" },
 { id: "co-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/co-el" },
 { id: "co-mr", code: "MR", label: "Management responsibility and acknowledgement", icon: "letter", route: "checklist/co-mr" },
 ]
 },
 {
 id: "do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 ]
 },
 {
 id: "tb", code: "TB", label: "Trial Balance & Adj. Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "pr-ca-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/pr-ca-a" },
 { id: "pr-ca-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/pr-ca-b" },
 { id: "pr-ca-c", code: "C", label: "Inventories", icon: "book", route: "procedure/pr-ca-c" },
 { id: "pr-ca-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/pr-ca-d" },
 { id: "pr-ca-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/pr-ca-i" },
 ]
 },
 {
 id: "pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "pr-ppe-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/pr-ppe-h" },
 ]
 },
 ]
 },
 {
 id: "pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "pr-cl-aa", code: "AA", label: "Bank overdraft", icon: "book", route: "procedure/pr-cl-aa" },
 { id: "pr-cl-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/pr-cl-bb" },
 { id: "pr-cl-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/pr-cl-dd" },
 { id: "pr-cl-ee", code: "EE", label: "Deferred income", icon: "book", route: "procedure/pr-cl-ee" },
 ]
 },
 {
 id: "pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "pr-ltl-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/pr-ltl-jj" },
 ]
 },
 ]
 },
 {
 id: "pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "pr-sc-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/pr-sc-tt" },
 ]
 },
 ]
 },
 {
 id: "pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "pr-rev-20", code: "20", label: "Revenue", icon: "book", route: "procedure/pr-rev-20" },
 ]
 },
 ]
 },
 {
 id: "pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "pr-opex-40", code: "40", label: "Operating expenses", icon: "book", route: "procedure/pr-opex-40" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "fs-docs", code: "FS", label: "Financial Statements Docs", icon: "folder",
 children: [
 { id: "fs-cover", label: "Cover Page", icon: "doc", route: "checklist/fs-cover" },
 { id: "fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/fs-toc" },
 { id: "fs-comp", label: "Compilation report", icon: "doc", route: "checklist/fs-comp" },
 { id: "fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/fs-bs" },
 { id: "fs-is", label: "Statement of Income and Retained Earnings", icon: "doc", route: "checklist/fs-is" },
 { id: "fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/fs-cf" },
 { id: "fs-notes", label: "Notes to Financial Information", icon: "doc", route: "checklist/fs-notes" },
 ]
 },
 ]
 },
 {
 id: "so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "so-cm", code: "CM", label: "Completion", icon: "completion" },
 { id: "so-so", code: "SO", label: "Signoffs", icon: "completion" },
 ]
 },
 ];

 const renderIcon = (icon?: string) => {
 if (icon === "letter") return <LetterIcon className="h-4 w-4 flex-shrink-0" />;
 if (icon === "checklist") return <ChecklistIcon className="h-4 w-4 flex-shrink-0" />;
 if (icon === "completion") return <CompletionIcon className="h-4 w-4 flex-shrink-0" />;
 if (icon === "doc") return <WordDocIcon className="h-4 w-4 flex-shrink-0" />;
 if (icon === "worksheet") return <WorksheetIcon className="h-4 w-4 flex-shrink-0" />;
 if (icon === "book") return <BookIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#778599' }} />;
 return <FolderSolidIcon className="h-4 w-4 text-primary flex-shrink-0" />;
 };

 const renderCustomSections = (parentId: string, depth: number): React.ReactNode[] =>
 customSections
.filter(s => s.parentId === parentId)
.map(section => {
 const code = section.name.slice(0, 2).toUpperCase();
 const isActive = !!engId && location.pathname.includes(`/checklist/${section.id}`);

 if (section.category === 'folder') {
 const isOpen = expandedSections.has(section.id);
 const hasAnyChildren = customSections.some(s => s.parentId === section.id) || (nodeDocuments[section.id]?.length ?? 0) > 0;
 return (
 <div key={section.id}>
 <div
 style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
 className="group relative flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm"
 onClick={e => {
 e.stopPropagation();
 if (!hasAnyChildren) return;
 setExpandedSections(prev => {
 const next = new Set(prev);
 isOpen ? next.delete(section.id) : next.add(section.id);
 return next;
 });
 }}
 >
 {hasAnyChildren
 ? isOpen
 ? <FolderMinusIcon className="h-4 w-4 flex-shrink-0 text-primary" />
 : <FolderPlusIcon className="h-4 w-4 flex-shrink-0 text-primary" />
 : <FolderSolidIcon className="h-4 w-4 flex-shrink-0 text-primary" />}
 <span className="font-semibold text-primary">{code}</span>
 <span className="truncate flex-1 text-black dark:text-white font-semibold">{section.name}</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity flex-shrink-0">
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <DropdownMenuItem className="gap-2 cursor-pointer text-primary font-medium" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('raise-doc-request', { detail: { folder: section.name, subFolder: '' } })); }}>
 <Send className="h-4 w-4" /> Raise a request
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <AlertCircle className="h-4 w-4" /> Raise issue
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <MessageSquare className="h-4 w-4" /> Add comment
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddDocModal({ nodeId: section.id, nodeCode: code, nodeLabel: section.name }); setPendingDocFiles([]); }}>
 <FilePlus2 className="h-4 w-4" /> Add document
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddNoteModal({ nodeId: section.id, nodeCode: code, nodeLabel: section.name }); setAddNoteName(''); }}>
 <NotebookPen className="h-4 w-4" /> Add note
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddSectionModal({ open: true, parentNodeId: section.id }); setAddSectionName(''); setAddSectionCategory('checklist'); }}>
 <FolderPlus className="h-4 w-4" /> Add section
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddFolderModal({ parentNodeId: section.id }); setAddFolderName(''); }}>
 <FolderPlus className="h-4 w-4" /> Add folder
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="gap-2 cursor-pointer text-destructive focus:text-destructive"
 onClick={e => {
 e.stopPropagation();
 if (!engId) return;
 const all = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engId}`, []);
 const toDelete = new Set<string>();
 const collect = (id: string) => { toDelete.add(id); all.filter(s => s.parentId === id).forEach(s => collect(s.id)); };
 collect(section.id);
 writeJsonToLocalStorage(`engagement-custom-sections-${engId}`, all.filter(s => !toDelete.has(s.id)));
 window.dispatchEvent(new CustomEvent('custom-sections-updated'));
 }}
 >
 <Trash2 className="h-4 w-4" /> Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 {isOpen && (nodeDocuments[section.id] ?? []).filter(d => d.type !== 'note').map(doc => (
 <div
 key={doc.id}
 className="group/doc flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm mt-0.5"
 style={{ paddingLeft: `${(depth + 2) * 16 + 8}px` }}
 >
 {getFileTypeIcon(doc.name, 'h-4 w-4')}
 <span className="truncate flex-1 text-black dark:text-white font-medium">{doc.name}</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover/doc:opacity-100 p-0.5 rounded hover:bg-muted transition-all flex-shrink-0 text-muted-foreground hover:text-foreground">
 <MoreVertical className="h-4 w-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent side="right" align="start" className="min-w-max">
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Move className="h-3.5 w-3.5 mr-2" /> Move
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Download className="h-3.5 w-3.5 mr-2" /> Download
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="text-destructive focus:text-destructive"
 onClick={e => {
 e.stopPropagation();
 const updated = {...nodeDocuments, [section.id]: (nodeDocuments[section.id] ?? []).filter(d => d.id !== doc.id) };
 saveNodeDocs(updated);
 }}
 >
 <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 ))}
 {isOpen && renderCustomSections(section.id, depth + 1)}
 </div>
 );
 }

 // Leaf (checklist / letter)
 return (
 <div
 key={section.id}
 style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
 className={cn("group relative flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm", isActive && "bg-primary/10 ring-1 ring-primary/25")}
 onClick={() => engId && navigate(`/engagements/${engId}/checklist/${section.id}`)}
 >
 {section.category === 'letter' ? <LetterIcon className="h-4 w-4 flex-shrink-0" /> : <ChecklistIcon className="h-4 w-4 flex-shrink-0" />}
 <span className="font-semibold text-primary">{code}</span>
 <span className="truncate flex-1 text-black dark:text-white font-medium">{section.name}</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity flex-shrink-0">
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <DropdownMenuItem className="gap-2 cursor-pointer text-primary font-medium" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('raise-doc-request', { detail: { folder: section.name, subFolder: '' } })); }}>
 <Send className="h-4 w-4" /> Raise a request
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <AlertCircle className="h-4 w-4" /> Raise issue
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <MessageSquare className="h-4 w-4" /> Add comment
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddDocModal({ nodeId: section.id, nodeCode: code, nodeLabel: section.name }); setPendingDocFiles([]); }}>
 <FilePlus2 className="h-4 w-4" /> Add document
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddFolderModal({ parentNodeId: section.id }); setAddFolderName(''); }}>
 <FolderPlus className="h-4 w-4" /> Add folder
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="gap-2 cursor-pointer text-destructive focus:text-destructive"
 onClick={e => {
 e.stopPropagation();
 if (!engId) return;
 const existing = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engId}`, []);
 writeJsonToLocalStorage(`engagement-custom-sections-${engId}`, existing.filter(s => s.id !== section.id));
 window.dispatchEvent(new CustomEvent('custom-sections-updated'));
 if (isActive) navigate(`/engagements/${engId}`);
 }}
 >
 <Trash2 className="h-4 w-4" /> Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 );
 });

 const engSidebarQ = engSidebarSearchQuery.trim().toLowerCase();
 const engSidebarNodeMatches = (n: SectionNode): boolean => {
 if (!engSidebarQ) return true;
 if (n.label.toLowerCase().includes(engSidebarQ)) return true;
 if (n.code?.toLowerCase().includes(engSidebarQ)) return true;
 return n.children?.some(engSidebarNodeMatches) ?? false;
 };

 // Sidebar items with Luka automation — demo indicators for Atin
 const LUKA_AUTO_IDS = new Set([
  'aud-form-410',   // 410 New Engagement — Acceptance/Continuance
  'aud-mat',        // 420 Materiality
  'aud-plan',       // 436 Team Planning Discussions
  'aud-ra-pap501bc', // 501-A Preliminary Analytical
  'aud-ra-506',     // 506 Fraud
  'aud-ra-507',     // 507 Governance Minutes
  'aud-ra-520',     // 520 Risk Register
  'aud-ra-525',     // 525 Going Concern
  'aud-ra-590',     // 590 Engagement Scoping
  'gca-ws-proc-ar', // B-1 AR Audit Procedures
 ]);

 const renderNode = (node: SectionNode, depth: number = 0, parentLabel?: string): React.ReactNode => {
 if (engSidebarQ && !engSidebarNodeMatches(node)) return null;
 const hasChildren = node.children && node.children.length > 0;
 const isOpen = engSidebarQ ? hasChildren : expandedSections.has(node.id);
 const isLeaf = !hasChildren;
 const currentSubPath = engId ? location.pathname.replace(`/engagements/${engId}/`, '').replace(`/engagements/${engId}`, '') : '';
 const defaultRoute = isUSAuditEngagement ? 'checklist/aud-us-new-accept' : isAuditEngagement ? 'checklist/aud-new-accept' : 'checklist/co-ca';
 const isActive = node.route
 ? (currentSubPath === node.route || (currentSubPath === '' && node.route === defaultRoute))
 : false;

 const handleRaiseRequest = (e: React.MouseEvent) => {
 e.stopPropagation();
 window.dispatchEvent(new CustomEvent('raise-doc-request', {
 detail: {
 folder: parentLabel ?? node.label,
 subFolder: parentLabel ? node.label : '',
 }
 }));
 };

 return (
 <div key={node.id}>
 <div
 className={cn(
 "group relative flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm",
 isActive && "bg-primary/10 ring-1 ring-primary/25"
 )}
 style={{ paddingLeft: `${depth * 16 + 8}px` }}
 onClick={() => {
 if (node.code === 'NT') {
 window.dispatchEvent(new CustomEvent('open-notes-modal', { detail: {} }));
 } else if (node.route) {
 if (engId) {
 navigate(`/engagements/${engId}/${node.route}`);
 }
 } else if (hasChildren) {
 setExpandedSections(prev => {
 const next = new Set(prev);
 if (next.has(node.id)) next.delete(node.id);
 else next.add(node.id);
 return next;
 });
 }
 }}
 >
 {/* +/- toggle for nodes with both a route and children (e.g. aud-wp-* with mapped procedure children) */}
 {hasChildren && node.route && (
 <button
 className="absolute flex items-center justify-center rounded text-[10px] font-bold leading-none text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
 style={{ left: `${depth * 16 + 8 - 14}px`, width: '14px', height: '14px', top: '50%', transform: 'translateY(-50%)' }}
 onClick={e => {
 e.stopPropagation();
 setExpandedSections(prev => {
 const next = new Set(prev);
 if (next.has(node.id)) next.delete(node.id);
 else next.add(node.id);
 return next;
 });
 }}
 >
 {isOpen ? '−' : '+'}
 </button>
 )}
 {/* +/- toggle: absolutely positioned in the indent space, zero flex impact */}
 {/* Suppressed for leaf folder nodes with docs — the icon itself handles toggling */}
 {((nodeDocuments[node.id]?.length ?? 0) > 0 || notesPages.has(node.id) || (isLeaf && customSections.some(s => s.parentId === node.id))) && !(isLeaf && node.icon === "folder" && ((nodeDocuments[node.id]?.length ?? 0) > 0 || customSections.some(s => s.parentId === node.id))) && (
 <button
 className="absolute flex items-center justify-center rounded text-[10px] font-bold leading-none text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
 style={{ left: '10px', width: '14px', height: '14px', top: '50%', transform: 'translateY(-50%)' }}
 onClick={e => {
 e.stopPropagation();
 setCollapsedNodeDocs(prev => {
 const next = new Set(prev);
 if (next.has(node.id)) next.delete(node.id);
 else next.add(node.id);
 return next;
 });
 }}
 >
 {collapsedNodeDocs.has(node.id) ? '+' : '−'}
 </button>
 )}
 {/* Leaf/folder icon follows the toggle (or leads if no attachments) */}
 {isLeaf ? (
 node.icon === "folder" && ((nodeDocuments[node.id]?.length ?? 0) > 0 || customSections.some(s => s.parentId === node.id)) ? (
 <button
 className="flex-shrink-0 p-0 leading-none"
 onClick={e => {
 e.stopPropagation();
 setCollapsedNodeDocs(prev => {
 const next = new Set(prev);
 if (next.has(node.id)) next.delete(node.id);
 else next.add(node.id);
 return next;
 });
 }}
 >
 {!collapsedNodeDocs.has(node.id)
 ? <FolderMinusIcon className="h-4 w-4 text-primary" />
 : <FolderPlusIcon className="h-4 w-4 text-primary" />}
 </button>
 ) : (
 <>{renderIcon(node.icon)}</>
 )
 ) : node.icon && node.icon !== "folder" ? (
 <>{renderIcon(node.icon)}</>
 ) : (
 <span className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
 {isOpen
 ? <FolderMinusIcon className="h-4 w-4 text-primary" />
 : <FolderPlusIcon className="h-4 w-4 text-primary" />}
 </span>
 )}
 {node.code && <span className="font-semibold text-primary">{node.code}</span>}
 <span className={cn("truncate flex-1 text-black dark:text-white", isLeaf ? "font-medium" : "font-semibold")}><SidebarHighlight text={node.label} query={engSidebarSearchQuery} /></span>
 {/* Luka automation indicator */}
 {LUKA_AUTO_IDS.has(node.id) && engId === 'AUD-NPM-Dec312025' && (
  <span className="flex-shrink-0 ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full" style={{background: 'linear-gradient(to right, #1C63A6, #7A31D8)'}} title="Luka automation available">
   <svg width="6" height="7" viewBox="0 0 6 7" fill="none"><path d="M1 1L5 3.5L1 6V1Z" fill="white" /></svg>
  </span>
 )}
 {!isLeaf && sectionFillStatus[node.code ?? ''] && (
 <span className="w-2 h-2 rounded-full flex-shrink-0 ml-auto luka-dot-filled" title="Luka filled" />
 )}
 {node.hasPlus && <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0" />}
 {signoffsMode && (
 <div className="flex items-center gap-2 ml-4 -mr-2 pl-3 flex-shrink-0 self-stretch" onClick={(e) => e.stopPropagation()}>
 {(["p1", "p2"] as const).map(pid => (
 <div key={pid} className="w-9 flex items-center justify-center">
 <Checkbox
 checked={!!signoffChecks[node.id]?.[pid]}
 onCheckedChange={(v) =>
 setSignoffChecks(prev => ({
...prev,
 [node.id]: { p1: !!prev[node.id]?.p1, p2: !!prev[node.id]?.p2, [pid]: !!v },
 }))
 }
 className="h-4 w-4 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
 />
 </div>
 ))}
 </div>
 )}
 {!signoffsMode && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity flex-shrink-0">
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 {isLeaf ? (
 <>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <ArrowUpDown className="h-4 w-4" /> Reorder
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 </>
 ) : null}
 <DropdownMenuItem className="gap-2 cursor-pointer text-primary font-medium" onClick={handleRaiseRequest}>
 <Send className="h-4 w-4" /> Raise a request
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <AlertCircle className="h-4 w-4" /> Raise issue
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
 <MessageSquare className="h-4 w-4" /> Add comment
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 {isLeaf ? (
 <>
 <DropdownMenuItem
 className="gap-2 cursor-pointer"
 onClick={e => {
 e.stopPropagation();
 setAddDocModal({ nodeId: node.id, nodeCode: node.code, nodeLabel: node.label });
 setPendingDocFiles([]);
 }}
 >
 <FilePlus2 className="h-4 w-4" /> Add document
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddFolderModal({ parentNodeId: node.id }); setAddFolderName(''); }}>
 <FolderPlus className="h-4 w-4" /> Add folder
 </DropdownMenuItem>
 </>
 ) : (
 <>
 <DropdownMenuItem
 className="gap-2 cursor-pointer"
 onClick={e => {
 e.stopPropagation();
 setAddNoteModal({ nodeId: node.id, nodeCode: node.code, nodeLabel: node.label });
 setAddNoteName('');
 }}
 >
 <NotebookPen className="h-4 w-4" /> Add note
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddSectionModal({ open: true, parentNodeId: node.id }); setAddSectionName(''); setAddSectionCategory('checklist'); }}>
 <FolderPlus className="h-4 w-4" /> Add section
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setAddFolderModal({ parentNodeId: node.id }); setAddFolderName(''); }}>
 <FolderPlus className="h-4 w-4" /> Add folder
 </DropdownMenuItem>
 {node.children && node.children.length > 0 && (
 <>
 <DropdownMenuSeparator />
 <DropdownMenuSub>
 <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
 <Eye className="h-4 w-4" /> Show / Hide
 </DropdownMenuSubTrigger>
 <DropdownMenuSubContent className="min-w-max">
 {node.children.map(child => {
 const isHidden = (hiddenChildren[node.id] ?? []).includes(child.id);
 const toggle = () => {
 setHiddenChildren(prev => {
 const current = prev[node.id] ?? [];
 const updated = isHidden
 ? current.filter(id => id !== child.id)
 : [...current, child.id];
 const next = {...prev, [node.id]: updated };
 const engId = location.pathname.split("/engagements/")[1]?.split("/")[0];
 if (engId) writeJsonToLocalStorage(`sidebar-hidden-${engId}`, next);
 return next;
 });
 };
 return (
 <DropdownMenuItem
 key={child.id}
 className="gap-2 cursor-pointer"
 onSelect={e => e.preventDefault()}
 onClick={e => { e.stopPropagation(); toggle(); }}
 >
 <Checkbox
 checked={!isHidden}
 className="pointer-events-none h-4 w-4 shrink-0"
 />
 <span className="flex items-center gap-1.5">
 {child.code && <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{child.code}</span>}
 <span>{child.label}</span>
 </span>
 </DropdownMenuItem>
 );
 })}
 </DropdownMenuSubContent>
 </DropdownMenuSub>
 </>
 )}
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 )}
 </div>

 {/* Legacy leaf notes sub-item (URL-based) */}
 {isLeaf && notesPages.has(node.id) && !collapsedNodeDocs.has(node.id) && (
 <div
 className={cn(
 "group flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm mt-0.5",
 engId && location.pathname.endsWith(`/checklist/notes-${node.id}`) && "bg-primary/10 ring-1 ring-primary/25",
 )}
 style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
 onClick={e => { e.stopPropagation(); if (engId) navigate(`/engagements/${engId}/checklist/notes-${node.id}`); }}
 >
 <NotebookPen className="h-4 w-4 text-amber-500 flex-shrink-0" />
 <span className="truncate flex-1 text-black dark:text-white font-medium">Notes</span>
 </div>
 )}

 {/* Folder notes (type='note') — shown when folder is expanded */}
 {isOpen && !collapsedNodeDocs.has(node.id) && (nodeDocuments[node.id] ?? []).filter(d => d.type === 'note').map(note => (
 <div
 key={note.id}
 className={cn(
 "group/doc flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm mt-0.5",
 engId && location.pathname.includes(`/checklist/node-note-${note.id}`) && "bg-primary/10 ring-1 ring-primary/25",
 )}
 style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
 onClick={e => { e.stopPropagation(); if (engId) navigate(`/engagements/${engId}/checklist/node-note-${note.id}?t=${encodeURIComponent(note.name)}`); }}
 >
 <NotebookPen className="h-4 w-4 text-amber-500 flex-shrink-0" />
 <span className="truncate flex-1 text-black dark:text-white font-medium">{note.name}</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover/doc:opacity-100 p-0.5 rounded hover:bg-muted transition-all flex-shrink-0 text-muted-foreground hover:text-foreground">
 <MoreVertical className="h-4 w-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent side="right" align="start" className="min-w-[140px]">
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="text-destructive focus:text-destructive"
 onClick={e => {
 e.stopPropagation();
 const updated = {...nodeDocuments, [node.id]: nodeDocuments[node.id].filter(d => d.id !== note.id) };
 saveNodeDocs(updated);
 }}
 >
 <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 ))}

 {/* Document attachments — shown below notes */}
 {(nodeDocuments[node.id]?.length ?? 0) > 0 && !collapsedNodeDocs.has(node.id) && (nodeDocuments[node.id] ?? []).filter(d => d.type !== 'note').map(doc => (
 <div
 key={doc.id}
 className="group/doc flex items-center gap-1.5 py-1.5 px-2 rounded-[8px] cursor-pointer hover:bg-primary/10 transition-colors text-sm mt-0.5"
 style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
 >
 {getFileTypeIcon(doc.name, 'h-4 w-4')}
 <span className="truncate flex-1 text-black dark:text-white font-medium">{doc.name}</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover/doc:opacity-100 p-0.5 rounded hover:bg-muted transition-all flex-shrink-0 text-muted-foreground hover:text-foreground">
 <MoreVertical className="h-4 w-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent side="right" align="start" className="min-w-[140px]">
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Pencil className="h-3.5 w-3.5 mr-2" />
 Rename
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Move className="h-3.5 w-3.5 mr-2" />
 Move
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Coming soon' }); }}>
 <Download className="h-3.5 w-3.5 mr-2" />
 Download
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="text-destructive focus:text-destructive"
 onClick={e => {
 e.stopPropagation();
 const updated = {...nodeDocuments, [node.id]: nodeDocuments[node.id].filter(d => d.id !== doc.id) };
 saveNodeDocs(updated);
 }}
 >
 <Trash2 className="h-3.5 w-3.5 mr-2" />
 Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 ))}

 {isOpen && hasChildren && (
 <div>
 {node.children!
.filter(child => !(hiddenChildren[node.id] ?? []).includes(child.id))
.map(child => renderNode(child, depth + 1, node.label))}
 </div>
 )}

 {/* User-added sections under this node (recursive, supports nested folders) */}
 {!isLeaf && isOpen && renderCustomSections(node.id, depth)}
 {isLeaf && !collapsedNodeDocs.has(node.id) && renderCustomSections(node.id, depth)}
 </div>
 );
 };

 // Collect all node IDs for the "select all" signoff toggles
 const collectIds = (nodes: SectionNode[]): string[] =>
 nodes.flatMap(n => [n.id,...(n.children ? collectIds(n.children) : [])]);
 const caTree = isAuditEngagement && !isUSAuditEngagement && activeProcedureIds.length > 0
  ? auditEngagementTree.map(section =>
   section.id === "aud-pr" && section.children
    ? { ...section, children: filterProcTree(section.children, activeProcedureIds, wpProcMap) }
    : section
  )
  : auditEngagementTree;
 const activeTree = isUSAuditEngagement ? usAuditEngagementTree : isAuditEngagement ? caTree : engagementTree;
 allNodeIdsRef.current = collectIds(activeTree);

 const hasEngSidebarMatch = !engSidebarQ || activeTree.some(engSidebarNodeMatches);
 if (!hasEngSidebarMatch) {
 return (
 <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
 <Search className="h-6 w-6 mb-2 text-muted-foreground/40" />
 <p className="text-xs font-medium text-foreground">No results for &ldquo;{engSidebarSearchQuery}&rdquo;</p>
 <p className="text-[10px] mt-0.5 text-muted-foreground">Try a different term</p>
 </div>
 );
 }
 return activeTree.map(node => renderNode(node, 0));
 })()}
 </div>

 {/* Resize handle */}
 {!isTemplatesPanelCollapsed && (
 <div
 className={cn(
 "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-30 transition-all duration-150",
 isResizing
 ? "bg-primary"
 : isResizeHovering
 ? "bg-border"
 : "bg-transparent hover:bg-border"
 )}
 onMouseDown={startResizing}
 onMouseEnter={() => setIsResizeHovering(true)}
 onMouseLeave={() => !isResizing && setIsResizeHovering(false)}
 >
 <div className="absolute -left-1 -right-1 top-0 bottom-0" />
 </div>
 )}

 </div>
 </>, portalTarget)}

 {/* Templates panel - portalled below the global header */}
 {portalTarget && location.pathname !== "/dashboard" && location.pathname !== "/clients" && location.pathname !== "/teams" && location.pathname !== "/engagements" && location.pathname !== "/design-system" && !location.pathname.startsWith("/engagements/") && !location.pathname.startsWith("/clients/") && createPortal(<>
 <div 
 ref={panelRef}
 style={{ width: isTemplatesPanelCollapsed ? 0 : panelWidth }}
 className={cn(
 `flex flex-col relative z-40 transition-all group/templates sidebar-secondary-panel ${hasDarkSecondary ? 'sidebar-dark-theme' : ''}`,
 isTemplatesPanelCollapsed
 ? "overflow-hidden shadow-none bg-transparent"
 : "shadow-md bg-white dark:bg-card border border-border/50 rounded-xl mb-1 mr-1",
 isResizing && "transition-none"
 )}
 >
 <div className={`p-4 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 <DropdownMenu>
 <DropdownMenuTrigger className={cn("w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors shadow-sm border", hasDarkSecondary ? "bg-white/10 border-white/20 text-white" : "bg-card/80 border-border text-foreground")}>
 <div className="flex items-center gap-2">
 {(() => {
 const selected = dropdownItems.find(item => item.id === selectedDropdown);
 if (selected) {
 const IconComponent = selected.icon;
 return <>
 <IconComponent className={`h-4 w-4 ${selected.color}`} />
 <span>{selected.label}</span>
 </>;
 }
 return <span>Select...</span>;
 })()}
 </div>
 <ChevronDown className={cn("h-4 w-4", hasDarkSecondary ? "text-white/60" : "text-muted-foreground")} />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-auto min-w-[240px] whitespace-nowrap">
 {dropdownItems.map(item => <DropdownMenuItem key={item.id} onClick={() => handleDropdownSelect(item.id)} className="flex items-center justify-between cursor-pointer">
 <div className="flex items-center gap-2">
 <item.icon className={`h-4 w-4 ${item.color}`} />
 <span>{item.label}</span>
 </div>
 {selectedDropdown === item.id && <Check className="h-4 w-4 text-primary" />}
 </DropdownMenuItem>)}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Engagement Templates tree view */}
 {selectedDropdown === "engagements" ? (
 <>
 <div className={cn("flex items-center px-3 py-2 flex-shrink-0", isTemplatesPanelCollapsed ? "hidden" : "")} style={{
  borderBottom: hasDarkSecondary ? "1px solid rgba(255,255,255,0.15)" : "1px solid hsl(var(--border))"
 }}>
  <span className={cn("text-sm font-semibold", hasDarkSecondary ? "text-white" : "text-foreground")}>Templates</span>
 </div>
 <div className={`p-3 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
  <div className="flex gap-2">
   <div className="relative flex-1">
    <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")} />
    <Input
     placeholder="Search"
     className={cn("pl-8 h-9 text-sm", hasDarkSecondary ? "bg-white/10 text-white placeholder:text-white/40 border-0" : "")}
     value={engMySearchQuery}
     onChange={e => setEngMySearchQuery(e.target.value)}
    />
   </div>
   <Tooltip>
    <TooltipTrigger asChild>
     <button
      className={cn("h-9 w-9 rounded-md flex items-center justify-center transition-colors", hasDarkSecondary ? "bg-white/10 hover:bg-white/20" : "bg-primary/10 hover:bg-primary/20")}
      onClick={handleEngMyExpandCollapseAll}
     >
      {allEngMyExpanded ? (
       <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.08325 6.94412L2.08325 2.08301M2.08325 2.08301L6.24992 2.08301M2.08325 2.08301L6.94436 6.94412M14.5833 9.7219L14.5833 14.583M14.5833 14.583L10.4166 14.583M14.5833 14.583L9.72214 9.7219" stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
       </svg>
      ) : (
       <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583L2.08325 10.4163" stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
       </svg>
      )}
     </button>
    </TooltipTrigger>
    <TooltipContent>{allEngMyExpanded ? "Collapse All" : "Expand All"}</TooltipContent>
   </Tooltip>
   <Button
    size="icon"
    className="h-9 w-9 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm"
    onClick={() => { setEngPickerOpen(true); setSelectedEngTemplates(new Set()); setEngTemplateSearchQuery(""); }}
   >
    <Plus className="h-4 w-4 text-primary-foreground icon-plus" />
   </Button>
   <Button
    size="icon"
    variant="secondary"
    className="h-9 w-9 text-destructive hover:text-destructive focus-visible:text-destructive"
    disabled={engMySelectedIds.size === 0}
    onClick={() => setEngMyDeleteConfirmOpen(true)}
   >
    <Trash2 className="h-4 w-4" />
   </Button>
  </div>
 </div>

 <div className={`flex-1 overflow-y-auto p-2 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {myEngagementTemplates.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
 <p className={cn("text-sm font-medium", hasDarkSecondary ? "text-white/70" : "text-muted-foreground")}>No templates yet</p>
 <p className={cn("text-xs", hasDarkSecondary ? "text-white/40" : "text-muted-foreground/70")}>Click &ldquo;+&rdquo; to add from Global Templates</p>
 </div>
 ) : (() => {
 const q = engMySearchQuery.toLowerCase();
 const filtered = q ? myEngagementTemplates.filter(t => t.name.toLowerCase().includes(q) || t.folderName.toLowerCase().includes(q)) : myEngagementTemplates;
 if (filtered.length === 0) return (
 <div className="flex flex-col items-center justify-center h-24 gap-1 text-center px-4">
 <p className={cn("text-sm", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")}>No results for &ldquo;{engMySearchQuery}&rdquo;</p>
 </div>
 );
 // Group by folder
 const folders: Record<string, { id: string; name: string; templates: typeof myEngagementTemplates }> = {};
 filtered.forEach(t => {
 if (!folders[t.folderId]) folders[t.folderId] = { id: t.folderId, name: t.folderName, templates: [] };
 folders[t.folderId].templates.push(t);
 });
 return Object.values(folders).map(folder => {
 const allFolderSelected = folder.templates.every(t => engMySelectedIds.has(t.id));
 const someFolderSelected = !allFolderSelected && folder.templates.some(t => engMySelectedIds.has(t.id));
 return (
 <div key={folder.id}>
 {/* Folder row */}
 <div
 className={cn("group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm font-semibold select-none", hasDarkSecondary ? "text-white" : "text-foreground")}
 onClick={() => setEngMyFolderExpanded(prev => {
  const next = new Set(prev);
  next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
  return next;
 })}
 >
 <div
  className={cn("h-4 w-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors",
   allFolderSelected ? "bg-primary border-primary" : someFolderSelected ? "border-primary bg-primary/20" : (hasDarkSecondary ? "border-white/40" : "border-border")
  )}
  onClick={e => {
   e.stopPropagation();
   setEngMySelectedIds(prev => {
    const next = new Set(prev);
    if (allFolderSelected) { folder.templates.forEach(t => next.delete(t.id)); }
    else { folder.templates.forEach(t => next.add(t.id)); }
    return next;
   });
  }}
 >
  {(allFolderSelected || someFolderSelected) && <Check className="h-2.5 w-2.5 text-white" />}
 </div>
 {engMyFolderExpanded.has(folder.id)
  ? <FolderMinusIcon className="h-4 w-4 text-primary flex-shrink-0" />
  : <FolderPlusIcon className="h-4 w-4 text-primary flex-shrink-0" />}
 <span className="truncate flex-1">{folder.name}</span>
 <span className={cn("text-xs group-hover:hidden", hasDarkSecondary ? "text-white/40" : "text-muted-foreground")}>{folder.templates.length}</span>
 <DropdownMenu>
  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
   <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity flex-shrink-0">
    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
   </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44">
   <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setEngMyCtxFolder(folder); setEngMyFolderRenameValue(folder.name); setEngMyFolderRenameOpen(true); }}>
    <Pencil className="h-4 w-4 text-primary" /> Rename
   </DropdownMenuItem>
   <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={e => { e.stopPropagation(); setEngMyCtxFolder(folder); setEngMyFolderDeleteOpen(true); }}>
    <Trash2 className="h-4 w-4" /> Delete
   </DropdownMenuItem>
  </DropdownMenuContent>
 </DropdownMenu>
 </div>
 {engMyFolderExpanded.has(folder.id) && folder.templates.map(t => {
 const isActive = searchParams.get("myTemplate") === t.id;
 const isSelected = engMySelectedIds.has(t.id);
 const isDefault = engMyDefaultId === t.id;
 const otherFolders = Object.values(
  myEngagementTemplates.reduce((acc, x) => { acc[x.folderId] = { id: x.folderId, name: x.folderName }; return acc; }, {} as Record<string, {id: string; name: string}>)
 ).filter(f => f.id !== folder.id);
 return (
 <div
 key={t.id}
 className={cn(
 "group flex items-center gap-2 py-1.5 pl-6 pr-2 rounded-md cursor-pointer text-sm ml-1 font-medium select-none",
 isActive ? "bg-primary/10 text-primary" : (hasDarkSecondary ? "text-white/80 hover:bg-white/10" : "text-foreground hover:bg-muted/50")
 )}
 onClick={() => {
  navigate("/engagement-templates");
  setSearchParams({ myTemplate: t.id });
 }}
 >
 <div
  className={cn("h-4 w-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors",
   isSelected ? "bg-primary border-primary" : (hasDarkSecondary ? "border-white/40" : "border-border")
  )}
  onClick={e => {
   e.stopPropagation();
   setEngMySelectedIds(prev => {
    const next = new Set(prev);
    next.has(t.id) ? next.delete(t.id) : next.add(t.id);
    return next;
   });
  }}
 >
  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
 </div>
 <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 16" fill="none"><path d="M2.08317 8.00016H4.90148C5.47248 8.00016 5.99448 8.32277 6.24984 8.8335C6.5052 9.34422 7.02719 9.66683 7.5982 9.66683H12.4015C12.9725 9.66683 13.4945 9.34422 13.7498 8.8335C14.0052 8.32277 14.5272 8.00016 15.0982 8.00016H17.9165M7.47197 1.3335H12.5277C13.4251 1.3335 13.8738 1.3335 14.2699 1.47013C14.6202 1.59096 14.9393 1.78816 15.204 2.04745C15.5034 2.34066 15.7041 2.742 16.1054 3.54464L17.9109 7.15558C18.0684 7.47057 18.1471 7.62806 18.2027 7.79312C18.252 7.9397 18.2876 8.09055 18.309 8.24372C18.3332 8.41618 18.3332 8.59227 18.3332 8.94443V10.6668C18.3332 12.067 18.3332 12.767 18.0607 13.3018C17.821 13.7722 17.4386 14.1547 16.9681 14.3943C16.4334 14.6668 15.7333 14.6668 14.3332 14.6668H5.6665C4.26637 14.6668 3.56631 14.6668 3.03153 14.3943C2.56112 14.1547 2.17867 13.7722 1.93899 13.3018C1.6665 12.767 1.6665 12.067 1.6665 10.6668V8.94443C1.6665 8.59227 1.6665 8.41618 1.69065 8.24372C1.71209 8.09055 1.7477 7.9397 1.79702 7.79312C1.85255 7.62806 1.9313 7.47057 2.0888 7.15558L3.89426 3.54464C4.29559 2.74199 4.49626 2.34066 4.79562 2.04745C5.06036 1.78816 5.37943 1.59096 5.72974 1.47013C6.12588 1.3335 6.57458 1.3335 7.47197 1.3335Z" stroke="#5599D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
 <span className="truncate flex-1">{t.name}{isDefault && <span className="ml-1 text-[10px] text-primary font-normal">(Default)</span>}</span>
 <DropdownMenu>
  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
   <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity flex-shrink-0">
    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
   </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
   <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); handleEngMySetDefault(t.id); }}>
    <ArrowUpDown className="h-4 w-4 text-primary" /> {isDefault ? "Remove Default" : "Set as Default"}
   </DropdownMenuItem>
   <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); handleEngMyTemplateDuplicate(t); }}>
    <Copy className="h-4 w-4 text-primary" /> Duplicate
   </DropdownMenuItem>
   <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={e => { e.stopPropagation(); setEngMyCtxTemplate(t); setEngMyTemplateSingleDeleteOpen(true); }}>
    <Trash2 className="h-4 w-4" /> Delete
   </DropdownMenuItem>
   <DropdownMenuSeparator />
   <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setEngMyCtxTemplate(t); setEngMyTemplateRenameValue(t.name); setEngMyTemplateRenameOpen(true); }}>
    <Pencil className="h-4 w-4 text-primary" /> Rename
   </DropdownMenuItem>
   {otherFolders.length > 0 && (
    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setEngMyCtxTemplate(t); setEngMyTemplateMoveTargetId(""); setEngMyTemplateMoveOpen(true); }}>
     <Move className="h-4 w-4 text-primary" /> Move
    </DropdownMenuItem>
   )}
  </DropdownMenuContent>
 </DropdownMenu>
 </div>
 );
 })}
 </div>
 );
 });
 })()}
 </div>

 {/* Delete confirmation dialog */}
 <Dialog open={engMyDeleteConfirmOpen} onOpenChange={setEngMyDeleteConfirmOpen}>
  <DialogContent className="sm:max-w-sm text-center">
   <div className="flex flex-col items-center gap-4 pt-2">
    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
     <Trash2 className="h-6 w-6 text-destructive" />
    </div>
    <div className="space-y-1.5">
     <DialogTitle className="text-lg font-bold">Delete engagement template(s)</DialogTitle>
     <DialogDescription className="text-sm text-muted-foreground">
      You are trying to delete engagement template(s) under Templates. Are you sure you want to continue?
     </DialogDescription>
    </div>
    <div className="flex gap-3 w-full pt-1">
     <Button variant="outline" className="flex-1" onClick={() => setEngMyDeleteConfirmOpen(false)}>Cancel</Button>
     <Button
      variant="destructive"
      className="flex-1"
      onClick={() => {
       setEngMyDeleteConfirmOpen(false);
       const toDelete = new Set(engMySelectedIds);
       const count = toDelete.size;
       const remaining = myEngagementTemplates.filter(t => !toDelete.has(t.id));
       writeJsonToLocalStorage("myEngagementTemplates", remaining);
       setMyEngagementTemplates(remaining);
       setEngMySelectedIds(new Set());
       if (searchParams.get("myTemplate") && toDelete.has(searchParams.get("myTemplate")!)) {
        setSearchParams({}, { replace: true });
       }
       toast({ title: `${count} template${count > 1 ? "s" : ""} deleted` });
      }}
     >Delete</Button>
    </div>
   </div>
  </DialogContent>
 </Dialog>

 {/* Folder rename dialog */}
 <Dialog open={engMyFolderRenameOpen} onOpenChange={setEngMyFolderRenameOpen}>
  <DialogContent className="sm:max-w-sm">
   <DialogHeader>
    <DialogTitle>Rename folder</DialogTitle>
    <DialogDescription>Enter a new name for "{engMyCtxFolder?.name}"</DialogDescription>
   </DialogHeader>
   <div className="py-2">
    <Input
     value={engMyFolderRenameValue}
     onChange={e => setEngMyFolderRenameValue(e.target.value)}
     onKeyDown={e => { if (e.key === "Enter") handleEngMyFolderRenameConfirm(); }}
     autoFocus
    />
   </div>
   <DialogFooter>
    <Button variant="outline" onClick={() => setEngMyFolderRenameOpen(false)}>Cancel</Button>
    <Button onClick={handleEngMyFolderRenameConfirm} disabled={!engMyFolderRenameValue.trim()}>Rename</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>

 {/* Folder delete confirm dialog */}
 <Dialog open={engMyFolderDeleteOpen} onOpenChange={setEngMyFolderDeleteOpen}>
  <DialogContent className="sm:max-w-sm text-center">
   <div className="flex flex-col items-center gap-4 pt-2">
    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
     <Trash2 className="h-6 w-6 text-destructive" />
    </div>
    <div className="space-y-1.5">
     <DialogTitle className="text-lg font-bold">Delete folder</DialogTitle>
     <DialogDescription className="text-sm text-muted-foreground">
      Delete "{engMyCtxFolder?.name}" and all {engMyCtxFolder?.templates.length ?? 0} template(s) inside? This cannot be undone.
     </DialogDescription>
    </div>
    <div className="flex gap-3 w-full pt-1">
     <Button variant="outline" className="flex-1" onClick={() => setEngMyFolderDeleteOpen(false)}>Cancel</Button>
     <Button variant="destructive" className="flex-1" onClick={handleEngMyFolderDelete}>Delete</Button>
    </div>
   </div>
  </DialogContent>
 </Dialog>

 {/* Template rename dialog */}
 <Dialog open={engMyTemplateRenameOpen} onOpenChange={setEngMyTemplateRenameOpen}>
  <DialogContent className="sm:max-w-sm">
   <DialogHeader>
    <DialogTitle>Rename template</DialogTitle>
    <DialogDescription>Enter a new name for "{engMyCtxTemplate?.name}"</DialogDescription>
   </DialogHeader>
   <div className="py-2">
    <Input
     value={engMyTemplateRenameValue}
     onChange={e => setEngMyTemplateRenameValue(e.target.value)}
     onKeyDown={e => { if (e.key === "Enter") handleEngMyTemplateRenameConfirm(); }}
     autoFocus
    />
   </div>
   <DialogFooter>
    <Button variant="outline" onClick={() => setEngMyTemplateRenameOpen(false)}>Cancel</Button>
    <Button onClick={handleEngMyTemplateRenameConfirm} disabled={!engMyTemplateRenameValue.trim()}>Rename</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>

 {/* Template single delete confirm dialog */}
 <Dialog open={engMyTemplateSingleDeleteOpen} onOpenChange={setEngMyTemplateSingleDeleteOpen}>
  <DialogContent className="sm:max-w-sm text-center">
   <div className="flex flex-col items-center gap-4 pt-2">
    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
     <Trash2 className="h-6 w-6 text-destructive" />
    </div>
    <div className="space-y-1.5">
     <DialogTitle className="text-lg font-bold">Delete template</DialogTitle>
     <DialogDescription className="text-sm text-muted-foreground">
      Delete "{engMyCtxTemplate?.name}"? This cannot be undone.
     </DialogDescription>
    </div>
    <div className="flex gap-3 w-full pt-1">
     <Button variant="outline" className="flex-1" onClick={() => setEngMyTemplateSingleDeleteOpen(false)}>Cancel</Button>
     <Button variant="destructive" className="flex-1" onClick={handleEngMyTemplateSingleDelete}>Delete</Button>
    </div>
   </div>
  </DialogContent>
 </Dialog>

 {/* Template move dialog */}
 <Dialog open={engMyTemplateMoveOpen} onOpenChange={setEngMyTemplateMoveOpen}>
  <DialogContent className="sm:max-w-sm">
   <DialogHeader>
    <DialogTitle>Move template</DialogTitle>
    <DialogDescription>Choose a folder to move "{engMyCtxTemplate?.name}" to</DialogDescription>
   </DialogHeader>
   <div className="py-2">
    <Select value={engMyTemplateMoveTargetId} onValueChange={setEngMyTemplateMoveTargetId}>
     <SelectTrigger className="w-full">
      <SelectValue placeholder="Select folder" />
     </SelectTrigger>
     <SelectContent>
      {Object.values(
       myEngagementTemplates.reduce((acc, x) => { acc[x.folderId] = { id: x.folderId, name: x.folderName }; return acc; }, {} as Record<string, {id: string; name: string}>)
      ).filter(f => f.id !== engMyCtxTemplate?.folderId).map(f => (
       <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
      ))}
     </SelectContent>
    </Select>
   </div>
   <DialogFooter>
    <Button variant="outline" onClick={() => setEngMyTemplateMoveOpen(false)}>Cancel</Button>
    <Button onClick={handleEngMyTemplateMoveConfirm} disabled={!engMyTemplateMoveTargetId}>Move</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>

 </>
 ) : selectedDropdown === "checklists" ? (
 <>
 <div className={`flex mb-2 ${isTemplatesPanelCollapsed ? "hidden" : ""}`} style={{
 borderBottom: hasDarkSecondary ? "1px solid rgba(255,255,255,0.15)" : "1px solid hsl(var(--border))"
 }}>
 <button onClick={() => setActiveTab("firm")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "firm" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 My Templates
 </button>
 <button onClick={() => setActiveTab("master")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "master" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 Global Templates
 </button>
 </div>

 <div className={`p-3 pt-1 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")} />
 <Input placeholder="Search" className={cn("pl-8 h-8 text-sm border-0 shadow-sm", hasDarkSecondary ? "bg-white/10 text-white placeholder:text-white/40" : "bg-card/80")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
 </div>
 <button className={cn("h-9 w-9 rounded-md flex items-center justify-center transition-colors", hasDarkSecondary ? "bg-white/10 hover:bg-white/20" : "bg-primary/10 hover:bg-primary/20")}>
 <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583L2.08325 10.4163" stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 </button>
 {activeTab === "firm" && (
 <>
 <Button size="icon" className="h-9 w-9 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm">
 <Plus className="h-4 w-4 text-primary-foreground icon-plus" />
 </Button>
 <Button size="icon" variant="secondary" className="h-9 w-9 text-destructive hover:text-destructive focus-visible:text-destructive">
 <Trash2 className="h-4 w-4" />
 </Button>
 </>
 )}
 {activeTab === "master" && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 size="icon"
 className="h-9 w-9 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm"
 disabled={selectedTemplates.size === 0}
 onClick={() => setBulkAddDialogOpen(true)}
 >
 <Files className="h-4 w-4 text-primary-foreground" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>
 {selectedTemplates.size > 0
 ? `Add ${selectedTemplates.size} selected to My Templates`
 : "Select templates to add"}
 </TooltipContent>
 </Tooltip>
 )}
 </div>
 </div>

 <div className={`flex-1 overflow-y-auto p-2 pt-0 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {(() => {
 const sq = searchQuery.trim().toLowerCase();
 if (!sq) {
 return activeTab === "firm"
 ? templates.map(template => renderTemplate(template))
 : globalTemplates.map(template => renderGlobalTemplate(template));
 }
 const globalMatch = (t: GlobalTemplate): boolean =>
 t.name.toLowerCase().includes(sq) || (t.children?.some(globalMatch) ?? false);
 const myMatch = (t: Template): boolean =>
 t.name.toLowerCase().includes(sq) ||
 getChecklistsForFolder(t.id).some(c => c.name.toLowerCase().includes(sq)) ||
 (t.children?.some(myMatch) ?? false);
 const hasMatch = activeTab === "firm"
 ? templates.some(myMatch)
 : globalTemplates.some(globalMatch);
 if (!hasMatch) return (
 <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
 <Search className={cn("h-6 w-6 mb-2", hasDarkSecondary ? "text-white/30" : "text-muted-foreground/40")} />
 <p className={cn("text-xs font-medium", hasDarkSecondary ? "text-white/60" : "text-foreground")}>No results for &ldquo;{searchQuery}&rdquo;</p>
 <p className={cn("text-[10px] mt-0.5", hasDarkSecondary ? "text-white/40" : "text-muted-foreground")}>Try a different term</p>
 </div>
 );
 return activeTab === "firm"
 ? templates.map(template => renderTemplate(template))
 : globalTemplates.map(template => renderGlobalTemplate(template));
 })()}
 </div>
 </>
 ) : selectedDropdown === "worksheets" ? (
 <>
 <div className={`flex mb-2 ${isTemplatesPanelCollapsed ? "hidden" : ""}`} style={{
 borderBottom: hasDarkSecondary ? "1px solid rgba(255,255,255,0.15)" : "1px solid hsl(var(--border))"
 }}>
 <button onClick={() => setActiveTab("firm")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "firm" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 My Templates
 </button>
 <button onClick={() => setActiveTab("master")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "master" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 Global Templates
 </button>
 </div>

 <div className={`p-3 pt-1 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")} />
 <Input placeholder="Search" className={cn("pl-8 h-8 text-sm border-0 shadow-sm", hasDarkSecondary ? "bg-white/10 text-white placeholder:text-white/40" : "bg-card/80")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
 </div>
 {activeTab === "firm" && (
 <>
 <Button size="icon" className="h-9 w-9 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm">
 <Plus className="h-4 w-4 text-primary-foreground icon-plus" />
 </Button>
 <Button size="icon" variant="secondary" className="h-9 w-9 text-destructive hover:text-destructive focus-visible:text-destructive">
 <Trash2 className="h-4 w-4" />
 </Button>
 </>
 )}
 </div>
 </div>

 <div className={`flex-1 overflow-y-auto p-2 pt-0 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {activeTab === "firm" ? (
 <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
 <p className={cn("text-sm font-medium", hasDarkSecondary ? "text-white/70" : "text-muted-foreground")}>No worksheets yet</p>
 <p className={cn("text-xs", hasDarkSecondary ? "text-white/40" : "text-muted-foreground/70")}>Copy from Global Templates to get started</p>
 </div>
 ) : (() => {
 const sq = searchQuery.trim().toLowerCase();
 const wsMatch = (t: GlobalTemplate): boolean =>
 t.name.toLowerCase().includes(sq) || (t.children?.some(wsMatch) ?? false);
 if (sq && !globalWorksheets.some(wsMatch)) return (
 <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
 <Search className={cn("h-6 w-6 mb-2", hasDarkSecondary ? "text-white/30" : "text-muted-foreground/40")} />
 <p className={cn("text-xs font-medium", hasDarkSecondary ? "text-white/60" : "text-foreground")}>No results for &ldquo;{searchQuery}&rdquo;</p>
 <p className={cn("text-[10px] mt-0.5", hasDarkSecondary ? "text-white/40" : "text-muted-foreground")}>Try a different term</p>
 </div>
 );
 return globalWorksheets.map(t => renderGlobalTemplate(t, 0, toggleGlobalWorksheet));
 })()}
 </div>
 </>
 ) : selectedDropdown === "reports" ? (
 <>
 {/* My / Global tabs */}
 <div className={`flex mb-2 ${isTemplatesPanelCollapsed ? "hidden" : ""}`} style={{
 borderBottom: hasDarkSecondary ? "1px solid rgba(255,255,255,0.15)" : "1px solid hsl(var(--border))"
 }}>
 <button onClick={() => setActiveTab("firm")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "firm" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 My Templates
 </button>
 <button onClick={() => setActiveTab("master")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "master" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 Global Templates
 </button>
 </div>
 <div className={`flex-1 overflow-y-auto p-2 pt-0 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {activeTab === "firm" ? (
 <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
 <p className={cn("text-sm font-medium", hasDarkSecondary ? "text-white/70" : "text-muted-foreground")}>No reports yet</p>
 <p className={cn("text-xs", hasDarkSecondary ? "text-white/40" : "text-muted-foreground/70")}>Copy from Global Templates to get started</p>
 </div>
 ) : (
 globalReports.map(t => renderGlobalTemplate(t, 0, toggleGlobalReport))
 )}
 </div>
 </>
 ) : selectedDropdown === "letters" ? (
 <>
 {/* My / Global tabs */}
 <div className={`flex mb-2 ${isTemplatesPanelCollapsed ? "hidden" : ""}`} style={{
 borderBottom: hasDarkSecondary ? "1px solid rgba(255,255,255,0.15)" : "1px solid hsl(var(--border))"
 }}>
 <button onClick={() => setActiveTab("firm")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "firm" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 My Templates
 </button>
 <button onClick={() => setActiveTab("master")} className={`flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${activeTab === "master" ? (hasDarkSecondary ? "text-white border-white" : "text-primary border-primary") : (hasDarkSecondary ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground") + " border-transparent"}`}>
 Global Templates
 </button>
 </div>
 <div className={`flex-1 overflow-y-auto p-2 pt-0 ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {activeTab === "firm" ? (
 <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
 <p className={cn("text-sm font-medium", hasDarkSecondary ? "text-white/70" : "text-muted-foreground")}>No letters yet</p>
 <p className={cn("text-xs", hasDarkSecondary ? "text-white/40" : "text-muted-foreground/70")}>Copy from Global Templates to get started</p>
 </div>
 ) : (
 globalLetters.map(t => renderGlobalTemplate(t, 0, toggleGlobalLetter))
 )}
 </div>
 </>
 ) : selectedDropdown === "financial-statements" ? (
 <div className={`flex-1 flex flex-col overflow-hidden ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 <FinancialStatementsPanelContent hasDarkSecondary={hasDarkSecondary} />
 </div>
 ) : (
 /* Empty state for Notes */
 <div className={`flex-1 flex flex-col items-center justify-center gap-3 px-4 py-8 text-center ${isTemplatesPanelCollapsed ? "hidden" : ""}`}>
 {(() => {
 const item = dropdownItems.find(i => i.id === selectedDropdown);
 if (!item) return null;
 const Icon = item.icon;
 return <>
 <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", hasDarkSecondary ? "bg-white/10" : "bg-muted")}>
 <Icon className={`h-6 w-6 ${item.color}`} />
 </div>
 <div>
 <p className={cn("text-sm font-medium", hasDarkSecondary ? "text-white" : "text-foreground")}>
 No {item.label} yet
 </p>
 <p className={cn("text-xs mt-1", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")}>
 Templates you create will appear here
 </p>
 </div>
 <Button
 size="sm"
 className="mt-1 h-8 px-3 text-xs bg-[#1C63A6] hover:bg-[#1a5a9e] text-white"
 onClick={() => navigate("/create", { state: { contentType: selectedDropdown } })}
 >
 <Plus className="h-3.5 w-3.5 mr-1" />
 Create {item.label.replace("Notes to Financial Statements", "Notes")}
 </Button>
 </>;
 })()}
 </div>
 )}

 {/* Resize handle */}
 {!isTemplatesPanelCollapsed && (
 <div
 className={cn(
 "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-30 transition-all duration-150",
 isResizing
 ? "bg-primary"
 : isResizeHovering
 ? "bg-border"
 : "bg-transparent hover:bg-border"
 )}
 onMouseDown={startResizing}
 onMouseEnter={() => setIsResizeHovering(true)}
 onMouseLeave={() => !isResizing && setIsResizeHovering(false)}
 >
 <div className="absolute -left-1 -right-1 top-0 bottom-0" />
 </div>
 )}

 </div>
 </>, portalTarget)}

 {/* Rename Dialog */}
 <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Rename Checklist</DialogTitle>
 </DialogHeader>
 <div className="py-4">
 <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Enter new name" className="w-full" autoFocus onKeyDown={e => {
 if (e.key === "Enter") handleRenameConfirm();
 }} />
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button onClick={handleRenameConfirm} disabled={!renameValue.trim()}>
 <Pencil className="h-4 w-4" />
 Rename
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Add Section Dialog */}
 <Dialog open={addSectionModal?.open ?? false} onOpenChange={open => !open && setAddSectionModal(null)}>
 <DialogContent className="sm:max-w-[420px]">
 <DialogHeader>
 <div className="flex items-start gap-3 mb-1">
 <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
 <Check className="h-5 w-5 text-green-600" />
 </div>
 <div>
 <DialogTitle>Add Section</DialogTitle>
 <p className="text-xs text-muted-foreground mt-0.5">Enter section name and select a section category</p>
 </div>
 </div>
 </DialogHeader>
 <div className="py-2 space-y-4">
 <div>
 <label className="text-sm font-medium mb-1.5 block">Section name <span className="text-destructive">*</span></label>
 <Input
 value={addSectionName}
 onChange={e => setAddSectionName(e.target.value)}
 placeholder="Section Name"
 autoFocus
 onKeyDown={e => e.key === 'Enter' && addSectionName.trim() && handleAddSection()}
 />
 </div>
 <div>
 <label className="text-sm font-medium mb-1.5 block">Category <span className="text-destructive">*</span></label>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all border border-border bg-white dark:bg-card flex items-center justify-between">
 <div className="flex items-center gap-2">
 {addSectionCategory === 'letter' ? <LetterIcon className="h-4 w-4 text-purple-500" /> : <ChecklistIcon className="h-4 w-4 text-orange-500" />}
 <span>{addSectionCategory === 'letter' ? 'Letters' : 'Checklists'}</span>
 </div>
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent className="w-[360px]">
 <DropdownMenuItem onClick={() => setAddSectionCategory('checklist')} className="flex items-center gap-2 cursor-pointer">
 <ChecklistIcon className="h-4 w-4 text-orange-500" /> Checklists
 {addSectionCategory === 'checklist' && <Check className="h-4 w-4 text-primary ml-auto" />}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => setAddSectionCategory('letter')} className="flex items-center gap-2 cursor-pointer">
 <LetterIcon className="h-4 w-4 text-purple-500" /> Letters
 {addSectionCategory === 'letter' && <Check className="h-4 w-4 text-primary ml-auto" />}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setAddSectionModal(null)}>Cancel</Button>
 <Button onClick={handleAddSection} disabled={!addSectionName.trim()}>Add</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Add Folder Dialog */}
 <Dialog open={!!addFolderModal} onOpenChange={open => !open && setAddFolderModal(null)}>
 <DialogContent className="sm:max-w-[380px]">
 <DialogHeader>
 <div className="flex items-start gap-3 mb-1">
 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
 <FolderPlus className="h-5 w-5 text-blue-600" />
 </div>
 <div>
 <DialogTitle>Add Folder</DialogTitle>
 <p className="text-xs text-muted-foreground mt-0.5">Enter a name for the new folder</p>
 </div>
 </div>
 </DialogHeader>
 <div className="py-2">
 <label className="text-sm font-medium mb-1.5 block">Folder name <span className="text-destructive">*</span></label>
 <Input
 value={addFolderName}
 onChange={e => setAddFolderName(e.target.value)}
 placeholder="Folder name"
 autoFocus
 onKeyDown={e => e.key === 'Enter' && addFolderName.trim() && handleAddFolder()}
 />
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setAddFolderModal(null)}>Cancel</Button>
 <Button onClick={handleAddFolder} disabled={!addFolderName.trim()}>Add</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Add Note Dialog */}
 <Dialog open={!!addNoteModal} onOpenChange={open => { if (!open) { setAddNoteModal(null); setAddNoteName(''); } }}>
 <DialogContent className="sm:max-w-[380px] grid-cols-1">
 <DialogHeader>
 <div className="flex items-start gap-3 mb-1">
 <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
 <NotebookPen className="h-5 w-5 text-amber-600" />
 </div>
 <div>
 <DialogTitle>Add Note</DialogTitle>
 <p className="text-xs text-muted-foreground mt-0.5">Add a note to <span className="font-medium">{addNoteModal?.nodeLabel}</span></p>
 </div>
 </div>
 </DialogHeader>
 <div className="py-2">
 <label className="text-sm font-medium mb-1.5 block">Note name</label>
 <Input
 value={addNoteName}
 onChange={e => setAddNoteName(e.target.value)}
 placeholder="Notes"
 autoFocus
 onKeyDown={e => e.key === 'Enter' && handleAddNote()}
 />
 <p className="text-xs text-muted-foreground mt-1.5">
 Will be saved as <span className="font-mono font-medium">{addNoteModal?.nodeCode ?? 'N'}-{((nodeDocuments[addNoteModal?.nodeId ?? ''] ?? []).filter(d => d.type === 'note').length) + 1}-{addNoteName.trim() || 'Notes'}</span>
 </p>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => { setAddNoteModal(null); setAddNoteName(''); }}>Cancel</Button>
 <Button onClick={handleAddNote}>Add Note</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Move to Folder Dialog */}
 <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Move to Folder</DialogTitle>
 </DialogHeader>
 <div className="py-4">
 <p className="text-sm text-muted-foreground mb-3">
 Select a folder to move "{selectedChecklist?.name}" to:
 </p>
 <div className="border rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto bg-background">
 {templates.map(folder => <div key={folder.id} className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors ${selectedMoveFolder === folder.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`} onClick={() => setSelectedMoveFolder(folder.id)}>
 <Folder className={`h-4 w-4 ${selectedMoveFolder === folder.id ? "text-primary" : "text-muted-foreground"}`} />
 <span className="text-sm truncate flex-1">{folder.name}</span>
 {selectedMoveFolder === folder.id && <Check className="h-4 w-4 text-primary" />}
 </div>)}
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button onClick={handleMoveConfirm} disabled={!selectedMoveFolder || selectedMoveFolder === selectedChecklist?.folderId}>
 <FolderInput className="h-4 w-4" />
 Move
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Engagement Templates Global Picker Panel */}
 {engPickerOpen && (
  <div className={cn("fixed inset-y-0 right-0 z-50 w-80 flex flex-col shadow-2xl border-l", hasDarkSecondary ? "bg-[#1a2235] border-white/10" : "bg-background border-border")}>
   <div className={cn("flex items-center justify-between px-4 py-3 flex-shrink-0 border-b", hasDarkSecondary ? "border-white/10" : "border-border")}>
    <div>
     <h3 className={cn("text-sm font-semibold", hasDarkSecondary ? "text-white" : "text-foreground")}>Global Templates</h3>
     <p className={cn("text-xs mt-0.5", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")}>Select templates to add to My Templates</p>
    </div>
    <button
     className={cn("h-7 w-7 rounded-md flex items-center justify-center transition-colors", hasDarkSecondary ? "hover:bg-white/10" : "hover:bg-muted")}
     onClick={() => { setEngPickerOpen(false); setSelectedEngTemplates(new Set()); setEngTemplateSearchQuery(""); }}
    >
     <X className={cn("h-4 w-4", hasDarkSecondary ? "text-white/60" : "text-muted-foreground")} />
    </button>
   </div>
   <div className={cn("px-3 py-2 flex-shrink-0 border-b", hasDarkSecondary ? "border-white/10" : "border-border")}>
    <Select
     value={engPickerCountry}
     onValueChange={(v) => { setEngPickerCountry(v as "CA" | "US"); setEngTemplateExpandedFolders(new Set()); setSelectedEngTemplates(new Set()); }}
    >
     <SelectTrigger className={cn("h-8 text-xs font-medium w-full", hasDarkSecondary ? "bg-white/10 border-white/20 text-white" : "")}>
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="CA">🇨🇦 Canada</SelectItem>
      <SelectItem value="US">🇺🇸 United States</SelectItem>
     </SelectContent>
    </Select>
   </div>
   <div className="p-3 flex gap-2 flex-shrink-0">
    <div className="relative flex-1">
     <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")} />
     <Input placeholder="Search templates" className={cn("pl-8 h-8 text-sm border-0 shadow-sm", hasDarkSecondary ? "bg-white/10 text-white placeholder:text-white/40" : "bg-card/80")} value={engTemplateSearchQuery} onChange={e => setEngTemplateSearchQuery(e.target.value)} />
    </div>
    <Tooltip>
     <TooltipTrigger asChild>
      <button
       className={cn("h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0", hasDarkSecondary ? "bg-white/10 hover:bg-white/20" : "bg-primary/10 hover:bg-primary/20")}
       onClick={handleEngExpandCollapseAll}
      >
       {allEngExpanded ? (
        <svg width="15" height="15" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583L2.08325 10.4163" stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
       ) : (
        <svg width="15" height="15" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M2.08325 6.94412L2.08325 2.08301M2.08325 2.08301L6.24992 2.08301M2.08325 2.08301L6.94436 6.94412M14.5833 9.7219L14.5833 14.583M14.5833 14.583L10.4166 14.583M14.5833 14.583L9.72214 9.7219" stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
       )}
      </button>
     </TooltipTrigger>
     <TooltipContent>{allEngExpanded ? "Collapse All" : "Expand All"}</TooltipContent>
    </Tooltip>
   </div>
   <div className="flex-1 overflow-y-auto p-2 pt-0">
    {(() => {
     const etq = engTemplateSearchQuery.trim().toLowerCase();
     const engTreeHasMatch = !etq || activeEngPickerTree.some(function check(it): boolean {
      return it.label.toLowerCase().includes(etq) || (it.children?.some(check) ?? false);
     });
     if (!engTreeHasMatch) return (
      <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
       <Search className={cn("h-6 w-6 mb-2", hasDarkSecondary ? "text-white/30" : "text-muted-foreground/40")} />
       <p className={cn("text-xs font-medium", hasDarkSecondary ? "text-white/60" : "text-foreground")}>No results for &ldquo;{engTemplateSearchQuery}&rdquo;</p>
       <p className={cn("text-[10px] mt-0.5", hasDarkSecondary ? "text-white/40" : "text-muted-foreground")}>Try a different term</p>
      </div>
     );
     return activeEngPickerTree.map((item) => renderEngTemplateTreeNode(item, 0));
    })()}
   </div>
   <div className={cn("p-3 flex-shrink-0 border-t", hasDarkSecondary ? "border-white/10" : "border-border")}>
    <Button
     className="w-full h-9 bg-[#1C63A6] hover:bg-[#1a5a9e]"
     disabled={selectedEngTemplates.size === 0}
     onClick={() => { setEngPickerOpen(false); setEngBulkAddDialogOpen(true); }}
    >
     <Files className="h-4 w-4 mr-2" />
     {selectedEngTemplates.size > 0
      ? `Add ${selectedEngTemplates.size} Template${selectedEngTemplates.size !== 1 ? "s" : ""}`
      : "Select templates above"}
    </Button>
   </div>
  </div>
 )}
 {/* Bulk Add to My Templates Dialog */}
 <BulkAddToMyTemplatesDialog
 open={bulkAddDialogOpen}
 onOpenChange={setBulkAddDialogOpen}
 selectedTemplates={getSelectedTemplateDetails()}
 onSuccess={clearSelection}
 getChecklistData={(templateId) => getGlobalTemplateChecklist(templateId)}
 />

 <BulkAddToMyTemplatesDialog
 open={engBulkAddDialogOpen}
 onOpenChange={setEngBulkAddDialogOpen}
 selectedTemplates={Array.from(selectedEngTemplates).map(id => ({
 id,
 name: getEngPickerTemplateView(id)?.title || engPickerLabelById[id] || id,
 }))}
 onSuccess={() => setSelectedEngTemplates(new Set())}
 getChecklistData={(templateId) => getGlobalTemplateChecklist(templateId)}
 variant="engagement"
 getTemplateViewData={(templateId) => getEngPickerTemplateView(templateId)}
 />

 {/* Signoffs Overlay */}
 <SignoffsOverlay
 open={showSignoffs}
 onClose={() => setShowSignoffs(false)}
 anchorLeft={56}
 />

 {/* Add Document Modal */}
 <Dialog open={!!addDocModal} onOpenChange={open => { if (!open) { setAddDocModal(null); setPendingDocFiles([]); } }}>
 <DialogContent className="sm:max-w-[420px] grid-cols-1">
 <DialogHeader>
 <DialogTitle className="text-base font-semibold">Add a Document</DialogTitle>
 </DialogHeader>
 <div className="flex flex-col gap-3 py-2">
 {/* Staged files list */}
 {pendingDocFiles.length > 0 && (
 <div className="flex flex-col gap-1">
 {pendingDocFiles.map((f, i) => (
 <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm min-w-0 overflow-hidden">
 {getFileTypeIcon(f.name)}
 <span className="truncate flex-1 min-w-0 text-foreground font-medium">{f.name}</span>
 <button
 className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
 onClick={() => setPendingDocFiles(prev => prev.filter((_, j) => j !== i))}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 {/* Upload zone */}
 <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 px-4 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
 <Upload className="h-6 w-6 text-muted-foreground" />
 <span className="text-sm text-muted-foreground">
 <span className="text-primary font-medium cursor-pointer">Click to upload</span>
 {' '}or drag and drop
 </span>
 <input
 type="file"
 multiple
 className="hidden"
 onChange={e => {
 const files = Array.from(e.target.files ?? []);
 setPendingDocFiles(prev => [...prev,...files.map(f => ({ name: f.name }))]);
 e.target.value = '';
 }}
 />
 </label>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="outline" size="sm" onClick={() => { setAddDocModal(null); setPendingDocFiles([]); }}>Cancel</Button>
 <Button size="sm" disabled={pendingDocFiles.length === 0} onClick={handleAddDocs}>Add</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Register New Office Dialog */}
 <Dialog open={registerFirmOpen} onOpenChange={setRegisterFirmOpen}>
  <DialogContent className="max-w-md">
   <DialogHeader>
    <DialogTitle>
     {newFirmStep === 1 && "Register a New Office"}
     {newFirmStep === 2 && "Office Already Registered"}
     {newFirmStep === 3 && "Office Registered"}
    </DialogTitle>
    <DialogDescription>
     {newFirmStep === 1 && "Each office is a separate firm entity in its own region. Data stays strictly within that region."}
     {newFirmStep === 2 && "A firm with a similar name exists in another region."}
     {newFirmStep === 3 && "You can now switch to this office using the firm switcher in the sidebar."}
    </DialogDescription>
   </DialogHeader>

   {newFirmStep === 1 && (
    <div className="space-y-4 py-1">
     <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Firm / Office Name</label>
      <Input
       value={newFirmData.name}
       onChange={e => setNewFirmData(prev => ({ ...prev, name: e.target.value }))}
       placeholder="e.g. Ascend LLP — Toronto Office"
      />
     </div>
     <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Region</label>
      <div className="flex gap-2">
       {(["ca", "us"] as const).map(r => (
        <button
         key={r}
         onClick={() => setNewFirmData(prev => ({ ...prev, region: r }))}
         className={cn(
          "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
          newFirmData.region === r
           ? "border-primary bg-primary/10 text-primary"
           : "border-border text-muted-foreground hover:bg-muted/50"
         )}
        >
         {r === "ca" ? "🇨🇦 Canada" : "🇺🇸 United States"}
        </button>
       ))}
      </div>
     </div>
     <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">City</label>
      <Input
       value={newFirmData.city}
       onChange={e => setNewFirmData(prev => ({ ...prev, city: e.target.value }))}
       placeholder="e.g. Toronto, ON"
      />
     </div>
     <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Firm Group</label>
      <div className="flex gap-2">
       {(["existing", "new"] as const).map(choice => (
        <button
         key={choice}
         onClick={() => setNewFirmData(prev => ({ ...prev, firmGroupChoice: choice }))}
         className={cn(
          "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
          newFirmData.firmGroupChoice === choice
           ? "border-primary bg-primary/10 text-primary"
           : "border-border text-muted-foreground hover:bg-muted/50"
         )}
        >
         {choice === "existing" ? "Existing Group" : "New Group"}
        </button>
       ))}
      </div>
      {newFirmData.firmGroupChoice === "new" && (
       <Input
        value={newFirmData.newGroupName}
        onChange={e => setNewFirmData(prev => ({ ...prev, newGroupName: e.target.value }))}
        placeholder="e.g. Maple Grove Group"
       />
      )}
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
       id="isMainOffice"
       checked={newFirmData.isMainOffice}
       onCheckedChange={checked => setNewFirmData(prev => ({ ...prev, isMainOffice: !!checked }))}
      />
      <label htmlFor="isMainOffice" className="text-sm font-medium text-foreground cursor-pointer">Set as Main Office</label>
     </div>
     <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
       Each office is registered as a separate entity. A user with access to multiple offices can switch between them using the firm switcher. Data never crosses regions.
      </p>
     </div>
    </div>
   )}

   {newFirmStep === 2 && (
    <div className="space-y-3 py-1">
     <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30 p-4 space-y-2">
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">⚠ Similar Firm Found in Another Region</p>
      <p className="text-sm text-amber-600 dark:text-amber-500">
       It looks like <span className="font-semibold">{newFirmData.name}</span> may already be registered in another region. You can still register a separate office for {newFirmData.region === "ca" ? "🇨🇦 Canada" : "🇺🇸 United States"}. Each office will have its own data cell — nothing is shared across regions.
      </p>
     </div>
    </div>
   )}

   {newFirmStep === 3 && (
    <div className="space-y-3 py-1">
     <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800/30 p-4 space-y-2">
      <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Office Registered Successfully</p>
      <p className="text-sm text-green-600 dark:text-green-500">
       <span className="font-semibold">{newFirmData.name}</span> has been registered as a {newFirmData.region === "ca" ? "🇨🇦 Canadian" : "🇺🇸 US"} office. Switch to it anytime from the firm switcher at the top of the sidebar.
      </p>
     </div>
    </div>
   )}

   <DialogFooter>
    {newFirmStep === 1 && (
     <>
      <Button variant="outline" onClick={() => setRegisterFirmOpen(false)}>Cancel</Button>
      <Button
       disabled={!newFirmData.name.trim() || !newFirmData.city.trim()}
       className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white"
       onClick={() => {
        const nameKey = newFirmData.name.trim().split(" ")[0].toLowerCase();
        const existsInOtherRegion = firmProfiles.some(
         f => f.name.toLowerCase().startsWith(nameKey) && f.region !== newFirmData.region
        );
        if (existsInOtherRegion) {
         setNewFirmStep(2);
        } else {
         const initials = newFirmData.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
         const existingGroup = firmProfiles.find(f => (f as any).firmGroupId);
         const groupInfo = newFirmData.firmGroupChoice === "existing" && existingGroup
          ? { firmGroupId: (existingGroup as any).firmGroupId, firmGroupName: (existingGroup as any).firmGroupName }
          : { firmGroupId: `group-${(newFirmData.newGroupName.trim() || newFirmData.name.trim()).toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, firmGroupName: newFirmData.newGroupName.trim() || newFirmData.name.trim() };
         const newFirm: FirmProfile = {
          id: `firm-${newFirmData.region}-${Date.now()}`,
          name: newFirmData.name.trim(),
          region: newFirmData.region,
          city: newFirmData.city.trim(),
          initials,
          color: newFirmData.region === "ca" ? "bg-red-600" : "bg-blue-600",
          ...groupInfo,
          isMainOffice: newFirmData.isMainOffice,
         };
         const updated1 = [...firmProfiles, newFirm];
         setFirmProfiles(updated1);
         localStorage.setItem("firmProfiles", JSON.stringify(updated1));
         localStorage.setItem("activeFirmId", newFirm.id);
         window.dispatchEvent(new CustomEvent("firm-profiles-updated"));
         window.dispatchEvent(new CustomEvent("firmSwitched"));
         setActiveFirmId(newFirm.id);
         setNewFirmStep(3);
        }
       }}
      >
       Continue
      </Button>
     </>
    )}
    {newFirmStep === 2 && (
     <>
      <Button variant="outline" onClick={() => setNewFirmStep(1)}>Back</Button>
      <Button
       className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white"
       onClick={() => {
        const initials = newFirmData.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        const existingGroup2 = firmProfiles.find(f => (f as any).firmGroupId);
        const groupInfo2 = newFirmData.firmGroupChoice === "existing" && existingGroup2
         ? { firmGroupId: (existingGroup2 as any).firmGroupId, firmGroupName: (existingGroup2 as any).firmGroupName }
         : { firmGroupId: `group-${(newFirmData.newGroupName.trim() || newFirmData.name.trim()).toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, firmGroupName: newFirmData.newGroupName.trim() || newFirmData.name.trim() };
        const newFirm: FirmProfile = {
         id: `firm-${newFirmData.region}-${Date.now()}`,
         name: newFirmData.name.trim(),
         region: newFirmData.region,
         city: newFirmData.city.trim(),
         initials,
         color: newFirmData.region === "ca" ? "bg-red-600" : "bg-blue-600",
         ...groupInfo2,
         isMainOffice: newFirmData.isMainOffice,
        };
        const updated2 = [...firmProfiles, newFirm];
        setFirmProfiles(updated2);
        localStorage.setItem("firmProfiles", JSON.stringify(updated2));
        localStorage.setItem("activeFirmId", newFirm.id);
        window.dispatchEvent(new CustomEvent("firm-profiles-updated"));
        window.dispatchEvent(new CustomEvent("firmSwitched"));
        setActiveFirmId(newFirm.id);
        setNewFirmStep(3);
       }}
      >
       Register as Separate Office
      </Button>
     </>
    )}
    {newFirmStep === 3 && (
     <Button
      className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white"
      onClick={() => setRegisterFirmOpen(false)}
     >
      Done
     </Button>
    )}
   </DialogFooter>
  </DialogContent>
 </Dialog>
 {switchingFirm && (
  <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
   <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
   <p className="text-sm font-medium text-foreground">
    Switching to {switchingFirm.region === "ca" ? "🇨🇦 CA" : "🇺🇸 US"} workspace…
   </p>
   <p className="text-xs text-muted-foreground">{switchingFirm.name}</p>
  </div>
 )}
 </div>;
}