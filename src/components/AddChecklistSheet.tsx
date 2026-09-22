import { useState, useEffect } from 'react';
import { X, Search, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChecklistIcon } from '@/components/icons/ChecklistIcon';
import { readJsonFromLocalStorage } from '@/lib/safeJson';
import { cn } from '@/lib/utils';

interface SavedChecklist {
 id: string;
 name: string;
 folderId: string;
 folderName: string;
 data?: any;
}

interface FolderNode {
 id: string;
 name: string;
 checklists: SavedChecklist[];
 isExpanded: boolean;
}

interface AddChecklistSheetProps {
 open: boolean;
 onClose: () => void;
 onSelect: (checklist: SavedChecklist) => void;
}

export function AddChecklistSheet({ open, onClose, onSelect }: AddChecklistSheetProps) {
 const [folders, setFolders] = useState<FolderNode[]>([]);
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
 if (!open) return;
 const saved = readJsonFromLocalStorage<SavedChecklist[]>('savedChecklists', []);
 // Group by folder
 const folderMap = new Map<string, FolderNode>();
 saved.forEach(c => {
 if (!folderMap.has(c.folderId)) {
 folderMap.set(c.folderId, {
 id: c.folderId,
 name: c.folderName,
 checklists: [],
 isExpanded: false,
 });
 }
 folderMap.get(c.folderId)!.checklists.push(c);
 });
 setFolders(Array.from(folderMap.values()));
 setSearchQuery('');
 }, [open]);

 const toggleFolder = (id: string) => {
 setFolders(prev => prev.map(f => f.id === id ? {...f, isExpanded: !f.isExpanded } : f));
 };

 const filtered = searchQuery.trim()
 ? folders.map(f => ({
...f,
 checklists: f.checklists.filter(c =>
 c.name.toLowerCase().includes(searchQuery.toLowerCase())
 ),
 isExpanded: true,
 })).filter(f => f.checklists.length > 0)
 : folders;

 if (!open) return null;

 return (
 <div className="w-80 border-l border-border bg-card h-full flex flex-col animate-in slide-in-from-right-5 duration-200">
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-border">
 <h3 className="font-semibold text-base text-foreground">Select a checklist</h3>
 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
 <X className="h-4 w-4" />
 </Button>
 </div>

 {/* Tab */}
 <div className="px-4 pt-3 pb-1">
 <div className="text-sm font-medium text-primary border-b-2 border-primary pb-2 text-center">
 My Templates
 </div>
 </div>

 {/* Search */}
 <div className="px-4 py-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder=""
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="h-9 pl-9"
 />
 </div>
 </div>

 {/* Folder list */}
 <div className="flex-1 overflow-y-auto px-2 pb-4">
 {filtered.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-8">No templates found</p>
 ) : (
 filtered.map(folder => (
 <div key={folder.id}>
 <button
 className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors"
 onClick={() => toggleFolder(folder.id)}
 >
 {folder.isExpanded ? (
 <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 ) : (
 <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 )}
 <Folder className="h-4 w-4 text-primary flex-shrink-0" />
 <span className="truncate flex-1 text-left">
 {folder.name} ({folder.checklists.length} checklists)
 </span>
 </button>
 {folder.isExpanded && (
 <div className="ml-5">
 {folder.checklists.map(cl => (
 <button
 key={cl.id}
 className={cn(
 "flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-primary/10 text-sm transition-colors"
 )}
 onClick={() => onSelect(cl)}
 title={cl.name}
 >
 <ChecklistIcon className="h-4 w-4 flex-shrink-0" />
 <span className="truncate flex-1 text-left">{cl.name}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 );
}
