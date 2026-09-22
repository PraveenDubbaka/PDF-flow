import * as React from "react";

import { cn } from "@/lib/utils";

// Clean Outlined TextField matching design system
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { error?: boolean; size?: "default" | "lg" | "xl" }>(
 ({ className, type, error, size = "default",...props }, ref) => {
 const sizeClasses = {
 default: "h-9 px-3 py-2 text-sm",
 lg: "h-12 px-4 py-3 text-base",
 xl: "h-14 px-5 py-4 text-base",
 };
 
 return (
 <input
 type={type}
 className={cn(
 // Base styles - 10px border radius + double border focus class
 type === "date"
 ? "input-double-border block w-full rounded-[10px] transition-all duration-200"
 : "input-double-border flex w-full rounded-[10px] transition-all duration-200",
 sizeClasses[size],
 "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
 },
);
Input.displayName = "Input";

// Filled TextField variant
const InputFilled = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { error?: boolean; size?: "default" | "lg" | "xl" }>(
 ({ className, type, error, size = "default",...props }, ref) => {
 const sizeClasses = {
 default: "h-9 px-3 py-2 text-sm",
 lg: "h-12 px-4 py-3 text-base",
 xl: "h-14 px-5 py-4 text-base",
 };
 
 return (
 <input
 type={type}
 className={cn(
 // Base styles - 10px border radius matching outlined variant
 "input-double-border flex w-full rounded-[10px] transition-all duration-200",
 sizeClasses[size],
 "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
 // Default state: muted/tinted background with subtle border
 "bg-muted/60 text-foreground placeholder:text-muted-foreground/70",
 "border border-[hsl(210_20%_85%)]",
 // Dark mode
 "dark:bg-muted/40 dark:border-[hsl(220_15%_30%)]",
 // Hover state
 "hover:bg-muted/80 hover:border-[hsl(210_25%_75%)]",
 "dark:hover:bg-muted/60 dark:hover:border-[hsl(220_15%_40%)]",
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
 },
);
InputFilled.displayName = "InputFilled";

export { Input, InputFilled };
