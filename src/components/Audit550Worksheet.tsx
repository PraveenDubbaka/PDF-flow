import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Trash2, BookOpen, X } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

type YSN = "Y" | "S" | "N" | "";
type YN = "Y" | "N" | "NA" | "";
type IR = "H" | "M" | "L" | "";
type Assertion = "C" | "E" | "AV" | "P";
type AutoManual = "Manual" | "Automated" | "IT-dependent manual" | "";
type PrevDet = "Preventive" | "Detective" | "";

interface ControlRow {
 id: string;
 description: string;
 inherentRisk: IR;
 assertions: Assertion[];
 automated: AutoManual;
 controlType: string; // e.g. Reconciliation, Authorization, Review, Segregation, IT-dependent
 frequency: string;
 prevDet: PrevDet;
 otherCharacteristics: string;
 designEffective: YSN; // Y / S / N
 implemented: YN; // Y / N / NA (Note 3 — at least one procedure beyond inquiry)
 supportingDocs: RefDoc[]; // W/P ref for walkthrough / inspection
 gitcSupports: YN; // GITC supports the automated control (Note 1)
 oeTestPlanned: YN; // Operating effectiveness testing planned?
 controlRisk: IR; // H / M / L
 testRef: RefDoc[]; // Reference to where controls will be tested
}

interface RiskBlock {
 id: string;
 description: string; // Description of risk of material misstatement
 controls: ControlRow[];
}

type CategoryKey = "journalEntries" | "significantRisks" | "operatingEffectiveness" | "other";

interface CategoryBlock {
 key: CategoryKey;
 title: string;
 hint: string;
 risks: RiskBlock[];
}

