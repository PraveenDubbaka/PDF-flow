import { useState, useCallback, useEffect, useRef } from 'react';
import { Assignee } from '@/types/checklist';

const ALL_KEY = '__all__';

const storageKey = (engagementId: string, checklistId: string) =>
 `checklist-assignments-${engagementId}-${checklistId}`;

function readStored(key: string): Record<string, Assignee> {
 try {
 const raw = localStorage.getItem(key);
 return raw ? JSON.parse(raw) : {};
 } catch {
 return {};
 }
}

export function useChecklistAssignments(engagementId: string, checklistId: string) {
 const key = storageKey(engagementId, checklistId);
 const keyRef = useRef(key);

 const [assignments, setAssignments] = useState<Record<string, Assignee>>(
 () => readStored(key)
 );

 // Reload when navigation changes the active checklist
 useEffect(() => {
 if (key !== keyRef.current) {
 keyRef.current = key;
 setAssignments(readStored(key));
 }
 }, [key]);

 const persist = useCallback((next: Record<string, Assignee>) => {
 try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
 setAssignments(next);
 }, [key]);

 const assign = useCallback(
 (scope: 'all' | 'selected', selectedIds: string[], assignee: Assignee) => {
 if (scope === 'all') {
 persist({ [ALL_KEY]: assignee });
 } else {
 const next = {...assignments };
 delete next[ALL_KEY];
 selectedIds.forEach(id => { next[id] = assignee; });
 persist(next);
 }
 },
 [persist, assignments]
 );

 const clearAssignment = useCallback(
 (questionId: string) => {
 const next = {...assignments };
 delete next[questionId];
 persist(next);
 },
 [persist, assignments]
 );

 const allAssignee: Assignee | undefined = assignments[ALL_KEY];

 const getAssignee = useCallback(
 (questionId: string): Assignee | undefined =>
 assignments[questionId] ?? assignments[ALL_KEY],
 [assignments]
 );

 return { assignments, assign, clearAssignment, getAssignee, allAssignee };
}
