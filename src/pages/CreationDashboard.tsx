import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutTemplate, Folder, ChevronDown, ChevronRight, FileText, X, FolderPlus, Plus, Save } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ContentType } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GenerationScope } from '@/types/checklist';
import { toast } from 'sonner';
import uploadCloudAnimated from '@/assets/upload-cloud-animated.gif';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from '@/lib/safeJson';

// Template folder structure
const templateFolders = [{
 id: 'compilation',
 name: 'Compilation',
 templates: ['Client Acceptance and Continuance', 'Independence', 'Knowledge of client business', 'Planning', 'Withdrawal', 'Completion']
}, {
 id: 'review',
 name: 'Review',
 templates: ['New engagement acceptance', 'Existing engagement continuance', 'Understanding the entity - Basics', 'Understanding the entity - Systems', 'Engagement Planning', 'Completion', 'Subsequent events', 'Withdrawal', 'ASPE - General - Disclosure checklist', 'ASPE - Income taxes - Disclosure checklist', 'ASPE - Leases - Disclosure checklist', 'ASPE - Goodwill and intangible assets - Disclosure checklist', 'ASPE - Employee future benefits - Disclosure checklist', 'ASPE - Supplementary - Disclosure checklist']
}, {
 id: 'tax',
 name: 'Tax',
 templates: ['Completion']
}];
interface LocationState {
 contentType?: ContentType;
}
interface CreationOptionProps {
 icon: React.ReactNode;
 iconBg: string;
 title: string;
 description: string;
 badge?: {
 text: string;
 variant: 'recommended' | 'new';
 };
 onClick: () => void;
}
function CreationOption({
 icon,
 iconBg,
 title,
 description,
 badge,
 onClick
}: CreationOptionProps) {
 return <button onClick={onClick} className="group relative flex flex-col bg-card rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 text-left h-full border border-border">
 <div className={`w-full aspect-[4/3] rounded-lg mb-4 flex items-center justify-center ${iconBg}`}>
 <div className="transition-transform duration-500 group-hover:rotate-[360deg]">
 {icon}
 </div>
 </div>
 <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
 {title}
 </h3>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {description}
 </p>
 {badge && <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg w-fit ${badge.variant === 'recommended' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
 {badge.variant === 'recommended' && <span className="text-pink-500 dark:text-pink-400">★</span>}
 {badge.text}
 </span>}
 </button>;
}
const contentTypeLabels: Record<ContentType, string> = {
 checklists: 'Checklist',
 reports: 'Report',
 letters: 'Letter',
 notes: 'Notes to Financial Statements'
};
export default function CreationDashboard() {
 const location = useLocation();
 const navigate = useNavigate();
 const {
 contentType = 'checklists'
 } = location.state as LocationState || {};
 const [mode, setMode] = useState<'import' | 'template' | null>(null);
 const [prompt, setPrompt] = useState('');
 const [scope, setScope] = useState<GenerationScope>('standard');
 const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['compilation']));
 const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

 // File upload state
 const [uploadedFile, setUploadedFile] = useState<File | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // Save dialog state (for file upload)
 const [showSaveDialog, setShowSaveDialog] = useState(false);
 const [checklistName, setChecklistName] = useState('');
 const [selectedFolderId, setSelectedFolderId] = useState('1');
 const [showNewFolderInput, setShowNewFolderInput] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');

 // Save dialog state (for template)
 const [showTemplateSaveDialog, setShowTemplateSaveDialog] = useState(false);
 const [templateChecklistName, setTemplateChecklistName] = useState('');
 const [templateSelectedFolderId, setTemplateSelectedFolderId] = useState('1');
 const [showTemplateNewFolderInput, setShowTemplateNewFolderInput] = useState(false);
 const [templateNewFolderName, setTemplateNewFolderName] = useState('');

 // Available folders for saving
 const saveFolders = [{
 id: '1',
 name: 'Before Release V22Comp'
 }, {
 id: '2',
 name: 'Before Release V22 Revi...'
 }, {
 id: '3',
 name: 'Compilation Checklists'
 }, {
 id: '4',
 name: 'Review Checklists'
 }, {
 id: '5',
 name: 'Tax Release'
 }];
 const toggleFolder = (folderId: string) => {
 setExpandedFolders(prev => {
 const next = new Set(prev);
 if (next.has(folderId)) {
 next.delete(folderId);
 } else {
 next.add(folderId);
 }
 return next;
 });
 };
 const handleTemplateSelect = (templateName: string) => {
 setSelectedTemplate(templateName);
 setPrompt(`Generate a ${templateName} checklist`);
 setTemplateChecklistName(templateName);
 };
 const label = contentTypeLabels[contentType] || 'Checklist';
 const heading = contentType ? `Create ${label}` : 'Create Checklist';
 const handleGenerate = () => {
 navigate('/generate', {
 state: {
 contentType
 }
 });
 };
 const handleBack = () => {
 setMode(null);
 setPrompt('');
 setUploadedFile(null);
 setSelectedTemplate(null);
 };
 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 setUploadedFile(file);
 // Auto-generate a name from the file
 const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
 setChecklistName(nameWithoutExt);
 }
 };
 const handleFileDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const file = e.dataTransfer.files[0];
 if (file) {
 setUploadedFile(file);
 const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
 setChecklistName(nameWithoutExt);
 }
 };
 const handleGenerateFromFile = () => {
 if (uploadedFile) {
 setShowSaveDialog(true);
 }
 };

 const handleGenerateFromTemplate = () => {
 if (!selectedTemplate) {
 toast.error('Please select a template first');
 return;
 }
 setShowTemplateSaveDialog(true);
 };

 const handleTemplateSaveAndGenerate = () => {
 if (!templateChecklistName.trim()) {
 toast.error('Please enter a name for the checklist');
 return;
 }
 
 const folder = saveFolders.find(f => f.id === templateSelectedFolderId);
 toast.success(`"${templateChecklistName}" saved to "${folder?.name}"`);

 // Save to localStorage
 const existingChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const newChecklistId = `checklist-${Date.now()}`;
 const newChecklist = {
 id: newChecklistId,
 name: templateChecklistName.trim(),
 folderId: templateSelectedFolderId,
 folderName: folder?.name || 'Uncategorized',
 source: 'template',
 templateName: selectedTemplate,
 createdAt: new Date().toISOString(),
 data: null
 };
 writeJsonToLocalStorage('savedChecklists', [...existingChecklists, newChecklist]);

 // Dispatch event to notify sidebar
 window.dispatchEvent(new CustomEvent('checklistSaved', {
 detail: newChecklist
 }));

 setShowTemplateSaveDialog(false);

 // Navigate to generate the checklist
 navigate('/builder', {
 state: {
 generate: {
 prompt: `Generate a checklist from template: ${selectedTemplate}`,
 scope,
 checklistName: templateChecklistName.trim(),
 savedChecklistId: newChecklistId
 }
 }
 });
 };

 const handleTemplateAddFolder = () => {
 if (templateNewFolderName.trim()) {
 toast.success(`Folder "${templateNewFolderName}" created`);
 setTemplateNewFolderName('');
 setShowTemplateNewFolderInput(false);
 }
 };
 const handleSaveAndGenerate = () => {
 if (!checklistName.trim()) {
 toast.error('Please enter a name for the checklist');
 return;
 }
 const folder = saveFolders.find(f => f.id === selectedFolderId);
 toast.success(`"${checklistName}" saved to "${folder?.name}"`);

 // Save to localStorage
 const existingChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const newChecklistId = `checklist-${Date.now()}`;
 const newChecklist = {
 id: newChecklistId,
 name: checklistName.trim(),
 folderId: selectedFolderId,
 folderName: folder?.name || 'Uncategorized',
 source: 'file',
 fileName: uploadedFile?.name,
 createdAt: new Date().toISOString(),
 data: null
 };
 writeJsonToLocalStorage('savedChecklists', [...existingChecklists, newChecklist]);

 // Dispatch event to notify sidebar
 window.dispatchEvent(new CustomEvent('checklistSaved', {
 detail: newChecklist
 }));
 setShowSaveDialog(false);

 // Navigate to generate the checklist
 navigate('/builder', {
 state: {
 generate: {
 prompt: `Generate a checklist from uploaded file: ${uploadedFile?.name}`,
 scope,
 checklistName: checklistName.trim(),
 savedChecklistId: newChecklistId
 }
 }
 });
 };
 const handleAddFolder = () => {
 if (newFolderName.trim()) {
 // In a real app, this would create a new folder
 toast.success(`Folder "${newFolderName}" created`);
 setNewFolderName('');
 setShowNewFolderInput(false);
 }
 };

 // Import or Template mode view
 if (mode) {
 return <Layout title="Templates">
 <div className="flex-1 flex flex-col items-center justify-center p-8">
 <div className="max-w-2xl w-full bg-card rounded-xl p-8 shadow-md animate-fade-in border border-border">
 <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
 ← Back
 </button>
 
 {mode === 'import' && <div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Import file</h2>
 <p className="text-muted-foreground mb-6">Upload a document to generate your {label.toLowerCase()}</p>
 
 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" className="hidden" />
 
 {!uploadedFile ? <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={handleFileDrop} className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
 <div className="text-muted-foreground">
 <img src={uploadCloudAnimated} alt="Upload" className="h-12 w-12 mx-auto mb-4 mix-blend-multiply" />
 <p className="font-medium">Click to upload or drag and drop</p>
 <p className="text-sm">PDF, DOC, DOCX (max 10MB)</p>
 </div>
 </div> : <div className="border border-border rounded-lg p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
 <FileText className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="font-medium text-foreground">{uploadedFile.name}</p>
 <p className="text-sm text-muted-foreground">
 {(uploadedFile.size / 1024).toFixed(1)} KB
 </p>
 </div>
 </div>
 <button onClick={() => setUploadedFile(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
 <X className="h-4 w-4 text-muted-foreground" />
 </button>
 </div>
 </div>}
 
 <div className="mt-6 flex justify-end">
 <Button onClick={handleGenerateFromFile} disabled={!uploadedFile} className="ai-button !px-6 !py-5">
 <Sparkles className="h-4 w-4 mr-2" />
 Generate {label}
 </Button>
 </div>
 </div>}

 {/* Save Dialog for File Upload */}
 <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Save {label}</DialogTitle>
 </DialogHeader>
 
 <div className="space-y-4 py-4">
 <div>
 <label className="text-sm font-medium text-foreground mb-2 block">
 {label} Name
 </label>
 <Input value={checklistName} onChange={e => setChecklistName(e.target.value)} placeholder={`Enter ${label.toLowerCase()} name...`} />
 </div>
 
 <div>
 <label className="text-sm font-medium text-foreground mb-2 block">
 Save to Folder
 </label>
 <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
 {saveFolders.map(folder => <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${selectedFolderId === folder.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
 <Folder className="h-4 w-4 text-primary" />
 <span className="text-sm">{folder.name}</span>
 </button>)}
 </div>
 
 {!showNewFolderInput ? <button onClick={() => setShowNewFolderInput(true)} className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80">
 <FolderPlus className="h-4 w-4" />
 Create new folder
 </button> : <div className="mt-2 flex items-center gap-2">
 <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name..." className="flex-1" />
 <Button size="sm" onClick={handleAddFolder}>
 <Plus className="h-4 w-4" />
 </Button>
 <Button size="sm" variant="ghost" onClick={() => setShowNewFolderInput(false)}>
 <X className="h-4 w-4" />
 </Button>
 </div>}
 </div>
 </div>
 
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button onClick={handleSaveAndGenerate} disabled={!checklistName.trim()}>
 <Sparkles className="h-4 w-4" />
 Save & Generate
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {mode === 'template' && <div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Generate from Template</h2>
 <p className="text-muted-foreground mb-6">Select a folder and choose a template</p>
 
 <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
 {templateFolders.map(folder => <div key={folder.id}>
 {/* Folder Header */}
 <button onClick={() => toggleFolder(folder.id)} className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left border-b border-border">
 {expandedFolders.has(folder.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 <Folder className="h-4 w-4 text-primary" />
 <span className="font-medium text-foreground">{folder.name}</span>
 <span className="text-xs text-muted-foreground ml-auto">{folder.templates.length}</span>
 </button>
 
 {/* Templates List */}
 {expandedFolders.has(folder.id) && <div className="bg-background">
 {folder.templates.map(template => <button key={`${folder.id}-${template}`} onClick={() => handleTemplateSelect(template)} className={`w-full flex items-center gap-3 px-4 py-2.5 pl-10 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${selectedTemplate === template ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
 <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
 <span className={`text-sm truncate ${selectedTemplate === template ? 'text-primary font-medium' : 'text-foreground'}`}>
 {template}
 </span>
 </button>)}
 </div>}
 </div>)}
 </div>
 
 {selectedTemplate && <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
 <p className="text-sm text-muted-foreground">Selected template:</p>
 <p className="font-medium text-primary">{selectedTemplate}</p>
 </div>}
 
 <div className="mt-6 flex justify-end">
 <Button onClick={handleGenerateFromTemplate} disabled={!selectedTemplate} className="ai-button !px-6 !py-5">
 <Sparkles className="h-4 w-4 mr-2" />
 Generate {label}
 </Button>
 </div>
 </div>}

 {/* Save Dialog for Template */}
 <Dialog open={showTemplateSaveDialog} onOpenChange={setShowTemplateSaveDialog}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Save {label}</DialogTitle>
 </DialogHeader>
 
 <div className="space-y-4 py-4">
 <div>
 <label className="text-sm font-medium text-foreground mb-2 block">
 {label} Name
 </label>
 <Input value={templateChecklistName} onChange={e => setTemplateChecklistName(e.target.value)} placeholder={`Enter ${label.toLowerCase()} name...`} />
 </div>
 
 <div>
 <label className="text-sm font-medium text-foreground mb-2 block">
 Save to Folder
 </label>
 <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
 {saveFolders.map(folder => <button key={folder.id} onClick={() => setTemplateSelectedFolderId(folder.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${templateSelectedFolderId === folder.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
 <Folder className="h-4 w-4 text-primary" />
 <span className="text-sm">{folder.name}</span>
 </button>)}
 </div>
 
 {!showTemplateNewFolderInput ? <button onClick={() => setShowTemplateNewFolderInput(true)} className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80">
 <FolderPlus className="h-4 w-4" />
 Create new folder
 </button> : <div className="mt-2 flex items-center gap-2">
 <Input value={templateNewFolderName} onChange={e => setTemplateNewFolderName(e.target.value)} placeholder="Folder name..." className="flex-1" />
 <Button size="sm" onClick={handleTemplateAddFolder}>
 <Plus className="h-4 w-4" />
 </Button>
 <Button size="sm" variant="ghost" onClick={() => setShowTemplateNewFolderInput(false)}>
 <X className="h-4 w-4" />
 </Button>
 </div>}
 </div>
 </div>
 
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTemplateSaveDialog(false)}>
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button onClick={handleTemplateSaveAndGenerate} disabled={!templateChecklistName.trim()}>
 <Sparkles className="h-4 w-4" />
 Save & Generate
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </div>
 </Layout>;
 }

 // Main selection view
 return <Layout title="Templates">
 <div className="flex-1 flex flex-col items-center justify-center p-8">
 <div className="max-w-4xl mx-auto animate-fade-in">
 {/* Header */}
 <div className="text-center mb-10">
 <h1 className="text-3xl font-bold text-foreground mb-2">
 {heading}
 </h1>
 <p className="text-muted-foreground text-lg">
 How would you like to get started?
 </p>
 </div>

 {/* Creation Options Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
 <CreationOption icon={<svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="uploadIconGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
 <stop stopColor="#3379C9" />
 <stop offset="1" stopColor="#8A5BD9" />
 </linearGradient>
 </defs>
 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 <path d="M17 8L12 3L7 8" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 <path d="M12 3L12 15" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>} iconBg="bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC] dark:from-purple-900/40 dark:to-blue-900/40" title="Import file" description="Upload a document to generate" badge={{
 text: 'NEW',
 variant: 'new'
 }} onClick={() => setMode('import')} />
 
 <CreationOption icon={<svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="templateIconGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
 <stop stopColor="#3379C9" />
 <stop offset="1" stopColor="#8A5BD9" />
 </linearGradient>
 </defs>
 <rect x="3" y="3" width="18" height="18" rx="2" stroke="url(#templateIconGradient)" strokeWidth="2" />
 <path d="M3 9H21" stroke="url(#templateIconGradient)" strokeWidth="2" />
 <path d="M9 21V9" stroke="url(#templateIconGradient)" strokeWidth="2" />
 </svg>} iconBg="bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC] dark:from-purple-900/40 dark:to-blue-900/40" title="Generate from template" description="Generate from existing templates" onClick={() => setMode('template')} />
 </div>
 </div>
 </div>
 </Layout>;
}