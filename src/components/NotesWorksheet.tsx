import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, StickyNote, Trash2, Upload, Loader2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NoteEditor, createEmptyNote } from './NoteEditor';
import type { Note, NoteBlock } from './NoteEditor';
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from '@/lib/safeJson';
import { toast } from 'sonner';

const uid = () => Math.random().toString(36).slice(2, 9);

export const NOTES_INDEX_KEY = (engId: string) => `engagement-notes-index-${engId}`;
export const NOTES_PAGE_KEY = (engId: string, pageKey: string) => `engagement-page-notes-${engId}-${pageKey}`;

export function registerNotesPage(engId: string, pageKey: string) {
 const index: string[] = readJsonFromLocalStorage(NOTES_INDEX_KEY(engId), []);
 if (!index.includes(pageKey)) {
 writeJsonToLocalStorage(NOTES_INDEX_KEY(engId), [...index, pageKey]);
 window.dispatchEvent(new CustomEvent('page-notes-updated', { detail: { engId, pageKey } }));
 }
}

function formatRelative(iso: string) {
 try {
 const diff = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return 'Just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
 } catch { return ''; }
}

function generateExtractedNote(fileName: string): Note {
 const baseName = fileName.replace(/\.[^/.]+$/, '');
 let blocks: NoteBlock[] = [];

 if (/shareholder|register|ownership/i.test(fileName)) {
 blocks = [
 { id: uid(), type: 'h2', content: 'Shareholder Register — Extracted' },
 { id: uid(), type: 'h3', content: 'Shareholders' },
 { id: uid(), type: 'ul', content: 'John Smith — 40% — Common Shares — 400,000 shares' },
 { id: uid(), type: 'ul', content: 'Sarah Johnson — 35% — Common Shares — 350,000 shares' },
 { id: uid(), type: 'ul', content: 'Tech Holdings Ltd. — 25% — Preferred Shares — 250,000 shares' },
 { id: uid(), type: 'h3', content: 'Directors' },
 { id: uid(), type: 'ul', content: 'John Smith — CEO & Director' },
 { id: uid(), type: 'ul', content: 'Sarah Johnson — CFO & Director' },
 { id: uid(), type: 'ul', content: 'Michael Chen — Independent Director' },
 ];
 } else if (/caseware|working|file|engagement/i.test(fileName)) {
 blocks = [
 { id: uid(), type: 'h2', content: 'Client File — Extracted Information' },
 { id: uid(), type: 'h3', content: 'Entity Information' },
 { id: uid(), type: 'ul', content: 'Legal Name: Shipping Line Inc.' },
 { id: uid(), type: 'ul', content: 'Incorporated: Ontario, Canada' },
 { id: uid(), type: 'ul', content: 'Fiscal Year End: March 31, 2024' },
 { id: uid(), type: 'ul', content: 'Business: International shipping & logistics' },
 { id: uid(), type: 'h3', content: 'Key Contacts' },
 { id: uid(), type: 'ul', content: 'CFO: Jennifer Marsh — jennifer@shippingline.ca' },
 { id: uid(), type: 'ul', content: 'Controller: David Park — d.park@shippingline.ca' },
 { id: uid(), type: 'h3', content: 'Prior Year Auditor Notes' },
 { id: uid(), type: 'text', content: 'No significant issues noted in prior year. Management cooperative and responsive to audit queries. Financial statements prepared under IFRS.' },
 ];
 } else if (/financial|statement|fs|balance|income/i.test(fileName)) {
 blocks = [
 { id: uid(), type: 'h2', content: 'Financial Statements — Key Figures' },
 { id: uid(), type: 'h3', content: 'Balance Sheet Summary' },
 { id: uid(), type: 'ul', content: 'Total Assets: $22,400,000' },
 { id: uid(), type: 'ul', content: 'Total Liabilities: $13,300,000' },
 { id: uid(), type: 'ul', content: 'Net Assets / Equity: $9,100,000' },
 { id: uid(), type: 'h3', content: 'Income Statement Summary' },
 { id: uid(), type: 'ul', content: 'Revenue: $16,700,000' },
 { id: uid(), type: 'ul', content: 'Operating Expenses: $15,970,000' },
 { id: uid(), type: 'ul', content: 'Pre-Tax Income: $730,000' },
 ];
 } else {
 blocks = [
 { id: uid(), type: 'h2', content: `Extracted: ${baseName}` },
 { id: uid(), type: 'h3', content: 'Key Points' },
 { id: uid(), type: 'ul', content: 'Entity: Shipping Line Inc.' },
 { id: uid(), type: 'ul', content: 'Period: April 1, 2023 — March 31, 2024' },
 { id: uid(), type: 'text', content: 'Use Luka to auto-populate specific checklist fields with this extracted data.' },
 ];
 }

 return {
 id: uid(),
 title: `AI Import: ${baseName}`,
 content: blocks,
 createdAt: new Date().toISOString(),
 modifiedAt: new Date().toISOString(),
 createdBy: { name: 'Luka AI', initials: 'AI', color: '#8649F1' },
 };
}

