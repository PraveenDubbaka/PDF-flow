import React, { createContext, useContext, useState } from 'react';
import { EngagementRecord, loadEngagements, saveEngagements, setEngagementMeta } from './engagementsStore';

type CtxType = {
 engagements: EngagementRecord[];
 addEngagement: (e: EngagementRecord) => void;
 deleteEngagement: (id: string) => void;
 updateEngagement: (id: string, updates: Partial<EngagementRecord>) => void;
};

const EngagementsContext = createContext<CtxType>({
 engagements: [],
 addEngagement: () => {},
 deleteEngagement: () => {},
 updateEngagement: () => {},
});

export function EngagementsProvider({ children }: { children: React.ReactNode }) {
 const [engagements, setEngagements] = useState<EngagementRecord[]>(() => loadEngagements());

 const addEngagement = (e: EngagementRecord) => {
 setEngagements(prev => {
 const next = [e,...prev];
 saveEngagements(next);
 setEngagementMeta(e.id, { firstYearAudit: e.firstYearAudit });
 return next;
 });
 };

 const deleteEngagement = (id: string) => {
 setEngagements(prev => {
 const next = prev.filter(r => r.id !== id);
 saveEngagements(next);
 return next;
 });
 };

 const updateEngagement = (id: string, updates: Partial<EngagementRecord>) => {
 setEngagements(prev => {
 const next = prev.map(r => r.id === id ? {...r,...updates } : r);
 saveEngagements(next);
 return next;
 });
 };

 return (
 <EngagementsContext.Provider value={{ engagements, addEngagement, deleteEngagement, updateEngagement }}>
 {children}
 </EngagementsContext.Provider>
 );
}

export function useEngagements() {
 return useContext(EngagementsContext);
}
