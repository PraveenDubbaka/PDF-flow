import { useSyncExternalStore } from 'react';
import { baseTrialBalanceData } from '@/data/trialBalanceRows';
import type { TrialBalanceAccount } from '@/data/trialBalanceAccounts';

const sources = new Map<string, TrialBalanceAccount[]>();
const listeners = new Set<() => void>();
const seedAccounts: TrialBalanceAccount[] = baseTrialBalanceData.map((row) => ({
  accNo: row.accNo, description: row.description, balance: row.original, py1: row.py1,
  py2: Number(row.py2.replace(/[,()]/g, '')) * (row.py2.startsWith('(') ? -1 : 1),
}));

export function getTrialBalanceAccounts(engagementId: string) {
  return sources.get(engagementId) ?? seedAccounts;
}

export function publishTrialBalanceAccounts(engagementId: string, accounts: TrialBalanceAccount[]) {
  sources.set(engagementId, accounts);
  listeners.forEach((listener) => listener());
}

export function useTrialBalanceAccounts(engagementId: string) {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => getTrialBalanceAccounts(engagementId));
}