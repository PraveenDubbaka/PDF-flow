// ─────────────────────────────────────────────────────────────────────────────
// Audit 635 Bridge — exposes Accounting-Estimate (CAS 540) conclusions for
// downstream consumers (Form 520 risk-reassessment, — Auditor's
// Report, — TCWG communication, — Wrap-up).
// ─────────────────────────────────────────────────────────────────────────────

import { readJsonFromLocalStorage } from "@/lib/safeJson";

export type YN = "Y" | "N" | "";
export type YNNA = YN | "N/A";

export interface Audit635Conclusion {
 estimateName: string;
 estimateAmount: string;
 rmmReassessmentAppropriate: YN;
 managementBiasIdentified: YN;
 presentationAppropriate: YNNA;
 evidenceSufficient: YN;
 concluded: boolean;
 concludedOn: string;
}

interface Stored635 {
 estimateName?: string;
 estimateAmount?: string;
 rmmReassessmentAppropriate?: YN;
 managementBiasIdentified?: YN;
 presentationAppropriate?: YNNA;
 evidenceSufficient?: YN;
 concluded?: boolean;
 concludedOn?: string;
}

export function loadEstimateConclusion(
 engagementId: string | undefined,
): Audit635Conclusion {
 const key = `audit-635-data-${engagementId ?? "default"}`;
 const raw = readJsonFromLocalStorage<Stored635>(key, {}) ?? {};
 return {
 estimateName: raw.estimateName ?? "",
 estimateAmount: raw.estimateAmount ?? "",
 rmmReassessmentAppropriate: raw.rmmReassessmentAppropriate ?? "",
 managementBiasIdentified: raw.managementBiasIdentified ?? "",
 presentationAppropriate: raw.presentationAppropriate ?? "",
 evidenceSufficient: raw.evidenceSufficient ?? "",
 concluded: !!raw.concluded,
 concludedOn: raw.concludedOn ?? "",
 };
}

/** Keywords used by → 635 to identify estimate-related risks. */
export const ESTIMATE_RISK_KEYWORDS = [
 "estimate", "allowance", "provision", "valuation", "impairment",
 "obsolesc", "fair value", "useful life", "depreciation", "amortiz",
 "accrual", "warranty", "litigation",
];
