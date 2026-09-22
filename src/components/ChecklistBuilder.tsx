import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
 DndContext, 
 closestCenter, 
 KeyboardSensor, 
 PointerSensor, 
 useSensor, 
 useSensors,
 DragEndEvent,
 DragOverEvent,
 DragStartEvent,
 DragOverlay,
 pointerWithin,
 rectIntersection,
 getFirstCollision
} from '@dnd-kit/core';
import {
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 arrayMove,
} from '@dnd-kit/sortable';
import { 
 Plus, 
 Download, 
 Share2, 
 Eye, 
 FileText,
 Columns,
 ChevronDown,
 ChevronRight,
 FileDown,
 Save,
 Pencil,
 Trash2,
 Copy,
 Check
} from 'lucide-react';
import { Checklist, Section, Question } from '@/types/checklist';
import { SortableSection } from './SortableSection';
import { FloatingActionBar } from './FloatingActionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { RichTextToolbar } from './RichTextToolbar';
import { useRichTextToolbarContext } from '@/contexts/RichTextToolbarContext';
import { consolidateSectionsToThree } from '@/lib/consolidateSections';


import { DocumentView } from './DocumentView';
import { AddToMyTemplatesDialog } from './AddToMyTemplatesDialog';

interface ChecklistBuilderProps {
 checklist: Checklist;
 onUpdate: (checklist: Checklist) => void;
 onSave?: () => void;
 initialPreviewMode?: boolean;
 isGlobalTemplate?: boolean;
 isSavedTemplate?: boolean;
}

