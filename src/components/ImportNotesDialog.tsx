import { useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Check, Loader2, Calendar, FileAudio, Mic, Upload, StickyNote, ChevronLeft, ChevronRight, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImportResult {
 source: string;
 meetingDate?: string;
 attendees?: { name: string; role: string }[];
 agendaNotes?: Record<string, string>;
 actionSteps?: { action: string; person: string; deadline: string }[];
 meetingExtracts?: { mt: string; date: string; extract: string }[];
}

interface SourceOption {
 id: string;
 connectorId?: string;
 label: string;
 description: string;
 icon: React.ComponentType<{ className?: string }>;
}

const SOURCES: SourceOption[] = [
 { id: "granola", connectorId: "granola", label: "Granola", description: "Pull the latest planning meeting note with AI summary & action items.", icon: StickyNote },
 { id: "fireflies", connectorId: "fireflies", label: "Fireflies.ai", description: "Import transcript + AI summary from your most recent recorded call.", icon: Mic },
 { id: "otter", connectorId: "otter", label: "Otter.ai", description: "Pull conversation notes and decisions from Otter.", icon: FileAudio },
 { id: "gcal", connectorId: "gcal", label: "Google Calendar", description: "Use the meeting invite (date, attendees, agenda) as the seed.", icon: Calendar },
 { id: "outlook", connectorId: "outlook", label: "Outlook Calendar", description: "Pull invite details and attached agenda from Outlook.", icon: Calendar },
 { id: "paste", label: "Paste transcript / notes", description: "Paste raw notes — Luka extracts attendees, decisions, and actions.", icon: Upload },
];

const DEMO_RESULT: Omit<ImportResult, "source"> = {
 meetingDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 16),
 attendees: [
  { name: "M. Thompson", role: "Partner" },
  { name: "L. Garcia", role: "Manager" },
  { name: "Senior 1", role: "Revenue / AR" },
  { name: "Senior 2", role: "Expenses / ASC 842" },
  { name: "J. Reyes", role: "CFO — Client" },
 ],
 agendaNotes: {
  a1: "Partner reminded the team of their responsibility for audit quality, professional skepticism, and prompt escalation of independence concerns. No issues raised.",
  a2: "Team introduced; roles confirmed. Reviewed entity profile, users of F/S (lender + shareholders), ASPE framework, and overall materiality of $145K. Watch areas: revenue cut-off, inventory count.",
  a3: "Prior year had two adjusting JEs (inventory obsolescence, accrued bonus). No fraud noted. Management responsive but year-end close was 2 weeks late.",
  a4: "New lender covenant (DSCR > 1.25). Implemented NetSuite mid-year — migration completed Q3. New CFO joined April. No M&A.",
  a5: "Preliminary AR shows revenue +12%, GM down 3pts vs prior year — to be investigated Inventory turnover lower than prior year.",
  a6: "Identified potential RMMs in revenue recognition (cut-off), inventory existence/valuation, ASC 842 lease completeness, and management estimates around obsolescence reserve.",
  a7: "RAPs: walkthroughs of revenue, purchasing, and payroll. SOC 1 report obtained for payroll service provider. IT GCs assessment planned for NetSuite.",
  b8: "All RMMs carried F/S level risk: management override (significant). Assertion-level: revenue cut-off (significant), inventory existence (significant).",
  b9: "Reviewed Discussed pressure from lender covenant as fraud risk factor. No known attitudes of override but planned JE testing expanded.",
  b10: "Substantive testing of revenue cut-off ± 5 days. Full physical inventory observation. Confirmations on 90% of AR balance. Unpredictable JE testing on last-week entries.",
  b11: "No interim work this year. Field work Jan 15–Feb 9. TCWG meeting scheduled Feb 22. Client to deliver PBC by Jan 8. Manager review by Feb 12, partner by Feb 16.",
  b12: "Reminded team on professional skepticism, ongoing communication, and updates if scope changes.",
  b13: "Discussed roll-forward of going-concern memo — no material doubt indicators.",
 },
 meetingExtracts: [
  { mt: "Board of Directors", date: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10), extract: "Board approved Q3 financial results. Noted significant increase in accounts receivable. No related-party transactions flagged." },
  { mt: "Audit Committee", date: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), extract: "Auditor independence confirmed. Discussed key audit matters: revenue recognition and inventory valuation. Management representation letter reviewed." },
  { mt: "Shareholders / AGM", date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), extract: "Annual results presented. Dividend declared. No significant concerns raised by shareholders regarding financial reporting." },
 ],
 actionSteps: [
  { action: "Send PBC list to client and confirm delivery date", person: "L. Garcia — Manager", deadline: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10) },
  { action: "Schedule physical inventory observation at main warehouse", person: "Senior 2 — Expenses / ASC 842", deadline: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10) },
  { action: "Obtain SOC 1 report from payroll service provider", person: "Staff 1 — AP / Cash", deadline: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) },
  { action: "Complete IT GCs walkthrough for NetSuite", person: "Senior 1 — Revenue / AR", deadline: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10) },
 ],
};

