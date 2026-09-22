import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Trash2, Zap, AlertTriangle, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useParams } from "react-router-dom";
import { useTimeEntries, RoleKey, ROLE_LABELS, CURRENT_USER, TimeEntry } from "@/lib/useTimeEntries";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_KEYS: RoleKey[] = ["partner", "manager", "senior", "assistant", "eqcr", "specialist", "admin"];

const INDUSTRY_ROLE_PCT: Record<RoleKey, number> = {
 partner: 12, manager: 18, senior: 27, assistant: 30,
 eqcr: 8, specialist: 3, admin: 2, other: 0,
};

const SECTIONS = [
 { key: "general", label: "General / Planning", pct: 15 },
 { key: "risk-assess", label: "Risk Assessment", pct: 25 },
 { key: "risk-resp", label: "Risk Response", pct: 48 },
 { key: "reporting", label: "Reporting / Completion", pct: 12 },
];

const DEFAULT_RATES: Partial<Record<RoleKey, string>> = {
 partner: "350", manager: "250", senior: "175", assistant: "125",
 eqcr: "300", specialist: "200", admin: "75",
};

const TASKS: Record<string, { id: string; label: string }[]> = {
 general: [
 { id: "g1", label: "Overall strategy and planning" },
 { id: "g2", label: "Supervision and review" },
 { id: "g3", label: "Client communication" },
 { id: "g4", label: "Meetings and coordination" },
 { id: "g5", label: "Reports and documentation" },
 { id: "g6", label: "Administration" },
 { id: "g7", label: "Travel" },
 ],
 "risk-assess": [
 { id: "ra1", label: "F/S analysis and planning" },
 { id: "ra2", label: "Planning risk assessment procedures" },
 { id: "ra3", label: "Performing risk assessment procedures" },
 { id: "ra4", label: "Assessing results" },
 ],
 "risk-resp": [
 { id: "rr1", label: "Overall responses to risks" },
 { id: "rr2", label: "Fraud risk procedures" },
 { id: "rr3", label: "Cash and bank" },
 { id: "rr4", label: "Accounts receivable" },
 { id: "rr5", label: "Inventory" },
 { id: "rr6", label: "Property, plant & equipment" },
 { id: "rr7", label: "Intangible assets" },
 { id: "rr8", label: "Long-term debt" },
 { id: "rr9", label: "Accounts payable" },
 { id: "rr10", label: "Income taxes" },
 { id: "rr11", label: "Contingencies" },
 { id: "rr12", label: "Shareholders' equity" },
 { id: "rr13", label: "Related party transactions" },
 { id: "rr14", label: "Revenue" },
 { id: "rr15", label: "Cost of goods sold" },
 { id: "rr16", label: "Payroll" },
 { id: "rr17", label: "Operating expenses" },
 { id: "rr18", label: "Other income / expense" },
 { id: "rr19", label: "Other substantive procedures" },
 { id: "rr20", label: "Completion procedures" },
 ],
 reporting: [
 { id: "rep1", label: "Financial statement review" },
 { id: "rep2", label: "EQCR review" },
 { id: "rep3", label: "Final partner review" },
 { id: "rep4", label: "Management representation letter" },
 { id: "rep5", label: "File completion and archiving" },
 ],
};

const ALL_TASKS = Object.values(TASKS).flat();

