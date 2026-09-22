import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle,
 DialogFooter,
 DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, Trash2, X } from 'lucide-react';

interface UnsavedChangesDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSave: () => void;
 onDiscard: () => void;
}

export function UnsavedChangesDialog({ 
 open, 
 onOpenChange, 
 onSave,
 onDiscard
}: UnsavedChangesDialogProps) {
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle className="text-lg font-semibold">Unsaved Changes</DialogTitle>
 <DialogDescription className="text-muted-foreground">
 You have unsaved changes. Would you like to save them before leaving?
 </DialogDescription>
 </DialogHeader>
 
 <DialogFooter className="flex flex-row items-center gap-2 pt-4 justify-end">
 <Button 
 variant="outline" 
 onClick={() => onOpenChange(false)}
 size="sm"
 >
 <X className="h-4 w-4" />
 Cancel
 </Button>
 <Button 
 variant="destructive"
 onClick={() => {
 onDiscard();
 onOpenChange(false);
 }}
 size="sm"
 >
 <Trash2 className="h-4 w-4" />
 Discard
 </Button>
 <Button 
 onClick={() => {
 onSave();
 onOpenChange(false);
 }}
 size="sm"
 >
 <Save className="h-4 w-4" />
 Save
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
