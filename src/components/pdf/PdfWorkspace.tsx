import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, ChevronLeft, ChevronRight, Circle,
  Copy, Download, ExternalLink, FileText, Highlighter, Image, Link2, Loader2, LockKeyhole,
  MessageSquare, MousePointer2, Pen, Pencil, RotateCcw, RotateCw, Save, Search, ShieldCheck, Square,
  Strikethrough, TextCursorInput, Trash2, Underline, X, ZoomIn, ZoomOut,
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

const ANNOTATION_TOOLS: { kind: PdfAnnotationKind | 'select'; label: string; icon: React.ElementType }[] = [
  { kind: 'select', label: 'Select', icon: MousePointer2 },
  { kind: 'highlight', label: 'Highlight', icon: Highlighter },
  { kind: 'underline', label: 'Underline', icon: Underline },
  { kind: 'strikeout', label: 'Strikeout', icon: Strikethrough },
  { kind: 'freehand', label: 'Freehand', icon: Pen },
  { kind: 'text', label: 'Text', icon: TextCursorInput },
  { kind: 'rectangle', label: 'Rectangle', icon: Square },
  { kind: 'circle', label: 'Circle', icon: Circle },
  { kind: 'arrow', label: 'Arrow', icon: ArrowRight },
];

const COLORS = ['#ef4444', '#facc15', '#22c55e', '#2563eb', '#111827'];

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const int = parseInt(value.length === 3 ? value.split('').map((c) => c + c).join('') : value, 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
};

