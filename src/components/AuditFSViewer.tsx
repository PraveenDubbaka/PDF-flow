import React, { useState, useEffect, useCallback, useRef } from 'react';
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from '@/lib/safeJson';
import { WorksheetSignOff } from '@/components/WorksheetSignOff';

export type FSPageType = 'cover' | 'toc' | 'auditor-report' | 'bs' | 'is' | 'cf' | 'eq' | 'notes' | 'comp-report';

// ─── Data types ────────────────────────────────────────────────────────────

interface FSData {
 entityName: string;
 yearEnd: string;
 priorYearEnd: string;
 periodLabel: string;
 priorPeriodLabel: string;
 bs: Record<string, number>;
 is: Record<string, number>;
 cf: Record<string, number>;
 eq: Record<string, number>;
 notes: Record<string, string>;
}

// ─── Default CA data (Northline Precision Manufacturing Inc., Dec 31, 2025) ──

const CA_DEFAULT: FSData = {
 entityName: 'Northline Precision Manufacturing Inc.',
 yearEnd: 'December 31, 2025',
 priorYearEnd: 'December 31, 2024',
 periodLabel: 'Year ended December 31, 2025',
 priorPeriodLabel: 'Year ended December 31, 2024',
 bs: {
 // Assets — total CY: 9,617,340 | PY: 9,596,100
 cash: 425000,     cashPY: 188100,
 receivables: 1847340, receivablesPY: 1705000,
 inventory: 1245000,  inventoryPY: 1160000,
 prepaid: 118000,    prepaidPY: 106000,
 ppe: 5182000,     ppePY: 5482000,
 rou: 590000,      rouPY: 710000,
 intangibles: 210000,  intangiblesPY: 245000,
 // Liabilities — total CY: 4,862,100 | PY: 5,328,760
 ap: 980000,       apPY: 912000,
 currentLtd: 420000,  currentLtdPY: 420000,
 currentLease: 120000, currentLeasePY: 120000,
 taxPayable: 85000,   taxPayablePY: 67000,
 ltDebt: 2580000,    ltDebtPY: 3000000,
 ltLease: 470000,    ltLeasePY: 590000,
 deferredTax: 207100,  deferredTaxPY: 219760,
 // Equity
 shareCapital: 1000,  shareCapitalPY: 1000,
 retainedEarnings: 4754240, retainedEarningsPY: 4266340,
 },
 is: {
 // Revenue: $14.2M (matches TB); income before tax: $1,140,000
 revenue: 14200000, revenuePY: 12850000,
 cogs: 9240000,   cogsPY: 8375000,
 admin: 2940000,  adminPY: 2693000,
 da: 580000,    daPY: 560000,
 interest: 300000, interestPY: 272350,
 tax: 302100,   taxPY: 268000,
 reBeg: 4266340,  reBegPY: 3934690,
 dividends: 350000, dividendsPY: 350000,
 },
 cf: {
 // Net change CY: +236,900 → cash end 425,000 ✓
 netIncome: 837900,   netIncomePY: 681650,
 da: 580000,       daPY: 560000,
 rouAmort: 120000,   rouAmortPY: 120000,
 deferredTax: 25000,  deferredTaxPY: 37660,
 receivables: -142340, receivablesPY: -195000,
 inventory: -85000,  inventoryPY: -105000,
 prepaid: -12000,   prepaidPY: -14000,
 payables: 68000,   payablesPY: -38000,
 taxPayable: 18000,  taxPayablePY: 2690,
 capex: -280000,   capexPY: -245000,
 ltdRepay: -420000,  ltdRepayPY: -420000,
 leaseRepay: -122660, leaseRepayPY: -120000,
 dividendsPaid: -350000, dividendsPaidPY: -350000,
 cashBeg: 188100,   cashBegPY: 273100,
 },
 eq: {
 scBeg: 1000,    scBegPY: 1000,
 reBeg: 4266340,  reBegPY: 3934690,
 netIncome: 837900, netIncomePY: 681650,
 dividends: 350000, dividendsPY: 350000,
 scEnd: 1000,    scEndPY: 1000,
 reEnd: 4754240,  reEndPY: 4266340,
 },
 notes: {
 '1': 'Northline Precision Manufacturing Inc. (the "Company") is incorporated under the laws of Ontario, Canada. The Company designs and manufactures precision-engineered components for the industrial, automotive, and aerospace sectors, operating from its manufacturing plant in Mississauga, Ontario and a distribution warehouse in Barrie, Ontario. The Company employs 62 people.',
 '2': 'These financial statements have been prepared in accordance with Canadian generally accepted accounting principles as set out in Part II of the CPA Canada Handbook – Accounting (Accounting Standards for Private Enterprises — ASPE).\n\nRevenue Recognition: Revenue from the sale of manufactured goods is recognized when control of the goods transfers to the customer, which is upon delivery and customer acceptance.\n\nInventories: Inventories of raw materials, work-in-progress, and finished goods are valued at the lower of cost, determined on a first-in, first-out basis, and net realizable value.\n\nProperty, Plant and Equipment: Assets are recorded at cost less accumulated depreciation. Depreciation is calculated using the straight-line method over estimated useful lives of 3 to 20 years for manufacturing equipment, leasehold improvements over the lease term, and 3 to 5 years for computer equipment.\n\nLeases: Right-of-use assets and lease obligations are recognized for multi-year operating leases at commencement using the incremental borrowing rate. Short-term leases of twelve months or less are expensed as incurred.',
 '3': 'The Company is subject to combined federal and Ontario corporate income taxes. The effective tax rate for the year was approximately 26.5% (2024 — 28.2%). Deferred income taxes arising from temporary differences are not material and have been recognized using the taxes payable method.',
 '4': 'Trade and other receivables consist of amounts owing from customers net of an allowance for doubtful accounts of $38,500 (2024 — $31,200). The allowance is estimated based on management\'s review of aged balances, customer credit profiles, and historical collection experience. Substantially all receivables are due within 60 days.',
 '5': 'Property, plant and equipment consist of CNC machining equipment and tooling (10–15 years), plant and leasehold improvements (10 years), warehouse racking and material handling equipment (7–10 years), vehicles (5 years), and computer equipment and software (3–5 years).',
 '6': 'Long-term debt consists of a term loan (facility RBC-2022-4451) in the original principal amount of $3,750,000, bearing interest at 5.25% per annum fixed, repayable in quarterly principal instalments of $105,000 plus interest, with a final payment due July 2029, secured by a general security agreement over all present and future assets of the Company.\n\nThe loan agreement requires the Company to maintain a minimum debt service coverage ratio of 1.25× and a minimum cash and cash equivalents balance of $500,000. As at December 31, 2025, the Company\'s cash balance of $425,000 did not meet the minimum cash covenant. Subsequent to year-end, the Company obtained a waiver from the lender for this covenant breach.',
 '7': 'The Company has a $875,000 revolving operating line of credit (facility TD-LOC-8832) bearing interest at prime plus 0.75% per annum (7.45% as at December 31, 2025), secured by a first-priority charge over trade receivables and inventories. As at December 31, 2025, no amount was drawn on the line (2024 — $nil).',
 },
};

