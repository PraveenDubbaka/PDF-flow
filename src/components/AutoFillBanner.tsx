import { Sparkles } from "lucide-react";

interface AutoFillBannerProps {
 entityName: string;
 periodEndDisplay: string;
 framework: string;
 /** Short summary of what was auto-populated (e.g. "materiality, FSA balances, revenue streams"). */
 populated?: string;
}

/**
 * Soft info banner shown at the top of Risk-Assessment worksheets to indicate
 * that header fields, materiality and seed rows have been pre-filled from the
 * Trial Balance and Planning section. Fields remain user-editable.
 */
export function AutoFillBanner({ entityName, periodEndDisplay, framework, populated }: AutoFillBannerProps) {
 return (
 <div className="rounded-md border border-primary/20 bg-primary/[0.04] px-4 py-2.5 flex items-start gap-2.5">
 <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <div className="text-xs leading-relaxed flex-1 min-w-0">
 <span className="font-semibold text-primary">Auto-populated</span>
 <span className="text-muted-foreground"> from Trial Balance + Planning (Forms 400 / 410 / 420) — </span>
 <span className="text-foreground font-medium">{entityName}</span>
 <span className="text-muted-foreground"> · period ended </span>
 <span className="text-foreground font-medium">{periodEndDisplay}</span>
 <span className="text-muted-foreground"> · </span>
 <span className="text-foreground font-medium">{framework.split("—")[0].trim()}</span>
 {populated && (
 <>
 <span className="text-muted-foreground">. Pre-filled: </span>
 <span className="text-foreground">{populated}</span>
 <span className="text-muted-foreground">. All fields remain editable.</span>
 </>
 )}
 </div>
 </div>
 );
}
