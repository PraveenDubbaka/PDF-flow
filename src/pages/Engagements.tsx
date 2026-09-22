import { useState, useEffect } from "react";
import React from "react";

function Highlight({ text, query }: { text: string; query: string }) {
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
import { useNavigate } from "react-router-dom";
import { useEngagements } from "@/store/EngagementsContext";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronUp, Pencil, Trash2, Download, Briefcase, Loader, CheckCircle2, Archive, X, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Layout } from "@/components/Layout";
import { StyledCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getActiveFirm() {
  try {
    const profiles = JSON.parse(localStorage.getItem("firmProfiles") || "[]");
    const id = localStorage.getItem("activeFirmId") ?? "firm-ca-1";
    return profiles.find((f: { id: string; region: string; name: string }) => f.id === id) as { id: string; region: "ca" | "us"; name: string } ?? { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  } catch {
    return { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  }
}

type AssigneeEntry = { initials: string; name: string; role: string; email: string; phone: string; color: string };
const ENGAGEMENT_ASSIGNEES: Record<string, { firmTeam: AssigneeEntry[]; clientTeam: AssigneeEntry[] }> = {
 'AUD-NPM-Dec312025': {
   firmTeam: [
     { initials: 'RC', name: 'R. Chandra', role: 'Engagement Partner', email: 'r.chandra@countable.co', phone: '(416) 555-0101', color: '#4C6EF5' },
     { initials: 'SW', name: 'S. Whitfield', role: 'Manager', email: 's.whitfield@countable.co', phone: '(416) 555-0102', color: '#12B886' },
     { initials: 'DO', name: 'D. Okonkwo', role: 'Senior Auditor', email: 'd.okonkwo@countable.co', phone: '(416) 555-0103', color: '#F76707' },
   ],
   clientTeam: [
     { initials: 'NP', name: 'Northline Precision', role: 'Contact Person', email: 'finance@northlineprecision.com', phone: '(905) 555-0200', color: '#39ADAD' },
   ],
 },
 'AUD-US-Dec312024': {
   firmTeam: [
     { initials: 'KP', name: 'K. Patel', role: 'Engagement Partner', email: 'k.patel@countable.co', phone: '(416) 555-0104', color: '#4C6EF5' },
   ],
   clientTeam: [
     { initials: 'HF', name: 'Harbor Freight Logistics', role: 'Contact Person', email: 'accounts@harborfreight.com', phone: '(312) 555-0300', color: '#F76707' },
   ],
 },
};

const ENGAGEMENT_TYPES = [
 { value: "Audit (AUD)", label: "Audit (AUD)" },
 { value: "Compilation (COM)", label: "Compilation (COM)" },
 { value: "Review (REV)", label: "Review (REV)" },
 { value: "T2 (Corporations)", label: "T2 (Corporations)" },
];

// Sample stats data
const stats = [
 { label: "Engagements", value: "1764" },
 { label: "New/In Progress", value: "1519" },
 { label: "Completed", value: "168" },
 { label: "Archived", value: "77" },
];

// Sample engagements data matching the screenshot
const engagements = [
 { id: "AUD-US-Dec312024", client: "Harbor Freight Logistics LLC", type: "Audit (AUD)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 20, 2025 08:00 AM" },
 { id: "AUD-SL-Mar312024", client: "Shipping Line Inc.", type: "Audit (AUD)", yearEnd: "Mar 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 21, 2026 10:00 AM" },
 { id: "COM-CON-Dec312024", client: "Shipping Line Inc.", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 21, 2026 09:00 AM" },
 { id: "COM-PSP-Dec312023", client: "Source 40", type: "Compilation (COM)", yearEnd: "Dec 31, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Dec 30, 2025 06:26 AM" },
 { id: "COM-QB-Dec312025", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Dec 31, 2025", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: true, dateCreated: "Jan 16, 2026 01:15 PM" },
 { id: "COM-QB-Dec312024", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 13, 2026 01:36 AM" },
 { id: "COM-CHE-Dec252024", client: "check add", type: "Compilation (COM)", yearEnd: "Dec 25, 2024", team: "View Assignees", status: "New", statusVariant: "new" as const, hasRF: false, dateCreated: "Jan 16, 2026 08:20 AM" },
 { id: "COM-OTH-Dec312024", client: "Other Revenue", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 16, 2026 02:38 AM" },
 { id: "T2-AUT-Dec312023", client: "Shipping Line Inc.", type: "T2 (Corporations)", yearEnd: "Dec 31, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Dec 30, 2025 08:48 AM" },
 { id: "COM-CAS-Dec312024", client: "cash flow ls", type: "Compilation (COM)", yearEnd: "Dec 31, 2024", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: false, dateCreated: "Jan 13, 2026 09:21 AM" },
 { id: "COM-QB-Jan142026", client: "qb 40.1", type: "Compilation (COM)", yearEnd: "Jan 14, 2026", team: "View Assignees", status: "New", statusVariant: "new" as const, hasRF: false, dateCreated: "Jan 13, 2026 04:36 AM" },
 { id: "COM-SHR-Dec302023", client: "ShRoll Forward", type: "Compilation (COM)", yearEnd: "Dec 30, 2023", team: "View Assignees", status: "In Progress", statusVariant: "inProgress" as const, hasRF: true, dateCreated: "Jan 13, 2026 03:51 AM" },
];

const StatusBadge = ({ status, hasRF }: { status: string; hasRF: boolean }) => {
 const getStatusVariant = () => {
 switch (status) {
 case "New":
 return "new" as const;
 case "In Progress":
 return "inProgress" as const;
 default:
 return "notStarted" as const;
 }
 };

 return (
 <div className="flex items-center gap-1.5">
 <Badge variant={getStatusVariant()}>
 {status}
 </Badge>
 {hasRF && (
 <Badge variant="rf" className="px-1.5">
 RF
 </Badge>
 )}
 </div>
 );
};

const filterPeriodOptions = [
 "Last 6 Month Engagements",
 "Last 3 Month Engagements",
 "Last 12 Month Engagements",
 "All Engagements",
];

export default function Engagements() {
 const navigate = useNavigate();
 const { engagements: engagementListRaw, deleteEngagement } = useEngagements();
 const engagementList = engagementListRaw;
 const [searchQuery, setSearchQuery] = useState("");
 const [filterPeriod, setFilterPeriod] = useState("Last 6 Month Engagements");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [activeFirm, setActiveFirm] = useState(getActiveFirm);
 useEffect(() => {
  const handler = () => setActiveFirm(getActiveFirm());
  window.addEventListener("firmSwitched", handler);
  return () => window.removeEventListener("firmSwitched", handler);
 }, []);

 // Create Engagement modal
 const [createModalOpen, setCreateModalOpen] = useState(false);
 const [selectedClient, setSelectedClient] = useState("");
 const [selectedEngType, setSelectedEngType] = useState("");

 const uniqueClients = Array.from(new Set(engagementList.map(e => e.client))).sort();

 const handleProceed = () => {
 setCreateModalOpen(false);
 navigate("/engagements/create", {
 state: { clientName: selectedClient, engagementType: selectedEngType },
 });
 };

 const filteredEngagements = (() => {
  const base = engagementList
   .filter(e => e.client?.toLowerCase().includes(searchQuery.toLowerCase()) || e.id?.toLowerCase().includes(searchQuery.toLowerCase()))
   .filter(e => {
    const region = e.client === "Harbor Freight Logistics LLC" ? "us" : "ca";
    return region === activeFirm.region;
   });
  const demo = base.filter(e => e.id === 'AUD-NPM-Dec312025');
  const rest = base.filter(e => e.id !== 'AUD-NPM-Dec312025');
  return [...demo, ...rest];
 })();

 const handleDelete = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (id === 'AUD-NPM-Dec312025') {
   toast.error('Demo engagement cannot be deleted.');
   return;
 }
 deleteEngagement(id);
 toast.success(`Engagement ${id} deleted`);
 };

 const handleEdit = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 navigate(`/engagements/${id}`);
 };

 return (
 <Layout title="Engagements">
 <div className="flex h-full overflow-hidden bg-background">
  <div className="flex-1 p-6 overflow-hidden flex flex-col min-w-0">
 <div className="flex flex-col flex-1 gap-6 min-h-0">
 {/* Stats Cards */}
 <div className="flex items-center gap-3 flex-shrink-0">
 {stats.map((stat, index) => {
 const config = [
 { color: 'text-primary', bg: 'bg-primary/10', icon: Briefcase, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Loader, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle2, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Archive, animation: '' },
 ];
 const { color, bg, icon: Icon, animation } = config[index];
 return (
 <div
 key={index}
 className="flex items-center gap-3 px-5 py-3 flex-1 bg-card border border-border shadow-sm cursor-default hover:shadow-md transition-shadow"
 style={{ borderRadius: '12px' }}
 >
 <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
 <Icon className={`h-4.5 w-4.5 ${color} ${animation}`} strokeWidth={2} />
 </div>
 <div className="flex flex-col">
 <span className={`text-xl font-bold leading-none ${color}`}>{stat.value}</span>
 <span className="text-[13px] font-medium text-foreground leading-tight mt-0.5 whitespace-nowrap">{stat.label}</span>
 </div>
 </div>
 );
 })}
 </div>

 <p className="text-sm text-muted-foreground mt-1">
  {activeFirm.region === "ca" ? "🇨🇦" : "🇺🇸"} {activeFirm.name} · {activeFirm.region === "ca" ? "CA-cell" : "US-cell"}
 </p>

 {/* Filter, Search, Export and Create Row - Enhanced spacing */}
 <div className="flex items-center justify-between">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="outline"
 className="h-9 px-4 text-sm font-medium bg-card border-border hover:bg-muted"
 >
 {filterPeriod}
 <ChevronDown className="ml-2 h-4 w-4 icon-chevron-down" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start">
 {filterPeriodOptions.map((option) => (
 <DropdownMenuItem
 key={option}
 onClick={() => setFilterPeriod(option)}
 className={filterPeriod === option ? "font-medium text-primary" : ""}
 >
 {option}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground icon-search" />
 <Input
 placeholder="Search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 w-44 h-9 text-sm"
 />
 </div>
 <Button
 variant="outline"
 className="h-9 px-4 text-sm font-medium bg-card border-border hover:bg-muted"
 >
 <Download className="mr-2 h-4 w-4 icon-download" />
 Export
 </Button>
 <Button
          variant="outline"
          className="h-9 px-4 text-sm font-medium bg-card border-border hover:bg-muted"
          onClick={() => navigate("/engagements/create-new")}
        >
          Create New Engagement
        </Button>
        <Button
          onClick={() => { setSelectedClient(""); setSelectedEngType(""); setCreateModalOpen(true); }}
          className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white h-9 px-4 text-sm font-medium"
        >
          Create Engagement
        </Button>
 </div>
 </div>

 {/* Engagements Table - Full width with enhanced spacing */}
 <StyledCard className="overflow-hidden flex flex-col flex-1 min-h-0">
 <div className="flex-1 overflow-y-auto overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10 shadow-sm">
 <tr className="bg-muted border-b border-border">
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Engagement ID</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Client Name</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Type</th>
 <th className="text-left px-4 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Cell</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Period/Year End Date</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Assigned Team</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Date Created</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredEngagements.length === 0 && searchQuery.trim() && (
 <tr>
 <td colSpan={9} className="px-6 py-16 text-center">
 <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
 <p className="text-sm font-medium text-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
 <p className="text-xs text-muted-foreground mt-1">Try a different search term or clear the filter</p>
 </td>
 </tr>
 )}
 {filteredEngagements.map((engagement) => {
 const isExpanded = expandedId === engagement.id;
 const assignees = ENGAGEMENT_ASSIGNEES[engagement.id];
 return (
 <React.Fragment key={engagement.id}>
 <tr className="hover:bg-muted/50 transition-colors group">
 <td className="px-6 py-2 whitespace-nowrap">
 <span
 onClick={() => navigate(`/engagements/${engagement.id}`)}
 className="text-sm text-link font-medium cursor-pointer hover:underline"
 >
 <Highlight text={engagement.id} query={searchQuery} />
 </span>
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap truncate max-w-[240px]">
 <div className="flex items-center gap-2">
 <Highlight text={engagement.client} query={searchQuery} />
 {engagement.id === 'AUD-NPM-Dec312025' && (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#39ADAD] text-white shrink-0">🎬 Demo</span>
 )}
 </div>
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{engagement.type}</td>
 <td className="px-4 py-3 whitespace-nowrap">
  {(() => {
   const region = engagement.client === "Harbor Freight Logistics LLC" ? "us" : "ca";
   return (
    <span className={cn(
     "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
     region === "us"
      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40"
    )}>
     {region === "us" ? "🇺🇸 US" : "🇨🇦 CA"}
    </span>
   );
  })()}
 </td>
 <td className="px-6 py-2 text-sm text-muted-foreground whitespace-nowrap">{engagement.yearEnd}</td>
 <td className="px-6 py-2 whitespace-nowrap">
 <button
 className="inline-flex items-center gap-1 text-sm text-link cursor-pointer hover:underline"
 onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : engagement.id); }}
 >
 View Assignees
 {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
 </button>
 </td>
 <td className="px-6 py-2 whitespace-nowrap">
 <StatusBadge status={engagement.status} hasRF={engagement.hasRF} />
 </td>
 <td className="px-6 py-2 text-sm text-muted-foreground whitespace-nowrap">{engagement.dateCreated}</td>
 <td className="px-6 py-2 whitespace-nowrap">
 <div className="flex items-center gap-2">
 <button
 className="p-1.5 hover:bg-muted rounded-lg transition-colors group/edit"
 onClick={(e) => handleEdit(engagement.id, e)}
 >
 <Pencil className="h-4 w-4 text-link group-hover/edit:icon-edit" />
 </button>
 {engagement.id !== 'AUD-NPM-Dec312025' && (
 <button
 className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors group/trash"
 onClick={(e) => handleDelete(engagement.id, e)}
 >
 <Trash2 className="h-4 w-4 text-destructive group-hover/trash:icon-trash" />
 </button>
 )}
 </div>
 </td>
 </tr>
 {isExpanded && assignees && (
 <tr className="bg-muted/30">
 <td colSpan={9} className="px-6 py-4">
 <div className="flex gap-10">
 <div className="flex-1">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Firm Team</p>
 <div className="flex flex-col gap-2.5">
 {assignees.firmTeam.map((m, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-foreground leading-none">{m.name}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{m.role}</p>
 </div>
 <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
 <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="w-px bg-border self-stretch" />
 <div className="flex-1">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Client Team</p>
 <div className="flex flex-col gap-2.5">
 {assignees.clientTeam.map((m, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-foreground leading-none">{m.name}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{m.role}</p>
 </div>
 <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
 <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 );
 })}
 </tbody>
 </table>
 </div>
 </StyledCard>
 </div>
 </div>
 {/* Create Engagement modal */}
 <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
 <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl">
 {/* Custom close button */}
 <button
 onClick={() => setCreateModalOpen(false)}
 className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
 >
 <X className="h-4 w-4" />
 </button>

 <div className="p-6 flex flex-col gap-5">
 {/* Icon + Title */}
 <div className="flex flex-col items-start gap-3">
 <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
 <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
 </div>
 <div>
 <h2 className="text-base font-semibold text-foreground">Engagement Type</h2>
 <p className="text-sm text-muted-foreground mt-0.5">
 Select type of engagement you wish to use for this engagement
 </p>
 </div>
 </div>

 {/* Client Name */}
 <div className="flex flex-col gap-1.5">
 <label className="text-sm font-medium text-foreground">
 Client Name<span className="text-destructive">*</span>
 </label>
 <Select value={selectedClient} onValueChange={setSelectedClient}>
 <SelectTrigger className="h-10 text-sm">
 <SelectValue placeholder="Select" />
 </SelectTrigger>
 <SelectContent>
 {uniqueClients.map(client => (
 <SelectItem key={client} value={client}>{client}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Engagement Type */}
 <div className="flex flex-col gap-1.5">
 <label className="text-sm font-medium text-foreground">
 Select Engagement Type<span className="text-destructive">*</span>
 </label>
 <Select value={selectedEngType} onValueChange={setSelectedEngType}>
 <SelectTrigger className="h-10 text-sm">
 <SelectValue placeholder="Select" />
 </SelectTrigger>
 <SelectContent>
 {ENGAGEMENT_TYPES.map(et => (
 <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-1">
 <Button
 variant="outline"
 className="flex-1 h-10"
 onClick={() => setCreateModalOpen(false)}
 >
 Cancel
 </Button>
 <Button
 className="flex-1 h-10"
 disabled={!selectedClient || !selectedEngType}
 onClick={handleProceed}
 >
 Proceed
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </Layout>
 );
}
