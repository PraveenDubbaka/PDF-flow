import { useState, useRef, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
 GripVertical, 
 MoreVertical, 
 Plus, 
 Trash2, 
 Sparkles,
 Check,
 ArrowRight,
 Mic,
 MicOff,
 ChevronDown,
 ChevronUp
} from 'lucide-react';
import { Question, AnswerType } from '@/types/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AIEditMenu } from './AIEditMenu';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { useToast } from '@/hooks/use-toast';

interface QuestionCardProps {
 question: Question;
 index: number;
 sectionIndex: number;
 onUpdate: (question: Question) => void;
 onDelete: () => void;
 onAddSubQuestion: () => void;
 onMoveUp: () => void;
 onMoveDown: () => void;
 isFirst: boolean;
 isLast: boolean;
}


export function QuestionCard({
 question,
 index,
 sectionIndex,
 onUpdate,
 onDelete,
 onAddSubQuestion,
 onMoveUp,
 onMoveDown,
 isFirst,
 isLast
}: QuestionCardProps) {
 const [showMenu, setShowMenu] = useState(false);
 const [showAIMenu, setShowAIMenu] = useState(false);
 const [isEditingQuestion, setIsEditingQuestion] = useState(false);
 const [isExpanded, setIsExpanded] = useState(true);
 const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
 const [activeVoiceField, setActiveVoiceField] = useState<'answer' | 'explanation' | null>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
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
 } else if (activeVoiceField === 'explanation') {
 const currentExplanation = question.explanation || '';
 const newExplanation = currentExplanation ? `${currentExplanation} ${transcript}` : transcript;
 onUpdate({...question, explanation: newExplanation });
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

 const handleQuestionChange = (text: string) => {
 onUpdate({...question, text });
 };

 const handleAnswerChange = (answer: string) => {
 onUpdate({...question, answer });
 };

 const handleTypeChange = (answerType: AnswerType) => {
 onUpdate({...question, answerType, answer: '' });
 setShowMenu(false);
 };

 const toggleRequired = () => {
 onUpdate({...question, required: !question.required });
 setShowMenu(false);
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

 const answerTypeLabels: Record<AnswerType, string> = {
 'none': 'None',
 'yes-no': 'Yes / No',
 'yes-no-na': 'Yes / No / N/A',
 'multiple-choice': 'Multiple Choice',
 'date': 'Date',
 'long-answer': 'Answer',
 'reference': 'Reference Capability',
 'amount': 'Amount',
 'follow-up': 'Follow-up Question',
 'dropdown': 'Dropdown',
 'file-upload': 'File Upload',
 'toggle': 'Switch/Toggle',
 'answer': 'Answer'
 };

 const renderAnswerField = () => {
 switch (question.answerType) {
 case 'yes-no':
 return (
 <div className="flex gap-8 mt-3">
 {['Yes', 'No'].map((option) => (
 <label key={option} className="flex items-center gap-2.5 cursor-pointer group">
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
 <div className="flex gap-8 mt-3">
 {['Yes', 'No', 'NA'].map((option) => (
 <label key={option} className="flex items-center gap-2.5 cursor-pointer group">
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


 case 'none':
 return null;

 case 'long-answer':
 case 'answer':
 return (
 <div className="mt-3 relative">
 <Textarea
 ref={textareaRef}
 placeholder="Enter your detailed answer..."
 value={question.answer || ''}
 onChange={(e) => handleAnswerChange(e.target.value)}
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
 return (
 <div className="mt-3 space-y-2">
 {(question.options || ['Option 1', 'Option 2', 'Option 3']).map((option, i) => (
 <label key={i} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors group">
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
 return null;
 }
 };

 return (
 <>
 <div 
 className="question-card p-5 mb-3 animate-slide-up"
 style={{ animationDelay: `${index * 50}ms` }}
 >
 <div className="flex gap-4">
 {/* Collapse toggle + reorder controls */}
 <div className="flex flex-col items-center gap-1 pt-0.5">
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="p-1 rounded hover:bg-muted transition-colors"
 aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
 >
 {isExpanded ? (
 <ChevronUp className="h-4 w-4 text-muted-foreground" />
 ) : (
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 )}
 </button>
 <button
 onClick={onMoveUp}
 disabled={isFirst}
 className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move up"
 >
 <ChevronUp className="h-4 w-4 text-muted-foreground" />
 </button>
 <button
 onClick={onMoveDown}
 disabled={isLast}
 className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
 aria-label="Move down"
 >
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 {/* Question text - with rich text support */}
 {isEditingQuestion ? (
 <Textarea
 value={question.text.replace(/<[^>]*>/g, '')}
 onChange={(e) => handleQuestionChange(e.target.value)}
 onBlur={() => setIsEditingQuestion(false)}
 autoFocus
 className="font-medium bg-background min-h-[100px] resize-none"
 placeholder="Enter question text..."
 />
 ) : (
 <div 
 className="text-foreground cursor-text hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 rounded transition-colors prose prose-sm max-w-none
 [&_ol]:list-[lower-alpha] [&_ol]:ml-4 [&_ol]:my-2
 [&_li]:my-1 [&_li]:pl-1
 [&_p]:my-2 [&_p:first-child]:mt-0
 [&_strong]:font-semibold
 [&_em]:italic [&_em]:text-muted-foreground"
 onClick={() => setIsEditingQuestion(true)}
 dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.text) || '<span class="text-muted-foreground">Click to add question text...</span>' }}
 />
 )}

 {/* Collapsible answer section */}
 {isExpanded && (
 <>
 {/* Answer field */}
 {renderAnswerField()}

 {/* Additional explanation for Yes/No types */}
 {(question.answerType === 'yes-no' || question.answerType === 'yes-no-na') && (
 <div className="mt-4">
 <p className="text-sm text-muted-foreground mb-2">Additional Explanation</p>
 <div className="relative">
 <Textarea
 placeholder=""
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

 {/* Add reference button */}
 <Button variant="outline" size="sm" className="mt-4 text-muted-foreground hover:text-primary hover:border-primary">
 <Plus className="h-3.5 w-3.5 mr-1.5" />
 Ref
 </Button>
 </>
 )}

 {/* Sub-questions (nested blocks with indentation) */}
 {question.subQuestions && question.subQuestions.length > 0 && (
 <div className="mt-5 ml-4 border-l-2 border-muted pl-4 space-y-3">
 {question.subQuestions.map((sub, i) => (
 <div key={sub.id} className="bg-muted/30 rounded-lg p-3 group hover:bg-muted/50 transition-colors">
 <div className="flex items-start gap-3">
 <button className="drag-handle mt-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity">
 <GripVertical className="h-4 w-4" />
 </button>
 <div className="flex-1">
 <p className="text-sm text-foreground">
 <span className="text-muted-foreground font-medium mr-2">
 {String.fromCharCode(97 + i)}.
 </span>
 {sub.text}
 </p>
 {/* Render sub-question answer type */}
 <div className="mt-2">
 {sub.answerType === 'long-answer' && (
 <Textarea
 placeholder="Enter your answer..." 
 className="h-20 text-sm bg-background"
 maxLength={500}
 />
 )}
 {sub.answerType === 'none' && null}
 {sub.answerType === 'long-answer' && (
 <div className="relative">
 <Textarea 
 placeholder="Enter your detailed answer..." 
 className="min-h-[60px] text-sm resize-none bg-background pr-16" 
 />
 <div className="absolute bottom-2 right-2 flex items-center gap-1">
 <button className="p-1 rounded text-accent hover:bg-accent/10 transition-colors">
 <Sparkles className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 )}
 {sub.answerType === 'yes-no' && (
 <div className="flex gap-4 mt-1">
 {['Yes', 'No'].map((opt) => (
 <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs">
 <div className="w-3 h-3 rounded-full border border-muted-foreground/50 hover:border-primary/50 transition-colors" />
 <span>{opt}</span>
 </label>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Actions */}
 <div className="relative">
 <button
 onClick={() => setShowMenu(!showMenu)}
 className="p-1.5 rounded-md hover:bg-muted transition-colors"
 >
 <MoreVertical className="h-5 w-5 text-muted-foreground" />
 </button>

 {showMenu && (
 <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg p-1 z-20 w-56 animate-scale-in">
 <button
 onClick={toggleRequired}
 className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
 >
 <span>Required</span>
 <div className={`w-8 h-5 rounded-full transition-colors ${
 question.required ? 'bg-primary' : 'bg-muted-foreground/30'
 }`}>
 <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
 question.required ? 'translate-x-3.5' : 'translate-x-0.5'
 }`} />
 </div>
 </button>
 
 <div className="h-px bg-border my-1" />
 
 <div className="px-3 py-2">
 <p className="text-xs text-muted-foreground mb-2">Convert to:</p>
 <div className="space-y-1">
 {(Object.keys(answerTypeLabels) as AnswerType[]).map((type) => (
 <button
 key={type}
 onClick={() => handleTypeChange(type)}
 className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
 question.answerType === type 
 ? 'bg-primary/10 text-primary' 
 : 'hover:bg-muted'
 }`}
 >
 {answerTypeLabels[type]}
 </button>
 ))}
 </div>
 </div>

 <div className="h-px bg-border my-1" />

 <button
 onClick={onAddSubQuestion}
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
 >
 <Plus className="h-4 w-4" />
 Add Sub-Question
 </button>

 <button
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
 >
 <ArrowRight className="h-4 w-4" />
 Move to Category
 </button>

 <div className="h-px bg-border my-1" />

 <button
 onClick={onDelete}
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 Delete Question
 </button>
 </div>
 )}
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