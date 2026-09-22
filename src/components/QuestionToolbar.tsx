import { 
 Type, 
 Copy, 
 Trash2, 
 AlignLeft,
 Sparkles,
 StickyNote,
 Plus,
 Paperclip
} from 'lucide-react';
import { AnswerType } from '@/types/checklist';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface QuestionToolbarProps {
 onChangeType: (type: AnswerType) => void;
 onDuplicate: () => void;
 onDelete: () => void;
 onAddSubQuestion: () => void;
 onAddNote: () => void;
 onToggleReference: () => void;
 hasReference: boolean;
 currentType: AnswerType;
}

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

const answerTypeIcons: Record<AnswerType, React.ReactNode> = {
 'none': <div className="w-3 h-3 rounded-full border-2 border-current opacity-50" />,
 'yes-no': <div className="w-3 h-3 rounded-full border-2 border-current" />,
 'yes-no-na': <div className="w-3 h-3 rounded-full border-2 border-current" />,
 'multiple-choice': <div className="w-3 h-3 rounded border-2 border-current" />,
 'date': <Type className="h-3 w-3" />,
 'long-answer': <AlignLeft className="h-3 w-3" />,
 'reference': <Type className="h-3 w-3" />,
 'amount': <Type className="h-3 w-3" />,
 'follow-up': <Plus className="h-3 w-3" />,
 'dropdown': <AlignLeft className="h-3 w-3" />,
 'file-upload': <Paperclip className="h-3 w-3" />,
 'toggle': <div className="w-3 h-3 rounded-full border-2 border-current" />,
 'answer': <AlignLeft className="h-3 w-3" />
};

export function QuestionToolbar({
 onChangeType,
 onDuplicate,
 onDelete,
 onAddSubQuestion,
 onAddNote,
 onToggleReference,
 hasReference,
 currentType,
}: QuestionToolbarProps) {
 return (
 <div className="flex items-center gap-0.5 px-1 py-1 bg-card border rounded-lg shadow-lg animate-scale-in">
 {/* Change Type Dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors">
 {answerTypeIcons[currentType]}
 <span className="text-xs">{answerTypeLabels[currentType]}</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-48 z-[100]">
 {(Object.keys(answerTypeLabels) as AnswerType[]).map((type) => (
 <DropdownMenuItem 
 key={type}
 onClick={() => onChangeType(type)}
 className={currentType === type ? 'bg-primary/10 text-primary' : ''}
 >
 <span className="mr-2">{answerTypeIcons[type]}</span>
 {answerTypeLabels[type]}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>

 <div className="w-px h-5 bg-border mx-1" />

 {/* Quick Actions */}
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors" 
 onClick={onAddSubQuestion}
 title="Add sub-question"
 >
 <Plus className="h-3.5 w-3.5" />
 </Button>

 <Button 
 variant="ghost" 
 size="sm" 
 className={`h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors ${hasReference ? 'bg-primary/10 text-primary' : ''}`}
 onClick={onToggleReference}
 title={hasReference ? "Remove attachment option" : "Add attachment option"}
 >
 <Paperclip className="h-3.5 w-3.5" />
 </Button>

 <Button 
 variant="ghost" 
 size="sm" 
 className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors" 
 onClick={onAddNote}
 title="Add note"
 >
 <StickyNote className="h-3.5 w-3.5" />
 </Button>

 <Button 
 variant="ghost" 
 size="sm" 
 className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors" 
 onClick={onDuplicate}
 title="Duplicate"
 >
 <Copy className="h-3.5 w-3.5" />
 </Button>

 <div className="w-px h-5 bg-border mx-1" />

 {/* AI Button */}
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-7 px-2 gap-1.5 text-accent hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground transition-colors"
 title="AI assist"
 >
 <Sparkles className="h-3.5 w-3.5" />
 </Button>

 <div className="w-px h-5 bg-border mx-1" />

 {/* Delete */}
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" 
 onClick={onDelete}
 title="Delete"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 );
}
