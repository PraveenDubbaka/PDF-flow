import { useState, useRef, useCallback, useEffect } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { Plus, Trash2, ChevronDown, ChevronUp, ChevronRight, MoreHorizontal, Copy, GripVertical, PlusCircle, Circle, Square, Type, Calendar, AlignLeft, Paperclip, ToggleLeft, ListPlus, Menu, DollarSign, FileText, Search, Upload, File, X, Check, Pencil, LayoutGrid, Asterisk, Hash, ListOrdered, Loader2 } from 'lucide-react';
import { AddItemAboveIcon, AddItemBelowIcon } from './icons/AddItemIcons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input as SearchInput } from '@/components/ui/input';
import { Checklist, Question, Section, AnswerType, FormLayout, NumberingFormat, formatQuestionNumber } from '@/types/checklist';
import { FormLayoutEditor } from '@/components/FormLayoutEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AITextarea } from '@/components/AITextarea';
import { RichTextQuestionEditor } from '@/components/RichTextQuestionEditor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
interface MondayBoardViewProps {
 checklist: Checklist;
 onUpdate: (checklist: Checklist) => void;
 isPreviewMode: boolean;
 isCompactMode?: boolean;
 selectedQuestions?: Set<string>;
 onSelectionChange?: (selected: Set<string>) => void;
 isEngagementMode?: boolean; // When true, users can add/delete their own questions but cannot modify template questions
 applyingQuestionId?: string | null; // ID of question currently being filled with client response
}

// Answer type options for dropdown with icons like Monday.com
const ANSWER_TYPE_OPTIONS: {
 value: AnswerType;
 label: string;
 icon: React.ElementType;
 bgColor: string;
 iconColor: string;
}[] = [{
 value: 'yes-no',
 label: 'Yes / No',
 icon: Circle,
 bgColor: 'bg-green-100',
 iconColor: 'text-green-600'
}, {
 value: 'yes-no-na',
 label: 'Yes / No / NA',
 icon: Circle,
 bgColor: 'bg-green-100',
 iconColor: 'text-green-600'
}, {
 value: 'multiple-choice',
 label: 'Multiple Choice',
 icon: Square,
 bgColor: 'bg-amber-100',
 iconColor: 'text-amber-600'
}, {
 value: 'date',
 label: 'Date',
 icon: Calendar,
 bgColor: 'bg-blue-100',
 iconColor: 'text-blue-600'
}, {
 value: 'long-answer',
 label: 'Answer',
 icon: AlignLeft,
 bgColor: 'bg-purple-100',
 iconColor: 'text-purple-600'
}, {
 value: 'amount',
 label: 'Amount',
 icon: DollarSign,
 bgColor: 'bg-yellow-100',
 iconColor: 'text-yellow-600'
}, {
 value: 'dropdown',
 label: 'Dropdown',
 icon: Menu,
 bgColor: 'bg-teal-100',
 iconColor: 'text-teal-600'
}, {
 value: 'toggle',
 label: 'Switch/Toggle',
 icon: ToggleLeft,
 bgColor: 'bg-indigo-100',
 iconColor: 'text-indigo-600'
}];

// Column options for add column dropdown
const COLUMN_OPTIONS = [{
 id: 'explanation',
 label: 'Additional Explanation',
 icon: AlignLeft,
 bgColor: 'bg-purple-100',
 iconColor: 'text-purple-600'
}, {
 id: 'reference',
 label: '+ Ref (Attached Document)',
 icon: Paperclip,
 bgColor: 'bg-pink-100',
 iconColor: 'text-pink-600'
}];

// Mock existing documents for demo
const EXISTING_DOCUMENTS = [{
 id: 'doc1',
 name: 'Company Policy.pdf',
 type: 'pdf'
}, {
 id: 'doc2',
 name: 'Guidelines 2024.docx',
 type: 'docx'
}, {
 id: 'doc3',
 name: 'Compliance Checklist.xlsx',
 type: 'xlsx'
}, {
 id: 'doc4',
 name: 'Reference Manual.pdf',
 type: 'pdf'
}];
// NumberingFormat and formatQuestionNumber are imported from @/types/checklist


// Numbering format selector component
interface NumberingFormatSelectorProps {
 currentFormat: NumberingFormat;
 onFormatChange: (format: NumberingFormat) => void;
 isPreviewMode: boolean;
}

const NUMBERING_OPTIONS: { value: NumberingFormat; label: string; example: string }[] = [
 { value: 'number', label: 'Numbers Only', example: '1. → 1.1 → 1.1.1' },
 { value: 'number-alphabet', label: 'Number + Alphabet', example: '1. → 1.A → 1.A.a' },
 { value: 'alphabet-number', label: 'Alphabet + Number', example: 'A. → A.1 → A.1.a' },
];

// Helper to format category/section number
const formatCategoryNumber = (format: NumberingFormat, sectionNumber: number): string => {
 const toUpperAlpha = (num: number): string => {
 const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 return letters[(num - 1) % 26] || 'A';
 };
 
 switch (format) {
 case 'alphabet-number':
 return `${toUpperAlpha(sectionNumber)}.`;
 default:
 return `${sectionNumber}.`;
 }
};

function NumberingFormatSelector({ currentFormat, onFormatChange, isPreviewMode }: NumberingFormatSelectorProps) {
 const [isOpen, setIsOpen] = useState(false);

 if (isPreviewMode) {
 return (
 <div className="w-14 shrink-0 flex items-center justify-center py-2">
 <ListOrdered className="h-4 w-4 text-muted-foreground" />
 </div>
 );
 }

 return (
 <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <button 
 className="w-14 shrink-0 flex items-center justify-center py-2 hover:bg-muted/50 transition-colors"
 title="Change numbering format"
 >
 <ListOrdered className="h-4 w-4 text-muted-foreground hover:text-foreground" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-56 p-2 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Numbering Format</div>
 <div className="space-y-1">
 {NUMBERING_OPTIONS.map(opt => (
 <button
 key={opt.value}
 onClick={() => {
 onFormatChange(opt.value);
 setIsOpen(false);
 }}
 className={`w-full flex flex-col items-start px-3 py-2 rounded-md transition-colors text-left ${
 currentFormat === opt.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
 }`}
 >
 <span className="text-sm font-medium">{opt.label}</span>
 <span className="text-xs text-muted-foreground">{opt.example}</span>
 </button>
 ))}
 </div>
 </PopoverContent>
 </Popover>
 );
}

// Sortable Option Row for edit popovers
interface SortableOptionRowProps {
 id: string;
 value: string;
 index: number;
 onChange: (value: string) => void;
 onRemove: () => void;
 canRemove: boolean;
}
function SortableOptionRow({
 id,
 value,
 index,
 onChange,
 onRemove,
 canRemove
}: SortableOptionRowProps) {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging
 } = useSortable({
 id
 });
 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1
 };
 return <div ref={setNodeRef} style={style} className="flex items-center gap-1">
 <button type="button" className="p-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
 <GripVertical className="h-3 w-3" />
 </button>
 <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder={`Option ${index + 1}`} />
 <button type="button" onClick={onRemove} disabled={!canRemove} className="p-1 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
 <X className="h-3.5 w-3.5" />
 </button>
 </div>;
}

// Shared Edit Options Popover Content
interface EditOptionsPopoverProps {
 editingOptions: string[];
 setEditingOptions: (options: string[]) => void;
 newOption: string;
 setNewOption: (value: string) => void;
 onSave: () => void;
 onCancel: () => void;
}
function EditOptionsPopoverContent({
 editingOptions,
 setEditingOptions,
 newOption,
 setNewOption,
 onSave,
 onCancel
}: EditOptionsPopoverProps) {
 const sensors = useSensors(useSensor(PointerSensor, {
 activationConstraint: {
 distance: 3
 }
 }), useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates
 }));
 const handleDragEnd = (event: DragEndEvent) => {
 const {
 active,
 over
 } = event;
 if (over && active.id !== over.id) {
 const oldIndex = editingOptions.findIndex((_, i) => `option-${i}` === active.id);
 const newIndex = editingOptions.findIndex((_, i) => `option-${i}` === over.id);
 if (oldIndex !== -1 && newIndex !== -1) {
 const newOptions = [...editingOptions];
 const [removed] = newOptions.splice(oldIndex, 1);
 newOptions.splice(newIndex, 0, removed);
 setEditingOptions(newOptions);
 }
 }
 };
 const handleOptionChange = (index: number, value: string) => {
 const updated = [...editingOptions];
 updated[index] = value;
 setEditingOptions(updated);
 };
 const handleRemoveOption = (index: number) => {
 if (editingOptions.length <= 1) return;
 setEditingOptions(editingOptions.filter((_, i) => i !== index));
 };
 const handleAddOption = () => {
 const trimmed = newOption.trim();
 if (trimmed && !editingOptions.includes(trimmed)) {
 setEditingOptions([...editingOptions, trimmed]);
 setNewOption('');
 }
 };
 return <div className="flex flex-col gap-2">
 <div className="text-xs font-medium text-foreground mb-1">Edit Options</div>
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <SortableContext items={editingOptions.map((_, i) => `option-${i}`)} strategy={verticalListSortingStrategy}>
 <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
 {editingOptions.map((opt, i) => <SortableOptionRow key={`option-${i}`} id={`option-${i}`} value={opt} index={i} onChange={value => handleOptionChange(i, value)} onRemove={() => handleRemoveOption(i)} canRemove={editingOptions.length > 1} />)}
 </div>
 </SortableContext>
 </DndContext>
 <div className="flex items-center gap-1.5">
 <input type="text" value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleAddOption();
 }
 }} placeholder="Add new option..." className="flex-1 px-2 py-1 text-xs bg-background border border-border border-dashed rounded focus:outline-none focus:ring-1 focus:ring-primary" />
 <button type="button" onClick={handleAddOption} disabled={!newOption.trim()} className="p-1 text-muted-foreground hover:text-green-600 disabled:opacity-30">
 <Plus className="h-3.5 w-3.5" />
 </button>
 </div>
 <div className="flex justify-end gap-1.5 pt-2 border-t border-border">
 <button type="button" onClick={onCancel} className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded transition-colors">
 Cancel
 </button>
 <button type="button" onClick={onSave} className="px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors">
 Save
 </button>
 </div>
 </div>;
}

