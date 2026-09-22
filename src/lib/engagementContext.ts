// ─────────────────────────────────────────────────────────────────────────────
// Engagement Context — single source of truth for data that flows from
// Trial Balance (TB) + Planning forms (400 / 410 / 420) into the
// Risk Assessment worksheets (500-series).
//
// All RA worksheets derive header fields, materiality, FSA balances,
// revenue streams, team etc. from this module. Fields are pre-filled but
// remain editable in the consuming worksheet.
// ─────────────────────────────────────────────────────────────────────────────

import { loadEngagements, getEngagementMeta } from "@/store/engagementsStore";

// ── Trial Balance benchmark figures (mock — would come from QBO connector) ──
export const TB_CA = {
 grossRevenue: 12500000,
 profitBeforeTax: 460000,
 totalAssets: 21800000,
 totalExpenses: 12040000,
 netAssets: 8400000,
};

export const TB_US = {
 grossRevenue: 18400000,
 profitBeforeTax: 1003000,
 totalAssets: 13100000,
 totalExpenses: 17444000,
 netAssets: 3183000,
};

export type TB = typeof TB_CA;

// ── Significant FSA balances (from TB classification) ─────────────────────────

export interface FsaBalance {
 fsa: string;
 amount: number;
 /** Suggested inherent risk based on TB heuristics. */
 inherentRisk: "H" | "M" | "L";
 /** Whether this FSA is a presumed significant risk area. */
 significantRisk: "Y" | "N";
 /** Suggested cross-reference (Form 520 row). */
 risk520Ref?: string;
 /** Suggested assertions flagged X (relevant + risk). */
 assertionsX?: ("C" | "AV" | "E" | "P")[];
}

const FSA_CA: FsaBalance[] = [
 { fsa: "Revenue", amount: 12500000, inherentRisk: "H", significantRisk: "Y", risk520Ref: "510-3", assertionsX: ["C", "AV"] },
 { fsa: "Cost of Sales", amount: 7400000, inherentRisk: "M", significantRisk: "N", assertionsX: ["C", "AV"] },
 { fsa: "Operating Expenses", amount: 3200000, inherentRisk: "L", significantRisk: "N" },
 { fsa: "Payroll & Benefits", amount: 1440000, inherentRisk: "L", significantRisk: "N" },
 { fsa: "Cash & Bank", amount: 850000, inherentRisk: "L", significantRisk: "N", assertionsX: ["E"] },
 { fsa: "Accounts Receivable", amount: 1800000, inherentRisk: "M", significantRisk: "N", assertionsX: ["AV", "E"] },
 { fsa: "Inventory", amount: 2100000, inherentRisk: "M", significantRisk: "N", risk520Ref: "510-5", assertionsX: ["AV", "E"] },
 { fsa: "Property, Plant & Equipment", amount: 4200000, inherentRisk: "M", significantRisk: "N", assertionsX: ["E", "AV"] },
 { fsa: "Accounts Payable", amount: 1250000, inherentRisk: "M", significantRisk: "N", assertionsX: ["C"] },
 { fsa: "Debt & Financing", amount: 3100000, inherentRisk: "M", significantRisk: "N", assertionsX: ["C", "AV", "P"] },
 { fsa: "Related Party Disclosures", amount: 0, inherentRisk: "H", significantRisk: "Y", risk520Ref: "515-5", assertionsX: ["C", "AV", "P"] },
 { fsa: "Equity", amount: 8400000, inherentRisk: "L", significantRisk: "N" },
];

