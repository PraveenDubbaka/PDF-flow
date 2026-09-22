export interface PBCTemplate {
 id: string;
 label: string;
 wpRef: string;
 generate: (ctx: {
 clientName: string;
 engagementId: string;
 yearEnd: string;
 wpNumbers: string[];
 }) => string;
}

export const PBC_TEMPLATES: PBCTemplate[] = [
 {
 id: "memo-540",
 label: "Control Assessment and Documentation",
 wpRef: "540",
 generate: ({ clientName, engagementId, yearEnd }) => `# Control Assessment and Documentation

**FOR CLIENT TO COMPLETE**

**Client:** ${clientName} | **Engagement:** ${engagementId} | **Period:** ${yearEnd}

---

**Who:** ______________________________

**When:** ______________________________

**Where:** ______________________________

---

## Control Documentation

### Entity Level Controls

Company allocates tasks to different staffs on an ad hoc basis to management / consultants with the most related expertise. Management is also provided with funding to ensure their responsibilities can be carried out effectively.

The Company does not have any formal performance review and does not have any compensation for any of its management nor consultants. The level of work is assessed based on everyday observations.

Management monitors internal controls based on daily observation. The Company does not have a formal review and assessment of internal control effectiveness.

---

### IT General Controls

The Company does not have a formal IT department. Bookkeeping is performed by __________________ in __________________. The access to __________________ is not password protected. Access to __________________'s computer is password protected and only he as the CFO has access to the file.

---

### Financial Reporting Process

The Company does not have a formal financial reporting process. __________________ does bookkeeping for the Company in __________________. Invoices and supporting documents are sent to __________________ for processing and recording. Only the non-recurring journal entries entered by __________________ are reviewed by __________________.

Financial statements are prepared by __________________ in Microsoft Word using the trial balance generated from __________________. __________________ and __________________ review the financial statements and note disclosure. Final approval on financial statements will be obtained from audit committee/Board of Directors.

---

### Revenue

Explain revenue processes / controls (examples — sales order processing / recording shipping / sales receipts entry / credit control). Explain processes / controls to ensure revenue is reported in the correct period.

________________________________________________________________________________

________________________________________________________________________________

---

### Expenses, Disbursements, and A/P

To be revised as required. Explain processes relating to purchasing (examples — order initiating, receiving, payment etc.). Explain processes / controls to ensure expenditure is recorded in the correct period.

There are no formal policies relating to selection of vendors. New Vendors are selected based on directors' experience and the service required. Further, there are no purchase orders used in the process. The directors will contact vendors directly for work to be performed. All directors have the ability to initiate the purchases. For significant transactions, at the discretion of directors, they will have to be discussed and approved in the directors' resolutions.

Due to the limited number of transactions, directors are able to ensure all goods and services are received prior to payment. There is no bill of landing or initial to indicate goods ordered are received before recording / payments made. The directors will pay each vendor when funds are made available. There is no approval of invoices.

Two signatures are required on cheques. __________________, __________________ and __________________ have signing authority over the bank.

---

### Treasury Controls

Equity transactions are initiated through a directors' resolution for approval. Subscription agreements are prepared by __________________ in consult with legal, which are submitted by the Company to the transfer agent to issue share certificates. The Company uses __________________ to maintain its capital records.`,
 },
 {
 id: "it-questionnaire",
 label: "Questionnaire",
 wpRef: "IT",
 generate: ({ clientName, engagementId, yearEnd, wpNumbers }) => {
 const forms = wpNumbers && wpNumbers.length > 0 ? wpNumbers : ["511"];
 const formLabel = forms.join(", ");
 const blank = "\n\n________________________________________________________________________________\n";

 const SECTIONS: Record<string, { title: string; questions: string[] }> = {
 "505": {
 title: "Management Inquiries (WP 505)",
 questions: [
 "Describe management's process for identifying and assessing risks that could affect the financial statements.",
 "What are the significant changes to the Company's business, operations, or financial condition since the prior year?",
 "How does management monitor compliance with laws, regulations, and contractual obligations?",
 "Describe the process by which management reviews and approves journal entries, estimates, and judgments in the financial statements.",
 "Are there any matters management wishes to bring to the auditor's attention that may affect the audit?",
 ],
 },
 "506": {
 title: "Fraud Risk (WP 506)",
 questions: [
 "What controls are in place to prevent or detect fraud or error within the Company?",
 "Is management aware of any alleged, suspected, or actual fraud, misappropriation of assets, or irregularities involving any employee or management?",
 "Has the Company, or any officer or director, been subject to an investigation or received any communications from a regulatory authority?",
 "Describe the controls in place around the authorization of payments, expense claims, and journal entries to prevent unauthorized transactions.",
 "What is management's assessment of the Company's susceptibility to fraud, including management override of controls?",
 ],
 },
 "507": {
 title: "Governance Minutes (WP 507)",
 questions: [
 "How often does the Board of Directors / Audit Committee meet, and who is responsible for preparing and maintaining meeting minutes?",
 "What significant decisions or resolutions were approved by the Board during the year? Please provide a list.",
 "Describe the role of the Audit Committee in overseeing the financial reporting process and the external audit.",
 "Were there any changes to the composition of the Board or Audit Committee during the year? If so, please describe.",
 "How are significant transactions (e.g., acquisitions, disposals, major contracts) approved by the Board?",
 ],
 },
 "510": {
 title: "Entity Understanding (WP 510)",
 questions: [
 "What does the Company do and in which geographic markets does it operate?",
 "Please describe the Company's organizational structure, including subsidiaries and ownership percentages.",
 "Who are the key management personnel and what are their roles and responsibilities in financial reporting?",
 "What are the Company's primary revenue sources and describe the revenue recognition process?",
 "What significant changes occurred in the Company's business, industry, or regulatory environment during the year?",
 "Who are the Company's key customers, suppliers, and business partners, and does the Company rely on any single party for a significant portion of revenue or supply?",
 ],
 },
 "511": {
 title: "IT Environment (WP 511)",
 questions: [
 "Describe the software and key applications, including spreadsheets, that the Company uses to prepare financial information and reports (e.g., QuickBooks, Sage, Navision).",
 "Is the software an \"off the shelf\" program or has it been customized? Describe any customization, change management procedures, or automated controls.",
 "Did a system changeover occur during the year? If so, describe the transition including controls over the conversion and any post-implementation review.",
 "Describe the controls related to password protection and prevention of unauthorized access, including how access levels are commensurate with roles.",
 "Describe the controls to authorize new users, modify existing access, and remove access upon termination or transfer.",
 "Describe controls over physical access to data and hardware, including data back-up location, frequency, and integrity oversight.",
 "Indicate how transactions are initiated and recorded through the Company's information system and incorporated into the general ledger.",
 "Describe the Company's cybersecurity policies, controls, and oversight. Has the Company experienced any cybersecurity incidents?",
 "Describe policies and procedures relating to the selection and use of third-party IT service providers, including data security and monitoring of service levels.",
 ],
 },
 "513": {
 title: "Accounting Estimates (WP 513)",
 questions: [
 "What are the significant accounting estimates and judgments the Company made during the year (e.g., allowances, impairment, provisions, fair values)?",
 "Describe the process used by management to develop each significant estimate, including the key assumptions and data sources relied upon.",
 "How does management assess the sensitivity of significant estimates to changes in key assumptions?",
 "Were there any changes in accounting estimates from the prior year? If so, describe the nature of the changes and the reason for them.",
 "Who reviews and approves significant estimates, and how is the review documented?",
 ],
 },
 "514": {
 title: "Prior Period Estimates (WP 514)",
 questions: [
 "For each significant prior period estimate, please describe the actual outcome or revised estimate and any difference from the amount recorded in the prior year financial statements.",
 "Were any prior period errors identified and corrected during the current year? If so, describe the nature of the errors and the impact on the financial statements.",
 "Describe any changes in accounting policies or estimates applied during the current year relative to the prior year.",
 "Have any prior period adjustments been reflected in the opening balances for the current year?",
 ],
 },
 "515": {
 title: "Related Parties (WP 515)",
 questions: [
 "Please list all persons and entities considered to be related parties of the Company, including directors, officers, significant shareholders, close family members, and companies under common control.",
 "For each related party, describe the nature and terms of all transactions during the year, including amounts, balances, and whether the transactions were conducted at arm's length.",
 "Describe the controls that exist around approval of significant related party transactions.",
 "Are there any undisclosed related party relationships or transactions management is aware of?",
 "What procedures are in place to ensure all related party transactions are identified, authorized, and appropriately disclosed in the financial statements?",
 ],
 },
 "520": {
 title: "Risk Register (WP 520)",
 questions: [
 "What does management consider to be the Company's most significant financial reporting risks, and how are these risks monitored?",
 "Describe the process by which management identifies and updates the Company's risk register or risk assessment.",
 "What mitigating controls are in place for each significant identified risk?",
 "Have any new or emerging risks been identified during the year that could affect the financial statements?",
 "How does management evaluate whether its risk mitigation strategies are effective?",
 ],
 },
 "525": {
 title: "Going Concern (WP 525)",
 questions: [
 "Describe any events or conditions that may cast significant doubt on the Company's ability to continue as a going concern.",
 "What is management's assessment of the Company's ability to meet its financial obligations for at least the next 12 months?",
 "If there are going concern concerns, what plans does management have to address them (e.g., refinancing, asset sales, capital raises)?",
 "Describe the Company's current liquidity position, including available credit facilities, cash reserves, and upcoming debt maturities.",
 ],
 },
 "530": {
 title: "Pervasive Risks (WP 530)",
 questions: [
 "Describe any business, industry, or economic conditions that may give rise to significant risks of material misstatement in the financial statements.",
 "Are there any significant pressures on management to achieve financial results that could create incentives for earnings manipulation?",
 "Describe how management assesses and responds to risks arising from the complexity of the Company's transactions, estimates, or financial reporting requirements.",
 "Are there any significant regulatory, legal, or compliance risks that could affect the financial statements?",
 ],
 },
 "535": {
 title: "Information System (WP 535)",
 questions: [
 "Describe how financial and operational information flows from initiation of a transaction through to recording in the general ledger and reporting in the financial statements.",
 "What systems and processes are in place to capture, process, and disclose events and conditions other than routine transactions?",
 "Describe the controls in place to ensure completeness and accuracy of data entered into financial reporting systems.",
 "How are manual journal entries and adjustments controlled, reviewed, and authorized?",
 "Describe the human resources responsible for financial reporting, including their competence, adequacy of resources, and any segregation of duties concerns.",
 ],
 },
 "540": {
 title: "Control Design (WP 540)",
 questions: [
 "Describe the design of key internal controls over financial reporting, including preventive and detective controls.",
 "For each significant process area (revenue, purchasing, payroll, treasury), describe the key controls in place and who performs them.",
 "How does management evaluate the design effectiveness of internal controls?",
 "Were there any changes to the design of key internal controls during the year? If so, describe the nature of the changes.",
 "Are there any identified control gaps or weaknesses management is aware of? If so, describe the compensating controls or remediation plans.",
 ],
 },
 "550": {
 title: "Control Activities (WP 550)",
 questions: [
 "Describe the control activities in place for each of the following areas: authorization of transactions, segregation of duties, reconciliations, physical safeguarding of assets, and management review.",
 "How does management monitor the operating effectiveness of control activities on an ongoing basis?",
 "Were any control deficiencies identified during the year, and if so, what remediation actions have been taken?",
 "Describe the process for approving and reviewing account reconciliations, and who is responsible for each significant account.",
 ],
 },
 "551": {
 title: "General IT Controls (WP 551)",
 questions: [
 "Describe the controls over IT operations, including change management, incident management, and system availability.",
 "What procedures are in place to manage and approve changes to production applications and systems?",
 "Describe the controls over logical access to systems, including user provisioning, access reviews, and privileged access management.",
 "How is data integrity ensured during processing and transmission between systems?",
 "Describe the disaster recovery and business continuity plans for key IT systems.",
 ],
 },
 "408": {
 title: "Initial Audit Engagements (WP 408)",
 questions: [
 "Is this the first year of the engagement? Please confirm the Company's legal name, fiscal year end, and legal structure (e.g., corporation, partnership).",
 "Describe any significant changes in the ownership or management of the Company that the audit team should be aware of.",
 "What accounting framework does the Company use (e.g., ASPE, IFRS)? Has there been any change in accounting standards adopted during the year?",
 "Please provide the prior period financial statements and trial balance for comparison purposes.",
 "Are there any outstanding tax, legal, or regulatory issues from prior periods that the audit team should be aware of?",
 ],
 },
 "410": {
 title: "Acceptance & Continuance (WP 410)",
 questions: [
 "Describe the Company's ownership structure and identify the ultimate controlling party.",
 "Have there been any changes in ownership, management, or board composition during the year? If so, describe.",
 "Are there any known or suspected instances of fraud, illegal acts, or regulatory violations involving the Company or its management?",
 "Has the Company or any of its principals been involved in any legal proceedings, regulatory investigations, or formal complaints during the year?",
 "Describe any factors that may affect the audit team's independence or objectivity with respect to the Company.",
 ],
 },
 "420": {
 title: "Materiality (WP 420)",
 questions: [
 "What is the primary basis that the Company's financial statement users rely on for decision-making (e.g., net income, total assets, total revenue)?",
 "Are there any known or expected changes in financial results that would significantly affect the appropriate benchmark for materiality?",
 "Have there been any significant one-time transactions or events during the year that may be material but unusual in nature?",
 "Are there any balances or transactions that, although small in dollar amount, would be considered material due to their nature (e.g., related party transactions, executive compensation)?",
 ],
 },
 "428": {
 title: "Auditor's Expert (WP 428)",
 questions: [
 "Does the Company require a specialist (e.g., actuary, valuator, environmental consultant) to support significant estimates or disclosures in the financial statements?",
 "If a specialist has been engaged, please provide their name, qualifications, and the nature of the work performed.",
 "What significant assumptions or inputs did the specialist rely upon, and how were those assumptions developed and validated?",
 "Has the specialist's report or findings been reviewed and approved by management? Please provide a copy.",
 ],
 },
 "430": {
 title: "Overall Audit Strategy (WP 430)",
 questions: [
 "Describe any significant changes in the Company's business, financial reporting processes, or control environment compared to the prior year.",
 "Are there any areas of the financial statements management considers to involve significant judgment, estimation, or complexity?",
 "Please identify all subsidiaries, branches, or business units included in the consolidated financial statements and their relative significance.",
 "Are there any constraints on the audit (e.g., timing, access to information, personnel availability) that management is aware of?",
 ],
 },
 "436": {
 title: "Team Planning Discussions (WP 436)",
 questions: [
 "Who are the key accounting and finance personnel the audit team will be working with, and what are their primary roles?",
 "Please confirm the timing of key deliverables (e.g., draft financial statements, trial balance, supporting schedules) and the names of individuals responsible for providing them.",
 "Are there any planned disruptions to finance operations (e.g., system upgrades, staff changes, relocations) during the audit fieldwork period?",
 "Please identify the primary contact person for each significant account area or audit request.",
 ],
 },
 "450": {
 title: "Time & Budget Tracker (WP 450)",
 questions: [
 "Are there any timing constraints or deadlines that would affect the scheduling of audit procedures (e.g., bank covenant reporting dates, tax filing deadlines)?",
 "Please confirm the expected date for the following: delivery of trial balance, completion of year-end reconciliations, and availability of draft financial statements.",
 "Are there any unusual workload pressures on the finance team during the audit period that may affect the timely delivery of requested information?",
 ],
 },
 "500": {
 title: "Observation & Inspection (WP 500)",
 questions: [
 "Please describe any significant physical assets the Company holds (e.g., inventory, property, equipment) and their locations.",
 "How does the Company safeguard and track its physical assets? Describe the controls over physical access and movement of assets.",
 "When and how was the most recent physical inventory count or fixed asset verification performed? Who was responsible, and what were the results?",
 "Are there any assets held by third parties (e.g., consignment inventory, assets in transit, assets held under bailment)? If so, please describe.",
 "Please describe the Company's processes for identifying and writing off obsolete, damaged, or impaired assets.",
 ],
 },
 "575": {
 title: "Control Deficiencies (WP 575)",
 questions: [
 "Has management identified any control deficiencies, material weaknesses, or significant deficiencies in internal controls during the year?",
 "If control deficiencies were identified (by internal or external parties), what remediation actions have been taken or are planned?",
 "Are there any areas where the Company currently lacks adequate segregation of duties? If so, what compensating controls are in place?",
 "Has the Company experienced any financial reporting errors, fraudulent transactions, or unauthorized access to financial systems during the year?",
 ],
 },
 "580": {
 title: "Revenue Recognition (WP 580)",
 questions: [
 "Describe the Company's primary revenue streams and how revenue is recognized for each.",
 "What is the timing of revenue recognition for each significant revenue stream, and how does this align with the delivery of goods or completion of services?",
 "Are there any long-term contracts, multiple-element arrangements, or variable consideration that affect when and how revenue is recognized?",
 "Describe the controls over the completeness and accuracy of revenue recorded, including controls over cut-off at period end.",
 "Were there any changes to the Company's revenue recognition policies or significant contracts during the year?",
 ],
 },
 "590": {
 title: "Engagement Scoping (WP 590)",
 questions: [
 "Please confirm the entities, legal structures, and operations to be included in the scope of the audit.",
 "Are there any components, subsidiaries, or joint ventures that are excluded from the audit scope? If so, please explain.",
 "Are there any significant transactions, balances, or disclosures that management considers outside the normal course of business?",
 "Please identify any third-party service organizations (e.g., payroll processors, IT service providers) whose activities are relevant to the audit.",
 ],
 },
 "605": {
 title: "Risk Responses (WP 605)",
 questions: [
 "For each significant identified risk, describe the controls management has implemented to reduce the risk of material misstatement.",
 "How does management monitor the effectiveness of its controls over significant risk areas on an ongoing basis?",
 "Are there any significant risks for which management has determined that no controls exist or that existing controls are insufficient?",
 "Please provide documentation of any control testing or effectiveness assessments performed by management or internal audit during the year.",
 ],
 },
 "610": {
 title: "Sampling — Tests of Details (WP 610)",
 questions: [
 "Please confirm the total population count and dollar amount for the accounts to be sampled as at year end.",
 "Describe the source documents and supporting records available to support individual transactions and balances in the population.",
 "Are there any known gaps, missing documents, or transactions that lack standard supporting documentation?",
 "What is the process for locating and retrieving historical documents for audit sampling purposes?",
 ],
 },
 "625": {
 title: "Going Concern Response (WP 625)",
 questions: [
 "Describe in detail management's plan to address any going concern conditions identified (e.g., refinancing, asset disposals, cost reductions, capital raises).",
 "What is the status of any financing arrangements being negotiated or renewed? Please provide copies of relevant term sheets or commitment letters.",
 "Has management prepared cash flow forecasts for the next 12 to 24 months? If so, please provide the most recent version and describe the key assumptions.",
 "Are there any waivers or amendments required from lenders or creditors? If so, describe their current status.",
 ],
 },
 "630": {
 title: "Confirmations (WP 630)",
 questions: [
 "Please provide a complete list of the Company's bank accounts, including the financial institution, account type, and account number.",
 "Please provide a list of all outstanding loans, lines of credit, and other debt instruments, including the lender, outstanding balance, and terms as at year end.",
 "Please provide a list of the Company's significant customers and suppliers for accounts receivable and accounts payable confirmation purposes.",
 "Are there any legal matters, contingencies, or disputes for which the Company's legal counsel would need to provide a confirmation?",
 ],
 },
 "635": {
 title: "Accounting Estimates Response (WP 635)",
 questions: [
 "For each significant accounting estimate, please provide the supporting calculations, data sources, and key assumptions used by management.",
 "Has management engaged an independent expert to support any estimates? If so, please provide the expert's report or findings.",
 "What sensitivity analysis has management performed on significant estimates to assess the impact of changes in key assumptions?",
 "For estimates carried from prior periods, describe how actual outcomes compared to prior estimates and whether any adjustments were required.",
 ],
 },
 "645": {
 title: "Litigation, Claims & Non-Compliance (WP 645)",
 questions: [
 "Please describe any current, pending, or threatened litigation, claims, or regulatory investigations involving the Company.",
 "For each matter, describe the nature of the claim, the estimated amount at risk, and management's assessment of the likely outcome.",
 "Have any legal judgments or settlements been reached during the year? If so, describe the terms and any financial impact.",
 "Has the Company received any notices of non-compliance with laws, regulations, contracts, or permits? If so, describe the matter and the Company's response.",
 "Please provide the name and contact information for legal counsel handling each significant legal matter.",
 ],
 },
 "650": {
 title: "Subsequent Events (WP 650)",
 questions: [
 "Are you aware of any significant events that occurred after the balance sheet date but before the financial statements were authorized for issue?",
 "Have there been any significant changes in the Company's financial position, business, or operations after the balance sheet date?",
 "Have any significant transactions been completed after the balance sheet date (e.g., acquisitions, disposals, financing, restructuring)?",
 "Have any new claims, legal proceedings, or regulatory matters arisen after the balance sheet date?",
 "Has management performed a review of events occurring after the balance sheet date? If so, describe the procedures performed and key findings.",
 ],
 },
 "655": {
 title: "Final Analytical Review (WP 655)",
 questions: [
 "Please explain any significant fluctuations in revenue, expenses, or other financial statement balances compared to the prior year.",
 "Are there any balances or ratios in the financial statements that appear unusual or inconsistent with management's expectations?",
 "How do the final financial results compare to the Company's budget or forecast for the year? Please explain any significant variances.",
 "Are there any non-recurring items in the current year that significantly affect the comparability of financial results to the prior year?",
 ],
 },
 "666": {
 title: "Related Parties Response (WP 666)",
 questions: [
 "For each related party transaction identified, please provide complete supporting documentation including contracts, invoices, and approval records.",
 "Were all related party transactions conducted at arm's length and on terms similar to those available in the open market? If not, explain.",
 "Please confirm the completeness of the related party list provided earlier in the engagement.",
 "Are there any undisclosed related party relationships or transactions that management is aware of that have not been previously identified?",
 ],
 },
 "670": {
 title: "Journal Entry Testing (WP 670)",
 questions: [
 "Who has the authority to prepare, approve, and post journal entries in the Company's accounting system?",
 "Describe the controls over the initiation, authorization, and recording of journal entries, including segregation of duties.",
 "Are manual journal entries to revenue accounts permitted? If so, describe the approvals required and provide a listing of all such entries for the year.",
 "Please provide a complete listing of all journal entries posted during the year, including preparer, approver, date, and description.",
 "Are there any recurring journal entries that are automated? If so, describe the controls over their accuracy and completeness.",
 ],
 },
 "680": {
 title: "ASPE Supplementary Procedures (WP 680)",
 questions: [
 "Has the Company applied all relevant Canadian Accounting Standards for Private Enterprises (ASPE) sections correctly during the year?",
 "Are there any areas where management exercised significant judgment in the application of ASPE, including accounting policy elections or alternatives used?",
 "Were there any changes in accounting policies applied during the year under ASPE? If so, describe the nature of the change and the financial statement impact.",
 "Please confirm that the note disclosures in the financial statements include all required disclosures under applicable ASPE sections.",
 "Are there any ASPE sections newly applicable to the Company this year (e.g., new standards or new circumstances that trigger additional disclosure requirements)?",
 ],
 },
 };

 const DEFAULT_SECTION: { title: string; questions: string[] } = {
 title: "General Questionnaire",
 questions: [
 "Please describe the relevant processes, controls, and procedures for this area.",
 "Are there any changes from the prior year that the audit team should be aware of?",
 "Who is responsible for this area, and how are activities reviewed and approved?",
 ],
 };

 let qNum = 1;
 const body = forms.map(form => {
 const section = SECTIONS[form] ?? { ...DEFAULT_SECTION, title: `Working Paper ${form}` };
 const qs = section.questions.map(q => `**${qNum++}.** ${q}${blank}`).join("\n");
 return `## ${section.title}\n\n${qs}\n---`;
 }).join("\n\n");

 return `# Consolidated Audit Questionnaire

**To:** ${clientName} (the "Company")

**Subject:** Audit Questionnaire — Forms ${formLabel}

**Engagement:** ${engagementId} | **Period:** ${yearEnd}

---

**Name of person completing questionnaire:** ______________________________

**Date completed:** ______________________________

---

Please provide complete and accurate responses to all questions below. These responses will assist in planning and executing the audit. Where a question is not applicable, please indicate "N/A" and briefly explain. **Please provide answers in bold or in alternate colour.**

---

${body}`;
 },
 },
 {
 id: "memo-510",
 label: "Memo",
 wpRef: "510",
 generate: ({ clientName, engagementId, yearEnd }) => `# Prepared by Client Memo

**MEMO**

---

**Company:** ${clientName}

**Engagement:** ${engagementId}

**Year end:** ${yearEnd}

---

The questions below are designed to help us understand your operations in preparation for the upcoming audit.

---

## Understanding the Company's Operations

**1.** What does the Company do and where does it operate?

________________________________________________________________________________

**2.** Please list the names of the Company's subsidiaries and the country in which they are located. *(Please email D&Co staff current corporate organizational chart.)*

________________________________________________________________________________

**3.** Please discuss the Company's ownership and governance. *(Consider public or private, major shareholders, structure of board of directors and audit committee, management and key decision makers.)*

________________________________________________________________________________

**4.** What are the Company's most significant risks and what steps, if any, does the Company take to mitigate these risks? *(Consider accounting, business, regulatory, political, economic, environment, commodity prices, foreign exchange, etc.)*

________________________________________________________________________________

**5.** What changes occurred within the Company since the beginning of the fiscal year? *(Consider significant transactions, new or amended agreements, disposals, write-offs, changes in management, etc.)*

________________________________________________________________________________

**6.** Does the Company rely on one or more vendors, customers, or suppliers?

________________________________________________________________________________

**7.** Who are the Company's key advisors and what is their contact information (lawyers, transfer agent, etc.)?

________________________________________________________________________________

**8.** Has the Company changed or adopted new accounting policies during the year?

________________________________________________________________________________

**9.** What are the significant estimates and judgments the Company performed during the year in preparation of the financial statements? *(Consider share-based payments, income taxes, impairment, accruals, going concern, etc.)*

________________________________________________________________________________

---

## Fraud Assessment

**10.** What controls are in place to prevent or detect fraud within the Company?

________________________________________________________________________________

**11.** What is the Company's assessment of its susceptibility to fraud?

________________________________________________________________________________

**12.** Has the Company, or any senior member of the Company, received any communications from a regulatory body? If so, please summarize the communications received.

________________________________________________________________________________

**13.** Is management aware of any alleged, suspected, or actual fraud within the Company?

________________________________________________________________________________

---

## Related Parties

For the purposes of the audit we consider related parties to include: directors and officers of the Company, close family members, companies controlled by directors/officers or close family members, significant shareholders, and other key decision makers.

**14.** Please list all persons who are related parties and their relationship to the Company:

| Name of Related Party | Relationship to Company | Nature of Transactions |
|---|---|---|
| | | |
| | | |
| | | |
| | | |
| | | |

**15.** Please list any directors/officers who were appointed or who resigned since the beginning of the year being audited.

________________________________________________________________________________

**16.** Discuss the controls that exist around approval of significant related party transactions.

________________________________________________________________________________

**17.** What controls/procedures are in place to ensure all transactions with related parties are accounted for in accordance with the applicable financial reporting framework?

________________________________________________________________________________

---

## Corporate Level — Internal Controls

**18.** How are transactions/purchases initiated?

________________________________________________________________________________

**19.** How are invoices authorized for payment, including who performs this function and what is their position?

________________________________________________________________________________

**20.** Who is authorized to sign cheques?

________________________________________________________________________________

**21.** Who makes the deposits for the Company?

________________________________________________________________________________

**22.** Please describe the Company's IT and accounting system/controls. *(Consider type of software used, use of passwords, backups, etc.)*

________________________________________________________________________________

**23.** Who is responsible for recording transactions in the accounting system and what is their position?

________________________________________________________________________________

**24.** Discuss the review of accounting entries including who performs this process and when it is completed.

________________________________________________________________________________

**25.** How does the Company ensure all transactions are entered into the accounting system?

________________________________________________________________________________

**26.** Discuss who has access to the Company's accounting system.

________________________________________________________________________________

**27.** Who is responsible for preparing the consolidation working paper of the entity?

________________________________________________________________________________

**28.** Discuss the process of preparing the consolidation working paper including personnel involved, what schedules are received from where, timing in relation to period end and controls over consolidation and consolidation entries.

________________________________________________________________________________

**29.** Who is responsible for preparing the financial statements for the Company?

________________________________________________________________________________

**30.** Discuss the review of financial statements including who performs this process and when it is completed.

________________________________________________________________________________

**31.** What role do the board of directors and audit committee have in financial reporting? *(Consider how often they meet, what transactions require their approval, and how interim and annual financial statements are approved.)*

________________________________________________________________________________

**32.** Discuss the Company's use of budgets.

________________________________________________________________________________

**33.** Are specific approvals required for expenditures over a certain amount? Please discuss. *(Consider the need for management or board approval.)*

________________________________________________________________________________

**34.** Who has authority to enter into contracts on behalf of the Company?

________________________________________________________________________________`,
 },
];
