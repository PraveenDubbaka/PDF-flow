import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Download, Loader2, PanelLeft, Printer, RefreshCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PdfPreviewControls } from '@/components/pdf/PdfPreviewControls';
import { formatDocumentPreviewFileName, generateDocumentPreviewPdf, type DocumentPreviewVariant } from '@/lib/documentPreviewPdf';
import { fitPreviewZoom, pdfViewShortcut, rotatePreview, type PdfFitMode } from '@/lib/pdfPreviewView';
import { createPdfPrinter, printGeneratedPdf } from '@/lib/pdfPrint';
import { cn } from '@/lib/utils';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './pdf-page-bar.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const DOCUMENT_PREVIEW_TIMEOUT_MS = 20000;

export interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementCode: string;
  documentTitle: string;
  contentHtml: string;
  clientName?: string;
  variant?: DocumentPreviewVariant;
  generatePdf?: () => Promise<Uint8Array>;
  testId?: string;
}

function PreviewPageCanvas({ pdf, pageNumber, zoom = 1, rotation = 0, thumbnail = false, documentTitle }: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom?: number;
  rotation?: number;
  thumbnail?: boolean;
  documentTitle: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | undefined;
    setFailed(false);
    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const page = await pdf.getPage(pageNumber);
        const pageRotation = ((page.rotate ?? 0) + rotation) % 360;
        const base = page.getViewport({ scale: 1, rotation: pageRotation });
        const scale = thumbnail ? Math.min(112 / base.width, 148 / base.height) : zoom;
        const viewport = page.getViewport({ scale, rotation: pageRotation });
        const ratio = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: scale * ratio, rotation: pageRotation });
        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        if (cancelled) return;
        const task = page.render({ canvas, canvasContext: context, viewport: renderViewport });
        renderTask = task;
        await task.promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void render();
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, pageNumber, rotation, thumbnail, zoom]);

  if (failed) return <div className="flex min-h-20 items-center justify-center p-4 text-xs text-foreground">Page unavailable</div>;
  return <canvas ref={canvasRef} className="block bg-card" role={thumbnail ? undefined : 'img'} aria-hidden={thumbnail || undefined} aria-label={thumbnail ? undefined : `${documentTitle} page ${pageNumber}`} />;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  engagementCode,
  documentTitle,
  contentHtml,
  clientName,
  variant = 'letter',
  generatePdf,
  testId = 'document-preview-modal',
}: DocumentPreviewModalProps) {
  const fileName = formatDocumentPreviewFileName(engagementCode, documentTitle);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<PdfFitMode>(null);
  const [viewRotation, setViewRotation] = useState(0);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [showPages, setShowPages] = useState(true);
  const [printing, setPrinting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageElements = useRef(new Map<number, HTMLElement>());
  const scrollFrame = useRef<number | undefined>(undefined);
  const generationRef = useRef(0);
  const generatePdfRef = useRef(generatePdf);
  generatePdfRef.current = generatePdf;

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!open) {
      setPdf(null);
      setPdfBytes(null);
      setLoading(false);
      setError('');
      setPage(1);
      setZoom(1);
      setFitMode(null);
      setViewRotation(0);
      setShowPages(true);
      return;
    }

    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    let timeout = 0;
    setLoading(true);
    setError('');
    setPdf(null);
    setPdfBytes(null);
    setPage(1);
    setZoom(1);
    setFitMode(null);
    setViewRotation(0);
    const destroyTask = async () => {
      if (!task) return;
      try { await task.destroy(); } catch { /* The task may already be destroyed. */ }
    };
    const openDocument = async () => {
      try {
        const opening = (async () => {
          const generated = generatePdfRef.current
            ? await generatePdfRef.current()
            : await generateDocumentPreviewPdf({ html: contentHtml, engagementCode, documentTitle, clientName, variant });
          if (generation !== generationRef.current) throw new Error('Preview closed.');
          task = pdfjs.getDocument({ data: generated.slice() });
          return { generated, loaded: await task.promise };
        })();
        const { generated, loaded } = await Promise.race([
          opening,
          new Promise<never>((_, reject) => {
            timeout = window.setTimeout(() => reject(new Error('The document took too long to open. Please try again.')), DOCUMENT_PREVIEW_TIMEOUT_MS);
          }),
        ]);
        if (generation !== generationRef.current) { await destroyTask(); return; }
        setPdf(loaded);
        setPdfBytes(generated);
      } catch (reason) {
        await destroyTask();
        if (generation !== generationRef.current) return;
        // Invalidate a timed-out generation so a late result cannot reopen or leak a PDF task.
        generationRef.current += 1;
        setError(reason instanceof Error ? reason.message : 'Unable to open the document preview.');
        setLoading(false);
      } finally {
        window.clearTimeout(timeout);
        if (generation === generationRef.current) setLoading(false);
      }
    };
    void openDocument();
    return () => {
      generationRef.current += 1;
      window.clearTimeout(timeout);
      void destroyTask();
    };
  }, [open, retryToken, contentHtml, engagementCode, documentTitle, clientName, variant]);

  useEffect(() => () => window.cancelAnimationFrame(scrollFrame.current ?? 0), []);

  useEffect(() => {
    if (!open) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    const measure = () => {
      const width = viewer.clientWidth;
      const height = viewer.clientHeight;
      setViewerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, [open, showPages, pdf]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void pdf.getPage(page).then((loadedPage) => {
      if (cancelled) return;
      const base = loadedPage.getViewport({ scale: 1 });
      setPageSize((prev) => (prev.width === base.width && prev.height === base.height ? prev : { width: base.width, height: base.height }));
    }).catch(() => { /* Page measurement errors are handled by page rendering. */ });
    return () => { cancelled = true; };
  }, [pdf, page]);

  useEffect(() => {
    if (!fitMode) return;
    const viewer = viewerRef.current;
    const activeViewport = viewer && (viewer.clientWidth > 0 || viewer.clientHeight > 0)
      ? { width: viewer.clientWidth, height: viewer.clientHeight }
      : viewerSize;
    setZoom(fitPreviewZoom(pageSize, activeViewport, viewRotation, fitMode));
  }, [fitMode, pageSize, viewerSize, viewRotation]);

  useEffect(() => {
    if (!open || !pdf) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      const active = document.activeElement;
      if (dialog && active instanceof Node && active !== document.body && !dialog.contains(active) && !(active instanceof HTMLElement && active.closest('[data-radix-popper-content-wrapper]'))) {
        return;
      }
      const target = event.target;
      const inText = target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable], [role="textbox"]');
      const action = pdfViewShortcut(event, inText);
      if (!action) return;
      event.preventDefault();
      if (action === 'fit') setFitMode('page');
      else setViewRotation((value) => rotatePreview(value, action === 'right' ? 1 : -1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pdf]);

  const goToPage = (target: number) => {
    if (!pdf) return;
    const next = Math.max(1, Math.min(pdf.numPages, target));
    setPage(next);
    window.requestAnimationFrame(() => pageElements.current.get(next)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
  };

  const updateCurrentPage = () => {
    window.cancelAnimationFrame(scrollFrame.current ?? 0);
    scrollFrame.current = window.requestAnimationFrame(() => {
      const viewer = viewerRef.current;
      if (!viewer || !pdf) return;
      const viewerTop = viewer.getBoundingClientRect().top;
      let nearest = 1;
      let distance = Number.POSITIVE_INFINITY;
      for (const [number, element] of pageElements.current) {
        const nextDistance = Math.abs(element.getBoundingClientRect().top - viewerTop - 12);
        if (nextDistance < distance) { nearest = number; distance = nextDistance; }
      }
      setPage(nearest);
    });
  };

  const download = () => {
    if (!pdfBytes) return;
    const url = URL.createObjectURL(new Blob([pdfBytes.slice().buffer], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const print = async () => {
    if (!pdfBytes || printing) return;
    setPrinting(true);
    const printer = createPdfPrinter((openPdf) => {
      if (openPdf) {
        toast.error('Your browser blocked the PDF. Open it and use its Print command.', {
          action: { label: 'Open PDF', onClick: openPdf },
        });
      } else toast('PDF opened. Use the browser or PDF viewer Print command.');
    });
    try {
      await printGeneratedPdf(async () => pdfBytes.slice(), printer);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Unable to print the document.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogRef} className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 rounded-xl border-border bg-card p-0 [&>button.absolute]:hidden" data-testid={testId}>
        <TooltipProvider>
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
            <DialogTitle className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{fileName}</DialogTitle>
            <DialogDescription className="sr-only">Read-only {documentTitle} PDF preview</DialogDescription>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" size="sm" onClick={download} disabled={!pdfBytes || loading}><Download />Download</Button>
              <Button variant="secondary" size="sm" onClick={() => void print()} disabled={!pdfBytes || loading || printing}>
                {printing ? <Loader2 className="animate-spin" /> : <Printer />}{printing ? 'Printing…' : 'Print'}
              </Button>
              <DialogClose asChild><Button variant="ghost" size="icon-sm" aria-label="Close preview"><X /></Button></DialogClose>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {showPages && pdf && (
              <aside aria-label="Document page thumbnails" className="w-36 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-3 sm:w-40">
                <div className="space-y-3">
                  {Array.from({ length: pdf.numPages }, (_, index) => index + 1).map((number) => (
                    <button
                      key={number}
                      type="button"
                      aria-label={`Go to page ${number}`}
                      aria-current={page === number ? 'page' : undefined}
                      onClick={() => goToPage(number)}
                      className={cn('block w-full rounded-lg border bg-card p-1.5 text-left transition-colors', page === number ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50')}
                    >
                      <div data-thumbnail-rotation={viewRotation} className="flex justify-center overflow-hidden rounded border border-border/60">
                        <PreviewPageCanvas pdf={pdf} pageNumber={number} rotation={viewRotation} documentTitle={documentTitle} thumbnail />
                      </div>
                      <span className="mt-1 block text-center text-[11px] text-foreground">Page {number}</span>
                    </button>
                  ))}
                </div>
              </aside>
            )}

            <section className="flex min-w-0 flex-1 flex-col">
              <div className="pdf-page-bar-container shrink-0">
                <div className="pdf-page-bar pdf-letter-page-bar flex items-center justify-between gap-2 border-b border-border px-4">
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="icon-sm" aria-label={showPages ? 'Hide page thumbnails' : 'Show page thumbnails'} aria-pressed={showPages} onClick={() => setShowPages((value) => !value)} disabled={!pdf}><PanelLeft /></Button>
                    <div className="w-px self-stretch bg-border" />
                    <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={!pdf || page <= 1} onClick={() => goToPage(page - 1)}><ChevronLeft /></Button>
                    <span className="whitespace-nowrap text-xs text-foreground">Page {pdf ? page : 0} of {pdf?.numPages ?? 0}</span>
                    <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={!pdf || page >= pdf.numPages} onClick={() => goToPage(page + 1)}><ChevronRight /></Button>
                  </div>
                  <div className="pdf-page-bar-right flex shrink-0 items-center gap-2">
                    <PdfPreviewControls
                      fit={fitMode}
                      disabled={!pdf}
                      onFit={setFitMode}
                      onRotate={(direction) => setViewRotation((value) => rotatePreview(value, direction))}
                    />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" disabled={!pdf || zoom <= 0.25} onClick={() => { setFitMode(null); setZoom((value) => Math.max(0.25, Math.round((value - 0.1) * 100) / 100)); }}><ZoomOut /></Button>
                      <span className="w-12 text-center text-xs text-foreground">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" disabled={!pdf || zoom >= 3} onClick={() => { setFitMode(null); setZoom((value) => Math.min(3, Math.round((value + 0.1) * 100) / 100)); }}><ZoomIn /></Button>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={viewerRef} onScroll={updateCurrentPage} className="min-h-0 flex-1 overflow-auto bg-muted/30">
                {loading && <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm font-medium">Opening {documentTitle}…</p><p className="text-xs text-foreground">Generating a read-only PDF preview</p></div>}
                {!loading && error && <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center"><p className="text-sm font-medium text-foreground">We couldn’t open this document.</p><p className="max-w-md text-xs text-foreground">{error}</p><Button variant="secondary" size="sm" onClick={() => setRetryToken((value) => value + 1)}><RefreshCw />Retry</Button></div>}
                {!loading && !error && pdf && (
                  <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6 p-6">
                    {Array.from({ length: pdf.numPages }, (_, index) => index + 1).map((number) => (
                      <div key={number} ref={(element) => { if (element) pageElements.current.set(number, element); else pageElements.current.delete(number); }} data-letter-page={number} data-view-rotation={viewRotation} className="shrink-0 border border-border bg-card shadow-sm">
                        <PreviewPageCanvas pdf={pdf} pageNumber={number} zoom={zoom} rotation={viewRotation} documentTitle={documentTitle} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}