const FSA_US: FsaBalance[] = [
 { fsa: "Revenue", amount: 18400000, inherentRisk: "H", significantRisk: "Y", risk520Ref: "510-3", assertionsX: ["C", "AV"] },
 { fsa: "Cost of Sales", amount: 11200000, inherentRisk: "M", significantRisk: "N", assertionsX: ["C", "AV"] },
 { fsa: "Operating Expenses", amount: 4900000, inherentRisk: "L", significantRisk: "N" },
 { fsa: "Payroll & Benefits", amount: 1344000, inherentRisk: "L", significantRisk: "N" },
 { fsa: "Cash & Bank", amount: 720000, inherentRisk: "L", significantRisk: "N", assertionsX: ["E"] },
 { fsa: "Accounts Receivable", amount: 2450000, inherentRisk: "M", significantRisk: "N", assertionsX: ["AV", "E"] },
 { fsa: "Inventory", amount: 1820000, inherentRisk: "M", significantRisk: "N", risk520Ref: "510-5", assertionsX: ["AV", "E"] },
 { fsa: "Property, Plant & Equipment", amount: 3800000, inherentRisk: "M", significantRisk: "N", assertionsX: ["E", "AV"] },
 { fsa: "Accounts Payable", amount: 1610000, inherentRisk: "M", significantRisk: "N", assertionsX: ["C"] },
 { fsa: "Debt & Financing", amount: 2300000, inherentRisk: "H", significantRisk: "Y", assertionsX: ["C", "AV", "P"] },
 { fsa: "Lease Obligations (ASC 842)", amount: 1200000, inherentRisk: "H", significantRisk: "Y", risk520Ref: "513-1", assertionsX: ["AV", "P"] },
 { fsa: "Equity", amount: 3183000, inherentRisk: "L", significantRisk: "N" },
];

// ── Revenue streams (from TB revenue breakdown) ──────────────────────────────

export interface RevenueStreamSeed {
 name: string;
 description: string;
 assertions: ("C" | "AV" | "E" | "P")[];
 likelihood: "Low" | "Moderate" | "High";
 magnitude: "Low" | "Moderate" | "High";
 inherentRisk: "Low" | "Moderate" | "High";
 significantRisk: "Y" | "N";
 rationale: string;
}

const REVENUE_STREAMS_CA: RevenueStreamSeed[] = [
 {
 name: "Vessel charter revenue",
 description: "Time-charter contracts recognised over the charter period.",
 assertions: ["C", "AV"],
 likelihood: "Moderate", magnitude: "High", inherentRisk: "High", significantRisk: "Y",
 rationale: "Cut-off risk at year-end for contracts spanning the period boundary; manual revenue allocation across periods creates susceptibility to misstatement.",
 },
 {
 name: "Freight & shipping revenue",
 description: "Point-in-time recognition on bill of lading.",
 assertions: ["C", "AV"],
 likelihood: "Moderate", magnitude: "Moderate", inherentRisk: "Moderate", significantRisk: "N",
 rationale: "Standard recognition policy; routine transactions with established controls.",
 },
 {
 name: "Demurrage & ancillary",
 description: "Variable consideration billed at voyage completion.",
 assertions: ["C", "AV", "E"],
 likelihood: "Moderate", magnitude: "Low", inherentRisk: "Moderate", significantRisk: "N",
 rationale: "Estimate-based; lower magnitude but judgement in variable consideration recognition.",
 },
];

const REVENUE_STREAMS_US: RevenueStreamSeed[] = [
 {
 name: "Freight services revenue",
 description: "Over-time recognition under ASC 606 based on transit progress.",
 assertions: ["C", "AV"],
 likelihood: "High", magnitude: "High", inherentRisk: "High", significantRisk: "Y",
 rationale: "Largest revenue stream with cut-off risk and ASC 606 over-time recognition judgement.",
 },
 {
 name: "Warehousing & 3PL",
 description: "Monthly recurring service revenue.",
 assertions: ["C", "AV"],
 likelihood: "Low", magnitude: "Moderate", inherentRisk: "Moderate", significantRisk: "N",
 rationale: "Recurring contracts; standard billing.",
 },
 {
 name: "Customs brokerage",
 description: "Point-in-time recognition on filing.",
 assertions: ["C", "AV"],
 likelihood: "Low", magnitude: "Low", inherentRisk: "Low", significantRisk: "N",
 rationale: "Routine high-volume low-value transactions.",
 },
];

// ── Team & governance ─────────────────────────────────────────────────────────

const TEAM_CA = [
 { role: "Engagement Partner", name: "J. Patel, CPA" },
 { role: "Manager", name: "A. Nguyen, CPA" },
 { role: "Senior Auditor", name: "T. Brown" },
 { role: "Staff Auditor", name: "D. Kim" },
 { role: "EQCR (Quality Reviewer)", name: "S. Lavoie, CPA" },
];

