import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "secondaryPanelCollapsed";
const EVENT_NAME = "secondary-panel-toggle";

function read(): boolean {
 try {
 return localStorage.getItem(STORAGE_KEY) === "true";
 } catch {
 return false;
 }
}

function write(value: boolean) {
 try {
 localStorage.setItem(STORAGE_KEY, String(value));
 } catch {
 // ignore
 }
 window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
}

/**
 * Shared state for the secondary sidebar panel (Engagements / Templates).
 * Allows components outside of Sidebar.tsx (e.g. page headers) to toggle
 * the panel collapsed state.
 */
export function useSecondaryPanel() {
 const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => read());

 useEffect(() => {
 const handler = (e: Event) => {
 const detail = (e as CustomEvent<boolean>).detail;
 setIsCollapsedState(detail);
 };
 window.addEventListener(EVENT_NAME, handler);
 return () => window.removeEventListener(EVENT_NAME, handler);
 }, []);

 const setIsCollapsed = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
 setIsCollapsedState((prev) => {
 const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
 write(next);
 return next;
 });
 }, []);

 const toggle = useCallback(() => {
 setIsCollapsed((prev) => !prev);
 }, [setIsCollapsed]);

 return { isCollapsed, setIsCollapsed, toggle };
}
