import { useMemo, useState } from 'react';
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
import { type SectionNode } from '@/lib/engagementLinkTree';
import {
  formatLeadSheetAmount,
  getEngagementLinkTree,
  leadSheetAmount,
  leadSheetDocuments,
  leadSheetRows,
  selectEngagementTarget,
  selectLeadSheetDocument,
  type PdfEngagementLink,
} from '@/lib/pdfEngagementLinks';
import { trialBalanceColumns } from '@/lib/pdfTrialBalance';

export type EngagementPickerMode = 'engagement' | 'lead-sheets';

const isLeadSheetNode = (node: SectionNode) => node.route?.startsWith('procedure/') === true;
const isDocumentNode = (node: SectionNode) => node.icon === 'doc' || node.route?.startsWith('pdf/') === true;

function filterEngagementNodes(nodes: SectionNode[]): SectionNode[] {
  return nodes.flatMap((node) => {
    if (isLeadSheetNode(node) || isDocumentNode(node)) return [];
    const folder = node.icon === 'folder' || !node.route;
    const children = node.children ? filterEngagementNodes(node.children) : undefined;
    if (folder && (!children || children.length === 0)) return [];
    return [{ ...node, ...(children ? { children } : {}) }];
  });
}

function collectLeadSheets(nodes: SectionNode[]): SectionNode[] {
  const result: SectionNode[] = [];
  const walk = (list: SectionNode[]) => {
    for (const node of list) {
      if (isLeadSheetNode(node)) result.push({ ...node, children: [] });
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

export function EngagementLinkPicker({ engagementId, onSelect, mode = 'engagement' }: { engagementId: string; onSelect: (link: PdfEngagementLink) => void; mode?: EngagementPickerMode }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => {
    const source = getEngagementLinkTree(engagementId);
    return mode === 'lead-sheets' ? collectLeadSheets(source) : filterEngagementNodes(source);
  }, [engagementId, mode]);
  const query = search.trim().toLowerCase();
  const matches = (node: SectionNode): boolean => {
    if (!query) return true;
    if (`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)) return true;
    if ((node.children ?? []).some(matches)) return true;
    if (node.route?.startsWith('procedure/')) {
      const rows = leadSheetRows(node.route.slice('procedure/'.length));
      if (rows.some((row) => row.description.toLowerCase().includes(query))) return true;
      if (leadSheetDocuments(engagementId, node).some((doc) => doc.name.toLowerCase().includes(query))) return true;
    }
    return false;
  };
  const render = (node: SectionNode): React.ReactNode => {
    if (query && !matches(node)) return null;
    const isLeadSheet = node.route?.startsWith('procedure/') === true;
    const rows = isLeadSheet && node.route ? leadSheetRows(node.route.slice('procedure/'.length)) : [];
    const docs = isLeadSheet ? leadSheetDocuments(engagementId, node) : [];
    const hasChildren = !!node.children?.length || !!rows.length || !!docs.length;
    const open = query ? !searchCollapsed.has(node.id) : expanded.has(node.id);
    const folder = node.icon === 'folder' || !node.route;
    const Icon = node.icon === 'book' ? BookIcon : node.icon === 'letter' ? LetterIcon : node.icon === 'checklist' ? ChecklistIcon : node.icon === 'doc' ? WordDocIcon : node.icon === 'worksheet' ? WorksheetIcon : node.icon === 'completion' ? CompletionIcon : FolderSolidIcon;
    const toggle = () => {
      setExpanded((current) => { const next = new Set(current); open ? next.delete(node.id) : next.add(node.id); return next; });
      if (query) setSearchCollapsed((current) => { const next = new Set(current); open ? next.add(node.id) : next.delete(node.id); return next; });
    };
    const visibleRows = query && !`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)
      ? rows.filter((row) => row.description.toLowerCase().includes(query))
      : rows;
    const visibleDocs = query && !`${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)
      ? docs.filter((doc) => doc.name.toLowerCase().includes(query))
      : docs;
    return <div key={node.id}>
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2 px-1 text-xs font-normal" title={`${node.code ?? ''} ${node.label}`} aria-expanded={folder ? open : undefined} onClick={() => { if (folder) { toggle(); return; } const link = selectEngagementTarget(node); if (link) onSelect(link); }}>
          {folder ? open ? <FolderMinusIcon className="h-4 w-4 shrink-0 text-primary" /> : <FolderPlusIcon className="h-4 w-4 shrink-0 text-primary" /> : <Icon className="h-4 w-4 shrink-0 text-primary" />}<span className="shrink-0 font-semibold text-primary">{node.code}</span><span className="truncate">{node.label}</span>
        </Button>
        {!folder && hasChildren && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`${open ? 'Hide' : 'Show'} line items`} aria-expanded={open} onClick={toggle}>{open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</Button></TooltipTrigger><TooltipContent>{open ? 'Hide line items' : 'Show line items'}</TooltipContent></Tooltip>}
      </div>
      {hasChildren && open && <div className="ml-4 border-l border-border pl-1">
        {(node.children ?? []).map(render)}
        {!!visibleRows.length && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-foreground"><th className="px-2 text-left font-semibold">Account description</th>{trialBalanceColumns.map((column) => <th key={column} className="whitespace-nowrap px-2 text-right font-semibold">{column}</th>)}</tr></thead><tbody>
          {visibleRows.map((row) => <tr key={row.id} className="cursor-pointer border-t border-border hover:bg-muted/60" onClick={() => { const link = selectEngagementTarget(node, row); if (link) onSelect(link); }}>
            <td className="w-full max-w-0 p-0">
              <Button type="button" variant="ghost" title={row.description} aria-label={`${node.code ?? ''} · ${row.description}`.trim()} className="h-8 w-full justify-start rounded-none px-2 text-xs font-normal text-foreground hover:bg-transparent" onClick={(event) => { event.stopPropagation(); const link = selectEngagementTarget(node, row); if (link) onSelect(link); }}>
                <span className="block truncate">{row.description}</span>
              </Button>
            </td>
            {trialBalanceColumns.map((column) => {
              const amount = leadSheetAmount(row, column);
              const empty = amount == null || !Number.isFinite(amount);
              const formatted = formatLeadSheetAmount(amount);
              return <td key={column} className="p-0 text-right" onClick={(event) => event.stopPropagation()}>
                <Button type="button" variant="ghost" aria-label={`${row.description} · ${column}: ${formatted}`} disabled={empty} className={`pdf-tb-amount h-8 w-full justify-end rounded-none px-2 text-xs font-normal tabular-nums ${empty ? 'pdf-tb-empty' : 'hover:bg-primary/15 hover:text-primary'}`} onClick={(event) => { event.stopPropagation(); const link = selectEngagementTarget(node, row, column); if (link) onSelect(link); }}>{formatted}</Button>
              </td>;
            })}
          </tr>)}
        </tbody></table></div>}
        {!!visibleDocs.length && <div className="mt-1.5 border-t border-border pt-1.5">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
          <div className="space-y-0.5">
            {visibleDocs.map((doc) => (
              <Button key={doc.id} type="button" variant="ghost" title={doc.name} className="h-8 w-full justify-start gap-2 px-2 text-xs font-normal text-foreground" onClick={() => onSelect(selectLeadSheetDocument(node, doc))}>
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{doc.name}</span>
              </Button>
            ))}
          </div>
        </div>}
      </div>}
    </div>;
  };
  const searchLabel = mode === 'lead-sheets' ? 'Search lead sheets' : 'Search engagement items';
  const placeholder = mode === 'lead-sheets' ? 'Search lead sheet, line item, or document' : 'Search letters or checklists';
  return <div className="flex min-h-0 min-w-0 flex-col gap-2"><Input className="shrink-0" autoFocus aria-label={searchLabel} placeholder={placeholder} value={search} onChange={(event) => { setSearch(event.target.value); setSearchCollapsed(new Set()); }} /><div className="min-h-0 overflow-auto">{tree.map(render)}{!tree.some(matches) && <p className="p-3 text-xs text-foreground">No results</p>}</div></div>;
}