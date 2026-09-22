import { useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Share2, Monitor, Smartphone, X, Check } from "lucide-react";
import { toast } from "sonner";

type ShareScope = "all" | "selected";
type ShareMethod = "portal" | "app";

interface ShareWithClientDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 checklistName?: string;
 onConfirm?: (scope: ShareScope, method: ShareMethod) => void;
 hasSelectedQuestions?: boolean;
 isLetter?: boolean;
}

export function ShareWithClientDialog({
 open,
 onOpenChange,
 checklistName,
 onConfirm,
 hasSelectedQuestions = false,
 isLetter = false,
}: ShareWithClientDialogProps) {
 const [clientPortalSelected, setClientPortalSelected] = useState(false);
 const [clientAppSelected, setClientAppSelected] = useState(false);
 const [shareScope, setShareScope] = useState<ShareScope>("all");

 const reset = () => {
 setClientPortalSelected(false);
 setClientAppSelected(false);
 setShareScope("all");
 };

 const handleConfirm = () => {
 if (!clientPortalSelected && !clientAppSelected) {
 toast.error("Please select a sharing method");
 return;
 }
 // Client App takes priority when chosen — opens preview flow
 const method: ShareMethod = clientAppSelected ? "app" : "portal";
 onConfirm?.(shareScope, method);
 if (method === "portal") {
 toast.success(
 shareScope === "all"
 ? "All questions shared via Client Portal"
 : "Selected questions shared via Client Portal"
 );
 }
 onOpenChange(false);
 reset();
 };

 const handleCancel = () => {
 onOpenChange(false);
 reset();
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader className="flex flex-col items-center text-center">
 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
 <Share2 className="h-5 w-5 text-primary" />
 </div>
 <DialogTitle className="text-lg font-semibold">
 Share With Client
 </DialogTitle>
 </DialogHeader>

 <div className="py-4 space-y-4">
 {/* Share scope — hidden for letters (no questions to select) */}
 {!isLetter && <div>
 <p className="text-sm font-medium text-muted-foreground mb-3">
 What to Share
 </p>
 <RadioGroup
 value={shareScope}
 onValueChange={(v) => setShareScope(v as ShareScope)}
 className="space-y-2"
 >
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 shareScope === "all"
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 }`}
 >
 <RadioGroupItem value="all" id="share-all" />
 <Label htmlFor="share-all" className="text-sm font-medium cursor-pointer">
 Share All Questions
 </Label>
 </label>
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 shareScope === "selected"
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 } ${!hasSelectedQuestions ? "opacity-50 cursor-not-allowed" : ""}`}
 >
 <RadioGroupItem value="selected" id="share-selected" disabled={!hasSelectedQuestions} />
 <Label
 htmlFor="share-selected"
 className={`text-sm font-medium ${hasSelectedQuestions ? "cursor-pointer" : "cursor-not-allowed"}`}
 >
 Share Selected Questions
 {!hasSelectedQuestions && (
 <span className="block text-xs text-muted-foreground font-normal mt-0.5">
 No questions selected
 </span>
 )}
 </Label>
 </label>
 </RadioGroup>
 </div>}

 {/* Share method */}
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-3">
 Share Via
 </p>
 <div className="space-y-2">
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 clientPortalSelected
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 }`}
 >
 <Checkbox
 checked={clientPortalSelected}
 onCheckedChange={(checked) =>
 setClientPortalSelected(checked === true)
 }
 />
 <Monitor className="h-4 w-4 text-emerald-600" />
 <span className="text-sm font-medium">Client Portal</span>
 </label>
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 clientAppSelected
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 }`}
 >
 <Checkbox
 checked={clientAppSelected}
 onCheckedChange={(checked) =>
 setClientAppSelected(checked === true)
 }
 />
 <Smartphone className="h-4 w-4 text-blue-600" />
 <div className="flex-1">
 <span className="text-sm font-medium block">Client App</span>
 <span className="text-xs text-muted-foreground">
 Preview how your client will respond on mobile
 </span>
 </div>
 </label>
 </div>
 </div>
 </div>

 <DialogFooter className="flex sm:flex-row gap-2">
 <Button
 variant="outline"
 onClick={handleCancel}
 className="flex-1"
 >
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button
 onClick={handleConfirm}
 disabled={!clientPortalSelected && !clientAppSelected}
 className="flex-1"
 >
 <Check className="h-4 w-4" />
 Confirm
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}