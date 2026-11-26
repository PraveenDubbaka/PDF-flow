import { useEffect, useMemo, useState } from 'react';
import { FileText, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BookIcon } from '@/components/icons/BookIcon';
import { ChecklistIcon } from '@/components/icons/ChecklistIcon';
import { LetterIcon } from '@/components/icons/LetterIcon';
import { WordDocIcon } from '@/components/icons/WordDocIcon';
import { WorksheetIcon } from '@/components/icons/WorksheetIcon';
import { CompletionIcon } from '@/components/icons/CompletionIcon';
import { FolderSolidIcon, FolderPlusIcon, FolderMinusIcon } from '@/components/icons/FolderIcons';
import { PdfIcon } from '@/components/icons/PdfIcon';
import { XlsxIcon } from '@/components/icons/XlsxIcon';
import { ProcedureLeadSheetTable } from '@/components/ProcedureLeadSheetTable';
import { type SectionNode } from '@/lib/engagementLinkTree';
import {
  filterProcedureHierarchy,
  getEngagementLinkTree,
  isEngagementFolderNode,
  leadSheetDocuments,
  leadSheetRows,
  selectEngagementTarget,
  selectLeadSheetDocument,
  type PdfEngagementLink,
} from '@/lib/pdfEngagementLinks';

export type EngagementPickerMode = 'engagement' | 'lead-sheets';

const isLeadSheetNode = (node: SectionNode) => node.route?.startsWith('procedure/') === true;

function renderFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <PdfIcon className="h-4 w-4 shrink-0" />;
  if (['xlsx', 'xls', 'csv', 'numbers'].includes(ext)) return <XlsxIcon className="h-4 w-4 shrink-0" />;
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return <WordDocIcon className="h-4 w-4 shrink-0" />;
  return <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />;
}

function renderNodeIcon(node: SectionNode, folder: boolean, hasChildren: boolean, open: boolean) {
  if (folder) {
    if (!hasChildren) return <FolderSolidIcon className="h-4 w-4 shrink-0 text-primary" />;
    return open
      ? <FolderMinusIcon className="h-4 w-4 shrink-0 text-primary" />
      : <FolderPlusIcon className="h-4 w-4 shrink-0 text-primary" />;
  }
  if (node.icon === 'book') return <BookIcon className="h-3.5 w-3.5 shrink-0" style={{ color: '#778599' }} />;
  if (node.icon === 'letter') return <LetterIcon className="h-4 w-4 shrink-0" />;
  if (node.icon === 'checklist') return <ChecklistIcon className="h-4 w-4 shrink-0" />;
  if (node.icon === 'completion') return <CompletionIcon className="h-4 w-4 shrink-0" />;
  if (node.icon === 'worksheet') return <WorksheetIcon className="h-4 w-4 shrink-0" />;
  if (node.icon === 'doc') return node.route?.startsWith('pdf/') ? renderFileIcon(node.label) : <WordDocIcon className="h-4 w-4 shrink-0" />;
  return <FolderSolidIcon className="h-4 w-4 shrink-0 text-primary" />;
}

