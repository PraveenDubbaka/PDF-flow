import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EngagementLinkPicker } from '@/components/pdf/EngagementLinkPicker';
import type { TrialBalanceAccount } from '@/data/trialBalanceAccounts';
import {
  engagementLinkLabel,
  getEngagementDocuments,
  type PdfEngagementLink,
  type PdfLinkType,
} from '@/lib/pdfEngagementLinks';
import {
  defaultTrialBalanceColumn,
  formatTrialBalanceAmount,
  trialBalanceAmount,
  trialBalanceColumns,
  type TrialBalanceColumn,
} from '@/lib/pdfTrialBalance';
import { cn } from '@/lib/utils';

const SESSION_LINK_TYPE_KEY = 'pdf-editor-last-link-type';

const LINK_TYPE_OPTIONS: { value: PdfLinkType; label: string }[] = [
  { value: 'web', label: 'Web URL' },
  { value: 'document', label: 'Document' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'lead-sheet', label: 'Lead sheet' },
  { value: 'trial-balance', label: 'Trial balance' },
];

export function readSessionLinkType(): PdfLinkType {
  try {
    const saved = sessionStorage.getItem(SESSION_LINK_TYPE_KEY);
    if (LINK_TYPE_OPTIONS.some((option) => option.value === saved)) return saved as PdfLinkType;
  } catch { /* ignore */ }
  return 'web';
}

function writeSessionLinkType(type: PdfLinkType) {
  try { sessionStorage.setItem(SESSION_LINK_TYPE_KEY, type); } catch { /* ignore */ }
}

