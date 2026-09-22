import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info, AlertTriangle, Users } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { useEngagementContext } from "@/hooks/useEngagementContext";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ─────────────────────────────────────────────────────────────────────

type YNNA = "Y" | "N" | "N/A" | "";

interface ProcedureRow {
 id: string;
 psc: YNNA;
 response: string;
 wpRef: RefDoc[];
}

interface RelatedParty {
 id: string;
 name: string;
 relationship: string;
 value: string;
 reasons: string;
 wpRef: RefDoc[];
}

interface Data515 {
 // Section 1 — Obtain listing of related parties
 s1a: ProcedureRow; // request listing
 s1b: ProcedureRow; // ensure listing covers directors/key staff/family/entities

 // Section 2 — Relevant controls & procedures
 s2a: ProcedureRow; // authorised/approved & disclosed
 s2b: ProcedureRow; // CAS 315.26(a) controls ->

 // Section 3 — Risk of undisclosed related parties
 s3a: ProcedureRow; // prior history of non-disclosure
 s3b: ProcedureRow; // outside normal course of business
 s3c: ProcedureRow; // susceptibility to material misstatement
 s3d: ProcedureRow; // inspect minutes/confirmations/other records
 s3e: ProcedureRow; // inquire of key employees/advisors/component auditors
 s3f: ProcedureRow; // audit team awareness & professional scepticism

 // Section 4 — Risk assessment
 s4a: ProcedureRow; // document RMM
 s4b: ProcedureRow; // identify significant risks (fraud / OCB)

 // Related parties register
 parties: RelatedParty[];

 // Notes & conclusion
 notes: string;
 conclusion: string;

