import { useSortable } from '@dnd-kit/sortable';
import { 
 DndContext, 
 closestCenter, 
 KeyboardSensor, 
 PointerSensor, 
 useSensor, 
 useSensors,
 DragEndEvent 
} from '@dnd-kit/core';
import { 
 SortableContext, 
 sortableKeyboardCoordinates, 
 verticalListSortingStrategy,
 arrayMove 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
 GripVertical, 
 Plus, 
 Sparkles,
 Mic,
 MicOff,
 ChevronRight,
 X,
 Paperclip,
 Calendar,
 DollarSign,
 Upload,
 Link
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Question, AnswerType } from '@/types/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AIEditMenu } from './AIEditMenu';
import { QuestionToolbar } from './QuestionToolbar';
import { EditableOption } from './EditableOption';
import { SortableInlineSubQuestion } from './SortableInlineSubQuestion';
import { useRichTextToolbarContext } from '@/contexts/RichTextToolbarContext';
import { RichTextQuestionEditor } from './RichTextQuestionEditor';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { useToast } from '@/hooks/use-toast';

interface SortableQuestionCardProps {
 question: Question;
 index: number;
 sectionIndex: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 onAddSubQuestion: () => void;
 onDuplicate?: () => void;
 isPreviewMode?: boolean;
 isConciseMode?: boolean;
}

