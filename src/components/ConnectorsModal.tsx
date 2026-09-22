import { useState, useCallback, useMemo, useEffect } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Search, Loader2, PlugZap, Calculator, Banknote, CreditCard, Users, Briefcase, Receipt, FolderOpen, MessageSquare, ShieldCheck, Building2, ClipboardList, Network, Video } from "lucide-react";
import { toast } from "sonner";

interface ConnectorDef {
 id: string;
 name: string;
 description: string;
 bg: string;
 fg: string;
 label: string;
 region?: "CA" | "US";
}

interface CategoryDef {
 id: string;
 name: string;
 tier: string;
 Icon: React.ElementType;
 connectors: ConnectorDef[];
 exclusive?: boolean;
}

const CATEGORIES: CategoryDef[] = [
 {
 id: "accounting",
 name: "Accounting & General Ledger",
 tier: "T1",
 Icon: Calculator,
 exclusive: true,
 connectors: [
 { id: "qbo", name: "QuickBooks Online", description: "Full GL, AR/AP, payroll data", bg: "#2CA01C", fg: "#fff", label: "QB" },
 { id: "xero", name: "Xero", description: "Cloud accounting, bank feeds, reports", bg: "#13B5EA", fg: "#fff", label: "X" },
 { id: "sage50", name: "Sage 50", description: "Desktop GL, journal entries", bg: "#00904A", fg: "#fff", label: "S" },
 { id: "sage-intacct", name: "Sage Intacct", description: "Multi-entity cloud ERP", bg: "#007749", fg: "#fff", label: "SI" },
 { id: "netsuite", name: "NetSuite", description: "Oracle ERP, advanced accounting", bg: "#2949A3", fg: "#fff", label: "NS" },
 { id: "freshbooks", name: "FreshBooks", description: "Small business invoicing & expenses", bg: "#00BF6F", fg: "#fff", label: "FB" },
 { id: "wave", name: "Wave", description: "Free accounting for small businesses", bg: "#5EC3D4", fg: "#fff", label: "WV" },
 ],
 },
 {
 id: "banking",
 name: "Banking & Cash",
 tier: "T2",
 Icon: Banknote,
 connectors: [
 { id: "plaid", name: "Plaid", description: "Bank transaction feeds (US/CA)", bg: "#111214", fg: "#fff", label: "PL" },
 { id: "flinks", name: "Flinks", description: "Open banking aggregator", bg: "#2F5AFF", fg: "#fff", label: "FL", region: "CA" },
 { id: "finicity", name: "Finicity", description: "Mastercard Open Banking data", bg: "#F97316", fg: "#fff", label: "FI", region: "US" },
 ],
 },
 {
 id: "payments",
 name: "Payments & Commerce",
 tier: "T3",
 Icon: CreditCard,
 connectors: [
 { id: "stripe", name: "Stripe", description: "Payment transactions & payouts", bg: "#635BFF", fg: "#fff", label: "ST" },
 { id: "square", name: "Square", description: "POS & online payment data", bg: "#3E4347", fg: "#fff", label: "SQ" },
 { id: "shopify", name: "Shopify", description: "E-commerce revenue & refunds", bg: "#96BF48", fg: "#fff", label: "SH" },
 ],
 },
 {
 id: "payroll",
 name: "Payroll",
 tier: "T4",
 Icon: Users,
 connectors: [
 { id: "adp", name: "ADP", description: "Payroll, benefits & workforce data", bg: "#CC0000", fg: "#fff", label: "ADP" },
 { id: "gusto", name: "Gusto", description: "SMB payroll & benefits", bg: "#F45D48", fg: "#fff", label: "GU" },
 { id: "ceridian", name: "Ceridian / Dayforce", description: "Enterprise HCM & payroll", bg: "#5B2D8E", fg: "#fff", label: "CE" },
 { id: "wagepoint", name: "Wagepoint", description: "Canadian payroll & T4s", bg: "#4CAF50", fg: "#fff", label: "WP", region: "CA" },
 ],
 },
 {
 id: "crm",
 name: "CRM & Sales",
 tier: "T5",
 Icon: Briefcase,
 connectors: [
 { id: "salesforce", name: "Salesforce", description: "Pipeline, deals & revenue recognition", bg: "#00A1E0", fg: "#fff", label: "SF" },
 { id: "hubspot", name: "HubSpot", description: "CRM, deals & revenue data", bg: "#FF7A59", fg: "#fff", label: "HS" },
 ],
 },
 {
 id: "tax",
 name: "Tax Software",
 tier: "T6",
 Icon: Receipt,
 connectors: [
 { id: "taxcycle", name: "TaxCycle", description: "Canadian T2/T1 return data", bg: "#1B4F9D", fg: "#fff", label: "TC", region: "CA" },
 { id: "profile", name: "ProFile / CCH iFirm", description: "T-slips & return mapping", bg: "#2B5293", fg: "#fff", label: "PF", region: "CA" },
 { id: "ultratax", name: "UltraTax CS", description: "Thomson Reuters US tax data", bg: "#1C4994", fg: "#fff", label: "UT", region: "US" },
 { id: "lacerte", name: "Lacerte", description: "Intuit professional tax data", bg: "#005EB8", fg: "#fff", label: "LA", region: "US" },
 { id: "proconnect", name: "ProConnect Tax", description: "Cloud professional tax", bg: "#008BD0", fg: "#fff", label: "PC", region: "US" },
 ],
 },
 {
 id: "docs",
 name: "Documents & Files",
 tier: "T7",
 Icon: FolderOpen,
 connectors: [
 { id: "gdrive", name: "Google Drive", description: "Source documents & workpapers", bg: "#4285F4", fg: "#fff", label: "GD" },
 { id: "onedrive", name: "OneDrive / SharePoint", description: "Microsoft cloud file storage", bg: "#0078D4", fg: "#fff", label: "OD" },
 { id: "dropbox", name: "Dropbox", description: "File sync & document sharing", bg: "#0061FE", fg: "#fff", label: "DB" },
 { id: "box", name: "Box", description: "Enterprise content management", bg: "#0061D5", fg: "#fff", label: "BX" },
 { id: "docusign", name: "DocuSign", description: "eSignatures & envelope status", bg: "#FFBF00", fg: "#000", label: "DS" },
 { id: "adobesign", name: "Adobe Sign", description: "Electronic signature workflow", bg: "#FF0000", fg: "#fff", label: "AS" },
 ],
 },
 {
 id: "communication",
 name: "Communication",
 tier: "T8",
 Icon: MessageSquare,
 connectors: [
 { id: "gmail", name: "Gmail / IMAP", description: "Email correspondence import", bg: "#EA4335", fg: "#fff", label: "GM" },
 { id: "outlook", name: "Outlook / M365", description: "Microsoft email & calendar", bg: "#0078D4", fg: "#fff", label: "OL" },
 { id: "zoom", name: "Zoom", description: "Meeting recordings & transcripts", bg: "#2D8CFF", fg: "#fff", label: "ZM" },
 { id: "msteams", name: "Microsoft Teams", description: "Team channel messages", bg: "#6264A7", fg: "#fff", label: "MT" },
 { id: "slack", name: "Slack", description: "Workspace messages & channels", bg: "#4A154B", fg: "#fff", label: "SL" },
 ],
 },
 {
 id: "meetings",
 name: "Meeting & Notes",
 tier: "T8b",
 Icon: Video,
 connectors: [
  { id: "granola", name: "Granola", description: "AI meeting notes & summaries", bg: "#1A1A2E", fg: "#fff", label: "GR" },
  { id: "fireflies", name: "Fireflies.ai", description: "Meeting transcripts & AI summaries", bg: "#7C3AED", fg: "#fff", label: "FF" },
  { id: "otter", name: "Otter.ai", description: "Conversation notes & decisions", bg: "#2196F3", fg: "#fff", label: "OT" },
  { id: "gcal", name: "Google Calendar", description: "Meeting invites, attendees & agenda", bg: "#4285F4", fg: "#fff", label: "GC" },
 ],
 },
 {
 id: "identity",
 name: "Identity & AML",
 tier: "T9",
 Icon: ShieldCheck,
 connectors: [
 { id: "persona", name: "Persona", description: "KYC / identity verification", bg: "#5C2D91", fg: "#fff", label: "PE" },
 { id: "onfido", name: "Onfido", description: "Document & biometric ID checks", bg: "#2E2E2E", fg: "#fff", label: "ON" },
 { id: "complyadvantage", name: "ComplyAdvantage", description: "AML screening & risk monitoring", bg: "#1C3FA0", fg: "#fff", label: "CA" },
 { id: "refinitiv", name: "Refinitiv World-Check", description: "Sanctions & PEP screening", bg: "#F26522", fg: "#fff", label: "RF" },
 ],
 },
 {
 id: "registry",
 name: "Corporate Registry",
 tier: "T10",
 Icon: Building2,
 connectors: [
 { id: "athennian", name: "Athennian", description: "Corporate records & minute books", bg: "#1A56DB", fg: "#fff", label: "AT" },
 { id: "opencorp", name: "OpenCorporates", description: "Global company registry data", bg: "#2E7D32", fg: "#fff", label: "OC" },
 ],
 },
 {
 id: "audit",
 name: "Audit & Industry Data",
 tier: "T11",
 Icon: ClipboardList,
 connectors: [
 { id: "confirmation", name: "Confirmation.com", description: "Direct bank & legal confirmations", bg: "#0747A6", fg: "#fff", label: "CF" },
 { id: "edgar", name: "SEC EDGAR / SEDAR+", description: "Public filings & regulatory data", bg: "#003366", fg: "#fff", label: "SE" },
 { id: "soclib", name: "SOC Report Library", description: "Vendor SOC 1/2 report access", bg: "#374151", fg: "#fff", label: "SR" },
 ],
 },
 {
 id: "aggregators",
 name: "Data Aggregators",
 tier: "AGG",
 Icon: Network,
 connectors: [
 { id: "codat", name: "Codat", description: "Multi-source accounting & banking API", bg: "#1A73E8", fg: "#fff", label: "CO" },
 { id: "finch", name: "Finch", description: "Universal employment & payroll API", bg: "#FF6B35", fg: "#fff", label: "FN" },
 { id: "rutter", name: "Rutter", description: "Commerce & accounting data unification", bg: "#6366F1", fg: "#fff", label: "RT" },
 ],
 },
];

