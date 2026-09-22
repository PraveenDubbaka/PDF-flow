import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Mic, MicOff, RefreshCw, Minimize2, Wand2, FileText, PenLine, Loader2, PencilLine } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RichTextToolbar } from './RichTextToolbar';

interface AIOption {
 id: string;
 label: string;
 icon: React.ReactNode;
 description: string;
}

const aiOptions: AIOption[] = [
 { id: 'replace-we', label: "Replace 'We' with 'I'", icon: <RefreshCw className="h-4 w-4" />, description: "Change first person plural to singular" },
 { id: 'shorter', label: 'Make Shorter', icon: <Minimize2 className="h-4 w-4" />, description: "Condense the text while keeping meaning" },
 { id: 'improve', label: 'Improve Writing', icon: <Wand2 className="h-4 w-4" />, description: "Enhance grammar and clarity" },
 { id: 'summarize', label: 'Generate Summary', icon: <FileText className="h-4 w-4" />, description: "Create a brief summary" },
 { id: 'draft', label: 'Generate Draft Answer', icon: <PenLine className="h-4 w-4" />, description: "Start fresh with AI-generated content" }
];

interface AITextareaProps {
 value: string;
 onChange: (value: string) => void;
 placeholder?: string;
 disabled?: boolean;
 className?: string;
 minHeight?: string;
 defaultHeight?: string;
 isCompactMode?: boolean;
 maxLength?: number;
 onPlaceholderChange?: (newPlaceholder: string) => void;
 onAIGenerate?: () => void;
}

