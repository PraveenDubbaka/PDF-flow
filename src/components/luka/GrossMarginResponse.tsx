import { useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, LayoutGrid, BarChart3 } from "lucide-react";
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
 Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";

/* ── Annual data ── */

const revenueRows = [
 { name: "Product", cy: "4,800.00", cyPct: "63.4", py1: "4,250.00", py1Pct: "63.3", py2: "3,700.00", py2Pct: "63.8", vs: "+12.9" },
 { name: "Services", cy: "1,950.00", cyPct: "25.8", py1: "1,720.00", py1Pct: "25.6", py2: "1,480.00", py2Pct: "25.5", vs: "+13.4" },
 { name: "Licenses", cy: "820.00", cyPct: "10.8", py1: "740.00", py1Pct: "11.0", py2: "620.00", py2Pct: "10.7", vs: "+10.8" },
];
const revenueTotals = { name: "Total Revenue", cy: "7,570.00", py1: "6,710.00", py2: "5,800.00", vs: "+12.8" };

const cosRows = [
 { name: "Cost of goods sold", cy: "2,650.00", cyPct: "35.0", py1: "2,400.00", py1Pct: "35.8", py2: "2,150.00", py2Pct: "37.1", vs: "+10.4" },
 { name: "Direct labour", cy: "780.00", cyPct: "10.3", py1: "720.00", py1Pct: "10.7", py2: "660.00", py2Pct: "11.4", vs: "+8.3" },
 { name: "Manufacturing OH", cy: "430.00", cyPct: "5.7", py1: "390.00", py1Pct: "5.8", py2: "350.00", py2Pct: "6.0", vs: "+10.3" },
];
const cosTotals = { name: "Total COS", cy: "3,860.00", py1: "3,510.00", py2: "3,160.00", vs: "+10.0" };

const marginRows = [
 { name: "Total Revenue", cy: "7,570.00", cyPct: "-", py1: "6,710.00", py1Pct: "-", py2: "5,800.00", py2Pct: "-", vs: "+12.9" },
 { name: "Cost of Sales", cy: "3,860.00", cyPct: "-", py1: "3,510.00", py1Pct: "-", py2: "3,160.00", py2Pct: "-", vs: "+13.4" },
];
const marginTotals = { name: "Gross Margin", cy: "3,710.00", cyPct: "49.0", py1: "3,200.00", py1Pct: "47.7", py2: "2,640.00", py2Pct: "45.5", vs: "+15.9" };

/* ── Quarterly data ── */

const quarterlyRows = [
 { period: "Q1", cyRev: "1,780.00", cyCos: "920.00", cyGm: "860.00", cyGmPct: "48.3", py1Gm: "740.00", py1GmPct: "46.8", py2Gm: "610.00", py2GmPct: "44.9" },
 { period: "Q2", cyRev: "1,960.00", cyCos: "980.00", cyGm: "980.00", cyGmPct: "50.0", py1Gm: "840.00", py1GmPct: "48.6", py2Gm: "690.00", py2GmPct: "46.3" },
 { period: "Q3", cyRev: "2,020.00", cyCos: "1,000.00", cyGm: "1,020.00", cyGmPct: "50.5", py1Gm: "870.00", py1GmPct: "48.6", py2Gm: "720.00", py2GmPct: "46.5" },
 { period: "Q4", cyRev: "1,810.00", cyCos: "960.00", cyGm: "850.00", cyGmPct: "47.0", py1Gm: "750.00", py1GmPct: "46.6", py2Gm: "620.00", py2GmPct: "43.8" },
];
const quarterlyTotals = { period: "Total Full Year", cyRev: "7,570.00", cyCos: "3,860.00", cyGm: "3,710.00", cyGmPct: "49.0", py1Gm: "3,200.00", py1GmPct: "-", py2Gm: "2,640.00", py2GmPct: "-" };

/* ── Monthly data ── */

