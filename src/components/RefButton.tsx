import { useState, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Paperclip, File, Upload, Check, X, Search } from 'lucide-react';

const EXISTING_DOCUMENTS = [
 { id: 'doc1', name: 'Company Policy.pdf', type: 'pdf' },
 { id: 'doc2', name: 'Guidelines 2024.docx', type: 'docx' },
 { id: 'doc3', name: 'Compliance Checklist.xlsx', type: 'xlsx' },
 { id: 'doc4', name: 'Reference Manual.pdf', type: 'pdf' },
];

export interface RefDoc { name: string; id?: string; }

export interface RefButtonProps {
 reference?: RefDoc | RefDoc[] | null;
 onAttach: (doc: RefDoc) => void;
 onRemove: (index?: number) => void;
 disabled?: boolean;
}

export function RefButton({ reference, onAttach, onRemove, disabled }: RefButtonProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const fileInputRef = useRef<HTMLInputElement>(null);

 const refs: RefDoc[] = reference ? (Array.isArray(reference) ? reference : [reference]) : [];
 const filteredDocs = EXISTING_DOCUMENTS.filter(doc =>
 doc.name.toLowerCase().includes(searchTerm.toLowerCase())
 );
 const isDocSelected = (docId: string) => refs.some(r => r.id === docId);

 const handleToggleDoc = (doc: { name: string; id: string }) => {
 if (isDocSelected(doc.id)) {
 const idx = refs.findIndex(r => r.id === doc.id);
 if (idx >= 0) onRemove(idx);
 } else {
 onAttach({ name: doc.name, id: doc.id });
 }
 };

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (files) Array.from(files).forEach(file => onAttach({ name: file.name }));
 e.target.value = '';
 };

 if (disabled && refs.length > 0) {
 return (
 <div className="flex flex-wrap items-start justify-center gap-1">
 {refs.map((ref, i) => (
 <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted rounded">
 <File className="h-3 w-3" />
 <span className="truncate max-w-[120px]">{ref.name}</span>
 </div>
 ))}
 </div>
 );
 }

 return (
 <div className="flex flex-wrap items-start justify-center gap-1">
 <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
 {refs.map((ref, i) => (
 <div key={i} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs text-primary">
 <File className="h-3 w-3 shrink-0" />
 <span className="truncate max-w-[100px]">{ref.name}</span>
 <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="p-0.5 hover:bg-primary/20 rounded shrink-0">
 <X className="h-3 w-3" />
 </button>
 </div>
 ))}
 <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setSearchTerm(''); }}>
 <PopoverTrigger asChild>
 <button
 onClick={(e) => e.stopPropagation()}
 className={refs.length > 0
 ? "flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md border border-dashed border-blue-300 dark:border-blue-700/60 transition-colors"
 : "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md border border-dashed border-blue-300 dark:border-blue-700/60 transition-colors"
 }>
 {refs.length > 0 ? <Plus className="h-3 w-3" /> : <><Paperclip className="h-3.5 w-3.5" /><span>+ Ref</span></>}
 </button>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-72 p-0 bg-popover border-border shadow-xl z-50" sideOffset={5} onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
 <div className="p-3 border-b border-border">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search documents..." className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm" />
 </div>
 </div>
 <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors border-b border-border">
 <Upload className="h-4 w-4" />
 <span>Upload documents</span>
 </button>
 <div className="max-h-48 overflow-y-auto">
 {filteredDocs.map((doc) => (
 <button key={doc.id} onClick={(e) => { e.stopPropagation(); handleToggleDoc(doc); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-popover-foreground">
 <Checkbox checked={isDocSelected(doc.id)} className="h-4 w-4 pointer-events-none" />
 <File className="h-4 w-4 text-muted-foreground shrink-0" />
 <span className="truncate">{doc.name}</span>
 </button>
 ))}
 </div>
 {refs.length > 0 && (
 <div className="p-2 border-t border-border">
 <button onClick={() => { setIsOpen(false); setSearchTerm(''); }} className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-[#1C63A6] hover:bg-[#1a5a9e] rounded-md transition-colors">
 <Check className="h-3.5 w-3.5" />
 <span>Done</span>
 </button>
 </div>
 )}
 </PopoverContent>
 </Popover>
 </div>
 );
}