export function AITextarea({ 
 value, 
 onChange, 
 placeholder = "Enter your detailed answer...", 
 disabled = false,
 className,
 minHeight = "100px",
 defaultHeight = "120px",
 isCompactMode = false,
 maxLength = 500,
 onPlaceholderChange,
 onAIGenerate
}: AITextareaProps) {
 const [isAIOpen, setIsAIOpen] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [selectedOption, setSelectedOption] = useState<string | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [showToolbar, setShowToolbar] = useState(false);
 const [isEditingPlaceholder, setIsEditingPlaceholder] = useState(false);
 const [placeholderDraft, setPlaceholderDraft] = useState(placeholder);
 const editorRef = useRef<HTMLDivElement>(null);

 // Sync placeholderDraft when placeholder prop changes (e.g. after save/reload)
 useEffect(() => {
 setPlaceholderDraft(placeholder);
 }, [placeholder]);
 const containerRef = useRef<HTMLDivElement>(null);
 const toolbarRef = useRef<HTMLDivElement>(null);
 const placeholderInputRef = useRef<HTMLInputElement>(null);

 // Handle click outside to exit edit mode
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 const target = event.target as Node;
 if (
 containerRef.current && 
 !containerRef.current.contains(target) &&
 !isAIOpen &&
 !(toolbarRef.current && toolbarRef.current.contains(target))
 ) {
 setIsEditing(false);
 setShowToolbar(false);
 }
 };

 if (isEditing) {
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }
 }, [isEditing, isAIOpen]);

 const updateToolbarPosition = useCallback(() => {
 if (editorRef.current) {
 const rect = editorRef.current.getBoundingClientRect();
 const toolbarHeight = 40;
 setToolbarPosition({
 x: rect.left + rect.width / 2,
 y: rect.top - toolbarHeight - 4,
 });
 }
 }, []);

 const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

 // Focus editor when entering edit mode
 useEffect(() => {
 if (isEditing && editorRef.current) {
 editorRef.current.focus();
 updateToolbarPosition();
 setShowToolbar(true);
 }
 }, [isEditing, updateToolbarPosition]);

 const { isListening, transcript, toggleListening, isSupported, error } = useVoiceToText({
 onResult: (result) => {
 const newValue = value ? `${value} ${result}` : result;
 onChange(newValue);
 if (editorRef.current) {
 editorRef.current.innerHTML = newValue;
 }
 },
 continuous: true,
 language: 'en-US'
 });

 useEffect(() => {
 if (isListening && transcript) {
 // Show interim transcript
 }
 }, [transcript, isListening]);

 const handleAIOptionClick = async (optionId: string) => {
 setSelectedOption(optionId);
 setIsProcessing(true);

 try {
 const { data, error: fnError } = await supabase.functions.invoke('ai-text-improve', {
 body: { text: value, action: optionId }
 });

 if (fnError) { console.error('AI function error:', fnError); toast.error('Failed to process text. Please try again.'); return; }
 if (data?.error) { console.error('AI service error:', data.error); toast.error(data.error); return; }
 if (data?.result) {
 onChange(data.result);
 onAIGenerate?.();
 if (editorRef.current) { editorRef.current.innerHTML = data.result; }
 toast.success('Text updated successfully!');
 }
 } catch (err) {
 console.error('Error calling AI service:', err);
 toast.error('Failed to connect to AI service.');
 } finally {
 setIsProcessing(false);
 setSelectedOption(null);
 setIsAIOpen(false);
 }
 };

 const handleEnterEditMode = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!disabled && !isEditingPlaceholder) {
 setIsEditing(true);
 }
 };

 const handlePlaceholderDoubleClick = (e: React.MouseEvent) => {
 e.stopPropagation();
 e.preventDefault();
 if (onPlaceholderChange && !disabled && !value) {
 setPlaceholderDraft(placeholder);
 setIsEditingPlaceholder(true);
 setTimeout(() => placeholderInputRef.current?.focus(), 0);
 }
 };

 const handlePlaceholderSave = () => {
 if (onPlaceholderChange && placeholderDraft.trim()) {
 onPlaceholderChange(placeholderDraft.trim());
 }
 setIsEditingPlaceholder(false);
 };

 const handlePlaceholderKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handlePlaceholderSave();
 } else if (e.key === 'Escape') {
 e.preventDefault();
 setIsEditingPlaceholder(false);
 }
 };

 const handleInput = () => {
 if (editorRef.current) {
 const text = editorRef.current.textContent || '';
 if (text.length > maxLength) {
 const selection = window.getSelection();
 const range = selection?.getRangeAt(0);
 const cursorPosition = range?.startOffset || 0;
 editorRef.current.textContent = text.substring(0, maxLength);
 if (selection && editorRef.current.firstChild) {
 const newRange = document.createRange();
 newRange.setStart(editorRef.current.firstChild, Math.min(cursorPosition, maxLength));
 newRange.collapse(true);
 selection.removeAllRanges();
 selection.addRange(newRange);
 }
 }
 onChange(editorRef.current.innerHTML);
 }
 };

 const handleFormatAction = (action: string, formatValue?: string) => {
 if (!editorRef.current) return;
 editorRef.current.focus();

 switch (action) {
 case 'bold': document.execCommand('bold', false); break;
 case 'italic': document.execCommand('italic', false); break;
 case 'underline': document.execCommand('underline', false); break;
 case 'superscript': document.execCommand('superscript', false); break;
 case 'bulletList': document.execCommand('insertUnorderedList', false); break;
 case 'numberedList': document.execCommand('insertOrderedList', false); break;
 case 'alignLeft': document.execCommand('justifyLeft', false); break;
 case 'alignCenter': document.execCommand('justifyCenter', false); break;
 case 'alignRight': document.execCommand('justifyRight', false); break;
 case 'textStyle': document.execCommand('formatBlock', false, formatValue); break;
 case 'textColor': document.execCommand('foreColor', false, formatValue); break;
 case 'undo': document.execCommand('undo', false); break;
 case 'redo': document.execCommand('redo', false); break;
 }
 handleInput();
 };

 // Shared classes for BOTH view and edit — identical box model so no height jump
 const sharedBoxClasses = cn(
 "text-sm p-1.5 border-2 border-transparent rounded-md box-border",
 isCompactMode ? "truncate overflow-hidden whitespace-nowrap" : "min-h-[2.5rem] whitespace-pre-wrap",
 );

 // Render text display when not editing (matches question text behavior)
 if (!isEditing && !disabled) {
 if (isCompactMode && value) {
 return (
 <Tooltip>
 <TooltipTrigger asChild>
 <div 
 ref={containerRef}
 className={cn("relative w-full", className)}
 onClick={handleEnterEditMode}
 >
 <div
 className={cn(
 sharedBoxClasses,
 "cursor-text text-foreground hover:text-foreground",
 !value && "text-muted-foreground italic"
 )}
 dangerouslySetInnerHTML={{ __html: value || placeholder }}
 />
 </div>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-popover text-popover-foreground border border-border shadow-lg max-w-md whitespace-pre-wrap">
 <div dangerouslySetInnerHTML={{ __html: value }} />
 </TooltipContent>
 </Tooltip>
 );
 }

 return (
 <div 
 ref={containerRef}
 className={cn("relative w-full h-full group/placeholder", className)}
 onClick={handleEnterEditMode}
 >
 {isEditingPlaceholder ? (
 <div className={cn(sharedBoxClasses, "pr-16 flex items-center")} onClick={(e) => e.stopPropagation()}>
 <input
 ref={placeholderInputRef}
 type="text"
 value={placeholderDraft}
 onChange={(e) => setPlaceholderDraft(e.target.value)}
 onBlur={handlePlaceholderSave}
 onKeyDown={handlePlaceholderKeyDown}
 className="flex-1 bg-transparent text-sm text-muted-foreground italic outline-none border-b border-primary/40 focus:border-primary"
 />
 </div>
 ) : (
 <div
 className={cn(
 sharedBoxClasses,
 "pr-16 cursor-text text-foreground hover:text-foreground",
 !value && "text-muted-foreground italic"
 )}
 >
 {value ? (
 <span dangerouslySetInnerHTML={{ __html: value }} />
 ) : (
 <span className="flex items-center gap-1.5">
 <span onDoubleClick={handlePlaceholderDoubleClick}>{placeholder}</span>
 {onPlaceholderChange && (
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); handlePlaceholderDoubleClick(e); }}
 className="opacity-0 group-hover/placeholder:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
 >
 <PencilLine className="h-3 w-3 text-muted-foreground" />
 </button>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">Edit placeholder text</TooltipContent>
 </Tooltip>
 )}
 </span>
 )}
 </div>
 )}
 </div>
 );
 }

 return (
 <div ref={containerRef} className={cn("relative w-full h-full", className)}>
 {/* Rich Text Toolbar — floating above */}
 {showToolbar && !disabled && (
 <RichTextToolbar
 position={toolbarPosition}
 onFormatAction={handleFormatAction}
 toolbarRef={toolbarRef}
 />
 )}

 {/* Editable Content — same sizing as the read-only view */}
 <div className="relative w-full">
 <div
 ref={editorRef}
 contentEditable={!disabled && !isListening}
 suppressContentEditableWarning
 onInput={handleInput}
 onClick={(e) => e.stopPropagation()}
 className={cn(
 "w-full pr-16 text-sm bg-transparent border-2 border-transparent text-foreground rounded-md p-1.5 outline-none resize-none box-border",
 isCompactMode ? "max-h-[2.5rem] overflow-hidden whitespace-nowrap" : "min-h-[2.5rem] overflow-y-auto",
 isListening && "ring-1 ring-primary",
 disabled && "opacity-60"
 )}
 style={{ width: '100%' }}
 dangerouslySetInnerHTML={{ __html: value }}
 />
 
 {/* Action buttons — bottom right inside editor area */}
 {!disabled && (
 <div className="absolute bottom-1 right-1 flex items-center gap-1">
 {/* AI Button */}
 <Popover open={isAIOpen} onOpenChange={setIsAIOpen}>
 <PopoverTrigger asChild>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setIsAIOpen(!isAIOpen); }}
 className={cn(
 "p-1.5 rounded-md transition-all hover:bg-muted",
 isAIOpen ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
 )}
 title="AI Assistant"
 >
 <Sparkles className="h-4 w-4" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-72 p-2 bg-card" align="end" side="top" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center gap-2 px-3 py-2 mb-1">
 <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
 <Wand2 className="h-3.5 w-3.5 text-white" />
 </div>
 <span className="font-medium text-sm">AI Assistant</span>
 </div>
 <div className="space-y-1">
 {aiOptions.map((option) => (
 <button
 key={option.id}
 onClick={() => handleAIOptionClick(option.id)}
 disabled={isProcessing}
 className={cn(
 "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
 selectedOption === option.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
 isProcessing && selectedOption !== option.id && "opacity-50"
 )}
 >
 <div className={cn("text-muted-foreground", selectedOption === option.id && "text-primary")}>
 {isProcessing && selectedOption === option.id ? <Loader2 className="h-4 w-4 animate-spin" /> : option.icon}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{option.label}</p>
 <p className="text-xs text-muted-foreground truncate">{option.description}</p>
 </div>
 </button>
 ))}
 </div>
 </PopoverContent>
 </Popover>

 {/* Voice to Text */}
 {isSupported && (
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); toggleListening(); }}
 className={cn(
 "p-1.5 rounded-md transition-all",
 isListening ? "bg-destructive/10 text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
 )}
 title={isListening ? "Stop recording" : "Voice to text"}
 >
 {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
 </button>
 )}
 </div>
 )}
 </div>

 {/* Listening indicator */}
 {isListening && (
 <div className="flex items-center gap-1.5 text-xs text-primary mt-1">
 <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
 Listening...
 </div>
 )}

 {/* Error message */}
 {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
 </div>
 );
}
