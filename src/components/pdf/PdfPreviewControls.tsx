import { Check, ChevronDown, Maximize, MoveHorizontal, Shrink, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PdfFitMode } from '@/lib/pdfPreviewView';

const fitLabel: Record<Exclude<PdfFitMode, null>, string> = { page: 'Fit to page', width: 'Fit width' };

// The main button cycles: not fitted -> fit to page -> fit width -> fit to page -> ...
function nextFitMode(fit: PdfFitMode): Exclude<PdfFitMode, null> {
  return fit === 'page' ? 'width' : 'page';
}

export function PdfPreviewControls({ fit, onFit, onRotate }: { fit: PdfFitMode; onFit: (mode: PdfFitMode) => void; onRotate: (direction: 1 | -1) => void }) {
  const next = nextFitMode(fit);
  const FitIcon = fit === 'width' ? MoveHorizontal : fit === 'page' ? Shrink : Maximize;
  return <div className="pdf-view-controls flex items-center gap-2" role="group" aria-label="PDF viewing controls">
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="sm" className="rounded-r-none" aria-label={fit ? fitLabel[fit] : 'Fit'} aria-pressed={fit !== null} onClick={() => onFit(next)}>
            <FitIcon /><span className="pdf-fit-label">{fit ? fitLabel[fit] : 'Fit to page'}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{fitLabel[next]}</TooltipContent>
      </Tooltip>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="sm" className="w-7 rounded-l-none border-l-0 px-0" aria-label="Fit options"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onFit('page')}>Fit to page{fit === 'page' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem><DropdownMenuItem onSelect={() => onFit('width')}>Fit width{fit === 'width' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </div>
    <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="w-8 px-0" aria-label="Rotate view left (not saved)" onClick={() => onRotate(-1)}><RotateCcw /></Button></TooltipTrigger><TooltipContent>Rotate view left (not saved)</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="w-8 px-0" aria-label="Rotate view right (not saved)" onClick={() => onRotate(1)}><RotateCw /></Button></TooltipTrigger><TooltipContent>Rotate view right (not saved)</TooltipContent></Tooltip>
  </div>;
}
