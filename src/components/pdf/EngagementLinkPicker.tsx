import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
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
import { getEngagementLinkTree, leadSheetRows, leadSheetAmount, selectEngagementTarget, type PdfEngagementLink } from '@/lib/pdfEngagementLinks';
import { trialBalanceColumns, formatTrialBalanceAmount } from '@/lib/pdfTrialBalance';

export function EngagementLinkPicker({ engagementId, onSelect }: { engagementId: string; onSelect: (link: PdfEngagementLink) => void }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => getEngagementLinkTree(engagementId), [engagementId]);
  const query = search.trim().toLowerCase();
  const matches = (node: SectionNode): boolean => `${node.code ?? ''} ${node.label}`.toLowerCase().includes(query)
    || (node.children ?? []).some(matches)
    || (node.route?.startsWith('procedure/') && leadSheetRows(node.route.slice(10)).some((row, index) => `${node.code}.${index + 1} ${row.description}`.toLowerCase().includes(query))) === true;
  const render = (node: SectionNode): React.ReactNode => {
    if (query && !matches(node)) return null;
    const rows = node.route?.startsWith('procedure/') ? leadSheetRows(node.route.slice(10)) : [];
    const hasChildren = !!node.children?.length || !!rows.length;
    const open = query ? !searchCollapsed.has(node.id) : expanded.has(node.id);
    const folder = node.icon === 'folder' || !node.route;
    const Icon = node.icon === 'book' ? BookIcon : node.icon === 'letter' ? LetterIcon : node.icon === 'checklist' ? ChecklistIcon : node.icon === 'doc' ? WordDocIcon : node.icon === 'worksheet' ? WorksheetIcon : node.icon === 'completion' ? CompletionIcon : FolderSolidIcon;
    const toggle = () => {
      setExpanded((current) => { const next = new Set(current); open ? next.delete(node.id) : next.add(node.id); return next; });
      if (query) setSearchCollapsed((current) => { const next = new Set(current); open ? next.add(node.id) : next.delete(node.id); return next; });
    };
    return <div key={node.id}>
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2 px-1 text-xs font-normal" title={`${node.code ?? ''} ${node.label}`} aria-expanded={folder ? open : undefined} onClick={() => { if (folder) { toggle(); return; } const link = selectEngagementTarget(node); if (link) onSelect(link); }}>
          {folder ? open ? <FolderMinusIcon className="h-4 w-4 shrink-0 text-primary" /> : <FolderPlusIcon className="h-4 w-4 shrink-0 text-primary" /> : <Icon className="h-4 w-4 shrink-0 text-primary" />}<span className="shrink-0 font-semibold text-primary">{node.code}</span><span className="truncate">{node.label}</span>
        </Button>
        {!folder && hasChildren && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`${open ? 'Hide' : 'Show'} line items`} aria-expanded={open} onClick={toggle}>{open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</Button></TooltipTrigger><TooltipContent>{open ? 'Hide line items' : 'Show line items'}</TooltipContent></Tooltip>}
      </div>
      {hasChildren && open && <div className="ml-4 border-l border-border pl-1">
        {(node.children ?? []).map(render)}
        {!!rows.length && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="px-2 text-left font-semibold">Line item</th>{trialBalanceColumns.map((column) => <th key={column} className="whitespace-nowrap px-2 text-right font-semibold">{column}</th>)}</tr></thead><tbody>
          {rows.map((row, index) => <tr key={row.id} className="border-t border-border"><td className="w-full max-w-0 px-2"><span className="block truncate" title={row.description}>{node.code}.{index + 1} {row.description}</span></td>{trialBalanceColumns.map((column) => {
            const amount = leadSheetAmount(row, column);
            const empty = amount == null || !Number.isFinite(amount);
            return <td key={column}><Button variant="ghost" aria-label={`${node.code}.${index + 1} ${row.description} · ${column}: ${formatTrialBalanceAmount(amount)}`} disabled={empty} className={`pdf-tb-amount h-9 w-full justify-end rounded-none px-2 text-xs font-normal tabular-nums ${empty ? 'pdf-tb-empty' : ''}`} onClick={() => { const link = selectEngagementTarget(node, row, column); if (link) onSelect(link); }}>{formatTrialBalanceAmount(amount)}</Button></td>;
          })}</tr>)}
        </tbody></table></div>}
      </div>}
    </div>;
  };
  return <div className="flex min-h-0 min-w-0 flex-col gap-2"><Input className="shrink-0" autoFocus aria-label="Search engagement items" placeholder="Search name or reference number" value={search} onChange={(event) => { setSearch(event.target.value); setSearchCollapsed(new Set()); }} /><div className="min-h-0 overflow-auto">{tree.map(render)}{!tree.some(matches) && <p className="p-3 text-xs text-foreground">No results</p>}</div></div>;
}