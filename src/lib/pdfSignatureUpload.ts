export const MAX_SIGNATURE_UPLOAD_BYTES = 2 * 1024 * 1024;
export const SIGNATURE_UPLOAD_ACCEPT = '.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']);
const ALLOWED_EXTENSIONS = /\.(png|jpe?g|svg)$/i;

export function validateSignatureUploadFile(file: { name: string; type: string; size: number }): string | null {
  const mime = (file.type || '').toLowerCase().trim();
  const validType = (mime && ALLOWED_MIME_TYPES.has(mime)) || (!mime && ALLOWED_EXTENSIONS.test(file.name)) || ALLOWED_EXTENSIONS.test(file.name);
  if (!validType || (mime && !ALLOWED_MIME_TYPES.has(mime))) {
    return 'Unsupported file type. Please choose a PNG, JPG, or SVG image.';
  }
  if (file.size <= 0) {
    return 'This file is empty. Please choose another image.';
  }
  if (file.size > MAX_SIGNATURE_UPLOAD_BYTES) {
    return 'File is too large. Maximum size is 2 MB.';
  }
  return null;
}

/** Turn near-white pixels transparent (with soft anti-alias feathering) in an RGBA pixel buffer. */
export function removeNearWhitePixels(data: Uint8ClampedArray, threshold = 240): void {
  const featherStart = Math.max(0, threshold - 24);
  const featherSpan = Math.max(1, threshold - featherStart);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha === 0) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
      continue;
    }
    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    if (minChannel >= featherStart && maxChannel - minChannel <= 24) {
      const avg = (r + g + b) / 3;
      const factor = Math.max(0, Math.min(1, (threshold - avg) / featherSpan));
      data[i + 3] = Math.round(alpha * factor);
    }
  }
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

const MAX_OUTPUT_WIDTH = 720;
const MAX_OUTPUT_HEIGHT = 280;

/** Rasterize an uploaded PNG/JPG/SVG into a PNG data URL, optionally stripping near-white background. */
export function processUploadedSignatureImage(sourceDataUrl: string, removeBackground: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(sourceDataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const rawW = img.naturalWidth || 360;
      const rawH = img.naturalHeight || 140;
      const scale = Math.min(1, MAX_OUTPUT_WIDTH / rawW, MAX_OUTPUT_HEIGHT / rawH);
      const width = Math.max(1, Math.round(rawW * scale));
      const height = Math.max(1, Math.round(rawH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      if (removeBackground) {
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          removeNearWhitePixels(imageData.data);
          ctx.putImageData(imageData, 0, 0);
        } catch {
          // Ignore canvas pixel access restrictions if any.
        }
      }
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => reject(new Error('Could not load this image. Please try another PNG, JPG, or SVG file.'));
    img.src = sourceDataUrl;
  });
}