const monthlyRows = [
 { period: "Jan", cyRev: "570.00", cyCos: "298.00", cyGm: "272.00", cyGmPct: "47.7", py1Rev: "505.00", py1Cos: "270.00", py1Gm: "235.00", py1GmPct: "46.5", py2Rev: "435.00", py2Cos: "242.00", py2Gm: "193.00", py2GmPct: "44.4" },
 { period: "Feb", cyRev: "580.00", cyCos: "300.00", cyGm: "280.00", cyGmPct: "48.3", py1Rev: "515.00", py1Cos: "274.00", py1Gm: "241.00", py1GmPct: "46.8", py2Rev: "440.00", py2Cos: "244.00", py2Gm: "196.00", py2GmPct: "44.5" },
 { period: "Mar", cyRev: "630.00", cyCos: "322.00", cyGm: "308.00", cyGmPct: "48.9", py1Rev: "560.00", py1Cos: "296.00", py1Gm: "264.00", py1GmPct: "47.1", py2Rev: "485.00", py2Cos: "264.00", py2Gm: "221.00", py2GmPct: "45.6" },
 { period: "Apr", cyRev: "640.00", cyCos: "320.00", cyGm: "320.00", cyGmPct: "50.0", py1Rev: "570.00", py1Cos: "294.00", py1Gm: "276.00", py1GmPct: "48.4", py2Rev: "490.00", py2Cos: "264.00", py2Gm: "226.00", py2GmPct: "46.1" },
 { period: "May", cyRev: "660.00", cyCos: "330.00", cyGm: "330.00", cyGmPct: "50.0", py1Rev: "580.00", py1Cos: "298.00", py1Gm: "282.00", py1GmPct: "48.6", py2Rev: "500.00", py2Cos: "268.00", py2Gm: "232.00", py2GmPct: "46.4" },
 { period: "Jun", cyRev: "660.00", cyCos: "330.00", cyGm: "330.00", cyGmPct: "50.0", py1Rev: "580.00", py1Cos: "298.00", py1Gm: "282.00", py1GmPct: "48.6", py2Rev: "500.00", py2Cos: "268.00", py2Gm: "232.00", py2GmPct: "46.4" },
 { period: "Jul", cyRev: "680.00", cyCos: "336.00", cyGm: "344.00", cyGmPct: "50.6", py1Rev: "600.00", py1Cos: "308.00", py1Gm: "292.00", py1GmPct: "48.7", py2Rev: "520.00", py2Cos: "278.00", py2Gm: "242.00", py2GmPct: "46.5" },
 { period: "Aug", cyRev: "670.00", cyCos: "332.00", cyGm: "338.00", cyGmPct: "50.4", py1Rev: "595.00", py1Cos: "305.00", py1Gm: "290.00", py1GmPct: "48.7", py2Rev: "515.00", py2Cos: "275.00", py2Gm: "240.00", py2GmPct: "46.6" },
 { period: "Sep", cyRev: "680.00", cyCos: "336.00", cyGm: "344.00", cyGmPct: "50.6", py1Rev: "600.00", py1Cos: "308.00", py1Gm: "292.00", py1GmPct: "48.7", py2Rev: "520.00", py2Cos: "278.00", py2Gm: "242.00", py2GmPct: "46.5" },
 { period: "Oct", cyRev: "660.00", cyCos: "328.00", cyGm: "332.00", cyGmPct: "50.3", py1Rev: "590.00", py1Cos: "304.00", py1Gm: "286.00", py1GmPct: "48.5", py2Rev: "510.00", py2Cos: "274.00", py2Gm: "236.00", py2GmPct: "46.3" },
 { period: "Nov", cyRev: "620.00", cyCos: "328.00", cyGm: "292.00", cyGmPct: "47.1", py1Rev: "550.00", py1Cos: "294.00", py1Gm: "256.00", py1GmPct: "46.5", py2Rev: "475.00", py2Cos: "264.00", py2Gm: "211.00", py2GmPct: "44.4" },
 { period: "Dec", cyRev: "590.00", cyCos: "314.00", cyGm: "276.00", cyGmPct: "46.8", py1Rev: "535.00", py1Cos: "286.00", py1Gm: "249.00", py1GmPct: "46.5", py2Rev: "465.00", py2Cos: "260.00", py2Gm: "205.00", py2GmPct: "44.1" },
];
const monthlyTotals = { period: "Total", cyRev: "7,570.00", cyCos: "3,860.00", cyGm: "3,710.00", cyGmPct: "49.0", py1Rev: "6,710.00", py1Cos: "3,510.00", py1Gm: "3,200.00", py1GmPct: "47.7", py2Rev: "5,800.00", py2Cos: "3,160.00", py2Gm: "2,640.00", py2GmPct: "45.5" };

const qColsFull = ["Period ↓", "2025 Revenue", "2025 COS", "2025 GM", "2025 GM (%)", "2024 GM", "2024 GM (%)", "2023 GM", "2023 GM (%)"];

