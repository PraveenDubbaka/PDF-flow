import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Bookmark, Calculator, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle,
  Copy, Download, ExternalLink, FileText, Highlighter, Image, Link2, Loader2, LockKeyhole,
  MessageSquare, MousePointer2, Pen, Pencil, Plus, RotateCcw, RotateCw, Save, ScanText, Search, ShieldCheck, Sparkles, Square,
  Strikethrough, TextCursorInput, Trash2, Underline, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LukaIcon } from '@/components/LukaIcon';
import { cn } from '@/lib/utils';
import {
  emptyPdfEditState, getPdfBlobUrl, getPdfDocument, PdfAnnotation, PdfAnnotationKind, PdfCalculation, PdfDocumentProperties,
  PdfDocumentRecord, PdfEditState, savePdfVersion,
} from '@/lib/pdfDocuments';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type ToolId = 'pages' | 'search' | 'images' | 'annotations' | 'links' | 'trial-balance' | 'comments' | 'redact' | 'security' | 'details' | 'ocr' | 'calculations' | 'luka';
type TextItemLike = { str: string; width: number; height: number; transform: number[] };
type SearchMatch = { id: string; page: number; snippet: string; x: number; y: number; width: number; height: number };
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
  { id: 'details', label: 'Bookmarks and properties', icon: Bookmark },
  { id: 'ocr', label: 'Make searchable', icon: ScanText },
  { id: 'calculations', label: 'Calculations', icon: Calculator },
  { id: 'luka', label: 'Ask Luka', icon: Sparkles },
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

function CanvasPage({ pdf, pageNumber, zoom, rotation, annotations, activeKind, color, onAdd, onSelect, selectedId, highlight }: {
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
  highlight?: { id: string; page: number; x: number; y: number; width: number; height: number } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 612, height: 792 });
  const [drawing, setDrawing] = useState<{ x: number; y: number }[] | null>(null);

  useEffect(() => {
    if (!highlight || highlight.page !== pageNumber) return;
    const timer = window.setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => window.clearTimeout(timer);
  }, [highlight, pageNumber]);

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
      {highlight && highlight.page === pageNumber && (
        <div
          ref={highlightRef}
          key={highlight.id}
          className="pointer-events-none absolute animate-pulse rounded-[2px] bg-warning/50 ring-2 ring-warning"
          style={{ left: `${highlight.x}%`, top: `${highlight.y}%`, width: `${highlight.width}%`, height: `${highlight.height}%` }}
        />
      )}
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
          {(annotation.kind === 'text' || annotation.kind === 'calculation') && <span className="text-xs font-medium" style={{ color: annotation.color }}>{annotation.label}</span>}
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


type DocImage = { id: string; page: number; index: number; x: number; y: number; width: number; height: number; pixelWidth: number; pixelHeight: number; thumb: string };

