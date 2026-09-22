import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { sanitizeHtml } from '@/lib/sanitize';
import {
 Plus, Trash2, ChevronDown, ChevronRight, MoreHorizontal, Copy,
 GripVertical, PlusCircle, Circle, Square, Type, Calendar, AlignLeft,
 Paperclip, ToggleLeft, Menu, DollarSign, FileText, Upload, File, X,
 Check, Pencil, Asterisk, Loader2, Search, LayoutGrid, Columns2, Columns3,
 Hash, MessageSquare, BookOpen, List, Heading1, CaseSensitive, Undo2,
 Eye, EyeOff, CheckCircle2, PenLine } from
'lucide-react';
import { AddItemAboveIcon, AddItemBelowIcon } from './icons/AddItemIcons';
import { RefButton } from './RefButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { AITextarea } from '@/components/AITextarea';
import { RichTextQuestionEditor } from '@/components/RichTextQuestionEditor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormLayoutEditor } from '@/components/FormLayoutEditor';
import { AppendixBFaqDialog } from '@/components/AppendixBFaqDialog';
import { EditOptionsPopover } from '@/components/EditOptionsPopover';
import { Checklist, Question, Section, AnswerType, NumberingFormat, formatQuestionNumber, FormLayout, ColumnLayout, BorderStyle, CellBlockType, Assignee } from '@/types/checklist';
import {
 DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter,
 KeyboardSensor, PointerSensor, useSensor, useSensors } from