const TEAM_MEMBERS: Record<RoleKey, string[]> = {
 partner: ['John M.', 'Sarah K.'],
 manager: ['Praveen D.', 'Lisa T.'],
 senior: ['Alex R.', 'Michelle C.', 'Ryan B.'],
 assistant: ['Tom B.', 'Nina F.', 'Daniel W.', 'Emma L.'],
 eqcr: ['Robert H.'],
 specialist: ['Karen L.'],
 admin: ['Grace P.'],
 other: ['Other'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const num = (s: string | undefined | null) => parseFloat(s ?? "") || 0;
const fmtH = (v: number) => (v % 1 === 0 ? `${v}` : v.toFixed(1));
const fmt$ = (v: number) =>
 v.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const round4 = (v: number) => Math.round(v * 4) / 4;

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetPlan {
 totalHrs: string;
 proposedFee: string;
 byRole: Partial<Record<RoleKey, string>>;
 bySection: Partial<Record<string, string>>;
 teamByRole: Partial<Record<RoleKey, string>>;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AuditTimeTrackerWorksheet() {
 const { engagementId = "default" } = useParams<{ engagementId: string }>();
 const ratesKey = `audit-team-rates-${engagementId}`;
 const budgetKey = `audit-time-budget-${engagementId}`;

 const { entries, addEntry, removeEntry, updateEntry, hrsForRole, hrsForSection } = useTimeEntries(engagementId);

 const concludeKey = `audit-450-concluded-${engagementId}`;
 const [concluded, setConcluded] = useState(() => readJsonFromLocalStorage<boolean>(concludeKey, false));
 const [concludedOn, setConcludedOn] = useState(() => readJsonFromLocalStorage<string>(`${concludeKey}-on`, ""));
 const locked = concluded;

 // ── Inline edit state for Time Log rows ───────────────────────────────────
 const [edits, setEdits] = useState<Record<string, Partial<TimeEntry>>>({});

 const getVal = <K extends keyof TimeEntry>(e: TimeEntry, field: K): TimeEntry[K] =>
 (edits[e.id]?.[field] ?? e[field]) as TimeEntry[K];

 const setField = (id: string, field: keyof TimeEntry, value: string | number) => {
 setEdits(prev => {
 const patch: Partial<TimeEntry> = {...prev[id], [field]: value };
 if (field === 'tbSection') {
 patch.tbRowId = TASKS[value as string]?.[0]?.id ?? '';
 }
 return {...prev, [id]: patch };
 });
 };

 const commitEdit = (e: TimeEntry) => {
 const patch = edits[e.id];
 if (!patch || Object.keys(patch).length === 0) return;
 updateEntry({...e,...patch });
 setEdits(prev => { const next = {...prev }; delete next[e.id]; return next; });
 };

 const commitSelect = (e: TimeEntry, field: keyof TimeEntry, value: string) => {
 const patch: Partial<TimeEntry> = { [field]: value };
 if (field === 'tbSection') patch.tbRowId = TASKS[value]?.[0]?.id ?? '';
 updateEntry({...e,...edits[e.id],...patch });
 setEdits(prev => { const next = {...prev }; delete next[e.id]; return next; });
 };

 // ── Rates ─────────────────────────────────────────────────────────────────
 const [rates, setRates] = useState<Partial<Record<RoleKey, string>>>(() => {
 const saved = readJsonFromLocalStorage<Partial<Record<RoleKey, string>>>(ratesKey, {});
 return (saved && Object.keys(saved).length > 0) ? saved : {...DEFAULT_RATES };
 });

 // ── Budget plan ───────────────────────────────────────────────────────────
 const emptyBudget = (): BudgetPlan => ({
 totalHrs: "", proposedFee: "",
 byRole: Object.fromEntries(ROLE_KEYS.map(r => [r, ""])),
 bySection: Object.fromEntries(SECTIONS.map(s => [s.key, ""])),
 teamByRole: Object.fromEntries(ROLE_KEYS.map(r => [r, ""])),
 });

 const [budget, setBudget] = useState<BudgetPlan>(() => ({
...emptyBudget(),
...(readJsonFromLocalStorage<BudgetPlan | null>(budgetKey, null) ?? {}),
 }));

 // ── Time Log filters ─────────────────────────────────────────────────────
 const [filterDate, setFilterDate] = useState('');
 const [filterRole, setFilterRole] = useState('all');
 const [filterSection, setFilterSection] = useState('all');
 const [filterDesc, setFilterDesc] = useState('');

 const clearFilters = () => { setFilterDate(''); setFilterRole('all'); setFilterSection('all'); setFilterDesc(''); };
 const hasFilters = filterDate || filterRole !== 'all' || filterSection !== 'all' || filterDesc;

 // ── Log form ──────────────────────────────────────────────────────────────
 const today = new Date().toISOString();
 const [logDate, setLogDate] = useState(today);
 const [logRole, setLogRole] = useState<RoleKey>(CURRENT_USER.roleKey);
 const [logUserName, setLogUserName] = useState(CURRENT_USER.name);
 const [logSection, setLogSection] = useState("general");
 const [logTask, setLogTask] = useState("g1");
 const [logHours, setLogHours] = useState("");
 const [logDesc, setLogDesc] = useState("");

 useEffect(() => {
 const first = TASKS[logSection]?.[0];
 if (first) setLogTask(first.id);
 }, [logSection]);

 const handleLogRoleChange = (role: RoleKey) => {
 setLogRole(role);
 const members = TEAM_MEMBERS[role] ?? [];
 if (!members.includes(logUserName)) setLogUserName(members[0] ?? '');
 };


 // ── Persist ───────────────────────────────────────────────────────────────
 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 writeJsonToLocalStorage(ratesKey, rates);
 }, [rates, ratesKey]);

 useEffect(() => {
 const t = setTimeout(() => writeJsonToLocalStorage(budgetKey, budget), 400);
 return () => clearTimeout(t);
 }, [budget, budgetKey]);

 // ── Derived ───────────────────────────────────────────────────────────────
 const totalActualHrs = useMemo(() => entries.reduce((s, e) => s + e.hours, 0), [entries]);

 const filteredEntries = useMemo(() => entries.filter(e => {
 if (filterDate && e.date !== filterDate) return false;
 if (filterRole !== 'all' && e.roleKey !== filterRole) return false;
 if (filterSection !== 'all' && e.tbSection !== filterSection) return false;
 if (filterDesc && !e.description.toLowerCase().includes(filterDesc.toLowerCase())) return false;
 return true;
 }), [entries, filterDate, filterRole, filterSection, filterDesc]);

 const actualsByRole = useMemo(() => {
 const m: Partial<Record<RoleKey, number>> = {};
 for (const e of entries) m[e.roleKey] = (m[e.roleKey] ?? 0) + e.hours;
 return m;
 }, [entries]);

 const actualsBySection = useMemo(() => {
 const m: Record<string, number> = {};
 for (const e of entries) m[e.tbSection] = (m[e.tbSection] ?? 0) + e.hours;
 return m;
 }, [entries]);

 const totalBudgetHrs = useMemo(
 () => ROLE_KEYS.reduce((s, r) => s + num(budget.byRole[r]), 0),
 [budget.byRole]
 );

 const totalBudgetCost = useMemo(
 () => ROLE_KEYS.reduce((s, r) => s + num(budget.byRole[r]) * num(rates[r]), 0),
 [budget.byRole, rates]
 );

 const totalActualCost = useMemo(
 () => ROLE_KEYS.reduce((s, r) => s + (actualsByRole[r] ?? 0) * num(rates[r]), 0),
 [actualsByRole, rates]
 );

 const blendedRate = useMemo(() => {
 let cost = 0, hrs = 0;
 ROLE_KEYS.forEach(r => { const h = num(budget.byRole[r]); cost += h * num(rates[r]); hrs += h; });
 return hrs > 0 ? cost / hrs : 0;
 }, [budget.byRole, rates]);

 const varHrs = totalBudgetHrs - totalActualHrs;
 const overBudget = totalBudgetHrs > 0 && varHrs < 0;
 const ratesMissing = ROLE_KEYS.slice(0, 5).some(r => !num(rates[r]));

 // ── Handlers ──────────────────────────────────────────────────────────────

 const applyStandards = () => {
 const total = num(budget.totalHrs);
 if (!total) return;
 const byRole: Partial<Record<RoleKey, string>> = {};
 ROLE_KEYS.forEach(r => { byRole[r] = String(round4(total * INDUSTRY_ROLE_PCT[r] / 100)); });
 const bySection: Partial<Record<string, string>> = {};
 SECTIONS.forEach(s => { bySection[s.key] = String(round4(total * s.pct / 100)); });
 setBudget(b => ({...b, byRole, bySection }));
 };

 const logTime = () => {
 const hrs = parseFloat(logHours);
 if (!hrs || hrs <= 0) return;
 const cost = hrs * num(rates[logRole]);
 addEntry({
 id: `e-${Date.now()}`,
 date: logDate, roleKey: logRole,
 userName: logUserName || CURRENT_USER.name,
 tbRowId: logTask, tbSection: logSection,
 hours: hrs, description: logDesc,
...(cost > 0 ? { costOverride: cost } : {}),
 } as TimeEntry);
 setLogHours(""); setLogDesc("");
 };

 const logCost = (() => { const h = parseFloat(logHours); return h > 0 ? h * num(rates[logRole]) : 0; })();

 // ── JSX ───────────────────────────────────────────────────────────────────
 return (
 <div className="flex flex-col h-full">

 {/* Objective */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Track actual time against budgeted hours by role and section. Budget is based on
 CAS industry standards and fully editable. Blended rate, cost variance, and fee
 position are computed automatically from engagement hourly rates.
 </p>
 </div>
 <div className="p-6 space-y-5">

 {/* ── KPI strip */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: "Budget Hours", value: totalBudgetHrs > 0 ? fmtH(totalBudgetHrs) : "—",
 sub: "total budgeted", color: "" },
 { label: "Actual Hours", value: fmtH(totalActualHrs),
 sub: `${entries.length} entries`, color: "" },
 { label: "Variance",
 value: totalBudgetHrs > 0 ? (varHrs >= 0 ? "+" : "") + fmtH(varHrs) + " h" : "—",
 sub: overBudget ? "over budget" : totalBudgetHrs > 0 ? "remaining" : "no budget set",
 color: "" },
 { label: "Blended Rate", value: blendedRate > 0 ? fmt$(blendedRate) + "/hr" : "—",
 sub: "weighted avg by role", color: "" },
 ].map(k => (
 <div key={k.label} className="bg-card border border-border rounded-lg px-4 py-3">
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{k.label}</p>
 <p className={`text-xl font-bold ${k.color || "text-foreground"}`}>{k.value}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
 </div>
 ))}
 </div>

 {/* ── Rates + Budget Planning */}
 <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
 <div className="px-5 py-3 border-b border-border">
 <span className="text-sm font-semibold text-foreground">Rates &amp; Budget Planning</span>
 </div>

 {ratesMissing && (
 <div className="mx-5 mt-4 flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
 <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
 <p className="text-sm text-amber-700 dark:text-amber-400">
 Some rates are missing. Set team rates at engagement creation, or edit them directly in the table below.
 </p>
 </div>
 )}

 {/* Total hours + fee + apply */}
 <div className="px-5 pt-4 pb-3 flex flex-wrap items-end gap-4 border-b border-border/60">
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Total Budget Hours</p>
 <Input value={budget.totalHrs}
 onChange={e => setBudget(b => ({...b, totalHrs: e.target.value }))}
 placeholder="e.g. 150" className="h-8 w-32 text-sm" />
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Proposed Fee ($)</p>
 <Input value={budget.proposedFee}
 onChange={e => setBudget(b => ({...b, proposedFee: e.target.value }))}
 placeholder="e.g. 25000" className="h-8 w-36 text-sm" />
 </div>
 <Button size="sm" onClick={applyStandards} disabled={!num(budget.totalHrs)} className="gap-1.5">
 <Zap className="h-3.5 w-3.5" />Apply Industry Standards
 </Button>
 <div className="ml-auto text-right shrink-0">
 <p className="text-[11px] text-muted-foreground">Total Budget Cost</p>
 <p className="text-lg font-bold">{totalBudgetCost > 0 ? fmt$(totalBudgetCost) : "—"}</p>
 {num(budget.proposedFee) > 0 && totalBudgetCost > 0 && (
 <p className="text-sm font-medium text-foreground">
 vs. fee: {(num(budget.proposedFee) >= totalBudgetCost ? "+" : "") + fmt$(num(budget.proposedFee) - totalBudgetCost)}
 </p>
 )}
 </div>
 </div>

 {/* Role budget table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted text-sm font-semibold uppercase tracking-wider text-foreground border-b border-border [&>th]:whitespace-nowrap">
 <th className="px-5 py-2 text-left">Role</th>
 <th className="px-3 py-2 text-left w-36">Team Member</th>
 <th className="px-3 py-2 text-center w-14">Std %</th>
 <th className="px-3 py-2 text-right w-28">Rate ($/hr)</th>
 <th className="px-3 py-2 text-right w-28">Budget Hrs</th>
 <th className="px-3 py-2 text-right w-28">Budget $</th>
 <th className="px-3 py-2 text-right w-24">Actual Hrs</th>
 <th className="px-3 py-2 text-right w-24">Var Hrs</th>
 <th className="px-3 py-2 text-right w-24">Var $</th>
 <th className="px-3 py-2 text-right w-24">Actual $</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {ROLE_KEYS.map(rk => {
 const bh = num(budget.byRole[rk]);
 const ah = actualsByRole[rk] ?? 0;
 const rate = num(rates[rk]);
 const varH = bh - ah;
 return (
 <tr key={rk} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-2.5 font-medium text-foreground align-top">{ROLE_LABELS[rk]}</td>
 <td className="px-3 py-2 align-top">
 <Select
 value={budget.teamByRole[rk] || "none"}
 onValueChange={v => setBudget(b => ({...b, teamByRole: {...b.teamByRole, [rk]: v === "none" ? "" : v } }))}
 >
 <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="none">—</SelectItem>
 {(TEAM_MEMBERS[rk] ?? []).map(name => (
 <SelectItem key={name} value={name}>{name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2.5 text-center text-sm text-foreground align-top">{INDUSTRY_ROLE_PCT[rk]}%</td>
 <td className="px-3 py-2.5 align-top">
 <Input value={rates[rk] ?? ""}
 onChange={e => setRates(r => ({...r, [rk]: e.target.value }))}
 className="h-8 text-sm text-right"
 placeholder="0" />
 </td>
 <td className="px-3 py-2.5 align-top">
 <Input value={budget.byRole[rk] ?? ""}
 onChange={e => setBudget(b => ({...b, byRole: {...b.byRole, [rk]: e.target.value } }))}
 className="h-8 text-sm text-right"
 placeholder="0" />
 </td>
 <td className="px-3 py-2.5 text-right text-sm text-foreground align-top">
 {bh > 0 && rate > 0 ? fmt$(bh * rate) : "—"}
 </td>
 <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground align-top">{ah > 0 ? fmtH(ah) : "—"}</td>
 <td className="px-3 py-2.5 text-right text-sm font-semibold text-foreground align-top">
 {bh > 0 ? (varH >= 0 ? "+" : "") + fmtH(varH) : "—"}
 </td>
 <td className="px-3 py-2.5 text-right text-sm font-semibold text-foreground align-top">
 {bh > 0 && rate > 0 ? (varH >= 0 ? "+" : "") + fmt$(varH * rate) : "—"}
 </td>
 <td className="px-3 py-2.5 text-right text-sm text-foreground align-top">
 {ah > 0 && rate > 0 ? fmt$(ah * rate) : "—"}
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="bg-muted/50 border-t-2 border-border font-semibold text-sm [&>td]:whitespace-nowrap">
 <td className="px-5 py-2 text-foreground">Total</td>
 <td className="px-3 py-2" />
 <td className="px-3 py-2 text-center text-sm text-foreground">100%</td>
 <td className="px-3 py-2 text-right text-sm text-foreground">
 {blendedRate > 0 ? fmt$(blendedRate) : "—"}
 </td>
 <td className="px-3 py-2 text-right text-foreground">{totalBudgetHrs > 0 ? fmtH(totalBudgetHrs) : "—"}</td>
 <td className="px-3 py-2 text-right text-sm text-foreground">{totalBudgetCost > 0 ? fmt$(totalBudgetCost) : "—"}</td>
 <td className="px-3 py-2 text-right text-foreground">{totalActualHrs > 0 ? fmtH(totalActualHrs) : "—"}</td>
 <td className="px-3 py-2 text-right text-foreground">
 {totalBudgetHrs > 0 ? (varHrs >= 0 ? "+" : "") + fmtH(varHrs) : "—"}
 </td>
 <td className="px-3 py-2 text-right text-sm text-foreground">
 {totalBudgetCost > 0 ? ((totalBudgetCost - totalActualCost) >= 0 ? "+" : "") + fmt$(totalBudgetCost - totalActualCost) : "—"}
 </td>
 <td className="px-3 py-2 text-right text-sm text-foreground">{totalActualCost > 0 ? fmt$(totalActualCost) : "—"}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>

 {/* ── Section Budget vs Actual */}
 <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
 <div className="px-5 py-3 border-b border-border">
 <span className="text-sm font-semibold">Budget vs Actual — By Section</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted text-sm font-semibold uppercase tracking-wider text-foreground border-b border-border [&>th]:whitespace-nowrap">
 <th className="px-5 py-2 text-left">Section</th>
 <th className="px-3 py-2 text-center w-14">Std %</th>
 <th className="px-3 py-2 text-right w-28">Budget Hrs</th>
 <th className="px-3 py-2 text-right w-24">Actual Hrs</th>
 <th className="px-3 py-2 text-right w-24">Variance</th>
 <th className="px-5 py-2 text-left">Progress</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {SECTIONS.map(sec => {
 const bh = num(budget.bySection[sec.key]);
 const ah = actualsBySection[sec.key] ?? 0;
 const varH = bh - ah;
 const pct = bh > 0 ? Math.min(100, (ah / bh) * 100) : 0;
 const over = bh > 0 && ah > bh;
 return (
 <tr key={sec.key} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-2.5 font-medium text-foreground align-top">{sec.label}</td>
 <td className="px-3 py-2.5 text-center text-sm text-foreground align-top">{sec.pct}%</td>
 <td className="px-3 py-2.5 align-top">
 <Input value={budget.bySection[sec.key] ?? ""}
 onChange={e => setBudget(b => ({...b, bySection: {...b.bySection, [sec.key]: e.target.value } }))}
 className="h-8 text-sm text-right"
 placeholder="0" />
 </td>
 <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground align-top">{ah > 0 ? fmtH(ah) : "—"}</td>
 <td className="px-3 py-2.5 text-right text-sm font-semibold text-foreground align-top">
 {bh > 0 ? (varH >= 0 ? "+" : "") + fmtH(varH) : "—"}
 </td>
 <td className="px-5 py-2">
 {bh > 0 ? (
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : "bg-primary"}`}
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-sm font-medium w-9 shrink-0 text-right text-foreground">
 {Math.round(pct)}%
 </span>
 </div>
 ) : <span className="text-sm text-muted-foreground">Set budget hrs to track</span>}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Timer + Log Time */}
 <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
 <div className="px-5 py-3 border-b border-border">
 <span className="text-sm font-semibold">Log Time</span>
 </div>
 <div className="p-5 space-y-3">
 {/* Row 1: Date, Role, User Name, Section, Task */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Date</p>
 <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="h-8 text-sm" />
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
 <Select value={logRole} onValueChange={v => handleLogRoleChange(v as RoleKey)}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {ROLE_KEYS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">User Name</p>
 <Select value={logUserName} onValueChange={setLogUserName}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {(TEAM_MEMBERS[logRole] ?? []).map(name => (
 <SelectItem key={name} value={name}>{name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Section</p>
 <Select value={logSection} onValueChange={setLogSection}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {SECTIONS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Task</p>
 <Select value={logTask} onValueChange={setLogTask}>
 <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
 <SelectContent>
 {(TASKS[logSection] ?? []).map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 </div>
 {/* Row 2: Hours, Cost (auto), Description, Log Time */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Hours</p>
 <Input type="number" step="0.25" min="0" value={logHours}
 onChange={e => setLogHours(e.target.value)} placeholder="0.0" className="h-8 text-sm" />
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Cost (auto)</p>
 <div className="h-8 flex items-center px-3 rounded-[10px] border border-border bg-muted/40 text-sm text-foreground">
 {logCost > 0 ? fmt$(logCost) : <span className="text-muted-foreground">—</span>}
 </div>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
 <Input value={logDesc} onChange={e => setLogDesc(e.target.value)}
 placeholder="Work performed (optional)…" className="h-8 text-sm" />
 </div>
 <div className="flex flex-col justify-end">
 <Button onClick={logTime} disabled={!logHours || parseFloat(logHours) <= 0} className="h-8 w-full">
 + Log Time
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* ── Time Log */}
 <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]">
 <div className="px-5 py-3 border-b border-border flex items-center justify-between">
 <span className="text-sm font-semibold">Time Log</span>
 <div className="flex items-center gap-2">
 {hasFilters && (
 <button onClick={clearFilters} className="text-xs text-primary hover:underline">
 Clear filters
 </button>
 )}
 <span className="text-sm text-muted-foreground">
 {hasFilters
 ? `${filteredEntries.length} of ${entries.length} entries`
 : `${entries.length} entries`
 } · {fmtH(totalActualHrs)} h · {totalActualCost > 0 ? fmt$(totalActualCost) : "—"}
 </span>
 </div>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted text-sm font-semibold uppercase tracking-wider text-foreground border-b border-border [&>th]:whitespace-nowrap">
 {/* Date */}
 <th className="px-4 py-2 text-left">
 <div className="flex items-center gap-1">
 <span>Date</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className={`p-0.5 rounded transition-colors ${filterDate ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
 <Filter className={`h-3 w-3 ${filterDate ? 'fill-primary/20' : ''}`} />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-52">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 px-1">Filter by date</p>
 <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-7 text-sm" />
 {filterDate && (
 <button onClick={() => setFilterDate('')} className="mt-1.5 w-full text-left text-sm text-muted-foreground hover:text-foreground px-1">Clear</button>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </th>
 {/* Role */}
 <th className="px-4 py-2 text-left">
 <div className="flex items-center gap-1">
 <span>Role</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className={`p-0.5 rounded transition-colors ${filterRole !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
 <Filter className={`h-3 w-3 ${filterRole !== 'all' ? 'fill-primary/20' : ''}`} />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-52">
 <DropdownMenuRadioGroup value={filterRole} onValueChange={setFilterRole}>
 <DropdownMenuRadioItem value="all">All Roles</DropdownMenuRadioItem>
 <DropdownMenuSeparator />
 {ROLE_KEYS.map(r => (
 <DropdownMenuRadioItem key={r} value={r}>{ROLE_LABELS[r]}</DropdownMenuRadioItem>
 ))}
 </DropdownMenuRadioGroup>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </th>
 {/* Section › Task */}
 <th className="px-4 py-2 text-left">
 <div className="flex items-center gap-1">
 <span>Section › Task</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className={`p-0.5 rounded transition-colors ${filterSection !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
 <Filter className={`h-3 w-3 ${filterSection !== 'all' ? 'fill-primary/20' : ''}`} />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-56">
 <DropdownMenuRadioGroup value={filterSection} onValueChange={setFilterSection}>
 <DropdownMenuRadioItem value="all">All Sections</DropdownMenuRadioItem>
 <DropdownMenuSeparator />
 {SECTIONS.map(s => (
 <DropdownMenuRadioItem key={s.key} value={s.key}>{s.label}</DropdownMenuRadioItem>
 ))}
 </DropdownMenuRadioGroup>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </th>
 <th className="px-4 py-2 text-left w-28">Hours</th>
 <th className="px-4 py-2 text-right w-32">Cost</th>
 {/* Description */}
 <th className="px-4 py-2 text-left">
 <div className="flex items-center gap-1">
 <span>Description</span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className={`p-0.5 rounded transition-colors ${filterDesc ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
 <Filter className={`h-3 w-3 ${filterDesc ? 'fill-primary/20' : ''}`} />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-56">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 px-1">Search description</p>
 <Input value={filterDesc} onChange={e => setFilterDesc(e.target.value)}
 placeholder="Search…" className="h-7 text-sm" autoFocus />
 {filterDesc && (
 <button onClick={() => setFilterDesc('')} className="mt-1.5 w-full text-left text-sm text-muted-foreground hover:text-foreground px-1">Clear</button>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </th>
 <th className="px-4 py-2 w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredEntries.slice(0, 60).map(e => {
 const curSection = getVal(e, 'tbSection') as string;
 const curTask = getVal(e, 'tbRowId') as string;
 const curHours = getVal(e, 'hours') as number;
 const curRole = getVal(e, 'roleKey') as RoleKey;
 const rawUserName = (getVal(e, 'userName') as string | undefined) ?? '';
 const roleMembers = TEAM_MEMBERS[curRole] ?? [];
 const curUserName = roleMembers.includes(rawUserName) ? rawUserName : (roleMembers[0] ?? rawUserName);
 const computedCost = curHours * num(rates[curRole]);
 const curCostOverride = getVal(e, 'costOverride') as number | undefined;
 const displayCost = curCostOverride !== undefined ? curCostOverride : computedCost;
 return (
 <tr key={e.id} className="hover:bg-muted/30 transition-colors">
 {/* Date */}
 <td className="px-4 py-2.5 align-top">
 <Input
 type="date"
 value={getVal(e, 'date') as string}
 onChange={ev => setField(e.id, 'date', ev.target.value)}
 onBlur={() => commitEdit(e)}
 className="h-8 text-sm"
 />
 </td>
 {/* Role — User Name */}
 <td className="px-4 py-2.5 align-top">
 <Select
 value={curRole}
 onValueChange={v => {
 const newRole = v as RoleKey;
 const members = TEAM_MEMBERS[newRole] ?? [];
 const newUser = members.includes(curUserName) ? curUserName : (members[0] ?? curUserName);
 updateEntry({...e,...edits[e.id], roleKey: newRole, userName: newUser });
 setEdits(prev => { const next = {...prev }; delete next[e.id]; return next; });
 }}
 >
 <SelectTrigger className="h-8 text-sm">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {ROLE_KEYS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
 </SelectContent>
 </Select>
 <Select
 value={curUserName}
 onValueChange={v => commitSelect(e, 'userName', v)}
 >
 <SelectTrigger className="h-7 text-sm mt-1.5">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {(TEAM_MEMBERS[curRole] ?? []).map(name => (
 <SelectItem key={name} value={name}>{name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 {/* Section then Task */}
 <td className="px-4 py-2.5 align-top">
 <Select
 value={curSection}
 onValueChange={v => commitSelect(e, 'tbSection', v)}
 >
 <SelectTrigger className="h-8 text-sm">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {SECTIONS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
 </SelectContent>
 </Select>
 <Select
 value={curTask}
 onValueChange={v => commitSelect(e, 'tbRowId', v)}
 >
 <SelectTrigger className="h-8 text-sm mt-1.5">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {(TASKS[curSection] ?? []).map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 {/* Hours */}
 <td className="px-4 py-2.5 align-top">
 <Input
 type="number"
 step="0.25"
 min="0"
 value={curHours}
 onChange={ev => {
 const v = ev.target.valueAsNumber;
 if (!isNaN(v) && v >= 0) setField(e.id, 'hours', v);
 }}
 onBlur={() => commitEdit(e)}
 className="h-8 text-sm"
 />
 </td>
 {/* Cost (editable, overrides computed) */}
 <td className="px-4 py-2.5 align-top">
 <Input
 type="number"
 step="1"
 min="0"
 value={displayCost}
 onChange={ev => {
 const v = ev.target.valueAsNumber;
 if (!isNaN(v) && v >= 0) setField(e.id, 'costOverride', v);
 }}
 onBlur={() => commitEdit(e)}
 className="h-8 text-sm text-right"
 />
 </td>
 {/* Description */}
 <td className="px-4 py-2.5 align-top">
 <Textarea
 value={getVal(e, 'description') as string}
 onChange={ev => setField(e.id, 'description', ev.target.value)}
 onBlur={() => commitEdit(e)}
 placeholder="Description…"
 className="min-h-[60px] px-3 py-2 text-sm"
 />
 </td>
 {/* Delete */}
 <td className="px-4 py-2.5 align-top text-center">
 <button onClick={() => removeEntry(e.id)}
 className="text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 </tr>
 );
 })}
 {entries.length === 0 && (
 <tr>
 <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
 No time entries yet. Log your first entry above.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <WorksheetSignOff worksheetKey="audit-450" engagementId={engagementId} />

 {locked ? (
 <ConcludedRow concludedOn={concludedOn} onReopen={() => { setConcluded(false); setConcludedOn(''); writeJsonToLocalStorage(concludeKey, false); writeJsonToLocalStorage(`${concludeKey}-on`, ''); }} />
 ) : (
 <div className="flex justify-end">
 <Button size="sm" onClick={() => {
 const today = new Date().toISOString();
 setConcluded(true);
 setConcludedOn(today);
 writeJsonToLocalStorage(concludeKey, true);
 writeJsonToLocalStorage(`${concludeKey}-on`, today);
 }}>
 Conclude Worksheet
 </Button>
 </div>
 )}

 </div>
 </div>
 </div>
 );
}
