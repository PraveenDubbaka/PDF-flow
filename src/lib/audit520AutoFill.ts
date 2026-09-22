// ─────────────────────────────────────────────────────────────────────────────
// Audit 520 Auto-Fill Bridge
// Reads identified risks from Forms 510, 513, 515, and 525 and produces
// candidate PartA / PartB rows for the Risk Register.
//
// Rows are given stable `auto-{source}-{id}` prefixes so they can be merged
// idempotently on each load without duplicating or clobbering user edits.
// ─────────────────────────────────────────────────────────────────────────────

import { readJsonFromLocalStorage } from "@/lib/safeJson";

// Local row shapes — mirror PartARow / PartBRow in Audit520Worksheet.tsx
// (not imported to avoid circular dependencies)

interface AutoPartARow {
 id: string;
 wpRefSource: { name: string }[];
 rmmIdentified: string;
 fraudRisk: string;
 rmmAssessment: string;
 auditResponse: string;
 wpRef: { name: string }[];
}

interface AutoPartBRow {
 id: string;
 wpRefSource: { name: string }[];
 rmmIdentified: string;
 scotabd: string;
 assertions: string;
 irFactors: string;
 fraudRisk: string;
 irLikelihood: string;
 irMagnitude: string;
 inherentRisk: string;
 significantRisk: string;
 substantiveSufficient: string;
}

interface AutoFillResult {
 partARows: AutoPartARow[];
 partBRows: AutoPartBRow[];
}

// ── 510 Entity Understanding ─────────────────────────────────────────────────

function from510(engagementId: string): AutoFillResult {
 const data = readJsonFromLocalStorage<Record<string, unknown>>(
 `audit-510-data-v2-${engagementId}`,
 {}
 );
 const partARows: AutoPartARow[] = [];

 // Use overall conclusion as the primary FS-level risk indicator
 const overall = typeof data.overallConclusion === "string"
 ? data.overallConclusion.trim()
 : "";
 if (overall) {
 partARows.push({
 id: "auto-510-overall",
 wpRefSource: [{ name: "510" }],
 rmmIdentified: `Entity understanding — inherent risk factors: ${overall}`,
 fraudRisk: "",
 rmmAssessment: "",
 auditResponse: "",
 wpRef: [],
 });
 }

 // Performance incentives / management bias (fraud risk indicator)
 const perfIncentives =
 typeof data.perfIncentives === "object" && data.perfIncentives !== null
 ? (data.perfIncentives as { response?: string }).response ?? ""
 : "";
 if (perfIncentives.trim()) {
 partARows.push({
 id: "auto-510-perfIncentives",
 wpRefSource: [{ name: "510-B" }],
 rmmIdentified: `Management incentives / bias risk: ${perfIncentives.trim()}`,
 fraudRisk: "Y",
 rmmAssessment: "",
 auditResponse: "",
 wpRef: [],
 });
 }

 return { partARows, partBRows: [] };
}

// ── 513 Accounting Estimates ──────────────────────────────────────────────────

interface Estimate513 {
 id: string;
 name: string;
 fsArea: string;
 selected: boolean;
 complex: string;
 scotabd: string;
}

function from513(engagementId: string): AutoFillResult {
 const data = readJsonFromLocalStorage<{ estimates?: Estimate513[] }>(
 `audit-513-data-v2-${engagementId}`,
 {}
 );
 const partBRows: AutoPartBRow[] = [];

 for (const est of data.estimates ?? []) {
 if (!est.selected) continue;
 const isComplex = est.complex === "Y";
 const isScoTabd = est.scotabd === "Y";
 if (!isComplex && !isScoTabd) continue;

 partBRows.push({
 id: `auto-513-est-${est.id}`,
 wpRefSource: [{ name: "513" }],
 rmmIdentified: `Accounting estimate — ${est.name}${isComplex ? ": complex/judgmental estimate with increased inherent risk" : ""}`,
 scotabd: est.fsArea || est.name,
 assertions: "AV",
 irFactors: isComplex
 ? "Management judgment required; estimation uncertainty; limited objective audit evidence."
 : "",
 fraudRisk: "",
 irLikelihood: isComplex ? "M" : "",
 irMagnitude: isComplex ? "M" : "",
 inherentRisk: isComplex ? "M" : "",
 significantRisk: isScoTabd ? "Y" : "",
 substantiveSufficient: isScoTabd ? "N" : "",
 });
 }

 return { partARows: [], partBRows };
}

// ── 515 Related Parties ───────────────────────────────────────────────────────

interface Party515 {
 id: string;
 name: string;
 relationship: string;
 reasons: string;
}

