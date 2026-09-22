import { useState, useEffect } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Check } from "lucide-react";
import { Assignee } from "@/types/checklist";

type AssignScope = "all" | "selected";

interface AssignmentDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 checklistName?: string;
 hasSelectedQuestions?: boolean;
 onConfirm: (scope: AssignScope, assignee: Assignee) => void;
}

const TEAM_MEMBERS: Assignee[] = [
 { id: "c1", name: "Robert Morrison", initials: "RM", role: "CEO", type: "client" },
 { id: "c2", name: "Sarah Chen", initials: "SC", role: "CFO", type: "client" },
 { id: "c3", name: "David Patel", initials: "DP", role: "Controller", type: "client" },
 { id: "c4", name: "Lisa Nguyen", initials: "LN", role: "VP Finance", type: "client" },
 { id: "s1", name: "Michael Torres", initials: "MT", role: "Engagement Partner", type: "staff" },
 { id: "s2", name: "Emma Wilson", initials: "EW", role: "Senior Auditor", type: "staff" },
 { id: "s3", name: "James Kim", initials: "JK", role: "Staff Auditor", type: "staff" },
 { id: "s4", name: "Priya Sharma", initials: "PS", role: "Manager", type: "staff" },
];

export function AssignmentDialog({
 open,
 onOpenChange,
 checklistName,
 hasSelectedQuestions = false,
 onConfirm,
}: AssignmentDialogProps) {
 const [scope, setScope] = useState<AssignScope>("all");
 const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

 const reset = () => {
 setScope("all");
 setSelectedMemberId(null);
 };

 useEffect(() => {
 if (!open) reset();
 }, [open]);

 const handleConfirm = () => {
 const member = TEAM_MEMBERS.find((m) => m.id === selectedMemberId);
 if (!member) return;
 onConfirm(scope, member);
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
 <UserPlus className="h-5 w-5 text-primary" />
 </div>
 <DialogTitle className="text-lg font-semibold">
 Assign {checklistName ? `"${checklistName}"` : "Questions"}
 </DialogTitle>
 </DialogHeader>

 <div className="py-4 space-y-4">
 {/* Scope */}
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-3">What to Assign</p>
 <RadioGroup
 value={scope}
 onValueChange={(v) => setScope(v as AssignScope)}
 className="space-y-2"
 >
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 scope === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
 }`}
 >
 <RadioGroupItem value="all" id="assign-all" />
 <Label htmlFor="assign-all" className="text-sm font-medium cursor-pointer">
 Assign All Questions
 </Label>
 </label>
 <label
 className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
 scope === "selected"
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 } ${!hasSelectedQuestions ? "opacity-50 cursor-not-allowed" : ""}`}
 >
 <RadioGroupItem value="selected" id="assign-selected" disabled={!hasSelectedQuestions} />
 <Label
 htmlFor="assign-selected"
 className={`text-sm font-medium ${hasSelectedQuestions ? "cursor-pointer" : "cursor-not-allowed"}`}
 >
 Assign Selected Questions
 {!hasSelectedQuestions && (
 <span className="block text-xs text-muted-foreground font-normal mt-0.5">
 No questions selected
 </span>
 )}
 </Label>
 </label>
 </RadioGroup>
 </div>

 {/* Team member list */}
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-3">Assign To</p>
 <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
 {/* Client contacts */}
 <p className="text-xs text-muted-foreground px-1 pb-0.5">Client Contacts</p>
 {TEAM_MEMBERS.filter((m) => m.type === "client").map((member) => (
 <button
 key={member.id}
 type="button"
 onClick={() => setSelectedMemberId(member.id)}
 className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
 selectedMemberId === member.id
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 }`}
 >
 <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold flex items-center justify-center">
 {member.initials}
 </span>
 <span className="flex-1 min-w-0">
 <span className="block text-sm font-medium text-foreground">{member.name}</span>
 <span className="block text-xs text-muted-foreground">{member.role}</span>
 </span>
 <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-blue-500/10 text-blue-600 font-medium shrink-0">
 Client
 </span>
 </button>
 ))}

 {/* Firm staff */}
 <p className="text-xs text-muted-foreground px-1 pb-0.5 pt-2">Firm Staff</p>
 {TEAM_MEMBERS.filter((m) => m.type === "staff").map((member) => (
 <button
 key={member.id}
 type="button"
 onClick={() => setSelectedMemberId(member.id)}
 className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
 selectedMemberId === member.id
 ? "border-primary bg-primary/5"
 : "border-border hover:bg-muted/50"
 }`}
 >
 <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 text-xs font-semibold flex items-center justify-center">
 {member.initials}
 </span>
 <span className="flex-1 min-w-0">
 <span className="block text-sm font-medium text-foreground">{member.name}</span>
 <span className="block text-xs text-muted-foreground">{member.role}</span>
 </span>
 <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-violet-500/10 text-violet-600 font-medium shrink-0">
 Staff
 </span>
 </button>
 ))}
 </div>
 </div>
 </div>

 <DialogFooter className="flex sm:flex-row gap-2">
 <Button variant="outline" onClick={handleCancel} className="flex-1">
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button onClick={handleConfirm} disabled={!selectedMemberId} className="flex-1">
 <Check className="h-4 w-4" />
 Assign
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
