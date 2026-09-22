// ─────────────────────────────────────────────────────────────────────────────
// Audit 625 Bridge — exposes the Going-Concern Evaluation conclusions
// (material uncertainty, GC basis appropriateness, auditor's report
// implication) for downstream consumers (Form 700 — Auditor's Report,
// — Communication with TCWG, — Wrap-up).
// ─────────────────────────────────────────────────────────────────────────────

import { readJsonFromLocalStorage } from "@/lib/safeJson";

export type YN = "Y" | "N" | "";
export type YNNA = YN | "N/A";

export type ReportImplication =
 | "unmodified"
 | "unmodified-mu-paragraph"
 | "qualified"
 | "adverse"
 | "";

export interface Audit625Conclusion {
 materialUncertainty: YN;
 goingConcernBasisAppropriate: YN;
 disclosuresAdequate: YNNA;
 reportImplication: ReportImplication;
 concluded: boolean;
 concludedOn: string;
}

interface Stored625 {
 materialUncertainty?: YN;
 goingConcernBasisAppropriate?: YN;
 disclosuresAdequate?: YNNA;
 reportImplication?: ReportImplication;
 concluded?: boolean;
 concludedOn?: string;
}

export function loadGoingConcernConclusion(
 engagementId: string | undefined,
): Audit625Conclusion {
 const key = `audit-625-data-${engagementId ?? "default"}`;
 const raw = readJsonFromLocalStorage<Stored625>(key, {}) ?? {};
 return {
 materialUncertainty: raw.materialUncertainty ?? "",
 goingConcernBasisAppropriate: raw.goingConcernBasisAppropriate ?? "",
 disclosuresAdequate: raw.disclosuresAdequate ?? "",
 reportImplication: raw.reportImplication ?? "",
 concluded: !!raw.concluded,
 concludedOn: raw.concludedOn ?? "",
 };
}

export const REPORT_IMPLICATION_LABEL: Record<Exclude<ReportImplication, "">, string> = {
 "unmodified": "Unmodified opinion — no material uncertainty",
 "unmodified-mu-paragraph": "Unmodified opinion + Material Uncertainty Related to Going Concern paragraph",
 "qualified": "Qualified opinion — inadequate disclosure",
 "adverse": "Adverse opinion — going-concern basis inappropriate or disclosure inadequate",
};
