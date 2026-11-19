export interface SectionNode {
 id: string; code?: string; label: string;
 icon?: "checklist" | "letter" | "folder" | "doc" | "completion" | "book" | "worksheet";
 hasPlus?: boolean; route?: string; children?: SectionNode[];
}
export function engagementSidebarTrees(engFirstYear: boolean) {
 const usAuditEngagementTree: SectionNode[] = [
 {
 id: "aud-us-co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
...(engFirstYear ? [{ id: "aud-us-form-408", code: "408", label: "Initial Audit Engagements", icon: "checklist" as const, route: "checklist/aud-us-form-408" }] : []),
 { id: "aud-us-form-410", code: "410", label: engFirstYear ? "New Engagement — Acceptance/Continuance" : "Existing Engagement — Acceptance/Continuance", icon: "checklist", route: "checklist/aud-us-form-410" },
 { id: "aud-us-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/aud-us-el" },
 ]
 },
 {
 id: "aud-us-pl-sec", code: "PL", label: "Planning", icon: "folder",
 children: [
 { id: "aud-us-mat", code: "420", label: "Materiality", icon: "worksheet", route: "checklist/aud-us-mat" },
 { id: "aud-us-sae", code: "428", label: "Auditor's Expert", icon: "worksheet", route: "checklist/aud-us-sae" },
 { id: "aud-us-asm", code: "430", label: "Overall Audit Strategy", icon: "worksheet", route: "checklist/aud-us-asm" },
 { id: "aud-us-plan", code: "436", label: "Team Planning Discussions", icon: "worksheet", route: "checklist/aud-us-plan" },
 { id: "aud-us-tt", code: "450", label: "Time Tracker", icon: "worksheet", route: "checklist/aud-us-tt" },
 ]
 },
 {
 id: "aud-us-ra-sec", code: "RA", label: "Risk Assessment", icon: "folder",
 children: [
 { id: "aud-us-ra-rap", code: "RAP", label: "Risk Assessment Procedures", icon: "checklist", route: "checklist/aud-us-ra-rap" },
 { id: "aud-us-ra-ic", code: "IC", label: "Understanding Internal Controls", icon: "checklist", route: "checklist/aud-us-ra-ic" },
 { id: "aud-us-ra-itgc", code: "ITGC", label: "IT General Controls (ITGC)", icon: "checklist", route: "checklist/aud-us-ra-itgc" },
 { id: "aud-us-ra-fraud", code: "FRA", label: "Fraud Risk Assessment (AU-C 240)", icon: "checklist", route: "checklist/aud-us-ra-fraud" },
 { id: "aud-us-ra-srr", code: "SRR", label: "Significant Risks Register", icon: "checklist", route: "checklist/aud-us-ra-srr" },
 { id: "aud-us-ra-rmm", code: "RMM", label: "Risk of Material Misstatement (RMM)", icon: "checklist", route: "checklist/aud-us-ra-rmm" },
 { id: "aud-us-ra-scot-rev", code: "S1", label: "SCOT — Revenue Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-rev" },
 { id: "aud-us-ra-scot-exp", code: "S2", label: "SCOT — Expenditure Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-exp" },
 { id: "aud-us-ra-scot-pay", code: "S3", label: "SCOT — Payroll Cycle", icon: "checklist", route: "checklist/aud-us-ra-scot-pay" },
 { id: "aud-us-ra-gc", code: "GC", label: "Going Concern (Initial Assessment)", icon: "checklist", route: "checklist/aud-us-ra-gc" },
 { id: "aud-us-ra-je", code: "JE", label: "Journal Entry Testing Log (AU-C 240)", icon: "checklist", route: "checklist/aud-us-ra-je" },
 ]
 },
 {
 id: "aud-us-rp-sec", code: "RP", label: "Response to Assessed Risks", icon: "folder",
 children: [
 { id: "aud-us-rp-oar", code: "OAR", label: "Overall Audit Response", icon: "checklist", route: "checklist/aud-us-rp-oar" },
 { id: "aud-us-rp-toc", code: "TOC", label: "Test of Controls", icon: "checklist", route: "checklist/aud-us-rp-toc" },
 { id: "aud-us-rp-sap", code: "SAP", label: "Substantive Analytical Procedures", icon: "checklist", route: "checklist/aud-us-rp-sap" },
 { id: "aud-us-rp-tod-rev", code: "TR", label: "Test of Details — Revenue", icon: "checklist", route: "checklist/aud-us-rp-tod-rev" },
 { id: "aud-us-rp-tod-exp", code: "TE", label: "Test of Details — Expenses", icon: "checklist", route: "checklist/aud-us-rp-tod-exp" },
 { id: "aud-us-rp-rpt", code: "RPT", label: "Related Party Transactions (ASC 850 / AU-C 550)", icon: "checklist", route: "checklist/aud-us-rp-rpt" },
 { id: "aud-us-rp-gwi", code: "GWI", label: "Goodwill Impairment Assessment (ASC 350)", icon: "checklist", route: "checklist/aud-us-rp-gwi" },
 { id: "aud-us-rp-aps", code: "APS", label: "Audit Procedures Summary", icon: "checklist", route: "checklist/aud-us-rp-aps" },
 ]
 },
 {
 id: "aud-us-do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "aud-us-do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "aud-us-do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "aud-us-do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "aud-us-do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 { id: "aud-us-do-cma", code: "CMA", label: "Contracts & Material Agreements", icon: "folder" },
 { id: "aud-us-do-cmb", code: "CMB", label: "Corporate Minute Book", icon: "folder" },
 { id: "aud-us-do-rcf", code: "RCF", label: "Regulatory & Compliance Filings", icon: "folder" },
 ]
 },
 {
 id: "aud-us-tb", code: "TB", label: "Trial Balance & Adjusting Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "aud-us-pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "aud-us-pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "aud-us-pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "aud-us-wp-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/aud-us-wp-a" },
 { id: "aud-us-wp-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/aud-us-wp-b" },
 { id: "aud-us-wp-c", code: "C", label: "Inventories", icon: "book", route: "procedure/aud-us-wp-c" },
 { id: "aud-us-wp-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/aud-us-wp-d" },
 { id: "aud-us-wp-e", code: "E", label: "Loans and notes receivable", icon: "book", route: "procedure/aud-us-wp-e" },
 { id: "aud-us-wp-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/aud-us-wp-i" },
 ]
 },
 {
 id: "aud-us-pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "aud-us-wp-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/aud-us-wp-h" },
 ]
 },
 {
 id: "aud-us-pr-lta", label: "Long-term assets", icon: "folder",
 children: [
 { id: "aud-us-wp-k", code: "K", label: "Long-term investments", icon: "book", route: "procedure/aud-us-wp-k" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "aud-us-pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "aud-us-wp-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/aud-us-wp-bb" },
 { id: "aud-us-wp-cc", code: "CC", label: "Taxes payable", icon: "book", route: "procedure/aud-us-wp-cc" },
 { id: "aud-us-wp-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/aud-us-wp-dd" },
 ]
 },
 {
 id: "aud-us-pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "aud-us-wp-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/aud-us-wp-jj" },
 { id: "aud-us-wp-kk", code: "KK", label: "Long-term debt", icon: "book", route: "procedure/aud-us-wp-kk" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "aud-us-pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "aud-us-wp-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/aud-us-wp-tt" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "aud-us-pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "aud-us-wp-20", code: "20", label: "Revenue", icon: "book", route: "procedure/aud-us-wp-20" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-cos", label: "Cost of sales", icon: "folder",
 children: [
 {
 id: "aud-us-pr-cos-sub", label: "Cost of sales", icon: "folder",
 children: [
 { id: "aud-us-wp-30", code: "30", label: "Cost of sales", icon: "book", route: "procedure/aud-us-wp-30" },
 ]
 },
 ]
 },
 {
 id: "aud-us-pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "aud-us-pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "aud-us-wp-40", code: "40", label: "Expenses", icon: "book", route: "procedure/aud-us-wp-40" },
 ]
 },
 {
 id: "aud-us-pr-oie", label: "Other Income(Expenses)", icon: "folder",
 children: [
 { id: "aud-us-wp-80", code: "80", label: "Other expenses (income)", icon: "book", route: "procedure/aud-us-wp-80" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "aud-us-fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "aud-us-fs-docs", label: "Financial Statement Docs", icon: "folder",
 children: [
 { id: "aud-us-fs-cover", label: "Cover Page", icon: "doc", route: "checklist/aud-us-fs-cover" },
 { id: "aud-us-fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/aud-us-fs-toc" },
 { id: "aud-us-fs-iar", label: "Independent Auditor's Report (AU-C 700)", icon: "checklist", route: "checklist/aud-us-ar" },
 { id: "aud-us-fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/aud-us-fs-bs" },
 { id: "aud-us-fs-is", label: "Statement of Income (Loss) and Retained Earnings (Deficit)", icon: "doc", route: "checklist/aud-us-fs-is" },
 { id: "aud-us-fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/aud-us-fs-cf" },
 { id: "aud-us-fs-eq", label: "Statement of Changes in Equity", icon: "doc", route: "checklist/aud-us-fs-eq" },
 { id: "aud-us-fs-notes", label: "Notes to Financial Statements", icon: "doc", route: "checklist/aud-us-fs-notes" },
 ]
 },
 ]
 },
 {
 id: "aud-us-so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "aud-us-so-aim", code: "AIM", label: "Misstatements", icon: "worksheet", route: "checklist/aud-us-so-aim" },
 { id: "aud-us-so-far", code: "FAR", label: "Final Analytical Review", icon: "checklist", route: "checklist/aud-us-so-far" },
 { id: "aud-us-subseq", code: "SE", label: "Subsequent Events", icon: "checklist", route: "checklist/aud-us-subseq" },
 { id: "aud-us-wgc-final", code: "GC", label: "Going Concern (Final Assessment)", icon: "checklist", route: "checklist/aud-us-wgc-final" },
 { id: "aud-us-so-sd", code: "SD", label: "Notes on Significant Audit Decisions (AU-C 230)", icon: "checklist", route: "checklist/aud-us-so-sd" },
 { id: "aud-us-so-kam", code: "KAM", label: "Key Audit Matters Worksheet (AU-C 701)", icon: "checklist", route: "checklist/aud-us-so-kam" },
 { id: "aud-us-so-find", code: "FND", label: "Audit Findings and Matters for Discussion", icon: "checklist", route: "checklist/aud-us-so-find" },
 { id: "aud-us-so-mc", code: "MC", label: "Matters Communicated to Management and TCWG", icon: "checklist", route: "checklist/aud-us-so-mc" },
 { id: "aud-us-so-fc", code: "FC", label: "Matters for Future Consideration", icon: "checklist", route: "checklist/aud-us-so-fc" },
 { id: "aud-us-so-dc", code: "CON", label: "Documenting Consultation", icon: "checklist", route: "checklist/aud-us-so-dc" },
 { id: "aud-us-mr", code: "MR", label: "Management Representation Letter (AU-C 580)", icon: "letter", route: "checklist/aud-us-mr" },
 { id: "aud-us-sig-def", code: "IC", label: "Internal Control Deficiencies Communication (AU-C 265)", icon: "letter", route: "checklist/aud-us-sig-def" },
 { id: "aud-us-tcwg-fin", code: "TCWG", label: "Communication with Those Charged with Governance (AU-C 260)", icon: "letter", route: "checklist/aud-us-tcwg-fin" },
 { id: "aud-us-comp", code: "CM", label: "Completion Checklist", icon: "completion", route: "checklist/aud-us-comp" },
 { id: "aud-us-disc", code: "DC", label: "Disclosure Checklist", icon: "checklist" },
 { id: "aud-us-ep", code: "QCR", label: "Quality Control Review", icon: "completion", route: "checklist/aud-us-ep" },
 { id: "aud-us-so-wd", code: "WD", label: "Withdrawal Worksheet (AU-C 705)", icon: "checklist", route: "checklist/aud-us-so-wd" },
 { id: "aud-us-so-sign", code: "SO", label: "Signoffs", icon: "completion" },
 { id: "aud-us-so-fr", code: "FR", label: "Final Review", icon: "completion" },
 { id: "aud-us-so-alf", code: "ALF", label: "Archive & Lock File", icon: "completion" },
 ]
 },
 ];

 const auditEngagementTree: SectionNode[] = [
 {
 id: "aud-co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
...(engFirstYear ? [{ id: "aud-form-408", code: "408", label: "Initial Audit Engagements", icon: "checklist" as const, route: "checklist/aud-form-408" }] : []),
 { id: "aud-form-410", code: "410", label: engFirstYear ? "New Engagement — Acceptance/Continuance" : "Existing Engagement — Acceptance/Continuance", icon: "checklist", route: "checklist/aud-form-410" },
 { id: "aud-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/aud-el" },
 ]
 },
 {
 id: "aud-pl-sec", code: "PL", label: "Planning", icon: "folder",
 children: [
 { id: "aud-mat", code: "420", label: "Materiality", icon: "worksheet", route: "checklist/aud-mat" },
 { id: "aud-sae", code: "428", label: "Auditor's Expert", icon: "worksheet", route: "checklist/aud-sae" },
 { id: "aud-asm", code: "430", label: "Overall Audit Strategy", icon: "worksheet", route: "checklist/aud-asm" },
 { id: "aud-plan", code: "436", label: "Team Planning Discussions", icon: "worksheet", route: "checklist/aud-plan" },
 { id: "aud-tt", code: "450", label: "Time Tracker", icon: "worksheet", route: "checklist/aud-tt" },
 ]
 },
 {
 id: "aud-ra-sec", code: "RA", label: "Risk Assessment", icon: "folder",
 children: [
 {
 id: "aud-ra-gather", code: "GI", label: "Gather Information", icon: "folder",
 children: [
 { id: "aud-ra-oi", code: "500", label: "Observation & Inspection", icon: "checklist", route: "checklist/aud-ra-oi" },
 { id: "aud-ra-pap501bc", code: "501-A", label: "Preliminary Analytical", icon: "worksheet", route: "checklist/aud-ra-pap501bc" },
 { id: "aud-ra-pap501a", code: "501-B", label: "Preliminary Analytical", icon: "checklist", route: "checklist/aud-ra-pap501a" },
 { id: "aud-ra-505", code: "505", label: "Mgmt Inquiries", icon: "checklist", route: "checklist/aud-ra-505" },
 { id: "aud-ra-507", code: "507", label: "Governance Minutes", icon: "worksheet", route: "checklist/aud-ra-507" },
 { id: "aud-ra-510", code: "510", label: "Entity Understanding", icon: "worksheet", route: "checklist/aud-ra-510" },
 { id: "aud-ra-511", code: "511", label: "IT Environment", icon: "worksheet", route: "checklist/aud-ra-511" },
 { id: "aud-ra-514", code: "514", label: "Prior Period Estimates", icon: "worksheet", route: "checklist/aud-ra-514" },
 ]
 },
 {
 id: "aud-ra-identify", code: "IR", label: "Identify Risk", icon: "folder",
 children: [
 { id: "aud-ra-506", code: "506", label: "Fraud", icon: "checklist", route: "checklist/aud-ra-506" },
 { id: "aud-ra-580", code: "580", label: "Revenue Recognition", icon: "worksheet", route: "checklist/aud-ra-580" },
 { id: "aud-ra-513", code: "513", label: "Accounting Estimates", icon: "worksheet", route: "checklist/aud-ra-513" },
 { id: "aud-ra-515", code: "515", label: "Related Parties", icon: "worksheet", route: "checklist/aud-ra-515" },
 { id: "aud-ra-525", code: "525", label: "Going Concern", icon: "checklist", route: "checklist/aud-ra-525" },
 { id: "aud-ra-530", code: "530", label: "Entity Level - Risks and Controls", icon: "checklist", route: "checklist/aud-ra-530" },
 { id: "aud-ra-520", code: "520", label: "Risk Register", icon: "worksheet", route: "checklist/aud-ra-520" },
 { id: "aud-ra-590", code: "590", label: "Engagement Scoping", icon: "worksheet", route: "checklist/aud-ra-590" },
 ]
 },
 {
 id: "aud-ra-respond", code: "PR", label: "Populate Responses", icon: "folder",
 children: [
 { id: "aud-ra-535", code: "535", label: "Info System", icon: "worksheet", route: "checklist/aud-ra-535" },
 { id: "aud-ra-540", code: "540", label: "Control Design", icon: "worksheet", route: "checklist/aud-ra-540" },
 { id: "aud-ra-550", code: "550", label: "Control Activities", icon: "worksheet", route: "checklist/aud-ra-550" },
 { id: "aud-ra-551", code: "551", label: "General IT Controls", icon: "worksheet", route: "checklist/aud-ra-551" },
 { id: "aud-ra-575", code: "575", label: "Control Deficiencies", icon: "worksheet", route: "checklist/aud-ra-575" },
 ]
 },
 ]
 },
 {
 id: "aud-rp-sec", code: "RP", label: "Response to Assessed Risks", icon: "folder",
 children: [
 { id: "aud-rp-605", code: "605", label: "Risk Responses", icon: "worksheet", route: "checklist/aud-rp-605" },
 { id: "aud-rp-610", code: "610", label: "Sampling — Tests of Details", icon: "worksheet", route: "checklist/aud-rp-610" },
 { id: "aud-rp-625", code: "625", label: "Going Concern", icon: "worksheet", route: "checklist/aud-rp-625" },
 { id: "aud-rp-630", code: "630", label: "Confirmations", icon: "worksheet", route: "checklist/aud-rp-630" },
 { id: "aud-rp-635", code: "635", label: "Accounting Estimates", icon: "worksheet", route: "checklist/aud-rp-635" },
 { id: "aud-rp-645", code: "645", label: "Litigation, Claims and Non-Compliance", icon: "worksheet", route: "checklist/aud-rp-645" },
 { id: "aud-rp-666", code: "666", label: "Related Parties", icon: "worksheet", route: "checklist/aud-rp-666" },
 { id: "aud-rp-670", code: "670", label: "Use of Journal Entries", icon: "worksheet", route: "checklist/aud-rp-670" },
 { id: "aud-rp-680", code: "680", label: "ASPE Supplementary Audit Procedures", icon: "worksheet", route: "checklist/aud-rp-680" },
 ]
 },
 {
 id: "aud-do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "aud-do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "aud-do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "aud-do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "aud-do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 { id: "aud-do-cma", code: "CMA", label: "Contracts & Material Agreements", icon: "folder" },
 { id: "aud-do-cmb", code: "CMB", label: "Corporate Minute Book", icon: "folder" },
 { id: "aud-do-rcf", code: "RCF", label: "Regulatory & Compliance Filings", icon: "folder" },
 ]
 },
 {
 id: "aud-tb", code: "TB", label: "Trial Balance & Adjusting Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "aud-pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "aud-pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "aud-pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "aud-wp-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/aud-wp-a" },
 { id: "aud-wp-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/aud-wp-b" },
 { id: "aud-wp-c", code: "C", label: "Inventories", icon: "book", route: "procedure/aud-wp-c" },
 { id: "aud-wp-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/aud-wp-d" },
 { id: "aud-wp-e", code: "E", label: "Loans and notes receivable", icon: "book", route: "procedure/aud-wp-e" },
 { id: "aud-wp-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/aud-wp-i" },
 ]
 },
 {
 id: "aud-pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "aud-wp-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/aud-wp-h" },
 ]
 },
 {
 id: "aud-pr-lta", label: "Long-term assets", icon: "folder",
 children: [
 { id: "aud-wp-f", code: "F", label: "Intangibles and goodwill", icon: "book", route: "procedure/aud-wp-f" },
         { id: "aud-wp-k", code: "K", label: "Long-term investments", icon: "book", route: "procedure/aud-wp-k" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "aud-pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "aud-wp-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/aud-wp-bb" },
 { id: "aud-wp-cc", code: "CC", label: "Taxes payable", icon: "book", route: "procedure/aud-wp-cc" },
 { id: "aud-wp-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/aud-wp-dd" },
 ]
 },
 {
 id: "aud-pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "aud-wp-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/aud-wp-jj" },
 { id: "aud-wp-kk", code: "KK", label: "Long-term debt", icon: "book", route: "procedure/aud-wp-kk" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "aud-pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "aud-wp-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/aud-wp-tt" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "aud-pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "aud-wp-20", code: "20", label: "Revenue", icon: "book", route: "procedure/aud-wp-20" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-cos", label: "Cost of sales", icon: "folder",
 children: [
 {
 id: "aud-pr-cos-sub", label: "Cost of sales", icon: "folder",
 children: [
 { id: "aud-wp-30", code: "30", label: "Cost of sales", icon: "book", route: "procedure/aud-wp-30" },
 ]
 },
 ]
 },
 {
 id: "aud-pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "aud-pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "aud-wp-40", code: "40", label: "Expenses", icon: "book", route: "procedure/aud-wp-40" },
 ]
 },
 {
 id: "aud-pr-oie", label: "Other Income(Expenses)", icon: "folder",
 children: [
 { id: "aud-wp-80", code: "80", label: "Other expenses (income)", icon: "book", route: "procedure/aud-wp-80" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "aud-fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "aud-fs-docs", label: "Financial Statement Docs", icon: "folder",
 children: [
 { id: "aud-fs-cover", label: "Cover Page", icon: "doc", route: "checklist/aud-fs-cover" },
 { id: "aud-fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/aud-fs-toc" },
 { id: "aud-fs-iar", label: "Independent Auditor's Report", icon: "doc", route: "checklist/aud-fs-iar" },
 { id: "aud-fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/aud-fs-bs" },
 { id: "aud-fs-is", label: "Statement of Income (Loss) and Retained Earnings (Deficit)", icon: "doc", route: "checklist/aud-fs-is" },
 { id: "aud-fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/aud-fs-cf" },
 { id: "aud-fs-notes", label: "Notes to Financial Statements", icon: "doc", route: "checklist/aud-fs-notes" },
 ]
 },
 ]
 },
 {
 id: "aud-so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "aud-rp-655", code: "655", label: "Final Analytics", icon: "worksheet", route: "checklist/aud-rp-655" },
 { id: "aud-so-aim", code: "AIM", label: "Misstatements", icon: "completion", route: "checklist/aud-so-aim" },
 { id: "aud-mr", code: "314", label: "Mgmt Representations", icon: "checklist", route: "checklist/aud-mr" },
 { id: "aud-rp-650", code: "650", label: "Subsequent Events", icon: "worksheet", route: "checklist/aud-rp-650" },
 { id: "aud-disc", code: "DC", label: "Disclosure", icon: "checklist", route: "checklist/aud-disc" },
 { id: "aud-so-sign", code: "SO", label: "Signoffs", icon: "completion", route: "checklist/aud-so-sign" },
 { id: "aud-so-fr", code: "FR", label: "Final Review", icon: "completion", route: "checklist/aud-so-fr" },
 { id: "aud-fs-iar", code: "305", label: "Auditor's Report", icon: "checklist", route: "checklist/aud-ar" },
 { id: "aud-so-306", code: "306", label: "Modified Opinion", icon: "checklist", route: "checklist/aud-so-306" },
 { id: "aud-so-310", code: "310", label: "Audit Completion", icon: "checklist", route: "checklist/aud-so-310" },
 { id: "aud-so-311", code: "311", label: "Withdrawal", icon: "worksheet", route: "checklist/aud-so-311" },
 { id: "aud-so-312", code: "312", label: "Engagement Partner", icon: "checklist", route: "checklist/aud-so-312" },
 { id: "aud-so-313", code: "313", label: "Supplementary Info", icon: "checklist", route: "checklist/aud-so-313" },
 { id: "aud-so-320", code: "320", label: "Significant Decisions", icon: "worksheet", route: "checklist/aud-so-320" },
 { id: "aud-so-325", code: "325", label: "Key Audit Matters", icon: "worksheet", route: "checklist/aud-so-325" },
 { id: "aud-so-330", code: "330", label: "Findings & Discussion", icon: "worksheet", route: "checklist/aud-so-330" },
 { id: "aud-so-335", code: "335", label: "Identified Misstatements", icon: "worksheet", route: "checklist/aud-so-335" },
 { id: "aud-so-340", code: "340", label: "Mgmt & TCWG Matters", icon: "worksheet", route: "checklist/aud-so-340" },
 { id: "aud-so-370", code: "370", label: "Future Considerations", icon: "worksheet", route: "checklist/aud-so-370" },
 { id: "aud-so-375", code: "375", label: "Consultation", icon: "worksheet", route: "checklist/aud-so-375" },
 { id: "aud-comp", code: "CM", label: "Completion", icon: "completion", route: "checklist/aud-comp" },
 ]
 },
 ];

 const engagementTree: SectionNode[] = [
 {
 id: "co", code: "CO", label: "Client Onboarding", icon: "folder",
 children: [
 { id: "co-ca", code: "CA", label: "Client acceptance and continuance", icon: "checklist", route: "checklist/co-ca" },
 { id: "co-ind", code: "IND", label: "Independence", icon: "checklist", route: "checklist/co-ind" },
 { id: "co-kcb", code: "KCB", label: "Knowledge of client business", icon: "checklist", route: "checklist/co-kcb" },
 { id: "co-pl", code: "PL", label: "Planning", icon: "checklist", route: "checklist/co-pl" },
 { id: "co-el", code: "AL1.1", label: "Engagement Letter", icon: "letter", route: "checklist/co-el" },
 { id: "co-mr", code: "MR", label: "Management responsibility and acknowledgement", icon: "letter", route: "checklist/co-mr" },
 ]
 },
 {
 id: "do", code: "DO", label: "Documents", icon: "folder", hasPlus: true,
 children: [
 { id: "do-sha", code: "SHA", label: "Shareholders Agreements", icon: "folder" },
 { id: "do-ren", code: "REN", label: "Rental/Lease Agreements", icon: "folder" },
 { id: "do-inc", code: "INC", label: "Incorporation Documents", icon: "folder" },
 { id: "do-ban", code: "BAN", label: "Banking Agreements", icon: "folder" },
 ]
 },
 {
 id: "tb", code: "TB", label: "Trial Balance & Adj. Entries", icon: "folder", route: "trial-balance"
 },
 {
 id: "pr", code: "PR", label: "Procedures", icon: "folder",
 children: [
 {
 id: "pr-assets", label: "Assets", icon: "folder",
 children: [
 {
 id: "pr-ca", label: "Current assets", icon: "folder",
 children: [
 { id: "pr-ca-a", code: "A", label: "Cash and cash equivalents", icon: "book", route: "procedure/pr-ca-a" },
 { id: "pr-ca-b", code: "B", label: "Accounts receivable", icon: "book", route: "procedure/pr-ca-b" },
 { id: "pr-ca-c", code: "C", label: "Inventories", icon: "book", route: "procedure/pr-ca-c" },
 { id: "pr-ca-d", code: "D", label: "Short-term investments", icon: "book", route: "procedure/pr-ca-d" },
 { id: "pr-ca-i", code: "I", label: "Other current assets", icon: "book", route: "procedure/pr-ca-i" },
 ]
 },
 {
 id: "pr-ppe", label: "Property, plant and equipment", icon: "folder",
 children: [
 { id: "pr-ppe-h", code: "H", label: "Property, plant and equipment", icon: "book", route: "procedure/pr-ppe-h" },
 ]
 },
 ]
 },
 {
 id: "pr-liab", label: "Liabilities", icon: "folder",
 children: [
 {
 id: "pr-cl", label: "Current liabilities", icon: "folder",
 children: [
 { id: "pr-cl-aa", code: "AA", label: "Bank overdraft", icon: "book", route: "procedure/pr-cl-aa" },
 { id: "pr-cl-bb", code: "BB", label: "Accounts payable", icon: "book", route: "procedure/pr-cl-bb" },
 { id: "pr-cl-dd", code: "DD", label: "Short-term debt", icon: "book", route: "procedure/pr-cl-dd" },
 { id: "pr-cl-ee", code: "EE", label: "Deferred income", icon: "book", route: "procedure/pr-cl-ee" },
 ]
 },
 {
 id: "pr-ltl", label: "Long-term liabilities", icon: "folder",
 children: [
 { id: "pr-ltl-jj", code: "JJ", label: "Other long-term liabilities", icon: "book", route: "procedure/pr-ltl-jj" },
 ]
 },
 ]
 },
 {
 id: "pr-equity", label: "Equity", icon: "folder",
 children: [
 {
 id: "pr-sc", label: "Share capital", icon: "folder",
 children: [
 { id: "pr-sc-tt", code: "TT", label: "Equity", icon: "book", route: "procedure/pr-sc-tt" },
 ]
 },
 ]
 },
 {
 id: "pr-rev", label: "Revenue", icon: "folder",
 children: [
 {
 id: "pr-rev-sub", label: "Revenue", icon: "folder",
 children: [
 { id: "pr-rev-20", code: "20", label: "Revenue", icon: "book", route: "procedure/pr-rev-20" },
 ]
 },
 ]
 },
 {
 id: "pr-exp", label: "Expenses", icon: "folder",
 children: [
 {
 id: "pr-opex", label: "Operating expenses", icon: "folder",
 children: [
 { id: "pr-opex-40", code: "40", label: "Operating expenses", icon: "book", route: "procedure/pr-opex-40" },
 ]
 },
 ]
 },
 ]
 },
 {
 id: "fs", code: "FS", label: "Financial Statements", icon: "folder", hasPlus: true,
 children: [
 {
 id: "fs-docs", code: "FS", label: "Financial Statements Docs", icon: "folder",
 children: [
 { id: "fs-cover", label: "Cover Page", icon: "doc", route: "checklist/fs-cover" },
 { id: "fs-toc", label: "Table of Contents", icon: "doc", route: "checklist/fs-toc" },
 { id: "fs-comp", label: "Compilation report", icon: "doc", route: "checklist/fs-comp" },
 { id: "fs-bs", label: "Balance Sheet", icon: "doc", route: "checklist/fs-bs" },
 { id: "fs-is", label: "Statement of Income and Retained Earnings", icon: "doc", route: "checklist/fs-is" },
 { id: "fs-cf", label: "Statement of Cash Flows", icon: "doc", route: "checklist/fs-cf" },
 { id: "fs-notes", label: "Notes to Financial Information", icon: "doc", route: "checklist/fs-notes" },
 ]
 },
 ]
 },
 {
 id: "so", code: "SO", label: "Completion & Signoffs", icon: "folder",
 children: [
 { id: "so-cm", code: "CM", label: "Completion", icon: "completion" },
 { id: "so-so", code: "SO", label: "Signoffs", icon: "completion" },
 ]
 },
 ];

 return { usAuditEngagementTree, auditEngagementTree, engagementTree };
}
