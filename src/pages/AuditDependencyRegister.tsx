import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { LetterIcon } from "@/components/icons/LetterIcon";
import { WorksheetIcon } from "@/components/icons/WorksheetIcon";
import { CompletionIcon } from "@/components/icons/CompletionIcon";
import { cn } from "@/lib/utils";
import { ChevronRight, Link2, AlertCircle, CheckCircle2, Circle, Clock, X, ExternalLink, FolderOpen, Maximize2, Minimize2, GripVertical } from "lucide-react";

const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/0ANU645mbF0czUk9PVA`;

// Maps each standard label → local PDF filename in /public/standards/
const STANDARD_PDF: Record<string, string> = {
 "CAS 210": "CAS-210.pdf",
 "CAS 220 / CSQM 1": "CAS-220.pdf",
 "CAS 240": "CAS-240.pdf",
 "CAS 260": "CAS-260.pdf",
 "CAS 300": "CAS-300.pdf",
 "CAS 315": "CAS-315.pdf",
 "CAS 320": "CAS-320.pdf",
 "CAS 330": "CAS-330.pdf",
 "CAS 450": "CAS-450.pdf",
 "CAS 520": "CAS-520.pdf",
 "CAS 560": "CAS-560.pdf",
 "CAS 570": "CAS-570.pdf",
 "CAS 580": "CAS-580.pdf",
 "CAS 700": "CAS-700.pdf",
 "CSQM 1": "CSQM-1.pdf",
 "PCMLTFA / FINTRAC": "PCMLTFA-FINTRAC.pdf",
 "AU-C 210": "AUC-210.pdf",
 "AU-C 220 / SQMS 1": "AUC-220.pdf",
 "AU-C 240": "AUC-240.pdf",
 "AU-C 260": "AUC-260.pdf",
 "AU-C 300": "AUC-300.pdf",
 "AU-C 315": "AUC-315.pdf",
 "AU-C 320": "AUC-320.pdf",
 "AU-C 330": "AUC-330.pdf",
 "AU-C 450": "AUC-450.pdf",
 "AU-C 520": "AUC-520.pdf",
 "AU-C 560": "AUC-560.pdf",
 "AU-C 570": "AUC-570.pdf",
 "AU-C 580": "AUC-580.pdf",
 "AU-C 700": "AUC-700.pdf",
 "SQMS 1": "SQMS-1.pdf",
 "BSA / FinCEN": "BSA-FinCEN.pdf",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
 | "Client Onboarding"
 | "Planning"
 | "Risk Assessment"
 | "Response to Risks"
 | "Financial Statements"
 | "Completion & Signoffs";

type DocType = "checklist" | "letter" | "worksheet" | "completion";

type StatusLevel = "not-started" | "in-progress" | "complete" | "blocked";

interface DependencyItem {
 code: string;
 navKey: string;
 label: string;
 type: DocType;
 phase: Phase;
 cas?: string;
 us?: string;
 casUrl?: string; // Direct Google Drive link for CA standard doc
 usUrl?: string; // Direct Google Drive link for US standard doc
 prerequisites: string[]; // codes
 enablesKey?: string; // what nav key this routes to
 criticalPath: boolean;
}

// Google Drive SVG icon
function GoogleDriveIcon({ className }: { className?: string }) {
 return (
 <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
 <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
 <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
 <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
 <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
 <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
 <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
 </svg>
 );
}

// ─── Dependency Register Data ─────────────────────────────────────────────────

const REGISTER: DependencyItem[] = [
 // ── CLIENT ONBOARDING ──────────────────────────────────────────────────────
 {
 code: "CO-NA",
 navKey: "aud-new-accept",
 label: "New Engagement Acceptance",
 type: "checklist",
 phase: "Client Onboarding",
 cas: "CAS 210",
 us: "AU-C 210",
 prerequisites: [],
 criticalPath: true,
 },
 {
 code: "CO-EC",
 navKey: "aud-exist-cont",
 label: "Existing Engagement Continuance",
 type: "checklist",
 phase: "Client Onboarding",
 cas: "CAS 210",
 us: "AU-C 210",
 prerequisites: [],
 criticalPath: true,
 },
 {
 code: "CO-IND",
 navKey: "aud-ind",
 label: "Independence & Ethical Requirements",
 type: "checklist",
 phase: "Client Onboarding",
 cas: "CAS 220 / CSQM 1",
 us: "AU-C 220 / SQMS 1",
 prerequisites: ["CO-NA", "CO-EC"],
 criticalPath: true,
 },
 {
 code: "CO-AML",
 navKey: "aud-aml",
 label: "Anti-Money Laundering (AML) Compliance",
 type: "checklist",
 phase: "Client Onboarding",
 cas: "PCMLTFA / FINTRAC",
 us: "BSA / FinCEN",
 prerequisites: ["CO-NA", "CO-EC"],
 criticalPath: false,
 },
 {
 code: "CO-EL",
 navKey: "aud-el",
 label: "Engagement Letter",
 type: "letter",
 phase: "Client Onboarding",
 cas: "CAS 210",
 us: "AU-C 210",
 prerequisites: ["CO-IND", "CO-AML"],
 criticalPath: true,
 },

 // ── PLANNING ──────────────────────────────────────────────────────────────
 {
 code: "PL-UEB",
 navKey: "aud-ueb",
 label: "Understanding the Entity — Basics",
 type: "checklist",
 phase: "Planning",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["CO-EL"],
 criticalPath: true,
 },
 {
 code: "PL-UES",
 navKey: "aud-ues",
 label: "Understanding the Entity — Systems & Controls",
 type: "checklist",
 phase: "Planning",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["PL-UEB"],
 criticalPath: true,
 },
 {
 code: "PL-UEI",
 navKey: "aud-uei",
 label: "Understanding the Entity — Industry & Environment",
 type: "checklist",
 phase: "Planning",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["PL-UEB"],
 criticalPath: false,
 },
 {
 code: "PL-MAT",
 navKey: "aud-mat",
 label: "Materiality",
 type: "worksheet",
 phase: "Planning",
 cas: "CAS 320",
 us: "AU-C 320",
 prerequisites: ["PL-UEB", "PL-UEI"],
 criticalPath: true,
 },
 {
 code: "PL-EP",
 navKey: "aud-plan",
 label: "Engagement Planning",
 type: "checklist",
 phase: "Planning",
 cas: "CAS 300",
 us: "AU-C 300",
 prerequisites: ["PL-MAT", "PL-UES"],
 criticalPath: true,
 },
 {
 code: "PL-TCWG",
 navKey: "aud-tcwg-pl",
 label: "TCWG Communication — Planning",
 type: "letter",
 phase: "Planning",
 cas: "CAS 260",
 us: "AU-C 260",
 prerequisites: ["PL-MAT", "PL-EP"],
 criticalPath: false,
 },

 // ── RISK ASSESSMENT ───────────────────────────────────────────────────────
 {
 code: "RA-RAP",
 navKey: "aud-ra-rap",
 label: "Risk Assessment Procedures",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["PL-EP", "PL-MAT"],
 criticalPath: true,
 },
 {
 code: "RA-IC",
 navKey: "aud-ra-ic",
 label: "Understanding Internal Controls",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-RAP", "PL-UES"],
 criticalPath: true,
 },
 {
 code: "RA-FRA",
 navKey: "aud-ra-fraud",
 label: "Fraud Risk Assessment",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 240",
 us: "AU-C 240",
 prerequisites: ["RA-RAP"],
 criticalPath: true,
 },
 {
 code: "RA-SRR",
 navKey: "aud-ra-srr",
 label: "Significant Risks Register",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-RAP", "RA-FRA", "RA-IC"],
 criticalPath: true,
 },
 {
 code: "RA-RMM",
 navKey: "aud-ra-rmm",
 label: "Risk of Material Misstatement (RMM)",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-SRR", "RA-IC"],
 criticalPath: true,
 },
 {
 code: "RA-S1",
 navKey: "aud-ra-scot-rev",
 label: "SCOT — Revenue Cycle",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-IC", "RA-SRR"],
 criticalPath: false,
 },
 {
 code: "RA-S2",
 navKey: "aud-ra-scot-exp",
 label: "SCOT — Expenditure Cycle",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-IC", "RA-SRR"],
 criticalPath: false,
 },
 {
 code: "RA-S3",
 navKey: "aud-ra-scot-pay",
 label: "SCOT — Payroll Cycle",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 315",
 us: "AU-C 315",
 prerequisites: ["RA-IC", "RA-SRR"],
 criticalPath: false,
 },
 {
 code: "RA-GC",
 navKey: "aud-ra-gc",
 label: "Going Concern — Initial Assessment",
 type: "checklist",
 phase: "Risk Assessment",
 cas: "CAS 570",
 us: "AU-C 570",
 prerequisites: ["RA-RAP", "PL-UEB"],
 criticalPath: false,
 },

 // ── RESPONSE TO ASSESSED RISKS ────────────────────────────────────────────
 {
 code: "RP-OAR",
 navKey: "aud-rp-oar",
 label: "Overall Audit Response",
 type: "checklist",
 phase: "Response to Risks",
 cas: "CAS 330",
 us: "AU-C 330",
 prerequisites: ["RA-RMM", "RA-SRR"],
 criticalPath: true,
 },

 // ── FINANCIAL STATEMENTS ──────────────────────────────────────────────────
 {
 code: "FS-AR",
 navKey: "aud-ar",
 label: "Independent Auditor's Report",
 type: "checklist",
 phase: "Financial Statements",
 cas: "CAS 700",
 us: "AU-C 700",
 prerequisites: ["SO-COMP"],
 criticalPath: true,
 },

 // ── COMPLETION & SIGNOFFS ─────────────────────────────────────────────────
 {
 code: "SO-AIM",
 navKey: "aud-so-aim",
 label: "Accumulation of Identified Misstatements",
 type: "checklist",
 phase: "Completion & Signoffs",
 cas: "CAS 450",
 us: "AU-C 450",
 prerequisites: ["RP-OAR"],
 criticalPath: true,
 },
 {
 code: "SO-FAR",
 navKey: "aud-so-far",
 label: "Final Analytical Review",
 type: "checklist",
 phase: "Completion & Signoffs",
 cas: "CAS 520",
 us: "AU-C 520",
 prerequisites: ["SO-AIM"],
 criticalPath: true,
 },
 {
 code: "SO-SE",
 navKey: "aud-subseq",
 label: "Subsequent Events",
 type: "checklist",
 phase: "Completion & Signoffs",
 cas: "CAS 560",
 us: "AU-C 560",
 prerequisites: ["SO-FAR"],
 criticalPath: true,
 },
 {
 code: "SO-GCF",
 navKey: "aud-wgc-final",
 label: "Going Concern — Final Assessment",
 type: "checklist",
 phase: "Completion & Signoffs",
 cas: "CAS 570",
 us: "AU-C 570",
 prerequisites: ["SO-FAR", "SO-SE"],
 criticalPath: false,
 },
 {
 code: "SO-MRL",
 navKey: "aud-mr",
 label: "Management Representation Letter",
 type: "checklist",
 phase: "Completion & Signoffs",
 cas: "CAS 580",
 us: "AU-C 580",
 prerequisites: ["SO-FAR", "SO-GCF"],
 criticalPath: true,
 },
 {
 code: "SO-TCWG",
 navKey: "aud-tcwg-fin",
 label: "TCWG Communication — Completion",
 type: "letter",
 phase: "Completion & Signoffs",
 cas: "CAS 260",
 us: "AU-C 260",
 prerequisites: ["SO-MRL", "SO-AIM"],
 criticalPath: false,
 },
 {
 code: "SO-COMP",
 navKey: "aud-comp",
 label: "Audit Completion Checklist",
 type: "completion",
 phase: "Completion & Signoffs",
 cas: "CAS 220",
 us: "AU-C 220 / SQMS 1",
 prerequisites: ["SO-FAR", "SO-SE", "SO-GCF", "SO-MRL", "SO-TCWG"],
 criticalPath: true,
 },
 {
 code: "SO-EP",
 navKey: "aud-ep",
 label: "Quality Control Review (EP)",
 type: "completion",
 phase: "Completion & Signoffs",
 cas: "CSQM 1",
 us: "SQMS 1",
 prerequisites: ["SO-COMP"],
 criticalPath: true,
 },
];

const PHASE_ORDER: Phase[] = [
 "Client Onboarding",
 "Planning",
 "Risk Assessment",
 "Response to Risks",
 "Financial Statements",
 "Completion & Signoffs",
];

const PHASE_COLORS: Record<Phase, { bg: string; text: string; border: string }> = {
 "Client Onboarding": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
 "Planning": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
 "Risk Assessment": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
 "Response to Risks": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
 "Financial Statements": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
 "Completion & Signoffs": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: DocType }) {
 const cls = "h-3.5 w-3.5 flex-shrink-0";
 if (type === "letter") return <LetterIcon className={cls} />;
 if (type === "worksheet") return <WorksheetIcon className={cls} />;
 if (type === "completion") return <CompletionIcon className={cls} />;
 return <ChecklistIcon className={cls} />;
}

function TypeBadge({ type }: { type: DocType }) {
 const labels: Record<DocType, string> = {
 checklist: "Checklist",
 letter: "Letter",
 worksheet: "Worksheet",
 completion: "Completion",
 };
 const colors: Record<DocType, string> = {
 checklist: "bg-sky-100 text-sky-700 border border-sky-200",
 letter: "bg-purple-100 text-purple-700 border border-purple-200",
 worksheet: "bg-emerald-100 text-emerald-700 border border-emerald-200",
 completion: "bg-teal-100 text-teal-700 border border-teal-200",
 };
 return (
 <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", colors[type])}>
 <TypeIcon type={type} />
 {labels[type]}
 </span>
 );
}

function PrereqBadges({ codes, onNavigate }: { codes: string[]; onNavigate: (code: string) => void }) {
 if (codes.length === 0) {
 return <span className="text-xs text-muted-foreground italic">None — can start immediately</span>;
 }
 return (
 <div className="flex flex-wrap gap-1">
 {codes.map(code => (
 <button
 key={code}
 onClick={() => onNavigate(code)}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-mono font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border hover:border-primary/40"
 >
 <Link2 className="h-3 w-3" />
 {code}
 </button>
 ))}
 </div>
 );
}

function CriticalBadge() {
 return (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
 <AlertCircle className="h-3 w-3" />
 Critical Path
 </span>
 );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditDependencyRegister() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const navigate = useNavigate();
 const [drivePanel, setDrivePanel] = useState<{ open: boolean; standard: string }>({ open: false, standard: "" });
 const [pdfStatus, setPdfStatus] = useState<"checking" | "found" | "missing">("checking");
 const [panelWidth, setPanelWidth] = useState(520);
 const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const dragState = useRef<{ startX: number; startY: number; startPanelX: number; startPanelY: number } | null>(null);
 const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 const openDrivePanel = (standard: string) => {
 setDrivePanel({ open: true, standard });
 setPanelPos(null);
 setPanelWidth(360);
 setIsFullscreen(false);
 // Check if the PDF file actually exists
 const filename = STANDARD_PDF[standard];
 if (!filename) { setPdfStatus("missing"); return; }
 setPdfStatus("checking");
 const url = `${import.meta.env.BASE_URL}standards/${filename}`;
 fetch(url, { method: "HEAD" })
.then(r => {
 // Our reference files are HTML; the SPA fallback also returns HTML but at a different path.
 // A 200 + content-length > 500 bytes means the actual file was found (not a tiny redirect).
 const ct = r.headers.get("content-type") || "";
 setPdfStatus(r.ok && ct.includes("pdf") ? "found" : "missing");
 })
.catch(() => setPdfStatus("missing"));
 };
 const closeDrivePanel = () => {
 setDrivePanel({ open: false, standard: "" });
 setIsFullscreen(false);
 };

 // Drag handlers
 const onDragStart = useCallback((e: React.MouseEvent) => {
 if (isFullscreen) return;
 const panel = panelRef.current;
 if (!panel) return;
 const rect = panel.getBoundingClientRect();
 dragState.current = { startX: e.clientX, startY: e.clientY, startPanelX: rect.left, startPanelY: rect.top };
 e.preventDefault();
 }, [isFullscreen]);

 useEffect(() => {
 const onMouseMove = (e: MouseEvent) => {
 if (dragState.current) {
 const dx = e.clientX - dragState.current.startX;
 const dy = e.clientY - dragState.current.startY;
 setPanelPos({ x: dragState.current.startPanelX + dx, y: dragState.current.startPanelY + dy });
 }
 if (resizeState.current) {
 const dx = resizeState.current.startX - e.clientX;
 const newW = Math.max(280, Math.min(window.innerWidth - 100, resizeState.current.startWidth + dx));
 setPanelWidth(newW);
 }
 };
 const onMouseUp = () => {
 dragState.current = null;
 resizeState.current = null;
 };
 window.addEventListener('mousemove', onMouseMove);
 window.addEventListener('mouseup', onMouseUp);
 return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
 }, []);

 const onResizeStart = useCallback((e: React.MouseEvent) => {
 resizeState.current = { startX: e.clientX, startWidth: panelWidth };
 e.preventDefault();
 e.stopPropagation();
 }, [panelWidth]);

 // Build a code → navKey map for navigation
 const codeToNavKey = Object.fromEntries(REGISTER.map(r => [r.code, r.navKey]));

 const handleNavigateToCode = (code: string) => {
 const navKey = codeToNavKey[code];
 if (navKey && engagementId) {
 navigate(`/engagements/${engagementId}/checklist/${navKey}`);
 }
 };

 const handleNavigateToItem = (item: DependencyItem) => {
 if (engagementId) {
 navigate(`/engagements/${engagementId}/checklist/${item.navKey}`);
 }
 };

 const breadcrumb = (
 <div className="flex items-center gap-1.5 text-sm text-sidebar-foreground">
 <span className="font-medium">{engagementId}</span>
 <ChevronRight className="h-3.5 w-3.5 opacity-50" />
 <span className="font-semibold">Dependency Register</span>
 </div>
 );

 return (
 <Layout title="Engagements" headerContent={breadcrumb}>
 <div className="flex-1 overflow-auto bg-background p-6">
 {/* Header */}
 <div className="mb-6">
 <h1 className="text-xl font-bold text-foreground">Audit Engagement Dependency Register</h1>
 <p className="text-sm text-muted-foreground mt-1">
 Prerequisites that must be completed before each checklist, letter, or worksheet can be started.
 Critical path items are required to reach the auditor's report.
 </p>
 </div>

 {/* Legend */}
 <div className="flex flex-wrap items-center gap-4 mb-6 p-3 bg-card rounded-lg border border-border">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legend:</span>
 <div className="flex items-center gap-1.5">
 <TypeIcon type="checklist" />
 <span className="text-xs text-muted-foreground">Checklist</span>
 </div>
 <div className="flex items-center gap-1.5">
 <TypeIcon type="letter" />
 <span className="text-xs text-muted-foreground">Letter</span>
 </div>
 <div className="flex items-center gap-1.5">
 <TypeIcon type="worksheet" />
 <span className="text-xs text-muted-foreground">Worksheet</span>
 </div>
 <div className="flex items-center gap-1.5">
 <TypeIcon type="completion" />
 <span className="text-xs text-muted-foreground">Completion</span>
 </div>
 <div className="flex items-center gap-1.5">
 <AlertCircle className="h-3.5 w-3.5 text-red-500" />
 <span className="text-xs text-muted-foreground">Critical path item</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Link2 className="h-3.5 w-3.5 text-primary" />
 <span className="text-xs text-muted-foreground">Click a prerequisite code to navigate to it</span>
 </div>
 </div>

 {/* Table by Phase */}
 <div className="space-y-8">
 {PHASE_ORDER.map(phase => {
 const items = REGISTER.filter(r => r.phase === phase);
 const colors = PHASE_COLORS[phase];
 return (
 <div key={phase} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
 {/* Phase header */}
 <div className={cn("px-4 py-3 border-b border-border flex items-center gap-2", colors.bg)}>
 <span className={cn("text-sm font-bold", colors.text)}>{phase}</span>
 <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", colors.bg, colors.text, colors.border)}>
 {items.length} items
 </span>
 <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium ml-auto", colors.bg, colors.text, colors.border)}>
 {items.filter(i => i.criticalPath).length} critical path
 </span>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border bg-muted/30">
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24">Code</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Type</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">CA Standard</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">US Standard</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prerequisites</th>
 <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Flag</th>
 </tr>
 </thead>
 <tbody>
 {items.map((item, idx) => (
 <tr
 key={item.code}
 className={cn(
 "border-b border-border/50 hover:bg-muted/30 transition-colors",
 idx === items.length - 1 && "border-b-0"
 )}
 >
 {/* Code */}
 <td className="px-4 py-3">
 <button
 onClick={() => handleNavigateToItem(item)}
 className="font-mono text-xs font-bold text-primary hover:underline"
 >
 {item.code}
 </button>
 </td>

 {/* Document name */}
 <td className="px-4 py-3">
 <button
 onClick={() => handleNavigateToItem(item)}
 className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
 >
 {item.label}
 </button>
 </td>

 {/* Type */}
 <td className="px-4 py-3">
 <TypeBadge type={item.type} />
 </td>

 {/* CA Standard */}
 <td className="px-4 py-3">
 {item.cas ? (
 <div className="flex items-center gap-1.5">
 {/* PDF link — opens downloaded doc in new tab */}
 {STANDARD_PDF[item.cas] ? (
 <a
 href={`${import.meta.env.BASE_URL}standards/${STANDARD_PDF[item.cas]}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-mono text-primary hover:underline font-medium"
 title={`Open ${item.cas} PDF`}
 >
 {item.cas}
 </a>
 ) : (
 <span className="text-xs text-muted-foreground font-mono">{item.cas}</span>
 )}
 {/* Drive icon */}
 <a
 href={item.casUrl || DRIVE_FOLDER_URL}
 target="_blank"
 rel="noopener noreferrer"
 title="Open in Google Drive"
 className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
 >
 <GoogleDriveIcon className="h-3.5 w-3.5" />
 </a>
 </div>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </td>

 {/* US Standard */}
 <td className="px-4 py-3">
 {item.us ? (
 <div className="flex items-center gap-1.5">
 {/* PDF link — opens downloaded doc in new tab */}
 {STANDARD_PDF[item.us] ? (
 <a
 href={`${import.meta.env.BASE_URL}standards/${STANDARD_PDF[item.us]}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-mono text-primary hover:underline font-medium"
 title={`Open ${item.us} PDF`}
 >
 {item.us}
 </a>
 ) : (
 <span className="text-xs text-muted-foreground font-mono">{item.us}</span>
 )}
 {/* Drive icon */}
 <a
 href={item.usUrl || DRIVE_FOLDER_URL}
 target="_blank"
 rel="noopener noreferrer"
 title="Open in Google Drive"
 className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
 >
 <GoogleDriveIcon className="h-3.5 w-3.5" />
 </a>
 </div>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </td>

 {/* Prerequisites */}
 <td className="px-4 py-3">
 <PrereqBadges codes={item.prerequisites} onNavigate={handleNavigateToCode} />
 </td>

 {/* Flag */}
 <td className="px-4 py-3">
 {item.criticalPath ? <CriticalBadge /> : null}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
 })}
 </div>

 {/* Footer stats */}
 <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
 {[
 { label: "Total Documents", value: REGISTER.length, color: "text-foreground" },
 { label: "Critical Path", value: REGISTER.filter(r => r.criticalPath).length, color: "text-red-600" },
 { label: "Letters", value: REGISTER.filter(r => r.type === "letter").length, color: "text-purple-600" },
 { label: "Phases", value: PHASE_ORDER.length, color: "text-primary" },
 ].map(stat => (
 <div key={stat.label} className="bg-card rounded-lg border border-border p-4 text-center">
 <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
 <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Google Drive slide-over panel */}
 {drivePanel.open && (
 <>
 {/* Panel */}
 <div
 ref={panelRef}
 className="bg-white dark:bg-card border border-border shadow-2xl flex flex-col rounded-xl overflow-hidden"
 style={{...(isFullscreen ? { position: 'fixed' as const, inset: 8, zIndex: 9999 } : panelPos ? { position: 'fixed' as const, left: panelPos.x, top: panelPos.y, width: panelWidth, height: '90vh', zIndex: 9999 } : { position: 'fixed' as const, top: 0, right: 0, height: '100%', width: panelWidth, zIndex: 9999 }) }}
 >
 {/* Resize handle (left edge) */}
 {!isFullscreen && (
 <div
 onMouseDown={onResizeStart}
 className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/30 transition-colors z-10"
 />
 )}

 {/* Header — drag zone */}
 <div
 onMouseDown={onDragStart}
 className={cn(
 "flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30 select-none",
 !isFullscreen && "cursor-grab active:cursor-grabbing"
 )}
 >
 <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
 <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-foreground">Audit Standards</p>
 <p className="text-xs text-muted-foreground font-mono">{drivePanel.standard}</p>
 </div>
 <button
 onMouseDown={e => e.stopPropagation()}
 onClick={() => setIsFullscreen(f => !f)}
 className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
 title={isFullscreen ? "Restore" : "Fullscreen"}
 >
 {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
 </button>
 <button
 onMouseDown={e => e.stopPropagation()}
 onClick={closeDrivePanel}
 className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
 >
 <X className="h-4 w-4 text-muted-foreground" />
 </button>
 </div>

 {/* Body — PDF viewer or placeholder */}
 {pdfStatus === "checking" && (
 <div className="flex-1 flex items-center justify-center">
 <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
 </div>
 )}

 {pdfStatus === "found" && (
 <div className="flex-1 relative overflow-hidden bg-muted/20">
 <iframe
 key={drivePanel.standard}
 src={`${import.meta.env.BASE_URL}standards/${STANDARD_PDF[drivePanel.standard]}`}
 className="absolute inset-0 w-full h-full border-0"
 title={drivePanel.standard}
 />
 </div>
 )}

 {pdfStatus === "missing" && (
 <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
 <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
 <FolderOpen className="h-8 w-8 text-amber-500" />
 </div>
 <div>
 <p className="text-base font-semibold text-foreground mb-1">{drivePanel.standard}</p>
 <p className="text-sm text-muted-foreground mb-2">No PDF uploaded yet.</p>
 {STANDARD_PDF[drivePanel.standard] && (
 <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block">
 Add file: public/standards/{STANDARD_PDF[drivePanel.standard]}
 </p>
 )}
 </div>
 <a
 href={DRIVE_FOLDER_URL}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C63A6] text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
 >
 <ExternalLink className="h-3.5 w-3.5" />
 Open Google Drive folder
 </a>
 </div>
 )}
 </div>
 </>
 )}
 </Layout>
 );
}
