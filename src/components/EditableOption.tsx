import { useState, useRef, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EditableOptionProps {
 value: string;
 index: number;
 isSelected: boolean;
 onUpdate: (value: string) => void;
 onRemove: () => void;
 onSelect: () => void;
 type: 'radio' | 'checkbox';
}

export function EditableOption({
 value,
 index,
 isSelected,
 onUpdate,
 onRemove,
 onSelect,
 type,
}: EditableOptionProps) {
 const [isEditing, setIsEditing] = useState(false);
 const [editValue, setEditValue] = useState(value);
 const inputRef = useRef<HTMLInputElement>(null);

 // Sync editValue with prop value when it changes externally
 useEffect(() => {
 setEditValue(value);
 }, [value]);

 useEffect(() => {
 if (isEditing && inputRef.current) {
 inputRef.current.focus();
 inputRef.current.select();
 }
 }, [isEditing]);

 const handleSave = () => {
 const trimmed = editValue.trim();
 if (trimmed && trimmed !== value) {
 onUpdate(trimmed);
 } else if (!trimmed) {
 setEditValue(value);
 }
 setIsEditing(false);
 };

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleSave();
 } else if (e.key === 'Escape') {
 setEditValue(value);
 setIsEditing(false);
 }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setEditValue(e.target.value);
 };

 return (
 <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted transition-colors group">
 {/* Drag handle */}
 <button className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity">
 <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>

 {/* Selection indicator */}
 <div 
 className={`w-4 h-4 flex items-center justify-center cursor-pointer transition-all ${
 type === 'radio' ? 'rounded-full' : 'rounded'
 } border-2 ${
 isSelected 
 ? 'border-primary bg-primary' 
 : 'border-muted-foreground/50 hover:border-primary/50'
 }`}
 onClick={onSelect}
 >
 {isSelected && (
 type === 'radio' 
 ? <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
 : <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
 </svg>
 )}
 </div>

 {/* Editable text */}
 {isEditing ? (
 <Input
 ref={inputRef}
 value={editValue}
 onChange={handleChange}
 onBlur={handleSave}
 onKeyDown={handleKeyDown}
 className="h-7 text-sm flex-1"
 />
 ) : (
 <span 
 className="text-sm text-foreground flex-1 cursor-text hover:bg-muted-foreground/10 px-1 py-0.5 -mx-1 rounded transition-colors"
 onClick={() => setIsEditing(true)}
 >
 {value}
 </span>
 )}

 {/* Remove button */}
 <button 
 onClick={onRemove}
 className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 );
}
