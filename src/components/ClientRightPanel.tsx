import { useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, File, Search, Settings, Filter, Maximize2, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientRightPanelProps {
 className?: string;
 clientName?: string;
}

const menuItems = [
 { icon: File, label: 'Documents', id: 'documents' },
];

interface FolderItem {
 name: string;
 type: 'folder' | 'file';
 children?: FolderItem[];
}

const folderStructure: FolderItem[] = [
 { 
 name: '2025', 
 type: 'folder',
 children: []
 },
 { 
 name: '2024', 
 type: 'folder',
 children: []
 },
];

export function ClientRightPanel({ className, clientName = 'CR tickets' }: ClientRightPanelProps) {
 const [isExpanded, setIsExpanded] = useState(false);
 const [activeItem, setActiveItem] = useState('documents');
 const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

 const toggleFolder = (folderName: string) => {
 setExpandedFolders(prev => 
 prev.includes(folderName) 
 ? prev.filter(f => f !== folderName)
 : [...prev, folderName]
 );
 };

 return (
 <div className={cn("flex h-full", className)}>
 {/* Icon Bar - Always visible */}
 <div className="w-12 bg-card border-l border-border flex flex-col items-center py-3 gap-1">
 {/* Toggle Button */}
 <Button
 variant="ghost"
 size="icon"
 className="h-9 w-9 mb-2 hover:bg-muted"
 onClick={() => setIsExpanded(!isExpanded)}
 >
 {isExpanded ? (
 <ChevronRight className="h-4 w-4 text-primary" />
 ) : (
 <ChevronLeft className="h-4 w-4 text-primary" />
 )}
 </Button>

 {/* Menu Icons */}
 {menuItems.map((item) => (
 <Button
 key={item.id}
 variant="ghost"
 size="icon"
 className={cn(
 "h-9 w-9 hover:bg-muted",
 activeItem === item.id && "bg-muted text-primary"
 )}
 onClick={() => {
 setActiveItem(item.id);
 if (!isExpanded) setIsExpanded(true);
 }}
 >
 <item.icon className="h-4 w-4 text-primary" />
 </Button>
 ))}
 </div>

 {/* Expanded Content Panel */}
 <div
 className={cn(
 "bg-card border-l border-border transition-all duration-300 overflow-hidden",
 isExpanded ? "w-72" : "w-0"
 )}
 >
 {isExpanded && (
 <div className="w-72 h-full flex flex-col">
 {/* Header */}
 <div className="px-4 py-3 border-b border-border">
 <p className="text-xs text-muted-foreground">Document Repository</p>
 <h3 className="font-semibold text-sm text-foreground">{clientName}</h3>
 </div>

 {/* Action Icons */}
 <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border">
 <Button variant="ghost" size="icon" className="h-7 w-7">
 <Maximize2 className="h-4 w-4 text-primary" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7">
 <Plus className="h-4 w-4 text-primary" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7">
 <Settings className="h-4 w-4 text-primary" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7">
 <Filter className="h-4 w-4 text-primary" />
 </Button>
 <Button variant="ghost" size="icon" className="h-7 w-7">
 <Search className="h-4 w-4 text-primary" />
 </Button>
 </div>

 {/* Folder Structure */}
 <div className="flex-1 overflow-y-auto p-4 space-y-1">
 {folderStructure.map((folder) => (
 <div key={folder.name}>
 <button
 onClick={() => toggleFolder(folder.name)}
 className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-md text-left"
 >
 <ChevronDown 
 className={cn(
 "h-4 w-4 text-primary transition-transform",
 !expandedFolders.includes(folder.name) && "-rotate-90"
 )} 
 />
 <FolderOpen className="h-4 w-4 text-primary" />
 <span className="text-sm font-medium text-foreground">{folder.name}</span>
 </button>
 {expandedFolders.includes(folder.name) && folder.children && (
 <div className="pl-8 space-y-1">
 {folder.children.map((child, idx) => (
 <div key={idx} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
 {child.type === 'folder' ? (
 <FolderOpen className="h-4 w-4 text-primary" />
 ) : (
 <File className="h-4 w-4 text-muted-foreground" />
 )}
 <span className="text-sm text-foreground">{child.name}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