'@dnd-kit/core';
import {
 SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from
'@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CURRENT_USER, ROLE_LABELS } from '@/lib/useTimeEntries';
import { ChecklistSignOff } from '@/components/ChecklistSignOff';
import { useAttribution, AttributionBadge } from '@/components/ui/AttributedComment';

const CURRENT_USER_ASSIGNEE: Assignee = {
 id: 'current-user',
 name: CURRENT_USER.name,
 initials: CURRENT_USER.initials,
 role: 'Audit Staff',
 type: 'staff',
};
const stampedAssignee = (): Assignee => ({ ...CURRENT_USER_ASSIGNEE, at: new Date().toISOString() });

function formatAssigneeAt(iso: string): string {
 return new Date(iso).toLocaleString("en-CA", {
   month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
 });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentViewProps {
 checklist: Checklist;
 onUpdate: (checklist: Checklist) => void;
 isPreviewMode: boolean;
 isCompactMode?: boolean;
 selectedQuestions?: Set<string>;
 onSelectionChange?: (selected: Set<string>) => void;
 isEngagementMode?: boolean;
 applyingQuestionId?: string | null;
 isGlobalTemplate?: boolean;
 objectiveExpanded?: boolean;
 onToggleObjective?: () => void;
}

// ─── Answer type config ──────────────────────────────────────────────────────

const ANSWER_TYPE_OPTIONS: {
 value: AnswerType;label: string;icon: React.ElementType;
 bgColor: string;iconColor: string;
}[] = [
{ value: 'yes-no', label: 'Yes / No', icon: Circle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
{ value: 'yes-no-na', label: 'Yes / No / NA', icon: Circle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
{ value: 'multiple-choice', label: 'Multiple Choice', icon: Square, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
{ value: 'date', label: 'Date', icon: Calendar, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
{ value: 'long-answer', label: 'Answer', icon: AlignLeft, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
{ value: 'amount', label: 'Amount', icon: DollarSign, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
{ value: 'dropdown', label: 'Dropdown', icon: Menu, bgColor: 'bg-teal-100', iconColor: 'text-teal-600' },
{ value: 'toggle', label: 'Switch/Toggle', icon: ToggleLeft, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' }];


// ─── Response Type Picker ────────────────────────────────────────────────────

function ResponseTypePicker({ currentType, onTypeChange

}: {currentType: AnswerType;onTypeChange: (t: AnswerType) => void;}) {
 const [isOpen, setIsOpen] = useState(false);
 const cfg = ANSWER_TYPE_OPTIONS.find((o) => o.value === currentType) || ANSWER_TYPE_OPTIONS[0];
 const Icon = cfg.icon;

 return (
 <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <button
 onClick={(e) => e.stopPropagation()}
 className="dv-response-type flex items-center justify-center p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover/q:opacity-100 ml-auto"
 title={cfg.label}>

 <div className={`w-6 h-6 rounded flex items-center justify-center ${cfg.bgColor}`}>
 <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
 </div>
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-64 p-2 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 <div className="grid grid-cols-2 gap-1">
 {ANSWER_TYPE_OPTIONS.map((opt) => {
 const I = opt.icon;
 return (
 <button
 key={opt.value}
 onClick={() => {onTypeChange(opt.value);setIsOpen(false);}}
 className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
 opt.value === currentType ? 'bg-muted' : 'hover:bg-muted/50'}`
 }>

 <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center ${opt.bgColor}`}>
 <I className={`h-3 w-3 ${opt.iconColor}`} />
 </div>
 <span className="text-popover-foreground truncate">{opt.label}</span>
 </button>);

 })}
 </div>
 </PopoverContent>
 </Popover>);

}

// ─── Response Field ──────────────────────────────────────────────────────────

function ResponseField({ question, onUpdate, isPreviewMode, isEngagementMode = false

}: {question: Question;onUpdate: (q: Question) => void;isPreviewMode: boolean;isEngagementMode?: boolean;}) {
 const hideEditOptions = isPreviewMode || (isEngagementMode && !question.isUserAdded);
 const handleAnswer = (answer: string) => {
 const updated: Question = {...question, answer };
 if (isEngagementMode) {
 updated.answeredBy = answer ? stampedAssignee() : undefined;
 }
 onUpdate(updated);
 };

 switch (question.answerType) {
 case 'yes-no':
 case 'yes-no-na':{
 const defaultOpts = question.answerType === 'yes-no' ? ['Yes', 'No'] : ['Yes', 'No', 'NA'];
 const opts = question.options || defaultOpts;
 return (
 <div className="flex items-center justify-start gap-1.5 w-full">
 {opts.map((opt) =>
 <button
 key={opt}
 onClick={(e) => {e.stopPropagation();handleAnswer(opt);}}
 className={`px-3 py-1 text-xs rounded-full transition-all ${
 question.answer === opt ?
 'bg-primary text-primary-foreground shadow-sm' :
 'bg-muted hover:bg-muted/80 text-foreground'}`
 }>

 {opt === 'Not Applicable' ? 'NA' : opt}
 </button>
 )}
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdate({...question, options: newOpts })}
 />
 )}
 </div>);

 }
 case 'multiple-choice':{
 const opts = question.options || ['Option 1', 'Option 2'];
 const selected = question.answer ? question.answer.split('|||').filter(Boolean) : [];
 return (
 <div className="flex items-center flex-wrap gap-1.5 py-[5px]">
 {opts.map((opt, i) => {
 const isSel = selected.includes(opt);
 return (
 <button
 key={i}
 onClick={(e) => {
 e.stopPropagation();
 const next = isSel ? selected.filter((a) => a !== opt) : [...selected, opt];
 onUpdate({...question, answer: next.join('|||') });
 }}
 className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 text-left ${
 isSel ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-foreground'}`
 }>

 {isSel && <Check className="h-3 w-3" />}
 {opt}
 </button>);

 })}
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdate({...question, options: newOpts })}
 />
 )}
 </div>);

 }
 case 'dropdown':{
 const opts = question.options || ['Option 1', 'Option 2'];
 return (
 <div className="flex items-center gap-1.5">
 <select
 value={question.answer || ''}
 onChange={(e) => handleAnswer(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 className="h-8 px-2 text-sm bg-muted border-border text-foreground rounded min-w-[120px]">

 <option value="">Select...</option>
 {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
 </select>
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdate({...question, options: newOpts })}
 />
 )}
 </div>);

 }
 case 'long-answer':
 case 'answer':
 return (
 <AITextarea
 value={question.answer || ''}
 onChange={(val) => handleAnswer(val)}
 placeholder={question.placeholder || "Answer..."}
 minHeight="48px" />);


 case 'date':
 return (
 <Input
 type="date"
 value={question.answer || ''}
 onChange={(e) => handleAnswer(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 className="h-8 text-sm bg-muted border-border text-foreground w-fit" />);


 case 'amount':
 return (
 <div className="relative">
 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
 <Input
 type="number"
 value={question.answer || ''}
 onChange={(e) => handleAnswer(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 placeholder="0.00"
 className="h-8 text-sm bg-muted border-border text-foreground pl-6 w-32" />

 </div>);

 case 'file-upload':
 return question.answer ?
 <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
 <File className="h-3 w-3" />
 <span className="truncate max-w-[100px]">{question.answer}</span>
 {!isPreviewMode &&
 <button onClick={() => handleAnswer('')} className="hover:text-red-500"><X className="h-3 w-3" /></button>
 }
 </div> :

 <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted rounded cursor-pointer hover:bg-muted/80">
 <Upload className="h-3.5 w-3.5" /><span>Upload</span>
 <input type="file" className="hidden" onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleAnswer(file.name);
 }} />
 </label>;

 case 'toggle':
 return (
 <button
 onClick={(e) => {e.stopPropagation();handleAnswer(question.answer === 'true' ? 'false' : 'true');}}
 className={`w-10 h-5 rounded-full transition-colors relative ${
 question.answer === 'true' ? 'bg-primary' : 'bg-muted'}`
 }>

 <div className={`absolute top-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${
 question.answer === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`
 } />
 </button>);

 case 'none':
 return null;
 default:
 return (
 <Input
 value={question.answer || ''}
 onChange={(e) => handleAnswer(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 placeholder="Enter response..."
 className="h-8 text-sm bg-muted border-border text-foreground" />);


 }
}

// ─── Border option labels ────────────────────────────────────────────────────

const BORDER_OPTIONS: {value: BorderStyle;label: string;}[] = [
{ value: 'all', label: 'All borders' },
{ value: 'separator', label: 'Column separators' },
{ value: 'top', label: 'Top border' },
{ value: 'right', label: 'Right border' },
{ value: 'bottom', label: 'Bottom border' },
{ value: 'left', label: 'Left border' },
{ value: 'none', label: 'No borders' }];


// ─── Cell Block Type options ─────────────────────────────────────────────────

const CELL_BLOCK_OPTIONS: {value: CellBlockType;label: string;icon: React.ElementType;bgColor: string;iconColor: string;}[] = [
// Same as Q/A response types
{ value: 'yes-no', label: 'Yes / No', icon: Circle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
{ value: 'yes-no-na', label: 'Yes / No / NA', icon: Circle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
{ value: 'multiple-choice', label: 'Multiple Choice', icon: Square, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
{ value: 'date', label: 'Date', icon: Calendar, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
{ value: 'long-answer', label: 'Answer', icon: AlignLeft, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
{ value: 'amount', label: 'Amount', icon: DollarSign, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
{ value: 'dropdown', label: 'Dropdown', icon: Menu, bgColor: 'bg-teal-100', iconColor: 'text-teal-600' },
{ value: 'toggle', label: 'Switch/Toggle', icon: ToggleLeft, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' },
// Additional options

{ value: 'explanation', label: 'Explanation', icon: FileText, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },

// Structure types
{ value: 'text', label: 'Text', icon: Type, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' },
{ value: 'signoff', label: 'Signoff', icon: PenLine, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' }];





// ─── Cell Content Renderer ──────────────────────────────────────────────────

function CellContentRenderer({
 cell, cellIdx, onUpdateCell, onUpdateCellType, onUpdateCellSubItems, onUpdateCellPlaceholder, isPreviewMode, isEngagementMode = false
}: {cell: {id: string;content: string;blockType?: CellBlockType;subItems?: string[];placeholder?: string;};cellIdx: number;onUpdateCell: (idx: number, content: string) => void;onUpdateCellType: (idx: number, blockType: CellBlockType | undefined) => void;onUpdateCellSubItems: (idx: number, subItems: string[]) => void;onUpdateCellPlaceholder?: (idx: number, placeholder: string) => void;isPreviewMode: boolean;isEngagementMode?: boolean;}) {
 const hideEditOptions = isPreviewMode || isEngagementMode;
 const [pickerOpen, setPickerOpen] = useState(false);
 const [previousType, setPreviousType] = useState<{blockType: CellBlockType; content: string} | null>(null);
 const [pendingSmartType, setPendingSmartType] = useState<string | null>(null);
 const [isDragOver, setIsDragOver] = useState(false);
 const cellRef = useRef<HTMLDivElement>(null);

 // Native HTML5 drop handlers for smart layout drag-and-drop
 const handleDragOver = useCallback((e: React.DragEvent) => {
 if (e.dataTransfer.types.includes('application/smart-layout-type')) {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'copy';
 setIsDragOver(true);
 }
 }, []);

 const handleDragLeave = useCallback(() => {
 setIsDragOver(false);
 }, []);

 const handleDrop = useCallback((e: React.DragEvent) => {
 e.preventDefault();
 setIsDragOver(false);
 const type = e.dataTransfer.getData('application/smart-layout-type');
 if (type) {
 onUpdateCellType(cellIdx, type as CellBlockType);
 }
 }, [cellIdx, onUpdateCellType]);
 const blockType = cell.blockType;
 const hasContent = cell.content.trim().length > 0;

 // Listen for smart-layout-activate: enter placement mode on all cells
 useEffect(() => {
 const activateHandler = (e: Event) => {
 const detail = (e as CustomEvent).detail;
 if (detail?.type) {
 setPendingSmartType(detail.type);
 }
 };
 const cancelHandler = () => setPendingSmartType(null);
 const escHandler = (e: KeyboardEvent) => {
 if (e.key === 'Escape') setPendingSmartType(null);
 };
 document.addEventListener('smart-layout-activate', activateHandler);
 document.addEventListener('smart-layout-cancel', cancelHandler);
 document.addEventListener('keydown', escHandler);
 return () => {
 document.removeEventListener('smart-layout-activate', activateHandler);
 document.removeEventListener('smart-layout-cancel', cancelHandler);
 document.removeEventListener('keydown', escHandler);
 };
 }, []);

 const handleTypeSelect = (type: CellBlockType) => {
 onUpdateCellType(cellIdx, type);
 setPreviousType(null);
 setPendingSmartType(null);
 setPickerOpen(false);
 };

 const handleClearType = () => {
 if (blockType) {
 setPreviousType({ blockType, content: cell.content });
 }
 onUpdateCellType(cellIdx, undefined);
 setPickerOpen(false);
 };

 const handleUndoClear = () => {
 if (previousType) {
 onUpdateCellType(cellIdx, previousType.blockType);
 onUpdateCell(cellIdx, previousType.content);
 setPreviousType(null);
 }
 };

 // Render based on block type
 const renderContent = () => {
 switch (blockType) {
 case 'heading':
 return (
 <input
 type="text"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 placeholder={cell.placeholder || "Heading..."}
 disabled={isPreviewMode}
 className="w-full bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none" />);


 case 'small-text':
 return (
 <input
 type="text"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 placeholder={cell.placeholder || "Small text..."}
 disabled={isPreviewMode}
 className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/30 outline-none" />);


 case 'question-number':
 return (
 <div className="flex items-center gap-2">
 <span className="shrink-0 w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
 <Hash className="h-3 w-3" />
 </span>
 <input
 type="text"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 placeholder={cell.placeholder || "Q1, Q2..."}
 disabled={isPreviewMode}
 className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none" />

 </div>);

 case 'reference-number':
 return (
 <div className="flex items-center gap-2">
 <span className="shrink-0 w-6 h-6 rounded bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center">
 <BookOpen className="h-3 w-3" />
 </span>
 <input
 type="text"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 placeholder={cell.placeholder || "Ref #..."}
 disabled={isPreviewMode}
 className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none" />

 </div>);

 case 'sub-items':{
 const items = cell.subItems && cell.subItems.length > 0 ? cell.subItems : [''];
 return (
 <div className="space-y-1">
 {items.map((item, i) =>
 <div key={i} className="flex items-center gap-1.5">
 <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
 <input
 type="text"
 value={item}
 onChange={(e) => {
 const newItems = [...items];
 newItems[i] = e.target.value;
 if (i === items.length - 1 && e.target.value.length > 0) {
 newItems.push('');
 }
 onUpdateCell(cellIdx, newItems.filter((s, idx) => idx === 0 || s.trim().length > 0 || idx === newItems.length - 1).join('\n'));
 }}
 placeholder={i === 0 ? 'Add line item...' : ''}
 disabled={isPreviewMode}
 className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/30 outline-none" />

 </div>
 )}
 </div>);

 }
 // ── Q/A Response types (same as ResponseField) ──
 case 'yes-no':
 case 'yes-no-na':{
 const defaultOpts = blockType === 'yes-no' ? ['Yes', 'No'] : ['Yes', 'No', 'NA'];
 const opts = cell.subItems && cell.subItems.length > 0 ? cell.subItems : defaultOpts;
 return (
 <div className="flex items-center gap-1.5">
 {opts.map((opt) =>
 <button
 key={opt}
 onClick={(e) => {e.stopPropagation();onUpdateCell(cellIdx, opt);}}
 className={`px-3 py-1 text-xs rounded-full transition-all ${
 cell.content === opt ?
 'bg-primary text-primary-foreground shadow-sm' :
 'bg-muted hover:bg-muted/80 text-foreground'}`
 }>

 {opt}
 </button>
 )}
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdateCellSubItems(cellIdx, newOpts)}
 />
 )}
 </div>);

 }
 case 'multiple-choice':{
 const opts = cell.subItems && cell.subItems.length > 0 ? cell.subItems : ['Option 1', 'Option 2'];
 const selected = cell.content ? cell.content.split('|||').filter(Boolean) : [];
 return (
 <div className="flex items-center flex-wrap gap-1.5">
 {opts.map((opt, i) => {
 const isSel = selected.includes(opt);
 return (
 <button
 key={i}
 onClick={(e) => {
 e.stopPropagation();
 const newSel = isSel ? selected.filter((s) => s !== opt) : [...selected, opt];
 onUpdateCell(cellIdx, newSel.join('|||'));
 }}
 className={`px-3 py-1 text-xs rounded-full transition-all ${
 isSel ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'}`
 }>

 {opt}
 </button>);

 })}
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdateCellSubItems(cellIdx, newOpts)}
 />
 )}
 </div>);

 }
 case 'date':
 return (
 <input
 type="date"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 disabled={isPreviewMode}
 className="w-fit bg-transparent text-sm text-foreground outline-none" />);


 case 'amount':
 return (
 <div className="flex items-center gap-1">
 <span className="text-muted-foreground text-sm">$</span>
 <input
 type="number"
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 placeholder="0.00"
 disabled={isPreviewMode}
 className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none" />

 </div>);

 case 'dropdown':{
 const opts = cell.subItems && cell.subItems.length > 0 ? cell.subItems : ['Option 1', 'Option 2'];
 return (
 <div className="flex items-center gap-1.5">
 <select
 value={cell.content}
 onChange={(e) => onUpdateCell(cellIdx, e.target.value)}
 disabled={isPreviewMode}
 className="flex-1 bg-transparent text-sm text-foreground outline-none border-none">

 <option value="">Select...</option>
 {opts.map((opt, i) =>
 <option key={i} value={opt}>{opt}</option>
 )}
 </select>
 {!hideEditOptions && (
 <EditOptionsPopover
 options={opts}
 onSave={(newOpts) => onUpdateCellSubItems(cellIdx, newOpts)}
 />
 )}
 </div>);

 }
 case 'toggle':
 return (
 <button
 onClick={(e) => {e.stopPropagation();onUpdateCell(cellIdx, cell.content === 'true' ? 'false' : 'true');}}
 className={`w-10 h-5 rounded-full transition-colors ${
 cell.content === 'true' ? 'bg-primary' : 'bg-muted'} relative`
 }>

 <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
 cell.content === 'true' ? 'left-5' : 'left-0.5'}`
 } />
 </button>);

 // ── Text area types (use AITextarea like Explanation) ──
 case 'long-answer':
 case 'answer':
 case 'free-text':
 case 'explanation':
 case 'response':
 return (
 <div className="w-full overflow-hidden">
 <AITextarea
 value={cell.content}
 onChange={(val) => onUpdateCell(cellIdx, val)}
 placeholder={
 cell.placeholder ? cell.placeholder :
 blockType === 'explanation' ? 'Additional Explanation' :
 blockType === 'long-answer' ? 'Enter answer...' :
 blockType === 'response' ? 'Enter response...' :
 'Enter text...'
 }
 minHeight="40px"
 isCompactMode
 disabled={isPreviewMode}
 onPlaceholderChange={!isPreviewMode && onUpdateCellPlaceholder ? (val) => onUpdateCellPlaceholder(cellIdx, val) : undefined} />

 </div>);

 case 'text':
 if (isPreviewMode) {
 return (
 <div className="w-full px-1 py-1 text-sm text-foreground whitespace-pre-wrap break-words min-h-[36px] flex items-center">
 {cell.content || ''}
 </div>
 );
 }
 return (
 <div className="w-full overflow-hidden">
 <AITextarea
 value={cell.content}
 onChange={(val) => onUpdateCell(cellIdx, val)}
 placeholder={cell.placeholder || "Start typing..."}
 minHeight="40px"
 onPlaceholderChange={!isPreviewMode && onUpdateCellPlaceholder ? (val) => onUpdateCellPlaceholder(cellIdx, val) : undefined} />
 </div>);


 case 'signoff': {
 const isSigned = cell.content.length > 0;
 const parseSignoff = (raw: string) => {
 try {
 const parsed = JSON.parse(raw);
 if (parsed.signedAt) return parsed as { signedAt: string; name: string; role: string };
 } catch { /* legacy plain ISO string */ }
 return { signedAt: raw, name: CURRENT_USER.name, role: ROLE_LABELS[CURRENT_USER.roleKey] };
 };
 const formatSignDate = (iso: string) => {
 try {
 return new Date(iso).toLocaleString(undefined, {
 year: 'numeric', month: 'short', day: 'numeric',
 hour: '2-digit', minute: '2-digit',
 });
 } catch { return iso; }
 };
 // Signoff buttons are interactive in engagement mode even though the section is locked
 const canInteract = !isPreviewMode || isEngagementMode;
 if (isSigned) {
 const { signedAt, name, role } = parseSignoff(cell.content);
 return (
 <div className="flex items-center gap-3 py-1">
 {canInteract && (
 <button
 onClick={(e) => { e.stopPropagation(); onUpdateCell(cellIdx, ''); }}
 className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold rounded-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 h-8 transition-colors shrink-0"
 >
 Unsign
 </button>
 )}
 <div className="flex items-center gap-2 text-sm text-foreground">
 <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
 <span>Signed {formatSignDate(signedAt)} by <strong>{name}</strong>{role ? <span className="text-muted-foreground"> · {role}</span> : null}</span>
 </div>
 </div>
 );
 }
 return (
 <div className="py-1">
 <button
 onClick={(e) => {
 e.stopPropagation();
 onUpdateCell(cellIdx, JSON.stringify({
 signedAt: new Date().toISOString(),
 name: CURRENT_USER.name,
 role: ROLE_LABELS[CURRENT_USER.roleKey],
 }));
 }}
 disabled={!canInteract}
 className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 px-4 h-8 transition-colors disabled:opacity-50 disabled:pointer-events-none"
 >
 Sign Off
 </button>
 </div>
 );
 }

 default: // empty / undefined
 if (isPreviewMode) {
 return <div className="w-full min-h-[36px]" />;
 }
 return (
 <div className="w-full h-full min-h-[36px] flex items-center justify-center gap-1.5 relative">
 <div 
 className={`w-full h-full min-h-[36px] flex items-center justify-center cursor-pointer rounded border border-dashed transition-colors ${
 isDragOver
 ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
 : pendingSmartType 
 ? 'border-primary bg-primary/10 ring-2 ring-primary/30 animate-pulse' 
 : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'
 }`}
 onClick={() => {
 if (pendingSmartType) {
 onUpdateCellType(cellIdx, pendingSmartType as CellBlockType);
 setPendingSmartType(null);
 document.dispatchEvent(new CustomEvent('smart-layout-cancel'));
 } else {
 setPickerOpen(true);
 }
 }}
 >
 {isDragOver ? (
 <span className="text-[10px] text-primary font-medium">Drop here</span>
 ) : pendingSmartType ? (
 <span className="text-[10px] text-primary font-medium">Click to place</span>
 ) : (
 <Plus className="h-3.5 w-3.5 text-muted-foreground/30" />
 )}
 </div>
 {previousType && !pendingSmartType && (
 <button
 onClick={(e) => { e.stopPropagation(); handleUndoClear(); }}
 className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-medium hover:bg-amber-200 dark:hover:bg-amber-950/60 transition-colors shadow-sm border border-amber-200 dark:border-amber-700/40 z-10"
 title={`Undo clear – restore ${previousType.blockType}`}
 >
 <Undo2 className="h-2.5 w-2.5" />
 Undo
 </button>
 )}
 </div>);


 }
 };

 // Show type indicator picker + content inline
 const typeConfig = blockType ? CELL_BLOCK_OPTIONS.find((o) => o.value === blockType) : null;
 const TypeIcon = typeConfig?.icon;

 return (
 <div 
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 className={`h-full flex items-stretch gap-1 transition-all ${
 isDragOver ? 'ring-2 ring-primary/30 rounded bg-primary/10' : ''
 } ${
 pendingSmartType && blockType ? 'ring-2 ring-primary/30 rounded bg-primary/5 cursor-pointer' : ''
 }`}
 onClick={pendingSmartType && blockType ? () => {
 onUpdateCellType(cellIdx, pendingSmartType as CellBlockType);
 setPendingSmartType(null);
 document.dispatchEvent(new CustomEvent('smart-layout-cancel'));
 } : undefined}
 >
 {/* Empty state – picker popover anchored to the empty cell placeholder */}
 {!isPreviewMode && !typeConfig &&
 <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
 <PopoverTrigger asChild>
 <div className="absolute inset-0 pointer-events-none" />
 </PopoverTrigger>
 <PopoverContent align="start" className="w-80 p-2 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 <div className="grid grid-cols-2 gap-1">
 {CELL_BLOCK_OPTIONS.map((opt) => {
 const I = opt.icon;
 return (
 <button
 key={opt.value}
 onClick={() => handleTypeSelect(opt.value)}
 className="flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors hover:bg-muted/50">
 <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center ${opt.bgColor}`}>
 <I className={`h-3 w-3 ${opt.iconColor}`} />
 </div>
 <span className="text-popover-foreground truncate">{opt.label}</span>
 </button>);
 })}
 </div>
 </PopoverContent>
 </Popover>
 }
 {/* Content area – flex-grow */}
 <div className="flex-1 flex flex-col justify-center">
 {renderContent()}
 </div>
 {/* Block type picker – inline, right-aligned (only show when a type is selected) */}
 {!isPreviewMode && typeConfig && TypeIcon &&
 <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
 <PopoverTrigger asChild>
 <button
 onClick={(e) => e.stopPropagation()}
 className={`dv-response-type flex items-center justify-center p-1 hover:bg-muted rounded transition-colors shrink-0 ml-auto ${
 pickerOpen ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`
 }
 title={typeConfig.label}>

 <div className={`w-6 h-6 rounded flex items-center justify-center ${typeConfig.bgColor}`}>
 <TypeIcon className={`h-3.5 w-3.5 ${typeConfig.iconColor}`} />
 </div>
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-80 p-2 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 <div className="grid grid-cols-2 gap-1">
 {CELL_BLOCK_OPTIONS.map((opt) => {
 const I = opt.icon;
 return (
 <button
 key={opt.value}
 onClick={() => handleTypeSelect(opt.value)}
 className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
 opt.value === blockType ? 'bg-muted' : 'hover:bg-muted/50'}`
 }>

 <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center ${opt.bgColor}`}>
 <I className={`h-3 w-3 ${opt.iconColor}`} />
 </div>
 <span className="text-popover-foreground truncate">{opt.label}</span>
 </button>);

 })}
 </div>
 {/* Clear type option */}
 <div className="border-t border-border mt-1 pt-1">
 <button
 onClick={handleClearType}
 className="flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors hover:bg-muted/50 w-full text-muted-foreground"
 >
 <div className="w-5 h-5 shrink-0 rounded flex items-center justify-center bg-muted">
 <X className="h-3 w-3 text-muted-foreground" />
 </div>
 <span>Clear type</span>
 </button>
 </div>
 </PopoverContent>
 </Popover>
 }
 </div>);

}

// ─── Column Block Row ────────────────────────────────────────────────────────

function ColumnBlockRow({
 question, onUpdate, onDelete, onAddColumn, onDeleteColumn, isPreviewMode,
 isEngagementMode = false,
 isSelected, onSelectionChange




}: {question: Question;onUpdate: (q: Question) => void;onDelete: () => void;onAddColumn: () => void;onDeleteColumn: (colIdx: number) => void;isPreviewMode: boolean;isEngagementMode?: boolean;isSelected?: boolean;onSelectionChange?: (selected: boolean) => void;}) {
 const layout = question.columnLayout!;
 const [isFocused, setIsFocused] = useState(false);
 const [menuOpen, setMenuOpen] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);
 const resizingRef = useRef<{colIdx: number;startX: number;startWidths: number[];} | null>(null);
 const {
 attributes, listeners, setNodeRef, transform, transition, isDragging
 } = useSortable({
 id: question.id,
 data: { type: 'item', question }
 });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.4 : 1
 };

 const getWidths = (): number[] => {
 if (layout.columnWidths && layout.columnWidths.length === layout.columns) return layout.columnWidths;
 return Array(layout.columns).fill(1 / layout.columns);
 };

 const updateCell = (cellIdx: number, content: string) => {
 const newCells = [...layout.cells];
 newCells[cellIdx] = {...newCells[cellIdx], content };
 onUpdate({...question, columnLayout: {...layout, cells: newCells } });
 };

 const updateCellSubItems = (cellIdx: number, subItems: string[]) => {
 const newCells = [...layout.cells];
 newCells[cellIdx] = {...newCells[cellIdx], subItems };
 onUpdate({...question, columnLayout: {...layout, cells: newCells } });
 };

 const updateCellPlaceholder = (cellIdx: number, placeholder: string) => {
 const newCells = [...layout.cells];
 newCells[cellIdx] = {...newCells[cellIdx], placeholder };
 onUpdate({...question, columnLayout: {...layout, cells: newCells } });
 };

 const updateCellType = (cellIdx: number, blockType: CellBlockType | undefined) => {
 const newCells = [...layout.cells];
 const cell = newCells[cellIdx];
 if (blockType === undefined) {
 newCells[cellIdx] = {...cell, blockType: undefined, content: '' };
 } else {
 newCells[cellIdx] = {
...cell,
 blockType,
 subItems: blockType === 'sub-items' ? cell.content ? cell.content.split('\n') : [''] : cell.subItems
 };
 }
 onUpdate({...question, columnLayout: {...layout, cells: newCells } });
 };

 const borders = layout.borders || ['separator'];
 const hasBorder = (b: BorderStyle) => borders.includes(b);
 const hasAll = hasBorder('all');

 const toggleBorder = (b: BorderStyle) => {
 if (b === 'none') {
 onUpdate({...question, columnLayout: {...layout, borders: ['none'] } });
 return;
 }
 if (b === 'all') {
 onUpdate({...question, columnLayout: {...layout, borders: hasAll ? ['none'] : ['all'] } });
 return;
 }
 const filtered = borders.filter((x) => x !== 'none' && x !== 'all');
 const next = filtered.includes(b) ? filtered.filter((x) => x !== b) : [...filtered, b];
 onUpdate({...question, columnLayout: {...layout, borders: next.length ? next : ['none'] } });
 };

 const showTop = hasAll || hasBorder('top');
 const showRight = hasAll || hasBorder('right');
 const showBottom = hasAll || hasBorder('bottom');
 const showLeft = hasAll || hasBorder('left');
 const showSeparator = hasAll || hasBorder('separator');
 const hasAnyBorder = !hasBorder('none') && borders.length > 0;
 const allCellsEmpty = layout.cells.every(c => !c.blockType);

 const outerBorderStyle = isPreviewMode && allCellsEmpty ?
 'border border-transparent' :
 isFocused ?
 'border-2 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]' :
 hasAnyBorder ?
 `border ${showTop ? 'border-t-border' : 'border-t-transparent'} ${showRight ? 'border-r-border' : 'border-r-transparent'} ${showBottom ? 'border-b-border' : 'border-b-transparent'} ${showLeft ? 'border-l-border' : 'border-l-transparent'}` :
 'border border-transparent group-hover/block:border-[hsl(210_25%_88%)]';

 const handleResizeStart = (colIdx: number, e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 const startWidths = getWidths();
 resizingRef.current = { colIdx, startX: e.clientX, startWidths: [...startWidths] };

 const handleMouseMove = (ev: MouseEvent) => {
 if (!resizingRef.current || !containerRef.current) return;
 const containerWidth = containerRef.current.getBoundingClientRect().width;
 const delta = (ev.clientX - resizingRef.current.startX) / containerWidth;
 const { colIdx: ci, startWidths: sw } = resizingRef.current;
 const minWidth = 0.1;
 let newLeft = Math.max(minWidth, sw[ci] + delta);
 let newRight = Math.max(minWidth, sw[ci + 1] - delta);
 if (newLeft < minWidth) {newRight += minWidth - newLeft;newLeft = minWidth;}
 if (newRight < minWidth) {newLeft += minWidth - newRight;newRight = minWidth;}
 const newWidths = [...sw];
 newWidths[ci] = newLeft;
 newWidths[ci + 1] = newRight;
 onUpdate({...question, columnLayout: {...layout, columnWidths: newWidths } });
 };

 const handleMouseUp = () => {
 resizingRef.current = null;
 document.removeEventListener('mousemove', handleMouseMove);
 document.removeEventListener('mouseup', handleMouseUp);
 document.body.style.cursor = '';
 document.body.style.userSelect = '';
 };

 document.body.style.cursor = 'col-resize';
 document.body.style.userSelect = 'none';
 document.addEventListener('mousemove', handleMouseMove);
 document.addEventListener('mouseup', handleMouseUp);
 };

 const widths = getWidths();

 return (
 <div
 ref={setNodeRef}
 style={style}
 onClick={(e) => {
 if (onSelectionChange && !isPreviewMode && (e.target as HTMLElement).closest('[data-drag-handle]')) {
 e.stopPropagation();
 onSelectionChange(!isSelected);
 }
 }}
 className={`group/block relative my-1 ${isDragging ? 'z-10' : ''} ${isSelected ? 'ring-2 ring-primary/40 bg-primary/[0.04] rounded' : ''}`}
 tabIndex={-1}>

 {/* Floating "..." menu centered above */}
 {!isPreviewMode &&
 <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-opacity ${isFocused || menuOpen ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'}`}>
 <Popover open={menuOpen} onOpenChange={setMenuOpen}>
 <PopoverTrigger asChild>
 <button
 onMouseDown={(e) => e.preventDefault()}
 className="flex items-center justify-center w-7 h-5 rounded-[4px] bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-colors">

 <MoreHorizontal className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="center" side="top" sideOffset={4} className="w-48 p-1.5 bg-popover border-border shadow-xl z-50">
 <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">Borders</p>
 {BORDER_OPTIONS.map((opt) =>
 <button
 key={opt.value}
 onClick={() => toggleBorder(opt.value)}
 className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
 (opt.value === 'none' ? hasBorder('none') : hasBorder(opt.value)) ?
 'bg-primary/10 text-primary font-medium' :
 'text-popover-foreground hover:bg-muted'}`
 }>

 <span className="w-3.5 h-3.5 flex items-center justify-center">
 {(opt.value === 'none' ? hasBorder('none') : hasBorder(opt.value)) && <Check className="h-3 w-3" />}
 </span>
 {opt.label}
 </button>
 )}
 <div className="border-t border-border mt-1 pt-1">
 <button
 onClick={() => {onDelete();setMenuOpen(false);}}
 className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors">

 <Trash2 className="h-3.5 w-3.5" />
 Delete block
 </button>
 </div>
 </PopoverContent>
 </Popover>
 </div>
 }

 {/* Row with drag handle + columns + add button */}
 <div className={`flex items-stretch rounded-none transition-all ${outerBorderStyle}`}>
 {/* Drag handle on left */}
 {!isPreviewMode &&
 <div
 data-drag-handle
 {...attributes}
 {...listeners}
 onMouseEnter={() => !isPreviewMode && setIsFocused(true)}
 onMouseLeave={() => setIsFocused(false)}
 className={`flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors opacity-0 group-hover/block:opacity-100 ${isFocused ? 'opacity-100' : ''}`}>

 <GripVertical className="h-3.5 w-3.5" />
 </div>
 }

 {/* Column cells with resizable separators */}
 <div ref={containerRef} onClick={(e) => e.stopPropagation()} className="flex-1 flex items-stretch relative">
 {layout.cells.map((cell, ci) =>
 <div
 key={cell.id}
 className="relative group/cell"
 style={{ width: `${widths[ci] * 100}%` }}>

 {/* Delete column button */}
 {!isPreviewMode && layout.columns > 1 &&
 <button
 onClick={() => onDeleteColumn(ci)}
 className="absolute -top-2.5 right-1 z-10 w-4 h-4 rounded-full bg-muted border border-border text-muted-foreground hover:bg-destructive hover:text-white hover:border-destructive flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all"
 title="Remove column">

 <X className="h-2.5 w-2.5" />
 </button>
 }
 <div className="px-3 py-2.5 h-full">
 <CellContentRenderer
 cell={cell}
 cellIdx={ci}
 onUpdateCell={updateCell}
 onUpdateCellType={updateCellType}
 onUpdateCellSubItems={updateCellSubItems}
 onUpdateCellPlaceholder={updateCellPlaceholder}
 isPreviewMode={isPreviewMode}
 isEngagementMode={isEngagementMode} />

 </div>
 {/* Resize handle between columns */}
 {ci < layout.cells.length - 1 && !(isPreviewMode && allCellsEmpty) &&
 <div
 onMouseDown={(e) => handleResizeStart(ci, e)}
 className="shrink-0 w-px cursor-col-resize hover:bg-primary/30 transition-colors absolute right-0 z-10 -translate-x-1/2"
 style={{ backgroundColor: 'hsl(var(--border))', top: '5px', bottom: '5px' }}>
 <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
 </div>
 }
 </div>
 )}
 </div>

 {/* Add column button on right */}
 {!isPreviewMode && layout.columns < 4 &&
 <button
 onClick={onAddColumn}
 className={`flex items-center px-2 text-muted-foreground/30 hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover/block:opacity-100 ${isFocused ? 'opacity-100' : ''}`}
 title="Add column">

 <Plus className="h-3.5 w-3.5" />
 </button>
 }
 </div>
 </div>);

}

// ─── Question Inline Columns (Question + Response + Explanation + Reference) ──

function QuestionInlineColumns({
 question, num, showNumbering, isEditing, canEdit, isPreviewMode, isCompactMode,
 draftRef, handleSave, setIsEditing, onUpdate, isSub = false, isEngagementMode = false,
 isSelected = false, onSelectionChange
}: {
 question: any; num: string; showNumbering: boolean; isEditing: boolean; canEdit: boolean;
 isPreviewMode: boolean; isCompactMode: boolean; draftRef: React.MutableRefObject<string>;
 handleSave: () => void; setIsEditing: (v: boolean) => void; onUpdate: (q: any) => void;
 isSub?: boolean; isEngagementMode?: boolean;
 isSelected?: boolean; onSelectionChange?: (selected: boolean) => void;
}) {
 const containerRef = useRef<HTMLDivElement>(null);
 const resizingRef = useRef<{ colIdx: number; startX: number; startWidths: number[] } | null>(null);
 const expAttr = useAttribution(`dv-exp-${question.id}`);

 // Auto-stamp when explanation content exists but attribution was never stored
 useEffect(() => {
   if (isEngagementMode && question.explanation && !expAttr.attr) {
     expAttr.stamp();
   }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [question.id, question.explanation, isEngagementMode]);

 const showResponse = (question as any).showResponse !== false;
 const showExplanation = (question as any).showExplanation !== false;
 const showReference = (question as any).showReference !== false;

 const visibleCols: string[] = ['question'];
 if (showResponse) visibleCols.push('response');
 if (showExplanation) visibleCols.push('explanation');
 if (showReference) visibleCols.push('reference');

 const hiddenColumns: { key: string; label: string }[] = [];
 if (!showResponse) hiddenColumns.push({ key: 'showResponse', label: 'Response' });
 if (!showExplanation) hiddenColumns.push({ key: 'showExplanation', label: 'Explanation' });
 if (!showReference) hiddenColumns.push({ key: 'showReference', label: 'Reference' });

 const getWidths = (): number[] => {
 const stored = (question as any).inlineColumnWidths;
 if (stored && stored.length === visibleCols.length) return stored;
 const otherCount = visibleCols.length - 1;
 if (otherCount === 0) return [1];
 // Reference column gets a minimal fixed width; extra space goes to Question
 const refWidth = 0.08;
 const hasRef = visibleCols.includes('reference');
 const normalOtherCount = hasRef ? otherCount - 1 : otherCount;
 if (normalOtherCount === 0 && hasRef) return [1 - refWidth, refWidth];
 // Assign specific widths per column type
 const responseWidth = 0.15;
 const remaining = 1 - (hasRef ? refWidth : 0);
 // Count response and explanation columns among visible
 const hasResponse = visibleCols.includes('response');
 const hasExplanation = visibleCols.includes('explanation');
 const responseTotal = hasResponse ? responseWidth : 0;
 const questionAndExplWidth = remaining - responseTotal;
 // Split remaining between question (45%) and explanation (55%)
 const questionWidth = hasExplanation ? questionAndExplWidth * 0.45 : questionAndExplWidth;
 const explanationWidth = hasExplanation ? questionAndExplWidth * 0.55 : 0;
 
 const widths: number[] = [];
 for (let i = 0; i < visibleCols.length; i++) {
 const col = visibleCols[i];
 if (i === 0) widths.push(questionWidth); // question is always first
 else if (col === 'response') widths.push(responseWidth);
 else if (col === 'explanation') widths.push(explanationWidth);
 else if (col === 'reference') widths.push(refWidth);
 else widths.push(questionWidth);
 }
 return widths;
 };

 const handleResizeStart = (colIdx: number, e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 const startWidths = getWidths();
 resizingRef.current = { colIdx, startX: e.clientX, startWidths: [...startWidths] };

 const handleMouseMove = (ev: MouseEvent) => {
 if (!resizingRef.current || !containerRef.current) return;
 const containerWidth = containerRef.current.getBoundingClientRect().width;
 const delta = (ev.clientX - resizingRef.current.startX) / containerWidth;
 const { colIdx: ci, startWidths: sw } = resizingRef.current;
 const minWidth = 0.08;
 let newLeft = Math.max(minWidth, sw[ci] + delta);
 let newRight = Math.max(minWidth, sw[ci + 1] - delta);
 const total = sw[ci] + sw[ci + 1];
 if (newLeft + newRight !== total) {
 const scale = total / (newLeft + newRight);
 newLeft *= scale;
 newRight *= scale;
 }
 const newWidths = [...sw];
 newWidths[ci] = newLeft;
 newWidths[ci + 1] = newRight;
 onUpdate({...question, inlineColumnWidths: newWidths });
 };

 const handleMouseUp = () => {
 resizingRef.current = null;
 document.removeEventListener('mousemove', handleMouseMove);
 document.removeEventListener('mouseup', handleMouseUp);
 document.body.style.cursor = '';
 document.body.style.userSelect = '';
 };

 document.addEventListener('mousemove', handleMouseMove);
 document.addEventListener('mouseup', handleMouseUp);
 document.body.style.cursor = 'col-resize';
 document.body.style.userSelect = 'none';
 };

 const widths = getWidths();

 return (
 <div ref={containerRef} onClick={(e) => e.stopPropagation()} className="dv-question-content py-0 pl-[37px] pr-4 flex-1 min-w-0 flex items-stretch">
 {/* Column 1: Question */}
 <div className="flex items-center gap-2 min-w-0 overflow-hidden" style={{ flex: `0 0 ${widths[0] * 100}%` }}>
 {showNumbering && <>
 {/* Checkbox + Number: checkbox appears on hover in edit mode */}
 <div className="shrink-0 w-8 flex items-center justify-start">
 {onSelectionChange ? (
 <>
 <span
 className={`dv-number text-xs font-medium text-muted-foreground select-none w-8 text-left ${isSelected ? 'hidden' : 'group-hover/q:hidden'}`}
 >
 {num}
 </span>
 <label
 className={`items-center justify-center cursor-pointer ${isSelected ? 'flex' : 'hidden group-hover/q:flex'}`}
 onClick={(e) => e.stopPropagation()}
 >
 <Checkbox
 checked={isSelected}
 onCheckedChange={(checked) => onSelectionChange(!!checked)}
 className="h-4 w-4"
 />
 </label>
 </>
 ) : (
 <span className="dv-number text-xs font-medium text-muted-foreground select-none w-8 text-left">
 {num}
 </span>
 )}
 </div>
 <div className="shrink-0 w-px self-stretch mx-0 pointer-events-none" style={{ backgroundColor: 'var(--dv-separator)' }} />
 </>}

 {question.labelPlaceholder ?
 <AITextarea
 value={question.labelAnswer || ''}
 onChange={(val) => onUpdate({...question, labelAnswer: val })}
 placeholder={question.labelPlaceholder}
 minHeight="48px" /> :
 isEditing && canEdit ?
 <RichTextQuestionEditor
 value={question.text}
 onChange={(v) => { draftRef.current = v; }}
 onBlur={handleSave}
 onCancel={() => { draftRef.current = question.text; setIsEditing(false); }}
 className="text-sm min-h-[28px] bg-transparent text-foreground flex-1" /> :
 isCompactMode && question.text ? <Tooltip>
 <TooltipTrigger asChild>
 <div
 onClick={() => { if (canEdit) { draftRef.current = question.text; setIsEditing(true); } }}
 className={`question-content text-sm text-foreground flex-1 line-clamp-1 overflow-hidden p-1.5 border-2 border-transparent rounded-md box-border ${canEdit ? 'cursor-text' : ''}`}
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.text) }} />
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-popover text-popover-foreground border border-border shadow-lg max-w-md">
 <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.text) }} />
 </TooltipContent>
 </Tooltip> :
 <div
 onClick={() => { if (canEdit) { draftRef.current = question.text; setIsEditing(true); } }}
 className={`question-content text-sm text-foreground flex-1 p-1.5 border-2 border-transparent rounded-md box-border ${canEdit ? 'cursor-text' : ''}`}
 dangerouslySetInnerHTML={{
 __html: sanitizeHtml(question.text) || '<span class="text-muted-foreground italic">Click to type Question...</span>'
 }} />
 }

 {question.required && <span className="mt-0.5 mr-2.5" style={{ fontSize: '1.25rem', color: '#D92D20' }}>*</span>}
 </div>

 {/* Separator + Response */}
 {showResponse && (() => {
 const widthIdx = visibleCols.indexOf('response');
 return (
 <>
 <div
 className="shrink-0 w-px cursor-col-resize hover:bg-primary/30 transition-colors relative mx-0"
 style={{ backgroundColor: 'var(--dv-separator)' }}
 onMouseDown={(e) => handleResizeStart(widthIdx - 1, e)}>
 <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
 </div>
 <div className="flex flex-nowrap items-center justify-start gap-2 min-w-0 overflow-visible px-2 relative group/resp"
 style={{ flex: `0 0 ${widths[widthIdx] * 100}%` }}>
 <div className="w-full min-w-0">
 <ResponseField question={question} onUpdate={onUpdate} isPreviewMode={isPreviewMode} isEngagementMode={isEngagementMode} />
 {isEngagementMode && question.answeredBy && question.answer && !showExplanation && (
 <div className="mt-1 mb-1 px-0.5">
 <Tooltip>
 <TooltipTrigger asChild>
 <span className={`inline-flex items-center rounded-full text-[10px] font-medium gap-1 px-2 py-0.5 cursor-default ${
 question.answeredBy.type === 'client' ? 'bg-primary/10 text-primary' : 'bg-[#e1eefa] text-[#074075] border border-[#1c63a6]'
 }`}>
 {question.answeredBy.initials}{question.answeredBy.at && ` · ${formatAssigneeAt(question.answeredBy.at)}`}
 </span>
 </TooltipTrigger>
 <TooltipContent side="top">
 <p className="text-xs">{question.answeredBy.name} · {question.answeredBy.role}</p>
 </TooltipContent>
 </Tooltip>
 </div>
 )}
 </div>
 {canEdit &&
 <ResponseTypePicker
 currentType={question.answerType}
 onTypeChange={(t) => onUpdate({...question, answerType: t, answer: '' })} />
 }
 {canEdit &&
 <button
 onClick={() => onUpdate({...question, showResponse: false, answerType: 'none', answer: '' } as any)}
 className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover/resp:opacity-100 transition-opacity shadow-sm z-10"
 title="Remove response">
 <X className="h-3 w-3" />
 </button>
 }
 </div>
 </>
 );
 })()}

 {/* Separator + Explanation */}
 {showExplanation && (() => {
 const widthIdx = visibleCols.indexOf('explanation');
 return (
 <>
 <div
 className="shrink-0 w-px cursor-col-resize hover:bg-primary/30 transition-colors relative mx-0"
 style={{ backgroundColor: 'var(--dv-separator)' }}
 onMouseDown={(e) => handleResizeStart(widthIdx - 1, e)}>
 <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
 </div>
 <div className="flex items-center min-w-0 overflow-visible px-2 relative group/exp"
 style={{ flex: `0 0 ${widths[widthIdx] * 100}%` }}>
 <div className="w-full">
 <div onBlur={() => { if (question.explanation) expAttr.stamp(); else expAttr.clear(); }}>
 <AITextarea
 value={question.explanation || ''}
 onChange={(val) => { onUpdate({...question, explanation: val }); }}
 onAIGenerate={() => expAttr.stamp('LUKA')}
 placeholder={question.explanationPlaceholder || "Explanation"}
 minHeight="40px" />
 </div>
 {isEngagementMode && question.explanation && (
 <div className="mt-0.5 mb-1 px-1.5">
 <AttributionBadge attr={expAttr.attr} />
 </div>
 )}

 </div>
 {canEdit &&
 <button
 onClick={() => onUpdate({...question, showExplanation: false, explanation: '' } as any)}
 className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover/exp:opacity-100 transition-opacity shadow-sm z-10"
 title="Remove explanation">
 <X className="h-3 w-3" />
 </button>
 }
 </div>
 </>
 );
 })()}

 {/* Separator + Reference */}
 {showReference && (() => {
 const widthIdx = visibleCols.indexOf('reference');
 return (
 <>
 <div
 className="shrink-0 w-px cursor-col-resize hover:bg-primary/30 transition-colors relative mx-0"
 style={{ backgroundColor: 'var(--dv-separator)' }}
 onMouseDown={(e) => handleResizeStart(widthIdx - 1, e)}>
 <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
 </div>
 <div className="flex items-center min-w-0 overflow-visible px-2 relative group/ref"
 style={{ flex: `0 0 ${widths[widthIdx] * 100}%` }}>
 <RefButton
 reference={(question as any).references || (question as any).reference}
 onAttach={(doc) => {
 const existing = (question as any).references || ((question as any).reference ? [(question as any).reference] : []);
 onUpdate({...question, references: [...existing, doc], reference: null } as any);
 }}
 onRemove={(index?: number) => {
 const existing = (question as any).references || ((question as any).reference ? [(question as any).reference] : []);
 if (typeof index === 'number') {
 const updated = existing.filter((_: any, i: number) => i !== index);
 onUpdate({...question, references: updated, reference: null } as any);
 } else {
 onUpdate({...question, references: [], reference: null } as any);
 }
 }}
 disabled={isPreviewMode} />
 {canEdit &&
 <button
 onClick={() => onUpdate({...question, showReference: false, reference: null, references: [] } as any)}
 className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover/ref:opacity-100 transition-opacity shadow-sm z-10"
 title="Remove reference">
 <X className="h-3 w-3" />
 </button>
 }
 </div>
 </>
 );
 })()}

 {/* Add column button */}
 {canEdit && hiddenColumns.length > 0 &&
 <Popover>
 <PopoverTrigger asChild>
 <button
 onClick={(e) => e.stopPropagation()}
 className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors ml-1"
 title="Add column">
 <Plus className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-44 p-1 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Add Column</div>
 {hiddenColumns.map((col) =>
 <button
 key={col.key}
 onClick={() => onUpdate({...question, [col.key]: true } as any)}
 className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-foreground">
 <Plus className="h-3.5 w-3.5 text-muted-foreground" />
 {col.label}
 </button>
 )}
 </PopoverContent>
 </Popover>
 }
 </div>
 );
}

// ─── Document Question Block ─────────────────────────────────────────────────


function DocumentQuestionBlock({
 question, sectionNumber, questionIndex, subIndex, subSubIndex,
 onUpdate, onDelete, onDuplicate, onAddSubItem,
 onAddAtPosition, isPreviewMode, isEngagementMode,
 numberingFormat, applyingQuestionId,
 isSelected, onSelectionChange, showNumbering, isCompactMode = false,
 isGlobalTemplate = false, isLastInSection = false, isLastSubWithNextMain = false
}: {question: Question;sectionNumber: number;questionIndex: number;subIndex?: number;subSubIndex?: number;onUpdate: (q: Question) => void;onDelete: () => void;onDuplicate?: () => void;onAddSubItem?: () => void;onAddAtPosition?: (pos: 'above' | 'below') => void;isPreviewMode: boolean;isEngagementMode: boolean;numberingFormat: NumberingFormat;applyingQuestionId?: string | null;isSelected?: boolean;onSelectionChange?: (selected: boolean) => void;showNumbering: boolean;isCompactMode?: boolean;isGlobalTemplate?: boolean;isLastInSection?: boolean;isLastSubWithNextMain?: boolean;}) {
 const [isEditing, setIsEditing] = useState(false);
 const [isFocused, setIsFocused] = useState(false);
 const draftRef = useRef(question.text);
 const isApplying = applyingQuestionId === question.id;
 const isSub = subIndex !== undefined;
 const canEdit = !isPreviewMode && (!isEngagementMode || question.isUserAdded);

 const {
 attributes, listeners, setNodeRef, transform, transition, isDragging
 } = useSortable({
 id: question.id,
 data: { type: isSub ? 'subitem' : 'item', question }
 });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.4 : 1
 };

 const num = formatQuestionNumber(
 numberingFormat, sectionNumber,
 questionIndex, subIndex, subSubIndex
 );

 const handleSave = () => {
 const t = draftRef.current.trim();
 if (t && t !== question.text) onUpdate({...question, text: t });
 setIsEditing(false);
 };

 const [menuOpen, setMenuOpen] = useState(false);

 // Border management — same as ColumnBlockRow
 const borders: BorderStyle[] = (question as any).borders || ['none'];
 const hasBorder = (b: BorderStyle) => borders.includes(b);
 const hasAll = hasBorder('all');

 const toggleBorder = (b: BorderStyle) => {
 if (b === 'none') {
 onUpdate({...question, borders: ['none'] } as any);
 return;
 }
 if (b === 'all') {
 onUpdate({...question, borders: hasAll ? ['none'] : ['all'] } as any);
 return;
 }
 const filtered = borders.filter((x) => x !== 'none' && x !== 'all');
 const next = filtered.includes(b) ? filtered.filter((x) => x !== b) : [...filtered, b];
 onUpdate({...question, borders: next.length ? next : ['none'] } as any);
 };

 const showTop = hasAll || hasBorder('top');
 const showRight = hasAll || hasBorder('right');
 const showBottom = hasAll || hasBorder('bottom');
 const showLeft = hasAll || hasBorder('left');
 const hasAnyBorder = !hasBorder('none') && borders.length > 0;

 const outerBorderStyle = isFocused
 ? 'border-2 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
 : isSelected && !isSub
 ? 'border border-transparent'
 : hasAnyBorder
 ? `border ${showTop ? 'border-t-border' : 'border-t-transparent'} ${showRight ? 'border-r-border' : 'border-r-transparent'} ${showBottom ? 'border-b-border' : 'border-b-transparent'} ${showLeft ? 'border-l-border' : 'border-l-transparent'}`
 : isSub
 ? `border border-transparent ${isGlobalTemplate ? '' : 'hover:bg-[#f2f9ff] dark:hover:bg-muted/20'}`
 : `border border-transparent ${(isLastInSection && !canEdit) || (question.subQuestions && question.subQuestions.length > 0) ? '' : 'border-b-border/50'} ${isGlobalTemplate ? '' : 'hover:bg-[#f2f9ff] dark:hover:bg-muted/20'}`;

 return (
 <div
 ref={setNodeRef}
 style={style}
 data-question-id={question.id}
 onClick={(e) => {
 if (onSelectionChange && !isSub && !isPreviewMode && (e.target as HTMLElement).closest('[data-drag-handle]')) {
 e.stopPropagation();
 onSelectionChange(!isSelected);
 }
 }}
 className={`dv-question group/q relative hover:z-30 ${isSub ? 'dv-sub-question' : ''} ${
 isDragging ? 'z-10 ring-2 ring-primary/30 rounded-lg' : ''} ${
 isApplying ? 'ring-2 ring-primary ring-inset animate-pulse' : ''} ${
 isSelected && !isSub ? 'bg-[#f2f9ff] dark:bg-muted/20' : ''}`}
 tabIndex={-1}>

 {/* Floating "..." border menu centered above — same as ColumnBlockRow */}
 {canEdit &&
 <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-opacity ${isFocused || menuOpen ? 'opacity-100' : 'opacity-0 group-hover/q:opacity-100'}`}>
 <Popover open={menuOpen} onOpenChange={setMenuOpen}>
 <PopoverTrigger asChild>
 <button
 onMouseDown={(e) => e.preventDefault()}
 className="flex items-center justify-center w-7 h-5 rounded-[4px] bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-colors">
 <MoreHorizontal className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="center" side="top" sideOffset={4} className="w-48 p-1.5 bg-popover border-border shadow-xl z-50">
 <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">Borders</p>
 {BORDER_OPTIONS.map((opt) =>
 <button
 key={opt.value}
 onClick={() => toggleBorder(opt.value)}
 className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
 (opt.value === 'none' ? hasBorder('none') : hasBorder(opt.value)) ?
 'bg-primary/10 text-primary font-medium' :
 'text-popover-foreground hover:bg-muted'}`
 }>
 <span className="w-3.5 h-3.5 flex items-center justify-center">
 {(opt.value === 'none' ? hasBorder('none') : hasBorder(opt.value)) && <Check className="h-3 w-3" />}
 </span>
 {opt.label}
 </button>
 )}
 <div className="border-t border-border mt-1 pt-1">
 <button
 onClick={() => {onDelete();setMenuOpen(false);}}
 className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 Delete item
 </button>
 </div>
 </PopoverContent>
 </Popover>
 </div>
 }

 {/* Floating toolbar — anchored above the row, like the border menu */}
 {canEdit &&
 <div className="absolute -top-4 z-20 pb-4" style={{ left: 'calc(50% + 24px)' }} onClick={(e) => e.stopPropagation()}>
 <div className="dv-question-toolbar flex items-center gap-1 whitespace-nowrap">

 <TooltipProvider delayDuration={400}>
 {onAddAtPosition &&
 <>
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onAddAtPosition('above');}}
 className="p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
 <AddItemAboveIcon className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Insert above</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onAddAtPosition('below');}}
 className="p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
 <AddItemBelowIcon className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Insert below</TooltipContent>
 </Tooltip>
 </>
 }
 {!isSub && onAddSubItem &&
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onAddSubItem();}}
 className="p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
 <PlusCircle className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Sub-item</TooltipContent>
 </Tooltip>
 }

 {/* Required toggle */}
 {(!isEngagementMode || question.isUserAdded) &&
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onUpdate({...question, required: !question.required});}}
 className={`p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-muted transition-colors ${question.required ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}>
 <Asterisk className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">{question.required ? 'Remove required' : 'Mark as required'}</TooltipContent>
 </Tooltip>
 }

 {onDuplicate &&
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onDuplicate();}}
 className="p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
 <Copy className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
 </Tooltip>
 }
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={(e) => {e.stopPropagation();onDelete();}}
 className="p-1.5 rounded-[4px] border border-border bg-background shadow-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 </div>
 }

 {/* Loading indicator */}
 {isApplying &&
 <div className="absolute left-2 top-3 z-10">
 <Loader2 className="h-4 w-4 text-primary animate-spin" />
 </div>
 }

 {/* Content row with inline drag handle */}
 <div className={`relative flex items-stretch rounded-none transition-all ${outerBorderStyle}`}>
 {/* Drag handle on left — absolutely positioned to not affect number alignment */}
 {!isPreviewMode &&
 <div
 data-drag-handle
 {...attributes}
 {...listeners}
 onMouseEnter={() => !isPreviewMode && setIsFocused(true)}
 onMouseLeave={() => setIsFocused(false)}
 className={`absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors opacity-0 group-hover/q:opacity-100 z-10 ${isFocused ? 'opacity-100' : ''}`}>
 <GripVertical className="h-3.5 w-3.5" />
 </div>
 }
 <QuestionInlineColumns
 question={question}
 num={num}
 showNumbering={showNumbering}
 isEditing={isEditing}
 canEdit={canEdit}
 isPreviewMode={isPreviewMode}
 isCompactMode={isCompactMode}
 draftRef={draftRef}
 handleSave={handleSave}
 setIsEditing={setIsEditing}
 onUpdate={onUpdate}
 isSub={isSub}
 isEngagementMode={isEngagementMode}
 isSelected={isSelected}
 onSelectionChange={!isSub ? onSelectionChange : undefined}
 />
 </div> {/* end flex border wrapper */}

 {/* Carry-forward indicator */}
 {(question as any).carriedForward && (
 <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200/60 dark:border-amber-800/30">
 <div className="flex items-center gap-1.5">
 <Undo2 className="h-3 w-3 text-amber-500 shrink-0" />
 <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Carried forward — please confirm or update</span>
 </div>
 <button
 onClick={() => onUpdate({...question, carriedForward: undefined } as any)}
 className="text-[11px] text-amber-600 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-300 font-medium underline underline-offset-2 transition-colors shrink-0"
 >
 Confirm
 </button>
 </div>
 )}

 {/* Sub-questions */}
 {question.subQuestions && question.subQuestions.length > 0 &&
 <div className="dv-sub-questions mt-0 mb-0 relative">
 <SortableContext items={question.subQuestions.filter(Boolean).map((sq) => sq.id)} strategy={verticalListSortingStrategy}>
 {question.subQuestions.filter(Boolean).map((sub, si) =>
 <DocumentQuestionBlock
 key={sub.id}
 question={sub}
 sectionNumber={sectionNumber}
 questionIndex={questionIndex}
 subIndex={subIndex !== undefined ? subIndex : si}
 subSubIndex={subIndex !== undefined ? si : undefined}
 onUpdate={(updated) => {
 const newSubs = [...(question.subQuestions || [])];
 newSubs[si] = updated;
 onUpdate({...question, subQuestions: newSubs });
 }}
 onDelete={() => {
 const newSubs = (question.subQuestions || []).filter((_, i) => i !== si);
 onUpdate({...question, subQuestions: newSubs.length > 0 ? newSubs : undefined });
 }}
 isPreviewMode={isPreviewMode}
 isEngagementMode={isEngagementMode}
 numberingFormat={numberingFormat}
 applyingQuestionId={applyingQuestionId}
 showNumbering={showNumbering}
 isCompactMode={isCompactMode}
 isGlobalTemplate={isGlobalTemplate}
 isLastSubWithNextMain={si === (question.subQuestions!.length - 1) && !isLastInSection && question.answerType !== 'none'} />

 )}
 </SortableContext>
 </div>
 }
 </div>);

}

// ─── Objective Content (editable) ────────────────────────────────────────────

function ObjectiveContent({ objective, isPreviewMode, isGlobalTemplate, onUpdate }: {
 objective: string; isPreviewMode: boolean; isGlobalTemplate: boolean; onUpdate: (text: string) => void;
}) {
 const [isEditing, setIsEditing] = useState(false);
 const draftRef = useRef(objective);

 const canEdit = !isPreviewMode && !isGlobalTemplate;

 const handleSave = () => {
 const val = draftRef.current.trim();
 if (val && val !== objective) onUpdate(val);
 else draftRef.current = objective;
 setIsEditing(false);
 };

 if (isEditing && canEdit) {
 return (
 <RichTextQuestionEditor
 value={objective}
 onChange={(v) => { draftRef.current = v; }}
 onBlur={handleSave}
 onCancel={() => { draftRef.current = objective; setIsEditing(false); }}
 className="text-sm min-h-[28px] bg-transparent text-foreground"
 />
 );
 }

 return (
 <div
 onClick={() => { if (canEdit) { draftRef.current = objective; setIsEditing(true); } }}
 className={`text-sm text-muted-foreground leading-relaxed p-1.5 border-2 border-transparent rounded-md box-border ${canEdit ? 'cursor-text hover:border-border' : ''}`}
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(objective) }}
 />
 );
}

