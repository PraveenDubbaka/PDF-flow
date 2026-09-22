import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Trash2 } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from "@/lib/lukaInlineFill";
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlanRow { checked: boolean; psc: string; response: string; wpRef: RefDoc[] }
interface InqRow { checked: boolean; psc: string; response: string; wpRef: RefDoc[] }
interface Interviewee { who: string; byWhom: string; date: string }

interface Data505 {
 planning: Record<string, PlanRow>;
 inquiries: Record<string, InqRow>;
 interviewees: Record<string, Interviewee[]>;
 notes: string;
 conclusion: string;
 concluded: boolean;
 concludedOn: string;
}

// ── Planning steps ─────────────────────────────────────────────────────────────

const PLANNING = [
 {
 id: 'pl-1', num: '1',
 description: 'Select members of management and TCWG who may help in identifying (or updating) the risks of material misstatements (error and fraud) in the F/S.',
 items: [] as string[],
 },
 {
 id: 'pl-2', num: '2',
 description: 'Select others in the entity (at various levels of authority) that may provide a different perspective in identifying risks of material misstatement. Consider:',
 items: [
 'Sales/marketing personnel.',
 'Operational and purchasing managers.',
 'IT support personnel.',
 'Accounting employees.',
 'Others, such as internal auditors or risk managers (specify).',
 ],
 },
 { id: 'pl-3', num: '3', description: 'Document the names of those selected for interview, and schedule a convenient time to meet.', items: [] as string[] },
 { id: 'pl-4', num: '4', description: 'Ask open-ended questions and document the information obtained. Record risk factors identified', items: [] as string[] },
];

// ── Inquiry groups ─────────────────────────────────────────────────────────────

const INQUIRY_GROUPS = [
 {
 group: 'Inquiries of Management & Financial Reporting Personnel',
 sections: [
 {
 id: 'mgmt',
 label: 'Management',
 roles: ['CEO', 'CFO', 'COO', 'President', 'Controller', 'VP Finance', 'Managing Director', 'Other'],
 items: [
 'Business plans and strategies.',
 'Financial targets (such as sales and profitability, planned acquisitions and divestitures), new/discontinued products and services, and new contracts.',
 'Key initiatives (such as personnel changes, location changes, new financing sources, new technologies and major research, or other planned expenditures).',
 'The impact of any new accounting requirements and how they will be implemented.',
 ],
 },
 ],
 },
 {
 group: 'Inquiries of Others',
 sections: [
 {
 id: 'sales',
 label: 'Sales / Marketing Personnel',
 roles: ['Sales Director', 'VP Sales', 'Sales Manager', 'Marketing Manager', 'Account Manager', 'Business Development Manager', 'Other'],
 items: [
 'Composition of sales and sales trends.',
 'Products/services that are doing well and those that are not.',
 'The major competitors and their impact.',
 'Major new and lost customers.',
 'Changes in contractual arrangements and terms of warranties.',
 'Any customers having difficulty paying on time.',
 'Any new or modified incentive programs for sales staff.',
 'Any sales that have been made outside of the usual terms of business.',
 'Any modifications to accounting policies for revenue recognition.',
 'Any instances of alleged, suspected or actual fraud.',
 'The risks and relevant internal controls over sales.',
 'Other (specify).',
 ],
 },
 {
 id: 'ops',
 label: 'Operational / Purchasing Personnel',
 roles: ['Operations Manager', 'Purchasing Manager', 'Supply Chain Manager', 'Production Manager', 'Warehouse Manager', 'Plant Manager', 'Other'],
 items: [
 'Major changes in production processes.',
 'New equipment or technologies.',
 'Changes in suppliers, price/availability of raw materials, costing methodology, personnel and other operational matters.',
 'Condition of inventory. Consider obsolescence, slow-moving items, damage and any theft during the period.',
 'Any instances of alleged, suspected or actual fraud.',
 'Economic dependence on a major supplier.',
 'Risks and relevant internal controls over purchasing.',
 'Other (specify).',
 ],
 },
 {
 id: 'it',
 label: 'IT Support Personnel',
 roles: ['IT Manager', 'IT Director', 'CTO', 'Systems Administrator', 'Network Administrator', 'IT Coordinator', 'Other'],
 items: [
 'Changes (planned and actual) to IT infrastructure, personnel or support.',
 'Access and control over data/programs by the IT staff or IT contractor.',
 'Changes to IT applications that have an impact on accounting.',
 'Problems encountered during the period. Consider system crashes, virus/hacker attacks, security breaches, unauthorized access to data or user complaints, etc.',
 'Physical security of IT equipment (such as servers, laptops, desktops and other mobile devices).',
 'Any instances of alleged, suspected or actual fraud.',
 'The risks and relevant internal controls that address IT security and financial applications, if applicable.',
 'Other (specify).',
 ],
 },
 {
 id: 'acctg',
 label: 'Accounting Personnel',
 roles: ['Controller', 'Chief Accountant', 'Accounting Manager', 'AP Manager', 'AR Manager', 'Financial Analyst', 'Bookkeeper', 'Other'],
 items: [
 'The process of preparing financial reports and statements and areas where misstatements could arise (such as use of Excel spreadsheets).',
 'Significant or unusual transactions or journal entries in the period.',
 'Any instances of alleged, suspected or actual fraud.',
 "Whether the entity's accounting policies have been consistently applied.",
 "Whether there is a service auditor's report available for review where payroll has been outsourced.",
 'Whether issues or concerns have been raised by external parties, such as bankers, regulators, investors or the press.',
 'The risks and relevant internal controls that address areas such as payroll and financial reporting.',
 'Other (specify).',
 ],
 },
 ],
 },
 {
 group: 'Other Inquiries',
 sections: [
 {
 id: 'lawyers',
 label: 'Others (in-house lawyers, internal auditors, etc.)',
 roles: ['Legal Counsel', 'General Counsel', 'Internal Auditor', 'Risk Manager', 'Compliance Officer', 'Other'],
 items: [
 'Any knowledge of management override, fraud or suspected fraud.',
 'Any actual or threatened litigation or non-compliance with laws and regulations.',
 'Internal audit reports to management on areas of concern.',
 ],
 },
 ],
 },
];

