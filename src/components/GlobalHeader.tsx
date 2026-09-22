import { useState, useEffect } from "react";
import userAvatar from "@/assets/user-avatar.png";
import { Bell, User, Moon, Sun, Zap, UserCircle, Building2, Settings, CreditCard, Monitor, Gift, LogOut, Check, Trash2, Search, MoreVertical, Type, ChevronDown, LayoutGrid, Clock, Eye } from "lucide-react";
import { subscribeEnabled, getEnabled, subscribeEngagements, getEngagements, type TrackedEngagement, logEngagementTime } from "@/lib/timeTrackerStore";
import { toast } from "sonner";
import { LukaIcon } from "@/components/LukaIcon";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Input as SearchInput } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AskLukaOverlay } from "@/components/AskLukaOverlay";
import { TimeTrackerModal } from "@/components/TimeTrackerModal";
import { subscribeLukaOpen, getLukaOpen, setLukaOpen, openLukaWithConfig } from "@/lib/lukaOpenStore";
import { getGlobalPBCNotifications, markGlobalPBCNotificationRead, type GlobalPBCNotification } from "@/lib/pbcRequestStore";

export function GlobalHeader({ title, headerContent }: { title?: string; headerContent?: React.ReactNode }) {
 const navigate = useNavigate();
 const { isDarkMode, toggleTheme } = useThemeContext();
 const [askLukaQuery, setAskLukaQuery] = useState("");
 const [settingsOpen, setSettingsOpen] = useState(false);
 const [settingsFirmNav, setSettingsFirmNav] = useState<{ tab: string; addOffice: boolean } | null>(null);
 const [askLukaOpen, setAskLukaOpen] = useState(() => getLukaOpen());
 const [notificationsEnabled, setNotificationsEnabled] = useState(true);
 const [notifSearch, setNotifSearch] = useState("");
 const [notifOpen, setNotifOpen] = useState(false);
 const [ttEnabled, setTtEnabled] = useState(() => getEnabled());
 const [ttEngagements, setTtEngagements] = useState<Map<string, TrackedEngagement>>(() => getEngagements());
 const [ttOpen, setTtOpen] = useState(false);
 const [ttSelected, setTtSelected] = useState<Set<string>>(new Set());
 const [ttModalOpen, setTtModalOpen] = useState(false);

 // Font size accessibility state
 type FontSize = 'A' | 'AA' | 'AAA';
 const fontSizes: FontSize[] = ['A', 'AA', 'AAA'];
 const [fontSize, setFontSize] = useState<FontSize>(() => {
 if (typeof window !== 'undefined') {
 return (localStorage.getItem('luka-font-size') as FontSize) || 'A';
 }
 return 'A';
 });

 useEffect(() => {
 const root = document.documentElement;
 root.classList.remove('font-size-a', 'font-size-aa', 'font-size-aaa');
 root.classList.add(`font-size-${fontSize.toLowerCase()}`);
 localStorage.setItem('luka-font-size', fontSize);
 }, [fontSize]);

 useEffect(() => {
 return subscribeLukaOpen((open) => setAskLukaOpen(open));
 }, []);

 useEffect(() => subscribeEnabled(setTtEnabled), []);
 useEffect(() => subscribeEngagements(setTtEngagements), []);

 useEffect(() => {
  const handler = (e: Event) => {
   const detail = (e as CustomEvent).detail ?? {};
   setSettingsFirmNav({ tab: "firm-info", addOffice: !!detail.showAddOffice });
   setSettingsOpen(true);
  };
  window.addEventListener("open-settings-firm-info", handler);
  return () => window.removeEventListener("open-settings-firm-info", handler);
 }, []);

 const fmtTrackerTime = (s: number) => {
 const h = Math.floor(s / 3600).toString().padStart(2, '0');
 const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
 const sec = (s % 60).toString().padStart(2, '0');
 return `${h}h:${m}m:${sec}s`;
 };

 const ttList = Array.from(ttEngagements.values());
 const trackedCount = ttList.length;

 const cycleFontSize = () => {
 setFontSize(prev => {
 const idx = fontSizes.indexOf(prev);
 return fontSizes[(idx + 1) % fontSizes.length];
 });
 };
 
 type AppNotif = {
 id: string;
 sender: string;
 initials: string;
 message: string;
 read: boolean;
 time: string;
 pbcMeta?: { engagementId: string; threadId: string };
 };

 const [notifications, setNotifications] = useState<AppNotif[]>([
 { id: '1', sender: 'Cpt Group', initials: 'CG', message: 'New engagement created Cpt Group', read: false, time: '2m ago' },
 { id: '2', sender: 'Cpt Group', initials: 'CG', message: '1 team members added', read: false, time: '5m ago' },
 { id: '3', sender: 'Cpt Group', initials: 'CG', message: 'New engagement created Cpt Group', read: true, time: '1h ago' },
 { id: '4', sender: 'Cpt Group', initials: 'CG', message: '1 team members added', read: true, time: '2h ago' },
 { id: '5', sender: 'Cpt Group', initials: 'CG', message: 'You have been assigned as the packager for Cpt Group', read: true, time: '3h ago' },
 { id: '6', sender: 'Cpt Group', initials: 'CG', message: 'New engagement created Cpt Group', read: true, time: '5h ago' },
 ]);

 useEffect(() => {
 const handler = (e: Event) => {
 const n = (e as CustomEvent).detail as GlobalPBCNotification;
 setNotifications(prev => [{
 id: n.id,
 sender: n.clientName,
 initials: n.clientName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(),
 message: `responded to your PBC request — click to review`,
 read: false,
 time: 'just now',
 pbcMeta: { engagementId: n.engagementId, threadId: n.threadId },
 }, ...prev]);
 };
 window.addEventListener('global-pbc-notification', handler);
 return () => window.removeEventListener('global-pbc-notification', handler);
 }, []);

 const unreadCount = notifications.filter(n => !n.read).length;

 const handleMarkAllRead = () => {
 setNotifications(prev => prev.map(n => ({...n, read: true })));
 };

 const handleDeleteAll = () => {
 setNotifications([]);
 };

 const filteredNotifications = notifications.filter(n =>
 n.message.toLowerCase().includes(notifSearch.toLowerCase()) ||
 n.sender.toLowerCase().includes(notifSearch.toLowerCase())
 );
 return (
 <>
 <header className="flex items-center px-6 bg-transparent text-sidebar-foreground" style={{ height: '3.4rem' }}>
 {/* Left side - Page title */}
 <div className="flex-1 flex items-center gap-3">
 {title && (
 <h1 className="text-xl font-bold text-sidebar-foreground">{title}</h1>
 )}
 {headerContent}
 </div>


 {/* Right side - Credits, Theme, Notifications, Profile */}
 <div className="flex-1 flex items-center justify-end gap-3">

 {/* Ask Luka Button */}
 <Button 
 className="h-8 px-3 rounded-full bg-gradient-to-r from-[#1C63A6] to-[#7A31D8] hover:from-[#1a5a96] hover:to-[#6a2bc2] text-white text-xs font-medium gap-1.5 shadow-md"
 onClick={() => setAskLukaOpen(true)}
 >
 <LukaIcon size={20} bare animated />
 Luka
 </Button>

 {/* Font size accessibility toggle */}
 <Tooltip>
 <TooltipTrigger asChild>
 <div 
 className="flex items-center justify-center h-9 px-2 rounded-xl cursor-pointer hover:bg-white/10 transition-colors gap-0.5"
 style={{ borderRadius: '12px' }}
 onClick={cycleFontSize}
 >
 {fontSizes.map((size) => (
 <span
 key={size}
 className={`font-semibold transition-all duration-200 ${
 fontSize === size 
 ? 'text-white' 
 : 'text-white/40'
 }`}
 style={{ fontSize: size === 'A' ? '11px' : size === 'AA' ? '13px' : '15px' }}
 >
 A
 </span>
 ))}
 </div>
 </TooltipTrigger>
 <TooltipContent>Font Size: {fontSize === 'A' ? 'Default' : fontSize === 'AA' ? 'Medium' : 'Large'}</TooltipContent>
 </Tooltip>

 {/* Theme toggle */}
 <Tooltip>
 <TooltipTrigger asChild>
 <div 
 className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
 style={{ borderRadius: '12px' }}
 onClick={toggleTheme}
 >
 <div className="relative w-5 h-5">
 <Sun className={`h-5 w-5 text-amber-300 absolute transition-all duration-500 ${
 isDarkMode 
 ? 'rotate-0 scale-100 opacity-100' 
 : 'rotate-90 scale-0 opacity-0'
 }`} />
 <Moon className={`h-5 w-5 text-white/80 absolute transition-all duration-500 ${
 isDarkMode 
 ? '-rotate-90 scale-0 opacity-0' 
 : 'rotate-0 scale-100 opacity-100'
 }`} />
 </div>
 </div>
 </TooltipTrigger>
 <TooltipContent>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
 </Tooltip>

 {/* Time Tracker — shown only when enabled */}
 {ttEnabled && (
 <Popover open={ttOpen} onOpenChange={setTtOpen}>
 <PopoverTrigger asChild>
 <div
 className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer hover:bg-white/10 transition-colors relative"
 style={{ borderRadius: '12px' }}
 >
 <Clock className="h-5 w-5 text-white/80" />
 {trackedCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 text-[9px] text-[#0C2D55] flex items-center justify-center font-bold">{trackedCount}</span>
 )}
 </div>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-[580px] p-0 bg-card border border-border shadow-xl" style={{ borderRadius: '12px' }}>
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-border">
 <span className="text-sm font-semibold text-foreground">Time Tracker</span>
 <button
 onClick={() => { setTtModalOpen(true); setTtOpen(false); }}
 className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
 >
 <Eye className="h-3.5 w-3.5" />
 View Time Tracker ({trackedCount})
 </button>
 </div>
 {/* Column headers */}
 <div className="grid grid-cols-[1fr_110px_110px_85px] items-center gap-3 px-4 py-2 border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
 <span>Team Member</span>
 <span className="text-center">Active Time</span>
 <span className="text-center">Idle Time</span>
 <span />
 </div>
 {/* Rows */}
 <div className="max-h-64 overflow-y-auto">
 {ttList.length === 0 ? (
 <div className="px-4 py-8 text-center text-sm text-muted-foreground">
 No engagements being tracked. Open an engagement to start tracking.
 </div>
 ) : (
 ttList.map(eng => (
 <div
 key={eng.id}
 className="grid grid-cols-[1fr_110px_110px_85px] items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors"
 >
 <div className="flex items-center gap-2 min-w-0">
 <input
 type="checkbox"
 checked={ttSelected.has(eng.id)}
 onChange={(e) => {
 setTtSelected(prev => {
 const next = new Set(prev);
 e.target.checked ? next.add(eng.id) : next.delete(eng.id);
 return next;
 });
 }}
 className="h-3.5 w-3.5 rounded shrink-0 cursor-pointer"
 />
 <div className="min-w-0">
 <p className="text-sm font-medium text-foreground truncate">Praveen D.</p>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-muted-foreground font-mono">{eng.id}</span>
 {eng.isRecording && <span className="text-[10px] text-emerald-500 font-medium">● Recording</span>}
 </div>
 </div>
 </div>
 <div className="flex items-center justify-center gap-1.5">
 {!eng.isIdle && eng.isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
 <span className={`font-mono text-xs font-semibold tabular-nums ${!eng.isIdle && eng.isRecording ? 'text-red-500' : 'text-foreground'}`}>
 {fmtTrackerTime(eng.activeSec)}
 </span>
 </div>
 <div className="flex items-center justify-center gap-1.5">
 {eng.isIdle && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
 <span className={`font-mono text-xs font-semibold tabular-nums ${eng.isIdle ? 'text-red-500' : 'text-foreground'}`}>
 {fmtTrackerTime(eng.idleSec)}
 </span>
 </div>
 <Button
 size="sm"
 className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-2"
 onClick={() => {
 logEngagementTime(eng.id);
 setTtSelected(prev => { const n = new Set(prev); n.delete(eng.id); return n; });
 toast.success('Time entry logged');
 }}
 >
 Log Time
 </Button>
 </div>
 ))
 )}
 </div>
 {/* Log All */}
 {ttSelected.size > 0 && (
 <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-primary/5">
 <span className="text-xs text-muted-foreground">{ttSelected.size} selected</span>
 <Button
 size="sm"
 className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
 onClick={() => {
 Array.from(ttSelected).forEach(id => logEngagementTime(id));
 setTtSelected(new Set());
 toast.success('All time entries logged');
 }}
 >
 Log All
 </Button>
 </div>
 )}
 {/* Footer */}
 <div className="px-4 py-2.5 border-t border-border/50 bg-muted/30">
 <p className="text-[11px] text-muted-foreground">
 <span className="font-semibold">Note*:</span> All outstanding accumulated time will be automatically logged into the time-tracker at 11:59 PM.
 </p>
 </div>
 </PopoverContent>
 </Popover>
 )}

 {/* Notifications */}
 <Popover open={notifOpen} onOpenChange={setNotifOpen}>
 <PopoverTrigger asChild>
 <div 
 className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer hover:bg-white/10 transition-colors relative"
 style={{ borderRadius: '12px' }}
 >
 <Bell className={`h-5 w-5 text-white/80 ${unreadCount > 0 ? 'animate-[swing_1.5s_ease-in-out_infinite]' : ''}`} />
 {unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-medium">{unreadCount}</span>
 )}
 </div>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-[380px] p-0 bg-card border border-border shadow-xl" style={{ borderRadius: '12px' }}>
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-border">
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-foreground">Notifications</span>
 <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} className="scale-75" />
 </div>
 </div>

 {/* Search + Actions */}
 <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
 <SearchInput
 value={notifSearch}
 onChange={(e) => setNotifSearch(e.target.value)}
 placeholder="Search"
 className="h-8 pl-8 text-xs"
 />
 </div>
 <button
 onClick={handleMarkAllRead}
 className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors whitespace-nowrap"
 >
 <Check className="h-3.5 w-3.5" />
 Mark All As Read
 </button>
 <button
 onClick={handleDeleteAll}
 className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors whitespace-nowrap"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Delete All
 </button>
 </div>

 {/* Notification List */}
 <ScrollArea className="max-h-[360px]">
 {filteredNotifications.length === 0 ? (
 <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
 No notifications
 </div>
 ) : (
 <div className="divide-y divide-border">
 {filteredNotifications.map((notif) => (
 <div
 key={notif.id}
 className={`flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
 onClick={() => {
 setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, read: true } : n));
 if (notif.pbcMeta) {
 markGlobalPBCNotificationRead(notif.id);
 setNotifOpen(false);
 openLukaWithConfig({ flow: 'pbc-request', engagementId: notif.pbcMeta.engagementId, threadId: notif.pbcMeta.threadId });
 }
 }}
 >
 <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
 <span className="text-[10px] font-semibold text-primary">{notif.initials}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-foreground">{notif.sender}</p>
 <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
 <span className="text-primary">Notified you:</span> {notif.message}
 </p>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 <span className="text-[10px] text-muted-foreground">{notif.time}</span>
 <button className="p-1 hover:bg-muted rounded transition-colors" onClick={(e) => e.stopPropagation()}>
 <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </ScrollArea>
 </PopoverContent>
 </Popover>

 {/* User Profile Dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 cursor-pointer hover:bg-white/15 transition-all duration-200 border border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" style={{ borderRadius: '12px' }}>
 {/* Avatar + online status dot */}
 <div className="relative flex-shrink-0">
 <img src={userAvatar} alt="User" className="w-7 h-7 rounded-full object-cover" />
 <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#0C2D55]" />
 </div>
 {/* Caret */}
 <ChevronDown className="h-3.5 w-3.5 text-white/70 flex-shrink-0" strokeWidth={3} />
 </div>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56">
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
 <UserCircle className="h-5 w-5 text-muted-foreground" />
 <span>My Account</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 className="gap-3 py-3 cursor-pointer"
 onClick={() => {
  setSettingsFirmNav({ tab: "firm-info", addOffice: false });
  setSettingsOpen(true);
 }}
 >
 <Building2 className="h-5 w-5 text-muted-foreground" />
 <span>Firm Profile</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem 
 className="gap-3 py-3 cursor-pointer"
 onClick={() => setSettingsOpen(true)}
 >
 <Settings className="h-5 w-5 text-muted-foreground" />
 <span>Settings</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
 <CreditCard className="h-5 w-5 text-muted-foreground" />
 <span>Billing</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
 <Monitor className="h-5 w-5 text-muted-foreground" />
 <span>Apps & Integrations</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer" onClick={() => navigate('/design-system')}>
 <LayoutGrid className="h-5 w-5 text-muted-foreground" />
 <span>Design System</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer">
 <Gift className="h-5 w-5 text-muted-foreground" />
 <span>What's New</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="gap-3 py-3 cursor-pointer text-destructive focus:text-destructive">
 <LogOut className="h-5 w-5" />
 <span>Log out</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </header>

 {/* Settings Panel */}
 <SettingsPanel
  open={settingsOpen}
  onOpenChange={(o) => { setSettingsOpen(o); if (!o) setSettingsFirmNav(null); }}
  firmNav={settingsFirmNav}
 />

 {/* Ask Luka Overlay */}
 <AskLukaOverlay open={askLukaOpen} onOpenChange={(o) => { setAskLukaOpen(o); setLukaOpen(o); }} />

 {/* Time Tracker Modal */}
 {ttModalOpen && <TimeTrackerModal onClose={() => setTtModalOpen(false)} />}
 </>
 );
}
