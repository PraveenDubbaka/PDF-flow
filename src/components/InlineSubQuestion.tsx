import { useState, useRef, useEffect } from 'react';
import { 
 GripVertical, 
 Trash2, 
 Plus, 
 Sparkles,
 ChevronRight,
 X
} from 'lucide-react';
import { Question, AnswerType } from '@/types/checklist';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EditableOption } from './EditableOption';

interface InlineSubQuestionProps {
 question: Question;
 index: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 showLetter?: boolean;
}

export function InlineSubQuestion({
 question,
 index,
 onUpdate,
 onDelete,
 showLetter = true,
}: InlineSubQuestionProps) {
 const [isEditingText, setIsEditingText] = useState(false);
 const [isExpanded, setIsExpanded] = useState(true);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (isEditingText && inputRef.current) {
 inputRef.current.focus();
 inputRef.current.select();
 }
 }, [isEditingText]);

 const handleTextChange = (text: string) => {
 onUpdate({...question, text });
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
 <div className="bg-muted/30 rounded-lg p-3 group hover:bg-muted/50 transition-colors">
 <div className="flex items-start gap-2">
 {/* Drag handle */}
 <button className="drag-handle mt-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
 <GripVertical className="h-4 w-4 text-muted-foreground" />
 </button>

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
 
 {isEditingText ? (
 <Input
 ref={inputRef}
 value={question.text}
 onChange={(e) => handleTextChange(e.target.value)}
 onBlur={() => setIsEditingText(false)}
 onKeyDown={(e) => e.key === 'Enter' && setIsEditingText(false)}
 className="h-7 text-sm flex-1"
 />
 ) : (
 <span
 className="text-sm text-foreground cursor-text hover:bg-muted px-1 py-0.5 -mx-1 rounded transition-colors flex-1"
 onClick={() => setIsEditingText(true)}
 >
 {question.text}
 </span>
 )}
 </div>

 {/* Answer type selector */}
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

 {/* Collapsible answer field */}
 {isExpanded && renderAnswerField()}
 </div>

 {/* Delete button */}
 <button
 onClick={onDelete}
 className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 );
}
