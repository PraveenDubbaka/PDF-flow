import { useState } from 'react';
import { Bell, ChevronDown, User, ArrowLeft, Sparkles, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useThemeContext } from '@/contexts/ThemeContext';

interface HeaderProps {
 title?: string;
 showActions?: boolean;
 showBackButton?: boolean;
 onBack?: () => void;
}

export function Header({ title, showActions = true, showBackButton = false, onBack }: HeaderProps) {
 const { isDarkMode, toggleTheme } = useThemeContext();
 const [askLukaQuery, setAskLukaQuery] = useState('');

 return (
 <header className="h-14 bg-card flex items-center justify-between px-6 shadow-md relative z-20">
 {/* Left side - back button and title */}
 <div className="flex items-center gap-3">
 {showBackButton && (
 <Button
 variant="ghost"
 size="sm"
 onClick={onBack}
 className="gap-2 text-muted-foreground hover:text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
 >
 <ArrowLeft className="h-4 w-4" />
 Back
 </Button>
 )}
 {title && (
 <h1 className="text-lg font-semibold text-foreground">{title}</h1>
 )}
 </div>

 {/* Right side - Actions */}
 <div className="flex items-center gap-3">
 {/* Ask Luka input with button */}
 <div className="flex items-center bg-muted rounded-full px-3 py-1 gap-2">
 <Sparkles className="h-4 w-4 text-muted-foreground" />
 <Input 
 type="text"
 placeholder="Type here.."
 value={askLukaQuery}
 onChange={(e) => setAskLukaQuery(e.target.value)}
 className="border-0 bg-transparent h-7 w-32 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
 />
 <Button 
 size="sm" 
 className="h-6 px-3 text-xs rounded-full bg-gradient-to-r from-[#7A31D8] to-[#1C63A6] hover:opacity-90 text-white"
 >
 Ask Luka
 </Button>
 </div>

 {/* Luka AI Credits */}
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 cursor-pointer hover:bg-muted/80 transition-colors">
 <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7A31D8] to-[#1C63A6] flex items-center justify-center">
 <span className="text-[10px] font-bold text-white">L</span>
 </div>
 </div>
 </TooltipTrigger>
 <TooltipContent>Luka AI Credits</TooltipContent>
 </Tooltip>
 </TooltipProvider>

 {/* Dark/Light mode toggle with animated icon */}
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 size="icon" 
 variant="ghost" 
 className="h-9 w-9 relative overflow-hidden transition-transform duration-200 hover:scale-110"
 onClick={toggleTheme}
 >
 <Sun className={`h-5 w-5 text-amber-500 absolute transition-all duration-500 ${
 isDarkMode 
 ? 'rotate-0 scale-100 opacity-100' 
 : 'rotate-90 scale-0 opacity-0'
 }`} />
 <Moon className={`h-5 w-5 text-primary absolute transition-all duration-500 ${
 isDarkMode 
 ? '-rotate-90 scale-0 opacity-0' 
 : 'rotate-0 scale-100 opacity-100'
 }`} />
 </Button>
 </TooltipTrigger>
 <TooltipContent>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 
 {/* Bell with notification badge */}
 <Button size="icon" variant="ghost" className="relative h-9 w-9 group/bell">
 <Bell className="h-5 w-5 text-muted-foreground group-hover/bell:text-primary transition-colors" />
 <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-medium">2</span>
 </Button>

 {/* User avatar with dropdown */}
 <div className="flex items-center gap-1 ml-1 cursor-pointer hover:bg-muted px-2 py-1.5 rounded-lg transition-colors">
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
 <User className="h-4 w-4 text-white" />
 </div>
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 </div>
 </div>
 </header>
 );
}
