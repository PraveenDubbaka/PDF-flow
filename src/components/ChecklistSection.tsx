import { useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { Section, Question } from '@/types/checklist';
import { QuestionCard } from './QuestionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChecklistSectionProps {
 section: Section;
 index: number;
 onUpdate: (section: Section) => void;
 onDelete: () => void;
 onMove: (direction: 'up' | 'down') => void;
 isFirst: boolean;
 isLast: boolean;
}

export function ChecklistSection({
 section,
 index,
 onUpdate,
 onDelete,
 onMove,
 isFirst,
 isLast
}: ChecklistSectionProps) {
 const [showMenu, setShowMenu] = useState(false);
 const [isEditingTitle, setIsEditingTitle] = useState(false);

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

 const handleQuestionMove = (questionIndex: number, direction: 'up' | 'down') => {
 const newQuestions = [...section.questions];
 const targetIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
 [newQuestions[questionIndex], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[questionIndex]];
 onUpdate({...section, questions: newQuestions });
 };

 const displayTitle = section.title.replace(/^\s*\d+(?:\.\d+)*\.\s*/, '').trim();

 return (
 <div
 id={`checklist-section-${section.id}`}
 data-section-id={section.id}
 className="mb-6 animate-slide-up scroll-mt-40"
 style={{ animationDelay: `${index * 100}ms` }}
 >
 {/* Section Header */}
 <div className="flex items-center gap-2 mb-3">
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
 
 {isEditingTitle ? (
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
 e.stopPropagation();
 setIsEditingTitle(true);
 }}
 className="hover:underline cursor-text font-semibold"
 >
 {displayTitle}
 </span>
 )}
 </button>

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
 onMove('up');
 setShowMenu(false);
 }}
 disabled={isFirst}
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50"
 >
 <ChevronUp className="h-4 w-4" />
 Move Up
 </button>
 <button
 onClick={() => {
 onMove('down');
 setShowMenu(false);
 }}
 disabled={isLast}
 className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50"
 >
 <ChevronDown className="h-4 w-4" />
 Move Down
 </button>
 <div className="h-px bg-border my-1" />
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
 </div>

 {/* Questions */}
 {section.isExpanded && (
 <div className="ml-4">
 {section.questions.map((question, qIndex) => (
 <QuestionCard
 key={question.id}
 question={question}
 index={qIndex}
 sectionIndex={index}
 onUpdate={(q) => handleQuestionUpdate(qIndex, q)}
 onDelete={() => handleQuestionDelete(qIndex)}
 onAddSubQuestion={() => handleAddSubQuestion(qIndex)}
 onMoveUp={() => handleQuestionMove(qIndex, 'up')}
 onMoveDown={() => handleQuestionMove(qIndex, 'down')}
 isFirst={qIndex === 0}
 isLast={qIndex === section.questions.length - 1}
 />
 ))}

 <Button
 variant="outline"
 onClick={handleAddQuestion}
 className="w-full mt-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
 >
 <Plus className="h-4 w-4 mr-2" />
 Add Question
 </Button>
 </div>
 )}
 </div>
 );
}