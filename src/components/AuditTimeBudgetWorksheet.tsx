import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Info, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimeEntries, ROLE_TO_TB_ROW, ROLE_LABELS, type RoleKey, type TimeEntry } from '@/lib/useTimeEntries';

interface BudgetRow { id: string; label: string; priorHrs: string; priorDollar: string; budgetHrs: string; budgetDollar: string; }

const makeRow = (id: string, label: string): BudgetRow => ({ id, label, priorHrs: '', priorDollar: '', budgetHrs: '', budgetDollar: '' });

const CA_SECTIONS = [
 { id: 'general', title: 'General',
 rows: [makeRow('g1','Overall strategy and planning'),makeRow('g2','Supervision and review'),makeRow('g3','Audit team communication'),makeRow('g4','Client meetings'),makeRow('g5','Financial statement reports and communications'),makeRow('g6','Administration'),makeRow('g7','Travel and out of pocket')] },
 { id: 'risk-assess', title: 'Risk Assessment',
 rows: [makeRow('ra1','Financial statement analysis'),makeRow('ra2','Planning risk assessment procedures'),makeRow('ra3','Performing risk assessment procedures'),makeRow('ra4','Assessing results')] },
 { id: 'risk-resp', title: 'Risk Response',
 rows: [makeRow('rr1','Planning risk response procedures'),makeRow('rr2','Overall response and fraud risk'),makeRow('rr3','Cash and investments'),makeRow('rr4','Accounts receivable'),makeRow('rr5','Inventory'),makeRow('rr6','Inventory observations'),makeRow('rr7','Long-term investments'),makeRow('rr8','Property, plant and equipment'),makeRow('rr9','Intangibles and goodwill'),makeRow('rr10','Bank debt and notes payable'),makeRow('rr11','Accounts payable and accruals'),makeRow('rr12','Income taxes'),makeRow('rr13','Contingencies / subsequent events'),makeRow('rr14','Share capital and retained earnings'),makeRow('rr15','Related parties'),makeRow('rr16','Sales'),makeRow('rr17','Cost of sales'),makeRow('rr18','Payroll'),makeRow('rr19','Operating expenses'),makeRow('rr20','Other (specify)')] },
 { id: 'team', title: 'Budget by Team Member',
 rows: [makeRow('t1','Senior(s)'),makeRow('t2','Assistant(s)'),makeRow('t3','Manager / Supervisor'),makeRow('t4','Partner'),makeRow('t5','Tax review'),makeRow('t6','EQCR / EQR'),makeRow('t7','Other')] },
];
const US_SECTIONS = CA_SECTIONS.map(s => ({...s, rows: s.rows.map(r => ({...r, label: r.label.replace('EQCR','EQR') })) }));

const EDITABLE: (keyof BudgetRow)[] = ['priorHrs','priorDollar','budgetHrs','budgetDollar'];
const COL_HEADERS = ['Prior Hrs','Prior $','Budget Hrs','Budget $','Actual Hrs','Actual $'];

