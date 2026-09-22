import { useState, useEffect } from 'react';
import { Check, X, Pencil, Zap } from 'lucide-react';

const LUKA_OUTPUTS: Record<string, string> = {
 'Draft memo': `MEMORANDUM

To: Engagement File
From: [Auditor Name]
Date: [Date]
Re: [Engagement Name]

PURPOSE
This memorandum documents [purpose of the memo].

BACKGROUND
[Provide relevant background context for the engagement.]

ANALYSIS
[Provide analysis of key findings and considerations.]

CONCLUSION
Based on the above analysis, we conclude that [conclusion].`,

 'Meeting notes': `MEETING NOTES

Date: [Date]
Attendees: [Names and roles]
Location / Call: [Location or video link]

DISCUSSION
• [Key discussion point 1]
• [Key discussion point 2]
• [Key discussion point 3]

DECISIONS MADE
• [Decision 1]
• [Decision 2]

ACTION ITEMS
• [Action item] — Owner: [Name] — Due: [Date]
• [Action item] — Owner: [Name] — Due: [Date]`,

 'Draft findings': `FINDINGS

Finding: [Finding Title]

Condition
[Description of the condition observed during the engagement.]

Criteria
[The standard, policy, or expectation against which the condition is measured.]

Effect
[The actual or potential impact of the condition on the engagement or client.]

Cause
[The reason the condition exists.]

Recommendation
[Suggested corrective action or management response.]`,

 'Summarise transcript': `TRANSCRIPT SUMMARY

KEY POINTS
• [Key point 1]
• [Key point 2]
• [Key point 3]

DECISIONS
• [Decision 1]
• [Decision 2]

ACTION ITEMS
• [Action item] — [Owner]
• [Action item] — [Owner]`,

 'Populate from transcript': `TRANSCRIPT ANALYSIS

PARTICIPANTS
• [Participant 1] — [Role]
• [Participant 2] — [Role]

KEY INFORMATION EXTRACTED
• [Extracted fact 1]
• [Extracted fact 2]
• [Extracted fact 3]

FOLLOW-UP REQUIRED
• [Item requiring follow-up]
• [Item requiring follow-up]`,
};

interface NoteAIBlockProps {
 command: string;
 onAccept: (content: string) => void;
 onDiscard: () => void;
}

export function NoteAIBlock({ command, onAccept, onDiscard }: NoteAIBlockProps) {
 const [phase, setPhase] = useState<'loading' | 'streaming' | 'done'>('loading');
 const [displayed, setDisplayed] = useState('');
 const [isEditing, setIsEditing] = useState(false);
 const [editContent, setEditContent] = useState('');

 const fullContent = LUKA_OUTPUTS[command] ?? `Generated content for: ${command}`;

 useEffect(() => {
 const t = setTimeout(() => setPhase('streaming'), 900);
 return () => clearTimeout(t);
 }, []);

 useEffect(() => {
 if (phase !== 'streaming') return;
 let idx = 0;
 const id = setInterval(() => {
 idx += 4;
 setDisplayed(fullContent.slice(0, idx));
 if (idx >= fullContent.length) {
 setDisplayed(fullContent);
 setPhase('done');
 clearInterval(id);
 }
 }, 16);
 return () => clearInterval(id);
 }, [phase, fullContent]);

 const handleEditSave = () => {
 onAccept(editContent);
 };

 const handleEditCancel = () => {
 setIsEditing(false);
 setEditContent('');
 };

 return (
 <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden my-2">
 <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r from-[#8649F1] to-[#2355A4]">
 <Zap className="h-2.5 w-2.5 fill-white" strokeWidth={0} />
 Luka
 </span>
 <span className="text-xs text-muted-foreground flex-1">{command}</span>
 {phase === 'loading' && (
 <div className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
 )}
 </div>

 <div className="px-3 py-2.5 font-mono text-xs text-foreground whitespace-pre-wrap min-h-[60px]">
 {phase === 'loading' ? (
 <span className="text-muted-foreground italic">Generating…</span>
 ) : isEditing ? (
 <textarea
 value={editContent}
 onChange={e => setEditContent(e.target.value)}
 autoFocus
 className="w-full bg-transparent outline-none resize-none font-mono text-xs text-foreground"
 rows={Math.max(4, editContent.split('\n').length + 1)}
 />
 ) : (
 displayed
 )}
 </div>

 {(phase === 'done' || isEditing) && (
 <div className="flex items-center gap-2 px-3 py-2 border-t border-primary/10">
 {isEditing ? (
 <>
 <button
 onClick={handleEditSave}
 className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-semibold bg-[#1C63A6] text-white hover:bg-primary/90 transition-colors"
 >
 <Check className="h-3 w-3" /> Save
 </button>
 <button
 onClick={handleEditCancel}
 className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors"
 >
 Cancel
 </button>
 </>
 ) : (
 <>
 <button
 onClick={() => onAccept(displayed)}
 className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-semibold bg-[#1C63A6] text-white hover:bg-primary/90 transition-colors"
 >
 <Check className="h-3 w-3" /> Accept
 </button>
 <button
 onClick={() => { setIsEditing(true); setEditContent(displayed); }}
 className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors"
 >
 <Pencil className="h-3 w-3" /> Edit
 </button>
 <button
 onClick={onDiscard}
 className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-background text-destructive hover:bg-destructive/10 transition-colors"
 >
 <X className="h-3 w-3" /> Discard
 </button>
 </>
 )}
 </div>
 )}
 </div>
 );
}