const TEAM_US = [
 { role: "Engagement Partner", name: "M. Thompson, CPA" },
 { role: "Manager", name: "L. Garcia, CPA" },
 { role: "Senior Auditor", name: "K. Patel" },
 { role: "Staff Auditor", name: "J. Chen" },
 { role: "EQCR (Quality Reviewer)", name: "D. Anderson, CPA" },
];

// ── Profiles (derived per engagement) ─────────────────────────────────────────

export interface EngagementContext {
 engagementId: string;
 isUS: boolean;
 entityName: string;
 /** ISO date — period end. */
 periodEnd: string;
 /** Human-readable period end ("March 31, 2024"). */
 periodEndDisplay: string;
 framework: string;
 /** Standard reference for the jurisdiction ("CAS" vs "AU-C"). */
 standardPrefix: "CAS" | "AU-C";
 tb: TB;
 /** Suggested benchmark (e.g. "grossRevenue"). */
 benchmark: keyof TB;
 benchmarkLabel: string;
 benchmarkPct: number; // %
 performanceMaterialityPct: number; // %
 clearlyTrivialPct: number; // %
 overallMateriality: number;
 performanceMateriality: number;
 clearlyTrivial: number;
 fsas: FsaBalance[];
 revenueStreams: RevenueStreamSeed[];
 team: { role: string; name: string }[];
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function detectIsUS(engagementId: string): boolean {
 if (/-US-/i.test(engagementId)) return true;
 const rec = loadEngagements().find(e => e.id === engagementId);
 if (rec?.client && /LLC|Inc\.?$|LLP/i.test(rec.client) && /US/i.test(engagementId)) return true;
 return /-US-|^AUD-US|HFL/i.test(engagementId);
}

function formatPeriodDisplay(iso: string): string {
 const d = new Date(iso);
 if (isNaN(d.getTime())) return iso;
 return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatCurrency(n: number): string {
 if (!isFinite(n)) return "";
 return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function getEngagementContext(engagementId: string | undefined): EngagementContext {
 const id = engagementId ?? "";
 const isUS = detectIsUS(id);
 const rec = loadEngagements().find(e => e.id === id);
 const meta = getEngagementMeta(id);

 const entityName = rec?.client ?? (isUS ? "Harbor Freight Logistics LLC" : "Shipping Line Inc.");
 const periodEnd = meta.periodEnd ?? (isUS ? "2024-12-31" : "2024-03-31");
 const framework =
 meta.accountingFramework ??
 (isUS
 ? "US GAAP — FASB Accounting Standards Codification"
 : "Canadian Accounting Standards for Private Enterprises (ASPE) — CPA Canada Handbook Part II");
 const standardPrefix: "CAS" | "AU-C" = isUS ? "AU-C" : "CAS";

 const tb = isUS ? TB_US : TB_CA;
 const benchmark: keyof TB = "grossRevenue";
 const benchmarkLabel = "Gross Revenue";
 const benchmarkPct = 1; // 1% of gross revenue (matches default)
 const performanceMaterialityPct = 70; // 70% of overall materiality
 const clearlyTrivialPct = 5; // 5% of overall materiality

 const overallMateriality = (tb[benchmark] * benchmarkPct) / 100;
 const performanceMateriality = (overallMateriality * performanceMaterialityPct) / 100;
 const clearlyTrivial = (overallMateriality * clearlyTrivialPct) / 100;

 return {
 engagementId: id,
 isUS,
 entityName,
 periodEnd,
 periodEndDisplay: formatPeriodDisplay(periodEnd),
 framework,
 standardPrefix,
 tb,
 benchmark,
 benchmarkLabel,
 benchmarkPct,
 performanceMaterialityPct,
 clearlyTrivialPct,
 overallMateriality,
 performanceMateriality,
 clearlyTrivial,
 fsas: isUS ? FSA_US : FSA_CA,
 revenueStreams: isUS ? REVENUE_STREAMS_US : REVENUE_STREAMS_CA,
 team: isUS ? TEAM_US : TEAM_CA,
 };
}