// Multiple Choice Field Component with multi-select and edit support
interface MultipleChoiceFieldProps {
 options: string[];
 selectedAnswers: string[];
 onAnswerChange: (answers: string[]) => void;
 onOptionsChange: (options: string[]) => void;
 disabled?: boolean;
 size?: 'sm' | 'md';
}
function MultipleChoiceField({
 options,
 selectedAnswers,
 onAnswerChange,
 onOptionsChange,
 disabled,
 size = 'md'
}: MultipleChoiceFieldProps) {
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [editingOptions, setEditingOptions] = useState<string[]>([...options]);
 const [newOption, setNewOption] = useState('');

 // Store refs for callbacks to avoid stale closures
 const onOptionsChangeRef = useRef(onOptionsChange);
 const onAnswerChangeRef = useRef(onAnswerChange);
 onOptionsChangeRef.current = onOptionsChange;
 onAnswerChangeRef.current = onAnswerChange;
 const toggleSelection = (opt: string) => {
 if (disabled) return;
 const isSelected = selectedAnswers.includes(opt);
 if (isSelected) {
 onAnswerChange(selectedAnswers.filter(a => a !== opt));
 } else {
 onAnswerChange([...selectedAnswers, opt]);
 }
 };
 const handleOpenChange = (open: boolean) => {
 if (open) {
 setEditingOptions([...options]);
 setNewOption('');
 }
 setIsEditOpen(open);
 };
 const handleSaveEdit = () => {
 const validOptions = editingOptions.filter(o => o.trim() !== '');
 if (validOptions.length > 0) {
 onOptionsChangeRef.current(validOptions);
 const validAnswers = selectedAnswers.filter(a => validOptions.includes(a));
 if (validAnswers.length !== selectedAnswers.length) {
 onAnswerChangeRef.current(validAnswers);
 }
 }
 setIsEditOpen(false);
 setNewOption('');
 };
 const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
 const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
 const checkSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
 return <div className="flex items-start gap-1.5">
 <div className="flex flex-col gap-1">
 {options.map((opt, i) => {
 const isSelected = selectedAnswers.includes(opt);
 return <button key={i} onClick={e => {
 e.stopPropagation();
 toggleSelection(opt);
 }} className={`${padding} ${textSize} rounded transition-all flex items-center gap-1 whitespace-nowrap ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>
 {isSelected && <Check className={checkSize} />}
 {opt}
 </button>;
 })}
 </div>
 {!disabled && <Popover open={isEditOpen} onOpenChange={handleOpenChange}>
 <PopoverTrigger asChild>
 <button onClick={e => e.stopPropagation()} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="Edit options">
 <Pencil className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-64 p-3 bg-popover border border-border shadow-lg z-50" align="start" onClick={e => e.stopPropagation()}>
 <EditOptionsPopoverContent editingOptions={editingOptions} setEditingOptions={setEditingOptions} newOption={newOption} setNewOption={setNewOption} onSave={handleSaveEdit} onCancel={() => setIsEditOpen(false)} />
 </PopoverContent>
 </Popover>}
 </div>;
}

// Dropdown Field Component with edit support
interface DropdownFieldProps {
 options: string[];
 selectedValue: string;
 onValueChange: (value: string) => void;
 onOptionsChange: (options: string[]) => void;
 disabled?: boolean;
 size?: 'sm' | 'md';
}
function DropdownField({
 options,
 selectedValue,
 onValueChange,
 onOptionsChange,
 disabled,
 size = 'md'
}: DropdownFieldProps) {
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [editingOptions, setEditingOptions] = useState<string[]>([...options]);
 const [newOption, setNewOption] = useState('');

 // Store refs for callbacks to avoid stale closures
 const onOptionsChangeRef = useRef(onOptionsChange);
 const onValueChangeRef = useRef(onValueChange);
 onOptionsChangeRef.current = onOptionsChange;
 onValueChangeRef.current = onValueChange;
 const handleOpenChange = (open: boolean) => {
 if (open) {
 setEditingOptions([...options]);
 setNewOption('');
 }
 setIsEditOpen(open);
 };
 const handleSaveEdit = () => {
 const validOptions = editingOptions.filter(o => o.trim() !== '');
 if (validOptions.length > 0) {
 onOptionsChangeRef.current(validOptions);
 // Clear selection if it no longer exists
 if (selectedValue && !validOptions.includes(selectedValue)) {
 onValueChangeRef.current('');
 }
 }
 setIsEditOpen(false);
 setNewOption('');
 };
 const selectHeight = size === 'sm' ? 'h-7' : 'h-8';
 const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
 return <div className="flex items-center gap-1 w-full overflow-hidden">
 <select value={selectedValue} onChange={e => {
 e.stopPropagation();
 onValueChange(e.target.value);
 }} onClick={e => e.stopPropagation()} className={`${selectHeight} px-2 ${textSize} bg-muted border-border text-foreground rounded flex-1 min-w-0 truncate`}>
 <option value="">Select...</option>
 {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
 </select>
 {!disabled && <Popover open={isEditOpen} onOpenChange={handleOpenChange}>
 <PopoverTrigger asChild>
 <button onClick={e => e.stopPropagation()} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors shrink-0" title="Edit options">
 <Pencil className="h-3.5 w-3.5" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-64 p-3 bg-popover border border-border shadow-lg z-50" align="start" onClick={e => e.stopPropagation()}>
 <EditOptionsPopoverContent editingOptions={editingOptions} setEditingOptions={setEditingOptions} newOption={newOption} setNewOption={setNewOption} onSave={handleSaveEdit} onCancel={() => setIsEditOpen(false)} />
 </PopoverContent>
 </Popover>}
 </div>;
}

// Reference Button Component
interface RefButtonProps {
 reference?: {
 name: string;
 id?: string;
 } | null;
 onAttach: (doc: {
 name: string;
 id?: string;
 }) => void;
 onRemove: () => void;
 disabled?: boolean;
}
function RefButton({
 reference,
 onAttach,
 onRemove,
 disabled
}: RefButtonProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const fileInputRef = useRef<HTMLInputElement>(null);
 const filteredDocs = EXISTING_DOCUMENTS.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 onAttach({
 name: file.name
 });
 setIsOpen(false);
 setSearchTerm('');
 }
 e.target.value = '';
 };
 // In preview mode, still show the + Ref button but display attached reference read-only style
 if (disabled && reference) {
 return <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted rounded">
 <File className="h-3 w-3" />
 <span className="truncate max-w-[120px]">{reference.name}</span>
 </div>;
 }
 if (reference) {
 return <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
 <File className="h-3 w-3 shrink-0" />
 <span className="truncate max-w-[100px]">{reference.name}</span>
 <button onClick={e => {
 e.stopPropagation();
 onRemove();
 }} className="p-0.5 hover:bg-primary/20 rounded shrink-0">
 <X className="h-3 w-3" />
 </button>
 </div>;
 }
 return <>
 <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
 <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <button onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-dashed border-blue-300 transition-colors">
 <Paperclip className="h-3.5 w-3.5" />
 <span>+ Ref</span>
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-72 p-0 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 {/* Search input */}
 <div className="p-3 border-b border-border">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search documents..." className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm" />
 </div>
 </div>

 {/* Upload new document option */}
 <div className="p-2 border-b border-border">
 <button onClick={e => {
 e.stopPropagation();
 fileInputRef.current?.click();
 }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left">
 <div className="w-7 h-7 rounded flex items-center justify-center bg-green-100 dark:bg-green-900/30">
 <Upload className="h-4 w-4 text-green-600" />
 </div>
 <span className="text-sm text-foreground">Upload new document</span>
 </button>
 </div>

 {/* Existing documents */}
 <div className="p-2 max-h-48 overflow-y-auto">
 <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Existing documents</p>
 {filteredDocs.length > 0 ? <div className="space-y-1">
 {filteredDocs.map(doc => <button key={doc.id} onClick={e => {
 e.stopPropagation();
 onAttach({
 id: doc.id,
 name: doc.name
 });
 setIsOpen(false);
 setSearchTerm('');
 }} className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-left">
 <File className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm text-foreground truncate">{doc.name}</span>
 </button>)}
 </div> : <p className="text-sm text-muted-foreground text-center py-3">No documents found</p>}
 </div>
 </PopoverContent>
 </Popover>
 </>;
}

// Strip HTML tags from text for clean display
const stripHtml = (html: string): string => {
 return html.replace(/<[^>]*>/g, '').trim();
};

// Add Column Button Component
interface AddColumnButtonProps {
 onAddColumn: (columnId: string) => void;
 visibleColumns: {
 explanation: boolean;
 reference: boolean;
 };
}
function AddColumnButton({
 onAddColumn,
 visibleColumns
}: AddColumnButtonProps) {
 const [searchTerm, setSearchTerm] = useState('');
 const [isOpen, setIsOpen] = useState(false);
 const filteredOptions = COLUMN_OPTIONS.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()) && !visibleColumns[opt.id as keyof typeof visibleColumns]);
 return <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <button className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors">
 <Plus className="h-4 w-4 text-muted-foreground" />
 </button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-72 p-0 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 {/* Column options */}
 <div className="p-2">
 {filteredOptions.length > 0 ? <div className="grid grid-cols-2 gap-2">
 {filteredOptions.map(opt => {
 const IconComponent = opt.icon;
 return <button key={opt.id} onClick={() => {
 onAddColumn(opt.id);
 setIsOpen(false);
 setSearchTerm('');
 }} className="flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left">
 <div className={`w-7 h-7 rounded flex items-center justify-center ${opt.bgColor}`}>
 <IconComponent className={`h-4 w-4 ${opt.iconColor}`} />
 </div>
 <span className="text-sm text-popover-foreground">{opt.label}</span>
 </button>;
 })}
 </div> : <p className="text-sm text-muted-foreground text-center py-4">All columns are already visible</p>}
 </div>
 </PopoverContent>
 </Popover>;
}

// Response Type Dropdown Component (Monday.com style)
interface ResponseTypeDropdownProps {
 currentType: AnswerType;
 onTypeChange: (type: AnswerType) => void;
 disabled?: boolean;
}
function ResponseTypeDropdown({
 currentType,
 onTypeChange,
 disabled
}: ResponseTypeDropdownProps) {
 const [searchTerm, setSearchTerm] = useState('');
 const [isOpen, setIsOpen] = useState(false);
 const currentTypeConfig = ANSWER_TYPE_OPTIONS.find(o => o.value === currentType) || ANSWER_TYPE_OPTIONS[0];
 const CurrentTypeIcon = currentTypeConfig.icon;
 const filteredOptions = ANSWER_TYPE_OPTIONS.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
 if (disabled) {
 return null;
 }
 return <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <button onClick={e => e.stopPropagation()} className="flex items-center justify-center p-1 hover:bg-muted rounded transition-colors pt-[4px]" title={currentTypeConfig.label}>
 <div className={`w-7 h-7 rounded flex items-center justify-center ${currentTypeConfig.bgColor}`}>
 <CurrentTypeIcon className={`h-4 w-4 ${currentTypeConfig.iconColor}`} />
 </div>
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-72 p-0 bg-popover border-border shadow-xl z-50" sideOffset={5}>
 
 {/* Response type options */}
 <div className="p-2">
 <div className="grid grid-cols-2 gap-1.5">
 {filteredOptions.map(opt => {
 const IconComponent = opt.icon;
 const isSelected = opt.value === currentType;
 return <button key={opt.value} onClick={e => {
 e.stopPropagation();
 onTypeChange(opt.value);
 setIsOpen(false);
 setSearchTerm('');
 }} className={`flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left ${isSelected ? 'bg-muted' : 'hover:bg-muted/50'}`}>
 <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center ${opt.bgColor}`}>
 <IconComponent className={`h-3.5 w-3.5 ${opt.iconColor}`} />
 </div>
 <span className="text-xs text-popover-foreground whitespace-nowrap truncate">{opt.label}</span>
 </button>;
 })}
 </div>
 </div>
 </PopoverContent>
 </Popover>;
}

