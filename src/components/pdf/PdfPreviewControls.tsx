import { ChevronDown, Maximize, Shrink, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PdfFitMode } from '@/lib/pdfPreviewView';

export function PdfPreviewControls({ fit, onFit, onRotate }: { fit: PdfFitMode; onFit: (mode: PdfFitMode) => void; onRotate: (direction: 1 | -1) => void }) {
  return <div className="pdf-letter-view-controls flex items-center gap-2" role="group" aria-label="Letter viewing controls">
    <div className="flex items-center">
      <Button variant="secondary" size="sm" className="rounded-r-none" aria-pressed={fit !== null} onClick={() => onFit(fit ? null : 'page')}>
        {fit ? <Shrink /> : <Maximize />}<span className="pdf-letter-fit-label">{fit === 'width' ? 'Fit width' : 'Fit to page'}</span>
      </Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="sm" className="w-7 rounded-l-none border-l-0 px-0" aria-label="Fit options"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onFit('page')}>Fit to page</DropdownMenuItem><DropdownMenuItem onSelect={() => onFit('width')}>Fit width</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </div>
    <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="w-8 px-0" aria-label="Rotate left" onClick={() => onRotate(-1)}><RotateCcw /></Button></TooltipTrigger><TooltipContent>Rotate left (Shift+R)</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="w-8 px-0" aria-label="Rotate right" onClick={() => onRotate(1)}><RotateCw /></Button></TooltipTrigger><TooltipContent>Rotate right (R)</TooltipContent></Tooltip>
  </div>;
}