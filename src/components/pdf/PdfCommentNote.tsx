import { useMemo, useRef, useState } from 'react';
import { Check, CornerDownRight, Pencil, Reply, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PdfAnnotation, PdfCommentReply } from '@/lib/pdfDocuments';
import { currentMentionUser, findMentions, initialsOf, mentionUsers } from '@/data/mentionUsers';

const timeLabel = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export function MentionText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const names = mentionUsers.map((user) => user.name).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const output: { text: string; mention: boolean }[] = [];
    let last = 0;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match) {
      if (match.index > last) output.push({ text: text.slice(last, match.index), mention: false });
      output.push({ text: match[0], mention: true });
      last = match.index + match[0].length;
      match = pattern.exec(text);
    }
    if (last < text.length) output.push({ text: text.slice(last), mention: false });
    return output;
  }, [text]);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        part.mention ? (
          <span key={index} className="rounded-[4px] bg-primary/10 px-1 font-semibold text-primary">{part.text}</span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export function MentionInput({ value, onChange, onSubmit, placeholder, autoFocus, rows = 3 }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const term = query.toLowerCase();
    return mentionUsers.filter((user) => user.name.toLowerCase().includes(term)).slice(0, 6);
  }, [query]);

  const syncQuery = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = before.match(/@([\p{L} ]{0,20})$/u);
    if (!match) { setQuery(null); return; }
    const partial = match[1];
    if (partial.trim().split(/\s+/).length > 2) { setQuery(null); return; }
    setQuery(partial);
    setActive(0);
  };

  const applyMention = (name: string) => {
    const element = ref.current;
    const caret = element?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([\p{L} ]{0,20})$/u, `@${name} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      element?.focus();
      const position = before.length;
      element?.setSelectionRange(position, position);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        placeholder={placeholder ?? 'Write a comment. Type @ to tag a teammate.'}
        onChange={(event) => { onChange(event.target.value); syncQuery(event.target.value, event.target.selectionStart ?? 0); }}
        onKeyDown={(event) => {
          if (suggestions.length) {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (index + 1) % suggestions.length); return; }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index - 1 + suggestions.length) % suggestions.length); return; }
            if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); applyMention(suggestions[active].name); return; }
            if (event.key === 'Escape') { setQuery(null); return; }
          }
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); onSubmit?.(); }
        }}
        className="w-full resize-none rounded-[10px] border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-[10px] border border-border bg-popover shadow-lg">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(event) => { event.preventDefault(); applyMention(user.name); }}
              className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs', index === active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold', index === active ? 'bg-primary-foreground/20' : 'bg-muted')}>{initialsOf(user.name)}</span>
              <span className="flex-1 truncate">{user.name}</span>
              <span className={cn('text-[10px]', index === active ? 'opacity-80' : 'text-muted-foreground')}>{user.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PdfCommentNote({ annotation, onChange, onDelete, onClose }: {
  annotation: PdfAnnotation;
  onChange: (changes: Partial<PdfAnnotation>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const body = annotation.value ?? annotation.label ?? '';
  const [editing, setEditing] = useState(!body);
  const [draft, setDraft] = useState(body);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const tagged = annotation.mentions ?? [];
  const [replyAs, setReplyAs] = useState(currentMentionUser.name);
  const replyOptions = useMemo(() => [...new Set([currentMentionUser.name, ...tagged])], [tagged]);
  const replies = annotation.replies ?? [];

  const saveBody = () => {
    const text = draft.trim();
    if (!text) return;
    onChange({ value: text, label: text, mentions: findMentions(text) });
    setEditing(false);
  };

  const addReply = () => {
    const text = replyDraft.trim();
    if (!text) return;
    const reply: PdfCommentReply = {
      id: crypto.randomUUID(),
      author: replyAs,
      text,
      createdAt: new Date().toISOString(),
      mentions: findMentions(text),
    };
    onChange({ replies: [...replies, reply] });
    setReplyDraft('');
    setReplyOpen(false);
  };

  return (
    <div
      className="w-[320px] overflow-hidden rounded-[12px] border-2 border-warning bg-card shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 bg-warning px-2.5 py-1.5 text-warning-foreground">
        <span className="flex-1 truncate text-xs font-semibold">Comment [{annotation.author ?? currentMentionUser.name}]</span>
        {annotation.resolved && <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success-foreground">Resolved</span>}
        <button type="button" aria-label="Close comment" onClick={onClose} className="rounded-[4px] p-0.5 hover:bg-foreground/10"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="max-h-[320px] overflow-auto bg-warning/10 p-2.5">
        {editing ? (
          <div className="space-y-2">
            <MentionInput value={draft} onChange={setDraft} onSubmit={saveBody} autoFocus />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setDraft(body); setEditing(false); if (!body) onDelete(); }}>Cancel</Button>
              <Button size="sm" onClick={saveBody}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-[10px] bg-background p-2.5 text-xs text-foreground">
              <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-foreground">{initialsOf(annotation.author ?? currentMentionUser.name)}</span>
                <span className="font-semibold text-foreground">{annotation.author ?? currentMentionUser.name}</span>
                <span>{timeLabel(annotation.createdAt)}</span>
              </div>
              <MentionText text={body} />
            </div>
            {replies.map((reply) => (
              <div key={reply.id} className="ml-4 rounded-[10px] border-l-2 border-primary/40 bg-background p-2.5 text-xs text-foreground">
                <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CornerDownRight className="h-3 w-3" />
                  <span className="font-semibold text-foreground">{reply.author}</span>
                  <span>{timeLabel(reply.createdAt)}</span>
                </div>
                <MentionText text={reply.text} />
              </div>
            ))}
            {replyOpen ? (
              <div className="space-y-2">
                {replyOptions.length > 1 && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Reply as</span>
                    <select
                      value={replyAs}
                      onChange={(event) => setReplyAs(event.target.value)}
                      className="h-7 flex-1 rounded-[8px] border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {replyOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                )}
                <MentionInput value={replyDraft} onChange={setReplyDraft} onSubmit={addReply} placeholder="Reply. Type @ to tag a teammate." autoFocus rows={2} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setReplyDraft(''); setReplyOpen(false); }}>Cancel</Button>
                  <Button size="sm" onClick={addReply}>Reply</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1 border-t border-warning/40 pt-2">
                <Button size="sm" variant="ghost" className="[&_svg]:size-3.5" onClick={() => setReplyOpen(true)}><Reply />Reply</Button>
                <Button size="sm" variant="ghost" className="[&_svg]:size-3.5" onClick={() => { setDraft(body); setEditing(true); }}><Pencil />Edit</Button>
                <Button size="sm" variant="ghost" className="[&_svg]:size-3.5" onClick={() => onChange({ resolved: !annotation.resolved })}><Check />{annotation.resolved ? 'Reopen' : 'Resolve'}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 [&_svg]:size-3.5" onClick={onDelete} aria-label="Delete comment"><Trash2 /></Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
