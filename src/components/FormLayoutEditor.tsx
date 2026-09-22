import { useState } from 'react';
import { format } from 'date-fns';
import { 
 Plus, 
 Trash2, 
 Type, 
 AlignLeft, 
 ChevronDown, 
 Square, 
 Circle, 
 MousePointer,
 Calendar,
 Check,
 ArrowRight,
 Star,
 Search,
 CalendarIcon
} from 'lucide-react';
import { FormElement, FormLayout } from '@/types/checklist';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface FormLayoutEditorProps {
 formLayout: FormLayout;
 onUpdate: (formLayout: FormLayout) => void;
 isPreviewMode: boolean;
}

const FORM_ELEMENT_OPTIONS = [
 { type: 'text-input', label: 'Text Input', icon: Type },
 { type: 'textarea', label: 'Text Area', icon: AlignLeft },
 { type: 'select', label: 'Dropdown', icon: ChevronDown },
 { type: 'checkbox', label: 'Checkbox', icon: Square },
 { type: 'radio', label: 'Radio', icon: Circle },
 { type: 'date', label: 'Date Picker', icon: CalendarIcon },
 { type: 'button', label: 'Button', icon: MousePointer },
] as const;

const BUTTON_STYLES = [
 { value: 'text-only', label: 'Text Only' },
 { value: 'icon-text', label: 'Icon + Text' },
 { value: 'icon-only', label: 'Icon Only' },
] as const;

const ICON_OPTIONS = [
 { value: 'check', label: 'Check', Icon: Check },
 { value: 'plus', label: 'Plus', Icon: Plus },
 { value: 'arrow', label: 'Arrow', Icon: ArrowRight },
 { value: 'star', label: 'Star', Icon: Star },
 { value: 'search', label: 'Search', Icon: Search },
] as const;

// Standard input with external label - matching CreateEngagement design system
const LabeledInput = ({ 
 label, 
 value, 
 onChange, 
 placeholder,
 required = false,
 disabled = false,
}: { 
 label?: string; 
 value: string; 
 onChange: (value: string) => void;
 placeholder?: string;
 required?: boolean;
 disabled?: boolean;
}) => {
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <input
 type="text"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 disabled={disabled}
 className={`
 input-double-border w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200
 ${disabled 
 ? 'bg-muted border border-transparent text-muted-foreground opacity-60 cursor-not-allowed' 
 : 'bg-white border border-[#C3CBD6] hover:border-[hsl(210_25%_75%)]'
 }
 `}
 />
 </div>
 );
};

// Standard textarea with external label - matching CreateEngagement design system
const LabeledTextarea = ({ 
 label, 
 value, 
 onChange, 
 placeholder,
 required = false,
 disabled = false,
}: { 
 label?: string; 
 value: string; 
 onChange: (value: string) => void;
 placeholder?: string;
 required?: boolean;
 disabled?: boolean;
}) => {
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <textarea
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 disabled={disabled}
 rows={3}
 className={`
 input-double-border w-full px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200 resize-none
 ${disabled 
 ? 'bg-muted border border-transparent text-muted-foreground opacity-60 cursor-not-allowed' 
 : 'bg-white border border-[#C3CBD6] hover:border-[hsl(210_25%_75%)]'
 }
 `}
 />
 </div>
 );
};

