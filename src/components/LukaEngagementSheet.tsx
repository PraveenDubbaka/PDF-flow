import { useState } from "react";
import { Zap, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SECTIONS = [
 {
 code: "CO",
 label: "Client Onboarding",
 forms: 3,
 estimatedPct: 75,
 },
 {
 code: "PL",
 label: "Planning",
 forms: 8,
 estimatedPct: 80,
 },
 {
 code: "RA",
 label: "Risk Assessment",
 forms: 20,
 estimatedPct: 65,
 },
 {
 code: "RP",
 label: "Response to Risk",
 forms: 11,
 estimatedPct: 70,
 },
 {
 code: "SO",
 label: "Completion & Signoffs",
 forms: 20,
 estimatedPct: 60,
 },
];

const SECTION_BADGE_COLORS: Record<string, string> = {
 CO: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
 PL: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
 RA: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
 RP: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
 SO: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

interface LukaEngagementSheetProps {
 open: boolean;
 onOpenChange: (v: boolean) => void;
 engagementLabel: string;
 sources: string[];
 onAutoFillAll: () => void;
 onStartSectionBySection: () => void;
}

export function LukaEngagementSheet({
 open,
 onOpenChange,
 engagementLabel,
 sources,
 onAutoFillAll,
 onStartSectionBySection,
}: LukaEngagementSheetProps) {
 const [checked, setChecked] = useState<Record<string, boolean>>(() =>
 Object.fromEntries(SECTIONS.map(s => [s.code, true]))
 );

 const toggleSection = (code: string) => {
 setChecked(prev => ({...prev, [code]: !prev[code] }));
 };

 const selectedCount = Object.values(checked).filter(Boolean).length;

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
 {/* Header */}
 <div className="px-6 pt-6 pb-4 border-b border-border">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] flex items-center justify-center shrink-0">
 <Zap className="h-5 w-5 text-white fill-white" strokeWidth={0} />
 </div>
 <div className="min-w-0">
 <SheetTitle className="text-base font-semibold leading-tight">Luka Engagement Plan</SheetTitle>
 <p className="text-xs text-muted-foreground truncate mt-0.5">{engagementLabel}</p>
 </div>
 </div>

 {/* Connected sources */}
 {sources.length > 0 && (
 <div className="flex flex-wrap gap-1.5">
 {sources.map(src => (
 <span
 key={src}
 className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] px-2.5 py-0.5 font-medium"
 >
 ⇌ {src}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Section list */}
 <ScrollArea className="flex-1 px-6 py-4">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
 Engagement auto-fill plan
 </p>

 <div className="space-y-2">
 {SECTIONS.map((section, idx) => (
 <div key={section.code}>
 <div
 className={cn(
 "flex items-center gap-3 rounded-lg px-3 py-3 border transition-colors",
 checked[section.code]
 ? "border-border bg-card"
 : "border-border/50 bg-muted/30 opacity-60"
 )}
 >
 <Checkbox
 id={`section-${section.code}`}
 checked={checked[section.code]}
 onCheckedChange={() => toggleSection(section.code)}
 className="shrink-0"
 />
 <span
 className={cn(
 "text-[11px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0",
 SECTION_BADGE_COLORS[section.code]
 )}
 >
 {section.code}
 </span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <span className="text-sm font-medium text-foreground truncate">{section.label}</span>
 <span className="text-xs text-muted-foreground shrink-0">{section.forms} forms</span>
 </div>
 {/* Coverage bar */}
 <div className="mt-1.5 flex items-center gap-2">
 <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4] transition-all"
 style={{ width: `${section.estimatedPct}%` }}
 />
 </div>
 <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">~{section.estimatedPct}%</span>
 </div>
 </div>
 </div>

 {/* Arrow connector between sections */}
 {idx < SECTIONS.length - 1 && (
 <div className="flex justify-center py-1">
 <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 rotate-90" />
 </div>
 )}
 </div>
 ))}
 </div>

 <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
 Luka fills each field one by one with citations from connected sources. Items requiring professional judgment stay flagged for review.
 </p>
 </ScrollArea>

 {/* Footer CTAs */}
 <div className="px-6 pb-6 pt-4 border-t border-border space-y-2.5">
 <Button
 className="w-full h-10 gap-2 bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity text-white border-0"
 disabled={selectedCount === 0}
 onClick={() => { onOpenChange(false); onAutoFillAll(); }}
 >
 <Zap className="h-4 w-4 fill-white" strokeWidth={0} />
 Auto-fill entire engagement
 </Button>
 <Button
 variant="outline"
 className="w-full h-10"
 onClick={() => { onOpenChange(false); onStartSectionBySection(); }}
 >
 Start section by section
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
