import { useState } from 'react';
import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle,
 DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
 Folder, 
 FolderPlus, 
 FileText, 
 ChevronRight,
 ChevronDown,
 Plus,
 X,
 Trash2,
 Save
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface FolderItem {
 id: string;
 name: string;
 children?: FolderItem[];
 isExpanded?: boolean;
}

interface SaveDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSaveAsDraft: () => void;
 onSaveToFolder: (folderId: string, folderName: string) => void;
 onCreateFolder: (folderName: string) => void;
 onDelete?: () => void;
 showDeleteOption?: boolean;
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

export function SaveDialog({ 
 open, 
 onOpenChange, 
 onSaveAsDraft, 
 onSaveToFolder,
 onCreateFolder,
 onDelete,
 showDeleteOption = false
}: SaveDialogProps) {
 const [saveOption, setSaveOption] = useState<'draft' | 'folder'>('draft');
 const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
 const [selectedFolderId, setSelectedFolderId] = useState<string>('');
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');

 const toggleFolder = (id: string) => {
 setFolders(prev => prev.map(f => 
 f.id === id ? {...f, isExpanded: !f.isExpanded } : f
 ));
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
 onCreateFolder(newFolderName.trim());
 setNewFolderName('');
 setIsCreatingFolder(false);
 }
 };

 const handleSave = () => {
 if (saveOption === 'draft') {
 onSaveAsDraft();
 } else {
 const selectedFolder = folders.find(f => f.id === selectedFolderId);
 if (selectedFolder) {
 onSaveToFolder(selectedFolderId, selectedFolder.name);
 }
 }
 onOpenChange(false);
 };

 const selectedFolderName = folders.find(f => f.id === selectedFolderId)?.name;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle className="text-lg font-semibold">Save Changes</DialogTitle>
 </DialogHeader>
 
 <div className="space-y-4 py-4">
 <RadioGroup 
 value={saveOption} 
 onValueChange={(value) => setSaveOption(value as 'draft' | 'folder')}
 className="space-y-3"
 >
 {/* Save as Draft Option */}
 <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
 saveOption === 'draft' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
 }`}
 onClick={() => setSaveOption('draft')}
 >
 <RadioGroupItem value="draft" id="draft" />
 <Label htmlFor="draft" className="flex items-center gap-2 cursor-pointer flex-1">
 <FileText className="h-5 w-5 text-muted-foreground" />
 <div>
 <p className="font-medium">Save as Draft</p>
 <p className="text-xs text-muted-foreground">Save your progress and continue later</p>
 </div>
 </Label>
 </div>

 {/* Save to Folder Option */}
 <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
 saveOption === 'folder' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
 }`}
 onClick={() => setSaveOption('folder')}
 >
 <RadioGroupItem value="folder" id="folder" className="mt-1" />
 <Label htmlFor="folder" className="flex-1 cursor-pointer">
 <div className="flex items-center gap-2 mb-2">
 <Folder className="h-5 w-5 text-primary" />
 <div>
 <p className="font-medium">Save to Firm Folder</p>
 <p className="text-xs text-muted-foreground">Save to an existing folder or create a new one</p>
 </div>
 </div>
 </Label>
 </div>
 </RadioGroup>

 {/* Folder Selection - only visible when folder option is selected */}
 {saveOption === 'folder' && (
 <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-background">
 {folders.map((folder) => (
 <div
 key={folder.id}
 className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors ${
 selectedFolderId === folder.id 
 ? 'bg-primary/10 text-primary' 
 : 'hover:bg-muted'
 }`}
 onClick={() => setSelectedFolderId(folder.id)}
 >
 {folder.children && folder.children.length > 0 ? (
 <button onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}>
 {folder.isExpanded ? (
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 ) : (
 <ChevronRight className="h-4 w-4 text-muted-foreground" />
 )}
 </button>
 ) : (
 <span className="w-4" />
 )}
 <Folder className={`h-4 w-4 ${selectedFolderId === folder.id ? 'text-primary' : 'text-muted-foreground'}`} />
 <span className="text-sm truncate flex-1">{folder.name}</span>
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
 )}
 </div>

 <DialogFooter className="flex justify-between sm:justify-between gap-2">
 <div className="flex gap-2">
 {showDeleteOption && onDelete && (
 <Button 
 variant="destructive" 
 onClick={() => {
 onDelete();
 onOpenChange(false);
 }}
 className="gap-1"
 >
 <Trash2 className="h-4 w-4" />
 Delete
 </Button>
 )}
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button 
 onClick={handleSave}
 disabled={saveOption === 'folder' && !selectedFolderId}
 >
 <Save className="h-4 w-4" />
 {saveOption === 'draft' 
 ? 'Save as Draft' 
 : selectedFolderName 
 ? `Save to "${selectedFolderName}"` 
 : 'Select a folder'
 }
 </Button>
 </div>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}