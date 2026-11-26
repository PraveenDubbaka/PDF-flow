import type { PdfAnnotation } from './pdfDocuments';

export type SignatureMode = 'draw' | 'type' | 'upload';
export type SignatureFontName = 'Dancing Script' | 'Great Vibes' | 'Caveat';

export interface SignatureInkOption {
  value: string;
  label: string;
}

export interface SignatureFontOption {
  name: SignatureFontName;
  cssFamily: string;
  ttfUrl: string;
}

export const DEFAULT_SIGNATURE_INK = '#1f2a44';
export const DEFAULT_SIGNATURE_ROLE = 'Reviewed by';
export const DEFAULT_SIGNATURE_FONT: SignatureFontName = 'Dancing Script';

export const SIGNATURE_INK_COLORS: SignatureInkOption[] = [
  { value: '#1f2a44', label: 'Dark ink' },
  { value: '#111827', label: 'Black' },
  { value: '#1d4ed8', label: 'Dark blue' },
];

export const SIGNATURE_FONTS: SignatureFontOption[] = [
  { name: 'Dancing Script', cssFamily: "'Dancing Script', cursive", ttfUrl: '/fonts/DancingScript.ttf' },
  { name: 'Great Vibes', cssFamily: "'Great Vibes', cursive", ttfUrl: '/fonts/GreatVibes.ttf' },
  { name: 'Caveat', cssFamily: "'Caveat', cursive", ttfUrl: '/fonts/Caveat.ttf' },
];

export interface SignatureDraft {
  signatureMode: SignatureMode;
  signatureImage?: string;
  signatureText: string;
  signatureFont: SignatureFontName;
  inkColor: string;
  signerName: string;
  signerRole: string;
  signedDate: string;
}

export interface ResolvedSignature {
  signatureMode: SignatureMode;
  signatureImage?: string;
  signatureText: string;
  signatureFont: SignatureFontName;
  inkColor: string;
  signerName: string;
  signerRole: string;
  signedDate: string;
}

const SESSION_MODE_KEY = 'pdf-signature-last-mode';
let memoryLastMode: SignatureMode = 'draw';

export function getLastSignatureMode(): SignatureMode {
  try {
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_MODE_KEY) : null;
    if (stored === 'draw' || stored === 'type' || stored === 'upload') return stored;
  } catch {
    // Fall back to in-memory session state.
  }
  return memoryLastMode;
}

export function setLastSignatureMode(mode: SignatureMode): void {
  memoryLastMode = mode;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_MODE_KEY, mode);
  } catch {
    // Ignore storage unavailability.
  }
}

export function resolveSignatureFont(font?: string): SignatureFontOption {
  return SIGNATURE_FONTS.find((option) => option.name === font) ?? SIGNATURE_FONTS[0];
}

export function formatSignatureCaption(role: string, name: string): string {
  return [role.trim(), name.trim()].filter(Boolean).join(' ');
}

function parseLegacySignerLabel(raw: string): { role: string; name: string } {
  const cleaned = raw.replace(/\s*·\s*\d{4}-\d{2}-\d{2}\s*$/, '').trim();
  const match = cleaned.match(/^(Reviewed by|Approved by|Prepared by|Signed by)\s+(.+)$/i);
  if (match && match[1] && match[2]) {
    return { role: match[1].trim(), name: match[2].trim() };
  }
  return { role: '', name: cleaned };
}

/** Resolve both new signature stamp annotations and legacy signerLabel/signedDate records. */
export function resolveSignatureData(annotation: Partial<PdfAnnotation>): ResolvedSignature {
  const inkColor = annotation.inkColor || annotation.color || DEFAULT_SIGNATURE_INK;
  const signedDate = (annotation.signedDate ?? '').trim();

  if (annotation.signatureMode === 'draw' || annotation.signatureMode === 'type' || annotation.signatureMode === 'upload') {
    const signerName = (annotation.signerName ?? '').trim();
    const signerRole = (annotation.signerRole ?? '').trim();
    const signatureFont = resolveSignatureFont(annotation.signatureFont).name;
    const signatureText = (annotation.signatureText ?? signerName).trim();
    return {
      signatureMode: annotation.signatureMode,
      signatureImage: annotation.signatureMode === 'draw' || annotation.signatureMode === 'upload' ? annotation.signatureImage : undefined,
      signatureText,
      signatureFont,
      inkColor,
      signerName,
      signerRole,
      signedDate,
    };
  }

  const legacyRaw = (annotation.signerLabel ?? annotation.label ?? annotation.value ?? 'Reviewed').trim();
  const parsed = parseLegacySignerLabel(legacyRaw);
  const signerName = (annotation.signerName ?? parsed.name).trim();
  const signerRole = (annotation.signerRole ?? parsed.role).trim();
  return {
    signatureMode: 'type',
    signatureImage: undefined,
    signatureText: signerName || legacyRaw,
    signatureFont: DEFAULT_SIGNATURE_FONT,
    inkColor,
    signerName: signerName || legacyRaw,
    signerRole,
    signedDate,
  };
}

export function formatSignatureListTitle(annotation: Partial<PdfAnnotation>): string {
  const resolved = resolveSignatureData(annotation);
  const displayName = resolved.signerName || resolved.signatureText || 'Untitled';
  return `Signature — ${displayName}`;
}

export function canPlaceSignature(draft: Pick<SignatureDraft, 'signatureMode' | 'signatureImage' | 'signatureText'> & { hasDrawnStrokes?: boolean }): boolean {
  if (draft.signatureMode === 'draw') {
    return Boolean(draft.hasDrawnStrokes || (draft.signatureImage && draft.signatureImage.startsWith('data:image/')));
  }
  if (draft.signatureMode === 'upload') {
    return Boolean(draft.signatureImage && draft.signatureImage.startsWith('data:image/'));
  }
  return draft.signatureText.trim().length > 0;
}

export function buildSignatureAnnotationFields(draft: SignatureDraft): Partial<PdfAnnotation> {
  const inkColor = draft.inkColor || DEFAULT_SIGNATURE_INK;
  const signerName = draft.signerName.trim();
  const signerRole = draft.signerRole.trim();
  const signedDate = draft.signedDate.trim();
  const signatureText = draft.signatureText.trim();
  const signatureFont = resolveSignatureFont(draft.signatureFont).name;
  const caption = formatSignatureCaption(signerRole, signerName || signatureText);
  const displayName = signerName || signatureText || 'Untitled';
  const listTitle = `Signature — ${displayName}`;

  if (draft.signatureMode === 'draw' || draft.signatureMode === 'upload') {
    return {
      signatureMode: draft.signatureMode,
      signatureImage: draft.signatureImage,
      signatureText: undefined,
      signatureFont: undefined,
      inkColor,
      color: inkColor,
      signerName,
      signerRole,
      signedDate,
      signerLabel: caption,
      label: listTitle,
      value: listTitle,
    };
  }

  return {
    signatureMode: 'type',
    signatureImage: undefined,
    signatureText,
    signatureFont,
    inkColor,
    color: inkColor,
    signerName,
    signerRole,
    signedDate,
    signerLabel: caption,
    label: listTitle,
    value: listTitle,
  };
}