import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { NoteAIBlock } from './NoteAIBlock';

export type NoteBlockType = 'text' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'divider' | 'ai';

export interface NoteBlock {
 id: string;
 type: NoteBlockType;
 content: string;
 aiCommand?: string;
}

export interface NoteAuthor {
 name: string;
 initials: string;
 color: string;
}

export interface Note {
 id: string;
 title: string;
 content: NoteBlock[];
 createdAt: string;
 modifiedAt: string;
 linkedSection?: string;
 createdBy: NoteAuthor;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const BLOCK_COMMANDS = [
 { id: 'text', label: 'Text', description: 'Plain paragraph' },
 { id: 'h1', label: 'Heading 1', description: 'Large heading' },
 { id: 'h2', label: 'Heading 2', description: 'Medium heading' },
 { id: 'h3', label: 'Heading 3', description: 'Small heading' },
 { id: 'ul', label: 'Bullet list', description: 'Unordered list' },
 { id: 'ol', label: 'Numbered list', description: 'Ordered list' },
 { id: 'divider', label: 'Divider', description: 'Horizontal rule' },
];

const LUKA_COMMANDS = [
 'Draft memo',
 'Meeting notes',
 'Draft findings',
 'Summarise transcript',
 'Populate from transcript',
];

type PaletteItem =
 | { kind: 'block'; id: string; label: string; description: string }
 | { kind: 'luka-header' }
 | { kind: 'luka'; label: string };

function buildPalette(filter: string): PaletteItem[] {
 const f = filter.toLowerCase();
 const blocks: PaletteItem[] = BLOCK_COMMANDS
.filter(c => !f || c.label.toLowerCase().includes(f) || c.description.toLowerCase().includes(f))
.map(c => ({ kind: 'block',...c } as PaletteItem));
 const lukas: PaletteItem[] = LUKA_COMMANDS
.filter(c => !f || c.toLowerCase().includes(f) || 'luka'.includes(f))
.map(c => ({ kind: 'luka', label: c } as PaletteItem));
 const result: PaletteItem[] = [...blocks];
 if (lukas.length) {
 result.push({ kind: 'luka-header' });
 result.push(...lukas);
 }
 return result;
}

const textareaClass: Record<string, string> = {
 text: 'text-sm text-foreground',
 h1: 'text-xl font-bold text-foreground',
 h2: 'text-lg font-semibold text-foreground',
 h3: 'text-base font-semibold text-foreground',
 ul: 'text-sm text-foreground',
 ol: 'text-sm text-foreground',
};

interface BlockRowProps {
 block: NoteBlock;
 isFocused: boolean;
 autoFocus: boolean;
 onUpdate: (content: string) => void;
 onInsertAfter: () => void;
 onDelete: () => void;
 onFocus: () => void;
 onInsertAI: (command: string) => void;
 onChangeType: (type: NoteBlockType, content: string) => void;
 onAcceptAI: (content: string) => void;
 onDiscardAI: () => void;
}

function BlockRow({
 block,
 isFocused,
 autoFocus,
 onUpdate,
 onInsertAfter,
 onDelete,
 onFocus,
 onInsertAI,
 onChangeType,
 onAcceptAI,
 onDiscardAI,
}: BlockRowProps) {
 const [showPalette, setShowPalette] = useState(false);
 const [paletteFilter, setPaletteFilter] = useState('');
 const [paletteIdx, setPaletteIdx] = useState(0);
 const [palettePos, setPalettePos] = useState({ top: 0, left: 0 });
 const taRef = useRef<HTMLTextAreaElement>(null);

 const palette = buildPalette(paletteFilter);
 const navigableItems = palette.filter(i => i.kind !== 'luka-header');

 const autoResize = useCallback(() => {
 const el = taRef.current;
 if (!el) return;
 el.style.height = 'auto';
 el.style.height = el.scrollHeight + 'px';
 }, []);

 useEffect(() => {
 autoResize();
 }, [block.content, autoResize]);

 useEffect(() => {
 if (autoFocus && taRef.current) taRef.current.focus();
 }, [autoFocus]);

 const openPalette = () => {
 const rect = taRef.current?.getBoundingClientRect();
 if (rect) setPalettePos({ top: rect.bottom + 4, left: rect.left });
 };

 const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 const val = e.target.value;
 if (val === '/') {
 openPalette();
 setShowPalette(true);
 setPaletteFilter('');
 setPaletteIdx(0);
 } else if (val.startsWith('/')) {
 if (!showPalette) openPalette();
 setShowPalette(true);
 setPaletteFilter(val.slice(1));
 setPaletteIdx(0);
 } else {
 setShowPalette(false);
 }
 onUpdate(val);
 autoResize();
 };

