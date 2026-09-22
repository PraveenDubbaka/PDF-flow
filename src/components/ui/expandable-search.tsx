import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ExpandableSearchProps {
 placeholder?: string;
 value?: string;
 onChange?: (value: string) => void;
 onSearch?: (value: string) => void;
 className?: string;
 disabled?: boolean;
}

export const ExpandableSearch = React.forwardRef<HTMLInputElement, ExpandableSearchProps>(
 ({ placeholder = "Search...", value: controlledValue, onChange, onSearch, className, disabled }, ref) => {
 const [expanded, setExpanded] = React.useState(false);
 const [internalValue, setInternalValue] = React.useState("");
 const inputRef = React.useRef<HTMLInputElement>(null);
 const containerRef = React.useRef<HTMLDivElement>(null);

 React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

 const value = controlledValue ?? internalValue;

 const setValue = (v: string) => {
 if (controlledValue === undefined) setInternalValue(v);
 onChange?.(v);
 };

 const collapse = () => {
 setExpanded(false);
 setValue("");
 };

 React.useEffect(() => {
 if (expanded) {
 // Focus after transition begins
 const t = setTimeout(() => inputRef.current?.focus(), 50);
 return () => clearTimeout(t);
 }
 }, [expanded]);

 React.useEffect(() => {
 if (!expanded) return;
 const onClick = (e: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(e.target as Node) && !value) {
 setExpanded(false);
 }
 };
 document.addEventListener("mousedown", onClick);
 return () => document.removeEventListener("mousedown", onClick);
 }, [expanded, value]);

 return (
 <div
 ref={containerRef}
 className={cn(
 "relative flex items-center transition-[width] duration-300 ease-in-out",
 expanded ? "w-64" : "w-9",
 className,
 )}
 >
 {!expanded ? (
 <Button
 type="button"
 variant="secondary"
 size="sm"
 className="h-9 min-w-9 px-0"
 onClick={() => !disabled && setExpanded(true)}
 disabled={disabled}
 aria-label="Open search"
 >
 <Search className="h-4 w-4" />
 </Button>
 ) : (
 <div className="relative w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
 <input
 ref={inputRef}
 type="text"
 value={value}
 disabled={disabled}
 onChange={(e) => setValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") onSearch?.(value);
 if (e.key === "Escape") collapse();
 }}
 placeholder={placeholder}
 className={cn(
 "input-double-border flex w-full rounded-[10px] h-9 pl-9 pr-9 text-sm",
 "bg-white text-foreground placeholder:text-muted-foreground/70",
 "border border-[#C3CBD6] dark:border-[hsl(220_15%_30%)] dark:bg-card",
 "transition-all duration-200",
 )}
 />
 <button
 type="button"
 onClick={collapse}
 className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
 aria-label="Close search"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 )}
 </div>
 );
 },
);
ExpandableSearch.displayName = "ExpandableSearch";
