// ─────────────────────────────────────────────────────────────────────────────
// Audit 645 Bridge — exposes Litigation / Claims / Non-Compliance (CAS 250 /
// CAS 501) conclusions and identified matters for downstream consumers
// (Form 520 RMM reassessment, TCWG communications,
// representations, Auditor's Report, wrap-up,
// estimates impact).
// ─────────────────────────────────────────────────────────────────────────────

import { readJsonFromLocalStorage } from "@/lib/safeJson";

export type YN = "Y" | "N" | "";
export type YNNA = YN | "N/A";

export type MatterType = "Litigation" | "Claim" | "Non-compliance";
export type MatterStatus = "Open" | "Threatened" | "Settled" | "Closed" | "Unknown" | "";
export type CounselStatus = "Not required" | "Letter sent" | "Reply received" | "Reply outstanding" | "Refused by mgmt" | "";

export interface LcncMatter {
 id: string;
 type: MatterType;
 description: string;
 counterparty: string;
 status: MatterStatus;
 amount: string; // exposure / claim amount
 counselStatus: CounselStatus;
 fsImpact: string; // recognised / disclosed / none
 disclosureAdequate: YNNA;
 affectsEstimate: YN; // feeds
}

export interface Audit645Conclusion {
 matters: LcncMatter[];
 nonComplianceIdentified: YN;
 rmmReassessmentNeeded: YN;
 reportModificationConsidered: YN;
 tcwgCommunicated: YN;
 evidenceSufficient: YN;
 concluded: boolean;
 concludedOn: string;
}

interface Stored645 {
 matters?: LcncMatter[];
 nonComplianceIdentified?: YN;
 rmmReassessmentNeeded?: YN;
 reportModificationConsidered?: YN;
 tcwgCommunicated?: YN;
 evidenceSufficient?: YN;
 concluded?: boolean;
 concludedOn?: string;
}

export function loadLcncConclusion(
 engagementId: string | undefined,
): Audit645Conclusion {
 const key = `audit-645-data-${engagementId ?? "default"}`;
 const raw = readJsonFromLocalStorage<Stored645>(key, {}) ?? {};
 return {
 matters: Array.isArray(raw.matters) ? raw.matters : [],
 nonComplianceIdentified: raw.nonComplianceIdentified ?? "",
 rmmReassessmentNeeded: raw.rmmReassessmentNeeded ?? "",
 reportModificationConsidered: raw.reportModificationConsidered ?? "",
 tcwgCommunicated: raw.tcwgCommunicated ?? "",
 evidenceSufficient: raw.evidenceSufficient ?? "",
 concluded: !!raw.concluded,
 concludedOn: raw.concludedOn ?? "",
 };
}

/** Keywords used by → 645 to identify LCNC-related risks. */
export const LCNC_RISK_KEYWORDS = [
 "litigation", "claim", "legal", "lawsuit", "lawyer", "counsel",
 "compliance", "non-compliance", "regulator", "regulatory",
 "fine", "penalt", "sanction", "investigation",
];
