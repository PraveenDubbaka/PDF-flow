import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteChecklistDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onConfirm: () => void;
}

export function DeleteChecklistDialog({ open, onOpenChange, onConfirm }: DeleteChecklistDialogProps) {
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[400px] bg-white border shadow-xl rounded-2xl p-6">
 <div className="flex flex-col items-center text-center gap-4">
 {/* Trash Icon */}
 <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
 <Trash2 className="h-7 w-7 text-destructive" />
 </div>

 <DialogHeader className="space-y-2">
 <DialogTitle className="text-lg font-semibold text-foreground">
 Delete Template
 </DialogTitle>
 <p className="text-sm text-muted-foreground">
 Are you sure you want to delete checklist from a section? This action cannot be undone.
 </p>
 </DialogHeader>

 <DialogFooter className="flex flex-row gap-3 w-full sm:justify-center pt-2">
 <Button
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="flex-1 h-10"
 >
 Cancel
 </Button>
 <Button
 variant="destructive"
 onClick={() => {
 onConfirm();
 onOpenChange(false);
 }}
 className="flex-1 h-10"
 >
 Delete
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>
 );
}