function from515(engagementId: string): AutoFillResult {
 const data = readJsonFromLocalStorage<{
 parties?: Party515[];
 s4b?: { response?: string };
 }>(`audit-515-data-v1-${engagementId}`, {});

 const partARows: AutoPartARow[] = [];
 const partBRows: AutoPartBRow[] = [];

 // s4b — auditor's documented RMM conclusion
 const s4bText = (data.s4b?.response ?? "").trim();
 if (s4bText) {
 partARows.push({
 id: "auto-515-s4b",
 wpRefSource: [{ name: "515-4b" }],
 rmmIdentified: `Related parties — documented risk of material misstatement: ${s4bText}`,
 fraudRisk: "Y",
 rmmAssessment: "",
 auditResponse: "",
 wpRef: [],
 });
 }

 // Individual related parties with documented reasons
 for (const party of data.parties ?? []) {
 if (!party.reasons?.trim()) continue;
 partBRows.push({
 id: `auto-515-party-${party.id}`,
 wpRefSource: [{ name: "515" }],
 rmmIdentified: `Related party — ${party.name} (${party.relationship}): ${party.reasons.trim()}`,
 scotabd: "Related party disclosures",
 assertions: "C, AV",
 irFactors:
 "Non-arm's-length transaction risk; incomplete or inadequate disclosure risk; management bias susceptibility.",
 fraudRisk: "Y",
 irLikelihood: "M",
 irMagnitude: "M",
 inherentRisk: "M",
 significantRisk: "",
 substantiveSufficient: "",
 });
 }

 return { partARows, partBRows };
}

// ── 525 Going Concern ────────────────────────────────────────────────────────

const GC_CATEGORY_LABELS: Record<string, string> = {
 A1: "Going concern — financing / cash flow challenges identified",
 A2: "Going concern — adverse market conditions identified",
 A3: "Going concern — regulatory / legal challenges identified",
 A4: "Going concern — other events or conditions identified",
};

function from525(): AutoFillResult {
 interface GcQuestion { id?: string; answer?: string }
 interface GcChecklist {
 id: string;
 sections?: Array<{ questions?: GcQuestion[] }>;
 }

 const checklists = readJsonFromLocalStorage<GcChecklist[]>("savedChecklists", []);
 const gc = checklists.find(c => c.id === "default-audit-ra-525");
 if (!gc) return { partARows: [], partBRows: [] };

 const triggered = new Set<string>();
 for (const section of gc.sections ?? []) {
 for (const q of section.questions ?? []) {
 if (q.answer !== "yes") continue;
 const qid = q.id ?? "";
 if (qid.includes("-A1")) triggered.add("A1");
 else if (qid.includes("-A2")) triggered.add("A2");
 else if (qid.includes("-A3")) triggered.add("A3");
 else if (qid.includes("-A4")) triggered.add("A4");
 }
 }

 return {
 partARows: [...triggered].map(cat => ({
 id: `auto-525-${cat}`,
 wpRefSource: [{ name: `525-${cat}` }],
 rmmIdentified: GC_CATEGORY_LABELS[cat],
 fraudRisk: "",
 rmmAssessment: "H",
 auditResponse: "Refer — Going Concern Final Assessment.",
 wpRef: [{ name: "625" }],
 })),
 partBRows: [],
 };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Collect candidate risk rows from all four source worksheets. */
export function buildAutoFillRows(engagementId: string): AutoFillResult {
 const sources = [
 from510(engagementId),
 from513(engagementId),
 from515(engagementId),
 from525(),
 ];
 return {
 partARows: sources.flatMap(s => s.partARows),
 partBRows: sources.flatMap(s => s.partBRows),
 };
}

/**
 * Merge auto-fill rows into existing 520 data.
 *
 * Rules:
 * - Rows with a matching `auto-` id already in `data` are kept as-is
 * (the auditor may have edited assessment fields — preserve those edits).
 * - New auto rows (not yet in data) are appended.
 * - Stale auto rows (previously added but no longer generated by sources) are removed.
 */
export function mergeAutoFill<
 A extends { id: string },
 B extends { id: string },
>(
 data: { partARows: A[]; partBRows: B[] },
 auto: AutoFillResult
): { partARows: (A | AutoPartARow)[]; partBRows: (B | AutoPartBRow)[] } {
 const freshAIds = new Set(auto.partARows.map(r => r.id));
 const freshBIds = new Set(auto.partBRows.map(r => r.id));
 const existingAIds = new Set(data.partARows.map(r => r.id));
 const existingBIds = new Set(data.partBRows.map(r => r.id));

 // Remove stale auto rows; keep manual rows and user-edited auto rows
 const filteredA = data.partARows.filter(
 r => !r.id.startsWith("auto-") || freshAIds.has(r.id)
 );
 const filteredB = data.partBRows.filter(
 r => !r.id.startsWith("auto-") || freshBIds.has(r.id)
 );

 // Append newly generated auto rows
 const newA = auto.partARows.filter(r => !existingAIds.has(r.id));
 const newB = auto.partBRows.filter(r => !existingBIds.has(r.id));

 return {
 partARows: [...filteredA,...newA],
 partBRows: [...filteredB,...newB],
 };
}
