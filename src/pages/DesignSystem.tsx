import React, { useCallback, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
 Copy, Download, Plus, Trash2, Search, Bell, Settings, Mail, Star,
 CheckCircle2, AlertCircle, AlertTriangle, Info, Sparkles, ChevronRight, ChevronLeft,
 Home, Folder, FileText, Users, Calendar, BarChart3, Zap, MessageSquare,
 Eye, Edit, MoreVertical, X, Check, ArrowRight, ArrowLeft, ChevronDown,
 Filter, RefreshCw, Upload, Save, Send, Paperclip, Mic, Image as ImageIcon,
 Lock, Unlock, User, UserCircle, Building2, CreditCard, LogOut, Gift,
 Monitor, Bookmark, Clock, AlertOctagon, HelpCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputFilled } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from "sonner";
import { BookIcon } from "@/components/icons/BookIcon";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { LetterIcon } from "@/components/icons/LetterIcon";
import { CompletionIcon } from "@/components/icons/CompletionIcon";
import { WordDocIcon } from "@/components/icons/WordDocIcon";
import { AddItemAboveIcon, AddItemBelowIcon } from "@/components/icons/AddItemIcons";
import { FolderSolidIcon, FolderPlusIcon, FolderMinusIcon } from "@/components/icons/FolderIcons";
import { countableLogos, type CountableLogoAsset } from "@/data/countableLogos";

/* ─── Token data ─── */
interface Token { css: string; label: string; hsl: string; hex: string; }

