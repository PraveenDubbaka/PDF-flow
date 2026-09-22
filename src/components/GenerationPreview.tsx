import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
 Check, 
 Sparkles, 
 ChevronDown, 
 ChevronRight,
 Folder,
 FolderPlus,
 Plus,
 X,
 RefreshCw,
 Pencil,
 Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter
} from '@/components/ui/dialog';

interface GeneratedQuestion {
 id: string;
 text: string;
 sectionTitle: string;
}

interface FolderItem {
 id: string;
 name: string;
 children?: FolderItem[];
 isExpanded?: boolean;
}

interface GenerationPreviewProps {
 prompt: string;
 detailLevel: 'standard' | 'detailed';
 onAccept: (folderId: string, folderName: string, checklistName: string) => void;
 onRegenerate: (newPrompt?: string) => void;
 onCancel: () => void;
}

const initialFolders: FolderItem[] = [
 { id: '1', name: 'Before Release V22Comp', children: [] },
 { id: '2', name: 'Before Release V22 Revi...', children: [] },
 { id: '3', name: 'Carissa_13208', children: [] },
 { id: '4', name: 'carisa 37.3', children: [] },
 { id: '5', name: 'Compilation Checklists', children: [] },
 { id: '6', name: 'release 38 before', children: [] },
 { id: '7', name: 'Review Checklists', children: [] },
 { id: '8', name: 'Tax Release', children: [] },
];

// Mock questions that will be "generated" progressively
const mockGeneratedQuestions: GeneratedQuestion[] = [
 {
 id: 'q1',
 sectionTitle: 'Quality Management & Risk Assessment',
 text: "Determine whether accepting this engagement would contravene any of the firm's quality management policies."
 },
 {
 id: 'q2',
 sectionTitle: 'Quality Management & Risk Assessment',
 text: "For new clients, indicate who in the firm has knowledge about the prospective client and whether they recommend acceptance."
 },
 {
 id: 'q3',
 sectionTitle: 'Quality Management & Risk Assessment',
 text: "Contact the predecessor practitioner to inquire about any reasons the engagement should not be accepted."
 },
 {
 id: 'q4',
 sectionTitle: 'Financial Information & Basis of Accounting',
 text: "Inquire of management about the intended use of the financial information."
 },
 {
 id: 'q5',
 sectionTitle: 'Financial Information & Basis of Accounting',
 text: "Determine whether the financial information is intended to be used by a third party."
 },
 {
 id: 'q6',
 sectionTitle: 'Financial Information & Basis of Accounting',
 text: "Discuss the expected basis of accounting with management and obtain acknowledgement that it is appropriate."
 },
 {
 id: 'q7',
 sectionTitle: 'Third-Party Use & Quality Review',
 text: "If the FI is intended for third-party use, inquire about the third party's ability to request additional information."
 },
 {
 id: 'q8',
 sectionTitle: 'Third-Party Use & Quality Review',
 text: "Determine whether the third party agrees with the basis of accounting."
 },
 {
 id: 'q9',
 sectionTitle: 'Third-Party Use & Quality Review',
 text: "Are there any circumstances requiring this engagement to be subject to an engagement quality review?"
 },
 {
 id: 'q10',
 sectionTitle: 'Independence & Ethics',
 text: "Confirm that all engagement team members have completed independence confirmations."
 },
 {
 id: 'q11',
 sectionTitle: 'Independence & Ethics',
 text: "Document any threats to independence and safeguards applied."
 },
 {
 id: 'q12',
 sectionTitle: 'Independence & Ethics',
 text: "Ensure compliance with firm and professional ethical requirements."
 }
];

