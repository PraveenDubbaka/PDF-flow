import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEngagements } from "@/store/EngagementsContext";
import { Search, ChevronDown, MessageSquare, Send, AlertCircle, Layers, Briefcase, Loader, CheckCircle2, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Layout } from "@/components/Layout";
import { StyledCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import intuitQuickbooksLogo from "@/assets/intuit-quickbooks-logo.svg";
import sageLogo from "@/assets/sage-logo.svg";

function getActiveFirm() {
  try {
    const profiles = JSON.parse(localStorage.getItem("firmProfiles") || "[]");
    const id = localStorage.getItem("activeFirmId") ?? "firm-ca-1";
    return profiles.find((f: { id: string; region: string; name: string }) => f.id === id) as { id: string; region: "ca" | "us"; name: string } ?? { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  } catch {
    return { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  }
}

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

const AGGREGATE_STATS = [
 { label: "Total Engagements", value: "2,076" },
 { label: "New Engagements", value: "566" },
 { label: "In Progress", value: "1,235" },
 { label: "Completed", value: "192" },
 { label: "Archived", value: "83" },
];

const getStatsForFirm = (region: "ca" | "us") => region === "ca" ? [
 { label: "Total Engagements", value: "1764" },
 { label: "New Engagements", value: "482" },
 { label: "In Progress", value: "1037" },
 { label: "Completed", value: "168" },
 { label: "Archived", value: "77" },
] : [
 { label: "Total Engagements", value: "312" },
 { label: "New Engagements", value: "84" },
 { label: "In Progress", value: "198" },
 { label: "Completed", value: "24" },
 { label: "Archived", value: "6" },
];

// Sample engagements data
const engagements = [{
 id: "AUD-US-Dec312024",
 client: "Harbor Freight Logistics LLC",
 yearEnd: "Dec 31, 2024",
 integration: null,
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "AUD-SL-Mar312024",
 client: "Shipping Line Inc.",
 yearEnd: "Mar 31, 2024",
 integration: null,
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-CON-Dec312024",
 client: "Shipping Line Inc.",
 yearEnd: "Dec 31, 2024",
 integration: "sage",
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-PSP-Dec312023",
 client: "Source 40",
 yearEnd: "Dec 31, 2023",
 integration: "xero",
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-QB-Dec312025",
 client: "Qb 40.1",
 yearEnd: "Dec 31, 2025",
 integration: "quickbooks",
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-QB-Dec312024",
 client: "Qb 40.1",
 yearEnd: "Dec 31, 2024",
 integration: "quickbooks",
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-CHE-Dec252024",
 client: "Check Add",
 yearEnd: "Dec 25, 2024",
 integration: "xero",
 status: "New",
 statusVariant: "secondary" as const
}, {
 id: "COM-OTH-Dec312024",
 client: "Other Revenue",
 yearEnd: "Dec 31, 2024",
 integration: null,
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "T2-AUT-Dec312023",
 client: "Shipping Line Inc.",
 yearEnd: "Dec 31, 2023",
 integration: null,
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-CAS-Dec312024",
 client: "Cash Flow Ls",
 yearEnd: "Dec 31, 2024",
 integration: null,
 status: "In Progress",
 statusVariant: "default" as const
}, {
 id: "COM-QB-Jan142026",
 client: "Qb 40.1",
 yearEnd: "Jan 14, 2026",
 integration: "quickbooks",
 status: "New",
 statusVariant: "secondary" as const
}, {
 id: "COM-SHR-Dec302023",
 client: "Shroll Forward",
 yearEnd: "Dec 30, 2023",
 integration: "xero",
 status: "In Progress",
 statusVariant: "default" as const
}];

// Team members pie chart data
const teamData = [{
 name: "Invite Sent",
 value: 25,
 color: "#F97316"
}, {
 name: "Invite Now",
 value: 40,
 color: "#0EA5E9"
}, {
 name: "Accepted",
 value: 49,
 color: "#22C55E"
}];

// Clients pie chart data
const clientsData = [{
 name: "Invite Sent",
 value: 84,
 color: "#F97316"
}, {
 name: "Invite Now",
 value: 41,
 color: "#0EA5E9"
}, {
 name: "Accepted",
 value: 268,
 color: "#22C55E"
}];

// Recent activity data
const recentActivity = [{
 time: "09:00 AM",
 title: "COM-CON-Dec312024",
 description: "Created an Engagement",
 path: "Engagement > Created an Engagement"
}, {
 time: "05:35 AM",
 title: "FIN-1-Trial Balance.pdf",
 description: "Viewed and Edited",
 path: "Engagement > COM-PSP-Dec312023 > Financial Statements > Financial Statements Docs"
}];
const IntegrationBadge = ({
 type
}: {
 type: string | null;
}) => {
 const [showPopover, setShowPopover] = React.useState(false);
 if (!type) return null;
 const badgeClasses = "inline-flex items-center justify-center h-8 w-24 px-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity bg-white border border-border";
 const getIntegrationName = () => {
 switch (type) {
 case "xero":
 return "Xero";
 case "quickbooks":
 return "QuickBooks";
 case "sage":
 return "Sage";
 default:
 return type;
 }
 };
 const BadgeContent = () => {
 if (type === "xero") {
 return <div className={`${badgeClasses} gap-1.5`}>
 <img src="https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg" alt="Xero" className="h-5" />
 <span className="text-xs font-medium text-gray-900">Xero</span>
 </div>;
 }
 if (type === "quickbooks") {
 return <div className={badgeClasses}>
 <img src={intuitQuickbooksLogo} alt="Intuit QuickBooks" className="h-5" />
 </div>;
 }
 if (type === "sage") {
 return <div className={`${badgeClasses} gap-1.5`}>
 <div className="h-5 w-5 rounded-full bg-black flex items-center justify-center p-1">
 <img src={sageLogo} alt="Sage" className="h-3 w-auto" />
 </div>
 <span className="text-xs font-medium text-gray-900">Sage</span>
 </div>;
 }
 return null;
 };
 return <Popover open={showPopover} onOpenChange={setShowPopover}>
 <PopoverTrigger asChild>
 <div onClick={e => e.stopPropagation()}>
 <BadgeContent />
 </div>
 </PopoverTrigger>
 <PopoverContent className="w-56 p-3" align="start">
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <div className="h-2 w-2 rounded-full bg-emerald-500" />
 <span className="text-sm font-medium">Connected</span>
 </div>
 <p className="text-xs text-muted-foreground">
 {getIntegrationName()} integration is active and syncing data.
 </p>
 <div className="text-xs text-muted-foreground">
 Last synced: 2 hours ago
 </div>
 <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={e => {
 e.stopPropagation();
 setShowPopover(false);
 }}>
 Disconnect
 </Button>
 </div>
 </PopoverContent>
 </Popover>;
};
const AUDIT_SECTIONS = [
 { key: "co", label: "Client Onboarding", color: "#1C63A6", worksheetKeys: ["audit-engagement-letter", "checklist-aud-408", "checklist-aud-410"] },
 { key: "pl", label: "Planning", color: "#0EA5E9", worksheetKeys: ["audit-materiality", "audit-asm", "checklist-aud-plan"] },
 { key: "ra", label: "Risk Assessment", color: "#8B5CF6", worksheetKeys: ["audit-pap501", "checklist-aud-505", "checklist-aud-506", "audit-520", "audit-590", "checklist-aud-535", "checklist-aud-540", "checklist-aud-550"] },
 { key: "rr", label: "Response to Risk", color: "#F59E0B", worksheetKeys: ["checklist-aud-605", "checklist-aud-610", "checklist-aud-625", "checklist-aud-630", "checklist-aud-635", "checklist-aud-645"] },
 { key: "tb", label: "Trial Balance", color: "#10B981", worksheetKeys: ["audit-trial-balance"] },
 { key: "pr", label: "Procedures", color: "#06B6D4", worksheetKeys: ["audit-cash", "audit-ar"] },
 { key: "so", label: "Completion & Sign-offs", color: "#EC4899", worksheetKeys: ["audit-aim", "checklist-aud-so-310", "checklist-aud-so-320", "checklist-aud-so-330", "checklist-aud-so-335", "checklist-aud-so-340", "checklist-aud-so-370", "checklist-aud-so-375"] },
];

interface SectionProgress {
 key: string; label: string; color: string;
 completed: number; total: number; pct: number; pendingRequests: number;
}

function calcEngagementProgress(engagementId: string): { sections: SectionProgress[]; overall: number; totalCompleted: number; totalItems: number; pendingRequests: number } {
 if (engagementId === 'AUD-NPM-Dec312025') {
  return {
   sections: [
    { key: 'co', label: 'Client Onboarding', color: '#1C63A6', completed: 3, total: 3, pct: 100, pendingRequests: 0 },
    { key: 'pl', label: 'Planning', color: '#0EA5E9', completed: 2, total: 3, pct: 67, pendingRequests: 1 },
    { key: 'ra', label: 'Risk Assessment', color: '#8B5CF6', completed: 5, total: 8, pct: 63, pendingRequests: 2 },
    { key: 'rr', label: 'Response to Risk', color: '#F59E0B', completed: 2, total: 6, pct: 33, pendingRequests: 3 },
    { key: 'tb', label: 'Trial Balance', color: '#10B981', completed: 1, total: 1, pct: 100, pendingRequests: 0 },
    { key: 'pr', label: 'Procedures', color: '#06B6D4', completed: 1, total: 2, pct: 50, pendingRequests: 4 },
    { key: 'so', label: 'Completion & Sign-offs', color: '#EC4899', completed: 0, total: 8, pct: 0, pendingRequests: 0 },
   ],
   overall: 52, totalCompleted: 14, totalItems: 31, pendingRequests: 10,
  };
 }
 const sections: SectionProgress[] = AUDIT_SECTIONS.map(section => {
  let completed = 0;
  const total = section.worksheetKeys.length;
  section.worksheetKeys.forEach(wk => {
   try {
    const stored = localStorage.getItem(`${wk}-v1-${engagementId}`) || localStorage.getItem(`${wk}-v2-${engagementId}`) || localStorage.getItem(`${wk}-${engagementId}`);
    if (stored) { const parsed = JSON.parse(stored); if (parsed?.concluded === true) completed++; }
   } catch {}
  });
  return { ...section, completed, total, pct: total === 0 ? 0 : Math.round((completed / total) * 100), pendingRequests: 0 };
 });
 const totalCompleted = sections.reduce((a, s) => a + s.completed, 0);
 const totalItems = sections.reduce((a, s) => a + s.total, 0);
 return { sections, overall: totalItems === 0 ? 0 : Math.round((totalCompleted / totalItems) * 100), totalCompleted, totalItems, pendingRequests: 0 };
}

function EngagementProgressPanel({ progress }: {
 progress: ReturnType<typeof calcEngagementProgress>
}) {
 const [animated, setAnimated] = useState(false);

 useEffect(() => {
  const t = requestAnimationFrame(() => setAnimated(true));
  return () => cancelAnimationFrame(t);
 }, []);

 const circumference = 2 * Math.PI * 20;

 return (
  <div className="px-6 pb-5 pt-2" style={{ background: 'linear-gradient(to bottom, hsl(var(--muted)/0.4), transparent)' }}>
   <div className="flex items-center gap-4 mb-4 px-1">
    <div className="relative w-14 h-14 shrink-0">
     <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="20" fill="none" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round"
       strokeDasharray={circumference}
       strokeDashoffset={circumference * (1 - (animated ? progress.overall / 100 : 0))}
       style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
      />
     </svg>
     <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-sm font-bold text-violet-600 leading-none">{progress.overall}%</span>
     </div>
    </div>
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-foreground">File Progress</span>
      <div className="flex items-center gap-3">
       <span className="text-xs text-muted-foreground">· {progress.totalCompleted} of {progress.totalItems} concluded</span>
       <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
        {progress.totalItems - progress.totalCompleted} files pending
       </span>
      </div>
      {progress.pendingRequests > 0 && (
       <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 ml-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        {progress.pendingRequests} requests pending
       </span>
      )}
     </div>
     <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-xs">
      <div className="h-full rounded-full bg-violet-500"
       style={{ width: animated ? `${progress.overall}%` : '0%', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }}
      />
     </div>
    </div>
   </div>
   <div className="space-y-2">
    {progress.sections.map((section, idx) => (
     <div key={section.key} className="flex items-center gap-3"
      style={{
       opacity: animated ? 1 : 0,
       transform: animated ? 'translateY(0)' : 'translateY(6px)',
       transition: `opacity 0.4s ease ${0.1 + idx * 0.06}s, transform 0.4s ease ${0.1 + idx * 0.06}s`,
      }}
     >
      <span className="text-[11px] font-medium text-muted-foreground w-36 shrink-0 truncate">{section.label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
       <div className="h-full rounded-full"
        style={{
         width: animated ? `${section.pct}%` : '0%',
         backgroundColor: section.color,
         transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${0.15 + idx * 0.07}s`,
        }}
       />
      </div>
      <div className="flex items-center gap-2 shrink-0">
       <span className="text-[11px] font-semibold w-8 text-right" style={{ color: section.pct === 100 ? section.color : undefined }}>
        {section.pct === 100 ? '✓' : `${section.pct}%`}
       </span>
       <span className="text-[10px] text-muted-foreground w-8 text-right">{section.completed}/{section.total}</span>
       {section.pendingRequests > 0 ? (
        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-px font-medium w-16 text-center">
         {section.pendingRequests} pending
        </span>
       ) : (
        <span className="w-16" />
       )}
      </div>
     </div>
    ))}
   </div>
  </div>
 );
}

export default function Dashboard() {
 const navigate = useNavigate();
 const { engagements: allEngagementsRaw } = useEngagements();
 const allEngagements = allEngagementsRaw.filter(e => e.type === 'Audit (AUD)');
 const [searchQuery, setSearchQuery] = useState("");
 const [expandedEngagement, setExpandedEngagement] = useState<string | null>(null);
 function toggleExpand(id: string) { setExpandedEngagement(prev => prev === id ? null : id); }
 const [activeFirm, setActiveFirm] = useState(getActiveFirm);
 const [allFirmProfiles, setAllFirmProfiles] = useState<{ id: string }[]>(() => {
  try { return JSON.parse(localStorage.getItem("firmProfiles") || "[]"); } catch { return []; }
 });
 const [showGroupView, setShowGroupView] = useState(false);
 useEffect(() => {
  const handler = () => {
   setActiveFirm(getActiveFirm());
   try { setAllFirmProfiles(JSON.parse(localStorage.getItem("firmProfiles") || "[]")); } catch {}
  };
  window.addEventListener("firmSwitched", handler);
  return () => window.removeEventListener("firmSwitched", handler);
 }, []);
 const hasMultipleFirms = allFirmProfiles.length > 1;
 const stats = showGroupView ? AGGREGATE_STATS : getStatsForFirm(activeFirm.region);
 const dashboardEngagements = allEngagements.map(e => {
 let integration: string | null = null;
 try {
 const stored = localStorage.getItem(`connectors-${e.id}`);
 if (stored) {
 const apps: string[] = JSON.parse(stored);
 integration = apps[0] ?? null;
 }
 } catch {}
 return {
 id: e.id,
 client: e.client,
 yearEnd: e.yearEnd,
 integration,
 status: e.status,
 statusVariant: e.status === "New" ? ("secondary" as const) : ("default" as const),
 };
 });
 const filteredDashboardEngagements = dashboardEngagements
  .filter(e => (e.client === "Harbor Freight Logistics LLC" ? "us" : "ca") === activeFirm.region)
  .filter(e =>
   !searchQuery.trim() ||
   e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
   e.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

 return <Layout title="Dashboard">
 <div className="flex-1 p-6 overflow-auto bg-background h-full">

 <div className="flex gap-6 h-full">
 {/* Main Content */}
 <div className="flex-1 flex flex-col gap-6 min-h-0">
 {/* All Offices / This Office pill switcher */}
 {hasMultipleFirms && (
  <div className="flex items-center gap-1 p-0.5 bg-muted rounded-full w-fit flex-shrink-0">
   <button
    onClick={() => setShowGroupView(false)}
    className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", !showGroupView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
   >
    This Office
   </button>
   <button
    onClick={() => setShowGroupView(true)}
    className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", showGroupView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
   >
    All Offices
   </button>
  </div>
 )}
 {/* Stats Bar - Creative compact display with micro-animated icons */}
 <div className="flex items-center gap-3 flex-shrink-0">
 {stats.map((stat, index) => {
 const config = [
 { color: 'text-primary', bg: 'bg-primary/10', icon: Layers, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Briefcase, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Loader, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle2, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Archive, animation: '' },
 ];
 const { color, bg, icon: Icon, animation } = config[index];
 return (
 <div
 key={index}
 className={`flex items-center gap-3 px-5 py-3 flex-1 bg-card border border-border shadow-sm cursor-default hover:shadow-md transition-shadow`}
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

 {/* Engagements Table - Enhanced styling */}
 <StyledCard className="overflow-hidden flex flex-col flex-1 min-h-0">
 <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 bg-card">
 <div>
 <h2 className="text-lg font-semibold text-foreground">Engagements</h2>
 <p className="text-sm text-muted-foreground mt-1">Active engagements from last 6 months</p>
 {showGroupView ? (
  <p className="text-sm text-muted-foreground mt-1">Aggregated across all offices · Switch to an office to view client records</p>
 ) : (
  <p className="text-sm text-muted-foreground mt-1">
   {activeFirm.region === "ca" ? "🇨🇦" : "🇺🇸"} {activeFirm.name} · {activeFirm.region === "ca" ? "CA-cell" : "US-cell"}
  </p>
 )}
 </div>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground icon-search" />
 <Input placeholder="Search Engagement" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-48 h-9 text-sm" />
 </div>
 </div>

 {/* Enhanced table with better spacing */}
 <div className="flex-1 overflow-y-auto overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted">
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Engagement ID</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Client Name</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Year End</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Integrations</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
 <th className="text-left px-4 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Progress</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredDashboardEngagements.length === 0 && searchQuery.trim() && (
 <tr>
 <td colSpan={7} className="px-6 py-16 text-center">
 <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
 <p className="text-sm font-medium text-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
 <p className="text-xs text-muted-foreground mt-1">Try a different search term or clear the filter</p>
 </td>
 </tr>
 )}
 {filteredDashboardEngagements.map((engagement, idx) => <React.Fragment key={engagement.id}>
 <tr className="hover:bg-muted/50 transition-colors group max-h-[50px]" style={{ maxHeight: '50px' }}>
 <td className="px-6 py-2 whitespace-nowrap">
 <span className="text-sm text-link font-medium cursor-pointer hover:underline" onClick={() => navigate(`/engagements/${engagement.id}`)}>
 <Highlight text={engagement.id} query={searchQuery} />
 </span>
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap truncate max-w-[200px]"><Highlight text={engagement.client} query={searchQuery} /></td>
 <td className="px-6 py-2 text-sm text-muted-foreground whitespace-nowrap">{engagement.yearEnd}</td>
 <td className="px-6 py-2 whitespace-nowrap">
 <IntegrationBadge type={engagement.integration} />
 </td>
 <td className="px-6 py-2 whitespace-nowrap">
 <Badge variant={engagement.status === "New" ? "new" : "inProgress"}>
 {engagement.status}
 </Badge>
 </td>
 <td className="px-4 py-2 whitespace-nowrap">
 {(() => {
 const p = calcEngagementProgress(engagement.id);
 return (
 <div className="flex items-center gap-2">
 <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${p.overall}%` }} />
 </div>
 <span className="text-xs font-semibold text-violet-600 tabular-nums w-8">{p.overall}%</span>
 {p.pendingRequests > 0 && (
 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title={`${p.pendingRequests} requests pending`} />
 )}
 </div>
 );
 })()}
 </td>
 <td className="px-6 py-2 whitespace-nowrap">
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-lg">EL</span>
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors group/file">
 <AlertCircle className="h-4 w-4 text-primary group-hover/file:icon-bounce" />
 </button>
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors group/msg">
 <MessageSquare className="h-4 w-4 text-primary group-hover/msg:icon-bounce" />
 </button>
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors group/send">
 <Send className="h-4 w-4 text-primary group-hover/send:icon-external" />
 </button>
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors group/chev relative" onClick={e => { e.stopPropagation(); toggleExpand(engagement.id); }} title={expandedEngagement === engagement.id ? 'Hide detail' : 'View detail'}>
 <ChevronDown className={cn("h-4 w-4 text-primary transition-transform duration-200", expandedEngagement === engagement.id && "rotate-180")} />
 </button>
 </div>
 </td>
 </tr>
 {expandedEngagement === engagement.id && (() => {
  const progress = calcEngagementProgress(engagement.id);
  return (
   <tr key={`${engagement.id}-progress`}>
    <td colSpan={7} className="p-0">
     <EngagementProgressPanel progress={progress} />
    </td>
   </tr>
  );
 })()}
 </React.Fragment>)}
 </tbody>
 </table>
 </div>
 </StyledCard>

 </div>

 {/* Right Sidebar - Enhanced spacing */}
 <div className="w-80 flex-shrink-0 space-y-5">
 {/* Charts Row */}
 <div className="flex gap-4">
 {/* Team Members Chart */}
 <StyledCard className="flex-1 min-w-0 p-5">
 <h3 className="text-sm font-semibold text-foreground mb-3 whitespace-nowrap">Team Members</h3>
 <div className="h-28">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={teamData} cx="50%" cy="50%" innerRadius={22} outerRadius={42} dataKey="value" stroke="none">
 {teamData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="flex flex-wrap gap-2 mt-3">
 {teamData.map((item, index) => <div key={index} className="flex items-center gap-1.5">
 <div className="w-2 h-2 rounded-full" style={{
 backgroundColor: item.color
 }} />
 <span className="text-xs text-muted-foreground">{item.name}</span>
 </div>)}
 </div>
 <Button variant="secondary" size="sm" className="w-full mt-3">
 View Team
 </Button>
 </StyledCard>

 {/* Clients Chart */}
 <StyledCard className="flex-1 min-w-0 p-5">
 <h3 className="text-sm font-semibold text-foreground mb-3 whitespace-nowrap">Clients</h3>
 <div className="h-28">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={clientsData} cx="50%" cy="50%" innerRadius={22} outerRadius={42} dataKey="value" stroke="none">
 {clientsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="flex flex-wrap gap-2 mt-3">
 {clientsData.map((item, index) => <div key={index} className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
 backgroundColor: item.color
 }} />
 <span className="text-xs text-muted-foreground">{item.name}</span>
 </div>)}
 </div>
 <Button variant="secondary" size="sm" className="w-full mt-3">
 View Clients
 </Button>
 </StyledCard>
 </div>

 {/* Recent Activity - Enhanced spacing */}
 <StyledCard className="p-5">
 <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
 <div className="space-y-4">
 {recentActivity.map((activity, index) => <div key={index} className="relative pl-5">
 <div className="absolute left-0 top-1 w-0.5 h-full bg-primary/20 rounded-full" />
 <div className="absolute left-[-3px] top-1 w-2 h-2 rounded-full bg-primary" />
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs font-medium text-muted-foreground">{activity.time}</span>
 <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
 <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
 </svg>
 </div>
 </div>
 <p className="text-sm font-medium text-foreground leading-tight">{activity.title}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
 <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{activity.path}</p>
 </div>)}
 </div>
 </StyledCard>
 </div>
 </div>
 </div>
 </Layout>;
}