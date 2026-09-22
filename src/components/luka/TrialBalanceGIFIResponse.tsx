import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronsUpDown, Zap } from "lucide-react";

/* ── GIFI Data ── */

interface GIFILine {
 gifi?: string;
 name: string;
 amount: string;
 indent?: number;
}


interface GIFISection {
 id: string;
 title: string;
 gifiRange?: string;
 lines?: GIFILine[];
 total?: { label: string; gifi?: string; amount: string };
 children?: GIFISection[];
}

const assetsData: GIFISection[] = [
 {
 id: "current-assets",
 title: "Current Assets",
 children: [
 {
 id: "cash-deposits",
 title: "Cash and deposits",
 gifiRange: "1000–1599",
 lines: [
 { gifi: "1000", name: "Cash & Cash Equivalents: Plooto Clearing", amount: "14,500.00" },
 { name: "Plooto Clearing (INR)", amount: "0.00", indent: 1 },
 { name: "Plooto Clearing (USD)", amount: "0.00", indent: 1 },
 { name: "Cash & Cash Equivalents: Cash", amount: "655.39", indent: 1 },
 { name: "Cash & Cash Equivalents: Float – Prepaid Corp card", amount: "0.00", indent: 1 },
 { name: "Cash & Cash Equivalents: Plooto Clearing", amount: "-5,472.31", indent: 1 },
 ],
 total: { label: "Total Cash and deposits", gifi: "1000–1599", amount: "9,683.08" },
 },
 ],
 total: { label: "Total Current Assets", gifi: "1599", amount: "9,683.08" },
 },
 {
 id: "capital-fixed",
 title: "Capital / Fixed Assets",
 children: [
 {
 id: "tangible-capital",
 title: "Tangible Capital Assets",
 children: [
 {
 id: "machinery-1600",
 title: "Machinery, equipment, furniture, and fixtures",
 gifiRange: "1600–2178",
 lines: [
 { name: "Furniture and Equipment", amount: "11,922.21" },
 { name: "Computer Equipment", amount: "5,678.98" },
 ],
 total: { label: "Total Machinery, equipment, furniture, fixtures", amount: "6,243.23" },
 },
 ],
 },
 {
 id: "intangible-capital",
 title: "Intangible Capital Assets",
 children: [
 {
 id: "other-tangible-1890",
 title: "Other tangible capital assets",
 gifiRange: "1890–2009",
 lines: [
 { gifi: "1900", name: "Investments in Subsidiaries: Convertible Note – Countable", amount: "0.00" },
 { name: "Fixed Assets: Computer and Laptops", amount: "6,413.25" },
 ],
 total: { label: "Total Other tangible capital assets", amount: "6,413.25" },
 },
 ],
 },
 {
 id: "resource-assets",
 title: "Resource Assets",
 children: [
 {
 id: "machinery-2010",
 title: "Machinery, equipment, furniture, and fixtures",
 gifiRange: "2010–2179",
 lines: [
 { name: "Furniture and Equipment", amount: "11,922.21" },
 { name: "Computer Equipment", amount: "5,678.98" },
 ],
 total: { label: "Total Machinery, equipment, furniture, fixtures", amount: "17,601.19" },
 },
 ],
 },
 ],
 },
 {
 id: "other-assets",
 title: "Other Assets",
 lines: [
 { name: "Machinery, equipment, furniture, and fixtures", amount: "17,601.19" },
 { name: "Furniture and Equipment", amount: "11,922.21", indent: 1 },
 { name: "Computer Equipment", amount: "5,678.98", indent: 1 },
 ],
 },
];