 // Sign-off
 concluded: boolean;
 concludedOn: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

function emptyProcedure(): ProcedureRow {
 return { id: uid(), psc: "", response: "", wpRef: [] };
}

// ── Realistic pre-fill (shipping-industry, mirrors 513 tone) ──────────────────

function buildDefault(isUS = false): Data515 {
 const entity = isUS ? "Harbor Freight LLC" : "Shipping Line Inc.";

 return {
 s1a: {
 id: uid(), psc: "Y",
 response:
 `Requested Controller to prepare a comprehensive related-party schedule (per cross-reference). ` +
 `Listing received on Day 3 of fieldwork; changes from prior year noted (one director added, one wound-up entity removed) and independently agreed to corporate registry search.`,
 wpRef: [],
 },
 s1b: {
 id: uid(), psc: "Y",
 response:
 `Listing traced to (i) minute book — board & officer register, (ii) shareholder register, (iii) tax return T5013/1120 K-1 disclosures, ` +
 `(iv) CFO inquiry re: family members and entities under common control. All directors, key management, and 4 entities under common control identified.`,
 wpRef: [],
 },
 s2a: {
 id: uid(), psc: "Y",
 response:
 `Related-party transactions require board approval and are documented in board minutes; CFO reviews related-party invoices prior to payment. ` +
 `No transactions outside the normal course of business identified this period.`,
 wpRef: [],
 },
 s2b: {
 id: uid(), psc: "N/A",
 response:
 `No controls identified at the related-party level that require testing — reliance on substantive procedures only. not required.`,
 wpRef: [],
 },
 s3a: {
 id: uid(), psc: "Y",
 response:
 `No prior history of non-disclosure. Prior-year file (2023) reviewed — all related-party balances reconciled and disclosed. Regulatory filings clean.`,
 wpRef: [],
 },
 s3b: {
 id: uid(), psc: "Y",
 response:
 `Inquired of CFO and reviewed board minutes for the period. No related-party transactions outside the normal course of business ` +
 `(e.g., no unusual asset transfers, guarantees, or non-arm's length financing).`,
 wpRef: [],
 },
 s3c: {
 id: uid(), psc: "Y",
 response:
 `Considered susceptibility: entity has a bank debt covenant (Debt/EBITDA ≤ 3.5x). ` +
 `Related-party charter income and vessel management fees could theoretically be used to improve EBITDA. ` +
 `Rates traced to independent broker indices — pricing consistent with market. No indication of covenant-driven manipulation.`,
 wpRef: [],
 },
 s3d: {
 id: uid(), psc: "Y",
 response:
 `Inspected: (i) board & shareholder minutes (all periods), (ii) bank confirmations (guarantees / cross-defaults), ` +
 `(iii) legal confirmations from external counsel, (iv) ${isUS ? "1120 & K-1 schedules" : "T5013 & tax returns"}, (v) major loan agreements. ` +
 `No undisclosed related-party relationships or transactions identified.`,
 wpRef: [],
 },
 s3e: {
 id: uid(), psc: "Y",
 response:
 `Inquired of Controller, CFO, external legal counsel, and the tax advisor. ` +
 `No additional parties, undisclosed loan guarantees, side deals, kickbacks, or preferential terms reported. ` +
 `No component auditor involved (single reporting unit).`,
 wpRef: [],
 },
 s3f: {
 id: uid(), psc: "Y",
 response:
 `Related-party register circulated to the audit team at planning kickoff. ` +
 `Team briefed on related-party requirements and instructed to apply professional scepticism when reviewing significant transactions.`,
 wpRef: [],
 },
 s4a: {
 id: uid(), psc: "Y",
 response:
 `RMM documented (Part B — assertion level): "Existence & occurrence — related-party charter revenue" (Moderate inherent risk, non-significant). ` +
 `No fraud risk factors identified at the FS level.`,
 wpRef: [],
 },
 s4b: {
 id: uid(), psc: "Y",
 response:
 `No significant risks arising from related parties: (i) no fraud risk factors involving related parties, ` +
 `(ii) no significant related-party transactions outside the normal course of business. Standard substantive procedures apply.`,
 wpRef: [],
 },
 parties: [
 { id: uid(), name: `${isUS ? "J. Halvorsen" : "M. Chen"} (CEO & 62% shareholder)`, relationship: "Key management / Controlling shareholder",
 value: "Salary $385,000; dividend $180,000", reasons: "Employment contract & declared dividend — in normal course; approved by board.", wpRef: [] },
 { id: uid(), name: `${isUS ? "Halvorsen Holdings Inc." : "Chen Marine Holdings Ltd."}`, relationship: "Parent — 62% shareholder",
 value: "Management fee $240,000", reasons: "Head-office services (finance, IT, HR) — arm's-length benchmark; monthly billing per intercompany agreement.", wpRef: [] },
 { id: uid(), name: `${isUS ? "Coastal Bunker LLC" : "Pacific Bunker Ltd."}`, relationship: "Common control (CEO 100% owner)",
 value: "Fuel purchases $1,420,000", reasons: "Bunker fuel supply at port of Vancouver / LA — rates benchmarked to Platts index (within 1.2%).", wpRef: [] },
 { id: uid(), name: "R. Chen (Director)", relationship: "Director & spouse of CEO",
 value: "Directors' fees $48,000", reasons: "Board attendance fees — market rate for private-company board.", wpRef: [] },
 { id: uid(), name: `${isUS ? "Harbor Freight ESOP Trust" : "SLI Employee Trust"}`, relationship: "Entity under common control",
 value: "Contribution $95,000", reasons: "Annual employer contribution — per plan documents; approved by trustee minutes.", wpRef: [] },
 ],
 notes:
 `• Cross-reference: (Understanding the entity) — sections on group structure & governance.\n` +
 `• Cross-reference: — RMM register (Part B assertion-level related-party risks).\n` +
 `• Consider written representations on completeness of related parties.\n` +
 `• No specialist required. No component auditor involvement.`,
 conclusion:
 `We have obtained an understanding of ${entity}'s related-party relationships and transactions sufficient to recognise fraud risk factors ` +
 `and assess possible risks of material misstatement (fraud or error) in the F/S. ` +
 `No significant related-party transactions outside the normal course of business were identified, and no fraud risk factors ` +
 `involving related parties were noted. Standard substantive procedures documented will address the assessed risks.`,
 concluded: false, concludedOn: "",
 };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
 title: string; subtitle?: string; children: React.ReactNode;
}) {
 return (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
 </div>
 {children}
 </div>
 );
}

