import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { templateTree, type TreeItem, type MyEngagementTemplate } from "@/lib/engagementTemplatesData";
import { FolderSolidIcon } from "@/components/icons/FolderIcons";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { readJsonFromLocalStorage } from "@/lib/safeJson";

function treeHasMatch(item: TreeItem, q: string): boolean {
 if (item.type === "file") return item.label.toLowerCase().includes(q);
 return item.children?.some(c => treeHasMatch(c, q)) ?? false;
}

function TreeNodes({
 items,
 depth,
 search,
 expanded,
 toggle,
 onSelect,
 suggestedTemplateId,
}: {
 items: TreeItem[];
 depth: number;
 search: string;
 expanded: Set<string>;
 toggle: (id: string) => void;
 onSelect: (id: string, name: string) => void;
 suggestedTemplateId?: string;
}) {
 return (
 <>
 {items.map(item => {
 if (item.type === "folder") {
 if (search && !treeHasMatch(item, search)) return null;
 const isOpen = expanded.has(item.id);
 return (
 <div key={item.id}>
 <div
 className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm font-semibold select-none"
 style={{ paddingLeft: `${8 + depth * 14}px` }}
 onClick={() => toggle(item.id)}
 >
 <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isOpen ? "rotate-0" : "-rotate-90")} />
 <FolderSolidIcon className="h-4 w-4 text-primary shrink-0" />
 <span className="truncate flex-1">{item.label}</span>
 </div>
 {isOpen && item.children && (
 <TreeNodes items={item.children} depth={depth + 1} search={search} expanded={expanded} toggle={toggle} onSelect={onSelect} suggestedTemplateId={suggestedTemplateId} />
 )}
 </div>
 );
 }
 if (search && !item.label.toLowerCase().includes(search)) return null;
 const isSuggested = suggestedTemplateId ? item.id === suggestedTemplateId : item.suggested;
 return (
 <div
 key={item.id}
 className="flex items-center gap-2 py-1.5 pr-2 rounded-md cursor-pointer hover:bg-primary/10 text-sm select-none"
 style={{ paddingLeft: `${22 + depth * 14}px` }}
 onClick={() => onSelect(item.id, item.label)}
 >
 <ChecklistIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
 <span className="truncate flex-1">{item.label}</span>
 {isSuggested && (
 <span className="shrink-0 rounded-full bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 font-medium">
 Suggested
 </span>
 )}
 </div>
 );
 })}
 </>
 );
}

export function TemplatePickerPanel({
 open,
 onClose,
 onSelect,
 suggestedTemplateId,
}: {
 open: boolean;
 onClose: () => void;
 onSelect: (id: string, name: string) => void;
 suggestedTemplateId?: string;
}) {
 const [tab, setTab] = useState<"global" | "my">("global");
 const [search, setSearch] = useState("");
 const [expanded, setExpanded] = useState<Set<string>>(
 new Set(["audit", "audit-ca", "compilation", "review"])
 );

 const myTemplates = readJsonFromLocalStorage<MyEngagementTemplate[]>("myEngagementTemplates", []);
 const q = search.toLowerCase();

 const toggle = (id: string) =>
 setExpanded(prev => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });

 if (!open) return null;

 return (
 <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-xl z-50 flex flex-col">
 <div className="flex items-center justify-between px-4 py-3 border-b border-border">
 <span className="font-semibold text-foreground">Select Engagement template</span>
 <button onClick={onClose} className="p-1 hover:bg-muted rounded">
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="flex border-b border-border">
 {(["my", "global"] as const).map(t => (
 <button
 key={t}
 onClick={() => setTab(t)}
 className={cn(
 "flex-1 py-2 text-sm font-medium transition-all border-b-2",
 tab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
 )}
 >
 {t === "global" ? "Global Templates" : "My Templates"}
 </button>
 ))}
 </div>

 <div className="px-3 py-2 border-b border-border/40">
 <div className="relative">
 <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="none">
 <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
 <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
 </svg>
 <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-8 h-7 text-sm" />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-2">
 {tab === "global" ? (
 <TreeNodes items={templateTree} depth={0} search={q} expanded={expanded} toggle={toggle} onSelect={(id, name) => { onSelect(id, name); onClose(); }} suggestedTemplateId={suggestedTemplateId} />
 ) : myTemplates.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-8">No custom templates yet</p>
 ) : (
 myTemplates
.filter(t => !q || t.name.toLowerCase().includes(q))
.map(t => (
 <div
 key={t.id}
 className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-primary/10 text-sm select-none"
 onClick={() => { onSelect("", t.name); onClose(); }}
 >
 <ChecklistIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
 <span className="truncate">{t.name}</span>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
