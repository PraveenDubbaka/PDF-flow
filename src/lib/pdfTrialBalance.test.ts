import { describe, expect, it } from 'vitest';
import { formatTrialBalanceAmount, selectTrialBalanceAmount, trialBalanceLinkLabel } from './pdfTrialBalance';

const account = { accNo: '1010', description: 'Cash & Bank', balance: 1240000, py1: 237307.23, py2: 975000 };

describe('Trial balance amount links', () => {
  it('preserves cents with two decimals and thousands separators for every column', () => {
    for (const column of ['Original', 'PY1', 'PY2'] as const) {
      expect(formatTrialBalanceAmount(selectTrialBalanceAmount({ ...account, balance: 237307.23, py2: 237307.23 }, column)?.amount)).toBe('237,307.23');
    }
    expect(formatTrialBalanceAmount(445.5)).toBe('445.50');
    expect(formatTrialBalanceAmount(-237307.23)).toBe('-237,307.23');
  });
  it('shows missing amounts as a dash and does not allow selecting them', () => {
    expect(formatTrialBalanceAmount(null)).toBe('–');
    expect(formatTrialBalanceAmount(undefined)).toBe('–');
    expect(selectTrialBalanceAmount({ ...account, py1: null }, 'PY1')).toBeNull();
    expect(selectTrialBalanceAmount({ ...account, py2: undefined }, 'PY2')).toBeNull();
    expect(selectTrialBalanceAmount({ ...account, py1: 0 }, 'PY1')?.amount).toBe(0);
  });
  it('records the specific account, selected column and its amount', () => {
    expect(selectTrialBalanceAmount(account, 'PY1')).toEqual({ accountNo: '1010', description: 'Cash & Bank', column: 'PY1', amount: 237307.23 });
    expect(selectTrialBalanceAmount(account, 'PY2')?.amount).toBe(975000);
  });
  it('suffixes only prior-year links', () => {
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'PY1', amount: 1 })).toBe('1010 Cash & Bank · PY1');
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'PY2', amount: 1 })).toBe('1010 Cash & Bank · PY2');
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'Original', amount: 1 })).toBe('1010 Cash & Bank');
  });
});