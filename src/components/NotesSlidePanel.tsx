import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
 X, Plus, Bold, Italic, Underline, Strikethrough, ChevronDown,
 List, ListOrdered, CheckSquare, Minus, Sparkles,
 Mic, MicOff, Send, Wand2, Loader2, Check, Trash2, Table2,
 Heading1, Heading2, Heading3, AlignLeft, Phone, PhoneOff,
 FileUp, Download, MoreHorizontal, ExternalLink, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem,
 DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { RichTextToolbar } from './RichTextToolbar';

// ── Types ──────────────────────────────────────────────────────────────────────

type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'checklist' | 'divider' | 'table';
type NoteSource = 'manual' | 'ai' | 'pdf' | 'call';

interface NoteBlock {
 id: string;
 type: BlockType;
 content: string;
 checked?: boolean;
 source?: NoteSource;
 sourceLabel?: string;
}

interface NoteData {
 id: string;
 title: string;
 blocks: NoteBlock[];
 createdAt: string;
 createdBy: string;
 updatedAt: string;
}

interface AISuggestion {
 prompt: string;
 blocks: NoteBlock[];
 status: 'generating' | 'ready';
 source?: NoteSource;
 sourceLabel?: string;
}

type CallState = 'idle' | 'connecting' | 'recording' | 'processing';

function genId() { return Math.random().toString(36).slice(2, 9); }
function fmtDate(iso: string) { try { return format(new Date(iso), "MMM d, yyyy, HH:mm"); } catch { return iso; } }
function fmtTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

// ── Mock generators ────────────────────────────────────────────────────────────

function mockAiGenerate(prompt: string): NoteBlock[] {
 const p = prompt.toLowerCase();
 const src: NoteSource = 'ai';
 if (p.includes('meeting')) return [
 { id: genId(), type: 'h2', content: 'Meeting Notes', source: src },
 { id: genId(), type: 'h3', content: 'Attendees', source: src },
 { id: genId(), type: 'ul', content: '[Name] — [Role]', source: src },
 { id: genId(), type: 'ul', content: '[Name] — [Role]', source: src },
 { id: genId(), type: 'h3', content: 'Discussion', source: src },
 { id: genId(), type: 'text', content: 'Key topics covered during the meeting:', source: src },
 { id: genId(), type: 'h3', content: 'Decisions', source: src },
 { id: genId(), type: 'ul', content: '[Decision 1]', source: src },
 { id: genId(), type: 'h3', content: 'Action Items', source: src },
 { id: genId(), type: 'checklist', content: '[Action item] — [Owner]', checked: false, source: src },
 { id: genId(), type: 'checklist', content: '[Action item] — [Owner]', checked: false, source: src },
 ];
 if (p.includes('risk') || p.includes('finding')) return [
 { id: genId(), type: 'h2', content: 'Audit Finding', source: src },
 { id: genId(), type: 'h3', content: 'Observation', source: src },
 { id: genId(), type: 'text', content: '[Describe the control deficiency or risk identified]', source: src },
 { id: genId(), type: 'h3', content: 'Risk Rating', source: src },
 { id: genId(), type: 'text', content: 'High / Medium / Low', source: src },
 { id: genId(), type: 'h3', content: 'Management Response', source: src },
 { id: genId(), type: 'text', content: '[Management comments and proposed remediation]', source: src },
 { id: genId(), type: 'h3', content: 'Recommendation', source: src },
 { id: genId(), type: 'text', content: '[Recommended corrective action and timeline]', source: src },
 ];
 return [
 { id: genId(), type: 'h2', content: prompt.slice(0, 60), source: src },
 { id: genId(), type: 'text', content: '[Generated content — update with your notes]', source: src },
 { id: genId(), type: 'ul', content: '[Point 1]', source: src },
 { id: genId(), type: 'ul', content: '[Point 2]', source: src },
 { id: genId(), type: 'ul', content: '[Point 3]', source: src },
 ];
}