interface DemoMeeting {
 id: string;
 title: string;
 duration: string;
 attendeesPreview: string;
}

function makeDateStr(daysAgo: number): string {
 const d = new Date();
 d.setDate(d.getDate() - daysAgo);
 return d.toISOString().slice(0, 10);
}

const DEMO_MEETINGS: Record<string, DemoMeeting[]> = {
 // Current month — recent
 [makeDateStr(1)]: [
  { id: "meeting-planning", title: "Team Planning Discussion — Northline Precision", duration: "1h 15m", attendeesPreview: "M. Thompson, L. Garcia +3" },
 ],
 [makeDateStr(2)]: [
  { id: "meeting-pbc", title: "PBC List Walkthrough — Client Kick-off", duration: "45m", attendeesPreview: "L. Garcia, J. Reyes (CFO)" },
 ],
 // Prior month — week 1
 [makeDateStr(3)]: [
  { id: "meeting-fraud-mgmt", title: "Fraud Inquiry — Management Interview (Part A)", duration: "1h", attendeesPreview: "M. Thompson, J. Reyes, K. Osei (Controller)" },
 ],
 [makeDateStr(5)]: [
  { id: "meeting-going-concern", title: "Going Concern Discussion — Management Inquiry", duration: "45m", attendeesPreview: "M. Thompson, L. Garcia, J. Reyes (CFO)" },
 ],
 [makeDateStr(7)]: [
  { id: "meeting-board", title: "Board of Directors Meeting", duration: "2h", attendeesPreview: "J. Reyes + board (5 members)" },
  { id: "meeting-audit-pre", title: "Audit Committee Pre-meeting Briefing", duration: "30m", attendeesPreview: "M. Thompson, Audit Committee Chair" },
 ],
 // Prior month — week 2
 [makeDateStr(10)]: [
  { id: "meeting-audit-committee", title: "Audit Committee Meeting", duration: "1h 30m", attendeesPreview: "M. Thompson, J. Reyes +4" },
 ],
 [makeDateStr(13)]: [
  { id: "meeting-it-walkthrough", title: "IT Environment Walkthrough — NetSuite Migration", duration: "1h", attendeesPreview: "D. Okonkwo, IT Manager" },
 ],
 [makeDateStr(14)]: [
  { id: "meeting-revenue-wt", title: "Revenue Recognition Walkthrough", duration: "1h 30m", attendeesPreview: "Senior 1, Controller" },
  { id: "meeting-fraud-tcwg", title: "Fraud Inquiry — TCWG Interview (Part B)", duration: "45m", attendeesPreview: "M. Thompson, Audit Committee Chair" },
 ],
 // Prior month — week 3
 [makeDateStr(17)]: [
  { id: "meeting-payroll-wt", title: "Payroll Process Walkthrough — Ceridian", duration: "1h", attendeesPreview: "Senior 2, Payroll Manager" },
 ],
 [makeDateStr(21)]: [
  { id: "meeting-prior-file", title: "Prior Year File Review Discussion", duration: "45m", attendeesPreview: "M. Thompson, L. Garcia, S. Whitfield" },
 ],
 // Prior month — week 4
 [makeDateStr(24)]: [
  { id: "meeting-partner-call", title: "Partner/Client Planning Call", duration: "30m", attendeesPreview: "R. Chandra (Partner), J. Reyes (CFO)" },
 ],
 [makeDateStr(28)]: [
  { id: "meeting-agm", title: "Shareholders / Annual General Meeting", duration: "3h", attendeesPreview: "Management + shareholders" },
 ],
 // Two months prior
 [makeDateStr(33)]: [
  { id: "meeting-initial", title: "Initial Client Meeting — Northline Precision", duration: "1h", attendeesPreview: "R. Chandra, M. Thompson, J. Reyes" },
 ],
 [makeDateStr(40)]: [
  { id: "meeting-eng-letter", title: "Engagement Letter Discussion & Acceptance", duration: "30m", attendeesPreview: "R. Chandra (Partner), J. Reyes (CFO)" },
 ],
};

