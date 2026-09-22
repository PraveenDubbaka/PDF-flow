import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, AlertTriangle } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type YesNo = "yes" | "no" | "";

interface SAEState {
 expertRequired: YesNo;
 expertiseAreas: string[];
 expertiseOther: string;
 evidenceTypes: string[];
 scopeDescription: string;
 competenceNotes: string;
 objectivityThreat: YesNo;
 objectivityNotes: string;
 subjectToQC: YesNo;
 understandingNotes: string;
 termsChecked: string[];
 writtenAgreement: YesNo;
 wpRef: RefDoc[];
 conclusion: string;
 preparedBy: string;
 preparedDate: string;
 reviewedBy: string;
 reviewedDate: string;
 concluded: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPERTISE_AREAS = [
 { id: "valuation", label: "Valuation of complex financial instruments, land & buildings, plant & machinery, jewellery, works of art, antiques, intangible assets, business combinations or impaired assets" },
 { id: "actuarial", label: "Actuarial calculation of liabilities (insurance contracts or employee benefit plans)" },
 { id: "oil-gas", label: "Estimation of oil and gas reserves" },
 { id: "environmental", label: "Valuation of environmental liabilities and site clean-up costs" },
 { id: "legal", label: "Interpretation of contracts, laws and regulations" },
 { id: "tax", label: "Analysis of complex or unusual tax compliance issues" },
 { id: "other", label: "Other (specify below)" },
];

const EVIDENCE_TYPES = [
 { id: "understanding", label: "Obtaining an understanding of the entity and its environment, including internal controls" },
 { id: "risk", label: "Identifying and assessing risks of material misstatement" },
 { id: "response", label: "Determining and implementing overall responses to assessed risks" },
 { id: "procedures", label: "Designing and performing further audit procedures to respond to assessed risks" },
 { id: "evaluation", label: "Evaluating the sufficiency and appropriateness of audit evidence in forming an opinion" },
];

const TERMS_CHECKLIST = [
 { id: "nature-scope", label: "Nature, scope and objectives of the expert's work are defined" },
 { id: "roles", label: "Respective roles and responsibilities of the auditor and expert are documented" },
 { id: "communication", label: "Nature, timing and extent of communication (including report form) is agreed" },
 { id: "confidentiality", label: "Expert is required to observe confidentiality requirements" },
];

const STORAGE_KEY = "audit-sae-data";

function loadState(): Partial<SAEState> {
 try {
 const raw = localStorage.getItem(STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch { return {}; }
}

function saveState(s: SAEState) {
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditSAEWorksheet({ isUS }: { isUS?: boolean }) {
 const { engagementId = "" } = useParams<{ engagementId: string }>();
 const saved = loadState();

 const [expertRequired, setExpertRequired] = useState<YesNo>(saved.expertRequired ?? "");
 const [expertiseAreas, setExpertiseAreas] = useState<string[]>(saved.expertiseAreas ?? []);
 const [expertiseOther, setExpertiseOther] = useState(saved.expertiseOther ?? "");
 const [evidenceTypes, setEvidenceTypes] = useState<string[]>(saved.evidenceTypes ?? []);
 const [scopeDescription, setScopeDescription] = useState(saved.scopeDescription ?? "");
 const [competenceNotes, setCompetenceNotes] = useState(saved.competenceNotes ?? "");
 const [objectivityThreat, setObjectivityThreat] = useState<YesNo>(saved.objectivityThreat ?? "");
 const [objectivityNotes, setObjectivityNotes] = useState(saved.objectivityNotes ?? "");
 const [subjectToQC, setSubjectToQC] = useState<YesNo>(saved.subjectToQC ?? "");
 const [understandingNotes, setUnderstandingNotes] = useState(saved.understandingNotes ?? "");
 const [termsChecked, setTermsChecked] = useState<string[]>(saved.termsChecked ?? []);
 const [writtenAgreement, setWrittenAgreement] = useState<YesNo>(saved.writtenAgreement ?? "");
 const [wpRef, setWpRef] = useState<RefDoc[]>(saved.wpRef ?? []);
 const [conclusion, setConclusion] = useState(saved.conclusion ?? "");
 const [preparedBy, setPreparedBy] = useState(saved.preparedBy ?? "");
 const [preparedDate, setPreparedDate] = useState(saved.preparedDate ?? "");
 const [reviewedBy, setReviewedBy] = useState(saved.reviewedBy ?? "");
 const [reviewedDate, setReviewedDate] = useState(saved.reviewedDate ?? "");
 const [concluded, setConcluded] = useState(saved.concluded ?? false);

 const expertNeeded = expertRequired === "yes";
 const notNeeded = expertRequired === "no";

 function persist(patch: Partial<SAEState> = {}) {
 saveState({
 expertRequired, expertiseAreas, expertiseOther, evidenceTypes, scopeDescription,
 competenceNotes, objectivityThreat, objectivityNotes, subjectToQC, understandingNotes,
 termsChecked, writtenAgreement, wpRef, conclusion, preparedBy, preparedDate,
 reviewedBy, reviewedDate, concluded,...patch,
 });
 }

 function toggleArea(id: string) {
 const next = expertiseAreas.includes(id) ? expertiseAreas.filter(a => a !== id) : [...expertiseAreas, id];
 setExpertiseAreas(next); persist({ expertiseAreas: next });
 }

 function toggleEvidence(id: string) {
 const next = evidenceTypes.includes(id) ? evidenceTypes.filter(a => a !== id) : [...evidenceTypes, id];
 setEvidenceTypes(next); persist({ evidenceTypes: next });
 }

 function toggleTerm(id: string) {
 const next = termsChecked.includes(id) ? termsChecked.filter(a => a !== id) : [...termsChecked, id];
 setTermsChecked(next); persist({ termsChecked: next });
 }

 const step1Done = expertRequired !== "";
 const step2Done = expertNeeded ? evidenceTypes.length > 0 : true;
 const step3Done = expertNeeded ? scopeDescription.trim().length > 0 : true;
 const step4Done = expertNeeded ? (competenceNotes.trim().length > 0 && objectivityThreat !== "" && subjectToQC !== "") : true;
 const step5Done = expertNeeded ? understandingNotes.trim().length > 0 : true;
 const step6Done = expertNeeded ? (termsChecked.length === TERMS_CHECKLIST.length && writtenAgreement !== "") : true;
 const allDone = step1Done && step2Done && step3Done && step4Done && step5Done && step6Done;


// Card shell — same as Materiality / PAP worksheets
 function Card({ title, subtitle, done, children }: {
 title: string; subtitle?: string; done?: boolean; children: React.ReactNode;
 }) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
 {done !== undefined && (
 <Badge variant={done ? "success" : "secondary"} className="ml-auto text-[10px] px-2 py-0.5">
 {done ? "Complete" : "Incomplete"}
 </Badge>
 )}
 </div>
 <div className="px-6 py-5">{children}</div>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Assist in the selection of an auditor's expert, plan the work to be performed, and agree on
 the terms of engagement. Using the work of an auditor's expert does not reduce the auditor's
 responsibility for the audit opinion.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* Step 1 */}
 <Card title="Step 1 — Expert Determination" subtitle="Is an auditor's expert required for this engagement?" done={step1Done}>
 <div className="space-y-4">
 <Select value={expertRequired} onValueChange={(v) => { setExpertRequired(v as YesNo); persist({ expertRequired: v as YesNo }); }} disabled={concluded}>
 <SelectTrigger className="h-9 text-sm w-40">
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="yes">Yes</SelectItem>
 <SelectItem value="no">No</SelectItem>
 </SelectContent>
 </Select>

 {notNeeded && (
 <p className="text-sm text-muted-foreground bg-muted rounded-md px-4 py-3">
 No auditor's expert required. Document the rationale in the Conclusion below and complete sign-off.
 </p>
 )}

 {expertNeeded && (
 <div className="space-y-3">
 <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Which area(s) of expertise are required?</p>
 <div className="space-y-2.5">
 {EXPERTISE_AREAS.map(area => (
 <div key={area.id} className="flex items-start gap-3">
 <Checkbox
 id={`area-${area.id}`}
 checked={expertiseAreas.includes(area.id)}
 onCheckedChange={() => toggleArea(area.id)}
 disabled={concluded}
 className="mt-0.5"
 />
 <label htmlFor={`area-${area.id}`} className="text-sm text-foreground leading-snug cursor-pointer select-none">
 {area.label}
 </label>
 </div>
 ))}
 </div>
 {expertiseAreas.includes("other") && (
 <Input
 value={expertiseOther}
 onChange={e => { setExpertiseOther(e.target.value); persist({ expertiseOther: e.target.value }); }}
 placeholder="Describe other expertise required…"
 className="h-9 text-sm"
 disabled={concluded}
 />
 )}
 </div>
 )}
 </div>
 </Card>

 {expertNeeded && (
 <>
 {/* Step 2 */}
 <Card title="Step 2 — Nature of Evidence" subtitle="What type of evidence will the expert provide?" done={step2Done}>
 <div className="space-y-2.5">
 {EVIDENCE_TYPES.map(ev => (
 <div key={ev.id} className="flex items-start gap-3">
 <Checkbox
 id={`ev-${ev.id}`}
 checked={evidenceTypes.includes(ev.id)}
 onCheckedChange={() => toggleEvidence(ev.id)}
 disabled={concluded}
 className="mt-0.5"
 />
 <label htmlFor={`ev-${ev.id}`} className="text-sm text-foreground leading-snug cursor-pointer select-none">
 {ev.label}
 </label>
 </div>
 ))}
 </div>
 </Card>

 {/* Step 3 */}
 <Card title="Step 3 — Nature, Scope & Objectives" subtitle="Describe the exact nature, timing and extent of the expert's work" done={step3Done}>
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground bg-muted rounded-md px-4 py-3">
 {[
 "Nature of the matter to which the expert's work relates",
 "Risks of material misstatement in that matter",
 "Significance of the expert's work in the context of the audit",
 "Auditor's knowledge of and experience with the expert",
 ].map((hint, i) => (
 <div key={i} className="flex items-start gap-1.5">
 <span className="text-muted-foreground/50 mt-px">•</span>
 <span>{hint}</span>
 </div>
 ))}
 </div>
 <Textarea
 value={scopeDescription}
 onChange={e => { setScopeDescription(e.target.value); persist({ scopeDescription: e.target.value }); }}
 placeholder="Document the nature, timing and extent of procedures to be performed by the expert…"
 className="min-h-[100px] text-sm resize-none bg-background"
 disabled={concluded}
 />
 </div>
 </Card>

 {/* Step 4 */}
 <Card title="Step 4 — Expert Assessment" subtitle="Evaluate competence, capabilities and objectivity" done={step4Done}>
 <div className="space-y-5">
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Competence & capabilities</label>
 <Textarea
 value={competenceNotes}
 onChange={e => { setCompetenceNotes(e.target.value); persist({ competenceNotes: e.target.value }); }}
 placeholder="Describe the expert's professional certifications, licensing, experience and reputation in the relevant field…"
 className="min-h-[80px] text-sm resize-none bg-background"
 disabled={concluded}
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
 Threats to objectivity?
 </label>
 <p className="text-sm text-muted-foreground">Are there interests or relationships that may create a threat to the expert's objectivity?</p>
 <Select value={objectivityThreat} onValueChange={(v) => { setObjectivityThreat(v as YesNo); persist({ objectivityThreat: v as YesNo }); }} disabled={concluded}>
 <SelectTrigger className="h-9 text-sm w-40">
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="yes">Yes</SelectItem>
 <SelectItem value="no">No</SelectItem>
 </SelectContent>
 </Select>
 {objectivityThreat === "yes" && (
 <div className="flex items-start gap-2 mt-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
 <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
 <Textarea
 value={objectivityNotes}
 onChange={e => { setObjectivityNotes(e.target.value); persist({ objectivityNotes: e.target.value }); }}
 placeholder="Describe the threat and how it has been addressed or mitigated…"
 className="min-h-[64px] text-sm resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none flex-1 text-amber-900 dark:text-amber-100 placeholder:text-amber-500/70"
 disabled={concluded}
 />
 </div>
 )}
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Subject to firm's quality control?</label>
 <div className="flex items-center gap-3">
 <Select value={subjectToQC} onValueChange={(v) => { setSubjectToQC(v as YesNo); persist({ subjectToQC: v as YesNo }); }} disabled={concluded}>
 <SelectTrigger className="h-9 text-sm w-40">
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="yes">Yes</SelectItem>
 <SelectItem value="no">No</SelectItem>
 </SelectContent>
 </Select>
 {subjectToQC === "no" && (
 <span className="text-sm text-muted-foreground">External expert — additional procedures may be required to evaluate their work.</span>
 )}
 </div>
 </div>
 </div>
 </Card>

 {/* Step 5 */}
 <Card title="Step 5 — Auditor's Understanding" subtitle="Document sufficient understanding of the expert's field to plan and evaluate their work" done={step5Done}>
 <div className="space-y-3">
 <div className="text-sm text-muted-foreground bg-muted rounded-md px-4 py-3 space-y-1">
 <p className="font-medium">Understanding must be sufficient to:</p>
 <div className="flex items-start gap-1.5"><span className="text-muted-foreground/50">•</span><span>Determine the nature, scope and objectives of the expert's work for audit purposes</span></div>
 <div className="flex items-start gap-1.5"><span className="text-muted-foreground/50">•</span><span>Evaluate the adequacy of the expert's work for our audit conclusions</span></div>
 </div>
 <Textarea
 value={understandingNotes}
 onChange={e => { setUnderstandingNotes(e.target.value); persist({ understandingNotes: e.target.value }); }}
 placeholder="Describe the understanding obtained of the relevant field of expertise (key assumptions, methodologies, applicable standards)…"
 className="min-h-[100px] text-sm resize-none bg-background"
 disabled={concluded}
 />
 </div>
 </Card>

 {/* Step 6 */}
 <Card title="Step 6 — Terms of Engagement" subtitle="Confirm a written agreement with the expert covers all required matters" done={step6Done}>
 <div className="space-y-4">
 <div className="space-y-2.5">
 {TERMS_CHECKLIST.map(term => (
 <div key={term.id} className="flex items-start gap-3">
 <Checkbox
 id={`term-${term.id}`}
 checked={termsChecked.includes(term.id)}
 onCheckedChange={() => toggleTerm(term.id)}
 disabled={concluded}
 className="mt-0.5"
 />
 <label htmlFor={`term-${term.id}`} className="text-sm text-foreground leading-snug cursor-pointer select-none">
 {term.label}
 </label>
 </div>
 ))}
 </div>
 <div className="flex items-center gap-4 pt-1 border-t border-border">
 <label className="text-sm font-medium text-foreground whitespace-nowrap">Written agreement obtained?</label>
 <Select value={writtenAgreement} onValueChange={(v) => { setWrittenAgreement(v as YesNo); persist({ writtenAgreement: v as YesNo }); }} disabled={concluded}>
 <SelectTrigger className="h-9 text-sm w-40">
 <SelectValue placeholder="Select…" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="yes">Yes</SelectItem>
 <SelectItem value="no">No</SelectItem>
 </SelectContent>
 </Select>
 <div className="flex items-center gap-2 ml-auto">
 <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">W/P Ref:</label>
 <RefButton
 reference={wpRef}
 onAttach={doc => { const next = [...wpRef, doc]; setWpRef(next); persist({ wpRef: next }); }}
 onRemove={idx => { const next = wpRef.filter((_, i) => i !== idx); setWpRef(next); persist({ wpRef: next }); }}
 disabled={concluded}
 />
 </div>
 </div>
 </div>
 </Card>
 </>
 )}

 {/* Conclusion */}
 {expertRequired !== "" && (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-2">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 <span className="text-sm text-muted-foreground">— Document the basis for the selection or rationale for not requiring an expert.</span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 value={conclusion}
 onChange={e => { setConclusion(e.target.value); persist({ conclusion: e.target.value }); }}
 placeholder={notNeeded
 ? "Document the rationale for not requiring an auditor's expert on this engagement…"
 : "Summarise the basis for the selection and any matters arising from the engagement of the expert…"}
 className="min-h-[72px] text-sm resize-none bg-background"
 disabled={concluded}
 />
 </div>
 </div>
 )}

 {/* Sign-off */}
 {expertRequired !== "" && (
 <WorksheetSignOff worksheetKey="sae" engagementId={engagementId} />
 )}

 {/* Conclude */}
 {expertRequired !== "" && (
 <div className="flex justify-end">
 <Button
 onClick={() => { setConcluded(true); persist({ concluded: true }); toast.success("SAE worksheet concluded"); }}
 disabled={concluded || !allDone}
 >
 {concluded ? "Worksheet concluded" : "Conclude worksheet"}
 </Button>
 </div>
 )}

 </div>
 </div>

 </div>
 );
}