const ALL_SECTIONS = INQUIRY_GROUPS.flatMap(g => g.sections);

const AUDITOR_OPTIONS = [
 'Elena Sokolova — Partner',
 'Priya Raman — Staff',
 'Marcus Chen — CMS',
];

// ── Default builders ───────────────────────────────────────────────────────────

function emptyPlan(): PlanRow { return { checked: false, psc: '', response: '', wpRef: [] }; }
function emptyInq(): InqRow { return { checked: false, psc: '', response: '', wpRef: [] }; }
function emptyIv(): Interviewee { return { who: '', byWhom: '', date: '' }; }

function buildDefault(): Data505 {
 const planning: Record<string, PlanRow> = {};
 PLANNING.forEach(p => { planning[p.id] = emptyPlan(); });

 const inquiries: Record<string, InqRow> = {};
 const interviewees: Record<string, Interviewee[]> = {};
 ALL_SECTIONS.forEach(sec => {
 sec.items.forEach((_, i) => { inquiries[`${sec.id}-${i}`] = emptyInq(); });
 interviewees[sec.id] = [emptyIv(), emptyIv()];
 });

 return { planning, inquiries, interviewees, notes: '', conclusion: '', concluded: false, concludedOn: '' };
}

// ── Column headers ─────────────────────────────────────────────────────────────

function PlanColHeaders() {
 return (
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" />
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider">#</th>
 <th className="w-[38%] px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Procedure</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 140, minWidth: 140 }}>PSC (Y/N)</th>
 <th className="w-[38%] px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Responses / comments</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 100, minWidth: 100 }}>W/P ref.</th>
 </tr>
 </thead>
 );
}