export function SortableQuestionCard({
 question,
 index,
 sectionIndex,
 onUpdate,
 onDelete,
 onAddSubQuestion,
 onDuplicate,
 isPreviewMode = false,
 isConciseMode = false,
}: SortableQuestionCardProps) {
 const [showAIMenu, setShowAIMenu] = useState(false);
 const [isEditingQuestion, setIsEditingQuestion] = useState(false);
 const [draftQuestionText, setDraftQuestionText] = useState(question.text);
 const isExpanded = question.isExpanded !== false; // Default to expanded if not set
 const [isFocused, setIsFocused] = useState(false);
 const [hasNote, setHasNote] = useState(!!question.note);
 const [hasExplanation, setHasExplanation] = useState(question.explanation !== undefined);
 const [hasReference, setHasReference] = useState(question.reference !== undefined);
 const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
 const [activeVoiceField, setActiveVoiceField] = useState<'answer' | 'explanation' | null>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const cardRef = useRef<HTMLDivElement>(null);
 const questionInputRef = useRef<HTMLInputElement>(null);
 const toolbarRef = useRef<HTMLDivElement>(null);
 const { showToolbar } = useRichTextToolbarContext();
 const { toast } = useToast();

 // Voice-to-text for answer field
 const handleVoiceResult = useCallback((transcript: string) => {
 if (activeVoiceField === 'answer') {
 const currentAnswer = question.answer || '';
 const newAnswer = currentAnswer ? `${currentAnswer} ${transcript}` : transcript;
 handleAnswerChange(newAnswer);
 toast({
 title: "Voice input captured",
 description: transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript,
 });
 } else if (activeVoiceField === 'explanation') {
 const currentExplanation = question.explanation || '';
 const newExplanation = currentExplanation ? `${currentExplanation} ${transcript}` : transcript;
 handleExplanationChange(newExplanation);
 toast({
 title: "Voice input captured",
 description: transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript,
 });
 }
 setActiveVoiceField(null);
 }, [activeVoiceField, question.answer, question.explanation]);

 const handleVoiceError = useCallback((error: string) => {
 toast({
 title: "Voice input error",
 description: error,
 variant: "destructive",
 });
 setActiveVoiceField(null);
 }, []);

 const { isListening, toggleListening, isSupported } = useVoiceToText({
 onResult: handleVoiceResult,
 onError: handleVoiceError,
 });

 const handleMicClick = (field: 'answer' | 'explanation') => {
 if (!isSupported) {
 toast({
 title: "Not supported",
 description: "Voice input is not supported in this browser. Try Chrome or Edge.",
 variant: "destructive",
 });
 return;
 }
 setActiveVoiceField(field);
 toggleListening();
 };

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

 // Click outside handler - exclude toolbar and its dropdown menus
 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 const target = e.target as Node;
 
 // Check if click is inside the card
 if (cardRef.current?.contains(target)) return;
 
 // Check if click is inside the toolbar
 if (toolbarRef.current?.contains(target)) return;
 
 // Check if click is inside a Radix dropdown menu (rendered via portal)
 const dropdownContent = (target as Element).closest?.('[data-radix-menu-content]');
 if (dropdownContent) return;
 
 setIsFocused(false);
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Keep draft in sync if the question is updated externally (e.g., reorder, duplicate)
 useEffect(() => {
 setDraftQuestionText(question.text);
 }, [question.text]);

 // Focus/select input when entering edit mode
 useEffect(() => {
 if (!isEditingQuestion) return;
 // next tick so the input exists
 queueMicrotask(() => {
 questionInputRef.current?.focus();
 questionInputRef.current?.select();
 });
 }, [isEditingQuestion]);

 // Sync hasNote with question.note
 useEffect(() => {
 setHasNote(!!question.note);
 }, [question.note]);

 // Sync hasExplanation with question.explanation
 useEffect(() => {
 setHasExplanation(question.explanation !== undefined);
 }, [question.explanation]);

 // Sync hasReference with question.reference
 useEffect(() => {
 setHasReference(question.reference !== undefined);
 }, [question.reference]);

 const commitQuestionText = () => {
 // Strip HTML tags to check if content is empty
 const textContent = draftQuestionText.replace(/<[^>]*>/g, '').trim();

 // If user clears the field, revert (don’t allow empty question text)
 if (!textContent) {
 setDraftQuestionText(question.text);
 setIsEditingQuestion(false);
 return;
 }

 if (draftQuestionText !== question.text) {
 onUpdate({...question, text: draftQuestionText });
 }

 setIsEditingQuestion(false);
 };

 const handleQuestionChange = (text: string) => {
 setDraftQuestionText(text);
 };

 const handleAnswerChange = (answer: string) => {
 onUpdate({...question, answer });
 };

 const handleNoteChange = (note: string) => {
 onUpdate({...question, note });
 };

 const handleExplanationChange = (explanation: string) => {
 onUpdate({...question, explanation });
 };

 const handleTypeChange = (answerType: AnswerType) => {
 const options = (answerType === 'multiple-choice' || answerType === 'dropdown') 
 ? (question.options || ['Option 1', 'Option 2', 'Option 3'])
 : undefined;
 onUpdate({...question, answerType, answer: '', options });
 };

 const handleOptionUpdate = (optIndex: number, value: string) => {
 const baseOptions = question.options || ['Option 1', 'Option 2', 'Option 3'];
 const oldValue = baseOptions[optIndex];

 const newOptions = [...baseOptions];
 newOptions[optIndex] = value;

 const next: Question = {
...question,
 options: newOptions,
 // keep the selected value in sync when a label changes
 answer: question.answer === oldValue ? value : question.answer,
 };

 onUpdate(next);
 };

 const handleOptionRemove = (optIndex: number) => {
 const baseOptions = question.options || ['Option 1', 'Option 2', 'Option 3'];
 const removedValue = baseOptions[optIndex];
 const newOptions = baseOptions.filter((_, i) => i !== optIndex);

 if (newOptions.length > 0) {
 onUpdate({
...question,
 options: newOptions,
 // if the selected option was removed, clear the answer
 answer: question.answer === removedValue ? '' : question.answer,
 });
 }
 };

 const handleAddOption = () => {
 const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
 onUpdate({...question, options: newOptions });
 };

 const handleSubQuestionUpdate = (subIndex: number, subQuestion: Question) => {
 const newSubQuestions = [...(question.subQuestions || [])];
 newSubQuestions[subIndex] = subQuestion;
 onUpdate({...question, subQuestions: newSubQuestions });
 };

 const handleSubQuestionDelete = (subIndex: number) => {
 const newSubQuestions = (question.subQuestions || []).filter((_, i) => i !== subIndex);
 onUpdate({...question, subQuestions: newSubQuestions });
 };

 const subQuestionSensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const handleSubQuestionDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 if (!over || active.id === over.id) return;

 const subQuestions = question.subQuestions || [];
 const oldIndex = subQuestions.findIndex((q) => q.id === active.id);
 const newIndex = subQuestions.findIndex((q) => q.id === over.id);

 if (oldIndex !== -1 && newIndex !== -1) {
 const reordered = arrayMove(subQuestions, oldIndex, newIndex);
 onUpdate({...question, subQuestions: reordered });
 }
 };

 const handleAddInlineSubQuestion = () => {
 const newSubQuestion: Question = {
 id: `sq-${Date.now()}`,
 text: 'New sub-question - click to edit',
 answerType: 'long-answer',
 required: false
 };
 onUpdate({ 
...question, 
 subQuestions: [...(question.subQuestions || []), newSubQuestion] 
 });
 };

 const handleAIClick = (e: React.MouseEvent) => {
 const rect = e.currentTarget.getBoundingClientRect();
 setAiMenuPosition({ x: rect.left, y: rect.bottom + 8 });
 setShowAIMenu(true);
 };

 const handleAIEdit = (newText: string) => {
 onUpdate({...question, answer: newText });
 setShowAIMenu(false);
 };

 const handleDuplicate = () => {
 onDuplicate?.();
 };

 const handleAddNote = () => {
 setHasNote(true);
 onUpdate({...question, note: question.note || '' });
 };

 const handleRemoveNote = () => {
 setHasNote(false);
 onUpdate({...question, note: undefined });
 };

 const handleAddExplanation = () => {
 setHasExplanation(true);
 onUpdate({...question, explanation: question.explanation || '' });
 };

 const handleRemoveExplanation = () => {
 setHasExplanation(false);
 onUpdate({...question, explanation: undefined });
 };

 const handleAddReference = () => {
 setHasReference(true);
 onUpdate({...question, reference: question.reference || '' });
 };

 const handleRemoveReference = () => {
 setHasReference(false);
 onUpdate({...question, reference: undefined });
 };

 const handleReferenceChange = (reference: string) => {
 onUpdate({...question, reference });
 };

 const renderAnswerField = () => {
 switch (question.answerType) {
 case 'yes-no':
 case 'yes-no-na':
 const yesNoOptions = question.options || ['Yes', 'No', 'NA'];
 const handleRemoveYesNoOption = (optionToRemove: string) => {
 const newOptions = yesNoOptions.filter(opt => opt !== optionToRemove);
 if (question.answer === optionToRemove) {
 onUpdate({...question, options: newOptions, answer: undefined });
 } else {
 onUpdate({...question, options: newOptions });
 }
 };
 const handleAddYesNoOption = (option: string) => {
 if (!yesNoOptions.includes(option)) {
 onUpdate({...question, options: [...yesNoOptions, option] });
 }
 };
 const handleEditYesNoOption = (oldOption: string, newOption: string) => {
 const newOptions = yesNoOptions.map(opt => opt === oldOption ? newOption : opt);
 if (question.answer === oldOption) {
 onUpdate({...question, options: newOptions, answer: newOption });
 } else {
 onUpdate({...question, options: newOptions });
 }
 };
 const allYesNoOptions = ['Yes', 'No', 'NA'];
 const missingOptions = allYesNoOptions.filter(opt => !yesNoOptions.includes(opt));
 
 return (
 <div className="mt-3 space-y-2">
 <div className="flex flex-wrap gap-3">
 {yesNoOptions.map((option, index) => (
 <label key={index} className="flex items-center gap-2.5 cursor-pointer group px-3 py-2 rounded-lg hover:bg-muted transition-colors">
 <div 
 className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
 question.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {question.answer === option && (
 <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
 )}
 </div>
 <input
 type="text"
 value={option}
 onChange={(e) => handleEditYesNoOption(option, e.target.value)}
 onClick={(e) => e.stopPropagation()}
 className="text-sm text-foreground bg-transparent border-none outline-none w-auto min-w-[40px] focus:ring-1 focus:ring-primary/50 rounded px-1"
 style={{ width: `${Math.max(option.length, 3)}ch` }}
 />
 {yesNoOptions.length > 1 && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleRemoveYesNoOption(option);
 }}
 className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
 >
 <X className="h-3 w-3" />
 </button>
 )}
 </label>
 ))}
 </div>
 {missingOptions.length > 0 && (
 <div className="flex gap-2 pt-1">
 {missingOptions.map((option) => (
 <button
 key={option}
 onClick={() => handleAddYesNoOption(option)}
 className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
 >
 <Plus className="h-3 w-3" />
 Add {option}
 </button>
 ))}
 </div>
 )}
 </div>
 );

 case 'none':
 return null;

 case 'long-answer':
 return (
 <div className="mt-3 relative">
 <Textarea
 ref={textareaRef}
 placeholder="Enter your detailed answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 onFocus={(e) => showToolbar(e.target)}
 onSelect={(e) => {
 const target = e.target as HTMLTextAreaElement;
 if (target.selectionStart !== target.selectionEnd) {
 showToolbar(target);
 }
 }}
 className="min-h-[100px] pr-20 resize-none bg-background"
 />
 <div className="absolute bottom-3 right-3 flex items-center gap-1">
 <button
 onClick={handleAIClick}
 className="flex items-center gap-1 px-2 py-1 rounded text-accent hover:bg-accent/10 transition-colors"
 >
 <Sparkles className="h-4 w-4" />
 </button>
 <button 
 onClick={() => handleMicClick('answer')}
 className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
 isListening && activeVoiceField === 'answer' 
 ? 'text-red-500 bg-red-100 animate-pulse' 
 : 'text-accent hover:bg-accent/10'
 }`}
 title={isListening && activeVoiceField === 'answer' ? 'Stop recording' : 'Start voice input'}
 >
 {isListening && activeVoiceField === 'answer' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
 </button>
 </div>
 </div>
 );

 case 'dropdown':
 case 'multiple-choice':
 const options = question.options || ['Option 1', 'Option 2', 'Option 3'];
 return (
 <div className="mt-3 space-y-1">
 {options.map((option, i) => (
 <EditableOption
 key={`${question.id}-opt-${i}`}
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
 className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors w-full"
 >
 <Plus className="h-4 w-4" />
 Add option
 </button>
 </div>
 );

 case 'date':
 return (
 <div className="mt-3 relative">
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4 text-muted-foreground absolute left-3" />
 <Input
 type="date"
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="bg-background pl-10 w-fit"
 />
 </div>
 </div>
 );

 case 'amount':
 return (
 <div className="mt-3 relative">
 <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 type="number"
 placeholder="0.00"
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="bg-background pl-10"
 step="0.01"
 />
 </div>
 );

 case 'reference':
 return (
 <div className="mt-3 relative">
 <Link className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 placeholder="Enter reference (e.g., document, link, or citation)..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="bg-background pl-10"
 />
 </div>
 );

 case 'follow-up':
 return (
 <div className="mt-3 space-y-3">
 <Textarea
 placeholder="Enter follow-up question or clarification..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[80px] resize-none bg-background"
 />
 <p className="text-xs text-muted-foreground">This question prompts additional information based on previous responses.</p>
 </div>
 );

 case 'file-upload':
 return (
 <div className="mt-3">
 <div 
 className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
 onClick={() => {/* File upload logic */}}
 >
 <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
 <p className="text-xs text-muted-foreground/70 mt-1">PDF, DOC, DOCX, XLS, XLSX up to 10MB</p>
 </div>
 {question.answer && (
 <p className="text-sm text-primary mt-2">Uploaded: {question.answer}</p>
 )}
 </div>
 );

 case 'toggle':
 return (
 <div className="mt-3 flex items-center gap-3">
 <Switch
 checked={question.answer === 'true'}
 onCheckedChange={(checked) => handleAnswerChange(checked ? 'true' : 'false')}
 />
 <span className="text-sm text-muted-foreground">
 {question.answer === 'true' ? 'Yes' : 'No'}
 </span>
 </div>
 );

 default:
 return null;
 }
 };

 return (
 <>
 <div 
 ref={(node) => {
 setNodeRef(node);
 (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
 }}
 style={style}
 className={`question-card p-5 mb-3 animate-slide-up group/card relative overflow-visible ${
 isDragging ? 'shadow-xl ring-2 ring-primary/20' : ''
 } ${isFocused && !isPreviewMode ? 'ring-2 ring-primary/30' : ''}`}
 onPointerDownCapture={() => {
 if (!isPreviewMode) setIsFocused(true);
 }}
 onFocusCapture={() => {
 if (!isPreviewMode) setIsFocused(true);
 }}
 onClick={() => !isPreviewMode && setIsFocused(true)}
 >
 {/* Floating Toolbar - appears when focused, hidden in preview mode */}
 {isFocused && !isPreviewMode && (
 <div 
 ref={toolbarRef} 
 className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
 onClick={(e) => e.stopPropagation()}
 >
 <QuestionToolbar
 currentType={question.answerType}
 onChangeType={handleTypeChange}
 onDuplicate={handleDuplicate}
 onDelete={onDelete}
 onAddSubQuestion={onAddSubQuestion}
 onAddNote={handleAddNote}
 onToggleReference={hasReference ? handleRemoveReference : handleAddReference}
 hasReference={hasReference}
 />
 </div>
 )}

 <div className="flex gap-3">
 {/* Drag Handle - appears on hover, hidden in preview mode but space preserved */}
 <div className={`flex items-center justify-center w-6 h-6 mt-0.5 shrink-0 ${isPreviewMode ? '' : 'rounded cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 hover:bg-muted transition-all'}`}>
 {!isPreviewMode && (
 <div
 {...attributes}
 {...listeners}
 className="flex items-center justify-center w-full h-full"
 title="Drag to reorder"
 >
 <GripVertical className="h-4 w-4 text-muted-foreground" />
 </div>
 )}
 </div>

 {/* Collapse Toggle */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 onUpdate({...question, isExpanded: !isExpanded });
 }}
 className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-all mt-0.5 shrink-0"
 aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
 >
 <ChevronRight 
 className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
 />
 </button>

 {/* Content */}
 <div className="flex-1 min-w-0">
 {/* Question text - inline editable with rich text (read-only in preview) */}
 {isEditingQuestion && !isPreviewMode ? (
 <RichTextQuestionEditor
 value={draftQuestionText}
 onChange={handleQuestionChange}
 onBlur={commitQuestionText}
 onCancel={() => {
 setDraftQuestionText(question.text);
 setIsEditingQuestion(false);
 }}
 className="font-medium text-base"
 />
 ) : (
 <div 
 className={`question-content text-foreground font-medium px-2 py-1 -mx-2 -my-1 rounded transition-colors ${!isPreviewMode ? 'cursor-text hover:bg-muted/50' : ''}`}
 onClick={(e) => {
 if (!isPreviewMode) {
 e.stopPropagation();
 setIsFocused(true);
 setIsEditingQuestion(true);
 }
 }}
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.text) }}
 />
 )}

 {/* Sub-question button - between question and answer (hidden in preview mode) */}
 {!isPreviewMode && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setIsFocused(true);
 handleAddInlineSubQuestion();
 }}
 className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors border border-dashed border-muted hover:border-primary"
 >
 <Plus className="h-4 w-4" />
 Sub-question
 </button>
 )}

 {/* Sub-questions (nested blocks - between question and answer) */}
 {question.subQuestions && question.subQuestions.length > 0 && (
 <DndContext
 sensors={subQuestionSensors}
 collisionDetection={closestCenter}
 onDragEnd={handleSubQuestionDragEnd}
 >
 <SortableContext
 items={question.subQuestions.map((sq) => sq.id)}
 strategy={verticalListSortingStrategy}
 >
 <div className="mt-3 ml-4 border-l-2 border-muted pl-4 space-y-3">
 {question.subQuestions.map((sub, i) => (
 <SortableInlineSubQuestion
 key={sub.id}
 question={sub}
 index={i}
 onUpdate={(updated) => handleSubQuestionUpdate(i, updated)}
 onDelete={() => handleSubQuestionDelete(i)}
 isPreviewMode={isPreviewMode}
 />
 ))}
 </div>
 </SortableContext>
 </DndContext>
 )}

 {/* Collapsible answer section */}
 <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[3000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
 {/* Answer field */}
 {renderAnswerField()}

 {/* Note section - persisted */}
 {hasNote && (
 <div className="mt-4 relative">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-muted-foreground">Note</p>
 <button 
 onClick={handleRemoveNote}
 className="p-1 rounded hover:bg-muted transition-colors"
 >
 <X className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </div>
 <Textarea
 placeholder="Add a note..."
 value={question.note || ''}
 onChange={(e) => handleNoteChange(e.target.value)}
 onFocus={(e) => showToolbar(e.target)}
 className="min-h-[60px] resize-none bg-muted/30 border-muted"
 />
 </div>
 )}

 {/* Additional explanation - now deletable and available for all types */}
 {hasExplanation && (
 <div className="mt-4">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-muted-foreground">Additional Explanation</p>
 <button 
 onClick={handleRemoveExplanation}
 className="p-1 rounded hover:bg-muted transition-colors"
 >
 <X className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </div>
 <div className="relative">
 <Textarea
 placeholder="Add any additional context or explanation..."
 value={question.explanation || ''}
 onChange={(e) => handleExplanationChange(e.target.value)}
 onFocus={(e) => showToolbar(e.target)}
 className="min-h-[80px] pr-20 resize-none bg-background"
 />
 <div className="absolute bottom-3 right-3 flex items-center gap-1">
 <button
 onClick={handleAIClick}
 className="flex items-center gap-1 px-2 py-1 rounded text-accent hover:bg-accent/10 transition-colors"
 >
 <Sparkles className="h-4 w-4" />
 </button>
 <button 
 onClick={() => handleMicClick('explanation')}
 className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
 isListening && activeVoiceField === 'explanation' 
 ? 'text-red-500 bg-red-100 animate-pulse' 
 : 'text-accent hover:bg-accent/10'
 }`}
 title={isListening && activeVoiceField === 'explanation' ? 'Stop recording' : 'Start voice input'}
 >
 {isListening && activeVoiceField === 'explanation' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Reference/Attachment field - deletable */}
 {hasReference && (
 <div className="mt-4">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-muted-foreground">Attach Reference</p>
 <button 
 onClick={handleRemoveReference}
 className="p-1 rounded hover:bg-muted transition-colors"
 title="Remove attachment option"
 >
 <X className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </div>
 <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
 <Paperclip className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm text-muted-foreground">Click to attach file</span>
 <input type="file" className="hidden" />
 </label>
 </div>
 )}

 {/* Action buttons for adding explanation only (hidden in preview mode) */}
 {!isPreviewMode && (
 <div className="mt-4 flex items-center gap-2">
 {!hasExplanation && (
 <Button 
 variant="outline" 
 size="sm" 
 className="text-muted-foreground hover:text-primary-foreground hover:border-primary hover:bg-primary transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 setIsFocused(true);
 handleAddExplanation();
 }}
 >
 <Plus className="h-3.5 w-3.5 mr-1.5" />
 Explanation
 </Button>
 )}
 </div>
 )}

 </div>
 </div>
 </div>
 </div>

 {showAIMenu && (
 <AIEditMenu
 text={question.answer || ''}
 position={aiMenuPosition}
 onClose={() => setShowAIMenu(false)}
 onApply={handleAIEdit}
 />
 )}
 </>
 );
}
