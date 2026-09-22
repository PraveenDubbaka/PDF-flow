import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEngagements } from "@/store/EngagementsContext";
import { EngagementRecord, setEngagementMeta } from "@/store/engagementsStore";
import { toast } from "sonner";
import intuitQuickbooksLogo from "@/assets/intuit-quickbooks-logo.svg";
import { ArrowLeft, Briefcase, Calendar, Users, ChevronDown, Plus, Pencil, Trash2, Search, ExternalLink, X, Building2, FileText, Settings2, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TemplatePickerPanel } from "@/components/TemplatePickerPanel";
import { TEMPLATE_CONFIG } from "@/lib/engagementTemplatesData";

const INDUSTRIES = [
 "Construction & Real Estate", "Financial Services", "Healthcare & Life Sciences",
 "Hospitality & Tourism", "Manufacturing", "Mining & Resources", "Not-for-Profit",
 "Oil & Gas", "Professional Services", "Retail & Consumer", "Technology", "Transportation & Logistics",
];
const SPECIAL_ENGAGEMENT_TYPES = [
 "CAS 800 — Special Purpose Framework Audit",
 "CAS 805 — Single Financial Statement or Specific Element Audit",
 "CAS 810 — Summary Financial Statements Engagement",
 "Compliance / Regulatory Engagement",
 "Contractual Basis Engagement",
 "Other Special Purpose Framework",
];
const SPF_VALUES = [
 "Income Tax Basis",
 "Compliance / Regulatory Basis",
 "Contractual Basis",
 "Other Comprehensive Basis of Accounting (OCBOA)",
];
const ACCOUNTING_FRAMEWORKS = [
 "ASPE — Canadian Accounting Standards for Private Enterprises",
 "IFRS — International Financial Reporting Standards",
 "US GAAP — Generally Accepted Accounting Principles (United States)",
 "Tax Basis",
 "Cash Basis",
 "Modified Cash Basis",
];
const ENTITY_CLASSIFICATIONS = ["Private", "Public", "Manufacturing"];
const AUDIT_ROLES = [
 "Engagement Partner", "Manager", "Senior Auditor", "Staff Auditor / Assistant",
 "EQCR (Quality Reviewer)", "Tax Reviewer", "Subject Matter Expert", "Preparer",
];
type RecommendedRole = { role: string; hourlyRate: string; timeAllocation: string };
const RECOMMENDED_TEAM: Record<string, RecommendedRole[]> = {
 audit: [
 { role: "Engagement Partner", hourlyRate: "400.00", timeAllocation: "15" },
 { role: "Manager", hourlyRate: "275.00", timeAllocation: "25" },
 { role: "Senior Auditor", hourlyRate: "200.00", timeAllocation: "35" },
 { role: "Staff Auditor / Assistant",hourlyRate: "150.00", timeAllocation: "25" },
 ],
 review: [
 { role: "Partner", hourlyRate: "400.00", timeAllocation: "20" },
 { role: "Manager", hourlyRate: "275.00", timeAllocation: "30" },
 { role: "Senior", hourlyRate: "200.00", timeAllocation: "35" },
 { role: "Staff / Assistant", hourlyRate: "150.00", timeAllocation: "15" },
 ],
 compilation: [
 { role: "Partner", hourlyRate: "400.00", timeAllocation: "15" },
 { role: "Senior", hourlyRate: "200.00", timeAllocation: "45" },
 { role: "Preparer", hourlyRate: "125.00", timeAllocation: "40" },
 ],
 tax: [
 { role: "Partner", hourlyRate: "400.00", timeAllocation: "20" },
 { role: "Manager", hourlyRate: "275.00", timeAllocation: "30" },
 { role: "Tax Reviewer", hourlyRate: "300.00", timeAllocation: "35" },
 { role: "Preparer", hourlyRate: "125.00", timeAllocation: "15" },
 ],
};
const AUDIT_DISCLOSURE_OPTIONS = [
 { key: "fullFinancials", label: "Full financial statements" },
 { key: "cashFlow", label: "Cash Flow Statement" },
 { key: "shareholdersEquity", label: "Shareholders' Equity" },
 { key: "notesToFinancials", label: "Notes to financial statements" },
 { key: "schedulesOfExpenses", label: "Schedules of Expenses" },
 { key: "supplementarySchedules", label: "Supplementary schedules" },
 { key: "segmentReporting", label: "Segment Reporting" },
 { key: "interimFinancials", label: "Interim Financials" },
];

