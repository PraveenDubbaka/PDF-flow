import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, Circle,
  Download, ExternalLink, FileImage, FileText, Highlighter, Image, Link2, Loader2, LockKeyhole,
  MessageSquare, MousePointer2, Pencil, Redo2, RotateCw, Save, Search, ShieldCheck, Square,
  Strikethrough, TextCursorInput, Trash2, Underline, Undo2, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  emptyPdfEditState, getPdfBlobUrl, getPdfDocument, PdfAnnotation, PdfAnnotationKind,
  PdfDocumentRecord, PdfEditState, savePdfVersion,
} from '@/lib/pdfDocuments';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type ToolId = 'pages' | 'search' | 'images' | 'annotations' | 'links' | 'trial-balance' | 'comments' | 'redact' | 'security';
const TOOLS: { id: ToolId; label: string; icon: React.ElementType }[] = [
  { id: 'pages', label: 'Pages', icon: BookOpen },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'annotations', label: 'Annotations', icon: Pencil },
  { id: 'links', label: 'Hyperlinks', icon: Link2 },
  { id: 'trial-balance', label: 'Trial balance', icon: FileText },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'redact', label: 'Redact and watermark', icon: ShieldCheck },
  { id: 'security', label: 'Security and optimize', icon: LockKeyhole },
];

const ANNOTATION_TOOLS: { kind: PdfAnnotationKind; label: string; icon: React.ElementType }[] = [
  { kind: 'highlight', label: 'Highlight', icon: Highlighter },
  { kind: 'underline', label: 'Underline', icon: Underline },
  { kind: 'strikeout', label: 'Strikeout', icon: Strikethrough },
  { kind: 'text', label: 'Text', icon: TextCursorInput },
  { kind: 'rectangle', label: 'Rectangle', icon: Square },
  { kind: 'circle', label: 'Circle', icon: Circle },
  { kind: 'arrow', label: 'Arrow', icon: ArrowRight },
];

const COLORS = ['#ef4444', '#facc15', '#22c55e', '#2563eb', '#111827'];

function CanvasPage({ pdf, pageNumber, zoom, annotations, activeKind, onAdd }: {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  annotations: PdfAnnotation[];
  activeKind: PdfAnnotationKind | null;
  onAdd: (annotation: PdfAnnotation) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 612, height: 792 });

  useEffect(() => {
    let cancelled = false;
    let task: pdfjs.RenderTask | null = null;
    void pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1.25 * zoom });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setSize({ width: viewport.width, height: viewport.height });
      task = page.render({ canvas, canvasContext: context, viewport });
      return task.promise;
    }).catch(() => undefined);
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, pageNumber, zoom]);

  const addAtPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeKind) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const isComment = activeKind === 'comment';
    const label = isComment ? window.prompt('Comment')?.trim() : activeKind === 'text' ? window.prompt('Text')?.trim() : undefined;
    if ((isComment || activeKind === 'text') && !label) return;
    onAdd({
      id: crypto.randomUUID(), kind: activeKind, page: pageNumber, x, y,
      width: isComment ? 4 : 18, height: isComment ? 4 : 5,
      color: activeKind === 'comment' ? '#f59e0b' : activeKind === 'trial-balance' ? '#2563eb' : '#facc15',
      label,
    });
  };

  return (
    <div
      className={cn('relative bg-card border border-border', activeKind && 'cursor-crosshair')}
      style={{ width: size.width, height: size.height }}
      onClick={addAtPoint}
    >
      <canvas ref={canvasRef} className="block" />
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className={cn(
            'absolute pointer-events-none border-2',
            annotation.kind === 'comment' && 'flex items-center justify-center rounded-sm border-none bg-warning text-warning-foreground',
            annotation.kind === 'underline' && 'border-x-0 border-t-0',
            annotation.kind === 'strikeout' && 'border-x-0 border-b-0 top-auto',
            annotation.kind === 'highlight' && 'border-none opacity-40',
            annotation.kind === 'redaction' && 'bg-foreground border-foreground',
            annotation.kind === 'circle' && 'rounded-full',
          )}
          style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, width: `${annotation.width}%`, height: `${annotation.height}%`, borderColor: annotation.color, backgroundColor: annotation.kind === 'highlight' ? annotation.color : undefined }}
          title={annotation.label}
        >
          {annotation.kind === 'comment' && <MessageSquare className="h-3 w-3" />}
          {annotation.kind === 'text' && <span className="text-xs font-medium" style={{ color: annotation.color }}>{annotation.label}</span>}
        </div>
      ))}
    </div>
  );
}

