import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const wrapSelectText = (content: React.ReactNode) =>
 typeof content === "string" || typeof content === "number" ? <span>{content}</span> : content;

const SelectValue = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Value>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ placeholder, children,...props }, ref) => (
 <SelectPrimitive.Value ref={ref} placeholder={wrapSelectText(placeholder)} {...props}>
 {wrapSelectText(children)}
 </SelectPrimitive.Value>
));
SelectValue.displayName = SelectPrimitive.Value.displayName;

const SelectTrigger = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Trigger>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { error?: boolean }
>(({ className, children, error,...props }, ref) => (
 <SelectPrimitive.Trigger
 ref={ref}
 className={cn(
 // Base styles - 10px border radius + double border focus class
 "input-double-border flex h-9 w-full items-center justify-between rounded-[10px] px-3 py-2 text-sm transition-all duration-200 [&>span]:truncate [&>span]:min-w-0",
 // Default state: white background, #C3CBD6 border
 "bg-white text-foreground placeholder:text-muted-foreground",
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
 {...props}
 >
 {children}
 <SelectPrimitive.Icon asChild>
 <ChevronDown className="h-4 w-4 opacity-60" />
 </SelectPrimitive.Icon>
 </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className,...props }, ref) => (
 <SelectPrimitive.ScrollUpButton
 ref={ref}
 className={cn("flex cursor-default items-center justify-center py-1", className)}
 {...props}
 >
 <ChevronUp className="h-4 w-4" />
 </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className,...props }, ref) => (
 <SelectPrimitive.ScrollDownButton
 ref={ref}
 className={cn("flex cursor-default items-center justify-center py-1", className)}
 {...props}
 >
 <ChevronDown className="h-4 w-4" />
 </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper",...props }, ref) => (
 <SelectPrimitive.Portal>
 <SelectPrimitive.Content
 ref={ref}
 className={cn(
 // Base styles - 10px border radius matching trigger
 "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[10px]",
 // Clean border with shadow (theme-aware)
 "border border-border bg-popover text-popover-foreground",
 "shadow-lg",
 // Animations
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 position === "popper" &&
 "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
 className,
 )}
 position={position}
 {...props}
 >
 <SelectScrollUpButton />
 <SelectPrimitive.Viewport
 className={cn(
 "p-1.5",
 position === "popper" &&
 "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
 )}
 >
 {children}
 </SelectPrimitive.Viewport>
 <SelectScrollDownButton />
 </SelectPrimitive.Content>
 </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Label>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className,...props }, ref) => (
 <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Item>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children,...props }, ref) => (
 <SelectPrimitive.Item
 ref={ref}
 className={cn(
 // Curved edges on items with pop-out effect
 "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-3 pr-3 text-sm outline-none transition-all duration-200 ease-emphasized",
 // Pop-out hover effect
 "hover:bg-primary/[0.08] hover:scale-[1.01] hover:shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]",
 "dark:hover:bg-primary/[0.15]",
 // Focus/selected state with highlight
 "focus:bg-primary/[0.12] focus:text-foreground focus:scale-[1.01]",
 "dark:focus:bg-primary/[0.2]",
 "data-[state=checked]:bg-primary/[0.15] data-[state=checked]:text-primary data-[state=checked]:font-medium",
 "dark:data-[state=checked]:bg-primary/[0.25]",
 "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
 className,
 )}
 {...props}
 >
 <SelectPrimitive.ItemText>{wrapSelectText(children)}</SelectPrimitive.ItemText>
 <span className="ml-auto flex h-4 w-4 items-center justify-center shrink-0">
 <SelectPrimitive.ItemIndicator>
 <Check className="h-4 w-4 text-primary" />
 </SelectPrimitive.ItemIndicator>
 </span>
 </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
 React.ElementRef<typeof SelectPrimitive.Separator>,
 React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className,...props }, ref) => (
 <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
 Select,
 SelectGroup,
 SelectValue,
 SelectTrigger,
 SelectContent,
 SelectLabel,
 SelectItem,
 SelectSeparator,
 SelectScrollUpButton,
 SelectScrollDownButton,
};
