import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({...props }: ToasterProps) => {
 const { theme = "system" } = useTheme();

 return (
 <Sonner
 theme={theme as ToasterProps["theme"]}
 position="top-right"
 className="toaster group"
 toastOptions={{
 classNames: {
 toast:
 "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:rounded-[16px] group-[.toaster]:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] group-[.toaster]:border group-[.toaster]:border-border/40 group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:gap-4 group-[.toaster]:overflow-hidden group-[.toaster]:relative",
 title: "group-[.toast]:text-[15px] group-[.toast]:font-semibold group-[.toast]:text-foreground",
 description: "group-[.toast]:text-sm group-[.toast]:text-muted-foreground group-[.toast]:mt-0.5",
 actionButton:
 "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-medium",
 cancelButton:
 "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:px-4 group-[.toast]:py-2",
 closeButton:
 "group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:transition-colors",
 success:
 "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-emerald-200 [&>div>svg]:!text-emerald-500 toast-progress-success",
 error:
 "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-red-200 [&>div>svg]:!text-red-500 toast-progress-error",
 warning:
 "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-amber-200 [&>div>svg]:!text-amber-500 toast-progress-warning",
 info:
 "group-[.toaster]:!bg-background group-[.toaster]:!text-foreground group-[.toaster]:!border-blue-200 [&>div>svg]:!text-blue-500 toast-progress-info",
 },
 }}
 icons={{
 success: (
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 shrink-0">
 <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
 </div>
 ),
 error: (
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 shrink-0">
 <AlertCircle className="h-[18px] w-[18px] text-red-500" />
 </div>
 ),
 warning: (
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 shrink-0">
 <AlertTriangle className="h-[18px] w-[18px] text-amber-500" />
 </div>
 ),
 info: (
 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 shrink-0">
 <Info className="h-[18px] w-[18px] text-blue-500" />
 </div>
 ),
 }}
 closeButton
 {...props}
 />
 );
};

export { Toaster, toast };
