// ─────────────────────────────────────────────────────────────────────────────
// Audit 520 Bridge — read RMM data (Risk Assessment Summary)
// for downstream Response-to-Risk worksheets (605, 610, 625, 630, 635, 645).
// ─────────────────────────────────────────────────────────────────────────────

import { readJsonFromLocalStorage } from "@/lib/safeJson";

export interface Risk520Row {
 ref: string; // wpRefSource (e.g. "510-3", "510-5", "515-5")
 rmmIdentified: string;
 scotabd?: string; // financial-statement area (Part B)
 assertions?: string;
 fraudRisk?: "Y" | "N" | "";
 inherentRisk?: "H" | "M" | "L" | "";
 significantRisk?: "Y" | "N" | "";
 source: "A" | "B"; // Part A (FS-level) / Part B (assertion-level)
}

interface Stored520 {
 partARows?: Array<{
 wpRefSource?: { name: string }[];
 rmmIdentified?: string;
 fraudRisk?: string;
 rmmAssessment?: string;
 }>;
 partBRows?: Array<{
 wpRefSource?: { name: string }[];
 rmmIdentified?: string;
 scotabd?: string;
 assertions?: string;
 fraudRisk?: string;
 inherentRisk?: string;
 significantRisk?: string;
 }>;
}

export function loadRisks520(engagementId: string | undefined): Risk520Row[] {
 const key = `audit-520-data-${engagementId ?? "default"}`;
 const raw = readJsonFromLocalStorage<Stored520>(key, {});
 if (!raw) return [];
 const out: Risk520Row[] = [];
 for (const r of raw.partARows ?? []) {
 out.push({
 ref: r.wpRefSource?.[0]?.name ?? "—",
 rmmIdentified: r.rmmIdentified ?? "",
 fraudRisk: (r.fraudRisk as "Y" | "N" | "") ?? "",
 inherentRisk: (r.rmmAssessment as "H" | "M" | "L" | "") ?? "",
 source: "A",
 });
 }
 for (const r of raw.partBRows ?? []) {
 out.push({
 ref: r.wpRefSource?.[0]?.name ?? "—",
 rmmIdentified: r.rmmIdentified ?? "",
 scotabd: r.scotabd,
 assertions: r.assertions,
 fraudRisk: (r.fraudRisk as "Y" | "N" | "") ?? "",
 inherentRisk: (r.inherentRisk as "H" | "M" | "L" | "") ?? "",
 significantRisk: (r.significantRisk as "Y" | "N" | "") ?? "",
 source: "B",
 });
 }
 return out;
}

/** Highest assessment across Part A + Part B (used for overall FS-level risk). */
export function overallRisk520(rows: Risk520Row[]): "High" | "Moderate" | "Low" {
 const has = (l: "H" | "M" | "L") =>
 rows.some(r => r.inherentRisk === l) ||
 rows.some(r => r.significantRisk === "Y" && l === "H");
 if (has("H")) return "High";
 if (has("M")) return "Moderate";
 return "Low";
}

/** Risks filtered by topic keyword (case-insensitive substring match on rmm/scotabd). */
export function filterRisks(rows: Risk520Row[], keywords: string[]): Risk520Row[] {
 const kws = keywords.map(k => k.toLowerCase());
 return rows.filter(r => {
 const hay = `${r.rmmIdentified} ${r.scotabd ?? ""}`.toLowerCase();
 return kws.some(k => hay.includes(k));
 });
}