const colsFull = ["Account Name ↓", "2025", "2024", "2023", "Change (%)"];

function LukaIcon({ size = 16 }: { size?: number }) {
 return <Zap className="text-white" size={size} fill="white" strokeWidth={0} />;
}

/* ── Merged Revenue + Cost of Sales Table ── */
function RevenueCosTable({ visible }: { visible: boolean }) {
 if (!visible) return null;
 const colCount = colsFull.length;

 return (
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm min-w-0">
 <div className="overflow-x-auto">
 <table className="w-full text-base">
 <thead>
 <tr className="border-b border-[hsl(210_25%_82%)] bg-[hsl(210_40%_96%)]">
 {colsFull.map((c) => (
 <th key={c} className={cn("px-4 py-2.5 font-medium text-[#101D28] whitespace-nowrap", c === "Account Name ↓" ? "text-left" : "text-right")}>
 {c}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {/* Revenue section */}
 <tr className="bg-[hsl(210_40%_96%)]">
 <td colSpan={colCount} className="px-4 py-2.5 text-base font-semibold text-foreground">Revenue</td>
 </tr>
 {revenueRows.map((r) => (
 <tr key={r.name} className="border-b border-[hsl(210_25%_82%)]/50 hover:bg-muted/20 transition-colors">
 <td className="px-4 py-2.5 text-foreground">{r.name}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.cy}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py1}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py2}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.vs}</td>
 </tr>
 ))}
 <tr className="bg-muted/30 font-semibold border-b border-[hsl(210_25%_82%)]">
 <td className="px-4 py-2.5 text-black">{revenueTotals.name}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{revenueTotals.cy}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{revenueTotals.py1}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{revenueTotals.py2}</td>
 <td className="px-4 py-2.5 text-right text-black font-semibold tabular-nums">{revenueTotals.vs}</td>
 </tr>

 {/* Cost of Sales section */}
 <tr className="bg-[hsl(210_40%_96%)]">
 <td colSpan={colCount} className="px-4 py-2.5 text-base font-semibold text-foreground">Cost of Sales</td>
 </tr>
 {cosRows.map((r) => (
 <tr key={r.name} className="border-b border-[hsl(210_25%_82%)]/50 hover:bg-muted/20 transition-colors">
 <td className="px-4 py-2.5 text-foreground">{r.name}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.cy}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py1}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py2}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.vs}</td>
 </tr>
 ))}
 <tr className="bg-muted/30 font-semibold">
 <td className="px-4 py-2.5 text-black">{cosTotals.name}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{cosTotals.cy}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{cosTotals.py1}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{cosTotals.py2}</td>
 <td className="px-4 py-2.5 text-right text-black font-semibold tabular-nums">{cosTotals.vs}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 );
}

/* ── Gross Margin Summary Table (standalone) ── */
function GrossMarginSummaryTable({ visible }: { visible: boolean }) {
 if (!visible) return null;

 return (
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm min-w-0">
 <div className="px-4 py-3 bg-[hsl(210_40%_96%)]">
 <span className="text-base font-semibold text-foreground">Gross Margin Summary</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-base">
 <thead>
 <tr className="border-b border-[hsl(210_25%_82%)] bg-[hsl(210_40%_96%)]">
 {colsFull.map((c) => (
 <th key={c} className={cn("px-4 py-2.5 font-medium text-[#101D28] whitespace-nowrap", c === "Account Name ↓" ? "text-left" : "text-right")}>
 {c}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {marginRows.map((r) => (
 <tr key={r.name} className="border-b border-[hsl(210_25%_82%)]/50 hover:bg-muted/20 transition-colors">
 <td className="px-4 py-2.5 text-foreground">{r.name}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.cy}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py1}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.py2}</td>
 <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{r.vs}</td>
 </tr>
 ))}
 <tr className="bg-muted/30 font-semibold">
 <td className="px-4 py-2.5 text-black">{marginTotals.name}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{marginTotals.cy}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{marginTotals.py1}</td>
 <td className="px-4 py-2.5 text-right text-black tabular-nums">{marginTotals.py2}</td>
 <td className="px-4 py-2.5 text-right text-black font-semibold tabular-nums">{marginTotals.vs}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 );
}