// Flat lookup by connector id
export const CONNECTORS_BY_ID: Record<string, ConnectorDef> = {};
for (const cat of CATEGORIES) {
 for (const c of cat.connectors) {
 CONNECTORS_BY_ID[c.id] = c;
 }
}

export interface ConnectorsModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 connectedApps: Set<string>;
 onConnect: (connectorId: string) => void;
 onDisconnect: (connectorId: string) => void;
 scrollToConnectorId?: string;
}

// Simple Icons CDN slugs for connectors that have official brand icons
const SI_SLUGS: Record<string, string> = {
 qbo: "quickbooks",
 xero: "xero",
 sage50: "sage",
 "sage-intacct": "sage",
 netsuite: "oracle",
 freshbooks: "freshbooks",
 wave: "wave",
 plaid: "plaid",
 stripe: "stripe",
 square: "square",
 shopify: "shopify",
 adp: "adp",
 gusto: "gusto",
 salesforce: "salesforce",
 hubspot: "hubspot",
 gdrive: "googledrive",
 onedrive: "microsoftonedrive",
 dropbox: "dropbox",
 box: "box",
 docusign: "docusign",
 adobesign: "adobe",
 gmail: "gmail",
 outlook: "microsoftoutlook",
 zoom: "zoom",
 msteams: "microsoftteams",
 slack: "slack",
 codat: "codat",
};