// Sortable Sub-item row component
interface SubItemRowProps {
 subItem: Question;
 index: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 isPreviewMode: boolean;
 isCompactMode: boolean;
 parentId: string;
 visibleColumns: {
 explanation: boolean;
 reference: boolean;
 };
 columnWidths: {
 questions: string;
 response: string;
 explanation: string;
 reference: string;
 };
 sectionNumber: number;
 itemNumber: number;
 isEngagementMode?: boolean;
 numberingFormat: NumberingFormat;
 applyingQuestionId?: string | null;
}
interface SortableSubItemRowProps extends SubItemRowProps {
 isLast: boolean;
 totalCount: number;
 isNewEmpty?: boolean;
 onBlurCleanup?: () => void;
}
function SortableSubItemRow({
 subItem,
 onUpdate,
 onDelete,
 isPreviewMode,
 isCompactMode,
 index,
 parentId,
 isLast,
 totalCount,
 visibleColumns,
 columnWidths,
 isNewEmpty,
 onBlurCleanup,
 sectionNumber,
 itemNumber,
 isEngagementMode = false,
 numberingFormat,
 applyingQuestionId
}: SortableSubItemRowProps) {
 const isApplying = applyingQuestionId === subItem.id;
 const [isEditingName, setIsEditingName] = useState(isNewEmpty || false);
 const [isSelected, setIsSelected] = useState(false);
 const draftNameRef = useRef(subItem.text);
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 isOver,
 active
 } = useSortable({
 id: subItem.id,
 data: {
 type: 'subitem',
 parentId,
 subItem
 }
 });

 // Check if this is a valid drop target
 const isDropTarget = isOver && active?.id !== subItem.id;
 const activeType = active?.data?.current?.type;
 const isValidDropTarget = isDropTarget && activeType === 'subitem';
 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1
 };
 const handleSave = () => {
 const trimmed = draftNameRef.current.trim();
 if (trimmed && trimmed !== subItem.text) {
 onUpdate({
...subItem,
 text: trimmed
 });
 }
 setIsEditingName(false);
 };
 const handleCancel = () => {
 draftNameRef.current = subItem.text;
 setIsEditingName(false);
 // If this was a new empty sub-item and user cancelled, trigger cleanup
 if (isNewEmpty && subItem.text.trim() === '') {
 onBlurCleanup?.();
 }
 };
 const handleAnswerChange = (answer: string) => {
 onUpdate({
...subItem,
 answer
 });
 };
 const handleAnswerTypeChange = (answerType: AnswerType) => {
 onUpdate({
...subItem,
 answerType,
 answer: ''
 });
 };
 const renderResponseField = () => {
 switch (subItem.answerType) {
 case 'yes-no':
 case 'yes-no-na':
 const options = subItem.answerType === 'yes-no' ? ['Yes', 'No'] : ['Yes', 'No', 'NA'];
 return <div className="flex gap-1">
 {options.map(opt => <button key={opt} onClick={e => {
 e.stopPropagation();
 handleAnswerChange(opt);
 }} className={`px-2 py-1 text-xs rounded transition-all ${subItem.answer === opt ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>
 {opt}
 </button>)}
 </div>;
 case 'multiple-choice':
 const mcSubOptions = subItem.options || ['Option 1', 'Option 2', 'Option 3'];
 const subSelectedAnswers = subItem.answer ? subItem.answer.split('|||').filter(a => a) : [];
 return <MultipleChoiceField options={mcSubOptions} selectedAnswers={subSelectedAnswers} onAnswerChange={answers => onUpdate({
...subItem,
 answer: answers.join('|||')
 })} onOptionsChange={opts => onUpdate({
...subItem,
 options: opts
})} disabled={isPreviewMode || (isEngagementMode && !subItem.isUserAdded)} size="sm" />;
 case 'dropdown':
 const dropdownSubOptions = subItem.options || ['Option 1', 'Option 2'];
 return <DropdownField options={dropdownSubOptions} selectedValue={subItem.answer || ''} onValueChange={value => onUpdate({
...subItem,
 answer: value
 })} onOptionsChange={opts => onUpdate({
...subItem,
 options: opts
 })} disabled={isPreviewMode || (isEngagementMode && !subItem.isUserAdded)} size="sm" />;
 case 'long-answer':
 return <AITextarea value={subItem.answer || ''} onChange={val => handleAnswerChange(val)} placeholder="Enter your detailed answer..." minHeight="60px" isCompactMode={isCompactMode} />;
 case 'none':
 return null;
 case 'date':
 return <Input type="date" value={subItem.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} className="h-7 text-xs bg-muted border-border text-foreground w-fit" />;
 case 'amount':
 return <div className="relative">
 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
 <Input type="number" value={subItem.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} placeholder="0.00" className="h-7 text-xs bg-muted border-border text-foreground pl-5" />
 </div>;
 case 'file-upload':
 return <div className="flex items-center gap-1">
 {subItem.answer ? <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
 <File className="h-3 w-3" />
 <span className="truncate max-w-[80px]">{subItem.answer}</span>
 {!isPreviewMode && <button onClick={() => handleAnswerChange('')} className="hover:text-red-500">
 <X className="h-3 w-3" />
 </button>}
 </div> : <label className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded cursor-pointer hover:bg-muted/80">
 <Upload className="h-3 w-3" />
 <span>Upload</span>
 <input type="file" className="hidden" onChange={e => {
 const file = e.target.files?.[0];
 if (file) handleAnswerChange(file.name);
 }} />
 </label>}
 </div>;
 case 'toggle':
 return <button onClick={e => {
 e.stopPropagation();
 handleAnswerChange(subItem.answer === 'true' ? 'false' : 'true');
 }} className={`w-10 h-5 rounded-full transition-colors relative ${subItem.answer === 'true' ? 'bg-primary' : 'bg-muted'}`}>
 <div className={`absolute top-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${subItem.answer === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
 </button>;
 default:
 return <Input value={subItem.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Enter response..." className="h-7 text-xs bg-muted border-border text-foreground" />;
 }
 };
 return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`doc-item-row group flex items-stretch hover:bg-muted/50 transition-all relative border-b border-border/50 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 ring-2 ring-primary ring-offset-1 z-10' : ''} ${isValidDropTarget ? 'bg-primary/5' : ''} ${isApplying ? 'ring-2 ring-primary ring-inset animate-pulse bg-primary/10' : ''}`}>
 {/* Drop indicator line */}
 {isValidDropTarget && <div className="absolute -top-[2px] left-0 right-0 h-1 bg-primary rounded-full z-20 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
 {/* Loading indicator when applying response */}
 {isApplying && (
 <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
 <Loader2 className="h-4 w-4 text-primary animate-spin" />
 </div>
 )}
 {/* Checkbox column */}
 <div className="w-10 shrink-0 flex items-center justify-center self-center doc-checkbox">
 <Checkbox checked={isSelected} onCheckedChange={() => setIsSelected(!isSelected)} className="h-4 w-4 border-border bg-background" />
 </div>

 {/* Numbering column for sub-item */}
 <div className="w-14 shrink-0 flex items-center justify-center self-center px-1 border-l border-border/50 doc-numbering doc-col-divider">
 <span className="text-xs font-medium text-muted-foreground">
 {formatQuestionNumber(numberingFormat, sectionNumber, itemNumber - 1, index)}
 </span>
 </div>

 {/* Sub-item name - width matches header */}
 <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2 border-l border-border/50 doc-col-divider" style={{
 flexBasis: columnWidths.questions
 }}>
 {isEditingName && !isPreviewMode && (!isEngagementMode || subItem.isUserAdded) ? <RichTextQuestionEditor value={subItem.text} onChange={newValue => {
 draftNameRef.current = newValue;
 }} onBlur={() => {
 handleSave();
 // If text is still empty after blur, trigger cleanup
 if (draftNameRef.current.trim() === '' && isNewEmpty) {
 setTimeout(() => onBlurCleanup?.(), 100);
 }
 }} onCancel={handleCancel} className="text-sm min-h-[32px] bg-muted text-foreground" /> : isCompactMode ? <Tooltip>
 <TooltipTrigger asChild>
 <div onClick={e => {
 // Only allow editing if not preview mode AND (not engagement mode OR user added this)
 const canEditText = !isPreviewMode && (!isEngagementMode || subItem.isUserAdded);
 if (canEditText) {
 e.stopPropagation();
 draftNameRef.current = subItem.text;
 setIsEditingName(true);
 }
}} className={`question-content text-sm text-foreground ${!isPreviewMode && (!isEngagementMode || subItem.isUserAdded) ? 'cursor-text hover:text-foreground' : ''} line-clamp-1 overflow-hidden p-1.5 border-2 border-transparent rounded-md box-border`} dangerouslySetInnerHTML={{
 __html: sanitizeHtml(subItem.text) || 'Click to add sub-item...'
 }} />
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-popover text-popover-foreground border border-border shadow-lg max-w-md">
 <div dangerouslySetInnerHTML={{
 __html: sanitizeHtml(subItem.text)
 }} />
 </TooltipContent>
 </Tooltip> : <div onClick={e => {
 // Only allow editing if not preview mode AND (not engagement mode OR user added this)
 const canEditText = !isPreviewMode && (!isEngagementMode || subItem.isUserAdded);
 if (canEditText) {
 e.stopPropagation();
 draftNameRef.current = subItem.text;
 setIsEditingName(true);
 }
}} className={`question-content text-sm text-foreground ${!isPreviewMode && (!isEngagementMode || subItem.isUserAdded) ? 'cursor-text hover:text-foreground' : ''} p-1.5 border-2 border-transparent rounded-md box-border`} dangerouslySetInnerHTML={{
 __html: sanitizeHtml(subItem.text) || 'Click to add sub-item...'
 }} />}
 </div>

 {/* Response column with inline type selector and response field */}
 <div className="flex-1 min-w-0 px-2 py-2 border-l border-border/50 doc-col-divider flex items-stretch overflow-hidden" style={{
 flexBasis: columnWidths.response
 }}>
 <div className="flex items-center gap-2 w-full min-w-0">
 <ResponseTypeDropdown currentType={subItem.answerType} onTypeChange={handleAnswerTypeChange} disabled={isPreviewMode || (isEngagementMode && !subItem.isUserAdded)} />
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap gap-1">
 {renderResponseField()}
 </div>
 </div>
 </div>
 </div>

 {/* Additional Explanation column - conditionally rendered */}
 {visibleColumns.explanation && <div className="flex-1 min-w-0 px-2 py-2 border-l border-border/50 doc-col-divider flex items-center overflow-hidden" style={{
 flexBasis: columnWidths.explanation
 }}>
 {(subItem as any).showExplanation !== false ? <div className="relative group/exp w-full overflow-hidden">
 <AITextarea value={subItem.explanation || ''} onChange={val => onUpdate({
...subItem,
 explanation: val
 })} placeholder="Additional Explanation" minHeight="40px" isCompactMode={isCompactMode} />
 {!isPreviewMode && <button onClick={() => onUpdate({
...subItem,
 showExplanation: false,
 explanation: ''
 } as any)} className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover/exp:opacity-100 transition-opacity shadow-sm" title="Remove explanation">
 <X className="h-3 w-3" />
 </button>}
 </div> : !isPreviewMode && <button onClick={() => onUpdate({
...subItem,
 showExplanation: true
 } as any)} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors">
 <Plus className="h-3 w-3" />
 <span>Add</span>
 </button>}
 </div>}

 {/* Reference column - conditionally rendered */}
 {visibleColumns.reference && <div className="flex-1 min-w-0 px-2 py-2 flex items-center border-l border-border/50 doc-col-divider" style={{
 flexBasis: columnWidths.reference
 }}>
 <RefButton reference={(subItem as any).reference} onAttach={doc => onUpdate({
...subItem,
 reference: doc
 } as any)} onRemove={() => onUpdate({
...subItem,
 reference: null
 } as any)} disabled={isPreviewMode} />
 </div>}


 {/* Actions - keep same reserved width as main rows so columns always align */}
 {/* Only show delete if not engagement mode OR if user added this sub-item */}
 {!isPreviewMode && (!isEngagementMode || subItem.isUserAdded) && <div className="w-[180px] shrink-0 flex items-center justify-end self-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={e => {
 e.stopPropagation();
 onDelete();
 }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
 <Trash2 className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Delete sub-item</TooltipContent>
 </Tooltip>
 </div>}
 {/* Reserve space when delete is hidden in engagement mode */}
 {!isPreviewMode && isEngagementMode && !subItem.isUserAdded && <div className="w-[180px] shrink-0" />}
 </div>;
}

// Sortable Item row component
interface ItemRowProps {
 item: Question;
 sectionId: string;
 itemIndex: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 onDuplicate: () => void;
 onAddSubItem: () => void;
 onAddItemAtPosition: (position: 'above' | 'below') => void;
 isPreviewMode: boolean;
 isCompactMode: boolean;
 onSubItemsReorder: (itemId: string, newSubItems: Question[]) => void;
 visibleColumns: {
 explanation: boolean;
 reference: boolean;
 };
 columnWidths: {
 questions: string;
 response: string;
 explanation: string;
 reference: string;
 };
 sectionNumber: number;
 isSelected: boolean;
 onSelectionChange: (selected: boolean) => void;
 isEngagementMode?: boolean;
 numberingFormat: NumberingFormat;
 applyingQuestionId?: string | null;
}
function SortableItemRow({
 item,
 sectionId,
 itemIndex,
 onUpdate,
 onDelete,
 onDuplicate,
 onAddSubItem,
 onAddItemAtPosition,
 isPreviewMode,
 isCompactMode,
 onSubItemsReorder,
 visibleColumns,
 columnWidths,
 sectionNumber,
 isSelected,
 onSelectionChange,
 isEngagementMode = false,
 numberingFormat,
 applyingQuestionId
}: ItemRowProps) {
 const isApplying = applyingQuestionId === item.id;
 const [isExpanded, setIsExpanded] = useState(true);
 const [isEditingName, setIsEditingName] = useState(false);
 const [isPendingSubItem, setIsPendingSubItem] = useState(false);
 const draftNameRef = useRef(item.text);
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 isOver,
 active
 } = useSortable({
 id: item.id,
 data: {
 type: 'item',
 sectionId,
 item
 }
 });

 // Check if this is a valid drop target (item being dragged over)
 const isDropTarget = isOver && active?.id !== item.id;
 const activeType = active?.data?.current?.type;
 const isValidDropTarget = isDropTarget && activeType === 'item';
 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1
 };
 const hasSubItems = item.subQuestions && item.subQuestions.length > 0;
 const hasRealSubItems = hasSubItems && item.subQuestions!.some(sq => sq.text.trim() !== '');

 // Handle chevron click - expand to add sub-item section
 const handleChevronClick = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (hasSubItems) {
 setIsExpanded(!isExpanded);
 } else {
 // Start adding a new sub-item
 setIsPendingSubItem(true);
 setIsExpanded(true);
 onAddSubItem();
 }
 };

 // Clean up empty sub-items when collapsing or losing focus
 const cleanupEmptySubItems = () => {
 if (item.subQuestions) {
 const nonEmptySubItems = item.subQuestions.filter(sq => sq.text.trim() !== '');
 if (nonEmptySubItems.length !== item.subQuestions.length) {
 onUpdate({
...item,
 subQuestions: nonEmptySubItems.length > 0 ? nonEmptySubItems : undefined
 });
 }
 if (nonEmptySubItems.length === 0) {
 setIsExpanded(false);
 setIsPendingSubItem(false);
 }
 }
 };
 const handleSave = () => {
 const trimmed = draftNameRef.current.trim();
 if (trimmed && trimmed !== item.text) {
 onUpdate({
...item,
 text: trimmed
 });
 }
 setIsEditingName(false);
 };
 const handleCancel = () => {
 draftNameRef.current = item.text;
 setIsEditingName(false);
 };
 const handleAnswerChange = (answer: string) => {
 onUpdate({
...item,
 answer
 });
 };
 const handleAnswerTypeChange = (answerType: AnswerType) => {
 onUpdate({
...item,
 answerType,
 answer: ''
 });
 };
 const handleSubItemUpdate = (index: number, updatedSub: Question) => {
 const newSubQuestions = [...(item.subQuestions || [])];
 newSubQuestions[index] = updatedSub;
 onUpdate({
...item,
 subQuestions: newSubQuestions
 });
 };
 const handleSubItemDelete = (index: number) => {
 const newSubQuestions = (item.subQuestions || []).filter((_, i) => i !== index);
 onUpdate({
...item,
 subQuestions: newSubQuestions
 });
 };
 const renderResponseField = () => {
 switch (item.answerType) {
 case 'yes-no':
 case 'yes-no-na':
 const options = item.answerType === 'yes-no' ? ['Yes', 'No'] : ['Yes', 'No', 'NA'];
 return <div className="flex gap-1">
 {options.map(opt => <button key={opt} onClick={e => {
 e.stopPropagation();
 handleAnswerChange(opt);
 }} className={`px-2 py-1 text-xs rounded transition-all ${item.answer === opt ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>
 {opt}
 </button>)}
 </div>;
 case 'multiple-choice':
 const mcItemOptions = item.options || ['Option 1', 'Option 2', 'Option 3'];
 const itemSelectedAnswers = item.answer ? item.answer.split('|||').filter(a => a) : [];
 return <MultipleChoiceField options={mcItemOptions} selectedAnswers={itemSelectedAnswers} onAnswerChange={answers => onUpdate({
...item,
 answer: answers.join('|||')
 })} onOptionsChange={opts => onUpdate({
...item,
 options: opts
})} disabled={isPreviewMode || (isEngagementMode && !item.isUserAdded)} size="sm" />;
 case 'dropdown':
 const dropdownItemOptions = item.options || ['Option 1', 'Option 2'];
 return <DropdownField options={dropdownItemOptions} selectedValue={item.answer || ''} onValueChange={value => onUpdate({
...item,
 answer: value
 })} onOptionsChange={opts => onUpdate({
...item,
 options: opts
 })} disabled={isPreviewMode || (isEngagementMode && !item.isUserAdded)} size="md" />;
 case 'long-answer':
 return <AITextarea value={item.answer || ''} onChange={val => handleAnswerChange(val)} placeholder="Enter your detailed answer..." minHeight="60px" isCompactMode={isCompactMode} />;
 case 'none':
 return null;
 case 'date':
 return <Input type="date" value={item.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} className="h-8 text-sm bg-muted border-border text-foreground w-fit" />;
 case 'amount':
 return <div className="relative">
 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
 <Input type="number" value={item.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} placeholder="0.00" className="h-8 text-sm bg-muted border-border text-foreground pl-5" />
 </div>;
 case 'file-upload':
 return <div className="flex items-center gap-1">
 {item.answer ? <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
 <File className="h-3 w-3" />
 <span className="truncate max-w-[100px]">{item.answer}</span>
 <button onClick={() => handleAnswerChange('')} className="hover:text-red-500">
 <X className="h-3 w-3" />
 </button>
 </div> : <label className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-muted rounded cursor-pointer hover:bg-muted/80">
 <Upload className="h-3.5 w-3.5" />
 <span>Upload file</span>
 <input type="file" className="hidden" onChange={e => {
 const file = e.target.files?.[0];
 if (file) handleAnswerChange(file.name);
 }} />
 </label>}
 </div>;
 case 'toggle':
 return <button onClick={e => {
 e.stopPropagation();
 handleAnswerChange(item.answer === 'true' ? 'false' : 'true');
 }} className={`w-11 h-6 rounded-full transition-colors relative ${item.answer === 'true' ? 'bg-primary' : 'bg-muted'}`}>
 <div className={`absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-transform ${item.answer === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
 </button>;
 default:
 return <Input value={item.answer || ''} onChange={e => handleAnswerChange(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Enter response..." className="h-8 text-sm bg-muted border-border text-foreground" />;
 }
 };
 const subItemIds = item.subQuestions?.map(sq => sq.id) || [];
 return <div ref={setNodeRef} style={style} className={`doc-item-row relative border-b border-border/50 ${isDragging ? 'z-10' : ''} ${isApplying ? 'ring-2 ring-primary ring-inset animate-pulse' : ''}`}>
 {/* Drop indicator line - shows above item when hovering */}
 {isValidDropTarget && <div className="absolute -top-[2px] left-0 right-0 h-1 bg-primary rounded-full z-20 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
 {/* Loading indicator when applying response */}
 {isApplying && (
 <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
 <Loader2 className="h-4 w-4 text-primary animate-spin" />
 </div>
 )}
 {/* Main item row - full row is draggable */}
 <div {...!isEditingName ? {
...attributes,
...listeners
 } : {}} className={`group flex items-stretch hover:bg-muted/50 transition-all ${isSelected ? 'bg-muted/50' : ''} ${!isEditingName ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50 ring-2 ring-primary ring-offset-1' : ''} ${isValidDropTarget ? 'bg-primary/5' : ''} ${isApplying ? 'bg-primary/10' : ''}`}>
 {/* Checkbox */}
 <div className="w-10 shrink-0 flex items-center justify-center self-center doc-checkbox">
 <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange(checked === true)} className="h-4 w-4 border-border" />
 </div>

 {/* Expand arrow - Monday.com style: dull on hover, solid when has sub-items */}
 <div className="w-8 shrink-0 flex items-center justify-center self-center doc-drag-handle">
 {hasRealSubItems ? <button onClick={handleChevronClick} className="p-0.5 rounded hover:bg-muted transition-colors" title={isExpanded ? "Collapse sub-items" : "Expand sub-items"}>
 {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 </button> : !isPreviewMode ? <button onClick={handleChevronClick} className="p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100" title="Add sub-item">
 <ChevronRight className="h-4 w-4 text-muted-foreground" />
 </button> : <div className="w-4" />}
 </div>

 {/* Numbering column */}
 <div className="w-14 shrink-0 flex items-center justify-center self-center px-1 border-l border-border/50 doc-numbering doc-col-divider">
 <span className="text-xs font-medium text-muted-foreground">
 {formatQuestionNumber(numberingFormat, sectionNumber, itemIndex)}
 {item.required && isPreviewMode && <span className="text-red-500 ml-0.5">*</span>}
 </span>
 </div>

 {/* Item name */}
 <div className="flex-1 min-w-0 px-3 py-1 flex items-center gap-2 border-l border-border/50 doc-col-divider" style={{
 flexBasis: columnWidths.questions
 }}>
 {isEditingName && !isPreviewMode && (!isEngagementMode || item.isUserAdded) ? <RichTextQuestionEditor value={item.text} onChange={newValue => {
 draftNameRef.current = newValue;
 }} onBlur={handleSave} onCancel={handleCancel} className="text-sm min-h-[36px] bg-muted text-foreground flex-1" /> : <div className="flex items-center gap-2 flex-1 min-w-0">
 {isCompactMode ? <Tooltip>
 <TooltipTrigger asChild>
 <div onClick={e => {
 // Only allow editing if not preview mode AND (not engagement mode OR user added this)
 const canEditText = !isPreviewMode && (!isEngagementMode || item.isUserAdded);
 if (canEditText) {
 e.stopPropagation();
 draftNameRef.current = item.text;
 setIsEditingName(true);
 }
}} className={`question-content text-sm text-foreground flex-1 ${!isPreviewMode && (!isEngagementMode || item.isUserAdded) ? 'cursor-text hover:text-foreground' : ''} line-clamp-1 overflow-hidden p-1.5 border-2 border-transparent rounded-md box-border`} dangerouslySetInnerHTML={{
 __html: sanitizeHtml(item.text) || 'Click to add item name...'
 }} />
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-popover text-popover-foreground border border-border shadow-lg max-w-md">
 <div dangerouslySetInnerHTML={{
 __html: sanitizeHtml(item.text)
 }} />
 </TooltipContent>
 </Tooltip> : <div onClick={e => {
 // Only allow editing if not preview mode AND (not engagement mode OR user added this)
 const canEditText = !isPreviewMode && (!isEngagementMode || item.isUserAdded);
 if (canEditText) {
 e.stopPropagation();
 draftNameRef.current = item.text;
 setIsEditingName(true);
 }
}} className={`question-content text-sm text-foreground flex-1 ${!isPreviewMode && (!isEngagementMode || item.isUserAdded) ? 'cursor-text hover:text-foreground' : ''} p-1.5 border-2 border-transparent rounded-md box-border`} dangerouslySetInnerHTML={{
 __html: sanitizeHtml(item.text) || 'Click to add item name...'
 }} />}
 {hasRealSubItems && <Tooltip>
 <TooltipTrigger asChild>
 <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium shrink-0 cursor-default">
 {item.subQuestions!.filter(sq => sq.text.trim() !== '').length}
 </span>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-popover text-popover-foreground border border-border shadow-lg">
 {item.subQuestions!.filter(sq => sq.text.trim() !== '').length === 1 ? '1 Sub-question' : `${item.subQuestions!.filter(sq => sq.text.trim() !== '').length} Sub-questions`}
 </TooltipContent>
 </Tooltip>}
 </div>}
 </div>

 {/* Response column with inline type selector and response field */}
 <div className="flex-1 min-w-0 px-2 py-2 border-l border-border/50 doc-col-divider flex items-stretch overflow-hidden" style={{
 flexBasis: columnWidths.response
 }}>
 <div className="flex items-center gap-2 w-full min-w-0">
 <div className="doc-response-type"><ResponseTypeDropdown currentType={item.answerType} onTypeChange={handleAnswerTypeChange} disabled={isPreviewMode || (isEngagementMode && !item.isUserAdded)} /></div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap gap-1">
 {renderResponseField()}
 </div>
 </div>
 </div>
 </div>

 {/* Additional Explanation column - conditionally rendered */}
 {visibleColumns.explanation && <div className="flex-1 min-w-0 px-2 py-2 border-l border-border/50 doc-col-divider flex items-center overflow-hidden" style={{
 flexBasis: columnWidths.explanation
 }}>
 {(item as any).showExplanation !== false ? <div className="relative group/exp w-full overflow-hidden">
 <AITextarea value={item.explanation || ''} onChange={val => onUpdate({
...item,
 explanation: val
 })} placeholder="Additional Explanation" minHeight="40px" isCompactMode={isCompactMode} />
 {!isPreviewMode && <button onClick={() => onUpdate({
...item,
 showExplanation: false,
 explanation: ''
 } as any)} className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full text-muted-foreground hover:text-red-500 hover:border-red-300 opacity-0 group-hover/exp:opacity-100 transition-opacity shadow-sm" title="Remove explanation">
 <X className="h-3 w-3" />
 </button>}
 </div> : !isPreviewMode && <button onClick={() => onUpdate({
...item,
 showExplanation: true
 } as any)} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors">
 <Plus className="h-3 w-3" />
 <span>Add</span>
 </button>}
 </div>}

 {/* Reference column - conditionally rendered */}
 {visibleColumns.reference && <div className="flex-1 min-w-0 px-2 py-2 flex items-center border-l border-border/50 doc-col-divider" style={{
 flexBasis: columnWidths.reference
 }}>
 <RefButton reference={(item as any).reference} onAttach={doc => onUpdate({
...item,
 reference: doc
 } as any)} onRemove={() => onUpdate({
...item,
 reference: null
 } as any)} disabled={isPreviewMode} />
 </div>}


 {/* Actions column - inline icons on hover */}
 {!isPreviewMode && <div className="w-[180px] shrink-0 flex items-center justify-end gap-1 self-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {/* Required toggle - only show if not engagement mode or if user-added */}
 {(!isEngagementMode || item.isUserAdded) && (
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onUpdate({
...item,
 required: !item.required
 });
 }} 
 className={`p-1.5 rounded border border-transparent hover:border-border hover:bg-secondary hover:shadow-sm transition-all ${item.required ? 'text-red-500' : 'text-muted-foreground hover:text-secondary-foreground'}`}
 >
 <Asterisk className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">{item.required ? 'Remove required' : 'Mark as required'}</TooltipContent>
 </Tooltip>
 )}

 {/* Add sub-item */}
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onAddSubItem();
 }} 
 className="p-1.5 rounded border border-transparent hover:border-border hover:bg-secondary hover:shadow-sm text-muted-foreground hover:text-secondary-foreground transition-all"
 >
 <PlusCircle className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Add sub-item</TooltipContent>
 </Tooltip>

 {/* Add item above */}
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onAddItemAtPosition('above');
 }} 
 className="p-1.5 rounded border border-transparent hover:border-border hover:bg-secondary hover:shadow-sm text-muted-foreground hover:text-secondary-foreground transition-all"
 >
 <AddItemAboveIcon className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Add item above</TooltipContent>
 </Tooltip>

 {/* Add item below */}
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onAddItemAtPosition('below');
 }} 
 className="p-1.5 rounded border border-transparent hover:border-border hover:bg-secondary hover:shadow-sm text-muted-foreground hover:text-secondary-foreground transition-all"
 >
 <AddItemBelowIcon className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Add item below</TooltipContent>
 </Tooltip>

 {/* Duplicate - only show if not engagement mode or if user-added */}
 {(!isEngagementMode || item.isUserAdded) && (
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onDuplicate();
 }} 
 className="p-1.5 rounded border border-transparent hover:border-border hover:bg-secondary hover:shadow-sm text-muted-foreground hover:text-secondary-foreground transition-all"
 >
 <Copy className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Duplicate</TooltipContent>
 </Tooltip>
 )}

 {/* Delete - only show if not engagement mode OR if user added this question */}
 {(!isEngagementMode || item.isUserAdded) && (
 <Tooltip>
 <TooltipTrigger asChild>
 <button 
 onClick={e => {
 e.stopPropagation();
 onDelete();
 }} 
 className="p-1.5 rounded border border-transparent hover:border-red-200 hover:bg-red-50 hover:shadow-sm text-muted-foreground hover:text-red-500 transition-all"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top">Delete</TooltipContent>
 </Tooltip>
 )}
 </div>}
 </div>

 {/* Sub-items section - Monday.com style with connecting line */}
 {hasSubItems && isExpanded && <div className="relative mt-1 mb-2" onBlur={e => {
 // Check if focus is leaving the sub-items container entirely
 if (!e.currentTarget.contains(e.relatedTarget as Node)) {
 cleanupEmptySubItems();
 }
 }}>
 {/* Vertical connecting line from parent - positioned at left edge */}
 <div className="absolute left-3 -top-1 w-0.5 h-4 bg-category-accent/70" />
 
 {/* Horizontal connector line */}
 <div className="absolute left-3 top-3 w-6 h-0.5 bg-category-accent/70" />
 
 {/* Continuous vertical bar alongside sub-items */}
 <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-category-accent/70" />
 
 {/* Sub-items container:
 Keep the *visual* indent (ml-8) on a background layer only,
 while sub-item rows render at full width so column dividers always align
 with the header/main rows (even when resizing). */}
 {/*
 Sub-items container:
 - Restore original indentation via ml-8.
 - Use -mr-8 so the internal row widths still match the parent/header grid when columns are resized.
 */}
 <div className="ml-8 bg-muted/50 rounded-lg overflow-hidden">
 <SortableContext items={subItemIds} strategy={verticalListSortingStrategy}>
 {item.subQuestions!.map((sub, idx) => <div key={sub.id} className="">
 <SortableSubItemRow subItem={sub} index={idx} parentId={item.id} onUpdate={updated => handleSubItemUpdate(idx, updated)} onDelete={() => handleSubItemDelete(idx)} isPreviewMode={isPreviewMode} isCompactMode={isCompactMode} isLast={idx === item.subQuestions!.length - 1} totalCount={item.subQuestions!.length} visibleColumns={visibleColumns} columnWidths={columnWidths} isNewEmpty={isPendingSubItem && sub.text.trim() === ''} onBlurCleanup={() => {
 if (sub.text.trim() === '') {
 cleanupEmptySubItems();
 }
 }} sectionNumber={sectionNumber} itemNumber={itemIndex + 1} isEngagementMode={isEngagementMode} numberingFormat={numberingFormat} applyingQuestionId={applyingQuestionId} />
 </div>)}
 </SortableContext>

 {/* Add subitem row (match original indented UI) */}
 {!isPreviewMode && hasRealSubItems && (
 <div className="flex items-center hover:bg-muted transition-colors">
 <div className="w-10 flex items-center justify-center py-2.5">
 <Checkbox disabled className="h-4 w-4 border-border bg-background opacity-30" />
 </div>
 <div className="w-14 shrink-0" /> {/* Numbering column spacer */}
 <button
 onClick={onAddSubItem}
 className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary transition-colors text-left border-l border-border/50"
 style={{ flexBasis: columnWidths.questions }}
 >
 + Add
 </button>
 </div>
 )}
 </div>
 </div>}
 </div>;
}

