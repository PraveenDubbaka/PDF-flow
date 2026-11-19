import { ChevronDown, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type PdfEditSplitButtonProps = {
  onEdit: () => void;
  onEditInWindow: () => void;
  /** Hidden when the document is already open in its own window. */
  showWindowItem?: boolean;
};

export function PdfEditSplitButton({ onEdit, onEditInWindow, showWindowItem = true }: PdfEditSplitButtonProps) {
  if (!showWindowItem) {
    return <Button variant="secondary" size="sm" onClick={onEdit}><Pencil />Edit</Button>;
  }

  return (
    <div
      data-slot="split-button"
      className="pdf-edit-split flex h-8 items-stretch rounded-[10px] border border-secondary-button-border bg-secondary-button"
    >
      <Button variant="secondary" size="sm" className="h-full rounded-r-none border-0" onClick={onEdit}>
        <Pencil />Edit
      </Button>
      <span aria-hidden className="w-px shrink-0 self-stretch bg-secondary-button-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" aria-label="More edit options" className="h-full w-7 rounded-l-none border-0 px-0">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-0">
          <DropdownMenuItem data-slot="split-button-item" onSelect={onEditInWindow}>
            <ExternalLink />Edit in Window
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
