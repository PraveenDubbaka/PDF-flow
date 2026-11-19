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
          <Button
            variant="secondary"
            size="sm"
            aria-label="More edit options"
            className="h-full w-7 rounded-l-none border-0 px-0 [&_svg]:size-4"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="pdf-edit-split-menu min-w-0 w-auto rounded-[8px] border border-border bg-popover px-0 py-1 text-popover-foreground shadow-elevation-2 outline-none"
        >
          <DropdownMenuItem
            data-slot="split-button-item"
            className="h-8 gap-2 rounded-[8px] px-3 py-2 text-[13px] font-normal"
            onSelect={onEditInWindow}
          >
            <ExternalLink className="h-4 w-4" />Edit in Window
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