// ─── Default US data (Harbor Freight Logistics LLC, Dec 31, 2024) ─────────

const US_DEFAULT: FSData = {
 entityName: 'Harbor Freight Logistics LLC',
 yearEnd: 'December 31, 2024',
 priorYearEnd: 'December 31, 2023',
 periodLabel: 'Year ended December 31, 2024',
 priorPeriodLabel: 'Year ended December 31, 2023',
 bs: {
 cash: 1456789, cashPY: 1123456,
 receivables: 2890234, receivablesPY: 2456789,
 inventory: 567890, inventoryPY: 534567,
 prepaid: 145678, prepaidPY: 123456,
 ppe: 9234567, ppePY: 10123456,
 rou: 2345678, rouPY: 2890234,
 intangibles: 234567, intangiblesPY: 312345,
 ap: 1789012, apPY: 1567890,
 currentLtd: 456789, currentLtdPY: 423456,
 currentLease: 345678, currentLeasePY: 378901,
 taxPayable: 189234, taxPayablePY: 156789,
 ltDebt: 4567890, ltDebtPY: 5023456,
 ltLease: 2012345, ltLeasePY: 2356789,
 deferredTax: 456789, deferredTaxPY: 412345,
 shareCapital: 1000000, shareCapitalPY: 1000000,
 retainedEarnings: 6057666, retainedEarningsPY: 6244677,
 },
 is: {
 revenue: 24567890, revenuePY: 21890123,
 cogs: 16234567, cogsPY: 14567890,
 admin: 2890456, adminPY: 2634567,
 da: 1456789, daPY: 1312345,
 interest: 567890, interestPY: 612345,
 tax: 876543, taxPY: 712345,
 reBeg: 6244677, reBegPY: 6244046,
 dividends: 2728656, dividendsPY: 2050000,
 },
 cf: {
 netIncome: 2541645, netIncomePY: 2050631,
 da: 1456789, daPY: 1312345,
 rouAmort: 345678, rouAmortPY: 378901,
 deferredTax: 44444, deferredTaxPY: 38901,
 receivables: -433445, receivablesPY: -234567,
 inventory: -33323, inventoryPY: -34567,
 prepaid: -22222, prepaidPY: -12345,
 payables: 221122, payablesPY: 167890,
 taxPayable: 32445, taxPayablePY: -23456,
 capex: -678900, capexPY: -534567,
 ltdRepay: -455566, ltdRepayPY: -423456,
 leaseRepay: -356678, leaseRepayPY: -389234,
 dividendsPaid: -2328656,dividendsPaidPY: -1962032,
 cashBeg: 1123456, cashBegPY: 789012,
 },
 eq: {
 scBeg: 1000000, scBegPY: 1000000,
 reBeg: 6244677, reBegPY: 6244046,
 netIncome: 2541645, netIncomePY: 2050631,
 dividends: 2728656, dividendsPY: 2050000,
 scEnd: 1000000, scEndPY: 1000000,
 reEnd: 6057666, reEndPY: 6244677,
 },
 notes: {
 '1': 'Harbor Freight Logistics LLC (the "Company") is organized under the laws of Delaware, United States. The Company provides freight brokerage, transportation management, and third-party logistics services throughout North America.',
 '2': 'These financial statements have been prepared in accordance with accounting principles generally accepted in the United States of America (U.S. GAAP).\n\nRevenue Recognition: Revenue is recognized in accordance with ASC 606 when control of promised services transfers to the customer.\n\nProperty and Equipment: Stated at cost less accumulated depreciation using the straight-line method over 3 to 20 years.\n\nLeases: Accounted for under ASC 842 with operating lease right-of-use assets and liabilities at commencement.',
 '3': 'The Company accounts for income taxes under the asset and liability method per ASC 740. Deferred tax assets and liabilities are recognized for temporary differences.',
 '4': 'Trade receivables are recorded at invoice amount net of an allowance for doubtful accounts based on objective evidence of collectability.',
 '5': 'Property and equipment consist of trucks and trailers (5–10 years), warehouse equipment (7–15 years), and technology infrastructure (3–5 years).',
 '6': 'Long-term debt consists of a revolving credit facility at SOFR plus 1.50% and a term loan at SOFR plus 1.75%, both secured by substantially all assets of the Company.',
 '7': "Member distributions declared during the year ended December 31, 2024 totaled $2,728,656 (2023 – $2,050,000), per the Company's operating agreement.",
 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
 if (n === 0) return '—';
 const abs = Math.abs(n);
 const s = abs.toLocaleString('en-CA');
 return n < 0 ? `(${s})` : s;
}

function computedBS(d: FSData['bs']) {
 const totCurrentAssets = d.cash + d.receivables + d.inventory + d.prepaid;
 const totCurrentAssetsPY = d.cashPY + d.receivablesPY + d.inventoryPY + d.prepaidPY;
 const totNonCurrentAssets = d.ppe + d.rou + d.intangibles;
 const totNonCurrentAssetsPY = d.ppePY + d.rouPY + d.intangiblesPY;
 const totalAssets = totCurrentAssets + totNonCurrentAssets;
 const totalAssetsPY = totCurrentAssetsPY + totNonCurrentAssetsPY;
 const totCurrentLiab = d.ap + d.currentLtd + d.currentLease + d.taxPayable;
 const totCurrentLiabPY = d.apPY + d.currentLtdPY + d.currentLeasePY + d.taxPayablePY;
 const totNonCurrentLiab = d.ltDebt + d.ltLease + d.deferredTax;
 const totNonCurrentLiabPY = d.ltDebtPY + d.ltLeasePY + d.deferredTaxPY;
 const totalLiab = totCurrentLiab + totNonCurrentLiab;
 const totalLiabPY = totCurrentLiabPY + totNonCurrentLiabPY;
 const totalEquity = d.shareCapital + d.retainedEarnings;
 const totalEquityPY = d.shareCapitalPY + d.retainedEarningsPY;
 return { totCurrentAssets, totCurrentAssetsPY, totNonCurrentAssets, totNonCurrentAssetsPY, totalAssets, totalAssetsPY, totCurrentLiab, totCurrentLiabPY, totNonCurrentLiab, totNonCurrentLiabPY, totalLiab, totalLiabPY, totalEquity, totalEquityPY };
}

function computedIS(d: FSData['is']) {
 const grossProfit = d.revenue - d.cogs;
 const grossProfitPY = d.revenuePY - d.cogsPY;
 const totalExpenses = d.admin + d.da + d.interest;
 const totalExpensesPY = d.adminPY + d.daPY + d.interestPY;
 const incomeBeforeTax = grossProfit - totalExpenses;
 const incomeBeforeTaxPY = grossProfitPY - totalExpensesPY;
 const netIncome = incomeBeforeTax - d.tax;
 const netIncomePY = incomeBeforeTaxPY - d.taxPY;
 const reEnd = d.reBeg + netIncome - d.dividends;
 const reEndPY = d.reBegPY + netIncomePY - d.dividendsPY;
 return { grossProfit, grossProfitPY, totalExpenses, totalExpensesPY, incomeBeforeTax, incomeBeforeTaxPY, netIncome, netIncomePY, reEnd, reEndPY };
}

function computedCF(d: FSData['cf']) {
 const operating = d.netIncome + d.da + d.rouAmort + d.deferredTax + d.receivables + d.inventory + d.prepaid + d.payables + d.taxPayable;
 const operatingPY = d.netIncomePY + d.daPY + d.rouAmortPY + d.deferredTaxPY + d.receivablesPY + d.inventoryPY + d.prepaidPY + d.payablesPY + d.taxPayablePY;
 const investing = d.capex;
 const investingPY = d.capexPY;
 const financing = d.ltdRepay + d.leaseRepay + d.dividendsPaid;
 const financingPY = d.ltdRepayPY + d.leaseRepayPY + d.dividendsPaidPY;
 const netChange = operating + investing + financing;
 const netChangePY = operatingPY + investingPY + financingPY;
 const cashEnd = d.cashBeg + netChange;
 const cashEndPY = d.cashBegPY + netChangePY;
 return { operating, operatingPY, investing, investingPY, financing, financingPY, netChange, netChangePY, cashEnd, cashEndPY };
}

// ─── Design tokens (match countablexlukaconcept FinancialStatementPreview) ──────

const FONT = "'DM Sans', system-ui, sans-serif";
const HEAD_NAVY = 'hsl(215 75% 22%)';
const SUBTLE = 'hsl(222 15% 55%)';
const BODY_COL = 'hsl(222 35% 16%)';

// Legacy tokens — kept for table rows (dark-mode aware)
const FG = 'hsl(var(--foreground))';
const MFG = 'hsl(var(--muted-foreground))';
const BDR = 'hsl(var(--border))';

// ─── Brand chrome (matches source repo exactly) ───────────────────────────────

const BrandHeader = () => (
 <div
 className="rounded-md mx-auto"
 style={{
 width: '92%',
 padding: '26px 24px',
 background: 'linear-gradient(180deg, hsl(220 18% 96%) 0%, hsl(220 18% 92%) 100%)',
 border: '1px solid hsl(220 20% 88%)',
 textAlign: 'center',
 }}
 >
 <div style={{ fontFamily: FONT, fontSize: '22px', fontWeight: 800, color: HEAD_NAVY, letterSpacing: '0.02em' }}>
 COUNTABLE PROFESSIONAL CORPORATION
 </div>
 <div style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: BODY_COL, marginTop: '4px', letterSpacing: '0.08em' }}>
 PROFESSIONAL CORPORATION
 </div>
 <div style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 600, color: SUBTLE, marginTop: '2px', letterSpacing: '0.1em' }}>
 CHARTERED PROFESSIONAL ACCOUNTANT
 </div>
 </div>
);