function ConnectorAvatar({ connector }: { connector: ConnectorDef }) {
 const [imgFailed, setImgFailed] = useState(false);
 const slug = SI_SLUGS[connector.id];

 if (slug && !imgFailed) {
 return (
 <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-white border border-border/40 overflow-hidden">
 <img
 src={`https://cdn.simpleicons.org/${slug}`}
 alt={connector.name}
 className="w-[18px] h-[18px] object-contain"
 onError={() => setImgFailed(true)}
 />
 </div>
 );
 }

 return (
 <div
 className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold leading-none select-none"
 style={{ backgroundColor: connector.bg, color: connector.fg }}
 >
 {connector.label}
 </div>
 );
}

export function ConnectorsModal({ open, onOpenChange, connectedApps, onConnect, onDisconnect, scrollToConnectorId }: ConnectorsModalProps) {
 const [search, setSearch] = useState("");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [loadingId, setLoadingId] = useState<string | null>(null);
 const [highlightedId, setHighlightedId] = useState<string | null>(null);

 useEffect(() => {
  if (!open || !scrollToConnectorId) return;
  setHighlightedId(scrollToConnectorId);
  const scrollTimer = setTimeout(() => {
   const el = document.querySelector(`[data-connector-id="${scrollToConnectorId}"]`);
   el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 150);
  const clearTimer = setTimeout(() => setHighlightedId(null), 3000);
  return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
 }, [open, scrollToConnectorId]);

 const q = search.trim().toLowerCase();

 const filteredCategories = useMemo(() => {
 if (!q) return CATEGORIES;
 return CATEGORIES
.map(cat => ({
...cat,
 connectors: cat.connectors.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
 }))
.filter(cat => cat.connectors.length > 0);
 }, [q]);

 const connectedCount = connectedApps.size;

 const handleConnectClick = useCallback((id: string) => {
 if (loadingId) return;
 setExpandedId(prev => (prev === id ? null : id));
 }, [loadingId]);

 const handleAuthorize = useCallback((connector: ConnectorDef) => {
 setExpandedId(null);
 setLoadingId(connector.id);
 setTimeout(() => {
 setLoadingId(null);
 onConnect(connector.id);
 toast.success(`Connected to ${connector.name}`);
 }, 1600);
 }, [onConnect]);

 const handleDisconnect = useCallback((connector: ConnectorDef) => {
 onDisconnect(connector.id);
 toast.success(`Disconnected from ${connector.name}`);
 }, [onDisconnect]);

 const handleCancel = useCallback(() => {
 setExpandedId(null);
 }, []);

 return (
 <Dialog open={open} onOpenChange={v => { if (!v) { setExpandedId(null); setSearch(""); } onOpenChange(v); }}>
 <DialogContent className="max-w-3xl h-[82vh] flex flex-col gap-0 p-0 overflow-hidden">
 {/* Header */}
 <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
 <div className="flex items-center gap-3">
 <PlugZap className="h-4 w-4 text-primary flex-shrink-0" />
 <DialogTitle className="text-base font-semibold leading-none">Connectors & Integrations</DialogTitle>
 {connectedCount > 0 && (
 <Badge variant="secondary" className="text-xs px-2 py-0.5">{connectedCount} connected</Badge>
 )}
 </div>
 <div className="relative mt-3">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
 <Input
 placeholder="Search connectors…"
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="pl-8 h-8 text-sm"
 />
 </div>
 </DialogHeader>

 {/* Scrollable body */}
 <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
 {filteredCategories.length === 0 && (
 <p className="text-sm text-muted-foreground text-center py-8">No connectors match "{search}"</p>
 )}

 {filteredCategories.map(cat => (
 <section key={cat.id}>
 {/* Category header */}
 <div className="flex items-center gap-2 mb-2.5">
 <cat.Icon className="h-3.5 w-3.5 text-muted-foreground" />
 <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{cat.name}</span>
 <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-0.5">{cat.tier}</Badge>
 <span className="text-xs text-muted-foreground ml-1">
 {cat.connectors.filter(c => connectedApps.has(c.id)).length > 0 && (
 <span className="text-green-600 font-medium">
 {cat.connectors.filter(c => connectedApps.has(c.id)).length} connected ·{" "}
 </span>
 )}
 {cat.connectors.length} {cat.connectors.length === 1 ? "connector" : "connectors"}
 </span>
 </div>

 {/* Connector list */}
 <div className="space-y-1">
 {(() => {
 const catConnectedCount = cat.connectors.filter(c => connectedApps.has(c.id)).length;
 const exclusiveLocked = !!cat.exclusive && catConnectedCount > 0;
 return cat.connectors.map(connector => {
 const isConnected = connectedApps.has(connector.id);
 const isLoading = loadingId === connector.id;
 const isExpanded = expandedId === connector.id;
 const isBlockedByExclusive = exclusiveLocked && !isConnected;

 return (
 <div key={connector.id}>
 <div data-connector-id={connector.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${isBlockedByExclusive ? "border-border/40 opacity-50 cursor-not-allowed" : highlightedId === connector.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : isExpanded ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:bg-muted/40"}`}>
 <ConnectorAvatar connector={connector} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium leading-tight">{connector.name}</span>
 {connector.region && (
 <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{connector.region}</span>
 )}
 </div>
 <div className="text-xs text-muted-foreground mt-0.5 truncate">{connector.description}</div>
 </div>
 <div className="flex-shrink-0 flex items-center gap-2">
 {isConnected ? (
 <>
 <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
 <Check className="h-3 w-3" />
 Connected
 </span>
 <button
 onClick={() => handleDisconnect(connector)}
 className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1"
 >
 Disconnect
 </button>
 </>
 ) : isLoading ? (
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 <span>Connecting…</span>
 </div>
 ) : isBlockedByExclusive ? (
 <span className="text-xs text-muted-foreground/50 select-none">Unavailable</span>
 ) : (
 <Button
 size="sm"
 variant={isExpanded ? "default" : "outline"}
 onClick={() => handleConnectClick(connector.id)}
 className="h-7 text-xs px-3"
 disabled={!!loadingId}
 >
 {isExpanded ? "Cancel" : "Connect"}
 </Button>
 )}
 </div>
 </div>

 {/* Inline authorization form */}
 {isExpanded && (
 <div className="ml-11 mt-1 mb-0.5 px-3 py-2.5 rounded-md bg-muted/30 border border-border/60 flex items-center justify-between gap-4">
 <p className="text-xs text-muted-foreground leading-relaxed">
 Authorize Countable to read {connector.name} data for this engagement. You will be redirected to {connector.name} to complete sign-in.
 </p>
 <div className="flex items-center gap-2 flex-shrink-0">
 <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs px-2">
 Cancel
 </Button>
 <Button size="sm" onClick={() => handleAuthorize(connector)} className="h-7 text-xs px-3">
 Authorize
 </Button>
 </div>
 </div>
 )}
 </div>
 );
 });
 })()}
 </div>
 </section>
 ))}
 </div>

 {/* Footer summary */}
 {connectedCount > 0 && (
 <div className="px-6 py-3 border-t border-border bg-muted/20 flex-shrink-0 flex items-center gap-2 flex-wrap">
 <span className="text-xs text-muted-foreground font-medium">Connected:</span>
 {Array.from(connectedApps).map(id => {
 const c = CONNECTORS_BY_ID[id];
 if (!c) return null;
 return (
 <span key={id} className="inline-flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
 <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.bg }} />
 {c.name}
 </span>
 );
 })}
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
