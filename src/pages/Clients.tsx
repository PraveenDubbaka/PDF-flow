import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronRight, Pencil, Trash2, Download, Mail, ClipboardPlus, UserPlus, RefreshCw, Users, UserX, UserCheck, Clock, UsersRound, Globe2, ListFilter, Check } from "lucide-react";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Layout } from "@/components/Layout";
import { StyledCard } from "@/components/ui/card";
import { ClientRightPanel } from "@/components/ClientRightPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import intuitQuickbooksLogo from "@/assets/intuit-quickbooks-logo.svg";
import { clientsData, loadClients, Client } from "@/data/clientsData";

function getActiveFirm() {
  try {
    const profiles = JSON.parse(localStorage.getItem("firmProfiles") || "[]");
    const id = localStorage.getItem("activeFirmId") ?? "firm-ca-1";
    return profiles.find((f: { id: string; region: string; name: string }) => f.id === id) as { id: string; region: "ca" | "us"; name: string } ?? { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  } catch {
    return { id: "firm-ca-1", region: "ca" as const, name: "Maple Grove Accounting PC" };
  }
}

// Sample partners data for the dropdown
const partners = [
 { id: "cpt-10176", name: "Cpt Group", email: "cpt10176canada@yopmail.com", role: "cpt-10176", color: "bg-emerald-500" },
 { id: "tp-1", name: "Test Plaid pla", email: "testplaid@yopmail.com", role: "mrt", color: "bg-gray-400" },
 { id: "st-1", name: "Staff Test", email: "stafftest@yopmail.com", role: "HV", color: "bg-emerald-500" },
 { id: "nj-1", name: "nimma joel", email: "nimmab@yopmail.com", role: "kio", color: "bg-indigo-500" },
 { id: "mh-1", name: "Monte Heilig", email: "ptgamarv36mosagnte@gmail.com", role: "Senior Manager", color: "bg-amber-600" },
 { id: "ja-1", name: "Jangaiah Arige", email: "ptgamarv36jangaiadah@gmail.com", role: "Manager", color: "bg-lime-500" },
 { id: "jl-1", name: "Jude Law", email: "ptgamarv36judedad@gmail.com", role: "Staff", color: "bg-purple-500" },
 { id: "jd-1", name: "Joey doem", email: "joey.team@yopmail.com", role: "", color: "bg-teal-500" },
];

const allIndustries = Array.from(new Set(clientsData.map(c => c.industryType).filter(Boolean))).sort() as string[];

const acceptedCount = clientsData.filter(c => c.status === 'Accepted').length;
const pendingCount = clientsData.filter(c => c.status === 'Invite Now' || c.status === 'Pending').length;
const caCount = clientsData.filter(c => c.clientCountry === 'ca').length;
const usCount = clientsData.filter(c => c.clientCountry === 'us').length;

const stats = [
 { label: "Active Clients", value: String(acceptedCount) },
 { label: "Pending Clients", value: String(pendingCount) },
 { label: "Total Clients", value: String(clientsData.length) },
 { label: "Canada / US", value: `${caCount} / ${usCount}` },
];

const StatusBadge = ({ status }: { status: string }) => {
 const getStatusVariant = () => {
 switch (status) {
 case "Accepted":
 return "accepted" as const;
 case "Invite Now":
 return "inviteNow" as const;
 default:
 return "secondary" as const;
 }
 };
 return <Badge variant={getStatusVariant()}>{status}</Badge>;
};

const IntegrationCell = ({ type }: { type: string }) => {
 if (type === "connect") {
 return <Button variant="outline" size="sm" className="h-7 text-xs font-medium">Connect</Button>;
 }
 const badgeClasses = "inline-flex items-center justify-center h-7 w-20 px-1 bg-card dark:bg-[hsl(var(--m3-inverse-surface))] border border-border rounded-sm";
 if (type === "xero") {
 return (
 <div className={`${badgeClasses} gap-1`}>
 <img src="https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg" alt="Xero" className="h-4" />
 <span className="text-xs font-medium text-foreground dark:text-[hsl(var(--m3-inverse-on-surface))]">Xero</span>
 </div>
 );
 }
 if (type === "quickbooks") {
 return <div className={badgeClasses}><img src={intuitQuickbooksLogo} alt="Intuit QuickBooks" className="h-4" /></div>;
 }
 return null;
};

function ColFilterHeader({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
 return (
 <div className="flex items-center gap-1.5">
  <span>{label}</span>
  <Popover>
   <PopoverTrigger asChild>
    <button
     onClick={e => e.stopPropagation()}
     className={cn(
      "p-0.5 rounded transition-colors",
      active ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-black/10"
     )}
    >
     <ListFilter className="h-3.5 w-3.5" />
    </button>
   </PopoverTrigger>
   <PopoverContent className="p-1 bg-card min-w-max" align="start" side="bottom">
    {children}
   </PopoverContent>
  </Popover>
 </div>
 );
}

export default function Clients() {
 const navigate = useNavigate();
 const [searchQuery, setSearchQuery] = useState("");
 const [partnerSearch, setPartnerSearch] = useState("");
 const [activeTab, setActiveTab] = useState("my-clients");
 const [selectedClient, setSelectedClient] = useState<string | null>(null);
 const [clientList, setClientList] = useState<Client[]>(() => loadClients());
 const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
 const [countryFilter, setCountryFilter] = useState<"all" | "ca" | "us">("all");
 const [industryFilter, setIndustryFilter] = useState<string>("all");
 const [activeFirm, setActiveFirm] = useState(getActiveFirm);
 useEffect(() => {
  const handler = () => setActiveFirm(getActiveFirm());
  window.addEventListener("firmSwitched", handler);
  return () => window.removeEventListener("firmSwitched", handler);
 }, []);
 useEffect(() => {
  setCountryFilter(activeFirm.region);
 }, [activeFirm.region]);

 const filteredClients = clientList
  .filter(c => countryFilter === "all" || c.clientCountry === countryFilter)
  .filter(c => industryFilter === "all" || c.industryType === industryFilter)
  .filter(c =>
   c.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
   c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
   c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

 const handleCreateEngagement = (clientId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 const client = clientList.find(c => c.id === clientId);
 navigate("/engagements/create", { state: { clientName: client?.entityName } });
 };

 const handleDeleteClient = (clientId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setClientList(prev => prev.filter(c => c.id !== clientId));
 toast.success(`Client ${clientId} deleted`);
 };

 const handleEditClient = (clientId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 toast.info(`Edit client ${clientId}`);
 };

 const tabs = [
 { id: "my-clients", label: "My Clients" },
 { id: "all-clients", label: "All Clients" },
 { id: "unassigned", label: "Unassigned" },
 { id: "archived", label: "Archived" },
 ];

 const selectedClientData = clientsData.find(c => c.id === selectedClient);

 const filterOption = (value: string, label: string, current: string, onClick: () => void) => (
 <button
  key={value}
  onClick={onClick}
  className={cn(
   "w-full text-left px-2.5 py-1.5 text-xs rounded flex items-center gap-2 transition-colors whitespace-nowrap",
   current === value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
  )}
 >
  {current === value ? <Check className="h-3 w-3 flex-shrink-0" /> : <span className="h-3 w-3 flex-shrink-0" />}
  {label}
 </button>
 );

 return (
 <Layout title="Clients">
 <div className="flex h-full overflow-hidden bg-background">
 {/* Main Content */}
 <div className="flex-1 p-6 overflow-hidden flex flex-col min-w-0">
 <div className="flex flex-col flex-1 gap-5 min-h-0">
 {/* Stats Cards */}
 <div className="flex items-center gap-3 flex-shrink-0">
 {stats.map((stat, index) => {
 const config = [
 { color: 'text-primary', bg: 'bg-primary/10', icon: UserCheck, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Clock, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: UsersRound, animation: '' },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Globe2, animation: '' },
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

 <p className="text-sm text-muted-foreground">
  {activeFirm.region === "ca" ? "🇨🇦" : "🇺🇸"} {activeFirm.name} · {activeFirm.region === "ca" ? "CA-cell" : "US-cell"}
 </p>

 {/* Tabs and Actions Row */}
 <div className="flex items-center justify-between flex-shrink-0">
 {/* Tabs */}
 <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-sm ${
 activeTab === tab.id
 ? "bg-[#1C63A6] text-white"
 : "text-muted-foreground hover:bg-muted"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Actions and Add Client Button */}
 <div className="flex items-center gap-2">
 <ExpandableIconButton variant="secondary" icon={<RefreshCw className="h-4 w-4" />} label="Refresh" />
 <Popover>
 <PopoverTrigger asChild>
 <ExpandableIconButton variant="secondary" icon={<UserPlus className="h-4 w-4" />} label="Assign Partner" />
 </PopoverTrigger>
 <PopoverContent className="w-72 p-0 bg-card" align="start">
 <div className="p-3 border-b border-border">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input placeholder="Search" value={partnerSearch} onChange={(e) => setPartnerSearch(e.target.value)} className="pl-9 h-9 text-sm" />
 </div>
 </div>
 <div className="p-2 border-b border-border">
 <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded transition-colors">
 <UserX className="h-4 w-4" />
 Unassign
 </button>
 </div>
 <ScrollArea className="h-72">
 <div className="p-2">
 {partners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || p.email.toLowerCase().includes(partnerSearch.toLowerCase())).map((partner) => (
 <button key={partner.id} className="flex items-start gap-3 w-full px-2 py-2.5 text-left hover:bg-primary hover:text-primary-foreground rounded transition-colors group">
 <div className={`h-8 w-8 rounded-full ${partner.color} flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
 {partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{partner.name}</p>
 <p className="text-xs text-primary group-hover:text-primary-foreground truncate">{partner.email}</p>
 {partner.role && <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/70 truncate">{partner.role}</p>}
 </div>
 </button>
 ))}
 </div>
 </ScrollArea>
 </PopoverContent>
 </Popover>
 <ExpandableIconButton variant="secondary" icon={<Mail className="h-4 w-4" />} label="Invite All" />
 <ExpandableIconButton variant="secondary" icon={<Download className="h-4 w-4" />} label="Export" />
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-44 h-9 text-sm" />
 </div>
 <Button variant="outline" className="h-9 px-4 text-sm font-medium bg-card border-border hover:bg-muted" onClick={() => navigate("/clients/add-new")}>
 Add New Client
 </Button>
 <Popover>
 <PopoverTrigger asChild>
 <Button className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white h-9 px-4 text-sm font-medium">
 Add Client <ChevronDown className="h-4 w-4 ml-1.5" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-56 p-1 bg-card" align="end">
 <button onClick={() => navigate("/clients/new")} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors">Add New Client</button>
 <button onClick={() => toast.info("Upload Existing Client")} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors">Upload Existing Client</button>
 </PopoverContent>
 </Popover>
 </div>
 </div>

 {/* Clients Table */}
 <StyledCard className="overflow-hidden flex flex-col flex-1 min-h-0 -mt-2">
 <div className="flex-1 overflow-y-auto overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap w-10">
 <Checkbox />
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Client ID</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Entity Name</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Entity Type</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
  <ColFilterHeader label="Country" active={countryFilter !== "all"}>
   {filterOption("all", "All", countryFilter, () => setCountryFilter("all"))}
   {filterOption("ca", "🇨🇦 Canada", countryFilter, () => setCountryFilter("ca"))}
   {filterOption("us", "🇺🇸 United States", countryFilter, () => setCountryFilter("us"))}
  </ColFilterHeader>
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
  <ColFilterHeader label="Industry" active={industryFilter !== "all"}>
   {filterOption("all", "All Industries", industryFilter, () => setIndustryFilter("all"))}
   {allIndustries.map(ind => filterOption(ind, ind, industryFilter, () => setIndustryFilter(ind)))}
  </ColFilterHeader>
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Integrations</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Contact Name</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Email</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Repository</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Assigned Partner</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Assigned Team</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Cell Phone</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Engagements</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredClients.length === 0 && (
 <tr>
 <td colSpan={16} className="px-6 py-16 text-center">
 <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
 <p className="text-sm font-medium text-foreground">No clients match the current filters</p>
 <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
 </td>
 </tr>
 )}
 {(() => {
   const grouped: Record<string, Client[]> = {};
   const ungrouped: Client[] = [];
   filteredClients.forEach(c => {
     if (c.groupName) {
       (grouped[c.groupName] = grouped[c.groupName] || []).push(c);
     } else {
       ungrouped.push(c);
     }
   });
   const renderClientRow = (client: Client) => (
     <tr
       key={client.id}
       className={`hover:bg-muted/50 transition-colors group cursor-pointer max-h-[50px] ${selectedClient === client.id ? 'bg-primary/5' : ''}`}
       style={{ maxHeight: '50px' }}
       onClick={() => setSelectedClient(client.id)}
     >
       <td className="px-6 py-2 whitespace-nowrap">
         <Checkbox checked={selectedClient === client.id} />
       </td>
       <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap"><Highlight text={client.id} query={searchQuery} /></td>
       <td className="px-6 py-2 whitespace-nowrap">
         <Link to={`/clients/${client.id}`} className="text-sm text-link font-medium hover:underline" onClick={e => e.stopPropagation()}>
           <Highlight text={client.entityName} query={searchQuery} />
         </Link>
       </td>
       <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{client.entityType}</td>
       <td className="px-4 py-2 text-sm whitespace-nowrap">
         <span className={cn(
           "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
           client.clientCountry === "us"
             ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
             : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40"
         )}>
           {client.clientCountry === "us" ? "🇺🇸 US" : "🇨🇦 CA"}
         </span>
       </td>
       <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{client.industryType || '—'}</td>
       <td className="px-6 py-2 whitespace-nowrap"><StatusBadge status={client.status} /></td>
       <td className="px-6 py-2 whitespace-nowrap"><IntegrationCell type={client.integration} /></td>
       <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{client.contactName}</td>
       <td className="px-6 py-2 text-sm text-link cursor-pointer hover:underline whitespace-nowrap"><Highlight text={client.email} query={searchQuery} /></td>
       <td className="px-6 py-2 whitespace-nowrap">
         <span className="text-sm text-link cursor-pointer hover:underline">{client.repository}</span>
       </td>
       <td className="px-6 py-2 whitespace-nowrap">
         <div className="flex items-center gap-1">
           <span className="text-sm text-primary">{client.assignedPartner}</span>
           <Users className="h-3.5 w-3.5 text-primary" />
         </div>
       </td>
       <td className="px-6 py-2 whitespace-nowrap">
         {client.assignedTeam ? (
           <div className="flex items-center gap-1">
             <span className="text-sm text-foreground">{client.assignedTeam}</span>
             <Users className="h-3.5 w-3.5 text-muted-foreground" />
           </div>
         ) : (
           <Users className="h-3.5 w-3.5 text-primary" />
         )}
       </td>
       <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{client.cellPhone || '-'}</td>
       <td className="px-6 py-2 text-sm text-primary font-medium text-center whitespace-nowrap">{client.engagements.length}</td>
       <td className="px-6 py-2 whitespace-nowrap">
         <div className="flex items-center gap-2">
           <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Create Engagement" onClick={(e) => handleCreateEngagement(client.id, e)}>
             <ClipboardPlus className="h-4 w-4 text-link" />
           </button>
           <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Edit Client" onClick={(e) => handleEditClient(client.id, e)}>
             <Pencil className="h-4 w-4 text-link" />
           </button>
           <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Delete Client" onClick={(e) => handleDeleteClient(client.id, e)}>
             <Trash2 className="h-4 w-4 text-destructive" />
           </button>
         </div>
       </td>
     </tr>
   );
   return (
     <>
       {Object.entries(grouped).map(([groupName, clients]) => {
         const isCollapsed = collapsedGroups.has(groupName);
         const toggleCollapse = () => setCollapsedGroups(prev => {
           const next = new Set(prev);
           next.has(groupName) ? next.delete(groupName) : next.add(groupName);
           return next;
         });
         return (
           <React.Fragment key={groupName}>
             <tr className="bg-muted/40 border-y border-border/60 cursor-pointer select-none hover:bg-muted/60 transition-colors" onClick={toggleCollapse}>
               <td colSpan={16} className="px-6 py-2">
                 <div className="flex items-center gap-3">
                   {isCollapsed
                     ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                     : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                   }
                   <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{groupName}</span>
                   <span className="text-[11px] text-muted-foreground">
                     {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                   </span>
                   <div className="flex items-center gap-1">
                     {Array.from(new Set(clients.map(c => c.clientCountry))).map(country => (
                       <span
                         key={country}
                         className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                           country === 'us'
                             ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40'
                             : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40'
                         }`}
                       >
                         {country === 'us' ? '🇺🇸 US' : '🇨🇦 CA'}
                       </span>
                     ))}
                   </div>
                 </div>
               </td>
             </tr>
             {!isCollapsed && clients.map(renderClientRow)}
             <tr aria-hidden="true"><td colSpan={16} className="p-0 border-b-[3px] border-border" /></tr>
           </React.Fragment>
         );
       })}
       {ungrouped.map(renderClientRow)}
     </>
   );
 })()}
 </tbody>
 </table>
 </div>
 </StyledCard>
 </div>
 </div>

 {/* Right Panel */}
 <ClientRightPanel className="flex-shrink-0 h-full" clientName={selectedClientData?.entityName || 'Select a client'} />
 </div>
 </Layout>
 );
}
