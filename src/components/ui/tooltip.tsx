import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
 React.ElementRef<typeof TooltipPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children,...props }, ref) => (
 <TooltipPrimitive.Portal>
 <TooltipPrimitive.Content
 ref={ref}
 sideOffset={sideOffset}
 className={cn(
 // Dark pill with arrow, matching reference screenshot
 "z-50 overflow-visible rounded-[8px] px-3 py-1.5",
 "bg-[hsl(220_15%_15%)] text-white",
 "shadow-[0_6px_16px_hsl(220_15%_10%/0.25)]",
 "text-sm font-medium leading-snug",
 // Animations
 "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 className,
 )}
 {...props}
 >
 {children}
 <TooltipPrimitive.Arrow className="fill-[hsl(220_15%_15%)]" width={10} height={5} />
 </TooltipPrimitive.Content>
 </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