function getCalendarDays(year: number, month: number): (string | null)[] {
 const firstDay = new Date(year, month, 1);
 const lastDay = new Date(year, month + 1, 0);
 const offset = (firstDay.getDay() + 6) % 7; // Monday-first
 const days: (string | null)[] = [];
 for (let i = 0; i < offset; i++) days.push(null);
 for (let d = 1; d <= lastDay.getDate(); d++) {
  const mPad = String(month + 1).padStart(2, "0");
  const dPad = String(d).padStart(2, "0");
  days.push(`${year}-${mPad}-${dPad}`);
 }
 return days;
}

interface Props {
 open: boolean;
 onOpenChange: (o: boolean) => void;
 onImport: (result: ImportResult) => void;
 connectedApps?: Set<string>;
 onOpenConnectors?: (connectorId?: string) => void;
}

export function ImportNotesDialog({ open, onOpenChange, onImport, connectedApps, onOpenConnectors }: Props) {
 const [selected, setSelected] = useState<string>("granola");
 const [pasted, setPasted] = useState("");
 const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
 const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
 });
 const [selectedDate, setSelectedDate] = useState<string | null>(null);
 const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

 const todayStr = new Date().toISOString().slice(0, 10);
 const calendarDays = getCalendarDays(calendarMonth.year, calendarMonth.month);
 const monthName = new Date(calendarMonth.year, calendarMonth.month, 1)
  .toLocaleString("default", { month: "long" });
 const meetingsForDate = selectedDate ? (DEMO_MEETINGS[selectedDate] ?? []) : [];
 const canImport = status === "idle" && (
  selected === "paste" ? pasted.trim().length > 0 : selectedMeetingId !== null
 );

 const reset = () => {
  setStatus("idle");
  setPasted("");
  setSelected("granola");
  setSelectedDate(null);
  setSelectedMeetingId(null);
 };

 const handleImport = () => {
  setStatus("loading");
  setTimeout(() => {
   setStatus("done");
   setTimeout(() => {
    onImport({ source: selected, ...DEMO_RESULT });
    onOpenChange(false);
    setTimeout(reset, 200);
   }, 700);
  }, 1400);
 };

 return (
  <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
   <DialogContent className="max-w-2xl">
    <DialogHeader>
     <DialogTitle className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" />
      AI-assisted import
     </DialogTitle>
     <DialogDescription>
      Pull meeting context from a connected source. Luka extracts attendees, decisions per agenda item, and action steps — then drops them into the worksheet for your review.
     </DialogDescription>
    </DialogHeader>

    <div className="overflow-y-auto max-h-[62vh] space-y-4 pr-1">
     {/* Step 1: Source */}
     <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</Label>
      <div className="mt-2 grid grid-cols-2 gap-2">
       {SOURCES.map((src) => {
        const Icon = src.icon;
        const active = selected === src.id;
        return (
         <button
          type="button"
          key={src.id}
          onClick={() => { setSelected(src.id); setSelectedDate(null); setSelectedMeetingId(null); }}
          className={cn(
           "text-left rounded-md border p-3 transition-colors",
           active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          )}
         >
          <div className="flex items-start gap-2.5">
           <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
           <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
             <span className="text-sm font-semibold text-foreground">{src.label}</span>
             {src.connectorId && (connectedApps?.has(src.connectorId) ? (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
               Connected
              </span>
             ) : (
              <button
               type="button"
               onClick={(e) => { e.stopPropagation(); onOpenConnectors?.(src.connectorId); }}
               className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
              >
               Connect
              </button>
             ))}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{src.description}</p>
           </div>
          </div>
         </button>
        );
       })}
      </div>
     </div>

     {/* Step 2: Calendar */}
     {selected !== "paste" && (
      <div>
       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select date</Label>
       <div className="mt-2 rounded-md border border-border p-3 bg-background">
        <div className="flex items-center justify-between mb-2">
         <button
          type="button"
          onClick={() => setCalendarMonth(m => {
           const d = new Date(m.year, m.month - 1, 1);
           return { year: d.getFullYear(), month: d.getMonth() };
          })}
          className="p-1 rounded hover:bg-muted transition-colors"
         >
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
         </button>
         <span className="text-sm font-medium">{monthName} {calendarMonth.year}</span>
         <button
          type="button"
          onClick={() => setCalendarMonth(m => {
           const d = new Date(m.year, m.month + 1, 1);
           return { year: d.getFullYear(), month: d.getMonth() };
          })}
          className="p-1 rounded hover:bg-muted transition-colors"
         >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
         </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
         {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="h-7 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
           {d}
          </div>
         ))}
        </div>
        <div className="grid grid-cols-7">
         {calendarDays.map((dateStr, i) => {
          if (!dateStr) return <div key={i} className="h-8" />;
          const hasMeetings = !!(DEMO_MEETINGS[dateStr]?.length);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const dayNum = new Date(dateStr + "T12:00:00").getDate();
          return (
           <button
            key={i}
            type="button"
            onClick={() => { setSelectedDate(dateStr); setSelectedMeetingId(null); }}
            className={cn(
             "relative h-8 flex flex-col items-center justify-center text-xs rounded transition-colors",
             isSelected
              ? "bg-primary text-primary-foreground font-medium"
              : isToday
               ? "ring-1 ring-inset ring-primary text-primary font-medium hover:bg-muted"
               : "text-foreground hover:bg-muted"
            )}
           >
            <span>{dayNum}</span>
            {hasMeetings && (
             <span className={cn(
              "absolute bottom-0.5 w-1 h-1 rounded-full",
              isSelected ? "bg-primary-foreground" : "bg-primary"
             )} />
            )}
           </button>
          );
         })}
        </div>
       </div>
      </div>
     )}

     {/* Step 3: Meeting list */}
     {selected !== "paste" && selectedDate && (
      <div>
       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Meeting notes · {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
       </Label>
       {meetingsForDate.length === 0 ? (
        <div className="mt-2 rounded-md border border-border p-4 text-sm text-muted-foreground text-center">
         No meeting notes found for this date.
        </div>
       ) : (
        <div className="mt-2 space-y-1.5">
         {meetingsForDate.map(m => {
          const isActive = selectedMeetingId === m.id;
          return (
           <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMeetingId(m.id)}
            className={cn(
             "w-full text-left rounded-md border p-3 transition-colors",
             isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            )}
           >
            <div className="flex items-start gap-2.5">
             <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
             <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">{m.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
               <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />{m.duration}
               </span>
               <span className="text-xs text-muted-foreground">{m.attendeesPreview}</span>
              </div>
             </div>
             {isActive && <Check className="h-3.5 w-3.5 text-primary ml-auto mt-0.5 shrink-0" />}
            </div>
           </button>
          );
         })}
        </div>
       )}
      </div>
     )}

     {/* Paste mode */}
     {selected === "paste" && (
      <div>
       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paste notes / transcript</Label>
       <Textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="Paste raw notes, transcript, or meeting summary here…"
        className="mt-1.5 min-h-[120px] text-sm"
       />
      </div>
     )}

     {/* Status indicator */}
     {status !== "idle" && (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm flex items-center gap-2">
       {status === "loading" ? (
        <>
         <Loader2 className="h-4 w-4 animate-spin text-primary" />
         <span className="text-foreground">Luka is extracting attendees, decisions, and action items…</span>
        </>
       ) : (
        <>
         <Check className="h-4 w-4 text-emerald-600" />
         <span className="text-foreground">Extracted 5 attendees, 13 agenda decisions, and 4 action items. Populating worksheet…</span>
        </>
       )}
      </div>
     )}
    </div>

    <DialogFooter>
     <Button variant="outline" onClick={() => onOpenChange(false)} disabled={status === "loading"}>
      Cancel
     </Button>
     <Button onClick={handleImport} disabled={!canImport}>
      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      {status === "loading" ? "Importing…" : "Import & populate"}
     </Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}
