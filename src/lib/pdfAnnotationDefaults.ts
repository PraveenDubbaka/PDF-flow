import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { requireUser, type PdfAnnotation } from '@/lib/pdfDocuments';
import { normalizeColorToHex, parseRichTextRuns } from '@/lib/pdfRichText';

export interface PdfAnnotationStyleDefaults {
  textColor: string;
  borderColor: string;
  fillColor: string | null;
}

export const SYSTEM_ANNOTATION_STYLE_DEFAULTS: PdfAnnotationStyleDefaults = {
  textColor: '#111827',
  borderColor: '#facc15',
  fillColor: null,
};

const CHANNEL_NAME = 'pdf-annotation-defaults';
const cachedByUser = new Map<string, PdfAnnotationStyleDefaults>();
const INSTANCE_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());
let saveTail: Promise<unknown> = Promise.resolve();
let latestSaveSeq = 0;

export function normalizeAnnotationDefaults(raw: unknown): PdfAnnotationStyleDefaults {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const textColor = typeof input.textColor === 'string'
    ? normalizeColorToHex(input.textColor) ?? SYSTEM_ANNOTATION_STYLE_DEFAULTS.textColor
    : SYSTEM_ANNOTATION_STYLE_DEFAULTS.textColor;
  const borderColor = typeof input.borderColor === 'string'
    ? normalizeColorToHex(input.borderColor) ?? SYSTEM_ANNOTATION_STYLE_DEFAULTS.borderColor
    : SYSTEM_ANNOTATION_STYLE_DEFAULTS.borderColor;
  const fillColor = input.fillColor === null || input.fillColor === ''
    ? null
    : typeof input.fillColor === 'string'
      ? normalizeColorToHex(input.fillColor) ?? SYSTEM_ANNOTATION_STYLE_DEFAULTS.fillColor
      : SYSTEM_ANNOTATION_STYLE_DEFAULTS.fillColor;
  return { textColor, borderColor, fillColor };
}

export function isSystemAnnotationDefaults(style: PdfAnnotationStyleDefaults): boolean {
  return (
    style.textColor.toLowerCase() === SYSTEM_ANNOTATION_STYLE_DEFAULTS.textColor.toLowerCase()
    && style.borderColor.toLowerCase() === SYSTEM_ANNOTATION_STYLE_DEFAULTS.borderColor.toLowerCase()
    && (style.fillColor?.toLowerCase() ?? null) === SYSTEM_ANNOTATION_STYLE_DEFAULTS.fillColor
  );
}

export function extractAnnotationStyle(
  annotation: PdfAnnotation,
  fallback: PdfAnnotationStyleDefaults = SYSTEM_ANNOTATION_STYLE_DEFAULTS,
): PdfAnnotationStyleDefaults {
  const borderColor = normalizeColorToHex(annotation.color) ?? fallback.borderColor;
  const supportsFill = annotation.kind === 'text' || annotation.kind === 'callout' || annotation.kind === 'rectangle' || annotation.kind === 'circle';
  const fillColor = supportsFill ? (normalizeColorToHex(annotation.fillColor) ?? null) : fallback.fillColor;
  let textColor = fallback.textColor;
  if (annotation.kind === 'text' || annotation.kind === 'callout') {
    const base = normalizeColorToHex(annotation.textColor) ?? fallback.textColor;
    const runs = parseRichTextRuns(annotation.richText ?? '', annotation.label ?? '', base, 12);
    const firstRun = runs.flat().find((run) => run.text.trim().length > 0);
    textColor = normalizeColorToHex(firstRun?.color) ?? base;
  } else if (annotation.kind === 'signature') {
    textColor = normalizeColorToHex(annotation.inkColor) ?? fallback.textColor;
  }
  return { textColor, borderColor, fillColor };
}

export function clearPdfAnnotationDefaultsCache(): void {
  cachedByUser.clear();
}

export async function loadPdfAnnotationDefaults(): Promise<PdfAnnotationStyleDefaults> {
  try {
    const user = await requireUser();
    const cached = cachedByUser.get(user.id);
    const { data, error } = await supabase
      .from('user_preferences')
      .select('pdf_annotation_defaults')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return cached ?? { ...SYSTEM_ANNOTATION_STYLE_DEFAULTS };
    const normalized = normalizeAnnotationDefaults(data?.pdf_annotation_defaults);
    cachedByUser.set(user.id, normalized);
    return normalized;
  } catch {
    return { ...SYSTEM_ANNOTATION_STYLE_DEFAULTS };
  }
}

export async function savePdfAnnotationDefaults(style: PdfAnnotationStyleDefaults): Promise<PdfAnnotationStyleDefaults> {
  const normalized = normalizeAnnotationDefaults(style);
  const seq = ++latestSaveSeq;
  const run = async (): Promise<PdfAnnotationStyleDefaults> => {
    if (seq < latestSaveSeq) return normalized;
    const user = await requireUser();
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          pdf_annotation_defaults: normalized as unknown as Json,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'user_id' },
      );
    if (error) throw error;
    if (seq === latestSaveSeq) {
      cachedByUser.set(user.id, normalized);
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ senderId: INSTANCE_ID, style: normalized });
        channel.close();
      }
    }
    return normalized;
  };
  const result = saveTail.then(run, run);
  saveTail = result.catch(() => {});
  return result;
}

export function subscribePdfAnnotationDefaults(onChange: (style: PdfAnnotationStyleDefaults) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    const payload = event.data as { senderId?: string; style?: unknown } | PdfAnnotationStyleDefaults | null;
    if (!payload) return;
    if (typeof payload === 'object' && 'senderId' in payload) {
      if (payload.senderId === INSTANCE_ID) return;
      if (payload.style) onChange(normalizeAnnotationDefaults(payload.style));
      return;
    }
    onChange(normalizeAnnotationDefaults(payload));
  };
  return () => channel.close();
}