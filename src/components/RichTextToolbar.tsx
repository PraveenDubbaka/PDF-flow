import { useRef } from 'react';
import { 
 Bold, 
 Italic, 
 Underline, 
 List,
 ListOrdered,
 AlignLeft,
 AlignCenter,
 AlignRight,
 Undo,
 Redo,
 ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RichTextToolbarProps {
 position?: { x: number; y: number };
 onFormatAction?: (action: string, value?: string) => void;
 onAIAssist?: () => void;
 toolbarRef?: React.RefObject<HTMLDivElement>;
 /** When true, renders inline (relative) above the editor instead of fixed/portal */
 inline?: boolean;
}

export function RichTextToolbar({ position, onFormatAction, onAIAssist, toolbarRef, inline = false }: RichTextToolbarProps) {
 const localRef = useRef<HTMLDivElement>(null);
 const ref = toolbarRef || localRef;

 const handleFormat = (action: string, value?: string) => {
 onFormatAction?.(action, value);
 };

 const textStyles = [
 { label: 'Normal text', value: 'p' },
 { label: 'Heading 1', value: 'h1' },
 { label: 'Heading 2', value: 'h2' },
 { label: 'Heading 3', value: 'h3' },
 ];

 const positionStyles: React.CSSProperties = inline
 ? {}
 : {
 position: 'fixed' as const,
 left: `${position?.x ?? 0}px`,
 top: `${position?.y ?? 0}px`,
 transform: 'translateX(-50%)',
 zIndex: 100,
 };

 return (
 <div
 ref={ref}
 className={`flex items-center gap-0.5 bg-card border rounded-lg shadow-lg px-2 py-1 ${inline ? 'mb-1 w-fit' : ''}`}
 style={positionStyles}
 data-rich-text-toolbar
 onMouseDown={e => e.preventDefault()}
 >
 {/* Text Style Dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs font-normal">
 Normal text
 <ChevronDown className="h-3 w-3" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="min-w-[140px]">
 {textStyles.map((style) => (
 <DropdownMenuItem
 key={style.value}
 onClick={() => handleFormat('textStyle', style.value)}
 className="text-sm"
 >
 {style.label}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>

 <div className="w-px h-5 bg-border mx-1" />

 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('bold')} title="Bold">
 <Bold className="h-3.5 w-3.5" />
 </Button>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('italic')} title="Italic">
 <Italic className="h-3.5 w-3.5" />
 </Button>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('underline')} title="Underline">
 <Underline className="h-3.5 w-3.5" />
 </Button>

 <div className="w-px h-5 bg-border mx-1" />

 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('bulletList')} title="Bullet list">
 <List className="h-3.5 w-3.5" />
 </Button>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('numberedList')} title="Numbered list">
 <ListOrdered className="h-3.5 w-3.5" />
 </Button>

 <div className="w-px h-5 bg-border mx-1" />

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
 <AlignLeft className="h-3.5 w-3.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start">
 <DropdownMenuItem onClick={() => handleFormat('alignLeft')}>
 <AlignLeft className="h-4 w-4 mr-2" /> Left
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleFormat('alignCenter')}>
 <AlignCenter className="h-4 w-4 mr-2" /> Center
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleFormat('alignRight')}>
 <AlignRight className="h-4 w-4 mr-2" /> Right
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>

 <div className="w-px h-5 bg-border mx-1" />

 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('undo')} title="Undo">
 <Undo className="h-3.5 w-3.5" />
 </Button>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleFormat('redo')} title="Redo">
 <Redo className="h-3.5 w-3.5" />
 </Button>
 </div>
 );
}