export function EngagementLinkPicker({
  engagementId,
  onSelect,
  mode = 'engagement',
  onExpandedLeadSheetChange,
}: {
  engagementId: string;
  onSelect: (link: PdfEngagementLink) => void;
  mode?: EngagementPickerMode;
  onExpandedLeadSheetChange?: (hasOpen: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => {
    const source = getEngagementLinkTree(engagementId);
    return mode === 'lead-sheets' ? filterProcedureHierarchy(source) : source;
  }, [engagementId, mode]);
  const [expanded, setExpanded] = useState<Set<string>>(() => (
    mode === 'lead-sheets' ? new Set(tree.map((node) => node.id)) : new Set()
  ));
  const query = search.trim().toLowerCase();
  const matches = (node: SectionNode): boolean => {
    if (!query) return true;
    if (`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)) return true;
    if ((node.children ?? []).some(matches)) return true;
    if (node.route?.startsWith('procedure/')) {
      const rows = leadSheetRows(node.route.slice('procedure/'.length));
      if (rows.some((row) => `${row.accNo} ${row.description}`.toLowerCase().includes(query))) return true;
      if (leadSheetDocuments(engagementId, node).some((doc) => doc.name.toLowerCase().includes(query))) return true;
    }
    return false;
  };

  const hasOpenLeadSheet = useMemo(() => {
    const check = (nodes: SectionNode[]): boolean => nodes.some((node) => {
      if (query && !matches(node)) return false;
      const open = query ? !searchCollapsed.has(node.id) : expanded.has(node.id);
      if (isLeadSheetNode(node) && open) return true;
      return node.children?.length ? check(node.children) : false;
    });
    return check(tree);
  }, [expanded, query, searchCollapsed, tree]);

  useEffect(() => {
    onExpandedLeadSheetChange?.(hasOpenLeadSheet);
  }, [hasOpenLeadSheet, onExpandedLeadSheetChange]);

  const render = (node: SectionNode, path: string): React.ReactNode => {
    if (query && !matches(node)) return null;
    const isLeadSheet = node.route?.startsWith('procedure/') === true;
    const rows = isLeadSheet && node.route ? leadSheetRows(node.route.slice('procedure/'.length)) : [];
    const docs = isLeadSheet ? leadSheetDocuments(engagementId, node) : [];
    const docIds = isLeadSheet ? new Set(docs.map((doc) => doc.id)) : null;
    const childNodes = (node.children ?? []).filter((child) => !docIds?.has(child.id));
    const hasChildren = !!childNodes.length || !!rows.length || !!docs.length;
    const open = query ? !searchCollapsed.has(node.id) : expanded.has(node.id);
    const folder = isEngagementFolderNode(node);
    const toggle = () => {
      if (!hasChildren) return;
      setExpanded((current) => { const next = new Set(current); open ? next.delete(node.id) : next.add(node.id); return next; });
      if (query) setSearchCollapsed((current) => { const next = new Set(current); open ? next.add(node.id) : next.delete(node.id); return next; });
    };
    const visibleRows = query && !`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)
      ? rows.filter((row) => `${row.accNo} ${row.description}`.toLowerCase().includes(query))
      : rows;
    const visibleDocs = query && !`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)
      ? docs.filter((doc) => doc.name.toLowerCase().includes(query))
      : docs;
    return <div key={path}>
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2 px-1 text-xs font-normal" title={`${node.code ? `${node.code} ` : ''}${node.label}`} aria-expanded={folder && hasChildren ? open : undefined} onClick={() => { if (folder) { toggle(); return; } const link = selectEngagementTarget(node); if (link) onSelect(link); }}>
          {renderNodeIcon(node, folder, hasChildren, open)}
          {node.code && <span className="shrink-0 font-semibold text-primary">{node.code}</span>}
          <span className={`truncate ${folder ? 'font-semibold' : ''}`}>{node.label}</span>
        </Button>
        {!folder && hasChildren && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`${open ? 'Hide' : 'Show'} ${isLeadSheet ? 'line items' : 'items'}`} aria-expanded={open} onClick={toggle}>{open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</Button></TooltipTrigger><TooltipContent>{open ? (isLeadSheet ? 'Hide line items' : 'Hide items') : (isLeadSheet ? 'Show line items' : 'Show items')}</TooltipContent></Tooltip>}
      </div>
      {hasChildren && open && <div className="ml-4 border-l border-border pl-1.5">
        {childNodes.map((child, index) => render(child, `${path}/${child.id}-${index}`))}
        {!!visibleRows.length && <div className="my-1"><ProcedureLeadSheetTable mode="picker" rows={visibleRows} leadSheetCode={node.code} onSelectRow={(row) => { const link = selectEngagementTarget(node, row); if (link) onSelect(link); }} onSelectCell={(row, column) => { const link = selectEngagementTarget(node, row, column); if (link) onSelect(link); }} /></div>}
        {!!visibleDocs.length && <div className="mt-1.5 border-t border-border pt-1.5">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
          <div className="space-y-0.5">
            {visibleDocs.map((doc) => (
              <Button key={doc.id} type="button" variant="ghost" title={doc.name} className="h-8 w-full justify-start gap-2 px-2 text-xs font-normal text-foreground" onClick={() => onSelect(selectLeadSheetDocument(node, doc))}>
                {renderFileIcon(doc.name)}
                <span className="truncate">{doc.name}</span>
              </Button>
            ))}
          </div>
        </div>}
      </div>}
    </div>;
  };
  const searchLabel = mode === 'lead-sheets' ? 'Search lead sheets' : 'Search engagement';
  const placeholder = mode === 'lead-sheets' ? 'Search lead sheet, line item, or document' : 'Search engagement';
  return <div className="flex min-h-0 min-w-0 flex-col gap-2"><Input className="shrink-0" autoFocus aria-label={searchLabel} placeholder={placeholder} value={search} onChange={(event) => { setSearch(event.target.value); setSearchCollapsed(new Set()); }} /><div className="min-h-0 overflow-auto">{tree.map((node, index) => render(node, `${node.id}-${index}`))}{!tree.some(matches) && <p className="p-3 text-xs text-foreground">No results</p>}</div></div>;
}