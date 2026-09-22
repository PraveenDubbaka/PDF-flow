import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Search, Users, Layers, Clock, CheckCircle2, Archive } from "lucide-react";
import { Layout } from "@/components/Layout";
import { StyledCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { loadClients } from "@/data/clientsData";
import type { ClientEngagement } from "@/data/clientsData";
import intuitQuickbooksLogo from "@/assets/intuit-quickbooks-logo.svg";

const statusVariant = (status: string) => {
 switch (status) {
 case 'In Progress': return 'inProgress' as const;
 case 'New': return 'new' as const;
 case 'Completed': return 'completed' as const;
 case 'Archived': return 'archived' as const;
 default: return 'secondary' as const;
 }
};

const badgeCls = "inline-flex items-center justify-center h-7 px-2 bg-card border border-border rounded-sm gap-1";

function IntegrationBadge({ type }: { type: string }) {
 if (type === 'xero') return (
 <div className={badgeCls}>
 <img src="https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg" alt="Xero" className="h-4" />
 <span className="text-xs font-medium text-foreground">Xero</span>
 </div>
 );
 if (type === 'quickbooks') return (
 <div className={badgeCls}>
 <img src={intuitQuickbooksLogo} alt="QuickBooks" className="h-4" />
 </div>
 );
 return <span className="text-sm text-foreground">Not Connected</span>;
}

export default function ClientDetail() {
 const { clientId } = useParams<{ clientId: string }>();
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<'engagements' | 'templates'>('engagements');
 const [search, setSearch] = useState('');
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [engagements, setEngagements] = useState<ClientEngagement[]>(() => {
 const c = loadClients().find(c => c.id === clientId);
 return c ? c.engagements : [];
 });

 useEffect(() => {
 const c = loadClients().find(c => c.id === clientId);
 setEngagements(c ? c.engagements : []);
 setSelected(new Set());
 setSearch('');
 }, [clientId]);

 const client = loadClients().find(c => c.id === clientId);

 if (!client) {
 return (
 <Layout title="Client Not Found">
 <div className="flex flex-col items-center justify-center h-full gap-4">
 <p className="text-muted-foreground">Client not found.</p>
 <Button variant="outline" onClick={() => navigate('/clients')}>Back to Clients</Button>
 </div>
 </Layout>
 );
 }

 const inProgress = engagements.filter(e => e.status === 'In Progress' || e.status === 'New').length;
 const completed = engagements.filter(e => e.status === 'Completed').length;
 const archived = engagements.filter(e => e.status === 'Archived').length;

 const filtered = engagements.filter(e =>
 e.id.toLowerCase().includes(search.toLowerCase()) ||
 e.type.toLowerCase().includes(search.toLowerCase())
 );

 const toggleSelect = (id: string) => {
 setSelected(prev => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });
 };

 const toggleAll = () => {
 setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(e => e.id)));
 };

 const handleDelete = () => {
 if (selected.size === 0) return;
 setEngagements(prev => prev.filter(e => !selected.has(e.id)));
 setSelected(new Set());
 toast.success(`${selected.size} engagement(s) deleted`);
 };

 const infoFields = [
 { label: 'Legal Entity Name', value: client.legalEntityName },
 { label: 'Entity Type', value: client.entityType },
 { label: 'Country', value: client.clientCountry === 'us' ? '🇺🇸 United States' : '🇨🇦 Canada' },
 ...(client.groupName ? [{ label: 'Client Group', value: client.groupName }] : []),
 { label: 'Contact Person', value: client.contactPerson },
 { label: 'Engagement Partner', value: client.engagementPartner, isLink: true },
 { label: 'Integrations', value: null, isIntegration: true },
 { label: 'Business Phone', value: client.businessPhone ?? '-' },
 { label: 'Cell Phone', value: client.cellPhone ?? '-' },
 ];

 const stats = [
 { label: 'Engagements', value: engagements.length, icon: Layers },
 { label: 'New/In Progress', value: inProgress, icon: Clock },
 { label: 'Completed', value: completed || '-', icon: CheckCircle2 },
 { label: 'Archived', value: archived, icon: Archive },
 ];

 return (
 <Layout title={client.legalEntityName}>
 <div className="flex-1 p-6 overflow-auto flex flex-col gap-5">
 {/* Back link */}
 <button
 onClick={() => navigate('/clients')}
 className="flex items-center gap-1.5 text-sm text-link hover:underline w-fit"
 >
 <ArrowLeft className="h-4 w-4" />
 Back to Clients
 </button>

 {client.groupName && (() => {
 const allGroupMembers = loadClients().filter(
  c => c.groupName === client.groupName
 );
 if (allGroupMembers.length <= 1) return null;
 return (
  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm">
  <span className="text-muted-foreground font-medium shrink-0">Group:</span>
  <span className="font-semibold text-foreground">{client.groupName}</span>
  <span className="text-border">·</span>
  <Select value={client.id} onValueChange={id => { if (id !== client.id) navigate(`/clients/${id}`); }}>
   <SelectTrigger className="h-7 w-52 text-xs">
   <SelectValue />
   </SelectTrigger>
   <SelectContent>
   {allGroupMembers.map(m => (
    <SelectItem key={m.id} value={m.id} className="text-xs">
    {m.clientCountry === 'us' ? '🇺🇸' : '🇨🇦'} {m.entityName}
    </SelectItem>
   ))}
   </SelectContent>
  </Select>
  </div>
 );
 })()}

 {/* Client Information */}
 <StyledCard className="p-5">
 <h2 className="text-sm font-semibold text-foreground mb-4">Client Information</h2>
 <div className="flex flex-wrap gap-x-10 gap-y-3">
 {infoFields.map(f => (
 <div key={f.label} className="flex flex-col gap-0.5 min-w-[120px]">
 <span className="text-xs text-primary font-medium">{f.label}</span>
 {f.isIntegration ? (
 <IntegrationBadge type={client.integration} />
 ) : f.isLink ? (
 <span className="text-sm text-link font-medium cursor-pointer hover:underline">{f.value}</span>
 ) : (
 <span className="text-sm text-foreground">{f.value}</span>
 )}
 </div>
 ))}
 </div>
 </StyledCard>

 {/* Tabs */}
 <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
 {(['engagements', 'templates'] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-sm capitalize ${
 activeTab === tab ? 'bg-[#1C63A6] text-white' : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 {tab.charAt(0).toUpperCase() + tab.slice(1)}
 </button>
 ))}
 </div>

 {activeTab === 'engagements' && (
 <>
 {/* Stats */}
 <div className="text-base font-semibold text-primary">Engagement Info</div>
 <div className="flex items-center gap-3 -mt-2">
 {stats.map(s => (
 <div
 key={s.label}
 className="flex items-center gap-3 px-5 py-3 flex-1 bg-card border border-border shadow-sm cursor-default hover:shadow-md transition-shadow"
 style={{ borderRadius: '12px' }}
 >
 <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <s.icon className="h-4 w-4 text-primary" strokeWidth={2} />
 </div>
 <div className="flex flex-col">
 <span className="text-xl font-bold leading-none text-primary">{s.value}</span>
 <span className="text-[13px] font-medium text-foreground leading-tight mt-0.5 whitespace-nowrap">{s.label}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Table toolbar */}
 <div className="flex items-center justify-between -mt-1">
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 disabled={selected.size === 0}
 onClick={handleDelete}
 className="h-8 gap-1.5 text-xs"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Delete
 </Button>
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 placeholder="Search"
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="pl-8 h-8 w-44 text-xs"
 />
 </div>
 </div>
 <Button
 size="sm"
 className="h-8 text-xs bg-[#1C63A6] hover:bg-[#1a5a9e] text-white"
 onClick={() => navigate('/engagements/create', { state: { clientName: client.legalEntityName } })}
 >
 Create Engagement
 </Button>
 </div>

 {/* Engagements table */}
 <StyledCard className="overflow-hidden flex flex-col flex-1 min-h-0 -mt-2">
 <div className="overflow-y-auto overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 w-10">
 <Checkbox
 checked={filtered.length > 0 && selected.size === filtered.length}
 onCheckedChange={toggleAll}
 />
 </th>
 {['Engagement ID', 'Type', 'Period/Year End Date', 'Assigned Team', 'Status', 'Date Created', 'Actions'].map(h => (
 <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
 {h}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filtered.map(eng => (
 <tr key={eng.id} className="hover:bg-muted/50 transition-colors group">
 <td className="px-4 py-2.5">
 <Checkbox checked={selected.has(eng.id)} onCheckedChange={() => toggleSelect(eng.id)} />
 </td>
 <td className="px-4 py-2.5 whitespace-nowrap">
 <button
 className="text-sm text-link font-medium hover:underline"
 onClick={() => navigate(`/engagements/${eng.id}`)}
 >
 {eng.id}
 </button>
 </td>
 <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">{eng.type}</td>
 <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">{eng.periodEnd}</td>
 <td className="px-4 py-2.5 whitespace-nowrap">
 <button className="text-sm text-link hover:underline">View Assignees</button>
 </td>
 <td className="px-4 py-2.5 whitespace-nowrap">
 <div className="flex items-center gap-1.5">
 <Badge variant={statusVariant(eng.status)}>{eng.status}</Badge>
 {eng.hasRF && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">RF</Badge>}
 </div>
 </td>
 <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">{eng.dateCreated}</td>
 <td className="px-4 py-2.5 whitespace-nowrap">
 <div className="flex items-center gap-1">
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 className="p-1.5 hover:bg-muted rounded-lg transition-colors"
 onClick={() => toast.info(`Edit ${eng.id}`)}
 >
 <Pencil className="h-3.5 w-3.5 text-link" />
 </button>
 </TooltipTrigger>
 <TooltipContent>Edit</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 className="p-1.5 hover:bg-muted rounded-lg transition-colors"
 onClick={() => {
 setEngagements(prev => prev.filter(e => e.id !== eng.id));
 toast.success(`${eng.id} deleted`);
 }}
 >
 <Trash2 className="h-3.5 w-3.5 text-destructive" />
 </button>
 </TooltipTrigger>
 <TooltipContent>Delete</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr>
 <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
 No engagements found.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </StyledCard>
 </>
 )}

 {activeTab === 'templates' && (
 <StyledCard className="p-8 flex items-center justify-center">
 <div className="text-center">
 <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
 <p className="text-sm text-muted-foreground">No templates available for this client.</p>
 </div>
 </StyledCard>
 )}
 </div>
 </Layout>
 );
}