/* ── Quarterly Table section (inverted: quarters as columns, metrics as rows) ── */
function QuarterlyTable({ visible }: { visible: boolean }) {
 if (!visible) return null;

 const qCols = ["", "Q1", "Q2", "Q3", "Q4", "Total"];

 const metricRows = [
 {
 label: "Revenue",
 values: quarterlyRows.map((r) => r.cyRev),
 total: quarterlyTotals.cyRev,
 },
 {
 label: "Cost of Sales",
 values: quarterlyRows.map((r) => r.cyCos),
 total: quarterlyTotals.cyCos,
 },
 {
 label: "Gross Margin",
 values: quarterlyRows.map((r) => r.cyGm),
 total: quarterlyTotals.cyGm,
 bold: true,
 },
 {
 label: "GM %",
 values: quarterlyRows.map((r) => `${r.cyGmPct}%`),
 total: `${quarterlyTotals.cyGmPct}%`,
 bold: true,
 },
 ];

 return (
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm min-w-0">
 <div className="px-4 py-3 bg-[hsl(210_40%_96%)]">
 <span className="text-base font-semibold text-foreground">Quarterly Breakdown — 2025</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-base">
 <thead>
 <tr className="border-b border-[hsl(210_25%_82%)] bg-[hsl(210_40%_96%)]">
 {qCols.map((c, i) => (
 <th key={i} className={cn("px-4 py-2.5 font-medium text-[#101D28] whitespace-nowrap", i === 0 ? "text-left" : "text-right")}>
 {c}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {metricRows.map((row) => (
 <tr key={row.label} className={cn(
 "border-b border-[hsl(210_25%_82%)]/50 hover:bg-muted/20 transition-colors",
 row.bold && "bg-muted/30 font-semibold"
 )}>
 <td className="px-4 py-2.5 text-foreground">{row.label}</td>
 {row.values.map((v, i) => (
 <td key={i} className="px-4 py-2.5 text-right text-foreground tabular-nums">{v}</td>
 ))}
 <td className="px-4 py-2.5 text-right text-black font-semibold tabular-nums">{row.total}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}

/* ── Monthly Table section (inverted: months as columns, metrics as rows) ── */
function MonthlyTable({ visible }: { visible: boolean }) {
 if (!visible) return null;

 const mCols = ["",...monthlyRows.map((r) => r.period), "Total"];

 const metricRows2025 = [
 { label: "Revenue (2025)", values: monthlyRows.map((r) => r.cyRev), total: monthlyTotals.cyRev },
 { label: "COS (2025)", values: monthlyRows.map((r) => r.cyCos), total: monthlyTotals.cyCos },
 { label: "GM (2025)", values: monthlyRows.map((r) => r.cyGm), total: monthlyTotals.cyGm, bold: true },
 { label: "GM % (2025)", values: monthlyRows.map((r) => `${r.cyGmPct}%`), total: `${monthlyTotals.cyGmPct}%`, bold: true },
 ];
 const metricRows2024 = [
 { label: "Revenue (2024)", values: monthlyRows.map((r) => r.py1Rev), total: monthlyTotals.py1Rev },
 { label: "COS (2024)", values: monthlyRows.map((r) => r.py1Cos), total: monthlyTotals.py1Cos },
 { label: "GM (2024)", values: monthlyRows.map((r) => r.py1Gm), total: monthlyTotals.py1Gm, bold: true },
 { label: "GM % (2024)", values: monthlyRows.map((r) => `${r.py1GmPct}%`), total: `${monthlyTotals.py1GmPct}%`, bold: true },
 ];
 const metricRows2023 = [
 { label: "Revenue (2023)", values: monthlyRows.map((r) => r.py2Rev), total: monthlyTotals.py2Rev },
 { label: "COS (2023)", values: monthlyRows.map((r) => r.py2Cos), total: monthlyTotals.py2Cos },
 { label: "GM (2023)", values: monthlyRows.map((r) => r.py2Gm), total: monthlyTotals.py2Gm, bold: true },
 { label: "GM % (2023)", values: monthlyRows.map((r) => `${r.py2GmPct}%`), total: `${monthlyTotals.py2GmPct}%`, bold: true },
 ];

 const allGroups = [
 { year: "2025", rows: metricRows2025 },
 { year: "2024", rows: metricRows2024 },
 { year: "2023", rows: metricRows2023 },
 ];

 return (
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm min-w-0">
 <div className="px-4 py-3 bg-[hsl(210_40%_96%)]">
 <span className="text-base font-semibold text-foreground">Monthly Breakdown — All Years</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-base">
 <thead>
 <tr className="border-b border-[hsl(210_25%_82%)] bg-[hsl(210_40%_96%)]">
 {mCols.map((c, i) => (
 <th key={i} className={cn("px-3 py-2.5 font-medium text-[#101D28] whitespace-nowrap", i === 0 ? "text-left" : "text-right")}>
 {c}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {allGroups.map((group) => (
 group.rows.map((row) => (
 <tr key={row.label} className={cn(
 "border-b border-[hsl(210_25%_82%)]/50 hover:bg-muted/20 transition-colors",
 row.bold && "bg-muted/30 font-semibold"
 )}>
 <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{row.label}</td>
 {row.values.map((v, i) => (
 <td key={i} className="px-3 py-2.5 text-right text-foreground tabular-nums">{v}</td>
 ))}
 <td className="px-3 py-2.5 text-right text-black font-semibold tabular-nums">{row.total}</td>
 </tr>
 ))
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}

const summaryText = `Gross margin has demonstrated a consistent upward trajectory over the three-year period, improving from 45.5% in 2023 to 47.7% in 2024 and reaching 49.0% in 2025 — a cumulative improvement of +350 basis points.`;

const keyDrivers = [
 "Revenue growth outpaced COGS growth across all three years. 2025 revenue grew +12.8% vs 2024, while COGS increased only +10.0%, creating favorable margin expansion.",
 "Product revenue remains the dominant contributor at 63.4% of total revenue, growing +12.9% YoY. This high-margin segment continues to drive overall margin improvement.",
 "Direct labour costs as a percentage of revenue declined from 11.4% (2023) to 10.3% (2025), suggesting improved operational efficiency and potentially better automation or workforce utilization.",
 "Manufacturing overhead has remained well-controlled at 5.7% of revenue in 2025, down from 6.0% in 2023, indicating effective cost management in production processes.",
];

const seasonality = [
 "Q2 and Q3 consistently deliver the strongest margins (50.0% and 50.5% in 2025), while Q4 shows mild seasonal pressure at 47.0%. Monthly trends reveal slight softness in January–February, with peak performance in July–August.",
];

const outlook = [
 "The positive margin trend is sustainable if revenue mix continues to favor product sales and operational efficiencies in labour and overhead are maintained. Key risk factors include potential input cost inflation and capacity constraints during peak quarters.",
];

/* ── Quarterly-specific summary ── */
const quarterlySummaryText = `Quarterly gross margin peaked in Q3 2025 at 50.5% ($1,020K) driven by the highest revenue quarter ($2,020K) with controlled cost of sales ($1,000K). Q2 followed closely at 50.0%, while Q4 dipped to 47.0% — the weakest quarter of the year.`;

const quarterlyKeyDrivers = [
 "Q3 spike to 50.5% was driven by peak seasonal revenue ($2,020K) while cost of sales remained proportionally lower at $1,000K (49.5% of revenue), suggesting better supplier pricing or product mix during summer months.",
 "Q4 decline to 47.0% reflects seasonal softening — revenue dropped to $1,810K while cost of sales stayed relatively elevated at $960K (53.0% of revenue), likely due to year-end inventory adjustments and lower-margin holiday promotions.",
 "Q1 to Q3 shows a clear upward trajectory from 48.3% → 50.0% → 50.5%, indicating improving operational leverage as revenue scales through the first three quarters.",
 "The $170K gap between the best quarter (Q3: $1,020K GM) and weakest quarter (Q4: $850K GM) highlights significant seasonality that should be factored into cash flow planning.",
];

const quarterlyOutlook = [
 "The Q4 margin compression is a recurring pattern — management should explore strategies to maintain pricing discipline and control promotional discounting in the final quarter. Shifting some Q4 costs to Q1 or negotiating better year-end supplier terms could help flatten the seasonal margin dip.",
];

/* ── Monthly-specific summary ── */
const monthlySummaryText = `Monthly gross margin peaked at 50.6% in July and September 2025, driven by the highest monthly revenues ($680K each) combined with well-controlled cost of sales ($336K). The weakest month was December at 46.8% ($276K GM), reflecting seasonal slowdown and year-end inventory adjustments. Across all three years, the mid-year months (Apr–Sep) consistently outperform, with 2025 showing the widest gap between peak and trough months.`;

const monthlyKeyDrivers = [
 "The Jul–Sep spike to 50.4–50.6% GM was driven by peak seasonal demand pushing revenue to $670–680K while COS remained proportionally lower, suggesting better purchasing leverage and higher-margin product mix during summer.",
 "Nov–Dec margin compression (47.1% → 46.8%) is caused by revenue declining to $620–590K while COS stayed elevated at $328–314K — likely due to holiday discounting, year-end clearance, and fixed overhead spread over lower volumes.",
 "Jan–Feb is the slowest start each year (47.7–48.3% in 2025), but margins ramp quickly through March (48.9%) into April (50.0%), indicating a reliable seasonal acceleration pattern.",
 "Year-over-year improvement is visible every single month: 2025 GM% exceeds 2024 by 1.2–1.9pp across all months, and 2024 exceeded 2023 by 2.1–2.4pp, confirming the structural margin expansion trend.",
];

const monthlyOutlook = [
 "The consistent mid-year margin peak presents an opportunity to front-load inventory purchases and negotiate supplier contracts in Q1 when costs are lower. Management should also investigate whether Dec–Jan softness can be mitigated through pricing adjustments or promotional timing shifts to protect margins during the seasonal trough.",
];

/* ── Luka Summary Component ── */
function LukaSummary({ visible, periodTab }: { visible: boolean; periodTab: "annual" | "quarterly" | "monthly" }) {
 if (!visible) return null;

 const isQuarterly = periodTab === "quarterly";
 const isMonthly = periodTab === "monthly";
 const activeSummary = isMonthly ? monthlySummaryText : isQuarterly ? quarterlySummaryText : summaryText;
 const activeDrivers = isMonthly ? monthlyKeyDrivers : isQuarterly ? quarterlyKeyDrivers : keyDrivers;
 const activeOutlook = isMonthly ? monthlyOutlook : isQuarterly ? quarterlyOutlook : outlook;

 return (
 <div className="border border-border rounded-lg bg-muted/20 p-5 space-y-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(265_80%_55%)] flex items-center justify-center">
 <LukaIcon size={12} />
 </div>
 <span className="text-base font-semibold text-foreground">Luka Summary</span>
 </div>

 <p className="text-base text-foreground leading-relaxed">{activeSummary}</p>

 <div>
 <p className="text-base font-semibold text-foreground mb-2">Key Drivers:</p>
 <ul className="space-y-2 text-base text-foreground leading-relaxed list-disc pl-5">
 {activeDrivers.map((d, i) => <li key={i}>{d}</li>)}
 </ul>
 </div>

 {!isQuarterly && !isMonthly && (
 <div>
 <p className="text-base font-semibold text-foreground mb-2">Seasonality:</p>
 <ul className="space-y-2 text-base text-foreground leading-relaxed list-disc pl-5">
 {seasonality.map((s, i) => <li key={i}>{s}</li>)}
 </ul>
 </div>
 )}

 <div>
 <p className="text-base font-semibold text-foreground mb-2">Outlook:</p>
 <ul className="space-y-2 text-base text-foreground leading-relaxed list-disc pl-5">
 {activeOutlook.map((o, i) => <li key={i}>{o}</li>)}
 </ul>
 </div>
 </div>
 );
}

/* ── Helper: parse number from formatted string ── */
function parseNum(s: string): number {
 return parseFloat(s.replace(/,/g, "")) || 0;
}

/* ── Chart colors ── */
const CHART_COLORS = {
 cy: "#2355A4",
 py1: "#8649F1",
 py2: "#B89AFA",
 cyLine: "#2355A4",
 py1Line: "#8649F1",
 py2Line: "#B89AFA",
};

/* ── Annual Chart ── */
function AnnualChart({ visible }: { visible: boolean }) {
 if (!visible) return null;

 const revenueData = revenueRows.map((r) => ({
 name: r.name,
 "2025": parseNum(r.cy),
 "2024": parseNum(r.py1),
 "2023": parseNum(r.py2),
 }));

 const marginData = [
 { name: "Revenue", "2025": parseNum(revenueTotals.cy), "2024": parseNum(revenueTotals.py1), "2023": parseNum(revenueTotals.py2) },
 { name: "Cost of Sales", "2025": parseNum(cosTotals.cy), "2024": parseNum(cosTotals.py1), "2023": parseNum(cosTotals.py2) },
 { name: "Gross Margin", "2025": parseNum(marginTotals.cy), "2024": parseNum(marginTotals.py1), "2023": parseNum(marginTotals.py2) },
 ];

 const marginPctData = [
 { name: "2025", pct: parseFloat(marginTotals.cyPct || "0") },
 { name: "2024", pct: parseFloat(marginTotals.py1Pct || "0") },
 { name: "2023", pct: parseFloat(marginTotals.py2Pct || "0") },
 ];

 return (
 <div className="space-y-6">
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Revenue by Account</p>
 <ResponsiveContainer width="100%" height={220}>
 <BarChart data={revenueData} barGap={4}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Bar dataKey="2025" fill={CHART_COLORS.cy} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2024" fill={CHART_COLORS.py1} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2023" fill={CHART_COLORS.py2} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Gross Margin Summary</p>
 <ResponsiveContainer width="100%" height={220}>
 <BarChart data={marginData} barGap={4}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Bar dataKey="2025" fill={CHART_COLORS.cy} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2024" fill={CHART_COLORS.py1} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2023" fill={CHART_COLORS.py2} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Gross Margin % Trend</p>
 <ResponsiveContainer width="100%" height={180}>
 <BarChart data={marginPctData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
 <YAxis domain={[40, 52]} tick={{ fontSize: 11 }} unit="%" />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} formatter={(v: any) => `${v}%`} />
 <Bar dataKey="pct" fill={CHART_COLORS.cy} radius={[4, 4, 0, 0]} name="GM %" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
}

/* ── Quarterly Chart ── */
function QuarterlyChart({ visible }: { visible: boolean }) {
 if (!visible) return null;

 const data = quarterlyRows.map((r) => ({
 name: r.period,
 "2025 GM": parseNum(r.cyGm),
 "2024 GM": parseNum(r.py1Gm),
 "2023 GM": parseNum(r.py2Gm),
 "2025 GM%": parseFloat(r.cyGmPct) || 0,
 "2024 GM%": parseFloat(r.py1GmPct) || 0,
 }));

 return (
 <div className="space-y-6">
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Quarterly Gross Margin</p>
 <ResponsiveContainer width="100%" height={240}>
 <BarChart data={data} barGap={4}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Bar dataKey="2025 GM" fill={CHART_COLORS.cy} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2024 GM" fill={CHART_COLORS.py1} radius={[4, 4, 0, 0]} />
 <Bar dataKey="2023 GM" fill={CHART_COLORS.py2} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Quarterly GM % Trend</p>
 <ResponsiveContainer width="100%" height={200}>
 <LineChart data={data}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
 <YAxis domain={[44, 52]} tick={{ fontSize: 11 }} unit="%" />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} formatter={(v: any) => `${v}%`} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Line type="monotone" dataKey="2025 GM%" stroke={CHART_COLORS.cyLine} strokeWidth={2.5} dot={{ r: 4 }} />
 <Line type="monotone" dataKey="2024 GM%" stroke={CHART_COLORS.py1Line} strokeWidth={2.5} dot={{ r: 4 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
}

/* ── Monthly Chart ── */
function MonthlyChart({ visible }: { visible: boolean }) {
 if (!visible) return null;

 const data = monthlyRows.map((r) => ({
 name: r.period.slice(0, 3),
 "2025 GM": parseNum(r.cyGm),
 "2024 GM": parseNum(r.py1Gm),
 "2023 GM": parseNum(r.py2Gm),
 "2025 GM%": parseFloat(r.cyGmPct) || 0,
 "2024 GM%": parseFloat(r.py1GmPct) || 0,
 }));

 return (
 <div className="space-y-6">
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Monthly Gross Margin</p>
 <ResponsiveContainer width="100%" height={240}>
 <BarChart data={data} barGap={2}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 10 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Bar dataKey="2025 GM" fill={CHART_COLORS.cy} radius={[3, 3, 0, 0]} />
 <Bar dataKey="2024 GM" fill={CHART_COLORS.py1} radius={[3, 3, 0, 0]} />
 <Bar dataKey="2023 GM" fill={CHART_COLORS.py2} radius={[3, 3, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm p-4 bg-background">
 <p className="text-sm font-semibold text-foreground mb-3">Monthly GM % Trend</p>
 <ResponsiveContainer width="100%" height={200}>
 <LineChart data={data}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 25% 90%)" />
 <XAxis dataKey="name" tick={{ fontSize: 10 }} />
 <YAxis domain={[42, 52]} tick={{ fontSize: 11 }} unit="%" />
 <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} formatter={(v: any) => `${v}%`} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Line type="monotone" dataKey="2025 GM%" stroke={CHART_COLORS.cyLine} strokeWidth={2.5} dot={{ r: 3 }} />
 <Line type="monotone" dataKey="2024 GM%" stroke={CHART_COLORS.py1Line} strokeWidth={2.5} dot={{ r: 3 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
}

/* ── Main component ── */

export interface GrossMarginResponseProps {
 revealStep: number;
}

export function GrossMarginResponse({ revealStep }: GrossMarginResponseProps) {
 const [periodTab, setPeriodTab] = useState<"annual" | "quarterly" | "monthly">("annual");
 const [viewMode, setViewMode] = useState<"table" | "graph">("table");
 const isGraph = viewMode === "graph";

 return (
 <div className="space-y-4 w-full min-w-0">
 {/* Intro text */}
 {revealStep >= 0 && (
 <p className="text-base text-foreground animate-in fade-in duration-300">
 Showing the Gross Margin Analysis with graphical presentation option:
 </p>
 )}

 {/* Period tabs + controls */}
 {revealStep >= 1 && (
 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
 <div className="flex items-center justify-between flex-wrap gap-3">
 {/* Tabs */}
 <div className="flex items-center border border-border rounded-[10px] overflow-hidden">
 {(["annual", "quarterly", "monthly"] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setPeriodTab(tab)}
 className={cn(
 "px-5 py-2 text-base font-medium transition-all duration-200 capitalize relative",
 "hover:bg-muted/40",
 periodTab === tab
 ? "text-foreground font-semibold bg-muted/30"
 : "text-muted-foreground"
 )}
 >
 {tab}
 {periodTab === tab && (
 <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground rounded-full" />
 )}
 </button>
 ))}
 </div>

 {/* Segmented pill toggle */}
 <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/50">
 <button
 onClick={() => setViewMode("table")}
 className={cn(
 "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
 !isGraph
 ? "bg-primary text-primary-foreground shadow-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-muted"
 )}
 >
 <LayoutGrid size={14} />
 Table
 </button>
 <button
 onClick={() => setViewMode("graph")}
 className={cn(
 "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
 isGraph
 ? "bg-primary text-primary-foreground shadow-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-muted"
 )}
 >
 <BarChart3 size={14} />
 Graph
 </button>
 </div>
 </div>

 {/* Tab content with crossfade transition */}
 <div className="relative">
 {/* Annual view */}
 <div
 className={cn(
 "transition-all duration-400 ease-in-out",
 periodTab === "annual"
 ? "opacity-100 translate-y-0"
 : "opacity-0 translate-y-2 absolute inset-0 pointer-events-none"
 )}
 >
 {periodTab === "annual" && (
 isGraph ? (
 <AnnualChart visible={revealStep >= 2} />
 ) : (
 <div className="space-y-4">
 <RevenueCosTable visible={revealStep >= 2} />
 <GrossMarginSummaryTable visible={revealStep >= 4} />
 </div>
 )
 )}
 </div>

 {/* Quarterly view */}
 <div
 className={cn(
 "transition-all duration-400 ease-in-out",
 periodTab === "quarterly"
 ? "opacity-100 translate-y-0"
 : "opacity-0 translate-y-2 absolute inset-0 pointer-events-none"
 )}
 >
 {periodTab === "quarterly" && (
 isGraph ? (
 <QuarterlyChart visible={revealStep >= 2} />
 ) : (
 <QuarterlyTable visible={revealStep >= 2} />
 )
 )}
 </div>

 {/* Monthly view */}
 <div
 className={cn(
 "transition-all duration-400 ease-in-out",
 periodTab === "monthly"
 ? "opacity-100 translate-y-0"
 : "opacity-0 translate-y-2 absolute inset-0 pointer-events-none"
 )}
 >
 {periodTab === "monthly" && (
 isGraph ? (
 <MonthlyChart visible={revealStep >= 2} />
 ) : (
 <MonthlyTable visible={revealStep >= 2} />
 )
 )}
 </div>
 </div>
 </div>
 )}

 {/* Luka Summary – shared across all tabs and views */}
 <LukaSummary visible={revealStep >= 5} periodTab={periodTab} />
 </div>
 );
}
