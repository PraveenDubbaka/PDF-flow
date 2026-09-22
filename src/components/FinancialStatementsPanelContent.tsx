import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Trash2, Files, ChevronDown, MoreVertical, Copy, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlusIcon, FolderMinusIcon } from "@/components/icons/FolderIcons";
import { FinancialStatementsIcon } from "@/components/icons/FinancialStatementsIcon";
import {
 myTemplatesByEntity,
 myCanadaTemplatesByEntity,
 globalTemplatesByEntity,
 US_ENTITY_TYPES,
 CA_ENTITY_TYPES,
 type MenuItem,
} from "@/components/dashboard/templates/TemplateSidebarMenu";
import { cn } from "@/lib/utils";

interface Props {
 isCollapsed?: boolean;
 hasDarkSecondary?: boolean;
}

const COUNTRIES = [
 { code: "US", flag: "🇺🇸", label: "United States" },
 { code: "Canada", flag: "🇨🇦", label: "Canada" },
];

function collectAllFolderCodes(items: MenuItem[]): string[] {
 const codes: string[] = [];
 for (const item of items) {
 if (item.type === "folder") {
 codes.push(item.code || item.label);
 if (item.children) codes.push(...collectAllFolderCodes(item.children));
 }
 }
 return codes;
}

function collectAllLeafLabels(items: MenuItem[]): string[] {
 const labels: string[] = [];
 for (const item of items) {
 if (item.type !== "folder") {
 labels.push(item.label);
 } else if (item.children) {
 labels.push(...collectAllLeafLabels(item.children));
 }
 }
 return labels;
}