 const applyPaletteItem = (item: PaletteItem) => {
 setShowPalette(false);
 setPaletteFilter('');
 if (item.kind === 'block') {
 if (item.id === 'divider') {
 onChangeType('divider', '');
 } else {
 onChangeType(item.id as NoteBlockType, '');
 }
 } else if (item.kind === 'luka') {
 onInsertAI(item.label);
 }
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
 if (showPalette) {
 if (e.key === 'ArrowDown') {
 e.preventDefault();
 setPaletteIdx(i => Math.min(i + 1, navigableItems.length - 1));
 } else if (e.key === 'ArrowUp') {
 e.preventDefault();
 setPaletteIdx(i => Math.max(i - 1, 0));
 } else if (e.key === 'Enter') {
 e.preventDefault();
 const item = navigableItems[paletteIdx];
 if (item) applyPaletteItem(item);
 } else if (e.key === 'Escape') {
 setShowPalette(false);
 }
 return;
 }
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 onInsertAfter();
 } else if (e.key === 'Backspace' && block.content === '') {
 e.preventDefault();
 onDelete();
 }
 };

 if (block.type === 'divider') {
 return <hr className="my-3 border-border" />;
 }

 if (block.type === 'ai') {
 return (
 <NoteAIBlock
 command={block.aiCommand ?? 'Draft memo'}
 onAccept={onAcceptAI}
 onDiscard={onDiscardAI}
 />
 );
 }

 const prefix = block.type === 'ul' ? '• ' : block.type === 'ol' ? '1. ' : '';

 return (
 <div className="relative group">
 {prefix && (
 <span className="absolute left-0 top-[3px] text-sm text-muted-foreground select-none pointer-events-none">
 {prefix}
 </span>
 )}
 <textarea
 ref={taRef}
 value={block.content}
 placeholder={isFocused ? (block.type === 'text' ? "Type '/' for commands…" : `${block.type.toUpperCase()}`) : ''}
 onChange={handleChange}
 onKeyDown={handleKeyDown}
 onFocus={onFocus}
 className={cn(
 'w-full bg-transparent outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40',
 textareaClass[block.type] ?? 'text-sm',
 (block.type === 'ul' || block.type === 'ol') && 'pl-5',
 )}
 rows={1}
 />

 {showPalette && palette.length > 0 && createPortal(
 <div
 className="fixed z-[9999] w-52 bg-popover border border-border rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto"
 style={{ top: palettePos.top, left: palettePos.left }}
 >
 {palette.map((item, i) => {
 if (item.kind === 'luka-header') {
 return (
 <div key="luka-header" className="px-2.5 pt-2 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
 <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#8649F1] to-[#2355A4]">
 ✦ Luka
 </span>
 </div>
 );
 }
 const navIdx = navigableItems.indexOf(item);
 const isActive = navIdx === paletteIdx;
 return (
 <button
 key={item.kind === 'block' ? item.id : item.label}
 onMouseDown={e => { e.preventDefault(); applyPaletteItem(item); }}
 className={cn(
 'w-full text-left px-2.5 py-1.5 flex items-start gap-2 hover:bg-muted transition-colors',
 isActive && 'bg-muted',
 )}
 >
 <div>
 <p className="text-xs font-medium text-foreground leading-none">
 {item.kind === 'block' ? item.label : item.label}
 </p>
 {item.kind === 'block' && (
 <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
 )}
 </div>
 </button>
 );
 })}
 </div>,
 document.body,
 )}
 </div>
 );
}

