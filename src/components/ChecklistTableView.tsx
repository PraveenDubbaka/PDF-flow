import { useState, useRef, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
 Plus, 
 Trash2, 
 Sparkles, 
 Mic, 
 MicOff, 
 GripVertical,
 ChevronDown,
 ChevronUp,
 Check,
 FileText,
 X
} from 'lucide-react';
import { Checklist, Question, AnswerType } from '@/types/checklist';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QuestionToolbar } from './QuestionToolbar';
import { AIEditMenu } from './AIEditMenu';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { useToast } from '@/hooks/use-toast';
import { arrayMove } from '@dnd-kit/sortable';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';

interface ChecklistTableViewProps {
 checklist: Checklist;
 onUpdate: (checklist: Checklist) => void;
 isPreviewMode: boolean;
}

// Sub-question table row component - renders sub-questions as table rows with answers in Response column
interface SubQuestionTableRowProps {
 subQuestion: Question;
 index: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 onMoveUp: () => void;
 onMoveDown: () => void;
 isFirst: boolean;
 isLast: boolean;
 isPreviewMode: boolean;
 hasExplanationAfter?: boolean;
}

function SubQuestionTableRow({
 subQuestion,
 index,
 onUpdate,
 onDelete,
 onMoveUp,
 onMoveDown,
 isFirst,
 isLast,
 isPreviewMode,
 hasExplanationAfter,
}: SubQuestionTableRowProps) {
 const [isEditing, setIsEditing] = useState(false);
 const [draftText, setDraftText] = useState(subQuestion.text);

 const handleAnswerChange = (answer: string) => {
 onUpdate({...subQuestion, answer });
 };

 const handleTypeChange = (answerType: AnswerType) => {
 const options = (answerType === 'multiple-choice' || answerType === 'dropdown') 
 ? (subQuestion.options || ['Option 1', 'Option 2'])
 : undefined;
 onUpdate({...subQuestion, answerType, answer: '', options });
 };

 const handleOptionUpdate = (optIndex: number, value: string) => {
 const baseOptions = subQuestion.options || ['Option 1', 'Option 2'];
 const oldValue = baseOptions[optIndex];
 const newOptions = [...baseOptions];
 newOptions[optIndex] = value;

 onUpdate({
...subQuestion,
 options: newOptions,
 answer: subQuestion.answer === oldValue ? value : subQuestion.answer,
 });
 };

 const handleOptionRemove = (optIndex: number) => {
 const baseOptions = subQuestion.options || ['Option 1', 'Option 2'];
 const removedValue = baseOptions[optIndex];
 const newOptions = baseOptions.filter((_, i) => i !== optIndex);

 if (newOptions.length > 0) {
 onUpdate({
...subQuestion,
 options: newOptions,
 answer: subQuestion.answer === removedValue ? '' : subQuestion.answer,
 });
 }
 };

 const handleAddOption = () => {
 const newOptions = [...(subQuestion.options || []), `Option ${(subQuestion.options?.length || 0) + 1}`];
 onUpdate({...subQuestion, options: newOptions });
 };

 const commitText = () => {
 const trimmed = draftText.trim();
 if (!trimmed) {
 setDraftText(subQuestion.text);
 setIsEditing(false);
 return;
 }
 if (trimmed !== subQuestion.text) {
 onUpdate({...subQuestion, text: trimmed });
 }
 setIsEditing(false);
 };

 const renderSubAnswerField = () => {
 if (isPreviewMode) {
 // Interactive preview mode - users can answer questions to test
 switch (subQuestion.answerType) {
 case 'yes-no':
 return (
 <div className="flex gap-4">
 {['Yes', 'No'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-3 w-3 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'yes-no-na':
 const yesNoNaOptions = subQuestion.options || ['Yes', 'No', 'NA'];
 return (
 <div className="flex flex-wrap gap-3">
 {yesNoNaOptions.map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-3 w-3 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'long-answer':

 case 'long-answer':
 return (
 <Textarea
 placeholder="Enter detailed answer..."
 value={subQuestion.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[80px] resize-none bg-background"
 />
 );

 case 'dropdown':
 case 'multiple-choice':
 const options = subQuestion.options || ['Option 1', 'Option 2'];
 return (
 <div className="space-y-1">
 {options.map((option, i) => (
 <label key={i} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-2.5 w-2.5 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm">{option}</span>
 </label>
 ))}
 </div>
 );

 default:
 return (
 <Input
 placeholder="Enter answer..."
 value={subQuestion.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="h-9 bg-background"
 />
 );
 }
 }

 switch (subQuestion.answerType) {
 case 'yes-no':
 return (
 <div className="flex gap-4">
 {['Yes', 'No'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-3 w-3 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'yes-no-na':
 const yesNoNaOptions = subQuestion.options || ['Yes', 'No', 'NA'];
 return (
 <div className="flex flex-wrap gap-3">
 {yesNoNaOptions.map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-3 w-3 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'long-answer':

 case 'long-answer':
 return (
 <div className="relative">
 <Textarea
 placeholder="Enter detailed answer..."
 value={subQuestion.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[80px] resize-none bg-background pr-12"
 />
 <button className="absolute bottom-2 right-2 p-1.5 rounded text-accent hover:bg-accent/10 transition-colors">
 <Sparkles className="h-4 w-4" />
 </button>
 </div>
 );

 case 'dropdown':
 case 'multiple-choice':
 const options = subQuestion.options || ['Option 1', 'Option 2'];
 return (
 <div className="space-y-1">
 {options.map((option, i) => (
 <label key={i} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
 subQuestion.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {subQuestion.answer === option && (
 <Check className="h-2.5 w-2.5 text-primary-foreground" />
 )}
 </div>
 {!isPreviewMode ? (
 <Input
 value={option}
 onChange={(e) => handleOptionUpdate(i, e.target.value)}
 className="h-7 text-sm flex-1"
 />
 ) : (
 <span className="text-sm">{option}</span>
 )}
 {!isPreviewMode && options.length > 1 && (
 <button
 onClick={() => handleOptionRemove(i)}
 className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
 >
 <Trash2 className="h-3 w-3" />
 </button>
 )}
 </label>
 ))}
 {!isPreviewMode && (
 <button
 onClick={handleAddOption}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
 >
 <Plus className="h-3 w-3" />
 Add option
 </button>
 )}
 </div>
 );

 case 'toggle':
 return (
 <label className="flex items-center gap-3 cursor-pointer">
 <div 
 className={`w-11 h-6 rounded-full transition-colors relative ${
 subQuestion.answer === 'true' ? 'bg-primary' : 'bg-muted'
 }`}
 onClick={() => handleAnswerChange(subQuestion.answer === 'true' ? 'false' : 'true')}
 >
 <div 
 className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
 subQuestion.answer === 'true' ? 'translate-x-5' : 'translate-x-0.5'
 }`}
 />
 </div>
 <span className="text-sm">{subQuestion.answer === 'true' ? 'Yes' : 'No'}</span>
 </label>
 );

 default:
 return (
 <Input
 placeholder="Enter answer..."
 value={subQuestion.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="h-9 bg-background"
 />
 );
 }
 };

 const isLastSubQuestion = isLast;
 const showBottomBorder = isLastSubQuestion && !hasExplanationAfter;
 
 return (
 <tr className={`bg-muted/10 hover:bg-muted/20 transition-colors ${showBottomBorder ? 'border-b' : 'border-b-0'}`}>
 {/* Drag handle column - indented to show hierarchy */}
 <td className="py-1.5 px-2 w-14">
 <div className="flex items-center gap-1 pl-6">
 {!isPreviewMode && (
 <div className="flex flex-col items-center gap-0.5">
 <button
 onClick={onMoveUp}
 disabled={isFirst}
 className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move up"
 >
 <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
 </button>
 <GripVertical className="h-2.5 w-2.5 text-muted-foreground/40 cursor-grab" />
 <button
 onClick={onMoveDown}
 disabled={isLast}
 className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move down"
 >
 <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
 </button>
 </div>
 )}
 </div>
 </td>

 {/* Description - sub-question text with letter prefix and visual connector */}
 <td className="py-1.5 px-2 min-w-[300px] max-w-[400px]">
 <div className="flex items-start gap-2 ml-6 pl-4 border-l-2 border-primary/30 relative">
 {/* Visual connector dot */}
 <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-primary/30" />
 <span className="text-muted-foreground font-medium text-xs shrink-0 mt-0.5">
 {String.fromCharCode(97 + index)}.
 </span>
 <div className="flex-1">
 {isEditing && !isPreviewMode ? (
 <Input
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
 setDraftText(subQuestion.text);
 setIsEditing(false);
 }
 }}
 autoFocus
 className="h-7 text-xs"
 />
 ) : (
 <span
 className={`text-xs text-foreground/80 block ${!isPreviewMode ? 'cursor-text hover:bg-muted/50 px-1 py-0.5 -mx-1 rounded' : ''}`}
 onClick={() => !isPreviewMode && setIsEditing(true)}
 >
 {subQuestion.text}
 </span>
 )}
 {/* Answer type selector - smaller */}
 {!isPreviewMode && (
 <select
 value={subQuestion.answerType}
 onChange={(e) => handleTypeChange(e.target.value as AnswerType)}
 className="mt-0.5 text-[10px] bg-muted/30 border-none rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
 >
 <option value="yes-no">Yes / No</option>
 <option value="yes-no-na">Yes / No / N/A</option>
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
 )}
 </div>
 </div>
 </td>

 {/* Response column - sub-question answer with indent */}
 <td className="py-1.5 px-2 min-w-[250px]">
 <div className="pl-4 text-sm">
 {renderSubAnswerField()}
 </div>
 </td>

 {/* Reference column - delete button only */}
 <td className="py-1.5 px-2 w-[100px]">
 {!isPreviewMode && (
 <button
 onClick={onDelete}
 className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground/50 hover:text-destructive"
 aria-label="Delete sub-question"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </td>
 </tr>
 );
}

// Sub-question drag-and-drop container for table rows
interface SubQuestionTableDndContainerProps {
 subQuestions: Question[];
 onReorder: (subQuestions: Question[]) => void;
 onUpdateSubQuestion: (index: number, question: Question) => void;
 onDeleteSubQuestion: (index: number) => void;
 isPreviewMode: boolean;
 hasExplanationAfter?: boolean;
}

function SubQuestionTableDndContainer({
 subQuestions,
 onReorder,
 onUpdateSubQuestion,
 onDeleteSubQuestion,
 isPreviewMode,
 hasExplanationAfter,
}: SubQuestionTableDndContainerProps) {
 const handleMoveSubQuestion = (index: number, direction: 'up' | 'down') => {
 if (direction === 'up' && index > 0) {
 const reordered = arrayMove(subQuestions, index, index - 1);
 onReorder(reordered);
 } else if (direction === 'down' && index < subQuestions.length - 1) {
 const reordered = arrayMove(subQuestions, index, index + 1);
 onReorder(reordered);
 }
 };

 return (
 <>
 {subQuestions.map((sub, i) => (
 <SubQuestionTableRow
 key={sub.id}
 subQuestion={sub}
 index={i}
 onUpdate={(updatedSub) => onUpdateSubQuestion(i, updatedSub)}
 onDelete={() => onDeleteSubQuestion(i)}
 onMoveUp={() => handleMoveSubQuestion(i, 'up')}
 onMoveDown={() => handleMoveSubQuestion(i, 'down')}
 isFirst={i === 0}
 isLast={i === subQuestions.length - 1}
 isPreviewMode={isPreviewMode}
 hasExplanationAfter={hasExplanationAfter}
 />
 ))}
 </>
 );
}

interface TableRowProps {
 question: Question;
 sectionIndex: number;
 questionIndex: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 onDuplicate: () => void;
 onAddSubQuestion: () => void;
 isPreviewMode: boolean;
 isFirst: boolean;
 isLast: boolean;
 onMoveUp: () => void;
 onMoveDown: () => void;
}

function TableRow({ 
 question, 
 onUpdate, 
 onDelete, 
 onDuplicate, 
 onAddSubQuestion,
 isPreviewMode,
 isFirst,
 isLast,
 onMoveUp,
 onMoveDown
}: TableRowProps) {
 const [checked, setChecked] = useState(false);
 const [procedureStatus, setProcedureStatus] = useState<string>('');
 const [isEditing, setIsEditing] = useState(false);
 const [isFocused, setIsFocused] = useState(false);
 const [showAIMenu, setShowAIMenu] = useState(false);
 const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
 const [activeVoiceField, setActiveVoiceField] = useState<'answer' | 'explanation' | null>(null);
 const [hasReference, setHasReference] = useState(!!question.reference);
 const [hasExplanation, setHasExplanation] = useState(question.explanation !== undefined);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const rowRef = useRef<HTMLTableRowElement>(null);
 const { toast } = useToast();

 // Voice-to-text handlers
 const handleVoiceResult = useCallback((transcript: string) => {
 if (activeVoiceField === 'answer') {
 const currentAnswer = question.answer || '';
 const newAnswer = currentAnswer ? `${currentAnswer} ${transcript}` : transcript;
 onUpdate({...question, answer: newAnswer });
 toast({
 title: "Voice input captured",
 description: transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript,
 });
 }
 setActiveVoiceField(null);
 }, [activeVoiceField, question, onUpdate, toast]);

 const handleVoiceError = useCallback((error: string) => {
 toast({
 title: "Voice input error",
 description: error,
 variant: "destructive",
 });
 setActiveVoiceField(null);
 }, [toast]);

 const { isListening, toggleListening, isSupported } = useVoiceToText({
 onResult: handleVoiceResult,
 onError: handleVoiceError,
 });

 const handleMicClick = () => {
 if (!isSupported) {
 toast({
 title: "Not supported",
 description: "Voice input is not supported in this browser. Try Chrome or Edge.",
 variant: "destructive",
 });
 return;
 }
 setActiveVoiceField('answer');
 toggleListening();
 };

 const handleAnswerChange = (answer: string) => {
 onUpdate({...question, answer });
 };

 const handleTypeChange = (type: AnswerType) => {
 onUpdate({...question, answerType: type, answer: '' });
 };

 const handleTextChange = (text: string) => {
 onUpdate({...question, text });
 };

 const handleProcedureChange = (value: string) => {
 setProcedureStatus(value);
 onUpdate({...question, note: value });
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

 const handleToggleReference = () => {
 setHasReference(!hasReference);
 onUpdate({...question, reference: !hasReference ? '' : undefined });
 };

 const handleAddNote = () => {
 onUpdate({...question, explanation: question.explanation || '' });
 };

 const handleAddExplanation = () => {
 setHasExplanation(true);
 onUpdate({...question, explanation: question.explanation || '' });
 };

 const handleRemoveExplanation = () => {
 setHasExplanation(false);
 onUpdate({...question, explanation: undefined });
 };

 const handleExplanationChange = (explanation: string) => {
 onUpdate({...question, explanation });
 };

 // Strip HTML tags for plain text editing
 const plainText = question.text.replace(/<[^>]*>/g, '');

 const renderAnswerField = () => {
 if (isPreviewMode) {
 // Interactive preview mode - users can answer questions to test
 switch (question.answerType) {
 case 'yes-no':
 return (
 <div className="flex gap-4">
 {['Yes', 'No'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
 question.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {question.answer === option && (
 <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
 )}
 </div>
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'yes-no-na':
 return (
 <div className="flex gap-4">
 {['Yes', 'No', 'N/A'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
 question.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {question.answer === option && (
 <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
 )}
 </div>
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'long-answer':

 case 'long-answer':
 return (
 <Textarea
 placeholder="Enter your detailed answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[80px] resize-none bg-background"
 />
 );

 case 'dropdown':
 case 'multiple-choice':
 return (
 <div className="space-y-1">
 {(question.options || ['Option 1', 'Option 2', 'Option 3']).map((option, i) => (
 <label key={i} className="flex items-center gap-2 cursor-pointer group">
 <div 
 className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
 question.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/30 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {question.answer === option && (
 <Check className="h-2.5 w-2.5 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 default:
 return (
 <Input
 placeholder="Enter your answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="bg-background h-9"
 />
 );
 }
 }

 switch (question.answerType) {
 case 'yes-no':
 return (
 <div className="flex gap-4">
 {['Yes', 'No'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
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
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'yes-no-na':
 return (
 <div className="flex gap-4">
 {['Yes', 'No', 'N/A'].map((option) => (
 <label key={option} className="flex items-center gap-2 cursor-pointer group">
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
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'long-answer':

 case 'long-answer':
 return (
 <div className="relative">
 <Textarea
 ref={textareaRef}
 placeholder="Enter your detailed answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="min-h-[80px] pr-16 resize-none bg-background"
 />
 <div className="absolute bottom-2 right-2 flex items-center gap-1">
 <button
 onClick={handleAIClick}
 className="flex items-center gap-1 px-2 py-1 rounded text-accent hover:bg-accent/10 transition-colors"
 >
 <Sparkles className="h-4 w-4" />
 </button>
 <button 
 onClick={handleMicClick}
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
 return (
 <div className="space-y-1">
 {(question.options || ['Option 1', 'Option 2', 'Option 3']).map((option, i) => (
 <label key={i} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors group">
 <div 
 className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
 question.answer === option 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 group-hover:border-primary/50'
 }`}
 onClick={() => handleAnswerChange(option)}
 >
 {question.answer === option && (
 <Check className="h-2.5 w-2.5 text-primary-foreground" />
 )}
 </div>
 <span className="text-sm text-foreground">{option}</span>
 </label>
 ))}
 </div>
 );

 default:
 return (
 <Input
 placeholder="Enter your answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
 className="bg-background h-9"
 />
 );
 }
 };

 return (
 <>
 <tr 
 ref={rowRef}
 className={`hover:bg-muted/30 transition-colors ${isFocused ? 'bg-muted/20' : ''} ${(question.subQuestions && question.subQuestions.length > 0) || hasExplanation ? '' : 'border-b'}`}
 onFocus={() => setIsFocused(true)}
 onBlur={(e) => {
 if (!rowRef.current?.contains(e.relatedTarget as Node)) {
 setIsFocused(false);
 }
 }}
 tabIndex={0}
 >
 {/* Checkbox + Drag handle */}
 <td className="p-3 w-14">
 <div className="flex items-center gap-1">
 {!isPreviewMode && (
 <div className="flex flex-col items-center gap-0.5">
 <button
 onClick={onMoveUp}
 disabled={isFirst}
 className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move up"
 >
 <ChevronUp className="h-3 w-3 text-muted-foreground" />
 </button>
 <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
 <button
 onClick={onMoveDown}
 disabled={isLast}
 className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move down"
 >
 <ChevronDown className="h-3 w-3 text-muted-foreground" />
 </button>
 </div>
 )}
 <Checkbox
 checked={checked}
 onCheckedChange={(val) => setChecked(!!val)}
 disabled={isPreviewMode}
 />
 </div>
 </td>

 {/* Description - editable */}
 <td className="p-3 min-w-[300px] max-w-[400px]">
 <div className="border rounded-lg p-3 bg-background min-h-[60px] relative group">
 {isEditing && !isPreviewMode ? (
 <Textarea
 value={plainText}
 onChange={(e) => handleTextChange(e.target.value)}
 onBlur={() => setIsEditing(false)}
 autoFocus
 className="min-h-[60px] resize-none bg-transparent border-0 p-0 focus-visible:ring-0"
 placeholder="Enter question text..."
 />
 ) : (
 <div 
 className="text-sm text-foreground whitespace-pre-wrap cursor-text prose prose-sm max-w-none
 [&_ol]:list-[lower-alpha] [&_ol]:ml-4 [&_ol]:my-2
 [&_li]:my-1 [&_li]:pl-1
 [&_p]:my-2 [&_p:first-child]:mt-0
 [&_strong]:font-semibold
 [&_em]:italic [&_em]:text-muted-foreground"
 onClick={() => !isPreviewMode && setIsEditing(true)}
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.text) || '<span class="text-muted-foreground">Click to add question text...</span>' }}
 />
 )}

 {/* Floating Toolbar on focus */}
 {isFocused && !isPreviewMode && (
 <div className="absolute -top-12 left-0 z-10">
 <QuestionToolbar
 currentType={question.answerType}
 onChangeType={handleTypeChange}
 onDuplicate={onDuplicate}
 onDelete={onDelete}
 onAddSubQuestion={onAddSubQuestion}
 onAddNote={handleAddNote}
 onToggleReference={handleToggleReference}
 hasReference={hasReference}
 />
 </div>
 )}

 {/* Sub-question and Explanation buttons - hidden in preview mode */}
 {!isPreviewMode && (
 <div className="flex items-center gap-2 mt-3">
 <button
 onClick={onAddSubQuestion}
 className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors border border-dashed border-muted hover:border-primary"
 >
 <Plus className="h-4 w-4" />
 Sub-question
 </button>
 {!hasExplanation && (
 <button
 onClick={handleAddExplanation}
 className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors border border-dashed border-muted hover:border-primary"
 >
 <FileText className="h-4 w-4" />
 + Explanation
 </button>
 )}
 </div>
 )}
 </div>

 </td>


 {/* Responses - with answer type specific fields */}
 <td className="p-3 min-w-[250px]">
 {renderAnswerField()}
 </td>

 {/* Reference */}
 <td className="p-3 w-[100px]">
 <Button
 variant="ghost"
 size="sm"
 className="text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-colors"
 disabled={isPreviewMode}
 >
 + Ref
 </Button>
 </td>
 </tr>

 {/* Sub-questions rendered as separate table rows */}
 {question.subQuestions && question.subQuestions.length > 0 && (
 <SubQuestionTableDndContainer
 subQuestions={question.subQuestions}
 onReorder={(newSubQuestions) => {
 onUpdate({...question, subQuestions: newSubQuestions });
 }}
 onUpdateSubQuestion={(index, updatedSub) => {
 const newSubQuestions = [...(question.subQuestions || [])];
 newSubQuestions[index] = updatedSub;
 onUpdate({...question, subQuestions: newSubQuestions });
 }}
 onDeleteSubQuestion={(index) => {
 const newSubQuestions = (question.subQuestions || []).filter((_, idx) => idx !== index);
 onUpdate({...question, subQuestions: newSubQuestions });
 }}
 isPreviewMode={isPreviewMode}
 hasExplanationAfter={hasExplanation}
 />
 )}

 {/* Additional explanation row - shown after sub-questions */}
 {hasExplanation && (
 <tr className="bg-muted/5 border-b" style={{ borderTop: 'none' }}>
 <td colSpan={4} className="py-3 px-4 pt-4">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs text-muted-foreground font-medium">Additional Explanation</p>
 {!isPreviewMode && (
 <button 
 onClick={handleRemoveExplanation}
 className="p-1 rounded hover:bg-muted transition-colors"
 >
 <X className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 )}
 </div>
 <div className="relative">
 <Textarea
 placeholder="Add any additional context or explanation..."
 value={question.explanation || ''}
 onChange={(e) => handleExplanationChange(e.target.value)}
 className="min-h-[60px] pr-12 resize-none bg-background border-muted text-sm w-full"
 disabled={isPreviewMode}
 />
 {!isPreviewMode && (
 <button
 onClick={handleAIClick}
 className="absolute bottom-2 right-2 p-1.5 rounded text-accent hover:bg-accent/10 transition-colors"
 >
 <Sparkles className="h-4 w-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 )}

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

export function ChecklistTableView({ checklist, onUpdate, isPreviewMode }: ChecklistTableViewProps) {
 const handleQuestionUpdate = (sectionIndex: number, questionIndex: number, updatedQuestion: Question) => {
 const newSections = [...checklist.sections];
 newSections[sectionIndex] = {
...newSections[sectionIndex],
 questions: newSections[sectionIndex].questions.map((q, idx) =>
 idx === questionIndex ? updatedQuestion : q
 ),
 };
 onUpdate({...checklist, sections: newSections });
 };

 const handleQuestionDelete = (sectionIndex: number, questionIndex: number) => {
 const newSections = [...checklist.sections];
 newSections[sectionIndex] = {
...newSections[sectionIndex],
 questions: newSections[sectionIndex].questions.filter((_, idx) => idx !== questionIndex),
 };
 onUpdate({...checklist, sections: newSections });
 };

 const handleQuestionDuplicate = (sectionIndex: number, questionIndex: number) => {
 const question = checklist.sections[sectionIndex].questions[questionIndex];
 const newQuestion: Question = {
...question,
 id: `q-${Date.now()}`,
 };
 const newSections = [...checklist.sections];
 newSections[sectionIndex] = {
...newSections[sectionIndex],
 questions: [
...newSections[sectionIndex].questions.slice(0, questionIndex + 1),
 newQuestion,
...newSections[sectionIndex].questions.slice(questionIndex + 1),
 ],
 };
 onUpdate({...checklist, sections: newSections });
 };

 const handleAddSubQuestion = (sectionIndex: number, questionIndex: number) => {
 const question = checklist.sections[sectionIndex].questions[questionIndex];
 const newSubQuestion = {
 id: `sq-${Date.now()}`,
 text: 'New sub-question',
 answerType: 'short-answer' as AnswerType,
 required: false,
 };
 const updatedQuestion = {
...question,
 subQuestions: [...(question.subQuestions || []), newSubQuestion],
 };
 handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
 };

 const handleMoveQuestion = (sectionIndex: number, questionIndex: number, direction: 'up' | 'down') => {
 const newSections = [...checklist.sections];
 const questions = [...newSections[sectionIndex].questions];
 
 if (direction === 'up' && questionIndex > 0) {
 [questions[questionIndex - 1], questions[questionIndex]] = [questions[questionIndex], questions[questionIndex - 1]];
 } else if (direction === 'down' && questionIndex < questions.length - 1) {
 [questions[questionIndex], questions[questionIndex + 1]] = [questions[questionIndex + 1], questions[questionIndex]];
 }
 
 newSections[sectionIndex] = {...newSections[sectionIndex], questions };
 onUpdate({...checklist, sections: newSections });
 };

 const handleAddRow = (sectionIndex: number) => {
 const newQuestion: Question = {
 id: `q-${Date.now()}`,
 text: '',
 answerType: 'long-answer',
 required: false,
 };
 const newSections = [...checklist.sections];
 newSections[sectionIndex] = {
...newSections[sectionIndex],
 questions: [...newSections[sectionIndex].questions, newQuestion],
 };
 onUpdate({...checklist, sections: newSections });
 };

 // Strip number prefix from section title
 const cleanTitle = (title: string) => title.replace(/^\d+\.\s*/, '');

 return (
 <div className="space-y-8">
 {checklist.sections.map((section, sectionIndex) => (
 <div key={section.id} className="bg-card border rounded-xl overflow-hidden">
 <div className="bg-muted/50 px-4 py-3 border-b">
 <h3 className="font-semibold text-foreground">
 {sectionIndex + 1}. {cleanTitle(section.title)}
 </h3>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b bg-muted/30">
 <th className="p-3 w-14"></th>
 <th className="p-3 text-left text-sm font-medium text-muted-foreground">
 Description
 </th>
 <th className="p-3 text-left text-sm font-medium text-muted-foreground min-w-[250px]">
 Response
 </th>
 <th className="p-3 text-left text-sm font-medium text-muted-foreground w-[100px]">
 w/p reference
 </th>
 </tr>
 </thead>
 <tbody>
 {section.questions.map((question, questionIndex) => (
 <TableRow
 key={question.id}
 question={question}
 sectionIndex={sectionIndex}
 questionIndex={questionIndex}
 onUpdate={(q) => handleQuestionUpdate(sectionIndex, questionIndex, q)}
 onDelete={() => handleQuestionDelete(sectionIndex, questionIndex)}
 onDuplicate={() => handleQuestionDuplicate(sectionIndex, questionIndex)}
 onAddSubQuestion={() => handleAddSubQuestion(sectionIndex, questionIndex)}
 isPreviewMode={isPreviewMode}
 isFirst={questionIndex === 0}
 isLast={questionIndex === section.questions.length - 1}
 onMoveUp={() => handleMoveQuestion(sectionIndex, questionIndex, 'up')}
 onMoveDown={() => handleMoveQuestion(sectionIndex, questionIndex, 'down')}
 />
 ))}
 </tbody>
 </table>
 </div>
 
 {!isPreviewMode && (
 <div className="p-4 border-t">
 <Button
 variant="default"
 size="sm"
 onClick={() => handleAddRow(sectionIndex)}
 className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-primary-foreground"
 >
 <Plus className="h-4 w-4 mr-1" />
 Add Row
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 );
}