// Standard select with external label - matching CreateEngagement design system
const LabeledSelect = ({ 
 label, 
 value, 
 onChange, 
 options,
 required = false,
 disabled = false,
}: { 
 label?: string; 
 value: string; 
 onChange: (value: string) => void;
 options: string[];
 required?: boolean;
 disabled?: boolean;
}) => {
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <div className="relative">
 <select
 value={value}
 onChange={(e) => onChange(e.target.value)}
 disabled={disabled}
 className={`
 input-double-border w-full h-9 px-3 py-2 text-sm text-foreground rounded-[10px] outline-none transition-all duration-200 appearance-none cursor-pointer
 ${disabled 
 ? 'bg-muted border border-transparent text-muted-foreground opacity-60 cursor-not-allowed' 
 : 'bg-white border border-[#C3CBD6] hover:border-[hsl(210_25%_75%)]'
 }
 `}
 >
 <option value="">Select...</option>
 {options.map((opt, i) => (
 <option key={i} value={opt}>{opt}</option>
 ))}
 </select>
 <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${disabled ? 'text-muted-foreground opacity-60' : 'text-muted-foreground'}`} />
 </div>
 </div>
 );
};

// Date picker with external label - matching CreateEngagement design system
const LabeledDatePicker = ({ 
 label, 
 required = false,
}: { 
 label?: string; 
 required?: boolean;
}) => {
 const [date, setDate] = useState<Date>();
 
 return (
 <div className="flex flex-col gap-1">
 {label && (
 <label className="text-xs font-medium text-foreground">
 {label}
 {required && <span className="text-destructive ml-0.5">*</span>}
 </label>
 )}
 <Popover>
 <PopoverTrigger asChild>
 <button
 className={cn(
 "input-double-border w-full h-9 px-3 py-2 text-sm text-left rounded-[10px] outline-none transition-all duration-200 flex items-center justify-between bg-white border border-[#C3CBD6] hover:border-[hsl(210_25%_75%)]",
 !date && "text-muted-foreground"
 )}
 >
 {date ? format(date, "PPP") : <span>Pick a date</span>}
 <CalendarIcon className="h-4 w-4 text-muted-foreground" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0 bg-card border shadow-lg z-50" align="start">
 <CalendarComponent
 mode="single"
 selected={date}
 onSelect={setDate}
 initialFocus
 className={cn("p-3 pointer-events-auto")}
 />
 </PopoverContent>
 </Popover>
 </div>
 );
};

const DatePickerPreview = ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => {
 const controlled = value ? new Date(value + 'T00:00:00') : undefined;
 const [local, setLocal] = useState<Date | undefined>(controlled);
 const date = onChange ? controlled : local;
 const handleSelect = (d: Date | undefined) => {
 const str = d ? format(d, 'yyyy-MM-dd') : '';
 if (onChange) onChange(str); else setLocal(d);
 };
 return (
 <Popover>
 <PopoverTrigger asChild>
 <button
 type="button"
 className="w-full appearance-none border-2 border-transparent rounded-md bg-transparent p-1.5 text-sm text-muted-foreground text-left flex items-center gap-2 focus:outline-none hover:bg-muted/40"
 >
 <span className="flex-1 italic">{date ? format(date, 'yyyy-MM-dd') : 'yyyy-mm-dd'}</span>
 <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0 bg-card border shadow-lg z-50" align="start">
 <CalendarComponent mode="single" selected={date} onSelect={handleSelect} initialFocus className="p-3 pointer-events-auto" />
 </PopoverContent>
 </Popover>
 );
};

export function FormLayoutEditor({ formLayout, onUpdate, isPreviewMode }: FormLayoutEditorProps) {
 const handleAddColumn = () => {
 if (formLayout.columns >= 5) return;
 const newElement: FormElement = {
 id: `col-${Date.now()}`,
 type: 'empty'
 };
 onUpdate({
 columns: formLayout.columns + 1,
 elements: [...formLayout.elements, newElement]
 });
 };

 const handleRemoveColumn = (index: number) => {
 if (formLayout.columns <= 1) return;
 const newElements = formLayout.elements.filter((_, i) => i !== index);
 onUpdate({
 columns: formLayout.columns - 1,
 elements: newElements
 });
 };

 const handleUpdateElement = (index: number, updates: Partial<FormElement>) => {
 const newElements = [...formLayout.elements];
 newElements[index] = {...newElements[index],...updates };
 onUpdate({...formLayout, elements: newElements });
 };

 const handleSetElementType = (index: number, type: FormElement['type']) => {
 const element = formLayout.elements[index];
 const newElement: FormElement = {
 id: element.id,
 type,
 label: type === 'button' ? 'Submit' : type === 'date' ? 'Date' : '',
 placeholder: type === 'text-input' || type === 'textarea' ? 'Enter text...' : undefined,
 options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
 buttonStyle: type === 'button' ? 'text-only' : undefined,
 };
 handleUpdateElement(index, newElement);
 };

 const renderFormElement = (element: FormElement, index: number) => {
 if (isPreviewMode) {
 return renderPreviewElement(element, index);
 }

 if (element.type === 'empty') {
 return (
 <div className="h-full min-h-[80px] flex items-center justify-center border-2 border-dashed border-[#E8EDF2] rounded-lg bg-[#F5F8FA]/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
 <Popover>
 <PopoverTrigger asChild>
 <button className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors p-4">
 <Plus className="h-5 w-5" />
 <span className="text-xs font-medium">Add Element</span>
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-48 p-2" align="center">
 <div className="flex flex-col gap-1">
 {FORM_ELEMENT_OPTIONS.map((opt) => (
 <button
 key={opt.type}
 onClick={() => handleSetElementType(index, opt.type)}
 className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#F5F8FA] rounded-md transition-colors"
 >
 <opt.icon className="h-4 w-4 text-muted-foreground" />
 {opt.label}
 </button>
 ))}
 </div>
 </PopoverContent>
 </Popover>
 </div>
 );
 }

 return (
 <div className="h-full min-h-[80px] flex flex-col bg-white rounded-lg p-4 group relative border border-[#E8EDF2]">
 {/* Element controls */}
 <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Popover>
 <PopoverTrigger asChild>
 <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-[#F5F8FA] rounded transition-colors">
 <ChevronDown className="h-4 w-4" />
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-48 p-2" align="end">
 <div className="flex flex-col gap-1">
 {FORM_ELEMENT_OPTIONS.map((opt) => (
 <button
 key={opt.type}
 onClick={() => handleSetElementType(index, opt.type)}
 className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
 element.type === opt.type ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-[#F5F8FA]'
 }`}
 >
 <opt.icon className="h-4 w-4" />
 {opt.label}
 </button>
 ))}
 </div>
 </PopoverContent>
 </Popover>
 <button
 onClick={() => handleUpdateElement(index, { type: 'empty', label: undefined, placeholder: undefined, options: undefined, buttonStyle: undefined, icon: undefined })}
 className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>

 {/* Element editor */}
 <div className="flex-1 flex flex-col gap-3 pt-6">
 {/* Label input */}
 <LabeledInput
 label="Label"
 value={element.label || ''}
 onChange={(val) => handleUpdateElement(index, { label: val })}
 />

 {/* Type-specific settings */}
 {renderElementEditor(element, index)}
 </div>
 </div>
 );
 };

 const renderElementEditor = (element: FormElement, index: number) => {
 switch (element.type) {
 case 'text-input':
 return (
 <LabeledInput
 label="Placeholder"
 value={element.placeholder || ''}
 onChange={(val) => handleUpdateElement(index, { placeholder: val })}
 />
 );
 
 case 'textarea':
 return (
 <LabeledInput
 label="Placeholder"
 value={element.placeholder || ''}
 onChange={(val) => handleUpdateElement(index, { placeholder: val })}
 />
 );
 
 case 'select':
 case 'radio':
 return (
 <div className="space-y-2">
 <p className="text-xs text-muted-foreground font-medium">Options</p>
 {(element.options || []).map((opt, i) => (
 <div key={i} className="flex items-center gap-2">
 <div className="flex-1">
 <LabeledInput
 value={opt}
 onChange={(val) => {
 const newOptions = [...(element.options || [])];
 newOptions[i] = val;
 handleUpdateElement(index, { options: newOptions });
 }}
 placeholder={`Option ${i + 1}`}
 />
 </div>
 <button
 onClick={() => {
 const newOptions = (element.options || []).filter((_, j) => j !== i);
 handleUpdateElement(index, { options: newOptions.length ? newOptions : ['Option 1'] });
 }}
 className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 ))}
 <button
 onClick={() => handleUpdateElement(index, { options: [...(element.options || []), `Option ${(element.options?.length || 0) + 1}`] })}
 className="text-xs text-primary hover:underline font-medium"
 >
 + Add option
 </button>
 </div>
 );
 
 case 'checkbox':
 return (
 <div className="flex items-center gap-3 p-3 bg-[#F5F8FA] rounded-lg">
 <Checkbox disabled />
 <span className="text-sm text-muted-foreground">Checkbox preview</span>
 </div>
 );
 
 case 'date':
 return (
 <div className="flex items-center gap-3 p-3 bg-[#F5F8FA] rounded-lg">
 <CalendarIcon className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm text-muted-foreground">Date picker preview</span>
 </div>
 );
 
 case 'button':
 const currentStyle = BUTTON_STYLES.find(s => s.value === element.buttonStyle)?.label || 'Text Only';
 const showIconPicker = element.buttonStyle === 'icon-text' || element.buttonStyle === 'icon-only';
 const EditorIconComponent = ICON_OPTIONS.find(i => i.value === element.icon)?.Icon || Check;
 
 return (
 <div className="space-y-3">
 <LabeledSelect
 label="Button Style"
 value={currentStyle}
 onChange={(val) => {
 const styleValue = BUTTON_STYLES.find(s => s.label === val)?.value || 'text-only';
 // Set default icon when switching to icon style
 const updates: Partial<FormElement> = { buttonStyle: styleValue as FormElement['buttonStyle'] };
 if ((styleValue === 'icon-text' || styleValue === 'icon-only') && !element.icon) {
 updates.icon = 'check';
 }
 handleUpdateElement(index, updates);
 }}
 options={BUTTON_STYLES.map(s => s.label)}
 />
 
 {showIconPicker && (
 <div className="space-y-2">
 <p className="text-xs text-muted-foreground font-medium">Button Icon</p>
 <div className="flex flex-wrap gap-2">
 {ICON_OPTIONS.map((iconOpt) => {
 const isSelected = element.icon === iconOpt.value;
 return (
 <button
 key={iconOpt.value}
 onClick={() => handleUpdateElement(index, { icon: iconOpt.value })}
 className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
 isSelected 
 ? 'border-primary bg-primary/10 text-primary' 
 : 'border-[#E8EDF2] bg-[#F5F8FA] text-muted-foreground hover:border-primary/50 hover:text-foreground'
 }`}
 title={iconOpt.label}
 >
 <iconOpt.Icon className="h-4 w-4" />
 <span className="text-xs">{iconOpt.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* Button preview in editor */}
 <div className="pt-2">
 <p className="text-xs text-muted-foreground font-medium mb-2">Preview</p>
 <Button className="h-11" size={element.buttonStyle === 'icon-only' ? 'icon' : 'default'}>
 {showIconPicker && (
 <EditorIconComponent className={`h-4 w-4 ${element.buttonStyle !== 'icon-only' ? 'mr-2' : ''}`} />
 )}
 {element.buttonStyle !== 'icon-only' && (element.label || 'Button')}
 </Button>
 </div>
 </div>
 );
 
 default:
 return null;
 }
 };

 const renderPreviewElement = (element: FormElement, index: number) => {
 const label = element.label;
 const val = element.value ?? '';
 const setVal = (v: string) => handleUpdateElement(index, { value: v });

 switch (element.type) {
 case 'empty':
 return null;

 case 'text-input':
 return (
 <input
 type="text"
 placeholder={label || element.placeholder}
 value={val}
 onChange={(e) => setVal(e.target.value)}
 className="w-full appearance-none border-2 border-transparent rounded-md bg-transparent p-1.5 text-sm placeholder:text-muted-foreground placeholder:italic focus:outline-none focus:border-primary/30"
 />
 );

 case 'textarea':
 return (
 <LabeledTextarea
 label={label}
 value={val}
 onChange={setVal}
 placeholder={element.placeholder}
 />
 );

 case 'select':
 return (
 <LabeledSelect
 label={label}
 value={val}
 onChange={setVal}
 options={element.options || []}
 />
 );

 case 'checkbox':
 return (
 <div className="flex items-center gap-3 h-11">
 <Checkbox checked={val === 'true'} onCheckedChange={(c) => setVal(c ? 'true' : '')} />
 {label && <span className="text-sm text-foreground">{label}</span>}
 </div>
 );

 case 'date':
 return <DatePickerPreview value={val} onChange={setVal} />;
 
 case 'radio':
 return (
 <div className="space-y-2">
 {label && <label className="text-xs text-muted-foreground font-medium">{label}</label>}
 <RadioGroup>
 {(element.options || []).map((opt, i) => (
 <div key={i} className="flex items-center gap-3">
 <RadioGroupItem value={opt} id={`${element.id}-${i}`} />
 <label htmlFor={`${element.id}-${i}`} className="text-sm text-foreground">{opt}</label>
 </div>
 ))}
 </RadioGroup>
 </div>
 );
 
 case 'button':
 const PreviewIconComponent = ICON_OPTIONS.find(i => i.value === element.icon)?.Icon || Check;
 const hasIcon = element.buttonStyle === 'icon-text' || element.buttonStyle === 'icon-only';
 return (
 <Button className="w-full h-11" size={element.buttonStyle === 'icon-only' ? 'icon' : 'default'}>
 {hasIcon && (
 <PreviewIconComponent className={`h-4 w-4 ${element.buttonStyle !== 'icon-only' ? 'mr-2' : ''}`} />
 )}
 {element.buttonStyle !== 'icon-only' && (label || 'Button')}
 </Button>
 );
 
 default:
 return null;
 }
 };

 const gridCols = {
 1: 'grid-cols-1',
 2: 'grid-cols-2',
 3: 'grid-cols-3',
 4: 'grid-cols-4',
 5: 'grid-cols-5',
 }[formLayout.columns] || 'grid-cols-1';

 return (
 <div className="p-5">
 <div className={`grid ${gridCols} gap-4`}>
 {formLayout.elements.map((element, index) => (
 <div key={element.id} className="relative">
 {!isPreviewMode && formLayout.columns > 1 && (
 <button
 onClick={() => handleRemoveColumn(index)}
 className="absolute -top-2 -right-2 z-10 p-1 bg-white border border-[#E8EDF2] rounded-full shadow-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
 title="Remove column"
 >
 <Trash2 className="h-3 w-3" />
 </button>
 )}
 {renderFormElement(element, index)}
 </div>
 ))}
 
 {/* Add column button */}
 {!isPreviewMode && formLayout.columns < 5 && (
 <button
 onClick={handleAddColumn}
 className="h-full min-h-[80px] flex items-center justify-center border-2 border-dashed border-[#E8EDF2] rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
 >
 <div className="flex flex-col items-center gap-1">
 <Plus className="h-5 w-5" />
 <span className="text-xs font-medium">Add Column</span>
 </div>
 </button>
 )}
 </div>
 </div>
 );
}
