import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info, AlertTriangle, ChevronRight } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { cn } from "@/lib/utils";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

type YN = "Y" | "N" | "";
type RefField = RefDoc[];

interface SimpleField { response: string; wpRef: RefField }
interface InquiryField { who: string; byWhom: string; date: string }

interface RevenueRow { id: string; source: string; nature: string; revenue: string; geoMarket: string; complexity: string }
interface CustomerRow { id: string; name: string; type: "C" | "S" | ""; riskAreas: string }
interface FacilityRow { id: string; address: string; purpose: string; inventoryValue: string; employees: string }
interface ThirdPartyRow { id: string; nameDesc: string; contact: string; isServiceOrg: YN; reasoning: string }
interface StakeholderRow { id: string; name: string; pctOwned: string; involvement: string }
interface TcwgRow { id: string; name: string; memberSince: string; onFinance: YN; comments: string }
interface ManagementRow { id: string; name: string; position: string; qualifications: string }
interface AdvisorRow { id: string; contactPerson: string; company: string; email: string; adviceType: string }
interface LawRow { id: string; law: string; nonCompliance: string; materialEffect: YN }
interface InvestmentRow { id: string; name: string; amount: string; consolidated: YN; purpose: string; terms: string }
interface FinancingRow { id: string; creditor: string; amount: string; rate: string; maturity: string; terms: string }

interface Data510 {
 // A – Nature of Business
 entityType: SimpleField;
 entityActivity: SimpleField;
 revenues: SimpleField;
 revenueRows: RevenueRow[];
 marketConditions: SimpleField;
 relationships: SimpleField;
 customerRows: CustomerRow[];
 facilities: SimpleField;
 facilityRows: FacilityRow[];
 thirdParties: SimpleField;
 thirdPartyRows: ThirdPartyRow[];
 rAndD: SimpleField;
 conclusionA: string;

 // B – Ownership and Governance
 keyStakeholders: SimpleField;
 stakeholderRows: StakeholderRow[];
 tcwgWho: SimpleField;
 financeCommittee: SimpleField;
 tcwgMandate: SimpleField;
 tcwgRows: TcwgRow[];
 keyManagement: SimpleField;
 managementRows: ManagementRow[];
 operatingStyle: SimpleField;
 keyAdvisors: SimpleField;
 advisorRows: AdvisorRow[];
 perfIncentives: SimpleField;
 conclusionB: string;

 // C – Laws and Regulations
 lawRows: LawRow[];
 correspondence: SimpleField;
 newLegislation: SimpleField;
 inquiryC: InquiryField;
 conclusionC: string;

 // D – Accounting Policies
 afrf: SimpleField;
 sigPolicies: SimpleField;
 revenueRecognition: SimpleField;
 lackGuidance: SimpleField;
 policyChoice: SimpleField;
 unusualTransactions: SimpleField;
 inquiryD: InquiryField;
 conclusionD: string;

 // E – Investments
 entityStructure: SimpleField;
 majorInvestments: SimpleField;
 investmentRows: InvestmentRow[];
 acquisitions: SimpleField;
 offBalance: SimpleField;
 conclusionE: string;

 // F – Financing
 debtStructure: SimpleField;
 financingRows: FinancingRow[];
 derivatives: SimpleField;
 imposedTargets: SimpleField;
 financingChanges: SimpleField;
 conclusionF: string;

 // G – Measurement
 budgetsForecasts: SimpleField;
 perfMeasures: SimpleField;
 externalTargets: SimpleField;
 perfComparisons: SimpleField;
 conclusionG: string;