const liabilitiesData: GIFISection[] = [
 {
 id: "current-liabilities",
 title: "Current Liabilities",
 lines: [
 { name: "Accounts Payable (A/P)", amount: "8,900.63" },
 { name: "Accounts Payable (A/P) – GBP", amount: "0.00", indent: 1 },
 { name: "Accounts Payable (A/P) – INR", amount: "0.00", indent: 1 },
 { name: "Accounts Payable (A/P) – USD", amount: "7,957.61", indent: 1 },
 { name: "Direct Deposit Payable", amount: "0.00" },
 { name: "Vehicle Loan Payable", amount: "0.00" },
 { name: "Employee deductions payable", amount: "0.00" },
 { name: "Taxes payable", amount: "5,823.00" },
 { name: "Credit card loans", amount: "35,573.74" },
 { name: "Other current liabilities", amount: "20,253.37" },
 { name: "Future (deferred) income taxes", amount: "72,001.91" },
 { name: "General provisions/reserves", amount: "30,000.00" },
 ],
 total: { label: "Total Current Liabilities", amount: "30,000.00" },
 },
 {
 id: "long-term-liabilities",
 title: "Long-term Liabilities",
 children: [
 {
 id: "long-term-debt",
 title: "Long-term debt",
 lines: [
 { name: "Chartered bank loan", amount: "0.00" },
 ],
 total: { label: "Total Long-term debt", amount: "39,840.00" },
 },
 {
 id: "other-long-term",
 title: "Other long-term liabilities",
 lines: [
 { gifi: "3320", name: "Apple Loan # 4830", amount: "0.00" },
 { gifi: "3320", name: "Apple Loan # 4831", amount: "0.00" },
 { gifi: "3320", name: "Apple Loan # 8474", amount: "0.00" },
 { gifi: "3320", name: "Apple Loan # 1271", amount: "0.00" },
 { gifi: "3320", name: "Apple Loan # 1272", amount: "0.00" },
 ],
 total: { label: "Total Other long-term liabilities", amount: "39,840.00" },
 },
 ],
 },
 {
 id: "preference-shares",
 title: "Preference shares restated",
 lines: [
 { gifi: "3326", name: "Preference shares restated (corporations only)", amount: "5,928.62" },
 ],
 total: { label: "Total", amount: "33,911.38" },
 },
];

const equityData: GIFISection[] = [
 {
 id: "contributed-capital",
 title: "Contributed Capital",
 lines: [
 { gifi: "3500", name: "Common shares", amount: "1,05,010.00" },
 { gifi: "3520", name: "Preferred shares", amount: "59.79" },
 { gifi: "3570", name: "Head office account", amount: "0.00" },
 ],
 },
 {
 id: "retained-earnings",
 title: "Retained Earnings (deficit)",
 lines: [
 { gifi: "3600", name: "Retained earnings/deficit", amount: "34,494.59" },
 { gifi: "3660", name: "Retained earnings/deficit – Start", amount: "0.35" },
 { gifi: "3680", name: "Net Income (loss)", amount: "—" },
 { gifi: "3849", name: "Closing Balance", amount: "34,494.94" },
 ],
 },
];

const grandTotals = {
 totalAssets: "46,183.98",
 totalLiabilities: "63,911.38",
 totalEquity: "34,554.73",
 totalLiabEquity: "98,466.11",
};

