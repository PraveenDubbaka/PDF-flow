import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

interface ToolbarState {
 isVisible: boolean;
 position: { x: number; y: number };
 targetElement: HTMLTextAreaElement | HTMLInputElement | null;
}

interface RichTextToolbarContextType {
 toolbarState: ToolbarState;
 showToolbar: (element: HTMLTextAreaElement | HTMLInputElement) => void;
 hideToolbar: () => void;
 handleFormatAction: (action: string, value?: string) => void;
 toolbarRef: React.RefObject<HTMLDivElement>;
}

const RichTextToolbarContext = createContext<RichTextToolbarContextType | null>(null);

export function RichTextToolbarProvider({ children }: { children: ReactNode }) {
 const [toolbarState, setToolbarState] = useState<ToolbarState>({
 isVisible: false,
 position: { x: 0, y: 0 },
 targetElement: null,
 });
 
 const toolbarRef = useRef<HTMLDivElement>(null);

 const showToolbar = useCallback((element: HTMLTextAreaElement | HTMLInputElement) => {
 const rect = element.getBoundingClientRect();
 const toolbarWidth = 700;
 
 let x = rect.left + rect.width / 2;
 let y = rect.top - 50;
 
 const minX = toolbarWidth / 2 + 10;
 const maxX = window.innerWidth - toolbarWidth / 2 - 10;
 x = Math.max(minX, Math.min(maxX, x));
 
 if (y < 10) {
 y = rect.bottom + 10;
 }
 
 setToolbarState({
 isVisible: true,
 position: { x, y },
 targetElement: element,
 });
 }, []);

 const hideToolbar = useCallback(() => {
 setToolbarState(prev => ({
...prev,
 isVisible: false,
 targetElement: null,
 }));
 }, []);

 // Click outside handler
 useEffect(() => {
 if (!toolbarState.isVisible) return;

 const handleClickOutside = (event: MouseEvent) => {
 const target = event.target as Node;
 
 // Don't hide if clicking inside toolbar
 if (toolbarRef.current?.contains(target)) {
 return;
 }
 
 // Don't hide if clicking inside the target element
 if (toolbarState.targetElement?.contains(target)) {
 return;
 }
 
 // Don't hide if clicking on Radix menu content (dropdowns)
 const radixContent = (event.target as Element)?.closest('[data-radix-menu-content]');
 if (radixContent) {
 return;
 }
 
 hideToolbar();
 };

 // Use mousedown for immediate response
 document.addEventListener('mousedown', handleClickOutside);
 
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
 };
 }, [toolbarState.isVisible, toolbarState.targetElement, hideToolbar]);

 const handleFormatAction = useCallback((action: string, value?: string) => {
 const element = toolbarState.targetElement;
 if (!element) return;

 const start = element.selectionStart || 0;
 const end = element.selectionEnd || 0;
 const text = element.value;
 const selectedText = text.substring(start, end);

 let newText = text;
 let newCursorPos = end;

 switch (action) {
 case 'bold':
 newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
 newCursorPos = end + 4;
 break;
 case 'italic':
 newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
 newCursorPos = end + 2;
 break;
 case 'underline':
 newText = text.substring(0, start) + `__${selectedText}__` + text.substring(end);
 newCursorPos = end + 4;
 break;
 case 'strikethrough':
 newText = text.substring(0, start) + `~~${selectedText}~~` + text.substring(end);
 newCursorPos = end + 4;
 break;
 case 'code':
 newText = text.substring(0, start) + `\`${selectedText}\`` + text.substring(end);
 newCursorPos = end + 2;
 break;
 case 'link':
 newText = text.substring(0, start) + `[${selectedText}](url)` + text.substring(end);
 newCursorPos = end + 7;
 break;
 case 'superscript':
 newText = text.substring(0, start) + `^${selectedText}^` + text.substring(end);
 newCursorPos = end + 2;
 break;
 case 'bulletList':
 const bulletLines = selectedText.split('\n').map(line => `• ${line}`).join('\n');
 newText = text.substring(0, start) + bulletLines + text.substring(end);
 newCursorPos = start + bulletLines.length;
 break;
 case 'numberedList':
 const numberedLines = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
 newText = text.substring(0, start) + numberedLines + text.substring(end);
 newCursorPos = start + numberedLines.length;
 break;
 case 'checkList':
 const checkLines = selectedText.split('\n').map(line => `☐ ${line}`).join('\n');
 newText = text.substring(0, start) + checkLines + text.substring(end);
 newCursorPos = start + checkLines.length;
 break;
 case 'removeFormatting':
 const cleanText = selectedText
.replace(/\*\*/g, '')
.replace(/\*/g, '')
.replace(/__/g, '')
.replace(/~~/g, '')
.replace(/`/g, '')
.replace(/\^/g, '');
 newText = text.substring(0, start) + cleanText + text.substring(end);
 newCursorPos = start + cleanText.length;
 break;
 }

 const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
 element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
 'value'
 )?.set;
 
 if (nativeInputValueSetter) {
 nativeInputValueSetter.call(element, newText);
 const event = new Event('input', { bubbles: true });
 element.dispatchEvent(event);
 }

 element.focus();
 element.setSelectionRange(newCursorPos, newCursorPos);
 }, [toolbarState.targetElement]);

 return (
 <RichTextToolbarContext.Provider value={{ toolbarState, showToolbar, hideToolbar, handleFormatAction, toolbarRef }}>
 {children}
 </RichTextToolbarContext.Provider>
 );
}

export function useRichTextToolbarContext() {
 const context = useContext(RichTextToolbarContext);
 if (!context) {
 throw new Error('useRichTextToolbarContext must be used within a RichTextToolbarProvider');
 }
 return context;
}