const TB_ROWS_FLAT: Array<{ id: string; label: string; section: string }> = [
 {id:'g1',section:'general',label:'Overall strategy and planning'},{id:'g2',section:'general',label:'Supervision and review'},{id:'g3',section:'general',label:'Audit team communication'},{id:'g4',section:'general',label:'Client meetings'},{id:'g5',section:'general',label:'Financial statement reports and communications'},{id:'g6',section:'general',label:'Administration'},{id:'g7',section:'general',label:'Travel and out of pocket'},
 {id:'ra1',section:'risk-assess',label:'Financial statement analysis'},{id:'ra2',section:'risk-assess',label:'Planning risk assessment procedures'},{id:'ra3',section:'risk-assess',label:'Performing risk assessment procedures'},{id:'ra4',section:'risk-assess',label:'Assessing results'},
 {id:'rr1',section:'risk-resp',label:'Planning risk response procedures'},{id:'rr2',section:'risk-resp',label:'Overall response and fraud risk'},{id:'rr3',section:'risk-resp',label:'Cash and investments'},{id:'rr4',section:'risk-resp',label:'Accounts receivable'},{id:'rr5',section:'risk-resp',label:'Inventory'},{id:'rr6',section:'risk-resp',label:'Inventory observations'},{id:'rr7',section:'risk-resp',label:'Long-term investments'},{id:'rr8',section:'risk-resp',label:'Property, plant and equipment'},{id:'rr9',section:'risk-resp',label:'Intangibles and goodwill'},{id:'rr10',section:'risk-resp',label:'Bank debt and notes payable'},{id:'rr11',section:'risk-resp',label:'Accounts payable and accruals'},{id:'rr12',section:'risk-resp',label:'Income taxes'},{id:'rr13',section:'risk-resp',label:'Contingencies / subsequent events'},{id:'rr14',section:'risk-resp',label:'Share capital and retained earnings'},{id:'rr15',section:'risk-resp',label:'Related parties'},{id:'rr16',section:'risk-resp',label:'Sales'},{id:'rr17',section:'risk-resp',label:'Cost of sales'},{id:'rr18',section:'risk-resp',label:'Payroll'},{id:'rr19',section:'risk-resp',label:'Operating expenses'},{id:'rr20',section:'risk-resp',label:'Other'},
];
const SECTION_LABELS: Record<string,string> = { 'general':'General', 'risk-assess':'Risk Assessment', 'risk-resp':'Risk Response' };

const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g,'')) || 0;
const sumField = (rows: BudgetRow[], f: keyof BudgetRow) => { const t = rows.reduce((a,r) => a + parseNum(r[f] as string), 0); return t > 0 ? t.toFixed(1) : ''; };
const fmtNum = (n: number) => n > 0 ? n.toFixed(1) : '';

const ROLE_TO_ROLES: Record<string,RoleKey[]> = Object.entries(ROLE_TO_TB_ROW).reduce((acc,[role,rowId]) => { if (!acc[rowId]) acc[rowId] = []; acc[rowId].push(role as RoleKey); return acc; }, {} as Record<string,RoleKey[]>);

const TableCols = () => (
 <colgroup>
 <col /><col style={{width:'96px'}}/><col style={{width:'96px'}}/><col style={{width:'96px'}}/><col style={{width:'96px'}}/><col style={{width:'96px'}}/><col style={{width:'96px'}}/>
 </colgroup>
);

