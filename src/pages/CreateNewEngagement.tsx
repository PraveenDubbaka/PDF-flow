import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEngagements } from "@/store/EngagementsContext";
import { EngagementRecord, setEngagementMeta } from "@/store/engagementsStore";
import { toast } from "sonner";
import intuitQuickbooksLogo from "@/assets/intuit-quickbooks-logo.svg";
import {
  ArrowLeft, Briefcase, Calendar, Users, Plus, Pencil, Trash2,
  Search, ExternalLink, X, Settings2, Check, UserPlus, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplatePickerPanel } from "@/components/TemplatePickerPanel";
import { TEMPLATE_CONFIG } from "@/lib/engagementTemplatesData";

// Mirror of CLIENT_DATA in CreateEngagement.tsx — keep in sync if client data changes
const CLIENT_DATA: Record<string, {
  entityLegalName: string;
  entityType: string;
  contactPerson: string;
  engagementPartner: string;
  integrations: string[];
  businessPhone: string;
  cellPhone: string;
  industryType: string;
  clientCountry: string;
  hasQuebecPersonalInfo: boolean;
  isUsTaxpayer: boolean;
}> = {
  "Harbor Freight Logistics LLC": {
    entityLegalName: "Harbor Freight Logistics LLC",
    entityType: "Corporation",
    contactPerson: "Michael Torres",
    engagementPartner: "Atin Gupta",
    integrations: ["quickbooks"],
    businessPhone: "+1 (604) 555-0192",
    cellPhone: "-",
    industryType: "Transportation & Logistics",
    clientCountry: "ca",
    hasQuebecPersonalInfo: false,
    isUsTaxpayer: false,
  },
  "Shipping Line Inc.": {
    entityLegalName: "Shipping Line Inc.",
    entityType: "Corporation",
    contactPerson: "Sarah Chen",
    engagementPartner: "Atin Gupta",
    integrations: ["quickbooks"],
    businessPhone: "+1 (604) 555-0134",
    cellPhone: "+1 (778) 555-0221",
    industryType: "Transportation & Logistics",
    clientCountry: "ca",
    hasQuebecPersonalInfo: false,
    isUsTaxpayer: false,
  },
  "John Doe Inc.": {
    entityLegalName: "John Doe Inc.",
    entityType: "Corporation",
    contactPerson: "John Doe",
    engagementPartner: "Atin Gupta",
    integrations: ["quickbooks"],
    businessPhone: "-",
    cellPhone: "-",
    industryType: "Professional Services",
    clientCountry: "us",
    hasQuebecPersonalInfo: false,
    isUsTaxpayer: true,
  },
};

const ENGAGEMENT_TYPES = [
  { value: "Audit (AUD)", label: "Audit (AUD)" },
  { value: "Compilation (COM)", label: "Compilation (COM)" },
  { value: "Review (REV)", label: "Review (REV)" },
  { value: "T2 (Corporations)", label: "T2 (Corporations)" },
];

const ACCOUNTING_FRAMEWORKS = [
  "ASPE — Canadian Accounting Standards for Private Enterprises",
  "IFRS — International Financial Reporting Standards",
  "US GAAP — Generally Accepted Accounting Principles (United States)",
  "Tax Basis",
  "Cash Basis",
  "Modified Cash Basis",
];

const AUDIT_ROLES = [
  "Engagement Partner", "Manager", "Senior Auditor", "Staff Auditor / Assistant",
  "EQCR (Quality Reviewer)", "Tax Reviewer", "Subject Matter Expert", "Preparer",
];

