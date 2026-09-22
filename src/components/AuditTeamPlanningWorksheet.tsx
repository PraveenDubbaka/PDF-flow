import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Trash2, Sparkles } from "lucide-react";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { ImportNotesDialog, ImportResult } from "@/components/ImportNotesDialog";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgendaRow { leader: string; notes: string; wpRef: RefDoc[] }
interface ActionStep { id: string; action: string; person: string; deadline: string; actualCompletion: string }
interface Attendee { id: string; name: string; role: string }
interface Data436 {
 meetingDate: string;
 attendeesList: Attendee[];
 rows: Record<string, AgendaRow>;
 actionSteps: ActionStep[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ATTENDEE_OPTIONS: { name: string; role: string }[] = [
 { name: 'M. Thompson', role: 'Partner' },
 { name: 'L. Garcia', role: 'Manager' },
 { name: 'Senior 1', role: 'Revenue / AR' },
 { name: 'Senior 2', role: 'Expenses / ASC 842' },
 { name: 'Staff 1', role: 'AP / Cash' },
 { name: 'Staff 2', role: 'Inventory' },
 { name: 'J. Reyes', role: 'CFO — Client' },
 { name: 'K. Park', role: 'Controller — Client' },
 { name: 'Elena Sokolova', role: 'Partner' },
 { name: 'Priya Raman', role: 'Staff' },
 { name: 'Marcus Chen', role: 'CMS' },
];

const LEADER_OPTIONS = ATTENDEE_OPTIONS.map(a => `${a.name} — ${a.role}`);

interface AgendaItem {
 id: string;
 num: string;
 title: string;
 intro?: string;
 items?: string[];
}

const PART_A: AgendaItem[] = [
 { id: 'a1', num: '1', title: 'Team responsibilities', intro: 'The engagement partner is to remind team members about:', items: [
 'Their responsibility to contribute to audit quality.',
 'The importance of professional ethics, values and attitudes.',
 'The importance of timely and robust communications within the team, including: potential/actual independence breaches; possible management bias; and other conditions/events that impact the audit.',
 ]},
 { id: 'a2', num: '2', title: 'Team introductions and orientation', items: [
 'Introduce the audit team members and their roles in the audit.',
 'Discuss the nature of the entity, users of the F/S, applicable financial reporting framework, operations, materiality, key personnel and areas to watch.',
 'Discuss the timing and scope of the engagement.',
 'Outline significant events occurring in the current period.',
 ]},
 { id: 'a3', num: '3', title: 'Past experience', intro: 'Discuss risks / issues / events that were noted in previous engagements, such as:', items: [
 'Nature and extent of identified misstatements and significant adjusting journal entries.',
 'Significant risks, including any key audit matters.',
 'Significant estimates relating to financial reporting, including disclosures.',
 'Communications with management and TCWG.',
 'Known or alleged instances of fraud occurring.',
 'Matters that caused concern or delays in performing procedures or resolving audit issues.',
 ]},
 { id: 'a4', num: '4', title: 'Key changes', intro: 'Discuss key changes that have occurred since the previous audit and their audit implications. Consider changes in:', items: [
 'The industry, economy, legislation and competition.',
 'Operations and business plans.',
 'Financing (new financing agreements, refinancing, etc.).',
 'Business acquisitions or amalgamations.',
 'Personnel, organization and governance.',
 'Internal control and accounting systems.',
 'New accounting standards and changes to accounting policies.',
 ]},
 { id: 'a5', num: '5', title: 'Preliminary analytical review', intro: 'Review the results of the preliminary analytical review and discuss:', items: [
 'How actual results aligned or differed with expectations based on the economic and industry trends, changes to operations, etc.',
 'Whether any variances or balances require further analysis, investigation or could be indicative of possible RMMs.',
 ]},
 { id: 'a6', num: '6', title: 'Identifying potential risks of material misstatement', intro: 'Discuss where RMMs could be identified, including the susceptibility of the entity\u2019s F/S to material misstatement (fraud or error). Consider the following:', items: [
 'Material account balances and transactions.',
 'Complex areas in the applicable financial reporting framework, including classification and disclosures.',
 'Extent and nature of related-party relationships and transactions.',
 'The application of key accounting policies, including revenue recognition and the rebuttable assumption that revenue recognition is a significant risk.',
 'Nature of estimates, including the level of complexity, change and estimation uncertainty.',
 'Significant deficiencies in internal control.',
 'Significant risks and, if applicable, any key audit matters.',
 'Financing arrangements and covenants.',
 'Management incentive plans.',
 'Operating losses and negative business trends.',
 'Going-concern events or conditions.',
 'Significant litigation.',
 ]},
 { id: 'a7', num: '7', title: 'Risk assessment procedures', intro: 'Discuss what RAPs will be performed and who will perform them. Consider:', items: [
 'Nature and extent of information to be provided by the entity.',
 'Expected reliance on internal controls, which could have an impact on what business processes and information systems will need an assessment of design and implementation.',
 'Whether the organization outsources key processes for which a service auditor\u2019s report should be obtained.',
 'If the organization relies on automated or semi-automated controls for which an evaluation of IT general controls would be required.',
 ]},
];

const PART_B: AgendaItem[] = [
 { id: 'b8', num: '8', title: 'Assessed risks', intro: 'Review the assessed risks identified as a result of performing RAPs and discuss:', items: [
 'Whether all identified risks of material misstatement have been carried forward onto the risk register.',
 'The assessment of risk at the F/S level, and their impact on assertion level risks (if any).',
 'The assessment of risk at the assertion level and conclusions on planned control reliance.',
 'Any significant risks identified and their potential impact on the audit response.',
 'Any unexpected results, missing information, or evidence of management override or bias.',
 ]},
 { id: 'b9', num: '9', title: 'Fraud risks and scenarios', items: [
 'Review (or equivalent).',
 'Discuss how fraud might occur in the entity, notwithstanding past experience of the honesty and integrity of management and TCWG.',
 'Identify any pressures, attitudes or rationalizations that exist among senior management / accounting personnel that could lead to fraud.',
 ]},
 { id: 'b10', num: '10', title: 'Design an appropriate audit response', intro: 'Design F/S-level and assertion-level responses. Review and discuss:', items: [
 'Specific procedures to address significant risks assessed',
 'Planned tests of controls.',
 'Planned tests of details.',
 'Unpredictable procedures (required for fraud risks).',
 'Substantive analytical procedures: consider the source of data and its reliability.',
 'SCOTABDs and procedures for which confirmations will be obtained.',
 ]},
 { id: 'b11', num: '11', title: 'Audit plans and overall audit strategy', intro: 'Finalize the audit plans, and update the overall audit strategy. Address:', items: [
 'Extent (if any) of pre-period-end work.',
 'Audit timing and management / TCWG communications, including the communication of the overall audit plan.',
 'Where applicable, coordination with experts, service auditors and group component auditors.',
 'Schedules and analysis to be completed by the client.',
 'Audit team roles, scheduling and timing of file reviews.',
 ]},
 { id: 'b12', num: '12', title: 'Team reminders', intro: 'Remind team members about the need for:', items: [
 'Exercising professional skepticism at all times.',
 'Maintaining independence and ethics.',
 'Ongoing communication among the engagement team, especially where misstatements are found, tests fail or the client is not providing information on a timely basis.',
 'Updating the overall audit strategy for changes to proposed plans.',
 'Remaining alert throughout the audit for indicators of fraud, related parties, going-concern uncertainties or new information.',
 ]},
 { id: 'b13', num: '13', title: 'Other matters (specify)' },
];

const ALL_ITEMS = [...PART_A,...PART_B];

function uid(): string { return Math.random().toString(36).slice(2, 9); }
function emptyRow(): AgendaRow { return { leader: '', notes: '', wpRef: [] }; }
function emptyAction(): ActionStep { return { id: uid(), action: '', person: '', deadline: '', actualCompletion: '' }; }
function emptyAttendee(): Attendee { return { id: uid(), name: '', role: '' }; }

function buildDefault(): Data436 {
 const rows: Record<string, AgendaRow> = {};
 ALL_ITEMS.forEach(i => { rows[i.id] = emptyRow(); });
 return {
 meetingDate: '',
 attendeesList: [emptyAttendee(), emptyAttendee()],
 rows,
 actionSteps: [emptyAction(), emptyAction(), emptyAction()],
 };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AuditTeamPlanningWorksheet({ isUS = false, connectedApps, onOpenConnectors }: { isUS?: boolean; connectedApps?: Set<string>; onOpenConnectors?: (connectorId?: string) => void }) {
 const { engagementId = "default" } = useParams<{ engagementId: string }>();
 const storageKey = `audit-436-data-${isUS ? 'us' : 'ca'}`;

 const [data, setData] = useState<Data436>(() => {
 const saved = readJsonFromLocalStorage<Data436 | null>(storageKey, null);
 if (!saved) return buildDefault();
 const def = buildDefault();
 return {
...def,
...saved,
 rows: {...def.rows,...(saved.rows ?? {}) },
 attendeesList: saved.attendeesList?.length ? saved.attendeesList : def.attendeesList,
 };
 });

 const firstRender = useRef(true);
 useEffect(() => {
 if (firstRender.current) { firstRender.current = false; return; }
 const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
 return () => clearTimeout(t);
 }, [data, storageKey]);

 const concludeKey = `audit-436-concluded-${engagementId}-${isUS ? 'us' : 'ca'}`;
 const [concluded, setConcluded] = useState(() => readJsonFromLocalStorage<boolean>(concludeKey, false));
 const [concludedOn, setConcludedOn] = useState(() => readJsonFromLocalStorage<string>(`${concludeKey}-on`, ""));
 const locked = concluded;

 const [importOpen, setImportOpen] = useState(false);

 function applyImport(result: ImportResult) {
 setData(d => {
 const next: Data436 = {...d };
 if (result.meetingDate) next.meetingDate = result.meetingDate;
 if (result.attendees?.length) {
 next.attendeesList = result.attendees.map(a => ({ id: uid(), name: a.name, role: a.role }));
 }
 if (result.agendaNotes) {
 const rows = {...d.rows };
 for (const [id, notes] of Object.entries(result.agendaNotes)) {
 if (rows[id]) rows[id] = {...rows[id], notes };
 }
 next.rows = rows;
 }
 if (result.actionSteps?.length) {
 next.actionSteps = result.actionSteps.map(s => ({
 id: uid(),
 action: s.action,
 person: s.person,
 deadline: s.deadline,
 actualCompletion: '',
 }));
 }
 return next;
 });
 const sourceLabel = result.source.charAt(0).toUpperCase() + result.source.slice(1);
 toast.success(`Worksheet populated from ${sourceLabel}`, {
 description: 'Review and refine the auto-filled content before sign-off.',
 });
 }

 function setRow(id: string, patch: Partial<AgendaRow>) {
 setData(d => ({...d, rows: {...d.rows, [id]: {...d.rows[id],...patch } } }));
 }
 function setAction(idx: number, patch: Partial<ActionStep>) {
 setData(d => { const list = [...d.actionSteps]; list[idx] = {...list[idx],...patch }; return {...d, actionSteps: list }; });
 }
 function addAction() { setData(d => ({...d, actionSteps: [...d.actionSteps, emptyAction()] })); }
 function removeAction(idx: number) { setData(d => ({...d, actionSteps: d.actionSteps.filter((_, i) => i !== idx) })); }

 function setAttendee(idx: number, patch: Partial<Attendee>) {
 setData(d => { const list = [...d.attendeesList]; list[idx] = {...list[idx],...patch }; return {...d, attendeesList: list }; });
 }
 function addAttendee() { setData(d => ({...d, attendeesList: [...d.attendeesList, emptyAttendee()] })); }
 function removeAttendee(idx: number) {
 setData(d => ({...d, attendeesList: d.attendeesList.length > 1 ? d.attendeesList.filter((_, i) => i !== idx) : d.attendeesList }));
 }
 function selectAttendeeByName(idx: number, name: string) {
 const match = ATTENDEE_OPTIONS.find(a => a.name === name);
 setAttendee(idx, { name, role: match?.role ?? data.attendeesList[idx].role });
 }

 const renderAgendaSection = (title: string, items: AgendaItem[]) => (
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border">
 <span className="text-sm font-semibold text-foreground">{title}</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider">#</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: '28%', minWidth: 240 }}>Agenda item</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 220, minWidth: 220 }}>Discussion leader</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: '40%', minWidth: 360 }}>Matters arising &amp; decisions reached</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 110, minWidth: 110 }}>W/P ref.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {items.map(item => {
 const row = data.rows[item.id];
 return (
 <tr key={item.id} className="hover:bg-muted/50 transition-colors align-top">
 <td className="px-4 py-3 text-center text-sm font-semibold font-mono text-foreground">{item.num}</td>
 <td className="px-6 py-3 text-sm text-foreground" style={{ width: '28%', minWidth: 240 }}>
 <div className="font-semibold">{item.title}</div>
 {item.intro && <div className="mt-1 text-sm text-muted-foreground">{item.intro}</div>}
 {item.items && item.items.length > 0 && (
 <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
 {item.items.map((sub, i) => <li key={i} className="text-sm text-muted-foreground">{sub}</li>)}
 </ul>
 )}
 </td>
 <td className="px-4 py-3" style={{ width: 220 }}>
 <Select value={row.leader} onValueChange={v => setRow(item.id, { leader: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select leader" /></SelectTrigger>
 <SelectContent>
 {LEADER_OPTIONS.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-6 py-3" style={{ width: '40%', minWidth: 360 }}>
 <Textarea
 value={row.notes}
 onChange={e => setRow(item.id, { notes: e.target.value })}
 placeholder="Document matters arising and decisions reached…"
 className="min-h-[80px] w-full text-sm resize-none rounded-[10px] border border-input bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
 />
 </td>
 <td className="px-4 py-3 text-center" style={{ width: 110 }}>
 <RefButton
 reference={row.wpRef}
 onAttach={doc => setRow(item.id, { wpRef: [...row.wpRef, doc] })}
 onRemove={i => setRow(item.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
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

 return (
 <div className="flex flex-col h-full">

 <ImportNotesDialog open={importOpen} onOpenChange={setImportOpen} onImport={applyImport} connectedApps={connectedApps} onOpenConnectors={onOpenConnectors} />

 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-3">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 To ensure appropriate communication among the engagement team resulting in a well-planned audit.{" "}
 <span className="font-medium text-foreground">Notes:</span> Ensure involvement of the engagement partner and key team members (plus the engagement quality reviewer, if applicable). This form is divided into two parts — Part A would typically take place at the commencement of the audit; Part B would start by reviewing the assessed risks and developing appropriate audit responses. In some cases, the two discussions could be combined.{" "}
 <span className="font-medium text-foreground">F/S</span> = Financial statements. <span className="font-medium text-foreground">TCWG</span> = Those charged with governance. <span className="font-medium text-foreground">RMMs</span> = Risks of material misstatement. <span className="font-medium text-foreground">RAPs</span> = Risk assessment procedures.
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* Meeting details */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center justify-between">
 <span className="text-sm font-semibold text-foreground">Meeting Details</span>
 <Button size="sm" onClick={() => setImportOpen(true)} className="h-8 shrink-0 whitespace-nowrap">
 <Sparkles className="h-3.5 w-3.5 mr-1.5" />
 Import
 </Button>
 </div>
 <div className="p-6 space-y-5">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Date / time of discussion</label>
 <Input
 type="datetime-local"
 value={data.meetingDate}
 onChange={e => setData(d => ({...d, meetingDate: e.target.value }))}
 className="h-9 text-sm w-fit"
 />
 <p className="text-sm text-muted-foreground mt-1">Applies to all attendees listed below.</p>
 </div>

 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attendees</label>
 <Button size="sm" variant="secondary" onClick={addAttendee} className="h-7 text-xs gap-1">
 <Plus className="h-3.5 w-3.5 mr-1.5" /> Add attendee
 </Button>
 </div>
 <div className="rounded-md border border-border overflow-hidden">
 <table className="w-full">
 <thead>
 <tr className="bg-muted text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border">
 <th className="w-10 px-4 py-2 text-center">#</th>
 <th className="px-4 py-2 text-left">Attendee</th>
 <th className="px-4 py-2 text-left border-l border-border" style={{ width: 260 }}>Role / Entity</th>
 <th className="w-12 px-2 py-2 border-l border-border" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.attendeesList.map((att, idx) => (
 <tr key={att.id} className="hover:bg-muted/30 align-middle">
 <td className="px-4 py-2 text-center text-sm font-semibold font-mono text-foreground">{idx + 1}</td>
 <td className="px-2 py-1">
 <Select value={att.name} onValueChange={v => selectAttendeeByName(idx, v)}>
 <SelectTrigger className="h-8 text-sm border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-2">
 <SelectValue placeholder="Select attendee" />
 </SelectTrigger>
 <SelectContent>
 {ATTENDEE_OPTIONS.map(opt => (
 <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </td>
 <td className="px-2 py-1 border-l border-border" style={{ width: 260 }}>
 <Input
 value={att.role}
 onChange={e => setAttendee(idx, { role: e.target.value })}
 placeholder="Role / Entity"
 className="h-8 text-sm border-0 shadow-none bg-transparent focus-visible:ring-0 px-2"
 />
 </td>
 <td className="px-2 py-1 border-l border-border text-center">
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
 onClick={() => removeAttendee(idx)}
 disabled={data.attendeesList.length <= 1}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>

 {renderAgendaSection('PART A — Agenda: Initial audit planning', PART_A)}
 {renderAgendaSection('PART B — Agenda: Risk response planning', PART_B)}

 {/* Action steps */}
 <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 bg-card border-b border-border flex items-center justify-between">
 <span className="text-sm font-semibold text-foreground">Action Steps</span>
 <Button size="sm" variant="secondary" onClick={addAction} className="h-7 text-xs gap-1">
 <Plus className="h-3.5 w-3.5 mr-1.5" /> Add row
 </Button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-muted border-b border-border">
 <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider">#</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Action step required</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 220 }}>Person responsible</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 170 }}>Deadline</th>
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 170 }}>Actual completion</th>
 <th className="w-12 px-2 py-3" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.actionSteps.map((step, idx) => (
 <tr key={step.id} className="hover:bg-muted/50 align-top">
 <td className="px-4 py-3 text-center text-sm font-semibold font-mono text-foreground">{idx + 1}</td>
 <td className="px-6 py-3">
 <AttributedComment value={step.action} onChange={v => setAction(idx, { action: v })} storageKey={`436-${isUS?'us':'ca'}-action-${step.id}`} placeholder="Describe action step…" className="min-h-[44px] text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent" minHeight="44px" />
 </td>
 <td className="px-4 py-3" style={{ width: 220 }}>
 <Select value={step.person} onValueChange={v => setAction(idx, { person: v })}>
 <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
 <SelectContent>
 {LEADER_OPTIONS.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
 </SelectContent>
 </Select>
 </td>
 <td className="px-4 py-3" style={{ width: 170 }}>
 <Input type="date" value={step.deadline} onChange={e => setAction(idx, { deadline: e.target.value })} className="h-8 text-sm w-fit" />
 </td>
 <td className="px-4 py-3" style={{ width: 170 }}>
 <Input type="date" value={step.actualCompletion} onChange={e => setAction(idx, { actualCompletion: e.target.value })} className="h-8 text-sm w-fit" />
 </td>
 <td className="px-2 py-3 text-center">
 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeAction(idx)}>
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <WorksheetSignOff worksheetKey="audit-436" engagementId={engagementId} />

 {locked ? (
 <ConcludedRow concludedOn={concludedOn} onReopen={() => { setConcluded(false); setConcludedOn(''); writeJsonToLocalStorage(concludeKey, false); writeJsonToLocalStorage(`${concludeKey}-on`, ''); }} />
 ) : (
 <div className="flex justify-end">
 <Button size="sm" onClick={() => {
 const today = new Date().toISOString();
 setConcluded(true);
 setConcludedOn(today);
 writeJsonToLocalStorage(concludeKey, true);
 writeJsonToLocalStorage(`${concludeKey}-on`, today);
 }}>
 Conclude Worksheet
 </Button>
 </div>
 )}

 </div>
 </div>
 </div>
 );
}