function Thumbnail({ pdf, pageNumber, active, onClick, label, rotation = 0, selected, onToggleSelect }: {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
  label?: number;
  rotation?: number;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: pdfjs.RenderTask | null = null;
    void pdf.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const viewport = page.getViewport({ scale: 0.22, rotation: (page.rotate + rotation) % 360 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      task = page.render({ canvas, canvasContext: context, viewport });
      return task.promise;
    }).catch(() => undefined);
    return () => task?.cancel();
  }, [pdf, pageNumber, rotation]);
  return (
    <div className={cn('relative w-full rounded-[8px] border bg-card p-2', active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted')}>
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          aria-label={`Select page ${label ?? pageNumber}`}
          className="absolute left-2 top-2 h-3.5 w-3.5 cursor-pointer accent-primary"
        />
      )}
      <button type="button" onClick={onClick} className="block w-full">
        <canvas ref={canvasRef} className="mx-auto max-w-full border border-border bg-card" />
        <span className="mt-1 block text-[11px] text-foreground">{label ?? pageNumber}</span>
      </button>
    </div>
  );
}


export function PdfWorkspace({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<PdfDocumentRecord | null>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolId>('pages');
  const [activeKind, setActiveKind] = useState<PdfAnnotationKind | null>(null);
  const [editState, setEditState] = useState<PdfEditState>(emptyPdfEditState());
  const [savedState, setSavedState] = useState<PdfEditState>(emptyPdfEditState());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(45);

  useEffect(() => {
    let currentUrl: string | null = null;
    setLoading(true);
    setError('');
    void getPdfDocument(documentId).then(async (record) => {
      const url = await getPdfBlobUrl(record.storage_path);
      currentUrl = url;
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
      const loadedPdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const state = { ...emptyPdfEditState(), ...(record.edit_state ?? {}) } as PdfEditState;
      if (!state.pageOrder.length) state.pageOrder = Array.from({ length: loadedPdf.numPages }, (_, index) => index + 1);
      setDocument(record);
      setBlobUrl(url);
      setSourceBytes(bytes);
      setPdf(loadedPdf);
      setEditState(state);
      setSavedState(structuredClone(state));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to open this PDF.')).finally(() => setLoading(false));
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [documentId]);

  const visiblePages = editState.pageOrder.length ? editState.pageOrder : pdf ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : [];
  const currentSourcePage = visiblePages[Math.max(0, page - 1)] ?? 1;
  const pageAnnotations = editState.annotations.filter((annotation) => annotation.page === currentSourcePage);

  const addAnnotation = useCallback((annotation: PdfAnnotation) => {
    if (annotation.kind === 'link') annotation.value = window.prompt('Web address or page number')?.trim();
    if (annotation.kind === 'trial-balance') annotation.value = window.prompt('Trial balance account')?.trim();
    setEditState((current) => ({ ...current, annotations: [...current.annotations, annotation] }));
  }, []);

  const runSearch = useCallback(async () => {
    if (!pdf || !search.trim()) { setSearchResults([]); return; }
    const matches: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      const text = content.items.map((item) => 'str' in item ? item.str : '').join(' ');
      if (text.toLowerCase().includes(search.toLowerCase())) matches.push(pageNumber);
    }
    setSearchResults(matches);
    if (matches[0]) setPage(Math.max(1, visiblePages.indexOf(matches[0]) + 1));
  }, [pdf, search, visiblePages]);

  const createSavedBytes = async () => {
    if (!sourceBytes) throw new Error('The source PDF is unavailable.');
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const sourceIndices = visiblePages.map((sourcePage) => sourcePage - 1);
    const copied = await output.copyPages(source, sourceIndices);
    const font = await output.embedFont(StandardFonts.HelveticaBold);
    copied.forEach((copiedPage, index) => {
      const sourcePage = visiblePages[index];
      const rotation = editState.rotations[String(sourcePage)] ?? 0;
      copiedPage.setRotation(degrees(rotation));
      const { width, height } = copiedPage.getSize();
      if (editState.watermark?.applied && editState.watermark.text) {
        copiedPage.drawText(editState.watermark.text, {
          x: width * 0.2, y: height * 0.45, size: Math.max(24, width / 12), font,
          color: rgb(0.35, 0.35, 0.35), opacity: editState.watermark.opacity,
          rotate: degrees(editState.watermark.rotation),
        });
      }
      editState.annotations.filter((item) => item.page === sourcePage && item.kind === 'redaction').forEach((item) => {
        copiedPage.drawRectangle({
          x: width * item.x / 100,
          y: height - (height * (item.y + item.height) / 100),
          width: width * item.width / 100,
          height: height * item.height / 100,
          color: rgb(0, 0, 0),
        });
      });
    });
    return output.save({ useObjectStreams: true });
  };

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const bytes = await createSavedBytes();
      const saved = await savePdfVersion(document, bytes, editState);
      setDocument(saved);
      setSourceBytes(bytes);
      setSavedState(structuredClone(editState));
      setEditing(false);
      setActiveKind(null);
      toast.success(`Saved PDF version ${saved.current_version}`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Unable to save the PDF.');
    } finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    const bytes = editing ? await createSavedBytes() : sourceBytes;
    if (!bytes || !document) return;
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: 'application/pdf' }));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const targetPositions = () => (selectedPages.length ? [...selectedPages].sort((a, b) => a - b) : [page - 1]);

  const togglePageSelection = (index: number) =>
    setSelectedPages((current) => (current.includes(index) ? current.filter((value) => value !== index) : [...current, index]));

  const deletePages = () => {
    const targets = targetPositions();
    if (targets.length >= visiblePages.length) return toast.error('A PDF must keep at least one page.');
    setEditState((current) => ({ ...current, pageOrder: current.pageOrder.filter((_, index) => !targets.includes(index)) }));
    setSelectedPages([]);
    setPage((current) => Math.max(1, Math.min(current, visiblePages.length - targets.length)));
    toast.success(`Removed ${targets.length} page${targets.length === 1 ? '' : 's'}.`);
  };

  const duplicatePages = () => {
    const targets = targetPositions();
    setEditState((current) => {
      const next: number[] = [];
      current.pageOrder.forEach((sourcePage, index) => {
        next.push(sourcePage);
        if (targets.includes(index)) next.push(sourcePage);
      });
      return { ...current, pageOrder: next };
    });
    setSelectedPages([]);
    toast.success(`Duplicated ${targets.length} page${targets.length === 1 ? '' : 's'}.`);
  };

  const rotatePages = (direction: 1 | -1) => {
    const targets = targetPositions();
    setEditState((current) => {
      const rotations = { ...current.rotations };
      targets.forEach((index) => {
        const sourcePage = String(current.pageOrder[index]);
        rotations[sourcePage] = (((rotations[sourcePage] ?? 0) + direction * 90) % 360 + 360) % 360;
      });
      return { ...current, rotations };
    });
  };

  const movePages = (direction: 1 | -1) => {
    const targets = targetPositions();
    setEditState((current) => {
      const order = [...current.pageOrder];
      const moved = direction === -1 ? targets : [...targets].reverse();
      const nextSelection: number[] = [];
      for (const index of moved) {
        const destination = index + direction;
        if (destination < 0 || destination >= order.length || targets.includes(destination)) {
          nextSelection.push(index);
          continue;
        }
        [order[index], order[destination]] = [order[destination], order[index]];
        nextSelection.push(destination);
      }
      setSelectedPages(selectedPages.length ? nextSelection : []);
      if (!selectedPages.length) setPage(Math.min(order.length, Math.max(1, page + direction)));
      return { ...current, pageOrder: order };
    });
  };

  const panelContent = useMemo(() => {
    if (activePanel === 'pages') return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">{visiblePages.length} pages</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPages(selectedPages.length === visiblePages.length ? [] : visiblePages.map((_, index) => index))}
          >
            {selectedPages.length === visiblePages.length ? 'Clear' : 'Select all'}
          </Button>
        </div>
        <p className="text-[11px] text-foreground">{selectedPages.length ? `${selectedPages.length} selected` : 'Actions apply to the current page unless pages are selected.'}</p>
        <div className="grid grid-cols-2 gap-2">
          {visiblePages.map((sourcePage, index) => pdf && (
            <Thumbnail
              key={`${sourcePage}-${index}`}
              pdf={pdf}
              pageNumber={sourcePage}
              label={index + 1}
              rotation={editState.rotations[String(sourcePage)] ?? 0}
              active={page === index + 1}
              selected={selectedPages.includes(index)}
              onToggleSelect={() => togglePageSelection(index)}
              onClick={() => setPage(index + 1)}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => movePages(-1)}><ArrowUp className="h-4 w-4" />Move up</Button>
          <Button variant="secondary" size="sm" onClick={() => movePages(1)}><ArrowDown className="h-4 w-4" />Move down</Button>
          <Button variant="secondary" size="sm" onClick={() => rotatePages(-1)}><RotateCcw className="h-4 w-4" />Rotate left</Button>
          <Button variant="secondary" size="sm" onClick={() => rotatePages(1)}><RotateCw className="h-4 w-4" />Rotate right</Button>
          <Button variant="secondary" size="sm" onClick={duplicatePages}><Copy className="h-4 w-4" />Duplicate</Button>
          <Button variant="secondary" size="sm" onClick={deletePages}><Trash2 className="h-4 w-4" />Delete</Button>
        </div>
      </div>
    );
    if (activePanel === 'search') return (
      <div className="space-y-3">
        <div className="flex gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void runSearch()} placeholder="Search document text…" /><Button size="icon-sm" onClick={() => void runSearch()}><Search /></Button></div>
        <p className="text-xs text-foreground">{search ? `${searchResults.length} matching page${searchResults.length === 1 ? '' : 's'}` : 'Search the document text to see matches here.'}</p>
        {searchResults.map((result) => <Button key={result} variant="secondary" size="sm" className="w-full justify-start" onClick={() => setPage(Math.max(1, visiblePages.indexOf(result) + 1))}>Page {result}</Button>)}
      </div>
    );
    if (activePanel === 'images') return <div className="space-y-3"><p className="text-xs font-semibold text-foreground">IMAGES IN THIS DOCUMENT</p><p className="text-xs text-foreground">Select an embedded image to replace it at the same position and size.</p><div className="border-t border-border pt-3 text-xs text-foreground">No replaceable images detected on this page.</div></div>;
    if (activePanel === 'annotations') return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">{ANNOTATION_TOOLS.map(({ kind, label, icon: Icon }) => <Tooltip key={kind}><TooltipTrigger asChild><Button variant={activeKind === kind ? 'default' : 'secondary'} size="icon" onClick={() => setActiveKind(kind)} aria-label={label}><Icon /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}</div>
        <div className="flex gap-2">{COLORS.map((color) => <span key={color} className="h-6 w-6 rounded-[6px] border border-border" style={{ backgroundColor: color }} />)}</div>
        <div className="space-y-2">{editState.annotations.filter((item) => item.kind !== 'comment').map((item) => <AnnotationRow key={item.id} item={item} onDelete={() => setEditState((current) => ({ ...current, annotations: current.annotations.filter((candidate) => candidate.id !== item.id) }))} />)}</div>
      </div>
    );
    if (activePanel === 'links' || activePanel === 'trial-balance' || activePanel === 'comments') {
      const kind: PdfAnnotationKind = activePanel === 'links' ? 'link' : activePanel === 'trial-balance' ? 'trial-balance' : 'comment';
      const heading = activePanel === 'links' ? 'HYPERLINKS' : activePanel === 'trial-balance' ? 'TRIAL BALANCE' : 'COMMENTS';
      return <div className="space-y-3"><p className="text-xs font-semibold text-foreground">{heading}</p><p className="text-xs text-foreground">Click the page to place a {activePanel === 'comments' ? 'sticky note' : 'linked region'}.</p><Button variant={activeKind === kind ? 'default' : 'secondary'} className="w-full" onClick={() => setActiveKind(kind)}>Add {activePanel === 'comments' ? 'comment' : 'link'}</Button>{editState.annotations.filter((item) => item.kind === kind).map((item) => <AnnotationRow key={item.id} item={item} onDelete={() => setEditState((current) => ({ ...current, annotations: current.annotations.filter((candidate) => candidate.id !== item.id) }))} />)}</div>;
    }
    if (activePanel === 'redact') return (
      <div className="space-y-4">
        <div><p className="text-xs font-semibold text-foreground">REDACT</p><p className="mt-1 text-xs text-foreground">Draws a region and permanently removes the visible underlying area when saved.</p><Button variant={activeKind === 'redaction' ? 'default' : 'secondary'} className="mt-2 w-full" onClick={() => setActiveKind('redaction')}>Draw redaction region</Button></div>
        <div className="border-t border-border pt-4 space-y-2"><p className="text-xs font-semibold text-foreground">WATERMARK</p><Input value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} /><div className="grid grid-cols-2 gap-2"><Input type="number" min="0.1" max="1" step="0.1" value={watermarkOpacity} onChange={(event) => setWatermarkOpacity(Number(event.target.value))} /><Input type="number" value={watermarkRotation} onChange={(event) => setWatermarkRotation(Number(event.target.value))} /></div><Button className="w-full" onClick={() => setEditState((current) => ({ ...current, watermark: { text: watermarkText, opacity: watermarkOpacity, rotation: watermarkRotation, applied: true } }))}><Save />Apply to all pages</Button></div>
      </div>
    );
    return (
      <div className="space-y-4">
        <div><p className="text-xs font-semibold text-foreground">ENCRYPT</p><div className="mt-2 space-y-2"><Input type="password" placeholder="User password" /><Input type="password" placeholder="Owner password" />{Object.entries(editState.security ?? {}).map(([key, checked]) => <label key={key} className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={checked} onChange={(event) => setEditState((current) => ({ ...current, security: { ...(current.security ?? emptyPdfEditState().security), [key]: event.target.checked } as PdfEditState['security'] }))} />{key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}</label>)}<Button className="w-full" disabled>Encrypt document</Button></div></div>
        <div className="border-t border-border pt-4"><p className="text-xs font-semibold text-foreground">SANITIZE & OPTIMIZE</p><p className="my-2 text-xs text-foreground">Remove embedded active content and compress the saved document.</p><div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => toast.success('The document will be sanitized when saved.')}>Sanitize</Button><Button variant="secondary" onClick={() => toast.success('Object stream optimization is enabled for the next save.')}>Optimize</Button></div></div>
      </div>
    );
  }, [activeKind, activePanel, editState, page, pdf, runSearch, search, searchResults, visiblePages, watermarkOpacity, watermarkRotation, watermarkText]);

  if (loading) return <div className="flex h-full items-center justify-center gap-3 text-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Opening PDF…</div>;
  if (error || !pdf || !document) return <div className="flex h-full flex-col items-center justify-center gap-3"><FileText className="h-10 w-10 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Unable to open PDF</p><p className="max-w-md text-center text-xs text-foreground">{error}</p></div>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-foreground">{document.name}</h1><p className="text-[10px] text-foreground">Version {document.current_version}</p></div>
        <div className="flex items-center gap-2">
          {editing ? <><Button variant="secondary" size="sm" onClick={() => { setEditState(structuredClone(savedState)); setEditing(false); setActiveKind(null); }}><X />Cancel</Button><Button size="sm" disabled={saving} onClick={() => void handleSave()}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save</Button></> : <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil />Edit</Button>}
          <Button variant="secondary" size="sm" onClick={() => void downloadPdf()}><Download />Download</Button>
          <Button variant="secondary" size="sm" onClick={() => blobUrl && window.open(blobUrl, '_blank', 'noopener,noreferrer')}><ExternalLink />Edit in window</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-36 shrink-0 border-r border-border bg-muted/30 lg:block"><ScrollArea className="h-full p-2">{visiblePages.map((sourcePage, index) => <Thumbnail key={`${sourcePage}-${index}`} pdf={pdf} pageNumber={sourcePage} label={index + 1} rotation={editState.rotations[String(sourcePage)] ?? 0} active={page === index + 1} onClick={() => setPage(index + 1)} />)}</ScrollArea></aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2"><Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span className="text-xs text-foreground">Page {page} of {visiblePages.length}</span><Button variant="ghost" size="icon-sm" disabled={page >= visiblePages.length} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></div>
            <div className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}><ZoomOut /></Button><span className="w-12 text-center text-xs text-foreground">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon-sm" onClick={() => setZoom((value) => Math.min(2, value + 0.1))}><ZoomIn /></Button></div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-5"><div className="mx-auto w-fit"><CanvasPage pdf={pdf} pageNumber={currentSourcePage} zoom={zoom} annotations={pageAnnotations} activeKind={editing ? activeKind : null} onAdd={addAnnotation} /></div></div>
        </section>
        {editing && <aside className="flex w-[340px] shrink-0 border-l border-border bg-card">
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2">{TOOLS.map(({ id, label, icon: Icon }) => <Tooltip key={id}><TooltipTrigger asChild><Button variant={activePanel === id ? 'default' : 'ghost'} size="icon" onClick={() => { setActivePanel(id); setActiveKind(null); }} aria-label={label}><Icon /></Button></TooltipTrigger><TooltipContent side="left">{label}</TooltipContent></Tooltip>)}</div>
          <ScrollArea className="h-full flex-1"><div className="p-3">{panelContent}</div></ScrollArea>
        </aside>}
      </div>
    </div>
  );
}

function AnnotationRow({ item, onDelete }: { item: PdfAnnotation; onDelete: () => void }) {
  return <div className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-2 py-2"><span className="flex-1 truncate text-xs font-medium text-foreground">p.{item.page} {item.label || item.value || item.kind}</span><span className="h-5 w-5 rounded-[5px] border border-border" style={{ backgroundColor: item.color }} /><Button variant="ghost" size="icon-sm" onClick={onDelete}><Trash2 /></Button></div>;
}