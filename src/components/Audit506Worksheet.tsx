import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttributedComment } from "@/components/ui/AttributedComment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Upload } from "lucide-react";
import { ImportNotesDialog, ImportResult } from "@/components/ImportNotesDialog";
import { toast } from "sonner";
import { RefButton, RefDoc } from "@/components/RefButton";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { WorksheetSignOff, ConcludedRow } from "@/components/WorksheetSignOff";
import { LukaStatusBar } from "@/components/demo/LukaStatusBar";
import { DEMO_LUKA_ACTIONS, DEMO_ENGAGEMENT_ID } from "@/components/demo/demoFixtureData";
import { lukaSequentialFill } from '@/lib/lukaInlineFill';
import { LukaTypingRow } from '@/components/demo/LukaTypingRow';
import { GreenDot } from '@/components/demo/GreenDot';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProcRow { checked: boolean; psc: string; wpRef: RefDoc[]; response: string }
interface Interviewee { who: string; byWhom: string; date: string }

interface Data506 {
  mgmt: Record<string, ProcRow>;
  tcwg: Record<string, ProcRow>;
  partB: Record<string, ProcRow>;
  appendix: Record<string, ProcRow>;
  mgmtInterviewees: Interviewee[];
  tcwgInterviewees: Interviewee[];
  appendixOpen: boolean;
  conclusion: string;
  concluded: boolean;
  concludedOn: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const PART_A_MGMT = [
  { id: 'm1', num: '1', description: 'Has management identified any risks of material misstatement in the financial statements due to fraud?' },
  { id: 'm2', num: '2', description: 'Does management have knowledge of any actual, suspected or alleged fraud affecting the entity, including fraud involving employees, management, TCWG or third parties?' },
  { id: 'm3', num: '3', description: "Does management have an understanding of the entity's fraud risk management programs and controls, including specific programs or controls designed to prevent and detect fraud?" },
  { id: 'm4', num: '4', description: 'How does management communicate to employees its views on business practices and ethical behavior? Are there codes of conduct, ethics policies or whistleblower programs in place?' },
  { id: 'm5', num: '5', description: 'Are there any specific areas (such as accounting estimates, journal entries or revenue recognition) where management believes there is a higher risk of fraud or management override of controls?' },
];

const PART_A_TCWG = [
  { id: 't1', num: '1', description: 'Does TCWG have knowledge of any actual, suspected or alleged fraud affecting the entity?' },
  { id: 't2', num: '2', description: "How does TCWG exercise oversight of management's processes for identifying and responding to the risks of fraud and of the internal controls established to mitigate those risks? Are there any concerns about the competence or integrity of management?" },
];

const PART_B = [
  { id: 'b1', num: '1', description: 'Consider whether any fraud risk factors have been identified from the inquiries above and from other risk assessment procedures. If identified, document them.' },
  { id: 'b2', num: '2', description: 'Determine whether any of the identified fraud risk factors indicate the existence of a significant risk of material misstatement due to fraud.' },
  { id: 'b3', num: '3', description: 'Consider whether there are any unusual or unexpected relationships identified during analytical procedures that may indicate a risk of material misstatement due to fraud.' },
  { id: 'b4', num: '4', description: 'Assess the risk of management override of controls. Unless the engagement is otherwise low risk, this risk should generally be treated as a significant risk requiring a specific audit response.' },
  { id: 'b5', num: '5', description: 'Determine whether journal entries and other adjustments need to be tested based on the identified fraud risks and whether there is a presumption of fraud risk in revenue recognition.' },
  { id: 'b6', num: '6', description: 'Consider whether the overall audit plan and approach needs to be updated based on the identified fraud risks, including whether additional audit procedures or changes in timing are required.' },
  { id: 'b7', num: '7', description: 'Consider whether it is necessary to communicate the identified fraud risks to management, TCWG or others (such as regulators) in accordance with professional standards and applicable law.' },
];

const APPENDIX_A = [
  {
    id: 'ap1', num: '1', label: 'Incentive / Pressure',
    description: 'Have you identified any incentive or pressure conditions that may provide a reason for management or employees to commit fraud (e.g., financial pressure, employment pressure, performance-based compensation, personal integrity issues)?',
    reference: 'Management or employees have an incentive or are under pressure that provides a reason to commit fraud. This may include financial pressure (personal financial difficulties, significant bonuses tied to results), employment pressure (fear of losing a job, pressure to meet analyst expectations), or other pressures such as personal integrity issues.',
  },
  {
    id: 'ap2', num: '2', label: 'Opportunity',
    description: 'Have you identified any opportunity conditions that may allow fraud to occur (e.g., absence of controls, ineffective controls, ability to override controls, assets susceptible to misappropriation, complex transactions)?',
    reference: 'Circumstances exist that provide an opportunity to commit fraud, such as the absence of controls, ineffective controls, or the ability to override controls. Opportunities arise when there are assets susceptible to misappropriation, significant estimates and judgements required in financial reporting, complex transactions, or significant related party transactions.',
  },
  {
    id: 'ap3', num: '3', label: 'Rationalization / Attitude',
    description: "Have you identified any rationalization or attitude factors suggesting management or employees may be inclined to commit fraud (e.g., aggressive or unrealistic forecasts, non-compliance with regulations, management integrity concerns)?",
    reference: "An individual is able to rationalize committing a fraudulent act, or an attitude, character or set of ethical values exists that allows management or employees to commit a dishonest act. Management's attitude toward financial reporting (aggressive or unrealistic forecasts, non-compliance with regulations) or employees' attitudes toward the entity or its management may indicate a rationalization of fraudulent behavior.",
  },
];

const MGMT_ROLES = ['CEO', 'CFO', 'COO', 'President', 'Controller', 'VP Finance', 'Managing Director', 'VP Operations', 'Other'];
const TCWG_ROLES = ['Board Chair', 'Audit Committee Chair', 'Board Member', 'Director', 'Independent Director', 'Trustee', 'Other'];
const AUDITOR_OPTIONS = ['Elena Sokolova — Partner', 'Priya Raman — Staff', 'Marcus Chen — CMS'];

// ── Defaults ───────────────────────────────────────────────────────────────────

function emptyProc(): ProcRow { return { checked: false, psc: '', wpRef: [], response: '' }; }
function emptyIv(): Interviewee { return { who: '', byWhom: '', date: '' }; }

function buildDefault(): Data506 {
  const mgmt: Record<string, ProcRow> = {};
  PART_A_MGMT.forEach(p => { mgmt[p.id] = emptyProc(); });
  const tcwg: Record<string, ProcRow> = {};
  PART_A_TCWG.forEach(p => { tcwg[p.id] = emptyProc(); });
  const partB: Record<string, ProcRow> = {};
  PART_B.forEach(p => { partB[p.id] = emptyProc(); });
  const appendix: Record<string, ProcRow> = {};
  APPENDIX_A.forEach(p => { appendix[p.id] = emptyProc(); });
  return {
    mgmt, tcwg, partB, appendix,
    mgmtInterviewees: [emptyIv(), emptyIv(), emptyIv()],
    tcwgInterviewees: [emptyIv(), emptyIv()],
    appendixOpen: false,
    conclusion: '', concluded: false, concludedOn: '',
  };
}

// ── Column headers ─────────────────────────────────────────────────────────────

function ColHeaders({ label }: { label: string }) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-muted border-b border-border">
        <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" />
        <th className="w-10 px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider">#</th>
        <th className="w-[38%] px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">{label}</th>
        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: 140, minWidth: 140 }}>PSC (Y/N)</th>
        <th className="w-[38%] px-6 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Response / comments</th>
        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground uppercase tracking-wider" style={{ width: 100, minWidth: 100 }}>W/P ref.</th>
      </tr>
    </thead>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Audit506Worksheet({ isUS = false, connectedApps, onOpenConnectors }: { isUS?: boolean; connectedApps?: Set<string>; onOpenConnectors?: () => void }) {
  const storageKey = `audit-506-data-${isUS ? 'us' : 'ca'}`;
  const { engagementId = 'default' } = useParams<{ engagementId?: string }>();
  const isDemoEngagement = engagementId === DEMO_ENGAGEMENT_ID;

  const [lukaState, setLukaState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [lukaFilledFields, setLukaFilledFields] = useState<Set<string>>(new Set());
  const [lukaHighlightFields, setLukaHighlightFields] = useState<Set<string>>(new Set());
  const firstFillRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<Data506>(() => {
    const saved = readJsonFromLocalStorage<Data506 | null>(storageKey, null);
    if (!saved) return buildDefault();
    const def = buildDefault();
    return {
      ...def, ...saved,
      mgmt: { ...def.mgmt, ...(saved.mgmt ?? {}) },
      tcwg: { ...def.tcwg, ...(saved.tcwg ?? {}) },
      partB: { ...def.partB, ...(saved.partB ?? {}) },
      appendix: { ...def.appendix, ...(saved.appendix ?? {}) },
      mgmtInterviewees: saved.mgmtInterviewees?.length ? saved.mgmtInterviewees : def.mgmtInterviewees,
      tcwgInterviewees: saved.tcwgInterviewees?.length ? saved.tcwgInterviewees : def.tcwgInterviewees,
    };
  });

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = setTimeout(() => writeJsonToLocalStorage(storageKey, data), 600);
    return () => clearTimeout(t);
  }, [data, storageKey]);

  const locked = data.concluded;
  const [importOpen, setImportOpen] = useState(false);
  const [importBannerDismissed, setImportBannerDismissed] = useState(false);

  function applyImport(result: ImportResult) {
    const today = new Date().toISOString().slice(0, 10);
    const meetingDate = result.meetingDate?.slice(0, 10) ?? today;
    // Populate interviewees from attendees
    const mgmtPerson = result.attendees?.find(a => a.role === 'CFO — Client') ?? result.attendees?.find(a => a.role.includes('Client'));
    const auditor = result.attendees?.find(a => a.role === 'Partner') ?? result.attendees?.[0];
    const ivs = [
      { who: mgmtPerson ? `${mgmtPerson.name} — ${mgmtPerson.role}` : '', byWhom: auditor ? `${auditor.name} — ${auditor.role}` : '', date: meetingDate },
      { who: '', byWhom: '', date: '' }, { who: '', byWhom: '', date: '' },
    ];
    const tcwgIvs = [
      { who: 'Audit Committee Chair', byWhom: auditor ? `${auditor.name} — ${auditor.role}` : '', date: meetingDate },
      { who: '', byWhom: '', date: '' },
    ];
    const fraudNote = result.agendaNotes?.['b9'] ?? '';
    setData(d => ({
      ...d,
      mgmtInterviewees: ivs,
      tcwgInterviewees: tcwgIvs,
      mgmt: {
        ...d.mgmt,
        m1: { ...d.mgmt.m1, checked: true, psc: 'Y', response: 'Management confirmed awareness of fraud risk factors. Noted lender covenant pressure (DSCR > 1.25) as a potential incentive. No material fraud risks identified in financial statements.' + (fraudNote ? `\n\nFrom planning meeting: ${fraudNote}` : '') },
        m2: { ...d.mgmt.m2, checked: true, psc: 'Y', response: 'No actual, suspected, or alleged fraud reported. Management aware of whistleblower policy; no reports received during the period.' },
        m3: { ...d.mgmt.m3, checked: true, psc: 'Y', response: 'Management has fraud risk management programs in place including segregation of duties, approval authority matrix, and annual ethics training. Controls reviewed and appear design-effective.' },
        m4: { ...d.mgmt.m4, checked: true, psc: 'Y', response: 'Code of conduct in place and communicated to all employees annually. Whistleblower hotline active. No violations reported.' },
        m5: { ...d.mgmt.m5, checked: true, psc: 'Y', response: 'Management identified revenue cut-off and journal entries near period-end as higher-risk areas for management override. Also flagged inventory obsolescence reserve as an estimation risk area.' },
      },
      tcwg: {
        ...d.tcwg,
        t1: { ...d.tcwg.t1, checked: true, psc: 'Y', response: 'TCWG has no knowledge of actual, suspected, or alleged fraud. Audit committee receives quarterly fraud risk updates from management.' },
        t2: { ...d.tcwg.t2, checked: true, psc: 'Y', response: 'TCWG exercises oversight through the audit committee which reviews fraud risk reports quarterly, monitors management override controls, and receives independent auditor communications. No integrity concerns noted regarding management.' },
      },
      partB: {
        ...d.partB,
        b1: { ...d.partB.b1, checked: true, psc: 'Y', response: 'Fraud risk factors identified: (1) Lender covenant pressure — DSCR covenant triggers financial reporting incentive. (2) Mid-year ERP migration to NetSuite — creates opportunity for control gaps. (3) New CFO joined April — limited tenure increases opportunity risk.' },
        b2: { ...d.partB.b2, checked: true, psc: 'Y', response: 'Lender covenant pressure and ERP migration identified as significant fraud risk factors. Revenue cut-off and management override assessed as significant risks of material misstatement due to fraud.' },
        b3: { ...d.partB.b3, checked: true, psc: 'Y', response: 'Preliminary analytics show revenue +12% with gross margin down 3pts — unusual relationship investigated. Inventory turnover lower than prior year — potential valuation risk. No other unexpected relationships noted.' },
        b4: { ...d.partB.b4, checked: true, psc: 'Y', response: 'Risk of management override assessed as significant. Response: expanded JE testing with focus on unusual entries in the final two weeks of the period and entries with round-dollar amounts or no business rationale.' },
        b5: { ...d.partB.b5, checked: true, psc: 'Y', response: 'Journal entry testing scoped per CAS 240 — focused on period-end, unusual accounts, and entries posted by senior management. Revenue recognition presumed a fraud risk; specific procedures planned for cut-off ± 5 days.' },
        b6: { ...d.partB.b6, checked: true, psc: 'Y', response: 'Overall audit plan updated to incorporate fraud risks: added unpredictable procedures, expanded inventory observation scope, and added confirmations for 90% of AR balance.' },
        b7: { ...d.partB.b7, checked: true, psc: 'Y', response: 'Fraud risk factors communicated to engagement partner and TCWG at planning stage. No requirement to communicate to regulators at this time.' },
      },
    }));
    // Mark all filled for highlight
    ['m1','m2','m3','m4','m5','t1','t2','b1','b2','b3','b4','b5','b6','b7'].forEach(id => markLukaFilled(id));
    setImportBannerDismissed(true);
    toast.success('Fraud inquiry fields populated from import');
  }

  function markLukaFilled(id: string) {
    setLukaFilledFields(prev => new Set(prev).add(id));
    setLukaHighlightFields(prev => new Set(prev).add(id));
    setTimeout(() => setLukaHighlightFields(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function setMgmt(id: string, patch: Partial<ProcRow>) {
    setData(d => ({ ...d, mgmt: { ...d.mgmt, [id]: { ...d.mgmt[id], ...patch } } }));
  }
  function setTcwg(id: string, patch: Partial<ProcRow>) {
    setData(d => ({ ...d, tcwg: { ...d.tcwg, [id]: { ...d.tcwg[id], ...patch } } }));
  }
  function setPartB(id: string, patch: Partial<ProcRow>) {
    setData(d => ({ ...d, partB: { ...d.partB, [id]: { ...d.partB[id], ...patch } } }));
  }
  function setAppendix(id: string, patch: Partial<ProcRow>) {
    setData(d => ({ ...d, appendix: { ...d.appendix, [id]: { ...d.appendix[id], ...patch } } }));
  }

  function setMgmtIv(idx: number, patch: Partial<Interviewee>) {
    setData(d => { const list = [...d.mgmtInterviewees]; list[idx] = { ...list[idx], ...patch }; return { ...d, mgmtInterviewees: list }; });
  }
  function setTcwgIv(idx: number, patch: Partial<Interviewee>) {
    setData(d => { const list = [...d.tcwgInterviewees]; list[idx] = { ...list[idx], ...patch }; return { ...d, tcwgInterviewees: list }; });
  }
  function addMgmtIv() { setData(d => ({ ...d, mgmtInterviewees: [...d.mgmtInterviewees, emptyIv()] })); }
  function removeMgmtIv(idx: number) {
    setData(d => { const list = d.mgmtInterviewees.filter((_, i) => i !== idx); return { ...d, mgmtInterviewees: list.length ? list : [emptyIv()] }; });
  }
  function addTcwgIv() { setData(d => ({ ...d, tcwgInterviewees: [...d.tcwgInterviewees, emptyIv()] })); }
  function removeTcwgIv(idx: number) {
    setData(d => { const list = d.tcwgInterviewees.filter((_, i) => i !== idx); return { ...d, tcwgInterviewees: list.length ? list : [emptyIv()] }; });
  }

  function conclude() {
    const u = { ...data, concluded: true, concludedOn: new Date().toISOString() };
    setData(u);
    writeJsonToLocalStorage(storageKey, u);
  }

  // ── Interviewees table ─────────────────────────────────────────────────────

  function InterviewTable({ list, roles, onSet, onAdd, onRemove }: {
    list: Interviewee[];
    roles: string[];
    onSet: (idx: number, patch: Partial<Interviewee>) => void;
    onAdd: () => void;
    onRemove: (idx: number) => void;
  }) {
    return (
      <div className="px-6 pt-3 pb-3 border-b border-border bg-muted/[0.03]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interviewees</p>
          {!locked && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />Add row
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
              {list.map((iv, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-2 py-1">
                    <Select value={iv.who} onValueChange={v => onSet(i, { who: v })} disabled={locked}>
                      <SelectTrigger className="h-7 text-sm border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-2">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 border-l border-border">
                    <Select value={iv.byWhom} onValueChange={v => onSet(i, { byWhom: v })} disabled={locked}>
                      <SelectTrigger className="h-7 text-sm border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-2">
                        <SelectValue placeholder="Select auditor" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDITOR_OPTIONS.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 border-l border-border" style={{ width: 160 }}>
                    <Input type="date" disabled={locked} value={iv.date} onChange={e => onSet(i, { date: e.target.value })}
                      className="h-7 text-sm border-0 shadow-none px-2 focus-visible:ring-0 bg-transparent" />
                  </td>
                  {!locked && (
                    <td className="px-2 text-center">
                      <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
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
    );
  }

  // ── Procedure rows ─────────────────────────────────────────────────────────

  function ProcRows({ items, store, setFn, prefix }: {
    items: { id: string; num: string; description: string }[];
    store: Record<string, ProcRow>;
    setFn: (id: string, patch: Partial<ProcRow>) => void;
    prefix: string;
  }) {
    return (
      <>
        {items.map(proc => {
          const row = store[proc.id] ?? emptyProc();
          return (
            <tr
              key={proc.id}
              ref={isDemoEngagement && proc.id === 'm1' ? (firstFillRef as any) : undefined}
              className={`hover:bg-muted/50 transition-colors${isDemoEngagement && lukaHighlightFields.has(proc.id) ? ' border-l-2 border-violet-400 bg-violet-50/40' : ''}`}
            >
              <td className="px-4 py-3 text-center align-top">
                <Checkbox checked={row.checked} onCheckedChange={v => setFn(proc.id, { checked: !!v })} disabled={locked} />
              </td>
              <td className="px-4 py-3 text-center align-top text-sm font-semibold font-mono text-foreground">{proc.num}</td>
              <td className="px-6 py-3 align-top text-sm text-foreground border-l-2 border-primary/20">{proc.description}</td>
              <td className="px-4 py-3 align-top" style={{ width: 140 }}>
                <Select value={row.psc} onValueChange={v => setFn(proc.id, { psc: v })} disabled={locked}>
                  <SelectTrigger className="h-8 text-sm bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Y</SelectItem>
                    <SelectItem value="N">N</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-6 py-3 align-top">
                <div className="flex items-start gap-1.5">
                  <GreenDot show={!!row.response} />
                  <div className="flex-1">
                    <LukaTypingRow filled={isDemoEngagement && lukaFilledFields.has(proc.id)}>
                      <AttributedComment value={row.response} onChange={v => setFn(proc.id, { response: v })}
                        storageKey={`506-${isUS ? 'us' : 'ca'}-${prefix}-${proc.id}`}
                        placeholder="Enter response…" disabled={locked} className="min-h-[60px] text-sm resize-none bg-background" />
                    </LukaTypingRow>
                    {isDemoEngagement && lukaFilledFields.has(proc.id) && (
                      <div className="mt-1">
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 align-top text-center" style={{ width: 100 }}>
                <RefButton reference={row.wpRef}
                  onAttach={doc => setFn(proc.id, { wpRef: [...row.wpRef, doc] })}
                  onRemove={i => setFn(proc.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
                  disabled={locked} />
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
                    setData(d => ({ ...d, mgmt: { ...d.mgmt, m1: { ...d.mgmt.m1, checked: true, psc: 'Y', response: 'Management confirmed no material fraud risks identified. No change in fraud risk environment from prior year.' } } }));
                    markLukaFilled('m1');
                  },
                },
                {
                  set: () => {
                    setData(d => ({ ...d, mgmt: { ...d.mgmt, m2: { ...d.mgmt.m2, checked: true, psc: 'Y', response: 'No actual, suspected or alleged fraud affecting the entity. Management aware of whistleblower policy; no reports received.' } } }));
                    markLukaFilled('m2');
                  },
                },
                {
                  set: () => {
                    setData(d => ({ ...d, partB: { ...d.partB, b4: { ...d.partB.b4, checked: true, psc: 'Y', response: 'Risk of management override assessed as moderate. Journal entry testing scoped to capture unusual entries near period end.' } } }));
                    markLukaFilled('b4');
                  },
                },
              ], () => setLukaState('done'));
            },
          }))}
        />
      )}

      {/* Objective bar */}
      
      <ImportNotesDialog open={importOpen} onOpenChange={setImportOpen} onImport={applyImport} connectedApps={connectedApps} onOpenConnectors={onOpenConnectors} />
      <div className="flex-1 overflow-y-auto bg-muted/30">
      <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
          To document inquiries about fraud risks performed as part of the risk assessment.{" "}
          <span className="font-medium text-foreground">Part A</span> covers required inquiries of management, others in the entity, and TCWG.{" "}
          <span className="font-medium text-foreground">Part B</span> covers other fraud risk assessment procedures.{" "}
          <span className="font-medium text-foreground">PSC</span> = Procedure successfully completed.{" "}
          <span className="font-medium text-foreground">TCWG</span> = Those charged with governance.
        </p>
      </div>
        <div className="p-6 space-y-4">

          {/* ── Part A ─────────────────────────────────────────────────── */}
          <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
            <div className="px-6 py-3.5 bg-card border-b border-border flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-foreground">Part A — Required inquiries</span>
                <p className="text-sm text-muted-foreground mt-0.5">Inquiries of management, others, and those charged with governance.</p>
              </div>
              <Button size="sm" onClick={() => setImportOpen(true)} className="h-8 shrink-0 whitespace-nowrap ml-4">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            </div>
            {!importBannerDismissed && (
              <div className="mx-4 mt-3 mb-1 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/[0.04] px-4 py-3">
                <Upload className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Import from a connected source</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pull fraud inquiry notes from Granola, Fireflies, Google Calendar, or paste a transcript — Luka extracts responses and populates the worksheet.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setImportOpen(true)}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Import notes
                  </Button>
                  <button type="button" onClick={() => setImportBannerDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors text-xs">✕</button>
                </div>
              </div>
            )}

            {/* Management & Others */}
            <div className="border-b border-border">
              <div className="px-6 pt-4 pb-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Management and Others</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
              <InterviewTable
                list={data.mgmtInterviewees} roles={MGMT_ROLES}
                onSet={setMgmtIv} onAdd={addMgmtIv} onRemove={removeMgmtIv}
              />
              <p className="px-6 pt-3 pb-0.5 text-sm text-muted-foreground italic">Inquire about the following:</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <ColHeaders label="Inquiry" />
                  <tbody className="divide-y divide-border">
                    <ProcRows items={PART_A_MGMT} store={data.mgmt} setFn={setMgmt} prefix="mgmt" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* TCWG */}
            <div>
              <div className="px-6 pt-4 pb-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Those Charged with Governance (TCWG)</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
              <InterviewTable
                list={data.tcwgInterviewees} roles={TCWG_ROLES}
                onSet={setTcwgIv} onAdd={addTcwgIv} onRemove={removeTcwgIv}
              />
              <p className="px-6 pt-3 pb-0.5 text-sm text-muted-foreground italic">Inquire about the following:</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <ColHeaders label="Inquiry" />
                  <tbody className="divide-y divide-border">
                    <ProcRows items={PART_A_TCWG} store={data.tcwg} setFn={setTcwg} prefix="tcwg" />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Part B ─────────────────────────────────────────────────── */}
          <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
            <div className="px-6 py-3.5 bg-card border-b border-border">
              <span className="text-sm font-semibold text-foreground">Part B — Other fraud risk assessment procedures</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <ColHeaders label="Procedure" />
                <tbody className="divide-y divide-border">
                  <ProcRows items={PART_B} store={data.partB} setFn={setPartB} prefix="partb" />
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Appendix A ──────────────────────────────────────────────── */}
          <div className="bg-card text-card-foreground border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
            <button
              className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
              onClick={() => setData(d => ({ ...d, appendixOpen: !d.appendixOpen }))}
            >
              <div>
                <span className="text-sm font-semibold text-foreground">Appendix A — Characteristics of fraud (fraud triangle assessment)</span>
                <p className="text-sm text-muted-foreground mt-0.5">Click to expand and assess each fraud risk factor.</p>
              </div>
              {data.appendixOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {data.appendixOpen && (
              <div className="border-t border-border">
                <p className="px-6 pt-4 pb-1 text-sm text-muted-foreground">
                  Assess each element of the fraud triangle to determine whether conditions for fraud are present. These three conditions are often referred to as the "fraud triangle."
                  <span className="italic"> Note: The presence of fraud risk factors does not necessarily indicate fraud exists. However, they should be considered when assessing the risk of material misstatement due to fraud.</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <ColHeaders label="Fraud risk factor" />
                    <tbody className="divide-y divide-border">
                      {APPENDIX_A.map(item => {
                        const row = data.appendix[item.id] ?? emptyProc();
                        return (
                          <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 text-center align-top">
                              <Checkbox checked={row.checked} onCheckedChange={v => setAppendix(item.id, { checked: !!v })} disabled={locked} />
                            </td>
                            <td className="px-4 py-3 text-center align-top text-sm font-semibold font-mono text-foreground">{item.num}</td>
                            <td className="px-6 py-3 align-top border-l-2 border-primary/20">
                              <p className="text-sm font-semibold text-foreground mb-1">{item.label}</p>
                              <p className="text-sm text-foreground">{item.description}</p>
                              <p className="text-sm text-muted-foreground mt-1.5 italic">{item.reference}</p>
                            </td>
                            <td className="px-4 py-3 align-top" style={{ width: 140 }}>
                              <Select value={row.psc} onValueChange={v => setAppendix(item.id, { psc: v })} disabled={locked}>
                                <SelectTrigger className="h-8 text-sm bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Y">Y</SelectItem>
                                  <SelectItem value="N">N</SelectItem>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-6 py-3 align-top">
                              <div className="flex items-start gap-1.5">
                                <GreenDot show={!!row.response} />
                                <Textarea disabled={locked} value={row.response}
                                  onChange={e => setAppendix(item.id, { response: e.target.value })}
                                  placeholder="Document findings and assessment…"
                                  className="min-h-[72px] text-sm resize-y bg-background flex-1" />
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-center" style={{ width: 100 }}>
                              <RefButton reference={row.wpRef}
                                onAttach={doc => setAppendix(item.id, { wpRef: [...row.wpRef, doc] })}
                                onRemove={i => setAppendix(item.id, { wpRef: row.wpRef.filter((_, idx) => idx !== i) })}
                                disabled={locked} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Conclusion ───────────────────────────────────────────────── */}
          <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
            <div className="px-6 py-3.5 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Conclusion</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Textarea disabled={locked} value={data.conclusion}
                onChange={e => setData(d => ({ ...d, conclusion: e.target.value }))}
                placeholder="Document your overall conclusion and assessment of the fraud risk inquiries performed…"
                className="min-h-[100px] text-sm resize-none bg-background" />
              {locked
                ? <ConcludedRow concludedOn={data.concludedOn}
                    onReopen={() => { const u = { ...data, concluded: false, concludedOn: '' }; setData(u); writeJsonToLocalStorage(storageKey, u); }} />
                : <div className="flex justify-end"><Button onClick={conclude}>Conclude worksheet</Button></div>
              }
            </div>
          </div>

          {/* ── Sign-off ──────────────────────────────────────────────────── */}
          <WorksheetSignOff worksheetKey="506" engagementId={engagementId} />

        </div>
      </div>
    </div>
  );
}
