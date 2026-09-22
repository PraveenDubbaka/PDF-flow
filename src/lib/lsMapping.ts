import { GlobalTemplate, initialGlobalWorksheets } from "@/components/Sidebar";

function findNodeById(nodes: GlobalTemplate[], id: string): GlobalTemplate | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Direct children of the Global Worksheets > Procedures folder (gca-ws-proc). */
export function getGlobalProcedureItems(
  worksheets: GlobalTemplate[] = initialGlobalWorksheets
): GlobalTemplate[] {
  return findNodeById(worksheets, "gca-ws-proc")?.children ?? [];
}

/** Find any node (including nested folder children) within the gca-ws-proc subtree. */
export function findGlobalProcedureNode(id: string): GlobalTemplate | null {
  return findNodeById(getGlobalProcedureItems(), id);
}

export interface LsInfo {
  lsCode: string;
  wpNodeId: string;
  wpLabel: string;
}

export interface CAProcNode {
  id: string;       // gca-ws-proc-* ID (global template)
  label: string;    // display label
  audWpId: string;  // corresponding aud-wp-* for sidebar filtering
}

export const CA_GLOBAL_PROC_NODES: CAProcNode[] = [
  { id: "gca-ws-proc-cash-grp",  label: "Cash",                              audWpId: "aud-wp-a"  },
  { id: "gca-ws-proc-ar-grp",    label: "Accounts Receivable",               audWpId: "aud-wp-b"  },
  { id: "gca-ws-proc-inv",       label: "Inventory",                         audWpId: "aud-wp-c"  },
  { id: "gca-ws-proc-invest",    label: "Investments",                        audWpId: "aud-wp-d"  },
  { id: "gca-ws-proc-lr",        label: "Loans & Advances Receivable",        audWpId: "aud-wp-e"  },
  { id: "gca-ws-proc-rp",        label: "Related party",                      audWpId: ""          },
  { id: "gca-ws-proc-ppe",       label: "Property, Plant and Equipment",      audWpId: "aud-wp-h"  },
  { id: "gca-ws-proc-intang",    label: "Intangibles and Goodwill",           audWpId: "aud-wp-f"  },
  { id: "gca-ws-proc-ltinv",     label: "Other Investments",                  audWpId: "aud-wp-k"  },
  { id: "gca-ws-proc-bankdebt",  label: "Bank indebtedness",                  audWpId: "aud-wp-dd" },
  { id: "gca-ws-proc-ap",        label: "Accounts Payable and Accrued Liab.", audWpId: "aud-wp-bb" },
  { id: "gca-ws-proc-tax",       label: "Income Taxes",                       audWpId: "aud-wp-cc" },
  { id: "gca-ws-proc-notedebt",  label: "Note Payable and Bank Debt",         audWpId: "aud-wp-kk" },
  { id: "gca-ws-proc-lp",        label: "Loans & Advances Payable",           audWpId: "aud-wp-jj" },
  { id: "gca-ws-proc-ltd",       label: "Long term debt",                     audWpId: "aud-wp-kk" },
  { id: "gca-ws-proc-equity",    label: "Equity",                             audWpId: "aud-wp-tt" },
  { id: "gca-ws-proc-rev",       label: "Revenue",                            audWpId: "aud-wp-20" },
  { id: "gca-ws-proc-cos",       label: "Cost of Sales",                      audWpId: "aud-wp-30" },
  { id: "gca-ws-proc-payroll",   label: "Payroll",                            audWpId: "aud-wp-40" },
  { id: "gca-ws-proc-exp",       label: "Other Expenses",                     audWpId: "aud-wp-80" },
];

export function getGcaProcIdForWp(audWpId: string): string {
  return CA_GLOBAL_PROC_NODES.find(n => n.audWpId === audWpId)?.id ?? "";
}

export function getAudWpIdForProc(gcaProcId: string): string {
  const direct = CA_GLOBAL_PROC_NODES.find(n => n.id === gcaProcId);
  if (direct) return direct.audWpId;
  // For children nested inside a folder group (e.g. gca-ws-proc-cash inside gca-ws-proc-cash-grp),
  // resolve to the parent group's audWpId.
  for (const group of getGlobalProcedureItems()) {
    if (group.type === "folder" && group.children?.some(c => c.id === gcaProcId)) {
      return CA_GLOBAL_PROC_NODES.find(n => n.id === group.id)?.audWpId ?? "";
    }
  }
  return "";
}

