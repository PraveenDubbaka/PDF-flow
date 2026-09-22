import { useState, Fragment } from 'react';
import { X, Minus, Maximize2, Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  loadTrackerEntries,
  saveTrackerEntries,
  BILLABLE_CATEGORIES,
  NON_BILLABLE_CATEGORIES,
  DEMO_CLIENTS,
  calcDuration,
  fmtTime12,
  type TrackerEntry,
} from '@/lib/trackerEntries';

const CURRENT_USER = { name: 'Praveen D.', role: 'Manager' };

// ── Entry form (Add / Edit) ────────────────────────────────────────────────

interface EntryFormProps {
  initial?: TrackerEntry;
  onClose: () => void;
  onSave: (entry: TrackerEntry) => void;
}

function EntryForm({ initial, onClose, onSave }: EntryFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!initial;

  function parseTime24(t: string) {
    if (!t) return { h: '', m: '', ap: 'AM' as 'AM' | 'PM' };
    const [hStr, mStr] = t.split(':');
    const hNum = parseInt(hStr) || 0;
    return {
      h: (hNum % 12 || 12).toString().padStart(2, '0'),
      m: mStr ?? '00',
      ap: (hNum >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
    };
  }

  const ps = parseTime24(initial?.startTime ?? '');
  const pe = parseTime24(initial?.endTime ?? '');

  const [date, setDate] = useState(initial?.date ?? today);
  const [entryType, setEntryType] = useState<'Billable' | 'Non Billable'>(
    initial ? (initial.billable ? 'Billable' : 'Non Billable') : 'Billable'
  );
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [engId, setEngId] = useState(initial?.engagementId ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [sH, setSH] = useState(ps.h);
  const [sM, setSM] = useState(ps.m);
  const [sAp, setSAp] = useState<'AM' | 'PM'>(ps.ap);
  const [eH, setEH] = useState(pe.h);
  const [eM, setEM] = useState(pe.m);
  const [eAp, setEAp] = useState<'AM' | 'PM'>(pe.ap);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const existingDur = isEdit && initial ? calcDuration(initial.startTime, initial.endTime) : '00h:00m:00s';
  const [durH, setDurH] = useState(existingDur.split('h:')[0] ?? '00');
  const [durM, setDurM] = useState(existingDur.split('h:')[1]?.split('m:')[0] ?? '00');

  const cats = entryType === 'Billable' ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES;
  const clientList = Object.keys(DEMO_CLIENTS);
  const engList = clientName ? (DEMO_CLIENTS[clientName] ?? []) : [];

  function to24(h: string, m: string, ap: 'AM' | 'PM'): string {
    let n = parseInt(h) || 0;
    if (ap === 'PM' && n !== 12) n += 12;
    if (ap === 'AM' && n === 12) n = 0;
    return `${n.toString().padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
  }

  const start24 = to24(sH, sM, sAp);
  const end24 = to24(eH, eM, eAp);
  const duration = sH && eH ? calcDuration(start24, end24) : '00h:00m:00s';

  function handleSave() {
    let startTime = isEdit ? (initial?.startTime ?? start24) : start24;
    let endTime = isEdit ? (initial?.endTime ?? end24) : end24;

    if (isEdit && initial) {
      const [sh, sm] = initial.startTime.split(':').map(Number);
      const totalMin = parseInt(durH) * 60 + parseInt(durM);
      const endMin = sh * 60 + sm + totalMin;
      endTime = `${Math.floor(endMin / 60 % 24).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;
    }

    onSave({
      id: initial?.id ?? `tm-${Date.now()}`,
      date,
      clientName,
      engagementId: engId,
      category,
      type: isEdit ? (initial?.type ?? 'Manual') : 'Manual',
      billable: entryType === 'Billable',
      startTime,
      endTime,
      notes,
      userName: CURRENT_USER.name,
      isIdle: isEdit ? initial?.isIdle : undefined,
    });
  }

  const smallInput = "w-12 text-center px-1";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-[580px] max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Edit Automatic Time Entry' : 'Add Manual Time Entry'}
          </h2>
          <button onClick={onClose} className="action-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          <div className="grid grid-cols-2 gap-4">

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* Entry Type */}
            <div className="flex flex-col gap-1.5">
              <Label>Entry Type <span className="text-destructive">*</span></Label>
              <Select value={entryType} onValueChange={v => { setEntryType(v as 'Billable' | 'Non Billable'); setCategory(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Billable">Billable</SelectItem>
                  <SelectItem value="Non Billable">Non Billable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Member */}
            <div className="flex flex-col gap-1.5">
              <Label>Team Member <span className="text-destructive">*</span></Label>
              <Input value={`${CURRENT_USER.name} (${CURRENT_USER.role})`} disabled />
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-1.5">
              <Label>Client Name</Label>
              <Select value={clientName || undefined} onValueChange={v => { setClientName(v); setEngId(''); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {clientList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Engagement ID */}
            <div className="flex flex-col gap-1.5">
              <Label>Engagement ID</Label>
              <Select value={engId || undefined} onValueChange={setEngId} disabled={!clientName || isEdit}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {engList.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={category || undefined} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Start + End (Add) or Duration (Edit) */}
            {isEdit ? (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Duration <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input value={durH} maxLength={2} placeholder="00" onChange={e => setDurH(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                  <span className="text-sm text-muted-foreground">h :</span>
                  <Input value={durM} maxLength={2} placeholder="05" onChange={e => setDurM(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                  <span className="text-sm text-muted-foreground">m : 00 s</span>
                </div>
              </div>
            ) : (
              <>
                {/* Start Time */}
                <div className="flex flex-col gap-1.5">
                  <Label>Start Time <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-1">
                    <Input value={sH} maxLength={2} placeholder="hh" onChange={e => setSH(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                    <span className="text-muted-foreground">:</span>
                    <Input value={sM} maxLength={2} placeholder="mm" onChange={e => setSM(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                    <Select value={sAp} onValueChange={v => setSAp(v as 'AM' | 'PM')}>
                      <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End Time */}
                <div className="flex flex-col gap-1.5">
                  <Label>End Time <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-1">
                    <Input value={eH} maxLength={2} placeholder="hh" onChange={e => setEH(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                    <span className="text-muted-foreground">:</span>
                    <Input value={eM} maxLength={2} placeholder="mm" onChange={e => setEM(e.target.value.replace(/\D/g, '').slice(0, 2))} className={smallInput} />
                    <Select value={eAp} onValueChange={v => setEAp(v as 'AM' | 'PM')}>
                      <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Duration display */}
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Duration</Label>
                  <p className="text-sm font-semibold text-foreground font-mono">{duration}</p>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Notes <span className="text-destructive">*</span></Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add details"
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="min-w-[90px]">Cancel</Button>
          <Button onClick={handleSave} className="min-w-[90px]" style={{ background: '#1C63A6' }}>
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main floating window ───────────────────────────────────────────────────

export function TimeTrackerModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<TrackerEntry[]>(() => loadTrackerEntries());
  const [minimized, setMinimized] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<TrackerEntry | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState(false);

  const grouped = entries.reduce<Record<string, TrackerEntry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const dateGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  function dateLabel(d: string, count: number) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (d === today) return `Today (${count})`;
    if (d === yesterday) return `Yesterday (${count})`;
    const parts = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' });
    return `${parts} (${count})`;
  }

  function handleSave(entry: TrackerEntry) {
    const current = loadTrackerEntries();
    const idx = current.findIndex(e => e.id === entry.id);
    const next = idx >= 0
      ? current.map((e, i) => i === idx ? entry : e)
      : [entry, ...current];
    saveTrackerEntries(next);
    setEntries(next);
    setShowAdd(false);
    setEditEntry(null);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  }

  function handleDelete(id: string) {
    const next = entries.filter(e => e.id !== id);
    saveTrackerEntries(next);
    setEntries(next);
  }

  function toggleCollapse(d: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(d) ? n.delete(d) : n.add(d);
      return n;
    });
  }

  const COLS = ['TEAM MEMBER', 'ENGAGEMENT ID', 'CATEGORY', 'TYPE', 'BILLABLE', 'START TIME', 'END TIME', 'DURATION', 'NOTES', 'ACTIONS'];
  const SORTABLE = new Set(['TEAM MEMBER', 'ENGAGEMENT ID', 'CATEGORY', 'TYPE', 'BILLABLE']);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[149] bg-black/40" />

      {/* Window */}
      <div
        className="fixed inset-x-4 top-14 z-[150] mx-auto max-w-[1100px] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-border"
        style={{ maxHeight: 'calc(100vh - 72px)' }}
      >
        {/* Window chrome — Countable dark blue */}
        <div className="flex items-center px-4 py-2.5 shrink-0" style={{ background: '#0C2D55' }}>
          <div className="flex items-center gap-2 flex-1">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="13" fill="rgba(255,255,255,0.18)" />
              <text x="13" y="18.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="sans-serif">C</text>
            </svg>
            <span className="text-white text-sm font-semibold tracking-wide">Countable</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(v => !v)} className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Minimize">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Maximize">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="flex flex-col flex-1 overflow-hidden bg-card">

            {/* Sub-header */}
            <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border shrink-0">
              <h1 className="text-lg font-bold text-foreground flex-1">Time Tracker</h1>
              {successMsg && (
                <div className="flex items-center gap-2 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  The activity has been added to your time tracker
                </div>
              )}
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border shrink-0">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm border-dashed" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" />
                Manual Time Entry
              </Button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full caption-bottom text-sm" style={{ minWidth: '960px' }}>
                <TableHeader className="sticky top-0 z-10 bg-muted/40">
                  <tr>
                    <TableHead className="w-9 px-3 py-2.5 h-auto">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded cursor-pointer" />
                    </TableHead>
                    {COLS.map(h => (
                      <TableHead key={h} className="px-3 py-2 h-auto whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {h}
                          {(SORTABLE.has(h) || h === 'ACTIONS') && (
                            <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
                          )}
                        </span>
                      </TableHead>
                    ))}
                  </tr>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-20 text-muted-foreground text-sm">
                        Time has not yet been logged
                      </td>
                    </tr>
                  ) : (
                    dateGroups.map(([date, grp]) => (
                      <Fragment key={date}>
                        {/* Group header */}
                        <tr className="bg-muted/30">
                          <td colSpan={11} className="px-4 py-2">
                            <button onClick={() => toggleCollapse(date)}
                              className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-foreground/80 transition-colors">
                              <span className="text-sm">📅</span>
                              {dateLabel(date, grp.length)}
                              {collapsed.has(date)
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                            </button>
                          </td>
                        </tr>

                        {/* Entry rows */}
                        {!collapsed.has(date) && grp.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="px-3 py-2.5 w-9">
                              <input type="checkbox" className="h-3.5 w-3.5 rounded cursor-pointer" />
                            </TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">
                              {entry.userName ?? CURRENT_USER.name}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">
                              <span className="font-mono text-muted-foreground">{entry.engagementId}</span>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">{entry.category}</TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{entry.type}</span>
                                {entry.isIdle && (
                                  <Badge variant="warning">Idle</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">
                              {entry.billable
                                ? <Badge variant="inProgress">Billable</Badge>
                                : <Badge variant="notStarted">Non Billable</Badge>
                              }
                            </TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">{fmtTime12(entry.startTime)}</TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">{fmtTime12(entry.endTime)}</TableCell>
                            <TableCell className="px-3 py-2.5 whitespace-nowrap">
                              <span className="font-mono">{calcDuration(entry.startTime, entry.endTime)}</span>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 max-w-[200px]">
                              <span className="text-sm text-muted-foreground truncate block">{entry.notes || '—'}</span>
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => setEditEntry(entry)} className="action-icon" title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(entry.id)} className="action-icon hover:!text-destructive" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button className="action-icon hover:!text-green-600" title="Approve">
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAdd && <EntryForm onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {editEntry && <EntryForm initial={editEntry} onClose={() => setEditEntry(null)} onSave={handleSave} />}
    </>
  );
}