function ProcedureTable({
 rows,
 locked,
 onChange,
}: {
 rows: { label: string; procedure: React.ReactNode; row: ProcedureRow; onPatch: (p: Partial<ProcedureRow>) => void }[];
 locked: boolean;
 onChange?: (p: Partial<ProcedureRow>) => void; // unused, kept for signature parity
}) {
 return (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-10">#</th>
 <th className="px-5 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[38%]">Procedure</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">PSC?</th>
 <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider w-[38%]">Response / Comments</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider w-24">W/P Ref.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {rows.map(({ label, procedure, row, onPatch }) => (
 <tr key={label} className="hover:bg-muted/30 transition-colors align-top">
 <td className="px-4 py-3 text-center">
 <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted text-[11px] font-semibold text-foreground">
 {label}
 </span>
 </td>
 <td className="px-5 py-3 text-sm text-foreground leading-relaxed">{procedure}</td>
 <td className="px-4 py-3 w-24">
 <Select value={row.psc} onValueChange={v => onPatch({ psc: v as YNNA })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <Textarea
 disabled={locked}
 value={row.response}
 onChange={e => onPatch({ response: e.target.value })}
 placeholder="Document procedure results…"
 className="min-h-[72px] text-sm bg-background resize-none flex-1"
 />
 </div>
 </td>
 <td className="px-4 py-3 text-center w-24">
 <RefButton
 reference={row.wpRef}
 onAttach={doc => onPatch({ wpRef: [...row.wpRef, doc] })}
 onRemove={i => onPatch({ wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Audit515Worksheet({ isUS: isUSProp }: { isUS?: boolean } = {}) {
 const { engagementId } = useParams<{ engagementId: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;
 const ctx = useEngagementContext();
 const isUS = isUSProp ?? ctx.isUS;
 const storageKey = `audit-515-data-v1-${engagementId ?? (isUS ? "us" : "ca")}`;

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstFillRef = useRef<HTMLDivElement>(null);
 const [data, setData] = useState<Data515>(() => {
 const saved = readJsonFromLocalStorage<Data515 | null>(storageKey, null);
 const def = buildDefault(isUS);
 return saved ? {...def,...saved } : def;
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const locked = data.concluded;

 function patch<K extends keyof Data515>(key: K, val: Data515[K]) {
 setData(d => ({...d, [key]: val }));
 }

 function patchRow(key: keyof Data515, partial: Partial<ProcedureRow>) {
 setData(d => ({...d, [key]: {...(d[key] as ProcedureRow),...partial } }));
 }

 function updateParty(id: string, partial: Partial<RelatedParty>) {
 setData(d => ({...d, parties: d.parties.map(p => p.id === id ? {...p,...partial } : p) }));
 }

 function addParty() {
 setData(d => ({...d, parties: [...d.parties, { id: uid(), name: "", relationship: "", value: "", reasons: "", wpRef: [] }] }));
 }

 function deleteParty(id: string) {
 setData(d => ({...d, parties: d.parties.filter(p => p.id !== id) }));
 }
 function markLukaFilled(id: string) {
   setLukaFilledFields(prev => new Set(prev).add(id));
   setLukaHighlightFields(prev => new Set(prev).add(id));
   setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

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
     const p0 = data.parties[0]?.id;
     const p1 = data.parties[1]?.id;
     const p2 = data.parties[2]?.id;
     lukaSequentialFill([
       {
         scrollRef: firstFillRef as unknown as import('react').RefObject<HTMLElement>,
         set: () => {
           if (p0) {
             setData(d => ({...d, parties: d.parties.map(p => p.id !== p0 ? p : {
               ...p,
               name: isUS ? "J. Halvorsen (CEO & 62% shareholder)" : "M. Chen (CEO & 62% shareholder)",
               relationship: "Key management / Controlling shareholder",
               value: "Salary $385,000; dividend $180,000",
               reasons: "Employment contract and declared dividend — in normal course; approved by board. Salary benchmarked to industry comparables for private-company CEO. Dividend declared per shareholder resolution.",
             })}));
             markLukaFilled(p0);
           }
         },
       },
       {
         set: () => {
           if (p1) {
             setData(d => ({...d, parties: d.parties.map(p => p.id !== p1 ? p : {
               ...p,
               name: isUS ? "Halvorsen Holdings Inc." : "Chen Marine Holdings Ltd.",
               relationship: "Parent — 62% shareholder",
               value: "Management fee $240,000",
               reasons: "Head-office services (finance, IT, HR) — arm's-length benchmark rate confirmed via independent comparables. Monthly billing per intercompany agreement dated January 2023.",
             })}));
             markLukaFilled(p1);
           }
         },
       },
       {
         set: () => {
           if (p2) {
             setData(d => ({...d, parties: d.parties.map(p => p.id !== p2 ? p : {
               ...p,
               name: isUS ? "Coastal Bunker LLC" : "Pacific Bunker Ltd.",
               relationship: "Common control (CEO 100% owner)",
               value: "Fuel purchases $1,420,000",
               reasons: "Bunker fuel supply — rates benchmarked to Platts index (within 1.2% of market). Largest vendor by spend. Approved by board resolution; invoices reviewed by CFO prior to payment.",
             })}));
             markLukaFilled(p2);
           }
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
 Understand the use and extent of related-party relationships and transactions, recognise fraud risk factors, and assess possible risks of material misstatement (fraud or error) in the F/S.
 </p>
 </div>
 <div className="p-6 space-y-6">

 {/* Cross-reference banner */}
 <div className="rounded-md border border-border bg-card px-4 py-3 flex items-start gap-3">
 <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
 <p className="text-sm text-muted-foreground leading-relaxed">
 Information on related parties may already have been documented.
 </p>
 </div>

 {/* Section 1 */}
 <SectionCard title="1. Obtain Listing of Related Parties">
 <ProcedureTable locked={locked} rows={[
 {
 label: "a",
 procedure: <>Request management to prepare (or assist in preparing) a comprehensive listing of related parties and transactions during the period (see register below), including details of changes from the previous period.</>,
 row: data.s1a,
 onPatch: p => patchRow("s1a", p),
 },
 {
 label: "b",
 procedure: <>Ensure listing includes the names of directors, managers, key staff, family members and any other entities they may own or control.</>,
 row: data.s1b,
 onPatch: p => patchRow("s1b", p),
 },
 ]} />
 </SectionCard>

 {/* Section 2 */}
 <SectionCard
 title="2. Relevant Controls and Procedures"
 subtitle="Document controls that ensure related parties are identified and significant transactions are authorised, accounted for and disclosed."
 >
 <ProcedureTable locked={locked} rows={[
 {
 label: "a",
 procedure: (
 <>
 Document controls/procedures that ensure related parties are identified and significant transactions are:
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 <li className="text-sm text-muted-foreground">Authorised and approved (especially those outside the normal course of business).</li>
 <li className="text-sm text-muted-foreground">Accounted for and disclosed in accordance with the applicable financial reporting framework.</li>
 </ul>
 </>
 ),
 row: data.s2a,
 onPatch: p => patchRow("s2a", p),
 },
 {
 label: "b",
 procedure: <>Where controls are identified, assess the control design and implementation.</>,
 row: data.s2b,
 onPatch: p => patchRow("s2b", p),
 },
 ]} />
 </SectionCard>

 {/* Section 3 */}
 <SectionCard title="3. Risk of Undisclosed Related Parties" subtitle="Consider indicators of undisclosed relationships and transactions.">
 <ProcedureTable locked={locked} rows={[
 { label: "a", procedure: <>Consider any previous history of not disclosing related parties or transactions.</>, row: data.s3a, onPatch: p => patchRow("s3a", p) },
 { label: "b", procedure: <>Consider the involvement of related parties in transactions outside the normal course of business.</>, row: data.s3b, onPatch: p => patchRow("s3b", p) },
 {
 label: "c",
 procedure: <>Consider the susceptibility of F/S to material misstatement through the use of related-party transactions — e.g., transactions that would improve liquidity/profitability, avoid corporate/personal taxes, avoid breach of a bank covenant, or shift income/expense to future periods or between related entities.</>,
 row: data.s3c, onPatch: p => patchRow("s3c", p),
 },
 {
 label: "d",
 procedure: (
 <>
 Inspect the following for any indications of undisclosed related-party relationships or transactions:
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 <li className="text-sm text-muted-foreground">Minutes of corporate meetings.</li>
 <li className="text-sm text-muted-foreground">Bank and legal confirmations.</li>
 <li className="text-sm text-muted-foreground">Other records or documents (e.g., tax returns, loan agreements).</li>
 </ul>
 </>
 ),
 row: data.s3d, onPatch: p => patchRow("s3d", p),
 },
 {
 label: "e",
 procedure: (
 <>
 Inquire of key employees, advisors and any component auditors about:
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 <li className="text-sm text-muted-foreground">Related parties not already identified and, if so, details of transactions.</li>
 <li className="text-sm text-muted-foreground">Agreements or loan guarantees not reflected in the F/S.</li>
 <li className="text-sm text-muted-foreground">Payments (kickbacks), preferential terms or side deals not disclosed.</li>
 </ul>
 </>
 ),
 row: data.s3e, onPatch: p => patchRow("s3e", p),
 },
 { label: "f", procedure: <>Ensure the audit team is aware of related parties and the need for professional scepticism when reviewing related-party transactions.</>, row: data.s3f, onPatch: p => patchRow("s3f", p) },
 ]} />
 </SectionCard>

 {/* Section 4 */}
 <SectionCard title="4. Risk Assessment" subtitle="Document RMM and identify significant risks arising from related parties.">
 <ProcedureTable locked={locked} rows={[
 { label: "a", procedure: <>Document any risks of material misstatement, and assess the risks of material misstatement.</>, row: data.s4a, onPatch: p => patchRow("s4a", p) },
 {
 label: "b",
 procedure: (
 <>
 Identify significant risks that will require special attention. This includes:
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 <li className="text-sm text-muted-foreground">Fraud risk factors (involving related parties).</li>
 <li className="text-sm text-muted-foreground">Significant related-party transactions outside the normal course of business.</li>
 </ul>
 </>
 ),
 row: data.s4b, onPatch: p => patchRow("s4b", p),
 },
 ]} />
 </SectionCard>

 {/* Related parties register */}
 {isDemoEngagement && <div ref={firstFillRef} />}
 <SectionCard
 title="Related Parties Register"
 subtitle="List related parties below or cross-reference to other relevant working papers (e.g.,)."
 >
 <div className="overflow-x-auto">
 <table className="w-full min-w-[900px] text-sm">
 <thead>
 <tr className="bg-muted border-b border-border text-sm font-semibold text-foreground uppercase tracking-wider">
 <th className="px-4 py-2.5 text-center w-10">#</th>
 <th className="px-4 py-2.5 text-left w-[22%]">Name</th>
 <th className="px-4 py-2.5 text-left w-[18%]">Relationship</th>
 <th className="px-4 py-2.5 text-left w-[18%]">$ Value of Transactions</th>
 <th className="px-4 py-2.5 text-left">Reasons / Normal course &amp; Terms</th>
 <th className="px-4 py-2.5 text-center w-24">W/P Ref.</th>
 <th className="w-8" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.parties.length === 0 && (
 <tr>
 <td colSpan={7} className="px-6 py-8 text-center">
 <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
 <p className="text-sm text-muted-foreground">No related parties recorded yet.</p>
 </td>
 </tr>
 )}
 {data.parties.map((p, idx) => (
 <tr key={p.id} className={`group hover:bg-muted/30 transition-colors align-top${isDemoEngagement && lukaHighlightFields.has(p.id) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}>
 <td className="px-4 py-2.5 text-center text-xs text-muted-foreground font-mono">{idx + 1}</td>
 <td className="px-4 py-2.5">
 <Input
 disabled={locked} value={p.name}
 onChange={e => updateParty(p.id, { name: e.target.value })}
 placeholder="Name…"
 className="h-8 text-sm bg-background font-medium"
 />
 </td>
 <td className="px-4 py-2.5">
 <Input
 disabled={locked} value={p.relationship}
 onChange={e => updateParty(p.id, { relationship: e.target.value })}
 placeholder="Relationship…"
 className="h-8 text-sm bg-background"
 />
 </td>
 <td className="px-4 py-2.5">
 <Input
 disabled={locked} value={p.value}
 onChange={e => updateParty(p.id, { value: e.target.value })}
 placeholder="$ amount…"
 className="h-8 text-sm bg-background"
 />
 </td>
 <td className="px-4 py-2.5">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!p.reasons} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has(p.id)}>
 <Textarea
 disabled={locked} value={p.reasons}
 onChange={e => updateParty(p.id, { reasons: e.target.value })}
 placeholder="Reasons for transaction; whether in normal course; terms…"
 className="min-h-[44px] text-sm bg-background resize-none"
 />
 </LukaTypingRow>
 </div>
 </div>
 </td>
 <td className="px-4 py-2.5 text-center w-24">
 <RefButton
 reference={p.wpRef}
 onAttach={doc => updateParty(p.id, { wpRef: [...p.wpRef, doc] })}
 onRemove={i => updateParty(p.id, { wpRef: p.wpRef.filter((_, ix) => ix !== i) })}
 disabled={locked}
 />
 </td>
 <td className="px-2 py-2 text-center w-8">
 {!locked && (
 <button onClick={() => deleteParty(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
 <Trash2 className="h-3 w-3 text-destructive" />
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {!locked && (
 <div className="px-6 py-3 border-t border-border">
 <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={addParty}>
 <Plus className="h-3.5 w-3.5" /> Add related party
 </Button>
 </div>
 )}
 </div>
 </SectionCard>




 {/* Sign-off */}
 <WorksheetSignOff worksheetKey="audit-515" engagementId={engagementId} />

 {/* Conclude action */}
 <div className="flex justify-end pt-1">
 {data.concluded ? (
 <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 font-medium">
 Concluded on {data.concludedOn}
 </div>
 ) : (
 <Button
 disabled={locked}
 onClick={() => {
 const now = new Date().toISOString().slice(0, 10);
 setData(d => {
 const next = {...d, concluded: true, concludedOn: now };
 writeJsonToLocalStorage(storageKey, next);
 return next;
 });
 }}
 >
 Conclude worksheet
 </Button>
 )}
 </div>


 </div>
 </div>
 </div>
 );
}