// ─── Document Section Block ──────────────────────────────────────────────────

export function DocumentSectionBlock({
 section, sectionIndex, onUpdate, onDelete, onAddItem,
 onAddCategoryAtPosition, isPreviewMode, isEngagementMode,
 numberingFormat, applyingQuestionId,
 selectedQuestions, onSelectionChange, showNumbering,
 onNumberingFormatChange, onShowNumberingChange, isCompactMode = false,
 isGlobalTemplate = false
}: {section: Section;sectionIndex: number;onUpdate: (s: Section) => void;onDelete: () => void;onAddItem: () => void;onAddCategoryAtPosition: (pos: 'above' | 'below') => void;isPreviewMode: boolean;isEngagementMode: boolean;numberingFormat: NumberingFormat;applyingQuestionId?: string | null;selectedQuestions?: Set<string>;onSelectionChange?: (questionId: string, selected: boolean) => void;showNumbering: boolean;onNumberingFormatChange: (f: NumberingFormat) => void;onShowNumberingChange: (v: boolean) => void;isCompactMode?: boolean;isGlobalTemplate?: boolean;}) {
 const [isEditingTitle, setIsEditingTitle] = useState(false);
 const [draftTitle, setDraftTitle] = useState(section.title);
 const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

 const {
 attributes, listeners, setNodeRef, transform, transition, isDragging
 } = useSortable({
 id: section.id,
 data: { type: 'group', section }
 });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.4 : 1
 };

 const cleanTitle = (t: string) => t.replace(/^[A-Z0-9]+\.\s*/i, '');
 const sectionNumber = sectionIndex + 1;

 const commitTitle = () => {
 const t = draftTitle.trim();
 if (t && t !== section.title) onUpdate({...section, title: t });else
 setDraftTitle(section.title);
 setIsEditingTitle(false);
 };

 const handleQuestionUpdate = (idx: number, q: Question) => {
 const newQ = [...section.questions];
 newQ[idx] = q;
 onUpdate({...section, questions: newQ });
 };

 const handleQuestionDelete = (idx: number) => {
 onUpdate({...section, questions: section.questions.filter((_, i) => i !== idx) });
 };

 const handleQuestionDuplicate = (idx: number) => {
 const q = section.questions[idx];
 const dup: Question = {
...q,
 id: `q-${Date.now()}`,
 subQuestions: q.subQuestions?.map((sq) => ({...sq, id: `sq-${Date.now()}-${Math.random()}` }))
 };
 const newQ = [...section.questions.slice(0, idx + 1), dup,...section.questions.slice(idx + 1)];
 onUpdate({...section, questions: newQ });
 };

 const handleAddSubItem = (idx: number) => {
 const q = section.questions[idx];
 const newSub: Question = {
 id: `sq-${Date.now()}`, text: '', answerType: 'long-answer', required: false,
 isUserAdded: isEngagementMode ? true : undefined
 };
 handleQuestionUpdate(idx, {...q, subQuestions: [...(q.subQuestions || []), newSub] });
 };

 const handleAddAtPosition = (idx: number, pos: 'above' | 'below') => {
 const newQ: Question = {
 id: `q-${Date.now()}`, text: '', answerType: 'long-answer', required: false,
 isUserAdded: isEngagementMode ? true : undefined
 };
 const insertIdx = pos === 'above' ? idx : idx + 1;
 const items = [...section.questions.slice(0, insertIdx), newQ,...section.questions.slice(insertIdx)];
 onUpdate({...section, questions: items });
 };

 return (
 <div
 id={`checklist-section-${section.id}`}
 data-section-id={section.id}
 ref={setNodeRef}
 style={{...style, borderColor: 'var(--dv-separator)', scrollMarginTop: '160px' }}
 className={`dv-section group/section relative rounded-[8px] border-[0.5px] transition-colors ${isGlobalTemplate ? '' : 'focus-within:border-primary'} ${isDragging ? 'z-10' : ''}`}>

 {/* Section header */}
 <div className="dv-section-header flex items-center gap-2 pl-[38px] pr-4 py-0 relative border-b" style={{ borderColor: 'var(--dv-separator)', height: '48px', minHeight: '48px' }}>
 {/* Drag handle */}
 {!isPreviewMode &&
 <div
 {...attributes}
 {...listeners}
 className="dv-section-drag absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full cursor-grab active:cursor-grabbing p-1">

 <GripVertical className="h-4 w-4 text-muted-foreground" />
 </div>
 }

 {/* Section kebab menu — right side */}
 {!isPreviewMode &&
 <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity ${sectionMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100'}`}>
 <Popover open={sectionMenuOpen} onOpenChange={setSectionMenuOpen}>
 <PopoverTrigger asChild>
 <button
 onMouseDown={(e) => e.preventDefault()}
 className="flex items-center justify-center w-7 h-7 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
 title="Section options">
 <MoreHorizontal className="h-4 w-4" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="end" side="bottom" sideOffset={4} className="w-56 p-2 bg-popover border-border shadow-xl z-50">
 {/* Numbering toggle */}
 <button
 onClick={() => { onShowNumberingChange(!showNumbering); }}
 className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-muted text-popover-foreground">
 {showNumbering ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
 {showNumbering ? 'Hide numbering' : 'Show numbering'}
 </button>
 {showNumbering && <>
 <div className="border-t border-border mt-1 pt-1">
 <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">Numbering Format</p>
 {([
 { value: 'number' as NumberingFormat, label: 'Numbers Only', example: '1. → 1.1' },
 { value: 'number-alphabet' as NumberingFormat, label: 'Number + Alphabet', example: '1. → 1.A' },
 { value: 'alphabet-number' as NumberingFormat, label: 'Alphabet + Number', example: 'A. → A.1' },
 ]).map(opt => (
 <button
 key={opt.value}
 onClick={() => { onNumberingFormatChange(opt.value); }}
 className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
 numberingFormat === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-popover-foreground hover:bg-muted'
 }`}>
 <span>{opt.label}</span>
 <span className="text-[10px] text-muted-foreground">{opt.example}</span>
 </button>
 ))}
 </div>
 </>}
 <div className="border-t border-border mt-1 pt-1">
 <button
 onClick={() => {onDelete();setSectionMenuOpen(false);}}
 className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors">
 <Trash2 className="h-3.5 w-3.5" />
 Delete section
 </button>
 </div>
 </PopoverContent>
 </Popover>
 </div>
 }

 {/* Collapse toggle — positioned absolutely so it doesn't shift the number column */}
 <button
 onClick={() => onUpdate({...section, isExpanded: !section.isExpanded })}
 className="dv-collapse-btn absolute left-4 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors z-10">

 {section.isExpanded ?
 <ChevronDown className="h-4 w-4 text-muted-foreground" /> :
 <ChevronRight className="h-4 w-4 text-muted-foreground" />
 }
 </button>

 {/* Section number + separator + Title — aligned with question text */}
 {showNumbering && !(isEngagementMode && section.formLayout) && <>
 <span className="text-xs font-medium text-muted-foreground select-none shrink-0 w-8 text-left">
 {numberingFormat === 'alphabet-number' ? `${String.fromCharCode(64 + sectionNumber)}.` : `${sectionNumber}.`}
 </span>
 <div className="shrink-0 w-px self-stretch mx-0 pointer-events-none" style={{ backgroundColor: 'var(--dv-separator)' }} />
 </>}

 {/* Title */}
 {isEditingTitle && !isPreviewMode ?
 <Input
 value={draftTitle}
 onChange={(e) => setDraftTitle(e.target.value)}
 onBlur={commitTitle}
 onKeyDown={(e) => {
 if (e.key === 'Enter') commitTitle();
 if (e.key === 'Escape') {setDraftTitle(section.title);setIsEditingTitle(false);}
 }}
 autoFocus
 onClick={(e) => e.stopPropagation()}
 className="h-7 text-sm font-semibold bg-transparent border-none shadow-none text-category-title flex-1 px-1 focus-visible:ring-1" /> :


 <h3
 onClick={() => {if (!isPreviewMode) setIsEditingTitle(true);}}
 className={`dv-section-title text-sm font-semibold text-category-title flex-1 pl-[6px] ${
 !isPreviewMode ? 'cursor-text' : ''}`
 }>

 {cleanTitle(section.title)}
 </h3>
 }

 {/* Section Note — editable only in template editing; view-only in engagements */}
 {!isPreviewMode && !isEngagementMode ? (
 <Popover>
 <PopoverTrigger asChild>
 <button
 className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors shrink-0 ${
 section.note ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'
 }`}
 onClick={(e) => e.stopPropagation()}
 >
 <MessageSquare className="h-3 w-3" />
 {section.note ? 'Edit note' : 'Add note'}
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-72 p-3" align="start" side="bottom" onClick={(e) => e.stopPropagation()}>
 <div className="space-y-2">
 <label className="text-xs font-medium text-foreground">Section Note</label>
 <textarea
 className="w-full min-h-[80px] text-sm rounded-md border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
 placeholder="Add a note for this section..."
 defaultValue={section.note || ''}
 onBlur={(e) => onUpdate({...section, note: e.target.value || undefined })}
 />
 {section.note && (
 <button
 className="text-xs text-destructive hover:underline"
 onClick={() => onUpdate({...section, note: undefined })}
 >
 Remove note
 </button>
 )}
 </div>
 </PopoverContent>
 </Popover>
 ) : section.note ? (
 <Popover>
 <PopoverTrigger asChild>
 <button
 className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 shrink-0 cursor-pointer"
 onClick={(e) => e.stopPropagation()}
 >
 <MessageSquare className="h-3 w-3" />
 Read note for more info
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-72 p-3" align="start" side="bottom" onClick={(e) => e.stopPropagation()}>
 <p className="text-sm text-foreground whitespace-pre-wrap">{section.note}</p>
 </PopoverContent>
 </Popover>
 ) : null}

 {/* Section info */}
 <div className="dv-section-meta flex items-center gap-2 mr-8">
 {section.formLayout && !isEngagementMode &&
 <span className="text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><LayoutGrid className="h-3 w-3" />{section.formLayout.columns} Column{section.formLayout.columns > 1 ? 's' : ''}</span>
 </span>
 }
 </div>
 </div>

 {/* Content: either FormLayout or Questions */}
 {section.isExpanded &&
 <>
 {section.formLayout ?
 <FormLayoutEditor
 formLayout={section.formLayout}
 onUpdate={(fl: FormLayout) => onUpdate({...section, formLayout: fl })}
 isPreviewMode={isPreviewMode || isEngagementMode} /> :


 <div className="dv-questions py-0">
 <SortableContext items={section.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
 {section.questions.map((q, qi) =>
 q.columnLayout ?
 <ColumnBlockRow
 key={q.id}
 question={q}
 onUpdate={(updated) => handleQuestionUpdate(qi, updated)}
 onDelete={() => handleQuestionDelete(qi)}
 onAddColumn={() => {
 const cl = q.columnLayout!;
 if (cl.columns >= 4) return;
 const newCells = [...cl.cells, { id: `cell-${Date.now()}`, content: '' }];
 const newWidths = cl.columnWidths && cl.columnWidths.length === cl.columns ?
 [...cl.columnWidths, 1 / (cl.columns + 1)].map((_, i, arr) => 1 / arr.length) :
 undefined;
 handleQuestionUpdate(qi, {...q, columnLayout: {...cl, columns: cl.columns + 1, cells: newCells, columnWidths: newWidths } });
 }}
 onDeleteColumn={(colIdx: number) => {
 const cl = q.columnLayout!;
 if (cl.columns <= 1) return;
 const newCells = cl.cells.filter((_, i) => i !== colIdx);
 const newWidths = cl.columnWidths ?
 (() => {const w = cl.columnWidths!.filter((_, i) => i !== colIdx);const sum = w.reduce((a, b) => a + b, 0);return w.map((v) => v / sum);})() :
 undefined;
 handleQuestionUpdate(qi, {...q, columnLayout: {...cl, columns: cl.columns - 1, cells: newCells, columnWidths: newWidths } });
 }}
 isPreviewMode={isPreviewMode}
 isEngagementMode={isEngagementMode}
 isSelected={selectedQuestions?.has(q.id)}
 onSelectionChange={onSelectionChange ? (selected) => onSelectionChange(q.id, selected) : undefined} /> :


 <DocumentQuestionBlock
 key={q.id}
 question={q}
 sectionNumber={sectionNumber}
 questionIndex={qi}
 onUpdate={(updated) => handleQuestionUpdate(qi, updated)}
 onDelete={() => handleQuestionDelete(qi)}
 onDuplicate={() => handleQuestionDuplicate(qi)}
 onAddSubItem={() => handleAddSubItem(qi)}
 onAddAtPosition={(pos) => handleAddAtPosition(qi, pos)}
 isPreviewMode={isPreviewMode}
 isEngagementMode={isEngagementMode}
 numberingFormat={numberingFormat}
 applyingQuestionId={applyingQuestionId}
 isSelected={selectedQuestions?.has(q.id)}
 onSelectionChange={onSelectionChange ? (selected) => onSelectionChange(q.id, selected) : undefined}
 showNumbering={showNumbering}
 isCompactMode={isCompactMode}
 isGlobalTemplate={isGlobalTemplate}
 isLastInSection={qi === section.questions.length - 1} />


 )}
 </SortableContext>

 {/* Add item — ghost button with popover */}
 {!isPreviewMode &&
 <div className="flex justify-center mb-[14px] border-t border-border/40 pt-[14px]">
 <Popover>
 <PopoverTrigger asChild>
 <button
 className="h-7 w-7 p-0 rounded border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center">

 <Plus className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="center" sideOffset={8} className="w-auto p-3 bg-popover border-border shadow-xl">
 <div className="flex flex-col gap-2">
 {/* Add Q/A option */}
 <button
 type="button"
 onClick={onAddItem}
 className="gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center rounded-sm border-solid border border-border-lighter">

 <Plus className="h-4 w-4" />
 <span>Add Q/A</span>
 </button>
 {/* Layout options */}
 {!isEngagementMode &&
 <>
 <div className="h-px bg-border" />
 <p className="text-xs font-medium text-muted-foreground px-1">Add layout</p>
 <div className="flex items-center gap-2 px-1">
 {[1, 2, 3, 4].map((cols) =>
 <button
 key={cols}
 type="button"
 onClick={() => {
 const cells = Array.from({ length: cols }, (_, i) => ({
 id: `cell-${Date.now()}-${i}`,
 content: ''
 }));
 const newQ: Question = {
 id: `block-${Date.now()}`,
 text: '',
 answerType: 'none',
 required: false,
 columnLayout: { columns: cols, cells }
 };
 const newQuestions = [...section.questions, newQ];
 onUpdate({...section, questions: newQuestions });
 }}
 className="flex flex-col items-center gap-1 p-1.5 rounded-[4px] hover:bg-muted transition-colors cursor-pointer"
 title={`${cols} column${cols > 1 ? 's' : ''}`}>

 <LayoutIcon columns={cols} />
 <span className="text-[10px] text-muted-foreground">{cols}</span>
 </button>
 )}
 </div>
 </>
 }
 </div>
 </PopoverContent>
 </Popover>
 </div>
 }
 </div>
 }
 </>
 }
 </div>);

}

// ─── Layout Template Visual Icons ────────────────────────────────────────────

function LayoutIcon({ columns, isActive }: {columns: number;isActive?: boolean;}) {
 const gaps = columns;
 return (
 <div className={`flex items-center gap-0.5 p-1 rounded-[4px] border transition-colors ${
 isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted'}`
 }>
 {Array.from({ length: gaps }).map((_, i) =>
 <div
 key={i}
 className={`h-5 rounded-[4px] transition-colors ${
 isActive ? 'bg-primary/60' : 'bg-muted-foreground/30'}`
 }
 style={{ width: `${Math.max(8, 28 / gaps)}px` }} />

 )}
 </div>);

}

// ─── Between-Section Toolbar (Gamma-style) ──────────────────────────────────

function BetweenSectionToolbar({
 onAddSection


}: {onAddSection: () => void;}) {
 return (
 <div className="flex items-center justify-center py-2 group/between">
 <div className="flex items-center gap-1 opacity-0 group-hover/between:opacity-100 transition-opacity bg-background border border-border rounded-lg shadow-sm px-1.5 py-1">
 <button
 type="button"
 onMouseDown={(e) => {e.preventDefault();e.stopPropagation();onAddSection();}}
 className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-1.5 text-xs"
 title="Add section">

 <FileText className="h-4 w-4" />
 <span>Add section</span>
 </button>
 </div>
 </div>);

}

// ─── Main DocumentView ───────────────────────────────────────────────────────

export function DocumentView({
 checklist, onUpdate, isPreviewMode, isCompactMode = false,
 selectedQuestions = new Set(), onSelectionChange,
 isEngagementMode = false, applyingQuestionId = null,
 isGlobalTemplate = false,
 objectiveExpanded = false, onToggleObjective
}: DocumentViewProps) {
 const [numberingFormat, setNumberingFormat] = useState<NumberingFormat>(() => {
 const saved = localStorage.getItem('dv-numbering-format');
 return (saved as NumberingFormat) || 'number';
 });
 const [showNumbering, setShowNumbering] = useState(() => {
 const saved = localStorage.getItem('dv-show-numbering');
 return saved !== null ? saved === 'true' : true;
 });
 const [activeId, setActiveId] = useState<string | null>(null);
 const [activeData, setActiveData] = useState<{type: string;text: string;} | null>(null);
 const [noteExpanded, setNoteExpanded] = useState(true);
 const [appendixBOpen, setAppendixBOpen] = useState(false);

 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const handleSectionUpdate = (idx: number, s: Section) => {
 const newSections = [...checklist.sections];
 newSections[idx] = s;
 onUpdate({...checklist, sections: newSections });
 };

 const handleSectionDelete = (idx: number) => {
 onUpdate({...checklist, sections: checklist.sections.filter((_, i) => i !== idx) });
 };

 const handleAddItem = (sectionIdx: number) => {
 const newQ: Question = {
 id: `q-${Date.now()}`, text: '', answerType: 'long-answer', required: false,
 isUserAdded: isEngagementMode ? true : undefined
 };
 const newSections = [...checklist.sections];
 newSections[sectionIdx] = {
...newSections[sectionIdx],
 questions: [...newSections[sectionIdx].questions, newQ]
 };
 onUpdate({...checklist, sections: newSections });
 };

 const handleAddCategoryAtPosition = (sectionIdx: number, pos: 'above' | 'below') => {
 const newSection: Section = {
 id: `section-${Date.now()}`, title: 'New Section', questions: [], isExpanded: true
 };
 const insertIdx = pos === 'above' ? sectionIdx : sectionIdx + 1;
 const newSections = [
...checklist.sections.slice(0, insertIdx),
 newSection,
...checklist.sections.slice(insertIdx)];

 onUpdate({...checklist, sections: newSections });
 };

 const handleAddCategoryWithLayout = (sectionIdx: number, columns: number) => {
 const elements = Array.from({ length: columns }, (_, i) => ({
 id: `col-${Date.now()}-${i}`,
 type: 'empty' as const
 }));
 const newSection: Section = {
 id: `section-${Date.now()}`,
 title: 'New Section',
 questions: [],
 isExpanded: true,
 formLayout: {
 columns,
 elements
 }
 };
 const insertIdx = sectionIdx + 1;
 const newSections = [
...checklist.sections.slice(0, insertIdx),
 newSection,
...checklist.sections.slice(insertIdx)];

 onUpdate({...checklist, sections: newSections });
 };

 const handleDragStart = (event: DragStartEvent) => {
 const data = event.active.data.current;
 setActiveId(event.active.id as string);
 setActiveData({
 type: data?.type || 'item',
 text: data?.section?.title || data?.question?.text || 'Item'
 });
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 setActiveId(null);
 setActiveData(null);
 if (!over || active.id === over.id) return;

 const activeData = active.data.current;
 const overData = over.data.current;

 // Section reordering
 if (activeData?.type === 'group' && overData?.type === 'group') {
 const oldIdx = checklist.sections.findIndex((s) => s.id === active.id);
 const newIdx = checklist.sections.findIndex((s) => s.id === over.id);
 if (oldIdx !== -1 && newIdx !== -1) {
 const newSections = [...checklist.sections];
 const [removed] = newSections.splice(oldIdx, 1);
 newSections.splice(newIdx, 0, removed);
 onUpdate({...checklist, sections: newSections });
 }
 }

 // Item reordering within/across sections
 if (activeData?.type === 'item' && overData?.type === 'item') {
 // Find sections containing active and over
 let activeSectionIdx = -1,overSectionIdx = -1;
 checklist.sections.forEach((s, i) => {
 if (s.questions.some((q) => q.id === active.id)) activeSectionIdx = i;
 if (s.questions.some((q) => q.id === over.id)) overSectionIdx = i;
 });

 if (activeSectionIdx === -1 || overSectionIdx === -1) return;

 if (activeSectionIdx === overSectionIdx) {
 const section = checklist.sections[activeSectionIdx];
 const oldIdx = section.questions.findIndex((q) => q.id === active.id);
 const newIdx = section.questions.findIndex((q) => q.id === over.id);
 if (oldIdx !== -1 && newIdx !== -1) {
 const newQ = [...section.questions];
 const [removed] = newQ.splice(oldIdx, 1);
 newQ.splice(newIdx, 0, removed);
 handleSectionUpdate(activeSectionIdx, {...section, questions: newQ });
 }
 } else {
 const sourceSection = checklist.sections[activeSectionIdx];
 const targetSection = checklist.sections[overSectionIdx];
 const item = sourceSection.questions.find((q) => q.id === active.id);
 if (item) {
 const newSource = sourceSection.questions.filter((q) => q.id !== active.id);
 const targetIdx = targetSection.questions.findIndex((q) => q.id === over.id);
 const newTarget = [...targetSection.questions];
 newTarget.splice(targetIdx, 0, item);
 const newSections = checklist.sections.map((s, i) => {
 if (i === activeSectionIdx) return {...s, questions: newSource };
 if (i === overSectionIdx) return {...s, questions: newTarget };
 return s;
 });
 onUpdate({...checklist, sections: newSections });
 }
 }
 }
 };

 return (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}>

 <div
 className={`dv-document ${!isPreviewMode ? 'dv-edit-mode' : ''}`}
 onClickCapture={(e) => {
 // "See Appendix B" inline links open the document viewer instead of
 // anchor-scrolling (capture phase: question rows stopPropagation on bubble)
 const a = (e.target as HTMLElement).closest('a[href="#f410-appB"]');
 if (a) { e.preventDefault(); e.stopPropagation(); setAppendixBOpen(true); }
 }}>
 {/* Objective panel */}
 {checklist.objective && onToggleObjective && (
 <div className="dv-section dv-objective-panel rounded-[8px] border-[0.5px] overflow-hidden" style={{ borderColor: 'var(--dv-separator)' }}>
 <button
 type="button"
 className="w-full flex items-center gap-2 pl-[38px] pr-4 text-left text-sm font-semibold transition-colors"
 style={{ height: '48px', minHeight: '48px' }}
 onClick={onToggleObjective}
 >
 {objectiveExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 Objective
 </button>
 {objectiveExpanded && (
 <div className="px-[38px] py-3 border-t" style={{ borderColor: 'var(--dv-separator)' }}>
 <ObjectiveContent
 objective={checklist.objective}
 isPreviewMode={isPreviewMode}
 isGlobalTemplate={isGlobalTemplate}
 onUpdate={(text) => onUpdate({...checklist, objective: text })}
 />
 </div>
 )}
 </div>
 )}

 {/* Note panel */}
 {checklist.note && (
 <div className="dv-section dv-objective-panel rounded-[8px] border-[0.5px] overflow-hidden" style={{ borderColor: 'var(--dv-separator)' }}>
 <button
 type="button"
 className="w-full flex items-center gap-2 pl-[38px] pr-4 text-left text-sm font-semibold transition-colors"
 style={{ height: '48px', minHeight: '48px' }}
 onClick={() => setNoteExpanded(v => !v)}
 >
 {noteExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 Note
 </button>
 {noteExpanded && (
 <div className="px-[38px] py-3 border-t" style={{ borderColor: 'var(--dv-separator)' }}>
 <div
 className="text-sm text-muted-foreground leading-relaxed p-1.5 rounded-md"
 dangerouslySetInnerHTML={{ __html: checklist.note }}
 />
 </div>
 )}
 </div>
 )}

 <SortableContext items={checklist.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
 {checklist.sections.map((section, idx) =>
 <Fragment key={section.id}>
 {section.formLayout && isEngagementMode ? (
 <div className="dv-section dv-objective-panel rounded-[8px] border-[0.5px] overflow-hidden" style={{ borderColor: 'var(--dv-separator)' }}>
 <button
 type="button"
 className="w-full flex items-center gap-2 pl-[38px] pr-4 text-left text-sm font-semibold transition-colors"
 style={{ height: '48px', minHeight: '48px' }}
 onClick={() => handleSectionUpdate(idx, {...section, isExpanded: !section.isExpanded })}
 >
 {section.isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 {section.title}
 </button>
 {section.isExpanded && (
 <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--dv-separator)' }}>
 <FormLayoutEditor
 formLayout={section.formLayout}
 onUpdate={(fl) => handleSectionUpdate(idx, {...section, formLayout: fl })}
 isPreviewMode={true}
 />
 </div>
 )}
 </div>
 ) : (
 <DocumentSectionBlock
 section={section}
 sectionIndex={idx}
 onUpdate={(s) => handleSectionUpdate(idx, s)}
 onDelete={() => handleSectionDelete(idx)}
 onAddItem={() => handleAddItem(idx)}
 onAddCategoryAtPosition={(pos) => handleAddCategoryAtPosition(idx, pos)}
 isPreviewMode={isPreviewMode}
 isEngagementMode={isEngagementMode}
 numberingFormat={numberingFormat}
 applyingQuestionId={applyingQuestionId}
 selectedQuestions={selectedQuestions}
 onSelectionChange={onSelectionChange ? (questionId, selected) => {
 const newSelected = new Set(selectedQuestions);
 if (selected) newSelected.add(questionId); else newSelected.delete(questionId);
 onSelectionChange(newSelected);
 } : undefined}
 showNumbering={showNumbering}
 onNumberingFormatChange={(f) => { setNumberingFormat(f); localStorage.setItem('dv-numbering-format', f); }}
 onShowNumberingChange={(v) => { setShowNumbering(v); localStorage.setItem('dv-show-numbering', String(v)); }}
 isCompactMode={isCompactMode}
 isGlobalTemplate={isGlobalTemplate} />
 )}

 {/* Between-section toolbar — Gamma style */}
 {!isPreviewMode &&
 <BetweenSectionToolbar
 onAddSection={() => handleAddCategoryAtPosition(idx, 'below')} />

 }
 </Fragment>
 )}
 </SortableContext>

 {/* Sign Off — appears at the bottom of every checklist */}
 <ChecklistSignOff checklist={checklist} isPreviewMode={isPreviewMode} isEngagementMode={isEngagementMode} />
 </div>

 {/* Drag overlay */}
 <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
 {activeId && activeData &&
 <div className={`px-4 py-3 rounded-lg shadow-xl border border-primary/30 bg-card ${
 activeData.type === 'group' ? 'bg-muted' : ''}`
 }>
 <div className="flex items-center gap-2">
 <GripVertical className="h-4 w-4 text-muted-foreground" />
 <span
 className="text-sm font-medium truncate max-w-[300px] text-foreground"
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeData.text) || 'Untitled' }} />

 </div>
 </div>
 }
 </DragOverlay>

 {/* Appendix B document viewer (Form 410 CA) */}
 <AppendixBFaqDialog open={appendixBOpen} onOpenChange={setAppendixBOpen} />
 </DndContext>);

}