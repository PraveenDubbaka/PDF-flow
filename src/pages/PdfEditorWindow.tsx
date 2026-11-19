import { useParams } from 'react-router-dom';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';

export default function PdfEditorWindow() {
  const { pdfDocumentId } = useParams();
  if (!pdfDocumentId) return null;
  return <main className="h-dvh overflow-hidden"><PdfWorkspace documentId={pdfDocumentId} popout /></main>;
}