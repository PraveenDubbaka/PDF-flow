import { useState, useEffect, useMemo } from 'react';
import { Plus, Folder, FolderPlus, Check } from 'lucide-react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from '@/lib/safeJson';
import { Checklist } from '@/types/checklist';
import { SavedChecklist } from './Sidebar';
import { toast } from 'sonner';

interface Template {
 id: string;
 name: string;
 type: "folder" | "file";
 children?: Template[];
 isExpanded?: boolean;
}

interface AddToMyTemplatesDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 checklist: Checklist;
 checklistName: string;
}

const initialTemplates: Template[] = [
 { id: "1", name: "Northline Holdings", type: "folder", children: [] },
 { id: "2", name: "Fairmont Group", type: "folder", children: [] },
 { id: "3", name: "Pacific Rim Corp", type: "folder", children: [] },
 { id: "4", name: "Cedar Valley Enterprises", type: "folder", children: [] },
 { id: "5", name: "Compilation Checklists", type: "folder", children: [] },
 { id: "6", name: "Summit Industrial Inc.", type: "folder", children: [] },
 { id: "7", name: "Review Checklists", type: "folder", children: [] },
 { id: "8", name: "Audit Checklists", type: "folder", children: [] },
 { id: "9", name: "US Audit Checklists", type: "folder", children: [] },
];

export function AddToMyTemplatesDialog({
 open,
 onOpenChange,
 checklist,
 checklistName,
}: AddToMyTemplatesDialogProps) {
 const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
 const [templateName, setTemplateName] = useState(checklistName);
 const [folders, setFolders] = useState<Template[]>(initialTemplates);
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');

 // Get checklist counts per folder
 const folderChecklistCounts = useMemo(() => {
 const savedChecklists = readJsonFromLocalStorage<SavedChecklist[]>('savedChecklists', []);
 const counts: Record<string, number> = {};
 folders.forEach(folder => {
 counts[folder.id] = savedChecklists.filter(c => c.folderId === folder.id).length;
 });
 return counts;
 }, [folders, open]); // Recalculate when dialog opens

 // Reset state when dialog opens
 useEffect(() => {
 if (open) {
 setTemplateName(checklistName);
 setSelectedFolder(null);
 setIsCreatingFolder(false);
 setNewFolderName('');
 }
 }, [open, checklistName]);

 const handleCreateFolder = () => {
 if (!newFolderName.trim()) return;
 
 const newFolder: Template = {
 id: `folder-${Date.now()}`,
 name: newFolderName.trim(),
 type: 'folder',
 children: [],
 };
 
 setFolders(prev => [...prev, newFolder]);
 setSelectedFolder(newFolder.id);
 setIsCreatingFolder(false);
 setNewFolderName('');
 };

 const handleSave = () => {
 if (!selectedFolder || !templateName.trim()) return;

 const selectedFolderData = folders.find(f => f.id === selectedFolder);
 if (!selectedFolderData) return;

 // Check for duplicate name in the same folder
 const savedChecklists = readJsonFromLocalStorage<SavedChecklist[]>('savedChecklists', []);
 const duplicate = savedChecklists.find(
 c => c.folderId === selectedFolder && c.name.toLowerCase() === templateName.trim().toLowerCase()
 );
 if (duplicate) {
 toast.error("A template with this name already exists in the selected folder. Please choose another folder or change the template name.");
 return;
 }

 // Create new saved checklist
 const newChecklist: SavedChecklist = {
 id: `checklist-${Date.now()}`,
 name: templateName.trim(),
 folderId: selectedFolder,
 folderName: selectedFolderData.name,
 data: {
...checklist,
 id: `checklist-${Date.now()}`,
 title: templateName.trim(),
 createdAt: new Date(),
 updatedAt: new Date(),
 },
 };

 // Save to localStorage
 const updated = [...savedChecklists, newChecklist];
 writeJsonToLocalStorage('savedChecklists', updated);

 // Dispatch event for sidebar to pick up
 const event = new CustomEvent('checklistSaved', { detail: newChecklist });
 window.dispatchEvent(event);

 // Close the main dialog and show success toast
 onOpenChange(false);
 toast.success("Checklist successfully added to My Templates");
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Folder className="h-5 w-5 text-primary" />
 Select a folder
 </DialogTitle>
 <DialogDescription>
 Select an existing folder or Create new folder to add the checklist template to:
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="template-name">Template Name</Label>
 <Input
 id="template-name"
 value={templateName}
 disabled
 className="bg-muted cursor-not-allowed !border !border-[hsl(var(--border))] opacity-70"
 />
 </div>

 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label>Select Folder</Label>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 text-xs gap-1"
 onClick={() => setIsCreatingFolder(true)}
 >
 <FolderPlus className="h-3.5 w-3.5" />
 New Folder
 </Button>
 </div>
 
 {isCreatingFolder && (
 <div className="flex gap-2 mb-2">
 <Input
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 placeholder="Folder name"
 className="h-8 text-sm"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleCreateFolder();
 if (e.key === 'Escape') {
 setIsCreatingFolder(false);
 setNewFolderName('');
 }
 }}
 />
 <Button
 size="sm"
 className="h-8"
 onClick={handleCreateFolder}
 disabled={!newFolderName.trim()}
 >
 Create
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="h-8"
 onClick={() => {
 setIsCreatingFolder(false);
 setNewFolderName('');
 }}
 >
 Cancel
 </Button>
 </div>
 )}
 
 <ScrollArea className="h-[200px] rounded-md border p-2">
 <div className="space-y-1">
 {folders.map((folder) => {
 const count = folderChecklistCounts[folder.id] || 0;
 return (
 <button
 key={folder.id}
 type="button"
 className={cn(
 "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
 selectedFolder === folder.id
 ? "bg-primary text-primary-foreground"
 : "hover:bg-muted"
 )}
 onClick={() => setSelectedFolder(folder.id)}
 >
 <Folder className="h-4 w-4 flex-shrink-0" />
 <span className="truncate flex-1">{folder.name}</span>
 <span className={cn(
 "text-xs flex-shrink-0",
 selectedFolder === folder.id
 ? "text-primary-foreground/70"
 : "text-muted-foreground"
 )}>
 {count} {count === 1 ? 'Checklist' : 'Checklists'}
 </span>
 {selectedFolder === folder.id && (
 <Check className="h-4 w-4 flex-shrink-0" />
 )}
 </button>
 );
 })}
 </div>
 </ScrollArea>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 Cancel
 </Button>
 <Button
 onClick={handleSave}
 disabled={!selectedFolder || !templateName.trim()}
 >
 <Plus className="h-4 w-4 mr-2" />
 Add
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