/* ── Collapsible Section Component ── */
function CollapsibleSection({
 section,
 depth = 0,
 allExpanded,
}: {
 section: GIFISection;
 depth?: number;
 allExpanded?: boolean;
}) {
 const [localExpanded, setLocalExpanded] = useState(false);
 const expanded = allExpanded !== undefined ? allExpanded : localExpanded;
 const hasContent = (section.lines && section.lines.length > 0) || (section.children && section.children.length > 0);

 return (
 <div>
 {/* Section header row */}
 <button
 onClick={() => hasContent && setLocalExpanded(!localExpanded)}
 className={cn(
 "w-full flex items-center gap-2 text-left transition-colors pr-4",
 "hover:bg-muted/40",
 depth === 0 && "bg-[hsl(210_40%_96%)]",
 depth === 1 && "bg-[hsl(210_40%_97%)]",
 depth >= 2 && "bg-[hsl(210_40%_98%)]",
 "border-b border-[hsl(210_25%_82%)]/50"
 )}
 style={{ paddingLeft: `${16 + depth * 16}px`, paddingTop: "10px", paddingBottom: "10px" }}
 >
 {hasContent && (
 <ChevronRight
 className={cn(
 "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
 expanded && "rotate-90"
 )}
 />
 )}
 <span className={cn(
 "text-base font-semibold text-foreground flex-1",
 depth >= 2 && "font-medium"
 )}>
 {section.title}
 </span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right whitespace-nowrap">
 {section.gifiRange || ""}
 </span>
 <span className="w-[120px] shrink-0 pl-6" />
 </button>

 {/* Expanded content */}
 {expanded && (
 <div className="animate-in fade-in slide-in-from-top-1 duration-200">
 {/* Child sections */}
 {section.children?.map((child) => (
 <CollapsibleSection key={child.id} section={child} depth={depth + 1} allExpanded={allExpanded} />
 ))}

 {/* Line items */}
 {section.lines?.map((line, i) => (
 <div
 key={i}
 className="flex items-center border-b border-[hsl(210_25%_82%)]/30 hover:bg-muted/20 transition-colors pr-4"
 style={{ paddingLeft: `${32 + depth * 16 + (line.indent || 0) * 16}px` }}
 >
 <span className="text-base text-foreground flex-1 py-2">{line.name}</span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right py-2 whitespace-nowrap">
 {line.gifi || ""}
 </span>
 <span className={cn(
 "text-base tabular-nums py-2 text-right w-[120px] shrink-0 pl-6",
 line.amount.startsWith("-") ? "text-destructive" : "text-foreground"
 )}>
 {line.amount}
 </span>
 </div>
 ))}

 {/* Section total */}
 {section.total && (
 <div
 className="flex items-center bg-muted/30 border-b border-[hsl(210_25%_82%)]/50 font-semibold pr-4"
 style={{ paddingLeft: `${32 + depth * 16}px` }}
 >
 <span className="text-base text-foreground flex-1 py-2.5">{section.total.label}</span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right py-2.5 whitespace-nowrap">
 {section.total.gifi || ""}
 </span>
 <span className="text-base tabular-nums py-2.5 text-right w-[120px] shrink-0 pl-6 text-foreground font-semibold">
 {section.total.amount}
 </span>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

/* ── Top-level category (Assets, Liabilities, Equity) ── */
function CategoryBlock({
 title,
 sections,
 totalLabel,
 totalGifi,
 totalAmount,
 allExpanded,
}: {
 title: string;
 sections: GIFISection[];
 totalLabel: string;
 totalGifi?: string;
 totalAmount: string;
 allExpanded?: boolean;
}) {
 const [localExpanded, setLocalExpanded] = useState(false);
 const expanded = allExpanded !== undefined ? allExpanded : localExpanded;

 return (
 <div>
 {/* Category header */}
 <button
 onClick={() => setLocalExpanded(!localExpanded)}
 className="w-full flex items-center gap-2 px-4 py-3 bg-[hsl(210_40%_96%)] hover:bg-[hsl(210_40%_94%)] transition-colors border-b border-[hsl(210_25%_82%)]/50"
 >
 <ChevronRight
 className={cn(
 "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
 expanded && "rotate-90"
 )}
 />
 <span className="text-base font-semibold text-foreground flex-1 text-left">{title}</span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right" />
 <span className="text-base font-semibold tabular-nums text-foreground w-[120px] shrink-0 text-right pl-6">{totalAmount}</span>
 </button>

 {expanded && (
 <div className="animate-in fade-in slide-in-from-top-1 duration-200">
 {sections.map((section) => (
 <CollapsibleSection key={section.id} section={section} depth={0} allExpanded={allExpanded} />
 ))}

 {/* Grand total row */}
 <div className="flex items-center bg-muted/40 px-4 py-3 border-b border-[hsl(210_25%_82%)]/50 pr-4">
 <span className="text-base font-bold text-foreground flex-1">{totalLabel}</span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right whitespace-nowrap">
 {totalGifi || ""}
 </span>
 <span className="text-base font-bold tabular-nums text-foreground w-[120px] shrink-0 text-right pl-6">{totalAmount}</span>
 </div>
 </div>
 )}
 </div>
 );
}

/* ── Luka Summary ── */
function LukaSummary({ visible }: { visible: boolean }) {
 if (!visible) return null;

 return (
 <div className="border border-border rounded-lg bg-muted/20 p-5 space-y-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(265_80%_55%)] flex items-center justify-center">
 <Zap className="text-white" size={12} fill="white" strokeWidth={0} />
 </div>
 <span className="text-base font-semibold text-foreground">Luka Summary</span>
 </div>

 <p className="text-base text-foreground leading-relaxed">
 The Trial Balance by GIFI (S100 – Balance Sheet) shows <strong>Total Assets of $46,183.98</strong> against <strong>Total Liabilities of $63,911.38</strong> and <strong>Shareholder Equity of $34,554.73</strong>, resulting in a combined Liabilities &amp; Equity of <strong>$98,466.11</strong>.
 </p>

 <div>
 <p className="text-base font-semibold text-foreground mb-2">Key Observations:</p>
 <ul className="space-y-2 text-base text-foreground leading-relaxed list-disc pl-5">
 <li>
 <strong>Liquidity concern:</strong> Current assets ($9,683.08) are significantly lower than current liabilities ($30,000.00 in general provisions alone), indicating potential short-term liquidity pressure.
 </li>
 <li>
 <strong>Credit card debt is elevated:</strong> At $35,573.74, credit card loans represent a notable portion of current liabilities and may carry high interest costs.
 </li>
 <li>
 <strong>Deferred income taxes:</strong> Future (deferred) income taxes of $72,001.91 suggest significant timing differences that should be reviewed for recoverability.
 </li>
 <li>
 <strong>Capital structure:</strong> Common shares at $1,05,010.00 form the backbone of equity, while retained earnings of $34,494.94 indicate modest accumulated profits.
 </li>
 <li>
 <strong>Fixed assets are distributed:</strong> Computer equipment ($5,678.98) and furniture ($11,922.21) appear across multiple GIFI categories — ensure no double-counting in filings.
 </li>
 </ul>
 </div>

 <div>
 <p className="text-base font-semibold text-foreground mb-2">Recommendations:</p>
 <ul className="space-y-2 text-base text-foreground leading-relaxed list-disc pl-5">
 <li>Review the credit card loans and explore consolidation into lower-interest long-term debt.</li>
 <li>Confirm the deferred tax liability classification and assess whether any portion qualifies for reclassification.</li>
 <li>Verify that fixed asset GIFI mappings are accurate to avoid CRA filing discrepancies.</li>
 </ul>
 </div>
 </div>
 );
}

/* ── Main Component ── */
export interface TrialBalanceGIFIResponseProps {
 revealStep: number;
}

export function TrialBalanceGIFIResponse({ revealStep }: TrialBalanceGIFIResponseProps) {
 const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);

 const toggleAll = () => {
 setAllExpanded(prev => prev === true ? false : true);
 };

 return (
 <div className="space-y-4 w-full min-w-0">
 {/* Intro text */}
 {revealStep >= 0 && (
 <p className="text-base text-foreground animate-in fade-in duration-300">
 Here's an overview of <strong>Trial Balance by GIFI</strong> with key insights and analysis. This covers the essential metrics, trends, and recommendations based on your current financial data. The analysis includes year-over-year comparisons and highlights areas that may require attention.
 </p>
 )}

 {/* Unified table */}
 {revealStep >= 1 && (
 <div className="border border-[hsl(210_25%_82%)] rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300">
 {/* Column headers */}
 <div className="flex items-center bg-[hsl(210_40%_96%)] px-4 py-2 pr-4 border-b border-[hsl(210_25%_82%)]/50">
 <button
 onClick={toggleAll}
 className="mr-2 p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
 title={allExpanded ? "Collapse all" : "Expand all"}
 >
 <ChevronsUpDown className="h-4 w-4" />
 </button>
 <span className="text-base font-medium text-muted-foreground capitalize tracking-wider flex-1">Account</span>
 <span className="text-base font-medium text-muted-foreground capitalize tracking-wider w-[100px] shrink-0 text-right">GIFI</span>
 <span className="text-base font-medium text-muted-foreground capitalize tracking-wider w-[120px] shrink-0 text-right pl-6">Amount</span>
 </div>

 {/* Assets */}
 {revealStep >= 2 && (
 <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
 <CategoryBlock
 title="Assets"
 sections={assetsData}
 totalLabel="Total Assets"
 totalGifi="2599"
 totalAmount={grandTotals.totalAssets}
 allExpanded={allExpanded}
 />
 </div>
 )}

 {/* Liabilities */}
 {revealStep >= 3 && (
 <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
 <CategoryBlock
 title="Liabilities"
 sections={liabilitiesData}
 totalLabel="Total Liabilities"
 totalGifi="3499"
 totalAmount={grandTotals.totalLiabilities}
 allExpanded={allExpanded}
 />
 </div>
 )}

 {/* Shareholder Equity */}
 {revealStep >= 4 && (
 <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
 <CategoryBlock
 title="Shareholder Equity"
 sections={equityData}
 totalLabel="Total Shareholder Equity"
 totalGifi="3620"
 totalAmount={grandTotals.totalEquity}
 allExpanded={allExpanded}
 />
 </div>
 )}

 {/* Total Liabilities & Equity footer */}
 {revealStep >= 4 && (
 <div className="flex items-center bg-[hsl(210_40%_94%)] px-4 py-3 pr-4 border-t border-[hsl(210_25%_82%)]/50 animate-in fade-in slide-in-from-bottom-1 duration-300">
 <span className="text-base font-bold text-foreground flex-1">Total Liabilities and Shareholder Equity</span>
 <span className="text-base text-muted-foreground font-mono w-[100px] shrink-0 text-right whitespace-nowrap">3640</span>
 <span className="text-base font-bold tabular-nums text-foreground w-[120px] shrink-0 text-right pl-6">{grandTotals.totalLiabEquity}</span>
 </div>
 )}
 </div>
 )}

 {/* Luka Summary */}
 <LukaSummary visible={revealStep >= 5} />
 </div>
 );
}
