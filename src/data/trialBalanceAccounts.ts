export interface TrialBalanceAccount {
  accNo: string;
  description: string;
  balance: number;
  py1?: number | null;
  py2?: number | null;
}

// Accounts available for linking from documents (mirrors the engagement trial balance).
export const trialBalanceAccounts: TrialBalanceAccount[] = [
  { accNo: '1010', description: "Cash & Bank", balance: 1240000, py1: 1085000, py2: 975000.0 },
  { accNo: '1100', description: "Accounts Receivable", balance: 2100000, py1: 1920000, py2: 1750000.0 },
  { accNo: '1105', description: "Allowance for Doubtful Accounts", balance: -42000, py1: -38000, py2: -32000.0 },
  { accNo: '1200', description: "Inventory", balance: 340000, py1: 298000, py2: 265000.0 },
  { accNo: '1300', description: "Prepaid Expenses", balance: 185000, py1: 162000, py2: 148000.0 },
  { accNo: '1510', description: "Right-of-Use Assets (ASC 842)", balance: 2800000, py1: 3080000, py2: 3360000.0 },
  { accNo: '1600', description: "Property Plant & Equipment", balance: 6420000, py1: 5940000, py2: 5500000.0 },
  { accNo: '1605', description: "Accumulated Depreciation", balance: -1600000, py1: -1120000, py2: -840000.0 },
  { accNo: '1700', description: "Goodwill", balance: 1420000, py1: 1420000, py2: 1420000.0 },
  { accNo: '1900', description: "Other Assets", balance: 237000, py1: 214000, py2: 198000.0 },
  { accNo: '1.5', description: "Asset - AIM", balance: 445.5, py1: 445.50, py2: 221.2 },
  { accNo: '2010', description: "Accounts Payable", balance: -1400000, py1: -1260000, py2: -1140000.0 },
  { accNo: '2100', description: "Accrued Liabilities", balance: -620000, py1: -574000, py2: -530000.0 },
  { accNo: '2200', description: "Deferred Revenue", balance: -284000, py1: -252000, py2: -220000.0 },
  { accNo: '2310', description: "Current Portion LT Debt", balance: -480000, py1: -480000, py2: -480000.0 },
  { accNo: '2320', description: "Lease Liability - Current", balance: -380000, py1: -360000, py2: -340000.0 },
  { accNo: '2500', description: "Long-term Debt", balance: -4320000, py1: -4800000, py2: -5280000.0 },
  { accNo: '2510', description: "Lease Liability - Non-Current", balance: -2370000, py1: -2640000, py2: -2910000.0 },
  { accNo: '2900', description: "Other Long-term Liabilities", balance: -116000, py1: -104000, py2: -95000.0 },
  { accNo: '3100', description: "Common Stock", balance: -500000, py1: -500000, py2: -500000.0 },
  { accNo: '3200', description: "Retained Earnings (opening)", balance: -2683000, py1: -1943000, py2: -1354000.0 },
  { accNo: '4000', description: "Service Revenue", balance: -18400000, py1: -16820000, py2: -15440000.0 },
  { accNo: '4900', description: "Other Income", balance: -47000, py1: -38000, py2: -31000.0 },
  { accNo: '5000', description: "Cost of Services", balance: 12144000, py1: 11116000, py2: 10208000.0 },
  { accNo: '6100', description: "Salaries & Benefits", balance: 2160000, py1: 2040000, py2: 1920000.0 },
  { accNo: '6200', description: "Fuel & Vehicle", balance: 980000, py1: 876000, py2: 798000.0 },
  { accNo: '6300', description: "Rent & Occupancy", balance: 440000, py1: 420000, py2: 400000.0 },
  { accNo: '6400', description: "Depreciation & Amortization", balance: 480000, py1: 440000, py2: 400000.0 },
  { accNo: '6500', description: "Interest Expense", balance: 384000, py1: 412000, py2: 440000.0 },
  { accNo: '6900', description: "Other Operating Expenses", balance: 856000, py1: 794000, py2: 728000.0 },
  { accNo: '7000', description: "Income Tax Expense", balance: 249000, py1: 213000, py2: 183000.0 },
];