export function FinancialStatementsPanelContent({ isCollapsed, hasDarkSecondary }: Props) {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<"my" | "global">("my");
 const [selectedCountry, setSelectedCountry] = useState("US");
 const [selectedEntityType, setSelectedEntityType] = useState("C-Corp");
 const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["COMP", "GCOMP"]));
 const [selectedItem, setSelectedItem] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [countryOpen, setCountryOpen] = useState(false);
 const [entityOpen, setEntityOpen] = useState(false);

 // Inline rename state
 const [editingLabel, setEditingLabel] = useState<string | null>(null);
 const [editValue, setEditValue] = useState("");

 // Checked items (leaf labels)
 const [checkedMy, setCheckedMy] = useState<Set<string>>(new Set());
 const [checkedGlobal, setCheckedGlobal] = useState<Set<string>>(new Set());

 // My Templates — mutable local state initialized from static defaults
 const initialMy = {...myTemplatesByEntity,...myCanadaTemplatesByEntity };
 const [myState, setMyState] = useState<Record<string, MenuItem[]>>(initialMy);

 const entityTypes = selectedCountry === "US" ? US_ENTITY_TYPES : CA_ENTITY_TYPES;

 const entityKey =
 selectedEntityType === "Trust"
 ? "Trusts"
 : selectedEntityType === "Partnership" && selectedCountry !== "US"
 ? "Partnerships"
 : selectedEntityType;

 const myData: MenuItem[] = myState[selectedEntityType] ?? [];
 const globalData: MenuItem[] = globalTemplatesByEntity[entityKey] ?? globalTemplatesByEntity["C-Corp"] ?? [];
 const activeData = activeTab === "my" ? myData : globalData;
 const activeChecked = activeTab === "my" ? checkedMy : checkedGlobal;

 const allFolderCodes = collectAllFolderCodes(activeData);
 const allExpanded = allFolderCodes.length > 0 && allFolderCodes.every(c => expandedFolders.has(c));

 const handleExpandCollapseAll = () => {
 if (allExpanded) {
 setExpandedFolders(prev => {
 const next = new Set(prev);
 allFolderCodes.forEach(c => next.delete(c));
 return next;
 });
 } else {
 setExpandedFolders(prev => new Set([...prev,...allFolderCodes]));
 }
 };

 const toggleFolder = (code: string) => {
 setExpandedFolders(prev => {
 const next = new Set(prev);
 next.has(code) ? next.delete(code) : next.add(code);
 return next;
 });
 };

 // Folder checkbox: checked if all leaf descendants checked, indeterminate if some
 const isFolderChecked = (folder: MenuItem, checked: Set<string>) => {
 const leaves = collectAllLeafLabels([folder]);
 if (leaves.length === 0) return false;
 return leaves.every(l => checked.has(l));
 };
 const isFolderIndeterminate = (folder: MenuItem, checked: Set<string>) => {
 const leaves = collectAllLeafLabels([folder]);
 const count = leaves.filter(l => checked.has(l)).length;
 return count > 0 && count < leaves.length;
 };

 const handleFolderCheckbox = (folder: MenuItem, value: boolean, tab: "my" | "global") => {
 const leaves = collectAllLeafLabels([folder]);
 const setFn = tab === "my" ? setCheckedMy : setCheckedGlobal;
 setFn(prev => {
 const next = new Set(prev);
 leaves.forEach(l => value ? next.add(l) : next.delete(l));
 return next;
 });
 };

 const handleLeafCheckbox = (label: string, value: boolean, tab: "my" | "global") => {
 const setFn = tab === "my" ? setCheckedMy : setCheckedGlobal;
 setFn(prev => {
 const next = new Set(prev);
 value ? next.add(label) : next.delete(label);
 return next;
 });
 };

 // Delete selected My Templates items
 const handleDeleteSelected = () => {
 if (checkedMy.size === 0) return;
 const pruneItems = (items: MenuItem[]): MenuItem[] =>
 items
.map(item => {
 if (item.type === "folder") {
 return {...item, children: pruneItems(item.children ?? []) };
 }
 return checkedMy.has(item.label) ? null : item;
 })
.filter(Boolean) as MenuItem[];

 setMyState(prev => ({
...prev,
 [selectedEntityType]: pruneItems(prev[selectedEntityType] ?? []),
 }));
 setCheckedMy(new Set());
 };

 // Copy selected global items to My Templates
 const handleCopyToMy = () => {
 if (checkedGlobal.size === 0) return;
 const collectChecked = (items: MenuItem[]): MenuItem[] => {
 const result: MenuItem[] = [];
 for (const item of items) {
 if (item.type !== "folder" && checkedGlobal.has(item.label)) {
 result.push({...item });
 } else if (item.type === "folder" && item.children) {
 result.push(...collectChecked(item.children));
 }
 }
 return result;
 };
 const newItems = collectChecked(globalData);
 if (newItems.length === 0) return;

 setMyState(prev => {
 const current = prev[selectedEntityType] ?? [];
 const addFolder = current.find(f => f.code === "COMP") ?? {
 code: "MY",
 label: "My Templates",
 type: "folder" as const,
 children: [],
 };
 const updatedFolder: MenuItem = {
...addFolder,
 children: [...(addFolder.children ?? []),...newItems],
 };
 const rest = current.filter(f => f.code !== addFolder.code);
 return {...prev, [selectedEntityType]: [updatedFolder,...rest] };
 });
 setCheckedGlobal(new Set());
 setActiveTab("my");
 };

 const handleSelectItem = (label: string) => {
 setSelectedItem(label);
 const source = activeTab === "my" ? "&source=my" : "";
 navigate(`/financial-statement-templates?template=${encodeURIComponent(label)}${source}`);
 };

 // Duplicate a leaf item in My Templates
 const handleDuplicate = (label: string) => {
 const dupeItem = (items: MenuItem[]): MenuItem[] =>
 items.flatMap(item => {
 if (item.type === "folder") return [{...item, children: dupeItem(item.children ?? []) }];
 if (item.label === label) return [item, {...item, label: `${item.label} (Copy)`, code: `${item.code}_copy` }];
 return [item];
 });
 setMyState(prev => ({...prev, [selectedEntityType]: dupeItem(prev[selectedEntityType] ?? []) }));
 };

 // Delete a single leaf by label
 const handleDeleteOne = (label: string) => {
 const pruneOne = (items: MenuItem[]): MenuItem[] =>
 items
.map(item => {
 if (item.type === "folder") return {...item, children: pruneOne(item.children ?? []) };
 return item.label === label ? null : item;
 })
.filter(Boolean) as MenuItem[];
 setMyState(prev => ({...prev, [selectedEntityType]: pruneOne(prev[selectedEntityType] ?? []) }));
 setCheckedMy(prev => { const n = new Set(prev); n.delete(label); return n; });
 };

 // Rename a leaf item in My Templates
 const handleStartRename = (label: string) => {
 setEditingLabel(label);
 setEditValue(label);
 };

 const handleCommitRename = (oldLabel: string) => {
 const newLabel = editValue.trim();
 if (!newLabel || newLabel === oldLabel) {
 setEditingLabel(null);
 return;
 }
 const renameIn = (items: MenuItem[]): MenuItem[] =>
 items.map(item => {
 if (item.type === "folder") return {...item, children: renameIn(item.children ?? []) };
 return item.label === oldLabel ? {...item, label: newLabel } : item;
 });
 setMyState(prev => ({...prev, [selectedEntityType]: renameIn(prev[selectedEntityType] ?? []) }));
 if (selectedItem === oldLabel) setSelectedItem(newLabel);
 setCheckedMy(prev => {
 const n = new Set(prev);
 if (n.has(oldLabel)) { n.delete(oldLabel); n.add(newLabel); }
 return n;
 });
 setEditingLabel(null);
 };

 if (isCollapsed) return null;

 const tabClass = (tab: "my" | "global") =>
 `flex-1 py-2 px-1 text-sm font-medium transition-all text-center whitespace-nowrap border-b-[3px] ${
 activeTab === tab
 ? hasDarkSecondary
 ? "text-white border-white"
 : "text-primary border-primary"
 : (hasDarkSecondary
 ? "text-white/50 hover:text-white/80"
 : "text-muted-foreground hover:text-foreground") + " border-transparent"
 }`;

 const expandIcon = allExpanded ? (
 <svg width="15" height="15" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M9.72214 6.94412L14.5833 2.08301M14.5833 2.08301H10.4166M14.5833 2.08301V6.24967M6.94436 9.7219L2.08325 14.583M2.08325 14.583H6.24992M2.08325 14.583L2.08325 10.4163"
 stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 ) : (
 <svg width="15" height="15" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M2.08325 6.94412L2.08325 2.08301M2.08325 2.08301L6.24992 2.08301M2.08325 2.08301L6.94436 6.94412M14.5833 9.7219L14.5833 14.583M14.5833 14.583L10.4166 14.583M14.5833 14.583L9.72214 9.7219"
 stroke={hasDarkSecondary ? "white" : "#074075"} strokeWidth="1.38889" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 );

 // Render tree item with checkbox — matches renderTemplate/renderGlobalTemplate styles exactly
 const renderItem = (item: MenuItem, depth = 0, tab: "my" | "global"): React.ReactNode => {
 const folderKey = item.code || item.label;
 const isExpanded = expandedFolders.has(folderKey);
 const isFolder = item.type === "folder";
 const hasChildren = (item.children?.length ?? 0) > 0;
 const isSelected = selectedItem === item.label;
 const folderChecked = isFolder ? isFolderChecked(item, activeChecked) : false;
 const folderIndet = isFolder ? isFolderIndeterminate(item, activeChecked) : false;
 const leafChecked = !isFolder && activeChecked.has(item.label);

 if (searchQuery) {
 const matchesSelf = item.label.toLowerCase().includes(searchQuery.toLowerCase());
 const childrenMatch = hasChildren && item.children!.some(c => c.label.toLowerCase().includes(searchQuery.toLowerCase()));
 if (!matchesSelf && !childrenMatch) return null;
 }

 return (
 <div key={folderKey + depth}>
 <div
 className={cn(
 "group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
 isSelected && !isFolder
 ? "bg-primary/10 text-primary ring-1 ring-primary/25"
 : hasDarkSecondary ? "hover:bg-white/10 text-white" : "hover:bg-muted text-foreground"
 )}
 style={{ paddingLeft: depth > 0 ? `${depth * 16 + 8}px` : undefined }}
 onClick={() => isFolder ? toggleFolder(folderKey) : handleSelectItem(item.label)}
 >
 {/* Checkbox */}
 <Checkbox
 checked={isFolder ? (folderIndet ? "indeterminate" : folderChecked) : leafChecked}
 onCheckedChange={val => {
 if (isFolder) handleFolderCheckbox(item, !!val, tab);
 else handleLeafCheckbox(item.label, !!val, tab);
 }}
 onClick={e => e.stopPropagation()}
 className="h-4 w-4 flex-shrink-0"
 />

 {/* Icon */}
 {isFolder ? (
 hasChildren && isExpanded
 ? <FolderMinusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 : <FolderPlusIcon className="h-4 w-4 text-primary flex-shrink-0" />
 ) : (
 <FinancialStatementsIcon className="h-4 w-4 flex-shrink-0 text-emerald-500" />
 )}

 {/* Label — inline rename input when editing */}
 {tab === "my" && !isFolder && editingLabel === item.label ? (
 <input
 autoFocus
 value={editValue}
 onChange={e => setEditValue(e.target.value)}
 onBlur={() => handleCommitRename(item.label)}
 onKeyDown={e => {
 if (e.key === "Enter") handleCommitRename(item.label);
 if (e.key === "Escape") setEditingLabel(null);
 }}
 onClick={e => e.stopPropagation()}
 className={cn(
 "flex-1 min-w-0 text-sm font-semibold bg-transparent border-b outline-none px-0",
 hasDarkSecondary ? "text-white border-white/40" : "text-foreground border-primary"
 )}
 />
 ) : (
 <span className="truncate flex-1 font-semibold">{item.label}</span>
 )}

 {/* Folder child count */}
 {isFolder && hasChildren && (
 <span className={cn("text-xs shrink-0", hasDarkSecondary ? "text-white/40" : "text-muted-foreground")}>
 {item.children!.length}
 </span>
 )}

 {/* Context menu for My Templates file items */}
 {tab === "my" && !isFolder && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
 <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted-foreground/10 rounded transition-opacity shrink-0">
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-48">
 <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStartRename(item.label); }} className="gap-2 cursor-pointer">
 <Pencil className="h-4 w-4 text-primary" />
 Rename
 </DropdownMenuItem>
 <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDuplicate(item.label); }} className="gap-2 cursor-pointer">
 <Copy className="h-4 w-4 text-primary icon-copy" />
 Duplicate
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDeleteOne(item.label); }} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
 <Trash2 className="h-4 w-4 icon-trash" />
 Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}
 </div>

 {/* Children */}
 {isFolder && isExpanded && hasChildren && (
 <div>
 {item.children!.map((child, i) => renderItem(child, depth + 1, tab))}
 </div>
 )}
 </div>
 );
 };

 const selectedCountryObj = COUNTRIES.find(c => c.code === selectedCountry) ?? COUNTRIES[0];

 return (
 <>
 {/* Country + entity compact pickers — sits directly below the Financial Statements dropdown */}
 <div className="px-3 pb-2 flex gap-2 relative">
 {/* Flag-only country picker */}
 <div className="relative shrink-0 self-stretch flex">
 <button
 onClick={() => { setCountryOpen(v => !v); setEntityOpen(false); }}
 className={cn(
 "px-2 rounded-lg text-sm flex items-center justify-center border shadow-sm w-full",
 hasDarkSecondary ? "bg-white/10 border-white/20" : "bg-card/80 border-border"
 )}
 style={{ minWidth: 36 }}
 title={selectedCountryObj.label}
 >
 <span>{selectedCountryObj.flag}</span>
 </button>
 {countryOpen && (
 <div className={cn(
 "absolute left-0 z-50 mt-1 rounded-lg border shadow-lg overflow-hidden",
 hasDarkSecondary ? "bg-[#1a2a3a] border-white/20" : "bg-card border-border"
 )} style={{ minWidth: 150 }}>
 {COUNTRIES.map(c => (
 <button
 key={c.code}
 className={cn(
 "w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors",
 hasDarkSecondary ? "hover:bg-white/10 text-white" : "hover:bg-muted text-foreground",
 c.code === selectedCountry && (hasDarkSecondary ? "bg-white/15" : "bg-primary/5 text-primary")
 )}
 onClick={() => {
 setSelectedCountry(c.code);
 setSelectedEntityType(c.code === "US" ? "C-Corp" : "Corporations");
 setCountryOpen(false);
 setExpandedFolders(new Set(["COMP", "GCOMP"]));
 }}
 >
 <span>{c.flag}</span>
 <span>{c.label}</span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Entity type picker */}
 <div className="relative flex-1">
 <button
 onClick={() => { setEntityOpen(v => !v); setCountryOpen(false); }}
 className={cn(
 "w-full px-2.5 py-1.5 rounded-lg text-sm flex items-center justify-between border shadow-sm",
 hasDarkSecondary ? "bg-white/10 border-white/20 text-white" : "bg-card/80 border-border text-foreground"
 )}
 >
 <span className="truncate">{selectedEntityType}</span>
 <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-1 text-muted-foreground" />
 </button>
 {entityOpen && (
 <div className={cn(
 "absolute left-0 right-0 z-50 mt-1 rounded-lg border shadow-lg overflow-hidden max-h-48 overflow-y-auto",
 hasDarkSecondary ? "bg-[#1a2a3a] border-white/20" : "bg-card border-border"
 )}>
 {entityTypes.map(e => (
 <button
 key={e}
 className={cn(
 "w-full px-3 py-2 text-sm text-left transition-colors",
 hasDarkSecondary ? "hover:bg-white/10 text-white" : "hover:bg-muted text-foreground",
 e === selectedEntityType && (hasDarkSecondary ? "bg-white/15" : "bg-primary/5 text-primary")
 )}
 onClick={() => {
 setSelectedEntityType(e);
 setEntityOpen(false);
 setExpandedFolders(new Set(["COMP", "GCOMP"]));
 }}
 >
 {e}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Tabs */}
 <div
 className="flex mb-2"
 style={{
 borderBottom: hasDarkSecondary
 ? "1px solid rgba(255,255,255,0.15)"
 : "1px solid hsl(var(--border))",
 }}
 >
 <button onClick={() => setActiveTab("my")} className={tabClass("my")}>
 My Templates
 </button>
 <button onClick={() => setActiveTab("global")} className={tabClass("global")}>
 Global Templates
 </button>
 </div>

 {/* Toolbar */}
 <div className="p-3 pt-0 pb-2">
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")} />
 <Input
 placeholder="Search"
 className={cn("pl-8 h-8 text-sm border-0 shadow-sm", hasDarkSecondary ? "bg-white/10 text-white placeholder:text-white/40" : "bg-card/80")}
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>

 <Tooltip>
 <TooltipTrigger asChild>
 <button
 className={cn("h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0", hasDarkSecondary ? "bg-white/10 hover:bg-white/20" : "bg-primary/10 hover:bg-primary/20")}
 onClick={handleExpandCollapseAll}
 >
 {expandIcon}
 </button>
 </TooltipTrigger>
 <TooltipContent>{allExpanded ? "Collapse All" : "Expand All"}</TooltipContent>
 </Tooltip>

 {activeTab === "my" && (
 <>
 <Button size="icon" className="h-8 w-8 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm flex-shrink-0">
 <Plus className="h-4 w-4 text-primary-foreground icon-plus" />
 </Button>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 size="icon"
 variant="secondary"
 className="h-8 w-8 text-destructive hover:text-destructive focus-visible:text-destructive flex-shrink-0"
 disabled={checkedMy.size === 0}
 onClick={handleDeleteSelected}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>
 {checkedMy.size > 0 ? `Delete ${checkedMy.size} selected` : "Select items to delete"}
 </TooltipContent>
 </Tooltip>
 </>
 )}

 {activeTab === "global" && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 size="icon"
 className="h-8 w-8 bg-[#1C63A6] hover:bg-[#1a5a9e] shadow-sm flex-shrink-0"
 disabled={checkedGlobal.size === 0}
 onClick={handleCopyToMy}
 >
 <Files className="h-4 w-4 text-primary-foreground" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>
 {checkedGlobal.size > 0 ? `Add ${checkedGlobal.size} selected to My Templates` : "Select templates to add"}
 </TooltipContent>
 </Tooltip>
 )}
 </div>
 </div>

 {/* Template tree */}
 <div className="flex-1 overflow-y-auto px-2 pb-2">
 {activeData.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-24 gap-2 text-center px-4">
 <p className={cn("text-sm", hasDarkSecondary ? "text-white/50" : "text-muted-foreground")}>
 No templates for this selection
 </p>
 </div>
 ) : (
 activeData.map((item, idx) => renderItem(item, 0, activeTab))
 )}
 </div>
 </>
 );
}