export function ChecklistBuilder({ checklist, onUpdate, onSave, initialPreviewMode = false, isGlobalTemplate = false, isSavedTemplate = false }: ChecklistBuilderProps) {
 const [isEditingTitle, setIsEditingTitle] = useState(false);
 const [showAddMenu, setShowAddMenu] = useState(false);
 const [pendingAddType, setPendingAddType] = useState<'empty' | 'template' | 'form' | null>(null);
 const [showExportMenu, setShowExportMenu] = useState(false);
 const [objectiveExpanded, setObjectiveExpanded] = useState(false);
 const [isEditingObjective, setIsEditingObjective] = useState(false);
 const [objectiveDraft, setObjectiveDraft] = useState(checklist.objective || '');
 const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
 const [isPreviewMode, setIsPreviewMode] = useState(initialPreviewMode && !isSavedTemplate);
 const [isCompactMode, setIsCompactMode] = useState(false);
 const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
 const [showAddToMyTemplatesDialog, setShowAddToMyTemplatesDialog] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false); // For saved templates edit mode
 const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
 const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
 const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isFirstRender = useRef(true);
 
 const objectiveTextareaRef = useRef<HTMLTextAreaElement>(null);
 const { toolbarState, showToolbar, hideToolbar, handleFormatAction, toolbarRef } = useRichTextToolbarContext();

 // Auto-save effect: debounce save when checklist changes in edit mode
 const isInEditMode = isSavedTemplate ? isEditMode : !isPreviewMode;
 useEffect(() => {
 if (isFirstRender.current) {
 isFirstRender.current = false;
 return;
 }
 if (!autoSaveEnabled || !isInEditMode || !onSave) return;

 if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

 autoSaveTimerRef.current = setTimeout(() => {
 onSave();
 setLastAutoSaveTime(new Date());
 }, 1500);

 return () => {
 if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
 };
 }, [checklist, autoSaveEnabled, isInEditMode, onSave]);


 const sensors = useSensors(
 useSensor(PointerSensor, {
 activationConstraint: {
 distance: 8,
 },
 }),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

 const handleTitleChange = (title: string) => {
 onUpdate({...checklist, title });
 };

 const handleSectionUpdate = (index: number, section: Section) => {
 const newSections = [...checklist.sections];
 newSections[index] = section;
 onUpdate({...checklist, sections: newSections });
 };

 const handleSectionDelete = (index: number) => {
 const newSections = checklist.sections.filter((_, i) => i !== index);
 onUpdate({...checklist, sections: newSections });
 };

 const handleConsolidateCategories = () => {
 const nextSections = consolidateSectionsToThree(checklist.sections);
 onUpdate({...checklist, sections: nextSections });
 toast.success('Categories consolidated');
 };

 // Get all question IDs for the sortable context
 const allQuestionIds = checklist.sections.flatMap(s => s.questions.map(q => q.id));

 // Check if all sections are collapsed
 const allSectionsCollapsed = useMemo(() => {
 return checklist.sections.every(s => !s.isExpanded);
 }, [checklist.sections]);

 // Check if all questions are collapsed
 const allQuestionsCollapsed = useMemo(() => {
 return checklist.sections.every(s => 
 s.questions.every(q => q.isExpanded === false)
 );
 }, [checklist.sections]);

 const handleCollapseSections = () => {
 const newSections = checklist.sections.map(s => ({...s, isExpanded: false }));
 onUpdate({...checklist, sections: newSections });
 };

 const handleExpandSections = () => {
 const newSections = checklist.sections.map(s => ({...s, isExpanded: true }));
 onUpdate({...checklist, sections: newSections });
 };

 const handleCollapseQuestions = () => {
 const newSections = checklist.sections.map(s => ({
...s,
 questions: s.questions.map(q => ({...q, isExpanded: false }))
 }));
 onUpdate({...checklist, sections: newSections });
 };

 const handleExpandQuestions = () => {
 const newSections = checklist.sections.map(s => ({
...s,
 questions: s.questions.map(q => ({...q, isExpanded: true }))
 }));
 onUpdate({...checklist, sections: newSections });
 };

 const handleBulkDelete = () => {
 if (selectedQuestions.size === 0) return;
 
 const newSections = checklist.sections.map(section => ({
...section,
 questions: section.questions.filter(q => !selectedQuestions.has(q.id))
 })).filter(section => section.questions.length > 0 || checklist.sections.length === 1);
 
 onUpdate({...checklist, sections: newSections });
 setSelectedQuestions(new Set());
 onUpdate({...checklist, sections: newSections });
 };

 // Find which section a question belongs to
 const findSectionByQuestionId = (questionId: string): { sectionIndex: number; questionIndex: number } | null => {
 for (let sIndex = 0; sIndex < checklist.sections.length; sIndex++) {
 const qIndex = checklist.sections[sIndex].questions.findIndex(q => q.id === questionId);
 if (qIndex !== -1) {
 return { sectionIndex: sIndex, questionIndex: qIndex };
 }
 }
 return null;
 };

 const handleDragStart = (event: DragStartEvent) => {
 const { active } = event;
 // Check if dragging a question (not a section)
 const location = findSectionByQuestionId(active.id as string);
 if (location) {
 setActiveQuestion(checklist.sections[location.sectionIndex].questions[location.questionIndex]);
 }
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 setActiveQuestion(null);
 
 if (!over) return;

 // Check if this is a section drag
 const isSectionDrag = checklist.sections.some(s => s.id === active.id);
 
 if (isSectionDrag) {
 // Handle section reordering
 if (active.id !== over.id) {
 const oldIndex = checklist.sections.findIndex(s => s.id === active.id);
 const newIndex = checklist.sections.findIndex(s => s.id === over.id);
 
 if (oldIndex !== -1 && newIndex !== -1) {
 const newSections = arrayMove(checklist.sections, oldIndex, newIndex);
 onUpdate({...checklist, sections: newSections });
 }
 }
 return;
 }

 // Handle question drag
 const activeLocation = findSectionByQuestionId(active.id as string);
 if (!activeLocation) return;

 // Check if dropping onto a section
 const targetSectionIndex = checklist.sections.findIndex(s => s.id === over.id);
 
 if (targetSectionIndex !== -1) {
 // Dropping onto a section - add to end of that section
 if (targetSectionIndex !== activeLocation.sectionIndex) {
 const newSections = [...checklist.sections];
 const [movedQuestion] = newSections[activeLocation.sectionIndex].questions.splice(activeLocation.questionIndex, 1);
 newSections[targetSectionIndex].questions.push(movedQuestion);
 onUpdate({...checklist, sections: newSections });
 }
 return;
 }

 // Check if dropping onto another question
 const overLocation = findSectionByQuestionId(over.id as string);
 if (!overLocation) return;

 if (activeLocation.sectionIndex === overLocation.sectionIndex) {
 // Same section - just reorder
 if (activeLocation.questionIndex !== overLocation.questionIndex) {
 const newSections = [...checklist.sections];
 newSections[activeLocation.sectionIndex] = {
...newSections[activeLocation.sectionIndex],
 questions: arrayMove(
 newSections[activeLocation.sectionIndex].questions,
 activeLocation.questionIndex,
 overLocation.questionIndex
 )
 };
 onUpdate({...checklist, sections: newSections });
 }
 } else {
 // Different section - move question
 const newSections = [...checklist.sections];
 const [movedQuestion] = newSections[activeLocation.sectionIndex].questions.splice(activeLocation.questionIndex, 1);
 newSections[overLocation.sectionIndex].questions.splice(overLocation.questionIndex, 0, movedQuestion);
 onUpdate({...checklist, sections: newSections });
 }
 };

 const handleSelectAddType = (type: 'empty' | 'template' | 'form') => {
 setPendingAddType(type);
 };

 const handleAddAtPosition = (position: 'top' | 'bottom') => {
 if (!pendingAddType) return;

 let newSection: Section;

 if (pendingAddType === 'empty') {
 newSection = {
 id: `section-${Date.now()}`,
 title: 'New Section',
 questions: [],
 isExpanded: true
 };
 } else if (pendingAddType === 'template') {
 newSection = {
 id: `section-${Date.now()}`,
 title: 'Template Section',
 questions: [
 {
 id: `q-${Date.now()}-1`,
 text: 'Has the engagement letter been signed by both parties?',
 answerType: 'yes-no',
 required: true
 },
 {
 id: `q-${Date.now()}-2`,
 text: 'Describe the scope of services agreed upon.',
 answerType: 'long-answer',
 required: false
 }
 ],
 isExpanded: true
 };
 } else {
 // Form column
 newSection = {
 id: `section-${Date.now()}`,
 title: 'Form Section',
 questions: [],
 isExpanded: true,
 formLayout: {
 columns: 1,
 elements: [{
 id: `col-${Date.now()}-0`,
 type: 'empty'
 }]
 }
 };
 }

 if (position === 'top') {
 onUpdate({...checklist, sections: [newSection,...checklist.sections] });
 } else {
 onUpdate({...checklist, sections: [...checklist.sections, newSection] });
 }

 setShowAddMenu(false);
 setPendingAddType(null);
 };

 const handleCancelAdd = () => {
 setPendingAddType(null);
 };

 const handleAddCategoryAtPosition = (position: 'top' | 'bottom', type: 'empty' | 'template' | 'form' | 'inquires-form') => {
 let newSection: Section;

 if (type === 'empty') {
 newSection = {
 id: `section-${Date.now()}`,
 title: 'New Section',
 questions: [],
 isExpanded: true
 };
 } else if (type === 'template') {
 newSection = {
 id: `section-${Date.now()}`,
 title: 'Template Section',
 questions: [
 {
 id: `q-${Date.now()}-1`,
 text: 'Has the engagement letter been signed by both parties?',
 answerType: 'yes-no',
 required: true
 },
 {
 id: `q-${Date.now()}-2`,
 text: 'Describe the scope of services agreed upon.',
 answerType: 'long-answer',
 required: false
 }
 ],
 isExpanded: true
 };
 } else if (type === 'inquires-form') {
 // Inquires Form with 3 rows of Name, Position, Date fields
 const timestamp = Date.now();
 newSection = {
 id: `section-${timestamp}`,
 title: 'Inquiries made of management:',
 questions: [],
 isExpanded: true,
 formLayout: {
 columns: 3,
 elements: [
 // Row 1
 { id: `col-${timestamp}-0`, type: 'text-input', label: 'Name', placeholder: '' },
 { id: `col-${timestamp}-1`, type: 'text-input', label: 'Position', placeholder: '' },
 { id: `col-${timestamp}-2`, type: 'date', label: 'Date' },
 // Row 2
 { id: `col-${timestamp}-3`, type: 'text-input', label: 'Name', placeholder: '' },
 { id: `col-${timestamp}-4`, type: 'text-input', label: 'Position', placeholder: '' },
 { id: `col-${timestamp}-5`, type: 'date', label: 'Date' },
 // Row 3
 { id: `col-${timestamp}-6`, type: 'text-input', label: 'Name', placeholder: '' },
 { id: `col-${timestamp}-7`, type: 'text-input', label: 'Position', placeholder: '' },
 { id: `col-${timestamp}-8`, type: 'date', label: 'Date' },
 ]
 }
 };
 } else {
 // Empty form
 newSection = {
 id: `section-${Date.now()}`,
 title: 'Form Section',
 questions: [],
 isExpanded: true,
 formLayout: {
 columns: 1,
 elements: [{
 id: `col-${Date.now()}-0`,
 type: 'empty'
 }]
 }
 };
 }

 if (position === 'top') {
 onUpdate({...checklist, sections: [newSection,...checklist.sections] });
 } else {
 onUpdate({...checklist, sections: [...checklist.sections, newSection] });
 }
 };

 return (
 <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
 {/* Top Toolbar */}
 <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
 <div className="flex items-center gap-4">
 {isPreviewMode ? (
 <h1 className="text-lg font-semibold px-2 py-1">
 {checklist.title}
 </h1>
 ) : isEditingTitle ? (
 <Input
 value={checklist.title}
 onChange={(e) => handleTitleChange(e.target.value)}
 onBlur={() => setIsEditingTitle(false)}
 onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
 autoFocus
 className="text-lg font-semibold max-w-md"
 />
 ) : (
 <h1 
 className="text-lg font-semibold cursor-text hover:bg-muted px-2 py-1 -mx-2 rounded transition-colors"
 onClick={() => setIsEditingTitle(true)}
 >
 {checklist.title}
 </h1>
 )}
 </div>
 
 <div className="flex items-center gap-2">
 
 {/* For saved templates: Show edit mode buttons or preview mode buttons */}
 {isSavedTemplate ? (
 isEditMode ? (
 /* Edit mode buttons: Duplicate, Delete, Cancel, Save */
 <TooltipProvider>
 {/* Auto-save toggle & status */}
 <div className="flex flex-col mr-2">
 <label className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer select-none">
 <Checkbox
 checked={autoSaveEnabled}
 onCheckedChange={(checked) => setAutoSaveEnabled(checked === true)}
 className="h-4 w-4"
 />
 Auto Save
 </label>
 {autoSaveEnabled && lastAutoSaveTime && (
 <span className="text-xs text-muted-foreground ml-6">
 Last saved {lastAutoSaveTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {lastAutoSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 </span>
 )}
 </div>
 <AlertDialog>
 <Tooltip>
 <TooltipTrigger asChild>
 <AlertDialogTrigger asChild>
 <Button 
 variant="outline" 
 size="icon" 
 className="h-9 w-9 hover:bg-[#1C63A6] hover:text-white hover:border-[#1C63A6] transition-colors"
 >
 <Copy className="h-4 w-4" />
 </Button>
 </AlertDialogTrigger>
 </TooltipTrigger>
 <TooltipContent>Duplicate</TooltipContent>
 </Tooltip>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Duplicate Checklist</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to duplicate this checklist? A copy will be created with all current content.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction onClick={() => toast.success('Checklist duplicated')}>
 Duplicate
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 
 <AlertDialog>
 <Tooltip>
 <TooltipTrigger asChild>
 <AlertDialogTrigger asChild>
 <Button 
 variant="outline" 
 size="icon" 
 className="h-9 w-9 bg-destructive text-white border-destructive hover:bg-destructive/90 transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </AlertDialogTrigger>
 </TooltipTrigger>
 <TooltipContent>Delete</TooltipContent>
 </Tooltip>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to delete this checklist? This action cannot be undone.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction 
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 onClick={() => toast.success('Checklist deleted')}
 >
 Delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 

 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 variant="outline" 
 size="sm"
 className="h-9 gap-2"
 onClick={() => {
 setIsEditMode(false);
 setSelectedQuestions(new Set());
 setIsPreviewMode(true);
 }}
 >
 Cancel
 </Button>
 </TooltipTrigger>
 <TooltipContent>Cancel editing</TooltipContent>
 </Tooltip>
 
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 size="sm"
 className="h-9 gap-2"
 onClick={() => {
 onSave?.();
 setIsEditMode(false);
 setSelectedQuestions(new Set());
 setIsPreviewMode(true);
 }}
 >
 <Save className="h-4 w-4" />
 Save
 </Button>
 </TooltipTrigger>
 <TooltipContent>Save changes</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 ) : (
 /* Preview mode button: Edit */
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 size="sm"
 className="h-9 gap-2"
 onClick={() => {
 setIsEditMode(true);
 setIsPreviewMode(false);
 }}
 >
 <Pencil className="h-4 w-4" />
 Edit
 </Button>
 </TooltipTrigger>
 <TooltipContent>Edit template</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )
 ) : (
 /* Original logic for non-saved templates */
 <>
 {!isPreviewMode ? (
 <TooltipProvider>
 {/* Auto-save toggle & status */}
 <div className="flex flex-col mr-2">
 <label className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer select-none">
 <Checkbox
 checked={autoSaveEnabled}
 onCheckedChange={(checked) => setAutoSaveEnabled(checked === true)}
 className="h-4 w-4"
 />
 Auto Save
 </label>
 {autoSaveEnabled && lastAutoSaveTime && (
 <span className="text-xs text-muted-foreground ml-6">
 Last saved {lastAutoSaveTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {lastAutoSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 </span>
 )}
 </div>

 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 size="icon" 
 className="h-9 w-9"
 onClick={() => {
 onSave?.();
 setSelectedQuestions(new Set());
 setIsPreviewMode(true);
 }}
 >
 <Save className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Save</TooltipContent>
 </Tooltip>
 
 <AlertDialog>
 <Tooltip>
 <TooltipTrigger asChild>
 <AlertDialogTrigger asChild>
 <Button 
 variant="outline" 
 size="icon" 
 className="h-9 w-9 hover:bg-[#1C63A6] hover:text-white hover:border-[#1C63A6] transition-colors"
 >
 <Copy className="h-4 w-4" />
 </Button>
 </AlertDialogTrigger>
 </TooltipTrigger>
 <TooltipContent>Duplicate</TooltipContent>
 </Tooltip>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Duplicate Checklist</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to duplicate this checklist? A copy will be created with all current content.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction onClick={() => toast.success('Checklist duplicated')}>
 Duplicate
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 
 <AlertDialog>
 <Tooltip>
 <TooltipTrigger asChild>
 <AlertDialogTrigger asChild>
 <Button 
 variant="outline" 
 size="icon" 
 className="h-9 w-9 bg-destructive text-white border-destructive hover:bg-destructive/90 transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </AlertDialogTrigger>
 </TooltipTrigger>
 <TooltipContent>Delete</TooltipContent>
 </Tooltip>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to delete this checklist? This action cannot be undone.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction 
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 onClick={() => toast.success('Checklist deleted')}
 >
 Delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </TooltipProvider>
 ) : (
 <TooltipProvider>
 {isGlobalTemplate ? (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 variant="default"
 size="icon"
 className="h-9 w-9"
 onClick={() => setShowAddToMyTemplatesDialog(true)}
 >
 <Plus className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Add to My Templates</TooltipContent>
 </Tooltip>
 ) : (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 variant="outline" 
 size="icon"
 className="h-9 w-9 hover:bg-[#1C63A6] hover:text-white hover:border-[#1C63A6] transition-colors"
 onClick={() => setIsPreviewMode(false)}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Edit</TooltipContent>
 </Tooltip>
 )}
 </TooltipProvider>
 )}
 </>
 )}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white border-t border-border">
 <div className="w-full">
 {/* Document View for both edit and preview mode */}
 <DocumentView
 objectiveExpanded={objectiveExpanded}
 onToggleObjective={() => setObjectiveExpanded(prev => !prev)}
 checklist={checklist}
 onUpdate={onUpdate}
 isPreviewMode={isPreviewMode}
 isCompactMode={isCompactMode}
 selectedQuestions={isPreviewMode ? new Set<string>() : selectedQuestions}
 onSelectionChange={isPreviewMode ? undefined : setSelectedQuestions}
 isGlobalTemplate={isGlobalTemplate}
 />

 </div>
 </div>

 {/* Floating Action Bar - visible in preview mode for collapse/expand/reorder, hidden for global templates */}
 {!isGlobalTemplate && <FloatingActionBar
 checklist={checklist}
 onUpdate={onUpdate}
 onCollapseSections={handleCollapseSections}
 onExpandSections={handleExpandSections}
 onCollapseQuestions={handleCollapseQuestions}
 onExpandQuestions={handleExpandQuestions}
 allSectionsCollapsed={allSectionsCollapsed}
 allQuestionsCollapsed={allQuestionsCollapsed}
 isCompactMode={isCompactMode}
 onToggleCompactMode={() => setIsCompactMode(!isCompactMode)}
 selectedQuestions={selectedQuestions}
 onBulkDelete={handleBulkDelete}
 onAddCategory={handleAddCategoryAtPosition}
 isPreviewMode={isPreviewMode}
 />}


 {/* Rich Text Toolbar - Hidden in preview mode */}
 {!isPreviewMode && toolbarState.isVisible && (
 <RichTextToolbar
 position={toolbarState.position}
 onFormatAction={handleFormatAction}
 onAIAssist={() => {
 toast.info('AI assist coming soon!');
 }}
 toolbarRef={toolbarRef}
 />
 )}

 {/* Add to My Templates Dialog (for Global Templates) */}
 <AddToMyTemplatesDialog
 open={showAddToMyTemplatesDialog}
 onOpenChange={setShowAddToMyTemplatesDialog}
 checklist={checklist}
 checklistName={checklist.title}
 />
 </div>
 );
}