export function GenerationPreview({
 prompt,
 detailLevel,
 onAccept,
 onRegenerate,
 onCancel
}: GenerationPreviewProps) {
 const [displayedQuestions, setDisplayedQuestions] = useState<GeneratedQuestion[]>([]);
 const [isGenerating, setIsGenerating] = useState(true);
 const [showFolderDialog, setShowFolderDialog] = useState(false);
 const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
 const [selectedFolderId, setSelectedFolderId] = useState<string>('');
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');
 const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
 const [checklistName, setChecklistName] = useState('');
 const [editablePrompt, setEditablePrompt] = useState(prompt);
 const [isEditingPrompt, setIsEditingPrompt] = useState(false);

 // Sync editable prompt with prop
 useEffect(() => {
 setEditablePrompt(prompt);
 }, [prompt]);
 // Progressive question generation effect
 useEffect(() => {
 setDisplayedQuestions([]);
 setIsGenerating(true);
 setExpandedSections(new Set());

 let questionIndex = 0;
 const interval = setInterval(() => {
 if (questionIndex < mockGeneratedQuestions.length) {
 const question = mockGeneratedQuestions[questionIndex];
 setDisplayedQuestions(prev => [...prev, question]);
 setExpandedSections(prev => new Set(prev).add(question.sectionTitle));
 questionIndex++;
 } else {
 setIsGenerating(false);
 clearInterval(interval);
 }
 }, 400); // Add a new question every 400ms for the GPT-like effect

 return () => clearInterval(interval);
 }, [prompt, detailLevel]);

 // Group questions by section
 const groupedQuestions = displayedQuestions.reduce((acc, q) => {
 if (!acc[q.sectionTitle]) {
 acc[q.sectionTitle] = [];
 }
 acc[q.sectionTitle].push(q);
 return acc;
 }, {} as Record<string, GeneratedQuestion[]>);

 const toggleSection = (sectionTitle: string) => {
 setExpandedSections(prev => {
 const newSet = new Set(prev);
 if (newSet.has(sectionTitle)) {
 newSet.delete(sectionTitle);
 } else {
 newSet.add(sectionTitle);
 }
 return newSet;
 });
 };

 const handleAcceptClick = () => {
 // Auto-generate a name based on prompt
 const autoName = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
 setChecklistName(autoName);
 setShowFolderDialog(true);
 };

 const handleCreateFolder = () => {
 if (newFolderName.trim()) {
 const newFolder: FolderItem = {
 id: `new-${Date.now()}`,
 name: newFolderName.trim(),
 children: []
 };
 setFolders(prev => [...prev, newFolder]);
 setSelectedFolderId(newFolder.id);
 setNewFolderName('');
 setIsCreatingFolder(false);
 }
 };

 const handleConfirmSave = () => {
 const selectedFolder = folders.find(f => f.id === selectedFolderId);
 if (selectedFolder && checklistName.trim()) {
 onAccept(selectedFolderId, selectedFolder.name, checklistName.trim());
 setShowFolderDialog(false);
 }
 };

 const selectedFolderName = folders.find(f => f.id === selectedFolderId)?.name;

 return (
 <div className="space-y-6">
 {/* Header with generation status */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-10 h-10 rounded-lg flex items-center justify-center",
 isGenerating 
 ? "bg-gradient-to-r from-[#3379C9] to-[#8A5BD9] animate-pulse" 
 : "bg-primary"
 )}>
 <Sparkles className="h-5 w-5 text-white" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-foreground">
 {isGenerating ? 'Generating Questions...' : 'Questions Generated'}
 </h2>
 <p className="text-sm text-muted-foreground">
 {isGenerating 
 ? `${displayedQuestions.length} questions generated so far`
 : `${displayedQuestions.length} questions ready for review`
 }
 </p>
 </div>
 </div>
 
 {!isGenerating && (
 <Button
 variant="outline"
 onClick={() => onRegenerate()}
 className="gap-2"
 >
 <RefreshCw className="h-4 w-4" />
 Regenerate
 </Button>
 )}
 </div>

 {/* Editable Prompt */}
 <div className="bg-muted/50 rounded-lg p-4 border border-border">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-muted-foreground">Your prompt:</p>
 {!isEditingPrompt && !isGenerating && (
 <button
 onClick={() => setIsEditingPrompt(true)}
 className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
 >
 <Pencil className="h-3 w-3" />
 Edit
 </button>
 )}
 </div>
 
 {isEditingPrompt ? (
 <div className="space-y-3">
 <Textarea
 value={editablePrompt}
 onChange={(e) => setEditablePrompt(e.target.value)}
 className="w-full min-h-[80px] text-sm bg-white border-border rounded-lg resize-none"
 placeholder="Refine your prompt..."
 autoFocus
 />
 <div className="flex items-center gap-2 justify-end">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setEditablePrompt(prompt);
 setIsEditingPrompt(false);
 }}
 >
 Cancel
 </Button>
 <Button
 size="sm"
 onClick={() => {
 setIsEditingPrompt(false);
 if (editablePrompt.trim() !== prompt.trim()) {
 onRegenerate(editablePrompt.trim());
 }
 }}
 disabled={!editablePrompt.trim()}
 className="gap-1.5 bg-gradient-to-r from-[#3379C9] to-[#8A5BD9] hover:opacity-90 text-white"
 >
 <RefreshCw className="h-3.5 w-3.5" />
 Regenerate
 </Button>
 </div>
 </div>
 ) : (
 <p className="text-sm font-medium text-foreground">{prompt}</p>
 )}
 </div>

 {/* Progressive question display */}
 <div className="bg-white rounded-xl border border-border overflow-hidden">
 <div className="max-h-[400px] overflow-y-auto">
 {Object.entries(groupedQuestions).map(([sectionTitle, questions], sectionIndex) => (
 <div 
 key={sectionTitle}
 className={cn(
 "border-b border-border last:border-b-0",
 "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
 )}
 style={{ animationDelay: `${sectionIndex * 100}ms` }}
 >
 {/* Section Header */}
 <button
 onClick={() => toggleSection(sectionTitle)}
 className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
 >
 {expandedSections.has(sectionTitle) ? (
 <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 ) : (
 <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 )}
 <span className="font-medium text-foreground">{sectionTitle}</span>
 <span className="text-xs text-muted-foreground ml-auto">
 {questions.length} question{questions.length !== 1 ? 's' : ''}
 </span>
 </button>

 {/* Questions */}
 {expandedSections.has(sectionTitle) && (
 <div className="divide-y divide-border/50">
 {questions.map((question, qIndex) => (
 <div
 key={question.id}
 className={cn(
 "px-4 py-3 pl-11",
 "animate-in fade-in-0 slide-in-from-left-2 duration-200"
 )}
 style={{ animationDelay: `${qIndex * 50}ms` }}
 >
 <div className="flex items-start gap-3">
 <span className="text-xs font-medium text-muted-foreground mt-0.5 w-6 flex-shrink-0">
 {qIndex + 1}.
 </span>
 <p className="text-sm text-foreground leading-relaxed">
 {question.text}
 </p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Loading indicator for more questions */}
 {isGenerating && (
 <div className="px-4 py-3 bg-muted/20 border-t border-border">
 <div className="flex items-center gap-2">
 <div className="flex gap-1">
 <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
 <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
 <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
 </div>
 <span className="text-sm text-muted-foreground">AI is generating more questions...</span>
 </div>
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-between pt-4 border-t border-border">
 <Button
 variant="outline"
 onClick={onCancel}
 >
 Cancel
 </Button>
 
 <Button
 onClick={handleAcceptClick}
 disabled={isGenerating || displayedQuestions.length === 0}
 className="gap-2 bg-gradient-to-r from-[#3379C9] to-[#8A5BD9] hover:opacity-90 text-white"
 >
 <Check className="h-4 w-4" />
 Accept & Save
 </Button>
 </div>

 {/* Folder Selection Dialog */}
 <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle className="text-lg font-semibold">Save to Folder</DialogTitle>
 </DialogHeader>
 
 <div className="py-4 space-y-4">
 {/* Checklist Name Input */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-foreground">Checklist Name</label>
 <Input
 value={checklistName}
 onChange={(e) => setChecklistName(e.target.value)}
 placeholder="Enter checklist name"
 className="w-full"
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium text-foreground">Save to Folder</label>
 <div className="border rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto bg-background">
 {folders.map((folder) => (
 <div
 key={folder.id}
 className={cn(
 "flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors",
 selectedFolderId === folder.id 
 ? "bg-primary/10 text-primary" 
 : "hover:bg-muted"
 )}
 onClick={() => setSelectedFolderId(folder.id)}
 >
 <Folder className={cn(
 "h-4 w-4",
 selectedFolderId === folder.id ? "text-primary" : "text-muted-foreground"
 )} />
 <span className="text-sm truncate flex-1">{folder.name}</span>
 {selectedFolderId === folder.id && (
 <Check className="h-4 w-4 text-primary" />
 )}
 </div>
 ))}

 {/* Create New Folder */}
 {isCreatingFolder ? (
 <div className="flex items-center gap-2 py-2 px-2">
 <FolderPlus className="h-4 w-4 text-primary" />
 <Input
 autoFocus
 placeholder="New folder name"
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleCreateFolder();
 if (e.key === 'Escape') {
 setIsCreatingFolder(false);
 setNewFolderName('');
 }
 }}
 className="h-7 text-sm flex-1"
 />
 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCreateFolder}>
 <Plus className="h-4 w-4" />
 </Button>
 <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
 setIsCreatingFolder(false);
 setNewFolderName('');
 }}>
 <X className="h-4 w-4" />
 </Button>
 </div>
 ) : (
 <button
 onClick={() => setIsCreatingFolder(true)}
 className="flex items-center gap-2 py-2 px-2 rounded-md text-sm text-primary hover:bg-primary/10 transition-colors w-full"
 >
 <FolderPlus className="h-4 w-4" />
 Create New Folder
 </button>
 )}
 </div>
 </div>
 </div>

 <DialogFooter className="flex gap-2">
 <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button 
 onClick={handleConfirmSave}
 disabled={!selectedFolderId || !checklistName.trim()}
 >
 <Save className="h-4 w-4" />
 Save
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
