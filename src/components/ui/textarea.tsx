import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
 error?: boolean;
 size?: "default" | "lg" | "xl";
}

// Clean Outlined TextArea matching design system
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, size = "default",...props }, ref) => {
 const sizeClasses = {
 default: "min-h-[140px] px-4 py-4 text-sm",
 lg: "min-h-[180px] px-5 py-5 text-base",
 xl: "min-h-[220px] px-6 py-6 text-base",
 };

 return (
 <textarea
 className={cn(
 // Base styles - 10px border radius + double border focus class
 "input-double-border flex w-full rounded-[10px] transition-all duration-200",
 sizeClasses[size],
 // Default state: white background, #C3CBD6 border
 "bg-white text-foreground placeholder:text-muted-foreground/70",
 "border border-[#C3CBD6]",
 // Dark mode
 "dark:border-[hsl(220_15%_30%)] dark:bg-card",
 // Hover state
 "hover:border-[hsl(210_25%_75%)]",
 "dark:hover:border-[hsl(220_15%_40%)]",
 // Disabled state
 "disabled:cursor-not-allowed disabled:bg-muted/100 disabled:border-muted disabled:text-muted-foreground disabled:opacity-70",
 // Error state
 error && "border-destructive hover:border-destructive",
 className,
 )}
 ref={ref}
 {...props}
 />
 );
});
Textarea.displayName = "Textarea";

export { Textarea };
