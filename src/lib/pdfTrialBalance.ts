import type { TrialBalanceAccount } from '@/data/trialBalanceAccounts';

export const trialBalanceColumns = ['Original', 'PY1', 'PY2'] as const;
export type TrialBalanceColumn = typeof trialBalanceColumns[number];
export interface PdfTrialBalanceLink {
  accountNo: string;
  description: string;
  column: TrialBalanceColumn;
  amount: number;
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
  return { accountNo: account.accNo, description: account.description, column, amount };
}

export function trialBalanceLinkLabel(link: PdfTrialBalanceLink) {
  return `${link.accountNo} ${link.description}${link.column === 'Original' ? '' : ` · ${link.column}`}`;
}