const core: Token[] = [
 { css: "--background", label: "Background", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--foreground", label: "Foreground", hsl: "213 50% 15%", hex: "#132640" },
 { css: "--primary", label: "Primary", hsl: "207 71% 38%", hex: "#1C63A6" },
 { css: "--primary-foreground", label: "Primary FG", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--secondary", label: "Secondary", hsl: "210 30% 90%", hex: "#DDE4EB" },
 { css: "--secondary-foreground", label: "Secondary FG", hsl: "210 30% 15%", hex: "#1B2430" },
 { css: "--muted", label: "Muted", hsl: "210 40% 96%", hex: "#EFF3F8" },
 { css: "--muted-foreground", label: "Muted FG", hsl: "213 50% 15%", hex: "#132640" },
 { css: "--accent", label: "Accent (Tertiary)", hsl: "213 76% 19%", hex: "#0A3159" },
 { css: "--accent-foreground", label: "Accent FG", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--destructive", label: "Destructive", hsl: "0 75% 42%", hex: "#BB1B1B" },
 { css: "--destructive-foreground", label: "Destructive FG", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--border", label: "Border", hsl: "210 30% 82%", hex: "#C3CDD9" },
 { css: "--ring", label: "Ring", hsl: "207 71% 38%", hex: "#1C63A6" },
 { css: "--card", label: "Card", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--popover", label: "Popover", hsl: "0 0% 100%", hex: "#FFFFFF" },
];

const darkCore: Token[] = [
 { css: "--background", label: "Background", hsl: "220 25% 8%", hex: "#121720" },
 { css: "--foreground", label: "Foreground", hsl: "220 15% 90%", hex: "#E2E5EA" },
 { css: "--primary", label: "Primary", hsl: "207 80% 70%", hex: "#70B8F0" },
 { css: "--primary-foreground", label: "Primary FG", hsl: "207 80% 20%", hex: "#0A3B5C" },
 { css: "--secondary", label: "Secondary", hsl: "210 25% 25%", hex: "#303B48" },
 { css: "--secondary-foreground", label: "Secondary FG", hsl: "210 30% 90%", hex: "#DDE4EB" },
 { css: "--muted", label: "Muted", hsl: "220 20% 18%", hex: "#262D38" },
 { css: "--muted-foreground", label: "Muted FG", hsl: "220 15% 70%", hex: "#A8AEB6" },
 { css: "--accent", label: "Accent (Tertiary)", hsl: "213 60% 75%", hex: "#8FBDE6" },
 { css: "--destructive", label: "Destructive", hsl: "0 85% 75%", hex: "#F09090" },
 { css: "--border", label: "Border", hsl: "220 15% 30%", hex: "#434B57" },
 { css: "--card", label: "Card", hsl: "220 25% 10%", hex: "#161D28" },
 { css: "--popover", label: "Popover", hsl: "220 25% 13%", hex: "#1C2430" },
];

const brand: Token[] = [
 { css: "--countable-blue", label: "Countable Blue", hsl: "207 71% 38%", hex: "#1C63A6" },
 { css: "--countable-blue-light", label: "Countable Blue Light", hsl: "207 78% 55%", hex: "#3B94D9" },
 { css: "--countable-blue-dark", label: "Countable Blue Dark", hsl: "207 78% 28%", hex: "#0F4A7F" },
 { css: "--countable-teal", label: "Countable Teal", hsl: "180 50% 45%", hex: "#39ADAD" },
 { css: "--countable-navy", label: "Countable Navy", hsl: "213 76% 19%", hex: "#0A3159" },
];

const sidebarTokens: Token[] = [
 { css: "--sidebar-bg", label: "Sidebar BG", hsl: "213 76% 19%", hex: "#0A3159" },
 { css: "--sidebar-foreground", label: "Sidebar FG", hsl: "0 0% 100%", hex: "#FFFFFF" },
 { css: "--sidebar-muted", label: "Sidebar Muted", hsl: "213 60% 28%", hex: "#1B4472" },
 { css: "--sidebar-accent", label: "Sidebar Accent", hsl: "207 71% 38%", hex: "#1C63A6" },
 { css: "--sidebar-secondary-bg", label: "Secondary Panel BG", hsl: "0 0% 100%", hex: "#FFFFFF" },
];

const radii = [
 { token: "--radius-xs", value: "6px", usage: "Tiny corners" },
 { token: "--radius-sm", value: "10px", usage: "Inputs / form elements" },
 { token: "--radius-md", value: "12px", usage: "Cards / dropdowns" },
 { token: "--radius-button", value: "12px", usage: "Buttons" },
 { token: "--radius-lg", value: "20px", usage: "Main cockpit layout" },
 { token: "--radius-xl", value: "24px", usage: "Large panels" },
 { token: "--radius-full", value: "9999px", usage: "Pills / circles" },
];

const elevations = [
 { name: "Elevation 1", token: "--elevation-1", desc: "Subtle lift (cards)" },
 { name: "Elevation 2", token: "--elevation-2", desc: "Moderate lift (dropdowns)" },
 { name: "Elevation 3", token: "--elevation-3", desc: "Prominent (menus)" },
 { name: "Elevation 4", token: "--elevation-4", desc: "Strong (dialogs)" },
 { name: "Elevation 5", token: "--elevation-5", desc: "Max (tooltips / FAB)" },
];

const typography = [
 { name: "Display Large", size: "60px", weight: "700", tracking: "-0.03em" },
 { name: "Display Medium", size: "48px", weight: "700", tracking: "-0.025em" },
 { name: "Headline Large", size: "34px", weight: "600", tracking: "-0.015em" },
 { name: "Headline Med", size: "30px", weight: "600", tracking: "-0.01em" },
 { name: "Headline Small", size: "26px", weight: "600", tracking: "0" },
 { name: "Title Large", size: "24px", weight: "600", tracking: "0" },
 { name: "Title Medium", size: "18px", weight: "600", tracking: "0.01em" },
 { name: "Title Small", size: "16px", weight: "600", tracking: "0.01em" },
 { name: "Body Large", size: "17px", weight: "400", tracking: "0.015em" },
 { name: "Body Medium", size: "15px", weight: "400", tracking: "0.01em" },
 { name: "Body Small", size: "13px", weight: "400", tracking: "0.02em" },
 { name: "Label Large", size: "15px", weight: "500", tracking: "0.02em" },
 { name: "Label Medium", size: "13px", weight: "500", tracking: "0.03em" },
 { name: "Label Small", size: "12px", weight: "500", tracking: "0.04em" },
];

const spacing = [
 { token: "--spacing-xs", value: "8px" },
 { token: "--spacing-sm", value: "12px" },
 { token: "--spacing-md", value: "16px" },
 { token: "--spacing-lg", value: "24px" },
 { token: "--spacing-xl", value: "32px" },
 { token: "--spacing-2xl", value: "40px" },
 { token: "--spacing-3xl", value: "48px" },
];

const motionEasing = [
 { name: "Emphasized", value: "cubic-bezier(0.2, 0, 0, 1)", usage: "Default transitions" },
 { name: "Emphasized Decelerate", value: "cubic-bezier(0.05, 0.7, 0.1, 1)", usage: "Enter animations" },
 { name: "Emphasized Accelerate", value: "cubic-bezier(0.3, 0, 0.8, 0.15)", usage: "Exit animations" },
 { name: "Standard", value: "cubic-bezier(0.2, 0, 0, 1)", usage: "Simple transitions" },
];

const motionDurations = [
 { name: "Short 1–4", value: "50–200ms", usage: "Micro-interactions" },
 { name: "Medium 1–4", value: "250–400ms", usage: "Expand/collapse" },
 { name: "Long 1–4", value: "450–600ms", usage: "Page changes" },
 { name: "Extra Long 1–4", value: "700–1000ms", usage: "Onboarding" },
];

/* ─── Reusable bits ─── */
function Swatch({ token }: { token: Token }) {
 const copy = () => { navigator.clipboard.writeText(token.css); sonnerToast.success("Copied: " + token.css); };
 return (
 <button onClick={copy} className="group flex items-center gap-3 rounded-md p-2 text-left hover:bg-muted transition-colors w-full">
 <div className="h-10 w-10 shrink-0 rounded-md border border-border" style={{ background: `hsl(${token.hsl})` }} />
 <div className="min-w-0 flex-1">
 <p className="text-body-sm font-medium truncate">{token.label}</p>
 <p className="text-label-sm text-muted-foreground font-mono">{token.css}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-label-sm font-mono">{token.hex}</p>
 <p className="text-label-sm text-muted-foreground font-mono">{token.hsl}</p>
 </div>
 <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
 </button>
 );
}

function ColorGrid({ tokens }: { tokens: Token[] }) {
 return <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-muted rounded-lg p-1">{tokens.map(t => <Swatch key={t.css + t.label} token={t} />)}</div>;
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
 return (
 <div className="flex items-start gap-3 py-1.5 border-b border-border/50 last:border-0">
 <span className="text-label-sm font-medium text-muted-foreground w-32 shrink-0">{label}</span>
 <span className="text-body-sm flex-1">{value}</span>
 </div>
 );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
 return (
 <section className="space-y-3">
 <div>
 <h3 className="text-title-md text-foreground">{title}</h3>
 {description && <p className="text-body-sm text-muted-foreground mt-1">{description}</p>}
 </div>
 {children}
 </section>
 );
}

function SampleCard({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="rounded-xl border border-border bg-card p-5 space-y-4">
 <h4 className="text-title-sm text-foreground">{title}</h4>
 {children}
 </div>
 );
}

/* ─── Icon catalog ─── */
type IconEntry = {
 name: string;
 category: "Custom" | "Lucide";
 Component: React.ComponentType<{ className?: string }>;
 /** Returns SVG markup string for download */
 toSvg: () => string;
};

// Helper to render a React icon to a static SVG string
function renderToSvgString(Comp: React.ComponentType<{ className?: string }>, size = 64): string {
 // Use a temp container to extract SVG markup
 const container = document.createElement("div");
 // We can't easily render React here without ReactDOM; instead, we serialize
 // by querying the live DOM where the icon is already rendered.
 // Caller will pass a ref-based approach. This is a fallback default.
 container.innerHTML = "";
 return "";
}

const customIcons: IconEntry[] = [
 { name: "BookIcon", category: "Custom", Component: BookIcon, toSvg: () => "" },
 { name: "ChecklistIcon", category: "Custom", Component: ChecklistIcon, toSvg: () => "" },
 { name: "LetterIcon", category: "Custom", Component: LetterIcon, toSvg: () => "" },
 { name: "CompletionIcon", category: "Custom", Component: CompletionIcon, toSvg: () => "" },
 { name: "WordDocIcon", category: "Custom", Component: WordDocIcon, toSvg: () => "" },
 { name: "AddItemAboveIcon", category: "Custom", Component: AddItemAboveIcon, toSvg: () => "" },
 { name: "AddItemBelowIcon", category: "Custom", Component: AddItemBelowIcon, toSvg: () => "" },
 { name: "FolderSolidIcon", category: "Custom", Component: FolderSolidIcon, toSvg: () => "" },
 { name: "FolderPlusIcon", category: "Custom", Component: FolderPlusIcon, toSvg: () => "" },
 { name: "FolderMinusIcon", category: "Custom", Component: FolderMinusIcon, toSvg: () => "" },
];

const lucideIcons: { name: string; Component: React.ComponentType<any> }[] = [
 { name: "Home", Component: Home }, { name: "Folder", Component: Folder },
 { name: "FileText", Component: FileText }, { name: "Users", Component: Users },
 { name: "Calendar", Component: Calendar }, { name: "BarChart3", Component: BarChart3 },
 { name: "Zap", Component: Zap }, { name: "MessageSquare", Component: MessageSquare },
 { name: "Settings", Component: Settings }, { name: "Bell", Component: Bell },
 { name: "Search", Component: Search }, { name: "Plus", Component: Plus },
 { name: "Trash2", Component: Trash2 }, { name: "Edit", Component: Edit },
 { name: "Eye", Component: Eye }, { name: "MoreVertical", Component: MoreVertical },
 { name: "X", Component: X }, { name: "Check", Component: Check },
 { name: "ChevronRight", Component: ChevronRight }, { name: "ChevronDown", Component: ChevronDown },
 { name: "ArrowRight", Component: ArrowRight }, { name: "ArrowLeft", Component: ArrowLeft },
 { name: "Filter", Component: Filter }, { name: "RefreshCw", Component: RefreshCw },
 { name: "Upload", Component: Upload }, { name: "Download", Component: Download },
 { name: "Save", Component: Save }, { name: "Send", Component: Send },
 { name: "Paperclip", Component: Paperclip }, { name: "Mic", Component: Mic },
 { name: "Image", Component: ImageIcon }, { name: "Lock", Component: Lock },
 { name: "Unlock", Component: Unlock }, { name: "User", Component: User },
 { name: "UserCircle", Component: UserCircle }, { name: "Building2", Component: Building2 },
 { name: "CreditCard", Component: CreditCard }, { name: "LogOut", Component: LogOut },
 { name: "Gift", Component: Gift }, { name: "Monitor", Component: Monitor },
 { name: "Bookmark", Component: Bookmark }, { name: "Clock", Component: Clock },
 { name: "AlertOctagon", Component: AlertOctagon }, { name: "HelpCircle", Component: HelpCircle },
 { name: "ExternalLink", Component: ExternalLink }, { name: "Sparkles", Component: Sparkles },
 { name: "Star", Component: Star }, { name: "Mail", Component: Mail },
 { name: "Info", Component: Info }, { name: "AlertCircle", Component: AlertCircle },
 { name: "AlertTriangle", Component: AlertTriangle }, { name: "CheckCircle2", Component: CheckCircle2 },
];

function IconCard({ name, children, refKey }: { name: string; children: React.ReactNode; refKey: string }) {
 const ref = React.useRef<HTMLDivElement>(null);

 const download = () => {
 const svg = ref.current?.querySelector("svg");
 if (!svg) {
 sonnerToast.error("Icon not found");
 return;
 }
 const clone = svg.cloneNode(true) as SVGElement;
 if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
 clone.setAttribute("width", "64");
 clone.setAttribute("height", "64");
 const serializer = new XMLSerializer();
 const source = serializer.serializeToString(clone);
 const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url; a.download = `${name}.svg`; a.click();
 URL.revokeObjectURL(url);
 sonnerToast.success(`Downloaded ${name}.svg`);
 };

 const copy = () => {
 navigator.clipboard.writeText(name);
 sonnerToast.success(`Copied: ${name}`);
 };

 return (
 <div className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary transition-colors">
 <div ref={ref} className="h-10 w-10 flex items-center justify-center text-foreground">
 {children}
 </div>
 <button onClick={copy} className="text-label-sm font-mono text-muted-foreground truncate max-w-full hover:text-primary transition-colors">
 {name}
 </button>
 <button
 onClick={download}
 className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
 title={`Download ${name}.svg`}
 >
 <Download className="h-3.5 w-3.5 text-primary" />
 </button>
 </div>
 );
}

/* ─── Logo ─── */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LOGO_EXPORT_SCALE = 6;

function LogoCard({ asset }: { asset: CountableLogoAsset }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDark = asset.background === "dark";
  const slug = asset.id;

  const getSvgSource = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
  };

  const downloadSvg = () => {
    const source = getSvgSource();
    if (!source) return;
    triggerDownload(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), `countable-${slug}.svg`);
    sonnerToast.success(`Downloaded countable-${slug}.svg`);
  };

  // Rasterizes the live SVG onto an offscreen canvas at a higher resolution
  // than the on-page preview. PNG keeps transparency; JPG has none, so it
  // gets the surface color this variant is designed for painted in first.
  const downloadRaster = (format: "png" | "jpg") => {
    const source = getSvgSource();
    if (!source) return;
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = asset.width * LOGO_EXPORT_SCALE;
      canvas.height = asset.height * LOGO_EXPORT_SCALE;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return;
      if (format === "jpg") {
        ctx.fillStyle = isDark ? "#0A3159" : "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = format === "png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          triggerDownload(blob, `countable-${slug}.${format}`);
          sonnerToast.success(`Downloaded countable-${slug}.${format}`);
        },
        mime,
        format === "jpg" ? 0.95 : undefined
      );
    };
    img.onerror = () => sonnerToast.error(`Couldn't render countable-${slug}.${format}`);
    img.src = url;
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        ref={containerRef}
        className={`flex items-center justify-center p-8 h-32 ${isDark ? "bg-[#0A3159]" : "bg-white"}`}
        dangerouslySetInnerHTML={{ __html: asset.svg }}
      />
      <div className="p-4 space-y-3">
        <div>
          <p className="text-body-sm font-medium text-foreground">{asset.name}</p>
          <p className="text-label-sm text-muted-foreground mt-0.5">{asset.description}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadSvg} className="gap-1.5 flex-1">
            <Download className="h-3.5 w-3.5" /> SVG
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadRaster("png")} className="gap-1.5 flex-1">
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadRaster("jpg")} className="gap-1.5 flex-1">
            <Download className="h-3.5 w-3.5" /> JPG
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Table & Pagination demo ─── */
const TABLE_ROWS = [
 { id: "AUD-RIV069-Jul312022", client: "Riverstone Media Group Inc.", yearEnd: "Jul 31, 2022", period: "Full Year", type: "Audit", status: "In Progress", created: "May 27, 2025 09:00 AM" },
 { id: "COM-PAT-Dec312024", client: "Patel & Shah CPA", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "Complete", created: "Apr 15, 2025 02:30 PM" },
 { id: "REV-GRE-Dec312024", client: "Grewal & Gupta CPA", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "Needs Review", created: "Mar 10, 2025 11:15 AM" },
 { id: "AUD-FAB-Mar312025", client: "Faber & Associates LLP", yearEnd: "Mar 31, 2025", period: "Full Year", type: "Audit", status: "Setup", created: "Jun 01, 2025 08:00 AM" },
 { id: "COM-CED-Dec312023", client: "Cedar Valley Enterprises", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Compilation", status: "Complete", created: "Jan 20, 2025 03:45 PM" },
 { id: "AUD-NOR-Sep302024", client: "Northline Holdings Ltd.", yearEnd: "Sep 30, 2024", period: "Full Year", type: "Audit", status: "In Progress", created: "Feb 28, 2025 10:00 AM" },
 { id: "REV-SUM-Jun302024", client: "Summit Industrial Inc.", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Review", status: "Complete", created: "Nov 15, 2024 09:30 AM" },
 { id: "COM-FAI-Dec312024", client: "Fairmont Group", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "In Progress", created: "May 05, 2025 01:00 PM" },
 { id: "AUD-PAC-Dec312023", client: "Pacific Rim Corp", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Audit", status: "Complete", created: "Dec 10, 2024 08:45 AM" },
 { id: "TAX-RIV-Dec312024", client: "Riverstone Media Group Inc.", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Tax", status: "Needs Review", created: "Apr 30, 2025 04:15 PM" },
 { id: "COM-SIN-Dec312024", client: "Singh & Partners", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "Setup", created: "Jun 10, 2025 07:30 AM" },
 { id: "AUD-MAP-Mar312024", client: "Maple Leaf Financial Ltd.", yearEnd: "Mar 31, 2024", period: "Full Year", type: "Audit", status: "In Progress", created: "Mar 22, 2025 12:00 PM" },
 { id: "REV-BRI-Dec312024", client: "Brightstone Advisory", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "Complete", created: "Feb 14, 2025 09:00 AM" },
 { id: "TAX-CED-Dec312023", client: "Cedar Valley Enterprises", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Tax", status: "Complete", created: "Jan 05, 2025 10:30 AM" },
 { id: "AUD-HAR-Sep302024", client: "Harbour Capital Group", yearEnd: "Sep 30, 2024", period: "Full Year", type: "Audit", status: "Needs Review", created: "Mar 01, 2025 08:15 AM" },
 { id: "COM-BLU-Dec312024", client: "Bluewater Holdings Inc.", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "In Progress", created: "Apr 20, 2025 11:00 AM" },
 { id: "REV-OAK-Jun302024", client: "Oakridge Financial Services", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Review", status: "Setup", created: "May 12, 2025 02:00 PM" },
 { id: "AUD-CRE-Dec312023", client: "Crestview Partners LLP", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Audit", status: "Complete", created: "Nov 30, 2024 04:30 PM" },
 { id: "TAX-NOR-Sep302024", client: "Northline Holdings Ltd.", yearEnd: "Sep 30, 2024", period: "Full Year", type: "Tax", status: "In Progress", created: "Feb 05, 2025 09:45 AM" },
 { id: "COM-RIV-Jul312023", client: "Riverstone Media Group Inc.", yearEnd: "Jul 31, 2023", period: "Full Year", type: "Compilation", status: "Complete", created: "Oct 10, 2024 01:30 PM" },
 { id: "REV-PAC-Dec312023", client: "Pacific Rim Corp", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Review", status: "Needs Review", created: "Jan 15, 2025 10:00 AM" },
 { id: "AUD-SIN-Dec312024", client: "Singh & Partners", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Audit", status: "Setup", created: "Jun 15, 2025 08:30 AM" },
 { id: "COM-HAR-Dec312024", client: "Harbour Capital Group", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "In Progress", created: "May 01, 2025 03:00 PM" },
 { id: "TAX-FAI-Dec312023", client: "Fairmont Group", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Tax", status: "Complete", created: "Dec 20, 2024 11:15 AM" },
 { id: "REV-MAP-Dec312024", client: "Maple Leaf Financial Ltd.", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "In Progress", created: "Apr 10, 2025 09:30 AM" },
 { id: "AUD-BLU-Jun302024", client: "Bluewater Holdings Inc.", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Audit", status: "Complete", created: "Jan 25, 2025 02:45 PM" },
 { id: "COM-CRE-Dec312024", client: "Crestview Partners LLP", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "Needs Review", created: "Mar 18, 2025 10:45 AM" },
 { id: "TAX-PAT-Dec312024", client: "Patel & Shah CPA", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Tax", status: "Setup", created: "Jun 05, 2025 07:00 AM" },
 { id: "REV-FAB-Dec312024", client: "Faber & Associates LLP", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "Complete", created: "Feb 22, 2025 04:00 PM" },
 { id: "AUD-OAK-Sep302023", client: "Oakridge Financial Services", yearEnd: "Sep 30, 2023", period: "Full Year", type: "Audit", status: "Complete", created: "Sep 15, 2024 08:00 AM" },
 { id: "COM-GRE-Dec312024", client: "Grewal & Gupta CPA", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "In Progress", created: "May 20, 2025 11:30 AM" },
 { id: "TAX-SUM-Jun302024", client: "Summit Industrial Inc.", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Tax", status: "Needs Review", created: "Feb 18, 2025 03:15 PM" },
 { id: "REV-BRI-Dec312023", client: "Brightstone Advisory", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Review", status: "Complete", created: "Oct 28, 2024 09:00 AM" },
 { id: "AUD-GRE-Dec312024", client: "Grewal & Gupta CPA", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Audit", status: "In Progress", created: "Apr 25, 2025 10:00 AM" },
 { id: "COM-MAP-Jun302024", client: "Maple Leaf Financial Ltd.", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Compilation", status: "Complete", created: "Dec 02, 2024 01:00 PM" },
 { id: "TAX-CRE-Dec312024", client: "Crestview Partners LLP", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Tax", status: "Setup", created: "Jun 08, 2025 08:00 AM" },
 { id: "REV-NOR-Dec312024", client: "Northline Holdings Ltd.", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "Needs Review", created: "Mar 30, 2025 11:00 AM" },
 { id: "AUD-FAI-Jun302024", client: "Fairmont Group", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Audit", status: "Complete", created: "Nov 20, 2024 03:30 PM" },
 { id: "COM-BRI-Dec312024", client: "Brightstone Advisory", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Compilation", status: "In Progress", created: "May 15, 2025 08:45 AM" },
 { id: "TAX-HAR-Sep302024", client: "Harbour Capital Group", yearEnd: "Sep 30, 2024", period: "Full Year", type: "Tax", status: "Complete", created: "Jan 10, 2025 02:00 PM" },
 { id: "REV-OAK-Dec312024", client: "Oakridge Financial Services", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "In Progress", created: "Apr 05, 2025 09:15 AM" },
 { id: "AUD-BRI-Dec312024", client: "Brightstone Advisory", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Audit", status: "Setup", created: "Jun 20, 2025 07:30 AM" },
 { id: "COM-OAK-Dec312023", client: "Oakridge Financial Services", yearEnd: "Dec 31, 2023", period: "Full Year", type: "Compilation", status: "Complete", created: "Nov 05, 2024 10:00 AM" },
 { id: "TAX-BLU-Jun302024", client: "Bluewater Holdings Inc.", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Tax", status: "Needs Review", created: "Feb 10, 2025 04:30 PM" },
 { id: "REV-HAR-Dec312024", client: "Harbour Capital Group", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Review", status: "Complete", created: "Mar 05, 2025 01:30 PM" },
 { id: "AUD-CED-Dec312024", client: "Cedar Valley Enterprises", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Audit", status: "In Progress", created: "May 10, 2025 10:15 AM" },
 { id: "COM-PAC-Jun302024", client: "Pacific Rim Corp", yearEnd: "Jun 30, 2024", period: "Full Year", type: "Compilation", status: "Complete", created: "Dec 15, 2024 02:30 PM" },
 { id: "TAX-OAK-Dec312024", client: "Oakridge Financial Services", yearEnd: "Dec 31, 2024", period: "Full Year", type: "Tax", status: "Setup", created: "Jun 12, 2025 09:00 AM" },
];

const STATUS_STYLES: Record<string, string> = {
 "In Progress": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
 "Complete":    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
 "Needs Review":"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
 "Setup":       "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700",
};

const ROWS_PER_PAGE = 5;

function TablePaginationDemo() {
 const [page, setPage] = useState(1);

 const total = TABLE_ROWS.length;
 const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
 const currentPage = Math.min(page, totalPages);

 const rangeStart = total === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
 const rangeEnd = Math.min(currentPage * ROWS_PER_PAGE, total);
 const paged = TABLE_ROWS.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

 const pageNumbers: (number | "…")[] = (() => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([
   1, 2,
   totalPages - 1, totalPages,
   currentPage - 1, currentPage, currentPage + 1,
  ]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
   if (i > 0 && n - (nums[i - 1] as number) > 1) out.push("…");
   out.push(n);
  });
  return out;
 })();

 return (
  <>
  <div className="rounded-xl border border-border bg-card overflow-hidden">
   <div className="px-5 py-4 border-b border-border">
    <h4 className="text-title-sm text-foreground">Table &amp; Pagination</h4>
   </div>
   <div className="overflow-x-auto">
    <table className="w-full">
     <thead className="bg-muted/60 border-b border-border">
      <tr>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Engagement ID</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Client Name</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Year End</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Period</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Type</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
       <th className="text-left px-5 py-3 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Date Created</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-border">
      {paged.map(row => (
       <tr key={row.id} className="hover:bg-muted/40 transition-colors">
        <td className="px-5 py-3.5 text-sm font-medium text-primary whitespace-nowrap">{row.id}</td>
        <td className="px-5 py-3.5 text-sm text-foreground whitespace-nowrap">{row.client}</td>
        <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{row.yearEnd}</td>
        <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{row.period}</td>
        <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{row.type}</td>
        <td className="px-5 py-3.5 whitespace-nowrap">
         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[row.status] ?? ""}`}>
          {row.status}
         </span>
        </td>
        <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{row.created}</td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
   {/* Pagination bar */}
   <div className="flex items-center justify-between px-6 py-3 border-t border-border flex-shrink-0 bg-card">
    <span className="text-sm text-muted-foreground">
     {total === 0
      ? "No engagements"
      : `Showing ${rangeStart}–${rangeEnd} of ${total} engagements`}
    </span>
    <div className="flex items-center gap-1">
     <Button
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0"
      disabled={currentPage === 1}
      onClick={() => setPage((p) => Math.max(1, p - 1))}
     >
      <ChevronLeft className="h-4 w-4" />
     </Button>
     {pageNumbers.map((p, i) =>
      p === "…" ? (
       <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">…</span>
      ) : (
       <Button
        key={p}
        variant={p === currentPage ? "default" : "outline"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setPage(p as number)}
       >
        {p}
       </Button>
      )
     )}
     <Button
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0"
      disabled={currentPage >= totalPages}
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
     >
      <ChevronRight className="h-4 w-4" />
     </Button>
    </div>
   </div>
  </div>
  <p className="text-label-sm text-muted-foreground mt-2">
   sticky thead · divide-y rows · hover:bg-muted/40 · pill status badge · Button outline/default pagination with ellipsis
  </p>
  </>
 );
}


/* ─── Page ─── */
export default function DesignSystem() {
 const [checkboxChecked, setCheckboxChecked] = useState(false);
 const [switchOn, setSwitchOn] = useState(true);

 const handleDownload = useCallback(() => {
 const payload = {
 meta: { generatedAt: new Date().toISOString(), font: "Inter", baseFontSize: "15px" },
 semanticColors: {
 light: Object.fromEntries(core.map(t => [t.css, { hsl: t.hsl, hex: t.hex, label: t.label }])),
 dark: Object.fromEntries(darkCore.map(t => [t.css, { hsl: t.hsl, hex: t.hex, label: t.label }])),
 },
 brandColors: Object.fromEntries(brand.map(t => [t.css, { hsl: t.hsl, hex: t.hex, label: t.label }])),
 sidebar: Object.fromEntries(sidebarTokens.map(t => [t.css, { hsl: t.hsl, hex: t.hex, label: t.label }])),
 borderRadius: Object.fromEntries(radii.map(r => [r.token, { value: r.value, usage: r.usage }])),
 elevation: Object.fromEntries(elevations.map(e => [e.token, { name: e.name, desc: e.desc }])),
 typography,
 spacing: Object.fromEntries(spacing.map(s => [s.token, s.value])),
 motion: { easing: motionEasing, durations: motionDurations },
 };
 const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url; a.download = "design-system-tokens.json"; a.click();
 URL.revokeObjectURL(url);
 sonnerToast.success("Downloaded: design-system-tokens.json");
 }, []);

 return (
 <Layout>
 <div className="p-6 space-y-6 max-w-7xl mx-auto">
 {/* Page header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-headline-sm text-foreground">Design System</h1>
 <p className="text-body-sm text-muted-foreground mt-1">
 Complete reference for tokens, components & specs across the Countable platform.
 </p>
 </div>
 <Button onClick={handleDownload} className="gap-2">
 <Download className="h-4 w-4" /> Download JSON
 </Button>
 </div>

 <Tabs defaultValue="overview" className="w-full">
 <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
 <TabsTrigger value="overview">Overview</TabsTrigger>
 <TabsTrigger value="logo">Logo</TabsTrigger>
 <TabsTrigger value="header">Header</TabsTrigger>
 <TabsTrigger value="menu">Global Menu</TabsTrigger>
 <TabsTrigger value="icons">Icons</TabsTrigger>
 <TabsTrigger value="colors">Colors</TabsTrigger>
 <TabsTrigger value="typography">Typography</TabsTrigger>
 <TabsTrigger value="layout">Layout & Motion</TabsTrigger>
 <TabsTrigger value="components">Components</TabsTrigger>
 </TabsList>

 {/* ───────── OVERVIEW ───────── */}
 <TabsContent value="overview" className="space-y-6 mt-6">
 <Section title="Platform Aesthetic" description="Futuristic glassmorphism with a 1.25rem cockpit base radius. Pure white global background, Inter typography, navy brand identity (#0A3159) and primary blue (#1C63A6).">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-5 rounded-xl border border-border bg-card space-y-2">
 <h4 className="text-title-sm">Typography</h4>
 <p className="text-body-sm text-muted-foreground">Inter, 15px base, weight 400. High-contrast muted text (#101828, never gray).</p>
 </div>
 <div className="p-5 rounded-xl border border-border bg-card space-y-2">
 <h4 className="text-title-sm">Forms</h4>
 <p className="text-body-sm text-muted-foreground">10px radius, h-9, white bg. Focus uses double border (2px primary + 2px offset).</p>
 </div>
 <div className="p-5 rounded-xl border border-border bg-card space-y-2">
 <h4 className="text-title-sm">Layout</h4>
 <p className="text-body-sm text-muted-foreground">100% viewport height. Secondary panels use React Portals under a full-width global header.</p>
 </div>
 </div>
 </Section>

 <Section title="What's in this Design System">
 <ul className="text-body-sm text-muted-foreground space-y-1.5 pl-5 list-disc">
 <li><strong className="text-foreground">Header</strong> — global header anatomy and dropdown specs.</li>
 <li><strong className="text-foreground">Global Menu</strong> — sidebar navigation, secondary panels, theming.</li>
 <li><strong className="text-foreground">Icons</strong> — full library (custom + Lucide) with download per icon.</li>
 <li><strong className="text-foreground">Colors</strong> — semantic tokens, brand palette, sidebar tokens (light & dark).</li>
 <li><strong className="text-foreground">Typography</strong> — type scale and usage.</li>
 <li><strong className="text-foreground">Layout & Motion</strong> — radii, elevation, spacing, easing.</li>
 <li><strong className="text-foreground">Components</strong> — live samples (buttons, inputs, badges, dialogs, etc.).</li>
 </ul>
 </Section>
 </TabsContent>

 {/* ───────── LOGO ───────── */}
 <TabsContent value="logo" className="space-y-6 mt-6">
 <Section
 title="Countable Logo"
 description="Official brand marks, sourced directly from countable.co. Use the color lockup on light backgrounds and the white lockup on navy or dark surfaces — don't recolor, stretch, or add effects."
 >
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {countableLogos.map((asset) => (
 <LogoCard key={asset.id} asset={asset} />
 ))}
 </div>
 </Section>

 <Section title="Usage Notes">
 <div className="rounded-xl border border-border bg-card p-5 space-y-1">
 <SpecRow label="Clear space" value="Keep at least the height of the icon mark as empty margin on all sides." />
 <SpecRow label="Minimum size" value="Full lockup: 120px wide. Icon mark alone: 20px wide." />
 <SpecRow label="Color" value={<>Icon uses a blue gradient (<span className="font-mono">#2A7BCB → #1C63A6</span>); wordmark uses navy (<span className="font-mono">#0A3159</span>) on light, white on dark.</>} />
 <SpecRow label="Don't" value="Recolor the mark, separate the icon from the wordmark in the full lockup, rotate, or apply drop shadows/outlines." />
 </div>
 </Section>
 </TabsContent>

 {/* ───────── HEADER ───────── */}
 <TabsContent value="header" className="space-y-6 mt-6">
 <Section title="Global Header" description="Full-width persistent header sitting above the sidebar with a navy background. Hosts page title, Luka CTA, font-size accessibility toggle, theme toggle, notifications, and the user avatar.">
 {/* Live mini-preview matching actual GlobalHeader */}
 <div className="rounded-xl border border-border overflow-hidden">
 <div
 className="flex items-center px-6 bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))]"
 style={{ height: "3.4rem" }}
 >
 {/* Left: title */}
 <div className="flex-1 flex items-center gap-3">
 <h2 className="text-xl font-bold text-[hsl(var(--sidebar-foreground))]">Page Title</h2>
 </div>

 {/* Right cluster */}
 <div className="flex-1 flex items-center justify-end gap-3">
 {/* Luka pill */}
 <button className="h-8 px-3 rounded-full bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] text-white text-xs font-medium gap-1.5 shadow-md inline-flex items-center">
 <Sparkles className="h-3.5 w-3.5 animate-[spin_3s_linear_infinite]" />
 Luka
 </button>

 {/* Font size A AA AAA */}
 <div className="flex items-center justify-center h-9 px-2 rounded-xl gap-0.5" style={{ borderRadius: 12 }}>
 <span className="font-semibold text-white" style={{ fontSize: 11 }}>A</span>
 <span className="font-semibold text-white/40" style={{ fontSize: 13 }}>A</span>
 <span className="font-semibold text-white/40" style={{ fontSize: 15 }}>A</span>
 </div>

 {/* Theme toggle */}
 <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ borderRadius: 12 }}>
 <Sparkles className="h-5 w-5 text-amber-300 hidden" />
 {/* Sun/Moon — show moon for light-mode default */}
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white/80"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
 </div>

 {/* Bell with badge */}
 <div className="flex items-center justify-center w-9 h-9 rounded-xl relative" style={{ borderRadius: 12 }}>
 <Bell className="h-5 w-5 text-white/80" />
 <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-medium">2</span>
 </div>

 {/* Avatar */}
 <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ borderRadius: 12 }}>
 <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-semibold">JD</div>
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-xl border border-border bg-card p-5 space-y-1">
 <SpecRow label="Height" value="3.4rem (≈54.4px)" />
 <SpecRow label="Padding" value="px-6 (24px horizontal)" />
 <SpecRow label="Background" value={<><span className="font-mono">bg-sidebar-bg</span> (navy #0A3159) · text <span className="font-mono">text-sidebar-foreground</span> (white)</>} />
 <SpecRow label="Layout" value="Two flex-1 zones — title on left, action cluster on right (gap-3)" />
 <SpecRow label="H1 Title" value="text-xl (20px) · font-bold · sidebar foreground (white on navy)" />
 <SpecRow label="Luka CTA" value="32px pill · gradient #1C63A6 → #7A31D8 · animated Sparkles (3s spin) · text 'Luka'" />
 <SpecRow label="Font Toggle" value="A / AA / AAA cluster (11/13/15px) · active = white, inactive = white/40 · stores in localStorage, applies font-size-{a|aa|aaa} on <html>" />
 <SpecRow label="Theme Toggle" value="36×36 rounded-xl (12px) · Sun ↔ Moon crossfade with 500ms rotation · hover bg-white/10" />
 <SpecRow label="Notifications" value="Bell (swing animation when unread) · 16px destructive badge · opens 380px popover with search, mark-all-read, delete-all, list (max-h 360px)" />
 <SpecRow label="Profile Avatar" value="36×36 hover wrapper · 28×28 round image · dropdown: My Account, Firm Profile, Settings, Billing, Apps, What's New, Log out" />
 <SpecRow label="Hover state" value={<><span className="font-mono">hover:bg-white/10</span> on all icon buttons</>} />
 <SpecRow label="Icon button radius" value="12px (rounded-xl)" />
 </div>
 </Section>
 </TabsContent>

 {/* ───────── GLOBAL MENU ───────── */}
 <TabsContent value="menu" className="space-y-6 mt-6">
 <Section title="Sidebar / Global Menu" description="Left vertical navigation with primary nav items, expandable Engagements & Templates panels, and a collapsible icon-only mode.">
 {/* Mini visualization */}
 <div className="rounded-xl border border-border overflow-hidden flex">
 <div className="w-16 bg-[#0A3159] text-white flex flex-col items-center py-3 gap-3">
 {[Home, Folder, FileText, Users, BarChart3, Settings].map((Ic, i) => (
 <div key={i} className={`h-10 w-10 rounded-lg flex items-center justify-center ${i === 1 ? "bg-primary" : "hover:bg-white/10"}`}>
 <Ic className="h-4 w-4" />
 </div>
 ))}
 </div>
 <div className="w-56 bg-white border-r border-border p-3 space-y-2">
 <p className="text-label-sm font-semibold text-muted-foreground px-2">ENGAGEMENTS</p>
 {["COM-CON-Dec312024", "REV-ABC-Mar312025", "TAX-XYZ-Jun302025"].map((e) => (
 <div key={e} className="text-body-sm text-foreground px-2 py-1.5 rounded hover:bg-muted truncate">{e}</div>
 ))}
 </div>
 <div className="flex-1 p-4 bg-muted/30 text-body-sm text-muted-foreground">Main content area</div>
 </div>

 <div className="rounded-xl border border-border bg-card p-5 space-y-1">
 <SpecRow label="Primary Sidebar" value="Width 64px collapsed / 220px expanded · BG #0A3159 (navy) · text white" />
 <SpecRow label="Secondary Panel" value="Width 280px (resizable) · BG --sidebar-secondary-bg · cockpit corners · React Portal" />
 <SpecRow label="Active item" value="bg-primary (#1C63A6) · white icon & text" />
 <SpecRow label="Hover" value="bg-white/10 on primary; bg-muted on secondary panel" />
 <SpecRow label="Tree nodes" value="Custom folder icons (FolderSolid/Plus/Minus) · indented children" />
 <SpecRow label="Collapse toggle" value="Floating circular button on right edge of sidebar (top: 50px), hover only" />
 <SpecRow label="Theme contrast" value="Auto-adjusts label color via MutationObserver based on bg luminance" />
 <SpecRow label="Scrollbars" value="Hidden across all browsers (Webkit, Firefox, IE/Edge)" />
 </div>
 </Section>

 <Section title="Sidebar Color Tokens">
 <ColorGrid tokens={sidebarTokens} />
 </Section>
 </TabsContent>

 {/* ───────── ICONS ───────── */}
 <TabsContent value="icons" className="space-y-6 mt-6">
 <Section title="Custom Brand Icons" description="Hand-built SVG icons used throughout the platform. Hover to download as.svg.">
 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
 {customIcons.map(({ name, Component }) => (
 <IconCard key={name} name={name} refKey={name}>
 <Component className="h-8 w-8" />
 </IconCard>
 ))}
 </div>
 <p className="text-label-sm text-muted-foreground">
 Custom icons live in <span className="font-mono">src/components/icons/</span>. Click name to copy, hover the corner to download.
 </p>
 </Section>

 <Section title="Lucide Icons (in use)" description="Curated subset of Lucide React icons used across the app.">
 <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
 {lucideIcons.map(({ name, Component }) => (
 <IconCard key={name} name={name} refKey={name}>
 <Component className="h-6 w-6" />
 </IconCard>
 ))}
 </div>
 <p className="text-label-sm text-muted-foreground">
 Default size: 24px · Stroke 2 · Use <span className="font-mono">currentColor</span> for theming.
 </p>
 </Section>
 </TabsContent>

 {/* ───────── COLORS ───────── */}
 <TabsContent value="colors" className="space-y-6 mt-6">
 <Section title="Semantic Colors — Light Mode"><ColorGrid tokens={core} /></Section>
 <Section title="Semantic Colors — Dark Mode"><ColorGrid tokens={darkCore} /></Section>
 <Section title="Brand Palette"><ColorGrid tokens={brand} /></Section>
 <Section title="Sidebar Tokens"><ColorGrid tokens={sidebarTokens} /></Section>
 </TabsContent>

 {/* ───────── TYPOGRAPHY ───────── */}
 <TabsContent value="typography" className="space-y-6 mt-6">
 <Section title="Type Scale" description="Inter font family across all weights. Base body size 15px.">
 <div className="overflow-x-auto rounded-lg border border-border">
 <table className="w-full text-body-sm">
 <thead className="bg-muted">
 <tr>
 <th className="text-left p-3 font-medium">Name</th>
 <th className="text-left p-3 font-medium">Size</th>
 <th className="text-left p-3 font-medium">Weight</th>
 <th className="text-left p-3 font-medium">Tracking</th>
 <th className="text-left p-3 font-medium">Preview</th>
 </tr>
 </thead>
 <tbody>
 {typography.map(t => (
 <tr key={t.name} className="border-t border-border">
 <td className="p-3 font-mono text-label-sm">{t.name}</td>
 <td className="p-3">{t.size}</td>
 <td className="p-3">{t.weight}</td>
 <td className="p-3">{t.tracking}</td>
 <td className="p-3"><span style={{ fontSize: t.size, fontWeight: Number(t.weight), letterSpacing: t.tracking }}>Ag</span></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Section>
 </TabsContent>

 {/* ───────── LAYOUT & MOTION ───────── */}
 <TabsContent value="layout" className="space-y-6 mt-6">
 <Section title="Border Radius">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {radii.map(r => (
 <div key={r.token} className="flex items-center gap-3 p-3 rounded-md bg-muted">
 <div className="h-10 w-10 border-2 border-primary" style={{ borderRadius: r.value }} />
 <div>
 <p className="text-body-sm font-medium font-mono">{r.token}</p>
 <p className="text-label-sm text-muted-foreground">{r.value} — {r.usage}</p>
 </div>
 </div>
 ))}
 </div>
 </Section>

 <Section title="Elevation">
 <div className="flex flex-wrap gap-6">
 {elevations.map(e => (
 <div key={e.token} className="h-20 w-28 rounded-lg bg-card flex flex-col items-center justify-center" style={{ boxShadow: `var(${e.token})` }}>
 <p className="text-label-md font-medium">{e.name}</p>
 <p className="text-label-sm text-muted-foreground">{e.desc}</p>
 </div>
 ))}
 </div>
 </Section>

 <Section title="Spacing Scale">
 <div className="space-y-2">
 {spacing.map(s => (
 <div key={s.token} className="flex items-center gap-4">
 <span className="w-32 text-label-sm font-mono shrink-0">{s.token}</span>
 <div className="h-4 bg-primary rounded-xs" style={{ width: s.value }} />
 <span className="text-label-sm text-muted-foreground">{s.value}</span>
 </div>
 ))}
 </div>
 </Section>

 <Section title="Motion & Easing">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-xl border border-border p-5 space-y-3">
 <h4 className="text-title-sm font-medium">Easing Curves</h4>
 {motionEasing.map(e => (
 <div key={e.name} className="space-y-0.5">
 <p className="text-body-sm font-medium">{e.name}</p>
 <p className="text-label-sm text-muted-foreground font-mono">{e.value}</p>
 <p className="text-label-sm text-muted-foreground">{e.usage}</p>
 </div>
 ))}
 </div>
 <div className="rounded-xl border border-border p-5 space-y-3">
 <h4 className="text-title-sm font-medium">Durations</h4>
 {motionDurations.map(d => (
 <div key={d.name} className="space-y-0.5">
 <p className="text-body-sm font-medium">{d.name}</p>
 <p className="text-label-sm text-muted-foreground font-mono">{d.value}</p>
 <p className="text-label-sm text-muted-foreground">{d.usage}</p>
 </div>
 ))}
 </div>
 </div>
 </Section>
 </TabsContent>

 {/* ───────── COMPONENTS ───────── */}
 <TabsContent value="components" className="space-y-6 mt-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <SampleCard title="Buttons">
 <div className="space-y-3">
 <div className="flex flex-wrap gap-2">
 <Button variant="default">Primary</Button>
 <Button variant="secondary">Secondary</Button>
 <Button variant="outline">Outline</Button>
 <Button variant="ghost">Ghost</Button>
 <Button variant="destructive">Destructive</Button>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button variant="elevated">Elevated</Button>
 <Button variant="tonal">Tonal</Button>
 <Button variant="link">Link</Button>
 </div>
 <div className="flex flex-wrap gap-2 items-center">
 <Button size="sm">Small</Button>
 <Button size="default">Default</Button>
 <Button size="lg">Large</Button>
 <Button size="icon"><Plus className="h-4 w-4" /></Button>
 </div>
 <p className="text-label-xs text-muted-foreground">Disabled states</p>
 <div className="flex flex-wrap gap-2">
 <Button variant="default" disabled>Primary</Button>
 <Button variant="secondary" disabled>Secondary</Button>
 <Button variant="outline" disabled>Outline</Button>
 <Button variant="ghost" disabled>Ghost</Button>
 <Button variant="destructive" disabled>Destructive</Button>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button variant="elevated" disabled>Elevated</Button>
 <Button variant="tonal" disabled>Tonal</Button>
 <Button variant="link" disabled>Link</Button>
 </div>
 </div>
 <p className="text-label-sm text-muted-foreground mt-2">h-9 · 10px radius · transition opacity hover</p>
 </SampleCard>

 <SampleCard title="Inputs">
 <div className="space-y-3">
 <div className="space-y-1.5"><Label className="text-xs">Outlined</Label><Input placeholder="Enter text..." /></div>
 <div className="space-y-1.5"><Label className="text-xs">Filled</Label><InputFilled placeholder="Enter text..." /></div>
 <div className="space-y-1.5"><Label className="text-xs">Error</Label><Input error placeholder="Invalid input" /></div>
 <div className="space-y-1.5"><Label className="text-xs">Disabled</Label><Input disabled placeholder="Disabled" /></div>
 </div>
 <p className="text-label-sm text-muted-foreground mt-2">h-9 · 10px radius · double-border focus</p>
 </SampleCard>

 <SampleCard title="Select & Textarea">
 <div className="space-y-3">
 <Select>
 <SelectTrigger><SelectValue placeholder="Choose option..." /></SelectTrigger>
 <SelectContent>
 <SelectItem value="opt1">Option One</SelectItem>
 <SelectItem value="opt2">Option Two</SelectItem>
 </SelectContent>
 </Select>
 <Textarea placeholder="Write a description..." />
 <p className="text-label-xs text-muted-foreground">Disabled states</p>
 <Select disabled>
 <SelectTrigger disabled><SelectValue placeholder="Choose option..." /></SelectTrigger>
 <SelectContent>
 <SelectItem value="opt1">Option One</SelectItem>
 </SelectContent>
 </Select>
 <Textarea placeholder="Write a description..." disabled />
 </div>
 </SampleCard>

 <SampleCard title="Badges">
 <div className="flex flex-wrap gap-2">
 <Badge>Default</Badge>
 <Badge variant="secondary">Secondary</Badge>
 <Badge variant="outline">Outline</Badge>
 <Badge variant="destructive">Destructive</Badge>
 </div>
 <div className="flex flex-wrap gap-2 mt-2">
 <Badge variant="new">New</Badge>
 <Badge variant="completed">Completed</Badge>
 <Badge variant="inProgress">In Progress</Badge>
 <Badge variant="pending">Pending</Badge>
 <Badge variant="review">Review</Badge>
 <Badge variant="success">Success</Badge>
 <Badge variant="warning">Warning</Badge>
 <Badge variant="info">Info</Badge>
 </div>
 <p className="text-label-sm text-muted-foreground mt-2">Pill shape · soft BG + matching border</p>
 </SampleCard>

 <SampleCard title="Tabs">
 <Tabs defaultValue="overview" className="w-full">
 <TabsList>
 <TabsTrigger value="overview">Overview</TabsTrigger>
 <TabsTrigger value="details">Details</TabsTrigger>
 <TabsTrigger value="activity">Activity</TabsTrigger>
 <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
 </TabsList>
 <TabsContent value="overview" className="text-body-sm text-muted-foreground">
 Overview tab content — high-level summary.
 </TabsContent>
 <TabsContent value="details" className="text-body-sm text-muted-foreground">
 Details tab content — granular specifications.
 </TabsContent>
 <TabsContent value="activity" className="text-body-sm text-muted-foreground">
 Activity tab content — recent events and history.
 </TabsContent>
 </Tabs>
 <p className="text-label-sm text-muted-foreground mt-3">
 Radix Tabs · 40px list height · 2px radius · active state uses primary background + white text · ring-2 focus
 </p>
 </SampleCard>

 <SampleCard title="Checkbox & Switch">
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <Checkbox checked={checkboxChecked} onCheckedChange={(v) => setCheckboxChecked(!!v)} />
 <Label className="text-sm">Checkbox</Label>
 </div>
 <div className="flex items-center gap-3">
 <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
 <Label className="text-sm">Switch {switchOn ? "On" : "Off"}</Label>
 </div>
 <p className="text-label-xs text-muted-foreground">Disabled states</p>
 <div className="flex flex-wrap gap-x-6 gap-y-2">
 <div className="flex items-center gap-3">
 <Checkbox disabled />
 <Label className="text-sm text-muted-foreground">Unchecked</Label>
 </div>
 <div className="flex items-center gap-3">
 <Checkbox checked disabled />
 <Label className="text-sm text-muted-foreground">Checked</Label>
 </div>
 <div className="flex items-center gap-3">
 <Switch disabled />
 <Label className="text-sm text-muted-foreground">Off</Label>
 </div>
 <div className="flex items-center gap-3">
 <Switch checked disabled />
 <Label className="text-sm text-muted-foreground">On</Label>
 </div>
 </div>
 </div>
 </SampleCard>

 <SampleCard title="Tooltip & Popover">
 <div className="flex gap-3">
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild><Button variant="outline" size="icon"><Bell className="h-4 w-4" /></Button></TooltipTrigger>
 <TooltipContent>Notifications</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 <Popover>
 <PopoverTrigger asChild><Button variant="outline">Open Popover</Button></PopoverTrigger>
 <PopoverContent className="w-64">
 <p className="text-body-sm">Popover content with rich children.</p>
 </PopoverContent>
 </Popover>
 </div>
 </SampleCard>

 <SampleCard title="Dialog">
 <Dialog>
 <DialogTrigger asChild><Button>Open Dialog</Button></DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Sample Dialog</DialogTitle>
 <DialogDescription>Demonstrates the modal pattern.</DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline">Cancel</Button>
 <Button>Save</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </SampleCard>

 <SampleCard title="Toast Notifications">
 <div className="flex flex-wrap gap-2">
 <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
 onClick={() => sonnerToast.success("Saved", { description: "Changes saved." })}>
 <CheckCircle2 className="h-3.5 w-3.5" /> Success
 </Button>
 <Button size="sm" className="gap-1.5 bg-red-500 hover:bg-red-600 text-white"
 onClick={() => sonnerToast.error("Error", { description: "Something went wrong." })}>
 <AlertCircle className="h-3.5 w-3.5" /> Error
 </Button>
 <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
 onClick={() => sonnerToast.warning("Warning", { description: "Heads up." })}>
 <AlertTriangle className="h-3.5 w-3.5" /> Warning
 </Button>
 <Button size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white"
 onClick={() => sonnerToast.info("Info", { description: "FYI." })}>
 <Info className="h-3.5 w-3.5" /> Info
 </Button>
 </div>
 <p className="text-label-sm text-muted-foreground mt-2">Top-right · sonner library</p>
 </SampleCard>
 </div>

 {/* Table & Pagination — full width */}
 <TablePaginationDemo />

 </TabsContent>
 </Tabs>
 </div>
 </Layout>
 );
}
