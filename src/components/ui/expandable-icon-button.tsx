import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";
import { useIsMobile } from "@/hooks/use-mobile";

const COMPACT_BREAKPOINT = 1368;

export interface ExpandableIconButtonProps extends Omit<ButtonProps, "size"> {
 icon: React.ReactNode;
 label: React.ReactNode;
 size?: "default" | "sm";
}

function useIsCompact() {
 const [isCompact, setIsCompact] = React.useState<boolean>(false);

 React.useEffect(() => {
 const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
 const onChange = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
 mql.addEventListener("change", onChange);
 setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
 return () => mql.removeEventListener("change", onChange);
 }, []);

 return isCompact;
}

const ExpandableIconButton = React.forwardRef<HTMLButtonElement, ExpandableIconButtonProps>(
 ({ icon, label, className, size = "default", variant = "secondary",...props }, ref) => {
 const isCompact = useIsCompact();
 const h = size === "sm" ? "h-8" : "h-9";
 const minW = size === "sm" ? "min-w-8" : "min-w-9";

 if (isCompact) {
 // Small screen: icon-only, expand on hover
 return (
 <Button
 ref={ref}
 variant={variant}
 size="sm"
 className={cn(
 h,
 minW,
 "!gap-0 px-0 group/expand overflow-hidden items-center justify-center",
 "transition-[padding,gap] duration-200 ease-in-out",
 "hover:px-3 hover:!gap-2",
 className,
 )}
 {...props}
 >
 <span className="shrink-0 flex items-center justify-center">{icon}</span>
 <span className="grid grid-cols-[0fr] group-hover/expand:grid-cols-[1fr] transition-[grid-template-columns,opacity] duration-200 ease-in-out overflow-hidden">
 <span className="overflow-hidden whitespace-nowrap text-[12.5px] font-semibold leading-[1.3] opacity-0 group-hover/expand:opacity-100 transition-opacity duration-200 ease-in-out">
 {label}
 </span>
 </span>
 </Button>
 );
 }

 // Large screen: full visible button with icon + label
 return (
 <Button
 ref={ref}
 variant={variant}
 size="sm"
 className={cn(
 h,
 "px-3 gap-2 items-center justify-center",
 className,
 )}
 {...props}
 >
 <span className="shrink-0 flex items-center justify-center">{icon}</span>
 <span className="whitespace-nowrap text-[12.5px] font-semibold leading-[1.3]">{label}</span>
 </Button>
 );
 }
);
ExpandableIconButton.displayName = "ExpandableIconButton";

export { ExpandableIconButton };
