CREATE TABLE public.engagement_pdf_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  engagement_id text NOT NULL,
  node_id text NOT NULL,
  name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  current_version integer NOT NULL DEFAULT 1,
  edit_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_pdf_documents TO authenticated;
GRANT ALL ON public.engagement_pdf_documents TO service_role;
ALTER TABLE public.engagement_pdf_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read engagement PDFs" ON public.engagement_pdf_documents FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create engagement PDFs" ON public.engagement_pdf_documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update engagement PDFs" ON public.engagement_pdf_documents FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete engagement PDFs" ON public.engagement_pdf_documents FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX engagement_pdf_documents_engagement_idx ON public.engagement_pdf_documents (engagement_id, node_id, updated_at DESC);

CREATE TABLE public.engagement_pdf_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.engagement_pdf_documents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  edit_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_pdf_versions TO authenticated;
GRANT ALL ON public.engagement_pdf_versions TO service_role;
ALTER TABLE public.engagement_pdf_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read PDF versions" ON public.engagement_pdf_versions FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create PDF versions" ON public.engagement_pdf_versions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update PDF versions" ON public.engagement_pdf_versions FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete PDF versions" ON public.engagement_pdf_versions FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX engagement_pdf_versions_document_idx ON public.engagement_pdf_versions (document_id, version_number DESC);

CREATE POLICY "Owners upload engagement PDFs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'engagement-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners read engagement PDF files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'engagement-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update engagement PDF files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'engagement-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'engagement-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete engagement PDF files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'engagement-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);