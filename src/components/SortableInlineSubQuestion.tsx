import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect } from 'react';
import { 
 GripVertical, 
 Trash2, 
 Plus, 
 Sparkles,
 ChevronRight
} from 'lucide-react';
import { Question, AnswerType } from '@/types/checklist';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EditableOption } from './EditableOption';

interface SortableInlineSubQuestionProps {
 question: Question;
 index: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 showLetter?: boolean;
 isPreviewMode?: boolean;
}

export function SortableInlineSubQuestion({
 question,
 index,
 onUpdate,
 onDelete,
 showLetter = true,
 isPreviewMode = false,
}: SortableInlineSubQuestionProps) {
 const [isEditingText, setIsEditingText] = useState(false);
 const [draftText, setDraftText] = useState(question.text);
 const [isExpanded, setIsExpanded] = useState(true);
 const inputRef = useRef<HTMLInputElement>(null);

 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: question.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1,
 zIndex: isDragging ? 50 : 'auto',
 };

 useEffect(() => {
 setDraftText(question.text);
 }, [question.text]);

 useEffect(() => {
 if (isEditingText && inputRef.current) {
 inputRef.current.focus();
 inputRef.current.select();
 }
 }, [isEditingText]);

 const commitText = () => {
 const trimmed = draftText.trim();
 if (!trimmed) {
 setDraftText(question.text);
 setIsEditingText(false);
 return;
 }
 if (trimmed !== question.text) {
 onUpdate({...question, text: trimmed });
 }
 setIsEditingText(false);
 };

 const handleAnswerChange = (answer: string) => {
 onUpdate({...question, answer });
 };

 const handleTypeChange = (answerType: AnswerType) => {
 const options = (answerType === 'multiple-choice' || answerType === 'dropdown') 
 ? (question.options || ['Option 1', 'Option 2'])
 : undefined;
 onUpdate({...question, answerType, answer: '', options });
 };

 const handleOptionUpdate = (optIndex: number, value: string) => {
 const baseOptions = question.options || ['Option 1', 'Option 2'];
 const oldValue = baseOptions[optIndex];
 const newOptions = [...baseOptions];
 newOptions[optIndex] = value;

 onUpdate({
...question,
 options: newOptions,
 answer: question.answer === oldValue ? value : question.answer,
 });
 };

 const handleOptionRemove = (optIndex: number) => {
 const baseOptions = question.options || ['Option 1', 'Option 2'];
 const removedValue = baseOptions[optIndex];
 const newOptions = baseOptions.filter((_, i) => i !== optIndex);

 if (newOptions.length > 0) {
 onUpdate({
...question,
 options: newOptions,
 answer: question.answer === removedValue ? '' : question.answer,
 });
 }
 };

 const handleAddOption = () => {
 const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
 onUpdate({...question, options: newOptions });
 };

 const renderAnswerField = () => {
 switch (question.answerType) {
 case 'yes-no':
 const yesNoOptions = ['Yes', 'No'];
 return (
 <div className="flex flex-wrap gap-2 mt-2">
 {yesNoOptions.map((opt) => (
 <label 
 key={opt} 
 className="flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
 >
 <div 
 className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
 question.answer === opt 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(opt)}
 >
 {question.answer === opt && (
 <div className="w-1 h-1 rounded-full bg-primary-foreground" />
 )}
 </div>
 <span className="text-foreground">{opt}</span>
 </label>
 ))}
 </div>
 );

 case 'none':
 return null;

 case 'long-answer':
 return (
 <div className="mt-2 relative">
 <Textarea
 placeholder="Enter detailed answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[60px] text-sm resize-none bg-background pr-12"
 />
 <button className="absolute bottom-2 right-2 p-1 rounded text-accent hover:bg-accent/10 transition-colors">
 <Sparkles className="h-3.5 w-3.5" />
 </button>
 </div>
 );

 case 'dropdown':
 case 'multiple-choice':
 const options = question.options || ['Option 1', 'Option 2'];
 return (
 <div className="mt-2 space-y-0.5">
 {options.map((option, i) => (
 <EditableOption
 key={i}
 value={option}
 index={i}
 isSelected={question.answer === option}
 onUpdate={(value) => handleOptionUpdate(i, value)}
 onRemove={() => handleOptionRemove(i)}
 onSelect={() => handleAnswerChange(option)}
 type={question.answerType === 'dropdown' ? 'radio' : 'checkbox'}
 />
 ))}
 <button
 onClick={handleAddOption}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
 >
 <Plus className="h-3 w-3" />
 Add option
 </button>
 </div>
 );

 default:
 return null;
 }
 };

 return (
 <div 
 ref={setNodeRef}
 style={style}
 className={`bg-muted/30 rounded-lg p-3 group hover:bg-muted/50 transition-colors ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
 >
 <div className="flex items-start gap-2">
 {/* Drag handle - hidden in preview mode */}
 {!isPreviewMode && (
 <button 
 {...attributes}
 {...listeners}
 className="mt-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
 >
 <GripVertical className="h-4 w-4 text-muted-foreground" />
 </button>
 )}

 {/* Collapse toggle */}
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="mt-1 p-0.5 rounded hover:bg-muted transition-colors"
 >
 <ChevronRight 
 className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
 />
 </button>

 <div className="flex-1 min-w-0">
 {/* Sub-question letter and text */}
 <div className="flex items-start gap-2">
 {showLetter && (
 <span className="text-muted-foreground font-medium text-sm shrink-0">
 {String.fromCharCode(97 + index)}.
 </span>
 )}
 
 {isEditingText && !isPreviewMode ? (
 <Input
 ref={inputRef}
 value={draftText}
 onChange={(e) => setDraftText(e.target.value)}
 onBlur={commitText}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 commitText();
 }
 if (e.key === 'Escape') {
 e.preventDefault();
 setDraftText(question.text);
 setIsEditingText(false);
 }
 }}
 className="h-7 text-sm flex-1"
 />
 ) : (
 <span
 className={`text-sm text-foreground px-1 py-0.5 -mx-1 rounded transition-colors flex-1 ${!isPreviewMode ? 'cursor-text hover:bg-muted' : ''}`}
 onClick={() => !isPreviewMode && setIsEditingText(true)}
 >
 {question.text}
 </span>
 )}
 </div>

 {/* Answer type selector - hidden in preview mode */}
 {!isPreviewMode && (
 <div className="flex items-center gap-1 mt-2">
 <select
 value={question.answerType}
 onChange={(e) => handleTypeChange(e.target.value as AnswerType)}
 className="text-xs bg-muted border-none rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
 >
 <option value="yes-no">Yes / No</option>
 <option value="multiple-choice">Multiple Choice</option>
 <option value="date">Date</option>
 <option value="long-answer">Long Answer</option>
 <option value="short-answer">Short Answer</option>
 <option value="reference">Reference Capability</option>
 <option value="amount">Amount</option>
 <option value="follow-up">Follow-up Question</option>
 <option value="dropdown">Dropdown</option>
 <option value="file-upload">File Upload</option>
 <option value="toggle">Switch/Toggle</option>
 </select>
 </div>
 )}

 {/* Collapsible answer field */}
 {isExpanded && renderAnswerField()}
 </div>

 {/* Delete button - hidden in preview mode */}
 {!isPreviewMode && (
 <button
 onClick={onDelete}
 className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>
 );
}
