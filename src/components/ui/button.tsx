import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
 "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[12.5px] font-semibold leading-[1.3] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 cursor-pointer select-none rounded-[10px]",
 {
 variants: {
 variant: {
 default: [
 "bg-[#1C63A6] text-white border border-transparent",
 "hover:bg-[#1a5a9e]",
 "active:bg-[#174e89]",
 "focus-visible:bg-[#1C63A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3A3A3]/50 focus-visible:ring-offset-0",
 "dark:bg-primary dark:text-primary-foreground",
 "dark:hover:bg-primary/85",
 "dark:active:bg-primary/75",
 "dark:focus-visible:bg-primary",
 ].join(" "),
 destructive: [
 "bg-destructive text-destructive-foreground",
 "hover:bg-destructive/75",
 "active:bg-destructive/65",
 ].join(" "),
 outline: [
 "border border-[#0C2D55] bg-background text-[#0C2D55]",
 "dark:border-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]",
 "hover:bg-primary/[0.14] hover:border-[#0C2D55] dark:hover:border-[hsl(var(--primary))]",
 "active:bg-primary/[0.22] active:border-[#0C2D55] dark:active:border-[hsl(var(--primary))]",
 "focus-visible:border-[#0C2D55] dark:focus-visible:border-[hsl(var(--primary))]",
 ].join(" "),
 secondary: [
 "bg-secondary-button text-secondary-button-foreground border border-secondary-button-border",
 "hover:bg-secondary-button-hover hover:border-secondary-button-border-hover",
 "active:bg-secondary-button-active active:border-secondary-button-border-active",
 "data-[state=open]:bg-secondary-button-active data-[state=open]:border-secondary-button-border-active",
 "data-[state=on]:bg-secondary-button-active data-[state=on]:border-secondary-button-border-active",
 "aria-selected:bg-secondary-button-active aria-selected:border-secondary-button-border-active",
 "focus-visible:bg-secondary-button focus-visible:border-secondary-button-foreground focus-visible:ring-2 focus-visible:ring-secondary-button-foreground/30 focus-visible:ring-offset-0",
 ].join(" "),
 ghost: [
 "text-primary",
 "hover:bg-primary/[0.14]",
 "active:bg-primary/[0.22]",
 ].join(" "),
 link: "text-link underline-offset-4 hover:underline",
 elevated: [
 "bg-surface-container-low text-primary shadow-sm",
 "hover:bg-primary/[0.14]",
 "active:bg-primary/[0.22]",
 ].join(" "),
 tonal: [
 "bg-secondary-container text-on-secondary-container",
 "hover:bg-secondary-container/65",
 "active:bg-secondary-container/50",
 ].join(" "),
 luka: [
 "bg-gradient-to-br from-[#9747FF] to-[#115697] text-white border-transparent",
 "shadow-[0_2px_6px_hsla(270,60%,50%,0.3)]",
 "hover:opacity-90",
 "active:opacity-80",
 "focus-visible:ring-[#9747FF]/30",
 ].join(" "),
 },
 size: {
 default: "h-9 px-4",
 sm: "h-8 px-3",
 lg: "h-11 px-6",
 icon: "h-9 w-9",
 "icon-sm": "h-7 w-7",
 "icon-lg": "h-11 w-11",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
);

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false,...props }, ref) => {
 const Comp = asChild ? Slot : "button";
 return (
 <Comp
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 );
 }
);
Button.displayName = "Button";

export { Button, buttonVariants };
