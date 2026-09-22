import { useState } from "react";
import { Checklist, Section, Question } from "@/types/checklist";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Info, Plus } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddToMyTemplatesDialog } from "@/components/AddToMyTemplatesDialog";

interface WorksheetViewProps {
 checklist: Checklist;
 onUpdate: (updated: Checklist) => void;
}

export function WorksheetView({ checklist, onUpdate }: WorksheetViewProps) {
 const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
 const [showAddDialog, setShowAddDialog] = useState(false);
 const [conclusion, setConclusion] = useState<string>("");

 /* ── helpers ─────────────────────────────────────────────────── */
 const updateQuestion = (
 sectionId: string,
 questionId: string,
 field: "text" | "answer" | "explanation" | "reference",
 value: string
 ) => {
 onUpdate({
...checklist,
 sections: checklist.sections.map((s) =>
 s.id !== sectionId
 ? s
 : {
...s,
 questions: s.questions.map((q) =>
 q.id !== questionId ? q : {...q, [field]: value }
 ),
 }
 ),
 updatedAt: new Date(),
 });
 };

 const updateSubQuestion = (
 sectionId: string,
 parentId: string,
 subId: string,
 field: "text" | "answer" | "explanation" | "reference",
 value: string
 ) => {
 onUpdate({
...checklist,
 sections: checklist.sections.map((s) =>
 s.id !== sectionId
 ? s
 : {
...s,
 questions: s.questions.map((q) =>
 q.id !== parentId
 ? q
 : {
...q,
 subQuestions: (q.subQuestions ?? []).map((sq) =>
 sq.id !== subId ? sq : {...sq, [field]: value }
 ),
 }
 ),
 }
 ),
 updatedAt: new Date(),
 });
 };

 const toggleRow = (id: string) => {
 setCheckedRows((prev) => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });
 };

 /* ── column config ───────────────────────────────────────────── */
 const cfg = checklist.worksheetConfig ?? {};
 const col3Label = cfg.col3Label ?? "Description";
 const col3Editable= cfg.col3Editable ?? false;
 const col4Label = cfg.col4Label ?? "Procedure successfully completed";
 const col4Options = cfg.col4Options ?? ["Yes", "No", "N/A"];
 const col5Label = cfg.col5Label ?? "Responses and any difficulties encountered";

 /* ── flat row counter (shared across sections) ───────────────── */
 let rowCounter = 0;

 /* ── shared column-header row (reused per section table) ─────── */
 const ColumnHeaders = () => (
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="w-10 px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider" />
 <th className="w-12 px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">#</th>
 <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">{col3Label}</th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider" style={{ width: 172, minWidth: 172 }}>{col4Label}</th>
 <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">{col5Label}</th>
 <th className="px-6 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider" style={{ width: 88, minWidth: 88 }}>W/P Ref</th>
 </tr>
 </thead>
 );

 /* ── question row renderer ───────────────────────────────────── */
 const QuestionRow = ({
 question,
 section,
 rowNum,
 }: {
 question: Question;
 section: Section;
 rowNum: number;
 }) => (
 <>
 <tr className="hover:bg-muted/50 transition-colors group">
 <td className="px-4 py-2.5 text-center align-top">
 <Checkbox
 checked={checkedRows.has(question.id)}
 onCheckedChange={() => toggleRow(question.id)}
 />
 </td>
 <td className="px-4 py-2.5 text-center align-top text-xs text-muted-foreground font-mono">
 {rowNum}
 </td>
 {/* col3 */}
 <td className="px-6 py-2.5 align-top">
 {col3Editable ? (
 <Textarea
 placeholder="Enter description…"
 className="min-h-[52px] text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent"
 value={question.text.replace(/<[^>]*>/g, "")}
 onChange={(e) =>
 updateQuestion(section.id, question.id, "text", e.target.value)
 }
 />
 ) : (
 <div
 className="text-sm text-foreground prose prose-sm max-w-none"
 dangerouslySetInnerHTML={{ __html: question.text }}
 />
 )}
 </td>
 {/* col4 */}
 <td className="px-4 py-2.5 align-top" style={{ width: 172 }}>
 <Select
 value={question.answer ?? ""}
 onValueChange={(val) =>
 updateQuestion(section.id, question.id, "answer", val)
 }
 >
 <SelectTrigger className="h-8 text-sm w-full">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent>
 {col4Options.map((opt) => (
 <SelectItem key={opt} value={opt} className="text-sm">
 {opt}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 {/* col5 */}
 <td className="px-6 py-2.5 align-top">
 <Textarea
 placeholder="Enter response…"
 className="min-h-[52px] text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent"
 value={question.explanation ?? ""}
 onChange={(e) =>
 updateQuestion(section.id, question.id, "explanation", e.target.value)
 }
 />
 </td>
 {/* W/P ref */}
 <td className="px-4 py-2.5 align-top text-center" style={{ width: 88 }}>
 <Textarea
 placeholder="—"
 className="min-h-[52px] text-xs resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent text-center"
 value={question.reference ?? ""}
 onChange={(e) =>
 updateQuestion(section.id, question.id, "reference", e.target.value)
 }
 />
 </td>
 </tr>

 {/* sub-questions */}
 {(question.subQuestions ?? []).map((sub, subIdx) => (
 <tr
 key={`sub-${sub.id}`}
 className="bg-muted/[0.03] hover:bg-muted/40 transition-colors"
 >
 <td className="px-4 py-2 text-center align-top">
 <Checkbox
 checked={checkedRows.has(sub.id)}
 onCheckedChange={() => toggleRow(sub.id)}
 />
 </td>
 <td className="px-4 py-2 text-center align-top text-xs text-muted-foreground font-mono">
 {String.fromCharCode(97 + subIdx)}
 </td>
 <td className="py-2 pl-12 pr-6 align-top border-l-2 border-primary/20">
 {col3Editable ? (
 <Textarea
 placeholder="Enter description…"
 className="min-h-[44px] text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent"
 value={sub.text.replace(/<[^>]*>/g, "")}
 onChange={(e) =>
 updateSubQuestion(section.id, question.id, sub.id, "text", e.target.value)
 }
 />
 ) : (
 <div
 className="text-sm text-foreground prose prose-sm max-w-none"
 dangerouslySetInnerHTML={{ __html: sub.text }}
 />
 )}
 </td>
 <td className="px-4 py-2 align-top" style={{ width: 172 }}>
 <Select
 value={sub.answer ?? ""}
 onValueChange={(val) =>
 updateSubQuestion(section.id, question.id, sub.id, "answer", val)
 }
 >
 <SelectTrigger className="h-8 text-sm w-full">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent>
 {col4Options.map((opt) => (
 <SelectItem key={opt} value={opt} className="text-sm">
 {opt}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-6 py-2 align-top">
 <Textarea
 placeholder="Enter response…"
 className="min-h-[44px] text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent"
 value={sub.explanation ?? ""}
 onChange={(e) =>
 updateSubQuestion(section.id, question.id, sub.id, "explanation", e.target.value)
 }
 />
 </td>
 <td className="px-4 py-2 align-top text-center" style={{ width: 88 }}>
 <Textarea
 placeholder="—"
 className="min-h-[44px] text-xs resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent text-center"
 value={sub.reference ?? ""}
 onChange={(e) =>
 updateSubQuestion(section.id, question.id, sub.id, "reference", e.target.value)
 }
 />
 </td>
 </tr>
 ))}
 </>
 );

 /* ─────────────────────────────────────────────────────────────── */
 return (
 <TooltipProvider>
 <div className="flex flex-col h-full">

 {/* ── Top toolbar ───────────────────────────────────────── */}
 <div className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
 <h1 className="text-lg font-semibold text-foreground">{checklist.title}</h1>
 <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
 <Plus className="h-4 w-4 mr-1" />
 Add to My Templates
 </Button>
 </div>

 {/* ── Scrollable body ───────────────────────────────────── */}
 <div className="flex-1 overflow-y-auto bg-muted/30">
 {/* ── Objective bar ─────────────────────────────────────── */}
 {checklist.objective && (
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-base font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-base text-muted-foreground flex-1 leading-relaxed">
 {checklist.objective}
 </p>
 </div>
 )}
 <div className="p-6 space-y-4">

 {/* ── One card per section ────────────────────────── */}
 {checklist.sections.map((section) => (
 <div
 key={section.id}
 className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden"
 >
 {/* Section title bar */}
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">{section.title}</span>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full">
 <ColumnHeaders />
 <tbody className="divide-y divide-border">
 {section.questions.map((question) => {
 rowCounter += 1;
 const rowNum = rowCounter;
 return (
 <QuestionRow
 key={question.id}
 question={question}
 section={section}
 rowNum={rowNum}
 />
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 ))}

 {/* ── Conclusion card ───────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 </div>
 <div className="px-6 py-5">
 <Textarea
 placeholder="Document your conclusion and overall assessment…"
 className="min-h-[80px] text-sm resize-none bg-background"
 value={conclusion}
 onChange={(e) => setConclusion(e.target.value)}
 />
 <div className="flex justify-end mt-4">
 <Button>Conclude worksheet</Button>
 </div>
 </div>
 </div>

 </div>
 </div>

 {/* ── Dialog ────────────────────────────────────────────── */}
 <AddToMyTemplatesDialog
 open={showAddDialog}
 onOpenChange={setShowAddDialog}
 checklist={checklist}
 checklistName={checklist.title}
 />
 </div>
 </TooltipProvider>
 );
}
