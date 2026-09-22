export const DEMO_CLIENT = {
  id: 'DEMO-NPM',
  legalName: 'Northline Precision Manufacturing Inc.',
  shortName: 'Northline Precision',
  entityType: 'Corporation (CCPC)',
  province: 'Ontario',
  fiscalYearEnd: 'December 31, 2025',
  framework: 'ASPE',
  standard: 'CAS',
  accountingSystem: 'QuickBooks Online',
  priorYearBasis: 'Review (CSRE 2400)',
  firstYearAudit: true,
};

export const DEMO_FINANCIALS = {
  revenue: 14_200_000,
  totalAssets: 9_617_340,
  netIncomeBeforeTax: 1_140_000,
  headcount: 62,
  locations: ['Mississauga plant', 'Barrie warehouse'],
};

export const DEMO_MATERIALITY = {
  overall: 142_000,
  performance: 92_300,
  clearlyTrivial: 7_100,
  benchmark: 'Revenue',
  percentage: 1.0,
};

export const DEMO_TEAM = {
  partner: 'R. Chandra',
  manager: 'S. Whitfield',
  senior: 'D. Okonkwo',
  agent: 'Luka',
};

export const DEMO_ENGAGEMENT_ID = 'AUD-NPM-Dec312025';

export const DEMO_PROVENANCE = {
  revenue: {
    value: '$14,200,000',
    source: 'Xero GL, account 4000 (Revenue) · 4,211 transactions · pulled 2026-07-20 14:02',
    logic: 'Sum of all credit entries to account 4000 for the period Jan 1 – Dec 31, 2025.',
    confidence: 'High' as const,
  },
  materiality: {
    value: '$142,000 (1% of revenue)',
    source: 'Derived from Xero trial balance · revenue benchmark selected',
    logic: 'Manufacturing entity; revenue selected as benchmark because earnings are volatile across the 3-year window and primary users are the lender and shareholder.',
    confidence: 'High' as const,
  },
  businessNumber: {
    value: '123456789 RC0001',
    source: 'Ontario Business Registry · retrieved 2026-07-20',
    logic: 'Auto-populated from corporate registry lookup using the legal entity name.',
    confidence: 'High' as const,
  },
  warrantyProvision: {
    value: '$87,400',
    source: 'Prior-year review file · Note 6 (Warranty provision) · page 14',
    logic: 'Carried forward from prior-year review file; flagged for re-evaluation under CAS 540 as a management estimate.',
    confidence: 'Medium' as const,
  },
  relatedParty: {
    value: 'Northline Holdings Inc. — shareholder-owned holdco',
    source: 'Xero GL counterparty matching · Ontario Business Registry · Cap table',
    logic: 'Rent payments to Northline Holdings Inc. identified via GL counterparty analysis; corporate registry confirms common directorship with Northline Precision.',
    confidence: 'High' as const,
  },
  covenantRatio: {
    value: 'DSCR 1.42× (covenant minimum: 1.25×)',
    source: 'Term loan agreement · Schedule B · clause 6.3 · p.18 · extracted 2026-07-21',
    logic: 'Debt service coverage ratio calculated from audited EBITDA and scheduled principal/interest payments per the loan agreement.',
    confidence: 'Medium' as const,
  },
};

export interface LukaProcTargetRow { id: string; label: string; }

