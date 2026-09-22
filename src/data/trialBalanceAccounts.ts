export interface TrialBalanceAccount {
  accNo: string;
  description: string;
  balance: number;
}

// Accounts available for linking from documents (mirrors the engagement trial balance).
export const trialBalanceAccounts: TrialBalanceAccount[] = [
  { accNo: '1010', description: "Cash & Bank", balance: 1240000 },
  { accNo: '1100', description: "Accounts Receivable", balance: 2100000 },
  { accNo: '1105', description: "Allowance for Doubtful Accounts", balance: -42000 },
  { accNo: '1200', description: "Inventory", balance: 340000 },
  { accNo: '1300', description: "Prepaid Expenses", balance: 185000 },
  { accNo: '1510', description: "Right-of-Use Assets (ASC 842)", balance: 2800000 },
  { accNo: '1600', description: "Property Plant & Equipment", balance: 6420000 },
  { accNo: '1605', description: "Accumulated Depreciation", balance: -1600000 },
  { accNo: '1700', description: "Goodwill", balance: 1420000 },
  { accNo: '1900', description: "Other Assets", balance: 237000 },
  { accNo: '1.5', description: "Asset - AIM", balance: 445.5 },
  { accNo: '2010', description: "Accounts Payable", balance: -1400000 },
  { accNo: '2100', description: "Accrued Liabilities", balance: -620000 },
  { accNo: '2200', description: "Deferred Revenue", balance: -284000 },
  { accNo: '2310', description: "Current Portion LT Debt", balance: -480000 },
  { accNo: '2320', description: "Lease Liability - Current", balance: -380000 },
  { accNo: '2500', description: "Long-term Debt", balance: -4320000 },
  { accNo: '2510', description: "Lease Liability - Non-Current", balance: -2370000 },
  { accNo: '2900', description: "Other Long-term Liabilities", balance: -116000 },
  { accNo: '3100', description: "Common Stock", balance: -500000 },
  { accNo: '3200', description: "Retained Earnings (opening)", balance: -2683000 },
  { accNo: '4000', description: "Service Revenue", balance: -18400000 },
  { accNo: '4900', description: "Other Income", balance: -47000 },
  { accNo: '5000', description: "Cost of Services", balance: 12144000 },
  { accNo: '6100', description: "Salaries & Benefits", balance: 2160000 },
  { accNo: '6200', description: "Fuel & Vehicle", balance: 980000 },
  { accNo: '6300', description: "Rent & Occupancy", balance: 440000 },
  { accNo: '6400', description: "Depreciation & Amortization", balance: 480000 },
  { accNo: '6500', description: "Interest Expense", balance: 384000 },
  { accNo: '6900', description: "Other Operating Expenses", balance: 856000 },
  { accNo: '7000', description: "Income Tax Expense", balance: 249000 },
];
