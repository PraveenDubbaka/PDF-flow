import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export const PDF_BUCKET = 'engagement-pdfs';

export type PdfAnnotationKind = 'highlight' | 'underline' | 'strikeout' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'comment' | 'link' | 'trial-balance' | 'redaction' | 'image' | 'calculation';

export interface PdfBookmark {
  id: string;
  title: string;
  page: number;
}

export interface PdfCalculation {
  id: string;
  title: string;
  page: number;
  values: number[];
  operators?: ('+' | '-' | '×' | '÷')[];
  result: number;
  color: string;
}

export interface PdfDocumentProperties {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

export interface PdfCommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  mentions?: string[];
}

export interface PdfAnnotation {
  id: string;
  kind: PdfAnnotationKind;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
  value?: string;
  points?: { x: number; y: number }[];
  author?: string;
  createdAt?: string;
  mentions?: string[];
  replies?: PdfCommentReply[];
  resolved?: boolean;
}

export interface PdfEditState {
  annotations: PdfAnnotation[];
  pageOrder: number[];
  rotations: Record<string, number>;
  bookmarks?: PdfBookmark[];
  properties?: PdfDocumentProperties;
  ocrText?: Record<string, string>;
  calculations?: PdfCalculation[];
  watermark?: { text: string; opacity: number; rotation: number; applied: boolean };
  sanitize?: boolean;
  optimize?: boolean;
  passwords?: { user: string; owner: string };
  security?: {
    allowPrinting: boolean;
    allowExtraction: boolean;
    allowModification: boolean;
    allowAnnotations: boolean;
  };
}

export interface PdfDocumentRecord {
  id: string;
  owner_id: string;
  engagement_id: string;
  node_id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  current_version: number;
  edit_state: PdfEditState;
  created_at: string;
  updated_at: string;
}

export const emptyPdfEditState = (): PdfEditState => ({
  annotations: [],
  pageOrder: [],
  rotations: {},
  bookmarks: [],
  properties: { title: '', author: '', subject: '', keywords: '', creator: '' },
  ocrText: {},
  calculations: [],
  security: {
    allowPrinting: true,
    allowExtraction: false,
    allowModification: false,
    allowAnnotations: true,
  },
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;
  const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError || !anon.user) throw new Error('Secure storage is unavailable right now. Please try again.');
  return anon.user;
};

export async function uploadEngagementPdf(file: File, engagementId: string, nodeId: string, displayName: string) {
  const user = await requireUser();
  const documentId = crypto.randomUUID();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `${user.id}/${engagementId}/${documentId}/v1-${cleanName}`;
  const editState = emptyPdfEditState();

  const { error: uploadError } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from('engagement_pdf_documents').insert({
    id: documentId,
    owner_id: user.id,
    engagement_id: engagementId,
    node_id: nodeId,
    name: displayName,
    mime_type: file.type || 'application/pdf',
    size_bytes: file.size,
    storage_path: storagePath,
    edit_state: editState as unknown as Json,
  } as never).select().single();

  if (error) {
    await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
    throw error;
  }

  const { error: versionError } = await supabase.from('engagement_pdf_versions').insert({
    document_id: documentId,
    owner_id: user.id,
    version_number: 1,
    storage_path: storagePath,
    edit_state: editState as unknown as Json,
  } as never);
  if (versionError) throw versionError;
  return data as unknown as PdfDocumentRecord;
}

export async function getPdfDocument(documentId: string) {
  if (!UUID_PATTERN.test(documentId)) {
    throw new Error('This file was added before secure storage was set up, so its contents are not stored. Please upload the PDF again.');
  }
  await requireUser();
  const { data, error } = await supabase.from('engagement_pdf_documents').select('*').eq('id', documentId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This PDF is no longer available. Please upload it again.');
  return data as unknown as PdfDocumentRecord;
}

export async function getPdfBlobUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(storagePath);
  if (error) throw error;
  return URL.createObjectURL(data);
}

export async function savePdfVersion(document: PdfDocumentRecord, bytes: Uint8Array, editState: PdfEditState) {
  const user = await requireUser();
  const nextVersion = document.current_version + 1;
  const storagePath = `${user.id}/${document.engagement_id}/${document.id}/v${nextVersion}-${document.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const body = new Blob([bytes.slice().buffer], { type: 'application/pdf' });
  const { error: uploadError } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, body, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: versionError } = await supabase.from('engagement_pdf_versions').insert({
    document_id: document.id,
    owner_id: user.id,
    version_number: nextVersion,
    storage_path: storagePath,
    edit_state: editState as unknown as Json,
  } as never);
  if (versionError) throw versionError;

  const { data, error } = await supabase.from('engagement_pdf_documents').update({
    storage_path: storagePath,
    current_version: nextVersion,
    edit_state: editState as unknown as Json,
    updated_at: new Date().toISOString(),
  } as never).eq('id', document.id).select().single();
  if (error) throw error;
  return data as unknown as PdfDocumentRecord;
}

export async function deletePdfDocument(document: PdfDocumentRecord) {
  const { data: versions } = await supabase.from('engagement_pdf_versions').select('storage_path').eq('document_id', document.id);
  const paths = (versions ?? []).map((version) => version.storage_path);
  if (paths.length) await supabase.storage.from(PDF_BUCKET).remove(paths);
  const { error } = await supabase.from('engagement_pdf_documents').delete().eq('id', document.id);
  if (error) throw error;
}