export const DEMO_LUKA_PROC_ACTIONS: Record<string, {
  sources: string[];
  procedureType: string;
  actions: {
    label: string;
    description: string;
    estimatedTime: string;
    source: string;
    targetRows: LukaProcTargetRow[];
  }[];
}> = {
  "gca-ws-proc-cash": {
    sources: ["Xero bank feed", "TB cash accounts"],
    procedureType: "Reconciliation & Count",
    actions: [
      {
        label: "A-2 Bank Reconciliation",
        description: "Agree TB cash balance to bank statement; identify outstanding items and timing differences.",
        estimatedTime: "~20 min",
        source: "Xero bank feed",
        targetRows: [
          { id: "cash-audit-bankRec-review", label: "Bank reconciliations — Review for accuracy, agree to bank statements and GL" },
          { id: "cash-audit-bankRec-stale",  label: "Bank reconciliations — Ensure no stale-dated cheques included" },
          { id: "cash-audit-bankRec-explain", label: "Bank reconciliations — Obtain explanations for large / old / unusual items" },
        ],
      },
      {
        label: "A-3 Cash Count",
        description: "Generate petty cash count sheet from TB petty cash balance for physical count verification.",
        estimatedTime: "~10 min",
        source: "TB cash accounts",
        targetRows: [
          { id: "cash-audit-count-significant", label: "Significant cash transactions — Count material cash funds or undeposited receipts" },
        ],
      },
    ],
  },
  "gca-ws-proc-cash-bank": {
    sources: ["Xero bank feed", "TB cash accounts"],
    procedureType: "Reconciliation",
    actions: [
      {
        label: "A-2 Bank Reconciliation",
        description: "Agree TB cash balance to bank statement; identify outstanding items and timing differences.",
        estimatedTime: "~20 min",
        source: "Xero bank feed",
        targetRows: [
          { id: "cash-bank-confirm",      label: "Obtain copies — Agree to bank confirmations" },
          { id: "cash-bank-statement",    label: "Obtain copies — Agree to bank statement" },
          { id: "cash-bank-gl",           label: "Obtain copies — Agree to general ledger" },
          { id: "cash-bank-supporting",   label: "Obtain copies — Agree to supporting detail (outstanding items list)" },
          { id: "cash-bank-arithmetic",   label: "Arithmetic check — Check accuracy of bank reconciliation" },
          { id: "cash-bank-sub-obtain",   label: "Subsequent bank statement — Obtain copy from bank" },
          { id: "cash-bank-sub-cheques",  label: "Subsequent bank statement — Agree sample of cheques to outstanding list" },
          { id: "cash-bank-sub-deposits", label: "Subsequent bank statement — Agree sample of deposits to outstanding list" },
          { id: "cash-bank-sub-notes",    label: "Subsequent bank statement — Examine bank debit and credit notes" },
          { id: "cash-bank-sub-opening",  label: "Subsequent bank statement — Agree opening balance to bank rec" },
          { id: "cash-bank-sub-sigs",     label: "Subsequent bank statement — Scrutinize cheques for authorized signatures" },
          { id: "cash-bank-sub-stale",    label: "Subsequent bank statement — Inquire about large / unusual / stale-dated outstanding cheques" },
        ],
      },
    ],
  },
  "gca-ws-proc-ar": {
    sources: ["Xero AR subledger", "Post year-end receipts"],
    procedureType: "Inspection & Confirmation",
    actions: [
      {
        label: "Agree to general ledger",
        description: "Agree AR subledger total to GL control account; identify reconciling items.",
        estimatedTime: "~10 min",
        source: "Xero AR subledger",
        targetRows: [
          { id: "ar-audit-basic-obtain",    label: "Preparation — Obtain detailed aged listing of AR at period end" },
          { id: "ar-audit-accuracy-check",  label: "Accuracy of listing — Check arithmetic accuracy and agree to GL balance" },
        ],
      },
      {
        label: "Sub-ledger — large and unusual items",
        description: "Pull sub-ledger, sort by balance, flag items above threshold and aged >90 days.",
        estimatedTime: "~15 min",
        source: "Xero AR subledger",
        targetRows: [
          { id: "ar-audit-existence-unusual", label: "Unusual or large balances — Review sub-ledger, flag unusual items" },
          { id: "ar-audit-allowance-a",       label: "Allowance for doubtful accounts — Review aged AR trial balance and subsequent receipts" },
          { id: "ar-audit-allowance-b",       label: "Allowance for doubtful accounts — Accounts >90 days not paid subsequent to period end" },
        ],
      },
      {
        label: "B-2 Confirmation Procedures",
        description: "Generate confirmation letters from AR subledger using stratified sampling by balance tier.",
        estimatedTime: "~25 min",
        source: "Xero AR subledger",
        targetRows: [
          { id: "ar-audit-existence-validate",     label: "Validation of AR — Determine which balances to confirm or use alternative procedures" },
          { id: "ar-audit-existence-confirmation", label: "Validation — Confirmation: Perform C.110 procedures" },
        ],
      },
      {
        label: "Subsequent receipts testing",
        description: "Match post year-end cash receipts against year-end AR balances to confirm collectability.",
        estimatedTime: "~20 min",
        source: "Post year-end receipts",
        targetRows: [
          { id: "ar-audit-completeness-subsequent", label: "Subsequent receipts testing — Listing of invoices paid after period end" },
          { id: "ar-audit-existence-alternative",   label: "Validation — Alternative to confirmation: Extend subsequent receipts testing" },
        ],
      },
    ],
  },
  "gca-ws-proc-ar-conf": {
    sources: ["Xero AR subledger"],
    procedureType: "Confirmation",
    actions: [
      {
        label: "B-2 Confirmation Procedures",
        description: "Generate confirmation letters from AR subledger using stratified sampling by balance tier.",
        estimatedTime: "~25 min",
        source: "Xero AR subledger",
        targetRows: [
          { id: "arconf-agree-gl",         label: "Sub-ledger/TB as at confirmation date — a. Agree to GL" },
          { id: "arconf-identify-large",   label: "Sub-ledger — b. Identify large and unusual items" },
          { id: "arconf-select-sample",    label: "Sub-ledger — c. Select sample for confirmation incl. large/unusual" },
          { id: "arconf-document-sample",  label: "Sub-ledger — d. Document how sample was chosen" },
          { id: "arconf-prepare-requests", label: "Prepare confirmation requests and maintain control" },
          { id: "arconf-second-request",   label: "Second request — After X days, mail second request to non-respondents" },
          { id: "arconf-differences",      label: "Differences — Reconcile replies indicating differences" },
          { id: "arconf-alternative",      label: "Alternative procedures — Where confirmations not returned" },
          { id: "arconf-statistics",       label: "Complete confirmation statistics summary" },
        ],
      },
    ],
  },
};

export const DEMO_LUKA_ACTIONS = {
  riskAssessment: {
    sources: ["Prior file (2024 Review)", "Xero GL", "Risk library"],
    actions: [
      { label: "Populate risks from prior file", description: "Carry forward identified risks from 2024 review file" },
      { label: "Flag significant risks", description: "Auto-mark risks above High inherent threshold" },
      { label: "Cross-reference to 520", description: "Link identified risks to risk register" },
    ],
  },
  procedures: {
    sources: ["Engagement scope", "590 procedure library"],
    actions: [
      { label: "Load procedures from engagement scope", description: "Pull 590 procedure library into this worksheet" },
      { label: "Mark automatable procedures", description: "Flag procedures Luka can initiate work papers for" },
    ],
  },
  completion: {
    sources: ["Signed-off worksheets", "Prior file"],
    actions: [
      { label: "Populate from signed-off sections", description: "Pull conclusions from completed risk and procedure worksheets" },
      { label: "Flag open items", description: "Identify sections still requiring auditor judgment" },
    ],
  },
  generic: {
    sources: ["Prior file", "Xero GL"],
    actions: [
      { label: "Auto-populate from prior file", description: "Carry forward and flag for re-evaluation" },
    ],
  },
};