export const ALL_PROCEDURE_NODES: LsInfo[] = [
  { lsCode: "A",  wpNodeId: "aud-wp-a",  wpLabel: "Cash and cash equivalents" },
  { lsCode: "B",  wpNodeId: "aud-wp-b",  wpLabel: "Accounts receivable" },
  { lsCode: "C",  wpNodeId: "aud-wp-c",  wpLabel: "Inventories" },
  { lsCode: "D",  wpNodeId: "aud-wp-d",  wpLabel: "Short-term investments" },
  { lsCode: "E",  wpNodeId: "aud-wp-e",  wpLabel: "Loans and notes receivable" },
  { lsCode: "F",  wpNodeId: "aud-wp-f",  wpLabel: "Intangibles and goodwill" },
  { lsCode: "I",  wpNodeId: "aud-wp-i",  wpLabel: "Other current assets" },
  { lsCode: "H",  wpNodeId: "aud-wp-h",  wpLabel: "Property, plant and equipment" },
  { lsCode: "K",  wpNodeId: "aud-wp-k",  wpLabel: "Long-term investments" },
  { lsCode: "BB", wpNodeId: "aud-wp-bb", wpLabel: "Accounts payable" },
  { lsCode: "CC", wpNodeId: "aud-wp-cc", wpLabel: "Taxes payable" },
  { lsCode: "DD", wpNodeId: "aud-wp-dd", wpLabel: "Short-term debt" },
  { lsCode: "JJ", wpNodeId: "aud-wp-jj", wpLabel: "Other long-term liabilities" },
  { lsCode: "KK", wpNodeId: "aud-wp-kk", wpLabel: "Long-term debt" },
  { lsCode: "TT", wpNodeId: "aud-wp-tt", wpLabel: "Equity" },
  { lsCode: "20", wpNodeId: "aud-wp-20", wpLabel: "Revenue" },
  { lsCode: "30", wpNodeId: "aud-wp-30", wpLabel: "Cost of sales" },
  { lsCode: "40", wpNodeId: "aud-wp-40", wpLabel: "Expenses" },
  { lsCode: "80", wpNodeId: "aud-wp-80", wpLabel: "Other expenses (income)" },
];

// Ordered from most specific to least — first match wins
const LS_MAP: Array<{ pattern: RegExp; wpNodeId: string }> = [
  { pattern: /^revenue$/i,                                                    wpNodeId: "aud-wp-20" },
  { pattern: /^cost of (sales|goods( sold)?)$/i,                             wpNodeId: "aud-wp-30" },
  { pattern: /payroll|benefits?|wages|salaries/i,                            wpNodeId: "aud-wp-40" },
  { pattern: /operating expense|general.{0,6}admin/i,                        wpNodeId: "aud-wp-40" },
  { pattern: /cash|bank/i,                                                    wpNodeId: "aud-wp-a"  },
  { pattern: /accounts? receivable|trade receivable/i,                       wpNodeId: "aud-wp-b"  },
  { pattern: /inventor/i,                                                     wpNodeId: "aud-wp-c"  },
  { pattern: /intangible|goodwill/i,                                           wpNodeId: "aud-wp-f"  },
  { pattern: /property|plant.{0,10}equipment|ppe|capital asset|tangible/i,   wpNodeId: "aud-wp-h"  },
  { pattern: /accounts? payable|trade payable/i,                             wpNodeId: "aud-wp-bb" },
  { pattern: /income tax|tax payable|tax/i,                                  wpNodeId: "aud-wp-cc" },
  { pattern: /short.{0,5}term debt|line of credit|revolver|credit facilit|overdraft/i, wpNodeId: "aud-wp-dd" },
  { pattern: /debt|loan|financing|mortgage|debenture|bond|note payable/i,    wpNodeId: "aud-wp-kk" },
  { pattern: /equity|shareholder|stockholder|retained earnings?|capital stock|share capital/i, wpNodeId: "aud-wp-tt" },
  { pattern: /other (expense|income)|miscellaneous/i,                        wpNodeId: "aud-wp-80" },
  { pattern: /revenue|income|sales/i,                                        wpNodeId: "aud-wp-20" },
  { pattern: /expense|cost/i,                                                 wpNodeId: "aud-wp-40" },
];

export function getLsInfo(fsaName: string): LsInfo | null {
  if (!fsaName.trim()) return null;
  for (const entry of LS_MAP) {
    if (entry.pattern.test(fsaName)) {
      return ALL_PROCEDURE_NODES.find(n => n.wpNodeId === entry.wpNodeId) ?? null;
    }
  }
  return null;
}

const procStorageKey = (engId: string) => `audit-590-active-procs-${engId}`;
const wpProcMapKey = (engId: string) => `audit-590-wp-proc-map-${engId}`;

/** Store a map of aud-wp-* ID → selected gca-ws-proc-* IDs so the sidebar can show children. */
export function setWpProcMap(engagementId: string, rows: Array<{ plannedProcedureIds: string[] }>): void {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    for (const procId of row.plannedProcedureIds ?? []) {
      const audWpId = getAudWpIdForProc(procId);
      if (!audWpId) continue;
      if (!map[audWpId]) map[audWpId] = [];
      if (!map[audWpId].includes(procId)) map[audWpId].push(procId);
    }
  }
  try {
    const key = wpProcMapKey(engagementId);
    localStorage.setItem(key, JSON.stringify(map));
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: localStorage }));
  } catch { /* ignore */ }
}

export function getActiveProcedureIds(engagementId: string): string[] {
  try {
    const raw = localStorage.getItem(procStorageKey(engagementId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function setActiveProcedureIds(engagementId: string, ids: string[]): void {
  try {
    const key = procStorageKey(engagementId);
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
    // Notify other components (Sidebar) listening for storage events
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: localStorage }));
  } catch { /* ignore */ }
}