function InqColHeaders() {
 return (
 <thead>
 <tr className="bg-muted/60 border-b border-border">
 <th className="w-10 px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider" />
 <th className="w-10 px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
 <th className="w-[38%] px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Inquiry topic</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 130, minWidth: 130 }}>PSC (Y/N)</th>
 <th className="w-[38%] px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Findings / response</th>
 <th className="px-4 py-2.5 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 100, minWidth: 100 }}>W/P ref.</th>
 </tr>
 </thead>
 );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Audit505Worksheet({ isUS = false }: { isUS?: boolean }) {
 const storageKey = `audit-505-data-${isUS ? 'us' : 'ca'}`;
 const { engagementId = 'default' } = useParams<{ engagementId?: string }>();
 const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;

 const [data, setData] = useState<Data505>(() => {
 const saved = readJsonFromLocalStorage<Data505 | null>(storageKey, null);
 if (!saved) return buildDefault();
 const def = buildDefault();
 return {
...def,
...saved,
 planning: {...def.planning,...(saved.planning ?? {}) },
 inquiries: {...def.inquiries,...(saved.inquiries ?? {}) },
 interviewees: {...def.interviewees,...(saved.interviewees ?? {}) },
 };
 });

 const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
 const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
 const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
 const firstPlanRef = useRef<HTMLTableRowElement>(null);
 function markLukaFilled(id: string) {
  setLukaFilledFields(prev => new Set(prev).add(id));
  setLukaHighlightFields(prev => new Set(prev).add(id));
  setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
 }

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const locked = data.concluded;

 // ── Handlers ──────────────────────────────────────────────────────────────

 function setPlan(id: string, patch: Partial<PlanRow>) {
 setData(d => ({...d, planning: {...d.planning, [id]: {...d.planning[id],...patch } } }));
 }

 function setInq(key: string, patch: Partial<InqRow>) {
 setData(d => ({...d, inquiries: {...d.inquiries, [key]: {...d.inquiries[key],...patch } } }));
 }

 function setIv(sId: string, idx: number, patch: Partial<Interviewee>) {
 setData(d => {
 const list = [...(d.interviewees[sId] ?? [])];
 list[idx] = {...list[idx],...patch };
 return {...d, interviewees: {...d.interviewees, [sId]: list } };
 });
 }

 function addIv(sId: string) {
 setData(d => ({
...d,
 interviewees: {...d.interviewees, [sId]: [...(d.interviewees[sId] ?? []), emptyIv()] },
 }));
 }

 function removeIv(sId: string, idx: number) {
 setData(d => {
 const list = (d.interviewees[sId] ?? []).filter((_, i) => i !== idx);
 return {...d, interviewees: {...d.interviewees, [sId]: list.length ? list : [emptyIv()] } };
 });
 }

 function handleConclude() {
 const now = new Date().toISOString().slice(0, 10);
 setData(d => { const next = {...d, concluded: true, concludedOn: now }; writeJsonToLocalStorage(storageKey, next); return next; });
 }

 // ── Render ─────────────────────────────────────────────────────────────────

 return (
 <div className="flex flex-col h-full">
 {isDemoEngagement && (
  <LukaStatusBar
    isActive={isDemoEngagement}
    message={
      lukaState === 'loading'
        ? "Luka is populating fields from prior file and connected sources…"
        : lukaState === 'done'
        ? "Luka has reviewed this section — fields flagged for your review."
        : "Luka is populating information from Xero and prior file…"
    }
    actions={lukaState === 'idle' ? DEMO_LUKA_ACTIONS.riskAssessment.actions.map(a => ({
      ...a,
      onTrigger: () => {
        setLukaState('loading');
        lukaSequentialFill([
          { scrollRef: firstPlanRef as React.RefObject<HTMLElement>, set: () => {
              setPlan('pl-1', { checked: true, psc: 'C', response: 'CFO and Controller identified as primary contacts for risk identification discussions.' });
              markLukaFilled('pl-1');
            }
          },
          { set: () => {
              setPlan('pl-2', { checked: true, psc: 'C', response: 'Plant manager (Mississauga), warehouse supervisor (Barrie), and accounting manager selected for inquiry.' });
              markLukaFilled('pl-2');
            }
          },
          { set: () => {
              setPlan('pl-3', { checked: true, psc: 'C', response: 'Interviews scheduled for week of January 12, 2026. Names and roles documented in engagement binder.' });
              markLukaFilled('pl-3');
            }
          },
        ], () => setLukaState('done'));
      },
    })) : []}
  />
 )}

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 To provide an additional listing of potential inquiries of management, those responsible for financial
 reporting and other appropriate individuals within the entity.{" "}
 <span className="font-medium text-foreground">Note:</span> Where responses are incomplete, unsatisfactory
 or inconsistent, perform additional risk assessment procedures.{" "}
 <span className="font-medium text-foreground">PSC</span> = Procedure successfully completed.{" "}
 <span className="font-medium text-foreground">TCWG</span> = Those charged with governance.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* ── Planning ────────────────────────────────────────────────── */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">Planning</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <PlanColHeaders />
 <tbody className="divide-y divide-border">
 {PLANNING.map(proc => {
 const row = data.planning[proc.id];
 return (
 <tr
 key={proc.id}
 ref={proc.id === 'pl-1' ? firstPlanRef : undefined}
 className={`hover:bg-muted/50 transition-colors${
   isDemoEngagement && lukaHighlightFields.has(proc.id) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''
 }`}
 >
 <td className="px-4 py-3 text-center align-top">
 <Checkbox checked={row.checked} onCheckedChange={v => setPlan(proc.id, { checked: !!v })} disabled={locked} />
 </td>
 <td className="px-4 py-3 text-center align-top text-sm font-semibold font-mono text-foreground">{proc.num}</td>
 <td className="px-6 py-3 align-top text-sm text-foreground">
 {proc.description}
 {proc.items.length > 0 && (
 <ul className="mt-2 space-y-0.5 list-disc list-inside">
 {proc.items.map((item, i) => <li key={i} className="text-sm text-muted-foreground">{item}</li>)}
 </ul>
 )}
 </td>
 <td className="px-4 py-3 align-top" style={{ width: 140 }}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.psc} />
 <div className="flex-1">
 <Select value={row.psc} onValueChange={v => setPlan(proc.id, { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </td>
 <td className="px-6 py-3 align-top">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <div className="flex-1">
 <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has(proc.id)}>
   <AttributedComment value={row.response} onChange={v => setPlan(proc.id, { response: v })} storageKey={`505-${engagementId}-${proc.id}`} placeholder="Enter response…" disabled={locked} className="min-h-[60px] text-sm resize-none bg-background" />
 </LukaTypingRow>
 {isDemoEngagement && lukaFilledFields.has(proc.id) && (
   <div className="mt-1">
   </div>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3 align-top text-center" style={{ width: 100 }}>
 <RefButton
 reference={row.wpRef}
 onAttach={doc => setPlan(proc.id, { wpRef: [...row.wpRef, doc] })}
 onRemove={i => setPlan(proc.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Inquiry groups ───────────────────────────────────────────── */}
 {INQUIRY_GROUPS.map(group => (
 <div key={group.group} className="space-y-3">

 {/* Group divider */}
 <div className="flex items-center gap-3 pt-1">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{group.group}</span>
 <div className="flex-1 h-px bg-border" />
 </div>

 {group.sections.map(sec => {
 const ivList = data.interviewees[sec.id] ?? [emptyIv()];
 return (
 <div key={sec.id} className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">

 {/* Card header */}
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{sec.label}</span>
 </div>

 {/* Interviewees */}
 <div className="px-6 pt-3 pb-3 border-b border-border bg-muted/[0.03]">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interviewees</p>
 {!locked && (
 <Button
 size="sm"
 variant="secondary"
 className="h-7 text-xs gap-1"
 onClick={() => addIv(sec.id)}
 >
 <Plus className="h-3.5 w-3.5" />
 Add row
 </Button>
 )}
 </div>
 <div className="rounded border border-border overflow-hidden">
 <table className="w-full">
 <thead>
 <tr className="bg-muted text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border">
 <th className="px-3 py-2 text-left">Who interviewed</th>
 <th className="px-3 py-2 text-left border-l border-border">By whom (auditor)</th>
 <th className="px-3 py-2 text-left border-l border-border" style={{ width: 160 }}>Date</th>
 {!locked && <th className="w-9" />}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {ivList.map((iv, i) => (
 <tr key={i} className="hover:bg-muted/30">
 <td className="px-2 py-1">
 <Select value={iv.who} onValueChange={v => setIv(sec.id, i, { who: v })} disabled={locked}>
 <SelectTrigger className="h-7 text-sm border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-2">
 <SelectValue placeholder="Select role" />
 </SelectTrigger>
 <SelectContent>
 {sec.roles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-2 py-1 border-l border-border">
 <Select value={iv.byWhom} onValueChange={v => setIv(sec.id, i, { byWhom: v })} disabled={locked}>
 <SelectTrigger className="h-7 text-sm border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-2">
 <SelectValue placeholder="Select auditor" />
 </SelectTrigger>
 <SelectContent>
 {AUDITOR_OPTIONS.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-2 py-1 border-l border-border" style={{ width: 160 }}>
 <Input
 type="date"
 disabled={locked}
 value={iv.date}
 onChange={e => setIv(sec.id, i, { date: e.target.value })}
 className="h-7 text-sm border-0 shadow-none px-2 focus-visible:ring-0 bg-transparent"
 />
 </td>
 {!locked && (
 <td className="px-2 text-center">
 <button
 type="button"
 onClick={() => removeIv(sec.id, i)}
 className="text-muted-foreground/40 hover:text-destructive transition-colors"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Inquiry items table */}
 <div className="overflow-x-auto">
 <p className="px-6 pt-3 pb-0.5 text-sm text-muted-foreground italic">
 Inquire about matters such as the following:
 </p>
 <table className="w-full">
 <InqColHeaders />
 <tbody className="divide-y divide-border">
 {sec.items.map((item, idx) => {
 const key = `${sec.id}-${idx}`;
 const row = data.inquiries[key] ?? emptyInq();
 return (
 <tr key={key} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 text-center align-top">
 <Checkbox checked={row.checked} onCheckedChange={v => setInq(key, { checked: !!v })} disabled={locked} />
 </td>
 <td className="px-4 py-2.5 text-center align-top text-xs text-muted-foreground font-mono">
 {String.fromCharCode(96 + idx + 1)}.
 </td>
 <td className="px-4 py-2.5 align-top border-l-2 border-primary/20">
 <span className="text-sm text-foreground leading-relaxed">{item}</span>
 </td>
 <td className="px-4 py-2.5 align-top" style={{ width: 130 }}>
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.psc} />
 <div className="flex-1">
 <Select value={row.psc} onValueChange={v => setInq(key, { psc: v })} disabled={locked}>
 <SelectTrigger className="h-8 text-sm bg-background w-full">
 <SelectValue placeholder="Select" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Y">Y</SelectItem>
 <SelectItem value="N">N</SelectItem>
 <SelectItem value="N/A">N/A</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </td>
 <td className="px-4 py-2.5 align-top">
 <div className="flex items-start gap-1.5">
 <GreenDot show={!!row.response} />
 <div className="flex-1">
 <Textarea
 disabled={locked}
 value={row.response}
 onChange={e => setInq(key, { response: e.target.value })}
 placeholder="Document findings…"
 className="min-h-[72px] text-sm resize-y bg-background"
 />
 </div>
 </div>
 </td>
 <td className="px-4 py-2.5 align-top text-center" style={{ width: 100 }}>
 <RefButton
 reference={row.wpRef}
 onAttach={doc => setInq(key, { wpRef: [...row.wpRef, doc] })}
 onRemove={i => setInq(key, { wpRef: row.wpRef.filter((_, ri) => ri !== i) })}
 disabled={locked}
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 </div>
 );
 })}
 </div>
 ))}

 {/* ── Notes ────────────────────────────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border">
 <span className="text-sm font-semibold text-foreground">Notes</span>
 </div>
 <div className="px-6 py-4 space-y-2">
 <Textarea
 disabled={locked}
 value={data.notes}
 onChange={e => setData(d => ({...d, notes: e.target.value }))}
 placeholder="Document overall results and cross-reference to other relevant forms (e.g., — Risk Register)."
 className="min-h-[100px] text-sm resize-none bg-background"
 />
 <p className="text-sm text-muted-foreground">
 Where inquiries are made using this form, document the results here and provide a cross reference to other relevant forms.
 Where responses are incomplete, unsatisfactory or inconsistent, perform additional risk assessment procedures.
 </p>
 </div>
 </div>

 {/* ── Conclusion ───────────────────────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border">
 <span className="text-sm font-semibold text-foreground">Conclusion</span>
 </div>
 <div className="px-6 py-5 space-y-4">
 {data.concluded && (
 <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
 Concluded on {data.concludedOn}
 </div>
 )}
 <Textarea
 disabled={locked}
 value={data.conclusion}
 onChange={e => setData(d => ({...d, conclusion: e.target.value }))}
 placeholder="Document your overall conclusion and assessment of the inquiries performed…"
 className="min-h-[100px] text-sm resize-none bg-background"
 />
 <div className="flex justify-end">
 <Button disabled={locked} onClick={handleConclude}>Conclude worksheet</Button>
 </div>
 </div>
 </div>

 {/* ── Sign-off ──────────────────────────────────────────────────── */}
 <WorksheetSignOff worksheetKey="505" engagementId={engagementId} />

 </div>
 </div>

 </div>
 );
}
