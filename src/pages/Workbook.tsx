import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
 ChevronDown,
 ChevronRight,
 Search,
 Download,
 Plus,
 Minimize2,
 RefreshCw,
 FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Row, Group, GROUPS } from "@/lib/tbGroups";

export type { Row, Group };

// Reuse engagement data shape from EngagementDetail (lightweight inline copy)
const engagementsData: Record<
 string,
 { id: string; client: string; type: string; yearEnd: string }
> = {
 "COM-CON-Dec312024": { id: "COM-CON-Dec312024", client: "Shipping Line Inc.", type: "Compilation (COM)", yearEnd: "Dec 31, 2024" },
 "COM-PSP-Dec312023": { id: "COM-PSP-Dec312023", client: "Source 40", type: "Compilation (COM)", yearEnd: "Dec 31, 2023" },
 "COM-QB-Dec312025": { id: "COM-QB-Dec312025", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Dec 31, 2025" },
 "AUD-SL-Mar312024": { id: "AUD-SL-Mar312024", client: "Shipping Line Inc.", type: "Audit (AUD)", yearEnd: "Mar 31, 2024" },
 "REV-SL-Jun302024": { id: "REV-SL-Jun302024", client: "Shipping Line Inc.", type: "Review (REV)", yearEnd: "Jun 30, 2024" },
 "COM-S40-Jun302024": { id: "COM-S40-Jun302024", client: "Source 40", type: "Compilation (COM)", yearEnd: "Jun 30, 2024" },
 "AUD-US-Dec312024": { id: "AUD-US-Dec312024", client: "Harbor Freight Logistics LLC", type: "Audit (GAAS/US)", yearEnd: "Dec 31, 2024" },
};

type NavKey =
 | "tb-grouping"
 | "balance-sheet"
 | "income"
 | "cash-flows"
 | "notes"
 | "schedules";

const NAV_ITEMS: { id: NavKey; label: string }[] = [
 { id: "tb-grouping", label: "Trial Balance Grouping" },
 { id: "balance-sheet", label: "Balance Sheet" },
 { id: "income", label: "Statement of Income and R..." },
 { id: "cash-flows", label: "Statement of Cash Flows" },
 { id: "notes", label: "Notes to Financial Information" },
 { id: "schedules", label: "Schedules" },
];

const formatAmt = (n: number) => {
 if (n === 0) return "0.00";
 const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 return n < 0 ? `(${abs})` : abs;
};

export default function Workbook() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const engagement = (engagementId && engagementsData[engagementId]) || {
 id: engagementId || "—",
 client: "Test123",
 type: "Compilation (COM)",
 yearEnd: "Dec 31, 2024",
 };

 const [active, setActive] = useState<NavKey>("tb-grouping");
 const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
 const [search, setSearch] = useState("");
 const [sidebarOpen, setSidebarOpen] = useState(true);

 // Force light theme on this page for consistent white workbook experience
 useEffect(() => {
 const root = document.documentElement;
 const hadDark = root.classList.contains("dark");
 if (hadDark) root.classList.remove("dark");
 return () => {
 if (hadDark) root.classList.add("dark");
 };
 }, []);

 const toggleGroup = (id: string) =>
 setCollapsedGroups((prev) => {
 const n = new Set(prev);
 n.has(id) ? n.delete(id) : n.add(id);
 return n;
 });

 const filteredGroups = useMemo(() => {
 if (!search.trim()) return GROUPS;
 const q = search.toLowerCase();
 return GROUPS.map((g) => ({
...g,
 rows: g.rows.filter(
 (r) =>
 r.description.toLowerCase().includes(q) ||
 r.accNo.includes(q) ||
 r.mapNo.includes(q),
 ),
 })).filter((g) => g.rows.length > 0);
 }, [search]);

 const totals = (rows: Row[]) =>
 rows.reduce(
 (acc, r) => ({
 original: acc.original + r.original,
 adj: acc.adj + r.adj,
 final: acc.final + r.final,
 py1: acc.py1 + r.py1,
 }),
 { original: 0, adj: 0, final: 0, py1: 0 },
 );

 return (
 <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
 {/* Top navy bar */}
 <header className="shrink-0 bg-[hsl(213,68%,28%)] text-white">
 <div className="flex items-center justify-between px-6 py-3 text-sm">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-white/10 font-semibold text-xs tracking-wide">
 <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/15 text-[10px]">
 {engagement.type.startsWith("Audit") ? "AUD" : engagement.type.startsWith("Review") ? "REV" : "COM"}
 </span>
 </div>
 <span className="opacity-80">Engagement Name:</span>
 <span className="font-semibold">{engagement.id}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="opacity-80">Client Name:</span>
 <span className="font-semibold">{engagement.client}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="opacity-80">Year End Date:</span>
 <span className="font-semibold">{engagement.yearEnd}</span>
 </div>
 </div>
 </header>

 {/* Body */}
 <div className="flex flex-1 min-h-0">
 {/* LHS menu */}
 {sidebarOpen && (
 <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
 <div className="flex items-center justify-end px-3 py-2 border-b border-border">
 <button
 onClick={() => setSidebarOpen(false)}
 className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
 aria-label="Collapse sidebar"
 >
 <ChevronRight className="h-4 w-4 rotate-180" />
 </button>
 </div>
 <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
 {NAV_ITEMS.map((item) => (
 <button
 key={item.id}
 onClick={() => setActive(item.id)}
 className={cn(
 "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
 active === item.id
 ? "bg-primary/10 text-primary font-semibold"
 : "text-foreground hover:bg-muted",
 )}
 >
 <span className="truncate">{item.label}</span>
 {item.id === "schedules" && (
 <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
 )}
 </button>
 ))}
 </nav>
 </aside>
 )}

 {/* Main */}
 <main className="flex-1 min-w-0 overflow-auto bg-background">
 <div className="px-8 py-6">
 {/* Toolbar (collapse / refresh) */}
 <div className="flex items-center gap-2 mb-4">
 {!sidebarOpen && (
 <button
 onClick={() => setSidebarOpen(true)}
 className="h-9 w-9 rounded-md flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground"
 aria-label="Open sidebar"
 >
 <ChevronRight className="h-4 w-4" />
 </button>
 )}
 <button className="h-9 w-9 rounded-md flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground">
 <Minimize2 className="h-4 w-4" />
 </button>
 <button className="h-9 w-9 rounded-md flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground">
 <RefreshCw className="h-4 w-4" />
 </button>
 </div>

 {/* Title */}
 <div className="text-center mb-6">
 <h1 className="text-2xl font-bold text-foreground">Trial Balance Grouping</h1>
 <p className="text-sm text-muted-foreground mt-1">As at {engagement.yearEnd.replace("Dec 31,", "December 31,")}</p>
 </div>

 {/* Filters row */}
 <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
 <div className="flex items-end gap-4">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-foreground">Entity Name</label>
 <Select defaultValue={engagement.client}>
 <SelectTrigger className="w-[240px] h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value={engagement.client}>{engagement.client}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-foreground">Year End Date</label>
 <Select defaultValue={engagement.yearEnd}>
 <SelectTrigger className="w-[200px] h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value={engagement.yearEnd}>{engagement.yearEnd}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 w-[260px] h-9"
 />
 </div>
 <Button className="h-9 gap-2">
 <Download className="h-4 w-4" />
 Export
 <ChevronDown className="h-3 w-3 opacity-80" />
 </Button>
 </div>
 </div>

 {/* Table */}
 <div className="rounded-lg border border-border bg-card overflow-hidden shadow-[0_2px_8px_hsl(213_40%_20%/0.04)]">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 <th className="w-10 px-3 py-3"></th>
 <th className="px-3 py-3 text-left w-16">LS</th>
 <th className="px-3 py-3 text-left w-24">Map No.</th>
 <th className="px-3 py-3 text-left w-20">Acc No.</th>
 <th className="px-3 py-3 text-left">Description</th>
 <th className="px-3 py-3 text-right w-28">Original</th>
 <th className="px-3 py-3 text-right w-20">Adj</th>
 <th className="px-3 py-3 text-right w-28">Final</th>
 <th className="px-3 py-3 text-right w-28">PY1</th>
 <th className="px-3 py-3 text-right w-32">Change (%)</th>
 <th className="px-3 py-3 text-center w-16">Notes</th>
 <th className="px-3 py-3 text-center w-16">Ref</th>
 </tr>
 </thead>
 <tbody>
 {filteredGroups.map((group) => {
 const collapsed = collapsedGroups.has(group.id);
 const t = totals(group.rows);
 return (
 <>
 <tr key={`${group.id}-h`} className="bg-muted/50 border-t border-border border-l-2 border-l-primary">
 <td colSpan={12} className="px-3 py-2.5">
 <button
 onClick={() => toggleGroup(group.id)}
 className="flex items-center gap-2 text-sm font-semibold text-foreground"
 >
 {collapsed ? (
 <ChevronRight className="h-4 w-4 text-muted-foreground" />
 ) : (
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 )}
 {group.title}
 </button>
 </td>
 </tr>
 {!collapsed &&
 group.rows.map((row) => (
 <tr
 key={row.id}
 className="border-t border-border hover:bg-muted/30 transition-colors"
 >
 <td className="px-3 py-2.5">
 <input
 type="checkbox"
 className="h-4 w-4 rounded border-border accent-primary"
 />
 </td>
 <td className="px-3 py-2.5">
 <span className="text-primary font-semibold">{row.ls}</span>
 </td>
 <td className="px-3 py-2.5">
 <span className="text-primary">{row.mapNo}</span>
 </td>
 <td className="px-3 py-2.5 text-foreground">{row.accNo}</td>
 <td className="px-3 py-2.5 text-foreground truncate">{row.description}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(row.original)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-primary">{formatAmt(row.adj)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(row.final)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(row.py1)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{row.changePct}</td>
 <td className="px-3 py-2.5 text-center">
 <FileText className="h-4 w-4 text-muted-foreground inline-block" />
 </td>
 <td className="px-3 py-2.5 text-center">
 {row.ref ? (
 <span className="text-primary font-medium">{row.ref}</span>
 ) : (
 <span className="text-muted-foreground">-</span>
 )}
 </td>
 </tr>
 ))}
 {!collapsed && (
 <tr className="border-t-2 border-border bg-muted/30 font-semibold">
 <td colSpan={4}></td>
 <td className="px-3 py-2.5 text-foreground">Total {group.title.replace(/^[A-Z]\s*-\s*/, "")}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(t.original)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(t.adj)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(t.final)}</td>
 <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatAmt(t.py1)}</td>
 <td colSpan={3}></td>
 </tr>
 )}
 </>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </main>
 </div>
 </div>
 );
}