export function PdfAddLinkDialog({
  open,
  engagementId,
  trialBalanceAccounts,
  selectedTbCell,
  onClose,
  onSelectWebUrl,
  onSelectEngagementLink,
  onSelectTrialBalanceGeneral,
  onSelectTrialBalanceAccount,
}: {
  open: boolean;
  engagementId: string;
  trialBalanceAccounts: TrialBalanceAccount[];
  selectedTbCell: string | null;
  onClose: () => void;
  onSelectWebUrl: (url: string) => void;
  onSelectEngagementLink: (link: PdfEngagementLink, label: string) => void;
  onSelectTrialBalanceGeneral: () => void;
  onSelectTrialBalanceAccount: (account: TrialBalanceAccount, column: TrialBalanceColumn) => void;
}) {
  const [linkType, setLinkType] = useState<PdfLinkType>(() => readSessionLinkType());
  const [urlValue, setUrlValue] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [tbSearch, setTbSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLinkType(readSessionLinkType());
    setUrlValue('');
    setDocSearch('');
    setTbSearch('');
  }, [open]);

  const handleTypeChange = (next: PdfLinkType) => {
    setLinkType(next);
    writeSessionLinkType(next);
  };

  const documents = useMemo(() => (open ? getEngagementDocuments(engagementId) : []), [engagementId, open]);
  const filteredDocuments = useMemo(() => {
    const query = docSearch.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) => doc.name.toLowerCase().includes(query) || doc.section.toLowerCase().includes(query));
  }, [docSearch, documents]);

  const filteredAccounts = useMemo(() => {
    const query = tbSearch.trim().toLowerCase();
    if (!query) return trialBalanceAccounts;
    return trialBalanceAccounts.filter(
      (account) => account.accNo.toLowerCase().includes(query) || account.description.toLowerCase().includes(query),
    );
  }, [tbSearch, trialBalanceAccounts]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          'pdf-add-link-dialog pdf-tb-dialog flex h-[640px] max-h-[calc(100dvh-32px)] w-[840px] max-w-[calc(100vw-32px)] flex-col',
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Add link</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 space-y-1">
          <Label htmlFor="pdf-link-type-select" className="text-[13px] font-medium text-foreground">Link type</Label>
          <Select value={linkType} onValueChange={(value) => handleTypeChange(value as PdfLinkType)}>
            <SelectTrigger id="pdf-link-type-select" aria-label="Link type" className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="pdf-add-link-select">
              {LINK_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-[13px]">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {linkType === 'web' && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="shrink-0 space-y-1">
              <Label htmlFor="pdf-web-link-input" className="text-[13px] font-medium text-foreground">Web URL</Label>
              <Input
                id="pdf-web-link-input"
                autoFocus
                value={urlValue}
                placeholder="https://example.com"
                onChange={(event) => setUrlValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && urlValue.trim()) {
                    event.preventDefault();
                    onSelectWebUrl(urlValue.trim());
                  }
                }}
              />
            </div>
            <DialogFooter className="shrink-0 flex-row justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="button" disabled={!urlValue.trim()} onClick={() => onSelectWebUrl(urlValue.trim())}>Add link</Button>
            </DialogFooter>
          </div>
        )}

        {linkType === 'document' && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <Input
              className="shrink-0"
              autoFocus
              aria-label="Search documents"
              placeholder="Search documents"
              value={docSearch}
              onChange={(event) => setDocSearch(event.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-border">
              {filteredDocuments.length === 0 ? (
                <p className="p-3 text-[13px] text-foreground">No documents found</p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDocuments.map((doc) => (
                    <Button
                      key={doc.id}
                      type="button"
                      variant="ghost"
                      title={doc.name}
                      className="h-8 w-full justify-between gap-2 rounded-none px-2.5 text-[13px] font-normal text-foreground"
                      onClick={() => onSelectEngagementLink(doc.link, engagementLinkLabel(doc.link))}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{doc.name}</span>
                      </span>
                      <span className="shrink-0 truncate text-[12px] text-muted-foreground">{doc.section}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {linkType === 'engagement' && (
          <EngagementLinkPicker
            key="engagement"
            mode="engagement"
            engagementId={engagementId}
            onSelect={(link) => onSelectEngagementLink(link, engagementLinkLabel(link))}
          />
        )}

        {linkType === 'lead-sheet' && (
          <EngagementLinkPicker
            key="lead-sheets"
            mode="lead-sheets"
            engagementId={engagementId}
            onSelect={(link) => onSelectEngagementLink(link, engagementLinkLabel(link))}
          />
        )}

        {linkType === 'trial-balance' && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <Input
              className="shrink-0"
              autoFocus
              aria-label="Search trial balance accounts"
              value={tbSearch}
              placeholder="Search account no. or description"
              onChange={(event) => setTbSearch(event.target.value)}
            />
            <div className="min-h-0 flex-1 overflow-auto rounded-[8px] border border-border">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left text-foreground">
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Acc No.</th>
                    <th className="px-2 py-1.5 font-semibold">Description</th>
                    {trialBalanceColumns.map((column) => (
                      <th key={column} className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="p-0">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-full justify-start rounded-none px-2 text-xs font-normal"
                        onClick={onSelectTrialBalanceGeneral}
                      >
                        Trial Balance (general)
                      </Button>
                    </td>
                  </tr>
                  {filteredAccounts.map((account) => (
                    <tr key={account.accNo + account.description} className="border-t border-border">
                      <td className="p-0 text-foreground">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-full justify-start rounded-none px-2 text-xs font-normal text-foreground"
                          onClick={() => {
                            const column = defaultTrialBalanceColumn(account);
                            if (column) onSelectTrialBalanceAccount(account, column);
                          }}
                        >
                          {account.accNo}
                        </Button>
                      </td>
                      <td className="w-full p-0 text-foreground">
                        <Button
                          type="button"
                          variant="ghost"
                          title={account.description}
                          className="h-8 w-full justify-start rounded-none px-2 text-xs font-normal text-foreground"
                          onClick={() => {
                            const column = defaultTrialBalanceColumn(account);
                            if (column) onSelectTrialBalanceAccount(account, column);
                          }}
                        >
                          <span className="max-w-[200px] truncate">{account.description}</span>
                        </Button>
                      </td>
                      {trialBalanceColumns.map((column) => {
                        const amount = trialBalanceAmount(account, column);
                        const empty = amount == null || !Number.isFinite(amount);
                        const selected = selectedTbCell === `${account.accNo}:${column}`;
                        return (
                          <td key={column} className="p-0 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={empty}
                              aria-pressed={selected}
                              aria-label={`${account.accNo} ${account.description} · ${column}: ${formatTrialBalanceAmount(amount)}`}
                              className={cn(
                                'pdf-tb-amount h-8 w-full justify-end rounded-none px-2 text-xs font-normal tabular-nums text-foreground',
                                empty && 'pdf-tb-empty',
                                selected && 'bg-primary/15 text-primary ring-1 ring-inset ring-primary',
                              )}
                              onClick={() => onSelectTrialBalanceAccount(account, column)}
                            >
                              {formatTrialBalanceAmount(amount)}
                            </Button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={5} className="px-2 py-3 text-[13px] text-foreground">No accounts found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}