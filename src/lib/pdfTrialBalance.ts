import type { TrialBalanceAccount } from '@/data/trialBalanceAccounts';

export const trialBalanceColumns = ['Original', 'PY1', 'PY2'] as const;
export type TrialBalanceColumn = typeof trialBalanceColumns[number];
export interface PdfTrialBalanceLink {
  accountNo: string;
  description: string;
  column: TrialBalanceColumn;
}

export function trialBalanceAmount(account: TrialBalanceAccount, column: TrialBalanceColumn) {
  return column === 'Original' ? account.balance : column === 'PY1' ? account.py1 : account.py2;
}

export function formatTrialBalanceAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '–';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function selectTrialBalanceAmount(account: TrialBalanceAccount, column: TrialBalanceColumn): PdfTrialBalanceLink | null {
  const amount = trialBalanceAmount(account, column);
  if (amount == null || !Number.isFinite(amount)) return null;
  return { accountNo: account.accNo, description: account.description, column };
}

export function defaultTrialBalanceColumn(account: TrialBalanceAccount): TrialBalanceColumn | null {
  return trialBalanceColumns.find((column) => selectTrialBalanceAmount(account, column) !== null) ?? null;
}

export function resolveTrialBalanceLink(annotation: { trialBalanceLink?: PdfTrialBalanceLink; label?: string; value?: string }, accounts: TrialBalanceAccount[]): PdfTrialBalanceLink | null {
  if (annotation.trialBalanceLink) return annotation.trialBalanceLink;
  const label = annotation.label ?? annotation.value ?? '';
  const account = accounts.find((item) => label === `${item.accNo} ${item.description}` || label.startsWith(`${item.accNo} ${item.description} · `));
  if (!account) return null;
  const column = label.endsWith(' · PY1') ? 'PY1' : label.endsWith(' · PY2') ? 'PY2' : 'Original';
  return { accountNo: account.accNo, description: account.description, column };
}

export function trialBalanceLinkTooltip(link: PdfTrialBalanceLink, accounts: TrialBalanceAccount[]) {
  const account = accounts.find((item) => item.accNo === link.accountNo);
  return `${link.accountNo} ${account?.description ?? link.description} · ${link.column} · ${formatTrialBalanceAmount(account ? trialBalanceAmount(account, link.column) : null)}`;
}

export function documentReturnPath(pathname: string, search: string, page: number) {
  const params = new URLSearchParams(search);
  params.set('page', String(page));
  return `${pathname}?${params}`;
}

export function trialBalanceLinkLabel(link: PdfTrialBalanceLink) {
  return `${link.accountNo} ${link.description}${link.column === 'Original' ? '' : ` · ${link.column}`}`;
}