interface Data550 {
 categories: CategoryBlock[];
 overallConclusion: YSN;
 overallRationale: string;
 notes: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Reference data ─────────────────────────────────────────────────────────────

const ASSERTION_LABELS: Record<Assertion, string> = {
 C: "Completeness",
 E: "Existence / Occurrence",
 AV: "Accuracy / Valuation",
 P: "Presentation",
};

const CONTROL_TYPES = [
 "Authorization / Approval",
 "Reconciliation",
 "Review of performance",
 "Segregation of duties",
 "Physical / logical access",
 "IT-dependent manual",
 "Automated application control",
 "IT general control (ITGC)",
];

const FREQUENCIES = ["Per transaction", "Daily", "Weekly", "Monthly", "Quarterly", "Annually", "Ad hoc"];

interface ControlLibraryEntry {
  id: string;
  cycle: "revenues" | "purchases" | "payroll" | "financial-reporting";
  cycleLabel: string;
  description: string;
  assertions: Assertion[];
  controlType: string;
  automated: AutoManual;
  prevDet: PrevDet;
  component: string;
}

const CONTROL_LIBRARY: ControlLibraryEntry[] = [
  // ── Revenues, receivables, receipts ─────────────────────────────────────
  { id: "rev-1",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Sales employees are competent for their assigned tasks, adequately trained and supervised.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Preventive", component: "CE" },
  { id: "rev-2",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Shipping and billing functions are segregated from cash receipts.", assertions: ["E"], controlType: "Segregation of duties", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "rev-3",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "A valid sales order must exist before a shipment is made or processed.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "rev-4",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "A standard price list is used for invoice preparation. Exceptions require documentation and approval.", assertions: ["C","AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "rev-5",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "The sales journal and sub-ledger are reconciled to the general ledger.", assertions: ["AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-6",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Procedures exist to ensure revenue is recorded in the appropriate accounting period (cut-off).", assertions: ["AV"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-7",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Controls exist to prevent unauthorized changes to standard price lists and customer master files.", assertions: ["AV","E"], controlType: "Physical / logical access", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "rev-8",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Credit approval is independent of the sales and accounts receivable function.", assertions: ["AV","E"], controlType: "Segregation of duties", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "rev-9",  cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Shipping and sales order numbers are matched to invoices.", assertions: ["C","AV","E"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-10", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Monthly statements are issued to customers.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-11", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "A bank reconciliation is prepared monthly (with statements from bank) and management approval documented.", assertions: ["C","AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-12", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "A reconciliation of aged receivables to control accounts is prepared monthly and management approval documented.", assertions: ["AV","E"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "rev-13", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Revenue recognition policies are clearly communicated to accounting and operations personnel.", assertions: ["C","AV","E"], controlType: "IT-dependent manual", automated: "IT-dependent manual", prevDet: "Preventive", component: "IS" },
  { id: "rev-14", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Regular (at least monthly) comparison of budgeted sales to actual sales and timely investigation of variances by management.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "MO" },
  { id: "rev-15", cycle: "revenues", cycleLabel: "Revenues, receivables & receipts", description: "Management reviews the aged accounts receivable reports and takes action on overdue accounts.", assertions: ["AV"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "MO" },
  // ── Purchases, payables, payments ────────────────────────────────────────
  { id: "ap-1",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Personnel responsible for the purchasing, receiving, and payables functions are competent, adequately trained and supervised.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Preventive", component: "CE" },
  { id: "ap-2",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Documented controls exist over who can issue purchase requisitions and orders and to what dollar limit.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "ap-3",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Personnel receiving goods do not perform any accounting functions.", assertions: ["E"], controlType: "Segregation of duties", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "ap-4",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Receiving slips are matched to invoices and purchase orders.", assertions: ["AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-5",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "System will not allow payment for goods or services without information being recorded on receipt of goods and authorization for payment.", assertions: ["AV","E"], controlType: "Automated application control", automated: "Automated", prevDet: "Preventive", component: "CA" },
  { id: "ap-6",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "System has checks to prevent duplicate payments on same order.", assertions: ["AV"], controlType: "Automated application control", automated: "Automated", prevDet: "Preventive", component: "CA" },
  { id: "ap-7",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Authorized personnel examine supporting documentation and approve payments up to their individual spending limit.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "ap-8",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "A bank reconciliation is prepared monthly and reviewed by management.", assertions: ["AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-9",  cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Suppliers' statements are reconciled to accounts payable monthly and reviewed by management.", assertions: ["C","AV","E"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-10", cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Procedures exist to ensure payments are recorded in the correct period.", assertions: ["C","AV"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-11", cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Management reviews and approves period-end accruals.", assertions: ["C","AV"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-12", cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "An aged accounts payable listing is reconciled to general ledger each month and exceptions investigated by management.", assertions: ["C","AV","E"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "ap-13", cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Access to purchasing, receiving, accounts payable, and inventory records is restricted to authorized personnel.", assertions: ["AV","E"], controlType: "Physical / logical access", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "ap-14", cycle: "purchases", cycleLabel: "Purchases, payables & payments", description: "Management regularly compares actual purchases to budgeted purchases and investigates and documents variances.", assertions: ["C","AV"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "MO" },
  // ── Payroll ──────────────────────────────────────────────────────────────
  { id: "pay-1",  cycle: "payroll", cycleLabel: "Payroll", description: "Payroll staff are competent for their assigned tasks, adequately trained and supervised.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Preventive", component: "CE" },
  { id: "pay-2",  cycle: "payroll", cycleLabel: "Payroll", description: "Persons preparing payroll are independent of other payroll functions, such as hiring or firing of staff, timekeeping, and cheque distribution.", assertions: ["E"], controlType: "Segregation of duties", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-3",  cycle: "payroll", cycleLabel: "Payroll", description: "Approval in writing is required to add new employees to payroll.", assertions: ["E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-4",  cycle: "payroll", cycleLabel: "Payroll", description: "Any change in employment status or rate of pay must first be approved and documented.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-5",  cycle: "payroll", cycleLabel: "Payroll", description: "Time cards and totals of hours worked are approved before being processed for payment.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-6",  cycle: "payroll", cycleLabel: "Payroll", description: "Procedures exist to ensure terminated employees are immediately removed from payroll.", assertions: ["AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-7",  cycle: "payroll", cycleLabel: "Payroll", description: "The payroll register is reconciled to the general ledger.", assertions: ["AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "pay-8",  cycle: "payroll", cycleLabel: "Payroll", description: "Payroll taxes are paid on a timely basis and payroll tax returns are filed when due.", assertions: ["C","AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "pay-9",  cycle: "payroll", cycleLabel: "Payroll", description: "There is restricted access to personnel records, payroll records, and blank payroll cheques.", assertions: ["E"], controlType: "Physical / logical access", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "pay-10", cycle: "payroll", cycleLabel: "Payroll", description: "Costs by department or division are compared to budget and variances are investigated.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "MO" },
  { id: "pay-11", cycle: "payroll", cycleLabel: "Payroll", description: "System generates exception reports where payroll deductions seem to be below normal levels for position and status.", assertions: ["AV","E"], controlType: "IT-dependent manual", automated: "IT-dependent manual", prevDet: "Detective", component: "IS" },
  // ── Financial reporting ──────────────────────────────────────────────────
  { id: "fr-1",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Personnel responsible for financial statement preparation are competent, adequately trained and supervised.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Preventive", component: "CE" },
  { id: "fr-2",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Period-end journal entries are categorized by type (standard, recurring and non-routine) and reviewed for completeness and inclusion in the correct accounting period.", assertions: ["C","AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-3",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "All journal entries require supporting documentation. Any non-routine entries require documented approval prior to being posted.", assertions: ["C","AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Preventive", component: "CA" },
  { id: "fr-4",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "The mapping of trial balance accounts to financial statement groupings is automatic or documented and checked periodically by management.", assertions: ["AV"], controlType: "Reconciliation", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-5",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Accrual calculations and provisions (including income taxes) are reviewed by someone other than the preparer for accuracy and lack of bias.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-6",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Financial models used in preparing fair value assessments and estimates are tested and reviewed by management.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-7",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Those with oversight responsibilities regularly review financial statements and approve the selection of accounting policies used.", assertions: ["C","AV","E"], controlType: "Authorization / Approval", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-8",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Financial statements are reviewed for accuracy, classification, consistency of accounting policy application, cross-referencing and completeness by someone other than the preparer.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-9",  cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "An up-to-date financial statement disclosure checklist is used for determining the completeness of disclosures.", assertions: ["C","AV"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-10", cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Senior management and the audit committee review the financial statements prior to release.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "CA" },
  { id: "fr-11", cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Regular (at least monthly) comparison of period-end results with budgeted and prior period results, with investigation of variances by management.", assertions: ["C","AV","E"], controlType: "Review of performance", automated: "Manual", prevDet: "Detective", component: "MO" },
  { id: "fr-12", cycle: "financial-reporting", cycleLabel: "Financial reporting", description: "Accounting software used contains application controls that prevent or detect an error from occurring.", assertions: ["C","AV","E"], controlType: "Automated application control", automated: "Automated", prevDet: "Preventive", component: "CA" },
];

const CATEGORY_DEFS: { key: CategoryKey; title: string; hint: string }[] = [
 {
 key: "journalEntries",
 title: "Controls over journal entries",
 hint: "Includes non-standard, non-recurring entries and adjustments.",
 },
 {
 key: "significantRisks",
 title: "Controls that address significant risks",
 hint: "For each risk assessed as significant (e.g., fraud, management override, revenue).",
 },
 {
 key: "operatingEffectiveness",
 title: "Controls for which the auditor plans to test operating effectiveness",
 hint: "Including controls addressing risks for which substantive procedures alone are insufficient.",
 },
 {
 key: "other",
 title: "Other controls that the auditor considers appropriate",
 hint: "Controls processed by service organizations, reconciliations to GL, or those addressing higher inherent risks.",
 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function emptyControl(): ControlRow {
 return {
 id: uid(), description: "", inherentRisk: "", assertions: [],
 automated: "", controlType: "", frequency: "", prevDet: "", otherCharacteristics: "",
 designEffective: "", implemented: "",
 supportingDocs: [], gitcSupports: "", oeTestPlanned: "", controlRisk: "", testRef: [],
 };
}
function emptyRisk(): RiskBlock {
 return { id: uid(), description: "", controls: [emptyControl()] };
}
function buildDefault(): Data550 {
 return {
  categories: CATEGORY_DEFS.map(c => {

   // ── Journal Entries ────────────────────────────────────────────────
   if (c.key === "journalEntries") return {
    ...c,
    risks: [{
     id: uid(),
     description: "Risk of material misstatement in journal entries — management override and unauthorized entries could be posted to the general ledger without detection or timely review. First-year audit; no prior CAS baseline established.",
     controls: [
      {
       ...emptyControl(), id: uid(),
       description: "Period-end journal entries are categorized by type (standard, recurring, and non-routine) and reviewed for completeness and inclusion in the correct accounting period.",
       assertions: ["C","AV","E"] as Assertion[],
       controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
       prevDet: "Preventive" as PrevDet, inherentRisk: "H" as IR,
      },
      {
       ...emptyControl(), id: uid(),
       description: "All journal entries require supporting documentation. Any non-routine entries require documented approval prior to being posted in QuickBooks Online.",
       assertions: ["C","AV","E"] as Assertion[],
       controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
       prevDet: "Preventive" as PrevDet, inherentRisk: "H" as IR,
      },
      {
       ...emptyControl(), id: uid(),
       description: "Accounting software (QuickBooks Online) does not allow unbalanced or duplicate journal entries; system generates an error before posting.",
       assertions: ["AV"] as Assertion[],
       controlType: "Automated application control", automated: "Automated" as AutoManual,
       prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
      },
     ],
    }],
   };

   // ── Significant Risks ──────────────────────────────────────────────
   if (c.key === "significantRisks") return {
    ...c,
    risks: [
     {
      id: uid(),
      description: "Complex operating structure and related-party transactions — rent payments to Northline Holdings Inc. (common directorship) may not be recorded on arm's length terms or fully disclosed. Assessed as significant risk in Form 520.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "Significant transactions with related parties (including Northline Holdings Inc.) require documented approval by the board or those charged with governance prior to execution.",
        assertions: ["C","AV","E"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "H" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Management maintains and annually updates a listing of all related parties; the listing is reviewed by the board and compared to prior year.",
        assertions: ["C"] as Assertion[],
        controlType: "Review of performance", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "H" as IR,
       },
      ],
     },
     {
      id: uid(),
      description: "Financial reporting process — period-end close deficiencies. First-year audit with no established close timetable documented under CAS. Risk of unrecorded accrued liabilities ($620K) and deferred revenue ($284K) cut-off errors.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "Accrual calculations and provisions (including income taxes — $249K) are reviewed by someone other than the preparer for accuracy and lack of bias.",
        assertions: ["C","AV","E"] as Assertion[],
        controlType: "Review of performance", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "H" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Procedures exist to ensure period-end revenue ($18.4M service revenue) and deferred revenue ($284K) are recorded in the correct accounting period (cut-off).",
        assertions: ["C","AV"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "H" as IR,
       },
      ],
     },
    ],
   };

   // ── Operating Effectiveness ────────────────────────────────────────
   if (c.key === "operatingEffectiveness") return {
    ...c,
    risks: [
     {
      id: uid(),
      description: "Revenue, receivables, and receipts — service revenue of $18.4M and AR of $2.1M. Risk of fictitious revenue, incorrect cut-off, and uncollectible balances not adequately provisioned (allowance $42K on $2.1M AR).",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "A standard price list is used for service invoice preparation. Exceptions require documentation and approval.",
        assertions: ["C","AV","E"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "The sales journal and sub-ledger are reconciled to the general ledger (account 4000 — Service Revenue) on a monthly basis.",
        assertions: ["AV"] as Assertion[],
        controlType: "Reconciliation", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "A reconciliation of aged receivables ($2.1M) to control accounts is prepared monthly and management approval documented.",
        assertions: ["AV","E"] as Assertion[],
        controlType: "Reconciliation", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Regular (at least monthly) comparison of budgeted revenue to actual revenue ($18.4M) and timely investigation of variances by management.",
        assertions: ["C","AV","E"] as Assertion[],
        controlType: "Review of performance", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
      ],
     },
     {
      id: uid(),
      description: "Salaries and payroll — salaries and benefits of $2.16M (62 employees across Mississauga and Barrie). Risk of unauthorized pay rate changes, ghost employees, and inaccurate deductions.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "Any change in employment status or rate of pay for any of the 62 employees must first be approved and documented in writing by management.",
        assertions: ["AV","E"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Procedures exist to ensure terminated employees are immediately removed from payroll.",
        assertions: ["AV","E"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "The payroll register is reconciled to the general ledger (account 6100 — Salaries & Benefits) each pay period.",
        assertions: ["AV"] as Assertion[],
        controlType: "Reconciliation", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
      ],
     },
    ],
   };

   // ── Other Controls ─────────────────────────────────────────────────
   if (c.key === "other") return {
    ...c,
    risks: [
     {
      id: uid(),
      description: "Cash and bank — cash & bank balance of $1.24M processed across Mississauga and Barrie locations. Risk of misappropriation and undetected errors in cash handling.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "A bank reconciliation is prepared monthly (with statements from bank) and management approval documented for each bank account.",
        assertions: ["C","AV"] as Assertion[],
        controlType: "Reconciliation", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Access to blank cheques and online banking credentials is restricted to authorized personnel only.",
        assertions: ["E"] as Assertion[],
        controlType: "Physical / logical access", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
      ],
     },
     {
      id: uid(),
      description: "Purchases, payables, and payments — accounts payable of $1.4M and accrued liabilities of $620K. Risk of unrecorded liabilities and unauthorized payments.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "An aged accounts payable listing ($1.4M) is reconciled to the general ledger each month and exceptions investigated by management.",
        assertions: ["C","AV","E"] as Assertion[],
        controlType: "Reconciliation", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Authorized personnel examine supporting documentation and approve payments up to their individual spending limit. Payments over the limit require additional approval of senior management.",
        assertions: ["AV","E"] as Assertion[],
        controlType: "Authorization / Approval", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
      ],
     },
     {
      id: uid(),
      description: "Property, plant and equipment — net PPE of $4.82M ($6.42M cost less $1.6M accumulated depreciation) plus ROU assets of $2.8M. Risk of improper capitalization and inadequate depreciation.",
      controls: [
       {
        ...emptyControl(), id: uid(),
        description: "The accounting policy for when goods should be capitalized versus expensed is documented and clearly understood by accounting personnel.",
        assertions: ["AV"] as Assertion[],
        controlType: "Review of performance", automated: "Manual" as AutoManual,
        prevDet: "Preventive" as PrevDet, inherentRisk: "M" as IR,
       },
       {
        ...emptyControl(), id: uid(),
        description: "Management periodically reviews the application of the accounting policy on capitalization and depreciation rates for PPE and ROU assets.",
        assertions: ["AV"] as Assertion[],
        controlType: "Review of performance", automated: "Manual" as AutoManual,
        prevDet: "Detective" as PrevDet, inherentRisk: "M" as IR,
       },
      ],
     },
    ],
   };

   return { ...c, risks: [emptyRisk()] };
  }),
  overallConclusion: "",
  overallRationale: "",
  notes: "",
  concluded: false,
  concludedOn: "",
 };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Audit550Worksheet() {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const storageKey = `audit-550-data-${engagementId ?? "default"}`;
 const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isFirstRender = useRef(true);

 const [data, setData] = useState<Data550>(() => {
  const raw = readJsonFromLocalStorage<Data550 | null>(storageKey, null);
  // Discard stale saved data that pre-dates the seeded category controls
  const isStale = raw?.categories?.some(cat =>
   (cat.key === "operatingEffectiveness" || cat.key === "other") &&
   cat.risks?.every(r => !r.description)
  );
  if (isStale) localStorage.removeItem(storageKey);
  const saved = isStale ? null : raw;
  if (!saved) return buildDefault();
 const def = buildDefault();
 // Reconcile categories by key so we always show the four required buckets
 const categories = def.categories.map(d => {
 const found = saved.categories?.find(c => c.key === d.key);
 return found ? {...d, risks: found.risks?.length ? found.risks : [emptyRisk()] } : d;
 });
 return {...def,...saved, categories };
 });

 useEffect(() => {
 if (isFirstRender.current) { isFirstRender.current = false; return; }
 if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
 saveTimerRef.current = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 450);
 }, [data, storageKey]);

 const locked = data.concluded;
 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLElement>(null);

 const [pickerFor, setPickerFor] = useState<{ catKey: CategoryKey; riskId: string } | null>(null);
 const [pickerCycle, setPickerCycle] = useState<string>("revenues");

 function loadFromLibrary(entry: ControlLibraryEntry, catKey: CategoryKey, riskId: string) {
  addControl(catKey, riskId);
  setData(d => ({
   ...d,
   categories: d.categories.map(cat => cat.key !== catKey ? cat : {
    ...cat,
    risks: cat.risks.map(r => r.id !== riskId ? r : {
     ...r,
     controls: r.controls.map((ct, idx) =>
      idx !== r.controls.length - 1 ? ct : {
       ...ct,
       description: entry.description,
       assertions: entry.assertions,
       controlType: entry.controlType,
       automated: entry.automated,
       prevDet: entry.prevDet,
      }
     ),
    }),
   }),
  }));
  setPickerFor(null);
 }

 function markLukaFilled(id: string) {
  setLukaFilledFields(prev => new Set(prev).add(id));
  setLukaHighlightFields(prev => new Set(prev).add(id));
  setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 // ── Mutators ────────────────────────────────────────────────────────────────
 function patchCategory(key: CategoryKey, mut: (c: CategoryBlock) => CategoryBlock) {
 setData(d => ({...d, categories: d.categories.map(c => c.key === key ? mut(c) : c) }));
 }
 function addRisk(key: CategoryKey) {
 patchCategory(key, c => ({...c, risks: [...c.risks, emptyRisk()] }));
 }
 function removeRisk(key: CategoryKey, rid: string) {
 patchCategory(key, c => ({...c, risks: c.risks.length > 1 ? c.risks.filter(r => r.id !== rid) : c.risks }));
 }
 function setRisk(key: CategoryKey, rid: string, patch: Partial<RiskBlock>) {
 patchCategory(key, c => ({...c, risks: c.risks.map(r => r.id === rid ? {...r,...patch } : r) }));
 }
 function addControl(key: CategoryKey, rid: string) {
 patchCategory(key, c => ({
...c,
 risks: c.risks.map(r => r.id === rid ? {...r, controls: [...r.controls, emptyControl()] } : r),
 }));
 }
 function removeControl(key: CategoryKey, rid: string, ctlId: string) {
 patchCategory(key, c => ({
...c,
 risks: c.risks.map(r => r.id !== rid ? r : {
...r,
 controls: r.controls.length > 1 ? r.controls.filter(ct => ct.id !== ctlId) : r.controls,
 }),
 }));
 }
 function setControl(key: CategoryKey, rid: string, ctlId: string, patch: Partial<ControlRow>) {
 patchCategory(key, c => ({
...c,
 risks: c.risks.map(r => r.id !== rid ? r : {
...r, controls: r.controls.map(ct => ct.id === ctlId ? {...ct,...patch } : ct),
 }),
 }));
 }
 function toggleAssertion(key: CategoryKey, rid: string, ctlId: string, a: Assertion) {
 patchCategory(key, c => ({
...c,
 risks: c.risks.map(r => r.id !== rid ? r : {
...r,
 controls: r.controls.map(ct => ct.id !== ctlId ? ct : {
...ct,
 assertions: ct.assertions.includes(a) ? ct.assertions.filter(x => x !== a) : [...ct.assertions, a],
 }),
 }),
 }));
 }

 // ── Render ──────────────────────────────────────────────────────────────────

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
            const jecat = data.categories.find(c => c.key === 'journalEntries')!;
            const risk0 = jecat.risks[0];
            const ctrl0 = risk0.controls[0];
            lukaSequentialFill([
              {
                scrollRef: firstFillRef,
                set: () => {
                  setRisk('journalEntries', risk0.id, {
                    description: 'Risk of material misstatement in journal entries — management override and unauthorized entries could be posted to the GL without detection or timely review.',
                  });
                  markLukaFilled('550-risk0');
                },
              },
              {
                set: () => {
                  setControl('journalEntries', risk0.id, ctrl0.id, {
                    description: 'Authorization and approval control: All non-standard and manual journal entries require dual approval (preparer + CFO sign-off) with supporting documentation before posting in the ERP system.',
                    inherentRisk: 'H',
                    controlType: 'Authorization / Approval',
                    automated: 'Manual',
                    prevDet: 'Preventive',
                    designEffective: 'Y',
                    implemented: 'Y',
                  });
                  markLukaFilled('550-ctrl0');
                },
              },
              {
                set: () => {
                  setData(d => ({
                    ...d,
                    overallConclusion: 'Y' as YSN,
                    overallRationale: 'Controls over journal entries are suitably designed and have been implemented — control risk assessed as Low for the JE cycle.',
                  }));
                  markLukaFilled('550-overall');
                },
              },
            ], () => setLukaState('done'));
          },
        }))}
      />
    )}
 {/* Objective banner */}
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-3 shrink-0">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 To identify controls that address risks of material misstatement at the assertion level, evaluate whether
 those controls have been designed effectively and implemented, and assess control risk where operating
 effectiveness is to be tested.
 <span className="block mt-1.5 text-[11px]">
 <span className="font-semibold text-foreground">Legend: </span>
 Assertions: <b>C</b> = Completeness, <b>E</b> = Existence/Occurrence, <b>AV</b> = Accuracy/Valuation, <b>P</b> = Presentation. &nbsp;
 Design: <b>Y</b> = Mitigated, <b>S</b> = Some treatment, <b>N</b> = Significant deficiency. &nbsp;
 Control risk: <b>H</b>/<b>M</b>/<b>L</b>. &nbsp; GITC = General IT controls.
 </span>
 </p>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">

 {/* Categories */}
 {data.categories.map((cat) => (
 <div key={cat.key} className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-start justify-between gap-4">
 <div>
 <h3 className="text-sm font-semibold text-foreground">{cat.title}</h3>
 <p className="text-[11px] text-muted-foreground mt-0.5">{cat.hint}</p>
 </div>
 {!locked && (
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1 shrink-0" onClick={() => addRisk(cat.key)}>
 <Plus className="h-3.5 w-3.5" /> Add risk
 </Button>
 )}
 </div>

 <div className="divide-y divide-border">
 {cat.risks.map((risk, rIdx) => {
 const isFirstJeRisk = isDemoEngagement && cat.key === 'journalEntries' && rIdx === 0;
 return (
 <div key={risk.id}
  ref={isFirstJeRisk ? firstFillRef as any : undefined}
  className={`p-5 space-y-3${isFirstJeRisk && lukaHighlightFields.has('550-risk0') ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <div className="flex items-start gap-3">
 <span className="text-xs font-mono text-muted-foreground mt-2 shrink-0 w-6">{rIdx + 1}.</span>
 <div className="flex-1 space-y-1">
 <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
 Description of risk
 </label>
 <LukaTypingRow filled={isFirstJeRisk && lukaFilledFields.has('550-risk0')}>
  <div className="flex items-start gap-1.5">
    <GreenDot show={!!risk.description} />
    <Textarea disabled={locked} value={risk.description}
    onChange={e => setRisk(cat.key, risk.id, { description: e.target.value })}
    placeholder="Describe the risk of material misstatement (link / 535 where applicable)…"
    className="flex-1 min-h-[56px] text-sm resize-none rounded-[10px]" />
  </div>
 </LukaTypingRow>
 </div>
 {!locked && cat.risks.length > 1 && (
 <button onClick={() => removeRisk(cat.key, risk.id)}
 className="text-muted-foreground hover:text-destructive mt-2"
 title="Remove risk">
 <Trash2 className="h-4 w-4" />
 </button>
 )}
 </div>

 {/* Controls table */}
 <div className="overflow-x-auto rounded-md border border-border">
 <table className="w-full text-sm">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-3 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-10">#</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ minWidth: 240 }}>Control</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>Inherent risk</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 170 }}>Assertions</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 150 }}>Auto / Manual<sup>(1)</sup></th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 180 }}>Characteristics<sup>(2)</sup></th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 110 }}>Design (Y/S/N)</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 110 }}>Implemented<sup>(3)</sup></th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>W/P ref.</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>GITC supports</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 100 }}>OE test planned</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>Control risk</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 90 }}>Tested at</th>
 {!locked && <th className="px-2 py-3 w-8" />}
 </tr>
 </thead>
 <tbody>
 {risk.controls.map((ct, i) => {
 const isFirstJeCtrl = isDemoEngagement && cat.key === 'journalEntries' && rIdx === 0 && i === 0;
 return (
 <tr key={ct.id} className={`hover:bg-muted/50 transition-colors align-top border-b border-border last:border-b-0${isFirstJeCtrl && lukaHighlightFields.has('550-ctrl0') ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>

 <td className="px-3 py-2 text-center font-mono">{i + 1}</td>
 <td className="px-3 py-2">
 <LukaTypingRow filled={isFirstJeCtrl && lukaFilledFields.has('550-ctrl0')}>
  <div className="flex items-start gap-1.5">
    <GreenDot show={!!ct.description} />
    <Textarea disabled={locked} value={ct.description}
    onChange={e => setControl(cat.key, risk.id, ct.id, { description: e.target.value })}
    placeholder="Describe the control activity, owner, and how it operates…"
    className="flex-1 min-h-[64px] text-sm resize-none rounded-[10px]" />
  </div>
 </LukaTypingRow>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.inherentRisk}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { inherentRisk: v as IR })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="H" className="text-sm">H</SelectItem>
 <SelectItem value="M" className="text-sm">M</SelectItem>
 <SelectItem value="L" className="text-sm">L</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2">
 <div className="flex flex-wrap gap-1 justify-center">
 {(Object.keys(ASSERTION_LABELS) as Assertion[]).map(a => {
 const active = ct.assertions.includes(a);
 return (
 <button key={a} type="button" disabled={locked}
 onClick={() => toggleAssertion(cat.key, risk.id, ct.id, a)}
 title={ASSERTION_LABELS[a]}
 className={`h-7 min-w-[34px] px-2 rounded-md border text-[11px] font-semibold transition-colors ${
 active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-muted"
 } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}>
 {a}
 </button>
 );
 })}
 </div>
 </td>
 <td className="px-3 py-2">
 <Select disabled={locked} value={ct.automated}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { automated: v as AutoManual })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Manual" className="text-sm">Manual</SelectItem>
 <SelectItem value="Automated" className="text-sm">Automated</SelectItem>
 <SelectItem value="IT-dependent manual" className="text-sm">IT-dependent manual</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 space-y-1.5">
 <Select disabled={locked} value={ct.controlType}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { controlType: v })}>
 <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="Type…" /></SelectTrigger>
 <SelectContent>
 {CONTROL_TYPES.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
 </SelectContent>
 </Select>
 <Select disabled={locked} value={ct.frequency}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { frequency: v })}>
 <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="Frequency…" /></SelectTrigger>
 <SelectContent>
 {FREQUENCIES.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
 </SelectContent>
 </Select>
 <Select disabled={locked} value={ct.prevDet}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { prevDet: v as PrevDet })}>
 <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="Prev / Det…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Preventive" className="text-sm">Preventive</SelectItem>
 <SelectItem value="Detective" className="text-sm">Detective</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.designEffective}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { designEffective: v as YSN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Mitigated</SelectItem>
 <SelectItem value="S" className="text-sm">S — Some treatment</SelectItem>
 <SelectItem value="N" className="text-sm">N — Deficiency</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.implemented}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { implemented: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <RefButton
 reference={ct.supportingDocs}
 onAttach={doc => setControl(cat.key, risk.id, ct.id, { supportingDocs: [...ct.supportingDocs, doc] })}
 onRemove={idx => setControl(cat.key, risk.id, ct.id, { supportingDocs: ct.supportingDocs.filter((_, i2) => i2 !== idx) })}
 />
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.gitcSupports}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { gitcSupports: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.oeTestPlanned}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { oeTestPlanned: v as YN })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Yes</SelectItem>
 <SelectItem value="N" className="text-sm">No</SelectItem>
 <SelectItem value="NA" className="text-sm">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <Select disabled={locked} value={ct.controlRisk}
 onValueChange={v => setControl(cat.key, risk.id, ct.id, { controlRisk: v as IR })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="H" className="text-sm">H</SelectItem>
 <SelectItem value="M" className="text-sm">M</SelectItem>
 <SelectItem value="L" className="text-sm">L</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-3 py-2 text-center">
 <RefButton
 reference={ct.testRef}
 onAttach={doc => setControl(cat.key, risk.id, ct.id, { testRef: [...ct.testRef, doc] })}
 onRemove={idx => setControl(cat.key, risk.id, ct.id, { testRef: ct.testRef.filter((_, i2) => i2 !== idx) })}
 />
 </td>
 {!locked && (
 <td className="px-2 py-2 text-center">
 <button onClick={() => removeControl(cat.key, risk.id, ct.id)} className="text-muted-foreground hover:text-destructive">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {!locked && (
  <div className="flex items-start gap-2 flex-wrap">
   <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
    onClick={() => addControl(cat.key, risk.id)}>
    <Plus className="h-3.5 w-3.5" /> Add control
   </Button>
   <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
    onClick={() => setPickerFor({ catKey: cat.key, riskId: risk.id })}>
    <BookOpen className="h-3.5 w-3.5" /> From library
   </Button>
   {pickerFor?.catKey === cat.key && pickerFor?.riskId === risk.id && (
    <div className="w-full mt-1 border border-border rounded-md bg-card shadow-md overflow-hidden">
     <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
      <span className="text-xs font-semibold text-foreground">Control library — Form 582</span>
      <button onClick={() => setPickerFor(null)} className="text-muted-foreground hover:text-foreground">
       <X className="h-3.5 w-3.5" />
      </button>
     </div>
     <div className="flex gap-1 px-3 pt-2 pb-1 flex-wrap">
      {(["revenues","purchases","payroll","financial-reporting"] as const).map(cycle => (
       <button key={cycle} onClick={() => setPickerCycle(cycle)}
        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
         pickerCycle === cycle
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-input hover:bg-muted"
        }`}>
        {CONTROL_LIBRARY.find(e => e.cycle === cycle)?.cycleLabel ?? cycle}
       </button>
      ))}
     </div>
     <div className="max-h-52 overflow-y-auto divide-y divide-border">
      {CONTROL_LIBRARY.filter(e => e.cycle === pickerCycle).map(entry => (
       <button key={entry.id}
        onClick={() => loadFromLibrary(entry, cat.key, risk.id)}
        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-start gap-2">
        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0 w-16">{entry.component} · {entry.assertions.join(",")}</span>
        <span className="text-xs text-foreground leading-snug">{entry.description}</span>
       </button>
      ))}
     </div>
    </div>
   )}
  </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 ))}

 {/* Notes (1-3) reminder */}
 <div className="bg-primary/[0.03] border border-primary/15 rounded-md p-4 text-sm text-foreground/85 space-y-1.5">
 <p className="font-semibold text-foreground">Form 550 — Notes:</p>
 <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
 <li><b>Note 1:</b> If a control is automated, identify risks arising from the use of IT and the GITCs that support its operation.</li>
 <li><b>Note 2:</b> Documentation of control characteristics (type, frequency, prev/det) is optional for design but useful when planning to test operating effectiveness.</li>
 <li><b>Note 3:</b> Implementation cannot be determined by inquiry alone — combine with at least one other procedure (observation, inspection, walkthrough, reperformance).</li>
 </ol>
 </div>

 {/* Overall conclusion */}
 <div className="bg-card border border-border rounded-md p-5 space-y-3">
 <h3 className="text-sm font-semibold text-foreground">Overall conclusion</h3>
 <p className="text-sm text-muted-foreground">
 Based on the work done, conclude on whether control design and implementation — and control risk where applicable —
 have been appropriately assessed. Carry forward (significant deficiencies) and the response plan.
 </p>
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Overall conclusion</label>
 <Select disabled={locked} value={data.overallConclusion}
 onValueChange={v => setData(d => ({...d, overallConclusion: v as YSN }))}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y" className="text-sm">Y — Suitably designed &amp; implemented</SelectItem>
 <SelectItem value="S" className="text-sm">S — Partial reliance / residual risk</SelectItem>
 <SelectItem value="N" className="text-sm">N — Significant deficiencies identified</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="col-span-2 space-y-1">
 <label className="text-sm font-medium text-muted-foreground">Supporting rationale</label>
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has('550-overall')}>
  <Input disabled={locked} value={data.overallRationale}
  onChange={e => setData(d => ({...d, overallRationale: e.target.value }))}
  placeholder="Briefly support the overall conclusion."
  className="h-8 text-sm" />
 </LukaTypingRow>
 </div>
 </div>
 </div>

 {/* Notes */}
 <div className="bg-card border border-border rounded-md p-5 space-y-2">
 <h3 className="text-sm font-semibold text-foreground">Notes</h3>
 <div className="flex items-start gap-1.5">
   <GreenDot show={!!data.notes} />
   <Textarea disabled={locked} value={data.notes}
   onChange={e => setData(d => ({...d, notes: e.target.value }))}
   placeholder="Additional observations, follow-ups, communication to TCWG, or cross-references…"
   className="flex-1 min-h-[90px] text-sm resize-none rounded-[10px]" />
 </div>
 </div>

 <WorksheetSignOff worksheetKey="audit-550" engagementId={engagementId} />

 {locked ? (
 <ConcludedRow concludedOn={data.concludedOn} onReopen={() => { const u = {...data, concluded: false, concludedOn: '' }; setData(u); writeJsonToLocalStorage(storageKey, u); }} />
 ) : (
 <div className="flex justify-end">
 <Button size="sm" onClick={() => {
 const today = new Date().toISOString();
 const updated = {...data, concluded: true, concludedOn: today };
 setData(updated);
 writeJsonToLocalStorage(storageKey, updated);
 }}>
 Conclude Worksheet
 </Button>
 </div>
 )}
 </div>
 </div>
 );
}
