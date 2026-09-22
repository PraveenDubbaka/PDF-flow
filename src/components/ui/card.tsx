import * as React from "react";
import { cn } from "@/lib/utils";

// Base Card with optional pop-out effect
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
 interactive?: boolean;
}>(({
 className,
 interactive = false,
...props
}, ref) => <div ref={ref} className={cn(
// Base styles
"rounded-2xl bg-card text-card-foreground transition-all duration-200 ease-emphasized", 
"border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] dark:shadow-[0_2px_8px_hsl(0_0%_0%/0.3)]",
// Interactive pop-out effect
interactive && ["cursor-pointer", "hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_hsl(213_40%_20%/0.12)] dark:hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.4)]", "hover:border-[hsl(210_35%_82%)] dark:hover:border-[hsl(220_15%_40%)]", "active:scale-[0.99] active:translate-y-0 active:shadow-[0_4px_12px_hsl(213_40%_20%/0.08)]"], className)} {...props} />);
Card.displayName = "Card";

// Styled Card with optional hover glow (hover disabled by default)
const StyledCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
 hover?: boolean;
 glow?: boolean;
}>(({
 className,
 hover = false,
 glow = false,
...props
}, ref) => <div ref={ref} className={cn(
 "bg-card text-card-foreground transition-all duration-200 ease-emphasized border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] dark:shadow-[0_2px_8px_hsl(0_0%_0%/0.3)] rounded-md", 
 hover && ["hover:scale-[1.01] hover:-translate-y-0.5", "hover:shadow-[0_12px_32px_hsl(213_40%_20%/0.12),0_0_20px_hsl(207_71%_38%/0.08)] dark:hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.4)]", "hover:border-[hsl(207_60%_75%)] dark:hover:border-[hsl(220_15%_40%)]"], 
 glow && "shadow-[0_0_30px_hsl(207_71%_38%/0.1)]", 
 className)} {...props} />);
StyledCard.displayName = "StyledCard";

// Glass Card with pop-out effect
const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
 interactive?: boolean;
}>(({
 className,
 interactive = false,
...props
}, ref) => <div ref={ref} className={cn(
 "rounded-2xl backdrop-blur-xl bg-card/80 text-card-foreground transition-all duration-200 ease-emphasized", 
 "border border-border/60 shadow-[0_4px_16px_hsl(213_40%_20%/0.08)] dark:shadow-[0_4px_16px_hsl(0_0%_0%/0.4)]", 
 interactive && ["cursor-pointer", "hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_hsl(213_40%_20%/0.15)] dark:hover:shadow-[0_16px_40px_hsl(0_0%_0%/0.5)]", "hover:bg-card/90 hover:border-[hsl(210_35%_80%)] dark:hover:border-[hsl(220_15%_40%)]", "active:scale-[0.99] active:translate-y-0"], 
 className)} {...props} />);
GlassCard.displayName = "GlassCard";

// Filled Card variant
const CardFilled = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
 interactive?: boolean;
}>(({
 className,
 interactive = false,
...props
}, ref) => <div ref={ref} className={cn("rounded-2xl bg-muted text-card-foreground transition-all duration-200 ease-emphasized", interactive && ["cursor-pointer", "hover:scale-[1.01] hover:bg-[hsl(210_40%_94%)] dark:hover:bg-[hsl(220_25%_20%)]", "active:scale-[0.99]"], className)} {...props} />);
CardFilled.displayName = "CardFilled";

// Outlined Card variant
const CardOutlined = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
 interactive?: boolean;
}>(({
 className,
 interactive = false,
...props
}, ref) => <div ref={ref} className={cn(
 "rounded-2xl border-2 border-border bg-card/50 text-card-foreground transition-all duration-200 ease-emphasized", 
 "shadow-[inset_0_0_0_1px_hsl(210_20%_85%/0.5)] dark:shadow-[inset_0_0_0_1px_hsl(220_15%_25%/0.5)]", 
 interactive && ["cursor-pointer", "hover:scale-[1.01] hover:border-[hsl(213_60%_30%/0.5)] dark:hover:border-[hsl(220_15%_45%)]", "hover:bg-card/70", "hover:shadow-[inset_0_0_0_1px_hsl(210_20%_85%/0.8),0_8px_25px_hsl(213_40%_20%/0.1)] dark:hover:shadow-[inset_0_0_0_1px_hsl(220_15%_30%/0.8),0_8px_25px_hsl(0_0%_0%/0.3)]", "active:scale-[0.99]"], 
 className)} {...props} />);
CardOutlined.displayName = "CardOutlined";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
 className,
...props
}, ref) => <div ref={ref} className={cn("flex flex-col space-y-2 p-7", className)} {...props} />);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({
 className,
...props
}, ref) => <h3 ref={ref} className={cn("text-xl font-semibold leading-none tracking-tight", className)} {...props} />);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({
 className,
...props
}, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
 className,
...props
}, ref) => <div ref={ref} className={cn("p-7 pt-0", className)} {...props} />);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
 className,
...props
}, ref) => <div ref={ref} className={cn("flex items-center p-7 pt-0", className)} {...props} />);
CardFooter.displayName = "CardFooter";

export { Card, StyledCard, GlassCard, CardFilled, CardOutlined, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };