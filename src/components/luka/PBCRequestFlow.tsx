import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
 FileText, Send, Loader2, CheckCircle2, Globe, Eye,
 Circle, ChevronDown, Upload, Shield, Monitor, Sparkles, ArrowRight, Download,
} from "lucide-react";
import { PBC_TEMPLATES, type PBCTemplate } from "@/lib/pbcTemplates";
import { savePBCRequest, addPBCNotification, addGlobalPBCNotification } from "@/lib/pbcRequestStore";
import { LukaIcon } from "@/components/LukaIcon";
import { cn } from "@/lib/utils";

function downloadPBCAsPDF(content: string, title: string) {
 const lines = content.split("\n");
 const htmlBody = lines.map(line => {
 if (line.startsWith("# ")) return `<h1>${line.slice(2).replace(/\*\*/g, "")}</h1>`;
 if (line.startsWith("## ")) return `<h2>${line.slice(3).replace(/\*\*/g, "")}</h2>`;
 if (line.startsWith("--- ") || line === "---") return `<hr/>`;
 if (line.trim() === "________________________________________________________________________________") return `<div class="blank-line"></div>`;
 if (line.trim() === "") return `<br/>`;
 return `<p>${line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
 }).join("\n");

 const w = window.open("", "_blank");
 if (!w) return;
 w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
 body{font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#1b2337;max-width:820px;margin:40px auto;padding:0 48px;line-height:1.7}
 h1{font-size:20px;font-weight:700;color:#193565;margin:0 0 12px}
 h2{font-size:14px;font-weight:700;color:#193565;margin:28px 0 10px;padding-bottom:5px;border-bottom:2px solid rgba(25,53,101,0.15)}
 hr{border:none;border-top:1px solid #dde1ea;margin:18px 0}
 p{margin:4px 0}
 strong{font-weight:600}
 .blank-line{border-bottom:1px solid #b0b8cc;margin:18px 0 4px;height:1px}
 @media print{body{margin:20px auto}}
 </style></head><body>${htmlBody}</body></html>`);
 w.document.close();
 setTimeout(() => { w.focus(); w.print(); }, 300);
}

const WP_FORM_SUGGESTIONS = [
 "408", "410",
 "420", "428", "430", "436", "450",
 "500", "505", "506", "507", "510", "511", "513", "514", "515",
 "520", "525", "530", "535", "540", "550", "551", "575", "580", "590",
 "605", "610", "625", "630", "635", "645", "650", "655", "666", "670", "680",
];

type Phase =
 | "greeting"
 | "type-selected"
 | "wp-selected"
 | "upload-template"
 | "create-with-luka"
 | "generating"
 | "artifact"
 | "sent"
 | "responding"
 | "applied";

interface ChatMsg {
 role: "luka" | "user";
 text: string;
 chips?: string[];
 isArtifact?: boolean;
 isResponses?: boolean;
 isTemplateGrid?: boolean;
}

interface PBCRequestFlowProps {
 engagementId: string;
 clientName: string;
 yearEnd: string;
 threadId: string;
 onViewDoc: (content: string, templateLabel: string) => void;
 onSentToPortal: (engagementId: string, threadId: string) => void;
 onApplyResponses: (responses: Array<{ questionId: string; answer: string }>) => void;
 initialPhase?: Phase;
 initialWpNumbers?: string[];
 initialTemplateId?: string;
 initialDocContent?: string;
}

// ── Module-level constants ────────────────────────────────────────────────────

const STEP_INTERVAL = 900;

const TEMPLATE_META: Record<string, { description: string; sections: string[] }> = {
 "memo-540": {
 description: "FOR CLIENT TO COMPLETE — narrative memo with fill-in blanks covering all key control areas.",
 sections: ["Entity Level Controls", "IT General Controls", "Financial Reporting", "Revenue", "Expenses / A/P", "Treasury"],
 },
 "it-questionnaire": {
 description: "Generate a client questionnaire for the client’s IT team across selected worksheets.",
 sections: ["Software & Apps", "Third-Party Providers", "Access Controls", "Physical / Backup", "Information Flow", "Cybersecurity", "Communication"],
 },
 "memo-510": {
 description: "Generate a memo covering company operations, fraud risk, related parties, and corporate-level controls across multiple worksheets.",
 sections: ["Company Operations", "Fraud Assessment", "Related Parties", "Internal Controls"],
 },
};

const LUKA_PROMPT_HINTS = [
 "Draft a control questionnaire",
 "IT security checklist",
 "Fraud risk assessment memo",
 "Document request for payroll",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseDocxText(file: File): Promise<string> {
 const JSZip = (await import("jszip")).default;
 const zip = await JSZip.loadAsync(file);
 const xmlContent = await zip.file("word/document.xml")?.async("text") ?? "";
 const parser = new DOMParser();
 const doc = parser.parseFromString(xmlContent, "text/xml");
 const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
 const paras = doc.getElementsByTagNameNS(ns, "p");
 const lines: string[] = [];
 for (const para of Array.from(paras)) {
 const texts: string[] = [];
 const runs = para.getElementsByTagNameNS(ns, "t");
 for (const t of Array.from(runs)) {
 if (t.textContent) texts.push(t.textContent);
 }
 const line = texts.join("").trim();
 if (line) lines.push(line);
 }
 return lines.join("\n\n");
}

function parseMarkdown(text: string): React.ReactNode[] {
 return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
 part.startsWith("**") && part.endsWith("**")
 ? <strong key={i}>{part.slice(2, -2)}</strong>
 : part
 );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LukaAvatar({ done }: { done?: boolean }) {
 return (
 <div className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={32} animated={!done} bare inverted />
 </div>
 );
}

function LukaBubble({ children, done }: { children: React.ReactNode; done?: boolean }) {
 return (
 <div className="flex items-start gap-4">
 <LukaAvatar done={done} />
 <div className="min-w-0 flex-1">{children}</div>
 </div>
 );
}

function UserBubble({ text }: { text: string }) {
 return (
 <div className="flex justify-end">
 <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm">
 {text}
 </div>
 </div>
 );
}

function LukaText({ text }: { text: string }) {
 return (
 <p
 className="text-[15px] leading-relaxed whitespace-pre-wrap"
 style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 {parseMarkdown(text)}
 </p>
 );
}

function ChipRow({ chips, onSelect }: { chips: string[]; onSelect: (c: string) => void }) {
 return (
 <div className="flex flex-wrap gap-2 mt-3">
 {chips.map(c => (
 <button key={c} onClick={() => onSelect(c)} className="luka-prompt-chip">
 {c}
 </button>
 ))}
 </div>
 );
}

function TemplateCardGrid({
 onSelectTemplate,
 onUpload,
 onCreateWithLuka,
}: {
 onSelectTemplate: (template: PBCTemplate, label: string) => void;
 onUpload: () => void;
 onCreateWithLuka: () => void;
}) {
 const [hoveredId, setHoveredId] = useState<string | null>(null);

 const iconConfig: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
 "memo-540": { Icon: Shield, color: "hsl(213 80% 48%)", bg: "hsl(213 80% 48% / 0.09)" },
 "it-questionnaire": { Icon: Monitor, color: "hsl(160 55% 38%)", bg: "hsl(160 55% 38% / 0.09)" },
 "memo-510": { Icon: FileText, color: "hsl(265 65% 55%)", bg: "hsl(265 65% 55% / 0.09)" },
 };

 return (
 <div className="mt-2 space-y-2 pl-12 pr-1">
 {/* Template cards */}
 {PBC_TEMPLATES.map((template) => {
 const meta = TEMPLATE_META[template.id];
 const ic = iconConfig[template.id] ?? { Icon: FileText, color: "hsl(222 20% 50%)", bg: "hsl(220 20% 96%)" };
 const isHov = hoveredId === template.id;

 return (
 <motion.button
 key={template.id}
 onClick={() => onSelectTemplate(template, template.label)}
 onHoverStart={() => setHoveredId(template.id)}
 onHoverEnd={() => setHoveredId(null)}
 className="w-full text-left rounded-xl border bg-card p-4 block"
 animate={{
 borderColor: isHov ? "hsl(var(--primary) / 0.45)" : "hsl(var(--border))",
 boxShadow: isHov
 ? "0 0 0 3px hsl(var(--primary) / 0.07), 0 4px 18px hsl(var(--primary) / 0.09)"
 : "0 1px 3px rgba(0,0,0,0.04)",
 }}
 transition={{ duration: 0.18 }}
 >
 <div className="flex items-start gap-3">
 {/* Icon box */}
 <div
 className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
 style={{ background: ic.bg }}
 >
 <ic.Icon size={17} style={{ color: ic.color }} />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span
 className="text-[13.5px] font-semibold leading-tight"
 style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 {template.label}
 </span>

 </div>
 {meta && (
 <>
 <p
 className="text-[11.5px] leading-relaxed mb-2"
 style={{ color: "hsl(222 18% 52%)" }}
 >
 {meta.description}
 </p>
 <div className="flex flex-wrap gap-1">
 {meta.sections.map((s) => (
 <span
 key={s}
 className="text-[10px] rounded-full px-2 py-0.5 font-medium"
 style={{ background: "hsl(220 18% 94%)", color: "hsl(222 22% 42%)" }}
 >
 {s}
 </span>
 ))}
 </div>
 </>
 )}
 </div>

 {/* Arrow */}
 <motion.span
 className="shrink-0 mt-1"
 animate={{ opacity: isHov ? 1 : 0, x: isHov ? 0 : -5 }}
 transition={{ duration: 0.16 }}
 >
 <ArrowRight size={15} style={{ color: "hsl(var(--primary))" }} />
 </motion.span>
 </div>
 </motion.button>
 );
 })}

 {/* Upload my own card */}
 <motion.button
 onClick={onUpload}
 onHoverStart={() => setHoveredId("upload")}
 onHoverEnd={() => setHoveredId(null)}
 className="w-full text-left rounded-xl border-2 border-dashed p-3.5 block"
 animate={{
 borderColor: hoveredId === "upload" ? "hsl(220 20% 60%)" : "hsl(220 20% 82%)",
 backgroundColor: hoveredId === "upload" ? "hsl(220 20% 98%)" : "transparent",
 }}
 transition={{ duration: 0.16 }}
 >
 <div className="flex items-center gap-3">
 <div
 className="shrink-0 w-9 h-9 rounded-lg border-2 border-dashed flex items-center justify-center"
 style={{ borderColor: "hsl(220 20% 76%)" }}
 >
 <Upload size={15} style={{ color: "hsl(222 18% 55%)" }} />
 </div>
 <div className="flex-1">
 <p
 className="text-[13px] font-semibold"
 style={{ color: "hsl(222 25% 30%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 Upload your own template
 </p>
 <p className="text-[11px] mt-0.5" style={{ color: "hsl(222 15% 55%)" }}>
 Use your existing.docx or.txt file
 </p>
 </div>
 <motion.span
 animate={{ opacity: hoveredId === "upload" ? 1 : 0 }}
 transition={{ duration: 0.16 }}
 >
 <ArrowRight size={15} style={{ color: "hsl(222 20% 55%)" }} />
 </motion.span>
 </div>
 </motion.button>

 {/* Create with Luka card */}
 <motion.button
 onClick={onCreateWithLuka}
 onHoverStart={() => setHoveredId("luka")}
 onHoverEnd={() => setHoveredId(null)}
 className="w-full text-left rounded-xl border p-3.5 block relative overflow-hidden"
 animate={{
 borderColor: hoveredId === "luka" ? "hsl(265 65% 60% / 0.55)" : "hsl(265 65% 60% / 0.28)",
 boxShadow: hoveredId === "luka"
 ? "0 0 0 3px hsl(265 65% 60% / 0.09), 0 4px 20px hsl(265 65% 60% / 0.13)"
 : "none",
 }}
 transition={{ duration: 0.18 }}
 style={{ background: "linear-gradient(135deg, hsl(265 75% 99%), hsl(213 80% 99%))" }}
 >
 {/* Purple left accent bar */}
 <div
 className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
 style={{ background: "linear-gradient(to bottom, hsl(265 75% 58%), hsl(213 80% 52%))" }}
 />
 <div className="flex items-center gap-3 pl-2">
 <div
 className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
 style={{ background: "linear-gradient(135deg, hsl(265 75% 60% / 0.13), hsl(213 80% 55% / 0.13))" }}
 >
 <Sparkles size={17} style={{ color: "hsl(265 65% 52%)" }} />
 </div>
 <div className="flex-1">
 <p
 className="text-[13px] font-semibold"
 style={{ color: "hsl(265 45% 28%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 Create with Luka
 </p>
 <p className="text-[11px] mt-0.5" style={{ color: "hsl(265 25% 50%)" }}>
 Describe exactly what you need and I'll build it
 </p>
 </div>
 <motion.span
 animate={{ opacity: hoveredId === "luka" ? 1 : 0, x: hoveredId === "luka" ? 0 : -5 }}
 transition={{ duration: 0.16 }}
 >
 <ArrowRight size={15} style={{ color: "hsl(265 65% 52%)" }} />
 </motion.span>
 </div>
 </motion.button>
 </div>
 );
}

function GeneratingSteps({ wpNumbers }: { wpNumbers: string[] }) {
 const [visible, setVisible] = useState(0);
 const [expanded, setExpanded] = useState<number | null>(null);

 useEffect(() => {
 const delays = [400, 400 + STEP_INTERVAL, 400 + STEP_INTERVAL * 2, 400 + STEP_INTERVAL * 3];
 const timers = delays.map((delay, i) => setTimeout(() => setVisible(i + 1), delay));
 return () => timers.forEach(clearTimeout);
 }, []);

 const steps = [
 `Reading working paper references${wpNumbers.length ? ` for form ${wpNumbers.join(", ")}` : ""}`,
 "Selecting appropriate template",
 "Generating document structure and content",
 "Finalising your PBC request",
 ];

 return (
 <div className="flex items-start gap-4">
 <div className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center">
 <LukaIcon size={32} animated />
 </div>
 <div className="min-w-0 flex-1">
 <p
 className="text-[15px] leading-relaxed"
 style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 Generating your PBC request document
 </p>

 <div className="mt-4 flex items-center gap-2">
 <span className="text-[14px] font-semibold italic" style={{ color: "hsl(222 30% 22%)" }}>
 Preparing your document
 </span>
 <span className="flex items-center gap-1">
 {[0, 1, 2].map(i => (
 <motion.span
 key={i}
 className="w-1.5 h-1.5 rounded-full"
 style={{ background: "hsl(265 75% 60%)" }}
 animate={{ opacity: [0.3, 1, 0.3] }}
 transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
 />
 ))}
 </span>
 </div>

 <div className="mt-3">
 {steps.map((s, i) => (
 <motion.div
 key={i}
 style={{ borderTop: "1px solid hsl(220 20% 92%)" }}
 initial={{ opacity: 0, y: 6 }}
 animate={visible > i ? { opacity: 1, y: 0 } : {}}
 transition={{ duration: 0.35, ease: "easeOut" }}
 >
 <button
 className="w-full flex items-center gap-3 py-3 text-left"
 onClick={() => visible > i && setExpanded(expanded === i ? null : i)}
 disabled={visible <= i}
 style={{ cursor: visible > i ? "pointer" : "default" }}
 >
 <span className="shrink-0 inline-flex" style={{ color: "hsl(222 15% 50%)" }}>
 <ChevronDown
 size={14}
 style={{
 transform: expanded === i ? "rotate(0deg)" : "rotate(-90deg)",
 transition: "transform 0.2s",
 }}
 />
 </span>
 <span
 className="flex-1 text-[14px]"
 style={{ color: "hsl(222 25% 30%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
 >
 {s}
 </span>
 {visible > i + 1 ? (
 <CheckCircle2 size={16} className="shrink-0" style={{ color: "hsl(145 63% 42%)" }} />
 ) : visible === i + 1 ? (
 <Loader2 size={16} className="animate-spin text-primary shrink-0" />
 ) : (
 <Circle size={16} className="shrink-0" style={{ color: "hsl(220 15% 75%)" }} />
 )}
 </button>
 </motion.div>
 ))}
 </div>
 </div>
 </div>
 );
}

function ArtifactCard({
 template,
 content,
 onView,
 onSend,
 sent,
}: {
 template: PBCTemplate;
 content: string;
 onView: () => void;
 onSend: () => void;
 sent: boolean;
}) {
 const preview = content.split("\n")
.filter(Boolean)
.filter(l => !/^---+$/.test(l) && !l.startsWith("|"))
.map(l => l.replace(/^#+\s+/, "").replace(/\*\*/g, "").trim())
.filter(Boolean)
.slice(0, 3)
.join(" · ");
 return (
 <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden mt-1">
 <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
 <FileText className="h-4 w-4 text-primary shrink-0" />
 <span className="text-sm font-semibold flex-1 min-w-0 truncate">{template.label}</span>
 <span className="shrink-0 rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5 font-medium">
 WP {template.wpRef}
 </span>
 </div>
 <div className="px-4 py-3">
 <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 {preview}
 </p>
 </div>
 <div className="flex gap-2 px-4 py-3 border-t border-border bg-muted/20 flex-wrap">
 <button
 onClick={onView}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
 >
 <Eye className="h-3.5 w-3.5" /> View Document
 </button>
 <button
 onClick={() => downloadPBCAsPDF(content, template.label)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors"
 >
 <Download className="h-3.5 w-3.5" /> Download PDF
 </button>
 {sent ? (
 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs font-semibold">
 <CheckCircle2 className="h-3.5 w-3.5" /> Sent to Portal
 </span>
 ) : (
 <button
 onClick={onSend}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors"
 >
 <Globe className="h-3.5 w-3.5" /> Send to Client Portal
 </button>
 )}
 </div>
 </div>
 );
}

function generateFilledDocument(docContent: string): string {
 if (!docContent) return "";
 const year = new Date().getFullYear() - 1;
 const date = new Date().toLocaleDateString("en-CA");

 const shortAnswers = ["Sarah Mitchell, CFO", date];
 let shortIdx = 0;

 const longAnswers = [
 `Yes, this is the first year of the engagement. The Company's legal name is Northline Precision Manufacturing Inc., a private corporation incorporated in Ontario. Fiscal year end is December 31, ${year}.`,
 `No significant changes in ownership or management occurred during the period. The founding shareholders retain 100% of equity. No board or key management changes were made.`,
 `Financial statements are prepared under ASPE (Accounting Standards for Private Enterprises). No changes to accounting standards were adopted in the current year.`,
 `Prior period financial statements and trial balance have been provided to the audit team via the client portal. Comparative figures are available for all material accounts.`,
 `There are no outstanding tax, legal, or regulatory issues from prior periods that the audit team should be aware of.`,
 `The Company uses QuickBooks Enterprise for accounting and a custom ERP for inventory management. Microsoft 365 is used for communications and document management. All systems are hosted on-premises with Microsoft Azure as a backup cloud environment.`,
 `Yes — multi-factor authentication (MFA) has been enforced for all remote access and financial system logins since January ${year}. Quarterly access reviews are conducted by each department head and results reported to the CFO.`,
 `Daily incremental and weekly full backups are stored off-site in an AES-256 encrypted vault. Restoration testing is performed quarterly. Financial records are retained for 7 years in accordance with CRA requirements.`,
 `All external data transmissions use TLS 1.3 encryption. File sharing with external parties is conducted exclusively through the Company's secure client portal. Unencrypted email attachments containing financial data are prohibited by policy.`,
 `No reportable security incidents occurred during the current fiscal year. One phishing attempt was detected and blocked by the email filtering system in Q2 — no data was compromised and no breach notification was required.`,
 `IT control deficiencies are logged in the Company's ticketing system (ServiceNow). Material deficiencies are escalated to the CFO within 5 business days and documented in the enterprise risk register. Remediation timelines are tracked to closure.`,
 `Key third-party providers with access to financial data: (1) ADP Canada — payroll processing; (2) Microsoft Azure — cloud backup and storage; (3) RBC — banking portal; (4) SharePoint Online — document management. All providers are subject to annual vendor assessments.`,
 `Software updates are applied monthly through a centralized patch management system. Critical security patches are deployed within 48 hours of release. Patch logs are reviewed by the IT Manager and reported to the CFO quarterly.`,
 `No significant IT system changes are planned that would affect financial reporting systems. A CRM platform migration is scheduled for Q3 but is isolated from all financial systems and will not impact accounting records.`,
 `The IT environment is managed by a dedicated team of 3 IT staff. IT controls documentation was comprehensively reviewed and updated in Q1 ${year}. The documentation is stored in SharePoint and accessible to the audit team on request.`,
 `Not applicable to this engagement.`,
 ];
 let longIdx = 0;

 // Replace long blanks first (80 underscores), then short header blanks (30 underscores)
 // Order matters — short pattern is a substring of the long pattern
 return docContent
 .replace(/_{80}/g, () => `\n\n> ${longAnswers[longIdx++] ?? "Client response provided."}`)
 .replace(/_{30}/g, () => shortAnswers[shortIdx++] ?? "N/A");
}

function ResponsesCard({
 onAccept,
 onViewResponses,
 templateId,
 wpNumbers,
}: {
 onAccept: () => void;
 onViewResponses: () => void;
 templateId?: string;
 wpNumbers?: string[];
}) {
 const isQuestionnaire = templateId === "it-questionnaire";
 const mockResponses = isQuestionnaire
 ? [
 { q: `Completed Questionnaire — Forms ${(wpNumbers ?? []).join(", ") || "WP"}`, a: `Uploaded — Audit_Questionnaire_Completed_${new Date().getFullYear()}.pdf` },
 ]
 : [
 { q: "Organization chart", a: "Uploaded — Org Chart v3 April 2024.pdf" },
 { q: "Policies & procedures", a: "Uploaded — Financial Policies Manual 2024.pdf" },
 { q: "Management review evidence", a: "Uploaded — Q4 Review Sign-offs.xlsx" },
 { q: "IT access control listing", a: "Uploaded — System Users March 2024.csv" },
 ];
 return (
 <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden mt-1">
 <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-green-50 dark:bg-green-900/20">
 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
 <span className="text-sm font-semibold text-green-700 dark:text-green-400">
 Client has responded — {mockResponses.length} documents received
 </span>
 </div>
 <div className="divide-y divide-border">
 {mockResponses.map((r, i) => (
 <div key={i} className="flex items-start gap-3 px-4 py-2.5">
 <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <p className="text-xs font-medium text-foreground">{r.q}</p>
 <p className="text-xs text-muted-foreground truncate">{r.a}</p>
 </div>
 </div>
 ))}
 </div>
 <div className="px-4 pt-2.5 pb-3 border-t border-border bg-muted/20 flex gap-2">
 <button
 onClick={onViewResponses}
 className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
 >
 <Eye className="h-3.5 w-3.5" /> View Responses
 </button>
 <button
 onClick={onAccept}
 className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
 >
 <CheckCircle2 className="h-3.5 w-3.5" /> Accept & Fill
 </button>
 </div>
 </div>
 );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PBCRequestFlow({
 engagementId,
 clientName,
 yearEnd,
 threadId,
 onViewDoc,
 onSentToPortal,
 onApplyResponses,
 initialPhase,
 initialWpNumbers,
 initialTemplateId,
 initialDocContent: initialDocContentProp,
}: PBCRequestFlowProps) {
 const [phase, setPhase] = useState<Phase>(initialPhase ?? "greeting");
 const [messages, setMessages] = useState<ChatMsg[]>(() => {
 if (initialPhase === "responding") {
 const engLabel = clientName || "the client";
 return [
 { role: "luka" as const, text: `I'll help you create a PBC request for **${clientName} · ${engagementId}**.\n\nWould you like a single document request or multiple?` },
 { role: "user" as const, text: "Single" },
 { role: "user" as const, text: "Send to Client Portal" },
 { role: "luka" as const, text: `Sent to the client portal. I'll notify you here when **${engLabel}** responds.` },
 { role: "luka" as const, text: `**${engLabel}** has submitted responses to your PBC request:`, isResponses: true },
 ];
 }
 return [];
 });
 const [requestType, setRequestType] = useState<"single" | "multi" | null>(null);
 const [wpInput, setWpInput] = useState("");
 const [wpNumbers, setWpNumbers] = useState<string[]>(initialWpNumbers ?? []);
 const [selectedTemplate, setSelectedTemplate] = useState<PBCTemplate | null>(
 initialTemplateId ? { id: initialTemplateId, label: initialTemplateId, wpRef: "", generate: () => "" } : null
 );
 const [docContent, setDocContent] = useState(initialDocContentProp ?? "");
 const [sent, setSent] = useState(initialPhase === "sent" || initialPhase === "responding" || initialPhase === "applied");
 const [lukaPromptInput, setLukaPromptInput] = useState("");
 const bottomRef = useRef<HTMLDivElement>(null);

 const addMsg = (msg: ChatMsg) => setMessages(prev => [...prev, msg]);

 // Greeting on mount — skip if restoring or resuming an existing thread
 useEffect(() => {
 if (initialPhase) return;
 const engLabel = clientName && engagementId ? `**${clientName} · ${engagementId}**` : "this engagement";
 const t = setTimeout(() => {
 addMsg({
 role: "luka",
 text: `I'll help you create a PBC request for ${engLabel}.\n\nWould you like a single document request or multiple?`,
 chips: ["Single", "Multiple"],
 });
 }, 400);
 return () => clearTimeout(t);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Scroll to bottom on new messages
 useEffect(() => {
 bottomRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [messages, phase]);

 const handleChipSelect = (chip: string) => {
 if (phase === "greeting") {
 const type = chip === "Single" ? "single" : "multi";
 setRequestType(type);
 addMsg({ role: "user", text: chip });
 setPhase("type-selected");
 setTimeout(() => {
 addMsg({
 role: "luka",
 text: type === "single"
 ? "Which working paper is this for? Type the form number (e.g. **510**, **540**) or describe it briefly."
 : "Which working papers should this cover? Type the form numbers separated by commas (e.g. **510, 540, 515**).",
 });
 }, 400);
 return;
 }

 if (phase === "artifact" && chip === "Send to Client Portal") {
 handleSend();
 return;
 }

 if (phase === "responding" && chip === "Accept & Fill Worksheets") {
 handleApply();
 return;
 }
 };

 const handleWPSubmit = () => {
 const raw = wpInput.trim();
 if (!raw) return;
 const wps = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
 setWpNumbers(wps);
 setWpInput("");
 addMsg({ role: "user", text: raw });
 setPhase("wp-selected");

 setTimeout(() => {
 addMsg({
 role: "luka",
 text: `Here are the available templates${wps.length ? ` for Form **${wps.join(", ")}**` : ""}. Select one or describe what you need:`,
 isTemplateGrid: true,
 });
 }, 400);
 };

 const handleTemplateSelect = (template: PBCTemplate, userLabel: string) => {
 setSelectedTemplate(template);
 addMsg({ role: "user", text: userLabel });
 setPhase("generating");

 setTimeout(() => {
 const content = template.generate({ clientName, engagementId, yearEnd, wpNumbers });
 setDocContent(content);

 savePBCRequest({
 threadId,
 engagementId,
 createdAt: new Date().toISOString(),
 requestType: requestType ?? "single",
 wpNumbers,
 templateId: template.id,
 documentContent: content,
 status: "draft",
 });

 addMsg({ role: "luka", text: "Here's your PBC request document:" });
 addMsg({ role: "luka", text: "", isArtifact: true });
 setPhase("artifact");
 }, 3100);
 };

 const handleCreateWithLuka = () => {
 addMsg({ role: "user", text: "Create with Luka" });
 setPhase("create-with-luka");
 setTimeout(() => {
 addMsg({
 role: "luka",
 text: "Describe the PBC request document you need and I'll build it for you:",
 });
 }, 400);
 };

 const handleLukaPromptSubmit = () => {
 const prompt = lukaPromptInput.trim();
 if (!prompt) return;
 setLukaPromptInput("");
 const customTemplate: PBCTemplate = {
 id: "luka-generated",
 label: prompt.length > 50 ? prompt.slice(0, 50) + "…" : prompt,
 wpRef: "AI",
 generate: () =>
 `# ${prompt}\n\n**Generated by Luka AI**\n\n---\n\nThis document has been drafted based on your request. Please review and customise as needed.\n\n## Section 1 — Overview\n\nPlease provide information relevant to: ${prompt}\n\n________________________________________________________________________________\n\n________________________________________________________________________________\n\n## Section 2 — Details\n\nAdditional context and supporting documentation:\n\n________________________________________________________________________________\n\n________________________________________________________________________________\n\n## Section 3 — Confirmation\n\nPlease confirm the following before submission:\n\n- [ ] All information provided is accurate and complete\n- [ ] Supporting documents have been attached where indicated\n- [ ] Authorised signatory has reviewed this document`,
 };
 handleTemplateSelect(customTemplate, prompt);
 };

 const handleSend = () => {
 setSent(true);
 savePBCRequest({
 threadId,
 engagementId,
 createdAt: new Date().toISOString(),
 requestType: requestType ?? "single",
 wpNumbers,
 templateId: selectedTemplate?.id ?? "",
 documentContent: docContent,
 sentAt: new Date().toISOString(),
 status: "sent",
 });
 addMsg({ role: "user", text: "Send to Client Portal" });
 setTimeout(() => {
 addMsg({
 role: "luka",
 text: `Sent to the client portal. I'll notify you here when **${clientName || "the client"}** responds.`,
 });
 setPhase("sent");
 onSentToPortal(engagementId, threadId);

 setTimeout(() => {
 savePBCRequest({
 threadId,
 engagementId,
 createdAt: new Date().toISOString(),
 requestType: requestType ?? "single",
 wpNumbers,
 templateId: selectedTemplate?.id ?? "",
 documentContent: docContent,
 sentAt: new Date().toISOString(),
 status: "responded",
 });
 addMsg({
 role: "luka",
 text: `**${clientName || "The client"}** has submitted responses to your PBC request:`,
 isResponses: true,
 });
 setPhase("responding");
 addPBCNotification(engagementId, threadId);
 addGlobalPBCNotification({ engagementId, threadId, clientName: clientName || "Client", receivedAt: new Date().toISOString() });
 }, 5000);
 }, 600);
 };

 const handleApply = () => {
 addMsg({ role: "user", text: "Accept & Fill Worksheets" });
 setPhase("applied");
 setTimeout(() => {
 onApplyResponses([]);
 addMsg({
 role: "luka",
 text: "Done — the client's uploaded documents have been linked to the working papers and responses applied to the relevant worksheets.",
 });
 }, 500);
 };

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 addMsg({ role: "user", text: file.name });
 setPhase("generating");

 const processFile = async () => {
 let content = "";
 try {
 if (file.name.toLowerCase().endsWith(".docx")) {
 content = await parseDocxText(file);
 } else {
 content = await file.text();
 }
 } catch {
 content = `[Unable to read file: ${file.name}]`;
 }

 const customTemplate: PBCTemplate = {
 id: "custom-upload",
 label: file.name.replace(/\.(docx|txt)$/i, ""),
 wpRef: "CUSTOM",
 generate: () => content,
 };

 setTimeout(() => {
 setSelectedTemplate(customTemplate);
 setDocContent(content);

 savePBCRequest({
 threadId,
 engagementId,
 createdAt: new Date().toISOString(),
 requestType: requestType ?? "single",
 wpNumbers,
 templateId: "custom-upload",
 documentContent: content,
 status: "draft",
 });

 addMsg({ role: "luka", text: "Here's your PBC request document:" });
 addMsg({ role: "luka", text: "", isArtifact: true });
 setPhase("artifact");
 }, 3100);
 };

 processFile();
 };

 const isDone = phase === "artifact" || phase === "sent" || phase === "responding" || phase === "applied";

 const renderMessage = (msg: ChatMsg, i: number) => {
 if (msg.role === "user") return <UserBubble key={i} text={msg.text} />;

 if (msg.isArtifact && selectedTemplate) {
 return (
 <LukaBubble key={i} done={isDone}>
 <ArtifactCard
 template={selectedTemplate}
 content={docContent}
 onView={() => onViewDoc(docContent, selectedTemplate.label)}
 onSend={handleSend}
 sent={sent}
 />
 </LukaBubble>
 );
 }

 if (msg.isResponses) {
 return (
 <LukaBubble key={i} done={isDone}>
 {msg.text && <LukaText text={msg.text} />}
 <ResponsesCard
 onAccept={handleApply}
 onViewResponses={() => onViewDoc(
 generateFilledDocument(docContent),
 selectedTemplate?.label ?? "Responses"
 )}
 templateId={selectedTemplate?.id}
 wpNumbers={wpNumbers}
 />
 </LukaBubble>
 );
 }

 if (msg.isTemplateGrid) {
 return (
 <div key={i} className="space-y-0">
 <LukaBubble done={isDone}>
 <LukaText text={msg.text} />
 </LukaBubble>
 {phase === "wp-selected" && (
 <TemplateCardGrid
 onSelectTemplate={handleTemplateSelect}
 onUpload={() => {
 addMsg({ role: "user", text: "Upload my own template" });
 setPhase("upload-template");
 setTimeout(() => {
 addMsg({
 role: "luka",
 text: "Please upload your template file (.docx or.txt). I'll use it to generate the PBC request document.",
 });
 }, 400);
 }}
 onCreateWithLuka={handleCreateWithLuka}
 />
 )}
 </div>
 );
 }

 return (
 <LukaBubble key={i} done={isDone}>
 <LukaText text={msg.text} />
 {msg.chips && phase !== "artifact" && phase !== "sent" && phase !== "responding" && phase !== "applied" && (
 <ChipRow chips={msg.chips} onSelect={handleChipSelect} />
 )}
 </LukaBubble>
 );
 };

 return (
 <div className="flex flex-col flex-1 min-h-0">
 {/* Message area */}
 <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
 {messages.map(renderMessage)}
 {phase === "generating" && (
 <GeneratingSteps wpNumbers={wpNumbers} />
 )}
 <div ref={bottomRef} />
 </div>

 {/* WP number input */}
 {phase === "type-selected" && (
 <div className="px-4 pb-4 pt-2">
 {/* Form number suggestion badges */}
 <div className="flex flex-wrap gap-1.5 mb-2.5">
 {WP_FORM_SUGGESTIONS.map(num => {
 const selected = wpInput.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).includes(num);
 return (
 <button
 key={num}
 type="button"
 onClick={() => {
 const parts = wpInput.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
 if (selected) {
 setWpInput(parts.filter(p => p !== num).join(", "));
 } else {
 setWpInput(parts.length ? parts.join(", ") + ", " + num : num);
 }
 }}
 className={cn(
 "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
 selected
 ? "border-[#9747FF] bg-[#9747FF]/10 text-[#9747FF]"
 : "border-[hsl(220_20%_80%)] bg-white text-[hsl(222_20%_45%)] hover:border-[#9747FF]/50 hover:text-[#9747FF]"
 )}
 >
 {num}
 </button>
 );
 })}
 </div>
 <div className="luka-input-wrapper">
 <input
 autoFocus
 value={wpInput}
 onChange={e => setWpInput(e.target.value)}
 onKeyDown={e => e.key === "Enter" && handleWPSubmit()}
 placeholder="Type form number(s), e.g. 510, 540…"
 className="luka-input"
 />
 <div className="flex items-center justify-end mt-2">
 <button
 onClick={handleWPSubmit}
 disabled={!wpInput.trim()}
 className={cn("luka-send-btn", wpInput.trim() && "enabled")}
 >
 <Send className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Upload template area */}
 {phase === "upload-template" && (
 <div className="px-4 pb-4 pt-2">
 <label
 className="flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-muted/30"
 style={{ borderColor: "hsl(220 20% 80%)" }}
 >
 <Upload className="h-8 w-8" style={{ color: "hsl(222 20% 55%)" }} />
 <div className="text-center">
 <p className="text-sm font-semibold" style={{ color: "hsl(222 35% 16%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
 Click to upload your template
 </p>
 <p className="text-xs mt-1" style={{ color: "hsl(222 15% 55%)" }}>
 Supports.docx and.txt files
 </p>
 </div>
 <input
 type="file"
 accept=".docx,.txt"
 className="hidden"
 onChange={handleFileUpload}
 />
 </label>
 </div>
 )}

 {/* Create with Luka prompt */}
 {phase === "create-with-luka" && (
 <div className="px-4 pb-4 pt-2">
 <div className="luka-input-wrapper">
 <textarea
 autoFocus
 value={lukaPromptInput}
 onChange={e => setLukaPromptInput(e.target.value)}
 onKeyDown={e => {
 if (e.key === "Enter" && !e.shiftKey) {
 e.preventDefault();
 handleLukaPromptSubmit();
 }
 }}
 placeholder="e.g. Create an IT controls questionnaire covering password policies and user access management…"
 className="luka-input resize-none"
 rows={3}
 />
 <div className="flex items-end justify-between mt-2 gap-2">
 <div className="flex flex-wrap gap-1.5 flex-1">
 {LUKA_PROMPT_HINTS.map(hint => (
 <button
 key={hint}
 onClick={() => setLukaPromptInput(hint)}
 className="text-[11px] rounded-full px-2.5 py-1 border transition-colors hover:bg-primary/5 hover:border-primary/30"
 style={{
 borderColor: "hsl(220 20% 82%)",
 color: "hsl(222 25% 40%)",
 fontFamily: "'DM Sans', system-ui, sans-serif",
 }}
 >
 {hint}
 </button>
 ))}
 </div>
 <button
 onClick={handleLukaPromptSubmit}
 disabled={!lukaPromptInput.trim()}
 className={cn("luka-send-btn shrink-0", lukaPromptInput.trim() && "enabled")}
 >
 <Send className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Applied confirmation bar */}
 {phase === "applied" && (
 <div className="border-t border-border px-4 py-3 flex items-center gap-2 bg-green-50 dark:bg-green-900/20">
 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
 <span className="text-sm text-green-700 dark:text-green-400 font-medium">
 Responses applied to worksheets
 </span>
 </div>
 )}
 </div>
 );
}
