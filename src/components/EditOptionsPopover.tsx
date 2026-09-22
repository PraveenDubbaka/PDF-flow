import { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Plus, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EditOptionsPopoverProps {
 options: string[];
 onSave: (options: string[]) => void;
 children?: React.ReactNode;
}

export function EditOptionsPopover({ options, onSave, children }: EditOptionsPopoverProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [editOptions, setEditOptions] = useState<string[]>([]);
 const [newOption, setNewOption] = useState('');
 const newOptionRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (isOpen) {
 setEditOptions([...options]);
 setNewOption('');
 }
 }, [isOpen, options]);

 const handleUpdate = (index: number, value: string) => {
 const updated = [...editOptions];
 updated[index] = value;
 setEditOptions(updated);
 };

 const handleRemove = (index: number) => {
 if (editOptions.length <= 1) return;
 setEditOptions(editOptions.filter((_, i) => i !== index));
 };

 const handleAdd = () => {
 const trimmed = newOption.trim();
 if (trimmed) {
 setEditOptions([...editOptions, trimmed]);
 setNewOption('');
 setTimeout(() => newOptionRef.current?.focus(), 50);
 }
 };

 const handleAddKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleAdd();
 }
 };

 const handleSave = () => {
 const cleaned = editOptions.map(o => o.trim()).filter(Boolean);
 if (cleaned.length > 0) {
 onSave(cleaned);
 }
 setIsOpen(false);
 };

 const handleCancel = () => {
 setIsOpen(false);
 };

 return (
 <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 {children || (
 <button
 onClick={(e) => e.stopPropagation()}
 className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
 >
 <Pencil className="h-3 w-3" />
 </button>
 )}
 </PopoverTrigger>
 <PopoverContent
 align="start"
 className="w-64 p-3"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="text-sm font-medium text-foreground mb-2">Edit Options</div>

 <div className="flex flex-col gap-1">
 {editOptions.map((opt, i) => (
 <div key={i} className="flex items-center gap-1.5 group">
 <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
 <Input
 value={opt}
 onChange={(e) => handleUpdate(i, e.target.value)}
 className="h-7 text-sm flex-1"
 />
 <button
 onClick={() => handleRemove(i)}
 disabled={editOptions.length <= 1}
 className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}

 {/* Add new option row */}
 <div className="flex items-center gap-1.5 mt-1">
 <div className="w-3.5 shrink-0" />
 <Input
 ref={newOptionRef}
 value={newOption}
 onChange={(e) => setNewOption(e.target.value)}
 onKeyDown={handleAddKeyDown}
 placeholder="Add new option..."
 className="h-7 text-sm flex-1 text-muted-foreground"
 />
 <button
 onClick={handleAdd}
 disabled={!newOption.trim()}
 className="p-0.5 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
 >
 <Plus className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>

 {/* Footer buttons */}
 <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border">
 <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
 Cancel
 </Button>
 <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
 Save
 </Button>
 </div>
 </PopoverContent>
 </Popover>
 );
}
