import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PdfAnnotation } from '@/lib/pdfDocuments';
import {
  canPlaceSignature,
  DEFAULT_SIGNATURE_FONT,
  DEFAULT_SIGNATURE_INK,
  DEFAULT_SIGNATURE_ROLE,
  getLastSignatureMode,
  resolveSignatureData,
  setLastSignatureMode,
  SIGNATURE_FONTS,
  SIGNATURE_INK_COLORS,
  type SignatureDraft,
  type SignatureFontName,
  type SignatureMode,
} from '@/lib/pdfSignature';
import { cn } from '@/lib/utils';
import { PdfSignaturePad, type SignatureStroke } from './PdfSignaturePad';
import { SignatureStamp } from './PdfSignatureStamp';

export function PdfSignatureDialog({
  open,
  editingAnnotation,
  defaultName,
  defaultDate,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingAnnotation?: PdfAnnotation | null;
  defaultName: string;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (draft: SignatureDraft) => void;
}) {
  const isEdit = Boolean(editingAnnotation);
  const [mode, setMode] = useState<SignatureMode>(() => getLastSignatureMode());
  const [inkColor, setInkColor] = useState(DEFAULT_SIGNATURE_INK);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [baseImage, setBaseImage] = useState<string | undefined>(undefined);
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | undefined>(undefined);
  const [signatureText, setSignatureText] = useState('');
  const [signatureFont, setSignatureFont] = useState<SignatureFontName>(DEFAULT_SIGNATURE_FONT);
  const [signerName, setSignerName] = useState(defaultName);
  const [signerRole, setSignerRole] = useState(DEFAULT_SIGNATURE_ROLE);
  const [signedDate, setSignedDate] = useState(defaultDate);

  useEffect(() => {
    if (!open) return;
    if (editingAnnotation) {
      const resolved = resolveSignatureData(editingAnnotation);
      setMode(resolved.signatureMode);
      setInkColor(resolved.inkColor);
      setStrokes([]);
      setBaseImage(resolved.signatureMode === 'draw' ? resolved.signatureImage : undefined);
      setDrawnDataUrl(resolved.signatureMode === 'draw' ? resolved.signatureImage : undefined);
      setSignatureText(resolved.signatureMode === 'type' ? resolved.signatureText : resolved.signerName);
      setSignatureFont(resolved.signatureFont);
      setSignerName(resolved.signerName);
      setSignerRole(resolved.signerRole);
      setSignedDate(resolved.signedDate);
    } else {
      setMode(getLastSignatureMode());
      setInkColor(DEFAULT_SIGNATURE_INK);
      setStrokes([]);
      setBaseImage(undefined);
      setDrawnDataUrl(undefined);
      setSignatureText(defaultName);
      setSignatureFont(DEFAULT_SIGNATURE_FONT);
      setSignerName(defaultName);
      setSignerRole(DEFAULT_SIGNATURE_ROLE);
      setSignedDate(defaultDate);
    }
  }, [open, editingAnnotation, defaultName, defaultDate]);

  const handleModeChange = (next: SignatureMode) => {
    setMode(next);
    setLastSignatureMode(next);
  };

  const handleClearDraw = useCallback(() => {
    setStrokes([]);
    setBaseImage(undefined);
    setDrawnDataUrl(undefined);
  }, []);

  const canPlace = canPlaceSignature({
    signatureMode: mode,
    signatureImage: drawnDataUrl,
    signatureText,
    hasDrawnStrokes: strokes.length > 0,
  });

  const previewSignature = {
    signatureMode: mode,
    signatureImage: mode === 'draw' ? drawnDataUrl : undefined,
    signatureText: mode === 'type' ? signatureText : '',
    signatureFont,
    inkColor,
    signerName,
    signerRole,
    signedDate,
  };

  const handleSubmit = () => {
    if (!canPlace) return;
    setLastSignatureMode(mode);
    onSubmit({
      signatureMode: mode,
      signatureImage: mode === 'draw' ? drawnDataUrl : undefined,
      signatureText: mode === 'type' ? signatureText : '',
      signatureFont,
      inkColor,
      signerName,
      signerRole,
      signedDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent aria-describedby={undefined} className="w-[440px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit signature' : 'Add signature'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div role="tablist" aria-label="Signature input mode" className="grid grid-cols-2 gap-1 rounded-[8px] bg-muted p-1">
            {(['draw', 'type'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => handleModeChange(tab)}
                className={cn(
                  'h-8 rounded-[6px] text-[13px] font-medium transition-colors',
                  mode === tab ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'draw' ? 'Draw' : 'Type'}
              </button>
            ))}
          </div>

          {mode === 'draw' ? (
            <PdfSignaturePad
              strokes={strokes}
              baseImage={baseImage}
              inkColor={inkColor}
              onChangeStrokes={setStrokes}
              onClearAll={handleClearDraw}
              onExportImage={setDrawnDataUrl}
            />
          ) : (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="signature-type-input" className="text-xs">Signature</Label>
                <Input
                  id="signature-type-input"
                  autoFocus
                  value={signatureText}
                  placeholder="Type your signature"
                  onChange={(event) => setSignatureText(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && canPlace) { event.preventDefault(); handleSubmit(); } }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Signature style">
                {SIGNATURE_FONTS.map((font) => {
                  const selected = signatureFont === font.name;
                  return (
                    <button
                      key={font.name}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={font.name}
                      onClick={() => setSignatureFont(font.name)}
                      className={cn(
                        'flex h-12 items-center justify-center overflow-hidden rounded-[8px] border bg-white px-2 text-center',
                        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                      )}
                    >
                      <span data-signature-font={font.name} className="truncate text-[19px] leading-tight" style={{ fontFamily: font.cssFamily, color: inkColor }}>
                        {signatureText.trim() || 'Signature'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Ink colour</span>
            <div className="flex items-center gap-2">
              {SIGNATURE_INK_COLORS.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  aria-label={`Ink colour ${swatch.label}`}
                  aria-pressed={inkColor === swatch.value}
                  onClick={() => setInkColor(swatch.value)}
                  className={cn(
                    'h-6 w-6 rounded-full border',
                    inkColor === swatch.value ? 'border-primary ring-2 ring-primary/40 ring-offset-1' : 'border-border',
                  )}
                  style={{ backgroundColor: swatch.value }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="signature-signer-name" className="text-xs">Name</Label>
              <Input
                id="signature-signer-name"
                value={signerName}
                placeholder="Reviewer name"
                onChange={(event) => setSignerName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="signature-signer-role" className="text-xs">Role / caption</Label>
              <Input
                id="signature-signer-role"
                value={signerRole}
                placeholder="Reviewed by"
                onChange={(event) => setSignerRole(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="signature-signed-date" className="text-xs">Date</Label>
              <Input
                id="signature-signed-date"
                type="date"
                value={signedDate}
                onChange={(event) => setSignedDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-foreground">Preview</span>
            <div className="flex items-center justify-center rounded-[8px] border border-border bg-muted/40 p-3">
              <SignatureStamp signature={previewSignature} placeholder />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!canPlace} onClick={handleSubmit}>
            {isEdit ? 'Save signature' : 'Place signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}