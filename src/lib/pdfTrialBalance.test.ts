import { describe, expect, it } from 'vitest';
import { formatTrialBalanceAmount, selectTrialBalanceAmount, trialBalanceLinkLabel, trialBalanceAmount, defaultTrialBalanceColumn, trialBalanceLinkTooltip, documentReturnPath } from './pdfTrialBalance';

const account = { accNo: '1010', description: 'Cash & Bank', balance: 1240000, py1: 237307.23, py2: 975000 };

describe('Trial balance amount links', () => {
  it('preserves cents with two decimals and thousands separators for every column', () => {
    for (const column of ['Original', 'PY1', 'PY2'] as const) {
      expect(formatTrialBalanceAmount(trialBalanceAmount({ ...account, balance: 237307.23, py2: 237307.23 }, column))).toBe('237,307.23');
    }
    expect(formatTrialBalanceAmount(445.5)).toBe('445.50');
    expect(formatTrialBalanceAmount(-237307.23)).toBe('-237,307.23');
  });
  it('shows missing amounts as a dash and does not allow selecting them', () => {
    expect(formatTrialBalanceAmount(null)).toBe('–');
    expect(formatTrialBalanceAmount(undefined)).toBe('–');
    expect(selectTrialBalanceAmount({ ...account, py1: null }, 'PY1')).toBeNull();
    expect(selectTrialBalanceAmount({ ...account, py2: undefined }, 'PY2')).toBeNull();
    expect(selectTrialBalanceAmount({ ...account, py1: 0 }, 'PY1')?.column).toBe('PY1');
  });
  it('records account and column without storing an amount', () => {
    expect(selectTrialBalanceAmount(account, 'PY1')).toEqual({ accountNo: '1010', description: 'Cash & Bank', column: 'PY1' });
  });
  it('suffixes only prior-year links', () => {
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'PY1' })).toBe('1010 Cash & Bank · PY1');
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'PY2' })).toBe('1010 Cash & Bank · PY2');
    expect(trialBalanceLinkLabel({ accountNo: '1010', description: 'Cash & Bank', column: 'Original' })).toBe('1010 Cash & Bank');
  });
  it('defaults account selection to Original then the first non-empty column', () => {
    expect(defaultTrialBalanceColumn(account)).toBe('Original');
    expect(defaultTrialBalanceColumn({ ...account, balance: NaN, py1: null })).toBe('PY2');
    expect(defaultTrialBalanceColumn({ ...account, balance: NaN, py1: null, py2: null })).toBeNull();
  });
  it('reads current trial balance amounts for hover, not a snapshot', () => {
    const link = { accountNo: '1010', description: 'Cash & Bank', column: 'PY1' as const };
    expect(trialBalanceLinkTooltip(link, [{ ...account, py1: 1085000 }])).toBe('1010 Cash & Bank · PY1 · 1,085,000.00');
    expect(trialBalanceLinkTooltip(link, [{ ...account, py1: 237307.23 }])).toBe('1010 Cash & Bank · PY1 · 237,307.23');
  });
  it('returns to the same PDF page preserving protection and window flags', () => {
    expect(documentReturnPath('/engagements/example/pdf/doc/window', '?protected=1', 3)).toBe('/engagements/example/pdf/doc/window?protected=1&page=3');
  });
});