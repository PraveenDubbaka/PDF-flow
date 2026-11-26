export type PdfFitMode = 'page' | 'width' | null;

export function rotatePreview(rotation: number, direction: 1 | -1) {
  return ((rotation + direction * 90) % 360 + 360) % 360;
}

// Page dimensions include the source PDF's intrinsic rotation, at scale 1.25.
export function fitPreviewZoom(page: { width: number; height: number }, viewport: { width: number; height: number }, rotation: number, mode: Exclude<PdfFitMode, null>) {
  const sideways = Math.abs(rotation % 180) === 90;
  const width = sideways ? page.height : page.width;
  const height = sideways ? page.width : page.height;
  if (width <= 0 || height <= 0 || viewport.width <= 48 || viewport.height <= 48) return 1;
  const widthZoom = (viewport.width - 48) / width;
  return mode === 'width' ? widthZoom : Math.min(widthZoom, (viewport.height - 48) / height);
}

export function pdfViewShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, inText: boolean): 'fit' | 'left' | 'right' | null {
  if (inText) return null;
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key === '0') return 'fit';
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'r') return event.shiftKey ? 'left' : 'right';
  return null;
}