export function AuditTimeBudgetWorksheet({ isUS = false }: { isUS?: boolean }) {
 const { engagementId = 'default' } = useParams<{ engagementId: string }>();
 const { entries, removeEntry, hrsForRow, hrsForRole } = useTimeEntries(engagementId);

 const [sections, setSections] = useState(() =>
 (isUS ? US_SECTIONS : CA_SECTIONS).map(s => ({...s, rows: s.rows.map(r => ({...r })) }))
 );
 const [priorRate, setPriorRate] = useState('');
 const [budgetRate, setBudgetRate] = useState('');
 const [actualRate, setActualRate] = useState('');
 const [conclusion, setConclusion] = useState('');
 const [concluded, setConcluded] = useState(false);

 const updateCell = (si: number, ri: number, field: keyof BudgetRow, val: string) =>
 setSections(prev => prev.map((s, i) => i !== si ? s : {...s, rows: s.rows.map((r, j) => j !== ri ? r : {...r, [field]: val }) }));

 const getActualHrs = (sectionId: string, rowId: string) => sectionId === 'team' ? (ROLE_TO_ROLES[rowId] ?? []).reduce((a, role) => a + hrsForRole(role), 0) : hrsForRow(rowId);
 const getActualDollar = (sectionId: string, rowId: string) => { const rate = parseNum(actualRate); return rate > 0 ? getActualHrs(sectionId, rowId) * rate : 0; };

 const allRows = sections.flatMap(s => s.rows);
 const grandActualHrs = sections.reduce((a, s) => a + s.rows.reduce((b, r) => b + getActualHrs(s.id, r.id), 0), 0);
 const grandActualDollar = sections.reduce((a, s) => a + s.rows.reduce((b, r) => b + getActualDollar(s.id, r.id), 0), 0);
 const totalLogged = entries.reduce((a, e) => a + e.hours, 0);

 return (
 <div className="flex flex-col h-full">

 {/* Objective bar */}
 
 <div className="flex-1 overflow-y-auto bg-muted/30">
 <div className="px-6 py-2.5 border-b border-border bg-primary/[0.03] flex items-start gap-2">
 <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
 <span className="text-sm font-semibold text-primary whitespace-nowrap">Objective:</span>
 <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
 Compare estimated time and costs to the prior period and track actuals to complete the audit.
 {' '}<span className="text-primary font-medium">Actual columns auto-update from logged time entries below.</span>
 </p>
 </div>
 <div className="p-6 space-y-4">

 {/* ── Average charge-out rate ─────────────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border flex items-center gap-3">
 <span className="text-sm font-semibold text-foreground">Average Charge-Out Rate</span>
 <Tooltip>
 <TooltipTrigger asChild>
 <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent>Actual $ = tracked hours × Actual rate.</TooltipContent>
 </Tooltip>
 </div>
 <div className="px-6 py-5">
 <div className="flex items-center gap-8">
 {([['Prior', priorRate, setPriorRate], ['Budget', budgetRate, setBudgetRate], ['Actual', actualRate, setActualRate]] as const).map(([label, value, setter]) => (
 <div key={label as string} className="flex flex-col gap-1.5">
 <label className="text-sm font-medium text-muted-foreground">{label as string} ($/hr)</label>
 <Input className="h-8 text-sm w-28 tabular-nums text-right" placeholder="0.00"
 value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)} />
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* ── Budget sections ─────────────────────────────────────────────── */}
 {sections.map((section, si) => {
 const sectionActual = section.rows.reduce((a, r) => a + getActualHrs(section.id, r.id), 0);
 const sectionBudget = parseNum(sumField(section.rows, 'budgetHrs'));
 const pct = sectionBudget > 0 ? Math.min((sectionActual / sectionBudget) * 100, 100) : 0;
 const over = sectionBudget > 0 && sectionActual > sectionBudget;
 const warn = sectionBudget > 0 && sectionActual / sectionBudget > 0.8 && !over;
 const barColor = over ? 'bg-destructive' : warn ? 'bg-amber-400' : 'bg-primary';
 return (
 <div key={section.id} className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border flex items-center justify-between gap-3">
 <span className="text-sm font-semibold text-foreground">{section.title}</span>
 {sectionActual > 0 && (
 <div className="flex items-center gap-3 flex-1 max-w-xs">
 <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
 <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
 </div>
 <span className={`text-xs font-medium ${over ? 'text-destructive' : warn ? 'text-amber-600' : 'text-muted-foreground'}`}>
 {over ? `+${(sectionActual - sectionBudget).toFixed(1)}h over` : `${Math.round(pct)}% used`}
 </span>
 </div>
 )}
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <TableCols />
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">Description</th>
 {COL_HEADERS.map((h, hi) => (
 <th key={h} className={`px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider whitespace-nowrap ${hi >= 4 ? 'text-primary' : 'text-foreground'}`}>
 {h}{hi >= 4 && <span className="ml-1 text-[10px] font-normal opacity-60">auto</span>}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {section.rows.map((row, ri) => {
 const actualHrs = getActualHrs(section.id, row.id);
 const actualDollar = getActualDollar(section.id, row.id);
 return (
 <tr key={row.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2.5 align-top text-sm text-foreground">{row.label}</td>
 {EDITABLE.map(field => (
 <td key={field} className="px-4 py-2.5 align-top w-24">
 <Input className="h-8 text-sm tabular-nums text-right" placeholder="—"
 value={row[field] as string} onChange={e => updateCell(si, ri, field, e.target.value)} />
 </td>
 ))}
 <td className="px-4 py-2.5 align-top w-24">
 <div className={`h-8 flex items-center justify-end px-3 text-sm tabular-nums font-medium rounded-[10px] ${actualHrs > 0 ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}>
 {fmtNum(actualHrs) || '—'}
 </div>
 </td>
 <td className="px-4 py-2.5 align-top w-24">
 <div className={`h-8 flex items-center justify-end px-3 text-sm tabular-nums font-medium rounded-[10px] ${actualDollar > 0 ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}>
 {actualDollar > 0 ? actualDollar.toFixed(0) : '—'}
 </div>
 </td>
 </tr>
 );
 })}
 <tr className="bg-muted/30 border-t border-border font-semibold">
 <td className="px-4 py-2 text-sm font-semibold text-foreground">Subtotal</td>
 {EDITABLE.map(f => <td key={f} className="px-4 py-2 text-sm tabular-nums text-foreground text-right">{sumField(section.rows, f) || '—'}</td>)}
 <td className="px-4 py-2 text-sm tabular-nums text-right font-semibold text-primary">{fmtNum(sectionActual) || '—'}</td>
 <td className="px-4 py-2 text-sm tabular-nums text-right font-semibold text-primary">
 {sectionActual > 0 && parseNum(actualRate) > 0 ? (sectionActual * parseNum(actualRate)).toFixed(0) : '—'}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 );
 })}

 {/* ── Grand Total ─────────────────────────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <TableCols />
 <tbody>
 <tr className="bg-primary/5 border-b border-border">
 <td className="px-4 py-3 text-sm font-bold text-foreground">Grand Total</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-foreground text-right">{sumField(allRows,'priorHrs') || '—'}</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-foreground text-right">{sumField(allRows,'priorDollar') || '—'}</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-foreground text-right">{sumField(allRows,'budgetHrs') || '—'}</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-foreground text-right">{sumField(allRows,'budgetDollar') || '—'}</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-primary text-right">{fmtNum(grandActualHrs) || '—'}</td>
 <td className="px-4 py-3 text-sm font-bold tabular-nums text-primary text-right">{grandActualDollar > 0 ? grandActualDollar.toFixed(0) : '—'}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* ── Time log (compact, last 8 entries) ──────────────────────────── */}
 {entries.length > 0 && (
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border flex items-center justify-between">
 <span className="text-sm font-semibold text-foreground">Time Log</span>
 <span className="text-sm text-muted-foreground">{totalLogged.toFixed(1)}h across {entries.length} entries</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-muted border-b border-border">
 {['Date','Role','Section / Task','Hours','Description',''].map(h => (
 <th key={h} className="px-4 py-2.5 text-left text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {entries.slice(0, 8).map(e => {
 const task = TB_ROWS_FLAT.find(r => r.id === e.tbRowId)?.label ?? e.tbRowId;
 return (
 <tr key={e.id} className="hover:bg-muted/50 transition-colors">
 <td className="px-4 py-2 text-sm tabular-nums whitespace-nowrap">{e.date}</td>
 <td className="px-4 py-2 text-sm whitespace-nowrap">{ROLE_LABELS[e.roleKey]}</td>
 <td className="px-4 py-2 text-sm">{SECTION_LABELS[e.tbSection] ?? e.tbSection} — {task}</td>
 <td className="px-4 py-2 text-sm tabular-nums font-medium text-right">{e.hours.toFixed(1)}</td>
 <td className="px-4 py-2 text-sm text-muted-foreground max-w-[200px] truncate">{e.description}</td>
 <td className="px-3 py-2 text-center">
 <button onClick={() => { removeEntry(e.id); toast.success('Entry removed'); }}
 className="text-muted-foreground hover:text-destructive transition-colors">
 <Trash2 className="h-3 w-3" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* ── Conclusion ──────────────────────────────────────────────────── */}
 <div className="bg-card border border-border shadow-[0_2px_8px_hsl(213_40%_20%/0.06)] rounded-md overflow-hidden">
 <div className="px-6 py-3.5 border-b border-border"><span className="text-sm font-semibold text-foreground">Conclusion</span></div>
 <div className="px-6 py-5">
 <Textarea value={conclusion} onChange={e => setConclusion(e.target.value)}
 placeholder="Document any conclusions or variances noted in the time budget…"
 className="min-h-[72px] text-sm resize-none bg-background" />
 </div>
 </div>

 <div className="flex justify-end">
 <Button onClick={() => { setConcluded(true); toast.success('Time budget worksheet concluded'); }} disabled={concluded}>
 {concluded ? 'Worksheet concluded' : 'Conclude worksheet'}
 </Button>
 </div>

 </div>
 </div>
 </div>
 );
}