function mockPdfExtract(filename: string): NoteBlock[] {
 const f = filename.toLowerCase();
 const src: NoteSource = 'pdf';
 const sl = `Extracted from ${filename}`;
 if (f.includes('board') || f.includes('minute')) return [
 { id: genId(), type: 'h2', content: 'Board Minutes — Key Extracts', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Resolutions Passed', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Resolution 1 — extracted from document]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Resolution 2 — extracted from document]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Approvals', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'Financial statements approved by the board', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Audit Committee Notes', source: src, sourceLabel: sl },
 { id: genId(), type: 'text', content: '[Relevant audit committee discussion points extracted]', source: src, sourceLabel: sl },
 ];
 if (f.includes('shareholder') || f.includes('register')) return [
 { id: genId(), type: 'h2', content: 'Shareholder Register — Extracted', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Major Shareholders (>10%)', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Shareholder name] — [X]% as at [date]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Shareholder name] — [X]% as at [date]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Changes in Period', source: src, sourceLabel: sl },
 { id: genId(), type: 'text', content: '[Any share transfers or new issuances noted in register]', source: src, sourceLabel: sl },
 ];
 if (f.includes('legal') || f.includes('covenant') || f.includes('agreement')) return [
 { id: genId(), type: 'h2', content: 'Legal Document — Key Terms Extracted', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Covenants & Obligations', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Financial covenant extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Reporting obligation extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Key Dates', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Maturity / expiry date extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Audit Relevance', source: src, sourceLabel: sl },
 { id: genId(), type: 'text', content: 'Luka identified this agreement as relevant to: going concern, related party disclosures, or financing arrangements.', source: src, sourceLabel: sl },
 ];
 // Generic PDF / CaseWare export
 return [
 { id: genId(), type: 'h2', content: `Extracted from: ${filename}`, source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Entity Information', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'Entity name: [extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'Reporting period: [extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Key Figures', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'Total assets: [extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'Revenue: [extracted]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Notes & Observations', source: src, sourceLabel: sl },
 { id: genId(), type: 'text', content: '[Luka selectively extracted audit-relevant content. Review and edit as needed.]', source: src, sourceLabel: sl },
 ];
}

function mockCallCapture(durationSecs: number): NoteBlock[] {
 const src: NoteSource = 'call';
 const sl = `Call captured (${fmtTime(durationSecs)})`;
 return [
 { id: genId(), type: 'h2', content: 'Call Notes', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Participants', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Client contact] — [Role]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: 'praveend@countable.co — Audit Senior', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Key Points', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Discussion point transcribed by Luka AI]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Another key point from the call]', source: src, sourceLabel: sl },
 { id: genId(), type: 'ul', content: '[Client confirmed / provided information]', source: src, sourceLabel: sl },
 { id: genId(), type: 'h3', content: 'Follow-up Actions', source: src, sourceLabel: sl },
 { id: genId(), type: 'checklist', content: '[Client to provide supporting documents by [date]]', checked: false, source: src, sourceLabel: sl },
 { id: genId(), type: 'checklist', content: '[Follow up on [specific point] at next call]', checked: false, source: src, sourceLabel: sl },
 ];
}

// ── Palette config ─────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
 text: 'Normal text', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
 ul: 'Bullet list', ol: 'Numbered list', checklist: 'Checklist',
 divider: 'Divider', table: 'Table',
};

interface PaletteItem { type: BlockType | 'ai' | 'pdf'; label: string; icon: React.ReactNode }

const PALETTE_ITEMS: PaletteItem[] = [
 { type: 'ai', label: 'Start with AI', icon: <Sparkles className="h-4 w-4" style={{ color: '#8649F1' }} /> },
 { type: 'pdf', label: 'Import PDF / doc', icon: <FileUp className="h-4 w-4" /> },
 { type: 'text', label: 'Normal text', icon: <AlignLeft className="h-4 w-4" /> },
 { type: 'h1', label: 'Heading 1', icon: <Heading1 className="h-4 w-4" /> },
 { type: 'h2', label: 'Heading 2', icon: <Heading2 className="h-4 w-4" /> },
 { type: 'h3', label: 'Heading 3', icon: <Heading3 className="h-4 w-4" /> },
 { type: 'ul', label: 'Bullet list', icon: <List className="h-4 w-4" /> },
 { type: 'ol', label: 'Numbered list', icon: <ListOrdered className="h-4 w-4" /> },
 { type: 'checklist', label: 'Checklist', icon: <CheckSquare className="h-4 w-4" /> },
 { type: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
 { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" /> },
];

// ── Source badge ───────────────────────────────────────────────────────────────

function SourceBadge({ source, label }: { source: NoteSource; label?: string }) {
 if (source === 'manual') return null;
 const cfg = {
 ai: { cls: 'bg-[#8649F1]/10 text-[#8649F1] border-[#8649F1]/20', text: '✦ AI' },
 pdf: { cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800', text: '📄 PDF' },
 call: { cls: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800', text: '🎙️ Call' },
 }[source];
 return (
 <span title={label}
 className={cn("inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full border font-medium ml-2 opacity-0 group-hover/block:opacity-100 transition-opacity whitespace-nowrap flex-shrink-0 mt-[3px]", cfg.cls)}>
 {cfg.text}
 </span>
 );
}

// ── TableBlock ─────────────────────────────────────────────────────────────────

function makeTable(rows = 3, cols = 3) { return JSON.stringify(Array.from({ length: rows }, () => Array(cols).fill(''))); }

function TableBlock({ block, onUpdate }: { block: NoteBlock; onUpdate: (id: string, content: string) => void }) {
 const rows: string[][] = (() => { try { return JSON.parse(block.content); } catch { return JSON.parse(makeTable()); } })();
 const update = (r: number, c: number, val: string) => {
 const next = rows.map(row => [...row]); next[r][c] = val; onUpdate(block.id, JSON.stringify(next));
 };
 return (
 <div className="overflow-x-auto my-1">
 <table className="border-collapse text-sm min-w-full">
 <tbody>
 {rows.map((row, r) => (
 <tr key={r}>{row.map((cell, c) => (
 <td key={c} className="border border-border min-w-[80px] p-0">
 <div contentEditable suppressContentEditableWarning className="px-2 py-1 outline-none min-h-[1.8rem] text-sm"
 onBlur={e => update(r, c, e.currentTarget.textContent ?? '')}
 dangerouslySetInnerHTML={{ __html: cell }} />
 </td>
 ))}</tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

// ── BlockEditor ────────────────────────────────────────────────────────────────

interface BlockEditorProps {
 block: NoteBlock; olIndex: number; isFirst: boolean;
 onContentChange: (id: string, html: string) => void;
 onKeyDown: (e: React.KeyboardEvent, block: NoteBlock) => void;
 onFocus: (id: string) => void;
 onAddAfter: (id: string, type?: BlockType) => void;
 onToggleCheck: (id: string) => void;
 showSlashMenu: boolean;
 onSlashSelect: (type: BlockType) => void;
 onPaletteSelect: (item: PaletteItem, afterId: string) => void;
 registerRef: (id: string, el: HTMLDivElement | null) => void;
}

const BlockEditor = React.memo(function BlockEditor({
 block, olIndex, isFirst, onContentChange, onKeyDown, onFocus, onAddAfter,
 onToggleCheck, showSlashMenu, onSlashSelect, onPaletteSelect, registerRef,
}: BlockEditorProps) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
 if (ref.current) ref.current.innerHTML = block.content;
 registerRef(block.id, ref.current);
 return () => registerRef(block.id, null);
 }, []); // eslint-disable-line

 if (block.type === 'divider') return (
 <div className="py-3 group/block flex items-center gap-1.5">
 <span className="w-5 flex-shrink-0" />
 <hr className="flex-1 border-border" />
 </div>
 );
 if (block.type === 'table') return (
 <div className="group/block flex items-start gap-1.5 py-1">
 <PlusTrigger onSelect={item => onPaletteSelect(item, block.id)} />
 <div className="flex-1"><TableBlock block={block} onUpdate={onContentChange} /></div>
 </div>
 );

 const blockCls = cn(
 "outline-none min-h-[1.5rem] break-words",
 block.type === 'h1' && "text-[1.75rem] font-bold leading-tight",
 block.type === 'h2' && "text-2xl font-semibold leading-tight",
 block.type === 'h3' && "text-xl font-medium leading-snug",
 (block.type === 'text' || block.type === 'ul' || block.type === 'ol' || block.type === 'checklist') && "text-[0.9rem] leading-relaxed",
 block.type === 'checklist' && block.checked && "line-through text-muted-foreground",
 "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/25 empty:before:pointer-events-none",
 );
 const placeholder = isFirst && !block.content ? "Type '/' to add a block, or start writing..."
 : block.type === 'ul' || block.type === 'ol' ? 'List item'
 : block.type === 'checklist' ? 'To-do' : '';

 return (
 <div className="group/block flex items-start gap-1.5 py-[2px] relative">
 <PlusTrigger onSelect={item => onPaletteSelect(item, block.id)} />
 {block.type === 'checklist' && (
 <input type="checkbox" checked={!!block.checked} onChange={() => onToggleCheck(block.id)}
 className="mt-[5px] h-3.5 w-3.5 flex-shrink-0 rounded accent-primary cursor-pointer" />
 )}
 {block.type === 'ul' && <span className="flex-shrink-0 text-foreground mt-[2px] leading-relaxed text-base select-none">•</span>}
 {block.type === 'ol' && <span className="flex-shrink-0 text-[0.9rem] leading-relaxed mt-[2px] select-none min-w-[1.4em] text-right">{olIndex}.</span>}
 <div className="flex-1 flex items-start gap-0 relative">
 <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={placeholder}
 className={cn(blockCls, "flex-1")}
 onFocus={() => onFocus(block.id)}
 onInput={e => onContentChange(block.id, (e.target as HTMLDivElement).innerHTML)}
 onKeyDown={e => onKeyDown(e, block)}
 />
 {block.source && block.source !== 'manual' && (
 <SourceBadge source={block.source} label={block.sourceLabel} />
 )}
 {showSlashMenu && (
 <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-popover border border-border rounded-xl shadow-xl py-1.5 overflow-hidden">
 <p className="px-3 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Block type</p>
 {PALETTE_ITEMS.filter(p => p.type !== 'ai' && p.type !== 'pdf').map(item => (
 <button key={item.type} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted transition-colors text-foreground text-left"
 onMouseDown={e => { e.preventDefault(); onSlashSelect(item.type as BlockType); }}>
 <span className="w-5 text-muted-foreground flex items-center justify-center">{item.icon}</span>
 {item.label}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 );
});

// ── PlusTrigger ────────────────────────────────────────────────────────────────

function PlusTrigger({ onSelect }: { onSelect: (item: PaletteItem) => void }) {
 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="opacity-0 group-hover/block:opacity-100 flex-shrink-0 w-5 h-5 mt-[3px] rounded-md flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 transition-all shadow-sm">
 <Plus className="h-3 w-3" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" side="right" className="w-52 py-1.5">
 {PALETTE_ITEMS.map((item, idx) => (
 <React.Fragment key={item.type}>
 {idx === 2 && <DropdownMenuSeparator />}
 <DropdownMenuItem className="flex items-center gap-2.5 text-sm cursor-pointer" onClick={() => onSelect(item)}>
 <span className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
 item.type === 'ai' ? "bg-gradient-to-br from-[#8649F1] to-[#B084FF]" : "bg-muted"
 )}>
 <span className={item.type === 'ai' ? "text-white [&>svg]:text-white" : "text-muted-foreground"}>{item.icon}</span>
 </span>
 {item.label}
 </DropdownMenuItem>
 </React.Fragment>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 );
}

// ── AISuggestionCard ───────────────────────────────────────────────────────────

function AISuggestionCard({ suggestion, onAccept, onDiscard }: {
 suggestion: AISuggestion; onAccept: (blocks: NoteBlock[]) => void; onDiscard: () => void;
}) {
 const isCall = suggestion.source === 'call';
 const isPdf = suggestion.source === 'pdf';
 const gradCls = isCall ? 'from-green-500 to-emerald-400' : isPdf ? 'from-blue-500 to-sky-400' : 'from-[#8649F1] to-[#B084FF]';
 const accentCls = isCall ? 'text-green-600' : isPdf ? 'text-blue-600' : 'text-[#8649F1]';
 const ringCls = isCall ? 'border-green-400/30 bg-green-500/5' : isPdf ? 'border-blue-400/30 bg-blue-500/5' : 'border-[#8649F1]/30 bg-[#8649F1]/5';
 const btnCls = isCall ? 'bg-green-500 hover:bg-green-600' : isPdf ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#8649F1] hover:bg-[#7535E0]';
 const spinnerCls = isCall ? 'text-green-500' : isPdf ? 'text-blue-500' : 'text-[#8649F1]';
 const headerText = isCall ? (suggestion.sourceLabel ?? 'Captured from call')
 : isPdf ? (suggestion.sourceLabel ?? 'Extracted by Luka')
 : 'Generated by Luka';
 const loadingText = isCall ? 'Luka is processing call notes…' : isPdf ? 'Luka is reading your document…' : 'Luka is writing…';

 return (
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
 className={cn("mt-4 rounded-xl border-2 overflow-hidden", ringCls)}>
 <div className="flex items-center gap-2 px-3 py-2 border-b border-current/10">
 <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0", gradCls)}>
 <Sparkles className="h-2.5 w-2.5 text-white" />
 </div>
 <span className={cn("text-xs font-semibold", accentCls)}>{headerText}</span>
 <span className="text-xs text-muted-foreground flex-1 truncate ml-1">"{suggestion.prompt}"</span>
 </div>
 {suggestion.status === 'generating' ? (
 <div className="flex items-center gap-2 px-3 py-4">
 <Loader2 className={cn("h-4 w-4 animate-spin", spinnerCls)} />
 <span className="text-sm text-muted-foreground">{loadingText}</span>
 </div>
 ) : (
 <>
 <div className="px-4 py-3 space-y-1 max-h-48 overflow-y-auto">
 {suggestion.blocks.map(b => (
 <div key={b.id} className={cn("text-foreground",
 b.type === 'h2' && "text-base font-semibold mt-1",
 b.type === 'h3' && "text-sm font-medium mt-0.5",
 b.type === 'text' && "text-sm text-muted-foreground",
 b.type === 'ul' && "text-sm text-muted-foreground pl-3 before:content-['•_']",
 b.type === 'checklist' && "text-sm text-muted-foreground pl-3 flex items-center gap-1",
 )}>
 {b.type === 'checklist' && <span>☐</span>}
 <span dangerouslySetInnerHTML={{ __html: b.content }} />
 </div>
 ))}
 </div>
 <div className="flex items-center gap-2 px-3 py-2 border-t border-current/10">
 <button onClick={() => onAccept(suggestion.blocks)}
 className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors", btnCls)}>
 <Check className="h-3 w-3" /> Accept
 </button>
 <button onClick={onDiscard}
 className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
 <Trash2 className="h-3 w-3" /> Discard
 </button>
 </div>
 </>
 )}
 </motion.div>
 );
}

// ── NotesSlidePanel ────────────────────────────────────────────────────────────

interface NotesSlidePanelProps {
 open: boolean; onOpenChange: (open: boolean) => void;
 noteId: string | null; noteName: string; engId: string;
 pageMode?: boolean;
}

export function NotesSlidePanel({ open, onOpenChange, noteId, noteName, engId, pageMode }: NotesSlidePanelProps) {
 const storageKey = noteId ? `engagement-note-content-${engId}-${noteId}` : null;

 const [note, setNote] = useState<NoteData | null>(null);
 const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
 const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
 const [aiInput, setAiInput] = useState('');
 const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
 const [isVoiceActive, setIsVoiceActive] = useState(false);
 const [isAiLoading, setIsAiLoading] = useState(false);
 const [callState, setCallState] = useState<CallState>('idle');
 const [callSeconds, setCallSeconds] = useState(0);
 const [isDictating, setIsDictating] = useState(false);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const [showAiFloating, setShowAiFloating] = useState(false);
 const [showRichToolbar, setShowRichToolbar] = useState(false);
 const [richToolbarPos, setRichToolbarPos] = useState({ x: 0, y: 0 });

 const titleRef = useRef<HTMLDivElement>(null);
 const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const recognitionRef = useRef<any>(null);
 const dictationRef = useRef<any>(null);
 const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const richToolbarRef = useRef<HTMLDivElement>(null);
 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

 const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
 if (el) blockRefs.current.set(id, el); else blockRefs.current.delete(id);
 }, []);

 const handleClose = useCallback(() => {
 setIsFullscreen(false);
 onOpenChange(false);
 }, [onOpenChange]);

 useEffect(() => {
 const el = textareaRef.current;
 if (!el) return;
 el.style.height = 'auto';
 el.style.height = Math.min(el.scrollHeight, 120) + 'px';
 }, [aiInput]);

 useEffect(() => () => {
 if (callTimerRef.current) clearInterval(callTimerRef.current);
 dictationRef.current?.stop();
 }, []);

 useEffect(() => {
 if (!open || !storageKey || !noteId) return;
 const raw = localStorage.getItem(storageKey);
 if (raw) {
 try {
 const parsed = JSON.parse(raw) as NoteData;
 setNote(parsed);
 setTimeout(() => { if (titleRef.current) titleRef.current.innerHTML = parsed.title; }, 40);
 return;
 } catch { /* fall through */ }
 }
 const now = new Date().toISOString();
 const initial: NoteData = {
 id: noteId, title: noteName,
 blocks: [{ id: genId(), type: 'text', content: '' }],
 createdAt: now, createdBy: 'praveend@countable.co', updatedAt: now,
 };
 setNote(initial);
 localStorage.setItem(storageKey, JSON.stringify(initial));
 setTimeout(() => { if (titleRef.current) titleRef.current.innerHTML = noteName; }, 40);
 }, [open, noteId]); // eslint-disable-line

 const persist = useCallback((data: NoteData) => {
 if (!storageKey) return;
 if (saveTimer.current) clearTimeout(saveTimer.current);
 saveTimer.current = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(data)), 400);
 }, [storageKey]);

 const updateBlockContent = useCallback((blockId: string, html: string) => {
 setNote(prev => {
 if (!prev) return prev;
 const updated = {...prev, blocks: prev.blocks.map(b => b.id === blockId ? {...b, content: html } : b), updatedAt: new Date().toISOString() };
 persist(updated); return updated;
 });
 }, [persist]);

 const addBlock = useCallback((afterId: string, type: BlockType = 'text') => {
 const newId = genId();
 const newBlock: NoteBlock = type === 'table' ? { id: newId, type, content: makeTable() } : { id: newId, type, content: '' };
 setNote(prev => {
 if (!prev) return prev;
 const idx = prev.blocks.findIndex(b => b.id === afterId);
 const blocks = [...prev.blocks]; blocks.splice(idx + 1, 0, newBlock);
 const updated = {...prev, blocks, updatedAt: new Date().toISOString() };
 persist(updated); return updated;
 });
 setTimeout(() => blockRefs.current.get(newId)?.focus(), 50);
 }, [persist]);

 const removeBlock = useCallback((blockId: string) => {
 setNote(prev => {
 if (!prev || prev.blocks.length <= 1) return prev;
 const idx = prev.blocks.findIndex(b => b.id === blockId);
 const blocks = prev.blocks.filter(b => b.id !== blockId);
 const updated = {...prev, blocks, updatedAt: new Date().toISOString() };
 persist(updated);
 if (idx > 0) setTimeout(() => blockRefs.current.get(prev.blocks[idx - 1].id)?.focus(), 30);
 return updated;
 });
 }, [persist]);

 const changeBlockType = useCallback((blockId: string, type: BlockType) => {
 setNote(prev => {
 if (!prev) return prev;
 const clean = prev.blocks.find(b => b.id === blockId)?.content.replace(/^\/\S*/, '') ?? '';
 const newContent = type === 'table' ? makeTable() : clean;
 const updated = {...prev, blocks: prev.blocks.map(b => b.id === blockId ? {...b, type, content: newContent } : b), updatedAt: new Date().toISOString() };
 persist(updated);
 if (type !== 'table') setTimeout(() => { const el = blockRefs.current.get(blockId); if (el) { el.innerHTML = clean; el.focus(); } }, 30);
 return updated;
 });
 setSlashMenuBlockId(null);
 }, [persist]);

 const toggleCheck = useCallback((blockId: string) => {
 setNote(prev => {
 if (!prev) return prev;
 const updated = {...prev, blocks: prev.blocks.map(b => b.id === blockId ? {...b, checked: !b.checked } : b), updatedAt: new Date().toISOString() };
 persist(updated); return updated;
 });
 }, [persist]);

 const handleKeyDown = useCallback((e: React.KeyboardEvent, block: NoteBlock) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault(); setSlashMenuBlockId(null); addBlock(block.id);
 } else if (e.key === 'Backspace') {
 const el = blockRefs.current.get(block.id);
 if (el && !el.textContent) {
 e.preventDefault(); setSlashMenuBlockId(null);
 if (block.type !== 'text') changeBlockType(block.id, 'text'); else removeBlock(block.id);
 }
 } else if (e.key === '/') {
 const el = blockRefs.current.get(block.id);
 if (el && !el.textContent) setTimeout(() => setSlashMenuBlockId(block.id), 0);
 } else if (e.key === 'Escape') {
 setSlashMenuBlockId(null);
 }
 }, [addBlock, removeBlock, changeBlockType]);

 const handlePaletteSelect = useCallback((item: PaletteItem, afterId: string) => {
 if (item.type === 'ai') { if (pageMode) setTimeout(() => setShowAiFloating(true), 0); else textareaRef.current?.focus(); }
 else if (item.type === 'pdf') { fileInputRef.current?.click(); }
 else { addBlock(afterId, item.type as BlockType); }
 }, [addBlock, pageMode]);

 const handleAiSend = useCallback(() => {
 const prompt = aiInput.trim();
 if (!prompt || isAiLoading) return;
 setAiInput(''); setIsAiLoading(true);
 setAiSuggestion({ prompt, blocks: [], status: 'generating', source: 'ai' });
 setTimeout(() => {
 setAiSuggestion({ prompt, blocks: mockAiGenerate(prompt), status: 'ready', source: 'ai' });
 setIsAiLoading(false);
 }, 2000);
 }, [aiInput, isAiLoading]);

 const handleDirectInsert = useCallback(() => {
 const text = aiInput.trim();
 if (!text || !note) return;
 setAiInput('');
 const newId = genId();
 setNote(prev => {
 if (!prev) return prev;
 const updated = {...prev, blocks: [...prev.blocks, { id: newId, type: 'text' as BlockType, content: text }], updatedAt: new Date().toISOString() };
 persist(updated); return updated;
 });
 }, [aiInput, note, persist]);

 const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 e.target.value = '';
 const label = `Extracted from ${file.name}`;
 setAiSuggestion({ prompt: `Import ${file.name}`, blocks: [], status: 'generating', source: 'pdf', sourceLabel: label });
 setTimeout(() => {
 setAiSuggestion({ prompt: `Import ${file.name}`, blocks: mockPdfExtract(file.name), status: 'ready', source: 'pdf', sourceLabel: label });
 }, 2200);
 }, []);

 const handleAcceptSuggestion = useCallback((blocks: NoteBlock[]) => {
 setNote(prev => {
 if (!prev) return prev;
 const updated = {...prev, blocks: [...prev.blocks,...blocks], updatedAt: new Date().toISOString() };
 persist(updated); return updated;
 });
 setAiSuggestion(null);
 }, [persist]);

 const handleStartCall = useCallback(() => {
 setCallState('connecting'); setCallSeconds(0);
 setTimeout(() => {
 setCallState('recording');
 callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
 }, 1500);
 }, []);

 const handleStopCall = useCallback(() => {
 if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
 const duration = callSeconds;
 setCallState('processing');
 setTimeout(() => {
 setAiSuggestion({
 prompt: 'Call captured',
 blocks: mockCallCapture(duration),
 status: 'ready', source: 'call',
 sourceLabel: `Call captured (${fmtTime(duration)})`,
 });
 setCallState('idle');
 }, 1800);
 }, [callSeconds]);

 const handleVoice = useCallback(() => {
 if (isVoiceActive) { recognitionRef.current?.stop(); setIsVoiceActive(false); return; }
 const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 if (!SR) { setAiInput('Voice not supported — type your note instead.'); return; }
 const rec = new SR();
 rec.continuous = false; rec.interimResults = true;
 rec.onresult = (e: any) => setAiInput(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
 rec.onend = () => setIsVoiceActive(false);
 rec.onerror = () => setIsVoiceActive(false);
 recognitionRef.current = rec; rec.start(); setIsVoiceActive(true);
 }, [isVoiceActive]);

 const handleDictateIntoBlock = useCallback(() => {
 if (isDictating) { dictationRef.current?.stop(); setIsDictating(false); return; }
 const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 if (!SR) return;
 const targetId = activeBlockId ?? note?.blocks[note.blocks.length - 1]?.id;
 if (!targetId) return;
 // Focus target block and place cursor at end
 const focusEl = blockRefs.current.get(targetId);
 if (focusEl) {
 focusEl.focus();
 const sel = window.getSelection();
 if (sel) { sel.selectAllChildren(focusEl); sel.collapseToEnd(); }
 }
 const rec = new SR();
 rec.continuous = true;
 rec.interimResults = false;
 rec.onresult = (e: any) => {
 const finals = Array.from(e.results as any[])
.filter((r: any) => r.isFinal)
.map((r: any) => r[0].transcript)
.join(' ')
.trim();
 if (!finals) return;
 const el = blockRefs.current.get(targetId);
 if (!el) return;
 el.focus();
 const s = window.getSelection();
 if (s) { s.selectAllChildren(el); s.collapseToEnd(); }
 // insertText triggers the oninput → onContentChange sync
 document.execCommand('insertText', false, (el.textContent?.length ? ' ' : '') + finals);
 };
 rec.onend = () => setIsDictating(false);
 rec.onerror = () => setIsDictating(false);
 dictationRef.current = rec;
 rec.start();
 setIsDictating(true);
 }, [isDictating, activeBlockId, note]);

 const handleExport = useCallback(() => {
 if (!note) return;
 const sourceTag = (s?: NoteSource) => s && s !== 'manual' ? ` <span style="font-size:0.7rem;color:#999">[${s}]</span>` : '';
 const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#111}
h1{font-size:2rem;font-weight:700}h2{font-size:1.5rem;font-weight:600}h3{font-size:1.2rem;font-weight:500}
p{margin:4px 0;line-height:1.6}ul{margin:4px 0;padding-left:20px}li{margin:2px 0}
.meta{font-size:0.8rem;color:#666;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #eee}
.checklist{list-style:none;padding-left:0}hr{border:none;border-top:1px solid #ddd;margin:16px 0}
@media print{body{margin:0}}</style></head><body>
<h1>${note.title}</h1>
<div class="meta">Created by ${note.createdBy} · ${fmtDate(note.createdAt)} · Last updated ${fmtDate(note.updatedAt)}</div>
${note.blocks.map(b => {
 const s = sourceTag(b.source);
 if (b.type === 'h1') return `<h1>${b.content}${s}</h1>`;
 if (b.type === 'h2') return `<h2>${b.content}${s}</h2>`;
 if (b.type === 'h3') return `<h3>${b.content}${s}</h3>`;
 if (b.type === 'divider') return `<hr/>`;
 if (b.type === 'ul') return `<ul><li>${b.content}${s}</li></ul>`;
 if (b.type === 'checklist') return `<ul class="checklist"><li>${b.checked ? '☑' : '☐'} ${b.content}${s}</li></ul>`;
 return `<p>${b.content}${s}</p>`;
}).join('\n')}
</body></html>`;
 const w = window.open('', '_blank');
 if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
 }, [note]);

 useEffect(() => {
 if (!pageMode) return;
 window.addEventListener('notes-export-pdf', handleExport);
 return () => window.removeEventListener('notes-export-pdf', handleExport);
 }, [pageMode, handleExport]);

 useEffect(() => {
 if (!open || !pageMode) return;
 const handler = () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) { setShowRichToolbar(false); return; }
  const anchorNode = sel.anchorNode;
  const insideEditor = Array.from(blockRefs.current.values()).some(el => el?.contains(anchorNode));
  if (!insideEditor) { setShowRichToolbar(false); return; }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect.width && !rect.height) { setShowRichToolbar(false); return; }
  const toolbarH = 44;
  let x = rect.left + rect.width / 2;
  let y = rect.top - toolbarH - 6;
  x = Math.max(380, Math.min(window.innerWidth - 380, x));
  if (y < 10) y = rect.bottom + 6;
  setRichToolbarPos({ x, y });
  setShowRichToolbar(true);
 };
 document.addEventListener('selectionchange', handler);
 return () => document.removeEventListener('selectionchange', handler);
 }, [open, pageMode]); // eslint-disable-line

 const handleRichFormatAction = useCallback((action: string, value?: string) => {
 switch (action) {
  case 'bold': document.execCommand('bold', false); break;
  case 'italic': document.execCommand('italic', false); break;
  case 'underline': document.execCommand('underline', false); break;
  case 'strikethrough': document.execCommand('strikeThrough', false); break;
  case 'bulletList': document.execCommand('insertUnorderedList', false); break;
  case 'numberedList': document.execCommand('insertOrderedList', false); break;
  case 'alignLeft': document.execCommand('justifyLeft', false); break;
  case 'alignCenter': document.execCommand('justifyCenter', false); break;
  case 'alignRight': document.execCommand('justifyRight', false); break;
  case 'undo': document.execCommand('undo', false); break;
  case 'redo': document.execCommand('redo', false); break;
  case 'textStyle': if (value) document.execCommand('formatBlock', false, value); break;
 }
 }, []);

 const handleFormat = (cmd: string) => document.execCommand(cmd, false);
 const activeBlock = note?.blocks.find(b => b.id === activeBlockId);
 const olIndices = (blocks: NoteBlock[]) => {
 const map: Record<string, number> = {}; let count = 0;
 for (const b of blocks) { if (b.type === 'ol') map[b.id] = ++count; else count = 0; }
 return map;
 };

 return (
 <TooltipProvider>
 <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />

 <AnimatePresence>
 {open && (
 <>
 {!pageMode && (
 <motion.div className="fixed inset-0 z-40 bg-black/10"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }} onClick={handleClose} />
 )}

 <motion.div
 className={pageMode ? "flex flex-col h-full bg-background relative" : cn(
 "fixed top-0 right-0 z-50 h-full bg-background border-l border-border flex flex-col shadow-2xl overflow-hidden",
 isFullscreen ? "!w-screen !max-w-none rounded-none" : "rounded-l-2xl"
 )}
 style={pageMode ? undefined : (isFullscreen ? undefined : { width: 640, maxWidth: '98vw' })}
 initial={pageMode ? {} : { x: '100%', opacity: 0.6 }}
 animate={pageMode ? {} : { x: 0, opacity: 1 }}
 exit={pageMode ? {} : { x: '100%', opacity: 0.6 }}
 transition={pageMode ? {} : { type: 'spring', damping: 32, stiffness: 280, mass: 0.85 }}
 onClick={() => slashMenuBlockId && setSlashMenuBlockId(null)}
 >
 {/* ── Toolbar ── */}
 <div className={cn("flex items-center gap-0.5 px-3 py-2 border-b border-border flex-shrink-0 bg-background", pageMode && "hidden")}>
 <div className="flex items-center gap-0.5 flex-1 min-w-0">
 {activeBlock && activeBlock.type !== 'divider' && activeBlock.type !== 'table' ? (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="flex items-center gap-1 text-xs font-medium px-2 h-7 rounded hover:bg-muted transition-colors text-foreground min-w-[7.5rem] justify-between flex-shrink-0">
 <span>{BLOCK_LABELS[activeBlock.type]}</span>
 <ChevronDown className="h-3 w-3 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-40">
 {(Object.entries(BLOCK_LABELS) as [BlockType, string][]).filter(([k]) => k !== 'divider' && k !== 'table').map(([type, label]) => (
 <DropdownMenuItem key={type} className="text-xs" onClick={() => activeBlockId && changeBlockType(activeBlockId, type)}>
 {label}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 ) : (
 <span className="text-xs text-muted-foreground px-2 h-7 flex items-center min-w-[7.5rem] flex-shrink-0">Normal text</span>
 )}
 <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
 {(['bold', 'italic', 'underline', 'strikeThrough'] as const).map((cmd, i) => {
 const Icon = [Bold, Italic, Underline, Strikethrough][i];
 const title = ['Bold', 'Italic', 'Underline', 'Strikethrough'][i];
 return (
 <Tooltip key={cmd}>
 <TooltipTrigger asChild>
 <button onClick={() => handleFormat(cmd)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
 <Icon className="h-3.5 w-3.5" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
 </Tooltip>
 );
 })}
 <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
 {/* More actions dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
 <MoreHorizontal className="h-3.5 w-3.5" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-52">
 <DropdownMenuItem
 onClick={callState === 'recording' ? handleStopCall : handleStartCall}
 className={cn("flex items-center gap-2 text-sm cursor-pointer", callState === 'recording' && "text-red-500 focus:text-red-500 focus:bg-red-50")}>
 {callState === 'recording'
 ? <><PhoneOff className="h-4 w-4" /> Stop &amp; capture notes</>
 : callState !== 'idle'
 ? <><Loader2 className="h-4 w-4 animate-spin" /> {callState === 'connecting' ? 'Connecting…' : 'Processing…'}</>
 : <><Phone className="h-4 w-4" /> Live transcript / notes meeting</>
 }
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm cursor-pointer">
 <FileUp className="h-4 w-4" /> Import PDF / document
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={handleExport} className="flex items-center gap-2 text-sm cursor-pointer">
 <Download className="h-4 w-4" /> Export as PDF
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 {/* ── Window controls ── */}
 {!pageMode && <div className="flex items-center gap-1 shrink-0">
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={() => window.open(window.location.href, '_blank')} className="action-icon" aria-label="Open in new window">
 <ExternalLink size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-xs"><p>Open in new window</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={() => setIsFullscreen(v => !v)} className={cn("action-icon", isFullscreen && "action-icon-active")} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
 {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-xs"><p>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={handleClose} className="action-icon" aria-label="Minimize">
 <Minus size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-xs"><p>Minimize</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button onClick={handleClose} className="action-icon" aria-label="Close">
 <X size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-xs"><p>Close</p></TooltipContent>
 </Tooltip>
 </div>}
 </div>

 {/* ── Call recording banner ── */}
 <AnimatePresence>
 {callState !== 'idle' && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex-shrink-0 overflow-hidden">
 <div className={cn("flex items-center gap-3 px-4 py-2.5 text-sm border-b",
 callState === 'recording' ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400"
 : "bg-muted border-border text-muted-foreground"
 )}>
 {callState === 'connecting' && <><Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /><span>Connecting to call note-taker…</span></>}
 {callState === 'recording' && <>
 <span className="relative flex h-2 w-2 flex-shrink-0">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
 </span>
 <span className="font-medium">Recording call — {fmtTime(callSeconds)}</span>
 <button onClick={handleStopCall}
 className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0">
 <PhoneOff className="h-3 w-3" /> Stop &amp; capture
 </button>
 </>}
 {callState === 'processing' && <><Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /><span>Luka is processing call notes…</span></>}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* ── Editor ── */}
 <div className="flex-1 overflow-y-auto relative">
 {/* ── Floating dictation mic ── */}
 <AnimatePresence>
 {note && (
 <motion.div className="absolute bottom-6 right-6 z-10"
 initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
 transition={{ type: 'spring', damping: 22, stiffness: 320 }}>
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
 onClick={handleDictateIntoBlock}
 style={{
 width: 44, height: 44, borderRadius: '50%',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: isDictating ? 'hsl(var(--destructive))' : 'hsl(var(--background))',
 border: isDictating ? 'none' : '1px solid hsl(var(--border) / 0.7)',
 boxShadow: isDictating
 ? '0 0 0 6px hsl(var(--destructive) / 0.12), 0 4px 16px hsl(var(--destructive) / 0.3)'
 : '0 2px 12px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
 cursor: 'pointer', position: 'relative', overflow: 'visible',
 }}>
 {isDictating && (
 <motion.span
 style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'hsl(var(--destructive))' }}
 animate={{ scale: [1, 1.55, 1], opacity: [0.35, 0, 0.35] }}
 transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
 />
 )}
 {isDictating
 ? <MicOff width={18} height={18} style={{ color: 'hsl(var(--destructive-foreground))', position: 'relative', zIndex: 1 }} />
 : <Mic width={18} height={18} style={{ color: 'hsl(var(--foreground))' }} />
 }
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="left" className="text-xs">
 {isDictating ? 'Stop dictating' : 'Dictate into note'}
 </TooltipContent>
 </Tooltip>
 </motion.div>
 )}
 </AnimatePresence>

 {note && (() => {
 const olMap = olIndices(note.blocks);
 return (
 <div className="max-w-[560px] mx-auto px-8 pt-10 pb-6">
 <div ref={titleRef} contentEditable suppressContentEditableWarning
 className="text-[2rem] font-bold leading-tight text-foreground outline-none mb-3 empty:before:content-['Untitled'] empty:before:text-muted-foreground/25 empty:before:pointer-events-none break-words"
 onBlur={() => {
 const t = titleRef.current?.textContent?.trim() || noteName;
 setNote(prev => { if (!prev) return prev; const u = {...prev, title: t, updatedAt: new Date().toISOString() }; persist(u); return u; });
 }}
 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); blockRefs.current.get(note.blocks[0]?.id)?.focus(); } }}
 />
 <div className="flex flex-col gap-1.5 mb-8 pb-6 border-b border-border/50">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">P</div>
 <span>Creator</span>
 <span className="font-medium text-foreground">{note.createdBy}</span>
 </div>
 <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground flex-wrap">
 <span>Created <span className="text-foreground">{fmtDate(note.createdAt)}</span></span>
 <span>Last updated <span className="text-foreground">{fmtDate(note.updatedAt)}</span></span>
 </div>
 </div>
 <div>
 {note.blocks.map((block, idx) => (
 <BlockEditor key={block.id} block={block} olIndex={olMap[block.id] ?? 0}
 isFirst={idx === 0} onContentChange={updateBlockContent} onKeyDown={handleKeyDown}
 onFocus={setActiveBlockId} onAddAfter={addBlock} onToggleCheck={toggleCheck}
 showSlashMenu={slashMenuBlockId === block.id}
 onSlashSelect={type => changeBlockType(block.id, type)}
 onPaletteSelect={handlePaletteSelect} registerRef={registerRef}
 />
 ))}
 </div>
 <div className="mt-2 min-h-[60px] cursor-text" onClick={e => {
 e.stopPropagation();
 const last = note.blocks[note.blocks.length - 1];
 if (last && last.type !== 'divider' && last.type !== 'table') blockRefs.current.get(last.id)?.focus();
 }} />
 <AnimatePresence>
 {aiSuggestion && (
 <AISuggestionCard suggestion={aiSuggestion}
 onAccept={handleAcceptSuggestion} onDiscard={() => setAiSuggestion(null)} />
 )}
 </AnimatePresence>
 </div>
 );
 })()}
 </div>

 {/* ── AI Input Bar ── */}
 <div className={cn("flex-shrink-0 bg-background", pageMode ? "px-4 pb-3 pt-2" : "px-4 pb-4 pt-2 border-t border-border")}>
 <div className={pageMode ? "" : "luka-input-wrapper"}>
 {!pageMode && isVoiceActive && (
 <div className="flex items-center gap-2 px-1 pb-1">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
 </span>
 <span className="text-xs text-red-500 font-medium">Recording… speak your note</span>
 </div>
 )}
 {!pageMode && <textarea ref={textareaRef} value={aiInput}
 onChange={e => setAiInput(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDirectInsert(); } }}
 placeholder={isVoiceActive ? '' : "Type / for prompts or just ask anything..."}
 rows={1}
 className="luka-input luka-input-autoresize"
 style={{ maxHeight: 120 }}
 />}
 <div className={pageMode ? "flex items-center" : "flex items-center justify-between pt-1 px-1"}>
 <div className="flex items-center gap-2">
 {/* + block palette */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.92 }}
 style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border) / 0.6)', boxShadow: 'rgba(0,0,0,0.06) 0px 1px 3px', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s' }}>
 <Plus width={15} height={15} />
 </motion.button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" side="top" className="w-52 py-1.5 mb-1">
 {PALETTE_ITEMS.map((item, idx) => (
 <React.Fragment key={item.type}>
 {idx === 2 && <DropdownMenuSeparator />}
 <DropdownMenuItem className="flex items-center gap-2.5 text-sm cursor-pointer" onClick={() => {
 if (item.type === 'ai') { if (pageMode) setTimeout(() => setShowAiFloating(true), 0); else textareaRef.current?.focus(); }
 else if (item.type === 'pdf') fileInputRef.current?.click();
 else if (note) {
 const lastId = note.blocks[note.blocks.length - 1]?.id;
 if (lastId) addBlock(lastId, item.type as BlockType);
 }
 }}>
 <span className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
 item.type === 'ai' ? "bg-gradient-to-br from-[#8649F1] to-[#B084FF]" : "bg-muted"
 )}>
 <span className={item.type === 'ai' ? "text-white [&>svg]:text-white" : "text-muted-foreground"}>{item.icon}</span>
 </span>
 {item.label}
 </DropdownMenuItem>
 </React.Fragment>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 <div className={cn("flex items-center gap-1.5", pageMode && "hidden")}>
 {/* Wand — Luka AI generate */}
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={aiInput.trim() ? { scale: 1.06 } : {}}
 whileTap={aiInput.trim() ? { scale: 0.9 } : {}}
 onClick={handleAiSend}
 disabled={!aiInput.trim() || isAiLoading}
 style={{
 width: 30, height: 30, borderRadius: 8,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: 'hsl(var(--background))',
 border: '1px solid hsl(var(--border) / 0.6)',
 boxShadow: 'rgba(0,0,0,0.06) 0px 1px 3px',
 cursor: aiInput.trim() ? 'pointer' : 'default',
 transition: 'background 0.2s, border-color 0.2s',
 color: aiInput.trim() ? '#8649F1' : 'hsl(var(--muted-foreground))',
 opacity: aiInput.trim() ? 1 : 0.45,
 }}>
 {isAiLoading
 ? <Loader2 width={15} height={15} className="animate-spin" style={{ color: '#8649F1' }} />
 : <Wand2 width={15} height={15} />}
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Generate with Luka AI</TooltipContent>
 </Tooltip>

 {/* Mic — voice to notes */}
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
 onClick={handleVoice}
 style={{
 width: 30, height: 30, borderRadius: 8,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: isVoiceActive ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--background))',
 border: isVoiceActive ? '1px solid hsl(var(--destructive) / 0.4)' : '1px solid hsl(var(--border) / 0.6)',
 boxShadow: 'rgba(0,0,0,0.06) 0px 1px 3px',
 cursor: 'pointer',
 transition: 'background 0.2s, border-color 0.2s',
 color: isVoiceActive ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
 }}>
 {isVoiceActive ? <MicOff width={15} height={15} /> : <Mic width={15} height={15} />}
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">{isVoiceActive ? 'Stop recording' : 'Voice to notes'}</TooltipContent>
 </Tooltip>

 {/* Send — insert as text */}
 <Tooltip>
 <TooltipTrigger asChild>
 <motion.button
 whileHover={aiInput.trim() ? { scale: 1.06 } : {}}
 whileTap={aiInput.trim() ? { scale: 0.9 } : {}}
 onClick={handleDirectInsert}
 disabled={!aiInput.trim()}
 style={{
 width: 30, height: 30, borderRadius: 8,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: aiInput.trim() ? 'hsl(var(--primary))' : 'hsl(var(--background))',
 border: aiInput.trim() ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border) / 0.6)',
 boxShadow: aiInput.trim() ? '0 1px 4px hsl(var(--primary) / 0.35)' : 'rgba(0,0,0,0.06) 0px 1px 3px',
 cursor: aiInput.trim() ? 'pointer' : 'default',
 transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
 color: aiInput.trim() ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
 opacity: aiInput.trim() ? 1 : 0.45,
 }}>
 <Send width={15} height={15} />
 </motion.button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Insert as note</TooltipContent>
 </Tooltip>
 </div>
 </div>
 </div>
 </div>

 {pageMode && showRichToolbar && (
 <RichTextToolbar
  position={richToolbarPos}
  onFormatAction={handleRichFormatAction}
  toolbarRef={richToolbarRef}
 />
 )}

 {pageMode && showAiFloating && (
 <motion.div
  initial={{ opacity: 0, y: 10, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 10, scale: 0.97 }}
  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
  className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[520px] max-w-[calc(100%-3rem)] z-50 shadow-xl"
  style={{ padding: '1.5px', borderRadius: '14px', background: 'linear-gradient(135deg, #8649F1, #B084FF)' }}
 >
  {/* Close button attached to top-right corner */}
  <button
   onClick={() => { setShowAiFloating(false); setAiInput(''); }}
   style={{
    position: 'absolute', top: -10, right: -10,
    width: 22, height: 22, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #8649F1, #B084FF)',
    border: '1.5px solid hsl(var(--background))',
    cursor: 'pointer', zIndex: 1,
    color: '#fff',
   }}>
   <X width={11} height={11} strokeWidth={2.5} />
  </button>
  <div className="luka-input-wrapper" style={{ border: 'none', borderRadius: '12.5px', padding: '0.75rem' }}>
   <textarea
    autoFocus
    value={aiInput}
    onChange={e => setAiInput(e.target.value)}
    onKeyDown={e => {
     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); setShowAiFloating(false); }
     if (e.key === 'Escape') { setShowAiFloating(false); setAiInput(''); }
    }}
    placeholder="What would you like Luka to generate?"
    rows={2}
    className="luka-input luka-input-autoresize"
    style={{ maxHeight: 120 }}
   />
   <div className="flex items-center justify-end pt-1 px-1">
    <motion.button
     whileHover={aiInput.trim() ? { scale: 1.06 } : {}}
     whileTap={aiInput.trim() ? { scale: 0.9 } : {}}
     onClick={() => { handleAiSend(); setShowAiFloating(false); }}
     disabled={!aiInput.trim() || isAiLoading}
     style={{
      width: 30, height: 30, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border) / 0.6)',
      boxShadow: 'rgba(0,0,0,0.06) 0px 1px 3px',
      cursor: aiInput.trim() ? 'pointer' : 'default',
      color: aiInput.trim() ? '#8649F1' : 'hsl(var(--muted-foreground))',
      opacity: aiInput.trim() ? 1 : 0.45,
     }}>
     {isAiLoading ? <Loader2 width={15} height={15} className="animate-spin" style={{ color: '#8649F1' }} /> : <Wand2 width={15} height={15} />}
    </motion.button>
   </div>
  </div>
 </motion.div>
 )}

 </motion.div>
 </>
 )}
 </AnimatePresence>
 </TooltipProvider>
 );
}
