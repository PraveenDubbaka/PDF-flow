import { useRef, useEffect, useState, useCallback } from 'react';
import { RichTextToolbar } from './RichTextToolbar';

interface RichTextQuestionEditorProps {
 value: string;
 onChange: (value: string) => void;
 onBlur: () => void;
 onCancel: () => void;
 className?: string;
}

export function RichTextQuestionEditor({
 value,
 onChange,
 onBlur,
 onCancel,
 className = '',
}: RichTextQuestionEditorProps) {
 const editorRef = useRef<HTMLDivElement>(null);
 const toolbarRef = useRef<HTMLDivElement>(null);
 const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

 // Initialize editor content
 useEffect(() => {
 if (editorRef.current && editorRef.current.innerHTML !== value) {
 editorRef.current.innerHTML = value;
 }
 }, []);

 // Focus editor on mount and position toolbar
 useEffect(() => {
 if (editorRef.current) {
 editorRef.current.focus();
 const range = document.createRange();
 const sel = window.getSelection();
 range.selectNodeContents(editorRef.current);
 range.collapse(false);
 sel?.removeAllRanges();
 sel?.addRange(range);

 const rect = editorRef.current.getBoundingClientRect();
 const toolbarWidth = 700;
 const toolbarHeight = 40;
 let x = rect.left + rect.width / 2;
 let y = rect.top - toolbarHeight - 4;
 const minX = toolbarWidth / 2 + 10;
 const maxX = window.innerWidth - toolbarWidth / 2 - 10;
 x = Math.max(minX, Math.min(maxX, x));
 if (y < 10) y = rect.bottom + 4;
 setToolbarPosition({ x, y });
 }
 }, []);

 const handleInput = useCallback(() => {
 if (editorRef.current) {
 onChange(editorRef.current.innerHTML);
 }
 }, [onChange]);

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Escape') {
 e.preventDefault();
 onCancel();
 }
 if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
 e.preventDefault();
 onBlur();
 }
 };

 const handleClickOutside = useCallback((e: MouseEvent) => {
 const target = e.target as Node;
 if (editorRef.current?.contains(target)) return;
 if (toolbarRef.current?.contains(target)) return;
 const radixContent = (e.target as Element)?.closest('[data-radix-menu-content]');
 if (radixContent) return;
 const richTextToolbar = (e.target as Element)?.closest('[data-rich-text-toolbar]');
 if (richTextToolbar) return;
 onBlur();
 }, [onBlur]);

 useEffect(() => {
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [handleClickOutside]);

 const handleFormatAction = (action: string, value?: string) => {
 const editor = editorRef.current;
 if (!editor) return;
 editor.focus();

 switch (action) {
 case 'bold': document.execCommand('bold', false); break;
 case 'italic': document.execCommand('italic', false); break;
 case 'underline': document.execCommand('underline', false); break;
 case 'strikethrough': document.execCommand('strikeThrough', false); break;
 case 'code': {
 const selection = window.getSelection();
 if (selection && selection.rangeCount > 0) {
 const range = selection.getRangeAt(0);
 const selectedText = range.toString();
 if (selectedText) {
 const code = document.createElement('code');
 code.textContent = selectedText;
 range.deleteContents();
 range.insertNode(code);
 }
 }
 break;
 }
 case 'removeFormatting': document.execCommand('removeFormat', false); break;
 case 'link': {
 const url = prompt('Enter URL:');
 if (url) document.execCommand('createLink', false, url);
 break;
 }
 case 'superscript': document.execCommand('superscript', false); break;
 case 'bulletList': document.execCommand('insertUnorderedList', false); break;
 case 'numberedList': document.execCommand('insertOrderedList', false); break;
 case 'checkList': document.execCommand('insertHTML', false, '☐ '); break;
 case 'alignLeft': document.execCommand('justifyLeft', false); break;
 case 'alignCenter': document.execCommand('justifyCenter', false); break;
 case 'alignRight': document.execCommand('justifyRight', false); break;
 case 'undo': document.execCommand('undo', false); break;
 case 'redo': document.execCommand('redo', false); break;
 case 'textStyle': if (value) document.execCommand('formatBlock', false, value); break;
 case 'textColor': if (value) document.execCommand('foreColor', false, value); break;
 }
 handleInput();
 };

 return (
 <>
 <RichTextToolbar
 position={toolbarPosition}
 onFormatAction={handleFormatAction}
 toolbarRef={toolbarRef}
 />
 <div
 ref={editorRef}
 contentEditable
 onInput={handleInput}
 onKeyDown={handleKeyDown}
 className={`question-content outline-none border-2 border-transparent rounded-md p-1.5 bg-transparent overflow-y-auto resize-none box-border ${className}`}
 suppressContentEditableWarning
 />
 </>
 );
}
