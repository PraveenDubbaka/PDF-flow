import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { 
 SortableContext,
 verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, MoreVertical, Plus, Trash2, GripVertical, MessageSquare } from 'lucide-react';
import { Section, Question } from '@/types/checklist';
import { SortableQuestionCard } from './SortableQuestionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SortableSectionProps {
 section: Section;
 index: number;
 onUpdate: (section: Section) => void;
 onDelete: () => void;
 isFirst: boolean;
 isLast: boolean;
 disableQuestionDnd?: boolean;
 isPreviewMode?: boolean;
 isConciseMode?: boolean;
}

export function SortableSection({
 section,
 index,
 onUpdate,
 onDelete,
 isFirst,
 isLast,
 disableQuestionDnd = false,
 isPreviewMode = false,
 isConciseMode = false
}: SortableSectionProps) {
 const [showMenu, setShowMenu] = useState(false);
 const [isEditingTitle, setIsEditingTitle] = useState(false);

 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: section.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1,
 zIndex: isDragging ? 50 : 'auto',
 };

 const toggleExpanded = () => {
 onUpdate({...section, isExpanded: !section.isExpanded });
 };

 const handleTitleChange = (title: string) => {
 onUpdate({...section, title });
 };

 const handleQuestionUpdate = (questionIndex: number, question: Question) => {
 const newQuestions = [...section.questions];
 newQuestions[questionIndex] = question;
 onUpdate({...section, questions: newQuestions });
 };

 const handleQuestionDelete = (questionIndex: number) => {
 const newQuestions = section.questions.filter((_, i) => i !== questionIndex);
 onUpdate({...section, questions: newQuestions });
 };

 const handleAddQuestion = () => {
 const newQuestion: Question = {
 id: `q-${Date.now()}`,
 text: 'New question - click to edit',
 answerType: 'yes-no',
 required: false
 };
 onUpdate({...section, questions: [...section.questions, newQuestion] });
 };

 const handleAddSubQuestion = (questionIndex: number) => {
 const question = section.questions[questionIndex];
 const newSubQuestion: Question = {
 id: `sq-${Date.now()}`,
 text: 'New sub-question',
 answerType: 'long-answer',
 required: false
 };
 const updatedQuestion = {
...question,
 subQuestions: [...(question.subQuestions || []), newSubQuestion]
 };
 handleQuestionUpdate(questionIndex, updatedQuestion);
 };

 const handleDuplicateQuestion = (questionIndex: number) => {
 const question = section.questions[questionIndex];
 const duplicatedQuestion: Question = {
...question,
 id: `q-${Date.now()}`,
 text: question.text,
 subQuestions: question.subQuestions?.map((sq, i) => ({
...sq,
 id: `sq-${Date.now()}-${i}`
 }))
 };
 const newQuestions = [...section.questions];
 newQuestions.splice(questionIndex + 1, 0, duplicatedQuestion);
 onUpdate({...section, questions: newQuestions });
 };

 const displayTitle = section.title.replace(/^\s*\d+(?:\.\d+)*\.\s*/, '').trim();

 return (
 <div 
 ref={setNodeRef}
 style={style}
 className={`mb-6 animate-slide-up w-full ${isDragging ? 'shadow-xl' : ''}`}
 >
 {/* Section Header */}
 <div className="flex items-center gap-2 mb-3 group/section">
 {/* Drag Handle for Section - Hidden in preview mode, but space preserved */}
 <div className={`flex items-center justify-center w-8 h-8 shrink-0 ${isPreviewMode ? '' : 'rounded cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-100 hover:bg-muted transition-all'}`}>
 {!isPreviewMode && (
 <div
 {...attributes}
 {...listeners}
 className="flex items-center justify-center w-full h-full"
 title="Drag to reorder section"
 >
 <GripVertical className="h-5 w-5 text-muted-foreground" />
 </div>
 )}
 </div>

 <button
 onClick={toggleExpanded}
 className="flex items-center gap-3 flex-1 bg-muted/30 rounded-lg px-4 py-3 font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
 >
 {section.isExpanded ? (
 <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
 ) : (
 <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
 )}
 
 <span className="text-muted-foreground mr-1">{index + 1}.</span>
 
 {isEditingTitle && !isPreviewMode ? (
 <Input
 value={section.title}
 onChange={(e) => handleTitleChange(e.target.value)}
 onBlur={() => setIsEditingTitle(false)}
 onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
 onClick={(e) => e.stopPropagation()}
 autoFocus
 className="max-w-md bg-card"
 />
 ) : (
 <span 
 onClick={(e) => {
 if (!isPreviewMode) {
 e.stopPropagation();
 setIsEditingTitle(true);
 }
 }}
 className={`font-semibold ${!isPreviewMode ? 'hover:underline cursor-text' : ''}`}
 >
 {displayTitle}
 </span>
 )}
 </button>

 {/* Section Note */}
 {!isPreviewMode ? (
 <Popover>
 <PopoverTrigger asChild>
 <button
 className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors shrink-0 ${
 section.note ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'
 }`}
 >
 <MessageSquare className="h-3.5 w-3.5" />
 {section.note ? 'Edit note' : 'Add note'}
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-72 p-3" align="start" side="bottom">
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
 <button className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 shrink-0 cursor-pointer">
 <MessageSquare className="h-3.5 w-3.5" />
 Read note for more info
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-72 p-3" align="start" side="bottom">
 <p className="text-sm text-foreground whitespace-pre-wrap">{section.note}</p>
 </PopoverContent>
 </Popover>
 ) : null}

 {/* Section menu - Hidden in preview mode */}
 {!isPreviewMode && (
 <div className="relative">
 <button
 onClick={() => setShowMenu(!showMenu)}
 className="p-2 rounded-md hover:bg-muted transition-colors"
 >
 <MoreVertical className="h-5 w-5 text-muted-foreground" />
 </button>

 {showMenu && (
 <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg p-1 z-20 w-48 animate-scale-in">
 <button
 onClick={() => {
 onDelete();
 setShowMenu(false);
 }}
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 Delete Section
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Questions - now using parent's DndContext for cross-section drag */}
 {section.isExpanded && (
 <div className="w-full">
 <SortableContext
 items={section.questions.map(q => q.id)}
 strategy={verticalListSortingStrategy}
 >
 {section.questions.map((question, qIndex) => (
 <SortableQuestionCard
 key={question.id}
 question={question}
 index={qIndex}
 sectionIndex={index}
 onUpdate={(q) => handleQuestionUpdate(qIndex, q)}
 onDelete={() => handleQuestionDelete(qIndex)}
 onAddSubQuestion={() => handleAddSubQuestion(qIndex)}
 onDuplicate={() => handleDuplicateQuestion(qIndex)}
 isPreviewMode={isPreviewMode}
 isConciseMode={isConciseMode}
 />
 ))}
 </SortableContext>

 {/* Add Question button - Hidden in preview mode */}
 {!isPreviewMode && (
 <Button
 variant="outline"
 onClick={handleAddQuestion}
 className="w-full mt-2 border-dashed text-muted-foreground hover:text-white hover:border-[#1C63A6] hover:bg-[#1C63A6] transition-colors"
 >
 <Plus className="h-4 w-4 mr-2" />
 Add Question
 </Button>
 )}
 </div>
 )}
 </div>
 );
}