const MOCK_TEAM_MEMBERS = [
  { name: "Kaushal Bhagat", email: "kaushalb@countable.co", title: "Manager", hourlyRate: "100.00" },
  { name: "Atin Gupta", email: "atin@countable.co", title: "Partner", hourlyRate: "200.00" },
  { name: "Michael Torres", email: "michaelt@countable.co", title: "Senior Auditor", hourlyRate: "85.00" },
  { name: "Sarah Chen", email: "sarahc@countable.co", title: "Staff Auditor", hourlyRate: "65.00" },
  { name: "Jane DEF", email: "John_DEF@email.com", title: "Associate", hourlyRate: "25.00" },
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STOP_WORDS = new Set(["LLC","INC","INC.","LTD","LTD.","CO","CO.","CORP","CORP."]);

function engagementIdDatePart(yearEnd: string): string {
  const parts = yearEnd.split("/");
  if (parts.length !== 3) return yearEnd.replace(/\//g, "");
  const m = parseInt(parts[0]) - 1;
  const d = parseInt(parts[1]);
  const y = parts[2];
  if (m < 0 || m > 11 || isNaN(d)) return yearEnd.replace(/\//g, "");
  return `${MONTHS_SHORT[m]}${d}${y}`;
}

function shiftYear(mmddyyyy: string, delta: number): string {
  const p = mmddyyyy.split("/");
  if (p.length !== 3) return mmddyyyy;
  return `${p[0]}/${p[1]}/${String(parseInt(p[2]) + delta)}`;
}

function addDays(mmddyyyy: string, days: number): string {
  const p = mmddyyyy.split("/");
  if (p.length !== 3) return mmddyyyy;
  const d = new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
  d.setDate(d.getDate() + days);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function deriveEngagementId(type: string, client: string, yearEnd: string): string {
  const typePrefix = type.match(/\(([^)]+)\)/)?.[1] ?? type.substring(0, 3).toUpperCase();
  const abbrev = client.split(/\s+/)
    .filter(w => !STOP_WORDS.has(w.toUpperCase()))
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
    .substring(0, 4);
  return `${typePrefix}-${abbrev}-${engagementIdDatePart(yearEnd)}`;
}

function formatYearEnd(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateCreated(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

let _uid = 0;
const uid = () => String(++_uid);

const ic = "input-double-border w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200 bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]";

const InlineRow = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 py-2.5">
    <span className="text-sm text-foreground w-44 shrink-0">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </span>
    <div className="flex-1 min-w-0 max-w-sm">{children}</div>
  </div>
);

const BoolToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="inline-flex rounded-[8px] border border-border overflow-hidden text-xs font-medium shrink-0 select-none">
    <button type="button" onClick={() => onChange(true)}
      className={`px-3.5 py-1.5 transition-colors ${value ? "bg-[#1C63A6] text-white" : "text-muted-foreground hover:bg-muted"}`}>
      Yes
    </button>
    <button type="button" onClick={() => onChange(false)}
      className={`px-3.5 py-1.5 transition-colors border-l border-border ${!value ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`}>
      No
    </button>
  </div>
);

const SectionCard = ({
  icon, title, children, badge, headerRight,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  badge?: string;
  headerRight?: React.ReactNode;
}) => (
  <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
    <div className="flex items-center gap-2 mb-5">
      <span className="text-primary">{icon}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {badge && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{badge}</span>}
      {headerRight && <div className="ml-auto">{headerRight}</div>}
    </div>
    {children}
  </div>
);

interface TeamMember {
  id: string;
  role: string;
  name: string;
  email: string;
  title: string;
  hourlyRate: string;
  timeAllocation: string;
}

type PendingRow =
  | { mode: "add"; draft: TeamMember }
  | { mode: "edit"; originalId: string; draft: TeamMember };

function calcBudgetedCost(hourlyRate: string, timeAllocation: string) {
  return ((parseFloat(hourlyRate) || 0) * ((parseFloat(timeAllocation) || 0) / 100)).toFixed(2);
}

function calcBudgetedHours(timeAllocation: string) {
  return (((parseFloat(timeAllocation) || 0) / 100)).toFixed(2);
}

const TeamMemberViewRow = ({
  member, checked, onCheck, onEdit, onDelete,
}: {
  member: TeamMember; checked: boolean; onCheck: () => void; onEdit: () => void; onDelete: () => void;
}) => (
  <tr className="hover:bg-muted/40 transition-colors border-b border-border/40">
    <td className="px-4 py-3 w-10"><Checkbox checked={checked} onCheckedChange={onCheck} /></td>
    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{member.role}</td>
    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{member.name}</td>
    <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>
    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{member.title}</td>
    <td className="px-4 py-3 text-sm text-right text-foreground">{parseFloat(member.hourlyRate || "0").toFixed(2)}</td>
    <td className="px-4 py-3 text-sm text-right text-foreground">{member.timeAllocation}</td>
    <td className="px-4 py-3 text-sm text-right text-foreground">{calcBudgetedCost(member.hourlyRate, member.timeAllocation)}</td>
    <td className="px-4 py-3 text-sm text-right text-foreground">{calcBudgetedHours(member.timeAllocation)}</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={onEdit} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <Pencil className="h-4 w-4 text-link" />
        </button>
        <button type="button" onClick={onDelete} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </td>
  </tr>
);

const TeamMemberEditRow = ({
  draft, onChangeDraft, onConfirm, onCancel, roleOptions, onAddRole,
}: {
  draft: TeamMember; onChangeDraft: (d: TeamMember) => void;
  onConfirm: () => void; onCancel: () => void;
  roleOptions: string[]; onAddRole?: () => void;
}) => {
  const handleMemberSelect = (name: string) => {
    const found = MOCK_TEAM_MEMBERS.find(m => m.name === name);
    onChangeDraft({ ...draft, name, email: found?.email ?? "", title: found?.title ?? "", hourlyRate: found?.hourlyRate ?? draft.hourlyRate });
  };
  const numCls = "input-double-border w-full h-9 px-3 text-sm text-right text-foreground rounded-[10px] outline-none transition-all duration-200 bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]";
  return (
    <tr className="bg-primary/[0.03] dark:bg-primary/[0.05] border-b border-border/40">
      <td className="px-6 py-2 w-10"><Checkbox /></td>
      <td className="px-6 py-2 min-w-[160px]">
        <Select value={draft.role} onValueChange={role => {
          if (role === "__add_new_role__") { onAddRole?.(); return; }
          onChangeDraft({ ...draft, role });
        }}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            <SelectItem value="__add_new_role__" className="text-primary font-medium">
              <span className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" />Add new role</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-6 py-2 min-w-[200px]">
        <Select value={draft.name} onValueChange={handleMemberSelect}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select an option" /></SelectTrigger>
          <SelectContent>
            {MOCK_TEAM_MEMBERS.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-6 py-2 text-sm text-muted-foreground max-w-[160px] truncate">{draft.email}</td>
      <td className="px-6 py-2 text-sm text-muted-foreground whitespace-nowrap">{draft.title}</td>
      <td className="px-6 py-2 min-w-[110px]">
        <input type="number" value={draft.hourlyRate} min="0" step="0.01"
          onChange={e => onChangeDraft({ ...draft, hourlyRate: e.target.value })}
          className={numCls} />
      </td>
      <td className="px-6 py-2 min-w-[110px]">
        <input type="number" value={draft.timeAllocation} min="0" max="100"
          onChange={e => onChangeDraft({ ...draft, timeAllocation: e.target.value })}
          className={numCls} />
      </td>
      <td className="px-6 py-2 text-sm text-right text-muted-foreground min-w-[110px]">
        {calcBudgetedCost(draft.hourlyRate, draft.timeAllocation)}
      </td>
      <td className="px-6 py-2 text-sm text-right text-muted-foreground min-w-[100px]">
        {calcBudgetedHours(draft.timeAllocation)}
      </td>
      <td className="px-6 py-2">
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onConfirm} disabled={!draft.name}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-green-600 dark:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={onCancel}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// MM/DD/YYYY ↔ YYYY-MM-DD for native date inputs
function toInputDate(mmddyyyy: string): string {
  const p = mmddyyyy.split("/");
  if (p.length !== 3 || !p[2]) return "";
  return `${p[2]}-${p[0].padStart(2, "0")}-${p[1].padStart(2, "0")}`;
}
function fromInputDate(yyyymmdd: string): string {
  const p = yyyymmdd.split("-");
  if (p.length !== 3) return yyyymmdd;
  return `${p[1]}/${p[2]}/${p[0]}`;
}

const LabeledInput = ({
  label, value, onChange, required = false, type = "text", disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; disabled?: boolean;
}) => {
  const isDate = type === "date";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={isDate ? toInputDate(value) : value}
        onChange={e => onChange(isDate ? fromInputDate(e.target.value) : e.target.value)}
        disabled={disabled}
        className={ic + (disabled ? " opacity-50 cursor-not-allowed bg-muted/40" : "")}
      />
    </div>
  );
};

export default function CreateNewEngagement() {
  const navigate = useNavigate();
  const { engagements, addEngagement } = useEngagements();

  // Section 1: Client + Type
  const [clientName, setClientName] = useState("");
  const [engagementType, setEngagementType] = useState("");

  const clientInfo = CLIENT_DATA[clientName] ?? null;
  const isAudit = engagementType === "Audit (AUD)";

  // Section 2: Engagement Details
  const [engagementId, setEngagementId] = useState("");
  const [engagementTemplate, setEngagementTemplate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [budget, setBudget] = useState("10000.00");
  const [accountingStandards, setAccountingStandards] = useState("");
  const [additionalDisclosures, setAdditionalDisclosures] = useState("");

  // Section 3: Audit Configuration
  const [condensedForms, setCondensedForms] = useState(false);
  const [firstYearAudit, setFirstYearAudit] = useState(false);
  const [firstTimeAdoption, setFirstTimeAdoption] = useState(false);
  const [sevenSixteenConsented, setSevenSixteenConsented] = useState<boolean>(false);

  // Section 4: Engagement Period
  const [periodType, setPeriodType] = useState("Full Year");
  const [currentYearStart, setCurrentYearStart] = useState("12/01/2022");
  const [currentYearEnd, setCurrentYearEnd] = useState("11/30/2023");
  const [priorYear1Start, setPriorYear1Start] = useState("12/01/2021");
  const [priorYear1End, setPriorYear1End] = useState("11/30/2022");
  const [priorYear2Start, setPriorYear2Start] = useState("12/01/2020");
  const [priorYear2End, setPriorYear2End] = useState("11/30/2021");
  const [priorYear1NoData, setPriorYear1NoData] = useState(false);
  const [priorYear2NoData, setPriorYear2NoData] = useState(false);

  // Section 5: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingRow, setPendingRow] = useState<PendingRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teamSearch, setTeamSearch] = useState("");
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const baseRoles = isAudit ? AUDIT_ROLES : ["Partner", "Manager", "Senior", "Staff / Assistant", "Preparer"];
  const roleOptions = [...baseRoles, ...customRoles];

  // Client options: from existing engagements + CLIENT_DATA keys
  const clientOptions = Array.from(new Set([
    ...engagements.map(e => e.client),
    ...Object.keys(CLIENT_DATA),
  ])).sort();

  const handleEngagementTypeChange = (newType: string) => {
    setEngagementType(newType);
    setEngagementId(deriveEngagementId(newType, clientName, currentYearEnd));
    const audit = newType === "Audit (AUD)";
    if (audit) {
      setEngagementTemplate("CAS Audit");
      setTemplateId("");
      setAccountingStandards("ASPE — Canadian Accounting Standards for Private Enterprises");
      setPeriodType("Full Year");
      setAdditionalDisclosures("Full financial statements");
    } else {
      setEngagementTemplate("Review Section 2400");
      setTemplateId("");
      setAccountingStandards("Section 2400 Review standards");
      setPeriodType("Full year");
      setAdditionalDisclosures("Statement of cash flows");
    }
  };

  const isFullYear = periodType === "Full Year";

  const applyFullYear = (cyStart: string, cyEnd: string) => {
    setPriorYear1Start(shiftYear(cyStart, -1));
    setPriorYear1End(shiftYear(cyEnd, -1));
    setPriorYear2Start(shiftYear(cyStart, -2));
    setPriorYear2End(shiftYear(cyEnd, -2));
  };

  const handleCurrentYearStartChange = (val: string) => {
    setCurrentYearStart(val);
    if (isFullYear) {
      // Auto-derive end = start + 1 year - 1 day
      const autoEnd = addDays(shiftYear(val, 1), -1);
      setCurrentYearEnd(autoEnd);
      if (engagementType && clientName) setEngagementId(deriveEngagementId(engagementType, clientName, autoEnd));
      applyFullYear(val, autoEnd);
    }
  };

  const handleCurrentYearEndChange = (val: string) => {
    setCurrentYearEnd(val);
    if (engagementType && clientName) setEngagementId(deriveEngagementId(engagementType, clientName, val));
    if (isFullYear) {
      // Auto-derive start = end - 1 year + 1 day
      const autoStart = addDays(shiftYear(val, -1), 1);
      setCurrentYearStart(autoStart);
      applyFullYear(autoStart, val);
    }
  };

  const handlePeriodTypeChange = (val: string) => {
    setPeriodType(val);
    if (val === "Full Year") {
      applyFullYear(currentYearStart, currentYearEnd);
    }
  };

  const accountingStandardsOptions = (() => {
    const isCompilation = engagementType.includes("COM");
    const isReview = engagementType.includes("REV");
    const frameworks = isAudit ? ACCOUNTING_FRAMEWORKS : [
      ...(isCompilation ? ["CSRS 4200 — Compilation Engagements"] : []),
      ...(isReview ? ["Section 2400 Review standards", "CSRE 2400 — Review of Historical Financial Statements"] : []),
      ...ACCOUNTING_FRAMEWORKS,
      "ASNPO — Accounting Standards for Not-for-Profit Organizations",
      "PSAB — Public Sector Accounting Standards",
      "Pension Plans Accounting Standards",
    ];

    if (clientInfo?.clientCountry === "us") {
      const usFirst = frameworks.filter(fw => fw.includes("US GAAP") || fw.includes("PCAOB"));
      const rest = frameworks.filter(fw => !fw.includes("US GAAP") && !fw.includes("PCAOB"));
      return [...usFirst, ...rest].map(fw => ({ value: fw, label: fw }));
    }
    return frameworks.map(fw => ({ value: fw, label: fw }));
  })();

  const disclosureOptions = [
    { value: "Statement of cash flows", label: "Statement of cash flows" },
    { value: "Notes to financial statements", label: "Notes to financial statements" },
  ];

  const periodTypeOptions = isAudit
    ? [{ value: "Full Year", label: "Full Year" }, { value: "Stub Period", label: "Stub Period" }, { value: "Other", label: "Other" }]
    : [{ value: "Full year", label: "Full year" }];

  // Section 2 gate
  const showDetails = clientName.trim() !== "";

  // Section 5 gate
  const engagementDetailsValid =
    engagementId.trim() !== "" &&
    engagementTemplate.trim() !== "" &&
    engagementType !== "" &&
    accountingStandards !== "";

  const isFormValid =
    clientName.trim() !== "" &&
    engagementType !== "" &&
    engagementId.trim() !== "" &&
    engagementTemplate.trim() !== "" &&
    budget.trim() !== "" &&
    accountingStandards !== "" &&
    additionalDisclosures !== "" &&
    currentYearStart.trim() !== "" &&
    currentYearEnd.trim() !== "" &&
    teamMembers.length > 0;

  // Team handlers
  const startAddMember = () => {
    if (pendingRow) return;
    setPendingRow({ mode: "add", draft: { id: uid(), role: roleOptions[0] ?? "", name: "", email: "", title: "", hourlyRate: "0.00", timeAllocation: "" } });
  };
  const startEditMember = (member: TeamMember) => {
    if (pendingRow) return;
    setPendingRow({ mode: "edit", originalId: member.id, draft: { ...member } });
  };
  const confirmPendingRow = () => {
    if (!pendingRow) return;
    if (pendingRow.mode === "add") {
      setTeamMembers(prev => [...prev, pendingRow.draft]);
    } else {
      setTeamMembers(prev => prev.map(m => m.id === pendingRow.originalId ? pendingRow.draft : m));
    }
    setPendingRow(null);
  };
  const cancelPendingRow = () => setPendingRow(null);
  const deleteMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const deleteSelected = () => {
    setTeamMembers(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
  };

  const filteredMembers = teamMembers.filter(m =>
    !teamSearch || m.name.toLowerCase().includes(teamSearch.toLowerCase()) || m.role.toLowerCase().includes(teamSearch.toLowerCase())
  );
  const totalAlloc = teamMembers.reduce((s, m) => s + (parseFloat(m.timeAllocation) || 0), 0);
  const avgRate = teamMembers.length && totalAlloc > 0
    ? (teamMembers.reduce((s, m) => s + (parseFloat(m.hourlyRate) || 0) * (parseFloat(m.timeAllocation) || 0), 0) / totalAlloc).toFixed(2)
    : "0.00";
  const avgAlloc = totalAlloc.toFixed(0);
  const avgCost = teamMembers.reduce((s, m) => s + parseFloat(calcBudgetedCost(m.hourlyRate, m.timeAllocation)), 0).toFixed(2);
  const avgHours = teamMembers.reduce((s, m) => s + parseFloat(calcBudgetedHours(m.timeAllocation)), 0).toFixed(2);

  const handleCreate = () => {
    const record: EngagementRecord = {
      id: engagementId,
      client: clientName,
      type: engagementType,
      yearEnd: formatYearEnd(currentYearEnd),
      team: "View Assignees",
      status: "New",
      statusVariant: "new",
      hasRF: false,
      dateCreated: formatDateCreated(),
      firstYearAudit,
    };
    addEngagement(record);
    setEngagementMeta(engagementId, {
      firstYearAudit,
      templateId: templateId || undefined,
      accountingFramework: isAudit ? accountingStandards : undefined,
      accountingStandards,
      budget,
      periodStart: currentYearStart,
      periodEnd: currentYearEnd,
      auditPeriodType: isAudit ? periodType : undefined,
      firstTimeAdoption: isAudit ? firstTimeAdoption : undefined,
    });
    if (isAudit && firstYearAudit) {
      toast.success("Engagement created — IE checklist and predecessor letter added.");
    } else {
      toast.success("Engagement created successfully.");
    }
    navigate("/engagements");
  };

  return (
    <Layout title="Create Engagement">
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/engagements")}
              className="flex items-center gap-1 text-link hover:underline text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4 icon-arrow" />
              Back
            </button>
          </div>

          <div className="flex flex-col gap-5">

            {/* SECTION 1: CLIENT INFORMATION — always visible */}
            <SectionCard icon={<User className="h-5 w-5" />} title="Client Information">
              <InlineRow label="Client Name" required>
                <Select value={clientName} onValueChange={setClientName}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clientOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </InlineRow>

              {clientName && clientInfo && (
                <div className="mt-1 pt-1 border-t border-border/40">
                  <InlineRow label="Entity legal name"><span className="text-sm text-foreground">{clientInfo.entityLegalName}</span></InlineRow>
                  <InlineRow label="Entity type"><span className="text-sm text-foreground">{clientInfo.entityType}</span></InlineRow>
                  <InlineRow label="Client country"><span className="text-sm text-foreground">{clientInfo.clientCountry === "ca" ? "🇨🇦 Canada" : "🇺🇸 United States"}</span></InlineRow>
                  <InlineRow label="Industry"><span className="text-sm text-foreground">{clientInfo.industryType}</span></InlineRow>
                  <InlineRow label="Contact person"><span className="text-sm text-foreground">{clientInfo.contactPerson}</span></InlineRow>
                  <InlineRow label="Engagement partner"><span className="text-sm text-link font-medium cursor-pointer hover:underline">{clientInfo.engagementPartner}</span></InlineRow>
                  <InlineRow label="Integrations">
                    <div className="flex items-center gap-1.5">
                      {clientInfo.integrations.includes("quickbooks") && <img src={intuitQuickbooksLogo} alt="QuickBooks" className="h-5 object-contain" />}
                    </div>
                  </InlineRow>
                  <InlineRow label="Business phone"><span className="text-sm text-foreground">{clientInfo.businessPhone}</span></InlineRow>
                  <InlineRow label="Cell phone"><span className="text-sm text-foreground">{clientInfo.cellPhone}</span></InlineRow>
                  <InlineRow label="Quebec personal info">
                    <span className={`text-sm font-medium ${clientInfo.hasQuebecPersonalInfo ? "text-amber-600" : "text-muted-foreground"}`}>
                      {clientInfo.hasQuebecPersonalInfo ? "Yes" : "No"}
                    </span>
                  </InlineRow>
                  <InlineRow label="US taxpayer">
                    <span className={`text-sm font-medium ${clientInfo.isUsTaxpayer ? "text-amber-600" : "text-muted-foreground"}`}>
                      {clientInfo.isUsTaxpayer ? "Yes" : "No"}
                    </span>
                  </InlineRow>
                </div>
              )}
            </SectionCard>

            {/* SECTION 2: ENGAGEMENT DETAILS — gated on client */}
            {showDetails && (
              <SectionCard icon={<Briefcase className="h-5 w-5" />} title="Engagement Details">
                <InlineRow label="Engagement Type" required>
                  <Select value={engagementType} onValueChange={handleEngagementTypeChange}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select engagement type" /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </InlineRow>
                {engagementType !== "" && (
                  <>
                    <InlineRow label="Engagement ID" required>
                      <div className="relative">
                        <input type="text" value={engagementId} onChange={e => setEngagementId(e.target.value)} className={ic + " pr-10"} />
                        <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </InlineRow>
                    <InlineRow label="Template" required>
                      <div className="relative">
                        <input type="text" value={engagementTemplate} onChange={e => setEngagementTemplate(e.target.value)} className={ic + " pr-10"} />
                        <button type="button" onClick={() => setShowTemplatePicker(true)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:text-primary">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </InlineRow>
                    <InlineRow label="Budget ($)" required>
                      <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className={ic} />
                    </InlineRow>
                    <InlineRow label="Accounting Framework" required>
                      <Select value={accountingStandards} onValueChange={setAccountingStandards}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {accountingStandardsOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </InlineRow>
                    {!isAudit && (
                      <InlineRow label="Additional Disclosures" required>
                        <Select value={additionalDisclosures} onValueChange={setAdditionalDisclosures}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {disclosureOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </InlineRow>
                    )}
                  </>
                )}
              </SectionCard>
            )}

            {/* SECTION 3: AUDIT CONFIGURATION — gated on isAudit + showDetails + type selected */}
            {isAudit && showDetails && String(engagementType) !== "" && (
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Audit Configuration</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Answer each question to configure your engagement.</p>
                </div>
                {engagementDetailsValid ? (
                  <div>
                    <div className="px-5 pt-4 pb-3 border-b border-border/30 space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Form Preferences</p>
                      <div className="flex items-start justify-between gap-3 max-w-sm">
                        <div>
                          <p className="text-sm text-foreground leading-snug">Condensed audit forms?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Shortened checklists for simpler engagements.</p>
                        </div>
                        <BoolToggle value={condensedForms} onChange={setCondensedForms} />
                      </div>
                      <div className="flex items-start justify-between gap-3 max-w-sm">
                        <div>
                          <p className="text-sm text-foreground leading-snug">First-time adoption of standard?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Adds opening balance testing procedures.</p>
                        </div>
                        <BoolToggle value={firstTimeAdoption} onChange={setFirstTimeAdoption} />
                      </div>
                      {firstTimeAdoption && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                          <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                          <p className="text-xs text-amber-700 dark:text-amber-400">Opening balance testing will be added to this engagement.</p>
                        </div>
                      )}
                    </div>
                    {(clientInfo?.isUsTaxpayer || clientInfo?.hasQuebecPersonalInfo) && (
                      <div className="px-5 pt-4 pb-3 border-b border-border/30 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Compliance Requirements</p>
                        {clientInfo?.isUsTaxpayer && (
                          <div className={`rounded-md border p-3 space-y-2 ${sevenSixteenConsented ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"}`}>
                            <div className="flex items-start gap-2">
                              <span className={`text-xs mt-0.5 ${sevenSixteenConsented ? "text-green-500" : "text-amber-500"}`}>
                                {sevenSixteenConsented ? "✓" : "⚠"}
                              </span>
                              <div className="flex-1">
                                <p className={`text-xs font-medium ${sevenSixteenConsented ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                                  IRC §7216 Consent Required
                                </p>
                                <p className={`text-xs mt-0.5 ${sevenSixteenConsented ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}`}>
                                  This client is a US taxpayer. The firm must obtain IRC §7216 consent before disclosing tax return information to any third party, including this platform. Confirm the consent form has been issued and signed before proceeding.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id="seven-sixteen-consent"
                                checked={sevenSixteenConsented}
                                onChange={e => setSevenSixteenConsented(e.target.checked)}
                                className="accent-primary"
                              />
                              <label htmlFor="seven-sixteen-consent" className="text-xs text-foreground cursor-pointer">
                                I confirm the §7216 consent form has been issued to and signed by this client
                              </label>
                            </div>
                          </div>
                        )}
                        {clientInfo?.hasQuebecPersonalInfo && (
                          <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 p-3 space-y-1 mt-2">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-500 text-xs mt-0.5">ℹ</span>
                              <div>
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Quebec Law 25 — Transfer Impact Assessment</p>
                                <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-500">
                                  This client involves personal information of Quebec residents. The firm is required to complete a Privacy Impact Assessment (PIA) and Transfer Impact Assessment (TIA) before transferring this data outside Quebec. A TIA template will be available in the engagement documents section.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-muted-foreground italic">Complete the engagement details to unlock configuration options.</p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: ENGAGEMENT PERIOD — gated on showDetails + type selected */}
            {showDetails && engagementType !== "" && (
              <SectionCard icon={<Calendar className="h-5 w-5" />} title="Engagement Period">
                <div className="flex items-center gap-4 py-2.5">
                  <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap">
                    Period Type<span className="text-destructive ml-0.5">*</span>
                  </span>
                  <div className="flex-1 min-w-0 max-w-sm">
                    <Select value={periodType} onValueChange={handlePeriodTypeChange}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {periodTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Current Year */}
                <div className="flex items-start gap-4 py-2.5">
                  <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap pt-5">
                    Current Year<span className="text-destructive ml-0.5">*</span>
                  </span>
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0 max-w-44">
                      <LabeledInput label="Start Date" value={currentYearStart} onChange={handleCurrentYearStartChange} required type="date" />
                    </div>
                    <div className="flex-1 min-w-0 max-w-44">
                      <LabeledInput label="End Date" value={currentYearEnd} onChange={handleCurrentYearEndChange} required type="date" />
                    </div>
                  </div>
                </div>

                {/* Prior Year 1 */}
                <div className="flex items-start gap-4 py-2.5">
                  <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap pt-5">Prior Year 1</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 max-w-44">
                        <LabeledInput label="Start Date" value={priorYear1Start} onChange={setPriorYear1Start} type="date" disabled={isFullYear} />
                      </div>
                      <div className="flex-1 min-w-0 max-w-44">
                        <LabeledInput label="End Date" value={priorYear1End} onChange={setPriorYear1End} type="date" disabled={isFullYear} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prior Year 2 */}
                <div className="flex items-start gap-4 py-2.5">
                  <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap pt-5">Prior Year 2</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 max-w-44">
                        <LabeledInput label="Start Date" value={priorYear2Start} onChange={setPriorYear2Start} type="date" disabled={isFullYear} />
                      </div>
                      <div className="flex-1 min-w-0 max-w-44">
                        <LabeledInput label="End Date" value={priorYear2End} onChange={setPriorYear2End} type="date" disabled={isFullYear} />
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* SECTION 5: ASSIGNED TEAM — gated on engagementDetailsValid */}
            {engagementDetailsValid && (
              <SectionCard
                icon={<Users className="h-5 w-5" />}
                title="Assigned team"
                badge={`${teamMembers.length} User`}
                headerRight={
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" placeholder="Search" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                        className="input-double-border pl-9 pr-3 h-9 text-sm bg-card border border-border rounded-[10px] outline-none w-40 text-foreground placeholder:text-muted-foreground" />
                    </div>
                    <Button variant="outline" onClick={deleteSelected} disabled={selectedIds.size === 0} className="h-9 px-3 gap-1.5 text-sm">
                      <Trash2 className="h-4 w-4" />Delete
                    </Button>
                  </div>
                }
              >
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        <th className="text-left px-4 py-3 w-10">
                          <Checkbox
                            checked={teamMembers.length > 0 && selectedIds.size === teamMembers.length}
                            onCheckedChange={v => setSelectedIds(v ? new Set(teamMembers.map(m => m.id)) : new Set())}
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Role<span className="text-destructive ml-0.5">*</span></th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Team Member<span className="text-destructive ml-0.5">*</span></th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Email</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Title</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Hourly Rate ($)<span className="text-destructive ml-0.5">*</span></th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Time Allocation (%)<span className="text-destructive ml-0.5">*</span></th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Budgeted Cost ($)</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Budgeted Hours (H)</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map(member =>
                        pendingRow?.mode === "edit" && pendingRow.originalId === member.id ? (
                          <TeamMemberEditRow key={member.id} draft={pendingRow.draft}
                            onChangeDraft={d => setPendingRow({ mode: "edit", originalId: member.id, draft: d })}
                            onConfirm={confirmPendingRow} onCancel={cancelPendingRow}
                            roleOptions={roleOptions} onAddRole={() => { setNewRoleName(""); setShowAddRoleModal(true); }} />
                        ) : (
                          <TeamMemberViewRow key={member.id} member={member}
                            checked={selectedIds.has(member.id)} onCheck={() => toggleSelect(member.id)}
                            onEdit={() => startEditMember(member)} onDelete={() => deleteMember(member.id)} />
                        )
                      )}
                      {pendingRow?.mode === "add" && (
                        <TeamMemberEditRow draft={pendingRow.draft}
                          onChangeDraft={d => setPendingRow({ mode: "add", draft: d })}
                          onConfirm={confirmPendingRow} onCancel={cancelPendingRow}
                          roleOptions={roleOptions} onAddRole={() => { setNewRoleName(""); setShowAddRoleModal(true); }} />
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border/40">
                        <td className="px-4 py-3" /><td className="px-4 py-3" /><td className="px-4 py-3" /><td className="px-4 py-3" />
                        <td className="px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">Avg Engagement Rate</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{avgRate}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{avgAlloc}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{avgCost}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{avgHours}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4">
                  <button type="button" onClick={startAddMember} disabled={!!pendingRow}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-[10px] bg-[#1C63A6] text-white hover:bg-[#1a5a9e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Plus className="h-4 w-4" />Add Member
                  </button>
                </div>
              </SectionCard>
            )}

          </div>

          <TemplatePickerPanel
            open={showTemplatePicker}
            onClose={() => setShowTemplatePicker(false)}
            suggestedTemplateId={
              isAudit && accountingStandards.includes("ASNPO") ? "audit5101" :
              isAudit && accountingStandards.includes("US GAAP") ? "audit6100" :
              isAudit ? "audit5100" :
              engagementType.includes("Compilation") ? "comp4200" :
              engagementType.includes("Review") ? "rev2400" :
              undefined
            }
            onSelect={(id, name) => {
              setTemplateId(id);
              setEngagementTemplate(name);
              if (id && TEMPLATE_CONFIG[id]) {
                const cfg = TEMPLATE_CONFIG[id];
                setEngagementType(cfg.engagementTypeLabel);
                setAccountingStandards(cfg.defaultFramework);
              }
            }}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pb-6">
            <Button variant="outline" onClick={() => navigate("/engagements")}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button disabled={!isFormValid} onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create Engagement
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showAddRoleModal} onOpenChange={setShowAddRoleModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add new role</DialogTitle></DialogHeader>
          <div className="py-2">
            <input
              autoFocus
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newRoleName.trim()) {
                  const role = newRoleName.trim();
                  setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
                  setPendingRow(prev => prev ? { ...prev, draft: { ...prev.draft, role } } : prev);
                  setShowAddRoleModal(false);
                }
              }}
              placeholder="e.g. IT Specialist"
              className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddRoleModal(false)}>Cancel</Button>
            <Button size="sm" disabled={!newRoleName.trim()} onClick={() => {
              const role = newRoleName.trim();
              setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
              setPendingRow(prev => prev ? { ...prev, draft: { ...prev.draft, role } } : prev);
              setShowAddRoleModal(false);
            }}>
              Add role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