const BrandFooter = () => (
 <div
 className="rounded-md mx-auto"
 style={{
 width: '92%',
 padding: '18px 24px',
 background: 'linear-gradient(180deg, hsl(220 18% 95%) 0%, hsl(220 18% 90%) 100%)',
 border: '1px solid hsl(220 20% 88%)',
 textAlign: 'center',
 }}
 >
 <div style={{ fontFamily: FONT, fontSize: '16px', fontWeight: 800, color: HEAD_NAVY, letterSpacing: '0.02em' }}>
 COUNTABLE PROFESSIONAL CORPORATION
 </div>
 <div style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 600, color: SUBTLE, marginTop: '4px', letterSpacing: '0.12em' }}>
 PROFESSIONAL CORPORATION · CHARTERED PROFESSIONAL ACCOUNTANT
 </div>
 </div>
);

// Thin rule used throughout — adapts to dark/light mode
const RULE = `1px solid ${FG}`;

const S = {
 // Column widths: label 55% | notes 6% | CY 19.5% | PY 19.5%
 colLabel: { width: '55%' } as React.CSSProperties,
 colNotes: { width: '6%', textAlign: 'right' as const, paddingRight: '6px' } as React.CSSProperties,
 colNum: { width: '19.5%' } as React.CSSProperties,

 // Text styles
 sectionHead: { paddingTop: '14px', paddingBottom: '3px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: FG } as React.CSSProperties,
 groupLabel: { fontSize: '12px', paddingTop: '6px', paddingBottom: '1px', fontStyle: 'italic' as const, color: MFG } as React.CSSProperties,
 rowLabel: { fontSize: '12.5px', paddingTop: '2px', paddingBottom: '2px', color: FG } as React.CSSProperties,
 noteRef: { fontSize: '11px', color: MFG, textAlign: 'right' as const, paddingRight: '6px', verticalAlign: 'middle' as const } as React.CSSProperties,
 // Subtotal label: single rule above + below matching the number cells
 subtotalLabel: { fontWeight: 600, fontSize: '12.5px', paddingTop: '4px', paddingBottom: '4px', color: FG, borderTop: RULE, borderBottom: RULE } as React.CSSProperties,
 // Grand total label: same rules, bold uppercase
 totalLabel: { fontWeight: 700, fontSize: '12.5px', paddingTop: '5px', paddingBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.03em', color: FG, borderTop: RULE, borderBottom: RULE } as React.CSSProperties,

 // Number cells — no border on plain rows
 numCell: { fontFamily: "'Courier New', monospace", fontSize: '12.5px', textAlign: 'right' as const, paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px', verticalAlign: 'middle' as const } as React.CSSProperties,
 // Subtotal number cells: single rule above + below
 subtotalNum:{ fontFamily: "'Courier New', monospace", fontSize: '12.5px', textAlign: 'right' as const, paddingRight: '8px', fontWeight: 600, borderTop: RULE, borderBottom: RULE, paddingTop: '4px', paddingBottom: '4px' } as React.CSSProperties,
 // Grand total number cells: single rule above, double rule below (box-shadow creates the second line cleanly)
 grandTotalNum: { fontFamily: "'Courier New', monospace", fontSize: '12.5px', textAlign: 'right' as const, paddingRight: '8px', fontWeight: 700, borderTop: RULE, borderBottom: RULE, boxShadow: `0 3px 0 0 ${FG}`, paddingTop: '5px', paddingBottom: '8px' } as React.CSSProperties,

 // Column header separator
 colHeaderDiv: { borderBottom: RULE } as React.CSSProperties,
};

// ─── Shared sub-components ───────────────────────────────────────────────────

interface NumCellProps {
 value: number;
 fieldKey: string;
 section: 'bs' | 'is' | 'cf' | 'eq';
 isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
 style?: React.CSSProperties;
}

function NumCell({ value, fieldKey, section, isEditing, onUpdate, style }: NumCellProps) {
 const [raw, setRaw] = useState('');
 useEffect(() => { if (isEditing) setRaw(value < 0 ? `-${Math.abs(value)}` : String(value)); }, [isEditing, value]);

 if (isEditing) {
 return (
 <td style={{...S.numCell,...style, padding: '1px 4px' }}>
 <input
 type="text" value={raw}
 onChange={e => setRaw(e.target.value)}
 onBlur={() => { const p = parseFloat(raw.replace(/,/g, '')) || 0; onUpdate(section, fieldKey, p); }}
 className="w-full text-right bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700 rounded px-1 py-0 focus:outline-none focus:border-blue-400"
 style={{ fontFamily: "'Courier New', monospace", fontSize: '12px' }}
 />
 </td>
 );
 }
 return <td style={{...S.numCell,...style }}>{fmtN(value)}</td>;
}

// ─── Statement header block ───────────────────────────────────────────────────

function StmtHeader({ entityName, title, subTitle }: { entityName: string; title: string; subTitle: string }) {
 return (
 <div style={{ marginBottom: '24px', textAlign: 'center' }}>
 <div style={{ fontSize: '18px', fontWeight: 800, color: HEAD_NAVY, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: FONT }}>{entityName}</div>
 <div style={{ fontSize: '12px', color: SUBTLE, marginTop: '4px', fontFamily: FONT }}>{title}</div>
 <div style={{ fontSize: '12px', color: SUBTLE, marginTop: '2px', fontFamily: FONT }}>{subTitle}</div>
 </div>
 );
}

// ─── Column header row ────────────────────────────────────────────────────────

function ColHeaders({ yearEnd, priorYearEnd }: { yearEnd: string; priorYearEnd: string }) {
 return (
 <thead>
 <tr style={S.colHeaderDiv}>
 <th style={{...S.colLabel, textAlign: 'left', fontWeight: 'normal', paddingBottom: '8px' }} />
 <th style={{...S.colNotes, fontWeight: 700, fontSize: '11px', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: MFG }}>Notes</th>
 <th style={{...S.colNum, textAlign: 'right', fontWeight: 700, fontSize: '12px', paddingBottom: '8px', paddingRight: '8px', whiteSpace: 'nowrap', color: FG }}>{yearEnd}</th>
 <th style={{...S.colNum, textAlign: 'right', fontWeight: 700, fontSize: '12px', paddingBottom: '8px', paddingRight: '8px', whiteSpace: 'nowrap', color: FG }}>{priorYearEnd}</th>
 </tr>
 </thead>
 );
}

// ─── Shared row helpers ───────────────────────────────────────────────────────

function SectionHeadRow({ label }: { label: string }) {
 return <tr><td colSpan={4} style={S.sectionHead}>{label}</td></tr>;
}
function GroupLabelRow({ label }: { label: string }) {
 return <tr><td colSpan={4} style={{...S.groupLabel, paddingLeft: '8px' }}>{label}</td></tr>;
}
function SpacerRow() {
 return <tr><td colSpan={4} style={{ paddingTop: '6px' }} /></tr>;
}

interface DataRowProps {
 label: string;
 cy: number; cyKey: string;
 py: number; pyKey: string;
 section: 'bs' | 'is' | 'cf' | 'eq';
 indent?: number;
 note?: string;
 isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
}
function DataRow({ label, cy, cyKey, py, pyKey, section, indent = 0, note, isEditing, onUpdate }: DataRowProps) {
 return (
 <tr>
 <td style={{...S.rowLabel, paddingLeft: `${12 + indent * 14}px` }}>{label}</td>
 <td style={S.noteRef}>{note ?? ''}</td>
 <NumCell value={cy} fieldKey={cyKey} section={section} isEditing={isEditing} onUpdate={onUpdate} />
 <NumCell value={py} fieldKey={pyKey} section={section} isEditing={isEditing} onUpdate={onUpdate} />
 </tr>
 );
}

interface SubtotalRowProps {
 label: string; cy: number; py: number; indent?: number;
}
function SubtotalRow({ label, cy, py, indent = 0 }: SubtotalRowProps) {
 return (
 <tr>
 <td style={{...S.subtotalLabel, paddingLeft: `${12 + indent * 14}px` }}>{label}</td>
 <td style={{ borderTop: RULE, borderBottom: RULE }} />
 <td style={S.subtotalNum}>{fmtN(cy)}</td>
 <td style={S.subtotalNum}>{fmtN(py)}</td>
 </tr>
 );
}

interface TotalRowProps {
 label: string; cy: number; py: number;
}
function TotalRow({ label, cy, py }: TotalRowProps) {
 return (
 <tr>
 <td style={{...S.totalLabel, paddingLeft: '12px' }}>{label}</td>
 <td style={{ borderTop: RULE, borderBottom: RULE, boxShadow: `0 3px 0 0 ${FG}` }} />
 <td style={S.grandTotalNum}>{fmtN(cy)}</td>
 <td style={S.grandTotalNum}>{fmtN(py)}</td>
 </tr>
 );
}

function FooterNote() {
 return (
 <p style={{ fontSize: '11px', color: MFG, marginTop: '28px', fontStyle: 'italic' }}>
 See accompanying notes to the financial statements
 </p>
 );
}

function SignatureBlock({ yearEnd }: { yearEnd: string }) {
 return (
 <div style={{ marginTop: '32px', display: 'flex', gap: '64px' }}>
 {['Director', 'Director'].map((role, i) => (
 <div key={i}>
 <div style={{ borderTop: `1px solid ${BDR}`, width: '180px', marginBottom: '4px' }} />
 <p style={{ fontSize: '11px', color: MFG }}>{role}</p>
 </div>
 ))}
 </div>
 );
}

// ─── Page: Cover ──────────────────────────────────────────────────────────────

// ─── Page: Table of Contents ──────────────────────────────────────────────────

function TocPage({ data }: { data: FSData }) {
 const items = [
 { label: "Independent Auditor's Report", page: '1 – 2' },
 { label: 'Balance Sheet', page: '3' },
 { label: 'Statement of Income (Loss) and Retained Earnings (Deficit)', page: '4' },
 { label: 'Statement of Cash Flows', page: '5' },
 { label: 'Statement of Changes in Equity', page: '6' },
 { label: 'Notes to Financial Statements', page: '7 – 20' },
 ];
 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Table of Contents" subTitle={data.yearEnd} />
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${BDR}` }}>
 <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '6px', color: MFG }}>Financial Statement</th>
 <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '6px', color: MFG }}>Page</th>
 </tr>
 </thead>
 <tbody>
 {items.map((item, i) => (
 <tr key={i} style={{ borderBottom: `1px solid ${BDR}` }}>
 <td style={{ fontSize: '12.5px', padding: '9px 0' }}>{item.label}</td>
 <td style={{ fontSize: '12.5px', padding: '9px 0', textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{item.page}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

// ─── Page: Balance Sheet ──────────────────────────────────────────────────────

function BSPage({ data, isEditing, onUpdate }: {
 data: FSData; isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
}) {
 const c = computedBS(data.bs);
 const bs = data.bs;
 const dr = (label: string, cy: number, cyKey: string, py: number, pyKey: string, indent = 0, note?: string) => (
 <DataRow key={cyKey} label={label} cy={cy} cyKey={cyKey} py={py} pyKey={pyKey} section="bs" indent={indent} note={note} isEditing={isEditing} onUpdate={onUpdate} />
 );

 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Balance Sheet" subTitle={`As at ${data.yearEnd}`} />
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <ColHeaders yearEnd={data.yearEnd} priorYearEnd={data.priorYearEnd} />
 <tbody>
 <SectionHeadRow label="Assets" />
 <GroupLabelRow label="Current assets" />
 {dr('Cash and cash equivalents', bs.cash, 'cash', bs.cashPY, 'cashPY', 1)}
 {dr('Trade and other receivables', bs.receivables, 'receivables', bs.receivablesPY, 'receivablesPY', 1, '4')}
 {dr('Inventories', bs.inventory, 'inventory', bs.inventoryPY, 'inventoryPY', 1)}
 {dr('Prepaid expenses and deposits', bs.prepaid, 'prepaid', bs.prepaidPY, 'prepaidPY', 1)}
 <SubtotalRow label="Total current assets" cy={c.totCurrentAssets} py={c.totCurrentAssetsPY} indent={1} />
 <SpacerRow />
 <GroupLabelRow label="Non-current assets" />
 {dr('Property, plant and equipment', bs.ppe, 'ppe', bs.ppePY, 'ppePY', 1, '5')}
 {dr('Right-of-use assets', bs.rou, 'rou', bs.rouPY, 'rouPY', 1)}
 {dr('Intangible assets', bs.intangibles, 'intangibles', bs.intangiblesPY, 'intangiblesPY', 1)}
 <SubtotalRow label="Total non-current assets" cy={c.totNonCurrentAssets} py={c.totNonCurrentAssetsPY} indent={1} />
 <SpacerRow />
 <TotalRow label="Total Assets" cy={c.totalAssets} py={c.totalAssetsPY} />

 <SectionHeadRow label="Liabilities" />
 <GroupLabelRow label="Current liabilities" />
 {dr('Accounts payable and accrued liabilities', bs.ap, 'ap', bs.apPY, 'apPY', 1)}
 {dr('Current portion of long-term debt', bs.currentLtd, 'currentLtd', bs.currentLtdPY, 'currentLtdPY', 1, '6')}
 {dr('Current portion of lease liabilities', bs.currentLease, 'currentLease', bs.currentLeasePY, 'currentLeasePY', 1)}
 {dr('Income taxes payable', bs.taxPayable, 'taxPayable', bs.taxPayablePY, 'taxPayablePY', 1)}
 <SubtotalRow label="Total current liabilities" cy={c.totCurrentLiab} py={c.totCurrentLiabPY} indent={1} />
 <SpacerRow />
 <GroupLabelRow label="Non-current liabilities" />
 {dr('Long-term debt', bs.ltDebt, 'ltDebt', bs.ltDebtPY, 'ltDebtPY', 1, '6')}
 {dr('Lease liabilities', bs.ltLease, 'ltLease', bs.ltLeasePY, 'ltLeasePY', 1)}
 {dr('Deferred income taxes', bs.deferredTax, 'deferredTax', bs.deferredTaxPY, 'deferredTaxPY', 1)}
 <SubtotalRow label="Total non-current liabilities" cy={c.totNonCurrentLiab} py={c.totNonCurrentLiabPY} indent={1} />
 <SpacerRow />
 <TotalRow label="Total Liabilities" cy={c.totalLiab} py={c.totalLiabPY} />

 <SectionHeadRow label="Shareholders' Equity" />
 {dr('Share capital', bs.shareCapital, 'shareCapital', bs.shareCapitalPY, 'shareCapitalPY', 1)}
 {dr('Retained earnings', bs.retainedEarnings, 'retainedEarnings', bs.retainedEarningsPY, 'retainedEarningsPY', 1)}
 <SubtotalRow label="Total shareholders' equity" cy={c.totalEquity} py={c.totalEquityPY} indent={1} />
 <SpacerRow />
 <TotalRow label="Total Liabilities and Shareholders' Equity" cy={c.totalAssets} py={c.totalAssetsPY} />
 </tbody>
 </table>
 <FooterNote />
 <SignatureBlock yearEnd={data.yearEnd} />
 </div>
 );
}

// ─── Page: Income Statement ────────────────────────────────────────────────────

function ISPage({ data, isEditing, onUpdate }: {
 data: FSData; isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
}) {
 const c = computedIS(data.is);
 const is = data.is;
 const dr = (label: string, cy: number, cyKey: string, py: number, pyKey: string, indent = 0, note?: string) => (
 <DataRow key={cyKey} label={label} cy={cy} cyKey={cyKey} py={py} pyKey={pyKey} section="is" indent={indent} note={note} isEditing={isEditing} onUpdate={onUpdate} />
 );
 const dividendLabel = data.entityName.includes('LLC') ? 'Member distributions' : 'Dividends declared';

 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Statement of Income (Loss) and Retained Earnings (Deficit)" subTitle={data.periodLabel} />
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <ColHeaders yearEnd={data.yearEnd} priorYearEnd={data.priorYearEnd} />
 <tbody>
 <SectionHeadRow label="Revenue" />
 {dr('Revenue from services', is.revenue, 'revenue', is.revenuePY, 'revenuePY', 1)}

 <SectionHeadRow label="Cost of Services" />
 {dr('Direct service costs', is.cogs, 'cogs', is.cogsPY, 'cogsPY', 1)}
 <SpacerRow />
 <SubtotalRow label="Gross Profit" cy={c.grossProfit} py={c.grossProfitPY} />

 <SectionHeadRow label="Operating Expenses" />
 {dr('Administrative expenses', is.admin, 'admin', is.adminPY, 'adminPY', 1)}
 {dr('Depreciation and amortization', is.da, 'da', is.daPY, 'daPY', 1)}
 {dr('Interest expense', is.interest, 'interest', is.interestPY, 'interestPY', 1)}
 <SubtotalRow label="Total expenses" cy={c.totalExpenses} py={c.totalExpensesPY} />
 <SpacerRow />
 <SubtotalRow label="Income before income taxes" cy={c.incomeBeforeTax} py={c.incomeBeforeTaxPY} />
 {dr('Income tax expense', is.tax, 'tax', is.taxPY, 'taxPY', 1)}
 <SpacerRow />
 <TotalRow label="Net Income" cy={c.netIncome} py={c.netIncomePY} />

 <SectionHeadRow label="Retained Earnings" />
 {dr('Retained earnings, beginning of year', is.reBeg, 'reBeg', is.reBegPY, 'reBegPY', 1)}
 <tr>
 <td style={{...S.rowLabel, paddingLeft: '26px' }}>Net income for the year</td>
 <td />
 <td style={S.numCell}>{fmtN(c.netIncome)}</td>
 <td style={S.numCell}>{fmtN(c.netIncomePY)}</td>
 </tr>
 {dr(dividendLabel, -is.dividends, 'dividends', -is.dividendsPY, 'dividendsPY', 1)}
 <SpacerRow />
 <TotalRow label="Retained Earnings, End of Year" cy={c.reEnd} py={c.reEndPY} />
 </tbody>
 </table>
 <FooterNote />
 </div>
 );
}

// ─── Page: Cash Flows ─────────────────────────────────────────────────────────

function CFPage({ data, isEditing, onUpdate }: {
 data: FSData; isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
}) {
 const c = computedCF(data.cf);
 const cf = data.cf;
 const dr = (label: string, cy: number, cyKey: string, py: number, pyKey: string, indent = 0) => (
 <DataRow key={cyKey} label={label} cy={cy} cyKey={cyKey} py={py} pyKey={pyKey} section="cf" indent={indent} isEditing={isEditing} onUpdate={onUpdate} />
 );
 const distLabel = data.entityName.includes('LLC') ? 'Member distributions paid' : 'Dividends paid';

 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Statement of Cash Flows" subTitle={data.periodLabel} />
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <ColHeaders yearEnd={data.yearEnd} priorYearEnd={data.priorYearEnd} />
 <tbody>
 <SectionHeadRow label="Operating Activities" />
 {dr('Net income', cf.netIncome, 'netIncome', cf.netIncomePY, 'netIncomePY', 1)}
 <GroupLabelRow label="Adjustments for non-cash items:" />
 {dr('Depreciation and amortization', cf.da, 'da', cf.daPY, 'daPY', 2)}
 {dr('Amortization of right-of-use assets', cf.rouAmort, 'rouAmort', cf.rouAmortPY, 'rouAmortPY', 2)}
 {dr('Deferred income taxes', cf.deferredTax, 'deferredTax', cf.deferredTaxPY, 'deferredTaxPY', 2)}
 <GroupLabelRow label="Changes in working capital:" />
 {dr('Trade and other receivables', cf.receivables, 'receivables', cf.receivablesPY, 'receivablesPY', 2)}
 {dr('Inventories', cf.inventory, 'inventory', cf.inventoryPY, 'inventoryPY', 2)}
 {dr('Prepaid expenses and deposits', cf.prepaid, 'prepaid', cf.prepaidPY, 'prepaidPY', 2)}
 {dr('Accounts payable and accrued liabilities', cf.payables, 'payables', cf.payablesPY, 'payablesPY', 2)}
 {dr('Income taxes payable', cf.taxPayable, 'taxPayable', cf.taxPayablePY, 'taxPayablePY', 2)}
 <SubtotalRow label="Net cash provided by operating activities" cy={c.operating} py={c.operatingPY} indent={1} />

 <SectionHeadRow label="Investing Activities" />
 {dr('Purchase of property, plant and equipment', cf.capex, 'capex', cf.capexPY, 'capexPY', 1)}
 <SubtotalRow label="Net cash used in investing activities" cy={c.investing} py={c.investingPY} indent={1} />

 <SectionHeadRow label="Financing Activities" />
 {dr('Repayment of long-term debt', cf.ltdRepay, 'ltdRepay', cf.ltdRepayPY, 'ltdRepayPY', 1)}
 {dr('Repayment of lease liabilities', cf.leaseRepay, 'leaseRepay', cf.leaseRepayPY, 'leaseRepayPY', 1)}
 {dr(distLabel, cf.dividendsPaid, 'dividendsPaid', cf.dividendsPaidPY, 'dividendsPaidPY', 1)}
 <SubtotalRow label="Net cash used in financing activities" cy={c.financing} py={c.financingPY} indent={1} />

 <SpacerRow />
 <SubtotalRow label="Net increase (decrease) in cash and cash equivalents" cy={c.netChange} py={c.netChangePY} />
 {dr('Cash and cash equivalents, beginning of year', cf.cashBeg, 'cashBeg', cf.cashBegPY, 'cashBegPY', 1)}
 <SpacerRow />
 <TotalRow label="Cash and cash equivalents, end of year" cy={c.cashEnd} py={c.cashEndPY} />
 </tbody>
 </table>
 <FooterNote />
 </div>
 );
}

// ─── Page: Changes in Equity ──────────────────────────────────────────────────

function EQPage({ data, isEditing, onUpdate }: {
 data: FSData; isEditing: boolean;
 onUpdate: (section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => void;
}) {
 const eq = data.eq;
 const scLabel = data.entityName.includes('LLC') ? "Members' Capital" : 'Share Capital';
 const distLabel = data.entityName.includes('LLC') ? 'Member distributions' : 'Dividends declared';
 const totalBeg = eq.scBeg + eq.reBeg;
 const totalBegPY = eq.scBegPY + eq.reBegPY;
 const totalEnd = eq.scEnd + eq.reEnd;
 const totalEndPY = eq.scEndPY + eq.reEndPY;

 const colH: React.CSSProperties = { textAlign: 'right', fontSize: '11px', fontWeight: 700, paddingBottom: '8px', paddingRight: '8px', whiteSpace: 'nowrap', color: FG, width: '17%' };

 const numC = (v: number, key: string, sec: 'eq', st?: React.CSSProperties) => (
 <NumCell value={v} fieldKey={key} section={sec} isEditing={isEditing} onUpdate={onUpdate} style={st} />
 );
 const zeroTd = () => <td style={S.numCell}>—</td>;

 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Statement of Changes in Equity" subTitle={data.periodLabel} />
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={S.colHeaderDiv}>
 <th style={{ textAlign: 'left', fontWeight: 'normal', paddingBottom: '8px', width: '32%' }} />
 <th style={colH}>{scLabel}</th>
 <th style={colH}>Retained Earnings</th>
 <th style={{...colH, color: MFG }}>{scLabel} (PY)</th>
 <th style={{...colH, color: MFG }}>RE (PY)</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td style={S.subtotalLabel}>Balance, beginning of year</td>
 <td style={{ borderTop: RULE, borderBottom: RULE }} />
 {numC(eq.scBeg, 'scBeg', 'eq', S.subtotalNum)}
 {numC(eq.reBeg, 'reBeg', 'eq', S.subtotalNum)}
 {numC(eq.scBegPY, 'scBegPY', 'eq', S.subtotalNum)}
 {numC(eq.reBegPY, 'reBegPY', 'eq', S.subtotalNum)}
 </tr>
 <tr>
 <td style={{...S.rowLabel, paddingLeft: '20px' }}>Net income for the year</td>
 <td />
 {zeroTd()}
 {numC(eq.netIncome, 'netIncome', 'eq')}
 {zeroTd()}
 {numC(eq.netIncomePY, 'netIncomePY', 'eq')}
 </tr>
 <tr>
 <td style={{...S.rowLabel, paddingLeft: '20px' }}>{distLabel}</td>
 <td />
 {zeroTd()}
 {numC(-eq.dividends, 'dividends', 'eq')}
 {zeroTd()}
 {numC(-eq.dividendsPY, 'dividendsPY', 'eq')}
 </tr>
 <SpacerRow />
 <tr>
 <td style={S.totalLabel}>Balance, end of year</td>
 <td style={{ borderTop: RULE, borderBottom: RULE, boxShadow: `0 3px 0 0 ${FG}` }} />
 <td style={S.grandTotalNum}>{fmtN(eq.scEnd)}</td>
 <td style={S.grandTotalNum}>{fmtN(eq.reEnd)}</td>
 <td style={S.grandTotalNum}>{fmtN(eq.scEndPY)}</td>
 <td style={S.grandTotalNum}>{fmtN(eq.reEndPY)}</td>
 </tr>
 <tr>
 <td style={{...S.subtotalLabel, paddingTop: '10px' }}>Total equity</td>
 <td style={{ borderTop: RULE, borderBottom: RULE }} />
 <td colSpan={2} style={{...S.subtotalNum, textAlign: 'right' }}>{fmtN(totalEnd)}</td>
 <td colSpan={2} style={{...S.subtotalNum, textAlign: 'right', color: MFG }}>{fmtN(totalEndPY)}</td>
 </tr>
 </tbody>
 </table>
 <FooterNote />
 </div>
 );
}

// ─── Page: Notes ──────────────────────────────────────────────────────────────

const NOTE_TITLES: Record<string, string> = {
 '1': 'Nature of Operations',
 '2': 'Significant Accounting Policies',
 '3': 'Income Taxes',
 '4': 'Trade and Other Receivables',
 '5': 'Property, Plant and Equipment',
 '6': 'Long-term Debt',
 '7': 'Commitments and Contingencies',
};

function NotesPage({ data, isEditing, onUpdateNote }: {
 data: FSData; isEditing: boolean;
 onUpdateNote: (key: string, val: string) => void;
}) {
 const keys = Object.keys(data.notes).sort((a, b) => Number(a) - Number(b));
 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader entityName={data.entityName} title="Notes to Financial Statements" subTitle={data.yearEnd} />
 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
 {keys.map(k => (
 <div key={k}>
 <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', color: FG }}>
 {k}. {NOTE_TITLES[k] ?? 'Additional Disclosure'}
 </p>
 {isEditing ? (
 <textarea value={data.notes[k]} onChange={e => onUpdateNote(k, e.target.value)}
 rows={Math.max(3, data.notes[k].split('\n').length + 1)}
 className="w-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 rounded p-2 focus:outline-none resize-y"
 style={{ fontSize: '12.5px', lineHeight: '1.7', fontFamily: 'inherit' }} />
 ) : (
 <div>
 {data.notes[k].split('\n').map((para, i) => (
 <p key={i} style={{ fontSize: '12.5px', lineHeight: '1.7', color: FG, marginBottom: para ? '6px' : '0' }}>{para}</p>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 );
}

// ─── Page: Independent Auditor's Report ──────────────────────────────────────

function AuditorReportPage({ data }: { data: FSData }) {
 const firmName = 'Countable Professional Corporation';
 const city = 'Toronto, Ontario';
 const p = (text: React.ReactNode, style?: React.CSSProperties) => (
  <p style={{ fontSize: '12.5px', lineHeight: '1.75', color: FG, margin: 0, ...style }}>{text}</p>
 );
 const section = (title: string) => (
  <p style={{ fontSize: '12.5px', fontWeight: 700, color: FG, margin: 0, marginTop: '4px' }}>{title}</p>
 );
 return (
  <div style={{ padding: '64px' }}>
   <StmtHeader entityName={data.entityName} title="Independent Auditor's Report" subTitle={data.yearEnd} />
   <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

    {p(<><strong>To the Shareholders of {data.entityName}:</strong></>)}

    {section('Opinion')}
    {p(<>
     We have audited the financial statements of <strong>{data.entityName}</strong> (the "Company"), which comprise
     the balance sheet as at {data.yearEnd}, and the statements of income (loss) and retained earnings (deficit)
     and cash flows for the year then ended, and notes to the financial statements, including a summary of
     significant accounting policies.
    </>)}
    {p(<>
     In our opinion, the accompanying financial statements present fairly, in all material respects,
     the financial position of the Company as at {data.yearEnd}, and the results of its operations and
     its cash flows for the year then ended in accordance with Canadian Accounting Standards for
     Private Enterprises (ASPE).
    </>)}

    {section('Basis for Opinion')}
    {p(<>
     We conducted our audit in accordance with Canadian generally accepted auditing standards. Our
     responsibilities under those standards are further described in the <em>Auditor's Responsibilities
     for the Audit of the Financial Statements</em> section of our report. We are independent of the
     Company in accordance with the ethical requirements that are relevant to our audit of the
     financial statements in Canada, and we have fulfilled our other ethical responsibilities in
     accordance with these requirements. We believe that the audit evidence we have obtained is
     sufficient and appropriate to provide a basis for our opinion.
    </>)}

    {section('Responsibilities of Management and Those Charged with Governance for the Financial Statements')}
    {p(<>
     Management is responsible for the preparation and fair presentation of the financial statements
     in accordance with ASPE, and for such internal control as management determines is necessary to
     enable the preparation of financial statements that are free from material misstatement, whether
     due to fraud or error.
    </>)}
    {p(<>
     In preparing the financial statements, management is responsible for assessing the Company's
     ability to continue as a going concern, disclosing, as applicable, matters related to going
     concern and using the going concern basis of accounting unless management either intends to
     liquidate the Company or to cease operations, or has no realistic alternative but to do so.
    </>)}
    {p(<>
     Those charged with governance are responsible for overseeing the Company's financial reporting process.
    </>)}

    {section("Auditor's Responsibilities for the Audit of the Financial Statements")}
    {p(<>
     Our objectives are to obtain reasonable assurance about whether the financial statements as a
     whole are free from material misstatement, whether due to fraud or error, and to issue an
     auditor's report that includes our opinion. Reasonable assurance is a high level of assurance,
     but is not a guarantee that an audit conducted in accordance with Canadian generally accepted
     auditing standards will always detect a material misstatement when it exists. Misstatements can
     arise from fraud or error and are considered material if, individually or in the aggregate, they
     could reasonably be expected to influence the economic decisions of users taken on the basis of
     these financial statements.
    </>)}
    {p(<>
     As part of an audit in accordance with Canadian generally accepted auditing standards, we
     exercise professional judgment and maintain professional skepticism throughout the audit. We also:
    </>)}
    <ul style={{ fontSize: '12.5px', lineHeight: '1.75', color: FG, paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
     <li>Identify and assess the risks of material misstatement of the financial statements, whether due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit evidence that is sufficient and appropriate to provide a basis for our opinion.</li>
     <li>Obtain an understanding of internal control relevant to the audit in order to design audit procedures that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the effectiveness of the Company's internal control.</li>
     <li>Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates and related disclosures made by management.</li>
     <li>Conclude on the appropriateness of management's use of the going concern basis of accounting and, based on the audit evidence obtained, whether a material uncertainty exists related to events or conditions that may cast significant doubt on the Company's ability to continue as a going concern.</li>
     <li>Evaluate the overall presentation, structure and content of the financial statements, including the disclosures, and whether the financial statements represent the underlying transactions and events in a manner that achieves fair presentation.</li>
    </ul>
    {p(<>
     We communicate with those charged with governance regarding, among other matters, the planned
     scope and timing of the audit and significant audit findings, including any significant
     deficiencies in internal control that we identify during our audit.
    </>)}

    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
     {p(firmName)}
     {p('Licensed Public Accountants', { color: MFG })}
     {p(city, { color: MFG })}
     {p(data.yearEnd, { color: MFG })}
    </div>
   </div>
  </div>
 );
}

// ─── Page: Compilation Report ─────────────────────────────────────────────────

function CompReportPage({ data, isCompilation }: { data: FSData; isCompilation?: boolean }) {
 const firmName = 'Countable Professional Corporation';
 const city = isCompilation ? 'Toronto, Ontario' : 'Toronto, Ontario';
 return (
 <div style={{ padding: '64px' }}>
 <StmtHeader
 entityName={data.entityName}
 title={isCompilation ? 'Compilation Report of External Accountant' : "Independent Accountant's Review Report"}
 subTitle={data.yearEnd}
 />
 <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12.5px', lineHeight: '1.7', color: FG }}>
 <p><strong>To the Management of {data.entityName}:</strong></p>
 <p>
 On the basis of information provided by management, we have compiled the balance sheet of{' '}
 <strong>{data.entityName}</strong> as at {data.yearEnd}, and the statements of income and retained earnings
 and cash flows for the year then ended (together referred to as the "financial statements").
 </p>
 <p style={{ fontWeight: 600 }}>Notice to Reader</p>
 <p>
 We have compiled these financial statements from information provided by management.
 We have not audited, reviewed or otherwise attempted to verify the accuracy or completeness of such
 information. Readers are cautioned that these statements may not be appropriate for their purposes.
 </p>
 <p>
 Readers are advised that the financial statements may not be suitable for general-purpose use because
 they have been compiled without audit or review. Management is responsible for the accuracy and
 completeness of the information used to compile the financial statements and for ensuring that the
 financial statements are presented in accordance with the applicable basis of accounting.
 </p>
 <p style={{ marginTop: '32px' }}>{firmName}</p>
 <p style={{ color: MFG }}>{city}</p>
 <p style={{ color: MFG }}>{data.yearEnd}</p>
 </div>
 </div>
 );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditFSViewerProps {
 pageType: FSPageType;
 engagementId: string;
 isUS?: boolean;
 isCompilation?: boolean;
 isEditing: boolean;
 saveRef?: React.MutableRefObject<(() => void) | null>;
}

export function AuditFSViewer({ pageType, engagementId, isUS, isCompilation, isEditing, saveRef }: AuditFSViewerProps) {
 const storageKey = `audit-fs-data-${engagementId}${isUS ? '-us' : ''}`;
 const defaultData = isUS ? US_DEFAULT : CA_DEFAULT;

 const [data, setData] = useState<FSData>(() =>
 readJsonFromLocalStorage<FSData>(storageKey, defaultData)
 );

 useEffect(() => {
 setData(readJsonFromLocalStorage<FSData>(storageKey, isUS ? US_DEFAULT : CA_DEFAULT));
 }, [engagementId, isUS, storageKey]);

 useEffect(() => {
 if (saveRef) {
 saveRef.current = () => writeJsonToLocalStorage(storageKey, data);
 }
 }, [data, saveRef, storageKey]);

 const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 useEffect(() => {
 if (!isEditing) return;
 if (saveTimer.current) clearTimeout(saveTimer.current);
 saveTimer.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 800);
 return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
 }, [data, isEditing, storageKey]);

 const onUpdate = useCallback((section: 'bs' | 'is' | 'cf' | 'eq', key: string, val: number) => {
 setData(prev => ({...prev, [section]: {...prev[section], [key]: val } }));
 }, []);

 const onUpdateNote = useCallback((key: string, val: string) => {
 setData(prev => ({...prev, notes: {...prev.notes, [key]: val } }));
 }, []);

 const onUpdateText = useCallback((field: keyof FSData, val: string) => {
 setData(prev => ({...prev, [field]: val }));
 }, []);

 const watermarkText = isCompilation ? 'DRAFT — COMPILATION' : 'DRAFT';
 const coverTitle = isCompilation ? 'Compiled Financial Information' : 'Financial Statements';

 return (
 <div id="fs-print-target" style={{ minHeight: '100%', backgroundColor: 'hsl(220 30% 97%)', padding: '32px 24px' }}>
 <div
 className="mx-auto relative"
 style={{
 background: 'white',
 width: 'min(820px, 100%)',
 minHeight: 1080,
 borderRadius: '14px',
 boxShadow: '0 8px 32px hsl(220 30% 30% / 0.08), 0 2px 8px hsl(220 30% 30% / 0.04)',
 border: '1px solid hsl(220 20% 90%)',
 padding: '24px 0',
 display: 'flex',
 flexDirection: 'column',
 fontFamily: FONT,
 }}
 >
 <BrandHeader />
 <div style={{ flex: 1, color: BODY_COL }}>
 {pageType === 'cover' ? (
 <div style={{ position: 'relative', zIndex: 1, padding: '64px' }}>
 <div style={{ fontSize: '72px', fontWeight: 900, color: '#ccc', opacity: 0.18, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-35deg)', letterSpacing: '0.12em', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
 DRAFT UNDER DISCUSSION
 </div>
 <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '700px', textAlign: 'center', gap: '28px' }}>
 {isEditing ? (
 <input className="text-3xl font-bold text-center border-b border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 focus:outline-none w-full max-w-md"
 value={data.entityName} onChange={e => onUpdateText('entityName', e.target.value)} />
 ) : (
 <h1 style={{ fontSize: '26px', fontWeight: 700 }}>{data.entityName}</h1>
 )}
 <div style={{ width: '100px', borderTop: `2px solid ${FG}` }} />
 <div>
 <p style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>{coverTitle}</p>
 {isEditing ? (
 <input className="text-sm text-center border-b border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 focus:outline-none w-full"
 value={data.yearEnd} onChange={e => onUpdateText('yearEnd', e.target.value)} />
 ) : (
 <p style={{ fontSize: '13px', color: MFG }}>For the Year Ended {data.yearEnd}</p>
 )}
 </div>
 </div>
 </div>
 ) : (
 <>
 {/* DRAFT watermark on non-cover pages */}
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true" style={{ zIndex: 0, overflow: 'hidden' }}>
 <span style={{ fontSize: '64px', fontWeight: 900, color: '#ccc', opacity: 0.12, transform: 'rotate(-35deg)', letterSpacing: '0.12em', whiteSpace: 'nowrap', userSelect: 'none' }}>
 {watermarkText}
 </span>
 </div>
 <div style={{ position: 'relative', zIndex: 1 }}>
 {pageType === 'toc' && <TocPage data={data} />}
 {pageType === 'auditor-report' && <AuditorReportPage data={data} />}
 {pageType === 'comp-report' && <CompReportPage data={data} isCompilation={isCompilation} />}
 {pageType === 'bs' && <BSPage data={data} isEditing={isEditing} onUpdate={onUpdate} />}
 {pageType === 'is' && <ISPage data={data} isEditing={isEditing} onUpdate={onUpdate} />}
 {pageType === 'cf' && <CFPage data={data} isEditing={isEditing} onUpdate={onUpdate} />}
 {pageType === 'eq' && <EQPage data={data} isEditing={isEditing} onUpdate={onUpdate} />}
 {pageType === 'notes' && <NotesPage data={data} isEditing={isEditing} onUpdateNote={onUpdateNote} />}
 </div>
 </>
 )}
 </div>
 <BrandFooter />
 </div>
 <WorksheetSignOff worksheetKey={`fs-${pageType}`} engagementId={engagementId} />
 </div>
 );
}
