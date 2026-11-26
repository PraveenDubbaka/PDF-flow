import { useRef, useState } from 'react';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SIGNATURE_UPLOAD_ACCEPT } from '@/lib/pdfSignatureUpload';
import { cn } from '@/lib/utils';

/** Upload drop zone and 360x140 preview for signature images (PNG, JPG, SVG, max 2 MB). */
export function PdfSignatureUpload({
  previewUrl,
  removeBackground,
  error,
  processing,
  onSelectFile,
  onToggleRemoveBackground,
  onRemove,
}: {
  previewUrl?: string;
  removeBackground: boolean;
  error: string | null;
  processing: boolean;
  onSelectFile: (file: File) => void;
  onToggleRemoveBackground: (checked: boolean) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const triggerFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        aria-label="Upload signature image"
        accept={SIGNATURE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />

      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'relative mx-auto flex h-[140px] w-full max-w-[360px] flex-col items-center justify-center overflow-hidden rounded-[8px] border border-dashed bg-white px-4 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        {previewUrl ? (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-7 border-b border-dashed border-border/80" />
            <img
              src={previewUrl}
              alt="Uploaded signature preview"
              className="relative z-10 max-h-[120px] max-w-[336px] select-none object-contain"
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground opacity-70" />
            <p className="text-xs text-muted-foreground">Drop PNG, JPG, or SVG here (max 2 MB)</p>
            <Button type="button" variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={triggerFilePicker}>
              Choose file
            </Button>
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="signature-remove-bg"
              checked={removeBackground}
              disabled={processing}
              onCheckedChange={(checked) => onToggleRemoveBackground(checked === true)}
            />
            <Label htmlFor="signature-remove-bg" className="cursor-pointer text-xs font-normal text-foreground">
              Remove background
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={triggerFilePicker}>
              <RefreshCw className="h-3.5 w-3.5" />Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />Remove
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}