function multiply(a: number[], b: number[]) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
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
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState<{ id: string; page: number; x: number; y: number; width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageImages, setPageImages] = useState<{ name: string; width: number; height: number }[]>([]);
  const [docImages, setDocImages] = useState<DocImage[]>([]);
  const [scanningImages, setScanningImages] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [properties, setProperties] = useState<PdfDocumentProperties>(emptyPdfEditState().properties ?? { title: '', author: '', subject: '', keywords: '', creator: '' });
  const [detectedFonts, setDetectedFonts] = useState<string[]>([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [calcTitle, setCalcTitle] = useState('');
  const [calcColor, setCalcColor] = useState(COLORS[0]);
  const [calcRows, setCalcRows] = useState<{ value: string; operator: '+' | '-' | '×' | '÷' }[]>([{ value: '', operator: '+' }]);
  const [lukaQuestion, setLukaQuestion] = useState('');
  const [lukaAnswer, setLukaAnswer] = useState('');
  const [lukaLoading, setLukaLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let currentUrl: string | null = null;
    let cancelled = false;
    const load = async (attempt: number): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        const record = await getPdfDocument(documentId);
        const url = await getPdfBlobUrl(record.storage_path);
        currentUrl = url;
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const loadedPdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const state = { ...emptyPdfEditState(), ...(record.edit_state ?? {}) } as PdfEditState;
        if (!state.pageOrder.length) state.pageOrder = Array.from({ length: loadedPdf.numPages }, (_, index) => index + 1);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        setDocument(record);
        setBlobUrl(url);
        setSourceBytes(bytes);
        setPdf(loadedPdf);
        setEditState(state);
        setSavedState(structuredClone(state));
        setProperties(state.properties ?? emptyPdfEditState().properties ?? { title: '', author: '', subject: '', keywords: '', creator: '' });
        setUserPassword(state.passwords?.user ?? '');
        setOwnerPassword(state.passwords?.owner ?? '');
        setLoading(false);
      } catch (reason) {
        if (cancelled) return;
        if (attempt < 2) {
          if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
          await new Promise((resolve) => setTimeout(resolve, 600));
          void load(attempt + 1);
          return;
        }
        console.error('PDF open failed:', reason);
        setError(reason instanceof Error ? reason.message : 'Unable to open this PDF.');
        setLoading(false);
      }
    };
    void load(0);
    return () => { cancelled = true; if (currentUrl) URL.revokeObjectURL(currentUrl); };
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

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void pdf.getPage(currentSourcePage).then(async (target) => {
      const operators = await target.getOperatorList();
      const fonts = operators.fnArray.flatMap((fn, index) => fn === pdfjs.OPS.setFont ? [String(operators.argsArray[index]?.[0] ?? '')] : []).filter(Boolean);
      if (!cancelled) setDetectedFonts([...new Set(fonts)]);
    }).catch(() => setDetectedFonts([]));
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

  const goToMatch = useCallback((match: SearchMatch, index: number) => {
    setSearchIndex(index);
    const position = visiblePages.indexOf(match.page);
    setPage(Math.max(1, position + 1));
    setSearchHighlight({ id: `${match.id}-${Date.now()}`, page: match.page, x: match.x, y: match.y, width: match.width, height: match.height });
  }, [visiblePages]);

  const runSearch = useCallback(async () => {
    const query = search.trim();
    if (!pdf || !query) { setSearchResults([]); setSearchHighlight(null); return; }
    setSearching(true);
    try {
      const found: SearchMatch[] = [];
      const needle = query.toLowerCase();
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const target = await pdf.getPage(pageNumber);
        const viewport = target.getViewport({ scale: 1 });
        const content = await target.getTextContent();
        const pieces: { text: string; start: number; item: TextItemLike }[] = [];
        let joined = '';
        for (const raw of content.items) {
          if (!('str' in raw)) continue;
          const item = raw as unknown as TextItemLike;
          pieces.push({ text: item.str, start: joined.length, item });
          joined += `${item.str} `;
        }
        const haystack = joined.toLowerCase();
        let from = 0;
        for (;;) {
          const at = haystack.indexOf(needle, from);
          if (at === -1) break;
          from = at + needle.length;
          const piece = [...pieces].reverse().find((entry) => entry.start <= at);
          const transform = piece?.item.transform ?? [1, 0, 0, 1, 0, 0];
          const itemHeight = piece?.item.height || Math.hypot(transform[1], transform[3]) || 10;
          const itemWidth = piece?.item.width || itemHeight * needle.length * 0.5;
          found.push({
            id: `${pageNumber}-${at}`,
            page: pageNumber,
            snippet: `…${joined.slice(Math.max(0, at - 60), at + needle.length + 60).trim()}…`,
            x: Math.max(0, (transform[4] / viewport.width) * 100),
            y: Math.max(0, ((viewport.height - transform[5] - itemHeight) / viewport.height) * 100),
            width: Math.min(100, Math.max(1.5, (itemWidth / viewport.width) * 100)),
            height: Math.max(1, (itemHeight * 1.25 / viewport.height) * 100),
          });
        }
      }
      setSearchResults(found);
      setSearchIndex(0);
      setSearchHighlight(null);
      if (found[0]) goToMatch(found[0], 0);
    } finally { setSearching(false); }
  }, [goToMatch, pdf, search]);

  const jumpToMatch = useCallback((direction: 1 | -1) => {
    if (!searchResults.length) return;
    const next = (searchIndex + direction + searchResults.length) % searchResults.length;
    goToMatch(searchResults[next], next);
  }, [goToMatch, searchIndex, searchResults]);

  const extractPageText = useCallback(async (sourcePage = currentSourcePage) => {
    if (!pdf) return '';
    const content = await (await pdf.getPage(sourcePage)).getTextContent();
    return content.items.map((item) => 'str' in item ? item.str : '').join(' ').replace(/\s+/g, ' ').trim();
  }, [currentSourcePage, pdf]);

  const renderPageImage = useCallback(async (sourcePage: number) => {
    if (!pdf) return '';
    const target = await pdf.getPage(sourcePage);
    const viewport = target.getViewport({ scale: 1.35 });
    const canvas = window.document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) return '';
    await target.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.78);
  }, [pdf]);

  const scanDocumentImages = useCallback(async () => {
    if (!pdf) return;
    setScanningImages(true);
    try {
      const found: DocImage[] = [];
      for (const sourcePage of visiblePages) {
        const target = await pdf.getPage(sourcePage);
        const operators = await target.getOperatorList();
        const viewport = target.getViewport({ scale: 1 });
        let matrix = [1, 0, 0, 1, 0, 0];
        const stack: number[][] = [];
        const rects: { x: number; y: number; width: number; height: number }[] = [];
        operators.fnArray.forEach((fn, index) => {
          const args = operators.argsArray[index] as number[] | undefined;
          if (fn === pdfjs.OPS.save) { stack.push(matrix.slice()); return; }
          if (fn === pdfjs.OPS.restore) { matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0]; return; }
          if (fn === pdfjs.OPS.transform && args) { matrix = multiply(matrix, args); return; }
          if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintInlineImageXObject && fn !== pdfjs.OPS.paintImageMaskXObject) return;
          const w = Math.abs(matrix[0]);
          const h = Math.abs(matrix[3]);
          if (w < 4 || h < 4) return;
          const x0 = matrix[4] - (matrix[0] < 0 ? w : 0);
          const y0 = matrix[5] - (matrix[3] < 0 ? h : 0);
          const [vx1, vy1] = viewport.convertToViewportPoint(x0, y0);
          const [vx2, vy2] = viewport.convertToViewportPoint(x0 + w, y0 + h);
          const left = Math.min(vx1, vx2), top = Math.min(vy1, vy2);
          rects.push({
            x: (left / viewport.width) * 100,
            y: (top / viewport.height) * 100,
            width: (Math.abs(vx2 - vx1) / viewport.width) * 100,
            height: (Math.abs(vy2 - vy1) / viewport.height) * 100,
          });
        });
        if (!rects.length) continue;
        const scale = 1.5;
        const rendered = target.getViewport({ scale });
        const canvas = window.document.createElement('canvas');
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        const context = canvas.getContext('2d');
        if (!context) continue;
        await target.render({ canvas, canvasContext: context, viewport: rendered }).promise;
        rects.forEach((rect, index) => {
          const sx = (rect.x / 100) * canvas.width;
          const sy = (rect.y / 100) * canvas.height;
          const sw = Math.max(1, (rect.width / 100) * canvas.width);
          const sh = Math.max(1, (rect.height / 100) * canvas.height);
          const crop = window.document.createElement('canvas');
          crop.width = Math.min(160, Math.round(sw));
          crop.height = Math.max(1, Math.round((sh / sw) * Math.min(160, Math.round(sw))));
          const cropContext = crop.getContext('2d');
          cropContext?.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
          found.push({
            id: `img-${sourcePage}-${index}`, page: sourcePage, index: index + 1,
            ...rect,
            pixelWidth: Math.round(sw / scale), pixelHeight: Math.round(sh / scale),
            thumb: cropContext ? crop.toDataURL('image/jpeg', 0.7) : '',
          });
        });
      }
      setDocImages(found);
    } catch {
      setDocImages([]);
    } finally { setScanningImages(false); }
  }, [pdf, visiblePages]);

  const goToImage = useCallback((item: DocImage) => {
    const position = visiblePages.indexOf(item.page);
    setPage(Math.max(1, position + 1));
    setSearchHighlight({ id: `${item.id}-${Date.now()}`, page: item.page, x: item.x, y: item.y, width: item.width, height: item.height });
  }, [visiblePages]);


  const runOcr = useCallback(async () => {
    if (!pdf) return;
    setOcrRunning(true);
    try {
      const extracted: Record<string, string> = {};
      const { supabase } = await import('@/integrations/supabase/client');
      for (const sourcePage of visiblePages) {
        const embeddedText = await extractPageText(sourcePage);
        if (embeddedText) {
          extracted[String(sourcePage)] = embeddedText;
          continue;
        }
        const pageImage = await renderPageImage(sourcePage);
        const { data, error: invokeError } = await supabase.functions.invoke('pdf-ask-luka', { body: { action: 'ocr', pageImage, documentName: document?.name, pageNumber: sourcePage } });
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);
        extracted[String(sourcePage)] = data?.result ?? '';
      }
      setEditState((current) => ({ ...current, ocrText: { ...(current.ocrText ?? {}), ...extracted } }));
      toast.success(`Made ${visiblePages.length} page${visiblePages.length === 1 ? '' : 's'} searchable.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Unable to recognize document text.');
    } finally { setOcrRunning(false); }
  }, [document?.name, extractPageText, pdf, renderPageImage, visiblePages]);

  const calculationResult = useMemo(() => calcRows.reduce((result, row, index) => {
    const value = Number(row.value) || 0;
    if (index === 0) return value;
    if (row.operator === '-') return result - value;
    if (row.operator === '×') return result * value;
    if (row.operator === '÷') return value === 0 ? result : result / value;
    return result + value;
  }, 0), [calcRows]);

  const addCalculation = useCallback(() => {
    const calculation: PdfCalculation = {
      id: crypto.randomUUID(), title: calcTitle.trim() || 'Calculation', page: currentSourcePage,
      values: calcRows.map((row) => Number(row.value) || 0), operators: calcRows.map((row) => row.operator),
      result: calculationResult, color: calcColor,
    };
    setEditState((current) => ({
      ...current,
      calculations: [...(current.calculations ?? []), calculation],
      annotations: [...current.annotations, { id: calculation.id, kind: 'calculation', page: currentSourcePage, x: 30, y: 30, width: 25, height: 6, color: calcColor, label: `${calculation.title}: ${calculationResult}` }],
    }));
    setCalcTitle('');
    setCalcRows([{ value: '', operator: '+' }]);
    toast.success('Calculation added to the document.');
  }, [calcColor, calcRows, calcTitle, calculationResult, currentSourcePage]);

  const askLuka = useCallback(async (question: string) => {
    const prompt = question.trim();
    if (!prompt) return;
    setLukaQuestion(prompt);
    setLukaLoading(true);
    setLukaAnswer('');
    try {
      const pageText = editState.ocrText?.[String(currentSourcePage)] || await extractPageText();
      const { data, error: invokeError } = await import('@/integrations/supabase/client').then(({ supabase }) => supabase.functions.invoke('pdf-ask-luka', { body: { question: prompt, pageText, documentName: document?.name, pageNumber: page } }));
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setLukaAnswer(data?.result ?? 'No answer was returned.');
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Ask Luka could not answer this question.');
    } finally { setLukaLoading(false); }
  }, [currentSourcePage, document?.name, editState.ocrText, extractPageText, page]);

  const createSavedBytes = async () => {
    if (!sourceBytes) throw new Error('The source PDF is unavailable.');
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const metadata = editState.properties ?? properties;
    if (metadata.title) output.setTitle(metadata.title);
    if (metadata.author) output.setAuthor(metadata.author);
    if (metadata.subject) output.setSubject(metadata.subject);
    if (metadata.keywords) output.setKeywords(metadata.keywords.split(',').map((item) => item.trim()).filter(Boolean));
    if (metadata.creator) output.setCreator(metadata.creator);
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
        } else if ((item.kind === 'text' || item.kind === 'comment' || item.kind === 'link' || item.kind === 'trial-balance' || item.kind === 'calculation') && (item.label || item.value)) {
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
        <div className="relative">
          {searching
            ? <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            : <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />}
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void runSearch()}
            placeholder="Search document text…"
            className="pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground"
              onClick={() => { setSearch(''); setSearchResults([]); setSearchHighlight(null); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground">{search ? `${searchResults.length ? searchIndex + 1 : 0} of ${searchResults.length}` : 'Search the document text to see matches here.'}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" disabled={!searchResults.length} onClick={() => jumpToMatch(-1)} aria-label="Previous match"><ChevronUp /></Button>
            <Button variant="ghost" size="icon-sm" disabled={!searchResults.length} onClick={() => jumpToMatch(1)} aria-label="Next match"><ChevronDown /></Button>
          </div>
        </div>
        <div className="space-y-2">
          {searchResults.map((result, index) => (
            <button
              key={result.id}
              type="button"
              onClick={() => goToMatch(result, index)}
              className={cn(
                'w-full rounded-[8px] border bg-background p-2 text-left',
                index === searchIndex ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><FileText className="h-3.5 w-3.5" />Page {result.page}</span>
              <span className="mt-1 block text-[11px] leading-snug text-foreground">{result.snippet}</span>
            </button>
          ))}
          {!!search && !searchResults.length && !searching && <p className="text-xs text-foreground">No matches found.</p>}
        </div>
      </div>
    );
    if (activePanel === 'images') return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">IMAGES IN DOCUMENT</p>
          <Button variant="ghost" size="sm" onClick={() => void scanDocumentImages()} disabled={scanningImages}>{scanningImages ? <Loader2 className="animate-spin" /> : <RotateCw />}Rescan</Button>
        </div>
        <p className="text-xs text-foreground">{scanningImages ? 'Scanning all pages…' : docImages.length ? `${docImages.length} image${docImages.length === 1 ? '' : 's'} found across ${new Set(docImages.map((item) => item.page)).size} page${new Set(docImages.map((item) => item.page)).size === 1 ? '' : 's'}.` : 'No images detected in this document.'}</p>
        <div className="space-y-2">
          {docImages.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-[8px] border border-border bg-background p-2">
              <button type="button" onClick={() => goToImage(item)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {item.thumb ? <img src={item.thumb} alt={`Image ${item.index} on page ${item.page}`} className="h-10 w-12 shrink-0 rounded-[6px] border border-border object-cover" /> : <div className="h-10 w-12 shrink-0 rounded-[6px] border border-border bg-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">Page {item.page} · Image {item.index}</span>
                  <span className="block truncate text-[11px] text-foreground">{item.pixelWidth}×{item.pixelHeight} pt</span>
                </span>
              </button>
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
        <div className="space-y-2">{editState.annotations.filter((item) => !['comment', 'link', 'trial-balance', 'image', 'calculation'].includes(item.kind)).map((item) => <AnnotationRow key={item.id} item={item} selected={selectedAnnotationId === item.id} onSelect={() => setSelectedAnnotationId(item.id)} onRename={(label) => updateAnnotation(item.id, { label })} onDelete={() => deleteAnnotation(item.id)} />)}</div>
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
    if (activePanel === 'details') return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-foreground">BOOKMARKS</p>
          <div className="mt-2 flex gap-2"><Input value={bookmarkTitle} onChange={(event) => setBookmarkTitle(event.target.value)} placeholder="Bookmark title" /><Input className="w-16" type="number" min={1} max={visiblePages.length} value={page} readOnly /><Button size="icon-sm" disabled={!bookmarkTitle.trim()} onClick={() => { setEditState((current) => ({ ...current, bookmarks: [...(current.bookmarks ?? []), { id: crypto.randomUUID(), title: bookmarkTitle.trim(), page }] })); setBookmarkTitle(''); }} aria-label="Add bookmark"><Plus /></Button></div>
          <div className="mt-2 space-y-2">{(editState.bookmarks ?? []).length === 0 && <p className="text-xs text-foreground">No bookmarks yet.</p>}{(editState.bookmarks ?? []).map((bookmark) => <div key={bookmark.id} className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-2 py-2"><Button variant="ghost" size="sm" className="min-w-0 flex-1 justify-start truncate" onClick={() => setPage(Math.min(visiblePages.length, Math.max(1, bookmark.page)))}>{bookmark.title} · p.{bookmark.page}</Button><Button variant="ghost" size="icon-sm" aria-label="Delete bookmark" onClick={() => setEditState((current) => ({ ...current, bookmarks: (current.bookmarks ?? []).filter((item) => item.id !== bookmark.id) }))}><Trash2 /></Button></div>)}</div>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground">DOCUMENT PROPERTIES</p>
          {(['title', 'author', 'subject', 'keywords', 'creator'] as const).map((key) => <Input key={key} value={properties[key]} onChange={(event) => setProperties((current) => ({ ...current, [key]: event.target.value }))} placeholder={key.charAt(0).toUpperCase() + key.slice(1)} />)}
          <Button className="w-full" onClick={() => { setEditState((current) => ({ ...current, properties })); toast.success('Document properties updated.'); }}>Save properties</Button>
        </div>
        <div className="border-t border-border pt-4"><p className="text-xs font-semibold text-foreground">FONTS ON THIS PAGE</p><div className="mt-2 space-y-1">{detectedFonts.length ? detectedFonts.map((font) => <p key={font} className="truncate text-xs text-foreground">{font}</p>) : <p className="text-xs text-foreground">No font names detected.</p>}</div></div>
      </div>
    );
    if (activePanel === 'ocr') return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">OCR</p>
        <p className="text-xs text-foreground">Recognizes text across the document and makes it available for search and Ask Luka.</p>
        <Button className="w-full" disabled={ocrRunning} onClick={() => void runOcr()}>{ocrRunning ? <Loader2 className="animate-spin" /> : <ScanText />}Make document searchable</Button>
        <div className="border-t border-border pt-3"><p className="text-xs font-semibold text-foreground">PAGE {page} TEXT</p><div className="mt-2 max-h-72 overflow-auto rounded-[8px] border border-border bg-background p-2 text-xs text-foreground">{editState.ocrText?.[String(currentSourcePage)] || 'Run OCR to extract searchable text.'}</div></div>
      </div>
    );
    if (activePanel === 'calculations') return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">BUILD A CALCULATION</p>
        <div className="flex gap-2"><Input value={calcTitle} onChange={(event) => setCalcTitle(event.target.value)} placeholder="Header (optional)" /><input type="color" value={calcColor} onChange={(event) => setCalcColor(event.target.value)} aria-label="Calculation colour" className="h-9 w-10 rounded-[6px] border border-border bg-background p-1" /></div>
        <div className="space-y-2">{calcRows.map((row, index) => <div key={index} className="grid grid-cols-[28px_72px_1fr_28px] items-center gap-2"><span className="text-center text-xs text-foreground">{index + 1}</span><select value={row.operator} disabled={index === 0} onChange={(event) => setCalcRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, operator: event.target.value as '+' | '-' | '×' | '÷' } : item))} className="h-9 rounded-[8px] border border-border bg-background px-2 text-xs text-foreground"><option>+</option><option>-</option><option>×</option><option>÷</option></select><Input type="number" value={row.value} onChange={(event) => setCalcRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, value: event.target.value } : item))} placeholder="0.00" /><Button variant="ghost" size="icon-sm" disabled={calcRows.length === 1} onClick={() => setCalcRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove calculation row"><X /></Button></div>)}</div>
        <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setCalcRows((current) => [...current, { value: '', operator: '+' }])}><Plus />Add</Button><Button variant="secondary" onClick={() => setCalcRows([{ value: '', operator: '+' }])}><X />Clear</Button></div>
        <div className="flex items-center justify-between rounded-[8px] bg-primary/15 px-3 py-2 text-sm font-semibold text-foreground"><span>Result</span><span>{Number.isFinite(calculationResult) ? calculationResult.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</span></div>
        <Button className="w-full" onClick={addCalculation}><Plus />Add to document</Button>
        <div className="border-t border-border pt-3"><p className="mb-2 text-xs font-semibold text-foreground">PLACED CALCULATIONS</p><div className="space-y-2">{(editState.calculations ?? []).map((calculation) => <div key={calculation.id} className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-2 py-2"><Button variant="ghost" size="sm" className="min-w-0 flex-1 justify-start" onClick={() => setPage(Math.max(1, visiblePages.indexOf(calculation.page) + 1))}><span className="truncate">{calculation.title}<br /><span className="font-normal">Result = {calculation.result}</span></span></Button><Button variant="ghost" size="icon-sm" aria-label="Delete calculation" onClick={() => setEditState((current) => ({ ...current, calculations: (current.calculations ?? []).filter((item) => item.id !== calculation.id), annotations: current.annotations.filter((item) => item.id !== calculation.id) }))}><Trash2 /></Button></div>)}</div></div>
      </div>
    );
    if (activePanel === 'luka') return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-3 py-5 text-center"><LukaIcon size={44} className="mb-3" animated={lukaLoading} /><p className="text-sm font-semibold text-foreground">Ask Luka about this document</p><p className="mt-2 max-w-xs text-xs text-foreground">Luka uses the page you are viewing and can place an answer as a note or calculation.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{['Summarize this page', 'Extract the figures on this page', 'Check these totals'].map((prompt) => <Button key={prompt} variant="secondary" size="sm" onClick={() => void askLuka(prompt)}>{prompt}</Button>)}</div>{lukaLoading && <Loader2 className="mt-5 h-5 w-5 animate-spin text-primary" />}{lukaAnswer && <div className="mt-5 w-full rounded-[8px] border border-border bg-background p-3 text-left text-xs text-foreground"><p>{lukaAnswer}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={() => addAnnotation({ id: crypto.randomUUID(), kind: 'comment', page: currentSourcePage, x: 80, y: 8, width: 4, height: 4, color: '#f59e0b', label: lukaAnswer })}>Add note</Button><Button size="sm" variant="secondary" onClick={() => { const numeric = Number(lukaAnswer.match(/-?[\d,]+(?:\.\d+)?/)?.[0]?.replace(/,/g, '')); if (!Number.isFinite(numeric)) return toast.error('This answer does not contain a calculation result.'); setCalcTitle(lukaQuestion); setCalcRows([{ value: String(numeric), operator: '+' }]); setActivePanel('calculations'); }}>Use result</Button></div></div>}</div>
        <div className="shrink-0 border-t border-border bg-card p-3"><Textarea size="default" className="min-h-[76px] p-3 text-xs" value={lukaQuestion} onChange={(event) => setLukaQuestion(event.target.value)} placeholder="Ask Luka about this document…" /><Button className="mt-2 w-full" disabled={lukaLoading || !lukaQuestion.trim()} onClick={() => void askLuka(lukaQuestion)}>{lukaLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}Send</Button></div>
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
  }, [activeColor, activeKind, activePanel, addCalculation, askLuka, bookmarkTitle, calcColor, calcRows, calcTitle, calculationResult, currentSourcePage, deleteAnnotation, detectedFonts, editState, goToMatch, jumpToMatch, lukaAnswer, lukaLoading, lukaQuestion, ocrRunning, ownerPassword, page, pageImages, pdf, properties, runOcr, runSearch, search, searchIndex, searching, searchResults, selectedAnnotationId, selectedPages, updateAnnotation, userPassword, visiblePages, watermarkOpacity, watermarkRotation, watermarkText]);

  if (loading) return <div className="flex h-full items-center justify-center gap-3 text-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Opening PDF…</div>;
  if (error || !pdf || !document) return <div className="flex h-full flex-col items-center justify-center gap-3"><FileText className="h-10 w-10 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Unable to open PDF</p><p className="max-w-md text-center text-xs text-foreground">{error}</p></div>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleImageFile(file); }} />
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-foreground">{document.name}</h1><p className="text-[10px] text-foreground">Version {document.current_version}</p></div>
        <div className="flex items-center gap-2">
          {editing ? <><Button variant="secondary" size="sm" onClick={() => { setEditState(structuredClone(savedState)); setProperties(savedState.properties ?? emptyPdfEditState().properties ?? { title: '', author: '', subject: '', keywords: '', creator: '' }); setEditing(false); setActiveKind(null); }}><X />Cancel</Button><Button size="sm" disabled={saving} onClick={() => void handleSave()}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save</Button></> : <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil />Edit</Button>}
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
          <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-5"><div className="mx-auto w-fit"><CanvasPage pdf={pdf} pageNumber={currentSourcePage} zoom={zoom} rotation={editState.rotations[String(currentSourcePage)] ?? 0} annotations={pageAnnotations} activeKind={editing ? activeKind : null} color={activeColor} onAdd={addAnnotation} onSelect={setSelectedAnnotationId} selectedId={selectedAnnotationId} highlight={searchHighlight} /></div></div>
        </section>
        {editing && <aside className="flex w-[340px] min-h-0 shrink-0 border-l border-border bg-card">
          <ScrollArea className="w-12 shrink-0 border-r border-border"><div className="flex min-h-full flex-col items-center gap-1 py-2">{TOOLS.map(({ id, label, icon: Icon }) => <Tooltip key={id}><TooltipTrigger asChild><Button variant={activePanel === id ? 'default' : 'ghost'} size="icon" onClick={() => { setActivePanel(id); setActiveKind(null); }} aria-label={label}>{id === 'luka' ? (activePanel === 'luka' ? <LukaIcon size={22} bare /> : <LukaIcon size={22} />) : <Icon />}</Button></TooltipTrigger><TooltipContent side="left">{label}</TooltipContent></Tooltip>)}</div></ScrollArea>
          {activePanel === 'luka' ? <div className="min-w-0 flex-1">{panelContent}</div> : <ScrollArea className="h-full flex-1"><div className="p-3">{panelContent}</div></ScrollArea>}
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