interface NotesWorksheetProps {
 parentKey: string;
 parentTitle: string;
}

export function NotesWorksheet({ parentKey, parentTitle }: NotesWorksheetProps) {
 const { engagementId } = useParams<{ engagementId: string }>();
 const eid = engagementId ?? '';
 const storageKey = NOTES_PAGE_KEY(eid, parentKey);

 const [notes, setNotes] = useState<Note[]>(() =>
 readJsonFromLocalStorage<Note[]>(storageKey, []),
 );
 const [openId, setOpenId] = useState<string | null>(null);
 const [extracting, setExtracting] = useState(false);
 const [extractingFile, setExtractingFile] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 // Register this page in the notes index so sidebar shows the sub-item
 useEffect(() => {
 registerNotesPage(eid, parentKey);
 }, [eid, parentKey]);

 const persist = useCallback((updated: Note[]) => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 debounceRef.current = setTimeout(() => {
 writeJsonToLocalStorage(storageKey, updated);
 }, 400);
 }, [storageKey]);

 const addNote = () => {
 const n = createEmptyNote('New Note');
 setNotes(prev => {
 const next = [...prev, n];
 persist(next);
 return next;
 });
 setOpenId(n.id);
 };

 // Auto-create first note if none exist
 useEffect(() => {
 if (notes.length === 0) {
 const n = createEmptyNote(`${parentTitle} — Notes`);
 const next = [n];
 setNotes(next);
 setOpenId(n.id);
 persist(next);
 } else {
 setOpenId(notes[0].id);
 }
 // Only run once on mount
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const deleteNote = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setNotes(prev => {
 const next = prev.filter(n => n.id !== id);
 persist(next);
 if (openId === id) setOpenId(next[next.length - 1]?.id ?? null);
 return next;
 });
 };

 const updateNote = (updated: Note) => {
 setNotes(prev => {
 const next = prev.map(n => n.id === updated.id ? updated : n);
 persist(next);
 return next;
 });
 };

 const updateTitle = (id: string, title: string) => {
 setNotes(prev => {
 const next = prev.map(n => n.id === id ? {...n, title, modifiedAt: new Date().toISOString() } : n);
 persist(next);
 return next;
 });
 };

 const handleFileUpload = (files: FileList | null) => {
 if (!files?.length) return;
 const file = files[0];
 const allowed = ['.pdf', '.docx', '.xlsx'];
 if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
 toast.error('Please upload a PDF, Word, or Excel file');
 return;
 }
 setExtracting(true);
 setExtractingFile(file.name);
 setTimeout(() => {
 const extracted = generateExtractedNote(file.name);
 setNotes(prev => {
 const next = [...prev, extracted];
 persist(next);
 return next;
 });
 setOpenId(extracted.id);
 setExtracting(false);
 setExtractingFile(null);
 toast.success(`Luka extracted information from "${file.name}"`);
 }, 2500);
 };

 const openNote = notes.find(n => n.id === openId) ?? null;

 return (
 <div className="flex flex-col h-full overflow-hidden">
 {/* Worksheet-style top bar */}
 <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
 <div className="flex items-center gap-2">
 <StickyNote className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm text-muted-foreground">Notes for</span>
 <span className="text-sm font-semibold text-foreground">{parentTitle}</span>
 </div>
 <Button variant="ghost" size="sm" onClick={addNote} className="h-7 gap-1.5 text-xs font-medium text-primary">
 <Plus className="h-3.5 w-3.5" /> New Note
 </Button>
 </div>

 {/* Two-column body */}
 <div className="flex flex-1 min-h-0">
 {/* Left: note list + import */}
 <div className="w-72 shrink-0 border-r border-border flex flex-col min-h-0 bg-muted/20">
 {/* Note list */}
 <div className="flex-1 overflow-y-auto">
 {notes.map(note => {
 const isActive = openId === note.id;
 const isAI = note.createdBy?.name === 'Luka AI';
 return (
 <button
 key={note.id}
 onClick={() => setOpenId(note.id)}
 className={cn(
 'group w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-2.5 border-b border-border/40',
 isActive && 'bg-primary/5 border-l-2 border-l-primary',
 )}
 >
 <FileText className={cn('h-4 w-4 mt-0.5 shrink-0', isAI ? 'text-[#8649F1]' : 'text-muted-foreground/60')} />
 <div className="flex-1 min-w-0">
 <p className={cn('text-xs font-semibold truncate leading-snug', isActive ? 'text-primary' : 'text-foreground')}>
 {note.title || 'Untitled'}
 </p>
 <div className="flex items-center gap-1.5 mt-0.5">
 {isAI && (
 <span className="text-[9px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#8649F1] to-[#2355A4]">
 ✦ AI
 </span>
 )}
 {note.createdBy && !isAI && (
 <span
 className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[7px] font-bold shrink-0"
 style={{ backgroundColor: note.createdBy.color }}
 >
 {note.createdBy.initials}
 </span>
 )}
 <span className="text-[10px] text-muted-foreground">{formatRelative(note.modifiedAt)}</span>
 </div>
 </div>
 <button
 onClick={e => deleteNote(note.id, e)}
 className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all shrink-0 mt-0.5"
 title="Delete note"
 >
 <Trash2 className="h-3 w-3 text-destructive" />
 </button>
 </button>
 );
 })}
 </div>

 {/* Import & Extract */}
 <div className="border-t border-border p-4 shrink-0">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 flex items-center gap-1">
 <Sparkles className="h-3 w-3" /> Import &amp; Extract
 </p>
 {extracting ? (
 <div className="flex flex-col items-center gap-2 py-4">
 <div className="flex items-center gap-2">
 <Loader2 className="h-4 w-4 text-[#8649F1] animate-spin" />
 <span className="text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#8649F1] to-[#2355A4]">Luka reading…</span>
 </div>
 {extractingFile && (
 <p className="text-[10px] text-muted-foreground text-center truncate max-w-full px-1">{extractingFile}</p>
 )}
 </div>
 ) : (
 <div
 className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-card transition-colors"
 onDragOver={e => e.preventDefault()}
 onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
 onClick={() => fileInputRef.current?.click()}
 >
 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf,.docx,.xlsx"
 className="hidden"
 onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }}
 />
 <Upload className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1.5" />
 <p className="text-[11px] text-muted-foreground leading-snug">
 Drop a PDF, Word, or Excel file<br />
 <span className="text-primary font-medium">Luka will extract &amp; populate</span>
 </p>
 </div>
 )}
 </div>
 </div>

 {/* Right: editor */}
 <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-card">
 {openNote ? (
 <>
 {/* Note header */}
 <div className="px-6 py-4 border-b border-border shrink-0">
 <input
 value={openNote.title}
 onChange={e => updateTitle(openNote.id, e.target.value)}
 placeholder="Untitled"
 className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
 />
 <div className="flex items-center gap-2 mt-1 flex-wrap">
 {openNote.createdBy && (
 <div className="flex items-center gap-1.5">
 <span
 className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-white text-[8px] font-bold"
 style={{ backgroundColor: openNote.createdBy.color, width: '18px', height: '18px' }}
 >
 {openNote.createdBy.initials}
 </span>
 <span className="text-[11px] text-muted-foreground">{openNote.createdBy.name}</span>
 </div>
 )}
 <span className="text-[11px] text-muted-foreground">· {formatRelative(openNote.modifiedAt)}</span>
 {openNote.linkedSection && (
 <span className="text-[11px] text-muted-foreground">· ↗ {openNote.linkedSection}</span>
 )}
 </div>
 </div>
 {/* Editor */}
 <div className="flex-1 overflow-y-auto">
 <NoteEditor note={openNote} onChange={updateNote} />
 </div>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
 <StickyNote className="h-10 w-10 text-muted-foreground/20" />
 <p className="text-sm text-muted-foreground">Select a note or create a new one.</p>
 <Button variant="outline" size="sm" onClick={addNote} className="gap-1.5">
 <Plus className="h-3.5 w-3.5" /> New Note
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
