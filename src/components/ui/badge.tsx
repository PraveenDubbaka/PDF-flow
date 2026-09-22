import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
 // Base styles - colorful pill badges with soft backgrounds
 "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-emphasized",
 {
 variants: {
 variant: {
 // Default primary
 default: "bg-primary/15 text-primary border border-primary/20",
 // Secondary muted
 secondary: "bg-secondary text-secondary-foreground border border-secondary-foreground/10",
 // Destructive/Error
 destructive: "bg-red-50 text-red-600 border border-red-200",
 // Outline
 outline: "bg-transparent text-foreground border border-border",
 
 // === Colorful Status Variants (matching reference) ===
 // Green - New, Completed, Accepted
 new: "bg-emerald-50 text-emerald-600 border border-emerald-600",
 completed: "bg-emerald-50 text-emerald-600 border border-emerald-600",
 accepted: "bg-emerald-50 text-emerald-600 border border-emerald-600",
 
 // Blue - In Progress, Invite Now
 inProgress: "bg-[#e1eefa] text-[#074075] border border-[#1c63a6]",
 inviteNow: "bg-[#e1eefa] text-[#074075] border border-[#1c63a6]",
 processing: "bg-[#e1eefa] text-[#074075] border border-[#1c63a6]",
 
 // Orange - Pending, Invite Sent
 pending: "bg-orange-50 text-orange-600 border border-orange-200",
 inviteSent: "bg-orange-50 text-orange-600 border border-orange-200",
 gathering: "bg-orange-50 text-orange-600 border border-orange-200",
 
 // Purple - Review
 review: "bg-violet-50 text-violet-600 border border-violet-200",
 
 // Slate - Not Started, Archived
 notStarted: "bg-slate-100 text-slate-600 border border-slate-200",
 archived: "bg-slate-100 text-slate-500 border border-slate-200",
 rf: "bg-slate-100 text-slate-600 border border-slate-200",
 
 // Feature colors
 recommended: "bg-pink-50 text-pink-600 border border-pink-200",
 feature: "bg-teal-50 text-teal-600 border border-teal-200",
 info: "bg-blue-50 text-blue-600 border border-blue-200",
 warning: "bg-amber-50 text-amber-600 border border-amber-200",
 success: "bg-green-50 text-green-600 border border-green-200",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
 icon?: React.ReactNode;
}

function Badge({ className, variant, icon, children,...props }: BadgeProps) {
 return (
 <div className={cn(badgeVariants({ variant }), className)} {...props}>
 {icon && <span className="flex-shrink-0">{icon}</span>}
 {children}
 </div>
 );
}

export { Badge, badgeVariants };