// Group component (Section)
interface GroupProps {
 section: Section;
 sectionIndex: number;
 onUpdate: (section: Section) => void;
 onDelete: () => void;
 onAddItem: () => void;
 onAddCategoryAtPosition: (position: 'above' | 'below') => void;
 isPreviewMode: boolean;
 isCompactMode: boolean;
 onItemsReorder: (sectionId: string, newItems: Question[]) => void;
 onSubItemsReorder: (itemId: string, newSubItems: Question[]) => void;
 selectedQuestions: Set<string>;
 onSelectionChange: (questionId: string, selected: boolean) => void;
 isEngagementMode?: boolean;
 numberingFormat: NumberingFormat;
 onNumberingFormatChange: (format: NumberingFormat) => void;
 applyingQuestionId?: string | null;
}

// Resizable column header component
interface ResizableColumnHeaderProps {
 label: string;
 width: string | number;
 minWidth?: number;
 maxWidth?: number;
 onWidthChange?: (width: string) => void;
 onLabelChange?: (label: string) => void;
 onRemove?: () => void;
 isPreviewMode: boolean;
 showRemove?: boolean;
 containerRef?: React.RefObject<HTMLDivElement | null>;
}
function ResizableColumnHeader({
 label,
 width,
 minWidth = 100,
 maxWidth = 500,
 onWidthChange,
 onLabelChange,
 onRemove,
 isPreviewMode,
 showRemove = false,
 containerRef
}: ResizableColumnHeaderProps) {
 const [isResizing, setIsResizing] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [draftLabel, setDraftLabel] = useState(label);
 const headerRef = useRef<HTMLDivElement>(null);
 const startXRef = useRef(0);
 const startWidthRef = useRef(0);
 const handleMouseDown = (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!headerRef.current) return;
 setIsResizing(true);
 startXRef.current = e.clientX;
 startWidthRef.current = headerRef.current.offsetWidth;
 };

 // Attach/detach global listeners for resize
 useEffect(() => {
 if (!isResizing || !containerRef?.current) return;
 const containerWidth = containerRef.current.offsetWidth;
 const handleMove = (e: MouseEvent) => {
 const delta = e.clientX - startXRef.current;
 const newWidthPx = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
 const newWidthPercent = Math.round(newWidthPx / containerWidth * 100);
 onWidthChange?.(`${newWidthPercent}%`);
 };
 const handleUp = () => {
 setIsResizing(false);
 };
 document.addEventListener('mousemove', handleMove);
 document.addEventListener('mouseup', handleUp);
 return () => {
 document.removeEventListener('mousemove', handleMove);
 document.removeEventListener('mouseup', handleUp);
 };
 }, [isResizing, minWidth, maxWidth, onWidthChange, containerRef]);
 const commitLabel = () => {
 const trimmed = draftLabel.trim();
 if (trimmed && trimmed !== label && onLabelChange) {
 onLabelChange(trimmed);
 } else {
 setDraftLabel(label);
 }
 setIsEditing(false);
 };
 return <div ref={headerRef} className="flex-1 min-w-0 px-2 py-2 flex items-center justify-between group/col relative border-l border-border/50 first:border-l-0" style={{
 flexBasis: width,
 maxWidth: typeof width === 'string' && width.includes('%') ? width : undefined
 }}>
 {isEditing && !isPreviewMode && onLabelChange ? <input type="text" value={draftLabel} onChange={e => setDraftLabel(e.target.value)} onBlur={commitLabel} onKeyDown={e => {
 if (e.key === 'Enter') commitLabel();
 if (e.key === 'Escape') {
 setDraftLabel(label);
 setIsEditing(false);
 }
 }} autoFocus onClick={e => e.stopPropagation()} className="h-5 text-xs font-medium bg-background border border-border rounded px-1 flex-1 min-w-0" /> : <span onClick={() => {
 if (!isPreviewMode && onLabelChange) setIsEditing(true);
 }} className={`text-xs font-medium truncate ${!isPreviewMode && onLabelChange ? 'cursor-text hover:text-foreground' : ''}`}>
 {label}
 </span>}
 
 {!isPreviewMode && showRemove && onRemove && <button onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover/col:opacity-100 transition-opacity ml-1" title="Remove column">
 <X className="h-3.5 w-3.5" />
 </button>}
 
 {/* Resize handle */}
 {!isPreviewMode && onWidthChange && <div onMouseDown={handleMouseDown} className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors ${isResizing ? 'bg-primary' : ''}`} style={{
 transform: 'translateX(50%)'
 }} />}
 </div>;
}
function SortableGroup({
 section,
 sectionIndex,
 onUpdate,
 onDelete,
 onAddItem,
 onAddCategoryAtPosition,
 isPreviewMode,
 isCompactMode,
 onItemsReorder,
 onSubItemsReorder,
 selectedQuestions,
 onSelectionChange,
 isEngagementMode = false,
 numberingFormat,
 onNumberingFormatChange,
 applyingQuestionId
}: GroupProps) {
 const [isEditingTitle, setIsEditingTitle] = useState(false);
 const [draftTitle, setDraftTitle] = useState(section.title);
 const [visibleColumns, setVisibleColumns] = useState({
 explanation: true,
 reference: true
 });
 const tableContainerRef = useRef<HTMLDivElement>(null);

 // Column widths state - using percentages for responsive layout
 const [columnWidths, setColumnWidths] = useState({
 questions: '40%',
 response: '20%',
 explanation: '20%',
 reference: '20%'
 });

 // Column labels state (editable)
 const [columnLabels, setColumnLabels] = useState({
 questions: 'Questions',
 response: 'Response',
 explanation: 'Explanation',
 reference: 'Reference'
 });

 const handleAddColumn = (columnId: string) => {
 setVisibleColumns(prev => ({
...prev,
 [columnId]: true
 }));
 };
 const handleRemoveColumn = (columnId: string) => {
 setVisibleColumns(prev => ({
...prev,
 [columnId]: false
 }));
 };
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 isOver,
 active
 } = useSortable({
 id: section.id,
 data: {
 type: 'group',
 section
 }
 });

 // Check if this is a valid drop target
 const isDropTarget = isOver && active?.id !== section.id;
 const activeType = active?.data?.current?.type;
 const isValidDropTarget = isDropTarget && activeType === 'group';
 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1
 };
 const commitTitle = () => {
 const trimmed = draftTitle.trim();
 if (trimmed && trimmed !== section.title) {
 onUpdate({
...section,
 title: trimmed
 });
 } else {
 setDraftTitle(section.title);
 }
 setIsEditingTitle(false);
 };
 const handleItemUpdate = (index: number, updatedQuestion: Question) => {
 const newQuestions = [...section.questions];
 newQuestions[index] = updatedQuestion;
 onUpdate({
...section,
 questions: newQuestions
 });
 };
 const handleItemDelete = (index: number) => {
 const newQuestions = section.questions.filter((_, i) => i !== index);
 onUpdate({
...section,
 questions: newQuestions
 });
 };
 const handleItemDuplicate = (index: number) => {
 const question = section.questions[index];
 const newQuestion: Question = {
...question,
 id: `q-${Date.now()}`,
 subQuestions: question.subQuestions?.map(sq => ({
...sq,
 id: `sq-${Date.now()}-${Math.random()}`
 }))
 };
 const newQuestions = [...section.questions.slice(0, index + 1), newQuestion,...section.questions.slice(index + 1)];
 onUpdate({
...section,
 questions: newQuestions
 });
 };
 const handleAddSubItem = (index: number) => {
 const question = section.questions[index];
 const newSubQuestion: Question = {
 id: `sq-${Date.now()}`,
 text: 'New sub-item',
 answerType: 'long-answer',
 required: false,
 isUserAdded: isEngagementMode ? true : undefined // Mark as user-added in engagement mode
 };
 const updatedQuestion = {
...question,
 subQuestions: [...(question.subQuestions || []), newSubQuestion]
 };
 handleItemUpdate(index, updatedQuestion);
 };
 const handleAddItemAtPosition = (index: number, position: 'above' | 'below') => {
 const newQuestion: Question = {
 id: `q-${Date.now()}`,
 text: '',
 answerType: 'long-answer',
 required: false,
 isUserAdded: isEngagementMode ? true : undefined // Mark as user-added in engagement mode
 };
 const insertIndex = position === 'above' ? index : index + 1;
 const newQuestions = [...section.questions.slice(0, insertIndex), newQuestion,...section.questions.slice(insertIndex)];
 onUpdate({
...section,
 questions: newQuestions
 });
 };

 // Clean number/letter prefix from title
 const cleanTitle = (title: string) => title.replace(/^[A-Z0-9]+\.\s*/i, '');

 // Count total subitems
 const totalSubitems = section.questions.reduce((acc, q) => acc + (q.subQuestions?.length || 0), 0);
 const itemIds = section.questions.map(q => q.id);
 return <div ref={setNodeRef} id={`checklist-section-${section.id}`} data-section-id={section.id} style={{...style, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'hsl(var(--border-category))', scrollMarginTop: '160px' }} className={`doc-section bg-card rounded-lg overflow-hidden shadow-md relative ${isDragging ? 'ring-2 ring-primary ring-offset-2 z-10' : ''} ${isValidDropTarget ? 'ring-2 ring-primary/50' : ''}`}>
 {/* Drop indicator line for groups */}
 {isValidDropTarget && <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full z-20 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
 {/* Group header */}
 <div {...attributes} {...listeners} className={`doc-section-header flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border/50 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-70' : ''}`}>
 <div className="w-1 h-6 bg-category-accent rounded-full doc-accent-bar" />
 <button onClick={e => {
 e.stopPropagation();
 onUpdate({
...section,
 isExpanded: !section.isExpanded
 });
 }} className="p-0.5 rounded hover:bg-muted transition-colors">
 {section.isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 </button>
 
 {isEditingTitle && !isPreviewMode ? <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} onBlur={commitTitle} onKeyDown={e => {
 if (e.key === 'Enter') commitTitle();
 if (e.key === 'Escape') {
 setDraftTitle(section.title);
 setIsEditingTitle(false);
 }
 }} autoFocus onClick={e => e.stopPropagation()} className="h-7 text-sm font-semibold bg-muted border-border text-category-title flex-1" /> : <h3 onClick={e => {
 e.stopPropagation();
 if (!isPreviewMode) setIsEditingTitle(true);
 }} className={`text-sm font-semibold text-category-title flex-1 ${!isPreviewMode ? 'cursor-text hover:text-category-title/80' : ''}`}>
 <span className="text-muted-foreground mr-1">{formatCategoryNumber(numberingFormat, sectionIndex + 1)}</span>
 {cleanTitle(section.title)}
 </h3>}

 <span className="text-xs text-muted-foreground flex items-center gap-1 doc-section-actions">
 {section.formLayout ? <>
 <LayoutGrid className="h-3 w-3" />
 {section.formLayout.columns} Column Form
 </> : <>{section.questions.length} Questions{totalSubitems > 0 ? ` / ${totalSubitems} Sub Questions` : ''}</>}
 </span>

 {!isPreviewMode && <DropdownMenu modal={false}>
 <DropdownMenuTrigger asChild>
 <button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-muted transition-colors">
 <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 {!section.formLayout && <DropdownMenuItem onClick={onAddItem} className="text-foreground focus:bg-muted focus:text-foreground">
 <Plus className="h-4 w-4 mr-2" />
 Add item
 </DropdownMenuItem>}
 {!section.formLayout && <DropdownMenuSeparator className="bg-border" />}
 <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Add category</div>
 <DropdownMenuItem onClick={() => onAddCategoryAtPosition('above')} className="text-foreground focus:bg-muted focus:text-foreground pl-4">
 <ChevronDown className="h-4 w-4 mr-2 rotate-180" />
 Above this category
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => onAddCategoryAtPosition('below')} className="text-foreground focus:bg-muted focus:text-foreground pl-4">
 <ChevronDown className="h-4 w-4 mr-2" />
 Below this category
 </DropdownMenuItem>
 {/* Hide delete category in engagement mode */}
 {!isEngagementMode && (
 <>
 <DropdownMenuSeparator className="bg-border" />
 <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:bg-muted focus:text-red-600">
 <Trash2 className="h-4 w-4 mr-2" />
 Delete category
 </DropdownMenuItem>
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>}
 </div>

 {/* Content */}
 {section.isExpanded && <>
 {/* Check if this is a form layout section */}
 {section.formLayout ? <FormLayoutEditor formLayout={section.formLayout} onUpdate={newFormLayout => onUpdate({
...section,
 formLayout: newFormLayout
 })} isPreviewMode={isPreviewMode} /> : <div ref={tableContainerRef} className="overflow-x-auto sm:overflow-x-visible">
 <div className="min-w-[600px] sm:min-w-0">
 {/* Column headers */}
 <div className="doc-column-headers flex items-center bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border/50">
 <div className="w-10 shrink-0 py-2" />
 <div className="w-8 shrink-0 py-2" />
 {/* Numbering column header with format selector */}
 <NumberingFormatSelector 
 currentFormat={numberingFormat}
 onFormatChange={onNumberingFormatChange}
 isPreviewMode={isPreviewMode}
 />
 <ResizableColumnHeader label={columnLabels.questions} width={columnWidths.questions} minWidth={200} maxWidth={600} onWidthChange={w => setColumnWidths(prev => ({
...prev,
 questions: w
 }))} onLabelChange={l => setColumnLabels(prev => ({
...prev,
 questions: l
 }))} isPreviewMode={isPreviewMode} containerRef={tableContainerRef} />
 <ResizableColumnHeader label={columnLabels.response} width={columnWidths.response} minWidth={150} maxWidth={400} onWidthChange={w => setColumnWidths(prev => ({
...prev,
 response: w
 }))} onLabelChange={l => setColumnLabels(prev => ({
...prev,
 response: l
 }))} isPreviewMode={isPreviewMode} containerRef={tableContainerRef} />
 {visibleColumns.explanation && <ResizableColumnHeader label={columnLabels.explanation} width={columnWidths.explanation} minWidth={150} maxWidth={400} onWidthChange={w => setColumnWidths(prev => ({
...prev,
 explanation: w
 }))} onLabelChange={l => setColumnLabels(prev => ({
...prev,
 explanation: l
 }))} onRemove={() => handleRemoveColumn('explanation')} isPreviewMode={isPreviewMode} showRemove={true} containerRef={tableContainerRef} />}
 {visibleColumns.reference && <ResizableColumnHeader label={columnLabels.reference} width={columnWidths.reference} minWidth={100} maxWidth={300} onWidthChange={w => setColumnWidths(prev => ({
...prev,
 reference: w
 }))} onLabelChange={l => setColumnLabels(prev => ({
...prev,
 reference: l
 }))} onRemove={() => handleRemoveColumn('reference')} isPreviewMode={isPreviewMode} showRemove={true} containerRef={tableContainerRef} />}
 {!isPreviewMode && (!visibleColumns.explanation || !visibleColumns.reference) && <div className="w-[100px] shrink-0 px-2 py-2 text-center text-muted-foreground">
 <AddColumnButton onAddColumn={handleAddColumn} visibleColumns={visibleColumns} />
 </div>}
 {!isPreviewMode && <div className="w-[180px] shrink-0 py-2 px-2" />}
 </div>

 {/* Items */}
 <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
 {section.questions.map((question, idx) => <SortableItemRow key={question.id} item={question} sectionId={section.id} itemIndex={idx} onUpdate={q => handleItemUpdate(idx, q)} onDelete={() => handleItemDelete(idx)} onDuplicate={() => handleItemDuplicate(idx)} onAddSubItem={() => handleAddSubItem(idx)} onAddItemAtPosition={position => handleAddItemAtPosition(idx, position)} isPreviewMode={isPreviewMode} isCompactMode={isCompactMode} onSubItemsReorder={onSubItemsReorder} visibleColumns={visibleColumns} columnWidths={columnWidths} sectionNumber={sectionIndex + 1} isSelected={selectedQuestions.has(question.id)} onSelectionChange={selected => onSelectionChange(question.id, selected)} isEngagementMode={isEngagementMode} numberingFormat={numberingFormat} applyingQuestionId={applyingQuestionId} />)}
 </SortableContext>

 {/* Add item button */}
 {!isPreviewMode && <div className="flex items-center doc-add-item">
 <div className="w-10" />
 <div className="w-8" />
 <div className="w-14" /> {/* Numbering column spacer */}
 <button onClick={onAddItem} className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left">
 <Plus className="h-4 w-4" />
 Add item
 </button>
 </div>}
 </div>
 </div>}
 </>}
 </div>;
}
export function MondayBoardView({
 checklist,
 onUpdate,
 isPreviewMode,
 isCompactMode = false,
 selectedQuestions = new Set(),
 onSelectionChange,
 isEngagementMode = false,
 applyingQuestionId = null
}: MondayBoardViewProps) {
 const [activeId, setActiveId] = useState<string | null>(null);
 const [activeData, setActiveData] = useState<{
 type: string;
 text: string;
 selectedCount?: number;
 } | null>(null);
 const [numberingFormat, setNumberingFormat] = useState<NumberingFormat>(() => {
 const saved = localStorage.getItem('dv-numbering-format');
 return (saved as NumberingFormat) || 'number';
 });
 const handleSelectionChange = (questionId: string, selected: boolean) => {
 if (!onSelectionChange) return;
 const newSelected = new Set(selectedQuestions);
 if (selected) {
 newSelected.add(questionId);
 } else {
 newSelected.delete(questionId);
 }
 onSelectionChange(newSelected);
 };
 const sensors = useSensors(useSensor(PointerSensor, {
 activationConstraint: {
 distance: 8
 }
 }), useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates
 }));
 const handleSectionUpdate = (index: number, updatedSection: Section) => {
 const newSections = [...checklist.sections];
 newSections[index] = updatedSection;
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleSectionDelete = (index: number) => {
 const newSections = checklist.sections.filter((_, i) => i !== index);
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleAddItem = (sectionIndex: number) => {
 const newQuestion: Question = {
 id: `q-${Date.now()}`,
 text: '',
 answerType: 'long-answer',
 required: false,
 isUserAdded: isEngagementMode ? true : undefined // Mark as user-added in engagement mode
 };
 const newSections = [...checklist.sections];
 newSections[sectionIndex] = {
...newSections[sectionIndex],
 questions: [...newSections[sectionIndex].questions, newQuestion]
 };
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleAddCategoryAtPosition = (sectionIndex: number, position: 'above' | 'below') => {
 const newSection: Section = {
 id: `section-${Date.now()}`,
 title: 'New Category',
 questions: [],
 isExpanded: true
 };
 const insertIndex = position === 'above' ? sectionIndex : sectionIndex + 1;
 const newSections = [...checklist.sections.slice(0, insertIndex), newSection,...checklist.sections.slice(insertIndex)];
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleItemsReorder = (sectionId: string, newItems: Question[]) => {
 const newSections = checklist.sections.map(section => section.id === sectionId ? {
...section,
 questions: newItems
 } : section);
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleSubItemsReorder = (itemId: string, newSubItems: Question[]) => {
 const newSections = checklist.sections.map(section => ({
...section,
 questions: section.questions.map(q => q.id === itemId ? {
...q,
 subQuestions: newSubItems
 } : q)
 }));
 onUpdate({
...checklist,
 sections: newSections
 });
 };
 const handleDragStart = (event: DragStartEvent) => {
 const {
 active
 } = event;
 setActiveId(active.id as string);

 // Extract information about what's being dragged
 const data = active.data.current;
 
 // Check if dragging a selected item (for multi-drag)
 const isDraggingSelectedItem = data?.type === 'item' && selectedQuestions.has(active.id as string);
 const selectedCount = isDraggingSelectedItem ? selectedQuestions.size : 1;
 
 if (data?.type === 'group') {
 setActiveData({
 type: 'group',
 text: data.section?.title || 'Section'
 });
 } else if (data?.type === 'item') {
 setActiveData({
 type: 'item',
 text: data.item?.text || 'Question',
 selectedCount: selectedCount
 });
 } else if (data?.type === 'subitem') {
 setActiveData({
 type: 'subitem',
 text: data.subItem?.text || 'Sub-question'
 });
 }
 };
 const handleDragEnd = (event: DragEndEvent) => {
 const {
 active,
 over
 } = event;
 setActiveId(null);
 setActiveData(null);
 if (!over || active.id === over.id) return;
 const activeData = active.data.current;
 const overData = over.data.current;

 // Handle group reordering
 if (activeData?.type === 'group' && overData?.type === 'group') {
 const oldIndex = checklist.sections.findIndex(s => s.id === active.id);
 const newIndex = checklist.sections.findIndex(s => s.id === over.id);
 if (oldIndex !== -1 && newIndex !== -1) {
 const newSections = [...checklist.sections];
 const [removed] = newSections.splice(oldIndex, 1);
 newSections.splice(newIndex, 0, removed);
 onUpdate({
...checklist,
 sections: newSections
 });
 }
 return;
 }

 // Handle item reordering (with multi-select support)
 if (activeData?.type === 'item' && overData?.type === 'item') {
 const activeSectionId = activeData.sectionId;
 const overSectionId = overData.sectionId;
 
 // Check if we're doing a multi-select drag
 const isDraggingSelected = selectedQuestions.has(active.id as string) && selectedQuestions.size > 1;
 
 if (isDraggingSelected) {
 // Multi-select drag: move all selected items to the drop position
 const targetSection = checklist.sections.find(s => s.id === overSectionId);
 if (!targetSection) return;
 
 // Collect all selected items from all sections, preserving their order
 const selectedItems: Question[] = [];
 const selectedIds = new Set(selectedQuestions);
 
 checklist.sections.forEach(section => {
 section.questions.forEach(q => {
 if (selectedIds.has(q.id)) {
 selectedItems.push(q);
 }
 });
 });
 
 // Find the drop index in the target section
 const dropIndex = targetSection.questions.findIndex(q => q.id === over.id);
 
 // Build new sections with selected items removed from their original positions
 // and inserted at the drop position
 const newSections = checklist.sections.map(section => {
 // Remove selected items from this section
 const filteredQuestions = section.questions.filter(q => !selectedIds.has(q.id));
 
 if (section.id === overSectionId) {
 // Insert all selected items at the drop position
 const insertIndex = filteredQuestions.findIndex(q => q.id === over.id);
 const actualInsertIndex = insertIndex === -1 ? filteredQuestions.length : insertIndex;
 const newQuestions = [
...filteredQuestions.slice(0, actualInsertIndex),
...selectedItems,
...filteredQuestions.slice(actualInsertIndex)
 ];
 return {...section, questions: newQuestions };
 }
 
 return {...section, questions: filteredQuestions };
 });
 
 onUpdate({
...checklist,
 sections: newSections
 });
 
 // Clear selection after move
 if (onSelectionChange) {
 onSelectionChange(new Set());
 }
 } else {
 // Single item drag (original logic)
 if (activeSectionId === overSectionId) {
 // Same section - reorder
 const section = checklist.sections.find(s => s.id === activeSectionId);
 if (section) {
 const oldIndex = section.questions.findIndex(q => q.id === active.id);
 const newIndex = section.questions.findIndex(q => q.id === over.id);
 if (oldIndex !== -1 && newIndex !== -1) {
 const newQuestions = [...section.questions];
 const [removed] = newQuestions.splice(oldIndex, 1);
 newQuestions.splice(newIndex, 0, removed);
 handleItemsReorder(activeSectionId, newQuestions);
 }
 }
 } else {
 // Different sections - move item
 const sourceSection = checklist.sections.find(s => s.id === activeSectionId);
 const targetSection = checklist.sections.find(s => s.id === overSectionId);
 if (sourceSection && targetSection) {
 const itemToMove = sourceSection.questions.find(q => q.id === active.id);
 if (itemToMove) {
 const newSourceQuestions = sourceSection.questions.filter(q => q.id !== active.id);
 const targetIndex = targetSection.questions.findIndex(q => q.id === over.id);
 const newTargetQuestions = [...targetSection.questions];
 newTargetQuestions.splice(targetIndex, 0, itemToMove);
 const newSections = checklist.sections.map(section => {
 if (section.id === activeSectionId) return {
...section,
 questions: newSourceQuestions
 };
 if (section.id === overSectionId) return {
...section,
 questions: newTargetQuestions
 };
 return section;
 });
 onUpdate({
...checklist,
 sections: newSections
 });
 }
 }
 }
 }
 return;
 }

 // Handle subitem reordering within the same parent
 if (activeData?.type === 'subitem' && overData?.type === 'subitem') {
 const activeParentId = activeData.parentId;
 const overParentId = overData.parentId;
 if (activeParentId === overParentId) {
 // Same parent - reorder
 for (const section of checklist.sections) {
 const item = section.questions.find(q => q.id === activeParentId);
 if (item && item.subQuestions) {
 const oldIndex = item.subQuestions.findIndex(sq => sq.id === active.id);
 const newIndex = item.subQuestions.findIndex(sq => sq.id === over.id);
 if (oldIndex !== -1 && newIndex !== -1) {
 const newSubQuestions = [...item.subQuestions];
 const [removed] = newSubQuestions.splice(oldIndex, 1);
 newSubQuestions.splice(newIndex, 0, removed);
 handleSubItemsReorder(activeParentId, newSubQuestions);
 }
 break;
 }
 }
 } else {
 // Different parents - move subitem
 let sourceItem: Question | undefined;
 let targetItem: Question | undefined;
 for (const section of checklist.sections) {
 for (const q of section.questions) {
 if (q.id === activeParentId) sourceItem = q;
 if (q.id === overParentId) targetItem = q;
 }
 }
 if (sourceItem && targetItem && sourceItem.subQuestions && targetItem.subQuestions) {
 const subItemToMove = sourceItem.subQuestions.find(sq => sq.id === active.id);
 if (subItemToMove) {
 const newSourceSubItems = sourceItem.subQuestions.filter(sq => sq.id !== active.id);
 const targetIndex = targetItem.subQuestions.findIndex(sq => sq.id === over.id);
 const newTargetSubItems = [...targetItem.subQuestions];
 newTargetSubItems.splice(targetIndex, 0, subItemToMove);
 const newSections = checklist.sections.map(section => ({
...section,
 questions: section.questions.map(q => {
 if (q.id === activeParentId) return {
...q,
 subQuestions: newSourceSubItems
 };
 if (q.id === overParentId) return {
...q,
 subQuestions: newTargetSubItems
 };
 return q;
 })
 }));
 onUpdate({
...checklist,
 sections: newSections
 });
 }
 }
 }
 }
 };
 const sectionIds = checklist.sections.map(s => s.id);
 return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
 <div className="space-y-4 monday-board-light-borders document-mode">
 <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
 {checklist.sections.map((section, idx) => <SortableGroup key={section.id} section={section} sectionIndex={idx} onUpdate={s => handleSectionUpdate(idx, s)} onDelete={() => handleSectionDelete(idx)} onAddItem={() => handleAddItem(idx)} onAddCategoryAtPosition={position => handleAddCategoryAtPosition(idx, position)} isPreviewMode={isPreviewMode} isCompactMode={isCompactMode} onItemsReorder={handleItemsReorder} onSubItemsReorder={handleSubItemsReorder} selectedQuestions={selectedQuestions} onSelectionChange={handleSelectionChange} isEngagementMode={isEngagementMode} numberingFormat={numberingFormat} onNumberingFormatChange={(f) => { setNumberingFormat(f); localStorage.setItem('dv-numbering-format', f); }} applyingQuestionId={applyingQuestionId} />)}
 </SortableContext>
 </div>
 
 {/* Drag Overlay - shows preview of dragged item */}
 <DragOverlay dropAnimation={{
 duration: 200,
 easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
 }}>
 {activeId && activeData && <div className={`
 px-4 py-3 rounded-lg shadow-xl border-2 border-primary bg-card relative
 ${activeData.type === 'group' ? 'bg-muted' : ''}
 ${activeData.type === 'subitem' ? 'ml-10 bg-muted/50' : ''}
 `}>
 {/* Multi-select count badge */}
 {activeData.selectedCount && activeData.selectedCount > 1 && (
 <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
 {activeData.selectedCount}
 </div>
 )}
 <div className="flex items-center gap-3">
 <GripVertical className="h-4 w-4 text-muted-foreground" />
 <div className="flex items-center gap-2">
 {activeData.type === 'group' && <div className="w-1 h-5 bg-category-accent rounded-full" />}
 <span className={`text-sm font-medium truncate max-w-[300px] ${activeData.type === 'group' ? 'text-category-title' : 'text-foreground'}`} dangerouslySetInnerHTML={{
 __html: sanitizeHtml(activeData.text) || 'Untitled'
 }} />
 {activeData.selectedCount && activeData.selectedCount > 1 && (
 <span className="text-xs text-muted-foreground ml-1">
 +{activeData.selectedCount - 1} more
 </span>
 )}
 </div>
 </div>
 </div>}
 </DragOverlay>
 </DndContext>;
}