import { readJsonFromLocalStorage } from "@/lib/safeJson";

export interface DuplicateAccountRow {
  accNo: string;
  description: string;
  original: number;
  adj: number;
  final: number;
  py1: number;
  py2: number;
  source?: "xero";
}

export interface DuplicateGroup {
  id: string;
  rows: [DuplicateAccountRow, DuplicateAccountRow];
}

export type MergeDecision = "up" | "down" | "ignore" | "delete";

// Merge eligibility rule (per CPT-13596 clarification): a pair can only be
// merged when at least one row's Original is 0 — that's the signature of a
// split import (one row carries this year's balance, the other only carries
// prior-year balances left over from before a re-import created a fresh row).
// Two rows that both carry a real non-zero Original — whether equal or not —
// are never auto-mergeable and always route to a support ticket instead.
const baseGroups: DuplicateGroup[] = [
  // Eligible — clean split: row0 has this year's balance, row1 is the old
  // stub carrying only prior-year balances forward.
  {
    id: "g1",
    rows: [
      { accNo: "1424", description: "Assets: Cash and Cash Equivalents", original: 1200, adj: 0, final: 1200, py1: 0, py2: 0 },
      { accNo: "1424", description: "Assets: Inventory", original: 0, adj: 0, final: 0, py1: 1100, py2: 1300 },
    ],
  },
  // Eligible, but the stub row (row1) carries an adjusting entry — blocks
  // merging until the adjusting entry is removed.
  {
    id: "g2",
    rows: [
      { accNo: "1120", description: "Assets: Cash and Cash Equivalents", original: 1353, adj: 0, final: 1353, py1: 1353, py2: 1353 },
      { accNo: "1101", description: "Assets: Cash and Cash Equivalents", original: 0, adj: 20.2, final: 20.2, py1: 0, py2: 0 },
    ],
  },
  // Not eligible — same non-zero Original on both rows.
  {
    id: "g3",
    rows: [
      { accNo: "1201", description: "Cash Flow: Operating Activities", original: 1253, adj: 0, final: 1253, py1: 1253, py2: 1253 },
      { accNo: "1124", description: "Cash Flow: Financing Activities", original: 1253, adj: 0, final: 1253, py1: 1253, py2: 1253 },
    ],
  },
  // Not eligible — different non-zero Original on both rows.
  {
    id: "g4",
    rows: [
      { accNo: "1233", description: "Liabilities: Accounts Payable", original: 1255, adj: 0, final: 1255, py1: 1255, py2: 1255 },
      { accNo: "1211", description: "Liabilities: Accounts Payable", original: 1288, adj: 0, final: 1288, py1: 1288, py2: 1288 },
    ],
  },
  // Eligible — a second clean split example.
  {
    id: "g5",
    rows: [
      { accNo: "1300", description: "Prepaid Expenses", original: 845, adj: 0, final: 845, py1: 845, py2: 845 },
      { accNo: "1305", description: "Prepaid Expenses - Insurance", original: 0, adj: 0, final: 0, py1: 0, py2: 845 },
    ],
  },
];

// Engagements that came in through a connected accounting source (Xero) instead of
// a plain CSV re-import — the first row of each duplicate pair is the source-of-truth
// row, so it can only be merged "up" (kept), never overwritten by the CSV-imported row.
const XERO_SOURCE_ENGAGEMENTS = new Set(["COM-HFL-Dec312023"]);

export function getMergeGroupsForEngagement(engagementId?: string): DuplicateGroup[] {
  const useXero = !!engagementId && XERO_SOURCE_ENGAGEMENTS.has(engagementId);
  return baseGroups.map((g) => ({
    id: g.id,
    rows: [
      { ...g.rows[0], ...(useXero ? { source: "xero" as const } : {}) },
      { ...g.rows[1] },
    ],
  }));
}

// Drives the amber "duplicates found" warning indicator on the Trial Balance
// Actions button — mirrors the AC's "highlights the Action Button as Amber
// with warning indicator" requirement.
export function getUnresolvedDuplicateCount(engagementId?: string): number {
  const all = getMergeGroupsForEngagement(engagementId);
  if (all.length === 0) return 0;
  const resolved = readJsonFromLocalStorage<string[]>(
    `merge-accounts-resolved-${engagementId ?? "default"}`,
    []
  );
  return all.filter((g) => !resolved.includes(g.id)).length;
}

export function hasUnresolvedDuplicates(engagementId?: string): boolean {
  return getUnresolvedDuplicateCount(engagementId) > 0;
}