interface NoteEditorProps {
 note: Note;
 onChange: (note: Note) => void;
}

export function NoteEditor({ note, onChange }: NoteEditorProps) {
 const [focusIdx, setFocusIdx] = useState<number | null>(null);
 const [newBlockIdx, setNewBlockIdx] = useState<number | null>(null);

 const updateBlock = (idx: number, content: string) => {
 const next = note.content.map((b, i) => i === idx ? {...b, content } : b);
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 };

 const changeBlockType = (idx: number, type: NoteBlockType, content: string) => {
 const next = note.content.map((b, i) => i === idx ? {...b, type, content } : b);
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setNewBlockIdx(idx);
 };

 const insertAfter = (idx: number) => {
 const newBlock: NoteBlock = { id: uid(), type: 'text', content: '' };
 const next = [...note.content.slice(0, idx + 1), newBlock,...note.content.slice(idx + 1)];
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setFocusIdx(idx + 1);
 setNewBlockIdx(idx + 1);
 };

 const deleteBlock = (idx: number) => {
 if (note.content.length <= 1) return;
 const next = note.content.filter((_, i) => i !== idx);
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setFocusIdx(Math.max(0, idx - 1));
 setNewBlockIdx(Math.max(0, idx - 1));
 };

 const insertAI = (idx: number, command: string) => {
 const aiBlock: NoteBlock = { id: uid(), type: 'ai', content: '', aiCommand: command };
 const next = [...note.content.slice(0, idx + 1), aiBlock,...note.content.slice(idx + 1)];
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setFocusIdx(null);
 };

 const acceptAI = (idx: number, content: string) => {
 const next = note.content.map((b, i) =>
 i === idx ? {...b, type: 'text' as const, content, aiCommand: undefined } : b,
 );
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setFocusIdx(idx);
 setNewBlockIdx(idx);
 };

 const discardAI = (idx: number) => {
 if (note.content.length <= 1) {
 const next = note.content.map((b, i) =>
 i === idx ? {...b, type: 'text' as const, content: '', aiCommand: undefined } : b,
 );
 onChange({...note, content: next, modifiedAt: new Date().toISOString() });
 setFocusIdx(idx);
 setNewBlockIdx(idx);
 } else {
 deleteBlock(idx);
 }
 };

 useEffect(() => {
 if (newBlockIdx !== null) {
 setNewBlockIdx(null);
 }
 }, [newBlockIdx]);

 return (
 <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
 {note.content.map((block, idx) => (
 <BlockRow
 key={block.id}
 block={block}
 isFocused={focusIdx === idx}
 autoFocus={newBlockIdx === idx}
 onUpdate={content => updateBlock(idx, content)}
 onInsertAfter={() => insertAfter(idx)}
 onDelete={() => deleteBlock(idx)}
 onFocus={() => setFocusIdx(idx)}
 onInsertAI={cmd => insertAI(idx, cmd)}
 onChangeType={(type, content) => changeBlockType(idx, type, content)}
 onAcceptAI={content => acceptAI(idx, content)}
 onDiscardAI={() => discardAI(idx)}
 />
 ))}
 <div
 className="min-h-[60px] cursor-text"
 onClick={() => {
 const last = note.content[note.content.length - 1];
 if (last?.type === 'text' && last.content === '') {
 setFocusIdx(note.content.length - 1);
 setNewBlockIdx(note.content.length - 1);
 } else {
 insertAfter(note.content.length - 1);
 }
 }}
 />
 </div>
 );
}

const CURRENT_USER: NoteAuthor = {
 name: 'Praveen D',
 initials: 'PD',
 color: '#155EEF',
};

export function createEmptyNote(title: string = 'Untitled', linkedSection?: string): Note {
 return {
 id: uid(),
 title,
 content: [{ id: uid(), type: 'text', content: '' }],
 createdAt: new Date().toISOString(),
 modifiedAt: new Date().toISOString(),
 linkedSection,
 createdBy: CURRENT_USER,
 };
}