let _uid = 0;
const uid = () => String(++_uid);

// Standard input component with label above - matching design system
const LabeledInput = ({ 
 label, 
 value, 
 onChange, 
 required = false,
 type = "text",
 icon,
 readOnly = false,
 disabled = false,
 error = false
}: { 
 label: string; 
 value: string; 
 onChange: (value: string) => void;
 required?: boolean;
 type?: string;
 icon?: React.ReactNode;
 readOnly?: boolean;
 disabled?: boolean;
 error?: boolean;
}) => {
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <div className="relative">
 <input
 type={type}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 readOnly={readOnly}
 disabled={disabled}
 className={`
 input-double-border w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200
 ${disabled 
 ? 'bg-muted border border-transparent text-muted-foreground opacity-60 cursor-not-allowed' 
 : error
 ? 'bg-white dark:bg-card border border-destructive'
 : 'bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]'
 }
 ${readOnly ? 'cursor-default' : ''}
 ${icon ? 'pr-10' : ''}
 `}
 />
 {icon && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
 {icon}
 </div>
 )}
 </div>
 </div>
 );
};

// Standard select component with label above - matching design system
const LabeledSelect = ({ 
 label, 
 value, 
 onChange, 
 options,
 required = false,
 disabled = false,
 error = false
}: { 
 label: string; 
 value: string; 
 onChange: (value: string) => void;
 options: { value: string; label: string }[];
 required?: boolean;
 disabled?: boolean;
 error?: boolean;
}) => {
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <Select value={value} onValueChange={onChange} disabled={disabled}>
 <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
 <SelectContent>
 {options.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
};

// Section card component
const SectionCard = ({
 icon,
 title,
 children,
 badge,
 headerRight,
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
 {badge && (
 <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{badge}</span>
 )}
 {headerRight && <div className="ml-auto">{headerRight}</div>}
 </div>
 {children}
 </div>
);

const EngagementConfigSidePanel = ({
 showFirstYearOnPlatform,
 firstYearOnPlatform,
 onFirstYearOnPlatformChange,
 showRollForward,
 isRollForward,
 onRollForwardChange,
 showAnnualize,
 annualizeInterim,
 onAnnualizeChange,
 firstTimeAdoption,
}: {
 showFirstYearOnPlatform: boolean;
 firstYearOnPlatform: string;
 onFirstYearOnPlatformChange: (v: string) => void;
 showRollForward: boolean;
 isRollForward: string;
 onRollForwardChange: (v: string) => void;
 showAnnualize: boolean;
 annualizeInterim: boolean;
 onAnnualizeChange: (v: boolean) => void;
 firstTimeAdoption: boolean;
}) => {
 const hasActiveFields = showFirstYearOnPlatform || showRollForward || showAnnualize;

 return (
 <div className="bg-card rounded-lg border border-border shadow-sm p-5">
 <div className="flex items-center gap-2 mb-1">
 <Settings2 className="h-4 w-4 text-primary" />
 <h3 className="text-sm font-semibold text-foreground">Engagement Configuration</h3>
 </div>
 <p className="text-xs text-muted-foreground mb-4">Contextual settings that adapt based on your selections.</p>

 {hasActiveFields ? (
 <div className="flex flex-col gap-4">
 {showFirstYearOnPlatform && (
 <LabeledSelect
 label="First audit on this platform?"
 value={firstYearOnPlatform}
 onChange={onFirstYearOnPlatformChange}
 options={[
 { value: "yes", label: "Yes — no prior files" },
 { value: "no", label: "No — prior files exist" },
 ]}
 />
 )}
 {showRollForward && (
 <LabeledSelect
 label="Is this a roll-forward?"
 value={isRollForward}
 onChange={onRollForwardChange}
 options={[
 { value: "yes", label: "Yes — roll forward" },
 { value: "no", label: "No — new engagement" },
 ]}
 />
 )}
 {showAnnualize && (
 <div className="flex flex-col gap-1">
 <label className="text-xs font-medium text-foreground">Annualize income statement data?</label>
 <div className="flex items-center gap-4 h-9">
 <label className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground">
 <input type="radio" name="annualizeInterim" value="yes" checked={annualizeInterim} onChange={() => onAnnualizeChange(true)} className="accent-primary" />
 Yes
 </label>
 <label className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground">
 <input type="radio" name="annualizeInterim" value="no" checked={!annualizeInterim} onChange={() => onAnnualizeChange(false)} className="accent-primary" />
 No
 </label>
 </div>
 </div>
 )}
 </div>
 ) : (
 <p className="text-xs text-muted-foreground italic">Additional configuration options will appear here based on your selections above.</p>
 )}

 {firstTimeAdoption && (
 <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
 <span className="text-amber-500 text-xs mt-0.5">⚠</span>
 <p className="text-xs text-amber-700 dark:text-amber-400">Opening balance testing procedures will be added to this engagement.</p>
 </div>
 )}
 </div>
 );
};

const ic = "input-double-border w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200 bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]";
const sc = ic + " appearance-none cursor-pointer";

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
 className={`px-3.5 py-1.5 transition-colors ${value ? 'bg-[#1C63A6] text-white' : 'text-muted-foreground hover:bg-muted'}`}>
 Yes
 </button>
 <button type="button" onClick={() => onChange(false)}
 className={`px-3.5 py-1.5 transition-colors border-l border-border ${!value ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>
 No
 </button>
 </div>
);

const StrToggle = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
 <div className="inline-flex rounded-[8px] border border-border overflow-hidden text-xs font-medium shrink-0 select-none">
 <button type="button" onClick={() => onChange('yes')}
 className={`px-3.5 py-1.5 transition-colors ${value === 'yes' ? 'bg-[#1C63A6] text-white' : 'text-muted-foreground hover:bg-muted'}`}>
 Yes
 </button>
 <button type="button" onClick={() => onChange('no')}
 className={`px-3.5 py-1.5 transition-colors border-l border-border ${value === 'no' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>
 No
 </button>
 </div>
);

const MultiSelectDropdown = ({
 label,
 options,
 selected,
 onToggle,
 required = false,
}: {
 label: string;
 options: { key: string; label: string }[];
 selected: Set<string>;
 onToggle: (key: string) => void;
 required?: boolean;
}) => {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);

 return (
 <div className="flex flex-col gap-1" ref={ref}>
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 <div className="relative">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="input-double-border w-full h-9 px-3 text-sm text-left rounded-[10px] outline-none transition-all bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)] flex items-center justify-between gap-2"
 >
 <span className="text-muted-foreground truncate">
 {selected.size === 0 ? "Select..." : `${selected.size} selected`}
 </span>
 <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
 </button>
 {open && (
 <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-card border border-border rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto">
 {options.map(({ key, label: optLabel }) => (
 <button
 key={key}
 type="button"
 onClick={() => onToggle(key)}
 className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 hover:bg-muted transition-colors"
 >
 <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected.has(key) ? "bg-primary border-primary" : "border-border"}`}>
 {selected.has(key) && <Check className="h-2.5 w-2.5 text-white" />}
 </div>
 <span className={selected.has(key) ? "text-foreground" : "text-muted-foreground"}>{optLabel}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 {selected.size > 0 && (
 <div className="flex flex-wrap gap-1 mt-1">
 {options.filter(o => selected.has(o.key)).map(({ key, label: chipLabel }) => (
 <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
 {chipLabel}
 <button type="button" onClick={() => onToggle(key)} className="hover:text-destructive transition-colors ml-0.5">
 <X className="h-2.5 w-2.5" />
 </button>
 </span>
 ))}
 </div>
 )}
 </div>
 );
};

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
 | { mode: 'add'; draft: TeamMember }
 | { mode: 'edit'; originalId: string; draft: TeamMember };

function calcBudgetedCost(hourlyRate: string, timeAllocation: string) {
 const rate = parseFloat(hourlyRate) || 0;
 const alloc = parseFloat(timeAllocation) || 0;
 return (rate * (alloc / 100)).toFixed(2);
}

function calcBudgetedHours(timeAllocation: string) {
 return ((parseFloat(timeAllocation) || 0) / 100).toFixed(2);
}

const MOCK_TEAM_MEMBERS = [
 { name: "Kaushal Bhagat", email: "kaushalb@countable.co", title: "Manager", hourlyRate: "100.00" },
 { name: "Atin Gupta", email: "atin@countable.co", title: "Partner", hourlyRate: "200.00" },
 { name: "Michael Torres", email: "michaelt@countable.co", title: "Senior Auditor",hourlyRate: "85.00" },
 { name: "Sarah Chen", email: "sarahc@countable.co", title: "Staff Auditor", hourlyRate: "65.00" },
 { name: "Jane DEF", email: "John_DEF@email.com", title: "Associate", hourlyRate: "25.00" },
];

const TeamMemberViewRow = ({
 member,
 checked,
 onCheck,
 onEdit,
 onDelete,
}: {
 member: TeamMember;
 checked: boolean;
 onCheck: () => void;
 onEdit: () => void;
 onDelete: () => void;
}) => (
 <tr className="hover:bg-muted/40 transition-colors border-b border-border/40">
 <td className="px-4 py-3 w-10">
 <Checkbox checked={checked} onCheckedChange={onCheck} />
 </td>
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
 draft,
 onChangeDraft,
 onConfirm,
 onCancel,
 roleOptions,
 onAddRole,
}: {
 draft: TeamMember;
 onChangeDraft: (d: TeamMember) => void;
 onConfirm: () => void;
 onCancel: () => void;
 roleOptions: string[];
 onAddRole?: () => void;
}) => {
 const handleMemberSelect = (name: string) => {
 const found = MOCK_TEAM_MEMBERS.find(m => m.name === name);
 onChangeDraft({...draft, name, email: found?.email ?? "", title: found?.title ?? "", hourlyRate: found?.hourlyRate ?? draft.hourlyRate });
 };
 const selectCls = "input-double-border w-full h-9 pl-3 pr-8 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200 appearance-none cursor-pointer bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]";
 const numCls = "input-double-border w-full h-9 px-3 text-sm text-right text-foreground rounded-[10px] outline-none transition-all duration-200 bg-white border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card hover:border-[hsl(210_25%_75%)] dark:hover:border-[hsl(220_15%_40%)]";
 return (
 <tr className="bg-primary/[0.03] dark:bg-primary/[0.05] border-b border-border/40">
 <td className="px-6 py-2 w-10"><Checkbox /></td>
 <td className="px-6 py-2 min-w-[160px]">
 <Select
 value={draft.role}
 onValueChange={role => {
 if (role === "__add_new_role__") { onAddRole?.(); return; }
 onChangeDraft({...draft, role });
 }}
 >
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
 {MOCK_TEAM_MEMBERS.map(m => (
 <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-6 py-2 text-sm text-muted-foreground max-w-[160px] truncate">{draft.email}</td>
 <td className="px-6 py-2 text-sm text-muted-foreground whitespace-nowrap">{draft.title}</td>
 <td className="px-6 py-2 min-w-[110px]">
 <input type="number" value={draft.hourlyRate} min="0" step="0.01"
 onChange={e => onChangeDraft({...draft, hourlyRate: e.target.value })}
 className={numCls} />
 </td>
 <td className="px-6 py-2 min-w-[110px]">
 <input type="number" value={draft.timeAllocation} min="0" max="100"
 onChange={e => onChangeDraft({...draft, timeAllocation: e.target.value })}
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

export default function CreateEngagement() {
 const navigate = useNavigate();
 const location = useLocation();
 const { addEngagement } = useEngagements();
 const prefill = (location.state as { clientName?: string; engagementType?: string } | null) ?? {};

 // Engagement Details state
 const [clientName, setClientName] = useState(prefill.clientName || "");
 const clientInfo = CLIENT_DATA[clientName] ?? null;
 const [engagementType, setEngagementType] = useState(prefill.engagementType || "Review (REV)");
 const prefillIsAudit = (prefill.engagementType || "Review (REV)") === "Audit (AUD)";
 const [engagementId, setEngagementId] = useState(prefillIsAudit ? "AUD-HFL-Mar312024" : "REV-DEF-Nov302023");
 const [engagementTemplate, setEngagementTemplate] = useState(prefillIsAudit ? "CAS Audit" : "Review Section 2400");
 const [templateId, setTemplateId] = useState(prefillIsAudit ? "audit5100" : "");
 const [showTemplatePicker, setShowTemplatePicker] = useState(false);
 const [budget, setBudget] = useState("10000.00");
 const [accountingStandards, setAccountingStandards] = useState(prefillIsAudit ? "ASPE — Canadian Accounting Standards for Private Enterprises" : "Section 2400 Review standards");
 const [additionalDisclosures, setAdditionalDisclosures] = useState(prefillIsAudit ? "Full financial statements" : "Statement of cash flows");

 // Engagement Period state
 const [periodType, setPeriodType] = useState(prefillIsAudit ? "Full Year" : "Full year");
 const [currentYearStart, setCurrentYearStart] = useState("12/01/2022");
 const [currentYearEnd, setCurrentYearEnd] = useState("11/30/2023");
 const [priorYear1Start, setPriorYear1Start] = useState("12/01/2021");
 const [priorYear1End, setPriorYear1End] = useState("11/30/2022");
 const [priorYear2Start, setPriorYear2Start] = useState("12/01/2020");
 const [priorYear2End, setPriorYear2End] = useState("11/30/2021");
 const [priorYear1NoData, setPriorYear1NoData] = useState(false);
 const [priorYear2NoData, setPriorYear2NoData] = useState(false);

 // Audit-specific state
 const isAudit = engagementType === "Audit (AUD)";

 // Sync engagement details when type changes (skip initial render)
 const isFirstMount = useRef(true);
 useEffect(() => {
 if (isFirstMount.current) { isFirstMount.current = false; return; }
 if (isAudit) {
 setEngagementId("AUD-HFL-Mar312024");
 if (!templateId) {
 setEngagementTemplate("CAS Audit");
 setAccountingStandards("ASPE — Canadian Accounting Standards for Private Enterprises");
 }
 setPeriodType("Full Year");
 setAdditionalDisclosures("");
 setAdditionalDisclosuresSet(new Set());
 } else {
 setEngagementId("REV-DEF-Nov302023");
 if (!templateId) {
 setEngagementTemplate("Review Section 2400");
 setAccountingStandards("Section 2400 Review standards");
 }
 setPeriodType("Full year");
 setAdditionalDisclosures("Statement of cash flows");
 setAdditionalDisclosuresSet(new Set());
 setSpecialPurposeFramework("");
 }
 }, [isAudit]); // eslint-disable-line react-hooks/exhaustive-deps
 const [specialPurposeFramework, setSpecialPurposeFramework] = useState("");

 useEffect(() => {
 if (!SPF_VALUES.includes(accountingStandards)) {
 setSpecialPurposeFramework("");
 }
 }, [accountingStandards]);

 const [condensedForms, setCondensedForms] = useState(false);
 const [firstYearAudit, setFirstYearAudit] = useState(false);
 const [firstYearOnPlatform, setFirstYearOnPlatform] = useState("");
 const [isRollForward, setIsRollForward] = useState("");
 
 const [firstYearTemplates, setFirstYearTemplates] = useState<Set<string>>(new Set());
 const [annualizeInterim, setAnnualizeInterim] = useState(true);
 const [firstTimeAdoption, setFirstTimeAdoption] = useState(false);
 const [sevenSixteenConsented, setSevenSixteenConsented] = useState<boolean>(false);
 const toggleFirstYearTemplate = (key: string) =>
 setFirstYearTemplates(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
 const [additionalDisclosuresSet, setAdditionalDisclosuresSet] = useState<Set<string>>(new Set());
 const toggleAdditionalDisclosure = (key: string) =>
 setAdditionalDisclosuresSet(prev => {
 const next = new Set(prev);
 next.has(key) ? next.delete(key) : next.add(key);
 return next;
 });

 // Team members
 const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
 const [recommendedPending, setRecommendedPending] = useState<TeamMember[]>([]);
 const [pendingRow, setPendingRow] = useState<PendingRow | null>(null);
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [teamSearch, setTeamSearch] = useState("");
 const [customRoles, setCustomRoles] = useState<string[]>([]);
 const [showAddRoleModal, setShowAddRoleModal] = useState(false);
 const [newRoleName, setNewRoleName] = useState("");

 const baseRoles = isAudit ? AUDIT_ROLES : ["Partner", "Manager", "Senior", "Staff / Assistant", "Preparer"];
 const roleOptions = [...baseRoles,...customRoles];

 const getRecommendedCategory = () => {
 if (isAudit) return "audit";
 if (accountingStandards.toLowerCase().includes("tax")) return "tax";
 if (engagementType.includes("COM") || engagementType.toLowerCase().includes("compilation")) return "compilation";
 return "review";
 };

 const addRecommendedTeam = () => {
 const recs = RECOMMENDED_TEAM[getRecommendedCategory()] ?? RECOMMENDED_TEAM.review;
 setRecommendedPending(prev => [
...prev,
...recs.map(r => ({ id: uid(), role: r.role, name: "", email: "", title: "", hourlyRate: r.hourlyRate, timeAllocation: r.timeAllocation })),
 ]);
 };

 const confirmRecommendedRow = (id: string) => {
 const row = recommendedPending.find(r => r.id === id);
 if (!row) return;
 setTeamMembers(prev => [...prev, row]);
 setRecommendedPending(prev => prev.filter(r => r.id !== id));
 };

 const cancelRecommendedRow = (id: string) => {
 setRecommendedPending(prev => prev.filter(r => r.id !== id));
 };

 const startAddMember = () => {
 if (pendingRow) return;
 setPendingRow({ mode: 'add', draft: { id: uid(), role: roleOptions[0] ?? "", name: "", email: "", title: "", hourlyRate: "0.00", timeAllocation: "" } });
 };
 const startEditMember = (member: TeamMember) => {
 if (pendingRow) return;
 setPendingRow({ mode: 'edit', originalId: member.id, draft: {...member } });
 };
 const confirmPendingRow = () => {
 if (!pendingRow) return;
 if (pendingRow.mode === 'add') {
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

 const engagementTypeOptions = [
 { value: "Audit (AUD)", label: "Audit (AUD)" },
 { value: "Compilation (COM)", label: "Compilation (COM)" },
 { value: "Review (REV)", label: "Review (REV)" },
 { value: "T2 (Corporations)", label: "T2 (Corporations)" },
 { value: "1120 (US C-Corporation)", label: "1120 (US C-Corporation)" },
 { value: "1120S (US S-Corporation)", label: "1120S (US S-Corporation)" },
 ];

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
 ? [
 { value: "Full Year", label: "Full Year" },
 { value: "Stub Period", label: "Stub Period" },
 { value: "Other", label: "Other" },
 ]
 : [
 { value: "Full year", label: "Full year" },
 ];

 const engagementDetailsValid =
 engagementId.trim() !== "" &&
 engagementTemplate.trim() !== "" &&
 engagementType !== "" &&
 accountingStandards !== "";

 const isFormValid =
 clientName.trim() !== "" &&
 engagementId.trim() !== "" &&
 engagementTemplate.trim() !== "" &&
 engagementType !== "" &&
 budget.trim() !== "" &&
 accountingStandards !== "" &&
 additionalDisclosures !== "" &&
 currentYearStart.trim() !== "" &&
 currentYearEnd.trim() !== "" &&
 teamMembers.length > 0;

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
 firstYearOnPlatform: firstYearAudit ? firstYearOnPlatform : undefined,
 isRollForward: firstYearAudit ? isRollForward : undefined,
 firstYearTemplates: firstYearAudit ? [...firstYearTemplates] : undefined,
 templateId: templateId || undefined,
 accountingFramework: isAudit ? accountingStandards : undefined,
 accountingStandards,
 budget,
 periodStart: currentYearStart,
 periodEnd: currentYearEnd,
 auditPeriodType: isAudit ? periodType : undefined,
 annualizeInterim: isAudit && periodType === "Interim (6-month)" ? annualizeInterim : undefined,
 firstTimeAdoption: isAudit ? firstTimeAdoption : undefined,
 });
 if (isAudit && teamMembers.length > 0) {
 const roleMap: Record<string, string> = {
 "Engagement Partner": "partner",
 "Manager": "manager",
 "Senior Auditor": "senior",
 "Staff Auditor / Assistant": "assistant",
 "EQCR (Quality Reviewer)": "eqcr",
 "Subject Matter Expert": "specialist",
 "Tax Reviewer": "admin",
 "Preparer": "admin",
 "Other": "other",
 };
 const rateMap: Record<string, string> = {};
 teamMembers.forEach(m => {
 const key = roleMap[m.role];
 if (key && m.hourlyRate && parseFloat(m.hourlyRate) > 0 && !rateMap[key]) {
 rateMap[key] = m.hourlyRate;
 }
 });
 if (Object.keys(rateMap).length > 0) {
 localStorage.setItem(`audit-team-rates-${engagementId}`, JSON.stringify(rateMap));
 }
 }
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
 {/* Header with back button */}
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
 {/* Client Info Banner — full page width */}
 {clientInfo && (
 <div className="bg-card rounded-lg shadow-sm px-6 py-5 border border-border">
 <h2 className="text-sm font-semibold text-foreground mb-4">Client Info</h2>
 <div className="grid grid-cols-11 gap-4">
 {[
 { label: "Entity legal name", value: clientInfo.entityLegalName },
 { label: "Entity type", value: clientInfo.entityType },
 { label: "Client country", value: clientInfo.clientCountry === "ca" ? "🇨🇦 Canada" : "🇺🇸 United States" },
 { label: "Industry", value: clientInfo.industryType },
 { label: "Contact person", value: clientInfo.contactPerson },
 { label: "Engagement partner", value: clientInfo.engagementPartner, isLink: true },
 { label: "Integrations", value: clientInfo.integrations },
 { label: "Business phone", value: clientInfo.businessPhone },
 { label: "Cell phone", value: clientInfo.cellPhone },
 { label: "Quebec personal info", value: clientInfo.hasQuebecPersonalInfo ? "Yes" : "No", isFlag: true, flagActive: clientInfo.hasQuebecPersonalInfo },
 { label: "US taxpayer", value: clientInfo.isUsTaxpayer ? "Yes" : "No", isFlag: true, flagActive: clientInfo.isUsTaxpayer },
 ].map((col) => (
 <div key={col.label} className="flex flex-col gap-1">
 <span className="text-xs font-semibold text-primary">{col.label}</span>
 {Array.isArray(col.value) ? (
 <div className="flex items-center gap-1.5">
 {col.value.includes("quickbooks") && <img src={intuitQuickbooksLogo} alt="QuickBooks" className="h-5 object-contain" />}
 </div>
 ) : (col as any).isFlag ? (
 <span className={`text-sm font-medium ${(col as any).flagActive ? "text-amber-600" : "text-muted-foreground"}`}>{col.value as string}</span>
 ) : (col as any).isLink ? (
 <span className="text-sm text-link font-medium cursor-pointer hover:underline">{col.value as string}</span>
 ) : (
 <span className="text-sm text-foreground">{col.value as string}</span>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Two-column grid: forms (left) + audit config panel (right) */}
 <div className="flex flex-col gap-5 w-full">
 {/* Engagement Details — inline labels */}
 <SectionCard icon={<Briefcase className="h-5 w-5" />} title="Engagement Details">
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
 <InlineRow label="Engagement Type" required>
 <Select value={engagementType} onValueChange={setEngagementType} disabled>
 <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {engagementTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
 </SelectContent>
 </Select>
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
 {isAudit && SPF_VALUES.includes(accountingStandards) && (
 <InlineRow label="Engagement Standard">
 <Select value={specialPurposeFramework} onValueChange={setSpecialPurposeFramework}>
 <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select if applicable..." /></SelectTrigger>
 <SelectContent>
 {SPECIAL_ENGAGEMENT_TYPES.map(fw => <SelectItem key={fw} value={fw}>{fw}</SelectItem>)}
 </SelectContent>
 </Select>
 </InlineRow>
 )}
 {!isAudit && (
 <InlineRow label="Additional Disclosures" required>
 <Select value={additionalDisclosures} onValueChange={setAdditionalDisclosures}>
 <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
 <SelectContent>
 {disclosureOptions.map(o =>
 <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
 )}
 </SelectContent>
 </Select>
 </InlineRow>
 )}
 </SectionCard>

 {/* Audit Configuration (audit only) */}
 {isAudit && (
 <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
 {/* Panel header */}
 <div className="px-5 py-4 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <Settings2 className="h-4 w-4 text-primary" />
 <h3 className="text-sm font-semibold text-foreground">Audit Configuration</h3>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">Answer each question to configure your engagement.</p>
 </div>

 {/* Questions — unlocked after engagement details filled */}
 {engagementDetailsValid ? (
 <div>
 {/* FORM PREFERENCES */}
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

 <SectionCard icon={<Calendar className="h-5 w-5" />} title="Engagement Period">
 {/* Period Type */}
 <div className="flex items-center gap-4 py-2.5">
 <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap">Period Type<span className="text-destructive ml-0.5">*</span></span>
 <div className="flex-1 min-w-0 max-w-sm">
 <Select value={periodType} onValueChange={setPeriodType}>
 <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
 <SelectContent>
 {periodTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 </div>
 {/* Year rows */}
 {[
 { label: "Current Year", required: true, start: currentYearStart, setStart: setCurrentYearStart, end: currentYearEnd, setEnd: setCurrentYearEnd },
 { label: "Prior Year 1", required: false, start: priorYear1Start, setStart: setPriorYear1Start, end: priorYear1End, setEnd: setPriorYear1End },
 { label: "Prior Year 2", required: false, start: priorYear2Start, setStart: setPriorYear2Start, end: priorYear2End, setEnd: setPriorYear2End },
 ].map(row => (
 <div key={row.label} className="flex items-start gap-4 py-2.5">
 <span className="text-sm text-foreground w-32 shrink-0 whitespace-nowrap pt-5">
 {row.label}{row.required && <span className="text-destructive ml-0.5">*</span>}
 </span>
 <div className="flex gap-3 flex-1 min-w-0">
 <div className="flex-1 min-w-0 max-w-44"><LabeledInput label="Start Date" value={row.start} onChange={row.setStart} required={row.required} icon={<Calendar className="h-4 w-4" />} /></div>
 <div className="flex-1 min-w-0 max-w-44"><LabeledInput label="End Date" value={row.end} onChange={row.setEnd} required={row.required} icon={<Calendar className="h-4 w-4" />} /></div>
 </div>
 </div>
 ))}
 </SectionCard>
 </div>

 {/* Assigned Team — full page width, gated */}
 {engagementDetailsValid && (
 <SectionCard
 icon={<Users className="h-5 w-5" />}
 title="Assigned team"
 badge={`${teamMembers.length + recommendedPending.length} User`}
 headerRight={
 <div className="flex items-center gap-2">
 <Button variant="outline" onClick={addRecommendedTeam} className="h-9 px-3 gap-1.5 text-sm">
 Add Recommended
 </Button>
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
 <Checkbox checked={teamMembers.length > 0 && selectedIds.size === teamMembers.length} onCheckedChange={v => setSelectedIds(v ? new Set(teamMembers.map(m => m.id)) : new Set())} />
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
 pendingRow?.mode === 'edit' && pendingRow.originalId === member.id ? (
 <TeamMemberEditRow key={member.id} draft={pendingRow.draft} onChangeDraft={d => setPendingRow({ mode: 'edit', originalId: member.id, draft: d })} onConfirm={confirmPendingRow} onCancel={cancelPendingRow} roleOptions={roleOptions} onAddRole={() => { setNewRoleName(""); setShowAddRoleModal(true); }} />
 ) : (
 <TeamMemberViewRow key={member.id} member={member} checked={selectedIds.has(member.id)} onCheck={() => toggleSelect(member.id)} onEdit={() => startEditMember(member)} onDelete={() => deleteMember(member.id)} />
 )
 )}
 {recommendedPending.map(rec => (
 <TeamMemberEditRow
 key={rec.id}
 draft={rec}
 onChangeDraft={d => setRecommendedPending(prev => prev.map(r => r.id === d.id ? d : r))}
 onConfirm={() => confirmRecommendedRow(rec.id)}
 onCancel={() => cancelRecommendedRow(rec.id)}
 roleOptions={roleOptions}
 onAddRole={() => { setNewRoleName(""); setShowAddRoleModal(true); }}
 />
 ))}
 {pendingRow?.mode === 'add' && (
 <TeamMemberEditRow draft={pendingRow.draft} onChangeDraft={d => setPendingRow({ mode: 'add', draft: d })} onConfirm={confirmPendingRow} onCancel={cancelPendingRow} roleOptions={roleOptions} onAddRole={() => { setNewRoleName(""); setShowAddRoleModal(true); }} />
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
 <Button 
 variant="outline" 
 onClick={() => navigate("/engagements")}
 >
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
 <DialogHeader>
 <DialogTitle>Add new role</DialogTitle>
 </DialogHeader>
 <div className="py-2">
 <input
 autoFocus
 value={newRoleName}
 onChange={e => setNewRoleName(e.target.value)}
 onKeyDown={e => {
 if (e.key === "Enter" && newRoleName.trim()) {
 const role = newRoleName.trim();
 setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
 setPendingRow(prev => prev ? {...prev, draft: {...prev.draft, role } } : prev);
 setShowAddRoleModal(false);
 }
 }}
 placeholder="e.g. IT Specialist"
 className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
 />
 </div>
 <DialogFooter>
 <Button variant="outline" size="sm" onClick={() => setShowAddRoleModal(false)}>Cancel</Button>
 <Button
 size="sm"
 disabled={!newRoleName.trim()}
 onClick={() => {
 const role = newRoleName.trim();
 setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
 setPendingRow(prev => prev ? {...prev, draft: {...prev.draft, role } } : prev);
 setShowAddRoleModal(false);
 }}
 >
 Add role
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </Layout>
 );
}
