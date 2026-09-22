import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'luka-theme-preference';

export function useTheme() {
 const [theme, setTheme] = useState<Theme>(() => {
 // Check localStorage first
 if (typeof window !== 'undefined') {
 const stored = localStorage.getItem(THEME_KEY) as Theme | null;
 if (stored) return stored;
 
 // Check system preference
 if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
 return 'dark';
 }
 }
 return 'light';
 });

 useEffect(() => {
 const root = document.documentElement;
 
 // Add transition class for smooth theme switching
 root.classList.add('theme-transition');
 
 if (theme === 'dark') {
 root.classList.add('dark');
 } else {
 root.classList.remove('dark');
 }
 
 // Persist to localStorage
 localStorage.setItem(THEME_KEY, theme);
 
 // Remove transition class after animation completes
 const timeout = setTimeout(() => {
 root.classList.remove('theme-transition');
 }, 300);
 
 return () => clearTimeout(timeout);
 }, [theme]);

 // Listen for system theme changes
 useEffect(() => {
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 
 const handleChange = (e: MediaQueryListEvent) => {
 const stored = localStorage.getItem(THEME_KEY);
 // Only auto-switch if user hasn't set a preference
 if (!stored) {
 setTheme(e.matches ? 'dark' : 'light');
 }
 };
 
 mediaQuery.addEventListener('change', handleChange);
 return () => mediaQuery.removeEventListener('change', handleChange);
 }, []);

 const toggleTheme = useCallback(() => {
 setTheme(prev => prev === 'dark' ? 'light' : 'dark');
 }, []);

 const isDarkMode = theme === 'dark';

 return { theme, isDarkMode, toggleTheme, setTheme };
}
