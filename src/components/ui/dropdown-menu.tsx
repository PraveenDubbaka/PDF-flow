import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
 inset?: boolean;
 }
>(({ className, inset, children,...props }, ref) => (
 <DropdownMenuPrimitive.SubTrigger
 ref={ref}
 className={cn(
 "group flex cursor-default select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-200 ease-emphasized hover:bg-secondary hover:text-secondary-foreground data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground [&>svg]:text-muted-foreground [&>svg]:transition-colors [&:hover>svg]:text-foreground [&[data-state=open]>svg]:text-foreground [&:focus>svg]:text-foreground",
 inset && "pl-8",
 className,
 )}
 {...props}
 >
 {children}
 <ChevronRight className="ml-auto h-4 w-4" />
 </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className,...props }, ref) => (
 <DropdownMenuPrimitive.SubContent
 ref={ref}
 className={cn(
 // Curved edges matching parent dropdown
 "z-50 min-w-[8rem] overflow-hidden rounded-xl",
 // Visible dark blue border
 "border-2 border-[hsl(213_60%_30%/0.5)] bg-popover p-2 text-popover-foreground",
 "shadow-[0_4px_20px_hsl(213_60%_30%/0.15),inset_0_0_0_1px_hsl(210_20%_85%/0.5)]",
 // Animations
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 className,
 )}
 {...props}
 />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4,...props }, ref) => (
 <DropdownMenuPrimitive.Portal>
 <DropdownMenuPrimitive.Content
 ref={ref}
 sideOffset={sideOffset}
 className={cn(
 // Curved edges matching triggers
 "z-50 min-w-[8rem] overflow-hidden rounded-xl",
 // Visible dark blue border with inner light border shadow
 "border-2 border-[hsl(213_60%_30%/0.5)] bg-popover p-2 text-popover-foreground",
 "shadow-[0_4px_20px_hsl(213_60%_30%/0.15),inset_0_0_0_1px_hsl(210_20%_85%/0.5)]",
 // Animations
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 className,
 )}
 {...props}
 />
 </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.Item>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
 inset?: boolean;
 }
>(({ className, inset,...props }, ref) => (
 <DropdownMenuPrimitive.Item
 ref={ref}
 className={cn(
 // Curved edges on menu items with pop-out effect
 "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-200 ease-emphasized",
 "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
 // Soft hover effect
 "hover:bg-secondary hover:text-secondary-foreground hover:scale-[1.01] hover:shadow-[0_2px_8px_hsl(213_40%_20%/0.06)]",
 "focus:bg-secondary focus:text-secondary-foreground focus:scale-[1.01]",
 "[&>svg]:text-muted-foreground [&>svg]:transition-all [&:hover>svg]:text-foreground [&:focus>svg]:text-foreground",
 inset && "pl-8",
 className,
 )}
 {...props}
 />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked,...props }, ref) => (
 <DropdownMenuPrimitive.CheckboxItem
 ref={ref}
 className={cn(
 "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
 className,
 )}
 checked={checked}
 {...props}
 >
 <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
 <DropdownMenuPrimitive.ItemIndicator>
 <Check className="h-4 w-4" />
 </DropdownMenuPrimitive.ItemIndicator>
 </span>
 {children}
 </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children,...props }, ref) => (
 <DropdownMenuPrimitive.RadioItem
 ref={ref}
 className={cn(
 "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
 className,
 )}
 {...props}
 >
 <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
 <DropdownMenuPrimitive.ItemIndicator>
 <Circle className="h-2 w-2 fill-current" />
 </DropdownMenuPrimitive.ItemIndicator>
 </span>
 {children}
 </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.Label>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
 inset?: boolean;
 }
>(({ className, inset,...props }, ref) => (
 <DropdownMenuPrimitive.Label
 ref={ref}
 className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
 {...props}
 />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
 React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
 React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className,...props }, ref) => (
 <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1.5 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className,...props }: React.HTMLAttributes<HTMLSpanElement>) => {
 return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuCheckboxItem,
 DropdownMenuRadioItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuShortcut,
 DropdownMenuGroup,
 DropdownMenuPortal,
 DropdownMenuSub,
 DropdownMenuSubContent,
 DropdownMenuSubTrigger,
 DropdownMenuRadioGroup,
};