 // Overall
 overallConclusion: string;
 notes: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyField = (): SimpleField => ({ response: "", wpRef: [] });
const emptyInquiry = (): InquiryField => ({ who: "", byWhom: "", date: "" });

const emptyRevenueRow = (): RevenueRow => ({ id: uid(), source: "", nature: "", revenue: "", geoMarket: "", complexity: "" });
const emptyCustomerRow = (): CustomerRow => ({ id: uid(), name: "", type: "", riskAreas: "" });
const emptyFacilityRow = (): FacilityRow => ({ id: uid(), address: "", purpose: "", inventoryValue: "", employees: "" });
const emptyThirdPartyRow = (): ThirdPartyRow => ({ id: uid(), nameDesc: "", contact: "", isServiceOrg: "", reasoning: "" });
const emptyStakeholderRow = (): StakeholderRow => ({ id: uid(), name: "", pctOwned: "", involvement: "" });
const emptyTcwgRow = (): TcwgRow => ({ id: uid(), name: "", memberSince: "", onFinance: "", comments: "" });
const emptyManagementRow = (): ManagementRow => ({ id: uid(), name: "", position: "", qualifications: "" });
const emptyAdvisorRow = (): AdvisorRow => ({ id: uid(), contactPerson: "", company: "", email: "", adviceType: "" });
const emptyLawRow = (): LawRow => ({ id: uid(), law: "", nonCompliance: "", materialEffect: "" });
const emptyInvestmentRow = (): InvestmentRow => ({ id: uid(), name: "", amount: "", consolidated: "", purpose: "", terms: "" });
const emptyFinancingRow = (): FinancingRow => ({ id: uid(), creditor: "", amount: "", rate: "", maturity: "", terms: "" });

const sf = (response: string): SimpleField => ({ response, wpRef: [] });

function buildDefault(isUS = false): Data510 {
 const today = new Date().toISOString();

 // Entity-specific seeded content (auto-populated from Trial Balance + Planning 400/410/420)
 const seedCA = {
 entityType: "Private Canadian corporation incorporated under the CBCA. Not publicly listed; debt held privately by RBC.",
 entityActivity: "Shipping Line Inc. operates a coastal and trans-Pacific freight shipping line serving the Port of Vancouver, Seattle and select Asia-Pacific ports. Industry: marine freight transportation (NAICS 483115).",
 revenues: "Three primary revenue streams: container freight (≈68%), bulk cargo (≈22%) and chartered vessel services (≈10%). See revenue table below.",
 marketConditions: "Soft trans-Pacific container rates following 2024 normalization. Bunker fuel volatility, IMO 2024 emissions surcharges, and CUSMA tariff updates are areas of pressure.",
 relationships: "Material exposure to top-3 customers (~41% of revenue) and a single bunker fuel supplier under a 3-year fixed-margin contract.",
 facilities: "Head office and operations centre in Vancouver; bonded warehouses in Seattle and Long Beach; rented terminal slots in Yokohama and Shanghai.",
 thirdParties: "Outsources payroll (Ceridian Dayforce), IT hosting (AWS Canada), port-agent customs filings, and crew management to McQuilling Marine Services.",
 rAndD: "No formal R&D program. Capitalized $0.6M in 2024 for fleet telematics and emissions-monitoring software pilot.",
 keyStakeholders: "Founder-family holds 62% (Thompson family trust). Remaining 38% held by Westcoast Marine Holdings LP. Founder is active CEO.",
 tcwgWho: "Five-member Board of Directors; standing Audit Committee of three independent directors meeting quarterly.",
 financeCommittee: "Audit Committee chaired by D. Singh (former CFO, Seaspan). Meets quarterly and pre-clears all material accounting policies.",
 tcwgMandate: "Charter approved 2022, revised 2024. Reviews quarterly MD&A, monitors covenants, oversees external audit. Independent of management.",
 keyManagement: "Tight executive team: CEO (founder), CFO, COO, VP Operations, Controller.",
 operatingStyle: "CEO is hands-on and risk-tolerant on commercial decisions; CFO is conservative on accounting matters. Documented tone-at-the-top is positive.",
 keyAdvisors: "External legal counsel (BLG), tax advisor (KPMG tax), primary banker (RBC Commercial), insurance (Marsh Canada), classification society (Lloyd's Register).",
 perfIncentives: "Executive STIP based on adjusted EBITDA and on-time vessel availability. Capped at 60% of base. Reviewed for fraud incentive — no significant motivator identified.",
 correspondence: "Routine annual filings with Transport Canada and Canada Border Services Agency. No open enforcement matters. One historical (2022) WorkSafeBC inspection closed without finding.",
 newLegislation: "Proposed federal Clean Fuel Regulations Phase 2 and IMO MEPC 83 amendments — potential impact on bunker costs and asset useful lives. Monitoring.",
 afrf: "Canadian Accounting Standards for Private Enterprises (ASPE), Part II.",
 sigPolicies: "Revenue recognition per Section 3400; vessel depreciation 25-year straight-line; component accounting for drydocking; ASPE 3856 for financial instruments. Prior-year policies attached as Appendix.",
 revenueRecognition: "Freight revenue recognized on % of voyage completed at period end. Charter revenue recognized straight-line over charter period. Fraud risk presumption on revenue NOT refuted — addressed",
 lackGuidance: "Treatment of emissions allowances under ASPE — no authoritative guidance; policy selected by analogy to inventory.",
 policyChoice: "Component vs. composite depreciation; capitalization threshold for drydocking ($250k); FX translation election.",
 unusualTransactions: "Sale-and-leaseback of two feeder vessels completed Q2 2024 ($18M gain deferred). Insurance settlement on 2023 hull damage ($2.1M).",
 entityStructure: "Parent: Shipping Line Inc. Wholly-owned subsidiaries: SLI USA Inc. (Delaware), SLI Logistics Ltd. (BC). 40% equity-accounted JV in Pacific Crew Services Inc. Org chart on file. Related parties documented",
 majorInvestments: "Two newbuild vessel deposits with Hyundai Mipo Dockyard ($14M total); telematics rollout ($0.9M); Pacific Crew JV equity ($3.2M).",
 acquisitions: "No acquisitions completed in 2024. Letter of intent signed Jan 2025 for tuck-in of Coastal Cargo Express ($6M) — subsequent event watch list.",
 offBalance: "Six time-charter agreements treated as operating per ASPE 3065 (entity has not elected ASPE 3065.A1). Total commitment $42M over 5 years.",
 debtStructure: "Revolving facility, term loan, vessel mortgage with RBC; subordinated shareholder loan from Westcoast Marine Holdings.",
 derivatives: "Two interest-rate swaps hedging term loan (notional $25M). No FX or fuel derivatives; fuel risk managed via contract pass-throughs.",
 imposedTargets: "RBC covenants: DSCR ≥ 1.25x; Debt/EBITDA ≤ 4.0x; minimum tangible net worth $35M. All covenants met at period end with comfortable headroom.",
 financingChanges: "Term loan refinanced March 2024 ($30M, 5-year, SOFR+275). No debt extinguishments. Westcoast shareholder loan extended one year.",
 budgetsForecasts: "Board-approved annual budget; rolling 13-week cash forecast; monthly variance review by CFO. KPIs: revenue per TEU, vessel utilization %, on-time arrival %, fuel cost per TEU.",
 perfMeasures: "Vessel-level performance bonuses tied to safety record and fuel efficiency. Reviewed — not material to misstatement risk.",
 externalTargets: "Same RBC covenants noted above. Not near breach.",
 perfComparisons: "Benchmarked quarterly against Seaspan, ZIM intra-Pacific and CMA-CGM short-sea routes using Drewry data.",
 };

 const seedUS = {
 entityType: "Privately-held Delaware LLC, taxed as a C-corporation. Not SEC-registered.",
 entityActivity: "Harbor Freight LLC operates a US Pacific-coast short-sea shipping and port-drayage business. NAICS 483113.",
 revenues: "Container drayage (≈55%), short-sea voyages (≈30%), warehousing & 3PL (≈15%). See table.",
 marketConditions: "ILWU labor environment, US Jones Act compliance, IMO 2024 sulphur cap, and softening West-Coast import volumes.",
 relationships: "Two-customer concentration (~38% of revenue); single-source EPA-compliant low-sulphur fuel supplier.",
 facilities: "HQ Long Beach CA; terminals in Oakland and Tacoma; bonded warehouse in Los Angeles.",
 thirdParties: "ADP for payroll, AWS for hosting, FlexPort for customs brokerage, Crowley Marine for crew management.",
 rAndD: "No formal R&D. $0.4M capitalized for emissions-monitoring telematics in 2024.",
 keyStakeholders: "Sponsor PE fund Westbridge Capital holds 70%; management rollover 22%; ESOP 8%.",
 tcwgWho: "Five-member Board including two Westbridge designees; Audit Committee of three.",
 financeCommittee: "Audit Committee meets quarterly; chair is independent CPA.",
 tcwgMandate: "Charter approved 2023 — quarterly oversight of financial reporting, ICFR and external audit.",
 keyManagement: "CEO, CFO, COO, VP Compliance, Controller.",
 operatingStyle: "CEO commercially aggressive; CFO conservative on accounting and disclosure.",
 keyAdvisors: "Legal (Latham & Watkins), tax (PwC), banker (Wells Fargo Commercial), insurance (Aon), ABS classification.",
 perfIncentives: "STIP tied to Adjusted EBITDA and safety metrics; LTIP equity units under sponsor plan. No significant fraud motivator.",
 correspondence: "Routine USCG, EPA and CBP filings. No open enforcement.",
 newLegislation: "California CARB Advanced Clean Fleets rule and proposed federal port-electrification mandates — capex implications.",
 afrf: "US GAAP — FASB ASC framework. ASC 606 revenue model applied.",
 sigPolicies: "ASC 606 revenue, ASC 842 leases (right-of-use vessels), ASC 326 CECL for receivables, component depreciation on vessels.",
 revenueRecognition: "Performance obligations recognized over time per ASC 606-10-25-27(a). Fraud presumption on revenue NOT refuted — substantive procedures.",
 lackGuidance: "Treatment of EPA emissions credits — no authoritative GAAP; accounting policy disclosed.",
 policyChoice: "Lease ROU asset incremental borrowing rate; capitalization threshold for drydocking ($300k).",
 unusualTransactions: "Sale-leaseback of one tugboat Q3 2024 ($6M); business interruption insurance recovery ($1.4M).",
 entityStructure: "Parent Harbor Freight LLC; subs Harbor Freight Logistics Inc. (CA), Harbor Pacific Crew LLC (DE). Related parties",
 majorInvestments: "Newbuild deposit $9M (Bollinger Shipyards); telematics rollout $0.6M.",
 acquisitions: "Tuck-in of CoastLine Drayage Inc. completed Q4 2024 ($4.5M, goodwill $1.8M).",
 offBalance: "All operating leases now on balance sheet under ASC 842. No off-balance sheet SPEs.",
 debtStructure: "Senior secured term loan and ABL revolver with Wells Fargo; sponsor preferred equity.",
 derivatives: "Interest-rate cap on term loan (notional $20M). No FX or fuel derivatives.",
 imposedTargets: "Wells Fargo covenants: Fixed-Charge Coverage ≥ 1.10x; Total Leverage ≤ 4.25x. All met.",
 financingChanges: "Term loan upsized March 2024 to fund CoastLine acquisition. Revolver maturity extended to 2028.",
 budgetsForecasts: "Annual operating plan, monthly forecast, weekly 13-week cash flow. KPIs: revenue per move, on-time %, asset utilization, safety TRIR.",
 perfMeasures: "Vessel and driver-level safety/fuel bonuses; not material to misstatement risk.",
 externalTargets: "Same Wells Fargo covenants. Comfortable headroom.",
 perfComparisons: "Benchmarked vs. Matson, SAAM Towage, Foss Maritime using public filings and Drewry.",
 };

 const s = isUS ? seedUS : seedCA;
 const entity = isUS ? "Harbor Freight LLC" : "Shipping Line Inc.";

 // Seeded table rows
 const revenueRows: RevenueRow[] = isUS
 ? [
 { id: uid(), source: "Container drayage", nature: "Port-to-warehouse container trucking", revenue: "55%", geoMarket: "US West Coast", complexity: "Volume-based, ASC 606 over-time" },
 { id: uid(), source: "Short-sea voyages", nature: "Coastal container & RoRo voyages", revenue: "30%", geoMarket: "National (Jones Act)", complexity: "Voyage % complete; bill-and-hold judgment" },
 { id: uid(), source: "Warehousing / 3PL", nature: "Bonded warehousing and value-added services", revenue: "15%", geoMarket: "Local (LA / Oakland)", complexity: "Multi-element bundles" },
 ]
 : [
 { id: uid(), source: "Container freight", nature: "Trans-Pacific and coastal container shipping", revenue: "68%", geoMarket: "International (Asia-Pacific)", complexity: "Voyage % complete; cut-off judgement" },
 { id: uid(), source: "Bulk cargo", nature: "Project and bulk break-bulk shipments", revenue: "22%", geoMarket: "International", complexity: "Long-duration voyages; estimation" },
 { id: uid(), source: "Chartered vessel services", nature: "Time and bareboat charters", revenue: "10%", geoMarket: "International", complexity: "Lease vs service judgement (ASPE 3065)" },
 ];

 const customerRows: CustomerRow[] = isUS
 ? [
 { id: uid(), name: "West Coast Distribution Co.", type: "C", riskAreas: "Customer concentration (~22% of revenue); contract auto-renewal risk." },
 { id: uid(), name: "Pacific Imports LLC", type: "C", riskAreas: "Concentration (~16%); credit risk." },
 { id: uid(), name: "Chevron Marine Lubricants", type: "S", riskAreas: "Sole-source fuel supplier; 3-year contract; pricing pass-through clause." },
 ]
 : [
 { id: uid(), name: "Asia Pacific Trading Corp", type: "C", riskAreas: "Customer concentration (~18% of revenue); economic dependence." },
 { id: uid(), name: "Westport Resources Ltd", type: "C", riskAreas: "Concentration (~13%); take-or-pay clause." },
 { id: uid(), name: "Pacific Bunker Supply Co.", type: "S", riskAreas: "Sole-source bunker fuel supplier; 3-year fixed-margin contract." },
 ];

 const facilityRows: FacilityRow[] = isUS
 ? [
 { id: uid(), address: "1200 Pier J, Long Beach, CA", purpose: "Head office & terminal operations", inventoryValue: "$0.8M", employees: "120" },
 { id: uid(), address: "Pier 80, Oakland, CA", purpose: "Container terminal slot", inventoryValue: "—", employees: "35" },
 { id: uid(), address: "Tacoma Port, Tacoma, WA", purpose: "Bonded warehouse", inventoryValue: "$2.4M", employees: "22" },
 ]
 : [
 { id: uid(), address: "350 Waterfront Way, Vancouver, BC", purpose: "Head office & operations centre", inventoryValue: "$1.1M (bunker)", employees: "140" },
 { id: uid(), address: "Pier 91, Seattle, WA", purpose: "Bonded warehouse", inventoryValue: "$3.6M", employees: "28" },
 { id: uid(), address: "Berth A12, Yokohama, Japan", purpose: "Rented terminal slot", inventoryValue: "—", employees: "8 (agent)" },
 ];

 const thirdPartyRows: ThirdPartyRow[] = isUS
 ? [
 { id: uid(), nameDesc: "ADP — payroll processing for ~180 US employees.", contact: "service@adp.com", isServiceOrg: "Y", reasoning: "Integrates with GL via journal feed; controls relevant to payroll completeness. (SOC 1)." },
 { id: uid(), nameDesc: "AWS — cloud hosting for ERP and TMS systems.", contact: "AWS Enterprise Support", isServiceOrg: "Y", reasoning: "Hosts ERP; ITGCs relevant to financial reporting." },
 { id: uid(), nameDesc: "FlexPort — US customs brokerage and entry filings.", contact: "ops@flexport.com", isServiceOrg: "N", reasoning: "Service is transactional and re-performed via documents; not integrated into accounting." },
 ]
 : [
 { id: uid(), nameDesc: "Ceridian Dayforce — payroll and time management for ~200 employees.", contact: "support@ceridian.com", isServiceOrg: "Y", reasoning: "Integrated with GL via posting feed; controls over payroll completeness relevant. (CSAE 3416)." },
 { id: uid(), nameDesc: "AWS Canada — cloud hosting for ERP and crew management.", contact: "AWS Enterprise Support", isServiceOrg: "Y", reasoning: "Hosts ERP and TMS; ITGCs relevant to financial reporting." },
 { id: uid(), nameDesc: "McQuilling Marine Services — crew management and port-agent customs filings.", contact: "ops@mcquilling.com", isServiceOrg: "N", reasoning: "Service is operational; entity re-performs reconciliation of crew costs into GL." },
 ];

 const stakeholderRows: StakeholderRow[] = isUS
 ? [
 { id: uid(), name: "Westbridge Capital Partners IV LP", pctOwned: "70%", involvement: "PE sponsor — two board designees, monthly reporting, consent rights." },
 { id: uid(), name: "Management rollover unit-holders", pctOwned: "22%", involvement: "Active management (CEO, CFO, COO)." },
 { id: uid(), name: "ESOP — Harbor Freight Employee Trust", pctOwned: "8%", involvement: "Trustee voted by majority of employees." },
 ]
 : [
 { id: uid(), name: "Thompson Family Trust", pctOwned: "62%", involvement: "Founder family — M. Thompson active as CEO and Chair." },
 { id: uid(), name: "Westcoast Marine Holdings LP", pctOwned: "38%", involvement: "Passive financial investor; one board seat; subordinated shareholder loan." },
 ];

 const tcwgRows: TcwgRow[] = isUS
 ? [
 { id: uid(), name: "J. Patel", memberSince: "2020", onFinance: "Y", comments: "Audit Committee Chair; CPA; former CFO at SeaTac Logistics." },
 { id: uid(), name: "R. Nguyen (Westbridge)", memberSince: "2021", onFinance: "Y", comments: "Sponsor designee; Operating Partner; MBA." },
 { id: uid(), name: "M. O'Brien", memberSince: "2019", onFinance: "Y", comments: "Independent; ex-COO Matson; industry expertise." },
 { id: uid(), name: "K. Ramirez", memberSince: "2022", onFinance: "N", comments: "Independent; ESG and HSE expertise." },
 { id: uid(), name: "T. Lee (CEO)", memberSince: "2018", onFinance: "N", comments: "Founder & CEO; management representative." },
 ]
 : [
 { id: uid(), name: "D. Singh", memberSince: "2018", onFinance: "Y", comments: "Audit Committee Chair; CPA, CA; former CFO Seaspan ULC. Independent." },
 { id: uid(), name: "L. Pereira", memberSince: "2020", onFinance: "Y", comments: "Independent; tax partner (retired); financial-reporting expert." },
 { id: uid(), name: "H. Westcott (Westcoast Marine)", memberSince: "2019", onFinance: "Y", comments: "Investor designee; non-independent." },
 { id: uid(), name: "A. Thompson", memberSince: "2015", onFinance: "N", comments: "Founder family; non-executive." },
 { id: uid(), name: "M. Thompson (CEO/Chair)", memberSince: "2015", onFinance: "N", comments: "Founder, CEO and Chair; management representative." },
 ];

 const managementRows: ManagementRow[] = isUS
 ? [
 { id: uid(), name: "T. Lee", position: "CEO", qualifications: "Founder; 25 yrs industry experience." },
 { id: uid(), name: "S. Cho", position: "CFO", qualifications: "CPA; 18 yrs; previously controller at Matson." },
 { id: uid(), name: "P. Alvarez", position: "COO", qualifications: "USMMA; 22 yrs port operations." },
 { id: uid(), name: "R. Hudson", position: "VP Compliance", qualifications: "Maritime attorney; 15 yrs." },
 { id: uid(), name: "M. Singh", position: "Controller", qualifications: "CPA; 12 yrs; ASC 606 and 842 lead." },
 ]
 : [
 { id: uid(), name: "M. Thompson", position: "CEO & Chair", qualifications: "Founder; 30 yrs industry; B.Comm." },
 { id: uid(), name: "J. Reyes", position: "CFO", qualifications: "CPA, CA; 20 yrs; previously CFO at Pacific Basin Logistics." },
 { id: uid(), name: "K. Park", position: "Controller", qualifications: "CPA, CMA; 14 yrs; ASPE specialist." },
 { id: uid(), name: "L. Garcia", position: "COO", qualifications: "Master Mariner; 25 yrs operations." },
 { id: uid(), name: "N. Brar", position: "VP Operations", qualifications: "P.Eng (Marine); 16 yrs." },
 ];

 const advisorRows: AdvisorRow[] = isUS
 ? [
 { id: uid(), contactPerson: "J. Klein", company: "Latham & Watkins LLP", email: "j.klein@lw.com", adviceType: "Corporate, M&A, regulatory" },
 { id: uid(), contactPerson: "S. Park", company: "PwC US — Tax", email: "s.park@pwc.com", adviceType: "Federal & state tax; transfer pricing" },
 { id: uid(), contactPerson: "R. Diaz", company: "Wells Fargo Commercial Banking", email: "r.diaz@wellsfargo.com", adviceType: "Banking; covenant monitoring" },
 { id: uid(), contactPerson: "M. Yu", company: "Aon Marine", email: "m.yu@aon.com", adviceType: "Hull, P&I, cargo and BI insurance" },
 ]
 : [
 { id: uid(), contactPerson: "S. Chen", company: "Borden Ladner Gervais LLP", email: "schen@blg.com", adviceType: "Corporate, maritime, regulatory" },
 { id: uid(), contactPerson: "R. Khan", company: "KPMG Canada — Tax", email: "rkhan@kpmg.ca", adviceType: "Income tax, GST/HST, transfer pricing" },
 { id: uid(), contactPerson: "P. Lim", company: "RBC Commercial Banking", email: "p.lim@rbc.com", adviceType: "Banking; covenant monitoring" },
 { id: uid(), contactPerson: "E. Murphy", company: "Marsh Canada Ltd.", email: "e.murphy@marsh.com", adviceType: "Hull, P&I, cargo insurance" },
 { id: uid(), contactPerson: "—", company: "Lloyd's Register", email: "vancouver@lr.org", adviceType: "Vessel classification & statutory surveys" },
 ];

 const lawRows: LawRow[] = isUS
 ? [
 { id: uid(), law: "Merchant Marine Act (Jones Act) — cabotage compliance.", nonCompliance: "No instances. Annual self-certification.", materialEffect: "Y" },
 { id: uid(), law: "EPA Clean Air Act / IMO MARPOL Annex VI emissions.", nonCompliance: "None.", materialEffect: "N" },
 { id: uid(), law: "OSHA / USCG safety regulations.", nonCompliance: "One recordable incident in 2024 — closed.", materialEffect: "N" },
 { id: uid(), law: "Federal and state income tax (IRC; CA, WA).", nonCompliance: "None.", materialEffect: "Y" },
 ]
 : [
 { id: uid(), law: "Canada Shipping Act, 2001 and Transport Canada Marine Safety regulations.", nonCompliance: "No instances. Annual inspections passed.", materialEffect: "Y" },
 { id: uid(), law: "IMO MARPOL Annex VI / Canadian Vessel Pollution and Dangerous Chemicals Regulations.", nonCompliance: "None.", materialEffect: "N" },
 { id: uid(), law: "WorkSafeBC and Canada Labour Code, Part II.", nonCompliance: "2022 inspection closed without finding.", materialEffect: "N" },
 { id: uid(), law: "Income Tax Act (Canada) and Excise Tax Act (GST).", nonCompliance: "None.", materialEffect: "Y" },
 ];

 const investmentRows: InvestmentRow[] = isUS
 ? [
 { id: uid(), name: "Bollinger Shipyards — newbuild tug deposit", amount: "$9.0M", consolidated: "N", purpose: "Fleet renewal — delivery 2026", terms: "Refundable advance; milestone payments." },
 { id: uid(), name: "Harbor Pacific Crew LLC", amount: "$1.5M", consolidated: "Y", purpose: "Crew management subsidiary", terms: "100% owned; consolidated." },
 { id: uid(), name: "Emissions-monitoring telematics rollout", amount: "$0.6M", consolidated: "Y", purpose: "Compliance & efficiency", terms: "Capitalized as intangible; 5-yr useful life." },
 ]
 : [
 { id: uid(), name: "Hyundai Mipo Dockyard — 2 newbuild vessels", amount: "$14.0M deposits", consolidated: "N", purpose: "Fleet renewal — delivery 2026/27", terms: "Refundable shipbuilding advances; milestone payments." },
 { id: uid(), name: "Pacific Crew Services Inc. (40% JV)", amount: "$3.2M", consolidated: "N", purpose: "Crew supply joint venture", terms: "Equity method; 40% ownership." },
 { id: uid(), name: "Fleet telematics & emissions monitoring", amount: "$0.9M", consolidated: "Y", purpose: "Operational efficiency & compliance", terms: "Capitalized; 5-year amortization." },
 ];

 const financingRows: FinancingRow[] = isUS
 ? [
 { id: uid(), creditor: "Wells Fargo — Term Loan A", amount: "$25.0M", rate: "SOFR + 3.00%", maturity: "2029-03-15", terms: "First-lien on fleet; FCCR ≥ 1.10x; Total Leverage ≤ 4.25x." },
 { id: uid(), creditor: "Wells Fargo — ABL Revolver", amount: "$15.0M (committed)", rate: "SOFR + 2.25%", maturity: "2028-03-15", terms: "Borrowing base on AR; springing FCCR." },
 { id: uid(), creditor: "Westbridge Capital — Preferred Equity", amount: "$8.0M", rate: "8% PIK", maturity: "Perpetual", terms: "Subordinated; redemption on liquidity event." },
 ]
 : [
 { id: uid(), creditor: "RBC — Term Loan", amount: "$30.0M", rate: "SOFR + 2.75%", maturity: "2029-03-31", terms: "First mortgage on 3 vessels; DSCR ≥ 1.25x; D/EBITDA ≤ 4.0x; min TNW $35M." },
 { id: uid(), creditor: "RBC — Revolving Facility", amount: "$10.0M (committed)", rate: "Prime + 1.50%", maturity: "2027-03-31", terms: "AR-based borrowing base; usual operating covenants." },
 { id: uid(), creditor: "Vessel Mortgage — RBC", amount: "$6.5M", rate: "Fixed 5.65%", maturity: "2030-06-30", terms: "Specific to MV Pacific Voyager." },
 { id: uid(), creditor: "Westcoast Marine Holdings LP — Shareholder Loan", amount: "$4.0M", rate: "6%", maturity: "2026-12-31", terms: "Subordinated and postponed to RBC." },
 ];

 return {
 entityType: sf(s.entityType),
 entityActivity: sf(s.entityActivity),
 revenues: sf(s.revenues),
 revenueRows,
 marketConditions: sf(s.marketConditions),
 relationships: sf(s.relationships),
 customerRows,
 facilities: sf(s.facilities),
 facilityRows,
 thirdParties: sf(s.thirdParties),
 thirdPartyRows,
 rAndD: sf(s.rAndD),
 conclusionA: `Risk factors: customer concentration in top-${isUS ? "2" : "3"}; revenue cut-off on voyages in progress at ${entity}'s period end; reliance on outsourced payroll and hosting (). Carried forward`,

 keyStakeholders: sf(s.keyStakeholders),
 stakeholderRows,
 tcwgWho: sf(s.tcwgWho),
 financeCommittee: sf(s.financeCommittee),
 tcwgMandate: sf(s.tcwgMandate),
 tcwgRows,
 keyManagement: sf(s.keyManagement),
 managementRows,
 operatingStyle: sf(s.operatingStyle),
 keyAdvisors: sf(s.keyAdvisors),
 advisorRows,
 perfIncentives: sf(s.perfIncentives),
 conclusionB: "Governance is well established; no override-of-controls risk indicators noted at this stage. Management incentive plan reviewed against — no significant fraud motivator.",

 lawRows,
 correspondence: sf(s.correspondence),
 newLegislation: sf(s.newLegislation),
 inquiryC: { who: "CFO", byWhom: "Elena Sokolova — Partner", date: today },
 conclusionC: "No instances of material non-compliance identified. Emissions and clean-fuel legislation monitored as forward-looking risk.",

 afrf: sf(s.afrf),
 sigPolicies: sf(s.sigPolicies),
 revenueRecognition: sf(s.revenueRecognition),
 lackGuidance: sf(s.lackGuidance),
 policyChoice: sf(s.policyChoice),
 unusualTransactions: sf(s.unusualTransactions),
 inquiryD: { who: "Controller", byWhom: "Priya Raman — Staff", date: today },
 conclusionD: "Revenue recognition risk (presumption of fraud risk) carried and addressed Sale-leaseback transaction flagged for substantive review.",

 entityStructure: sf(s.entityStructure),
 majorInvestments: sf(s.majorInvestments),
 investmentRows,
 acquisitions: sf(s.acquisitions),
 offBalance: sf(s.offBalance),
 conclusionE: isUS
 ? "CoastLine Drayage acquisition — goodwill and PPA assumptions identified as a significant risk; carry"
 : "Newbuild deposits and sale-leaseback flagged as significant judgements; carried",

 debtStructure: sf(s.debtStructure),
 financingRows,
 derivatives: sf(s.derivatives),
 imposedTargets: sf(s.imposedTargets),
 financingChanges: sf(s.financingChanges),
 conclusionF: "Covenant compliance confirmed with comfortable headroom; refinancing fees and embedded derivatives flagged for testing.",

 budgetsForecasts: sf(s.budgetsForecasts),
 perfMeasures: sf(s.perfMeasures),
 externalTargets: sf(s.externalTargets),
 perfComparisons: sf(s.perfComparisons),
 conclusionG: "Performance measurement processes appear robust; no incentive structures indicating heightened fraud risk.",

 overallConclusion: `Risk assessment procedures performed to identify events, conditions and circumstances that may result in material misstatement in the F/S of ${entity}. Significant risk factors documented Form to be reviewed and updated each period.`,
 notes: "",
 concluded: false,
 concludedOn: "",
 };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldRow({ label, sublabel, field, locked, onChange, storageKey, lukaFilled, lukaHighlight, lukaRef }: {
 label: string; sublabel?: string;
 field: SimpleField; locked: boolean;
 onChange: (f: SimpleField) => void;
 storageKey?: string;
 lukaFilled?: boolean;
 lukaHighlight?: boolean;
 lukaRef?: { current: HTMLElement | null };
}) {
 return (
 <tr ref={lukaRef as any} className={`group hover:bg-muted/30 transition-colors align-top${lukaHighlight ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-5 py-3 text-sm text-foreground w-[38%]">
 <span>{label}</span>
 {sublabel && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{sublabel}</p>}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!field.response} />
 <div className="flex-1">
 <LukaTypingRow filled={lukaFilled ?? false}>
 {storageKey ? (
 <AttributedComment value={field.response} onChange={v => onChange({...field, response: v})} storageKey={storageKey} placeholder="Enter response…" disabled={locked} className="min-h-[56px] text-sm bg-background resize-none" />
 ) : (
 <Textarea disabled={locked} value={field.response} onChange={e => onChange({...field, response: e.target.value })} placeholder="Enter response…" className="min-h-[56px] text-sm bg-background resize-none" />
 )}
 </LukaTypingRow>
 {lukaFilled && (
 <div className="mt-1">
 </div>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-center w-[100px]">
 <RefButton
 reference={field.wpRef}
 onAttach={doc => onChange({...field, wpRef: [...field.wpRef, doc] })}
 onRemove={i => onChange({...field, wpRef: field.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 );
}

function TableCard({ title, onAdd, children }: {
 title: string; onAdd: () => void; children: React.ReactNode;
}) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 </div>
 <div className="overflow-x-auto">{children}</div>
 <div className="px-6 py-3 border-t border-border">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={onAdd}>
 <Plus className="h-3.5 w-3.5" />
 Add Row
 </Button>
 </div>
 </div>
 );
}

function DeleteCell({ onDelete, locked }: { onDelete: () => void; locked: boolean }) {
 return (
 <td className="px-2 py-2 text-center w-8">
 {!locked && (
 <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
 <Trash2 className="h-3 w-3 text-destructive" />
 </button>
 )}
 </td>
 );
}

const INQUIRY_WHO_ROLES = ['CEO', 'CFO', 'COO', 'Controller', 'VP Finance', 'Managing Director', 'Board Chair', 'Audit Committee Chair', 'Board Member', 'Director', 'Other'];
const INQUIRY_AUDITOR_OPTIONS = ['Elena Sokolova — Partner', 'Priya Raman — Staff', 'Marcus Chen — CMS'];

function RequiredInquiryBanner({ inquiry, locked, onChange }: {
 inquiry: InquiryField; locked: boolean;
 onChange: (f: InquiryField) => void;
}) {
 return (
 <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
 <div className="flex items-center gap-1.5 mb-3">
 <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
 <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Required Inquiries</span>
 <span className="text-sm text-amber-700 dark:text-amber-400 ml-1">— to be completed every period</span>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">Who interviewed</p>
 <Select value={inquiry.who} onValueChange={v => onChange({...inquiry, who: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-white dark:bg-background border-amber-200 dark:border-amber-700 focus:ring-amber-400">
 <SelectValue placeholder="Select name / role" />
 </SelectTrigger>
 <SelectContent>
 {INQUIRY_WHO_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">By whom</p>
 <Select value={inquiry.byWhom} onValueChange={v => onChange({...inquiry, byWhom: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-white dark:bg-background border-amber-200 dark:border-amber-700 focus:ring-amber-400">
 <SelectValue placeholder="Select auditor" />
 </SelectTrigger>
 <SelectContent>
 {INQUIRY_AUDITOR_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">Date</p>
 <Input
 type="date"
 disabled={locked}
 value={inquiry.date}
 onChange={e => onChange({...inquiry, date: e.target.value })}
 className="h-8 text-sm bg-white dark:bg-background border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400"
 />
 </div>
 </div>
 </div>
 );
}

function SectionConclusion({ value, sectionLetter, locked, onChange }: {
 value: string; sectionLetter: string; locked: boolean;
 onChange: (v: string) => void;
}) {
 return (
 <div className="rounded-md border border-border bg-primary/[0.02] px-4 py-3.5 space-y-2">
 <div className="flex items-start gap-2">
 <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <p className="text-sm font-semibold text-primary">
 Section {sectionLetter} conclusion — Identify risk factors and
 </p>
 </div>
 <Textarea
 disabled={locked}
 value={value}
 onChange={e => onChange(e.target.value)}
 placeholder="Document any risk factors identified for this section…"
 className="min-h-[72px] text-sm resize-none bg-background"
 />
 </div>
 );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-5 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider text-foreground uppercase tracking-wider w-[38%]">Document</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider text-foreground uppercase tracking-wider">Responses / Comments</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-[100px]">W/P Ref.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">{children}</tbody>
 </table>
 </div>
 </div>
 );
}

// ── TABS ───────────────────────────────────────────────────────────────────────

// ── Main Component ─────────────────────────────────────────────────────────────

export function Audit510Worksheet({ isUS = false }: { isUS?: boolean }) {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();
 const storageKey = `audit-510-data-v2-${engagementId ?? (isUS ? "us" : "ca")}`;

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLElement>(null);
 const [data, setData] = useState<Data510>(() => {
 const saved = readJsonFromLocalStorage<Data510 | null>(storageKey, null);
 if (!saved) return buildDefault(isUS);
 const def = buildDefault(isUS);
 return {...def,...saved };
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const locked = data.concluded;

 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 function setField<K extends keyof Data510>(key: K, val: Data510[K]) {
 setData(d => ({...d, [key]: val }));
 }

 function sf(key: keyof Data510) {
 return {
 field: data[key] as SimpleField,
 locked,
 onChange: (f: SimpleField) => setField(key, f as Data510[typeof key]),
 storageKey: `510-${engagementId ?? "def"}-${String(key)}`,
 };
 }

 // ── Row list helpers ──────────────────────────────────────────────────────────

 function addRow<T>(key: keyof Data510, empty: () => T) {
 setData(d => ({...d, [key]: [...(d[key] as T[]), empty()] }));
 }

 function updateRow<T>(key: keyof Data510, idx: number, patch: Partial<T>) {
 setData(d => {
 const list = [...(d[key] as T[])];
 list[idx] = {...list[idx],...patch };
 return {...d, [key]: list };
 });
 }

 function deleteRow<T>(key: keyof Data510, idx: number) {
 setData(d => ({...d, [key]: (d[key] as T[]).filter((_, i) => i !== idx) }));
 }

 // ── Section A ─────────────────────────────────────────────────────────────────

 const SectionA = (
 <div className="space-y-5">
 <SectionCard title="A. Nature of Business">
 <FieldRow label="Type of entity" sublabel="E.g., public, private, public interest entity, etc. If public, indicate where shares/debt are listed." {...sf("entityType")} lukaFilled={isDemoEngagement && lukaFilledFields.has('entityType')} lukaHighlight={isDemoEngagement && lukaHighlightFields.has('entityType')} lukaRef={firstFillRef} />
 <FieldRow label="What the entity does and the industry in which it operates." {...sf("entityActivity")} lukaFilled={isDemoEngagement && lukaFilledFields.has('entityActivity')} lukaHighlight={isDemoEngagement && lukaHighlightFields.has('entityActivity')} />
 <FieldRow label="Sources of revenues." sublabel="Complete the table below." {...sf("revenues")} lukaFilled={isDemoEngagement && lukaFilledFields.has('revenues')} lukaHighlight={isDemoEngagement && lukaHighlightFields.has('revenues')} />
 </SectionCard>

 <TableCard title="Revenue sources" onAdd={() => addRow("revenueRows", emptyRevenueRow)}>
 <table className="w-full min-w-[700px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Source of Revenue</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Nature of Products / Services</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-32">Approx. Revenue ($ or %)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Geographical Market</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Areas of Complexity / Subjectivity</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.revenueRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 {(["source", "nature", "revenue", "geoMarket", "complexity"] as const).map((col, ci) => (
 <td key={col} className={cn("px-4 py-2 align-top", "")}>
 <Input disabled={locked} value={row[col]} onChange={e => updateRow<RevenueRow>("revenueRows", i, { [col]: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="—" />
 </td>
 ))}
 <DeleteCell onDelete={() => deleteRow("revenueRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="A. Nature of Business (continued)">
 <FieldRow label="Market conditions" sublabel="Changes in economy, competition, technology, tariffs, etc. that may impact the business." {...sf("marketConditions")} />
 <FieldRow label="Significant supplier and customer relationships." sublabel="Complete the table below." {...sf("relationships")} />
 </SectionCard>

 <TableCard title="Significant customers (C) and/or suppliers (S)" onAdd={() => addRow("customerRows", emptyCustomerRow)}>
 <table className="w-full min-w-[600px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Customer (C) / Supplier (S)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-20">Type</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Areas of Possible Risk</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.customerRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.name} onChange={e => updateRow<CustomerRow>("customerRows", i, { name: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Name" />
 </td>
 <td className="px-4 py-2 align-top w-24">
 <Select value={row.type} onValueChange={v => updateRow<CustomerRow>("customerRows", i, { type: v as "C" | "S" | "" })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent><SelectItem value="C">C</SelectItem><SelectItem value="S">S</SelectItem></SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.riskAreas} onChange={e => updateRow<CustomerRow>("customerRows", i, { riskAreas: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Risk areas…" />
 </td>
 <DeleteCell onDelete={() => deleteRow("customerRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="A. Nature of Business (continued)">
 <FieldRow label="Location of key facilities" sublabel="Warehouses, retail, offices, etc. Complete the table below." {...sf("facilities")} />
 </SectionCard>

 <TableCard title="Key facilities" onAdd={() => addRow("facilityRows", emptyFacilityRow)}>
 <table className="w-full min-w-[600px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Address</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Principal Purpose</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-40">Approx. Inventory Value ($ or %)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-32">Employees at Location</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.facilityRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 {(["address", "purpose", "inventoryValue", "employees"] as const).map((col, ci) => (
 <td key={col} className={cn("px-4 py-2 align-top", "")}>
 <Input disabled={locked} value={row[col]} onChange={e => updateRow<FacilityRow>("facilityRows", i, { [col]: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="—" />
 </td>
 ))}
 <DeleteCell onDelete={() => deleteRow("facilityRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="A. Nature of Business (continued)">
 <FieldRow label="Use of third-party organizations" sublabel="Refer to Appendix B for examples. Populate all third-party organizations below including those identified via management questionnaire." {...sf("thirdParties")} />
 </SectionCard>

 <TableCard title="Third-party organizations" onAdd={() => addRow("thirdPartyRows", emptyThirdPartyRow)}>
 <table className="w-full min-w-[700px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Name & Brief Description of Services</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-44">Contact Information</th>
 <th className="px-4 py-2.5 text-center w-28 text-sm font-semibold text-foreground uppercase tracking-wider">Service Org? (Y/N)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Reasoning & Factors Considered</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.thirdPartyRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors align-top">
 <td className="px-4 py-2">
 <Textarea disabled={locked} value={row.nameDesc} onChange={e => updateRow<ThirdPartyRow>("thirdPartyRows", i, { nameDesc: e.target.value })}
 className="min-h-[48px] text-sm bg-background resize-none" placeholder="Name and services…" />
 </td>
 <td className="px-4 py-2 w-44">
 <Input disabled={locked} value={row.contact} onChange={e => updateRow<ThirdPartyRow>("thirdPartyRows", i, { contact: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Contact info" />
 </td>
 <td className="px-4 py-2 w-28">
 <Select value={row.isServiceOrg} onValueChange={v => updateRow<ThirdPartyRow>("thirdPartyRows", i, { isServiceOrg: v as YN })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y —</SelectItem>
 <SelectItem value="N">N</SelectItem>
 </SelectContent>
 </Select>
 {row.isServiceOrg === "Y" && (
 <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium"></p>
 )}
 </td>
 <td className="px-4 py-2">
 <Textarea disabled={locked} value={row.reasoning} onChange={e => updateRow<ThirdPartyRow>("thirdPartyRows", i, { reasoning: e.target.value })}
 className="min-h-[48px] text-sm bg-background resize-none" placeholder="Reasoning…" />
 </td>
 <DeleteCell onDelete={() => deleteRow("thirdPartyRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="A. Nature of Business (continued)">
 <FieldRow label="Research and development activities and expenditures." {...sf("rAndD")} />
 </SectionCard>

 <SectionConclusion value={data.conclusionA} sectionLetter="A" locked={locked} onChange={v => setField("conclusionA", v)} />
 </div>
 );

 // ── Section B ─────────────────────────────────────────────────────────────────

 const SectionB = (
 <div className="space-y-5">
 <SectionCard title="B. Ownership and Governance">
 <FieldRow label="Key stakeholders and their involvement in day-to-day management." sublabel="Owner/manager, family members, public ownership, taxpayers, etc. Complete the table below." {...sf("keyStakeholders")} />
 </SectionCard>

 <TableCard title="Key stakeholders" onAdd={() => addRow("stakeholderRows", emptyStakeholderRow)}>
 <table className="w-full min-w-[500px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Key Stakeholder (Individual / Company)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">% Owned</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Direct Involvement, Influence or Agreements</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.stakeholderRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 {(["name", "pctOwned", "involvement"] as const).map((col, ci) => (
 <td key={col} className={cn("px-4 py-2 align-top", "", col === "pctOwned" && "w-28")}>
 <Input disabled={locked} value={row[col]} onChange={e => updateRow<StakeholderRow>("stakeholderRows", i, { [col]: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="—" />
 </td>
 ))}
 <DeleteCell onDelete={() => deleteRow("stakeholderRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="B. Ownership and Governance (continued)">
 <FieldRow label="Who is TCWG?" sublabel="E.g., owner manager, CEO, board of directors." {...sf("tcwgWho")} />
 <FieldRow label="Finance and/or audit committee" sublabel="Describe their role and how often they meet, if applicable." {...sf("financeCommittee")} />
 <FieldRow label="Mandate, composition and operation of TCWG." sublabel="Complete the table below." {...sf("tcwgMandate")} />
 </SectionCard>

 <TableCard title="TCWG members" onAdd={() => addRow("tcwgRows", emptyTcwgRow)}>
 <table className="w-full min-w-[600px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Name</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-32">Member Since</th>
 <th className="px-4 py-2.5 text-center w-36 text-sm font-semibold text-foreground uppercase tracking-wider">Finance / Audit Committee?</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Comments (Skills, Background, Expertise, Family Links)</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.tcwgRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.name} onChange={e => updateRow<TcwgRow>("tcwgRows", i, { name: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Name" />
 </td>
 <td className="px-4 py-2 align-top w-32">
 <Input disabled={locked} value={row.memberSince} onChange={e => updateRow<TcwgRow>("tcwgRows", i, { memberSince: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Year" />
 </td>
 <td className="px-4 py-2 align-top w-36">
 <Select value={row.onFinance} onValueChange={v => updateRow<TcwgRow>("tcwgRows", i, { onFinance: v as YN })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.comments} onChange={e => updateRow<TcwgRow>("tcwgRows", i, { comments: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Comments…" />
 </td>
 <DeleteCell onDelete={() => deleteRow("tcwgRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="B. Ownership and Governance (continued)">
 <FieldRow label="Key members of management/personnel." sublabel="Complete the table below." {...sf("keyManagement")} />
 </SectionCard>

 <TableCard title="Key management personnel" onAdd={() => addRow("managementRows", emptyManagementRow)}>
 <table className="w-full min-w-[500px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Name</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Position</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Qualifications / Experience / Comments</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.managementRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 {(["name", "position", "qualifications"] as const).map((col, ci) => (
 <td key={col} className={cn("px-4 py-2 align-top", "")}>
 <Input disabled={locked} value={row[col]} onChange={e => updateRow<ManagementRow>("managementRows", i, { [col]: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="—" />
 </td>
 ))}
 <DeleteCell onDelete={() => deleteRow("managementRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="B. Ownership and Governance (continued)">
 <FieldRow label="Management's operating style" sublabel="E.g., autocratic or consensus building, risk taking or conservative, and implications for the entity." {...sf("operatingStyle")} />
 <FieldRow label="Key advisors and non-management entities" sublabel="Legal, insurance, banks, franchisors, government agencies that provide direction, control or accountability. Complete the table below." {...sf("keyAdvisors")} />
 </SectionCard>

 <TableCard title="Key advisors" onAdd={() => addRow("advisorRows", emptyAdvisorRow)}>
 <table className="w-full min-w-[600px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Contact Person</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Company</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-44">Email</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Type(s) of Direction / Advice Provided</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.advisorRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 {(["contactPerson", "company", "email", "adviceType"] as const).map((col, ci) => (
 <td key={col} className={cn("px-4 py-2 align-top", "", col === "email" && "w-44")}>
 <Input disabled={locked} value={row[col]} onChange={e => updateRow<AdvisorRow>("advisorRows", i, { [col]: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="—" />
 </td>
 ))}
 <DeleteCell onDelete={() => deleteRow("advisorRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="B. Ownership and Governance (continued)">
 <FieldRow label="Performance incentives" sublabel="Management bonuses paid and how calculated. Consider if incentives could motivate fraud — if so, document risk" {...sf("perfIncentives")} />
 </SectionCard>

 <SectionConclusion value={data.conclusionB} sectionLetter="B" locked={locked} onChange={v => setField("conclusionB", v)} />
 </div>
 );

 // ── Section C ─────────────────────────────────────────────────────────────────

 const SectionC = (
 <div className="space-y-5">
 <TableCard title="Significant laws and regulations" onAdd={() => addRow("lawRows", emptyLawRow)}>
 <table className="w-full min-w-[600px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Significant Laws / Regulations (including environmental and tax)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Instances of Non-Compliance, Alleged Non-Compliance or Investigations</th>
 <th className="px-4 py-2.5 text-center w-40 text-sm font-semibold text-foreground uppercase tracking-wider">Would Non-Compliance Result in Material Direct Effect on F/S? (Y/N)</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.lawRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors align-top">
 <td className="px-4 py-2">
 <Textarea disabled={locked} value={row.law} onChange={e => updateRow<LawRow>("lawRows", i, { law: e.target.value })}
 className="min-h-[48px] text-sm bg-background resize-none" placeholder="Law / regulation…" />
 </td>
 <td className="px-4 py-2">
 <Textarea disabled={locked} value={row.nonCompliance} onChange={e => updateRow<LawRow>("lawRows", i, { nonCompliance: e.target.value })}
 className="min-h-[48px] text-sm bg-background resize-none" placeholder="Describe any instances…" />
 </td>
 <td className="px-4 py-2 w-40">
 <Select value={row.materialEffect} onValueChange={v => updateRow<LawRow>("lawRows", i, { materialEffect: v as YN })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
 </Select>
 </td>
 <DeleteCell onDelete={() => deleteRow("lawRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="C. Laws and Regulations (continued)">
 <FieldRow label="Correspondence with relevant licensing or regulatory authorities." {...sf("correspondence")} />
 <FieldRow label="New or proposed legislation/regulations" sublabel="Where non-compliance could have a significant financial impact on the F/S." {...sf("newLegislation")} />
 </SectionCard>

 <RequiredInquiryBanner inquiry={data.inquiryC} locked={locked} onChange={v => setField("inquiryC", v)} />
 <div className="rounded-md border border-border bg-card px-5 py-3 text-sm text-foreground">
 Inquire of management and, where appropriate, TCWG, as to whether the entity is in compliance with significant laws and regulations.
 </div>

 <SectionConclusion value={data.conclusionC} sectionLetter="C" locked={locked} onChange={v => setField("conclusionC", v)} />
 </div>
 );

 // ── Section D ─────────────────────────────────────────────────────────────────

 const SectionD = (
 <div className="space-y-5">
 <SectionCard title="D. Accounting Policies and F/S Disclosures">
 <FieldRow label="The applicable financial reporting framework (AFRF)." {...sf("afrf")} />
 <FieldRow label="Significant accounting policies" sublabel="Consider attaching significant policies from prior year F/S." {...sf("sigPolicies")} />
 <FieldRow
 label="Revenue recognition for each revenue stream."
 sublabel="See Section A for revenue streams. Consider using Note: A risk of fraud is presumed on revenue recognition unless specifically refuted."
 {...sf("revenueRecognition")}
 />
 <FieldRow label="Areas with lack of authoritative guidance or consensus." sublabel="Controversial or emerging accounting areas." {...sf("lackGuidance")} />
 <FieldRow label="Areas where a choice in the selection of accounting policies exists." {...sf("policyChoice")} />
 <FieldRow label="Unusual or complex transactions." {...sf("unusualTransactions")} />
 </SectionCard>

 <RequiredInquiryBanner inquiry={data.inquiryD} locked={locked} onChange={v => setField("inquiryD", v)} />
 <div className="rounded-md border border-border bg-card px-5 py-3 text-sm text-foreground space-y-1">
 <p>Inquire about whether there have been any changes to the entity's accounting policies, including any changes in the AFRF. Consider:</p>
 <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 mt-1">
 <li>New or revised financial reporting standards.</li>
 <li>New laws and regulations.</li>
 </ul>
 <p className="mt-1">Inquire about F/S disclosures requiring special consideration, such as related-party transactions or management's assessment of the entity's ability to continue as a going concern.</p>
 </div>

 <SectionConclusion value={data.conclusionD} sectionLetter="D" locked={locked} onChange={v => setField("conclusionD", v)} />
 </div>
 );

 // ── Section E ─────────────────────────────────────────────────────────────────

 const SectionE = (
 <div className="space-y-5">
 <SectionCard title="E. Investments">
 <FieldRow label="Overall entity structure" sublabel="Subsidiaries, joint arrangements, partnerships, etc. Obtain or prepare a chart where applicable. Document related parties" {...sf("entityStructure")} />
 <FieldRow label="Major investments, loans, joint arrangements, capital projects or outsourcing activities." sublabel="Complete the table below." {...sf("majorInvestments")} />
 </SectionCard>

 <TableCard title="Major investments and capital projects" onAdd={() => addRow("investmentRows", emptyInvestmentRow)}>
 <table className="w-full min-w-[700px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Name of Entity / Capital Project</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-32">Approx. $ Amount</th>
 <th className="px-4 py-2.5 text-center w-32 text-sm font-semibold text-foreground uppercase tracking-wider">Consolidated in F/S? (Y/N)</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Purpose of Investment</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Significant Terms</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.investmentRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors">
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.name} onChange={e => updateRow<InvestmentRow>("investmentRows", i, { name: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Name" />
 </td>
 <td className="px-4 py-2 align-top w-32">
 <Input disabled={locked} value={row.amount} onChange={e => updateRow<InvestmentRow>("investmentRows", i, { amount: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="$" />
 </td>
 <td className="px-4 py-2 align-top w-32">
 <Select value={row.consolidated} onValueChange={v => updateRow<InvestmentRow>("investmentRows", i, { consolidated: v as YN })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent><SelectItem value="Y">Y</SelectItem><SelectItem value="N">N</SelectItem></SelectContent>
 </Select>
 </td>
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.purpose} onChange={e => updateRow<InvestmentRow>("investmentRows", i, { purpose: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Purpose…" />
 </td>
 <td className="px-4 py-2 align-top">
 <Input disabled={locked} value={row.terms} onChange={e => updateRow<InvestmentRow>("investmentRows", i, { terms: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Terms…" />
 </td>
 <DeleteCell onDelete={() => deleteRow("investmentRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="E. Investments (continued)">
 <FieldRow label="Planned or recently executed acquisitions or divestitures." {...sf("acquisitions")} />
 <FieldRow label="Use of off-balance sheet finance, special-purpose entities and other complex financing arrangements." {...sf("offBalance")} />
 </SectionCard>

 <SectionConclusion value={data.conclusionE} sectionLetter="E" locked={locked} onChange={v => setField("conclusionE", v)} />
 </div>
 );

 // ── Section F ─────────────────────────────────────────────────────────────────

 const SectionF = (
 <div className="space-y-5">
 <SectionCard title="F. Financing">
 <FieldRow label="Debt structure and related terms" sublabel="Including off-balance sheet financing arrangements (e.g., leasing). Complete the table below." {...sf("debtStructure")} />
 </SectionCard>

 <TableCard title="Debt and financing arrangements" onAdd={() => addRow("financingRows", emptyFinancingRow)}>
 <table className="w-full min-w-[700px] border-collapse">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Name of Creditor</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-32">Amount of Financing</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">Interest Rate</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-28">Maturity Date</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Terms, Loan Security and Covenants</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.financingRows.map((row, i) => (
 <tr key={row.id} className="group hover:bg-muted/30 transition-colors align-top">
 <td className="px-4 py-2">
 <Input disabled={locked} value={row.creditor} onChange={e => updateRow<FinancingRow>("financingRows", i, { creditor: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="Creditor" />
 </td>
 <td className="px-4 py-2 w-32">
 <Input disabled={locked} value={row.amount} onChange={e => updateRow<FinancingRow>("financingRows", i, { amount: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="$" />
 </td>
 <td className="px-4 py-2 w-28">
 <Input disabled={locked} value={row.rate} onChange={e => updateRow<FinancingRow>("financingRows", i, { rate: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="%" />
 </td>
 <td className="px-4 py-2 w-28">
 <Input disabled={locked} value={row.maturity} onChange={e => updateRow<FinancingRow>("financingRows", i, { maturity: e.target.value })}
 className="h-8 text-sm bg-background" placeholder="YYYY-MM-DD" />
 </td>
 <td className="px-4 py-2">
 <Textarea disabled={locked} value={row.terms} onChange={e => updateRow<FinancingRow>("financingRows", i, { terms: e.target.value })}
 className="min-h-[40px] text-sm bg-background resize-none" placeholder="Terms, security, covenants…" />
 </td>
 <DeleteCell onDelete={() => deleteRow("financingRows", i)} locked={locked} />
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>

 <SectionCard title="F. Financing (continued)">
 <FieldRow label="Use of derivative financial instruments." {...sf("derivatives")} />
 <FieldRow label="Externally imposed performance targets" sublabel="Established by banks, investors and other lenders that management is expected to achieve." {...sf("imposedTargets")} />
 <FieldRow
 label="Changes to financing arrangements during the period"
 sublabel="Consider: new financing, refinancing, debt extinguishment, debt modifications, future plans."
 {...sf("financingChanges")}
 />
 </SectionCard>

 <SectionConclusion value={data.conclusionF} sectionLetter="F" locked={locked} onChange={v => setField("conclusionF", v)} />
 </div>
 );

 // ── Section G ─────────────────────────────────────────────────────────────────

 const SectionG = (
 <div className="space-y-5">
 <SectionCard title="G. Measurement / Review of Financial Performance">
 <FieldRow
 label="Preparation, use and review of budgets, forecasts, variance analyses and key performance indicators (financial and non-financial), and key ratios and trends."
 {...sf("budgetsForecasts")}
 />
 <FieldRow label="Use of employee performance measures in incentive compensation policies." {...sf("perfMeasures")} />
 <FieldRow
 label="Use of externally imposed performance targets"
 sublabel="Established by banks, investors and other lenders that management is expected to achieve (e.g., bank covenants)."
 {...sf("externalTargets")}
 />
 <FieldRow label="Performance comparisons made with competitors." {...sf("perfComparisons")} />
 </SectionCard>

 <SectionConclusion value={data.conclusionG} sectionLetter="G" locked={locked} onChange={v => setField("conclusionG", v)} />
 </div>
 );

 // ── Conclusion ────────────────────────────────────────────────────────────────

 const SectionZ = (
 <div className="space-y-5">
 {/* Notes */}
 <div className="bg-card border border-border rounded-md p-5 space-y-2">
 <h3 className="text-sm font-semibold text-foreground">Notes</h3>
 <Textarea
 disabled={locked}
 value={data.notes}
 onChange={e => setField("notes", e.target.value)}
 placeholder="Additional observations, cross-references to Forms 520 / 511 / 551, follow-ups…"
 className="min-h-[90px] text-sm resize-none rounded-[10px]"
 />
 </div>

 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border">
 <span className="text-sm font-semibold text-foreground">Overall Conclusion</span>
 </div>
 <div className="px-6 py-5 space-y-4">
 <p className="text-sm text-muted-foreground">
 We have performed risk assessment procedures to identify events, conditions and circumstances that may result in a material misstatement in the F/S and have documented the risk factors identified
 </p>
 <Textarea
 disabled={locked}
 value={data.overallConclusion}
 onChange={e => setField("overallConclusion", e.target.value)}
 placeholder="Document your overall conclusion and any additional observations…"
 className="min-h-[120px] text-sm resize-none bg-background"
 />
 </div>
 </div>
 </div>
 );

 return (
 <div className="flex flex-col h-full">
 {isDemoEngagement && (
  <LukaStatusBar
    isActive={true}
    message={
      lukaState === 'loading'
        ? "Luka is populating fields from prior file and connected sources…"
        : lukaState === 'done'
        ? "Luka has reviewed this section — fields flagged for your review."
        : "Luka is populating information from Xero and prior file…"
    }
    actions={lukaState === 'loading' ? [] : DEMO_LUKA_ACTIONS.riskAssessment.actions.map(a => ({
      ...a,
      onTrigger: () => {
        setLukaState('loading');
        lukaSequentialFill([
          {
            scrollRef: firstFillRef,
            set: () => {
              setData(d => ({ ...d, entityType: { ...d.entityType, response: isUS ? 'Privately-held Delaware LLC, taxed as a C-corporation. Not SEC-registered.' : 'Private Canadian corporation incorporated under the CBCA. Not publicly listed; primary banking facility with RBC Commercial Banking.' } }));
              markLukaFilled('entityType');
            },
          },
          {
            set: () => {
              setData(d => ({ ...d, entityActivity: { ...d.entityActivity, response: isUS ? 'Harbor Freight LLC operates a US Pacific-coast short-sea shipping and port-drayage business. NAICS 483113.' : 'Shipping Line Inc. operates a coastal and trans-Pacific freight shipping line serving the Port of Vancouver, Seattle and select Asia-Pacific ports. Industry: marine freight transportation (NAICS 483115).' } }));
              markLukaFilled('entityActivity');
            },
          },
          {
            set: () => {
              setData(d => ({ ...d, revenues: { ...d.revenues, response: isUS ? 'Container drayage (≈55%), short-sea voyages (≈30%), warehousing & 3PL (≈15%). See revenue table below.' : 'Three primary revenue streams: container freight (≈68%), bulk cargo (≈22%) and chartered vessel services (≈10%). See revenue table below.' } }));
              markLukaFilled('revenues');
            },
          },
        ], () => setLukaState('done'));
      },
    }))}
  />
 )}
 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Perform and document risk assessment procedures to identify events, conditions and circumstances that may result in a material misstatement through understanding the entity, its environment and the applicable financial reporting framework. Identified risk factors are carried forward Review and update this form each period.
 </p>
 </div>
 <div className="p-6 space-y-5">
 {SectionA}
 {SectionB}
 {SectionC}
 {SectionD}
 {SectionE}
 {SectionF}
 {SectionG}
 {SectionZ}

 <WorksheetSignOff worksheetKey="audit-510" engagementId={engagementId ?? "default"} />

 {locked ? (
 <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { setData(d => { const next = {...d, concluded: false, concludedOn: '' }; writeJsonToLocalStorage(storageKey, next); return next; }); }} />
 ) : (
 <div className="flex justify-end">
 <Button
 disabled={locked}
 onClick={() => {
 const now = new Date().toISOString();
 setData(d => {
 const next = {...d, concluded: true, concludedOn: now };
 writeJsonToLocalStorage(storageKey, next);
 return next;
 });
 }}
 >
 Conclude Worksheet
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