function CanvasPage({ pdf, pageNumber, zoom, rotation, annotations, activeKind, color, onAdd, onSelect, selectedId }: {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  rotation: number;
  annotations: PdfAnnotation[];
  activeKind: PdfAnnotationKind | null;
  color: string;
  onAdd: (annotation: PdfAnnotation) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 612, height: 792 });
  const [drawing, setDrawing] = useState<{ x: number; y: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: pdfjs.RenderTask | null = null;
    void pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1.25 * zoom, rotation: (page.rotate + rotation) % 360 });
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
  }, [pdf, pageNumber, zoom, rotation]);

  const relative = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  };

  const addAtPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeKind) { onSelect(null); return; }
    if (activeKind === 'freehand') return;
    const { x, y } = relative(event);
    const isComment = activeKind === 'comment';
    const label = isComment ? window.prompt('Comment')?.trim() : activeKind === 'text' ? window.prompt('Text')?.trim() : undefined;
    if ((isComment || activeKind === 'text') && !label) return;
    onAdd({
      id: crypto.randomUUID(), kind: activeKind, page: pageNumber, x, y,
      width: isComment ? 4 : 18, height: isComment ? 4 : 5,
      color: activeKind === 'comment' ? '#f59e0b' : activeKind === 'trial-balance' ? '#2563eb' : activeKind === 'redaction' ? '#111827' : color,
      label,
    });
  };

  const startDraw = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeKind !== 'freehand') return;
    setDrawing([relative(event)]);
  };
  const moveDraw = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return;
    setDrawing((current) => (current ? [...current, relative(event)] : current));
  };
  const endDraw = () => {
    if (!drawing) return;
    const points = drawing;
    setDrawing(null);
    if (points.length < 2) return;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    onAdd({
      id: crypto.randomUUID(), kind: 'freehand', page: pageNumber,
      x: Math.min(...xs), y: Math.min(...ys),
      width: Math.max(1, Math.max(...xs) - Math.min(...xs)), height: Math.max(1, Math.max(...ys) - Math.min(...ys)),
      color, points,
    });
  };

  const polyline = (points: { x: number; y: number }[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div
      className={cn('relative bg-card border border-border', activeKind && 'cursor-crosshair')}
      style={{ width: size.width, height: size.height }}
      onClick={addAtPoint}
      onMouseDown={startDraw}
      onMouseMove={moveDraw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
    >
      <canvas ref={canvasRef} className="block" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {annotations.filter((item) => item.kind === 'freehand' && item.points?.length).map((item) => (
          <polyline key={item.id} points={polyline(item.points!)} fill="none" stroke={item.color} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
        ))}
        {drawing && <polyline points={polyline(drawing)} fill="none" stroke={color} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />}
      </svg>
      {annotations.filter((item) => item.kind !== 'freehand').map((annotation) => (
        <div
          key={annotation.id}
          onClick={(event) => { event.stopPropagation(); onSelect(annotation.id); }}
          className={cn(
            'absolute border-2',
            activeKind ? 'pointer-events-none' : 'cursor-pointer',
            selectedId === annotation.id && 'ring-2 ring-primary ring-offset-1',
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
          {annotation.kind === 'image' && annotation.value && <img src={annotation.value} alt={annotation.label ?? 'Inserted image'} className="h-full w-full object-contain" />}
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
  const [activeColor, setActiveColor] = useState(COLORS[1]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [editState, setEditState] = useState<PdfEditState>(emptyPdfEditState());
  const [savedState, setSavedState] = useState<PdfEditState>(emptyPdfEditState());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageImages, setPageImages] = useState<{ name: string; width: number; height: number }[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void pdf.getPage(currentSourcePage).then(async (target) => {
      const operators = await target.getOperatorList();
      const found: { name: string; width: number; height: number }[] = [];
      operators.fnArray.forEach((fn, index) => {
        if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintInlineImageXObject) return;
        const name = String(operators.argsArray[index]?.[0] ?? `image-${found.length + 1}`);
        const object = (target as unknown as { objs?: { has: (key: string) => boolean; get: (key: string) => { width?: number; height?: number } } }).objs;
        const details = object?.has?.(name) ? object.get(name) : undefined;
        found.push({ name, width: details?.width ?? 0, height: details?.height ?? 0 });
      });
      if (!cancelled) setPageImages(found);
    }).catch(() => setPageImages([]));
    return () => { cancelled = true; };
  }, [pdf, currentSourcePage]);

  const updateAnnotation = useCallback((id: string, changes: Partial<PdfAnnotation>) => {
    setEditState((current) => ({ ...current, annotations: current.annotations.map((item) => (item.id === id ? { ...item, ...changes } : item)) }));
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setEditState((current) => ({ ...current, annotations: current.annotations.filter((item) => item.id !== id) }));
  }, []);

  const addAnnotation = useCallback((annotation: PdfAnnotation) => {
    if (annotation.kind === 'link') {
      const value = window.prompt('Web address or page number')?.trim();
      if (!value) return;
      annotation.value = value;
      annotation.label = value;
    }
    if (annotation.kind === 'trial-balance') {
      const value = window.prompt('Trial balance account')?.trim();
      if (!value) return;
      annotation.value = value;
      annotation.label = value;
    }
    setEditState((current) => ({ ...current, annotations: [...current.annotations, annotation] }));
  }, []);

  const handleImageFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read the image.'));
      reader.readAsDataURL(file);
    });
    if (replaceTargetId) {
      updateAnnotation(replaceTargetId, { value: dataUrl, label: file.name });
      setReplaceTargetId(null);
      toast.success('Image replaced.');
      return;
    }
    addAnnotation({
      id: crypto.randomUUID(), kind: 'image', page: currentSourcePage,
      x: 30, y: 30, width: 30, height: 20, color: '#000000', label: file.name, value: dataUrl,
    });
    toast.success('Image placed on this page.');
  };

  const runSearch = useCallback(async () => {
    if (!pdf || !search.trim()) { setSearchResults([]); return; }
    const matches: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      const text = content.items.map((item) => 'str' in item ? item.str : '').join(' ');
      if (text.toLowerCase().includes(search.toLowerCase())) matches.push(pageNumber);
    }
    setSearchResults(matches);
    setSearchIndex(0);
    if (matches[0]) setPage(Math.max(1, visiblePages.indexOf(matches[0]) + 1));
  }, [pdf, search, visiblePages]);

  const jumpToMatch = useCallback((direction: 1 | -1) => {
    if (!searchResults.length) return;
    const next = (searchIndex + direction + searchResults.length) % searchResults.length;
    setSearchIndex(next);
    setPage(Math.max(1, visiblePages.indexOf(searchResults[next]) + 1));
  }, [searchIndex, searchResults, visiblePages]);

  const createSavedBytes = async () => {
    if (!sourceBytes) throw new Error('The source PDF is unavailable.');
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const sourceIndices = visiblePages.map((sourcePage) => sourcePage - 1);
    const copied = await output.copyPages(source, sourceIndices);
    const font = await output.embedFont(StandardFonts.HelveticaBold);
    for (let index = 0; index < copied.length; index += 1) {
      const copiedPage = copied[index];
      const sourcePage = visiblePages[index];
      const rotation = editState.rotations[String(sourcePage)] ?? 0;
      copiedPage.setRotation(degrees(rotation));
      const { width, height } = copiedPage.getSize();
      output.addPage(copiedPage);

      if (editState.watermark?.applied && editState.watermark.text) {
        copiedPage.drawText(editState.watermark.text, {
          x: width * 0.2, y: height * 0.45, size: Math.max(24, width / 12), font,
          color: rgb(0.35, 0.35, 0.35), opacity: editState.watermark.opacity,
          rotate: degrees(editState.watermark.rotation),
        });
      }

      const items = editState.annotations.filter((item) => item.page === sourcePage);
      for (const item of items) {
        const x = width * item.x / 100;
        const y = height - (height * (item.y + item.height) / 100);
        const boxWidth = width * item.width / 100;
        const boxHeight = height * item.height / 100;
        const color = hexToRgb(item.color || '#111827');
        if (item.kind === 'redaction') {
          copiedPage.drawRectangle({ x, y, width: boxWidth, height: boxHeight, color: rgb(0, 0, 0) });
        } else if (item.kind === 'highlight') {
          copiedPage.drawRectangle({ x, y, width: boxWidth, height: boxHeight, color, opacity: 0.35 });
        } else if (item.kind === 'rectangle') {
          copiedPage.drawRectangle({ x, y, width: boxWidth, height: boxHeight, borderColor: color, borderWidth: 1.5 });
        } else if (item.kind === 'circle') {
          copiedPage.drawEllipse({ x: x + boxWidth / 2, y: y + boxHeight / 2, xScale: boxWidth / 2, yScale: boxHeight / 2, borderColor: color, borderWidth: 1.5 });
        } else if (item.kind === 'underline') {
          copiedPage.drawLine({ start: { x, y }, end: { x: x + boxWidth, y }, color, thickness: 1.5 });
        } else if (item.kind === 'strikeout') {
          copiedPage.drawLine({ start: { x, y: y + boxHeight / 2 }, end: { x: x + boxWidth, y: y + boxHeight / 2 }, color, thickness: 1.5 });
        } else if (item.kind === 'arrow') {
          copiedPage.drawLine({ start: { x, y: y + boxHeight }, end: { x: x + boxWidth, y }, color, thickness: 1.5 });
        } else if (item.kind === 'freehand' && item.points?.length) {
          for (let point = 1; point < item.points.length; point += 1) {
            const from = item.points[point - 1];
            const to = item.points[point];
            copiedPage.drawLine({
              start: { x: width * from.x / 100, y: height - height * from.y / 100 },
              end: { x: width * to.x / 100, y: height - height * to.y / 100 },
              color, thickness: 1.5,
            });
          }
        } else if ((item.kind === 'text' || item.kind === 'comment' || item.kind === 'link' || item.kind === 'trial-balance') && (item.label || item.value)) {
          copiedPage.drawText(String(item.label ?? item.value), { x, y: y + boxHeight / 2, size: 10, font, color });
        } else if (item.kind === 'image' && item.value) {
          const bytes = Uint8Array.from(atob(item.value.split(',')[1] ?? ''), (character) => character.charCodeAt(0));
          const embedded = item.value.includes('image/png') ? await output.embedPng(bytes) : await output.embedJpg(bytes);
          copiedPage.drawImage(embedded, { x, y, width: boxWidth, height: boxHeight });
        }
      }
    }
    return output.save({ useObjectStreams: editState.optimize !== false });
  };

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const bytes = await createSavedBytes();
      const nextState: PdfEditState = { ...editState, passwords: { user: userPassword, owner: ownerPassword } };
      const saved = await savePdfVersion(document, bytes, nextState);
      setDocument(saved);
      setSourceBytes(bytes);
      setSavedState(structuredClone(nextState));
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
        <div className="sticky -top-3 z-10 -mx-3 space-y-2 border-b border-border bg-card px-3 pb-2 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{visiblePages.length} pages{selectedPages.length ? ` · ${selectedPages.length} selected` : ''}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPages(selectedPages.length === visiblePages.length ? [] : visiblePages.map((_, index) => index))}
            >
              {selectedPages.length === visiblePages.length ? 'Clear' : 'Select all'}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {([
              { label: 'Move up', icon: ArrowUp, action: () => movePages(-1) },
              { label: 'Move down', icon: ArrowDown, action: () => movePages(1) },
              { label: 'Rotate left', icon: RotateCcw, action: () => rotatePages(-1) },
              { label: 'Rotate right', icon: RotateCw, action: () => rotatePages(1) },
              { label: 'Duplicate', icon: Copy, action: duplicatePages },
              { label: 'Delete', icon: Trash2, action: deletePages },
            ]).map(({ label, icon: Icon, action }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={action} aria-label={label}><Icon /></Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
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
      </div>
    );
    if (activePanel === 'search') return (
      <div className="space-y-3">
        <div className="flex gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void runSearch()} placeholder="Search document text…" /><Button size="icon-sm" onClick={() => void runSearch()}><Search /></Button></div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground">{search ? `${searchResults.length ? searchIndex + 1 : 0} of ${searchResults.length} matching page${searchResults.length === 1 ? '' : 's'}` : 'Search the document text to see matches here.'}</p>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon-sm" disabled={!searchResults.length} onClick={() => jumpToMatch(-1)} aria-label="Previous match"><ArrowLeft /></Button>
            <Button variant="secondary" size="icon-sm" disabled={!searchResults.length} onClick={() => jumpToMatch(1)} aria-label="Next match"><ArrowRight /></Button>
          </div>
        </div>
        {searchResults.map((result, index) => <Button key={result} variant={index === searchIndex ? 'default' : 'secondary'} size="sm" className="w-full justify-start" onClick={() => { setSearchIndex(index); setPage(Math.max(1, visiblePages.indexOf(result) + 1)); }}>Page {result}</Button>)}
      </div>
    );
    if (activePanel === 'images') return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">IMAGES ON THIS PAGE</p>
        <p className="text-xs text-foreground">{pageImages.length ? `${pageImages.length} embedded image${pageImages.length === 1 ? '' : 's'} detected.` : 'No embedded images detected on this page.'}</p>
        <div className="space-y-2">
          {pageImages.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-2 py-2">
              <span className="flex-1 truncate text-xs text-foreground">Image {index + 1}{item.width ? ` · ${item.width}×${item.height}` : ''}</span>
              <Button variant="secondary" size="sm" onClick={() => { setReplaceTargetId(null); imageInputRef.current?.click(); }}>Replace</Button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">PLACED IMAGES</p>
          {editState.annotations.filter((item) => item.kind === 'image' && item.page === currentSourcePage).map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-2 py-2">
              <span className="flex-1 truncate text-xs text-foreground">{item.label ?? 'Image'}</span>
              <Button variant="secondary" size="sm" onClick={() => { setReplaceTargetId(item.id); imageInputRef.current?.click(); }}>Replace</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => deleteAnnotation(item.id)} aria-label="Delete image"><Trash2 /></Button>
            </div>
          ))}
          <Button className="w-full" variant="secondary" onClick={() => { setReplaceTargetId(null); imageInputRef.current?.click(); }}><Image />Insert image</Button>
        </div>
      </div>
    );
    if (activePanel === 'annotations') return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2">{ANNOTATION_TOOLS.map(({ kind, label, icon: Icon }) => <Tooltip key={kind}><TooltipTrigger asChild><Button variant={(kind === 'select' ? activeKind === null : activeKind === kind) ? 'default' : 'secondary'} size="icon" onClick={() => setActiveKind(kind === 'select' ? null : kind as PdfAnnotationKind)} aria-label={label}><Icon /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}</div>
        <div className="flex gap-2">{COLORS.map((color) => <button key={color} type="button" aria-label={`Colour ${color}`} onClick={() => { setActiveColor(color); if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color }); }} className={cn('h-6 w-6 rounded-[6px] border', activeColor === color ? 'border-primary ring-2 ring-primary/40' : 'border-border')} style={{ backgroundColor: color }} />)}</div>
        <div className="space-y-2">{editState.annotations.filter((item) => !['comment', 'link', 'trial-balance', 'image'].includes(item.kind)).map((item) => <AnnotationRow key={item.id} item={item} selected={selectedAnnotationId === item.id} onSelect={() => setSelectedAnnotationId(item.id)} onRename={(label) => updateAnnotation(item.id, { label })} onDelete={() => deleteAnnotation(item.id)} />)}</div>
      </div>
    );
    if (activePanel === 'links' || activePanel === 'trial-balance' || activePanel === 'comments') {
      const kind: PdfAnnotationKind = activePanel === 'links' ? 'link' : activePanel === 'trial-balance' ? 'trial-balance' : 'comment';
      const heading = activePanel === 'links' ? 'HYPERLINKS' : activePanel === 'trial-balance' ? 'TRIAL BALANCE' : 'COMMENTS';
      return <div className="space-y-3"><p className="text-xs font-semibold text-foreground">{heading}</p><p className="text-xs text-foreground">Click the page to place a {activePanel === 'comments' ? 'sticky note' : 'linked region'}.</p><Button variant={activeKind === kind ? 'default' : 'secondary'} className="w-full" onClick={() => setActiveKind(kind)}>Add {activePanel === 'comments' ? 'comment' : 'link'}</Button>{editState.annotations.filter((item) => item.kind === kind).map((item) => <AnnotationRow key={item.id} item={item} selected={selectedAnnotationId === item.id} onSelect={() => setSelectedAnnotationId(item.id)} onRename={(label) => updateAnnotation(item.id, { label, value: kind === 'comment' ? item.value : label })} onDelete={() => deleteAnnotation(item.id)} />)}</div>;
    }
    if (activePanel === 'redact') return (
      <div className="space-y-4">
        <div><p className="text-xs font-semibold text-foreground">REDACT</p><p className="mt-1 text-xs text-foreground">Draws a region and permanently removes the visible underlying area when saved.</p><Button variant={activeKind === 'redaction' ? 'default' : 'secondary'} className="mt-2 w-full" onClick={() => setActiveKind('redaction')}>Draw redaction region</Button></div>
        <div className="border-t border-border pt-4 space-y-2"><p className="text-xs font-semibold text-foreground">WATERMARK</p><Input value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} /><div className="grid grid-cols-2 gap-2"><Input type="number" min="0.1" max="1" step="0.1" value={watermarkOpacity} onChange={(event) => setWatermarkOpacity(Number(event.target.value))} /><Input type="number" value={watermarkRotation} onChange={(event) => setWatermarkRotation(Number(event.target.value))} /></div><Button className="w-full" onClick={() => setEditState((current) => ({ ...current, watermark: { text: watermarkText, opacity: watermarkOpacity, rotation: watermarkRotation, applied: true } }))}><Save />Apply to all pages</Button>{editState.watermark?.applied && <Button variant="secondary" className="w-full" onClick={() => setEditState((current) => ({ ...current, watermark: undefined }))}>Remove watermark</Button>}</div>
      </div>
    );
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-foreground">PASSWORDS AND PERMISSIONS</p>
          <div className="mt-2 space-y-2">
            <Input type="password" placeholder="User password" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} />
            <Input type="password" placeholder="Owner password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} />
            {Object.entries(editState.security ?? {}).map(([key, checked]) => <label key={key} className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={checked} onChange={(event) => setEditState((current) => ({ ...current, security: { ...(current.security ?? emptyPdfEditState().security), [key]: event.target.checked } as PdfEditState['security'] }))} />{key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}</label>)}
            <p className="text-[11px] text-foreground">Passwords and permissions are stored with this document and applied when the protected copy is generated on save.</p>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground">SANITIZE & OPTIMIZE</p>
          <p className="my-2 text-xs text-foreground">Remove embedded active content and compress the saved document.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={editState.sanitize ? 'default' : 'secondary'} onClick={() => { setEditState((current) => ({ ...current, sanitize: !current.sanitize })); toast.success('Sanitization setting updated.'); }}>Sanitize</Button>
            <Button variant={editState.optimize ? 'default' : 'secondary'} onClick={() => { setEditState((current) => ({ ...current, optimize: !current.optimize })); toast.success('Optimization setting updated.'); }}>Optimize</Button>
          </div>
        </div>
      </div>
    );
  }, [activeColor, activeKind, activePanel, currentSourcePage, deleteAnnotation, editState, jumpToMatch, ownerPassword, page, pageImages, pdf, runSearch, search, searchIndex, searchResults, selectedAnnotationId, selectedPages, updateAnnotation, userPassword, visiblePages, watermarkOpacity, watermarkRotation, watermarkText]);

  if (loading) return <div className="flex h-full items-center justify-center gap-3 text-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Opening PDF…</div>;
  if (error || !pdf || !document) return <div className="flex h-full flex-col items-center justify-center gap-3"><FileText className="h-10 w-10 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Unable to open PDF</p><p className="max-w-md text-center text-xs text-foreground">{error}</p></div>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleImageFile(file); }} />
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
          <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-5"><div className="mx-auto w-fit"><CanvasPage pdf={pdf} pageNumber={currentSourcePage} zoom={zoom} rotation={editState.rotations[String(currentSourcePage)] ?? 0} annotations={pageAnnotations} activeKind={editing ? activeKind : null} color={activeColor} onAdd={addAnnotation} onSelect={setSelectedAnnotationId} selectedId={selectedAnnotationId} /></div></div>
        </section>
        {editing && <aside className="flex w-[340px] shrink-0 border-l border-border bg-card">
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2">{TOOLS.map(({ id, label, icon: Icon }) => <Tooltip key={id}><TooltipTrigger asChild><Button variant={activePanel === id ? 'default' : 'ghost'} size="icon" onClick={() => { setActivePanel(id); setActiveKind(null); }} aria-label={label}><Icon /></Button></TooltipTrigger><TooltipContent side="left">{label}</TooltipContent></Tooltip>)}</div>
          <ScrollArea className="h-full flex-1"><div className="p-3">{panelContent}</div></ScrollArea>
        </aside>}
      </div>
    </div>
  );
}

function AnnotationRow({ item, selected, onSelect, onRename, onDelete }: { item: PdfAnnotation; selected?: boolean; onSelect?: () => void; onRename?: (label: string) => void; onDelete: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.label ?? item.value ?? '');
  return (
    <div className={cn('flex items-center gap-2 rounded-[8px] border bg-background px-2 py-2', selected ? 'border-primary' : 'border-border')} onClick={onSelect}>
      {renaming ? (
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => { onRename?.(draft.trim()); setRenaming(false); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { onRename?.(draft.trim()); setRenaming(false); } }}
          className="h-7 flex-1 text-xs"
        />
      ) : (
        <button type="button" className="flex-1 truncate text-left text-xs font-medium text-foreground" onDoubleClick={() => setRenaming(true)}>
          p.{item.page} {item.label || item.value || item.kind}
        </button>
      )}
      <span className="h-5 w-5 rounded-[5px] border border-border" style={{ backgroundColor: item.color }} />
      {onRename && <Button variant="ghost" size="icon-sm" onClick={() => setRenaming(true)} aria-label="Rename"><Pencil /></Button>}
      <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete"><Trash2 /></Button>
    </div>
  );
}
